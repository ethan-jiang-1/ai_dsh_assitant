# 开发纪律对照表（当前合同 · 只写现在）

> 本文是本 repo 对 DSH 研发纪律的**逐源枚举与声明** —— 不从记忆继承
> （"你无法继承你从没清点过的东西"）。每行 = DSH 做法 → 本仓落点 → 状态
> （✅ 照搬 / ⚠️ 带约束的适配 / ⏸ 刻意不做 + 触发条件 / ⏳ 部分 + 等待条件）。
> 来源：`ai_dsh_company` 五轮实践的对齐复盘。
> 语料引用编号（`repo-harness/…`、`sdlc-reference/…`、native-model）的家 = 主仓 checkout `deepseek-harness` 的
> `_dsh_plugin_agent_ready_development/`（native-model 即其 `native-development-model/`；不在本 pin 树内，编号相对该目录）。
> **默认严格按本表走；偏离或裁剪不是错，但必须先在下面「已声明的适配」登记一行（约束 → 适配 → 证据）再动手。**

## 表

| DSH 纪律（源头） | 本仓落点 | 状态 |
|---|---|---|
| 文档只写 now；一个事实一个出处；**入口文件只收常设指令与路由指针**——时变状态放进自动注入的文件，就是把最容易腐烂的东西放进最不被怀疑的地方（`vendor/dsh/AGENTS.md` / `vendor/dsh/docs/AGENTS.md` tier 表） | docs/ 只写现在，合同自足，不链接单篇 note；AGENTS.md 全时不变（无状态节、无进度标记、无 pin 号） | ✅ 照搬 |
| 平台事实一个家在钉住的 vendor：文档 tier（`vendor/dsh/docs/AGENTS.md`）、主仓 note 制度（`vendor/dsh/.agents/notes/README.md`）、主仓开发技能（`vendor/dsh/.agents/skills/`）、client 机制（`vendor/dsh/docs/subsystems/`）。别处链接，不把段落再写一份 | 根 AGENTS.md 硬规则 2。本仓差量三处：适配一行在本表，本仓步骤在仓根 `.agents/skills/`，本仓取舍在 `notes/`。发现根是本仓 `.git`（`vendor/dsh/docs/subsystems/skills.md`），主仓 `dsh-*` 技能不进本仓目录，也不 symlink 过来——它们的命令和相对路径假设 cwd 是 deepseek-harness | ✅ 适配 |
| 决策 Note same-PR；完成的条目离开队列、不许标 ✅ 留场（[`vendor/dsh/.agents/notes/README.md`](../vendor/dsh/.agents/notes/README.md)） | 一次切片一个 commit。切片决定 note 与切片同 commit；campaign 收口/毕业 note 在收口提交写，切片证据留在卡/提交说明。还要人点头的提案住 `notes/proposed/`，推敲与 work 台账住 `_backlog/issues/`，这次不修的缺陷住 `_backlog/bugs/`，方向判据住 README。完成即离队，不设第二进度台账 | ✅ 适配（note 时机：切片同 commit；收口/毕业 note 在收口提交） |
| 上游 plan 状态不二次落盘（2026-07-22 note :54：轮内计划已由工具参数记录，log-only 持久层不再建 plan 目录——**针对轮内计划状态**，不禁 repo 级提案与队列，见 [`vendor/dsh/.agents/notes/README.md`](../vendor/dsh/.agents/notes/README.md) 的 proposed 格式） | 不建 plans/tasks 物种（轮内计划走 plan/todo 机制，见下行）；repo 级设计计划住 `notes/proposed/`（RFC）与 `_backlog/issues/`（推敲/触发卡），缺陷卡住 `_backlog/bugs/` | ✅ 适配（来源适用范围收窄：轮内状态 ≠ repo 级提案） |
| 会话日志即真相（log-only 持久层；复盘用日志 seq 重建，不凭自述） | 排查/复盘读 `dev/harness-home/sessions/**/session.v*.jsonl.zstd` 逐事件还原（`docs/dev.md` §五） | ✅ 照搬 |
| 轮内任务面：plan 呈批（反馈门①）+ `todo_write` 活清单（反馈门②）+ steer，机制在 base bundle 零接线 | 本 repo 开发流程见 AGENTS.md 硬规则 5；本插件 preset 已挂 `tool-todo` 且**连必填 config 一起抄**（`allowParallelInProgress: true`——不抄 config 会在挂载时炸且 UI 吞错误） | ✅ 适配（本地选择：具体工具与模式以当前会话所有为准，不宣称普适强制） |
| 默认翻转 + 适配声明：默认严格，偏离/裁剪须登记（镜像 "Require evidence for public choices"） | AGENTS.md 硬规则 4；每条适配登记于本文"已声明的适配" | ✅ 照搬 |
| 窄证据 + 只报告实跑过的命令（根 AGENTS.md / `dsh-pre-push-checks` skill） | AGENTS.md 硬规则 3；**验证主张分级**——实证（命令/日志/盘上文件可指认）、推断（标注依据）、未验（如实标 ⏳），自述不作为证据 | ✅ 照搬 |
| 机械门禁带反证（每条先造红再证绿） | `pnpm verify`（结构 / 身份一致 / 双解析入口 / 自包含 / 技能语法 / 断链——语料=全部跟踪 markdown（`_archive` 豁免；另有 `_archive` 的 `notes/` 指针 scoped 检查），不只根+docs+notes / notes 形状 / note 指针——含非 markdown 文件里的 `notes/**.md` 路径 / **文档命令与别名表互证** / 导出手册（含验证基线 pin 行）/ 提交安全——检查清单以 `scripts/checks/verify.mjs` 为准，条数随缺口演进） | ✅ 照搬 |
| 语义漂移探针：门禁抓不住"读起来过期"，用新上下文只读入口链答"现在"问题 | **已立成开发技能** [`.agents/skills/semantic-drift-audit/`](../.agents/skills/semantic-drift-audit/SKILL.md)（本文不复写轮次数字，数过即过期；技能里带反复出现的类别，能机械化的就同轮加门禁） | ✅ 适配（问句的期望也会过期——期望锚到轮号，轮闭即红；期望锚定方案立项时必须定） |
| 继承跟 pin 走：升 pin 重校纪律表（vendor 的套路在演进，一次性快照会再烂） | `sync-dsh` 收尾清单第 4 步 + `pnpm verify` 强制本文存在 | ✅ 照搬 |
| 测试纪律：本地窄证据 + 非平凡改动 same-PR 更新快照；插件证据五台阶（导出守卫→行为→生命周期→真组合→组装转录）+ 政策禁令（mock 白名单 / 禁 hand-built 组装证据 / 禁自报探测 / 单跑才绿=spec 缺陷 / 禁掩盖修法 / prove-it-red） | 测试面合同成文于 [testing.md](testing.md)（证据分层表 + 五台阶表 + 禁令 + 已定姿态）；`pnpm test`（纯核 + 服务合同 + 导出守卫 + 生命周期）+ 真实组合 + web 渲染期望（`snapshots/web-face/`）+ eval 三条（行为 / 领域 / 接续）+ release-smoke | ✅ 照搬（按事故面采纳。session 回放快照、全量 coverage 门、子进程 loader-smoke、CI 矩阵四项刻意不采纳，触发条件写在 testing.md） |
| 文档词数预算 + slop 门禁（`doc-budgets` manifest + `verify-doc-budgets`） | 刻意不做 | ⏸ 触发条件：docs 腐化实证；建时带**降限防回填**（每次削减后主动降 ceiling，反证 = 临时设更低值即红） |
| Issue → PR 连续流 + Project 状态机（队列不积累历史） | 不适用：本地单人仓无协作面 | ⚠️ 适配：一次切片 = 一个 commit。工作流 = 用户本轮请求 + 还要人点头的提案（`notes/proposed/`）+ 推敲卡（`_backlog/issues/`）+ 缺陷卡（`_backlog/bugs/`）+ 方向判据（[`README.md`](../README.md)）。没有 ROADMAP，没有 intents.md。完成即离队（见「已声明的适配」2） |
| 外部结果先行 + 交付判断四结果分离（DSH 语料 native-model 闭环 1/7 步：闭包从可观察结果开始；「能加载 ≠ 有行为证据 ≠ 能安装 ≠ 已获交付批准」各自观察记录；recorded-session 义务的独立插件仓适配声明） | 根 AGENTS.md「开工先定外部结果」三要素 standing order；[testing.md](testing.md) 一页证据地图唯一表主 + 已定姿态（各命令能证明什么以 [testing.md](testing.md) 那一格为准；`repo-live-probe` 是取证非回归，session 回放维持触发条件制）；pre-push-evidence 只链接证据地图、不复制表 | ✅ 照搬 + 适配（钉版与 vendor 同为 dsh-v0.2.1-rc.2；与本文的是否一致由 `pnpm verify` 的 vendor-release 门禁守） |

