---
status: 推敲中
opened: 2026-11-01
---

# 推敲：插件即产品——产品 profile、工作区作业面与 run bundle 的归属

> 立卡：2026-11-01 ｜ 状态：推敲中 ｜ 类型：Feature ｜ 可关闭：否 ｜ 毕业：做现在

**问题与期望结果：** 这个包现在是“装进用户既有 profile 的插件”：装完还要去 Settings 选预设，会话落在 DSH 的某个 Workspace（开发机上是仓根，用户机器上常见是 Documents 下的默认工作区），插件的 working folder 另在 `$DSH_HOME/assistant`。用户要的是**产品**：一条命令启动一个自己的 profile，启动时指定（或询问）一个项目工作区，此后这个助手的能力都作用在那个工作区里；插件内容留在插件侧，**一次作业产生的状态与产物（历史口径的 run bundle）落在用户工作区**。完成 = 用户在临时工作区真跑通“启动 → 会话在项目里 → 产物在项目里”，且根 README、`_dist/安装手册.md`、docs 合同同步。

**用户口径（2026-11-01）：** 插件有自己的启动 profile；启动时知道、或在启动过程中询问 workspace 在哪里；插件的内容留在插件内部；产生的状态与最后的输出物（历史口径的 run bundle）在用户的 workspace 里；这样插件的能力才能施加到用户指定的 workspace 上。

**授权（2026-11-01）：** 本人按推荐拍板——1A（大脑跟人走）、2 v0 可见 `deliverables/<date>-<slug>/`、3 产品自有 home + 首次 CLI 询问、4 现状命名（profile `assistant`、沿用 `bootstrap.mjs`、产物目录 `deliverables`）。授权按本卡 `## 落地顺序` 自主推进；work 台账 = 本卡，决定卡 = [proposed note](../../notes/proposed/2026-11-01-plugin-as-product.md)。

**当前情况：** 平台与仓内事实、冲突面、已对齐面见研究材料 [平台与仓内事实](../research/261101-plugin-as-product/261101-platform-and-repo-facts.md)。一句话：DSH 不给 `--workspace` 旗标，但 Workspace 登记与 `workspaceId` 开会话都是公开服务；会话 `header.cwd` 创建后不可变，所以“能力落在工作区”必须从会话创建时保证；“独立的启动 profile”只能由产品启动器经官方 CLI 建，DSH 没有第三方 profile 模板机制。**本卡推荐路线 = A（大脑跟人走）+ v0 run bundle + 产品自有 home + 沿用 bootstrap；第 1 项是真正的分叉。**

**复核（2026-11-01）：** [可行性复核](../research/261101-plugin-as-product/261101-feasibility-review.md) 发现十处不够落地的点，已回填本卡与切片材料。最重要的一条：默认 home 从“用户日用 home”改为**产品自有 home**（否则产品会话/工作区/预设会与用户其他 DSH 用途混在一起，跨 profile 打开产品会话还可能缺 preset）。方向不变，落地点更实。

**技术探针（2026-11-01）：** [技术探针](../research/261101-plugin-as-product/261101-technical-probes.md) 已跑出四条读数：① headless 里 4 条既有 web-only 行 pending（`warning: 4 entries did not activate`），产品 web 行要按 `schedule` 先例禁用或接受多一条；② boot 时 `workspaceRegistry.create()` + `sessionController.create({ workspaceId })` 产生的会话 `header.cwd` = 工作区，且 `storages/workspace.json` 持久化；③ 缺 preset 的失败码是 `agent-preset/not-found`；④ 产品行原型已跑通：web-only 行读设置、登记工作区、GET/POST 路由（带 token cookie）都成立。机制不是“应该能行”。落到文件/API/测试级见 [落地蓝图](../research/261101-plugin-as-product/261101-landing-blueprint.md)。

**未决问题：** 没有产品选择了（2026-11-01 已按推荐拍板）。剩余实现级未知（产品行的错误态/原子写、启动器 profile 建/装/回滚、无会话首屏）留到 S1/S2/S3 的 host spec、product-smoke 与真机；registry/session 核、headless pending、缺 preset 失败码、产品行 GET/POST 集成形状已由技术探针确认。

**下一步：** 已授权，按 `## 落地顺序` 从 S1 推进；每片一个 commit，证据记入切片台账；缺 key/浏览器的检查标 BLOCKED。

## 外部结果三要素

- **触发**：用户拿到 tarball，解包后运行产品的启动命令并指定一个项目目录（或从上次保存的工作区恢复）。
- **用户得到**：一条命令起产品（自己的 profile，不靠手工选预设）；会话一开始就落在那个目录；产出与 run bundle 出现在该目录的 `deliverables/`；助手的大脑仍在自己的产品 home 里（与日用 DSH 分开）；根 README 与安装手册把“哪些跟着项目走、哪些跟着人走”说清楚。
- **完成条件**：`pnpm product-smoke` 绿（profile 建/装、工作区登记、真 boot、stop）；`pnpm release-smoke`/`pnpm standalone-smoke` 绿；`pnpm prompt-smoke` 绿；`pnpm verify` 绿；一次真机会话在工作区产出 `deliverables/<date>-<slug>/` 并 `present` 成功；文档审计无过期表述。被阻断的检查（无 key 的 eval、无 Chrome 的 UI）如实标 BLOCKED。

