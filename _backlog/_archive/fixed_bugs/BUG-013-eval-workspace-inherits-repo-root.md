---
status: 已修
severity: P1
opened: 2026-10-15
---

# BUG-013（已修）：eval 会话经项目根目录链继承仓根 AGENTS.md 与开发技能，persona 被竞争（intake 假红）

> 严重级别：P1（重要——行为评测的主仪表被开发指令污染）｜发现：2026-10-15（BUG-012 修复后的首次全量 eval）｜状态：**已修（2026-10-15）**——`runPreset` 对一次性 workspace `git init`，平台项目根发现链止于 workspace；验收 = intake PASS 16s + 会话内零仓根指令/零开发技能

## 症状

BUG-012 修复后的首次全量 `pnpm eval`（一次性 home `home-5LxNEt`）：**6/7 通过，`first-open-intake` FAIL**——
技能判据过（`first-conversation` 按名加载），但开场白不是「开场邀请 + 一件待决定/跟进的真问题」，
模型把回合花在分析环境上（会话 `7b7370b2`，最终答案 8585 字，reasoning 原文："The AGENTS.md
instructions came from the repo root (a parent), loaded as workspace instructions. So the working fol…"）。

**产品证据（非模型自述）**：该会话的 `user/message`（14.5KB，`usage-report.mjs` 读回）含**八条硬规则 +
AGENTS.md**——仓根 [`AGENTS.md`](../../../AGENTS.md) 被拼接进评测会话作为工作区指令；同会话目录里
模型看到的技能目录含 `pre-push-evidence`/`note-archive-judgment`/`repo-live-probe`/`client-ui-contribution`
等**开发用技能**（`.agents/skills/`，同一条项目根通道）。

## 根因（证据确认）

[`vendor/dsh/packages/context/agent-instructions`](../../../vendor/dsh/packages/context/agent-instructions/src/files.ts)
的发现语义：项目根 = 从会话 cwd 向上**第一个含 `.git` 的目录**（`DEFAULT_PROJECT_ROOT_MARKERS = ['.git']`），
指令链 = 项目根到 cwd 的目录链，链上每个 `AGENTS.md`/`CLAUDE.md` 都载入，`.agents/skills/` 按同一项目根发现。

eval workspace = `$repo/.tmp/eval/workspace-*`：向上走（workspace → eval → .tmp → **仓根**）在仓根才撞到
`.git`，于是仓根成为评测会话的"项目根"。BUG-003（2026-10-07）把 cwd 移进 `.tmp` 堵住了"cwd=仓根"的
直接泄漏，但**祖先链通道没堵**——仓指令照常从父目录下来，与助手 persona 竞争。此前全量 eval 跑在
住满数据的 dev home 上，intake 的 freshness 触发从不点火（任务注释明言），该通道的杀伤被掩盖；
BUG-012 让每次 run 真正落到全新 home，intake 首次以设计条件运行，通道当 场显形。

**与重构无关**：campaign diff 对模型可见面零变更（BUG-012 卡已核），本缺陷是评测装置的环境泄漏，
属 BUG-003/BUG-012 同族第三通道。

## 修复路径（已选）

`dev/eval/run.mjs` 的 `runPreset` 在创建一次性 workspace 后对其 `git init`——workspace 自己成为项目根，
发现链止于 workspace，仓根指令与开发技能按**平台自有语义**（`.git` 标记，不配置、不改 vendor）被隔在
外面。修复只属于 eval 装置：dev 会话从仓根跑，看见仓指令是正确行为，不动 launcher。

## 修好定义

1. 修复后 `pnpm eval --only first-open-intake` 的会话中，拼接进会话的指令**不含**仓根 AGENTS.md 标记
   （八条硬规则），技能目录不含 `.agents/skills/` 开发技能——`usage-report.mjs` 读回为证；
2. `first-open-intake` 在修复后的跑器上 **PASS**（红→绿：修复前同任务 FAIL，`7b7370b2`）；
3. `--list` / `--self-check` 行为不变，`pnpm verify` 全绿。

## 修复记录（2026-10-15）

`dev/eval/run.mjs` 的 `runPreset`：创建一次性 workspace 后 `git init --quiet`——workspace 自己成为
项目根，`findProjectRoot` 的 `.git` 标记走查止于 workspace，指令链 = [workspace]，仓根 AGENTS.md 与
`.agents/skills/` 开发技能按平台自有语义被隔在外面。只动 eval 装置，dev 会话（cwd=仓根）语义不变。

**验收（`修好定义` 全项）**：`pnpm eval --only first-open-intake` → **PASS（16s）**；`usage-report.mjs`
读回该会话：`八条硬规则` 出现次数 **0**、四个开发技能名出现 **0**、`first-conversation` 按名加载
**true**、最终答案正是「开场邀请 + 一件待决定/跟进的真问题」（此前缺的判据在场）。红→绿闭环：
修复前全量跑 intake FAIL 25s（`7b7370b2`，spliced 指令带八条硬规则）→ 修复后 PASS 16s。
全量其余 6 题在泄漏在场时已 PASS（`home-5LxNEt`，6/7 + desk-daily-brief 按设计 NOT EVALUATED）；
"修复后整套重跑"属重复真模型花费，未执行——每题的绿证据现状：6 题全量 + intake 修复后单跑。
