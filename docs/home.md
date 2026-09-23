# 家的契约（working folder · 唯一权威）

> 这个插件给 agent 一个**自己的家**：一个跨会话存在的工作目录。
> 家的组织本身就是产品的一部分 —— 概念依据是 `Agent = Model + Harness`：
> 家就是"那一圈"的物理落点，它的信噪比决定 agent 糊涂还是清醒。
> 布局的**唯一 owner** 是 `src/home/layout.ts`；本文是它的契约说明，两者必须一致（`pnpm verify` 校验）。

## 一、布局

```text
<dataDir>/                      # 默认 <dshHome>/assistant（$DSH_HOME → ~/.dsh）
├── HOME.md                     # 地图：这是什么、东西在哪、怎么用（agent 与人都先读它）
├── skill-usage.json            # 机器账本：skill 工具加载计数（可删，删了计数归零；不进摘要）
├── memory/                     # 房间一：已确立的事实 / 偏好 / 决定
│   ├── <id>.md                 #   一条记录一个文件（frontmatter + 正文）
│   └── archive/<id>.md         #   被取代 / 退役的（不在摘要里，仍可读）
├── research/                   # 房间二：意图还不清晰的探索（backlog 语义）
│   ├── <id>.md                 #   开放线索：status = open | parked
│   └── archive/<id>.md         #   已结案：status = promoted | dropped
└── skills/                     # 房间三：学到的本事（DSH 技能格式，被 provider 监听）
    ├── <name>/SKILL.md
    └── archive/<name>/SKILL.md #   退役的（移出 provider 扫描、不删、可恢复）
```

**一个房间一个职责**，不许混：事实进 `memory/`，未决的线索进 `research/`，可复用的做法进 `skills/`。
`dataDir` 可用配置覆盖（bundle patch / profile patch），默认跟随 `resolveDshHome()` —— 于是**双 home 隔离自动生效**：
开发 home 里的家与日用的家互不可见。

**根下的 `skill-usage.json` 不是房间**：它是机器自有的用量账本——每次 `skill` 工具成功加载一个技能，
learn 模块的 `tools/result` 订阅就给对应名字计数（用户 `/name` 斜杠注入不走工具管线，不计）。
`curate` 与 `assistant_reflect brief` 回显计数（最少用在前 / 最多用在前），作为退役决策与
延后判据（自动蒸馏的"真实使用数据"）的数据面。**被遮蔽的名字不回显计数**：计数是名下真值，
遮蔽时加载的是赢家的正文，不归学到的 bundle（遮蔽本身由 `skill-shadowed` finding 报）。
它是**建议性状态**：删掉即归零，不影响任何知识；
文件烂了 curate 会报 warn（静默读零会误导退役决策）。

## 二、三个房间的语义

| 房间 | 里面是什么 | 生命周期 | 谁写 |
|---|---|---|---|
| `memory/` | 跨会话仍然成立的事实、偏好、决定 | `active` → `superseded`（被新记录取代）/ `retired`（不再成立）→ `archive/` | `assistant_memory` |
| `research/` | 还没想清楚的线索：问题、为什么值得追、试过什么、现在倾向什么 | `open` / `parked` → **三档出口**：`promoted`（成立）/ `dropped`（不成立，**理由必填**）→ `archive/` | `assistant_research` |
| `skills/` | 学到的做法（可复用、可被模型加载） | 由 DSH 技能 provider 发现与监听；被取代就改文件；**退役**（90 天未用阈值由 curate 报，`retire_skill` 执行）→ `skills/archive/`（不删、可恢复） | `assistant_reflect` |

**为什么探索要单独一间房**：不清晰的意图如果没地方放，只会被硬塞进正式流程（污染记忆与技能、拉低信噪比）
或者蒸发（下次从零重开同一个问题）。**分房是为了让"已确立的"保持干净。**

**为什么 drop 必须写理由**：尸体是给未来的自己看的。没有理由的丢弃 = 下次重开同一个问题。

## 三、桌面与抽屉（信噪比）

- **桌面**（常驻上下文，`assistant-memory-digest` 段落，**有界** `digestMaxBytes`）：
  家的地图（一小段）+ 活跃记忆的精选 + **开放线索的条数与前几条标题**。
  桌面只放"此刻最该在眼前的东西"。
- **抽屉**（要用再拿）：完整记录、归档、技能正文 —— 用 `assistant_memory` / `assistant_research` /
  `skill` 工具取。

推论：**过程性知识不做成常驻段落**。怎么写记忆、怎么养护家、怎么复盘 —— 都在 `skills/`（抽屉），
由技能目录按需加载。这条是"很好控制的上下文"的落点。

## 四、机器能查的检查（`curate`）

`assistant_memory action=curate` 返回一份**纯函数算出来的**养护简报（同一个函数也被测试与 repo 门禁消费）：

| 检查 | 报什么 | 为什么 |
|---|---|---|
| frontmatter 合法性 | 解析不了 / 缺必填字段的记录 | 烂文件会静默退出摘要，等于悄悄丢失 |
| id 唯一性 | 重复 id | 记录身份必须唯一 |
| 悬空引用 | `supersedes` / `promotedTo` 指向不存在的 id | 引用断掉会让历史读不出来 |
| 近似重复 | 高重合的活跃记忆（关键词/标签） | 三条模糊的记忆比一条准确的更糟 |
| 摘要预算 | 摘要字节 vs `digestMaxBytes`；超了就报 | 桌面塞满 = 中间被漏掉 |
| 过期线索 | 超过 `staleResearchDays` 未更新的 `open` 线索 | 悬着的线索会烂，机器先发现 |
| 缺理由的 drop | `status: dropped` 但 `reason` 为空 | 尸体没写死因 = 白丢 |
| 技能文件 | 名字不合 `SKILL_NAME` 文法 / 缺 `description` / 目录名与 name 不一致 | 技能会静默不被发现 |
| 同名遮蔽 | 学到技能的名字被注册表判给其他 provider（`skill-shadowed`，探自 curate 所在会话的技能注册表） | `save_skill` 说成功、文件也在家，但**永不加载**——静默失联 |
| 技能过期（stale） | 超过 `staleSkillDays`（默认 30 天）未被加载（`skill-stale`，info） | 死技能是目录重；先报候选，去留归 agent |
| 技能可退役 | 超过 `retireSkillDays`（默认 90 天）未被加载（`skill-retirable`，warn） | 每个技能的 name+description 都在目录里占常驻上下文——死技能每请求都在付费；年龄锚点=账本 `lastUsedAt`，从未加载的用 `learnedAt` |
| 用量账本可读性 | `skill-usage.json` 存在但解析不了 | 静默读零会误导退役决策 |

简报同时附带**技能用量数据面**（不是 finding）：每个学到技能的加载次数与最近使用（最少用在前）——
这是治理环（退役、触发演进延后判据）的依据。

**判据**：能让代码查的，别让 AI 自己说。

## 五、`HOME.md`（地图）

`HOME.md` 由服务在首次使用时生成（scaffold），内容是**给人也给 agent 看**的地图：
这是什么、三个房间各放什么、三档出口是什么、`curate` 怎么用。
它**不进常驻上下文**（摘要里有精简版），但 agent 可以随时 `read` 它。
人工手改 `HOME.md` 不会被覆盖（只在缺失时生成）。
