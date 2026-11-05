#!/usr/bin/env bash
# 一键启动 —— 「启动一下这个」的默认落点，把原先要记的那串收成一条命令：
#
#   submodule/install（缺才补）→ prepare（vendor 产物）→ setup（dev/dev-task profile）
#   → 产物自证（陈旧即 build）→ 起 dev Web（--port 0，OS 分配端口 + token 鉴权）
#   → preflight 绿了才交 URL
#
# 为什么存在：这四步原先写在命令表里靠人按序敲（漏一条的失败点是句无关的报错），而另外两条
# 纪律——"改过 src 先 pnpm build"、"起 Web UI 后必须 preflight 再交"——只活在 prose 里。
# 顺序、自证、交门禁在这里合流；每一段都幂等，重跑安全。
#
# 退出语义（有意做死）：
#   · preflight 绿 = **交接**：打出 URL 与 pid 后本脚本退出，服务独立存活（由调用者 `kill <pid>` 收）；
#   · preflight 红 = 不交这个实例，服务一并收掉（不留半绿的孤儿给你 debug）。
#   · 服务自己退了 = 打日志尾部并退出非零（不假装成功）。
# 「交接」而不是「守着」是有意的：`pnpm start | tail`、后台任务、agent 的一次性 shell 都在看到
# URL 的那一刻结束调用者；脚本若守着（`wait`）或挂着 EXIT trap，服务会跟着那层一起死
# （实测 2026-10-18：三轮 preflight 绿的实例都在 ~90s 内消失，而不经启动器裸起的同样命令活了数分钟）。
# 机理与补救的两个面：`ASSISTANT_DSH_DETACH=1` 让 CLI 脱离终端（dev/env/dsh.mjs 规则 6）。
# 参数：额外的 dsh 旗标原样透传，且**放在 `--port` 之前**——启动器解析到第一个不认识的 token
# 为止，`--port` 之后的 `--patch` 不会到达 CLI（docs/dev.md §五踩坑清单）。
#   例：pnpm start -- --patch dev/probes/session/preset-runner.patch.yml
#   例：pnpm start --fresh        # 忽略在跑的实例，强制新起一个
#
# 两件后来加的事（2026-11-05，起因是"这次启动怎么这么久"）：
#   · **计时**：每一步打印耗时。那次坏样本 36.8s vs 热启动 12.4s，而脚本此前不留任何分段证据，
#     只能事后猜；现在"为什么慢"当场可读（哪一步、几秒）。
#   · **复用**：实例账本（`.tmp/start/instance.json`，判据 = `dev/env/instance.mjs`）里记着
#     还活着、且**产物没有比它更新**的实例时，直接跑 preflight 交它的 URL（≈1.1s），
#     不再重造一个（≈12.4s）。带任何 dsh 旗标（组合变了）或 `--fresh` 时照旧新起。
set -euo pipefail
set -m   # job control：每个后台作业自己一个进程组，失败时能整组收（见 cleanup）

repo_root="$(git rev-parse --show-toplevel)"
cd "$repo_root"

# 计时：macOS 的 BSD date 不认 %N，perl 的 HiRes 是两边都在的最小面。
now_ms() { perl -MTime::HiRes=time -e 'printf "%d", time * 1000' 2>/dev/null || printf '%d' "$(($(date +%s) * 1000))"; }
fmt_ms() { perl -e 'printf "%.1fs", $ARGV[0] / 1000' "$1"; }
script_start="$(now_ms)"
step() { # <label> <command...> —— 跑一步并打印耗时；失败照常把退出码交给 set -e
  local label="$1"; shift
  local started ended
  started="$(now_ms)"
  printf '▸ %s\n' "$label"
  "$@"
  ended="$(now_ms)"
  printf '   ⏱ %s\n' "$(fmt_ms "$((ended - started))")"
}

fresh=0
dsh_args=()
for arg in "$@"; do
  if [ "$arg" = "--fresh" ]; then fresh=1; else dsh_args+=("$arg"); fi
done

# 交接（复用与新起共用一个出口）：打 URL/pid/总耗时，摘掉 EXIT trap，退出。
# `trap - EXIT INT TERM` 必须在这里做——脚本一退，EXIT trap 会把刚交出去的服务收掉。
handover() { # <url> <pid> <mode-label>
  local url pid mode
  url="$1"; pid="$2"; mode="$3"
  printf '\n✅ dev 实例就绪（preflight 绿；%s）\n   %s\n   日志：%s\n   收掉它：kill -TERM -- -%s   （负 pid = 连进程组一起收）\n\n本脚本到此退出，服务继续在后台运行。总耗时 %s。\n' \
    "$mode" "$url" "$log" "${pid:-$server_pid}" "$(fmt_ms "$(( $(now_ms) - script_start ))")"
  trap - EXIT INT TERM
  exit 0
}

