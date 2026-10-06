# 开屏播报、拍板感与周节律（行为层收口）

日期：2026-10-07 · 状态：**proposed**（用户 2026-10-07 本轮请求点名「_backlog/plans 立卡 + ongoing goal + 一路往前推进」= 开工授权随本轮给出；推敲与证据面见 [_backlog/plans/261007-opening-brief-and-rhythm.md](../../_backlog/plans/261007-opening-brief-and-rhythm.md)，本卡只持问题/方案/验收，不复制推敲）

## 问题（可观察行为）

干净 home 真机走查（2026-10-07，九轮 DOM 逐帧）观察到四条断体验：

1. 每次页面重载自动发一条「你好」（~44.6K tok/轮真模型调用），10 分钟产生 6 个重复会话；Day-2 打开产品假装初次见面。
2. 首问 intake 后页面上 textarea 数 = 0（FirstMileDock 卸载后 style 残留隐藏 vendor composer）——用户无法回答，主线死锁。
3. dashboard「有问题？」按钮点击零反应（其 dispatch 的 `dsh-navigate-to-session` 全仓零监听）。
4. 桌面已有决策/行动/缺口时，开屏仍是「你好」+ intake 反问（模型自猜桌面状态，实测会猜错）；拍板点选项后对话流落入英文机器腔（"Dashboard panel decided on behalf of principal…"）且卡片零反馈。

## 提案

四片顺序实施（每片独立提交 + test-first 红绿收口；细节与取舍见 plan 卡）：

- **Slice 1 开屏弧线修复**：① FirstMileDock hooks 无条件化 + style 正确清理（composer 复活）；② auto-send 退役——has-desk 空白相位由客户端拿 walk view 确定性合成三行口语化播报卡（要你拍的/到期在跟/挡路的缺数，每行可点进对应动作对话，复用面板代发车道），fresh 保留 intake 卡；③ 「有问题？」接通（探索 vendor 导航缝）。
- **Slice 2 拍板感**：拍板句中文化（本人口吻）+ 卡片即时状态（点击即「已拍，记账中」+ 按钮锁定）。
- **Slice 3 每周一坐**：morning-brief 周变体（对账口径、坏消息先行）+ vendor schedule 周期承载（能力实施期核实）+ 桌面节律文案。
- **Slice 4 完整弧线终验**：见验收。

## 输掉的方案

1. auto-send 修去重保留——去重治标，内容物（客套+反问）不是设计要的「它先开口」。
2. 模型侧开屏（自查桌面再开口）——实测 7 秒不查工具就猜错桌面状态；第一句话必须确定性合成。
3. 消息版晨报做开屏——每次打开烧一轮模型；播报卡零 token，真晨报留给 09:00 投递（既有 B1 车道）。
4. 等 D7——blank 相位插件可占（A1 先例），白等上游送掉「第一眼」。
5. 仪表盘化第一屏——中国 SME 调研红线（直觉型经营者要语文题不要数学题）。
6. 本提案内搭车做输入边界设计——独立推敲卡，不搭车。

## 验收

最终判据 = plan 卡毕业门的完整弧线真机走查，逐片可红检查：

- **Slice 1**：`pnpm test`（client spec 含新断言：hooks 无条件化后卸载无残留 style；播报卡三行渲染、行点击触发 sendPrompt、fresh 分支不回归）+ `pnpm build` + `pnpm verify` 全绿；真机：干净 home 打开 → 非 fresh 出三行播报非「你好」；textarea 在 intake 提问后 ≥1 且可见；dashboard「有问题？」点击后主区切回会话面；重载 ×3 无新会话无重复消息。
- **Slice 2**：client spec 断言拍板句为本人口吻中文、点击后卡片进入「已拍」态且按钮锁定；真机走查拍板后对话流无英文机器腔。
- **Slice 3**：真模型走查周报投递内容含对账四块；schedule 行 `at`/周期与桌面 due 对应。
- **Slice 4**：干净 home 全弧线逐帧 DOM（打开→播报→点行→打字→拍板→回执→重载幂等→「有问题」回对话→fresh intake 弧线），证据存档 + plan 卡毕业门逐条勾。
