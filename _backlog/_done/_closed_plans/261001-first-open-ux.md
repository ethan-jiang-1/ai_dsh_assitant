# 推敲：首开 UX——CEO 打开的第一屏在用三种不属于它的语言说话

> 毕业去向：已消化（2026-10-06）——18 轮首开 UX 工作全部落地（locale/黑话/横幅/空态/工作区修复/首开引导条/桌面按钮层级）；上游 6/6 已递交（Discussions #8939-#8944）；判据「打开不困惑」已转移至 desk-primary-view 的落地战役收口；残余两条被动等待（本人真用摩擦增量 + 上游回复）不再需要本卡作为推敲载体。
> 立卡：2026-10-01 ｜ 状态：已毕业（消化——结论已并入各 implemented note，不再持有活跃未决）｜毕业门判断 = 已消化

## 当前职责边界（2026-10-06 边界收口：判据随形态迁移转移）

第 18 轮记录我方 UX 残余收口；上游 6 条已递交（#8939-#8944，跟踪回复归本卡）。**结构性转向归 [定位卡](261005-open-value-deficit.md) 和 [自洽卡](261005-turnaround-coherence.md)**，桌面主对象化落地时：①完成判据「本人判定打开不困惑」**原样转移**给新形态首开的切片验收（判据不变、表面换了）；②空态三步卡文案（为旧形态 composer 优先所写）由新 UX 切片重写，A'（它先问）已部分取代其第一步；③本卡 18 轮的形态无关资产（locale zh、工作区修复、lead 卡、一键选项、诚实空态分支）由新形态全数继承。**本卡残余 = 上游回复跟踪 + 发行预置决策（workspace/locale 行——须在新形态定形后拍板，不先给旧形态做决定）**；历史 delegated 读数不能替代真人反馈。

## 背景 / 触发

用户 2026-10-01 原话：「DSH 插件一起来之后，你说我怎么操作嘛？看着到处都是困惑。本来想让你帮
我解决问题，结果你给我抛过来这么多问题，UX 上好好想一想 变成 ongoing goal」。
同日以 `pnpm shots`（1600×1000，DOM 证据）实测首屏，困惑点全部落实为可见文本。

## 已知与未决（诊断，全部带 DOM 证据）

**已修（2026-10-01，试用 home 前后对照）**：

- ✅ **侧栏机房日志**：连开发试车场时侧栏有 17 条 agent 自我养护会话（「运行 curate 并报告家现状」
  等）；换干净试用 home（`dev/trial-home`，expert-setup 装配管理岗身份 + 3 页知识种子）后侧栏为
  「No sessions yet」。
- ✅ **工作区之问**：干净 home 首开报 `Unable to create default workspace`，CEO 被要求「选一个文件夹」
  ——first-mile [P1-C 判定记录 3](../../../notes/archived/2026-09-26-first-mile-landing.md) 的触发条件
  （「真实安装出现选择工作区阻塞」）**于本日在干净 home 上稳定复现成立**。根因实测：macOS 上默认
  工作区解析到 `~/Documents`，进程无写权（`mkdir` → `Operation not permitted`）。修法 = P1-C 既定：
  profile patch 给 `workspace-controller` 行 config 指可写 `documentsDirectory`
  （试用 home 已落，重启后首开 chip 变「Default workspace」、不再问目录）。
  **产品级修复**（发行组合是否预置该行）另裁决，见下。

**未决清单处置（2026-10-01 goal 第 1 轮，三项全部带真机前后对照）**：

1. ~~英文 hero「Into the Unknown」与输入框提示~~ **已修（locale 探针结论 + 修复）**：
   - 探针结论（vendor `client/locale` 源码引证）：① **同命名空间二次注册会抛错**
     （`register` 对重复 `ns+locale` 直接 throw）——用我方插件覆盖 vendor `conversation`
     字典的**路不存在**，记为负知识；② **zh 字典 vendor 全套自带**（hero=「探索未至之境」、
     `placeholder.hero`=「描述你想要构建的内容…」）——首屏英文不是缺翻译，是**语言选择**
     （无偏好时随浏览器协商，headless/英文浏览器落回 en）。
   - 修法＝正门：`locale` 行（`@deepseek-ai/dsh-client-locale`）的 `preference: zh` 写入
     home 层 patch（`dev/trial-home/cordis.patch.yml`，等同用户在 Settings→General 选中文的
     落点）。真机前后对照：hero/placeholder/状态条/内测声明全变中文（DOM 逐字在案）。
   - 残余：vendor zh 文案本身是开发视角（「描述你想要**构建**的内容」）——vendor 拥有，
     登记为**上游 issue 候选**，不硬闯。
2. ~~状态条三件套~~ **基本随 1 解决**：「Workspace Write」→「工作区内修改」；剩模型名
   「DeepSeek-V41-Flash / High」——产品名，接受。
3. ~~引导条「三室」黑话~~ **已修**：改为「它替你记下的东西，点右侧『+』随时能看」
   （`src/client` 皮肤 + `client-first-mile.spec.ts` 同 diff 改断言并加 `not.toContain('三室')`
   反夹具；43 client 测试绿；真机 DOM 复核逐字在场）。

**新增未决（第 1 轮发现）**：

