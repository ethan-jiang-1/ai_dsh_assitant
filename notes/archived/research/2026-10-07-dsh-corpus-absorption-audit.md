# DSH 开发语料吸收审计 · 收卷证据台账

日期：2026-10-07 · 状态：已收卷（喂 [261007 调研卡](../../../_backlog/_done/_closed_plans/261007-dsh-corpus-absorption-audit.md) → [呈批卡](../../proposed/2026-10-07-dsh-corpus-absorption.md)）

## 〇、审计设定

- **语料**：`/Users/bowhead/deepseek-harness/_dsh_plugin_agent_ready_development/`（三卷 + `_coverage/` 维护账 + 自带 verify.mjs/verify.test.mjs 结构门禁与负例）。语料钉版 `dsh-v0.2.0-rc.2`。
- **版本对齐**：本仓 `vendor/dsh` 正钉 `dsh-v0.2.0-rc.2`（tag/SHA 双确认）——语料结论**无需按版本折扣**，直接适用。
- **对照判据**：语料机制 × 本仓落点 → 六态（✅已吸 / 🟡半吸 / ❌漏吸 / 🔀变形（有意适配已登记）/ ⚖️过重候选 / ➖不适用）× 症状关联（质量无保障 / 流程问题 / 测试资产找不到 / 驾驭无力）。
- **症状基线（用户原话，2026-10-07）**：「每次驱动一下能干点，但质量成问题，没感觉质量有很好的保障，流程上也有问题，测试资产也不知道在哪儿……驾驭感觉很糟糕。」
- **方法**：三卷机制提取（子代理 ×3）+ 本仓八面盘点（子代理 ×1）+ 承重文件亲读（AGENTS.md 根/docs、discipline.md、testing.md、notes/README.md、backlog 两级 README、pre-push-evidence 技能、根 README、近 18 条提交、两篇关键 implemented note、语料 00/01/04/05/07 页亲读）。

## 一、本仓现状盘点摘要（2026-10-07 快照）

机械与结构层**厚度远超典型单人插件仓**：

- 34 项 verify 门禁（内核 21 个可夹具化函数，本身被 verify-gates.spec 红绿夹具钉住）；六层 57 spec 测试树（domain→host→agent→client→composition→tooling）+ eval 双轨（行为/领域，人打分机器守地板）+ web-face 两渲染期望场景 + session 回放（未建，触发条件制）；
- 5 个开发技能（证据路由/活体探针/漂移审计/UI 贡献约束/note 归档判定）+ 15 个 preset 模型技能；
- docs 六合同 + 生成物三件（catalog/tsconfig/notes 索引，freshness 门禁守）；
- notes 四态生命周期（implemented 约 90 张 / 两周，proposed 空，rejected 1）+ _backlog 四池 + 门禁预算制 + 退役四件套；
- 「驾驭无力」症状已打过两场战役：可驾驭性 P0–P5（2026-10-05，新上下文 7 分钟五路 PASS 验收）与 SDLC 收口（2026-10-06）；根 README「按问题找」速查表当日刚补。

**盘点员 fresh-agent 五问走查**：遵守什么（1 步）→ 系统是什么（3–4 步）→ 改动落在哪（2 步）→ 任务怎么做（1–2 步）→ **怎么证明做对了（最贵：3–4 跳，跨 skill/docs/snapshots 三种载体；「哪条门禁对哪类编辑真会红」只活在 pre-push-evidence 技能正文）**。

## 二、native-development-model 卷对照（33 条机制提取）

### 2.1 已吸（✅）——本仓有等价物且运转

