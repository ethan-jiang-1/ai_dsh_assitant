# BUG-002：desk-loop 把「以面板刷新文案开场」的真人会话误判成评测会话

> 严重级别：P2（次要——读数污染，不阻断功能）｜发现：2026-10-01｜状态：活跃 — fixed 2026-10-05：evalRun 判定加第三条件（消息不走面板）——面板消息必带 `rpcId: desk-…` 而 headless 评测的 argv 提交是裸 `{kind:"user"}`（实测两类会话日志头无 cwd/launcher 差异，来源判别子就在消息 source 里）；self-check 双向钉（面板来源单刷点击≠评测、裸 source 题面仍=评测，prove-it-red 精确咬住）+ 真实报告读数复核。修复与本卡归档同 commit

## 症状

摩擦报告（`pnpm desk-loop`）把真人的会话记进「评测会话」账，本人的动作从"人"的读数里消失。
2026-10-01 真实命中：本人的一次真实交互（桌面面板点「刷新桌面」，rpcId desk- 前缀实证非探针
所为）被 desk-loop 判成评测会话——[首开 UX 卡第 8 轮补记](../plans/261001-first-open-ux.md)
在案。代价 = 「等本人真实摩擦」的判断材料缺一块，且无人察觉少算了谁。

## 根因（假设）

分类器 = `windows.length === 1 && TASK_PROMPTS.includes(windows[0].message.trim())`
（`dev/desk-loop-report.mjs:219-222`）：题面命中**且**单消息窗即判评测。而 desk-refresh 评测
任务的题面**就是**面板刷新动作发出的那条文案——真人只点一下刷新（无后续追问）时会话恰好
同形。头两版补丁都被证伪：只看题面会把"真人以刷新开场"误判（自检抓到的第一版缺陷）；
「≤2 条」也不够——一次刷新加一句「好的」就是两条。消息层与真人不可区分是机制事实，
判别子必须在消息之外找。

## 复现

1. dev home 的 web UI：点桌面面板「刷新桌面」，不追加任何消息，结束会话。
2. `pnpm desk-loop` → 该会话进「评测会话」节，不在「本人」节。

## 修复关联（2026-10-05 落地，同 commit 归档本卡）

- **修复**：`dev/desk-loop-report.mjs` 的 evalRun 判定加第三条件 `windows[0].panel !== true`——
  面板消息必带 `rpcId: desk-…`（`speakerOf` 的既有结构判据），而 headless 评测经 argv 提交、
  source 是裸 `{kind:"user"}`（评测/真人会话日志头实测：cwd/preset/delegationDepth 全同，
  **无** launcher 字段——卡上首选的"头字段判别"被证伪，判别子精确化到消息 source 层）。
- **验证**：self-check 双向钉（面板来源单刷点击 ≠ 评测 / 裸 source 题面仍 = 评测），
  prove-it-red 撤条件自检即红（`got true, want false`）；真实 dev home 报告读数复核正常。
- **残余（诚实）**：真人在 web 里手动逐字敲出评测题面且只此一条，结构上与评测不可区分——
  benign，`--all` 仍可见；已写进报告 §限制。
- **同 diff 义务履行**：报告 §限制 段的旧自首（"只有一次点击…会被算成评测"）已随修复改写。