- 侧栏品牌「DSH local assistant」仍是英文——**我方皮肤**（identity.md §二：零身份代价），
  但叫什么是产品命名/口味题（如「智能助手」），属用户拍板面，agent 不代拍。
- 发行组合要不要预置 `locale.preference`（中文市场产品默认中文）——随 item 5 的发行准入
  一起裁决。

**第 2 轮（2026-10-01，操作入口面：`+` 菜单 / 桌面板 / 空态）**：

- **`+` 菜单实测（--eval 真点击 + DOM 取证）：健康，不动**。全中文；我方三条命令自带
  自解释描述（桌面=「现在要采取什么行动：等你拍板、在办的事、缺什么」、知识室=「它凭什么
  这样判断」、记忆室=「它把你理解成什么」）；vendor 命令（目标/计划/反馈/压缩/权限/模型/
  下载日志）全中文。正证据入案。
- **桌面空态泄漏已修**：原文案把 `.desk/state.json` 原始文件路径怼在本人脸上、且「点一下」
  没说点哪里。改为「桌面还空着——跟它聊一件事之后，这里会出现它替你记的东西：在办的事、
  待你拍板的决定、缺的数据。急着看，就点下面让它现在写一份。」（说明桌面**是什么、怎么
  长出来**，并把按钮的真实动作=向会话发刷新指令讲清楚；`client-panels.spec.ts` 加
  `not.toContain('.desk/state.json')` 反夹具；43 测试绿；真机 DOM 复核逐字在场）。
- **待验**：会话闭环（CEO 第一句话 → 中文回复 → 桌面长出来）——需要真实输入，等本人打开。

**第 3 轮（2026-10-01，会话闭环彩排：一次性 home 全链真机驱动）**：

彩排方法：复制试用 home 为一次性实例（/tmp/ux-loop-home），headless Chrome 经 `--eval` 真打字、
真发送、真等待生成。**彩排前先抓到并修掉两个会让首句话就翻车的堵点**：

- **首条消息必崩（vendor 发布错位）**：此 pin 的 vendor `ui-chat` **预构建 client bundle 落后于其
  自带 src**——src 的 `TranscriptViewPolicy.adopt()` 有 `?? defaultMode` 兜底，`lib/client.js` 没有；
  全新 home 无 `transcriptView` 存档 → `mode=undefined` → `POLICIES[undefined]` → `conversation.view`
  槽崩溃（`foldCompletedTurns` TypeError），**对话区整片空白**。实测复现（干净 home 第一条消息即崩，
  8 条 console error）。修复走配置正门：`ui-chat` 行 config 预置 `transcriptView: detailed`
  （等同用户选过一次工作详情档位）；修后同场景 **0 console error**。上游 issue 候选：**同 tag 内
  src/lib 漂移**。根修候选（下切片）：经 `repair-vendor` 既有范式从 vendor src 重建 client 产物。
- **试用 home 缺 API key**：`setup.sh` 建的 home 只带 `client-connection` 记录，无
  `refs.DEEPSEEK_API_KEY` → 首条消息 `MISSING_CREDENTIAL`。已把 dev home 的 key 引用合并进
  trial-home（结构只增不改）。

**闭环验证结果（修复后，全链真机）**：发问（中文经营难题）→ **29s 专家级中文回复**
（已知/假设分离、五条可证伪假设各配"能杀它的数"、三透镜分歧保留、动作表带负责人/指标/停止条件、
缺的数据明说"只在你手上"——正是 O1/O3 的产品承诺）→ 点「刷新桌面」→ **33s 桌面文件写出**。
零 console error。

**环境发现（影响交接姿态）**：本会话沙箱内起的服务进程，其 `sandbox-exec` 被嵌套拒绝
（`sandbox_apply: Operation not permitted`，实测 exit 71）→ 助手的一切 bash/文件工具全挂。
**交接服务必须非嵌套启动**（等同用户自起；已按此重启 trial 服务）。

**新发现真 bug（下一切片，非首开阻塞）**：scaffold 把**绝对 dataDir 路径烤进 `AGENTS.md`**
（手册 owner 数据，line 96）而 digest 段不带任何动态路径——home 一旦搬动/恢复备份，手册即指错
位置，模型会跟着读写错处（彩排中实际发生：模型按旧路径读写）。vendor 自身纪律
（`dshHomeDisplay`）是"永不返回机器绝对路径"。修法候选：scaffold 种符号路径（`$DSH_HOME/assistant/`）
+ digest/premium 每 boot 动态带出当前真实路径 + curate 加"手册路径漂移"机器检查。
**彩排方法教训**：复制 home 仿真首装**不成立**（工作区注册表存 canonical 绝对路径，整条链绕回
原 home——桌面文件被写进试用 home，已清理还原）；真仿真必须从头 `setup.sh`。

**第 4 轮（2026-10-01，手册可移植化切片 + 评测归因）**：

- **手册烤死绝对路径 bug 已修（v10）**：布局树根改符号占位，提示词任何段落不再出现机器路径
  （首版"尾部追加位置行"与"摘要头部位置行"两案均被评测 A/B 证伪——路径本身在内容丰富的 home
  里是翻家邀请；详见手册可移植化 note）。
  存量 home 走既有 `manual-stale-scaffold` 版本通道再生。
