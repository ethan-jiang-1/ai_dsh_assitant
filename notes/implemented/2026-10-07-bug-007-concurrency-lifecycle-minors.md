# BUG-007 修复（部分）：房间写 tmp 唯一化；锁/拆卸/跨时钟三项触发登记延后

日期：2026-10-07 · 状态：**implemented（部分修复 + deferred-with-trigger ×3）**

> 承接 [BUG-007 卡](../../_backlog/_done/_fixed_bugs/BUG-007-concurrency-lifecycle-minors.md)；证据底稿 =
> [语义扫描报告](../../_backlog/_done/_reference/tech-exploration/261007-semantic-sweep-src.md) F8/F9/F11。
> 卡的裁剪判据 = 按真实使用面出现频率修/延（P2 群）。

## 决定

**修**：F8 的 tmp 名唯一化（`src/domain/home/room.ts` write）——固定 `${path}.tmp` 让同 id 并发写的
第二次 rename 吃 ENOENT（红：并发双写用例先败——B 的 tmp 被 A 的 rename 拿走；绿：`${pid}-${time}-${rand}`
唯一 tmp，双方都 resolve、胜者完整、failures 空）。home 是跨会话共享持久层，这是群里唯一
**确定性可复现**且修法无歧义的项。

**延后（触发登记，重提前先读本 note）**：

1. **F8 其余（updateThread 读改写无锁丢一行、memory 预算闸 TOCTOU）**——触发：desk-loop/真用出现
   并发同线程编辑或预算双写的实证；修法候选：房间写路径单飞队列。TOCTOU 自愈面在（curate 会再报）。
2. **F9 client 订阅 unsubscribe 未持有 + 4s 定时器无拆卸 + self-turns fired map 无界**——触发：HMR/dev
   摩擦实证，或下一轮读 vendor client 插件生命周期契约后一并修（**不猜 API**：client 侧拆卸缝的
   形态需读 vendor 源码定，本轮未读不动手）；影响集中在 dev/HMR 与超长进程，生产 SPA 单次 apply 轻。
   host 面经扫描确认干净（ctx.on/子插件均随 context 清理）。
3. **F11 settlePending 浏览器时钟 vs 服务端 generatedAt**——触发：远端（LAN）访问成为真实使用面；
   本机部署同钟不可踩；修法候选：单调序列号或时钟偏移容忍。

**交付收口**——外部结果：触发 = 巡检立卡；用户看到 = 同 id 并发写不再报错丢写；完成条件 = 红绿 +
三项触发有家。**签收** = room.spec 并发用例先红后绿 + 全量 test 50spec **407**tests + typecheck 0 +
verify 35 绿。**未跑项**：desk-loop 摩擦报告本轮未跑（三项延后的证据面留给触发到场时取）。

## 输掉的方案

1. **全套件修（锁 + 拆卸 + 时钟全做）**——输给卡的裁剪判据（P2 群按使用面频率）：三项的触发场景
   （并发同线程编辑、HMR 重物化、远端访问）当前都不是真实使用面，预修是为想象的未来付费。
2. **F9 按 Cordis host 侧生命周期惯例猜 client 拆卸**——输给硬规则 2（不猜 API，去读）：client 侧
   生命周期契约未经 vendor 源码核实前不动手。
3. **tmp 名带 counter 的模块级计数器**——输给 pid+time+rand 的零状态：计数器是新增共享状态，
   唯一名不需要它。

## 范围与后果

现在为真：房间 write 的 tmp 名每次唯一（崩溃残留的 tmp 文件语义不变——同旧版，只是可能多几个）。
三项延后的触发住本 note（deferred-with-trigger），重提前先读；sweep 报告随最后一张卡毕业迁
`_done/_reference/`。
