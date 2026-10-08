# DSH 对齐补课：借结构，不只是借术语

日期：2026-09-25 · 状态：**implemented（五项全部落地：S1 92aeb0f、S2 138dee5、S3 5a3290e、S4 与毕业同提交、S5 并 92aeb0f；依据[自审档案](2026-09-25-dsh-alignment-deepening.md)，红证据[档案](2026-09-25-dsh-alignment-deepening.md)）**
已归档：2026-10-08（战役、审计或收口已结束；结论在现行合同或仍有效的决定里。本篇冻结，不再跟踪。）

> 依据：[DSH 对齐自审](2026-09-25-dsh-alignment-deepening.md)（`notes/implemented/2026-09-28-research-absorbed-into-backlog.md`，已收卷）——
> 上轮声称 vs 实际逐项对照，含两条被我在压缩证据时弄丢的借项（解析门面术语、房间/桌面/抽屉映射）。
> 上轮的借鉴卡（[implemented](../archived/2026-09-25-dsh-alignment-borrowables.md)）仍有效，其 B9 行按本卡修正为"部分落地"。

## 一、补课清单（按 DSH `07:52-58` 的优先级排序）

### S1 · 子树 AGENTS.md ✅（优先级 1）

**我方现状**：仓库内 1 个根 AGENTS.md 承载布局 + 命令 + 硬规则 + 路由（约 105 行）。
**DSH 依据**：`_coverage/00:132` 记录 root + 21 子树；`02:7` 明确反对"所有细节都进入根级指令"；
`01:13` 的 fresh-agent 路径是"根 → 需要时读子树"；DSH 原生装载器本就按目录链加载嵌套 AGENTS.md。

**做法**：建 5 个真子树 owner 文件（只写该子树的常设指令，不复制根的内容）：
| 新文件 | 拥有什么 |
|---|---|
| packages/dsh-smart-assistant/AGENTS.md（新建） | 包级：入口与平面（清单以生成物为准）、四个工具与其动词集、Service Definition/Provider/Consumer 三角色、改模型可见面的纪律（语言分工 + 日志税 + 快照）、包级测试命令 |
| docs/AGENTS.md（新建） | 文档 tier：每份 docs 文件拥有的事实、只写现在（禁 previously/now 叙事）、契约与代码 owner 的对应（谁钉谁） |
| scripts/AGENTS.md（新建） | 门禁清单与纪律：每条检查能/不能建立什么、新检查必带负例夹具、收尾三连（typecheck/test/verify）、生成器与 freshness |
| dev/AGENTS.md（新建） | 双 home 与 profile 纪律：不碰 `~/.dsh`、两个 profile 各自验什么、运行残留 gitignore |
| snapshots/AGENTS.md（新建） | 只收 session 回放 fixture 的边界（现写在 README，移成子树指令或指针） |
**根 AGENTS.md 相应瘦身**：布局表保留"这一行归谁"的指针，把工具集/入口/文档 tier 的细节移入子树——
但根必须仍然自足到能指路（交接链不能断）。

### S2 · 生成目录 + freshness ✅（优先级 5）

**我方现状**：手维护的清单漂移过两次（包 README 的"三房间/三工具/5 入口"、8→7 入口），
现在是 verify 交叉检查兜底。
**DSH 依据**：`02:43-49`、`06:23-27`、`08:55`。

**做法**：新增 scripts/generate/gen-catalog.mjs（新建）→ 生成 docs/package-catalog.md（新建；**生成物，禁手改**），
数据从真实源抽取：`package.json` 的 `exports`（入口×平面）、`cordis.patch.yml`（host 行）、
`presets/assistant/agent.cordis.yml`（agent 行：id/name/disabled）、四个工具的 wire name 与动词集、
两个 prompt 段落与技能来源。`verify` 加 freshness 检查（`gen-catalog --check`，与 `gen-paths` 同形）。
包 README 与 `docs/identity.md` 的手维护清单改为指向 catalog（身份名的语义仍在 identity.md，
但"当前有哪些"由生成物回答）。

### S3 · `.agents/skills/` ✅（优先级 4）

**我方现状**：不存在；6 个 SKILL.md 全是产品运行时技能。
**DSH 依据**：`03:19-24` 两类同名 Skill 必须分清；`03:7-11` Skills 装"读上下文 + 应用判断 + 步骤 + 报告"的任务。

**做法**：建 .agents/skills/（新建），先立 3 个**本轮真实重复过**的流程（每个带 frontmatter + 触发条件 + 步骤 + 验证 + 边界）：
| skill | 触发 | 为什么有资格立 |
|---|---|---|
| `repo-live-probe` | 要验证模型可见面（段落/工具/persona）真的进了请求 | 本轮重推 ≥6 次：runner 命令、会话日志解包（`./--<cwd>--/` 前缀坑）、system prompt 分段字节测量、zstd 包装器 |
| `note-archive-judgment` | 判断一篇 implemented note 该留还是冻结进 archived | 本轮现场重推：低未来决策价值判据、`已归档：` 行、入站链接修复、冻结语义 |
| `pre-push-evidence` | 收尾时按改动面选最小证据 | 硬规则 3 每轮都要判断；本轮 DSH 三次提交全是手工判断（typecheck/test/verify/夹具/build 的取舍） |
**同 diff 必须做**：根 AGENTS.md 写消歧句（.agents/skills/（新建）=开发用、`presets/assistant/skills/`=模型用），
否则正撞 `03:17` 警告的同名陷阱。装载面（dev profile 是否扫 .agents/skills/）先查 `dev/profiles/profile-patch.yml`
与 `dsh-skill-filesystem` 配置再定，不猜。