| 语料机制 | 本仓落点 | 证据 |
|---|---|---|
| A1 一手证据链排他 | discipline.md 逐源枚举 +「不从记忆继承」+ sync-dsh 升 pin 重校 | discipline.md 表 + 复查环 |
| B1 四层次分离（运行时/仓库/发布/治理） | 源码+README / AGENTS 布局表 / 装法+release-smoke / 硬规则+notes+backlog | 各文件在场 |
| B4 意图载体只装意图 | plan+todo 轮内面；backlog 卡「只装判断材料，永不调度」 | _backlog/README |
| B5 owner-证据分工表 | 根 AGENTS 布局表 + docs/AGENTS 谁拥有什么 + 包内 owner 面表（三层） | 三表互链 |
| B6 一个事实一个家≠一个文件 | 硬规则 3 切片纪律（代码+测试+docs+note 同 diff） | 近 18 提交形状 |
| B7 条件性 note（何时不写） | notes/README §〇义务范围 + 机械/局部编辑豁免 | 门禁化（notes 形状 ×4） |
| B8 垂直切片（边界由用户行为定） | 硬规则 3；切片以行为为单位 | 提交记录 |
| B9 窄证据 | 硬规则 3 + pre-push-evidence 技能 | 技能正文路由表 |
| B10 测试分层按观察对象 | testing.md「目录即被测 interface」+ 能证明/不能证明列 | 六层树 |
| B11 real composition | composition 测试（真 Loader + shipped YAML + built lib） | preset-composition.spec |
| B13 独立 oracle | web-face expected.dom.json + 过目 diff 后 --refresh；eval 人打分机器守地板 | snapshots 两场景 |
| B14 安装形态验证 | release-smoke（pack→干净 home→add→断言） | scripts/release |
| B15 已验证版本范围 | vendor/UPSTREAM.md + verify pin 三方一致 + dependencies 门 | verify.mjs |
| C1 goal 不当验收 | 「goal 管当前段，todo 管片内，提案管验收边界」 | repo-navigability note |
| C2 mock-only 禁令 | mock 白名单 = LLM/网络/时钟 | testing.md 政策 |
| C3 刷新≠接受新行为 | web-expected 流程（refresh 须过目 diff） | snapshots 契约 |
| C4 空 invariant 禁令 | 门禁预算制 + 退役四件套（每门能说出拒绝什么） | sdlc-closeout note |
| C5 扩展点先行 | AGENTS 探索路由 + architecture 归属表；产品全走 DSH 扩展点 | architecture.md |
| E3 生命周期闭合（HMR-safety） | registry-lifecycle.spec（dispose 即撤销+可重挂） | tests/composition |
| E5 PENDING 诊断 | dump-config 第一命令 + headless pending 先例（显式 disabled） | README 装法节 |

### 2.2 已登记的适配（🔀，有意变形且理由在案）

| 语料机制 | 本仓变形 | 登记 |
|---|---|---|
| A4 不强制 test-first | 本仓反向拍板 test-first 证据环（2026-10-05 用户拍板） | notes/README §二之三 |
| B12 每非平凡模型可见改动必更录制场景 | 触发条件制（「跑起来才看出的回归出现 / 同面第三次手工探针」才建 session 回放）；keyless preset-runner-replay 已有 | snapshots/README + testing.md 已定姿态 |
| Issue→PR 连续流 | 无协作面 → 切片 commit + note 三段流 | discipline.md 已声明适配 1 |

### 2.3 半吸（🟡）——形式在场，实践断裂（症状承重）

| # | 语料机制 | 断裂形态 | 症状关联 |
|---|---|---|---|
| 🟡-1 | **B3 外部结果先行**（闭环第 1 步：从可观察结果出发，不以「改哪个文件」开头） | 形式在场（proposed 卡骨架有「问题（可观察行为）」节；README 方向判据是外部行为表）；**实践断裂**：proposed 空、~90 张 implemented 两周直落——绝大多数工作以「轮内已授权」形态开工，意图的「触发条件/用户看到什么/完成条件」定义动作被跳过，直接进入实现 | **「驱动一下能干点但质量没保障」**：每轮以实现为中心而非以外部结果为中心，完成判断退化为「跑通+门绿」 |
| 🟡-2 | **B2/B16 交付判断四角色**（机器全绿 ≠ 交付批准；语义评审对齐意图/文档/取舍/证据，每笔交付） | 三道门禁表在案（机械/语义审计/用户拍板），但**语义评审是事件型（阶段收尾、漂移审计轮）而非每切片型**——单笔切片的「批准」实际由 implemented note 自述 + 用户事后偶尔看走查承担；「谁签收了这轮切片的行为符合意图」没有稳定发生的动作 | **「质量没保障」**：机械绿密度极高，但机械绿按语料「只证明它执行的断言通过」——意图对齐那一步在单笔层面缺位 |
| 🟡-3 | **B12 等价证据的替代说明义务**（适配录制义务时「说明替代证据与未覆盖之处」） | 模型可见面改动（段落/persona/digest/工具描述）目前的回归固定靠：agent 面合同 spec（段落就绪/预算）+ 手动 repo-live-probe。probe 是取证动作非回归资产；「这条模型可见面改动会由哪个资产在回归时变红」未逐面登记 | **「测试资产不知道在哪」**：模型可见面的证据面散（spec/probe/eval 各管一段），没有一张「改动面→回归资产」的完表 |

