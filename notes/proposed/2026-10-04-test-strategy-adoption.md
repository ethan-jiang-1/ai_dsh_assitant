# 测试策略采纳：DSH 测试宪法对表 → 证据阶梯补缺 + 快照试点 + 政策成文

日期：2026-10-04 · 状态：**proposed（2026-10-04 用户三拍板：①快照层**试点先行**；②主轴**并行低档**、冻结豁免开发证据面；③打磨主战场＝**client/UX 面**。已立项为 ongoing goal：**切片 1 侦察完成、切片 2 web 面期望比对试点落地**（台账在场景 README）、**切片 3 导出形态守卫落地**（守卫首跑即抓到 dev patch 两处既存 id 漂移，同 diff 统一）、**切片 4 生命周期补缺落地**（六面 dispose 断言 7 用例全绿：工具×4 参数化 + 段落×2 assemble 断言 + dispose 后重挂用例）；切片 5 进行中）**

## 一、问题（可观察行为）

1. **台阶一缺失**：`cordis.patch.yml` 声明 8 个自有行（1 个 host service + 7 个 preset 子插件），没有任何 spec 断言导出形态。DSH postmortem 0001（多余的 `export default` 让 Loader 的 `unwrapExports` 丢掉整个模块命名空间，"178 个绿单测 + 100% 覆盖率下产品完全不可用"）的制度化防线之一是导出形态守卫；我们 2026-09-23 的 `#digestCache` 事故（preset 站立 scope 经属性代理消费服务丢私有字段，见 `notes/implemented/2026-09-23-service-shadow-private-fields.md`）与它**同属"组合可见性"类**——我们为此建了台阶四（`preset-composition.spec.ts` 真组合），台阶一仍是空白，成本一行级。
2. **生命周期证明不全**：35 个 spec 中只有 `ov-shield.spec.ts` 有 dispose-撤销断言；工具注册、技能 shadow 等其余注册语义面没有"卸载即撤销"的证明。DSH 的强制模式："Every registry gets an HMR-safety test"。
3. **client/UX 面有证据无回归**：`shots` 只拍摄不比对（PNG + DOM 证据落盘，无期望比对——`scripts/webui-shots.mjs` 头注释自述"we only navigate, never synthesize input"）；jsdom 的 client spec 覆盖组件层但**不是真浏览器**。而 ui-chat `transcriptView` 事故（vendor 预构建 client lib 落后于 src，首条消息后对话区整片冻结，`cordis.patch.yml` ui-chat 行注释）正是"只有真渲染才看得出"的 web 面回归——靠人工复现抓到。`snapshots/README.md` 的升级触发条件（"第一处只有跑起来才看得出的回归"）**已经响过一次**。
4. **测试政策无家**：测试面合同散在 `docs/discipline.md` 一行（⏳）、`snapshots/README.md`、`.agents/skills/pre-push-evidence/` 与各 spec 头注释。DSH 九条教义中"hand-built `ctx.plugin(...)` 不算组装证据""禁对 agent 自报的关键词探测""mock 白名单只放 LLM/网络/时钟""单跑才绿 = spec 缺陷""禁掩盖修法（sleep/retry/弱化断言）"——没有任何一处成文。下一个 agent 改测试时没有对表物，台阶会静默退化。
5. **discipline.md 测试行过期**：真实组合、eval 两级、loop-probe、release-smoke 这些已成形并实战验证过的证据面都没进登记；改动面→证据的可执行表住在 `pre-push-evidence` 技能里，政策层不引用它。

## 二、消化结论：采纳矩阵

### 已对齐（实证在案，不动）

