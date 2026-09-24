# 2026-09-24 · Hermes 身份与引导调研（r4）：SOUL.md、AGENTS.md 与家的布局

日期：2026-09-24 · 状态：survey 底稿（判据与决策不放这里；进文前的承重主张待委托方复核）

> 问题：委托方（DSH 插件 `dsh-smart-assistant`）的家根目录有 scaffold 的 `HOME.md`
> （四房间地图：不进常驻上下文、无装载器、被动参考）；persona 硬编码在 DSH preset 的
> persona 行（`dsh-persona` 只吃字符串）。用户提议：`HOME.md` 是自己发明的名字，业界不一定
> 这么做，应改作初始引导文件；「这个人的身份怎么做」待解；方向是「先抄一下 Hermes」
> （NousResearch/hermes-agent，"The agent that grows with you"，MIT，开源）。
>
> day-0 约束（继承，不重议）：家的一切皆人可读纯文件（可 git 可手改）；常驻上下文有界；
> 判据照旧——错了赔得起吗 / 错了多久能发现 / 形态可否进 DSH 组合 / 信噪比 / 维护。
>
> 证据分级：[affordance] 源码/接口可指认 / [documented] 官方文档载明 / [observed] 社区观察（注明出处）。
> 版本基线：查证日 2026-09-24，repo `main` 分支（GitHub raw / contents API）；文档站各页同日。
> 全部 URL 为本次会话真实 fetch；失败处如实注明。委托方本地事实（§六）基于 pin
> `dsh-v0.1.5-rc.2`（vendor/dsh submodule）。

---

## 一、Hermes 是什么（一句话定位）

[documented] 自我改进型 agent（Nous Research）：从经历造技能、agent 自管记忆、FTS5 会话检索、
跨平台 gateway。家（`$HERMES_HOME`，默认 `~/.hermes/`）承载 `SOUL.md`、`memories/MEMORY.md` +
`USER.md`、`skills/`、`config.yaml`（README 迁移节列出这些物件的迁移面）。
（https://github.com/NousResearch/hermes-agent README，2026-09-24）

## 二、SOUL.md：身份文件（本调研的核心答案）

### 2.1 角色与注入语义

[documented] **`SOUL.md` 是 primary identity——system prompt 的第 1 槽**，定义 agent 是谁、
怎么说话、避免什么；内容经安全扫描与截断后 **verbatim 注入，不加包裹语言**；**完全替换**
内置默认身份文本。缺文件/空文件/读不了 → 回退内置默认身份（文档引首句："You are Hermes
Agent, built by Nous Research. Be direct: match the length of your reply to the weight of the
ask..."）。subagent/delegation 语境（`skip_context_files`）也走回退。
（https://hermes-agent.nousresearch.com/docs/user-guide/features/personality）

### 2.2 位置：只在家的根，刻意不探 cwd

[documented] 只从 `$HERMES_HOME/SOUL.md` 加载，**不看工作目录**——理由明说：人格属于
Hermes 实例，不属于项目；从哪儿启动就变人格是不可预测的。

### 2.3 种子与首次运行

[documented] 首次运行**自动 seed 一份 starter SOUL.md**（用户拿到的是真实可改的文件）；
已有文件**永不覆盖**；空文件不注入任何内容。
[observed] 种子机制有演变：commit `411faf0` "fix(soul): installers seed the real default
persona, upgrade legacy e…"（安装器从占位改为种真默认人格，并升级旧文件）。
（https://github.com/NousResearch/hermes-agent/commit/411faf08bd678fe3e49b22afcef1e9fd2d7f5592，commit 题目为证）

### 2.4 安全：扫描但不阻断（身份文件是用户自己的）

[documented] SOUL.md 与其他上下文文件一样过 prompt-injection 扫描；但**命中只警告不阻断**
（区别于项目 AGENTS.md 的直接阻断）——理由：这是用户自己写的文件（agent 写它需要审批），
身份文件引用攻击短语（安全教学）不应弄坏身份。例外：profile 发行版（第三方）拥有的
SOUL.md 命中仍阻断。

### 2.5 内容形状

[documented] 建议结构：`# Identity / # Style / # Avoid / # Defaults`（不强制）；四个官方示例
风格（pragmatic engineer / research partner / teacher / tough reviewer）与「好的 SOUL 是稳定、
广适用、具体到声音；坏的 SOUL 满是项目细节与泛话」的判准，均在文档页原文可引。
（https://hermes-agent.nousresearch.com/docs/guides/use-soul-with-hermes）

### 2.6 与 `/personality` 的关系

[documented] SOUL.md = durable baseline（持久默认人格）；`/personality` = 会话级 overlay
（内置 14 种：helpful/concise/technical/…/kawaii/pirate；自定义进 config）。重置用
`/personality none|default|neutral`。

## 三、AGENTS.md：项目引导（与身份的分工）

### 3.1 分工（文档称「最常见的错误」就在这里）

[documented] **SOUL.md 管「到处适用」的：身份、语气、风格、默认行为；AGENTS.md 管「属于
一个项目」的：架构、约定、路径、端口、命令**。规则一句话："if it should follow you
everywhere, put it in SOUL.md; if it belongs to a project, put it in AGENTS.md"。

### 3.2 发现与优先级

