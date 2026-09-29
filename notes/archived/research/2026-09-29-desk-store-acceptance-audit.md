# 培养面 desk store（R11）验收第三轮（换场景：逐条声明独立复核 + 机制面补钉）

日期：2026-09-29 · 状态：已收卷 · 证据范围：[implemented note](../../implemented/2026-09-29-per-session-desk-store.md)
逐条声明对照代码与夹具；亲跑 build/test/verify；新增四个机制面夹具（经导出面 `apply` + `loadDeskFor` +
假 remote 驱动，不戳内部）。方法同前两轮：不信任上一轮（含我自己）写下的手。

## 结论一句话

六项机制声明中**五项成立、一项（walk 换主 carry）是坏的**——新夹具红→绿坐实 bug 并当日修复；
note「夹具已钉住 store 级全部症状」在三轮前是虚高（merge 有渲染断言间接钉住，认领/竞态/carry/seq
四机制全裸奔），补钉后该句才为真。

## 逐条核对表

| # | note 声明 | 判定 | 证据 |
|---|---|---|---|
| 1 | 扁平=主会话片（`sourceSession` 记名），认领后不服务陌生会话 | ✅ 补钉后钉住 | 新夹具①：无人认领时 `deskSlice('s2')===deskStore`；`loadDeskFor('s1')` 成功即 `sourceSession='s1'`；此后 `deskSlice('s2')!==deskStore` |
| 2 | 首个定向加载认领（含竞态安全） | ✅（隐式耦合→显式钉住） | 新夹具②：双首发共享扁平序列，只有最新 seq 的写回过检并认领，先完成者被静默丢弃——seq 守卫**兼任**认领竞态守卫，此前无任何测试钉住这条隐性耦合 |
| 3 | 每片独立加载序列（乒乓消失） | ✅ 补钉后钉住 | 新夹具④：s1 在途读不被 s2 后发加载取消，s1 晚到仍落盘——旧单计数器下该断言必红 |
| 4 | `sendSession` 全局槽废除 | ✅ 代码面 | `index.ts` 仅存两处注释性引用（历史说明）；动作函数显式带会话、无参回退 newest；useEffect 登记 `boundSessions`（渲染型 harness 跑不了 effect，未钉——见残留） |
| 5 | `mergeDeskSlice` 显式取键防漏出 | ✅（间接钉住） | R11 原夹具的渲染断言（B 面板 0 禁用按钮、无「正在处理」）在 flat 持 pending 时即此机制的失效探测器；无需新增 |
| 6 | walk 换主行级状态随主迁移 | ❌→✅ **bug 当日修复** | 新夹具③**红**：见下节解剖 |

## Bug 解剖（第三轮头号发现）

`carryRowStateTo(previous, next)` 在 walk 换主路径于 `patchDesk({sourceSession: next})` **之前**调用，
而它把目的地解析为 `deskSlice(previous)`——此刻 `sourceSession` 仍是旧主，`deskSlice(旧主)` 返回
**扁平对象本身**。于是「迁移」变成：清掉扁平片键 → 又赋回扁平片 → `patchDesk` 换主（不清行级键）→
**旧主的 pending/receipt 留在已属新主的扁平片上** → 换主后紧接着的 `settlePending(新主文件,
新主)` 把旧主的 pending 当新主的结算掉。测试断言的顺序恰好显影：flat.pending 为 undefined（被新主
消费，非被迁移）、`bySession['s1'].pending` 为 undefined（从未收到）。

**修复**：目的地显式写 `deskStore.bySession[previous]`（函数只在换主场景被调，旧主失去主位后其自有
分片**就是** `bySession[previous]`——按定义，不再经 `deskSlice` 的当前所有权解析）。红→绿闭环。

影响面评估：loadDeskFor 路径不调 carry，只有 walk 换主踩；而 walk 只在 `boundSessions` 为空时触发
（apply 启动与会话沉淀且无 tab 挂载时）——真机触发条件 = 主视图走查切主时有行级状态在途，低频但
真实存在；夹具已钉，回归即红。

## 证据链复核（note 声称 vs 我亲跑）

- `pnpm build`（`tsc -b` exit 0）✅——**二轮漏的这一环本轮补上**；
- 全套 **295/295**（288 + 本轮 4 钉 + 并行 export-dist 切片 3）✅；
- `pnpm verify` **30/30**（并行切片 +1 检查）✅——工作树含并行会话在途改动（export-dist），
  本轮提交只 add 自有四路径。

## 残留（未钉/未决，非缺陷即盲区记录）

- `boundSessions` 的挂载登记/注销（useEffect）在渲染型 harness 不可驱动——真机双 tab 证据仍欠
  （note 已知边界原文如此，维持）。
- walk 只在无 tab 挂载时触发：非主 tab 挂载期间扁平片不刷新——已读代码确认，桌面面全部是
  会话绑定 tab，走查视图无独立渲染面，判不可达；若未来出现无 sessionId 的桌面面需重审。
- 认领竞态的「共享序列」语义依赖 `sliceSeq` 对扁平片的特判（模块级计数器）——已由夹具②钉住行为，
  实现细节自由。

## 输掉的方案（本审计自身的取舍）

- **导出 `carryRowStateTo`/`mergeDeskSlice` 做单元级直测**：更简单，但钉的是函数契约而非接线——
  换主 bug 恰在接线（调用时序 + 所有权解析），直测会绿。弃，改走 `apply`+假 remote 的集成驱动。
- **用真浏览器（dev Web UI 双 tab）取证**：note 已把真机证据列为人工在场项；headless CDP 驱动双
  tab 并行的搭建成本远超本轮问题面。留给原计划。