## 初衷对齐（P1–P3 / O1–O6）

新形态是**作业面与产物归属**的改变，不是产品定位的改变。它必须让原来的判据更容易成立，而不是把注意力吸到装配上。

| 判据 | 本形态怎么服务 | 复核后的落点 |
|---|---|---|
| **P1 管理岗基座** | 内容不变；首屏仍是一页纸 | 验收加一条产品级人判/eval：首跑任务产出管理岗质量的一页/交付包 |
| **P2 跟人学** | 大脑跟人走，跨工作区不碎；run README 的“依据”可引 `memory:` / `knowledge:` / 旧 run | 学习链写进 run bundle 契约；知识页只蒸馏，不复制交付正文 |
| **P3 管得住** | 房间与 run 文件夹都是人可读；curate 仍管家 | run 文件夹是用户内容、无生命周期；不做第二套治理 |
| **O1 说得清出处** | 交付包 README 固定四段；知识页 sources 仍在 | 四段格式写进合同；来源定位可指记忆/知识页/旧 run |
| **O2 办得成** | 产物在用户项目，可拿走；`present` 声明 | v1 不做 desk→deliverable 直开，进延后项与触发 |
| **O3 知道不知道** | 不变 | 不在本卡范围；继续由 persona/手册管 |
| **O4 越用越像本人** | 全局大脑 + run 历史 + 项目笔记 | run README 记“本人这次怎么判的”；O4 仍由领域评测人判 |
| **O5 装得上** | 启动器把三步收成一条命令 | 仍要 Node/pnpm/dsh/tarball；这是 O5 的一步，不是完成；安装器另立 |
| **O6 管得住** | 产品 home 独立、产物在用户项目、无 IM、本地 | 默认产品 home；`--home` 才共享；文档写清两物归属 |

**判据**：机制面可以复杂，但每一条都要能回答“这让 CEO 的哪一步更顺”。答不上来的，不做。

## 已知与未决

### 已经钉死的事实

- 产品不能加 DSH 旗标；启动器要把工作区写进产品设置或补丁，Host 行再登记。（[平台事实](../research/261101-plugin-as-product/261101-platform-and-repo-facts.md) §1）
- `ctx.workspaceRegistry.create(path)` 是公开 Host 服务，要求绝对、已存在的目录，按 canonical path 幂等；登记只服务导航/分组，不是权限。（同上 §2）
- 会话 `header.cwd` 创建后不可变，是工具目录与 sandbox 可写根；`working_directory` 不改根。（同上 §2）
- 提示词段落的 provider 拿不到 session/workspace；per-workspace 大脑没有现成接缝。（同上 §3）
- `present` 只记绝对路径、不复制；会话导出不含被 present 的文件内容。（同上 §4）
- 本仓现在明确写着：W workspace 不拥有、working folder 是 home 单例、不新增起 DSH 的应用入口。（同上 §6）
- **探针已证（2026-11-01）**：boot 时 `workspaceRegistry.create()` + `sessionController.create({ workspaceId })` 产出的会话 `header.cwd` = 工作区（与进程 cwd 无关）；`create` 幂等；`storages/workspace.json` 持久化并 attach 会话。
- **探针已证**：headless（base+headless）里 4 条既有 web-only 行 pending 等 `connection`（`warning: 4 entries did not activate`）；产品 web 行要按 `schedule` 先例在 headless patch 禁用，或接受第 5 条 warning。
- **探针已证**：缺 preset 的失败码 = `agent-preset/not-found`（`Unknown agent preset: <id>`），不是静默换 preset。
- **探针已证**：产品行的集成形状成立——web-only 行注入 `connection`/`workspaceRegistry`，读 `assistant-product/settings.json`、登记工作区、`GET/POST /api/assistant/product`（owner token cookie）；POST 可登记第二个工作区并写设置。真实切片只需换成纯核 + 原子写 + 错误态。

### 仍未定