[documented] 项目上下文一 session 只装一类，先到先得：`.hermes.md` → `AGENTS.override.md`
（个人覆盖，通常 gitignore）→ `AGENTS.md` → `CLAUDE.md` → `.cursorrules`。git 仓库内装
**目录链**：git 根 → cwd 逐层合并（provenance 头、去重、深者优先）。**SOUL.md 独立装载，
不受此优先级约束**。

### 3.3 渐进子目录发现

[documented] `SubdirectoryHintTracker` 盯工具调用里的路径：agent 会话中进入子目录时才发现
那里的 AGENTS.md，**注入到工具结果**（每目录至多一次，向上走至多 5 层，32k 上限）——好处
明说：不撑大 system prompt、保 prefix cache。
[affordance] 装载点：`build_context_files_prompt()` 在 `agent/prompt_builder.py`；
`SubdirectoryHintTracker` 在 `agent/subdirectory_hints.py`（文档载明路径）。

### 3.4 截断与注入形态

[documented] 超限头 70% 尾 20% 加标记；上限动态（随模型窗口 20k–500k）。最终以
`# Project Context` 头组装进 system prompt；**SOUL 内容直插，不加包裹**。

## 四、家的布局与记忆文件（对照参考）

[documented] `~/.hermes/memories/` 两文件：**MEMORY.md**（agent 笔记：环境/约定/教训，2200
字符上限）+ **USER.md**（用户画像：偏好/沟通风格/习惯，1375 字符上限）；session 开始以
**frozen snapshot** 注入（保 prefix cache，盘上即时、提示词里下一 session 才见）；满则
**报错不静默**，agent 当轮自己合并/删除再重试；写前过注入扫描；`write_approval` 可全量
审批门。另有 `session_search`（SQLite FTS5）补「上周聊过什么」。
（https://hermes-agent.nousresearch.com/docs/user-guide/features/memory）

**对照**：委托方的 `memory/` 房间（一条一文件、recall 排序、digest 有界、curate 机器检查）
已覆盖 MEMORY.md+USER.md 的角色且更细粒度——本调研不提案改动记忆房间。

## 五、prompt 栈顺序（Hermes 的整栈）

[documented] 1. **SOUL.md**（身份，或内置回退）→ 2. 工具行为指引 → 3. memory/user 上下文 →
4. skills 指引 → 5. context files（AGENTS.md、.cursorrules）→ 6. 时间戳 → 7. 平台格式提示 →
8. 可选 overlay（/personality）。身份在最底，一切叠在其上。

## 六、与 DSH 原生机制的对照（委托方本地事实，供提案用）

[affordance] DSH 已有 AGENTS.md 兼容装载器 `@deepseek-ai/dsh-agent-instructions`
（`vendor/dsh/packages/context/agent-instructions/src/`）：
- 项目根 `AGENTS.md`/`CLAUDE.md`（+ `AGENTS.local.md` 变体），**baseline 在首个请求前进
  durable context**；会话中 fs 工具触碰这些文件，变更/删除进 inbox（`config.ts` 默认候选表）。
- **user-global `AGENTS.md`**：住 `$DSH_HOME` 根（委托方即 `dev/harness-home/AGENTS.md`，现为
  空槽），对所有会话生效（`config.ts` dshHome 注释 + `files.ts` userGlobalDisplayPath）。

[affordance] 委托方现状三事实：① `HOME.md` 无任何装载器读它（persona 与 digest blurb 口头
指路，agent 按需 read）；② persona 是 preset 硬编码静态文本（`dsh-persona` 仅 prefix/suffix
字符串，无文件加载——`vendor/dsh/packages/preset/persona/src/index.ts`）；③ dev home 的
`HOME.md` 已烂一代（仍写 "Three rooms"、无 knowledge/ 房间）：scaffold 只在缺失时写、
curate 无漂移检查——持久化生成物静默腐烂的现行案例。

## 末、可直接照抄的清单（事实，不做决策）

1. **文件名与分工**：`SOUL.md`（身份，家根，只从家根加载、不探 cwd）+ `AGENTS.md`（项目/
   引导）双文件，分工规则一句话（到处适用 vs 属于项目）。
2. **注入语义**：身份 = system prompt 第 1 槽、verbatim、扫描+截断、**完全替换**内置默认；
   缺/空/坏 → 回退内置默认身份。
3. **种子语义**：缺则自动 seed starter；已有**永不覆盖**；空文件 = 不注入。种子机制曾从
   占位演变为「种真默认人格」（commit 411faf0）。
4. **扫描语义**：用户自有的身份文件，注入扫描命中**警告不阻断**；项目上下文文件命中即阻断。
5. **建议结构**：`# Identity / # Style / # Avoid / # Defaults` + 官方四示例风格（原文可引）。
6. **装载接缝（DSH 侧）**：`ctx.systemPrompt.section()`（digest 段落同款、placement 明确）；
   DSH 原生 agent-instructions 只探项目根与 `$DSH_HOME` 根，**不探 `<DSH_HOME>/assistant/`**，
   无冲突也无免费加载。
7. **未能获取**：`default_soul.py` 源码原文（`agent/` 目录列表 API 截断于 `m`，无 soul 文件；
   路径未定位）——文档已给内置回退文本首句与建议结构，不承重于源码。

---
