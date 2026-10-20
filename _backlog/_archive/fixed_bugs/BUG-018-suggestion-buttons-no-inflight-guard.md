---
status: 已修
severity: P1
opened: 2026-10-19
---

# BUG-018：建议按钮没有在途闸——连点「替我盯上」可发两条

> 严重级别：P1（重要）｜发现：2026-10-19｜状态：已修

## 症状

「先试跑一次」/「替我盯上」两个按钮没有 `disabled`：投递已在途时仍可点，`captureFromDesk` 也没有锁。连点两下就是两条 prompt；对「替我盯上」这正是 10-13 重复盯守的形状。点击后正常接受不记任何痕（只有 retry 路径记），界面毫无变化，进一步鼓励第二下。

## 根因（假设）

已确认：`src/client/projection/projection-panel.ts` 的建议按钮没有 `disabled`；`src/client/desk/desk-arms.ts` 的 `captureFromDesk` 没有在途保护。四条桌面臂专门有 launch lock 防双击，这条新车道没有。

## 复现

桌面点任一「替我盯上」，在终态行出现前再点一次；或组件层用 pending 回执渲染后点按钮，观察回调仍被调用。

## 修复关联

用 261019 的 `capturePhase`：`running`/`queued` 时禁用两个动作按钮（与受理位同一闸）；接受痕是否扩大是 261018 片 4 的触发范围，不在本卡。

## 修好定义

pending 期间按钮 disabled（组件一条判据）；真机连点只产生一条会话投递（会话日志/收据计数各一条）。

## 修复（2026-10-19）

`capturePending`（`running`/`queued`）时禁用「先试跑一次 / 替我盯上 / 再试一次」；× 仍可用。组件判据 1 案（pending 时 disabled、无在途时恢复）。接受痕是否扩大仍归 261018 片 4 的触发范围。
