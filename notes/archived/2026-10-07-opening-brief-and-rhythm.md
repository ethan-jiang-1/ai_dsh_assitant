# 开屏播报、拍板感与周节律（行为层收口）

日期：2026-10-07 · 状态：**implemented**（四片全交付：Slice 1 `7fe774a` / Slice 2 `636a4a6` / Slice 3 `532c19d` / 本收口同 diff——每片 test-first 红绿收口 + 真机走查；完整弧线走查记录见 plan 卡毕业门节。用户终验（plan 卡毕业门的最后一环）仍待本人上手。推敲与证据面：[_backlog/plans/261007-opening-brief-and-rhythm.md](../../_backlog/plans/261007-opening-brief-and-rhythm.md)）
已归档：2026-10-08（决定已经在合同或代码里；下次改决定不用打开本篇。冻结，不再跟踪。）

## 问题（已观察行为 → 已消除）

干净 home 真机走查（2026-10-07，九轮 DOM 逐帧）交付前观察到四条断体验，本提案全部处置：

1. ~~每次页面重载自动发「你好」~~ → auto-send 退役，重载 ×3 会话数恒定（对照：修复前 10 分钟 6 条、每条 ~44.6K tok）。
2. ~~intake 提问后页面上零输入框~~ → A1 隐藏 CSS 退役 + hooks 无条件化，composer 全相位存活（contenteditable 在场可打字，真机完成拍板与 intake 两轮打字对话）。
3. ~~dashboard「有问题？」点击零反应~~ → `ctx.layout.selectPanel(null)`（vendor ui-layout 正脸，inject 声明加 `'layout'`），真机点击后主区回会话面。
4. ~~开屏客套+反问（模型自猜桌面状态且会猜错）、拍板落英文机器腔~~ → 客户端确定性三行播报卡（walk view 走 useDesk 订阅）+ 拍板走 answerDecision 中文 principal-voice 车道 + 卡片即时「已拍」锁定。

## 提案（已交付事实）

- **Slice 1 开屏弧线**：FirstMileDock hooks 无条件化；auto-send 退役；has-desk 空白相位 = 客户端拿 walk view 合成的三行口语化播报卡（要你拍的/到期在跟/挡路的缺数，每行经 `askAboutDecision`/`askCheckIn`/`askAboutGap` 进对应动作对话——新增后两个 helper，与既有「桌面面板代本人」语汇同族）；fresh 保留 intake 卡；「有问题？」接通。
- **Slice 2 拍板感**：dashboard 选项点击复用 `answerDecision`（与右栏面板同一中文通道）；卡片即时「已拍：X——记账中」锁定（组件本地 state），桌面刷新退场后自然消失。
- **Slice 3 每周一坐**：morning-brief 技能新增周坐一节（ensure-it-exists 先 `schedule_list` 防堆叠；`weekly` 周一 09:00；`[weekly review]` 对账四块、坏消息先行）+ dashboard 节律文案。vendor schedule 原生 `weekly` 承载，零自建机制。
- **Slice 4 完整弧线**：Day-2（点行→对话→打字拍板→回执→新决策上位）与 Day-0（Day-0 卡→intake→打字→桌面长出首份决策→重载播报接班）双弧线真模型走查通过。

## 输掉的方案

1. auto-send 修去重保留——去重治标，内容物不是设计要的「它先开口」。
2. 模型侧开屏（自查桌面再开口）——实测 7 秒不查工具就猜错桌面状态；第一句话必须确定性合成。
3. 消息版晨报做开屏——每次打开烧一轮模型；播报卡零 token，真晨报留给 09:00 投递与周坐投递（既有车道）。
4. 等 D7——blank 相位插件可占（A1 先例），白等上游送掉「第一眼」。
5. 仪表盘化第一屏——中国 SME 调研红线（直觉型经营者要语文题不要数学题）。
6. 修补 A1 的 composer 隐藏 CSS（实施期否决，进 plan 卡输掉的方案 #7）——几何探针实锤自藏：本 dock 挂在 vendor composerStack 内部，藏 composer 必藏自己；A1 时代的「关键词命中」走 DOM 大纲匹配，隐藏元素也在大纲里，可见性从未被证明。
7. 拍板锁定态从 store pending 派生——主面板无会话上下文，pending 落在目标会话 slice 上，walk 视图看不见；组件本地 state 是诚实解（随面板重置无害）。

## 验收（已执行）

- `pnpm test`：45 件 386 断言全绿（Slice 1 +2、Slice 2 +1、Slice 3 +1 断言）；`pnpm build`/`pnpm typecheck` 绿；`pnpm verify` 34 checks 全绿。
- web-expected 两场景重录并 PASS（intentional 变化：无「你好」、桌面图标入镜、composer 在场、播报卡+横幅同框）。
- 真机走查（证据 /tmp/ux-shots/slice1-*…slice4-*）：重载幂等（×3 无增殖无重复开场）、播报卡可见可点、composer 全相位存活、有问题回会话面、拍板中文句+锁定+回执退场+新决策上位、weekly+at 双排程落盘（prompt 格式逐字守约、01:00Z=北京 09:00）、Day-0 intake 弧线含打字与桌面首写。
