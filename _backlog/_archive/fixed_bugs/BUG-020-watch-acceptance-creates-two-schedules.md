---
status: 已修
severity: P1
opened: 2026-10-19
---

# BUG-020：一次「替我盯上」建出两条排程，还把指令本身记进待认领

> 严重级别：P1（重要）｜发现：2026-10-19｜状态：已修

## 症状

真模型走一次 due-check 的「替我盯上」后，一次性 home 的排程存储里出现两条 active：`at`（"到期了：核一遍 NB-02…"）＋ `weekly`（"每周一早上：替我把到期的账核一遍"）；同时待认领栏多了一条 u-2（"桌面输入行原话；要求按 morning-brief 建排程…"）。一条验收意图变成了两条盯守 + 一条要本人清理的碎片。

## 根因（假设）

已确认表层：建议动作复用 `[桌面]` capture 车道，而 brief 对任何 `[桌面]` 行默认"note 逐字落账、再问要不要立项"（`src/agent/operating-brief/index.ts`）；指令原文因此被当素材落账。模型把"到期核对"同时读成一次性 + 每周，`proactive-watch-live` 的"无重复"只判同 prompt，`at`+`weekly` 照过。要选的是车道语义（UI 指令要不要另用标记/request kind，brief 是否明说"动作行只执行不 note"）和"一次接受=一条盯守"的验收口径——模型可见面，故停等人拍板。

## 复现

`node dev/probes/web/proactive-watch-live.mjs` 到相位 2；读该 home 的 `storages/schedule.json` 与 `assistant-operating/ledger.json`（本机卡在 sandbox approval，落盘证据已产生）。

## 修复关联

与 [Q5/回执 note](../../../notes/implemented/2026-10-19-desk-receipt-terminal-state.md) 的边界节相邻；修 brief 必须同 diff 跑 `pnpm eval` 与真车道探针。

## 修好定义

本人选定车道语义后：一次「替我盯上」只产生一条对应形态的排程；待认领栏不增指令碎片；探针把"恰好一条 + unclaimed 不增"写成判据。

## 修复（2026-10-19）

本人指令「都修了」后选定口径：动作行是命令，不是素材。`operating-brief` 增加动作行例外——执行动作、不把指令本身 `note` 进账本；要求盯守时**恰好一条**排程，不再加一次性副本或第二种节律。

- 合同判据：`tests/agent/operating-brief.spec.ts` 1 案（动作行例外 + 恰好一条文本在场）。
- 真车道：`proactive-watch-live` 一次「替我盯上」→ `schedule_create` 1 次、排程 1 条、`unclaimed 1→1`（无指令碎片）、桌面行 3 呈现新排程。
- 行为回归：`pnpm eval` 9/9 PASS + `desk-daily-brief` web-only NOT EVALUATED（与基线一致）。