| # | 未知 | 为什么现在不能定 | 谁/何时定 |
|---|---|---|---|
| 1 | 大脑跟人还是跟项目 | 产品定位与交接隐私的取舍，不是技术事实 | 本人（拍板点 1） |
| 2 | 产物目录名与可见性 | 目标用户的口味；隐藏还是可见影响产品感 | 本人（拍板点 2） |
| 3 | 默认 home 与启动器形态 | 共享日用凭据/会话 vs 产品隔离；首次询问 CLI 还是 GUI；是否新增 bin | 本人（拍板点 3） |
| 4 | 命名（profile/启动器/产物目录） | 发布前改便宜、发布后要迁移 | 本人（拍板点 4） |
| 5 | 无会话首屏是否停在产品首页（不自动建会话） | 需要真渲染；自动建会话曾产生“幽灵会话” | 切片 3 真机 |
| 6 | 产品行的错误态/原子写/并发（形状已由探针证） | 探针用的是内联逻辑与非原子写；坏文件、缺失、并发 POST 仍需纯核 + host spec | 切片 1 host spec |
| 7 | 启动器 profile 建/装/版本对账/失败回滚 | 探针没碰启动器 | 切片 2 product-smoke |

### 拍板点

| # | 决定 | 推荐 | 另一条路 | 代价 |
|---|---|---|---|---|
| 1 | **助手大脑跟谁走** | **A 跟人走**：四房间/账本留 `<home>/assistant*`，工作区只收产物与 run bundle | B 跟项目走：每个工作区一套大脑；C 混合（身份/技能跟人，业务记忆跟项目） | B：服务/段落/面板/账本/备份/curate/测试全改，且段落拿不到 session 的平台硬伤；C：schema/过滤/面板中等改动，两处真相长期存在 |
| 2 | **run bundle 长什么样** | **v0 可见的 `<workspace>/deliverables/<YYYY-MM-DD>-<slug>/`**：README（记录）+ 交付物 + `present`；不复制会话日志；不强制模型写 session id | 放 `deliverables/<product>/`（与用户既有文件隔离，但多一层）；隐藏 `.assistant/`；`deliverables/` 与 `runs/` 分家；现在就加机器 manifest | 产品子目录=多一跳；隐藏=用户找不到；分家=两处真相；机器 manifest=先建没有消费者的子系统 |
| 3 | **默认 home 与启动器** | **产品自有 home**（`~/.dsh-<product>`，具体名在拍板 4；启动器显式设 `DSH_HOME`，不继承日用）；`--home ~/.dsh` 才共享；**演进 `bootstrap.mjs`**，不新增 app bin；首次用 CLI 提示/参数询问工作区 | 共享日用 home（凭据/会话直接复用）；新增 `bin/assistant.mjs`；首次用客户端目录选择器 | 共享 home=产品会话/工作区/预设与用户其他 DSH 用途混在一起，跨 profile 打开产品会话可能缺 preset；GUI 选择器=要处理 native/browse 两条路与取消 |
| 4 | **命名** | profile 名 `assistant`；启动器沿用 `bootstrap.mjs`（文件头改称 product launcher）；产物目录 `deliverables` | `smart-assistant` / 章鱼管家 / 新命令名 | 改名要动 identity、安装手册、smoke；发布前改便宜，发布后要迁移 |

> **2026-11-01 已按推荐拍板：1A / 2 v0 / 3 产品自有 home + 首次 CLI 询问 / 4 现状命名（profile `assistant`、沿用 `bootstrap.mjs`、产物目录 `deliverables`）。** 下面保留取舍记录，供未来反转时读；不再是待决问题。

## 方案与取舍

### A：大脑跟人走，工作区只收产物（推荐）

- 布局、数据卡、备份矩阵、run bundle 形态见 [归属与 run bundle 选项](../research/261101-plugin-as-product/261101-ownership-and-run-bundle-options.md)。
- 保留既有决定：home 单例、账本单 writer、`assistant-data` 两目录；改动集中在启动器 + Host 产品行 + 客户端门 + 手册/交付约定。
- 真实代价：项目备份带不走助手记忆；文档必须显式说清两物的分家。

### B：大脑跟项目走

- 把一个 home 拆成“每工作区一套”；好处是项目可连同助手一起交接、业务间天然隔离。
- 平台硬伤：段落拿不到 session/workspace（见 [平台事实](../research/261101-plugin-as-product/261101-platform-and-repo-facts.md) §3）；要么接受“一个产品实例只服务一个工作区”，要么先做平台接缝。
- 与本仓 [docs/delivery.md](../../docs/delivery.md) §一「home 单例」直接相反，需要另立决定；不建议在本卡夹带。

### C：混合

- 身份/技能跟人，业务记忆/知识/账本跟项目；用 scope 前缀过滤。
- 在“一个实例一个工作区”的前提下可行；但需要 schema、摘要/检索过滤、面板展示与两处真相的长期维护。
- 建议先不做；触发 = 真实用户在同一 home 下跑多个业务并抱怨知识串味。

### 启动器与首屏

