# 推敲：首开 UX——CEO 打开的第一屏在用三种不属于它的语言说话

> 立卡：2026-10-01 ｜ 状态：推敲中｜毕业门判断 = 该做（用户 2026-10-01 拍板「UX 上好好想一想 变成 ongoing goal」，本卡=该 goal 的显式化）｜下一步 = **goal 已转 blocked：等本人第一次打开试用服务并给出第一读数**（六轮自主清单全部完成：全中文首开、工作区之问、三室黑话、桌面空态路径泄漏、首条消息崩溃、凭据缺口、手册 v10 可移植化、错误文案黑话、👎 管线端到端验证；恢复条件=本人打开并反馈，摩擦报告即下一轮弹药）

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
  ——first-mile [P1-C 判定记录 3](../../notes/implemented/2026-09-26-first-mile-landing.md) 的触发条件
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
  里是翻家邀请；详见[手册可移植化 note](../../notes/implemented/2026-10-01-home-manual-portable.md)）。
  存量 home 走既有 `manual-stale-scaffold` 版本通道再生。
- **评测两任务既有红立 [BUG-001](BUG-001-eval-behavior-tasks-red.md)**：A/B 矩阵（基线/在途 ×
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
- **探针能力扩展**（note：notes/implemented/2026-10-01-cdp-loop-probe-borrowed.md）：
  `--follow-up`（同会话第二轮，多轮连续性一次验证：追问 24s 且引用上一轮跟踪时点）、
  `--dislike`（👎+分类+备注，事件落盘验证）、粘贴重试（全新 home composer 就绪前静默丢文本）、
  顺序化 UI 流程（驱动 evaluate 不 awaitPromise——async IIFE 会被放弃在半路）。探针自身的
  两个 bug（标题毒化子串匹配、同义反复预检）也在运行中抓到并修掉——**探针在测产品，也在测自己**。

**第 9 轮（2026-10-01，审批流承诺验证）**：

- **「⚠ 3 页知识在等你审批（点这里去审批）」承诺兑现验证**（真点击 + 可见性取证）：点击后知识室
  以 720px 可见面板打开，「待你审批（3）」三页草稿各带来源出处与**一击「批准 / 有问题」按钮**——
  CEO 不需要懂 frontmatter 就能完成审批。承诺成立，无 bug。
- **新打磨候选（记录不动手）**：审批行的来源出处显示仓内路径
  （`packages/dsh-smart-assistant/seeds/management/...`）——对 CEO 是开发者黑话。候选修法：
  种子页 sources 字段改产品语言（"内置基座页 · 源自 ai_dsh_company 管理知识库"）或渲染层映射
  已知种子路径；涉及 repo 种子与 trial 数据两层，等本人确认审批流的实际使用后再动。




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
