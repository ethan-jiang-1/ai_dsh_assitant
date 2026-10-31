---
topic: 数据归属与 run bundle 选项
intent: "把助手大脑、产品设置、工作区产物与 run bundle 的归属候选、平台代价、备份/迁移后果摆在一处，供问题卡拍板。"
---

# 数据归属与 run bundle 选项

> 立档：2026-11-01 ｜ 服务卡：[插件即产品](../../issues/261101-plugin-as-product.md)

## 0. 先分清四类事实

FAQ 26 的四空间 / 六加二平面给出的不是分类标签，而是一张“逐项记录”的检查表。产品要回答的不是“这块数据属于哪一类”，而是：

> 这块事实的 owner、authority、source、mechanism/path、scope/key、readers、writers、可重建性、保留/删除责任分别是什么？

本仓现在用 [docs/delivery.md](../../../docs/delivery.md) 的三张数据卡（用户内容 / 插件账本 / 宿主面）回答。新形态要加第四张：**工作区产物与 run bundle**。

## 1. 方案 A：大脑跟人走，工作区只收产物（agent 推荐）

### 布局

```text
产品 home（默认自有；`--home ~/.dsh` 才共享日用）
├── assistant/                     ← 大脑：SOUL/MANUAL/AGENTS + 四房间 + 技能 + 审计
├── assistant-operating/           ← 经营账本（单 writer）
├── assistant-product/settings.json ← 产品设置：当前工作区（机器本地）
├── profiles/assistant/            ← 产品 profile（启动器建）
└── sessions/ storages/ ...        ← 宿主

<workspace>（用户项目；启动时指定或从上次恢复）
├── <用户文件>
└── deliverables/
    └── <YYYY-MM-DD>-<slug>/       ← 一次作业 = 一个 run bundle
        ├── README.md              ← 问什么 / 依据 / 产出 / 未决 / 状态 / 会话日期
        └── ...交付物（present）
```

**home 默认（复核后改）**：产品自有 home，启动器显式设 `DSH_HOME`，不继承日用 `~/.dsh`。共享日用 home 会让产品会话、工作区、预设与用户其他 DSH 用途混在一起，跨 profile 打开产品会话还可能缺 preset；`--home ~/.dsh` 是用户显式选择，启动器给警告。

### 数据卡

| 事实 | Owner | Authority | Source | Path | Scope/key | Readers | Writers | 可重建 | 保留/删除 |
|---|---|---|---|---|---|---|---|---|---|
| 助手大脑 | 插件 | 四房间文件 | 会话 + 用户编辑 | `<home>/assistant` | home 单例 | 用户、模型经工具 | 工具/面板/用户 | 否 | `assistant-data`；升级/卸载保留；用户显式删 |
| 经营账本 | 插件 | `ledger.json` | 经营工具动作 | `<home>/assistant-operating` | home 单例 | 用户、模型经工具、桌面投影 | `assistant_operating` | 否 | 同上；单 writer 锁 |
| 产品设置 | 插件 | `settings.json` | 启动器/产品首页 | `<home>/assistant-product` | 机器本地 | 启动器、产品首页 | 启动器、产品首页 | 是（重选） | 不进 `assistant-data`；换机重选 |
| 工作区产物 / run bundle | **用户** | 文件夹内容 | 模型写 + 用户编辑 | `<workspace>/deliverables/` | 工作区路径 | 用户、模型 | 模型、用户 | run README 是记录不是派生 | 用户随项目备份/删除；插件不删 |
| Workspace 登记 | DSH | `workspace.json` | 产品登记/用户选择 | `<home>/storages` | WorkspaceId | Web UI | 产品 Host 行/DSH | 是（可重建登记） | `workspace.delete` 只删登记 |
| 会话日志 | 宿主 | 日志 | 会话 | `<home>/sessions` | SessionId | 用户、检索工具 | 宿主 | 否 | 宿主；会话导出另说 |

### 后果

- 一个数字分身可以跨多个工作区学习；工作区之间共享判断标准、偏好、学到的技能。
- 项目文件夹备份走，带走产物与 run README，但带不走助手的“记忆”；要一起带走必须另跑 `assistant-data`。
- 不需要改服务、段落、面板、账本、备份或测试的根模型；改动集中在启动器、Host 产品行、客户端门、手册与交付约定。
- 与本仓既有决定一致：[docs/delivery.md](../../../docs/delivery.md) 的“home 单例，不按 workspace 分区”。
- 风险：用户以为“把项目交给别人就能连同助手一起交出去”；文档必须显式说清两物的分家。
- **账本 scope**：A 也意味着多个工作区共享一个经营账本（home 单例）。如果工作区代表不同公司/业务，账本会混；这是 B/C 的触发，不是 v1 的问题，但文档要提前说清。

## 2. 方案 B：大脑跟项目走（每个工作区一套）

