# 技能用量统计（治理环切片 1a）

日期：2026-09-24 · 状态：**implemented**
依据：三线合流提案 `notes/implemented/2026-09-24-tri-line-synthesis.md` 阶段 1 切片 1a；
R2 缺口清单第 1 项（`notes/archived/research/2026-09-24-r2-skill-growth-survey.md` §9.3-1——
"用量统计是 J2/J4 第一优先，一切退役决策的数据面，Claude `/skill-doctor` 证明这是官方认可的
最小治理件"）。

## 问题

家的技能房间"半自动的入口、无门的出口"：技能能写进来（reflect/save_skill），进来以后
没人知道**它是否被用过**——没有计数、没有最近使用、退役决策（1c）与全自动蒸馏的延后判据
（"真实使用数据"）都缺数据面。

## 决定

1. **形态：家根下一个机器自有的 JSON 账本 `skill-usage.json`**（`{version: 1, usage: {<name>:
   {count, lastUsedAt}}}`，名字排序、原子写）。**建议性状态**：删掉即归零，不影响任何知识，
   不进摘要；文件烂了 curate 报 warn（静默读零会误导退役决策——一个高频技能看起来像从未用过）。
2. **采集：learn 模块挂 `tools/result` 订阅**（`src/learn/index.ts`）——preset 会话内每次
   `skill` 工具成功加载，`skillLoadFromResult` 过滤出名字（文法校验 + 排除 error 结果），
   调服务 `recordSkillLoad` 写账本。订阅随会话作用域生灭；并发会话单次递增可能输掉竞态
   （last-writer-wins），建议性计数可容忍。
3. **回显两面**：`curate` 附带用量数据面（**不是 finding**，1c 才把阈值变成 finding/动作），
   学到技能最少用在前（退役候选优先）；`assistant_reflect brief` 附带最多用在前、上限 8 条
   （复盘的证据面）。账本记录**所有**名字（含策展技能——未来 1b 遮蔽可见性可用），
   两面都只 join 家 skills/ 房间里的学到技能。
4. **已知未覆盖**：用户 `/name` 斜杠注入不走工具管线（`agent/pre-step` 注入路径，
   `vendor/dsh/packages/skill/tool-skill/src/index.ts` 164-191 行），不计入。
   退役决策要的是模型加载信号，斜杠是人显式动作——登记不立案。

## DSH 接缝（亲验）

- `tools/result` 事件：`vendor/dsh/packages/core/tools/src/index.ts:189`（签名）、
  `:1656`（emit，按 `exec.agent` 作用域路由）；scoped 订阅只收本会话执行、
  全局订阅全收（`tests/scoped.spec.ts` 实证）——我们用 scoped（preset 挂在 agent 作用域，
  `vendor/dsh/packages/preset/…/src/mount.ts`）。
- `skill` 工具：名字 `skill`、入参 `{name: string}`
  （`vendor/dsh/packages/skill/tool-skill/src/index.ts:82-85`）。
- PTC 模式嵌套调用同样过管线发 result（`core/tools` scoped/ptc 测试实证）——计数覆盖 PTC。

## 输掉的方案

| 输掉的 | 为什么输 |
|---|---|
| session log 回放计数（skill-stats 形态） | 需增量缓存与日志格式耦合；账本一个文件、实时订阅更小 |
| 写进每个 SKILL.md 的 frontmatter | 每次加载脏文件（git 噪音 + 与人手改竞态）；且学到技能在自家、策展技能在包内——后者会被弄脏 |
| `skills/usage.md` 平文件 | 平 .md 会被 skills provider 扫成一个叫 usage 的技能 |
| 进摘要（digest） | 提案明确 1a 只进 curate 与 brief；摘要有界，用量是抽屉不是桌面 |
| curate 直接给阈值 finding / 自动归档 | 那是 1c（阈值退役）的切片——1a 只做数据面，切片边界不越 |

## 证据

- 纯核 + 服务级：`tests/skill-usage.spec.ts`（8 测试：roundtrip/烂文件容忍/递增/提取过滤/
  排序截断/跨实例持久/不可读 warn/原子写与名字校验）、`tests/health.spec.ts` 扩 2 测试
  （join 排序与 never-loaded、账本不可读 finding）。**83/83 全绿**（`pnpm test`）。
- 机械门禁：`pnpm typecheck` && `pnpm build` && `pnpm verify` 16/16。
- **live 实证**（preset-runner one-shot，2026-09-24，会话 `session-e687709b-2de4-4975-974f-3d5ae3f8b7cb`，
  `agentPreset: "assistant"` 组合可指认，逐字日志在 dev home sessions）：
  1. 会话经 `skill` 工具加载 4 个技能（home-curation、campaign-evidence-recording、
     memory-hygiene、research-backlog）→ 盘上 `skill-usage.json` 4 条全记、时间戳与
     会话一致（学到 + 策展都入账本，join 只显学到——按设计）；
  2. 同会话 `assistant_memory action=curate` 返回**逐字含**
     `- skill usage: campaign-evidence-recording×1 (0d ago).`（模型在报告中原样引用）；
  3. 同会话顺带完成 R3 线索入住：open → park（id `20260923-how-should-the-knowledge-room-land-3e8i`，
     留房不占摘要——park 合同复验一次）。
- **附带观察（产品面）**：live 会话的助手主动指出"tri-line 提案已批准"这一前提**在家内
  无据可查**（提案在 repo notes/，不在家），拒绝背书并建议补 decision 记忆——证据纪律的
  正向信号。处置：经服务写入 decision 记忆 `20260923-the-tri-line-synthesis-proposal-was-zrxy`
  （source 指向 repo note 与 commit dfbbd8a），家的跨会话事实面补齐。
  **附带教训**：第一次写入用了相对 `dataDir` 且 cwd 在包目录，记忆落进了包内误建的家
  （`packages/dsh-smart-assistant/dev/…`）——已删残留、绝对路径重写。`dataDir` 相对 cwd
  解析，脚本调服务一律给绝对路径。
  这也提前暴露了阶段 2 的一个真实需求：**家与 repo 的知识面是两个平面**，knowledge/ 房间
  落地时要回答"repo 侧决策如何进家"（D8 桥 / sources 指回 repo 路径的设计正对这一点）。