- 一条命令：解析/校验工作区 → 建/复用 `assistant` profile → 装当前包 → 默认 preset `assistant` → 写产品设置 → `cwd=workspace` 启动。
- **home**：默认产品自有 home（`~/.dsh-<product>`，具体名在拍板 4）；启动器显式设 `DSH_HOME`，不继承日用 `~/.dsh`。`--home ~/.dsh` 是用户显式共享，启动器打警告并继续。这样仓库硬规则 1 不用反转，产品数据也不会与日用 DSH 混。
- **profile 所有权**：启动器只碰自己的依赖 + `agent-preset-registry.default` 行；用户在 `assistant` profile 里装的别的插件、改的配置保留；外来同名 profile 拒绝并让用户换名。
- **工作区**：`--workspace` 必填（首次）/上次保存（之后）；TTY 下询问，非 TTY 报用法；不在旧路径上空建目录；校验绝对、存在、是目录、可读写，且不是用户 home 根/产品 home/包目录/`/`（解析符号链接后）。
- **Host 行**：**一行 web-only 产品行**（必注 `connection`/`workspaceRegistry`，负责 boot 登记与 HTTP 路由）；headless profile patch 里 `disabled: true`（同 `schedule` 先例，探针已见现有 4 条 web-only 行 pending）。不拆 core——除非将来 headless 产品也要读设置；optional inject 只作备选。路由只读/受控写，owner-only。
- **首屏**：客户端首页显示当前工作区，缺失时给恢复面；不自动建会话（自动建会话曾产生“幽灵会话”）。首次“问工作区”v1 用 CLI 参数/TTY 提示；GUI 目录选择器是拍板 3 的另一条路。
- **跨 profile**：会话是 home 共享的；同一产品 home 里的其他 profile 打开产品会话时，`assistant` preset 不在组合里，失败码 = `agent-preset/not-found`（探针已确认），不静默换 preset。文档声明“产品会话从产品入口打开”；客户端/DSH 侧错误文案要可读化。
- 手工 `dsh plugin add` 路径保留：没有产品设置时，Host 行 idle，行为与今天一致。

### run bundle

一次作业 = 一个文件夹；四件物分权，避免“两份正文”：

| 物 | 位置 | Authority | 关系 |
|---|---|---|---|
| 交付包（用户文档） | `<workspace>/deliverables/<date>-<slug>/` | 用户可拿走的完整正文 | run README 指向它；`present` 声明 |
| run README（记录） | 同目录 `README.md` | 这次作业的问/据/出/未决/状态 | 固定四段：问题与假设 / 依据（含来源定位）/ 产出 / 未决与状态；**不强制写 session id**（模型不保证知道；run 身份 = 文件夹名 + 日期；机器 manifest 以后补） |
| 知识页（蒸馏） | `<home>/assistant/knowledge/` | 助手可复用的理解/教训；draft→stable 人审 | 不复制交付正文；来源可指 `memory:`/`research:`/URL/旧 run；不强制指工作区路径 |
| 账本事项（状态） | `<home>/assistant-operating/ledger.json` | 业务进展/待办/复查 | 与交付包按 id/标题关联；不为它加 schema |

- `deliverables/` 与用户既有目录混放：拍板 2 的另一条路是 `deliverables/<product>/`；默认直接放 `deliverables/`，README 说明归属。
- 机器 manifest / 面板枚举 / desk→deliverable 直开延后；触发 = 出现真实消费者（首页“这周做了什么”、eval 核对产物、用户找不到产物）。
- 用户可见文案叫“交付包/一次作业”，不叫 run bundle（内部术语）。

### 工作区合同（不止 `deliverables/`）

工作区不是只有产物文件夹；DSH 原生还有两个项目面，产品要用起来、但不能偷偷写：

| 面 | Owner | 助手怎么碰 | 与产品机制的关系 |
|---|---|---|---|
| `<workspace>/AGENTS.md` | 用户 | 读；建议追加；**不静默覆盖** | DSH 原生指令装载器从项目根读；项目级事实的合法落点（手册的 repo-boundaries 节已经这么写） |
| `<workspace>/.dsh/skills/`、`.agents/skills/` | 用户 | 读；建议；**不静默写** | 项目技能 rank（`.dsh/skills` 100 / `.agents/skills` 200）> 学到的 300；同名会遮蔽学到的技能，curate 的 `skill-shadowed` 要能解释 |

判据：产品不把项目知识搬回家里，也不把家里的知识偷偷写进项目；两边各有 owner。`deliverables/` 是产品唯一默认写入的项目面。

### 明确不做

- 不把 DSH 运行时/Node 打进包，不做 Electron/独立应用。
- 不做 per-workspace 大脑（除非拍板 1 选 B，另立决定）。
- 不复制会话日志进工作区，不做多租户，不替用户删工作区文件。
- 不在旧路径上自动造空目录；不手写/篡改 profile manifest。
- 不新增自有 slot 域名；客户端门走通用 `main` 座位。
- 不预建 session 回放快照、机器 run manifest 或 per-workspace 面板。

## 验收标准

矩阵按 [验收设计](../methods/validation-design.md) 的字段写；每行对应一个承重行为，证据 owner 是本仓现有/计划中的门。**“计划中的门”必须在落地切片里变成真命令，不能用这段文字冒充证据。**