### 2.4 漏吸（❌）

（本卷范围内无整条漏吸——漏吸集中在 sdlc/repo-harness 卷的机制，见下两节。）

### 2.5 不适用（➖）

A3 图文分工、G1 图示清单（本仓无图示面）；F 术语卷（语料自己「不维护第二份 API 词典」）；D1/D2 起步判据（已过起步期，等价物在场）。

### 2.6 过重候选（⚖️，对照语料 07 页展开——见 repo-harness 卷节）

本卷 C6（不复制主仓制度）在形式上已吸（逐行登记），但**总量维度**未对照过：语料 07 页「较小项目若只有一个 loop、少量固定 adapter 和单一入口，可能只需要清晰 architecture map、少数 standing rules、任务 Skills 和针对性 tests」。本仓组合压力中等（三平面/四工具/15 技能/组合行——确非单 loop 小项目），但**单人驾驭力**是另一轴：34 门 + 六层测试 + 六合同 + 5 技能 + 四池 backlog 的总认知负担是否已超「驾驭收益」，需按 07 页三问（规则住在哪/入口是否明确/错误何时被发现——三问均已 PASS）之外的第四问称重：**维护这套 harness 的每轮成本 vs 它防止的回归价值**。证据锚：34 门中 13 门有近期活咬合、21 门防护对象在案但无近期咬合（sdlc-closeout）；门禁预算制已在案，缺的是**按语料 07 页对全仓流程面（不只门禁）做一次同款预算评估**。

## 三、sdlc-reference 卷对照（89 条机制提取）

### 3.1 已吸（✅）——代表性条目

| 语料机制（条号） | 本仓落点 |
|---|---|
| 条 2 三条组织立场（agent 一等参与者/规则接可执行检查/每类事实唯一 owner） | 本仓宪章本体：AGENTS.md + verify 链 + tier 表 |
| 条 4–12 note 生命周期全家（四态互校/转换收敛/同 diff 改写/supersession/冻结） | notes/README.md §一 + verify notes 形状 ×4 + note-archive-judgment 技能 |
| 条 10 Alternatives 强制——**子代理提取主张「待拍板未闭环」，亲验纠正：已是机械门禁**（verify-checks.mjs `implementedAlternativesProblems`，理由句与语料原文同义）；AGENTS.md 的「待拍板」指 proposed 卡毕业形态，非 implemented 门禁 | ✅ 已闭环 |
| 条 42–46 一个事实一个家/当前状态写作/CoT 判定问题/文档闭环/move 原子 | tier 表 + docs/AGENTS 自检（「只拿到 HEAD 能否核验」即条 44 原文本地化）+ 断链四连门 |
| 条 31/32 证据选择与检查逻辑分离/outgoing scope | verify.mjs（逻辑）+ pre-push-evidence（选择）；base=上一锚点（硬规则 6） |
| 条 33 证据路由表（改动面→最小证据） | pre-push-evidence 逐面表 + testing.md 分层表（**都在**——见 🟡-4 分散问题） |
| 条 49/80 三层证据不冒充/三道门禁互补 | discipline.md 三道门禁表 |
| 条 62/63 git 能证/不能证边界、历史≠现行规则 | snapshots/eval 作运行证据面；门禁带生效日不追溯（复查环） |
| 条 64 垂直切片同 commit | 硬规则 3（近 18 提交实证） |
| 条 73 非 Issue 意图载体 | proposed 卡 + backlog 卡双通道，且有本地改良（四门毕业）；**TODO 三档偏离见 🔀** |
| 条 85 rehearsal/publish 分离 | release-smoke（无凭据、发布物改动必跑）+ export-dist（显式人工） |
| 条 82 CI 从不回写仓 / 版本先落库 | _dist 不入库；export-dist 手动 |

### 3.2 半吸与漏吸（🟡/❌）