- **评测两任务既有红立 [BUG-001](../_done/_fixed_bugs/BUG-001-eval-behavior-tasks-red.md)**：A/B 矩阵（基线/在途 ×
  dev/fresh home）证明 `breakdown-uses-skill` 与 `desk-refresh-loop` 与当日改动无关；附带实测
  凭据文件 0600 权限陷阱。
- **评测基础设施发现**：评测会话会写家（今日两条"签单"线索），行为评测读数必须注明 home 状态；
  受控 fixture home 是 BUG-001 的修复方向之一。

**第 5-6 轮（2026-10-01，收尾与反馈管线验证）**：

- 错误路径文案去黑话（两处"组合/服务"话术 → 用户可执行话术；301 测试绿，`e22fe1d`）。
- **👎 反馈管线首次端到端验证**（此前只有自检，真实读数一直为 0）：点击"有问题的回答"→
  分类+备注对话框 → 提交 → `feedback/message-put` 事件落盘（rating/note/category 完整）→
  摩擦报告 §7 读出 "👎 1" 并原样呈现备注。**用户真用时的每一下 👎 都会可靠地流进下一轮的
  修复清单。**
- 本人的第一读数仍未进来（试用 home 0 消息 0 反馈）——静态面与已验证管线全部就绪，
  按"无真实摩擦证据不动 UI"纪律，进入等待态。

**第 8 轮（2026-10-01，探针驱动：发布物级修复 + 等待体验量化）**：

- **首开预置进发布物**（`cordis.patch.yml` 两行 + package-catalog 同 diff）：
  `ui-chat.transcriptView: detailed`（首条消息崩溃的**产品级修复**——全新 home 复现崩溃、预置后
  零崩溃，三处证据闭合）+ `locale.preference: zh`（中文产品的确定性中文首开——此前全新 home
  首屏满英文）。此前两者只在 trial home 手工打补丁，任何新装机器都会踩。`release-smoke` 绿。
- **等待体验量化（waitSamples）**：修复前全新 home 等待 152s **DOM 全冻结**（"它死了"实测）；
  修复后等待**全程可见进展**（bodyLen 1415→6745 连续增长、思考行/工具行全程在场）。"它死了"
  失败模式随崩溃修复一并消失。
- **全新 home 首开竞态澄清**：默认工作区初始化是异步的（~10s），首帧会瞬时显示工作区之问
  并**原地自愈**（探针轮询证实，无需手动刷新）——非阻塞，记录为已知瞬态。
- **探针能力扩展**（note：notes/archived/2026-10-01-cdp-loop-probe-borrowed.md）：
  `--follow-up`（同会话第二轮，多轮连续性一次验证：追问 24s 且引用上一轮跟踪时点）、
  `--dislike`（👎+分类+备注，事件落盘验证）、粘贴重试（全新 home composer 就绪前静默丢文本）、
  顺序化 UI 流程（驱动 evaluate 不 awaitPromise——async IIFE 会被放弃在半路）。探针自身的
  两个 bug（标题毒化子串匹配、同义反复预检）也在运行中抓到并修掉——**探针在测产品，也在测自己**。

**第 9 轮（2026-10-01，审批流承诺验证）**：

- **「⚠ 3 页知识在等你审批（点这里去审批）」承诺兑现验证**（真点击 + 可见性取证）：点击后知识室
  以 720px 可见面板打开，「待你审批（3）」三页草稿各带来源出处与**一击「批准 / 有问题」按钮**——
  CEO 不需要懂 frontmatter 就能完成审批。承诺成立，无 bug。
- **审批行来源路径泄漏已修**（渲染层映射 `friendlySource`：`seeds/` 前缀 → 「内置基座种子页」，
  外部路径逐字保留——那才是真出处；真机验证友好标签在场、`packages/.../seeds` 零残留，301 测试绿，
  页面刷新即取新 bundle 无需重启）。选渲染层而非改种子 frontmatter：一处修好所有 home、存量数据
  零迁移；备选记录于 [note](../../../notes/archived/2026-10-01-cdp-loop-probe-borrowed.md)。


**第 11 轮（2026-10-01，「批准」终点验证——在克隆环境上跑出的教训）**：

- **机制验证 ✓**：点「批准」→ 面板提示进对话 → 模型走 `assistant_reflect promote_page`（进程内
  正道，无审批需求）→ 盘上 `status: draft → stable` 真翻转。审批流的终点是通的。
- **测试环境本身无效**：/tmp/ux-loop-home 是克隆 home——v9 手册烤着 trial 路径 + 注册表指向 trial
  工作区 → 模型身份混乱，回合在多个 home 之间游走，试图编辑 trial home 的知识文件。**审批门成功
  拦截跨 home 写入**（`escalate sandbox` 理由点名实际路径）——安全模型按设计生效；无人在场时回合
  在审批门挂起 28 分钟（无 turn/end）。
- **零损害确认**：试用 home 知识文件 mtime 02:34 原封、桌面文件 09:23（本人刷新）原封——挂起的
  编辑从未执行。
- **教训固化为下一切片**：① 批准流的干净 home 验证（fresh home + expert-setup + 探针 --approve，
  一步到位无克隆伪影）；② 探针加 `--approve` 步骤冻结审批闭环。


