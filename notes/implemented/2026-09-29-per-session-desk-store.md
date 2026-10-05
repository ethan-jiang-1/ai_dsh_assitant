# 培养面按会话分 store（per-session desk store）

日期：2026-09-29 · 状态：**implemented（同日毕业同日落地：plans 卡 → RFC → 实现 → 全套绿）**

## 交付了什么

培养面（客户端 `src/client/index.ts`）的 desk store 从单一共享对象改为**按会话分片**：

- **扁平字段 = 主会话片**：走查（newest-five walk）最后应答的会话（`sourceSession` 记名）；
  无人认领时首个定向加载认领（`loadDeskFor` 成功即 `patchDesk({ sourceSession })`）——
  已认领的扁平片不再服务陌生会话。
- **`bySession` 分片**：其余 tab 绑定会话各持一片（data / pending / lastReceipt / stalled /
  readError / sessionUpdatedAt / seq），行级事实（冻结、回执、停滞）从此按 (session, rowId) 归属。
- **每片独立加载序列**（`sliceSeq`）：一个会话的加载不再取消另一个会话的在途读——两个 tab
  同时挂载时的重载乒乓（单一全局序列的必然后果）随之消失。
- **`sendSession` 全局槽废除**：动作函数（askRefresh / answerDecision / … / correctMemory）
  显式带目标会话；tab 面板传自己的 session，无参调用回退 newest 会话。tab 挂载只登记
  `boundSessions`（「跟随对话」的重载遍历刷新每个登记会话），最后挂载的 tab 不再偷走所有发送。
- **视图合并显式取片值**（`mergeDeskSlice` + `DESK_SLICE_KEYS`）：朴素 `{...flat, ...slice}`
  会让分片缺失的键漏出扁平片旧值——正是分片要防的跨会话泄漏，R11 夹具第一版当场抓到。
- **walk 换主时行级状态随主迁移**（`carryRowStateTo`）：旧主的 pending / receipt / stalled /
  readError 移入其自己的分片，不被新主的视图静默重归属。（验收三轮 2026-09-29 抓到首版实现在换主
  前经 `deskSlice(previous)` 解析回**扁平片自身**——行级状态被赋回即将易主的扁平片、随后被新主的
  settle 消费；修复为显式写入 `bySession[previous]`，见证据第三条。）

## 问题（交付前可观察）

主页与 tab 共用单 store、`sendSession` 全局单值（[整改卡 S3 的 A3 记录](../implemented/2026-09-26-cultivation-remediation.md)）；
R11 实测：store 被所有绑定 tab 共享、行匹配只按裸 rowId——A 会话说一句会给 B 会话里同 id 的行盖上
冻结与回执（`askRefresh` 的 rowId `'desk'` 在每个会话都相同，串扰是结构性的；
[二轮整改卡 R11](../implemented/2026-09-27-cultivation-remediation-round2.md)）。
2026-09-29 用户确认多会话并行已是日常使用形态：缺陷从「待触发」变为「正在咬」。

## 证据

- 夹具 `tests/client/client-panels.spec.ts`「scopes the freeze, the settle and the receipt to their own
  session (R11)」：同 rowId 双会话——A 的冻结不落 B 的行（B 面板 0 个禁用按钮）、B 的文件翻新
  不结算 A 的 pending（settle 按 (session, generatedAt)）、回执只落 A 片、停滞过期只释放发送方；
- `pnpm build` 后全套 **288/288** 与 `pnpm verify` **29/29**（client 面规则：整套包级套件、
  fresh lib 上跑——假绿防护来自先 build 后 test 的顺序）。
- 验收三轮机制面补钉（2026-09-29，[台账](../archived/research/2026-09-29-desk-store-acceptance-audit.md)）：
  四夹具经导出面（`apply` + `loadDeskFor` + 假 remote）驱动——①认领路径（无人认领的扁平片服务任意
  会话、首个定向加载成功即认领、认领后不再服务陌生会话）；②认领竞态（双首发共享扁平序列，只有最新
  序列写入并认领）；③walk 换主 carry——**红→绿**：新夹具当场抓到 carry 经 `deskSlice(previous)`
  解析回扁平片自身的 bug（修复后转绿）；④分片 seq 独立性（一会话的加载不再取消另一会话的在途读——
  旧单计数器下该断言必红）。修复后全套 295/295、verify 30/30、`tsc -b` 0。

## 输掉的方案

- **只把 rowId 改成全局唯一**：挡得住同 id 串扰，挡不住 `sendSession` 单值把「当前会话」语义
  泄漏给所有 tab——R11 的两个症状只修一半。
- **换共享状态管理库**：无证据表明现结构不胜任，拆片即修；引库 = 第二事实家 + 新依赖。
- **朴素浅合并视图**（`{...flat, ...slice}`）：分片缺失键漏出扁平旧值——输给显式逐键合并
  （`mergeDeskSlice`），夹具实证。
- （plans 卡阶段未推敲过备选；以上是本切片过程中真实排除的方向。）

## 已知边界

- UI 全局位（note / openError / jumpError / focusKnowledge）仍全局——它们本就不按会话归属。
- 真机（浏览器）双 tab 并行取证未跑（本轮用户不在场）；夹具已钉住 store 级全部症状，
  真机证据留给下次人工在场时补一行（`pnpm preflight` 后双 tab 冒烟）。