## 已声明的适配（约束 → 适配 → 证据）

1. **无 GitHub 协作面**（约束：本地单人仓）→ 无 Issues/PR 流；等价物 = 一次切片一个 commit。
2. **工作队列不落第二份文件**（上游否决的是轮内计划状态再存一份）→ 工作流 = 本轮请求 + `notes/proposed/` + `_backlog/issues/` + `_backlog/bugs/`。方向判据住 [`README.md`](../README.md)。没有 ROADMAP，没有 intents.md。交接文档只放仓根 `.tmp/`。
3. **切片可以全新会话**（约束：上下文经济）→ 交接靠入口链（AGENTS.md → docs）与代码本身，
   不靠长活上下文。
4. **门禁不做 hook/CI 机械接线**（约束：本地单人仓、无 CI runner；用户 2026-09-27 拍板不加
   pre-push hook，不让流程再长一层）→ 纪律靠 [pre-push-evidence](../.agents/skills/pre-push-evidence/SKILL.md)
   （报告只列真跑过的命令、证据要覆盖改动面）与「被阻断的检查不得写成绿色证据」条承担；
   备选（hook、CI）在此记录为输掉方案 → 证据：一次漏跑整包的教训进技能后，同类摩擦未再现
   （change-scope 触发重置后无第二次；「触发未到不动手」纪律在 AGENTS.md）。