**来源呈现候选（未实施）**：种子页来源的产品语言或渲染映射仍待判断。保留真实来源定位，不用友好文案抹掉证据；先查实际审批/预览路径，再区分 repo 种子与 trial 运行数据，不能由资料整理顺手改写运行 home。




**第 8 轮补记（同日 15:5x：第一批真实使用数据进来）**：

- **本人第一次真实交互已发生**：09:22 通过面板点击「刷新桌面」（rpcId desk- 前缀实证，非探针所为——
  探针从不在试用 home 点面板按钮）。助手 42s 完成 desk-refresh 全流程并写出桌面文件。**闭环在真人
  手上转起来了。**
- 桌面面板真数据渲染验证（探针 + DOM 取证）：「⚠ 3 页知识在等你审批（点这里去审批）」把待审推到
  眼前、分区空态友好、零英文残留零治理黑话、底部有"桌面跟随当前对话的工作区"解释行。
- **发现摩擦报告分类盲区**：真人的桌面刷新点击被 desk-loop 判成"评测会话"（desk-refresh 评测任务
  题面 = 面板刷新文案，"只有一条消息的会话"无法区分）——已在 desk-loop §限制 自首的已知局限，
  本次首次真实命中。改进候选：按 cwd/来源区分评测与真人会话（立卡待议，不顺手改）。
- 本人的**实质问句**与 **👎** 仍未到来——等待态继续。



**第 13 轮（2026-10-04，④ 第一读数——用户下放给 agent，naive-CEO subagent 执行）**：

新鲜眼睛读数（无 repo 知识、只凭界面、CEO 人设出声思考；截图/DOM 证据 `/tmp/dsh-webui-shots/shot-17910517*`）：
**三件事全成**（问折扣→1m49s 专家级回答含锚定乘法/假设拆解/让步交换阶梯/行动表+明说缺哪两个数；桌面概念获认（「把等老板动作的事摆成一页看板」）；知识审批全流程走通）。

**摩擦清单（按刺眼序，即下一轮 UX 的合法弹药——满足章程「必须引用具体摩擦条目」判据）**：
1. **批准≠即时生效**：审批变消息跑 AI 一轮 >1min，中途还要求手动刷新桌面（「对话比桌面新」警告）——老板批东西应一秒完事。
2. **盲批无正文**：审批卡只有标题/来源路径；「全部(121字)」点开是来源路径全文非正文；点标题预览不稳定（判决页能开、总经理页无反应）。
3. **占位词与欢迎语打架**：欢迎页说「直接说经营问题」，输入框却是「描述你想要**构建**的内容」（vendor 字典，上游 issue 已登记）。
4. **机器内脏上脸**：tok/s、缓存命中、`state.json +39 -6`、`~/ai_dsh_assitant/dev/...` 绝对路径、英文思考预览、知识页露 YAML 头。
5. **黑话**：「轨迹」「线索」「随包/退役」「工作区内修改」「探索未至之境」（hero 文艺过头）。
6. **重进不回原会话**：刷新落欢迎页。
7. 小垃圾：测试会话残留、标题中英混排。

**亮点（保持）**：会话自动起名；桌面决策卡（A/B/C/D+倾向+「D 不可逆」——「最像给老板做的功能」）；「缺什么」顶到眼前+明说占位不是真数；记忆闭环被感知（「按你批准的那页闸门」）；欢迎语文案是全站标杆。
**总评**：「下周继续用」——能力值时间，但「给工程师套了件西装，皮还得再包一层」。

**残留判据更新**：④ 已以 delegated 形态完成（用户 review 此报告即最终口味门）；摩擦 1-7 为下一轮 UX 切片队列（其中 1/2/4 属我方皮肤面可修，3/6 属 vendor 面=上游候选或组合层 workaround）。

**第 12 轮（2026-10-04，提权全闭环 + 独立审计 + 补测三件）**：

- **环境突破**：经用户授权提权后实测——~/Documents 可写、嵌套沙箱可用（此前两轮的「必须真人起服务」结论被推翻，实测优先于推断）。
- **全闭环（trial home 真机）**：T1 业务问（63s/12 步/零审批）→ T2 桌面刷新（18s/18 步），零 console 错误；**桌面写盘最后一英里首次由 agent 侧验证**（state.json 10-01 09:23/3680B → 10-04 01:29/6238B，generatedAt 更新，契约键齐）。
- **第 11 轮切片①闭环**：知识「批准」按钮 → 指令进对话 → promote_page → 盘上 draft→stable 真翻转（10s 内）+ 决策记忆落盘。被批准页系 T1 答案当场写出的草稿（ask→answer→save_page→approve→flip 全链一条龙）。
- **独立审计（subagent）**：六条陈述全部独立复核属实（含从会话日志逐字节反解 write 内容）；**抓到一处我的判定失误**——探针 firstMileStripShown:false 是**假阴性**（引导条实际渲染在场，DOM 证据；根因=探针一次早采样×引导条异步水合），我未对失败读数二次取证即自行解释。审计评级：放行但补四项。
- **补测 ①②③（agent 侧）**：①探针采样改全 surface 条件轮询（≤12s，持续失败才算失败）→ 同 home 复跑 firstMile:True、exit 0；②👎 管线本 build 端到端（--dislike → feedback/message-put 落盘：negative+分类+备注）；③错误路径（乱码输入）：3s 婉拒、零 console 错误、零崩溃。
- **残余 ④（真人，不可替代）**：章程完成判据「用户本人判定打开不困惑」——机器侧基面与管线全绿，等本人第一读数。证据：`/tmp/ux-evidence-1004/`（verdict×2、desk 前后、approve 轮询、截图路径）。

