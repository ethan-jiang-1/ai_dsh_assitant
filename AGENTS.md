# AGENTS.md —— 本 repo 的常驻规则与入口链

> 给 coding agent 读的开工说明：怎么跑、东西在哪、改动走哪条路。
> 详细契约在 `docs/`（只写**现在**）；开发提案、活跃决策与验证依据在 `notes/`；身份名以 `docs/identity.md` 为唯一权威。

## 这是什么

一个 DSH **发行版** repo：一个领域专家式的助手（`dsh-smart-assistant`），有 dedicated 启动 profile（`assistant`），工作区绑定在 `assistant-product.workspaceDir`（profile Config）；专用 home 是部署选项。
它有两块地：**助手自己的 working folder**（跨会话工作目录 = `dataDir`；默认 `<dshHome>/assistant`，专用 home 模式是 `<productHome>/assistant`）与**用户的项目工作区**（会话 cwd、文件工具、`deliverables/` 交付包）。
核心命题是 `Agent = Model + Harness` —— 本 repo 做的就是"那一圈"。
给谁、怎样算干成（P1–P3 / O1–O6 方向判据与装法的唯一家）= [`README.md`](README.md)；产品/工作区/交付包合同 = [`docs/product.md`](docs/product.md)。
仓内开发启动 = `pnpm start`（dev home）；产品启动 = dedicated `assistant` profile（安装器 `bootstrap.mjs` 是可选包装）；两者不混。

## 新会话开工（先读这段）

**意图两通道**：① 用户本轮请求（唯一外部通道，范围由它定）；② 已立项内部工作项——`notes/proposed/` 取舍卡与 `_backlog/issues/` 问题卡（只有用户点名才开工）。缺陷当场修，不修记 `_backlog/bugs/`；研究只供证据，不授权。

**五道门**：`_backlog` 研究/推敲 → 定性（issue `待落地` / bug `修复就绪` / research `已定性`）→ 落地（收口卡台账 + 证据）→ 审查/验收（机械不跳、语义按风险自审、用户验收按重要性）→ 归档（卡与去向同变更）。`待落地` 是 ready，不是授权；`修复就绪` 按缺陷通道（P1/P2 即授权，P0/例外等拍板）。词表/守卫 = [`_backlog/AGENTS.md`](_backlog/AGENTS.md)，收件 = [`notes/AGENTS.md`](notes/AGENTS.md)。

**直接开工判断**（细则在各 owner）：

| 本轮工作 | 直接开工？ |
|---|---|
| 用户点名具体任务 | 能，范围 = 本轮请求 |
| 已授权切片轮内延续 | 能，按 proposed 卡范围 |
| 翻到修复就绪缺陷卡 | 能，翻转即授权 |
| 机械/局部编辑 | 能（note 豁免 = [`notes/README.md`](notes/README.md) §〇） |
| 跨切片新工作/流程面/模型可见面新能力 | 先立 proposed 卡呈批，等点头 |

呈批两个载体：本轮步骤 = plan 呈批（硬规则 5）；跨切片授权 = proposed 卡。等答复的部分停，能自定的照常推进（研发姿态 4）；小修不立空壳卡。

**没有用户任务时不发明任务**——报告家况（`pnpm usage`）或按点名卡推敲/实施。**非机械任务先落外部结果三要素**（触发条件/用户得到什么/完成条件），载体 = plan 或收口卡首节；深评原料住 `_backlog/research/`；代码 `TODO/FIXME` 不立项。

**Note 义务/取代检查/生命周期**以 [`notes/README.md`](notes/README.md) 为唯一权威；收件与写入时机 = [`notes/AGENTS.md`](notes/AGENTS.md)。交接链：AGENTS.md → `_backlog/AGENTS.md` → `notes/AGENTS.md` → 三个卡清单 → 各卡；收尾把停点/授权变化写回承载卡；无卡无 note 的机械收尾无写义务。