5. **手动分发打包用 `pnpm pack`，不用借来源的 `npm pack`**（约束：本包 peerDependencies 写
   `workspace:^`，只有 pnpm 在打包时改写成具体 semver；company 靠源里写死 peer 版本才能用
   npm，本包不行）→ `export-dist` 与
   `release-smoke` 用同一条 `pnpm pack`，且都对产物断言 peer 已具体化（证据：`release-smoke`
   对 tarball manifest 的逐 peer 断言；`workspace:` 原样出包没人能解析）。
6. **开发证据按风险投入，UX路径主导切片**（次序见 [`README.md`](../README.md) 的方向判据）：
   卫生有界先行，再围绕一条用户动作设计最小端到端体验，UI、行为和内容同片考虑；测试策略（见 [testing.md](testing.md)）
   按风险与实际消费者保留或退役，不以数量或演示可见性判断；技术承载优先组合与既有 DSH 扩展点，
   组合/扩展点不足才有证据地自建。
7. **DSH TODO 三档语义（FIXME 应 block 新 release / TODO 尽快修 / XXX 低优先级无承诺）→ 本仓
   「代码内 TODO/FIXME 不立项」**（约束：本地单人仓无 release-blocking 协作面，三档承诺没有可消费的门禁面；
   适配：根 AGENTS.md 常设指令「代码里的 TODO/FIXME 不立项，只在代码内」）。
8. **DSH 语料主仓治理族不借**（逐项核对过才拒，不是未读即拒）：CI 矩阵 / stacked PR / 加权批准 /
   Issue-PR policy——主仓治理制度，语料自己明示不自动适用于独立插件仓（native-model A2/C6）；双语
   pairing——本仓语言分工是中文文档 × 英文模型面的**非对称**分工，不是双语对照；archived note 的 hash
   manifest——本地单人仓无对抗面；registry 三态幂等——本地 tgz 手动分发低风险（触发重评：export-dist
   同版本内容变的实证）。
9. **平台语料留在 vendor**（约束：submodule 是平台事实的家；技能发现根是本仓 `.git`；`dsh-*` 技能的命令与相对路径假设 cwd 是 deepseek-harness）→ 读 vendor 对应页。本仓技能只写本仓路径、命令，以及 vendor 页上没有的差量。整段搬进 `docs/` 或 `.agents/skills/`，以及把 `dsh-*` symlink 进仓根技能目录，是输掉的做法。证据：`vendor/dsh/docs/subsystems/skills.md` 的发现根；`vendor/dsh/.agents/skills/dsh-pre-push-checks/SKILL.md` 写明服务对象是 deepseek-harness。