**升 pin 产物重建后的全闭环验证（2026-10-04，一次性 home 真机）**：

- **探针 `--approve` 能力落地**（第 11 轮挂账切片②）：等待循环轮询「允许一次」按钮，带旗标就地
  点掉并计数、无旗标如实上报 parked（不再伪装成超时）。实证：全闭环两轮自动点掉 **14 次**。
- **全闭环**：T1 知识清单问（182s，9 批准）→ T2 桌面刷新（93s，5 批准），零 consoleProblems
  零 exceptions，回合可见进展全程在场。
- **反撒谎桌面纪律在环境故障下成立**：写入被环境拒绝时（本会话沙箱对 ~/Documents 的 TCC 拒绝，
  连 danger-full-access 都 EPERM——用户自起服务无此限制，10-01 真实刷新即同一文件），模型按
  skill 要求「只读直说不报成功」：取数全走真工具、JSON 重写+校验、旧文件备份、四路径实测、
  明说「桌面没有刷新」。**测试判过**。
- **升级风暴观察（喂上游候选/摩擦报告）**：本环境沙箱后端不可用（第 3 轮发现的嵌套限制）时，
  模型对每次域外读取都要一次 danger-full-access 升级（一轮 14 次）——vendor 升级档位没有
  「只读域外」的中间档，粒度是上游面。正常部署（沙箱可用）下升级罕见（第 9 轮 trial home
  一次批准完成审批流）。
- **第 11 轮切片①（干净 home 审批终点）诚实账**：机制段全部验证（桌面待批横幅→面板三页
  草稿各带批准/有问题→点批准→指令进对话→模型走 promote 流程）；**终点翻转未在本次到达**——
  本环境「沙箱后端不可用×逐读升级链」使远程代点不实用（12d842d2 会话 2 问 1 决仍在链上），
  终点翻转留本人自起服务时最后一英里（其环境沙箱正常；round 11 的机制结论保持）。

**第 14 轮（2026-10-04，残余摩擦取证定罪——agent 自主，用户授权静默推进）**：

- **仪器**：探针等待循环新增 `deskStale`（「对话比这份桌面新」在场）与 `yamlHead` 采样 +
  **postTurnSamples 收尾尾巴**（回合结束后跟随 8 拍 ~12s——此前回合结束即停采，恰好漏掉
  定罪摩擦 1 的关键窗口）。
- **取证两轮**（trial home 真机；一轮普通问答 89s、一轮真审批流 131s/5 批准）：
  **摩擦 1 定案关闭——警告机制零故障**：34 拍无一误报、回合结束零滞留（postTurn 全 false）。
  读数中"要求手动刷新"的真相 = ①普通对话本不自动重写桌面（桌面是动作产物，警告是诚实显示）
  + ②批准走模型回合的架构（**上浮为机制推敲题**：面板直调服务翻转 draft→stable 可"一秒完事"，
  但这是批准流执行架构变更、涉审计语义，等真用后再立卡裁决，不在本卡顺手做）。
- **摩擦 4 定罪：四项全 vendor 面，我方零残余**：tok/s·缓存命中（vendor 状态条）、思考预览
  英文（vendor）、**工具行绝对路径**（write/edit 变更清单渲染 `…/workspaces/…/.desk/state.json`
  与知识页绝对路径——本轮 replyTail 实证）、**知识页 YAML 头**（vendor 侧边栏文件预览打开
  原始 md；我方链干净——服务端 body 已剥 frontmatter、面板用 excerpt）。前两项已在批3 登记
  上游；后两项为新增上游候选（与 #3 占位词同批）。
- **摩擦 5 归属**：「轨迹」不在本仓任何 surface（vendor 面，上游候选）；「线索」= 产品概念词
  （四房间词汇），改词属口味拍板面——**备候选等本人裁决，agent 不代拍**（侧栏品牌命名同先例）。
- **摩擦 7 处置**：trial home 测试会话残留清理——8 会话考古定性（首文本判据，mtime 不可信），
  清 6 个（乱码测试 / T1×2 / 取证 probe×2 / 批准验证），留 2 个（本人 09:22 首次真实交互
  `622e6efe`、第 13 轮读数折扣题 `daaf65ac`）。数据面 gitignored。

**第 15 轮（2026-10-04，摩擦 5 我方件落地：「线索」→「在跟的事」——用户拍板选词）**：

- **渲染面**：client 8 处全改（counts cell、空态、问进展占位符、park/收了/问进展三条面板指令、
  未决空态行），`desk-loop-report.mjs` 的动作识别串同 diff（「关于线索「」→「关于在跟的事「」，
  否则摩擦报告分类盲区扩大）。