**技能三处**：`.agents/skills/` 开发用（本仓 agent）；`packages/.../presets/assistant/skills/` 模型用（随 preset）；working folder 的 skills 是学到的技能（合同 = [`docs/home.md`](docs/home.md)）。同名不同机制。`_backlog/methods/` 是推敲方法（英文 SKILL 式），不进技能发现根。同一多步流程第三次重演 → 立开发技能（不占工作面）。

## 布局（改动前先认领 owner 面）

**一个事实一个家**（tier）：`AGENTS.md` 只拥有**常设指令与路由**（无状态、无日期、无进度）；
`docs/` 拥有**当前合同**（门禁住了的事实，只写现在）；`notes/` 拥有**决定理由与证据**（含输掉的
方案与历史）；代码的 README/JSDoc 拥有**模块级契约**（与代码同 diff 维护）。写在别处即第二份清单，
必然漂移——链接过去，不复制。

| 路径 | 是什么 | 谁能改 |
|---|---|---|
| `packages/dsh-smart-assistant/` | **插件包**（bundle）：入口×平面、自有工具×动词、组合行、pin 与依赖姿态见生成物 `docs/package-catalog.md`；包内 owner 面与纪律见其 `AGENTS.md` | 改模型可见面 / 服务 / 布局动这里 |
| `docs/` | **当前合同**（只写现在，无历史）—— 文档 tier 与"谁拥有什么"见其 `AGENTS.md` | 门禁住了的事实进这里 |
| `notes/` | **开发记忆与证据链**（分类 owner：`notes/README.md`；收件/写入时机：`notes/AGENTS.md`）：`proposed/` 将来 → `implemented/` 当前权威 → `archived/` 冻结历史；`rejected/` 存负知识与一行原因 | 决策与输掉的方案进这里 |
| `_backlog/` | **推敲空间 + 已授权切片的 work 台账**（门牌 [`_backlog/AGENTS.md`](_backlog/AGENTS.md)：落进区域的 agent 先读）：还没定的事在 `issues/`（`YYMMDD-`），这次不修的缺陷在 `bugs/`（`BUG-`），调研在 `research/`，方法在 `methods/`，离开活跃区的在 `_archive/`。判断材料 + 收口卡台账，**不排序、不做第二队列**；五道门/状态机见其 `AGENTS.md`，关闭条件见其 `README.md`；`triggers.md` 只收工作里会撞上的观察（批量推进、真机走查、阶段收口时扫这张短表） | 收割/走查/对话中值得推敲但未到裁决的思考在此立卡 |
| `dev/` | 开发环境树：双 home、profile patch、探针/评测/夹具/部署 CLI——纪律与抽屉表见其 `AGENTS.md` | 环境与验证工具动这里（手册 owner：`docs/dev.md`） |
| `scripts/` | 机械门禁与生成器 —— 门禁三条纪律与 freshness 约定见其 `AGENTS.md` | 门禁问题动这里 |
| `snapshots/` | 行为回归的证据面——只收边界与现状见其 `AGENTS.md` 与 `README.md` | 回归证据问题动这里 |
| `_dist/` | **分发导出（生成物）**：`pnpm export-dist` 的 tgz（不入库）与《安装手册》 | 分发问题动这里；生成器 `scripts/release/export-dist.mjs` |
| `.agents/` | **开发用 Skill 根**（证据路由、探针、审计、UI 贡献约束等——DSH 原生 `project-agents` 根发现） | 新开发技能动这里 |
| `deliverables/` · `.desk/` · `.tmp/` · `.pi/` | **会话运行现场（git 忽略或机器本地，不是仓库内容）**：cwd=仓根的会话留下的业务交付（未提交交接件——与工作区 `deliverables/` 同名不同物，见 [`docs/product.md`](docs/product.md) §五）、My Desk 桌面状态、临时产物、DSH 会话任务持久化（`.pi/tasks/`） | 不提交、不当文档读；语义见 `.gitignore` 注释 |
| `vendor/dsh/` · `vendor/thirdparty/` | **钉住的外部源码**：DSH 源码（submodule）与钉存的第三方上游包（只读证据物，如 OpenViking，见 `vendor/thirdparty/openviking/README.md`） | **永不改**；升级 DSH 走 `pnpm sync-dsh` |
| `tsconfig.base.json` / `tsconfig.tsx.json` / `tsconfig.json` / `pnpm-workspace.yaml` | 根配置：两个 tsconfig **解析入口**（编译期手维护 / 运行期 `pnpm gen-paths` 生成）+ IDE 整仓聚合（`tsconfig.json`，typecheck 不经它）+ pnpm 工作区面 | 引入新 `@deepseek-ai/*` import 或换 pin 时动解析入口（契约：`docs/dev.md` §二） |

