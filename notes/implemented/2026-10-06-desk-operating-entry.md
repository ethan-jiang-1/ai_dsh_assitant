# 全局总助桌面：事项全貌、指定对话与成功读回

日期：2026-10-06 · 状态：**implemented**

## 问题（可观察行为）

**外部结果三要素：** 触发＝打开/重载产品，或本人选择、交代、处理一件经营事项；本人得到＝完整可选事项、当前依据与未知、对应详情/对话，以及处理后可核对的结果；完成条件＝技术面按 K1–K4 形成可复核证据（资产见「验收面」），最后由本人在具体任务上判断清楚程度与负担。

已确认的用户结果 R1–R7（[总助体验卡](../../_backlog/_archive/settled_issues/261006-chief-of-staff-experience.md#已确认的用户结果与原要求的承接)）：冷启动进入全局桌面；可看完整事项并自选；宽主区列表/详情并看、窄主区分层；处理时保留对话，只有对应更新成功读回后返回；首用直接交代眼前一事；多会话输入同一权威账本并留来源；本人决定保持中文且重载不重复代拍。

## 交付

**读路径（K1/K2 的地基）**：Host 只读投影文件下载——**新增独立 exact GET route**，由 Host 固定解析并授权唯一投影路径；**绝不复用**通用 `/api/file`，不接受调用者提供的 `path` 参数。Web Client 用实际应用挂载地址解析下载 URL、沿同源 cookie 认证（不硬写站点根 `/api`、不读取/转发 launch token）；`connection` 的 Client face 没有 `fetch`，下载适配封装在 apply/Client module，组件只收数据与动作。断连保留最后成功版本并标陈旧、恢复重读；迟到旧请求不能覆盖更新版本；注册经 `ctx.effect` 并随 fiber 撤销，重复挂载不重复注册。

**主区（K1/K2）**：真 Host 下载 → 真 Web Client → 全局面板；无业务 Session 时可显示固定账本或诚实空/错态，稳定默认选中、显式离开不抢回。主区支持任意事项选择与详情（摘要、状态、evidence quote、Session/event 定位）：宽区列表/详情双栏，窄容器单 pane，返回列表**保留选择**。

**指定对话与自动返回（K3）**：显式提交先绑定 matter 与处理 Session、使用同一次提交身份，失败保留草稿；双击/响应丢失不得静默再发。无 Session 首屏读桌面不创建业务对话，只有本人交代或选择处理时才创建/绑定。**自动返回**只在以下全部成立时触发：可重建的目标 matter、processing Session、提交/operation ID 与成功 revision 关联；该 operation 的持久成功与对应 matter/revision 已读回；明确没有待输入或审批；所属回合已 settlement 且未运行；本人仍在该处理路径中。**Session idle / turn settled 只是必要条件**——自然语言"已更新"、单个 generatedAt、Session 不再 running 或无 pendingInteraction 都不够。模型追问但无工具写入、仅提交候选待本人确认、审批等待、取消/失败、工具失败后自报成功，都留在可继续处理的对话。已写入但提醒未同步时按 owner 分项显示已入账/未同步，不称整体成功。本人另选事项或手动离开后，迟到结果可以刷新对应事项，**不能**自动抢回桌面/原对话。

**模型面（K4）**：本人能找到另一件事、看理由、处理并核对结果。**推荐质量与三行摘要的密度未定版**（A2 推荐质量仍待真实比较），摘要只作辅助候选。

## 验收面

### 机器资产（真实路径 · 守哪条判据 · 红的形态）

| 资产 | 守什么 | 红的形态 |
|---|---|---|
| `packages/dsh-smart-assistant/tests/host/operating-ledger.spec.ts` | 单 Host writer、operation 回执、同键重试复用/异内容拒绝、重启读回、第二 writer 拒绝 | 账本归约或持久行为变 |
| `packages/dsh-smart-assistant/tests/host/desk-projection-download.spec.ts` | 投影下载 route：认证、唯一路径、不接受 `path` 参数、损坏/版本错大声报错不回退 | 无认证读出数据；传任意 `path` 可读 |
| `packages/dsh-smart-assistant/tests/client/projection-reader.spec.ts` | 读取对象的代际/请求身份保护、401/403/404/422 与损坏 JSON 的区分、断连保留陈旧、dispose 后不发布 | 旧成功覆盖新结果；卸载后仍发布 |
| `packages/dsh-smart-assistant/tests/client/projection-lifecycle.spec.ts` | 卸载 abort/撤销观察、重挂隔离 | 重挂重复注册或泄漏 |
| `packages/dsh-smart-assistant/tests/client/operating-projection.spec.ts` | v1/v2 信封解析：集合身份、修订、标题、active/completed、来源定位 | 只有 revision 的 JSON 覆盖有效投影 |
| `packages/dsh-smart-assistant/tests/client/client-desk-process.spec.ts` · `client-desk-arms.spec.ts` | 四臂返回判据（含八条负例矩阵：A 选中提交 B、首次追问即返回、旧/异回执结算、模型自报、审批/失败仍返回、迟到抢焦点、提醒未同步称整体成功）与臂接线 | 任一条负例变绿 |
| `dev/probes/web/desk-process-e2e.mjs`（dispatcher + `-flow`/`-claim`/`-wake`） | 确定性 e2e：处理流 13 相位 / 认领 9 / 唤醒 8 | 任一相位 fail |
| `dev/probes/web/projection-panel.mjs` | 主区在固定投影（空集合/缺失/损坏/七在办＋一完成）下的读取与呈现 | 探针断言 fail |
| `dev/probes/web/desk-continuity-live.mjs` · `desk-daily-brief-live.mjs` | 真模型 web 主入口：接续读回纪律 / 建每日排程与简报纪律 | 探针 `passed: false` |
| `snapshots/web-face/blank-first-open` · `first-open-draft-banner` | 两场景渲染期望（隔离 home、`--wait-text`） | 漂移 exit 1 |
| `pnpm eval` 的 `desk-single-matter` · `desk-followup-readback` · `desk-evidence-recommendation` | 模型行为与真实副作用（判读器依真实会话事件/持久结果） | 任务 checks 红 |

### 本人的验收面（未取）

**处理流的体验裁决**（话术、层级、确认负担）：2026-10-11 本人裁决"**先挂着，等本人实际使用时再判**"；2026-10-16 本人拍板本卡毕业，本行**保留为本人的验收面**（触发＝本人日常使用或点名），**不记为通过**。走查法（30 秒）：桌面选一件事 →「处理这件事」→ 在会话里说一句进展或改期 → 看返回。

**2026-10-16 agent 代跑观察**（本人授权代跑；以下是**事实**，口味仍归本人）：真机隔离实例（一次性 home + 种子账本 + 真模型）跑 `pnpm desk-walk`，**6 相位全绿**——首屏即账本桌面（4 条事项在场）；按身份选中「在办合同 XR-09 尾款收回承诺 2026-10-20 · 核对 2026-1…」→「处理这件事」→ 会话接管主区、composer 挂载、回合 idle；说一句进展（"款还没到，客户说这周五统一安排"）后回合结算并**自动返回桌面**；「＋ 交代新事项」→ 账本**新建 m-4** → 自动返回并**选中 m-4**；console/network 零异常。素材（截图 + 判决 JSON）落 `.tmp/desk-walkthrough/`（运行产物，消失后证据降为不足，源码可复跑）。**代跑顺手咬出一条测试资产缺陷并已修**：`return-invariant` 原按账本全量判"还有 pending"，与合同"绑定会话在绑定后创建的才阻止返回"不符，在"事项本来就有旧提案"时假红（抓到的是种子夹具里 10-12 就存在的 `p-1`）——修法照交代臂既有的前后快照范式，只算新增（提交 `77640d7`）。

## 输掉的方案

1. **会话 view＋等 D7 才默认桌面**：view 可保留为显式导航，但满足不了 root 主入口；独立 main 有静态公开路径，先验证它，而不是把全部需求锁在会话 blank 限制上（会话 view 仍是显式导航的 owner，见「取代关系」）。
2. **继续最近五个 Session 的快照＋时间戳结算**：不满足统一账本/来源与"同次操作读回"；只作旧版对照，不能当新权威或成功条件。
3. **一个推荐大卡/三行代替全貌**：未推荐事项会消失，违背本人自选；摘要只作辅助候选。
4. **自动问候/新建隐藏业务 Session 读取桌面**：历史会话增殖与错判 fresh 已有记录，也增加调用负担；首屏可读与本人明确处理分开。
5. **自造任意 Remote namespace 或泛用 RPC 绕过生成规则**：本仓已遇 codec/manifest 限制；优先现有只读下载 seam，业务写仍只有一个 Host owner。
6. **一次大改后只看截图/模型回答**：不能发现错路由、旧回执、等待输入或持久恢复；按独立切片、负例与真实副作用收口。

## 还会约束以后的后果

- **取代关系**：本卡与[桌面主对象化](2026-10-06-desk-primary-view.md)是**部分反转**——独立全局 main 可默认桌面、不再以 D7 为触发；会话内 view、偏好记忆、locale/审批与既有回归事实仍由那篇拥有。同决定的取代句子住那篇的「当前取代检查」，此处不复制第二份。
- **已知缺口（如实记，不粉饰）**：滚动位置保留**未实现**（view store 记 `listScrollTop`，但列表容器非滚动元素，记录路径不触发、也无恢复路径——"返回列表保留选择与滚动位置"的滚动半句已按声明漂移修正为仅选择保留）；`turnSettled` 客户端不可得（由已知 running 推导、未知失败闭合）；提醒通道恒 `synced`（V4/V5 未实现，投影 reminders 恒空）；A2 推荐质量未定版；K1 的 live proxy mount、live Connection 断连与同 home Session 增殖审计**未证实**。
- **排除**：`vendor/` 与 pin 修改、历史全量迁移、多个经营账本/公司切换、外部数据/IM/对外动作、自动周期催办、完整优先级引擎与长期学习机制。经验/净收益的 V6/V8/V9 后续范围仍由持续助理的交接结论承接，本卡不撤销、不宣称其已完成。
- **证据读法**：模拟资料不证明真实业务 Session 存在或操作成功；`ready` 只表示 JSON 下载，不是账本或操作成功；运行产物消失后 live 实测证据降为不足（源码可复跑）。
