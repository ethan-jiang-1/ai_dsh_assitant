#!/usr/bin/env bash
# OpenViking 记忆层 server 的幂等拉起。用法：bash dev/env/openviking-up.sh
#
# 为什么需要这一步：OpenViking 的 server 是**独立进程**（AGPL-3.0 的 Python 服务，走 HTTP/MCP），
# 插件（`@openviking/dsh-memory-plugin`，Node 侧 bundle）**不会也无力拉起它**——查过 0.5.26 的
# 产物，`shared/` 里没有任何 spawn/child_process。插件连不上 server 时的行为是**静默降级**
# （`catch { /* best effort */ }`），对话照常、记忆不抽取、不报错。安静的失败正是要固化的理由：
# 少了这一步，人无法从界面看出记忆层在不在。
#
# 三条纪律：
#   ① 幂等 —— 1933 已健康就直接复用（端点来源见下），不起第二个；
#   ② **失败不阻断启动** —— 记忆层是可选增强（`notes/archived/2026-10-04-openviking-layer1-landing.md`
#      决定 3「可选增强不能成单点故障」）。server 缺席/装不上/起不来一律 warn + exit 0，
#      让 `pnpm start` 照常交出实例；
#   ③ 临时与状态只落仓内 —— server 的 storage 默认写 `~/.openviking/workspace`，那是仓外，
#      文件沙箱会挡下（实测 `PermissionError: .openviking.lock`）。所以从上游 `ov.conf` 派生一份
#      仓内副本、把 storage 指到 `.tmp/openviking/workspace`（硬规则 8）。
#
# 端点：插件默认 `127.0.0.1:1933`（`shared/credentials.mjs` 的 `port` 缺省值，与 `ov-install.sh`
# 的健康门同一个数）。改这个数必须两边一起改，否则插件连了个没人听的端口——而那正是静默降级。
set -euo pipefail

repo_root="$(git rev-parse --show-toplevel)"
cd "$repo_root"

port=1933
state_dir="$repo_root/.tmp/openviking"
conf="$state_dir/ov.conf"
workspace="$state_dir/workspace"
server_log="$state_dir/server.log"
upstream_conf="${OPENVIKING_CONF:-$HOME/.openviking/ov.conf}"

healthy() {
  curl -s --max-time 2 "http://127.0.0.1:$port/health" 2>/dev/null | grep -q '"healthy": *true'
}

if healthy; then
  echo "  · OpenViking server 已在线（${port}），复用"
  exit 0
fi

if ! command -v openviking-server >/dev/null 2>&1; then
  echo "  · OpenViking server 未安装（uv tool install openviking==0.4.22）——本轮记忆层缺席，对话不受影响"
  exit 0
fi

if [ ! -f "$upstream_conf" ]; then
  echo "  · 缺 $upstream_conf（ov-trial.sh 生成，含模型位与密钥）——本轮记忆层缺席"
  exit 0
fi

# 派生仓内配置：只改 storage 落点，密钥纪律延续上游 0600。
mkdir -p "$workspace" "$state_dir"
if [ ! -f "$conf" ] || [ "$upstream_conf" -nt "$conf" ]; then
  python3 - "$upstream_conf" "$conf" "$workspace" <<'PY'
import json, os, sys
src, dst, workspace = sys.argv[1], sys.argv[2], sys.argv[3]
data = json.load(open(src))
data.setdefault("storage", {})["workspace"] = workspace
json.dump(data, open(dst, "w"), indent=2)
os.chmod(dst, 0o600)
PY
fi

echo "  · 起 OpenViking server（${port}）"
: > "$server_log"
nohup openviking-server --config "$conf" --port "$port" >"$server_log" 2>&1 &

for _ in $(seq 1 30); do
  sleep 1
  if healthy; then
    echo "  · 健康门通过（${port}）——记忆抽取已接上"
    exit 0
  fi
done

echo "  ! OpenViking server 30s 内没健康——本轮记忆层缺席（对话不受影响），日志：$server_log"
exit 0
