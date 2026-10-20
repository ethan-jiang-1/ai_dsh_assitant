# 六维改善战役：深审 26 项发现的通改

日期：2026-10-20 · 状态：**implemented**

> 毕业自 proposed 卡。授权链：用户 2026-10-20 23:45「拟订一个 Plan, 然后 setup goal 后推动落地……最后告知我整体的改善情况(打分各个维度)」与 23:50「发现的问题通通要改掉」；2026-10-21 00:58 追加「预算加倍、静默自主完成所有任务」，并钉两条红线——**无论如何遵循本仓流程**、**只操纵本 repo**。切片台账与 26 项逐项对账 = [收口卡](../../_backlog/_archive/settled_issues/261020-six-dimension-improvement-closure.md)；深审依据 = [六维深审报告](../../_backlog/research/tech-exploration/261020-six-dimension-housekeeping-audit.md)。

## 问题（可观察行为）

2026-10-20 的六维深审（五路 fresh 审计员 + 主线对抗复核 + 活体验证）确认：骨架与门禁体系经对抗复核**立住**（当日 S1–S5 打扫战役的声称全部被独立验证），但存在 26 项分级发现——一条被生命周期反转提交甩在后面的 start.sh 文档句（P0）、presenter 管道零断言、web-expected 默认只比一个场景（client 全量重构后第二场景真实漏验）、client 入口装配+逻辑+文案混合体、service.ts 公开契约不完整、四张已收割调研卡滞留活跃区，以及排版噪声/死导出/测试命名两套/flake/vendor 构建产物深 import/头注裸片号等边角。

## 决定

1. **范围 = 全部 26 项一次清完**（用户拍板"通通要改掉"，覆盖报告原"丙批触发条件制"的分批建议——触发条件机制保留给未来新发现，已发现项不再等触发）。
2. **十个切片推进**（文档真相对齐 / 契约归位 / 调研卡随迁 / presenter 管道 spec / web-expected 场景必填 / 反馈链三件 / client 入口归位 / 测试面整顿 / 代码结构归位 / 第三个 web-face 场景），每片独立提交、带红绿或地板证据、收口卡逐项对账。
3. **三个实施期设计裁决**（与深审报告原建议不同处，理由如下）：
   - **web-expected 缺 `--scenario` 即 usage error**（弃"默认循环全部场景"）：各场景 home 契约不同（blank=裸首开、banner=种子+预确认、desk=账本夹具），一次调用本就不可能覆盖全部；隐式默认 blank = 选择性执行陷阱，正是漏验的机理。
   - **宽化 `HomeHost` 补齐路由面方法**（弃 `RoomsHost extends HomeHost` 分立）：service.ts 头注自称服务完整公开契约，当前窄面是抽取时按"房间与摘要"消费者范围截取的产物而非刻意边界；单实现单契约比"一实现两契约名"简单。**审计"直接换 import"的判断经实施校准**：窄契约缺方法才是原战役"6/8"的真实成因，不是纪律未贯穿。
   - **sweep 的 lsof 保护 fail-closed**：活句柄是并行会话在途证据的最后一道保护；lsof 不可用时 `--apply` 拒跑（dry-run 降级带警告），宁可不清也不误删。
4. **mock 白名单扩第四类**：vendor 服务边界允许声明式 stub（替身只出现在 vendor 边界、边界下游全真），采用时必须在 spec 头注登记被替边界与被测接缝——把既有诚实实践从灰区变成成文政策。
5. **测试资产三条新口径**：tests/client spec 裸名对齐被测模块（去 client- 前缀，文档引用同 diff 同步）；共享夹具 `*harness` 形态；spec 夹具家（tests/support/）与运行夹具家（dev/fixtures/）分工以 testing.md 为 owner。

## 输掉的方案

- **分批放行（甲先乙后丙触发）**：深审报告原建议；用户拍板全量通改，触发条件制只留给未来新发现。
- **一次性大提交 / 顺手重构骨架**：十片各自提交（步步为营可回退）；深审已证骨架立住，只修发现、不趁机重造结构。
- **`RoomsHost` 分立契约**：见决定 3——一实现两契约名让未来消费者选边。
- **web-expected 默认循环全部场景**：见决定 3——home 契约不同，语义上不可能。
- **flake 加 retry / 退避重试**：掩盖竞态不是修法（本仓禁掩盖条款）；选"先停后台写链再删"（await prewarmHome 收尾后再清理目录）。
- **随迁卡错链按"复现旧解析目标"修**：baseline 五处 `../../README.md` 按引文证据（锚点只在仓根 README 有效）修到本意目标——旧链接是写卡时少一级 `../` 的潜在错链，恰好撞上同名文件才没被扫描器抓到。
- **把 host-harness 的 memoryPool 一并改"先停再删"**：未观测到 flake、改共享 harness 影响面大——按"触发未到不预建"留下，复发即修。
- **统一刷新 notes/ 里的旧源码路径引用**：notes 是带日期的证据层，历史陈述不改写（归档卡冻结；implemented 卡引用属当时事实）。

## 还会约束以后的后果

- **探针判决带 sessionId**（会话目录快照差集取，不猜"最新目录"）——日志↔截图对时有了 join key；loop-probe 的 `--home` 旗标解析与其它 dev 工具同优先级。
- **评测剔除判据唯一家 = `dev/lib/eval-sessions.mjs`**（题面命中且单消息非面板）：desk-loop/usage/observe 三报告同源共用，剔除数在各自输出单列一行；判据残余与 desk-loop 原有残余一致，如实登记在案。
- **`.tmp` 清扫 = `pnpm sweep`**（默认 dry-run、`--apply` 落锤；openviking / `--keep` / 新 mtime / lsof 活句柄四条保护）——硬规则 8"清扫即回收"从口头机制化。
- **vendor 构建产物深 import 禁止**：一律走 `@deepseek-ai/*` alias 解析 vendor src；fresh clone 不跑 prepare.sh 直接 `pnpm test` 可绿。typecheck 侧按 vendor 规则以 devDep 声明（不进 pnpm pack 产物）。
- **头注契约禁裸片号**：现行契约句或可解析的相对链接指向 notes 卡——对无 transcript 的新 agent 可读。
- **desk 场景确定性账的形状约束**：v1 夹具 matters 不带 times → 日期渲染器不可达、全 DOM 零时间文本；将来给夹具加任何时刻必须重审场景确定性。
- **门禁抓修的人是常态而非事故**：本轮多处修正被门禁当场抓红（identity 认领注记、standing-orders 进度词、命令未文档化、产物新鲜度）后当场改对——这个回路本身就是仓库最重要的资产之一。
