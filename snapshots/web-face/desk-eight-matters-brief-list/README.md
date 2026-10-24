# desk-eight-matters-brief-list —— 八件事首页的「全部」人读列表

> 场景契约（snapshots/AGENTS.md：录制命令、profile、判据与 fixture 同 diff）。
> harness：[`dev/probes/web/webui-expected.mjs`](../../../dev/probes/web/webui-expected.mjs)（`--eval` + `--wait-text`）；
> 种子复用 [`../desk-eight-matters-first-open/seed.mjs`](../desk-eight-matters-first-open/seed.mjs)。

## 场景是什么

**同一份 eight-matters 种子的首页，点「全部（8）」之后的人读列表**：标题「全部」、`8 件在账上`、
八行（每行标题 / 状态 / 摘要首行）、「它在盯什么」只读日程段、右上「回到今天 / 它记下的 / 完整看板」。
待归户不在这里渲染（只报计数、折进完整看板的后台）；完整看板是列表里的第二个门，不在本场景捕获。

选它是因为「全部」是首页之外唯一的产品级深看入口：旧场景只钉了首页，列表的渲染、行数与
「回到今天」出口没有机器会红的回归面。

## 怎么跑

先按 [`../desk-eight-matters-first-open/README.md`](../desk-eight-matters-first-open/README.md) 的 ①–④ 起好同一个种子 home，
然后：

```sh
pnpm web-expected '<url>' --scenario snapshots/web-face/desk-eight-matters-brief-list \
  --eval "(() => { const b=[...document.querySelectorAll('button')].find(x => (x.textContent ?? '').trim().startsWith('全部')); if (!b) return 'no-all'; b.click(); return 'all' })()" \
  --wait-text '它在盯什么'
# 有意变更：过目 DOM diff 与 PNG 后追加 --refresh 重录
```

`--wait-text '它在盯什么'` 是就绪门：列表在投影下载并点击之后才渲染，且该段只在列表出现；等不到即非零退出、不写基线。

## 比对什么（判据）

`visibleText` 必须含「全部」「8 件在账上」「它在盯什么」「回到今天」「它记下的」「完整看板」、八个标题与摘要首行；
不得含「全部事项」「待认领」原文、「让它替你盯」；`controls` 含八行按钮与三个出口（回到今天 / 它记下的 / 完整看板）；`consoleErrors`/`networkFailures` 必须空。
列表行按夹具原序（payment-a…completed-h）。

## 确定性账

fixture 无 `times` / `proposals` / `receipts`；列表首行取 `summary` 第一行，`reviewLine` 不渲染（无时刻），
无相对时间、无会话列表（全新隔离 home）。没有模型回合，点击是唯一副作用。
