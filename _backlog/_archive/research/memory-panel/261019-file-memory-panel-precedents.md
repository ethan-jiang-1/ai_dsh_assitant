---
topic: 记忆面板
intent: "为文件在盘（markdown+frontmatter）、同 GUI 网页面板的个人助理产品，就五个设计问题收集第一方证据：面板能否直建条目、直写多深、派生快照去留、无审批自动捕获的缓解、技能可见性。"
sources: first-party only（vendor docs / help center / release notes / changelog / official repo）
accessed: 2026-10-19（全部）
---

# 文件记忆 + 网页面板：五问第一方证据

> 访问方式：`curl -x http://127.0.0.1:7897` 或 `https://r.jina.ai/<url>` 直通。官方原文缓存见 `.tmp/research-mem/`（会话现场，不入库）。
> 「推论」= 我基于证据做的推断，非原文明言。

## Q1 面板能否直建条目

- **Claude Code `/memory`**：列记忆文件位置、可开文件编辑；选不存在的文件会先建："Select any file to open it in your editor; selecting one that doesn't exist yet creates it first."（code.claude.com/docs/en/memory, 2026-10-19）。这是"建文件"而非"新建记忆表单"，且不带任何来源/作者字段。
- **Claude Tag（Claude in Slack）**：后台页里有显式建条目入口："Added creating, editing and deleting workspace and channel memory files on the Activity page's Memory tab for members with the Claude Tag Admin permission"（CHANGELOG 2.1.296；另 2.1.273 "admins can now open, edit and delete that memory"）。这是目前找到的**唯一第一方"面板内新建记忆"**证据，且是管理员向，不是终端用户向。
- **ChatGPT**：Saved memories 只能"从对话里要它记"或删除/纠正；FAQ 没有"新增一条记忆"表单："Saved memories are details that you explicitly ask ChatGPT to remember or that ChatGPT saves as useful context"（help.openai.com/articles/8590148）。
- **Claude.ai**：Topics 列表可 "use the edit icon to change it or select Delete"；追加只能"Tell Claude what you'd like it to remember"（support.claude.com/en/articles/11817273）。
- **Cursor Rules**：有显式新建表单："Open Customize in the sidebar, go to Rules, and click Add Rule. This creates a new rule file in .cursor/rules."（cursor.com/docs/rules.md）。
- **Mem0**：SDK `add` 只接受 messages（"infer" 抽取），Platform 为 ADD-only（docs.mem0.ai/core-concepts/memory-operations/add）。Mem0 Copilot 废弃说明里明确它**不能**直改/直删记忆："Directly edit or delete existing memories" 列在它做不到的事里（docs.mem0.ai/platform/copilot）。
- **Letta MemFS**：记忆即 git 仓里的 markdown，编辑走普通文件工具；无"新建记忆"面板证据。
- **Agents.md/CLAUDE.md 文件路径**：Claude Code 明确两条路——"ask Claude directly, like 'add this to CLAUDE.md', or edit the file yourself via /memory"（同 memory 文档）。
- **provenance/author**：所有已查产品都**没有**人建条目的作者/来源字段。Claude Code 只在 Claude 写文件时加 `modified`（ISO 8601）frontmatter，且 "Claude Code never adds frontmatter to a file that has none"；ChatGPT 有 Sources 面板（回复下方），但它指"影响个性化回答的来源"，不是条目级作者字段。Mem0 有 `metadata` 自由键值，未规定来源语义。
- 推论：单主体产品里"面板新建"没有可抄的第一方惯例；Cline/Continue 等未查。

## Q2 直写深度与留痕

- **生命周期状态**：文案层面普遍有。ChatGPT：删记忆、`Don't mention this again`（"reduces future references … does not delete"）、`Delete and turn off memory`。Claude：edit/Delete topic、`Include sensitive topics` 回滚会删除已存敏感项。Claude Tag 管理员可"open, edit and delete"记忆。**没有**第一方文档描述 approve/deprecate 这类审批态。
- **who**：GitHub Wiki history 显式记 "The user who made the change, The commit message they provided, When the change was made"（docs.github.com wiki viewing-a-wikis-history-of-changes）。MemFS："Every memory edit is committed to the MemFS git repository. This provides version history, conflict resolution, and a clear boundary between saved memory and uncommitted changes."（docs.letta.com/letta-code/memfs）。**没找到**任何产品记"人 vs agent"作为显式字段——git author 可隐含，但无文档明言。
- **before/after**：Obsidian File recovery 存整篇快照默认 ≥5 分钟一份、留 7 天，"you can optionally show the differences between snapshots … what content was added, removed, or modified"（obsidian-help/en/Plugins/File recovery）。Claude Code 2.1.214 起写 `modified` 时间戳，changelog 亦有 "Added last-modified timestamps to memory files, helping Claude reason about which memories are fresh vs. stale"。
- Logic/Notion：未取得第一方可引用文本 → 见 UNVERIFIED。