| # | 行为 | 类别 | 输入/状态 | 通过信号 | 反例/恢复 | 证据 owner | 人判断 |
|---|---|---|---|---|---|---|---|
| 1 | 一条命令建/起产品 profile | 编排 | 空产品 home + 临时 workspace；已安装兼容 dsh | 产品 home 建立；profile 存在；`--dump-config` 有 `preset-assistant` 与产品行；返回 URL | 外来同名 profile 拒绝；缺 pnpm/npm 在创建 home 前拒绝；日用 `~/.dsh` 不被碰（除非显式 `--home`）；版本变化重装失败保留旧装 | 新增的 `product-smoke.mjs`；`bootstrap-guards-smoke`；`release-smoke` | 首屏是否像产品 |
| 2 | 工作区参数校验与持久化 | 确定性 | `--workspace` 绝对路径；产品设置文件；重启 | settings.json 记录 canonical path；第二次启动不传参数也能恢复 | `/`、home 根、产品 home、包目录、非目录、缺失目录、不可读写、符号链接逃逸都拒绝；不在旧路径空建 | 新增的 `product-settings.spec.ts`（domain）+ `product-smoke.mjs` | 报错是否人话 |
| 3 | boot 登记与会话 cwd（证据拆开） | 编排 | 设置 + web profile；首开；headless；探针已证 registry/session 核 | ① `storages/workspace.json` 有 canonical path，不出现 Documents 默认工作区（`product-smoke` 可证）；② 用 `workspaceId` 创建的会话 `header.cwd` 等于它（in-process 探针或 Web 探针） | 无设置时行 idle；路径缺失不 crash；headless 里产品行 disabled（现有 4 条 web-only 行 pending 是既有形态，产品行禁用后零新增） | 新增 host spec；`product-smoke.mjs`（登记 + in-process 会话 cwd 探针）；客户端真机 | 侧栏是否出现正确工作区 |
| 4 | 工作区缺失恢复 | 确定性 + 编排 | 设置指向已删/不可读目录 | 产品路由返回 `workspace-missing`；首页显示恢复面；不崩 | 不在旧路径空建；重启后可重选；错误有可读文案 | 新增的 host route spec + client spec | 恢复文案是否可信 |
| 5 | 无设置时旧行为 + 跨 profile | 编排 | 手工 `dsh plugin add`；无设置文件；另一 profile 打开产品会话 | 与今天一致：不登记工作区、不显示产品门、preset/工具/段落不变；缺 preset 以 `agent-preset/not-found` 失败并有可读提示 | 产品行 idle/disabled；现有 spec 不回归；不缺 preset 时静默换 | `pnpm test:composition`、现有 host/client spec、探针已证的错误码 | — |
| 6 | run bundle 四件物与 authority | 模型行为 | 产品会话 + 临时 workspace + 一个真实任务 | 交付包 `deliverables/<date>-<slug>/` + README 四段（问题与假设/依据/产出/未决与状态）+ 至少一个文件 + `present`；知识页只蒸馏、不复制正文；账本事项可关联；项目 `AGENTS.md` 不被静默覆盖 | 产物不写回家里的 `deliverables/`；不复制会话日志；不强迫模型写 session id；项目技能遮蔽有解释；缺 README 能被 eval/走查发现 | `prompt-smoke`（指令在场）+ `eval`（行为地板）+ 真机一次 | README 是否像给人看的 |
| 7 | present 与导出边界 | 编排 | 工作区产物 + present + 会话导出 | present 记录工作区绝对路径；导出 ZIP 不含产物内容（平台事实） | 产物删除后 present 指向不存在；文档明确说明不复制 | 现有平台合同 + 真机探针 | — |
| 8 | profile 升级保数据与用户改动 | 编排 | 旧版装好 + 用户自装插件/改配置 → 新版启动器 → 重装 | 产品 home 数据、工作区 `deliverables/`、会话都保留；组合恢复；用户插件/配置保留 | 重装失败保留旧装并报错；home 搬移重建 profile 不碰数据；只碰自己的依赖与默认行 | 新增的 `product-smoke.mjs` 升级分支 + `upgrade-smoke` | — |
| 9 | 文档/分发一致 | 确定性 | 改动后的 README、产品合同页、`_dist/安装手册.md`、docs | `pnpm verify`（断链/身份/catalog/手册锚点）绿；`pnpm export-dist` 重生成后口径一致；产品 home/交付包/知识页/账本四者说法一致 | 手册仍是旧装法、identity 仍写禁令、home.md 仍说产物在家、把知识页说成交付物 → 红 | `pnpm verify`；`pnpm export-dist`；语义漂移审计 | 读起来是否像一个产品 |
| 10 | 首屏与命名 | 人判断 | 真机、目标用户口吻 | 第一屏能看懂“在哪个项目、下一步做什么”；目录名列名不别扭 | 看不懂/像开发者工具 → 回改文案与布局 | 真机走查记录 | 本人 |
| 11 | 首跑产出像样（产品级） | 模型行为 + 人判断 | 首跑典型经营题（如“下季度销售掉 20%”） | 交付包/一页纸按“现象 → 原因假设 → 取舍 → 行动”分层；有依据定位；落在 `deliverables/`；本人判“像样” | 泛泛建议、无出处、无文件、首答超长 → 红；不能只看机制绿 | `eval`（行为地板）+ `eval:domain`（人判）+ 真机 | 本人 |

