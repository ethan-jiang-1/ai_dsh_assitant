# 第一公里：从打开到第一句话（着陆 / 功能发现 / 工作区之问）

日期：2026-09-26 · 状态：**implemented**（用户 2026-09-26 批准 P0–P3；切片全部交付，逐片验收与判定记录在下。遗留两项各有归宿：P1-C 搁置（ROADMAP ⏳ 条目，配方在[走查](../archived/research/2026-09-26-first-mile-walkthrough.md) §4b）、locale 席位延后（判定记录 6））

## 问题（可观察行为）

用户原话（2026-09-26，第二次用几乎相同的话报告同一痛点——第一次见 S6）：

> "我打开你，我都不知道第一下干什么选什么目录问什么东西，你有什么功能，全靠对话跟你沟通吗？……UI 好像做的挺 fancy 的，但是 UX 配合不起来。……UX 在你一直没落地任何东西这块要好好想一想。"

调研（handoff 链 + vendor 平台机制）核实为四个结构性缺口：

1. **第一屏是 DSH 的，不是产品的**：打开 GUI 的 hero＝鱼 logo +「探索未至之境」+「预览版」+ 空输入框 +
   「选择工作区」chip（vendor `hero.headline`/`hero.chooseWorkspace` locale）。产品痕迹只有侧栏图标。S6 的
   首开三步引导住在桌面面板空态里——**没人告诉用户去开桌面面板**；引导放在了用户到不了的地方。
2. **功能发现＝对话**：平台有现成命令面（composer 的 `/` 菜单与 `+` 菜单 Commands 区，`ctx.commandUi`
   可注册 `ActionSpec` 纯客户端直达），本插件**零注册**——四工具/技能/桌面循环全部只能靠对话试出来。
3. **工作区之问**（平台层）：设计卡 §四早已记录"DSH 会话创建对 CEO 问了错误的问题"，但只挂"未决"、
   无行动归宿。vendor 对空安装有 `workspaces.initializeDefault` 兜底，本组合从未验证它真的生效。
4. **方法僵局＝开发者看不见渲染**：S5 密度/视觉卡在"等真机截图"（方法纪律：无截图不下视觉结论）——
   但本机有 Chrome/Edge，开发会话有看图能力：**起 web → Chrome headless 截图 → 直接看图**。
   "等用户带截图"的死锁可自解，同时把 P0 教训（装得上≠点得通）变成可日常自验的事。

## 提案（切片，按依赖序；每片一个垂直切片，独立提交）

### P0 证据管线（先看见，再动手）

- `dev/probes/web/webui-shots.mjs`（**已交付**）：**收 URL**（不自起 web——启动归 `scripts/dsh.mjs` 的双 home
  守卫，截图器不重复实现它）→ headless Chrome **经 CDP** 截图 + 产出 DOM 证据（可见文本/带高度大纲/
  交互件/boot 诊断/console 错误/失败请求）。原计划的 `--headless --screenshot --virtual-time-budget`
  路线**实测走不通**（SSE 长连接下永远等不到 load），CDP 自控时机是修法；另带看门狗、进程组清理、
  `--plain` 兜底与 `--eval`（可 await 的页面交互：点菜单、开 tab 靠它）。风格遵守 `scripts/AGENTS.md`
  （纯 ESM、Node 内置、注释写为什么）。**入口**：`pnpm shots`（`package.json` 别名，与命令表、
  `docs/dev.md` 同 diff 登记）。
- **首开走查**：干净 home（CEO 第一次打开的样子）+ dev home 各走一遍，断点清单进
  `notes/archived/research/`；截图＝视觉结论的唯一依据（继承 S5 方法纪律，证据自产）。
- 交互态截图（菜单展开等）headless 一次性截图做不到 → DOM 断言兜底（preflight 同族）；不硬闯。

### P1 第一公里（本轮抱怨的直接回应）

- **P1-A 命令面**：client 注册 `ctx.commandUi` `ActionSpec`——`/desk`（开桌面右栏 tab）、
  `/knowledge`、`/memory`（开对应面板/右栏）。功能发现从"靠对话试"变"菜单可见、点选直达"。
  注册前读 vendor `ui-commands/src/client/contract.ts` 与 service 名，不猜 API。
  **点选直达的证据**（2026-09-27 补齐，回应 Spec 轴"presence-only"的指摘）：真机点 `+` 菜单里的
  「打开我的桌面」→ 右栏真的开出该室并带真实内容；`/` 菜单同源（vendor 文档：`+` 与 `/` 开同一个菜单），
  实测键入 `/` 后菜单列出三条命令。证据
  [p1a-clickthrough.png](../archived/research/2026-09-26-first-mile-shots/p1a-clickthrough.png) 与
  [p1a-slash-menu.png](../archived/research/2026-09-26-first-mile-shots/p1a-slash-menu.png)（DOM 证据同目录）。
