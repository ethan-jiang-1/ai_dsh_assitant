#!/usr/bin/env bash
# fresh clone 的第一次预建：把 boot 需要的 vendor/dsh 产物补齐。幂等，已在位就跳过。
# 用法：bash dev/prepare.sh
#
# 为什么包一层（而不是让人按 `docs/dev.md` §三 逐条敲）：§三 那四条命令与产物是"每个 pin 一次"的搬运，
# 而它们是**起服务的前置**——漏一条，下一个失败点是一句无关的报错（缺 boot lib 时 setup.sh 会
# fail loud，但它只报"没建"，不替你把构建跑一遍）。搬进脚本后，新 clone 到能起服务只剩
# `pnpm install` + 本脚本 + `dev/setup.sh` 三件，且每一件都能重跑。
#
# 三个已知约束都固化成代码，而不是靠读手册记住：
#   1. vendor 树的根 postinstall（lefthook）在 submodule 里必然失败 —— 包已就位；
#      但它会卡住 pnpm 的 verify-deps-before-run 自动 install，故所有 pnpm 调用统一禁用它。
#   2. 完整 boot 需要 host + client 双 face 的 lib/、native addon、以及跑 Web UI 才用的 web dist。
#   3. `--dump-config` / `--help` 不加载 lib/ —— 它们不能当作"已经建好"的证据，故这里按文件探。
set -euo pipefail

repo_root="$(git rev-parse --show-toplevel)"
# shellcheck source=dev/env.sh
source "$repo_root/dev/env.sh"
cd "$repo_root"

# 与 setup.sh 的守卫同一约定：不碰日用 home（本脚本自己不装 profile，但保持一致，免得抄错改坏）。
if [ "$DSH_HOME" = "$HOME/.dsh" ]; then
  echo "✗ DSH_HOME points at the daily ~/.dsh — refusing to touch it. source dev/env.sh first." >&2
  exit 1
fi

# 包装 pnpm：vendor 树里没人「publish 前」跑一遍 lefthook，自动 install 只会白跑一趟（约束 1）。
pnpm_vendor() { pnpm --config.verify-deps-before-run=false --dir vendor/dsh "$@"; }

built=0
need() { # name path
  if [ -e "$2" ]; then
    echo "▸ $1: present"
  else
    echo "▸ $1: missing — building"
    built=1
    return 1
  fi
}

if ! need "vendor deps" vendor/dsh/node_modules; then
  pnpm_vendor install
fi
if ! need "native addon" vendor/dsh/node_modules/node-pty/build/Release/pty.node; then
  pnpm_vendor run build:native-system
fi
if ! need "host + client lib" vendor/dsh/packages/client/modules/lib/client.js; then
  pnpm_vendor run build:lib
fi
if ! need "web dist (Web UI)" vendor/dsh/apps/web/dist/index.html; then
  pnpm_vendor run build:web
fi

if [ "$built" = 0 ]; then
  echo "already prepared — nothing to build (idempotent)."
else
  echo "prepared."
fi
echo "next: bash dev/setup.sh    # 建 dev（web）+ dev-task（headless）两个 profile 并装本插件"
