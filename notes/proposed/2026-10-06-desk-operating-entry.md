# 全局总助桌面：事项全貌、指定对话与成功读回

日期：2026-10-06 · 状态：**proposed**（主题首次提出日；2026-10-09 授权下游提案准备，产品实施未授权）

## 问题（可观察行为）

**外部结果三要素：** 触发＝打开/重载产品，或本人选择、交代、处理一件经营事项；本人得到＝完整可选事项、当前依据与未知、对应详情/对话，以及处理后可核对的结果；完成条件＝按下方切片形成可复核技术证据，最后由本人在具体任务上判断清楚程度与负担。本次交付是这份提案与交接记录，不是产品结果已经通过。

[总助体验卡](../../_backlog/issues/261006-chief-of-staff-experience.md#已确认的用户结果与原要求的承接)已确认 R1–R7：冷启动进入全局桌面；可看完整事项并自选；宽主区列表/详情并看、窄主区分层；处理时保留对话，只有对应更新成功读回后返回；首用直接交代眼前一事；多会话输入同一权威账本并留来源；本人决定保持中文且重载不重复代拍。三行摘要、推荐语气与密度须经具体呈现比较，未成为固定版式。

当前注册的全局面板不是冷启动默认；最近五个 Session 的工作区快照不是统一账本；通用“有问题”回调不绑定选中事项；更晚的 generatedAt 不能证明本次操作成功。静态事实与源码位置由 [现状复核](../../_backlog/research/positioning/261008-ceo-value-contract-review.md#八本轮主区入口与会话数据路径的静态可行性)拥有。A1–A9 尚无新增产品通过证据，旧交付也未终验。

## 提案

### 产品范围与职责

采用独立全局 `main` 面板作为入口，Conversation 承载指定事项处理；不依赖会话内默认 view 或上游 D7。初始化稳定后选桌面，运行中的显式导航保持本人选择；卸载/重挂及归档当前 Session 的回退不能用循环抢焦点修复。

列表呈现账本接收的完整在办事项，可查看完成记录；推荐有依据且不强迫选第一件，无依据/冲突明示未知。详情保留事项身份、来源、四种时间及更新结果；交代首事时不设公司画像/固定三问门槛。宽窄切换按实际主区可用空间；暂不选固定断点、永久权重或三行数量。

[持续助理结论](../../_backlog/_archive/settled_issues/261008-ceo-operating-loop.md#业务选择与下游交接判断)拥有回款代表情景、更新权限与 Host 账本：普通材料自动留存、明确指令执行、推断的承诺/核对点/完成/放弃变化先确认，模糊归属待认领。单 dataDir、单 Host writer，第二 writer 须拒绝；事项身份、来源、修订、操作幂等、原 Session 提醒及不确定创建恢复按 [V1–V5/V7](../../_backlog/_archive/settled_issues/261008-ceo-operating-loop.md#验收标准)取证。该 owner 尚未实现；本提案接手其桌面读者、路由与读回协作，不声明经营写入已存在或自行另建合并规则。

| 职责 | 拥有与消费关系 |
|---|---|
| 权威业务写入/结果 | Host 经营 module 接收明确身份、来源、operation identity 与 observed revision；持久后返回结果。模型工具调用它，客户端不靠代写投影修改真相；模型无权自行批准权限变化 |
| 只读桌面投影 | 从同一账本生成有 schema/version、ledger identity/revision、事项/来源、操作回执及提醒 pending/failed/uncertain 的投影；不持久第二份可写真相。读失败、缺失、损坏与真实空账本分别表达 |
| 事项处理路由 | 明确 matter 与处理 Session；来源 Session 和原提醒 Session 独立保留。可复用明确可用的处理 Session，否则显式创建/绑定；不凭最近 Session 猜目标，无来源时提示而非偷发 |
| 处理接续/读回 | UI 保存本次事项/处理身份/提交身份；账本提供持久操作结果；处理完成信息与 Session 回合/交互状态交叉核对。列表、详情与返回共享一个 Client module，组件不各自轮询或造完成规则 |
| 展示与体验 | 展示已确认状态、提议/冲突、同步失败与下一步；本人可选、补充、手动返回或重读。推荐判断依业务 owner 提供的事实，不从单个截止日制造优先级 |

### Host 到客户端的读路径

当前 pin 的 Typert Remote manifest 不支持本包任意新增 namespace；`workspaceFiles.read` 要求 Session 地址，其 cwd 来自 Session 记录，不能直接读取全局 dataDir。已有 Session 的固定投影文件是可比较方案，但对无 Session 首屏不闭合，也不能靠隐藏创建业务 Session 补洞。

优先在第一切片验证 **Host 只读投影文件下载**：既有 [ConnectionFetchRoute](../../vendor/dsh/packages/client/connection/src/rpc.ts#L143-L163)提供 exact route，认证/信任检查由 [Host Connection](../../vendor/dsh/packages/client/connection/src/index.ts#L139-L158)承接。这必须是新增的独立 exact GET route，由 Host 固定解析并授权唯一投影路径；绝不复用示例中的通用 `/api/file`，不接受调用者提供的 `path` 参数，不把任意文件读取当安全模板。它不新增经营控制器 RPC，也不注册写接口；[Web Client 分工](../../vendor/dsh/docs/subsystems/web-client.md#remote-communication)将控制器操作归 generated Remote、下载归 Fetch，实施者须保持只读文件语义。

Web Client 使用实际应用挂载地址解析下载 URL，沿同源 cookie 认证，不硬写站点根 `/api`、不读取/转发 launch token。`connection` 的 Client face 没有 `fetch` 方法（[定义](../../vendor/dsh/packages/client/connection/src/client/index.ts#L134-L146)）；下载适配封装在 apply/Client module，组件只收数据与动作。断连时保留最后成功版本并标陈旧，恢复重读；迟到旧请求不能覆盖更新版本。注册须经 ctx.effect 并随 fiber 撤销，重复挂载不重复注册。

这条路径是静态候选，需 K1 真连接/认证/挂载/取消/重挂检查后才采用。仅承诺本提案的 Web 场景，不宣传为任意 shell-owned carrier/桌面运输可用；若该下载用途或 URL 解算无法满足现有连接规则，报告具体阻断，保留候选比较，不绕过认证或升级 pin。

### 指定对话与自动返回

显式提交先绑定 matter 与处理 Session，使用同一次提交身份，失败保留草稿；双击/响应丢失不得静默再发。无 Session 首屏读桌面不创建业务对话；只有本人交代或选择处理时创建/绑定。重载可能由平台初始化空白 Session，须逐个解释新增项，不把它与额外业务对话混为一谈。

自动返回仅在以下条件全部成立时触发：本次处理路径有可重建的目标 matter、processing Session、提交/operation ID 与成功 revision 关联；该 operation 的持久成功和对应 matter/revision 已读回；该处理路径明确没有待输入或审批；所属 Session 回合已 settlement 且未运行；本人仍在该处理路径中。Session idle/turn settled 只是必要条件，不是处理完成的充分条件。自然语言“已更新”、单个 generatedAt、Session 不再 running 或无 pendingInteraction 均不够；[SessionSnapshot](../../vendor/dsh/packages/api/session-controller/src/client/contract/snapshot.ts#L69-L90)与 [Session 状态 hook](../../vendor/dsh/packages/client/ui-session/src/client/index.ts#L58-L65)不能单独证明业务结束。来源/步骤与处理结束的可重建关联须在 K3 落实，不能只要求模型说某个关键词。

模型追问但没有工具写入、仅提交候选待本人确认、审批等待、取消/失败、工具失败后自报成功，都留在可继续处理的对话。已写入但提醒未同步时，按 owner 分项显示已入账/未同步；若本次处理确已结束且操作已读回，可以返回桌面，同时显著保留未同步状态，不称整体成功。

本人另选事项或手动离开后，迟到结果可以刷新对应事项，不能自动抢回桌面/原对话。把这条技术保护加入 A6 负例；重载先读权威状态，不能重放上次 UI 导航或重复提交。处理完成不等于经营事项完成。

### 取代检查与长期后果

检索 proposed/implemented/rejected 后，同决定的当前 owner 为 [2026-10-06 桌面主对象化](../implemented/2026-10-06-desk-primary-view.md)：会话内 view＋偏好、默认落地等待 D7，与此处独立全局入口是**部分反转**。新提案未实施前保留旧 owner 与运行事实，双方互链；其发行 locale/环境决定、既有审批和历史证据不由本提案取代。实施成立时才将被取代的职责同步改写/归档，不提前标 implemented。

[开屏节律 note](../archived/2026-10-07-opening-brief-and-rhythm.md)、[首用 note](../archived/2026-10-05-day0-intake-first-conversation.md)为冻结历史，不改正文或据其当时 PASS 宣称本轮通过。旧验收继续由 [261006](../../_backlog/issues/261006-chief-of-staff-experience.md#关闭条件)和 [261007](../../_backlog/issues/261007-opening-brief-and-rhythm.md#验收结果与证据缺口)承担，共同项在 261007 记结果并互链，不复制第二份结果账。

本提案 excludes：vendor/pin 修改、历史全量迁移、多个经营账本/公司切换、外部数据/IM/对外动作、自动周期催办、完整优先级引擎与长期学习机制。三行摘要可比较，但完整事项和本人自选不可让步。经验/净收益的 [V6/V8/V9 后续范围](../../_backlog/_archive/settled_issues/261008-ceo-operating-loop.md#业务选择与下游交接判断)继续由持续助理交接结论承接；本次接手不撤销、不宣称其已完成。

## 输掉的方案

1. **会话 view＋等 D7 才默认桌面**：view 可以保留为显式导航，无法满足 root 主入口；独立 main 有静态公开路径，先验证它而不把全部需求锁在会话 blank 限制上。
2. **继续最近五个 Session 的快照＋时间戳结算**：不满足统一账本/来源和同次操作读回；只作旧版对照，不能作为新权威或成功条件。
3. **一个推荐大卡/三行代替全貌**：未推荐事项会消失，违背本人自选；摘要仅作辅助候选。
4. **自动问候/新建隐藏业务 Session 读取桌面**：历史会话增殖与错判 fresh 已有记录，也增加调用负担；首屏可读与本人明确处理分开。
5. **自造任意 Remote namespace 或泛用 RPC 绕过生成规则**：本仓已遇 codec/manifest 限制；优先现有只读下载 seam，业务写仍有一个 Host owner。
6. **一次大改后只看截图/模型回答**：不能发现错路由、旧回执、等待输入或持久恢复；按下列独立切片、负例与真实副作用收口。

## 验收

### 切片与真实依赖

以下是方案的独立验证顺序，不是进行中任务板；每片先把反例落为可红检查，再在授权后实现，绿后提交。K1/K2 的固定资料明确标模拟，不借此报告账本或 A1–A9 完整通过。证据选择以 [测试地图](../../docs/testing.md#一页证据地图改什么--跑什么--回归资产在哪--谁能证明什么)为准。

| 切片 | 独立可观察结果 | 阻挡它的真实前提 | 验收对应 |
|---|---|---|---|
| K1 全局首屏读取 | S0/S1/S2 中，真 Host 下载→真 Web Client→全局面板；无业务 Session 可显示固定账本或诚实空/错态，稳定默认选中、显式离开不抢回；认证拒绝与卸载重挂可观察 | 当前 pin 公开注册/下载路径；固定独立预期与隔离 home。无账本产品实现前提，不验证真实业务写 | A1 入口/空错态的子集；V7 下载不替代业务读回 |
| K2 完整事项与空间操作 | 同一固定 7 在办＋1 完成资料，真传输与主区中选未推荐项、看对应详情/依据、宽窄切层级并返回，保留选择/位置；未知不假排序 | K1 可用读路径；实际主区尺寸和长标题/错误资料。无需完整经验或模型推荐算法 | A2 集合/自选、A3；A2 推荐质量仍待 K4 |
| K3 一件事的处理与读回 | 本人交代首事或选择回款 A→明确 Session→追问补充→Host 持久提交→读回同操作→返回仍选 A；首次回复若只是追问，即使该 turn settled/Session idle 也留在对话；只有补充后对应 operation 与 matter/revision 成功读回才返回；失败/旧结果/本人离开不误导航 | K1/K2；261008 的 V1–V3/V7 接口与真实持久证据，单 writer 拒绝；提醒相关恢复依 V4/V5。处理结束须由可重建关联与真实交互状态决定，不由模型文本或 idle 单独判定 | A4–A8、V7；账本/提醒自身验收仍按261008，不从浏览器反推通过 |
| K4 推荐与本人体验 | 同资料现有版/候选，含未知/追问/失败；本人能找到另一件事、看理由、处理并核对结果，再判断层级/话术/确认负担 | K2 可比较呈现、K3 真实处理结果；具体 eval 与日志判读器。无关外部输入/长期学习不是前置 | A2 推荐、A8 本人口吻、A9；对照持续助理 V6/V9，模拟不证明长期收益 |

K1/K2 与经营 writer 的准备可独立开展；K3 必须消费其接口，不等完整 V8 学习。若下载路径失败，先报告该依赖而非先写第二账本；K3 若仅部分状态可用，逐项说明，不能用模拟回执代替持久成功。

### 可执行检查与失败形态

固定材料使用 [S0–S5](../../_backlog/issues/261006-chief-of-staff-experience.md#固定输入独立预期与状态读法)，事前冻结事项集合/来源/状态与各反例的结果。主矩阵 [A1–A9](../../_backlog/issues/261006-chief-of-staff-experience.md#逐项矩阵)拥有完整通过条件；下表落实执行入口和缺失资产，不重复维护 PASS 表。路径/ID 是**拟新增**，先创建真实资产才能运行，不是本轮结果。

| 检查 owner | 命令与拟新增资产 | 必须会失败的行为 |
|---|---|---|
| Host 下载与权威读者 | `pnpm test:host`；拟新增 `tests/host/desk-projection.spec.ts`（包内）＋真实注册/撤销的 composition 断言；新增独立 exact GET route，Host 固定解析唯一投影路径，不接受 `path` 参数；用真临时目录/账本结果、真实连接认证请求 | 无认证读出数据；传入任意 `path` 可读（不能复用通用 `/api/file`）；卸载后路由仍可用；旧修订覆盖新结果；读损坏显示“没事”；投影可反写业务真相 |
| Client 路由/返回规则 | `pnpm test:client` 内拟新增 `tests/client/client-desk-process.spec.ts`，再跑整包 `pnpm test`；纯转移可驱动，导航/订阅用真实 owner 或适当测试层；首次追问场景必须构造 turn settled/Session idle 但无 operation read-back 的状态 | A 选中却提交 B；双击发送两次；首次追问后 idle 就返回；B/旧回执结算 A；仅模型自称完成就返回；审批/失败仍返回；本人离开后迟到结果抢焦点；提醒未同步被称整体成功 |
| 构建与组合 | `pnpm build` → `pnpm test:composition`；注册撤销与重挂由现有 composition owner 接收新断言，先查包 exports/注入声明再取证 | 客户端行待不存在的 Remote namespace；源代码改了但仍用旧 lib；全局面板重复注册或卸载不撤销 |
| 浏览器渲染回归 | `pnpm web-expected` 两既有场景；blank 前置夹具先按 [snapshots](../../snapshots/AGENTS.md)诊断，确认 intentional diff 后才重录 | 忽略 blank 阻断，只跑另一场景宣称渲染通过；旧变体被无依据删掉；以更新期望掩盖不符合 A1–A9 的结果 |
| 几何与真交互 | 先以现有 `pnpm shots '<URL>' --dom --size 1600x1000` 取渲染事实，并在实现片增加同 owner 的耐久探针；探针须实际驱动点击/真输入/返回，输出断言及非零失败码 | 文本在 DOM 却被遮挡/横溢；窄主区丢选择；控件无法真输入；只匹配大纲/截图就报成功。测1280×800、390×844、侧栏挤窄、resize并记录实际主区宽度 |
| 模型与真实副作用 | 拟新增 eval ID `desk-single-matter`、`desk-followup-readback`、`desk-evidence-recommendation`；`pnpm build` → `pnpm test:composition` → `pnpm eval --only <实际 task-id>`；判读器依据真实会话事件/持久结果 | 固定三问才能首用；猜事项归属；只有自然语言“已记住”；造来源/确定排序；追问后没写入却返回；工具失败后自报成功。phase idle 无待办不作金标准 |
| 重载/重连与结果留存 | 上述 probe 驱动同 home ×3 重载、认证/下载断连、回执迟到；[sessionLogs/readEvents](../../dev/reports/usage-report.mjs)对照 Session/prompt/模型请求、账本修订/操作结果与导航目标 | 重载重复提交/造业务对话；旧下载清空已知账本；读回未完成被结算；只留不可复核临时截图而判长期通过 |
| 本人体验 | 技术结果、输入/输出/真实副作用齐备后，按 A9 对照旧单列、列表详情与可选摘要；提供当前未过项和卡住步骤 | 再泛问要不要桌面；把模拟/模型自评/计数当本人通过；旧版不可重現却比较速度；据一次清楚界面宣布经营净收益 |

asset 引用以本仓命名纪律为准，不新增 snapshots 通用证据桶。新 probe 的源码、失败形态及读法随实现提交；运行产物放独立隔离现场，记录可复核位置/基线，临时产物消失后相关证据状态降为不足。会话/持久操作结果优先由已有日志与账本 owner 保留。

### 本轮状态与实施准入

2026-10-09 用户要求 setup goal 后推进，授权的是下游提案准备。当前产品代码、profile、模型面与服务未修改；K1–K4、A1–A9 及新增资产均未执行/未建立，静态接口查证不补产品通过。实施在用户点名/批准本提案后按真实依赖推进；不重复确认 R1–R7、回款情景或既定更新权限。届时先落具体任务/探针与红断言，再实现，阶段收尾只呈本人不可替代的体验判断。