10. **Client 共享观看状态使用声明 store**（约束：store 随注册/布局生命周期撤销，不能独立保留页面启动的默认机会）→ 唯一窄例外是页面 realm 中的根上下文 WeakSet，仅记录是否消费默认导航机会；不持业务数据、导航偏好或订阅，不进入持久存储。源码合同在 [entry.spec.ts](../packages/dsh-smart-assistant/tests/client/entry.spec.ts)，当前导航事实在 [architecture.md](architecture.md#浏览器动作链一次点击--可见的桌面变化)。

## 复查环（防"一次性快照再烂"）

- `pnpm sync-dsh` 升 pin 时：对照本文逐行重校（vendor 的套路在演进，继承必须跟着 pin 走）；并
  **人工抽验承重行号钉**——`path:line` 钉落在文件长度内但指错行时，一切机械 ref-sweep 都放行
  （消化稿 0010 轮实证约 60 处此类漂移全靠人工重锚）；抽验对象是当前决定真正倚靠的钉
  （服务接缝、事件 payload、config 形状），不是每颗钉（该步已进 `sync-dsh` 收尾清单）。
- 语义漂移（读起来过期、自相矛盾）：机械门禁抓不住，靠新上下文探针与审计切片。
- 审计切片的处置优先序：**删 > 并 > 修 > 记**——先问能不能删（净减少），再问能不能并（一处
  事实一个出处），然后才是修与登记；判据 = 每处改动能指向它修复的具体误导或漏检，**不是**
  "文件数与总行数少了多少"。文档预算（若触发立案）同上游规则：**上限是护栏，不是减量目标**
  （`vendor/dsh/docs/AGENTS.md`「Wordcount budgets」）。
- **流程面也过成本预算**：改动流程面/入口链时，按语料四成本形态（重复记录漂移 / 过长
  standing instructions / 无意义 gate 假安全感 / 过细 Skill 仪式）+ **驾驭者认知成本**
  （用户一眼能否找到方向盘与仪表盘——语料判据全是 agent 参与视角，这一条是本仓自己的）
  过一遍；处置优先序同下（删>并>修>记），延后项与触发条件住各自决定 note。
- **新门禁必带反例**（负例控制；借 DSH「A guard only guards if the regression fails it」）：
  新增一条 `verify` 检查 = 同 diff 在 `tests/tooling/` 里该核所属族的对名 spec（`<family>.spec.mjs`，
  与 `scripts/checks/gates/<family>.mjs` 同名对齐）配一个"造红再证绿"夹具；
  只对新检查生效，不追旧账。
- **被阻断的检查不得写成绿色证据**：跑不了或没跑完的检查，在报告与 note 里如实标
  "阻断 + 原因"，不得并入"通过"。
- **历史只证明它自己**：note 与旧提交只证明其自身内容；门禁规则带生效日、不追溯重判旧物。

## 六层反馈各自证明什么（借 DSH `repo-harness/05`）

| 层 | 我们的机制 | 能证明 | 不能单独证明 |
|---|---|---|---|
| 编译期 | `tsc -b`（paths 解析到 vendor 源码）+ 严格 tsconfig | 类型关系与穷举分支成立 | 运行时组合正确 |
| Load / 解析 | cordis 组合加载（patch 行 id 唯一、inject 可解析、`--dump-config` 无 warn） | 组合在最早可解析点合法 | 行为满足意图 |
| 局部行为 | 纯核 vitest（`src/domain/`） | 所属模块的正例、错误与边界 | 组装后的产品输出 |
| 组装行为 | 服务级合同 + 真实组合测试（Loader + preset 站立挂载 + 属性代理消费） | 真实入口按预期组装（如三段落顺序、工具 scope） | 设计选择合理 |
| 真实安装 | `release-smoke`（pack → 干净 home → plugin add）、preset-runner 探针 | 真实安装形状与真实 LLM turn 的外部结果 | 长期质量 |
| 语义判断 | 审计轮 / 新上下文探针 / 用户验收 | 意图、架构、风险与证据是否对齐 | 每个机械细节都已执行 |

每层只拥有自己可观察的性质：单测绿不等于产品工作，探针绿不等于设计合理，review 也不重复机械门禁已拒绝的格式问题。

## 三道门禁各管什么（互不冒充）

| 门禁 | 能建立什么 | 不能建立什么 |
|---|---|---|
| 机械门禁（`pnpm verify` / `test` / `typecheck`） | 结构、身份、链接、命名、状态与目录一致、依赖姿态 | 意图是否合理、替代方案是否真实、散文与 shipped 事实是否一致 |
| 语义审计轮（新上下文探针 / 审计切片） | 散文与已交付事实一致、真实使用面的摩擦 | 替代方案实跑、用户意图优先级 |
| 用户拍板 | 授权范围、方向级取舍、品味 | 代码正确性、机制是否存在 |