- **模型语域**：`desk-refresh` 技能加词汇指引（user-facing prose 称 threads 为「在跟的事」，
  内部键与文件内容保持 `threads`）。**live 验证（model-visible means logged）**：探针真跑
  desk-refresh（122s/6 批准），刚写的桌面文件 `recentActivity` 用「在跟的事」×2（"新开「在跟的事」：
  下季度那款新服务的定价三档…"），会话日志与盘上文件双证。
- **边界（不动清单）**：trial home 存量记忆/知识页正文的「线索」不改（历史数据；且 memories[5]
  的"新客户线索"= sales lead 商业正词，非黑话）；`usage-report` 家现状行保持机制词（dev 面词汇）；
  评测材料题面不改（历史事实）。真机 DOM：`打开我的桌面` 全屏视图「在跟的事」在场、面板零残留
  （取证 `after8`；右栏按钮 eval 时刻不在场系首帧后挂载，改用「打开我的桌面」路径取证）。
- 本轮取证两轮（含一次审批门 parked 补 --approve）计入 desk-loop 观测。

**第 15 轮（2026-10-04 续，摩擦 5 全链收官）**：

- **模型语域指引**：`desk-refresh` 技能以 **HTML 注释行**携带词汇指引（threads = 「在跟的事」，
  不称「线索」；内部键保持 `threads`）——技能体语言门（model-facing = English）拦住正文形态，
  注释形态标记它是元信息不是散文；`languageGuardProblems` 同 diff 加 `.md` 注释豁免（负例夹具：
  注释行绿 + 正文 CJK 红各一）。
- **live 复验（model-visible means logged）**：重启后探针真跑 desk-refresh（53s，本轮无房间变更
  → 模型未加 recentActivity 行——反撒谎纪律 ✅），桌面文件「在跟的事」×2 保持、无新增「线索」
  （余 1 处在历史记忆原文，"新客户线索" = sales lead 商业正词，非黑话，不动）。
- 收尾三连：typecheck / test 353（+1 夹具）/ verify 34 全绿。

**第 16 轮（2026-10-04，第二轮 naive-CEO 读数——如法炮制第 13 轮 delegated 形态，验证本批改进）**：

