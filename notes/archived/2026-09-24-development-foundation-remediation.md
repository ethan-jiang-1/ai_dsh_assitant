# 开发基石整治：导航补全 · 纪律收口 · 反馈门禁补缺 · 真实组合回归

日期：2026-09-24 · 状态：**implemented**
已归档：2026-09-25（历史记录，非当前权威；冻结不再编辑）
依据：用户决定（2026-09-24）——先把仓库变成"agent 不容易理解错、做错后能及时知道"的开发环境；
保留现有架子、小步迭代；本文件是同名提案（原 `notes/proposed/`，毕业即此）执行后的实际决定与证据。
原提案的交接状态（含"保留已有改动、不恢复上轮大改"约束）已由本轮执行消化。

## 决定（按切片）

**A · 导航与可达指针**：AGENTS 布局表补 `src/knowledge/`（纯核）与 `src/tool-knowledge/`（agent 面）
两行，tool-support 改"四个工具"，开工段加一句分工限定（用户请求定范围 / ROADMAP 管队列 / docs 管
契约 / notes 管依据）；architecture.md 三工具→四工具（§一③/§二/§三/§四）、agent 面树补
assistant-knowledge-tool、§三补 knowledge 纯核行、§五数据流补 knowledge 读写路径；ROADMAP 五个 ⏳
条目的不可达简称全部换成可点击 note 路径——对应关系逐项核对过：全自动蒸馏=R2 survey §9.3-5；
FTS/trigram 的 dsh-knowledge-sqlite 实测表在 R3 survey §4.3/§7.2-3；memsearch 形态=R1 survey §6-7
（§6 建议第 7 条）；1g 审计=spec-field-audit note。

**B · 纪律收口**（docs/discipline.md）：计划文件行的上游来源适用范围收窄到"轮内计划状态"
（vendor 2026-07-22 note :54 讨论的是已由工具参数记录的计划不重复持久化，不是 repo 级提案禁令；
repo 级设计计划住 notes/proposed/、队列住 ROADMAP）；轮内任务面标为"本地选择，以当前会话所有为准"；
"15 条""60/60"等过期计数改为"清单以 scripts/verify.mjs / 实际测试为准"；Issue→PR 行的队列语义改指
ROADMAP（决定档案 roadmap-queue note）；"已声明的适配"2 改写为"工作队列落一个文件"（ROADMAP）；
文末"文件数与总行数"判据改为"每处改动能指向它修复的具体误导或漏检"（上游规则：上限是护栏不是
减量目标，`vendor/dsh/docs/AGENTS.md`「Wordcount budgets」）。discipline-alignment 与 roadmap-queue
两份 note 互加部分替代说明，原理由保留。

**C · 活跃 notes 维护**：iteration-rhythm (b) 层触发信号加实施修正（`goal/changed` 被亲验推翻→
`agent/inbox/inserted`，链接 maintenance-metronome note，原设想保留不擦）；tri-line-synthesis 标题
去"提案（草稿）"、§七"批准后的事"逐项对账为实际归宿（I15 已补 implemented；R3 thread 已开且
parked——`20260923-how-should-the-knowledge-room-land-3e8i`；布局表随切片同步；实施纪律全程执行），
§六延后项维持移交 ROADMAP 的注记；agent-notes-entry-clarification 的"只补引言与开工段"按实际 diff
校准（当时还含用户追加的布局行）。

**D · 根类型检查**：根 `pnpm typecheck` 委派包级脚本（`tsc -b` + `tsc -p tsconfig.test.json`），
从根一个入口即覆盖 src 与 tests。修改前红证（接手时即提案记录的）：`tests/knowledge-write.spec.ts(8,42)`
未使用 `writeFileSync`、`tests/skill-audit.spec.ts(16,7)` 未使用 `BODY_OK`（TS6133）——删除两处未使用
声明，测试断言语义不动；AGENTS/dev.md 命令注释同步覆盖范围（测试工程经 workspace 构建声明解析
vendor 的现状保留，构建前置写明）。

**E · 门禁补缺**（verify 18→21）：三条检查的核心逻辑抽到 `scripts/verify-checks.mjs`（窄函数），
正反例持久化在 `tests/verify-gates.spec.mjs`（9 fixtures，.mjs——vitest 跑、类型工程不看）：
1. **pin**：UPSTREAM.md 记录 SHA ↔ checkout HEAD 精确一致；父 gitlink 语义明确（提交指针落后于
   checkout = sync-dsh 正常待提交尾态，允许，以簿记与 checkout 一致为前提；其余分歧报错）；
   vendor 树 tracked 源码脏改红、未跟踪产物豁免。tag/describe 检查原样保留。
2. **notes 形状**：五类 note 目录（proposed/implemented/rejected/postmortem/research）文件名必须
   `YYYY-MM-DD-topic.md`（README/intents/.gitkeep 等非 note 文件豁免）；proposed 提案必须有加粗
   `状态：**…**` 行（没有状态行 = 毕业门禁永远看不见它）；毕业词表在原三词上扩 已完成/已实施
   （"待接手实施/部分实施"不误伤——fixture 钉死正反两侧）。
