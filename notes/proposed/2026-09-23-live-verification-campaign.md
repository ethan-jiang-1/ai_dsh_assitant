# 提案：live 验证战役 —— 清 I1–I13 挡板，开首批研究线索

日期：2026-09-23 · 状态：**running（同日拍板开跑。步骤 0 已过、步骤 1 一号悬案已预答 —— 见文末"开跑补记"；Web UI 会话操作需要人）**

## 问题与现状（2026-09-23 实查取证）

`notes/intents.md` 全表停在 `proposed`，挡板 = "外部可观察行为要在 dev Web UI 的真实会话里
验证过才翻 implemented"。逐层取证：

| 层 | 状态 | 证据 |
|---|---|---|
| 代码骨架 | ✅ 100% | 纯核 60/60、`pnpm verify` 15/15、release-smoke 与双 profile 装载记录在 repo-structure note |
| 运行面就绪 | ✅ | lib/ 构建物在（其后 src 零改动）、dev/dev-task 双 profile 在、dev home 凭据在、zstd 可读日志 |
| preset 接线 | ✅ | `--dump-config` 实证：dev profile 的 agent-presets 行 `default: assistant`、roots 指向 repo presets、trust: system |
| **host 面** | ✅ 已实证 | 家已 scaffold 在盘上：HOME.md + memory/research/skills 三房间（空仓）——服务真跑过 |
| **preset 面** | ❌ **零成功会话，且有一次失败尝试在案** | dev home 存有 6 个会话；session 7c75c86c（19:29）用户指令"用 assistant_memory 保存记忆"，agent 推理原文 **"There's no assistant_memory tool"**（默认工具集）——与 dev.md §五"one-shot 不进 preset"的记载一致（若该会话实为 web 会话则暴露真 bug，步骤 1 第一件事就是分辨这两种情形） |

结论：**骨架这条线做完了；产品这条线是"就绪但从未点亮"**。proposed/ 只剩 I14 不是快做完，
是还没开始验。延后项表（architecture.md §六）所有触发条件都在等真实使用数据——这一仗是它们
共同的输入源；产品的 research 房间（I10–I13）也要在真实使用里开出第一批线索。

## 步骤（步步为营，每步一个可观察出口）

| 步 | 做什么 | 出口判据 |
|---|---|---|
| 0 快速复核 | `pnpm build`（幂等，确认 lib/ 与当前 HEAD 一致）；如需，dev-task one-shot 冒烟 | host 面过：插件装载、家 scaffold、服务行（dev.md §五） |
| 1 会话 A：装家与桌面 | dev Web UI（`pnpm dsh --profile dev --port 0`）开新会话——roster `default: assistant`，应默认挂上；另开一个显式不选 assistant 的对照会话 | persona 进 system prompt、摘要段落在场（I1/I7/I12）；HOME.md 已在（I6）；对照会话工具面不受影响（I1）。**若新会话默认没挂上 assistant → 真 bug，立切片修** |
| 2 会话 B：记忆环 | 让助手 save → list → recall → curate；重启进程后新会话再 recall | 跨会话仍在（I2）；curate 机器可查（I8）；记录文件人可读带 source（I9） |
| 3 会话 C：探索环 | open → update → park → promote / drop（试无理由 drop 被拒） | 三档出口全通（I10/I11）；摘要含开放线索条数（I12）；curate 报 stale（I13，按 `staleResearchDays` 造一条旧线索） |
| 4 会话 D：技能与学习 | 四个策展技能按需加载；reflect brief → save_skill；再存一个与策展同名的技能 | 学到的技能即刻可见无需重启（I3，= repo-structure note 验证项 7）；复盘落文件 + provenance（I4/I9）；同名遮蔽顺序实录（= 验证项 8）；摘要保持有界（I5） |
| 5 收尾切片 | 验一条翻一条：intents.md 状态 + 证据指针；repo-structure note ⏳ 项清账。**证据指针分级**：日志实证（会话 id + 事件）/ 盘上在案（文件路径）/ 未验待验——助手自述不算数 | I1–I13 全 implemented；I14 留 proposed（战役 = 它的使用数据输入） |
| 6 I14(a) 观察 | 战役全程记录：助手是否主动跑 curate（persona 三习惯 + home-curation 技能够不够用） | 主动 → (a) 层视为已在场；不主动 → 一个 model-visible 措辞强化切片再观察 |
| 7 开研究线索 | 会话里用 `assistant_research` open 开出下节两条线索（dogfooding：产品自己的 backlog 第一单） | 线索带 why/lean 落进家的 research/ 房间；摘要出现线索条数（I12 二次实证） |