# 首跑前置（⓪①）：fresh clone 里 submodule 与根依赖都可能不在。一条 `pnpm start` 要能自己
# 补齐，否则第一次会死在 prepare 的 "vendor/dsh is empty" 或 pnpm 的 no package.json。
# 两者都幂等，已在位就跳过。
if [ ! -f vendor/dsh/package.json ]; then
  echo "▸ submodule（vendor/dsh 未初始化，先拉起）"
  git submodule update --init
fi
if [ ! -f node_modules/.modules.yaml ]; then
  echo "▸ install（根依赖未安装，先 pnpm install）"
  pnpm install
fi

log_dir="$repo_root/.tmp/start"
mkdir -p "$log_dir"
log="$log_dir/server.log"

step "prepare（vendor 产物，幂等）" bash dev/env/prepare.sh
step "setup（dev / dev-task profile，幂等）" bash dev/env/setup.sh
step "产物自证（lib/ 与 src/ 不一致就 build）" node dev/env/ensure-build.mjs

# ── 复用：已经在跑的实例还健康就直接交接 ────────────────────────────────────────
# 判据在 dev/env/instance.mjs：进程还在、是同一个 profile、且 lib//presets/overlay/patch
# 都没有比它启动时刻更新。产物变过就说明它加载的是旧代码——交回下面的新起路径（并收掉旧的）。
profile="${ASSISTANT_DEV_PROFILE:-dev}"
instance() { node "$repo_root/dev/env/instance.mjs" "$@"; }
if [ "$fresh" = 0 ] && [ "${#dsh_args[@]}" = 0 ]; then
  existing="$(instance --check "$repo_root" "$profile" 2>/dev/null || true)"
  if [ -n "$existing" ]; then
    echo "▸ 已有健康的 $profile 实例（复用；--fresh 可强制新起）"
    if pnpm preflight "$existing"; then
      handover "$existing" "$(instance --print-pid "$repo_root" 2>/dev/null || true)" "复用已有实例"
    fi
    echo "▸ 该实例 preflight 不绿——收掉它，重起一个"
    instance --stop "$repo_root" || true
  fi
fi

# 服务放自己的进程组里（`set -m`）再杀：`pnpm dsh` 是包装层（pnpm 还会再 prepend 一层
# `sh -c` INT trap），只杀它会留下真 CLI 孤儿——孤儿继续持有端口与会话语义上的写锁，下一轮
# resume/report 全被拒（docs/dev.md §五踩坑清单）。
# 交接后的实例更远一层：`ASSISTANT_DSH_DETACH=1` 让 CLI 自带一个**新会话**（自己一组，脱离终端），
# 所以两段 pid 都留着：`service_pid` = 真 CLI（打印给人收）、`server_pid` = 启动链（失败时一并收）。
server_pid=""
service_pid=""
cleanup() {
  for pid in "$service_pid" "$server_pid"; do
    [ -n "$pid" ] || continue
    kill -0 "$pid" 2>/dev/null || continue
    kill -TERM -- "-$pid" 2>/dev/null || kill -TERM "$pid" 2>/dev/null || true
  done
}
# The trap exists ONLY for cleanup before handover (preflight red, no URL, Ctrl-C while starting).
# It must not fire on the successful exit: this script's job is to hand a live URL to its caller,
# and the caller usually ends the moment it prints (管道 / 后台作业 / agent 的一次性 shell）。
# 交接前明确 `trap - EXIT` 把它摘掉。
trap cleanup EXIT INT TERM

printf '▸ 起 dev Web（--port 0 = OS 分配端口 + token 鉴权；detach = 交接后独立存活）\n'
: > "$log"
boot_start="$(now_ms)"
ASSISTANT_DSH_DETACH=1 pnpm dsh --profile dev ${dsh_args[@]+"${dsh_args[@]}"} --port 0 --no-open > "$log" 2>&1 &
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
  # 启动器在 detach 模式自己报真 CLI 的 pid（"[dsh] detached service pid <n>"）——那才是交给人的句柄。
  service_pid="$(sed -nE 's/.*\[dsh\] detached service pid ([0-9]+).*/\1/p' "$log" | head -n 1)"
  url="$(grep -Eo 'http://127\.0\.0\.1:[0-9]+/\?token=[A-Za-z0-9_-]+' "$log" | head -n 1 || true)"
  if [ -n "$url" ]; then break; fi
  sleep 1
done
if [ -z "$url" ]; then
  echo "✗ 90s 内没等到 URL——日志尾部：" >&2
  tail -n 30 "$log" >&2
  exit 1
fi

printf '   ⏱ boot→URL %s\n' "$(fmt_ms "$(( $(now_ms) - boot_start ))")"
echo "▸ preflight（开屏前门禁：装得上才算数，不证明渲染）"
if ! pnpm preflight "$url"; then
  instance --clear "$repo_root" || true
  echo "✗ preflight 红——不交这个实例，服务已收掉。" >&2
  exit 1
fi

# 记进账本：下一次 `pnpm start` 凭它直接复用（判据 = dev/env/instance.mjs）。
instance --record "$repo_root" "$profile" "$url" "${service_pid:-$server_pid}"
handover "$url" "$service_pid" "新起"