## Q3 派生快照 vs 直读

- **Obsidian 明确保留派生索引**："In order to provide a fast experience while using the app, Obsidian maintains a local record of metadata … called the **metadata cache** … Obsidian keeps this cache in sync with the files in your vault, but it is possible for the data to get out of sync … you can rebuild your metadata cache"；缓存持久于 IndexedDB（obsidian-help/en/Files and folders/How Obsidian stores data）。
- **Letta 无索引**："MemFS does not include a semantic or vector index by default. Agents find memory in its Markdown files with normal file-search and read tools."（memfs 文档）——反例：小目录可以直读。
- Electron IPC：renderer 只能经 `ipcMain`/`ipcRenderer` 通道调用主进程 API（electronjs.org/docs/latest/tutorial/ipc）——host 出读 API 是 Electron 系标准形态，但文档不评"每次渲染直读"的性能。
- Ink & Switch local-first 论文：本次未取得原文 → UNVERIFIED。
- 推论：几百个小 md 的目录，第一方证据只支持"缓存+可重建+可失同步时重建"这一形态；"每次渲染直读"无第一方失败模式文档（失败模式本身 UNVERIFIED）。

## Q4 无审批自动捕获

- **Claude Code auto memory**：默认开（本地会话），`/memory` 开关写 `autoMemoryEnabled` 到 `~/.claude/settings.json`；可按项目关；环境变量 `CLAUDE_CODE_DISABLE_AUTO_MEMORY=1`；后台会话/被工具拉起的会话**不能打开**（changelog 2.1.29x: "Changed /memory so that Auto-memory can no longer be turned on from a background session or from a session one of Claude Code's own tools started"）。事后控制 = 浏览/编辑/删除文件（"Everything is plain markdown you can read, edit, or delete"）。
- **Claude Tag 按频道隔离**：changelog **2.1.268**："Changed memory in public channels: each channel now keeps its own notes, and Claude no longer recalls notes it saved in other public channels; workspace notes stay shared"。即"频道级 + 工作区级"双语域；管理员页可列/开/改/删。
- **ChatGPT 2026**：June 4, 2026 "Memory that stays more up to date"——"Memories are now updated automatically"；June 12, 2026 "Delete and turn off memory"；January 15, 2026 每个用到的 past chat 显示为 source。project-only memory 可选（"Info from the project is also kept out of memory used in chats outside the project"）；temporary chat 不建记忆。
- **Claude.ai**：项目记忆隔离（"not memory from other projects"）+ 单会话关记忆（"nothing from the chat is saved to memory"，开聊后不可改）+ incognito。
- **先gate后撤/先无审批后加审批**：未找到第一方记载的此类变更（见 UNVERIFIED）。Mem0 Copilot 有 "Review changes" 审批模式但那是 settings/测试记忆，不是捕获。

## Q5 技能可见性

- **Claude Code `/skill-doctor`**：交互式报告开在 `/plugin` 管理器的 **Stats** 页；"The report … flags skills in the listing that have never been invoked and says where to turn them off"，列 context cost 与调用次数（code.claude.com/docs/en/skills；≥v2.1.252）。这是**最接近"使用计数 + 退役入口"**的第一方先例。
- **Cursor**：Customize → Skills 列出已发现技能（cursor.com/docs/skills.md）；Customize → Rules 有整个规则列表和状态。未见 usage 计数。
- **Letta**：`letta skills list` / `letta skills delete <skill> --agent <id>`；agent 自有技能住 `$MEMORY_DIR/skills`，随记忆 git 版本化。
- **OpenAI custom GPTs**：Knowledge 区最多 20 个文件、单文件 512 MB（help.openai.com/articles/8554397）。
- **Zed**：Rules 自 v1.4.0 起被 Skills + Instructions 取代，迁移为非默认 Rules→`~/.agents/skills/`；文档层面没有"agent 自学技能"列表的证据。
- "agent 自学技能在 UI 中带 usage/last-used"：Claude Code 是唯一有第一方 usage 统计的；**没有**第一方证据显示哪个产品的"自学技能"（区别于作者写的技能）被单列展示。

## 未证实清单

Logic/Notion 版本历史；Ink & Switch local-first 原文；Claude Code v2.1.268 的"cross-channel leakage"措辞（仅见"no longer recalls notes it saved in other public channels"）；"人 vs agent"作者字段；任何产品由"候选审批队列"改为无审批的 changelog；"每次渲染直读磁盘"的失败模式；Copilot(.github/copilot-instructions.md)/Windsurf 的记忆面板；OpenAI "Apps/Connectors"内技能管理；LLM Wiki 之外的 first-party 工程文。