`CLAUDE.md` 是 `AGENTS.md` 的 symlink（Claude 系工具的惯例名），同源无第二份。

**语言分工**：人与本仓文档（docs/notes/AGENTS.md）用中文；进模型上下文的（persona、SKILL.md、工具 description、backlog 方法文件）用英文；代码与脚本注释随所在文件现状，不整批改写。

## 命令表

启动（dev home；完整五步/隔离 home = [`docs/dev.md`](docs/dev.md) §一）。默认：

```sh
pnpm start   # 隔离 dev home 起 Web，preflight 绿才交 URL；收掉见横幅
```

手工五步（⓪-④）+ headless 冒烟 ⑤：

```sh
git submodule update --init   # ⓪ 首次：拉起 vendor/dsh
pnpm install                  # ① 依赖
bash dev/env/prepare.sh       # ② 首次必须先跑：补 vendor/dsh 产物
bash dev/env/setup.sh         # ③ 起服务前置：建 dev / dev-task profile
pnpm dsh --profile dev --port 0 --no-open   # ④ Web
pnpm dsh --profile dev-task "one task"      # ⑤ 只冒烟 headless
```

日常四条（按需单跑）：

```sh
pnpm build      # preset 行加载 lib/，不是源码
pnpm typecheck  # 跑完重跑 pnpm build
pnpm test       # vitest 全量（分层 spec）
pnpm verify     # 机械门禁链
```

收尾一键（地板；顺序由脚本钉住）：

```sh
pnpm check      # typecheck → test → verify
```

`pnpm dsh --profile dev-task "one task"` 只冒烟 headless；完整命令（探针/评测/发布/维护）= [`docs/commands.md`](docs/commands.md)，入口判据 = [`docs/dev.md`](docs/dev.md) §六，踩坑 §五。命令清单只有一个家，根不复述。

## 九条硬规则

