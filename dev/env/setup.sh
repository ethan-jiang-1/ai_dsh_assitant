#!/usr/bin/env bash
# 幂等的开发环境搭建。用法：bash dev/env/setup.sh
#
# 三件事，顺序不能换：
#   1. 建 dev profile —— **必须从 web 模板建**，因为 preset roster（`agent-preset-registry` 行）
#      只存在于 web-app bundle 里；base/headless 模板没有 roster，preset 无从挂载。
#   2. `dsh plugin add` 装本插件 —— 它把 package.json 的 `dsh.bundle.patch` 注册进 profile：
#      host 面的 `assistant-memory` 服务行与 assistant preset 的定义（`cordis.patch.yml` 的
#      `preset-assistant` 行）由此进入组合。
#   3. 把默认 preset 设成 assistant —— profile patch 整行替换 registry 行的 `default`；
#      改 `cordis.patch.yml` 即刻生效（组合按文件 mtime/size 换代，已在跑的会话留原代）。
#   4. 建**第二个** profile `dev-task`（headless 模板）跑 one-shot —— web 与 headless 的
#      bundle 里都 insert 了 id: code-runtime，混装必撞 duplicate id（DSH 自己也把它列为
#      退役元组）；one-shot 的 runner 行只在 headless bundle 里。
# 另外两件保护性的事：
#   5. 断言 DSH_HOME 不是日用的 ~/.dsh（唯一能大规模写坏日用的单点，fail loud）。
#   6. vendor 产物检查：完整 boot 需要构建出的 lib/（--dump-config 不加载它们，不能作证据）。
set -euo pipefail

repo_root="$(git rev-parse --show-toplevel)"
# shellcheck source=dev/env/env.sh
source "$repo_root/dev/env/env.sh"

if [ -z "${ASSISTANT_DSH_HOME:-}" ] && [ "$DSH_HOME" = "$HOME/.dsh" ]; then
  echo "✗ DSH_HOME resolves to the daily ~/.dsh — refusing to touch it." >&2
  echo "  Unset it, source dev/env/env.sh, or point ASSISTANT_DSH_HOME at a scratch home on purpose." >&2
  exit 1
fi

if [ ! -f "$repo_root/vendor/dsh/packages/boot/app-boot/lib/index.js" ] || \
   [ -z "$(find "$repo_root/vendor/dsh/packages/client" -maxdepth 3 -name index.js -path '*/lib/*' -print -quit 2>/dev/null)" ]; then
  echo "✗ vendor/dsh is not built (host lib / client bundles missing) — the harness needs its built lib/ to boot." >&2
  echo "  Run once per pin: bash dev/env/prepare.sh" >&2
  echo "  (it wraps: pnpm --dir vendor/dsh install; build:native-system; build:lib; build:web)" >&2
  exit 1
fi

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

# web 模板 profile 保持 [base, web-app, 本插件]；若历史上加过 headless bundle，摘掉
# （它和 web-app 都 insert id: code-runtime，组合必撞）。幂等自愈。
node -e '
const fs = require("fs")
const file = process.argv[1]
const manifest = JSON.parse(fs.readFileSync(file, "utf8"))
const bundles = manifest.dsh.profile.bundles
const clean = bundles.filter(b => b !== "@deepseek-ai/dsh-headless")
if (clean.length !== bundles.length) {
  manifest.dsh.profile.bundles = clean
  fs.writeFileSync(file, JSON.stringify(manifest, null, 2) + "\n")
}
' "$profile_dir/package.json"

# headless 模板 profile（one-shot）：base + headless，没有 web-app —— roster 行由
# dev/profiles/profile-patch-headless.yml 用 insert 语义补进来（web 模板的行在它里面不存在）。
task_profile="${ASSISTANT_DEV_TASK_PROFILE:-dev-task}"
task_dir="$DSH_HOME/profiles/$task_profile"
if [ ! -d "$task_dir" ]; then
  echo "▸ creating profile '$task_profile' from the shipped headless template"
  run_dsh --profile "$task_profile" --from-default-profile headless --dump-config > /dev/null
  if [ ! -f "$task_dir/package.json" ]; then
    echo "✗ $task_profile was not created." >&2
    exit 1
  fi
fi

for pair in "$profile:$profile_dir:$repo_root/dev/profiles/profile-patch.yml" \
            "$task_profile:$task_dir:$repo_root/dev/profiles/profile-patch-headless.yml"; do
  name="${pair%%:*}"
  rest="${pair#*:}"
  dir="${rest%%:*}"
  patch="${rest#*:}"
  echo "▸ installing the plugin bundle into '$name'"
  # 裸路径 = pnpm 的 link 语义（symlink 回本 repo）：改 src 后只需 `pnpm build` 重建 lib，
  # 不必重新 add。`file:` 前缀是复制语义，开发环用它会"改了不生效"。
  run_dsh plugin --profile "$name" add "$repo_root/packages/dsh-smart-assistant"
  echo "▸ pointing the preset roster at this repo ($name)"
  cp "$patch" "$dir/cordis.patch.yml"
done

echo
echo "done. Next:"
echo "  pnpm dsh --profile $task_profile \"one task\"   # host-only one-shot: plugin load/scaffold/service smoke (headless)"
echo "  pnpm dsh --profile $task_profile --patch dev/probes/session/preset-runner.patch.yml \"one task\"   # one-shot through the assistant preset"
echo "  pnpm dsh --profile $profile                    # Web UI (the profile carries the web-app bundle)"
echo
echo "  ⚠ not 'pnpm dsh web': the 'web' alias hardcodes profile 'web' and would create a"
echo "    shipped 'web' profile inside the dev home."
echo
echo "Discipline: after changing src/ run 'pnpm build' (preset rows load the built lib/)."
echo "Skill edits (presets/assistant/skills/) need no rebuild — the catalog is re-scanned per"
echo "request. Composition edits (cordis.patch.yml) reach new sessions with the next"
echo "generation (file mtime+size stamp); sessions already running keep theirs."
echo
echo "Note: the home lives at $DSH_HOME — the daily ~/.dsh is untouched."