| # | 语料机制 | 缺口 | 症状关联 |
|---|---|---|---|
| 🟡-4 | 条 33 路由表 + 条 34 focused coverage——**模型可见面行的最小路径无 eval**（现=build→composition→probe；eval 只是 testing.md「已定姿态」的节奏条款，不在路由表内）；probe 是**取证动作非回归资产** | 10 月 implemented note 16/34 提及 eval——约半数，无按面强制 | 「质量没保障」（行为层） |
| 🟡-5 | 条 37 负例接入**真实接受路径**：「存在一个脚本」≠「顶层命令真的调它」——verify-gates.spec 红绿夹具直测 check 函数，未断言 verify.mjs 顶层接线 + 诊断文本（语料 verify.test.mjs 形态：经真实 runner、断言诊断正则） | 接线半截：理论上 verify-checks.mjs 可存在未被调用的导出而无红 | 机械可信度（小） |
| ❌-1 | 条 39 环境特异性三件记录（exact command + failing test + 平台差异后才可声称环境特异） | 未成文 | 流程（小） |
| ❌-2 | 条 69 交付记录的证据原文（PR Testing 折叠区形态：证据原文进记录而非叙述式「已验证」） | 「只列真跑过的命令」在；证据原文粘贴不成习 | 质量可复查性（小） |

### 3.3 已登记适配（🔀）与登记完备性缺口

- **无集中索引 → 本仓反向改良**：2026-10-07 裁决生成索引 + freshness 门禁（取代「完全不设」旧裁决，理由在 notes/README §二）——比 DSH 更进一步且无漂移通道，合规。
- **class 封闭集合两级路径**：已裁决偏离（notes/README §四，三条理由）。
- **TODO 三档（FIXME/TODO/XXX）→ 本仓「不立项只在代码内」**：指令在 AGENTS.md，但 **discipline.md 未登记此偏离**（约束→适配→证据三件缺）——登记完备性小缺口。

### 3.4 不借（负知识，理由在案或待呈批卡登记）

CI 矩阵/stacked PR/加权批准/Issue-PR policy（主仓治理，语料明示不自动适用）；双语 pairing（本仓语言分工是非对称的，非双语对照）；Dependabot（sync-dsh 显式流程等价）；archived hash manifest（本地单人仓无对抗面）；registry 三态幂等（本地 tgz 低风险，触发=export-dist 同版本内容变的实证）。

## 四、repo-harness + _coverage + verify 卷对照（72 条机制提取）

### 4.1 已吸（✅）——本卷是三卷中吸收最深的

五缺口入口表（P5 新上下文验收过）、五问五 owner、负知识 owner（rejected/不借表/输掉的方案）、生成物 vs 路径树（生成索引+门禁为本地改良）、渐进披露、Skill 层定位与两种 Skill 分离（AGENTS.md 明文）、六载体分工、paved road（architecture §八五路由+归属表）、两张地图（dump-config/会话日志）、机械优先（quality-gates 因果已内化）、六层反馈（原样借入 discipline.md）、负例控制（prove-it-red）、运行时查询三件（dump-config/catalogs/live-probe；assistant preset 刻意不挂 inspect——已登记决定）、分类学同构（目录名与 DSH 对齐，偏离入 discipline）、_coverage 台账形态（sync-dsh 收尾清单+承重行号钉人工抽验+本台账自身）、verify 自检形态（verify-gates.spec 红绿夹具）。

### 4.2 语料自检框架的判定——静态层全部 PASS

- **三问检验（条 50）**：①规则住在哪 ✅（tier 表+门禁）；②正确入口明确 ✅（P5 五路 7 分钟 PASS）；③错误何时发现 ✅（六层反馈）。
- **五条优先迁移原则（条 51）1→5**：①–④全 ✅，⑤（plugin graph/完整 seams）本仓不需要（单插件）——**次序不倒挂**。
- **结论：按语料自己的标准，本仓静态 development harness 是健康的。** 症状不在结构层。

### 4.3 过重评估（条 48 知识外置成本四形态 × 本仓现状）

| 语料成本形态 | 本仓现状 | 判定 |
|---|---|---|
| 重复记录漂移 | 一个事实一个家执行严（盘点员半小时未见第二份清单；生成物四处同构） | ✅ 已控 |
| 过长 standing instructions 耗尽上下文 | 根 AGENTS 155 行 + docs 六合同 ~900 行 + 技能 365 行 + backlog 两级 README 587 行；文档预算 ⏸ 触发条件制（已登记）；五轮语义漂移审计跑过 | 🟡 部分在案——缺「驾驭者认知成本」判据 |
| 无意义 gate 假安全感 | 门禁预算制 + 退役四件套（2026-10-06 刚做过，34 门零退役候选、13 门有活咬合） | ✅ 已控 |
| 过细 Skill 把判断固化成仪式 | **从未评估过**；pre-push-evidence 的「finish line=每切片 typecheck+test+verify 全地板」与语料条 35「不重复未失效的检查」有真实张力（地板 vs 最小证据） | ❌ 未评估——瘦身审计的具体对象 |

