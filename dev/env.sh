#!/usr/bin/env bash
# 双 home 隔离的兜底。用法：source dev/env.sh
#
# 为什么必须兜底：coding agent 不会自己想起来"开发 home ≠ 日用 home"这件事（FAQ 13 双 home 篇的结论）。
# 这个脚本一 source，之后 agent 起的一切会话都落在 repo 内的开发 home，做崩了也不碰日用的 ~/.dsh。
#
# 出口只有一个，且必须与代码、脚本、启动器一致：`ASSISTANT_DSH_HOME` 显式指定另一个开发用 home
# （冒烟/实验/并行实例）。缺了这句，「用 ASSISTANT_DSH_HOME 隔离 + 按文档跑 setup.sh」会把 profile
# 建进 repo dev home、而启动器去别的 home 找 —— 两边自相矛盾，报的是 "profile does not exist"。
# 指向日用 ~/.dsh 时不拦截但显著警告（与 scripts/dsh.mjs 同一语义：不设开关矩阵，只让发生的事可见）。
#
# 注意：凭据按 home 隔离 —— 开发 home 要在 $DSH_HOME/.credentials.yaml 自己配一次
# DEEPSEEK_API_KEY（或接受真实 API 的测试 self-skip）。

: "${ASSISTANT_REPO:=$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
export ASSISTANT_REPO

export DSH_HOME="${ASSISTANT_DSH_HOME:-$ASSISTANT_REPO/dev/harness-home}"
export ASSISTANT_PRESETS_DIR="$ASSISTANT_REPO/packages/dsh-smart-assistant/presets"

# 这两条不随 DSH_HOME 隔离（vendor 审计结论），dev 一并接管：
# skills 共享 agent 根默认 ~/.agents；dev 不出遥测。
export DSH_AGENTS_HOME="$DSH_HOME/agents-home"
export DSH_TELEMETRY_DISABLED="${DSH_TELEMETRY_DISABLED:-1}"

mkdir -p "$DSH_HOME"

echo "DSH_HOME=$DSH_HOME"
echo "ASSISTANT_PRESETS_DIR=$ASSISTANT_PRESETS_DIR"