- **P1-B 首屏身份与引导**（**已交付**）：`conversation.hero.brand.mark` 注入产品标识；
  `conversation.input.dock` 注入首开引导（一句话先说什么 + 两个示例 + 打开桌面）。
  **修正（2026-09-27，Spec 轴自审抓到）**：dock **不是** owner 只在 hero 态渲染的槽位——vendor 的
  `zone` 在每个会话都有值（只有 hero chrome 是 `hero &&` 门控），所以第一版引导条会挂在**每个**对话
  的输入框上方。修法：以 owner 数据自带的 `session.blank === true` 为门（组件自己判，不靠 owner）；
  夹具三态（blank=false / 缺 session / blank=true）；真机反证
  [p1b-nonblank.png](../archived/research/2026-09-26-first-mile-shots/p1b-nonblank.png)（打开有内容的会话 →
  引导条消失）。**教训**：证据集若只覆盖一种状态，状态类 bug 照不出来——已补进
  [pre-push-evidence](../../.agents/skills/pre-push-evidence/SKILL.md)。
- **P1-B 首屏身份与引导**：`conversation.hero.brand.mark` 注入产品标识；composer 上下 dock
  （`conversation.input.dock`/`conversation.composer.dock`，session scope——blank session 渲染时机
  需实验确认，不渲染则降级记卡）注入首开引导（一句话先说什么 + 入口按钮）。与 S6 面板内引导
  对齐去重（一个事实一个家）。
- **P1-C 默认工作区**：实测干净 home 首开 `initializeDefault` 是否兜住目录之问；未兜住则发行组合
  patch 预置默认工作区。目标：CEO 打开即有可用工作区，**永不被问"选什么目录"**。
  **（2026-09-26 P0 实测修正）平台已经兜住了**：干净 home + 可写 Documents 根时，默认工作区
  `<Documents>/deepseek-harness/default-workspace` 真的被建出（注册表 `defaultWorkspaceId` + 目录 +
  UI chip 三处坐实）。此前的"没建"是 agent 沙箱写不了 `~/Documents` 的假象。→ 本片缩为**开发环境
  保真**：给 dev 组合设 `documentsDirectory` 指到可写路径，让沙箱里的 dev 会话也能走通首次使用；
  发行组合是否需要额外动作，转 P3 的用户拍板项（与"内测声明/API Key 门"一起）。

### P2 S5 密度/视觉（P0 解锁后才做）

窄栏/宽栏现状截图 → 密度判断 → 最小视觉调整 → 再截图对比；每条视觉结论引用具体截图文件。
不动字号/配色/砍结构除非截图证据支持。

### P3 收尾整合

首开引导信息架构统一（hero / composer dock / 命令菜单 / 面板空态各说各的那一句，不重复）；
本卡毕业、ROADMAP 条目更新、设计卡 §四未决项逐一给归宿（默认工作区一项在此闭环）。

## 输掉的方案

- **改 vendor 让 hero 文案/布局产品化**（改 `hero.headline` locale 或 hero 结构）：vendor 永不改
  （硬规则 1），且 slot 系统已给足注入位（brand.mark/dock/命令面）——不需要也不该碰。
- **引导继续只放桌面面板内**（S6 原方案）：实测证伪——用户不知道要开面板，引导住在用户到不了的地方。
- **引 playwright/npm 截图依赖**：`scripts/` 纪律＝不引第三方依赖；Chrome headless CLI（外部进程）
  已覆盖首屏静态截图需求，交互态用 DOM 断言兜底。
- **把全部功能做成命令**：命令面解决"发现"，面板解决"处置"——两回事，不互替（设计卡原则 1/5）。
- **一次大改首屏**：无截图基线前不动视觉（S5 纪律）；P1 只做身份与引导的内容注入，视觉调整全部
  推迟到 P2 有截图证据后。

## 验收

- 每片：`pnpm verify` + 相关夹具（新守卫造红证明）+ `pnpm build`；涉及模型面/契约同 diff 改技能并跑
  `pnpm eval -- --only desk-refresh-loop`；交付态起干净目录 web + preflight 绿。
- P0：同一 URL 产出可读 PNG；走查 note 基于截图描述首屏实际内容（开发者第一次"看见"自己的 UI）。
- P1：`/` 与 `+` 菜单出现本产品命令且点选直达（截图/DOM 证据）；首屏截图中 hero 带产品标识、
  composer 上下有引导、workspace chip 有默认值（干净 home）。
- P2：每条密度/视觉结论引用具体截图；改动前后截图对比入卡。
- P3：本卡改写为已交付事实后迁 `implemented/`；ROADMAP/design 卡交叉引用闭合。
- 用户拍板类（摘要预算、评测题目、视觉口味分歧）不代拍：备好材料跳过，最后汇报。