**第四成本（语料没有的）：流程总量对驾驭者（用户本人）的认知成本**——语料全部判据是 agent 参与视角；用户「驱动一下能干点但驾驭无力」说明需要本仓自己的第四判据。这是呈批卡瘦身批的裁剪点。

### 4.4 小缺口（🟡）

- 条 21 Skill 五要素（触发/来源/判断标准/停止条件/验证报告）：本仓技能大体有，「停止条件」个别缺——并入瘦身审计。
- 条 39 错误信息三要素（失败对象/违反规则/修正入口）：verify 各检查消息未逐门审过——并入瘦身审计（有则记、无则补链接）。

## 五、症状归因综合（四症状 × 根因，全部有证据锚）

**先说结论：本仓对 DSH 流程的静态结构与机械层吸收极深（语料三问全 PASS、五优先级次序不倒挂、约 230 条对照机制中整条漏吸仅 2 条小项）。「没吃透」的真身是动态闭环三环断裂 + 驾驭者视角缺位，不是没读。**

| 症状 | 根因 | 证据锚 |
|---|---|---|
| **质量没保障** | R1 交付判断最后一公里：机械绿≠批准，但每切片的「行为 vs 意图对齐签收」无稳定动作（语义层是事件型：阶段收尾审计） | discipline 三道门禁表 + 近期收口以机械门+真机走查为主 |
| | R2 模型可见面（=产品核心面）回归资产薄：probe 是取证非回归、eval 无路由强制（16/34）、session 回放触发未到 | 🟡-4 + testing.md 已定姿态 |
| | R3 外部结果先行断裂：开工不写「触发/用户看到什么/完成条件」，完成判断无可对齐物 | proposed 空 + 90 implemented 直落 |
| **流程有问题** | R4 意图通道失衡：双通道设计对、实践全走轮内点名，呈批层闲置；高 velocity 直落让用户失去「什么进来了」的控制感 | proposed 0 张 vs implemented ~90 |
| | R5 流程自重：仓在自身上的循环（导航/SDLC/拆文件/驾驶舱战役）占比高；外置知识维护成本无「驾驭者成本」判据 | 近 18 提交过半为基建/docs/backlog |
| | R6 地板与窄证据张力：每切片全地板（typecheck+test+verify） vs 语料「不重复未失效检查」 | pre-push-evidence finish line |
| **测试资产找不到** | R7 证据地图三载体分散：testing.md 分层表 + skill 逐面表 + snapshots 边界 + README 路由都在、都对，但无单页聚合；agent 3–4 跳、用户不可见 | 盘点员五问第 5 问最贵 |
| | R8 证据面语义不清：probe/eval/spec 分工无一句话（「probe 是取证不是回归」） | 🟡-4 同源 |
| **驾驭无力** | R3+R4（用户是点火器不是方向盘）+ R7（仪表盘不可见）+ R5（方向盘太重）——**静态结构全 PASS 之上的动态层断裂** | 综合上 |

## 六、吸收清单（喂呈批卡）

**补漏批（A）**：A1 外部结果先行成轮内纪律；A2 模型可见面证据路由硬化（eval 进最小路径 + 适配声明句）；A3 证据地图单页化（testing.md 拥有表，skill 与 README 链接）；A4 交付签收轻量行（外部结果+签收方式+未跑项，无新门禁）；A5 小补三件（环境特异性三件记录 / 负例接线断言 / TODO 偏离登记）。

**瘦身批（B）**：B1 流程总预算审计（门禁预算制扩展到 standing instructions/docs/skills 三面 + 新增「驾驭者认知成本」第四判据；预列对象：根 AGENTS 密度、finish line 地板张力、技能五要素齐度、入口链跳数；产出=处置表，删>并>修>记）。

**不借登记（C）**：见 §3.4——随呈批卡落 discipline.md「已声明的适配」或不借表。

**明确不预建**：session 回放（触发条件制维持）、CI/hook 接线（用户 2026-09-27 拍板不变）、语义签收门禁化（格式门只证结构不证正确——sdlc 01 §4）。