顺带：repo-structure note 验证项 9（PTC 模式下工具可用）在会话 D 后用 PTC one-shot 实测；
起法查 vendor cookbook，一键不起则登记后延。

## 分工

- **人**：Web UI 会话里对助手说话（各步清单）；其余无需人。
- **agent（我）**：步骤 0；每步从 `dev/harness-home/sessions/` 会话日志核判据
  （model-visible ⟺ logged，不凭助手自述）；步骤 5 收尾切片。

## 研究线索（本 note 登记，战役步骤 7 开成 thread）

两条都是"现在没答案、但值得追"的探索——按自家设计住进产品的 research/ 房间（I10 的概念），
不混进 proposed/（那是已定未建的决策）。若拍板时更想住 repo 侧（notes 层开 research 物种），
先说——但那会是研究线索的第二持久家，默认 dogfooding。

| # | 线索（问题） | 现在的倾向（lean） | 已有的部分答案 |
|---|---|---|---|
| R1 | 记忆检索技术：关键词/标签够多久？要不要上语义检索？生态里有没有现成的记忆插件值得借/换？ | 文件 + 关键词/标签/时间是 day-0 合同（可审、可 git、错了赔得起——SQLite/向量库已在 repo-structure note 被否）；embedding 已是延后项（触发：真实漏召回）；现成插件未普查 | architecture.md §六"语义检索"行；repo-structure note 输掉的方案表 |
| R2 | 自我提高（knowledge/学习）：自己写还是用现成的？ | 已是混合态：reflect 自己写、技能落盘借用 DSH 真 provider（repo-structure note 决定 6）；现成学习/知识类插件未普查；自动复盘节奏是延后项（触发：使用数据） | architecture.md §六"自动后台复盘""跨会话复盘"两行 |

普查（vendor 生态 + DSH 插件注册面）是战役后做还是先做轻量——**等用户定**；默认战役后
（普查的判据也依赖"我们自己缺什么"的第一手体感）。研究 note 的形态以来源仓 research 文件
为范本：一手引证（vendor 树优先）、证据分级（affordance / documented / observed，随条标注）、
版本基线声明（钉住 SHA）、承重结论引文内联（只读本文即可成立）、普查底稿存档且进文前亲验。

## 被否决/刻意延后

- **不先建 RPC 脚本化驱动**（配方已登记）：一次性人工验证，人工更快；脚本化留给 live 检查档立项。
- **不先建快照 harness**：snapshots 触发条件 = 第一处"只有跑起来才看得出"的回归；战役若暴露即触发，届时立项。
- **不动延后项表其余行**：全部依赖本战役之后的使用数据。
- **战役中暴露的实现 bug**：各自成切片修复，不并入本条目（除非一行能修完的登记型）。

## 验收

intents.md I1–I13 逐条 implemented 且带证据指针；repo-structure note ⏳ 清账或登记后延；
I14 拿到第一批使用数据；R1/R2 两条线索开进家的 research/ 房间。

## 开跑补记（2026-09-23 同日）

- **步骤 0 已过**：`pnpm verify` 15/15、`pnpm build` 绿（tsc -b 幂等，lib/ 与 HEAD 一致），
  one-shot 冒烟绿（会话 `1a140ee6`：boot 通、真 turn 完成、无凭据错误、启动器 DSH_HOME
  强制覆盖生效）。
- **步骤 1 一号悬案预答**：session `7c75c86c`（19:29）**是 one-shot 错门，不是 web 会话 bug**
  ——证据：其 agent 工具表为裸 agent 基础集（bash / create_goal / ralph / subagent…，
  无任何 assistant 工具）；session 事件 `preset=None`，对照 13:55 的 web 会话壳
  `e0ac2cf8` 记录了 `agentPreset: "assistant"`（壳从未对话）。因此 preset 接线已实证到
  **会话创建时挂载**，未验的只剩"真实对话里的行为面"。晚间 19:12/19:20/19:29 三次验证
  尝试全走 one-shot（vendor 契约：one-shot 不进 preset），非产品缺陷。
- 由此步骤 1 的"分辨两种情形"已完成，直接验新 web 会话是否默认挂 assistant 即可。