3. **相对链接**：`[x](path)`（URL 解码后）按 markdown 语义相对所在文件检查存在性；锚点/query 剥离
   但**不校验**（slug 出范围）；`(url)`/`(…)` 等散文占位符按 path 形状规则出范围。verify.mjs 的范围
   注释与 AGENTS 命令表描述同步改写（不宣称完整 Markdown 或语义证明）。

**F · dev 手册矛盾**：§五"one-shot 无反应"行的正确做法改为"跑 dev-task（headless 模板自带 runner
行与位置参数解析），不要往 dev 追加 headless（§四 混装必撞 duplicate id，setup.sh 反而会摘除）"——
原文"setup.sh 已把 headless 追加进 profile bundles"与 `dev/setup.sh` 实际行为相反；§六组合图改为两条
profile 各自的链（dev = base→web-app→插件；dev-task = base→headless→插件），并注明两个 patch 文件
不可互换。

**G · 真实组合回归**：`tests/preset-composition.spec.ts`——真实 Loader + vendor 注册表
（llm/session/session-projection/system-prompt/tools/skill/agent/agent-loop/agent-presets）+ 站立
挂载 + 真 Agent join。装载内容是本包自己的面：agent 面行（digest + 四工具，行名与本包
agent.cordis.yml 逐字一致，从 lib/ 构建物经 node_modules 链接解析——部署同款）与 host 行（发布入口
经 `ctx.plugin` 装载，绝不手构造服务实例）。断言穿过生产消费路径：**system prompt 组装**（digest
段落在装配时经注入与属性代理调 `digestSnapshot()`——2026-09-23 live 翻车的确切路径）与 **agent 可见
工具面**（四工具在 joined agent 的 scope 内、根注册表保持干净）。红证：临时把 `digestCache` 还原为
`#` 私有字段并重建 → 测试以原文级别错误失败（"Cannot read private member … from an object whose
class did not declare it"，同款 shadow-receiver 栈）；恢复源码重建后 2/2 绿。为此新增 5 个 devDeps
（cordis-plugin-loader/include、dsh-session-projection、dsh-system-prompt、dsh-agent-loop——组合测试
要挂真实 harness 面，走 devDependencies 正门）；lib/ 未构建时该 suite 明确跳过并打印 `pnpm build`
提示（fresh clone 首跑不红）。

**五节窄核查（四项全部核实并处理）**：
1. **sync-dsh**：属实——`verified` 在 typecheck 之前写入，--no-typecheck 与 typecheck 失败都留下
   成功声明。修复：兼容列只在 typecheck 通过后写；UPSTREAM 簿记改写抽 `applyUpstreamRecord`
   （表行漂移时拒绝而非静默不改）；`tests/sync-bookkeeping.spec.mjs` 5 fixtures 钉死
   通过/跳过/失败三分支与簿记改写。本轮未真的升级 pin。
2. **release-smoke**：属实——web 模板 profile 没有 headless-startup/runner 行（vendor 树
   `vendor/dsh/packages/bundle/headless/src/startup.ts` 持有该服务与位置参数解析），位置参数与 one-shot 在该组合里不可能执行；
   且 shipped one-shot 是裸 agent，即使跑也不验 preset。修复：smoke profile 改从 headless 模板建、
   roster 用 insert 语义指向安装产物（镜像 dev-task）、live turn 走 preset-runner 挂载（--patch，
   与 dev/probes/session/preset-runner.patch.yml 同款形状，live turn 才真正 join assistant preset）；keyless 增加
   "patched dump 含 preset-runner"断言。无 key 路径实跑通过；有 key 的真 turn 本轮无凭据未 live
   验证（见剩余限制）。
3. **research README**：属实——原文把 repo 侧调研说成家的 research 房间的"repo 侧文档面"，暗示
   开发调研依赖先运行产品。改写：调研文档自足成立；家的 research 房间是助手自己的探索线索，两者
   需要互通时用 `sources:` 指针互链。
4. **隔离说明**：与启动器实现基本一致，两处措辞校准——`DSH_AGENTS_HOME` 是"未显式设置才接管"
   （`??=`；env.sh 才无条件强制）；家的 dataDir 默认随 `resolveDshHome()` 隔离，显式覆盖例外已在
   `docs/home.md`，dev.md 表行补注。

## 输掉的方案（本轮实际考虑并放弃）