| DSH 教义/机制 | 本仓对位物 |
|---|---|
| 证据匹配面，不是测试金字塔 | `pre-push-evidence` 技能的改动面→证据表（= `dsh-pre-push-checks` 对位物） |
| 教义 4 mock 只放边界 | 35 spec 全部真依赖（真 cordis 服务 + vendor 真实现），唯一近似 mock 是 `client-panels.spec.ts` 的 fake timers（时钟=合法边界） |
| 教义 5 verify the world | `eval` 判决读会话日志不读 stdout（`dev/eval/run.mjs` 头注释明文） |
| 教义 6 测真实入口 | `preset-composition.spec.ts`：真 Loader + built `lib/` + preset 站立挂载 + 属性代理消费（= REAL composition 进程内级）；`release-smoke`（pack→干净 home→plugin add→组合断言）= built-bin-smoke 对位物 |
| 教义 7 源码平面 | `vitest.config.ts` 把 `@deepseek-ai/*` 解析到 vendor **src**，注释里写着 stale lib 双份单例的理由 |
| 教义 3 with-key 冒烟 | `loop-probe`（boot preset + 真发问真等回复 + JSON 判决）= "boot a shipped profile, send one prompt, check the world" 的精确对位 |
| prove-it-red（守卫要先见红） | `docs/discipline.md` 复查环："新门禁必带反例"，`tests/verify-gates.spec.mjs` 全部负例夹具 |
| 防假绿：skipped≠绿、阻断不写绿 | `pre-push-evidence`："被阻断的检查不得写成绿色证据"；discipline 适配 4 |
| 门禁单一事实源 | `scripts/verify.mjs`（33 检查）= `run-gates.ts` 的本仓对位物 |
| 隔离与串行 | `ASSISTANT_DSH_HOME` 隔离 home = DSH 双 home 惯例；`eval` 串行纪律成文于 `run.mjs` 头注释 |
| 测试文件过类型门 | `tsconfig.test.json`（`pnpm typecheck` 覆盖 tests） |
| 命名文体（行为命题、无 should） | 35 个 spec 头注释抽查全部是行为命题式英文 |

### 补缺（本提案 §三的切片）

台阶一导出守卫（缺）→ 切片 3；注册表 dispose 断言（部分）→ 切片 4；web 面期望比对（缺，触发已响）→ 切片 2 试点；政策成文（缺）→ 切片 5。

### 刻意不采纳（登记触发条件，不建机器件）

| DSH 机制 | 不采纳理由 | 触发条件 |
|---|---|---|
| per-file 100% coverage 门（全量） | DSH 用它当死代码探测器；我们 src 面小且无 CI 常驻，全量回溯成本高 | 第一处"删了才对"的死代码实证。**agent 已定的中间姿态（2026-10-04，记入政策页）：新文件 per-file 100%（对齐 DSH 门标准），存量文件祖父豁免；先纪律后机器门** |
| 轻量子进程 loader-smoke 中间层 | `release-smoke`（发布物）与组合测试（进程内）两头已夹住；无可选二进制依赖需要 `PATH=''` 类验证 | 出现"可选依赖缺席时不得探测/启动"类承诺（如未来 OpenViking 深度集成） |
| 平台矩阵 / CI 车道 | 无 CI（用户 2026-09-27 拍板，discipline 适配 4） | 第二个协作面出现时重议 |

### agent 已定、不另请拍板的执行姿态（2026-10-04，随政策页登记）

- **eval 节奏**：模型可见切片收尾用 `pnpm eval --only <聚焦>` 跑相关任务，阶段收尾才全量——控制 key 配额与串行时长，不降"判决读会话日志"的标准。
- **快照试点的失败出口**：试点带成本台账（建造成本 / UI 改动时的重录或重放成本 / 假红率）；台账不利时试点降级为"shots 期望比对最小模式"或退回触发制，判定记录进 note——试点是测量，不是承诺。

## 三、提案（五个切片，每片一个可提交锚点；与「真用第一」主轴并行低档穿插，一次一个切片）

### 切片 1：侦察（不改产品代码，半天内）

1. 导出面盘点：8 个自有行 → 模块 → 导出形态清单（host service 合法 default；7 个子插件是否纯净 named）。
2. 贡献面盘点：向哪些注册表贡献什么（tools / skill shadow / preset rows / client slots / roomCommands），dispose 断言覆盖矩阵。
3. `eval` 无 key 行为：显式红还是静默绿？若后者，补"缺 key 硬失败"（对齐 DSH e2e preflight）。
4. vendor `test-support/{llm-replay,loader-smoke,session-snapshot}` 经 workspace 源码平面 import 可行性（一行 smoke 证明）。
5. **web 面试点侦察**：试点场景的输入形态（合成会话 fixture vs 录制会话 JSONL）、`shots --eval` 能驱动的交互态边界、期望比对放在 DOM 证据层还是 PNG 层。