- **读数报告**（subagent 全文，截图 `/tmp/r16/*.png`）：总评「下周还愿意继续用」；**亮点**：回答军师级（四节+分歧保留+动作表）、欢迎语、桌面像随员办公桌、记得 10-03 上下文（主动翻旧账对数）、审批卡片合格。**验证确认**：「在跟的事」新词已进模型输出 ✅、decision-routing 支撑了军师级拆解 ✅。
- **摩擦 8 条分类**：
  - **我方已落地（本轮）**：①面板指令 8 处第一人称→中性操作单（摩擦 3「冒充本人发言」：直调 rejected 后 fallback 的实锤代价，desk-loop 三锚同步、self-check 夹具同步）；②desk-refresh 语域指引扩展（摩擦 1/6：散文不带页 id/机制词、变更汇报压一行、按钮措辞自解释——4 条注释行，语言门豁免形态）；
  - **vendor 面（上游候选累计）**：仪表读数上脸（tok/s·缓存命中·上下文%）、消息操作栏图标无文字+👎提交无确认、hero「探索未至之境」、「构建」提示词、`/`@` 咒语、等待无进度感；
  - **我方待办**：首屏审批横幅（摩擦 4：审批入口深——首屏可见性，需 client 改动+DOM 对照，下切片）；测试会话残留再清（探针反复写家）。
- **live 验证**：语域指引落地后探针刷新（63s）——本轮无房间变更，模型未加 recentActivity 行（反撒谎纪律 ✅）；历史行旧语域保留属正常（模型保留旧行）。新语域效果待下次真实房间变更验证。

**第 17 轮（2026-10-05，第 16 轮挂账我方待办：首屏审批横幅 + 会话再清——ongoing goal 首轮自主推进）**：

- **首屏审批横幅落地**（第 16 轮摩擦「审批入口深」我方件）：`ApprovalDockBanner` 注册进
  `conversation.input.dock`（id `assistant-approval-banner`，order -9，与首开引导条共存——
  各答一个问题：怎么开始 vs 什么需要我拍板）。桌面待审指针的浅入口：任何会话状态（空白 hero
  或进行中对话）只要有草稿就显示，批准完自动退场；点击与桌面指针同路由（`focusKnowledge:
  'drafts'` + 开知识室）。
- **数据面两判（输掉的方案在案）**：①计数取 `knowledge[]` 行 `status=draft` 的行数、行缺席才退
  `counts.knowledgeDraft`——横幅数字必须与点击落地处（待你审批 section 按行数计）可复现一致，
  否则「点这里去审批」的承诺断裂；②读 walk view（primary slice）而非 dock 会话自有 slice——
  首屏恰是新会话没有桌面，而草稿是 home 全局事实；发行组合各会话共享默认工作区，贯通后的自读
  命中同一文件；异工作区会话落到知识室诚实空态（tabBody 有意不给他会话数据——横幅只指路，不越权）。
- **测试策略与结果**（本人点名 review 的证据面）：
  - **静态**：全量包套件 361 绿 ×7 轮（首跑 1 失败未再现、输出截断未留名、帧特征指向
    frontmatter.spec 纯核——如实记录为待观察，不进绿清单）；typecheck / verify 34 绿；
    注册面断言（client-brand calls/registered）与行为断言（client-first-mile 5 案：隐藏三态、
    互补态、行计数优先、点击路由、注册 id）同 diff。
  - **真机三态**（一次性 home 从头 `setup.sh` + P1-C workspace 行 + key 合入；种 3 草稿桌面文件
    仿真 desk-refresh 产物；证据 `/tmp/dsh-webui-shots/`）：
    ① **before**（旧 lib，`shot-1791119214965`）：已种 3 草稿、首屏 DOM 零审批字样——「审批入口深」
    复现定罪；② **after 出现**（`after-banner-clean`）：横幅在引导条与 composer 之间、amber 契约
    色、计数 3（目检 PNG + DOM 双证）；③ **贯通**（`after-click-clean`）：点「点这里去审批」→
    知识室旁开、待你审批（3）、高亮行在场、三草稿各带 excerpt 与批准/有问题按钮；④ **退场**
    （`after-cleared`）：草稿清零刷新后横幅零残留。
  - **证据读法教训**：after-banner 首拍 PNG 与 before 逐字节同哈希——拍在桌面数据渲染完成之前
    （弹窗未点、settle 内横幅未上屏；DOM dump 晚于截图所以含横幅文本），该 PNG 作废、以
    after-banner-clean 为视觉证据。**截图证据必须眼见核对，DOM 断言不能替 PNG 背书。**
- **连带面**：知识室高亮行「你从桌面点过来的那批」→「你刚点过来的那批」（同一路由现在有两个
  发送者——桌面指针与横幅，文案不得声称来路；client-panels 断言同 diff）。
- **测试会话再清（摩擦 7 再现处置）**：trial home 9 会话考古定性（首文本判据 + feedback 事件
  佐证）：清 6（探针刷桌面×3、探针批准流×1、空壳×2），留 3（真人首交互 `622e6efe`、第 13 轮
  读数 `daaf65ac`「大客户压价该不该让步」、第 16 轮读数 `043ac437`「大客户压价怎么办」——其日志
  含首个真实 👎 落盘事件，round-16 报告的证据基座）。
- 门禁收尾：build 后 typecheck / test 361 / verify 34 全绿。

**第 18 轮（2026-10-05，残余定罪收口 + 上游候选台账——ongoing goal 自主推进）**：

- **摩擦 2 残余「点标题预览不稳定」定罪关闭**：考古证实我方零嫌疑——知识室行标题（CorrectableRow
  primary）在第一读数所用代码（8fbf7b8，早于线A批1）与现状均为纯文本，从无可点击/预览 affordance
  （行内交互只有按钮：有问题展开／批准／过时了／来源全文展开）；界面上唯一存在的「点标题出预览」
  路径 = vendor 文件树/文档预览（第 14 轮已证它开原始 md 带 YAML 头）。修后二读（第 16 轮）未再现
  此条且判「审批卡片合格」——盲批核心已被 excerpt 修复（线A批1）覆盖。处置：不再独立追；真用再现
  则现场取证定位 vendor 缝。
- **摩擦 7 残余「标题中英混排」定罪关闭**：vendor 标题提示词本就语言感知（`session-title-llm/src/index.ts:199`
  「Use the language of the messages.」——代码引证在案）；第一读数的观测背景 = 测试会话残留
  （含乱码测试会话，其消息本身混合），残留已清（第 14/17 轮 9→3），现存 3 会话标题全中文
  （真人首交互/两轮读数题），二读未再现。真用再现则属模型服从度，升上游候选。
- **上游候选台账固化**：vendor 面候选散在卡面第 1/3/8/12/13/14/16 轮各处，收敛为
  [reference/261001-upstream-candidates.md](../reference/upstream/261001-upstream-candidates.md)——9 稳定 +
  3 条件 + 2 已关闭，逐条带首报轮次与 vendor 代码锚点；随卡毕业同迁（reference 契约）。
  递交与否、何时递 = 用户拍板，agent 只备料（硬规则 1：vendor 源码永不改，递交是外部动作）。

**第 18 轮补记（2026-10-05 续，横幅证据耐久化切片——goal 续轮自主推进）**：

- **web 面期望比对第二场景落地**：`snapshots/web-face/first-open-draft-banner/`——第 17 轮横幅
  三态真机证据原住 /tmp（易失），现在仓内可重放（`seed.mjs` 两步预置：workspace 钉子+声明
  预确认 boot 前打、桌面种子文件 boot 后种；`expected.dom.json` + snapshot.yml/README 契约）。
  隔离 home 真机：无横幅态→有横幅态→比对绿，最终 committed 期望的 PNG 人工过目在场。
- **场景顺手抓到一条真回归**：首拍 console 有 approve-direct-call（rejected 车道）挂载失败的
  `console.error`——**每次首开都报错**，且 blank 场景的「console 必须空」期望自该切片落地起
  **静默过时**（10-04 上午录制、切片 17:58 落地，无人重跑所以未红）。修复：console.error →
  console.info（诊断仪器保留、严重级归位——设计内降级态不是错误）；blank 场景在第二个全新
  home 复绿。教训：有 UI 交付的轮次应把既有场景跑一遍，快照场景不重跑=静默过时。
- **settle 是固定时钟不是就绪条件**：无就绪令牌十连拍两红（红拍大纲从侧栏直跳 composer 占位
  符——桌面 walk-view 读取越窗，横幅整体缺席）；runner 加通用 `--wait-text` 就绪令牌（编译
  为 shots 的 awaitPromise 轮询 eval，超时 resolve 不 reject——反面探针语义不变），纯核
  `buildWaitSnippet` + 三夹具；带令牌十拍全绿。
- 门禁：typecheck / test 364（+3 夹具）/ verify 34 全绿；全链红绿证据（反面探针、单字污染、
  竞态现行、blank 复绿）入场景 README 台账。

**升 pin 复验（2026-10-03，dsh-v0.2.0-rc.2 / c1857a8）**：

- **`transcriptView: detailed` 预置行仍是承重，不是冗余**：本地 `packages/client/ui-chat/lib/client.js`
  是 9/26 的旧产物（升 0.2.0 pin 时未重建），其 `adopt()` 仍无 `?? defaultMode` 兜底——崩溃漂移在
  本机运行时还在；新 pin 的 **src** 已带兜底（`transcript-view.ts:48`）。上游候选的证据口径修正：
  先证「本地树 lib 未随 pin 重建」，上游发布物是否同样漂移须重建后复验。
- **升 pin 重建清单的洞——实测比初判宽三倍，且「部分重建」会打碎 web client**（喂 sync-dsh
  playbook）：0.2.0 pin note 第 3 条只扫「新包缺 `lib/client.js`」（presence），没扫「已有包的
  lib 过期」（freshness）。全仓扫描实况：client/ + extensions/ **26 家** + **api/ 组 5 家**
  （gateway/remotes/session-controller/terminal-controller/workspace-controller）全停在 9/26 旧产物；
  shell dist 也是 9/25 的。**事故证据**：只重建 client 面 26 家后真机起服务，`ui-user-questions`
  等 `remote.userQuestions` 落空 → **"Failed to load plugins" 全屏白板**（一次性 home 实拍 +
  probe verdict consoleProblems 在案）——新 client bundle 配旧 `api/remotes` 装配不连贯；补重建
  api 面 5 家 + shell 后恢复。**结论：client 面必须成套新鲜，部分重建=坏面**；已门禁化
  （verify 33 项含 vendor 产物 freshness 检查，红绿夹具四案同 diff，2026-10-03）。
- 0.2.0 client 大重组：ui-chat 从 `packages/extensions/` 挪到 `packages/client/`。
- **重建 + 复验已完成（2026-10-03）**：31 家 client 面 + shell 全部重建到本 pin src；一次性 fresh
  home（setup.sh 全新建 + key 合入）双路探针：① 无预置行（`--patch` 整行替换 `config: {}`）+
  重建 lib → 首条消息**零 consoleProblems 零 exceptions**、composer 挂载、回合真跑到
  `ask_user_question` 澄清门（模型从工作区认出行业不符、拒绝编造、问真人——旧 lib 在这一步就是
  整片冻结 + 8 条 console error）；② 默认组合（预置行在场）→ 首开面全绿零错误，无冲突。
  **本地运行时崩溃关闭；预置行仍保留**——发布人口（release-smoke 的干净 dsh 自带的 client lib）
  是否带兜底未验，行退役条件改为「上游发布物确认带兜底」。450s 探针窗口回合未完 = 停在澄清门等
  真人，非缺陷（第 11 轮审批门挂起同机制）。

仍然挂着的：

4. **内测声明弹窗**——**用户已拍板保留**（first-mile 判定记录 2：DSH 合规告知不是插件
   该藏的，归发行议题），不动（locale=zh 后它自动是中文，「继续」按钮同）。
5. **产品级「工作区之问」**：试用 home 的 patch 只治本机；发行组合要不要预置
   `documentsDirectory`（或产品形态上助手的工作区=其 dataDir 的替身）属发行/O5 面，随发行准入
   立项，不在本卡顺手做。

## 候选与取舍

- ~~修「三室」措辞~~ 已做（见上，皮肤改动 + 反夹具）。
- ~~英文 hero/placeholder~~ 已做（locale 正门：`preference: zh`；覆盖缝探针结论=不存在）。
- ~~状态条黑话~~ 随 locale 解决（残余=模型名，接受）。
- **vendor zh 文案改写（「构建」视角）**：字典覆盖缝不存在 + vendor 源码不可改 → 只剩
  **上游 issue** 一条路，登记候选，不在本仓动手。
- **侧栏品牌中文命名**：皮肤面零代价，但命名是口味题 → 用户拍板面，备好候选等裁决。

## 毕业门

- **该不该**：已过（用户点名 ongoing goal）。
- **何时/次序**：按刺眼程度 + 探针结论排；每片一个垂直切片（改动 + build + preflight +
  前后截图 + note），不顺手夹带。
- **放弃**：vendor 源码永不改（硬规则 1）；locale 无覆盖缝时 hero/placeholder 接受现状并登记
  上游候选，不造 fork。
- **完成判据**（goal 的完成口径）：用户本人判定「打开不困惑、知道怎么用它」。