1. **双 home**：`pnpm dsh` 经 `dev/env/dsh.mjs` **永远强制** `DSH_HOME=<repo>/dev/harness-home`（覆盖继承值；显式出口 `ASSISTANT_DSH_HOME`）。绕过启动器的脚本自己设置并认同一个变量；**任何情况下不碰日用 `~/.dsh`**。shipped 安装器用自己的专用 home；native 用当前 `DSH_HOME`；`--home ~/.dsh` 是用户显式共享。隔离模型 = [`docs/dev.md`](docs/dev.md) §一。
2. **探索路由**：平台事实读钉住 `vendor/dsh`（文档 tier、主仓 note/技能、包 README、真实签名）；本仓只写差量——适配进 [`docs/discipline.md`](docs/discipline.md)，本仓步骤进 `.agents/skills/`，取舍进 [`notes/`](notes/README.md)。完整路由 = [`docs/dev.md`](docs/dev.md) §十一。
3. **窄证据**：一次交付 = 一个垂直切片（代码 + 测试 + 合同同 diff）；note 只在 [`notes/README.md`](notes/README.md) §〇 要求时进同一 diff；只跑会为这次回归失败的最小检查（细则 = [`.agents/skills/pre-push-evidence/SKILL.md`](.agents/skills/pre-push-evidence/SKILL.md)）；**报告只列真跑过的命令**；**提交只 add 本次改动路径**（并行会话，禁止 `git add -A`）。
4. **默认严格，偏离登记**：纪律逐源枚举（[`docs/discipline.md`](docs/discipline.md)）；偏离/裁剪先登记「约束 → 适配 → 证据」再动手；note 义务只看 [`notes/README.md`](notes/README.md) §〇。
5. **轮内任务面**：复杂任务 plan 呈批、实施期 todo 活清单（整表替换/完成即勾）、人可随时 steer；机制在 base bundle，挂着不用等于白挂。
6. **步步为营，死路回退**：每阶段达成目的立刻提交，一探索一锚点；过不去用 git 回退并把死路记 note，不留半成品。环境修复固化成可重跑脚本（范式 `pnpm repair-vendor`；修复只在手上 = 没修复）。
7. **生态插件只借思路，不装包**：第三方有维护/安全/组合代价；除非已验证声誉（多人维护、活跃提交、口碑），否则读源码抄设计；装前过[准入表](notes/implemented/2026-09-29-openviking-adoption-rfc.md)。
8. **临时文件只落仓内 `.tmp/`**：脚本默认点、夹具、探针/评测产物、运行时 spill、模型可见指令路径，一律仓根 `.tmp/<用途>/`（一个用途一个子目录，清扫即回收）。仓外写会被沙箱挡成人工 approval。脚本用 `dev/env/tmp.mjs` 的 `tmpDir`/`mkTmpDir`（归属 = [`docs/dev.md`](docs/dev.md) §一 spill 行）；verify 有门禁。模型可见 SKILL 口径是“会话工作目录下 `.tmp/`”，不是本仓绝对路径。
9. **入库边界**：只入换台机器逐字节相同且有人守得住的内容；构建产物/运行态/本机环境/秘密不入（ignore + 一条重建命令）；生成物只带 freshness 门禁（或录制+人审 diff）才入；录制证据声明“不参与任何判定”。分类表与门禁 = [`docs/dev.md`](docs/dev.md) §八。

## 研发姿态（用户拍板，常设）

1. **流程随 DSH**：研发流程、门禁、证据阶梯与文档形态尽量沿用 DSH 的既有做法，不另造一套
   （继承与偏离的登记在 `docs/discipline.md`）。
2. **自主解决优先**：遇问题先探索，先找成熟生态的既有解法——**尤其下载量/影响力足够的插件**：
   读它的源码与设计、抄思路（不装包，见硬规则 7）。技术/设计选择由 agent 判定并**记下理由**；
   理由的家是 note 的「输掉的方案」与判定记录，**不是真人的待办清单**。
3. **长期利益优先于短期便利**：选择以**可驾驭性、可回退、知识沉淀、门禁化纪律**为准，
   不以"这次先跑通"为准——宁慢一步留锚点，不走省掉证据与记录的捷径；同时不过度为想象的未来预建
   （"长期"是保住演进能力，不是提前做——延后项与触发条件的既有机制就是这条的平衡面）。
4. **阶段才 REVIEW**：自己能做的审查自己做（代码审查、回归证据、设计自审、真机取证、对抗性自评）；
   只在**阶段收尾且确有真人不可替代的输入**时才请人 review。真人输入＝真实业务内容、合规/法务文本、
   产品口味反转；除此之外一律不停。**"等用户拍板"不是默认状态**：先把能自己定的定下来，
   真的只剩真人输入时才挂起等拍板。

## 探索路由

完整路由 = [`docs/dev.md`](docs/dev.md) §十一（本仓侧合同/证据/链路 + vendor 平台事实 + 组合/inspect 工具）。三条硬约束：平台事实读 vendor，本仓只写差量（硬规则 2）；组合行是否存在用 `pnpm dsh --profile dev --dump-config`；活进程注册用 shipped inspect 工具（本仓 `assistant` preset 刻意不挂）。