**不在本矩阵里冒充的**：领域回答质量（`eval:domain` 人判）、Windows/Desktop 真机、模型长期学习效果——它们各有自己的车道上限。

## 落地顺序（授权后就是收口台账）

一句话：**先拍方向，再搭产品行，再给启动器，再给首页与交付，再收文档，最后收 note。** 每一步的输入是上一步的产物，门是下一步的前提；不跳步、不并大提交。

```text
D0 拍板
  └─> S1 产品行（设置 + 登记 + 路由 + headless disable）
        └─> S2 启动器（产品 home + workspace + profile + boot/stop）
              └─> S3 首页 + 交付（客户端门 + 手册/技能 + 四件物 + 项目面）
                    └─> S4 文档/分发（README/docs/_dist/identity/release）
                          └─> S5 收口（implemented note + triggers + archive）
```

### 顺序、依赖与门

| 步 | 名称 | 依赖 | 产出 | 门（做完的判据） | 停点 |
|---|---|---|---|---|---|
| **D0** | 拍板 | — | 四项选择；work 去向（proposed/收口）记录 | 本人答复；本卡状态行更新 | 停：等本人 |
| **S1** | 产品行 | D0 | 设置纯核 + 一行 web-only 产品行 + route + 组合行 + headless disable + host spec | `test:domain`/`test:host`/`test:composition`；`--dump-config`；product-row 探针复跑 | 一个 commit |
| **S2** | 启动器 | S1（设置 schema + 行 id 冻结） | 产品 home + workspace + profile 所有权/版本 + settings + boot/stop | `product-smoke`（profile/登记/会话 cwd）、`standalone-smoke`、`release-smoke`、`verify` | 一个 commit |
| **S3** | 首页 + 交付 | S2（能 boot 且有工作区） | 客户端门/恢复面 + 手册/技能 + 四件物 + 项目面 | `test:client`、`web-expected`、`prompt-smoke`、`eval`（有 key）、真机一次 | 一个 commit；无 key/浏览器 = BLOCKED |
| **S4** | 文档 + 分发 | S1–S3（行为稳定） | README/docs/_dist/identity/release/discipline | `verify`、`export-dist`、语义漂移审计 | 一个 commit |
| **S5** | 收口 | S1–S4 | implemented note；triggers；卡归档 | `verify` notes；关闭条件 | 归档 |

### 研究结论 → 落地位置

| 研究结论 / 未决 | 落在哪一步 | 证据 |
|---|---|---|
| headless 里 4 条 web-only 行 pending；产品行需禁用 | S1 | 技术探针 §1；dev-task `--dump-config` + 启动日志 |
| 产品行的设置/登记/GET/POST 集成形状 | S1 | 技术探针 §4（已跑通）；host spec |
| boot 登记 + `workspaceId` 会话 cwd | S1/S2 | 技术探针 §2；product-smoke |
| 缺 preset = `agent-preset/not-found` | S3（文档/客户端提示） | 技术探针 §3；client spec |
| 产品自有 home（不共享日用） | S2 | product-smoke；README/手册 |
| 手册预算 11,936 / 14,336；项目技能 rank 100/200 | S3 | `root-files.spec.ts`；`skill-filesystem` README |
| 四件物（交付包/README/知识页/账本） | S3 | 手册/技能；真机一次 |
| `deliverables/` 混放 vs 产品子目录 | D0 决定 / S3 落地 | 产品页；README |
| per-workspace 大脑 / 机器 manifest / O5 安装器 / Windows/Desktop | 仍未取 | 本卡「仍未取」与触发 |

### 并行与停点

- **可并行**：S1 的纯核/host spec 与 S2 的启动器骨架（设置 schema 一冻结就能各自开工）；S3 的手册/技能文本可在 S2 跑通前起草，但**合入必须等 S2 的 boot/工作区门**。
- **不可并行**：S2 依赖 S1 的行 id/设置 schema；S3 依赖 S2 的真实 boot；S4 依赖 S1–S3 的行为；S5 依赖全部证据。
- **停点**：D0 等本人；S1/S2/S3/S4 各自 commit；S3 的 `eval`/真机无 key/浏览器 = BLOCKED，不并入绿；S5 归档。

### 摸透 / 准备透判据