**侦察结论（2026-10-04，全部实证）：**

1. **导出面**：8 行当前全部形态正确——7 个子插件纯净 named（`name`/`inject`/`apply`，无 default），host service 合法 default（`AssistantMemory extends Service`）；子插件的 `name` 导出值 = patch 行 id（守卫可顺带钉一致性）；`ov-shield` 另有合法 named export `denyDelta`（守卫只禁 default，不禁额外 named）。守卫性质＝防退化，非修现存。
2. **贡献面矩阵**：home-preamble/memory-digest → `systemPrompt.section`；tool-memory/tool-research/tool-knowledge/learn → `tools.register`；ov-shield → `tools.restrict` + `skills.register`。dispose 断言现状仅 ov-shield 一面，缺口 6 面；插件侧用例浅而全即可（注册撤销语义本体由 vendor ToolRuntime 的 HMR 测试拥有）。
3. **eval 无 key 行为**：session 失败 → "no session log was produced" → verdict FAIL → 有败即 `process.exit(1)`——**显式红非静默绿**，无需补硬失败门（DSH 缺 key 硬失败的等价物已在）。
4. **test-support 可用性**：七件套全部在 `tsconfig.tsx.json` 别名表（`pnpm gen-paths` 已生成），源码平面 import 零胶水——快照任何形态的 harness 成本都不含"自造"项。
5. **web 试点输入形态**：`shots` 无比对模式（要加 expected）；`--eval` 可驱动交互态；dev home 四 profile 在位可起服务；易变身份字段（时间戳/session id/工作区路径）的 token 化是胶水成本主体，列为试点第一施工步；**v1 场景定 blank 首开态**（零 key、零会话数据），"首条消息渲染态"的离线注入成本作为台账第一项，注入贵则该态由 client spec 组件层覆盖。

### 切片 2：快照试点——web 面期望比对（用户拍板"试点先行"；钉 client/UX 主战场）

- **场景**：首开空白会话 + 首条消息渲染态——正是 ui-chat 事故与首开 UX 卡反复打磨的那个状态；输入形态按切片 1·5 侦察结论定（倾向合成会话 fixture 起步，录制回放待成本证明）。
- **机制**：扩展现有 `shots` 机械加**期望比对模式**——DOM 证据（`--dom` 的 JSON）与已提交期望文件比对，PNG 作人工审阅副页不进机械比对（DSH 口径：diff 人工过目）；比对落 `snapshots/web-face/` 或试点专用目录，边界句随场景同 diff 写清。
- **prove-it-red**：临时改一个座位文案/布局常量 → 比对变红 → 还原，证据进 note。
- **成本台账**：建造成本、UI 改动时刷新期望的成本、假红率（连跑 N 次±环境噪声）；按 §二"失败出口"判定铺开/降级/退回。
- 提示词组装面的录制回放（DSH 的 snapshots/session/ 形态，本仓路径切片落地时建立）列为**第二场景候选**：等打磨移回提示词/摘要面、或 web 试点台账证明 harness 可复用时再建。

### 切片 3：台阶一——导出形态守卫

- 新 spec：现读 `cordis.patch.yml` 的自有行 name → import 模块 → 对 7 个 preset 子插件断言 `'default' in mod === false` + `Loader.unwrapExports` 往返不丢命名空间 + `name`/`inject` 穿透在场；对 host service 行断言 default 是 `Service` 子类（service 插件的合法形态）。
- 副产品：这个 spec 同时钉住"patch 声明的每一行都解析得到"——`--dump-config` 的进程内等价物。
- **prove-it-red**：临时给一个子插件加 default export → 守卫变红 → 还原，证据记进 note。

### 切片 4：生命周期补缺

