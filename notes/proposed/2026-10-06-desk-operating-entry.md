# 全局总助桌面：事项全貌、指定对话与成功读回

日期：2026-10-06 · 状态：**proposed**（主题首次提出日；用户已点名授权产品实施，K1 推进中，完整验收尚未成立）

## 问题（可观察行为）

**外部结果三要素：** 触发＝打开/重载产品，或本人选择、交代、处理一件经营事项；本人得到＝完整可选事项、当前依据与未知、对应详情/对话，以及处理后可核对的结果；完成条件＝按下方切片形成可复核技术证据，最后由本人在具体任务上判断清楚程度与负担。本次交付是这份提案与交接记录，不是产品结果已经通过。

[总助体验卡](../../_backlog/issues/261006-chief-of-staff-experience.md#已确认的用户结果与原要求的承接)已确认 R1–R7：冷启动进入全局桌面；可看完整事项并自选；宽主区列表/详情并看、窄主区分层；处理时保留对话，只有对应更新成功读回后返回；首用直接交代眼前一事；多会话输入同一权威账本并留来源；本人决定保持中文且重载不重复代拍。三行摘要、推荐语气与密度须经具体呈现比较，未成为固定版式。

实施前，全局面板不是冷启动默认；默认入口子切片使用全局 main 的一次性初始化选择解除这个限制。最近五个 Session 的工作区快照仍不是统一账本；通用“有问题”回调不绑定选中事项；更晚的 generatedAt 不能证明本次操作成功。静态事实与源码位置由 [现状复核](../../_backlog/research/positioning/261008-ceo-value-contract-review.md#八本轮主区入口与会话数据路径的静态可行性)拥有。A1–A9 尚无新增产品通过证据，旧交付也未终验。

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

主区读取链已接入 apply：平台 baseline snapshot store 承接同一读取对象，`hooks.projection` 由真实 renderer 绑定为 `useProjection`；组件零网络/订阅。真实 Cordis [生命周期测试](../../packages/dsh-smart-assistant/tests/client/projection-lifecycle.spec.ts)覆盖卸载 abort/撤销观察和重挂，built classic entry 组合仍覆盖默认选择/Slot 重挂。独立源码审查确认 baseline 模块及 hook 名正确，无确定运行缺陷；其 renderer 覆盖缺口由真实浏览器读取链补证。隔离 `/tmp/desk-k1-blank-q4K2MR` 下，[主区探针](../../dev/probes/web/projection-panel.mjs)分别读固定空集合、缺失、合法 JSON 但 schema 损坏、[七在办＋一完成模拟资料](../../dev/fixtures/desk-projection/eight-matters.json)，预期模拟/缺失/损坏/完成 H 分别可见且 console/network 清洁。临时 DOM 记录分别位于 `/var/folders/0_/42sp51652_79fdjkf6s2xj3w0000gp/T/projection-panel-BsWz2E`、`projection-panel-AYgeDs`、`projection-panel-5cK2c7`、`projection-panel-YlfNdh`（同父目录）；消失后 live 实测证据降为不足，源码可复跑。blank 新状态/重读按钮相对旧期望先红 5 drift，过目 DOM 后重录并复跑绿；审批横幅经实际点击返回 Conversation，沿用原期望绿。主区支持任意事项选择和详情：显示摘要、状态、evidence quote 与 Session/event 定位；宽区为列表/详情双栏，窄容器为单 pane，返回列表保留选择。选择状态属于 Slot view store，业务投影仍由 reader 持有。**滚动位置保留未实现（2026-10-10 源码核实）**：view store 记录 `listScrollTop`，但列表容器非滚动元素（滚动在外层 main），记录路径不触发；且无恢复路径——此前"返回列表保留选择与滚动位置"的滚动半句与代码不符，按声明漂移修正为仅选择保留；恢复需渲染后 DOM 效应，作为已知缺口挂 K2 限制清单。真实宽视口选择探针和 480x900 窄视口探针均通过，console/network 清洁；模拟来源不证明真实业务 Session 存在或操作成功。事项处理路由与业务写入仍未提供。真实主区探针在实际 Web 挂载地址读到 Host 投影，且三次重载无 network failure，作为 mount-relative 请求链的间接证据；未单独保存精确 request URL，也未执行 live Connection 断连与 Session 增殖审计，因此 K1 只按固定投影读取完成，不称完整 A1–A9 PASS。最终 build/typecheck、58 文件/475 测试、verify 36 检查与 release-smoke 通过，真实模型 turn 无 key 跳过；隔离服务均已停止。生命周期锚点已由并行会话提交 `ae2a8d5`，本片仅提交主区消费及对应证据。

Client 内部 [读取对象](../../packages/dsh-smart-assistant/src/client/projection-reader.ts)的 [测试](../../packages/dsh-smart-assistant/tests/client/projection-reader.spec.ts)使用真实平台 snapshot store、仅替换外部网络：断连不 abort 的反例先红，代际/请求身份保护后绿；401/403/404/422 与损坏 JSON 混成统一失败的反例先红，状态区分后绿。最后成功 JSON 在断连/下载失败时保留为陈旧，旧成功/错误、同代际刷新替换与 dispose 后结果不能发布；显式重读可恢复。document-relative 路径、same-origin cookie 与拒绝跨源 base 在用例中成立，不复制 launch token。对象已接入 apply/main；尚未验证真实 browser mount proxy 或 live Connection 断连；`ready` 只表示 JSON 下载，不是经营账本或操作成功。独立源码审查另发现 loading 快照同步通知后仍调用已销毁/替换 Fetch 的窗口；同步 listener dispose/refresh 两条反例实跑为红（0 次实际 1、1 次实际 2），发布后身份检查恢复为绿。build/typecheck 通过；最终整包默认 5 秒期限在既有 digest-budget 20 页写入用例超时，单独默认期限复验亦超时；显式 `vitest run --maxWorkers=2 --testTimeout=20000` 54 文件/457 用例通过（该项实测 1196ms），verify 36 检查通过，未修改测试期限配置；release-smoke 在审查修正前已通过，live 模型无 key 跳过。此处不将默认期限失败涂成 PASS。下载模块未被 client index 引入，构建的 classic 主区行为不变，两 web-face 场景本切片未复跑，不新增 UI 证据。完整 K1 仍需主区消费与这些 live 证据。

Client 内部经营投影 v1 的 [解析器](../../packages/dsh-smart-assistant/src/client/operating-projection.ts)与 [反例](../../packages/dsh-smart-assistant/tests/client/operating-projection.spec.ts)约束集合身份、修订、标题、active/completed 与来源定位；这是 K1/K2 读取 envelope，不是 K3 writer/回执/提醒协议。选择最小字段以支持完整事项与依据读取，四种业务时间、待确认变更与操作回执待真实 owner 接口成立后扩展，不在此伪造。读取对象固定使用 v1 解析器；“只有 revision 的 JSON 覆盖有效投影”反例先红（错误 ready），接解析后保留最后有效投影并标损坏/陈旧为绿。独立审查发现泛用 decoder 允许 identity 或 Promise 绕过 schema，收窄为读取对象直接调用 v1 解析器；测试请求全部改为完整投影。解析后输入数组改动导致投影被清空的反例先红，复制声明字段并冻结嵌套投影后绿。按用户指示将读取 spec 迁为 TS，加入明确快照/Fetch/请求捕获类型；严格数组索引由 capture helper 校验。最终 build/typecheck、58 文件/475 测试、verify 36 检查和 release-smoke 通过，真实模型 turn 无 key 跳过。apply/main 已接线并完成 K1/K2 浏览器证据；不新增 Web 或 A1–A9 PASS。

K1 live 审计补跑：新隔离 home 首次启动因 profile 不存在先失败；按 prepare/setup 后 bundle、认证、67-entry boot graph、Host route 和 classic client 解析均通过，但 preflight 因 workspace registry 无记录及无 `.desk/state.json` 正确拒绝。随后复用已有 workspace 的隔离 home，preflight 通过；同一 URL/token 启动三次独立浏览器，固定投影完成记录 H 均可见，console/network 清洁。该证据证明真实认证启动、built bundle、Host 下载、主区渲染和重载稳定，不证明 Session 数量不增长。已有真实生命周期测试证明 dispose abort、订阅撤销、重挂隔离；live proxy mount、live Connection 断连与同 home Session 增殖审计保持未证实。此前新 home 的 workspace 前置阻断未涂成产品 PASS，服务均已停止。

K3 owner 依赖核查（2026-10-10 更新）：此前判读把"owner module/API 出现"当作外部依赖并保持 blocked-by-dependency；经复核，原始授权措辞为"消费/**落实**有界 Host 账本依赖"，且本提案职责表本就规划 Host 经营 module 由模型工具调用——禁止的是第二份可写真相与自造合并规则，不是实现那唯一的权威 writer。用户已于 2026-10-10 结构化确认按此解读继续。K3 owner 已在本包实现：[AssistantOperatingLedger](../../packages/dsh-smart-assistant/src/host/operating-ledger/index.ts)（单 Host writer、独立 `assistant-operating` dataDir、`writer.lock` 跨进程独占＋死进程接管、`ledger.json` 原子持久）＋[纯核归约](../../packages/dsh-smart-assistant/src/domain/operating/ledger.ts)，切片 A（V2 核心：operation identity 回执、同键重试复用、同键异内容拒绝、同修订一成一败且双方材料保留、重启读回、第二 writer 进程内/跨进程拒绝）以 [host spec](../../packages/dsh-smart-assistant/tests/host/operating-ledger.spec.ts) 落证（commit `cedce04`）。V1 身份已随切片 B（commit `1555227`）在账本层落证（显式接续/改名保 id、同名不同事不合并、模糊片段入待认领通道、显式 claim 附着并保留原始来源与时间、重复 claim 拒绝）；V3 时间/完成与提案通道已随切片 C（commit `a0edd5e`）落证（预测单独记录不动承诺/核对点、明确重约与改核对点分别占修订、完成强制随附依据材料且误关联可 reopen 纠正、推断的重大变化进 pending 提案、显式 confirm 才落确认状态、放弃为独立状态）；模型经营工具已随切片 D 落证（commits `5be1106`/`6c2a8ac`）：`assistant_operating` 工具（11 动作＝观察/普通进展/明确指令/提案/待认领五条权限通道，溯源由工具盖真实 session id，无逐字依据的完成在工具边界拒绝）接入 shipped 组合（host 行 `assistant-operating-ledger` + preset 行 `assistant-operating-tool`，identity.md 已登记）；writer 锁改惰性认领（首次写才抢，同 home 的 web 与 one-shot 可共存），读取恒重载持久态。证据：整包 496/496、组合五工具断言（真 Loader）、verify 36 项、release-smoke（live model turn 无 key 跳过，不作通过计）。投影已随切片 E（commit `d5179f0`）从真实账本生成：下载 route 优先读 `ledger.json` 并即时渲染 v2 投影（逐事项修订、三种账本时间、证据、待确认/已确认提案、**平铺操作回执**＝读回单元、待认领片段、提醒空通道占位）——不持久第二份真相；夹具文件不再压过权威账本，损坏/版本错的账本大声报错不静默回退，K1/K2 固定文件路径原样保留。客户端解析器收 v1/v2 双信封，面板支持 abandoned 与 note 证据。证据：整包 503/503、verify 36 项、两 web-face 场景隔离 home 零漂移 PASS。读回判定核心已随切片 F 第一部分（commit `ef50e90`）落证：处理路径（显式绑定 matter＋处理 Session＋UI 保存的提交身份）与自动返回判定器——turn settled/idle 只是必要条件，只有**本次提交自己的 committed 回执**以不旧于 observed revision 的修订读回且事项仍在场才返回；规格卡的八条负例矩阵全部为红绿测试（A 选中提交 B 拒、同身份异内容拒、首次追问留对话、异/旧回执不结算、模型自报不结算、拒绝回执/待交互留对话、本人离开迟到的成功不抢焦点、提醒未同步带显著提示返回而非整体成功）；路径态刻意内存化：重载先读权威投影，不重放路径不重复提交。面板接线已随切片 F 第二部分（commit `ab51651`）落地：「处理这件事」＝建/认领会话→retain(mainView)→按当前观察修订绑路径→切到 Conversation；四路订阅（投影 store／会话状态／panelInfo／会话目录）馈入判定器，只有其 return 判定才切回桌面面板（slot store 跨切换保留＝「返回仍选 A」）；订阅块守在浏览器边界（headless 客户端上下文无 effect，与 reader mount 同界）。**已知限制**：turnSettled 客户端不可得，由已知 running 推导、未知失败闭合；提醒通道恒 'synced'（V4/V5 未实现，投影 reminders 恒空）。浏览器端到端探针（交代→追问→补充→读回→返回）与 eval 证据未取，无 API key 的模型回合如实记跳过。

**K1/K2 已接受限制清单（2026-10-10 逐项登记，补证前不作通过计）**：① live 反向代理子路径挂载与精确 request URL 未单独取证（三次独立浏览器重载为间接证据）；② live Connection 断连/恢复未实测（单测以真实 snapshot store 模拟代际变化）；③ 重载前后 Session 数量审计未做（不证明不增殖，只证明无 network failure）；④ 窄视口仅证点击进详情，返回导航/resize 存活/所选消失恢复/横向溢出未逐项取证；⑤ `dev/probes/web/projection-selection.mjs` 的 shots eval 断言独立性未核（shots 不因 eval 异常而失败的已知假绿面）；⑥ Node 入口（旧 DashboardMainPanel）与浏览器入口（ProjectionPanel）注册路径分叉，组合生命周期套件证明的是前者；⑦ 最终改动后无独立 K2 review；⑧ 滚动位置保留未实现（见上）。以上与 V4/V5 提醒协调、真实模型行为证据一并列为本提案未闭合面，K4 比较与任何"完整 A1–A9 PASS"声明不得越过它们。

**K3 模型行为验证（2026-10-10，key 由本人授权取自凭证服务）**：三个 eval 任务全部 **PASS**（`desk-single-matter` 52s／`desk-followup-readback` 32s／`desk-evidence-recommendation` 17s，真实模型回合）。会话后的真实账本状态即行为证据：1 事项（entrust 提交、期限未被顺延、2 材料带来源）＋1 **pending reschedule 提案**（客户口头推迟被 propose 而非直接改，确认状态未动）＋1 **待认领片段**（未指明合同的消息保留来源、未按标题乱归）——outcome 混合 committed 2/proposed 1/retained 1，三条权限通道（明确指令执行/推断先确认/普通材料自动留存）在真实模型行为中全部出现。**K4 本人比较（进行中）**：K4 服务起在 `/tmp/eval-desk-gTg2`（含真实 eval 账本：NB-02 事项＋pending reschedule 提案＋待认领片段），URL/token 交本人走「交代→全貌→处理→读回→返回」并判断层级/话术/确认负担；判断结果入本卡后 K4 才算启动。完成前不宣称 K3 通过，模拟 JSON、idle 或自然语言仍不作完成证据。K4 同资料比较仍不能开始：尚无真实操作读回，不请求真人判断。

2026-10-09 的授权仅限下游提案准备；其后用户明确点名继续本提案，授权按 K1–K4 实施，并确认“账本”指跨 Session 的持续经营事项、依据与变更记录，非会计总账。权威记录由独立 Host `dataDir` 托管，不放入 Agent working folder；只读投影接受当前 Harness 全部已认证操作者的信任范围，不声明用户/事项级 ACL。K1 的固定投影不代建经营 writer，K3 仍需真实持久接口。

K1 默认入口子步骤已按红绿测试推进：未选面板时原代码不选择桌面（红）；更换布局/重新物化时仅按布局身份记忆会重选（红）。实现以页面内 WeakSet 记录 Cordis 根上下文的默认机会，主面板注册完成后只消费一次，首次看到其他面板也消费而不跳转；不保存业务数据，不修改公开导航方法。当前 pin 无法区分插件首次激活前的显式 null 与 pristine null；不使用 `beginNavigation` 探测，以免取消已有异步导航。slot/布局重挂和 HMR 的不抢焦点由该一次性决定保护；完整重载以新根重新尝试。可执行合同为 [client-entry.spec.ts](../../packages/dsh-smart-assistant/tests/client/client-entry.spec.ts) 与 [构建物生命周期组合](../../packages/dsh-smart-assistant/tests/composition/client-entry-lifecycle.spec.mjs)：后者通过真实 Cordis/Loader/SlotRegistry/LayoutController/store 覆盖注册先于选择、声明撤销/重挂、Loader 重挂、同 realm 脚本重求值与新根。删除已消费守卫的内存回归输入精确使重复选择断言红，原构建物为绿；不冒充真实 HMR receiver 或 AppFrame bootstrap 证据。隔离 home 下 [blank 默认入口](../../snapshots/web-face/blank-first-open/README.md) 已移除共享业务数据污染并重放 PASS；[草稿横幅](../../snapshots/web-face/first-open-draft-banner/README.md) 经真实点击进入 Conversation，沿用原期望 PASS。默认首屏没有新建业务 Session，点击通用入口返回 Conversation 不证明事项绑定。无桌面文件的 preflight desk-readiness 仍报红，不记为绿；PNG 已采集但当前模型无法视觉审阅，仅 DOM、控制面与无 console/network 错误可计证据。完整 `pnpm build && pnpm typecheck && pnpm test && pnpm verify` 通过。独立 Host 固定下载已由 [Host 插件](../../packages/dsh-smart-assistant/src/host/desk-projection/index.ts)承接：默认 separate `assistant-operating` 目录，不创建经营文件，仅下载固定 `desk-projection.json`。下载核红绿包括 caller query 拒绝、缺失/损坏/I/O 区分、完整多字节 byte cap；真实 Loader/Connection 的 root-owned 注册反例在卸载后仍返回 200 而红，恢复 child fiber 为绿。物理 HTTP [探针与固定资料](../../dev/fixtures/desk-projection/README.md)通过匿名/token 401、cookie 字节一致、Origin 403、query 400、POST 非成功，复用一次性 home 验后停止。`pnpm build`/`pnpm typecheck`/整包测试/`pnpm verify`/`pnpm release-smoke` 通过；release-smoke 真实模型 turn 无 key 跳过。该下载不校验业务 schema，文件为模拟输入；Client 未消费该路由，mount proxy、断连取消与旧结果拒绝未获新证据，A1–A9 不新增完整 PASS。未修改当前 profile、日用数据、vendor/pin 或模型面；用户另批准一次性隔离测试服务。