- **摸透**：每条承重机制都有源码 + 探针读数——registry 登记/会话 cwd、headless pending、缺 preset、产品行 route/settings、手册预算、项目技能根、profile CLI、`present`/导出、知识页 source、账本 matter 字段。
- **准备透**：D0 有答复；S1–S5 有产出/门/停点；每片有回退；`docs`/`_dist`/tests 的 owner 明确。剩余未知是实现级（客户端渲染、启动器自身代码、模型行为），都已有命名切片与门，不是架构未知。
- **不可机械化**：首屏是否像产品、首跑产出是否像样、模型是否真按手册写产物——S3 的 web 证据/真机/`eval:domain` 人判；缺 key/浏览器标 BLOCKED。

### 切片台账（状态）

| 步 | 内容 | 状态 | 证据 |
|---|---|---|---|
| D0 | 四项拍板收口；work 去向记录 | 待拍板 | 本卡状态行 |
| S1 | 产品行（设置纯核 + web-only 行 + route + 组合行 + headless disable） | **已完成** | `test:domain`/`test:host`/`test:composition`/`verify`；web `--dump-config` 有行、headless `disabled: true`；产品行探针 |
| S2 | 启动器（产品 home/profile 所有权/工作区/版本对账/守卫） | **已完成**（文档/手册在 S4） | `product-smoke`（profile/settings/登记/会话 cwd/stop）、`standalone-smoke`、`bootstrap-guards-smoke`、`release-smoke`（live turn 无 key = BLOCKED）、`verify` |
| S3 | 首页 + 交付（四件物/项目面/手册/技能/恢复面） | 待授权 | `prompt-smoke`、`test:client`、`web-expected`、真机 |
| S4 | 文档/分发（README/docs/`_dist` 生成器） | 待授权 | `verify`、`export-dist`、漂移审计 |
| S5 | 收口（proposed → implemented；输掉的方案；触发） | 待授权 | `verify` notes 形状 |

切片级文件/API 细节 = [落地蓝图](../research/261101-plugin-as-product/261101-landing-blueprint.md)；证据设计 = `## 验收标准`。

## 测试计划（落地验收）

> 这段回答“落地有没有问题”，不是第二张愿望表。每层只证明它能证明的；缺 key/浏览器 = BLOCKED，不并入绿；切片收尾跑该片会红的检查（[pre-push-evidence](../../.agents/skills/pre-push-evidence/SKILL.md)），S5 再跑全量。

### 分层

| 层 | 证明什么 | 命令 | 何时 |
|---|---|---|---|
| **L0 静态** | 类型/构建/文档/身份/生成物 | `pnpm typecheck && pnpm build && pnpm verify`；`pnpm gen-catalog --check` | 每片 commit 前 |
| **L1 域/合同** | settings/路径/route/预算/门状态 | `pnpm test:domain`、`test:host`、`test:agent`、`test:client` | S1/S3 |
| **L2 组合** | 真 Loader 行、导出、headless disabled | `pnpm test:composition` + `--dump-config` | S1 |
| **L3 安装/生命周期** | profile 建/装/升级/回滚/独立启动 | `pnpm product-smoke`、`standalone-smoke`、`release-smoke`、`upgrade-smoke`、`bootstrap-guards-smoke` | S2 |
| **L4 模型可见/UI** | 新手册指令、客户端门、恢复面 | `pnpm prompt-smoke`、`pnpm test:client`、`pnpm web-expected` | S3 |
| **L5 真机/人判** | 首跑产出、工作区落点、present | 一次真机；`pnpm eval`（有 key）/`eval:domain` | S3/S5 |
| **L6 分发** | README/手册/身份/合同一致 | `pnpm verify`、`pnpm export-dist`、语义漂移审计 | S4 |

### 每片的测试清单

| 片 | 新测试/夹具 | 必跑 | 反例 |
|---|---|---|---|
| **S1** | `product-settings.spec.ts`、`product-route.spec.ts`、composition 断言 | `test:domain`/`test:host`/`test:composition`、`--dump-config` | 坏 JSON/版本/缺目录/不可读写/`/`/用户 home/产品 home/包内；headless disabled；POST 并发 |
| **S2** | `product-smoke.mjs`（profile/登记/会话 cwd）；guards 新例 | `product-smoke`、`standalone-smoke`、`release-smoke`、`verify` | 外来 profile；`--from-default-profile` 误替换；版本失败保留旧装；workspace 危险路径；日用 home 不被碰 |
| **S3** | `product-gate.spec.ts`；手册预算断言；prompt-smoke 新断言；work-delivery 技能 | `test:client`/`test:agent`、`prompt-smoke`、`web-expected`、真机 | 404/未配置/缺失/非法/恢复面；产物写回家；README 缺段；项目 `AGENTS.md` 被覆盖；无 key = BLOCKED |
| **S4** | export-dist must 清单；handoff-scan 拒绝 `assistant-product/`；docs 链接 | `verify`、`export-dist`、漂移审计 | 手册旧装法；identity 仍写禁令；home.md 仍说产物在家 |
| **S5** | note 形状；triggers；归档 | `verify`；卡关闭条件 | 未跑检查被写成绿；BLOCKED 并入绿 |

