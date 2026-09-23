#!/usr/bin/env bash
# 幂等的开发环境搭建。用法：bash dev/setup.sh
#
# 三件事，顺序不能换：
#   1. 建 dev profile —— **必须从 web 模板建**，因为 preset roster（`agent-presets` 行）
#      只存在于 web-app bundle 里；base/headless 模板没有 roster，preset 无从挂载。
#   2. `dsh plugin add` 装本插件 —— 它把 package.json 的 `dsh.bundle.patch` 注册进 profile，
#      host 面的 `assistant-memory` 服务行由此进入组合。
#   3. 把 roster 指向**本 repo 的** presets/ 并把默认 preset 设成 assistant ——
#      指向 repo 而不是拷贝，改 agent.cordis.yml 即刻生效（standing mount 按文件换代）。
set -euo pipefail

repo_root="$(git rev-parse --show-toplevel)"
# shellcheck source=dev/env.sh
source "$repo_root/dev/env.sh"

profile="${ASSISTANT_DEV_PROFILE:-dev}"
profile_dir="$DSH_HOME/profiles/$profile"

if [ -n "${DSH_BIN:-}" ]; then
  run_dsh() { "$DSH_BIN" "$@"; }
else
  # 从钉住的源码启动必须带运行期解析门面（tsconfig.tsx.json），否则 tsx 解析到
  # 未构建的 lib/index.js —— ERR_MODULE_NOT_FOUND（handoff 坑 #3，实跑踩实过）。
  run_dsh() { TSX_TSCONFIG_PATH="$repo_root/tsconfig.tsx.json" node --import tsx/esm "$repo_root/vendor/dsh/apps/cli/src/bin.ts" "$@"; }
fi

if [ ! -d "$profile_dir" ]; then
  echo "▸ creating profile '$profile' from the shipped web template"
  run_dsh --profile "$profile" --from-default-profile web --dump-config > /dev/null
  if [ ! -f "$profile_dir/package.json" ]; then
    echo "✗ profile was not created. Run this once by hand, then Ctrl-C, and re-run this script:" >&2
    echo "    pnpm dsh --profile $profile --from-default-profile web" >&2
    exit 1
  fi
else
  echo "▸ profile '$profile' already exists"
fi

echo "▸ installing the plugin bundle into '$profile'"
run_dsh plugin --profile "$profile" add "file:$repo_root/packages/dsh-smart-assistant"

echo "▸ pointing the preset roster at this repo"
cp "$repo_root/dev/profile-patch.yml" "$profile_dir/cordis.patch.yml"

echo
echo "done. Next:"
echo "  pnpm dsh --profile $profile \"one task\"    # one-shot run; the profile default is the assistant preset"
echo "  pnpm dsh web --profile $profile            # Web UI"
echo
echo "Note: the home lives at $DSH_HOME — the daily ~/.dsh is untouched."
