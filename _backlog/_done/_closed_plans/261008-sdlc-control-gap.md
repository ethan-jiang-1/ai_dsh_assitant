# 推敲：SDLC 对照后的可控性缺口——Note、衔接、测试各漏在哪

> 立卡：2026-10-08 ｜ 状态：已消化｜毕业门判断 = 已消化｜下一步 = 落点：根 AGENTS.md 硬规则 3；`.agents/skills/note-archive-judgment/SKILL.md`；`docs/testing.md` 模型可见面「能证明」格。不造快照、不加格式门禁、不搬归档

## 背景 / 触发

用户原话：DSH SDLC 里重要的东西已经写在参考卷里；本仓 `notes/` 的管理有问题，backlog 和 notes 的衔接有时很严重，测试资产「怎么测」不成立；可控感差，写出来的程序质量不知道在哪。要消化缺口，再看怎么吸纳。

对照底本是 [`sdlc-reference/`](file:///Users/bowhead/deepseek-harness/_dsh_plugin_agent_ready_development/sdlc-reference/00-index.md)（2026-10-08 当日文本，钉 `dsh-v0.2.0-rc.2`）。本仓不继承主仓的 Issue、Project、批准分、CI、发布 lane。相邻卡 [261008-vendor-corpus-home](261008-vendor-corpus-home.md) 管「平台正文不要再抄」；本卡管「抄过的规则有没有在干活」。2026-10-07 语料吸收审计已经把纪律表写成「照搬 + 适配」，所以缺口不是没读。

## 已知与未决

已核实：

### 1. Note：章程接近，出生和留下没有按章程发生

DSH [01](file:///Users/bowhead/deepseek-harness/_dsh_plugin_agent_ready_development/sdlc-reference/01-agent-note-lifecycle.md) 的判据：代码、测试、现有文档装不下的持久取舍才写；同一决定更新 owner；`proposed → implemented` 必须改写正文；留下 / 归档 / 合并删除是三件不同的事；字数和年龄不是判据。

本仓 [`notes/README.md`](../../../notes/README.md) §〇 已经是这句话。门禁只查状态行、日期和「输掉的方案」（`scripts/checks/verify-checks.mjs` 的 `ALTERNATIVES_PATTERN`）。它不拒绝 implemented 正文里留下的 `## 提案` / `## 验收`。

现场（2026-10-08 工作树）：`implemented/` 5 篇，`proposed/` 0，`archived/` 45，`rejected/` 1。开屏决定 [2026-10-07-opening-brief-and-rhythm](../../../notes/archived/2026-10-07-opening-brief-and-rhythm.md) 归档行写「下次改决定不用打开本篇」，正文仍是「提案（已交付事实）」加「验收（已执行）」，并且还在等用户终验。DSH 会把这种正文判成没改写完。归档技能写明「按未来决策价值逐篇判断、禁止整批」，同一天大量 implemented 被加上同一句冻结理由。

「第一句话必须由客户端合成、不能让模型猜桌面」是以后还会被改回去的取舍。它现在冻在归档里。测试先行纪律也冻在 [2026-10-05-proposed-implementation-test-first](../../../notes/archived/2026-10-05-proposed-implementation-test-first.md)，而 [`notes/README.md`](../../../notes/README.md) §二之三仍在执行它。

### 2. 衔接：一张卡同时当推敲、看板和证据，Note 第二天被抽走

DSH [09](file:///Users/bowhead/deepseek-harness/_dsh_plugin_agent_ready_development/sdlc-reference/09-intake-and-work-items.md)：意图没有统一入口。重大未来工作的仓库内载体是 proposed Note。主仓没有 `_backlog/`。

本仓四门写在 [`_backlog/README.md`](../../README.md)，纸面上是对的：卡记思考，note 记决定，毕业就走。活的反例是开屏：

- [261007-opening-brief-and-rhythm](../../plans/261007-opening-brief-and-rhythm.md) 状态仍是「推敲中」，毕业门写「四片全交付」，下一步是用户终验。
- [`plans/README.md`](../../plans/README.md) 把「四片全交付 + 等人终验」定义成合法活跃卡。
- [261006-chief-of-staff-experience](../../plans/261006-chief-of-staff-experience.md) 写：本卡的家是设计意图与 Goal 史，交付证据以 implemented note 为家。
- 那篇 note 已归档，计划仍链着它。交付证据的家被标成「不要再打开」。

开屏卡留下等真人终验，符合 plan-to-note：人的确认还缺，卡就留着。断的是归档把 why 抽走之后，261006 仍把那篇 note 写成交付证据的家。playbook 不升进技能目录是它自己的契约，不靠再复制一份来修。

### 3. 测试：地图把三种不同的观察说成同一件回归资产

DSH [12](file:///Users/bowhead/deepseek-harness/_dsh_plugin_agent_ready_development/sdlc-reference/12-agent-contract-evidence.md) 固定三件，各证明各的：

| 资产 | 证明什么 | 本仓 |
|---|---|---|
| 模型看见的请求能从日志重建 | loop 请求与日志派生一致 | 用的是 vendor 的不变量；本仓没有自己的比对 |
| 可回放会话 | 非平凡的模型可见改动，同一笔变更里更新录制转录。包测试、eval、纯 mock、决定记录都不能代替它 | 台阶⑤未建，触发条件仍在 [`snapshots/README.md`](../../../snapshots/README.md)。replay patch 是调试探针，行 id 或 `file` 形状错会静默落到真模型，不是半套快照 |
| 外部世界 | 重跑命令或重读文件。探 agent 自己的话会放过会自报的 agent | host spec 读文件；web-face 两场景读 DOM。行为质量多半读会话日志和 eval 判决 |

完成判断在 DSH 是五格分开的：三件资产为绿、真模型冒烟、语义评审、批准分、goal complete。本仓收尾句是 `pnpm typecheck && pnpm test && pnpm verify`（pre-push-evidence）。这三样都不跑 eval，也不存在录制转录。

[`docs/testing.md`](../../../docs/testing.md) 把「模型可见面」的回归写成 agent spec + `pnpm eval --only`。`docs/discipline.md` 把这件事登记成「照搬 + 适配」。对照 12，eval 只相当于有 key 的冒烟：证明已发布 profile 对着真模型跑过那一题。它不产生智力分，也不代替组装转录。领域质量另有 `eval:domain` 的人判，不是合并门。

红灯也被加厚了。DSH 只要求新的机械守卫先造错、看红、再撤；改行为和修 bug 只要有一条会为这次回归失败的检查，谁先写没有成文顺序。本仓 §二之三把「造红 → 实现 → 变绿」写成 proposed 实施的必经循环。这是 2026-10-05 用户拍板，不是漏读。它解释了「每片都要发明一个红灯」，同时质量仍不知道在哪：红灯多半在规则 spec 上，不在助手看见的请求上。

未决：下面「第二次校正」里的两处改字，用户认不认。测试先行（2026-10-05）不在这次吸纳里动。

### 待答问题

硬规则 3 的「note 同 diff」改成条件句，以及归档技能补上「代码里已经有这个行为」不算归档理由——这两句认不认。

### 待跑实验

无。这是归属和证明对象的判断。

### 喂给谁

认之后的 proposed 卡。实施时每条单独一片，不和开屏终验、输入边界、vendor 语料分家捆在一起。

## 候选与取舍

### 第一次写错的吸纳（不再作为候选）

1. **implemented 里看见 `## 提案` / `## 验收` 就让 verify 红。** 这条 2026-09-24 已经不吸。[吸收记录](../../../notes/archived/2026-09-24-agent-note-lifecycle-absorption.md) 在用户「点和吸纳，不要推翻」之下写明：全格式门禁不吸，只机械化「输掉的方案」。[`notes/README.md`](../../../notes/README.md) §二之二写明再钉正文结构会逼出凑节。[plan-to-note](../../playbooks_plan_and_validate/plan-to-note.md) §4 写明 verify 绿了，语义失败还在，这是故意的。
2. **下次改模型可见面就用 replay patch 录一个场景。** 2026-10-05 [测试资产审计](../_reference/tech-exploration/261005-repo-test-asset-audit.md) 已把 [`preset-runner-replay.patch.yml`](../../../dev/probes/session/preset-runner-replay.patch.yml) 定为调试探针：行 id 写错或 `file` 形状错会静默不激活，真实模型照答，看起来像绿。它不是 DSH 那种「提交的 JSONL 既是回放输入又是预期结果」的快照。触发条件没被这次重挖证明已经响过。
3. **把证据地图再拆成三格标签。** `testing.md`、`discipline.md`、`validation-evidence`、`snapshots/README.md`、`architecture.md` 已经各写了一遍适配。再写一格不改变实际跑的命令。

### 第二次：真正该动的两句

生产压力在常设指令，不在缺一张新表。

1. **把硬规则 3 里的 note 改成条件。** 根 [`AGENTS.md`](../../../AGENTS.md) 硬规则 3 写「一次交付 = 代码 + 测试 + docs/README + note 同 diff」。每个开工会话都读这句。2026-09-24 已经把写 note 的义务收成「代码、测试、现行文档装不下的 why」。收窄写在 [`notes/README.md`](../../../notes/README.md) §〇，硬规则没改完，所以每片仍交一篇，活动树胀了再整批归档。吸纳就是把硬规则 3 改成：note 只有 §〇 要写时才进同一 diff。不新加门禁。
2. **归档理由改成「四个错误还会不会发生」。** [`docs/AGENTS.md`](../../../docs/AGENTS.md) 规定合同不链接单篇 note、只写现在做什么。于是「结论已经在合同或代码里」永远不能把 why 留在活动树，归档技能里「现行文档引用了它就留下」对 docs 也不会触发。2026-10-08 开屏 note 因此被冻住，而「第一句话由客户端合成」不在任何合同里。吸纳是改 [note-archive-judgment](../../../.agents/skills/note-archive-judgment/SKILL.md) 的归档条件：代码或合同里有这个行为，不算归档；四个错误（否掉的做法被再提、看着代码编理由改回去、说不清约束在保护什么、不翻 git 就不知道为什么）还有一个会在以后的改动上发生，就留在 `implemented/`。不把 45 篇搬回来。下一次归档用这个条件。已经冻住、why 又不在合同里的，另一次逐篇判断，不进这一片。

衔接不用新门。开屏卡停在等人终验，符合 [plan-to-note](../../playbooks_plan_and_validate/plan-to-note.md)（人的确认还缺，卡就留着）。断的是那篇 note 被归档之后，[261006](../../plans/261006-chief-of-staff-experience.md) 仍写「交付证据以 implemented note 为家」。playbook 自己写了不升进 `.agents/skills/`。硬规则 3 改完，下一片就不会再把切片日志写成 note。

测试也不新造资产。`pnpm eval` 的判决在 [`dev/eval/checks.mjs`](../../../dev/eval/checks.mjs)：伤害地板（不写文件、不 commit）、技能是否按名加载、对最终回答的正则。正则可以撞上凑巧的句子。段落有没有进请求，由 `tests/agent/` 的摘要断言或一次 `repo-live-probe` 证明，不由 eval 证明。领域质量的位置已经是 `pnpm eval:domain` 的人判。desk 是否真写了，eval 里的 `wrotePath` / `fileShape` 会重读文件，这是外部世界那一格里本仓已经有的部分。假的是 [`docs/testing.md`](../../../docs/testing.md) 模型可见面那一格的「能证明」：它写成「行为地板与段落到达」。这一格改成与 `checks.mjs` 一致。只改这一格，不改触发条件，不把 replay patch 升成快照。

测试先行保持 2026-10-05 的拍板。它和 DSH「只有新守卫必须先看红」不一致，也和 `testing.md` 里 prove-it-red 只约束新守卫的写法并排着。撤不撤是另一次开口，不是这次从 SDLC 吸纳的内容。

输掉的做法：

- **全格式门禁、class 目录、双语 triplet、hash manifest。** 2026-09-24 已登记不吸。
- **把 plan-to-note 复制进 `.agents/skills/`。** 该区契约写明不设默认 promote。
- **再抄一遍 SDLC，或把台阶⑤一次建成主仓快照树。** 平台正文的家是 vendor（[261008-vendor-corpus-home](261008-vendor-corpus-home.md)）。replay patch 的静默失效还在。
- **用覆盖率、变异测试或 CI 矩阵填质量。** 参考 12：覆盖率证明行跑过；变异测试在主仓仍是 proposed；本仓没有 CI。
- **整批把归档搬回 implemented。** 战役收口本来就不是 note。

## 毕业门

- 该做：用户认上面两句（硬规则 3 的条件句、归档技能的四个错误）。然后各一片，先改字，不搬 45 篇，不造快照。证据地图那一格可以跟硬规则同一片或单独一片，它只是把「能证明」改成与 `checks.mjs` 一致。
- 待触发：用户对 2026-10-05 测试先行开口。触发前 §二之三保持原句。
- 不做：Issue / Project / 加权批准 / 发布 lane / 格式门禁 / class 目录 / 把 replay patch 当成快照。
- 消化：两句已经写进硬规则 3 和归档技能，且证据地图那一格与 `checks.mjs` 一致，本卡关闭并指向这三处。