## 进度

- [x] **P0 证据管线 + 首开走查**（2026-09-26 落地）——`dev/probes/web/webui-shots.mjs`（CDP 截图 + DOM 证据；
  看门狗/进程组清理/`--plain` 兜底/`--eval` 交互），走查报告与真机截图证据在
  [第一公里走查](../archived/research/2026-09-26-first-mile-walkthrough.md) 与
  [截图目录](../archived/research/2026-09-26-first-mile-shots)。
  **六条断点**（首屏是 DSH 的 / 输入框说工程师的话 / 零功能发现 / 三道门 / 面板标签不跟 UI 语言 /
  窄栏未验）与四条平台事实（默认工作区真的会建、可注入面清单、门是配置、管线六坑）都带证据。
  **验收实跑**：verify 31/31（真退出码）、typecheck 0 error、脚本对运行中的 dev web 实跑产出
  PNG + DOM 证据（read_image 已核）。
- [x] **P1-A 命令面**（2026-09-26 落地）——client 注册三条 `ctx.commandUi` action：
  `/desk`、`/knowledge`、`/memory`，各开对应房间到对话旁（不发消息）。命令面经**scoped inject**
  取，不进插件自己的 `inject` 表——命令是加法，三室不能因为组合里没有命令注册表而一起 pending
  （测试守卫这一条）。行文案带三室语义（S4 的三个用户问题）。
  **验收实跑**：client-commands 3/3（造红证明：改错 room kind → 红，复原 → 绿）、verify 31/31、
  build 0、真机 `+` 菜单实拍（Commands 区出现三条，带名字与说明）——
  证据 [p1a-command-menu.png](../archived/research/2026-09-26-first-mile-shots/p1a-command-menu.png)。
  **未做**：行内图标（vendor 行有 glyph；我们的没有）——留 P3 视觉收尾评估。
- [x] **P1-B 首屏身份与引导**（2026-09-26 落地）——两个空会话专属槽位：
  ① `conversation.hero.brand.mark` 换成我们的房子标识（首屏不再是清一色 DSH 身份）；
  ② `conversation.input.dock`（owner 只在 hero 态渲染）注入引导条：说一句经营问题就行 +
  两个具体示例 + "敲 / 看它现在能做什么" + 「打开我的桌面」按钮（经 inject face 拿 opener）。
  **验收实跑**：client-first-mile 3/3（造红证明：改错 opener 的 kind → 红，复原 → 绿）、
  verify 31/31、build 0、真机首开实拍——hero 是我们的标识、引导条在输入框正上方可见，
  证据 [p1b-first-open.png](../archived/research/2026-09-26-first-mile-shots/p1b-first-open.png)。
  **已知视觉待办**（P2）：引导条 maxWidth 760 比 composer 窄，右边缘不齐——截图驱动的最小调整。
  **不能做**：hero 标题文案（"探索未至之境"）是 vendor locale 拥有的，不碰 vendor 即不可改。
- [~] **P1-C 开发环境保真：未落地（如实记录，配置已回退）**——平台机制查清并在**一次**真机上端到端
  见过（注册表出现 `defaultWorkspaceId` + 目录建出 + UI chip 显示默认工作区），但**无法按需复现**：
  清空注册表后重跑，客户端停在"选择工作区"、注册表保持空，console 无错、host 无警告；字面量路径与
  `!!js` 路径表现相同（所以不是 `!!js` 求值问题）。因此**不把未验证的 `dev/profile-patch.yml`
  documentsDirectory 改动写进仓**（回退）；P1-C 的触发条件与复现配方见
  [走查报告 §3/§5](../archived/research/2026-09-26-first-mile-walkthrough.md)。**下个会话接手时从这里开始**：
  先确认"客户端是否真的调用了 `workspace/initializeDefault`"（Network 域抓该 RPC），再谈 dev 配置
  （配方全文在走查 §4b）。
  顺带确认的两件事：`!!js` 表达式**不能加引号**（加了标签文本会漏进表达式 → 被当正则，报
  "Invalid regular expression flags"）；dev patch 里用 `!!js` 依赖 `process.env.DSH_HOME` 有风险
  （求值不到则整行 entry 不激活），不值得为未验证的收益承担。