### 最终“落地没问题”判据

1. `pnpm typecheck && pnpm build && pnpm test && pnpm verify` 全绿（或明确 BLOCKED 项）。
2. `pnpm product-smoke`、`pnpm standalone-smoke`、`pnpm release-smoke` 绿；product-smoke 读到 `storages/workspace.json` 的 canonical path，in-process 探针证 `header.cwd`。
3. `pnpm prompt-smoke` 证新交付指令在场、旧“家 `deliverables/`”指令不在场。
4. 一次真机：产品 home + 真工作区，首屏显示工作区，会话落工作区，产出 `deliverables/<date>-<slug>/README.md` + 文件并 `present`。
5. `pnpm web-expected`（客户端门/恢复面场景）过目 diff；无 Chrome 标 BLOCKED。
6. `pnpm eval`（有 key）行为地板；无 key 标 BLOCKED，不以测试绿冒充。
7. S4 文档/手册/README 三处口径一致；`pnpm verify` 的 identity/catalog/manual 门绿。
8. 未取项（per-workspace 大脑、机器 manifest、O5 安装器、Windows/Desktop）有触发，不混进“已完成”。

### 假绿防线

- 只看 `exit 0` 不算：product-smoke 必须读盘上的 `storages/workspace.json` 与 `header.cwd`。
- `--dump-config` 只证组合形状，不证运行时；product-smoke 必须真 boot。
- `prompt-smoke` 只证指令进入请求，不证模型照做；行为要 eval/真机。
- `web-expected` 只证渲染，不证交互；交互看 client spec/真机。
- 缺 key/浏览器 = BLOCKED（exit 2 或报告里明说），不写成绿。

## 仍未取（授权后仍不取或延后）

- **per-workspace 大脑**：除非拍板 1 选 B；否则延后，触发 = 真实用户要求项目连同助手交接，或多业务知识串味成为实际抱怨。
- **机器 run manifest / 面板枚举 / desk→deliverable 直开**：延后，触发 = 出现真实消费者（首页“这周做了什么”、eval 核对产物、用户找不到产物）。
- **首次 GUI 目录选择器**：v1 用 CLI 参数/TTY 提示；触发 = 真人首跑觉得命令行不可接受，或产品要交给非技术用户。
- **O5 的安装器/签名/离线包**：本轮只把三步装配收成一条命令；非技术用户安装器是另一个决定，触发 = 第一次真实企业交付。
- **Windows / Desktop 真机矩阵**：本轮不宣称；沿用现有边界。
- **多工作区最近列表 / 自动更新 UX**：v1 先不做；触发 = 用户真实切换多个项目。
- **项目 `AGENTS.md` / `.dsh/skills` / `.agents/skills` 的写回流程**：v1 只读 + 建议，不自动写；触发 = 用户明确要求助手直接维护项目笔记/技能。
- **真实模型行为**：无 key 时 `eval` 标 BLOCKED，不用“测试绿”冒充行为已验。

## 关闭条件

- **决策层（2026-11-01 已完成）**：四项拍板有本人答复；方向、范围、比较过的选择与理由、验收标准写回本卡；work 去向（proposed note + 本卡收口）记录。
- **实施层（推进中）**：`## 验收标准` 全绿；证据记入「落地顺序」的切片台账；开放项留在 `## 仍未取`；文档与 `_dist` 同 diff。满足即归档。
- **以后做/不做**：写清理由、触发条件与观察点，路由到 note 或 trigger 后再归档；不存在“没结论先归档”。

## 参考

- [平台与仓内事实](../research/261101-plugin-as-product/261101-platform-and-repo-facts.md)
- [数据归属与 run bundle 选项](../research/261101-plugin-as-product/261101-ownership-and-run-bundle-options.md)
- [改动面与切片](../research/261101-plugin-as-product/261101-change-surface-and-slices.md)
- [可行性复核](../research/261101-plugin-as-product/261101-feasibility-review.md)
- [技术探针](../research/261101-plugin-as-product/261101-technical-probes.md)
- [落地蓝图](../research/261101-plugin-as-product/261101-landing-blueprint.md)
- 现行合同：[根 README.md](../../README.md)、[docs/delivery.md](../../docs/delivery.md)、[docs/release.md](../../docs/release.md)、[docs/identity.md](../../docs/identity.md)、[docs/home.md](../../docs/home.md)、[docs/architecture.md](../../docs/architecture.md)
- 现行决定：[交付合同](../../notes/implemented/2026-10-25-delivery-contract.md)、[数据面校准](../../notes/implemented/2026-10-28-data-plane-alignment.md)、[首开一页纸](../../notes/implemented/2026-10-23-first-run-one-page.md)
- 外部参考：FAQ 26（`deepseek-harness/_faq_on_digested/26_plugin-as-product`）——只作判据来源，不复制正文。
