# 三室迁往右侧栏：可添加的房间 tab（用户 steer 2026-09-28）

日期：2026-09-28 · 状态：**implemented**（同日提案、同日交付；正文已按交付事实改写）

## 问题（可观察行为）

用户在真机看了当前版本（dev web，2026-09-28 凌晨）后 steer：三室作为**左侧栏主面板**注册，
看内容必须切走对话主区；要的是房间住**右侧栏**、像浏览器与 Terminal 那样**可添加**——对话中
随时「+」添加、多 tab 并开。原话：「3 个你现在放在左边，但是让我更希望是放在右边的 sidebar
里头的，可以添加的……我在对话过程中，我可以开不同的 tab，然后看里头的内容。」

技术缺口：房间 tab **类型**早已注册（chip 与「在对话旁打开」用的就是它），但类型注册不产生
可见入口——「+」向导只列定义带 `guide[]` 条目的类型，我们的注册没带，右栏添加菜单永远看不到三室。

## 决定（已交付）

1. **房间定义补 `guide[]` 条目**（标题/一句描述/房间图标/order 10–12）——三室进入右侧栏「+」向导；
2. **退役左主面板注册**（`sidebar.panellist` + `main` 循环删除，`layout` inject 项与 `deskLayout` 一并撤）；
3. **计数跳转改道 `openBeside(kind)`**（桌面规模区三个可点数字 + S4 草稿指引）；失败路径沿 R9 的
   可见错误（措辞随 tab 化更新）；
4. chip、`/` 命令、tab 体（会话绑定）不变；首开引导条文案随迁（「右侧栏「+」随时开三室」，
   被自己的夹具当场抓住——`client-first-mile.spec.ts` 钉的就是这句）。

## 证据

- **向导验证**（真机 + DOM 证据）：「+」向导同时列出三室（我的桌面/知识室/记忆室各带描述与图标），
  与 New terminal 并列——[guide-rooms 截图](../research/archive/2026-09-27-theme-shots/guide-rooms-1600x1000.png)；
- **房间 tab 打开**：chip 点开桌面 tab，右侧栏在场、真实数据渲染——[roomtab-desk 截图](../research/archive/2026-09-27-theme-shots/roomtab-desk-1600x1000.png)；
- brand spec 更新：注册顺序断言去掉 panellist/main 对、inject 表去 `layout`、**新增 guide 条目断言**
  （`guideEntries` 三条逐一核对）——三室在「+」里这件事从此有夹具钉着；
- 整包 **284/284** · build 0 · verify 32/32；
- **交付当日的真用缺陷与修复**：① 用户真机即报「房间 tab 滚不了」——vendor 面板体是
  `overflow:hidden` 的 flex 列、座位内容自带滚动是它的契约，我们没带。修法：tabBody 全部出口包
  `roomScroller`（flex:1 + minHeight:0 + overflowY:auto）；红绿夹具（根元素样式断言先红后绿）；
  真机复验 scrollHeight 7853 / clientHeight 762、滚得动（[roomtab-scroll 证据](../research/archive/2026-09-27-theme-shots/roomtab-scroll-1200x800.png)）。
  ② 用户即报「在对话旁打开点了没用」——按钮在自己身上打开自己（房间只在右栏 tab 里渲染后，
  该按钮从左主面板时代的跳转入口退化为 no-op）。修法：按钮随左面板退役，`refreshRow` 收敛为单参；
  夹具断言不再出现。③ 用户 steer「tab 上最好每个都有自己的 icon」——注册
  `sidebar.right.pane.tab.title` 座位（照 vendor guide 指南针的形状）：每房间图标 + 动态标题
  （`useTabInfo` 读、常量兜底）；真机验证 tab chip 带 svg。三处均记 brand spec 注册断言。
  顺带学到：vendor 资产按进程 rev 做 immutable 缓存——改 client bundle 后必须重启 dev 服务，刷新不够。

## 输掉的方案

- **左面板 + 右 tab 并存**：双入口双表面＝噪声；用户 steer 是「放在那边」不是「两边」。
- **只补 guide 不撤左面板**：可发现性修了但主体验没变——对话中看内容仍要切走主区。
- **房间重写为右栏原生窄版**：不必要——tab 体已按会话绑定渲染同一组件，R7 的窄面测量本来就在做。

## 后果

- 左主区整页视图（宽屏桌面）退役——若将来想要回宽视图，git 历史可回退，或以「右栏全屏化」
  （PanelChrome 已有 fullscreen）重新引入，不复活左面板。
- 设计卡 §三·形态行已改写为本决定；培养面「三面板」的说法此后指**三个房间 tab**。
