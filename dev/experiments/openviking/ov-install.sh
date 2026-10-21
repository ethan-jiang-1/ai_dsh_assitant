#!/usr/bin/env bash
# OpenViking 正式接入安装器（RFC 提案 3 七步形状，推敲卡 260929 §六 v3 旋钮剖面）。
#
# 幂等七步：装 server → 生成配置 → 起 server + 健康门 → 建/复用 profile → 装 tgz →
# 写 profile patch（v3 旋钮参数化）→ dump-config 断言。每步可重跑；已在场即跳过。
#
# 用法（repo 根）：
#   bash dev/ov-install.sh <profile>            # 默认 dev（web）；对 dev-task 同样适用
#   bash dev/ov-install.sh <profile> <home>     # 显式 DSH home（默认 dev/harness-home）
#
# 前置：
#   · .env.local 含 SILICONFLOW_API_KEY/BASE_URL/EMBEDDING_MODEL/VLM_MODEL（ov-trial.sh 消费）
#   · vendor/thirdparty/openviking/dsh-memory-plugin-0.5.26.tgz 在位（准入表双钉版本）
#   · uv 在 PATH（server 的安装器）
#
# 红线：key 只经 .env.local → ~/.openviking/（0600），本脚本不回显任何密钥；
#       AGPL 边界=独立进程 + HTTP/MCP 消费（RFC 提案 6，复核在案后方可对发行 profile 执行本脚本）。
set -euo pipefail

REPO="$(cd "$(dirname "$0")/../../.." && pwd)"
PROFILE="${1:?用法: bash dev/experiments/openviking/ov-install.sh <profile> [dsh-home]}"
HOME_DIR="${2:-${ASSISTANT_DSH_HOME:-$REPO/dev/harness-home}}"
TGZ="$REPO/vendor/thirdparty/openviking/dsh-memory-plugin-0.5.26.tgz"
OV_VERSION="0.4.22"
PLUGIN_ID="openviking-memory-runtime"
# 日志落仓内临时根（硬规则 8：仓外写会被文件沙箱挡下，转成一次人工 approval）
LOG="$REPO/.tmp/openviking/ov-server-install.log"

say() { printf '  ov-install: %s\n' "$*"; }

# ── 1. server 在位（双钉 0.4.22；uv tool 隔离装，试点验收形状）────────────────────
if command -v openviking-server >/dev/null 2>&1 && openviking-server --version 2>/dev/null | grep -q "$OV_VERSION"; then
  say "1/7 server $OV_VERSION 已在位"
else
  say "1/7 安装 openviking-server==${OV_VERSION} （uv tool）"
  uv tool install "openviking==$OV_VERSION"
fi

# ── 2. 配置生成（幂等；0600；密钥纪律见 ov-trial.sh）────────────────────────────
if [ -f "$HOME/.openviking/ov.conf" ]; then
  say "2/7 ~/.openviking/ov.conf 已在位"
else
  say "2/7 生成配置（dev/ov-trial.sh）"
  bash "$REPO/dev/ov-trial.sh"
fi

# ── 3. server 起动 + 健康门（已在跑则复用；health JSON 判定，不带 curl -f 的语义陷阱）──
if curl -s --max-time 3 http://127.0.0.1:1933/health 2>/dev/null | grep -q '"healthy": *true'; then
  say "3/7 server 已在线（1933 healthy）"
else
  say "3/7 起 server（后台）并等健康门（≤30s）"
  mkdir -p "$(dirname "$LOG")"
  nohup openviking-server --config "$HOME/.openviking/ov.conf" >"$LOG" 2>&1 &
  ok=""
  for _ in $(seq 1 30); do
    sleep 1
    if curl -s --max-time 2 http://127.0.0.1:1933/health 2>/dev/null | grep -q '"healthy": *true'; then ok=1; break; fi
  done
  [ -n "$ok" ] || { echo "健康门未过——看 $LOG" >&2; exit 1; }
  say "3/7 健康门通过"
fi

# ── 4. profile 在位（dev 家的既有 profile 或裸建）───────────────────────────────
if [ -d "$HOME_DIR/profiles/$PROFILE" ]; then
  say "4/7 profile $PROFILE 已在位"
else
  say "4/7 建裸 profile $PROFILE"
  (cd "$REPO" && ASSISTANT_DSH_HOME="$HOME_DIR" pnpm dsh --from-default-profile web --profile "$PROFILE" --dump-config >/dev/null)
fi

# ── 5. 装 tgz（dsh plugin add 绝对路径；相对路径会被 pnpm 按 profile 目录解析，试点踩过）──
if grep -q "openviking" "$HOME_DIR/profiles/$PROFILE/package.json" 2>/dev/null; then
  say "5/7 插件已在 profile 依赖里"
else
  say "5/7 dsh plugin add（绝对路径 tgz）"
  (cd "$REPO" && ASSISTANT_DSH_HOME="$HOME_DIR" pnpm dsh plugin --profile "$PROFILE" add "$TGZ")
fi

# ── 6. profile patch 追加 OV 行（§六 v3 旋钮；同 id 整行覆盖语义，幂等=先删后加）──
PATCH="$HOME_DIR/profiles/$PROFILE/cordis.patch.yml"
if grep -q "id: $PLUGIN_ID" "$PATCH" 2>/dev/null; then
  say "6/7 profile patch 已含 $PLUGIN_ID 行"
else
  say "6/7 追加 $PLUGIN_ID 行（v3 旋钮剖面）"
  # 幂等：删旧块（如有半截）再追加
  python3 - "$PATCH" << 'PYEOF'
import sys, re
path = sys.argv[1]
text = open(path).read()
text = re.sub(r"\n?- id: openviking-memory-runtime\n(?:[ \t]+.*\n?)*", "\n", text)
block = """
# ── OpenViking 记忆层（dev/ov-install.sh 写入；旋钮依据推敲卡 260929 §六 v3）──────
- id: openviking-memory-runtime
  name: '@openviking/dsh-memory-plugin'
  config:
    endpoint: http://127.0.0.1:1933
    skillCatalog: false          # 服务器端技能目录注入关
    skipSubagentSessions: true   # 子代理噪声不进记忆
    profileTokenBudget: 3000     # 画像块实测 538-755 chars，余量充足
    recallContextTimeoutMs: 3000 # 强制降级到查询式 find（叶子内容进召回块）
    commitTokenThreshold: 3000   # 短会话也进抽取（默认 20000=主场景记忆丢失缺口）
    captureToolResults: false    # 云端例外：完整工具结果默认不抓；需要时显式开/配 captureFilters
"""
open(path, 'w').write(text.rstrip('\n') + '\n' + block)
PYEOF
  say "6/7 已写入"
fi

# ── 7. dump-config 断言（组合里必须看到插件行 + ov-shield 行）────────────────────
say "7/7 dump-config 断言"
OUT=$(cd "$REPO" && ASSISTANT_DSH_HOME="$HOME_DIR" pnpm dsh --profile "$PROFILE" --dump-config 2>/dev/null)
echo "$OUT" | grep -q "id: $PLUGIN_ID" || { echo "断言失败：组合里没有 $PLUGIN_ID" >&2; exit 1; }
echo "$OUT" | grep -q "assistant-ov-shield" || { echo "断言失败：组合里没有 ov-shield 行（bundle 应自带）" >&2; exit 1; }
say "断言通过：$PLUGIN_ID + assistant-ov-shield 均在组合"
say "完成。验证记忆：新会话里说一件小事 → POST /commit（或长聊一轮）→ 新会话问它。"
