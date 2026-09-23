# 家的契约（working folder · 唯一权威）

> 这个插件给 agent 一个**自己的家**：一个跨会话存在的工作目录。
> 家的组织本身就是产品的一部分 —— 概念依据是 `Agent = Model + Harness`：
> 家就是"那一圈"的物理落点，它的信噪比决定 agent 糊涂还是清醒。
> 布局的**唯一 owner** 是 `src/home/layout.ts`；本文是它的契约说明，两者必须一致（`pnpm verify` 校验）。

## 一、布局

```text
<dataDir>/                      # 默认 <dshHome>/assistant（$DSH_HOME → ~/.dsh）
├── HOME.md                     # 地图：这是什么、东西在哪、怎么用（agent 与人都先读它）
├── memory/                     # 房间一：已确立的事实 / 偏好 / 决定
│   ├── <id>.md                 #   一条记录一个文件（frontmatter + 正文）
│   └── archive/<id>.md         #   被取代 / 退役的（不在摘要里，仍可读）
├── research/                   # 房间二：意图还不清晰的探索（backlog 语义）
│   ├── <id>.md                 #   开放线索：status = open | parked
│   └── archive/<id>.md         #   已结案：status = promoted | dropped
└── skills/                     # 房间三：学到的本事（DSH 技能格式，被 provider 监听）
    └── <name>/SKILL.md
```

**一个房间一个职责**，不许混：事实进 `memory/`，未决的线索进 `research/`，可复用的做法进 `skills/`。
`dataDir` 可用配置覆盖（bundle patch / profile patch），默认跟随 `resolveDshHome()` —— 于是**双 home 隔离自动生效**：
开发 home 里的家与日用的家互不可见。

## 二、三个房间的语义

| 房间 | 里面是什么 | 生命周期 | 谁写 |
|---|---|---|---|
| `memory/` | 跨会话仍然成立的事实、偏好、决定 | `active` → `superseded`（被新记录取代）/ `retired`（不再成立）→ `archive/` | `assistant_memory` |
| `research/` | 还没想清楚的线索：问题、为什么值得追、试过什么、现在倾向什么 | `open` / `parked` → **三档出口**：`promoted`（成立）/ `dropped`（不成立，**理由必填**）→ `archive/` | `assistant_research` |
| `skills/` | 学到的做法（可复用、可被模型加载） | 由 DSH 技能 provider 发现与监听；被取代就改文件 | `assistant_reflect action=save_skill` |

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

**判据**：能让代码查的，别让 AI 自己说。

## 五、`HOME.md`（地图）

`HOME.md` 由服务在首次使用时生成（scaffold），内容是**给人也给 agent 看**的地图：
这是什么、三个房间各放什么、三档出口是什么、`curate` 怎么用。
它**不进常驻上下文**（摘要里有精简版），但 agent 可以随时 `read` 它。
人工手改 `HOME.md` 不会被覆盖（只在缺失时生成）。