### S4 · 负例控制补课 ✅（优先级 3）

**我方现状**：27 条检查 / 11 组夹具；结构、身份、自包含、docs 合同等旧门禁无红证据。
**做法**：给旧门禁里**最高价值的四条**造红夹具（结构必需路径缺失、身份名与 patch 不一致、
自包含越界引用、docs/home 合同与代码常量不符）。**只补这四条**——不是全量追账，
而是把"门禁真的会拦"这条声明覆盖到承载结构性断言的那几条；其余按新检查规则渐进。

### S5 · 顺手项 ✅（都是小改）

1. **解析门面术语锚定**：`AGENTS.md:52`、`:69`、`docs/dev.md:26` 的"两个解析门面"改为
   "两个 tsconfig 解析入口"（或首现处加括注），消除与 DSH `Context façade` 的撞名。
2. **房间/桌面/抽屉映射**：`docs/home.md` 首现处各给一句"在 DSH 里对应哪层持久化/上下文"（不新增术语）。
3. **六层反馈表**：把 `docs/discipline.md` 的三行表扩成六层（编译期 / load / 局部行为 / 组装行为 /
   真实安装 / 语义判断），每层写"能证明 / 不能单独证明"（借 `05:15-24`）。
4. **参与阶梯 L0–L3**：`docs/architecture.md` 的归属四问前补阶梯表与"何时升级"
   （借 `04:30-37`），并写明"新增模型可见事实必须扩展 SessionEventMap 并从日志重建"（`04:39`）。
5. **Known Limitations 的 owner**：包 README 加一节，收纳目前散落的"登记不立案"负知识
   （如 PTC 模式 counts=null 显示瑕疵）。

## 二、落地记录

- **S1 ✅**（`92aeb0f`）：5 个子树 AGENTS.md（packages/docs/scripts/dev/snapshots）+ 根布局表 17→9 行 + 稳定性门禁扩到全部 6 个入口文件。
- **S2 ✅**：`scripts/generate/gen-catalog.mjs` → `docs/package-catalog.md`（入口×平面、组合行、工具×动词、策展技能、pin 与依赖姿态），
  freshness 进 `pnpm verify`（`gen-catalog --check`，与 `gen-paths` 同形），6 个纯核夹具。
  **建成即抓三处真问题**：生成器漏了 `dev/probes/session/preset-runner.patch.yml`（把 preset-runner 误报为非 plugin 导出）、
  未识别 client 平面、包 AGENTS.md 的"8 个子路径"与实际 9 个不符——手维护清单的口径分歧被生成物当场对账。
  包 README 与包 AGENTS.md 的入口表按 S2 设计改为**指向生成物**（永久消除该漂移面）。
- **S5 ✅**：解析门面术语改名（防与 DSH `Context façade` 撞名）、房间/桌面/抽屉映射段、六层反馈表、参与阶梯 L0–L3。
- **S3 ✅**：三件开发技能（`repo-live-probe` 探针流程、`note-archive-judgment` 归档判定、
  `pre-push-evidence` 按改动面选证据）+ 根 `AGENTS.md` 消歧句（开发用 vs 模型用，不共享 registry）
  + 技能语法门禁扩到两个技能家（抽成纯核 `skillFrontmatterProblems` 并配反例夹具）。
  **装载面结论（读源码，不猜）**：provider 自带 `project-agents` 根扫 `<projectRoot>/.agents/skills`
  （vendor `skill/skill-filesystem/src/index.ts:247`，rank 200）——**零接线**；实测本会话技能目录
  随文件落盘实时更新（三件技能当场出现在可用技能列表里），即"进目录即入目录"。
- **S4 ✅**：四条高价值旧门禁的红证据（结构必需路径 / 身份名与 identity 表一致 / 自包含 /
  docs-home 合同），手工造红 → 观察 FAIL → 还原，逐条原文入[证据档案](2026-09-25-dsh-alignment-deepening.md)；
  **副产物两条**：一次探针自己写错（门禁正确保持绿——不红先怀疑探针）、
  契约检查漏列第四个工具 `assistant_knowledge`（真缺口，同 diff 补齐）。

## 三、落地序与验收

1. S5 顺手项（小改一把）→ 提交；
2. S1 子树 owner 文件 + 根瘦身 → 提交（**本条是本卡的核心**）；
3. S3 `.agents/skills/` 三技能 + 消歧句（+装载面结论）→ 提交；
4. S2 生成目录 + freshness 门禁（含夹具）→ 提交；
5. S4 四条旧门禁红夹具 → 提交。
每步：`pnpm typecheck && pnpm test && pnpm verify` 全绿；本卡随进度改写，完成后毕业。

## 三、输掉的方案

- **照搬 22 个 AGENTS.md**：DSH 有 21 个包组与多层目录；我们只有单包 + 5 个有实质子规则的目录。
  按目录数复制会产出空壳 owner 文件——`07:38` 自己警告"较小项目…而不是复制全部包结构"。
- **给所有旧门禁补夹具**：27 条里多数是文件系统/链接类，价值密度低于结构性那四条；
  全量追账的收益不抵维护成本。登记为渐进规则。
- **把 .agents/skills/ 建成产品技能的第二份**：会与 `presets/assistant/skills/` 撞名
  （`03:17` 警告的正是这个），故必须同 diff 写消歧句，且开发技能不挂进 preset。
- **生成目录照抄 DSH 的 catalog 家族**（tool/config/persistence/event/capability 五张）：
  我们只有 8 入口 + 4 工具 + 1 服务，产出一张表即可；五张表是它的组合压力换来的。
