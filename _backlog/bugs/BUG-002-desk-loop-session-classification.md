# BUG-002：desk-loop 把「以面板刷新文案开场」的真人会话误判成评测会话

> 严重级别：P2（次要——读数污染，不阻断功能）｜发现：2026-10-01｜状态：活跃

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

## 修复关联（改进候选，未裁决）

- 首选：按**会话来源/启动器**判别——评测是 headless one-shot（`--profile dev-task` 经
  preset-runner），真人走 web UI；会话日志若携带 cwd/来源/launcher 信号即最强判别子
  （vendor 会话头有哪些来源字段待查证，修时先读 `vendor/dsh/packages/session/`，不猜）。
- 备选：评测器写侧标记（one-shot 结束时留 ignorable 事件），分类器只认标记。
- 同 diff 义务：[docs/dev.md](../../docs/dev.md) §desk-loop 行的限制口径（「不证明质量…
  留给人」）随修复收紧。
