# proposed 卡的定位裁决：「已批未做」退役，改为「毕业待拍板」

日期：2026-10-04 · 状态：**implemented**
依据：fresh-agent 入口链审计（2026-10-04，本切片同 diff 修复）。审计发现 `notes/proposed/` 在入口链上有三种互斥的授权表述
——根 `AGENTS.md` 说它"已批未做"，同文件"意图三通道"③又说它"重大未决"，而 `_backlog/README.md` 主干图明确
"proposed 卡 → **用户点头** → implemented"（批准动作发生在 proposed 之后）。fresh agent 拿到一张卡无法判断能否动手；
且三通道的 ②③ 指向同一目录而定义不同，同段自相矛盾。

## 决定

`notes/proposed/` 卡的唯一定位：**毕业的提案（问题/方案/验收三件齐）+ 待用户拍板**。用户点头或轮内点名即开工；
"批"这个动作发生在 proposed → implemented 之间——「已批未做」的"已批"与该管道相抵，退役。
毕业前的推敲仍住 `_backlog/plans/`（毕业四门，其 README 不变）。

同 diff 对齐的表述面：根 `AGENTS.md`（"两路决定"段与"三通道"段合并为**两通道**，去掉重复的第三个通道）；
`notes/README.md` 开头行；`docs/discipline.md` 工作流行。
顺带把「何时写 note / 取代检查 / 输掉的方案」三条规则自根 `AGENTS.md` **收编进 `notes/README.md` §〇**
（原两处重复书写——第二份清单，正是根文件自己点名要消灭的形态；根文件只留指针）。

2026-10-08 扩展（部分取代，双方互链）：重大新工作**默认必须有卡**——轮内直落改豁免制；本决定的
「点名或点头即开工」拍板门槛不变。见 [intent-channel-default-flip](2026-10-08-intent-channel-default-flip.md)。

## 输掉的方案

- **维持「已批未做」，把"批"解释成"毕业门通过即批"**：输掉——`_backlog/README.md` 主干图把用户点头放在
  proposed 之后，"已批"会让 agent 跳过拍板直接实施（审计中真实出现的歧义）；且通道③"重大未决"与"已批"同段互斥，
  保留一词就得删另一词，等于回到本决定。
- **proposed 拆成 approved / pending 两目录（或加第五个生命周期态）**：多一个状态词就多一套"状态词↔目录"互校与
  命名纪律，破坏"一词一义"（`notes/README.md` §二之二）与四态门禁；可执行性本来就"看各卡自身的状态行与用户拍板"，
  无需新目录承载它。

## 附：审计修复清单（证据面，全部本切片同 diff；claim → 事实）

1. 包 `AGENTS.md`「9 个 plugin 子路径导出（…agent 6…）」vs 生成物「11 个 = host 1 + agent 9 + client 1」
   → 包文件去数字化，指向生成物（"数过即过期"）。
2. `docs/architecture.md` AGENT 面缺 `assistant-ov-shield`（`cordis.patch.yml` preset plugins 里有）、
   host 面缺 `assistant-knowledge-approve` → 两行补齐；§二 围栏内散文（浏览器面段 + 被隔断的"为什么在 host"）移出代码块。
3. **生成器 bug**：`scripts/generate/gen-catalog.mjs` 按插件名前缀分平面，把 host 行 `knowledge-approve-remote` 错标 AGENT
   （与 `identity.md`「host」相抵）→ 改按组合位置（`preset-assistant` 行嵌套深度）分类，重新生成
   `docs/package-catalog.md`（host 2 + agent 8 + client 1），红绿夹具进 `tests/catalog.spec.mjs`。
4. `docs/discipline.md` 漂移审计轮数「三轮共 13 处：零→六→七」vs 技能 SKILL.md「四轮 19：零、六、七、六」，
   且表格行尾悬空一句（`|。两轮实录：…`）→ 数字去实体化指向档案，残句并入第三列。
5. `docs/home.md` 引用已退役的 ROADMAP 队列（"dsh-obsidian 桥 ⏳ 触发型（ROADMAP）"）→ 改指
   obsidian-interop note D2（触发条件在 note，不在队列）；「旧 HOME.md 概念已清零」历史叙事段删除
   （坟墓的家是 soul-and-agents note，docs 只写现在）。
6. 根 `AGENTS.md`「几百词」自述（实际 ~2950 字）→ 去数字；布局表补 `_dist/`、`.agents/`、
   `deliverables/ · .desk/ · .tmp/`（会话运行现场，git 忽略——原先是链上完全未披露的 13 个业务交付目录）；
   `presets/assistant/skills/` 补全包前缀。
7. `docs/testing.md`「命令 owner = 根命令表」与 `docs/dev.md` §四 另有开发环命令的张力 → owner 写成两处各管一段。