- 按切片 1 矩阵，对有注册语义而无 dispose 断言的面补 `(HMR safety)` 式用例：dispose 贡献 fiber → 贡献从注册表消失 → 服务自身不受影响。
- client 面：`exactly-one-registration` 已断言（`client-harness.ts`），不重复建；client spec 的扩面（主战场预期在 client/UX，会常加）沿用 DSH `ui-tool` 的**验收清单式文件头**纪律——文件 docstring 逐条列出本文件断言的验收点。
- Config 两脸抽查：行为跟随（`digestMaxBytes`/预算闸门）已有 `digest-budget.spec.ts`；模型可见脸（description/scope 随 config 变）由 `preset-composition.spec.ts` 的 tool schema 断言覆盖——缺口按盘点结果补。

### 切片 5：测试政策成文（文档批，收尾同 diff 一篇 note）

- 新测试政策页（本切片落地的 docs/testing.md，≤60 行，对齐 DSH 同名同位，只写现在）：① 证据形态分层——引 `discipline.md` 六层反馈表，不复制；② 插件证据五台阶表（导出守卫→行为 spec→生命周期→REAL composition→组装转录），每行给本仓样板文件路径；③ 政策条款：mock 白名单（LLM/网络/时钟）、禁 hand-built 组装证据、禁对 agent 自报的关键词探测、单跑才绿=spec 缺陷、禁掩盖修法清单、新守卫必须 prove-it-red；④ 触发条件与已定姿态（coverage 新文件 100%、eval 节奏、快照第二场景候选、loader-smoke/CI 触发）。
- `docs/AGENTS.md` tier 表加一行（testing.md 拥有"测试面合同"）。
- `docs/discipline.md`：测试行 ⏳→✅ 更新，登记采纳矩阵与偏离（约束→适配→触发条件）；冻结豁免句（开发证据面不在「真用第一」冻结范围——用户 2026-10-04 拍板）登记进已声明的适配。
- `snapshots/README.md`：升级触发条件改写为可判定清单，并标注"web 面触发已于 2026-10-03 ui-chat 事故响过一次、试点已立项"。
- 本切片同 diff 落一篇 implemented note（2026-10-04-test-strategy-adoption.md）：消化来源、采纳矩阵全文、试点成本台账、输掉的方案；与 2026-09-25-dsh-alignment-borrowables.md（部分取代关系：快照边界句在此收编）互链。

## 四、验收

- `pnpm typecheck && pnpm test && pnpm verify` 全绿；切片 2/3 的守卫带 prove-it-red 记录。
- 试点带成本台账与三岔判定（铺开/降级/退回），判定可追溯。
- 政策页 ≤60 行，每条条款可点击跳到本仓样板（不留"无本仓对位物"的悬空条款）。
- 政策成文后跑一轮语义漂移自查（新文档自身 claim 与 repo 事实一致；审计轮制度已在 ROADMAP 常设规则）。

## 五、输掉的方案

1. **全量照搬 DSH 七层**（8 份 vitest 配置、coverage 门、快照 harness 全家、CI 矩阵）：我们是一个包的插件 repo，不是 316 包 monorepo，无 CI 无平台矩阵；照搬会把门禁成本花在不存在的事故面上。选"按事故面采纳"——只补有事故史（0001 同构、ui-chat 真渲染回归）或已成文禁令支撑的缺口。
2. **快照维持触发制、等第 3 次摩擦再建**（本卡第一版方案）：被用户 2026-10-04 的框架击败——铺垫期的意义正是"不等痛苦出现"；且 web 面触发条件已实际响过一次（ui-chat 事故靠人工复现抓到）。但**直接铺开**也被否：真实成本（胶水、假红率、录制配额）无人测过，试点先行拿数据。
3. **只补测试不立政策**："政策无家"是"将来指导"的承重件——下一次加 preset 行/工具/client 面时没有对表物，台阶会重新烂掉；政策的边际成本一页，防的是复演。
4. **把 eval/eval:domain/desk-loop 改造成 DSH 形状**：它们不是缺口而是本仓超额层——DSH 测的是机制（harness），我们的产品承诺是"像领域专家"（`eval:domain` 的质量判定只能由人打分）；机械地板之上的人判层是 DSH 没有的层，保持独立，不往七层里硬塞。