| 输掉的 | 为什么输 |
|---|---|
| 整份 assistant preset 进组合测试 | 会拖进 persona/fs/web/shell 等十几个非依赖 vendor 包（不在本包 devDependencies），还要伪造 host 面 web 服务——超出"最小"，且那些行是 vendor 包自己的测试面 |
| 用 Node self-reference 解析 `dsh-smart-assistant/*` | discovery 的健康检查是纯 node_modules 向上走（vendor agent-presets `packageInstalled`），不走 self-reference——本地必然报 broken；测试内仿真安装形状（temp node_modules symlink = `dsh plugin add` 的真实形状）才两端一致 |
| verify fixtures 用 TS | 根级脚本是无类型 .mjs，tsconfig.test.json 引入即类型污染；.mjs 测试文件 vitest 跑、类型工程不看 |
| 相对链接门禁连锚点一起校验 | 中文标题 slug 规则脆、误报风险高；本轮只做存在性，锚点明确出范围并写进注释（一次只补一个缺口） |

## 证据（实跑命令与结果）

- `pnpm typecheck`（根，委派后含 tests）：通过（修改前红：TS6133 ×2，即 D 的红证）。
- `pnpm test`：**151/151**（28 文件；含新增 verify-gates 9、sync-bookkeeping 5、preset-composition 2）。
- `pnpm verify`：**21/21**（18→21：+notes 命名 +提案状态行 +相对链接；pin 检查原位增强）。
- `pnpm build`：通过（红证切换与恢复各一次）。
- `pnpm release-smoke`（无 key）：passed——pack→headless 模板 profile→plugin add→组合断言→
  patched dump 含 preset-runner→live self-skip（如实打印跳过原因）。
- 红证（G）：`#` 私有字段变体使 preset-composition 以 "Cannot read private member #digestCache2
  from an object whose class did not declare it" 失败（vendor cordis `createShadowMethod` 的
  apply trap 同栈）；恢复后 2/2 绿。
- fresh-context 只读探针：见下节。
- `git diff --check`：无空白错误。

## fresh-context 只读探针（§六验收第 8 项）

全新上下文只读 agent（无本对话、禁 git 发明任务、未改任何文件未跑测试）沿入口链答五问，**五问全部
到文件行号级、结论"是——入口链足以让新 agent 不靠猜"**。摘录：

1. 知识排序 → `src/knowledge/search.ts` `searchPages()`（排序唯一实现，`src/index.ts` 只是薄包装）；
   测试 `tests/knowledge-retrieval.spec.ts`；取舍 `notes/implemented/2026-09-24-knowledge-retrieval.md`
   + R3 survey §7.1-2；owner 面 = AGENTS 布局表 `src/knowledge/` 行（A 切片的行被探针直接消费）。
2. 决定反转 → 新建 note 双向互链，旧 note 不就地改写（AGENTS 18-19 行 + vendor notes README 48/50 行）。
3. 相对链接切片 → `pnpm verify` 的 "links: relative markdown links point at existing files"
   （`scripts/verify-checks.mjs` + 范围注释），正反例在 `tests/verify-gates.spec.mjs`——检查范围
   "查什么/明确不查什么"与实现一字不差（E 切片的注释真实化被验证）。
4. 根 typecheck → 委派包级 `tsc -b` + `tsc -p tsconfig.test.json`，覆盖 src+tests、不覆盖
   `scripts/*.mjs`——与 D 切片后的实际命令一致。
5. 无 key 边界 → release-smoke 证明安装/组合/入口形状、不能证明真 turn；`pnpm test` 证明纯核+服务级
   合同、不能证明真实 preset 会话（引 service-shadow note 的"骨架全绿 ≠ 产品点亮"为反例）——证据
   分级口径与 discipline.md 一致。

探针顺带上报两处小瑕疵，处置：
- `docs/dev.md` §二"只列 6 个包"计数过期（实为 14 条 paths）——**已修**（去掉硬编码数，同 B 切片准则）；
- 链接检查无单条运行入口（只能随 `pnpm verify` 整包跑）——**登记不立案**（E 切片明确保持单一 verify
  入口；单条入口属新需求，先记录为观察）。

## 剩余限制（如实交接）

1. release-smoke 有 key 分支的**真 turn** 未 live 验证（本轮无凭据）；已证明的是入口形状与 keyless
   组合，键入分支挂载的 runner 与 dev 验证过的 preset-runner 完全同款。
2. preset-composition 覆盖本包自己的 agent 面行 + host 行；整份 assistant preset 的 vendor 行
   （persona/fs/web/shell/compaction 等）不在其中——那是 vendor 包测试与 live Web 会话
   （docs/dev.md §四）的验证面。
3. 组合测试与 preset 行装载依赖 `pnpm build` 产物；fresh clone 首次 `pnpm test` 会跳过该 suite 并
   打印提示（typecheck 与其余测试不受影响）。
4. 相对链接门禁不校验锚点 slug（出范围已声明）；锚点腐化若成真问题，按"一检查一反例"同款补。
5. 探针为单轮样本；语义漂移探针的常态化维持 discipline.md 适配行（按需审计轮）。

## 队列

本提案完成即离队：本文件即实际决定与证据；ROADMAP 的 ▶ 条目移除，其余条目不动。