### 布局

```text
<workspace>/
├── <用户文件>
└── .assistant/（或 assistant/）
    ├── SOUL.md / MANUAL.md / AGENTS.md
    ├── memory/ research/ knowledge/ skills/
    ├── ledger.json / operations-archive.jsonl
    ├── deliverables/
    └── audit/ ...
```

### 必须改什么

| 面 | 现在 | 改成 |
|---|---|---|
| `assistantMemory` 服务 | 构造时解析一个 `dataDir` | 按 session/workspace 解析 home；所有公开方法要能定位当前 home |
| 四个提示词段落 | 全局注册，读 `ctx.assistantMemory` 单例 | 段落拿不到 session（见 [平台事实](261101-platform-and-repo-facts.md) §3）；要么改成进程级“当前工作区”，要么新建请求级上下文接缝 |
| 摘要缓存 | 单 cache + fingerprint | per-workspace cache；失效与预算都要分键 |
| 经营账本 | 单 writer、单 `writer.lock` | per-workspace writer 或多个账本的多路复用；锁语义要重做 |
| rooms 路由 | 无 session 上下文，读单 home | client 必须传 workspaceId；面板切工作区要重读 |
| UI 面板 | 房间/桌面读单 home | 每工作区一套数据；空态/切换/删除都要有 |
| `assistant-data` | 两目录 bundle | per-workspace bundle 或整 home 扫描；备份清单与 manifest 要重定义 |
| 测试/夹具 | 临时单 home | 临时多工作区；大量 spec 的 setup 要改 |
| 交付/升级 | 升级保留两目录 | 每个工作区一套；卸载后工作区里的助手数据怎么办要说清 |

### 平台代价

- 最硬的一条是 **prompt 段落看不到 session/workspace**（[system-prompt/src/index.ts](../../../vendor/dsh/packages/core/system-prompt/src/index.ts)）。不新建平台接缝，就只能接受“一个产品实例只服务一个工作区”，把当前工作区放在进程级配置里；这会限制“同一实例多工作区”。
- 与本仓已记录的决定相反（[docs/delivery.md](../../../docs/delivery.md) §一「作用域」、[数据面校准 note](../../../notes/implemented/2026-10-28-data-plane-alignment.md)）；按流程需要一个新的决定，不是一个实现细节。
- 好处是真实的产品故事：把项目文件夹交给同事，助手与它的记忆一起走；项目之间天然隔离。
- 成本量级：服务签名、四房间调用、段落、面板、账本、备份、测试、文档全要动；不是“把 dataDir 指到工作区”一行。

## 3. 方案 C：混合（身份/技能跟人，业务记忆跟项目）

- 身份、学到的技能、判断标准 = 跟人；业务事实、知识页、经营账本 = 跟项目。
- 实现方式是给记录加 `scope: workspace:<hash>` 之类的前缀/字段，摘要与检索按当前工作区过滤。
- 仍然卡在“段落拿不到当前工作区”——除非进程级绑定当前工作区；在“一个实例一个工作区”的前提下可行。
- 代价中等：schema 可选字段 + 摘要/检索过滤 + 面板展示；但“同一事实在两处”的边界会长期存在，需要很强的数据卡。
- 建议：**先不做**。触发条件 = 真实用户在一个 home 下跑多个业务工作区，并抱怨“A 公司的知识串到 B 公司”。

## 4. run bundle 长什么样

### v0：一次作业一个文件夹（agent 推荐）

```text
<workspace>/deliverables/<YYYY-MM-DD>-<slug>/
├── README.md          # 记录：问题与假设 / 依据 / 产出 / 未决与状态 / 日期
├── <artifact files>   # 报告、行动计划、表格、图
└── ...                # 关键文件用 present 声明
```

- **run 身份** = 文件夹名 + 日期。**不要求模型写 session id**（模型上下文不保证有；由 host/机器 manifest 以后补）。
- **不复制会话日志**：日志仍在 `<home>/sessions`；run 只留 run README。
- **生命周期**：用户拥有；插件不删、不轮转；`assistant-data` 不含它。
- **为什么用 `deliverables/`**：本仓根 `.gitignore` 已有 `/deliverables/`，现场惯例已存在；不用引入第二个目录名。若用户项目已有 `deliverables/`，默认混放；想隔离就用 `<workspace>/deliverables/<product>/`（问题卡拍板 2 的另一条路）。
- **为什么可见**：目标用户（CEO/VP）要能打开、能带走；隐藏目录等于没交付。
- **失败模式**：模型把文件写到工作区根而不是 `deliverables/`；手册与技能要写死这条，`prompt-smoke`/`eval` 观察；必要时再加一个只写 run 目录的工具。

**四件物分权**（避免“两份正文”）

