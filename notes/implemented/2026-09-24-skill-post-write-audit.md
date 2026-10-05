# 写后审计（治理环切片 1d）

日期：2026-09-24 · 状态：**implemented**
依据：三线合流提案 `notes/implemented/2026-09-24-tri-line-synthesis.md` 阶段 1 切片 1d；
R2 §9.3-4（借 caesarloo 形态：写后审计、fail/warn 注入不阻断——"写时校验已挡住大部分
frontmatter 问题，审计增量在**引用完整性与凭据**"）。

## 问题

写时契约校验（`validateSkillDraft`）只挡**形状**坏掉的技能。一个形状完好的技能仍可能：
①指向不存在的文件（未来会话顺着 markdown 链接/`references/` 路径走会撞墙——静默失败）；
②带着疑似活凭据（写入面即攻击面——ClawHavoc 战役里 `MEMORY.md`/`SOUL.md` 被投毒的教训，
R2 §3.6）。两者都是写时校验看不见、而未来会话会踩到的。

## 决定

1. **两个纯检查 + 一个房间扫**（`src/skills/audit.ts`）：
   - `skill-credential-leak`（warn）：五类保守模式——私钥块、AWS AKIA、`sk-` 键（含连字符
     形态）、GitHub `gh?_` token、`api_key:`/`token:` 式长赋值（≥16 字符、无空格——
     "token cost of the digest" 这类散文不触发，单测钉死）。
   - `skill-broken-reference`（warn）：markdown 链接 `[…](…)` 与反引号 `` `references/…` ``
     里的相对路径，相对 bundle 目录解析（平文件相对房间根，与 provider 的 resourceBase
     同构）；URL/锚点/绝对路径不查——只查"未来会话期望在 bundle 旁边找到的文件"。
   - `auditSkillsRoom`：复用新抽出的共享枚举 `listSkillFiles`（scan 与审计永不各说各话）；
     archive 不审（退役技能只需可读，不需可用）。
2. **双面注入，不阻断**（caesarloo 的"fail/warn 注入不阻断"语义）：
   - **写后即时**：`writeSkill` 写完即审，findings 随 `save_skill` 结果回给模型——写它的
     那个 turn 就知道，render 里明说"fix them in this turn, or the skill stays broken"；
   - **curate 常驻**：`service.curate()` 把 `auditSkillsRoom` 的 findings 并进简报
     （`compareFindings` 导出共享排序，warn 在前），家不会静默养着坏技能。
3. **枚举重构**：`scan.ts` 抽出 `listSkillFiles`（名字/文件/引用基准三元组），scan 与
   audit 共用——两个 pass 对"房间里有什么"永不歧义。

## 输掉的方案

| 输掉的 | 为什么输 |
|---|---|
| host 层 tools/post-execute 钩子监听文件变更（caesarloo 原形态） | 我们的写入路径是自己的一等工具——在 writeSkill 里审等价、更近、零事件接线税；外部手改文件由 curate 兜住 |
| 审计全部反引号路径 | 散文里大量 `` `src/foo.ts` `` 式提及，误报会淹没信号——只查 markdown 链接 + `references/` 惯例（spec 自己的指引形态） |
| 凭据检查阻断写入 | 阻断式门会被绕过（bryan-cmf 教训）；报告 + 同 turn 修复才是轻而在的门 |
| 每种凭据模式单独 finding code | 模式会增删，code 稳定为 `skill-credential-leak`，模式名在 message 里 |

## 证据

- 纯核 + 服务级：`tests/host/skill-audit.spec.ts`（6 测试：五类凭据形态逐个命中 / 散文三例
  不触发 / 断链双形态（链接+反引号）报出 / 文件在则过、URL 锚点绝对路径不查 /
  save_skill 即时带 findings 且 curate 并入 warn 在前 / 干净技能零噪音）。
  **101/101 全绿**（`pnpm test`）。
- 机械门禁：`pnpm typecheck` && `pnpm build` && `pnpm verify` 16/16。
- **live 实证**（preset-runner one-shot，2026-09-24，会话
  `session-eddfe91c-6732-49d8-b38b-bc73bcc744ef`，assistant preset，finding 文本 4 处在日志）：
  1. save_skill 写入含断链 `references/checklist.md` + 假 `api_key:` 赋值的技能 →
     **写后即时**返回 `the post-write audit found 2 problem(s)`，两条 warn 逐字：
     credential assignment + broken pointer，未阻断写入；
  2. curate 从盘上文件**独立复现**同样两条（live 助手特意指出"two paths agree word for
     word"——写后注入与房间审计两路互证）；
  3. retire_skill 清理 → 复跑 curate `Home is clean: no findings.`（红绿在案）。
  live 助手另两点如实观察：凭据警告是启发式（本例是合成夹具，无需轮换）；退役而非修复
  是一次性夹具的正路——真技能应修指针或补文件（与设计意图一致）。
