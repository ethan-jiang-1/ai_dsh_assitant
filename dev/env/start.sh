#!/usr/bin/env bash
# 一键启动 —— 「启动一下这个」的默认落点，把原先要记的那串收成一条命令：
#
#   prepare（vendor 产物）→ setup（dev/dev-task profile）→ 产物自证（陈旧即 build）
#   → 起 dev Web（--port 0，OS 分配端口 + token 鉴权）→ preflight 绿了才交 URL
#
# 为什么存在：这四步原先写在命令表里靠人按序敲（漏一条的失败点是句无关的报错），而另外两条
# 纪律——"改过 src 先 pnpm build"、"起 Web UI 后必须 preflight 再交"——只活在 prose 里。
# 顺序、自证、交门禁在这里合流；每一段都幂等，重跑安全。
#
# 退出语义（有意做死）：
#   · preflight 红 = 不交这个实例，服务一并收掉（不留半绿的孤儿给你 debug）；
#   · 服务自己退了 = 打日志尾部并退出非零（不假装成功）。
# 参数：额外的 dsh 旗标原样透传，且**放在 `--port` 之前**——启动器解析到第一个不认识的 token
# 为止，`--port` 之后的 `--patch` 不会到达 CLI（docs/dev.md §五踩坑清单）。
#   例：pnpm start -- --patch dev/probes/session/preset-runner.patch.yml
set -euo pipefail

repo_root="$(git rev-parse --show-toplevel)"
cd "$repo_root"

log_dir="$repo_root/.tmp/start"
mkdir -p "$log_dir"
log="$log_dir/server.log"

echo "▸ prepare（vendor 产物，幂等）"
bash dev/env/prepare.sh
echo "▸ setup（dev / dev-task profile，幂等）"
bash dev/env/setup.sh
echo "▸ 产物自证（lib/ 与 src/ 不一致就 build）"
node dev/env/ensure-build.mjs

# 服务放自己的进程组里（`set -m`）再杀：`pnpm dsh` 是包装层，只杀它会留下真 CLI 孤儿
# ——孤儿继续持有会话语义上的写锁，下一轮 resume/report 全被拒（docs/dev.md §五踩坑清单）。
server_pid=""
cleanup() {
  if [ -n "$server_pid" ] && kill -0 "$server_pid" 2>/dev/null; then
    kill -TERM -- "-$server_pid" 2>/dev/null || kill -TERM "$server_pid" 2>/dev/null || true
  fi
}
set -m
trap cleanup EXIT INT TERM

echo "▸ 起 dev Web（--port 0 = OS 分配端口 + token 鉴权）"
: > "$log"
pnpm dsh --profile dev "$@" --port 0 --no-open > "$log" 2>&1 &
server_pid=$!

# 抓 URL：CLI 打出 `dsh web: http://127.0.0.1:<port>/?token=<...>`（Rust 侧与 CLI 都可能在
# 起服务前先写别的行，所以按模式扫而不是按行号取）。
url=""
for _ in $(seq 1 90); do
  if ! kill -0 "$server_pid" 2>/dev/null; then
    echo "✗ 服务进程自己退了——日志尾部：" >&2
    tail -n 30 "$log" >&2
    exit 1
  fi
  url="$(grep -Eo 'http://127\.0\.0\.1:[0-9]+/\?token=[A-Za-z0-9_-]+' "$log" | head -n 1 || true)"
  if [ -n "$url" ]; then break; fi
  sleep 1
done
if [ -z "$url" ]; then
  echo "✗ 90s 内没等到 URL——日志尾部：" >&2
  tail -n 30 "$log" >&2
  exit 1
fi

echo "▸ preflight（开屏前门禁：装得上才算数，不证明渲染）"
if ! pnpm preflight "$url"; then
  echo "✗ preflight 红——不交这个实例，服务已收掉。" >&2
  exit 1
fi

cat <<EOF

✅ dev 实例就绪（preflight 绿）
   $url
   日志：$log
   Ctrl-C 退出（一并结束服务）
EOF

wait "$server_pid"