| 物 | 位置 | Authority | 关系 |
|---|---|---|---|
| 交付包（用户文档） | `<workspace>/deliverables/<date>-<slug>/` | 用户可拿走的完整正文 | run README 指向它；`present` 声明 |
| run README（记录） | 同目录 `README.md` | 这次作业的问/据/出/未决/状态 | 不是第三份正文；记录链接与判断 |
| 知识页（蒸馏） | `<home>/assistant/knowledge/` | 助手可复用的理解/教训；draft→stable 人审 | 不复制交付正文；来源可指 `memory:`/`research:`/URL/旧 run |
| 账本事项（状态） | `<home>/assistant-operating/ledger.json` | 业务进展/待办/复查 | 与交付包按 id/标题关联；不为它加 schema |

**工作区的两个原生面**（产品不偷偷写）

| 面 | Owner | 助手怎么碰 | 与产品机制的关系 |
|---|---|---|---|
| `<workspace>/AGENTS.md` | 用户 | 读；建议追加；不静默覆盖 | DSH 原生指令装载器从项目根读；项目级事实的合法落点 |
| `<workspace>/.dsh/skills/`、`.agents/skills/` | 用户 | 读；建议；不静默写 | 项目技能 rank（`.dsh/skills` 100 / `.agents/skills` 200）> 学到的 300；同名会遮蔽学到的技能，curate 的 `skill-shadowed` 要能解释 |

### v1：机器 manifest + 面板枚举（先不做）

- Host 侧在 `deliverables/<run>/` 写 `manifest.json`（session id、时间、preset、模型、presented 文件、状态）。
- 需要消费者：产品首页“这周做了什么”、或 eval 要机器验证产物存在。
- 代价：事件监听/映射、命名冲突、隐私、清理；先等真实消费者。
- 触发条件写进问题卡，关闭时若仍延后就进 `triggers.md`。

### 已考虑但不推荐

| 方案 | 为什么不 |
|---|---|
| 隐藏 `.assistant/` | 用户找不到产物；产品价值不可见 |
| `deliverables/` 与 `runs/` 分家 | 两处真相；用户要读两份 |
| 复制会话日志进 run | 隐私/体积/格式代际；`present` 也不复制；日志有宿主 owner |
| 用 attachments / spill 当产物库 | 它们的读者是模型，不是用户；没有 GC/生命周期契约 |
| 用 `ctx.storageDomain` 存 run 元数据 | 模型不可见、per-record 键受限、无删除 API；产品要可读可导出 |

## 5. 备份、迁移、卸载矩阵

| 用户动作 | 方案 A（推荐） | 方案 B（per-workspace） |
|---|---|---|
| 备份助手 | `assistant-data export`（两目录） | 每个工作区各导一次，或整 home 扫描 |
| 备份项目 | 用户随项目备份（含 `deliverables/`） | 项目备份自动包含助手 |
| 换机器 | 搬产品 home（或只导 `assistant`+`assistant-operating` 到新 home）+ 重选工作区；`--workspace` 重绑 | 搬项目即可；home 只留凭据/会话 |
| 卸载插件 | 产品 home 保留；工作区产物保留；session 数据保留 | 工作区里的助手数据保留；要清需产品说明 |
| 删除工作区 | 只删 Workspace 登记；`deliverables/` 保留 | 删项目 = 删助手；产品必须显式警告 |
| 多人交接项目 | 产物跟着项目走；助手记忆不跟着走 | 助手记忆跟着项目走；需要隐私边界 |

**产品 home 的边界**：默认自有 home 让“产品数据 / 日用 DSH”分开；`--home ~/.dsh` 才共享，且要预期会话/工作区/预设混用。产品 home 里的 sessions/credentials/settings 仍是宿主所有，`assistant-data` 不带它们。

## 6. 拍板判据

| 问题 | 选 A 的信号 | 选 B 的信号 |
|---|---|---|
| 这个产品是“一个人的分身”还是“一个项目的助手”？ | 分身（跨项目学习） | 项目助手（项目自带大脑） |
| 用户会不会把项目文件夹发给别人？ | 会，且不希望带走自己的判断标准 | 会，且希望对方拿到完整上下文 |
| 一个用户会同时跑几个业务？ | 多个，但共享自己的标准 | 多个，且要求知识互不串 |
| 愿不愿意接受“一个实例一个工作区”的限制？ | 不需要限制 | 必须接受，或先做平台接缝 |

## 7. 结论与重看条件

- **推荐 A**：与产品原始意图（数字分身、跟人学习）、既有决定、平台能力都一致；改动集中在“启动 + 工作区保证 + 产物契约”。
- B 不是永远不做，而是**另立决定**：触发 = 真实用户要求把项目连同助手一起交接，或同一 home 下多业务知识串味成为实际抱怨。
- run bundle v1（机器 manifest）触发 = 出现“要机器枚举/核对产物”的消费者（首页、eval、审计）。
