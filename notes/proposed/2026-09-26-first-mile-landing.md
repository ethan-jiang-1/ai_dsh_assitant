# 第一公里：从打开到第一句话（着陆 / 功能发现 / 工作区之问）

日期：2026-09-26 · 状态：**proposed**（用户拍板 2026-09-26 深夜批准全量 P0–P3；规划对话即本卡的问题与提案节）

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

- `scripts/webui-shots.mjs`：起 web（可指定 home）→ Chrome headless（`--headless --screenshot
  --virtual-time-budget`，外部进程调用，不引 npm 依赖）截关键屏 → PNG 存档。风格遵守 `scripts/AGENTS.md`
  （纯 ESM、Node 内置、注释写为什么）。
- **首开走查**：干净 home（CEO 第一次打开的样子）+ dev home 各走一遍，断点清单进
  `notes/research/`；截图＝视觉结论的唯一依据（继承 S5 方法纪律，证据自产）。
- 交互态截图（菜单展开等）headless 一次性截图做不到 → DOM 断言兜底（preflight 同族）；不硬闯。

### P1 第一公里（本轮抱怨的直接回应）

- **P1-A 命令面**：client 注册 `ctx.commandUi` `ActionSpec`——`/desk`（开桌面右栏 tab）、
  `/knowledge`、`/memory`（开对应面板/右栏）。功能发现从"靠对话试"变"菜单可见、点选直达"。
  注册前读 vendor `ui-commands/src/client/contract.ts` 与 service 名，不猜 API。
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

- [x] **P0 证据管线 + 首开走查**（2026-09-26 落地）——`scripts/webui-shots.mjs`（CDP 截图 + DOM 证据；
  看门狗/进程组清理/`--plain` 兜底/`--eval` 交互），走查报告与真机截图证据在
  [第一公里走查](../research/2026-09-26-first-mile-walkthrough.md) 与
  [截图目录](../research/2026-09-26-first-mile-shots/)。
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
  证据 [p1a-command-menu.png](../research/2026-09-26-first-mile-shots/p1a-command-menu.png)。
  **未做**：行内图标（vendor 行有 glyph；我们的没有）——留 P3 视觉收尾评估。
- [ ] P1-B 首屏身份与引导 · P1-C 开发环境保真 · P2 S5 密度 · P3 收尾