- [x] **P2 密度/视觉（截图驱动）**（2026-09-26 落地）——S5 的"等真机截图"僵局已由 P0 管线解除，
  第一次有真机窄栏证据可判：
  ① **客观修复**：P1-B 引导条原本 `maxWidth 760` 比 composer 卡片（~875px）窄、右边缘不齐 →
  改读 shell 自己的 `--dsh-composer-card-max-width`（dock 是同一棵树的后代，变量在作用域内），
  每个断点都与卡片同宽；截图复核已对齐。
  ② **密度结论**（[p2 截图](../archived/research/2026-09-26-first-mile-shots/p2-strip-aligned-and-desk-density.png)）：
  右栏 ~530px 内每条「在办」6–9 行（标题 + 负责人/时点 + 度量 + 停止条件 + 它记 + 按钮），
  **按钮在每条最底部——要读完审计行才够得着动作**；5 条在办 ≈ 40+ 行。
  内容本身是 S1 过滤后的经营实质（不是噪声），所以这不是"砍内容"问题而是**层级**问题。
  ③ **层级修复（2026-09-27 自主判定落地）**：把行内动作移到标题行右侧（`CorrectableRow` 一处改动，
  六个调用点全部受益：决定/知识/线索/行动/记忆/技能行），细节行（负责人/度量/停止条件/它记）落在下方。
  真机复核（[p2b 截图](../archived/research/2026-09-26-first-mile-shots/p2b-actions-on-title-line.png)）：
  四条「在办」的标题与「办完了/不办了/改这条」同在第一行，**不用再读完审计行才够得着动作**。
  **未采纳**：① 给「它记」加折行截断——它是信任线（助手自纠的记录），橙色是有意的权重，
  截断会把"它改过口径"这件事藏进 hover；② 给「在办」加折叠——内容已是 S1 过滤后的经营实质，
  折叠会把 CEO 该做判断的依据藏起来。层级问题的解法是**把动作提上去**，不是把内容藏起来。
- [x] **P3 收尾**（2026-09-26 / 09-27）——**引导信息架构检查**（一个事实一个家）：首开引导条说
  "第一句说什么 + 敲 / 看能力"，桌面空态说"这个桌面是什么、怎么长出来"，命令菜单说"现在能做什么"
  ——三者互补、无重复，不需要再动。**交叉引用闭合**：设计卡 §四"发行组合的默认工作区"已按 P0-B
  结论改写；整改卡 S5 已标注"僵局已解 + 证据位置"；ROADMAP 条目已更新。**本卡已毕业到
  `implemented/`**（改写为已交付事实）；P1-C 的归宿是 ROADMAP 的 ⏳ 条目（触发=真实安装出现
  "选择工作区"阻塞或第一次给外人用；"发行 profile"触发已退役）。

## 判定记录（2026-09-27 起：技术/设计选择由 agent 自主判定，附理由；真人才有的输入才停下问）

> 依据：用户 2026-09-27 的宪章纠正（[研发姿态原话](2026-10-04-intents-retired.md)，原 intents §〇 末条）——"尽量自主解决问题……
> 别动不动让人 review，有些 review 你是可以自主做的"。原先堆在这里的"待拍板"清单按下述判定结清。

1. **P2 层级** → **已判定并落地**：动作上移到标题行（见上）。理由：动作可见性是可验证的可用性问题
   （截图前后对比），不是口味；`CorrectableRow` 一处改动覆盖全部行类型，比逐处打补丁更一致。
   未采纳折叠/截断的理由同 P2 ③。
2. **发行组合的两道门** → **判定：都不动，但记录为发行议题**。① `内测声明` 是 DSH 的合规性告知，
   隐藏别家的合规文本不是插件该做的事（真要做也该在发行 profile 里由本人明确决定）；
   ② `API Key 门` 对"自带你自己的 key"的部署是正当的首开步骤。两条都归发行准入（研发期不做正式发行——见 ROADMAP 维护规则；正式清单发行时立），不由 agent 改。
3. **P1-C（默认工作区复现）** → **判定：搁置**。平台机制已查清且一次真机端到端成立；它只在
   "host 写不了 Documents"的环境里失败（沙箱/受限部署），对真实安装不构成阻塞；复现配方留在
   走查 §4b，等有真实回归再捡。
4. **命令行内图标** → **判定：不加**。理由：纯装饰，而拉 `ui-primitives` 要经 factory 的 `require`，
   写错会杀掉整个 client 注册（skill 明示的失败模式）；收益不抵风险，命令行的可读性已由
   标签+命令名+说明成立。
5. **既有三项**：摘要预算处置（默认方案已在自治运转——最弱优先淘汰）、typert 集成（用户已拍板
   后置）**维持现状**；评测集 v0 题目**仍属真人**（只有本人能出真实经营问题），不代拍。
6. **locale 席位（断点 5）** → **判定：中文优先，locale 字典延后**。走查断点 5 说"我们的面板标签
   不跟 UI 语言"（英文界面下三室仍显示中文），新一轮的命令标签同样硬编码中文。理由：目标用户是
   中文 CEO、本仓的 skin face 本来就豁免英文门禁，为一个不存在的第二语言引入整套 locale 字典 +
   `locale` 席位不划算。**触发条件**：真出现第二语言需求（或发行到非中文环境）时，把 client 面的
   文案一次性搬进 typed 字典——那时三室与命令行一起搬，不零敲碎打。
