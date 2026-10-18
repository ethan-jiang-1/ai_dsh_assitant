---
status: 已修
severity: P2
opened: 2026-10-19
---

# BUG-022：走查「结果接管」帧拍早了，readback 断言太弱

> 严重级别：P2（次要）｜发现：2026-10-19｜状态：已修

## 症状

`desk-capture-live.mjs` 刚跑出的「结果接管」帧里，在途条仍是"轮到我 / 还没进账"、头部还是"1 条待认领"，而账本已经有 2 条。探针的 `desk-readback` 只找"待认领"（种子里本来就有），所以照样 PASS。本机计时：在途条收口与新片段进头部发生在回合结束后约 4s（该次回合 26s，共 ~30s）——功能对，帧与断言没证明它。

## 根因（假设）

已确认：截图在 `pass('red-line-and-note')` 之后立即拍，没有等到投影 revision 越过；readback 的完成条件用了种子已含的字串。

## 复现

`node dev/probes/web/desk-capture-live.mjs`，看 `.tmp/shots/desk-capture-takeover.png` 与账本 unclaimed 计数（2）不符。

## 修复关联

同文件；断言收口 = 新片段标题出现在桌面 + `.dsha-inflight` 消失（有界轮询），然后再拍"接管"帧。

## 修好定义

探针以"新片段可见且在途条消失"为完成条件再截图；故意把等待去掉会红（prove-it-red），恢复后绿。

## 修复（2026-10-19）

`desk-capture-live` 的接管判据改为：在途条消失 + 头部 `2 条待认领` + 新增片段的 note 前缀出现在桌面，三者同时成立才拍"结果接管"帧；旧断言只找种子里已有的"待认领"，会拍早帧。真车道复跑 PASS（`desk-readback: { count: '1 件在办 · 2 条待认领' }`）。
