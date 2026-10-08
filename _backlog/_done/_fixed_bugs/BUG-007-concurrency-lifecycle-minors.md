# BUG-007：并发与生命周期轻缺陷群——房间读改写无锁 + client 拆卸缺失 + 跨时钟冻结（F8/F9/F11）

> 严重级别：P2（次要——真实前提成立但触发条件少见，后果多为静默小丢失或自愈）｜发现：2026-10-07（对抗性语义扫描）｜状态：**fixed 2026-10-07（部分）**——F8 tmp 唯一化已修（并发双写红→绿）。尚未做的三条，重提前先看下面的触发，不另开 note：
>
> **2026-10-08 更正**：上面那句「F8 tmp 唯一化已修」当时只对了一半。修复只落在
> `Room.write()` 一处，**同一模式的另外四个站点原样留着**（`Room.archive()`、
> `domain/skills/usage.ts` 的 ledger、`host/skills-room.ts` 的两处归档写），
> 而 archive 路径紧接着 `rm` 源文件——丢了 temp 不是丢一次改写，是把记录卡在半搬状态。
> 测试面看不见的原因：只有 `write()` 配了并发用例，`archive()` 只有 happy path。
> 根因是当时没有共享的原子写抽象，修法靠 copy-paste 传播，于是传漏了。
> 已由 2026-10-08 的 `atomicWriteFile`（`domain/home/atomic-write.ts`）收成一个 owner 并补上
> `archive()` 并发红→绿用例。**教训**：卡上写「已修」要写清修了几处 call site，
> 否则下一个 agent 会把「已修」当成「这类都没了」。
>
> 1. F8 其余（updateThread 读改写无锁、memory 预算闸 TOCTOU）——desk-loop 或真用出现并发同线程编辑或预算双写时再修；候选是房间写路径单飞队列。
> 2. F9（client 订阅未拆、4s 定时器无拆卸、self-turns fired map 无界）——HMR/dev 摩擦出现，或读过 vendor client 生命周期契约之后再修。不猜 API。
> 3. F11（浏览器时钟对比服务端 generatedAt）——远端 LAN 访问成为真实使用面时再修；本机同钟踩不到。

## 症状

1. **F8（竞态）**：`src/host/research-room.ts:152` updateThread 读改写无锁——两个并发会话追加 evidence 时后写覆盖先写（静默丢一行）；`memory-room.ts:79` digest 预算闸 TOCTOU（两并发 save 都过闸 → 超预算，curate 会再报，自愈）；`domain/home/room.ts:115` 同 id 并发写共用固定 tmp 名（第二次 rename ENOENT，最终文件是错 writer 的）。
2. **F9（生命周期）**：`src/client/index.ts:153-171` sessions 订阅的 unsubscribe 从未持有、4s pending 定时器无拆卸（HMR 重物化残留旧订阅）；`src/host/self-turns.ts:54` `fired: Map<goalId, round>` 只增不减。**host 面 ctx 生命周期本身干净**（扫描收口：无绕过 ctx.effect 的自建资源）。
3. **F11（跨时钟）**：`src/client/desk-core.ts:308` settlePending 用浏览器 `Date.now()` 对比服务端写的 `generatedAt`——远端浏览器（LAN 访问）时钟快几秒 → 桌面已重写却判「未过 at」，DATA GATE 冻到 15×10s 放弃报 stalled（本机部署同钟不可踩）。

## 根因（假设）

home 是跨会话共享持久层（真实前提），但全部测试串行调用服务方法、client spec 无二次 apply/dispose 模拟、时钟用同一假时间——「并发/拆卸/跨时钟」三个形态在测试面整体缺席。

## 复现

F8：两进程同 home 同时 `updateThread` 同一线程追加 evidence → 数其中一条。F11：远端浏览器把时钟拨快 5s → 点桌面动作观察 DATA GATE 冻结。

## 修复关联

证据 = [语义扫描报告](../_reference/tech-exploration/261007-semantic-sweep-src.md) F8/F9/F11；修法方向：tmp 名带随机段 + 房间写路径单飞队列（或文件锁）；client 持 unsubscribe、定时器跟面板生命周期；fired map 按轮收缩；settlePending 改单调序列号或服务端时钟偏移容忍——**修哪几条先按真实使用面出现频率裁**（desk-loop 摩擦报告可提供证据）。
