# 2026-09-24 · Obsidian 互通深评（r5）：家的 knowledge 房间能否双向进出 Obsidian 生态

日期：2026-09-24 · 状态：survey 底稿（判据与决策不放这里；进文前的承重主张待委托方复核）

> 问题：（1）家的 `knowledge/` 目录直接当 Obsidian vault 打开，人编辑体验如何、什么会坏？
> （2）`dsh-obsidian` 插件（处理用户自己的外部 vault）值不值得挂/借鉴？
> 硬过滤（用户拍板）：一切方案必须 **MD/文件系统原生**，信息对 AI coding agent 全透明；纯本地不用云。
>
> 证据分级：[affordance] 本地源码/盘上文件可指认（给路径）/ [documented] 官方文档/registry 载明（给 URL）/
> [observed] 社区观察（注明出处）。版本基线：逐条写明。全部 URL 为本次会话真实 fetch；失败处如实注明
> （见附 B）。本地基线：本仓 HEAD（knowledge 房间 2026-09-24 落地后）；DSH pin `dsh-v0.1.5-rc.2`。
> 方法约束：不跑 Obsidian 应用（GUI 不可自动化）；兼容性结论全部基于文本级分析（链接解析语义、
> frontmatter 字段、文件命名——均有官方文档/源码可依）。
> 判据（继承 r3）：①错了赔得起吗 ②错了多久能发现 ③形态可否进 DSH 组合 ④信噪比 ⑤维护与活跃度。

---

## 〇、承重事实速览（后文逐条展开）

- 我们的 `[[链接]]` 解析键是 **id 优先、其次 frontmatter title**（大小写不敏感）
  [affordance：`packages/dsh-smart-assistant/src/knowledge/page.ts` L213-224]。
- Obsidian 的 wikilink 解析键是**文件名（basename）**，别名走 frontmatter `aliases` 属性；
  **没有以 `title` 属性为解析键的机制** [documented：Internal links / Aliases / Properties 三页，见 §一]。
- 页文件名 = id = `newThreadId(now, title, …)` 产出的 **`20260924-<slug>-<4位随机>`** 形态
  [affordance：`src/index.ts` L594 + `src/research/thread.ts` L62-66]——人写链接几乎不可能手打全 id。
- 结论先行：**当初"对 Obsidian 兼容"的声称只对了一半——语法三形态兼容，解析语义不兼容。**
  正文写 `[[staging-gate]]` 这种名字链接，在我们这边解析到 title 命中的页；在 Obsidian 里是
  **unresolved link**，点击会**新建** `staging-gate.md`——人一点，图就分叉。

---

## 一、我们的 wikilink 语义 vs Obsidian 解析语义（逐条失配分析）

### 1.0 双方规则原文

- **我们** [affordance]：`WIKILINK = /\[\[([^\]#|]+)(?:#[^\]|]*)?(?:\|[^\]]*)?\]\]/g`（page.ts L73），
  匹配 `[[target]]`、`[[target#section]]`、`[[target|alias]]`，取 target。解析 `resolveWikiLink`：
  ① id 全等命中 → 该页；② 否则 title **大小写折叠**全等：恰一命中 → 该页，多命中 → ambiguous
  （curate 报 error），零命中 → missing（curate 报 info"未写成的知识"，health.ts L63-70）。
- **Obsidian** [documented]（obsidian-help 仓库 master 分支，2026-09-24 fetch）：
  - Internal links（`en/Linking notes and files/Internal links.md`）：
    `[[Three laws of motion]]` ≡ `[[Three laws of motion.md]]`——**链接目标就是文件名（可含 `/`
    文件夹路径，从 vault 根起算）**；指向不存在笔记时 **"Obsidian creates the note at that folder
    path"**；非法字符 `# | ^ :` 等不可作链接；重命名文件时自动更新 vault 内链接（可关）。
  - Aliases（`en/Linking notes and files/Aliases.md`）：别名 = frontmatter **`aliases` 属性**
    （YAML 列表）；经补全菜单用别名链接时，Obsidian 生成 `[[Artificial Intelligence|AI]]` 形式
    （"to ensure interoperability with other applications using the Wikilink format"）。
  - Properties（`en/Editing and formatting/Properties.md`）：默认属性仅
    `tags` / `aliases` / `cssclasses`（+Publish 用的 publish/permalink/description/image/cover）；
    **`title` 不在任何保留清单里**，就是普通自定义属性，不参与链接解析。

### 1.1 失配一（最重）：id 文件名 vs 名字链接

页文件是 `20260924-staging-gate-k3p7.md`（id 命名），正文链接却写 `[[staging-gate]]`（title/slug
名字）。两个解析器的行为：

| 消费者 | `[[staging-gate]]` 的解析结果 |
|---|---|
| 我们（resolveWikiLink） | title 恰一命中 → 到页；无 title 页则 missing（curate info） |
| Obsidian | 找文件 `staging-gate.md`（或任何目录下同名 basename）→ **不存在 → unresolved** |
| dsh-obsidian（mingzeng21 v0.2.5）[affordance：`src/wikilink.ts` `resolveLinkTarget`] | 按 strip 后 basename 全等（或 `/<name>` 后缀）唯一匹配 → **null（无歧义才返回）** |

后果链（文本级可推）：

1. **人的编辑体验**：在 Obsidian 里打开 knowledge/ vault，所有名字链接显示为可点击但无目标的
   unresolved link；**点一下就创建 `staging-gate.md` 空页**[documented：Internal links "creates
   the note"]。新页不在我们的词汇里（无 `type` frontmatter）→ 我们这边 `pageFromEntry` 返回
   undefined → curate 报 `page-unreadable` error（health.ts L47-55）[affordance]。**坏法是可见的
   （判据②成立），但需要一次 round-trip 才发现。**
2. **重命名不跟链**：人在 Obsidian 里重命名页文件（比如去掉日期前缀让它好读），Obsidian 只自动
   更新**它认为指向该文件**的链接——我们的名字链接不在其列，静默变 missing；我们的 curate 能在
   下次养护时报告（`page-link-unwritten` info / 大面积 `page-unreadable` error），但**人侧图已断**。
3. **id 链接可双向**：若正文链接写全 id `[[20260924-staging-gate-k3p7]]`，Obsidian 按 basename
   解析成功（`.md` 可省 [documented]），我们按 id 全等解析成功——**唯一两种解析器都认的写法**。
   代价：链接可读性差（人不愿手打）。
4. **缓解项**：给每页 frontmatter 加 `aliases: [staging-gate]`，则 Obsidian 补全菜单按别名可达
   [documented：Aliases]；但官方文档只承诺**补全建议**走别名、并生成 `[[真名|别名]]` 形式——
   手写的裸 `[[staging-gate]]` 是否解析到带该 alias 的页，官方页面未载明（本调研不跑应用，不判）。
   即便解析，别名键与我们 title 键仍是两套登记处。

### 1.2 失配二：三形态各自的 Obsidian 行为

| 形态 | 我们 | Obsidian [documented] | 失配度 |
|---|---|---|---|
| `[[target]]` | id→title 解析 | basename 解析；不存在→点击建页 | **高**（§1.1） |
| `[[target#section]]` | 正则剥掉 `#section`，解析同上（page.ts L73） | `#` 后是**目标笔记内的标题**锚；多级 `#a#b` 支持子标题 | **中**：我们完全忽略锚语义——若 id/名字命中的页里没有该标题，Obsidian 视为断锚；我们的 curate 从不检查标题存在性（潜在 finding 缺口） |
| `[[target\|alias]]` | 剥掉 alias，取 target | `\|` 后是显示文本；target 仍按 basename 解析 | 与形态一同源，alias 显示语义双方一致 |
| （对照）`[[#^block]]` | 不支持（`^` 在我们的正则里会怎样？`[^\]#|]+` 不含 `^`，target 可含 `^`——**会把 `#^block` 之外的部分当 target**，行为未定义） | Obsidian 专有 block 引用，官方明示 "won't work outside of Obsidian" [documented] | 我们不该产出即可；解析器对 `#^` 的容忍与 Obsidian 的 `#` 锚规则不一致，注意别让 agent 生成 |

附带：Obsidian 接受等价的 Markdown 方括号链接格式（方括号文字 + 圆括号相对路径）且提供"关掉 wikilink、生成
Markdown 链接"的互操作开关 [documented]——对我们无直接用处（agent 写 `[[…]]` 语法在两边都能
**渲染**），问题始终只在**解析键**。

### 1.3 失配三：大小写与唯一性假设

- 我们：title 匹配大小写折叠（page.ts L216-217）；多命中报 ambiguous error。
- Obsidian：同名 basename 跨目录冲突时要求用路径消歧（Internal links："include the folder
  path"）；dsh-obsidian `resolveLinkTarget` **多命中直接返回 null**（宁缺毋滥）
  [affordance：src/wikilink.ts]。
- 我们的页全部平铺在 `knowledge/` 一层（room 契约 [affordance：home/room.ts]），basename=id
  天然唯一——**id 链接不存在歧义面**；名字链接的歧义我们已用 error finding 覆盖（与两个消费方
  的"唯一才解析"哲学一致）。

---

## 二、frontmatter 与 draft/stable 状态在 Obsidian 里的表现

逐字段（对照 Properties 文档 [documented]）：

| 字段 | Obsidian 表现 |
|---|---|
| `id` / `type` / `status` / `description` / `staleAfter`（camelCase） | 普通自定义文本属性，正常显示；`staleAfter` 不会被认成 Date 类型属性（其类型系统按属性名全局分配，我们不用其 UI 改值即可） |
| `title` | 普通文本属性；**不参与任何解析/搜索语法**（搜索有 `property:` 语法可用 `[title: x]` 检索，属通用属性搜索而非链接解析） |
| `tags` | **命中 Obsidian 默认属性**：页 tags 直接进 vault 标签面板/graph 的 tag 节点。互通红利，无破坏 |
| `generated: {by, at}` / `verified: [{by, at}]` / `sources: [{resource,…}]` | **嵌套属性**。官方明示 "Nested properties: not currently supported"（要看得清得用 Source 模式）[documented]。文件与 YAML 本身完全合法，Obsidian 不改写就不丢；风险仅在**人用属性 UI 批量编辑时**（UI 可能整块重排/丢弃嵌套结构——文档只说"不支持查看"，未承诺保留；对我们是软风险，curate 的 `page-unreadable` 兜底） |
| `status: draft|stable|deprecated` | Obsidian 无状态概念，不渲染任何区别。人审"draft→stable 手改"流程在 Obsidian 里**可行**（Source 模式或属性行直接改字符串），这正是互通的最大收益点 |

综合：frontmatter 面基本无坑，唯二注意——① 嵌套字段别用 Obsidian 属性 UI 碰；② Obsidian 打开
目录时会创建 `.obsidian/` 配置目录（r3 已载明 vault 形态 [documented]），需 gitignore 或
劝阻（我们的 verify 断链检查是否会扫它：`.obsidian/` 非 `.md` 无害，`workspace.json` 等
不进 room 读取面 [affordance：room.ts 只读房间目录下 `*.md`]）。

vault 边界选择：开整个 `assistant/` 还是只开 `knowledge/`？只开 `knowledge/` 更干净（避免
memory/research 的非知识文件进图）；但 knowledge/ 无 archive 子目录（deprecated 留原地
[affordance：docs/home.md L26]），单房间开 vault 无信息损失。

---

## 三、dsh-obsidian 深评（mingzeng21，v0.2.5）

数据基线：npm registry 2026-09-24 fetch（registry.npmjs.org/dsh-obsidian）+ 仓库源码抽查。

- **是什么**：把 DSH agent 接到**用户已存在的本地 Obsidian vault**——"一个 Obsidian vault 本质上
  就是磁盘上的一堆 Markdown 文件……不需要 MCP server，也不需要 OAuth" [documented：README，
  registry 全文载明]。12 个 `obsidian_*` 工具：list / search / read / frontmatter / backlinks /
  write / append / move / delete / set_property / delete_property / tags。
- **检索机制** [affordance：src/search.ts]：**全文扫描**（每文件逐行、case-fold 含义匹配，
  返回命中行±上下文；ripgrep 只是可选加速器，失败自动回退内置 walk）。**没有文件名索引、
  没有互链图服务**——backlinks = `extractLinkTargets`（正则与我们几乎同款）+ `resolveLinkTarget`
  按 basename 唯一匹配，纯调用期现算 [affordance：src/wikilink.ts]。**与我们"反链不建索引"
  的立场完全同源，且证明了这条路在插件形态也够用。**
- **链接更新**：`obsidian_move` "纯文件系统同步更新 `[[链接]]`"；0.2.2 起按 Obsidian 规则唯一
  解析——"同名笔记不再被误判，歧义链接不再被误改" [documented：README changelog]。
- **vault 路径配置**：显式 `vaultPath` 优先，否则从各平台 `obsidian.json` 自动探测；路径不可
  越出 vault 根；删除只进 `.trash/`；不碰 `.obsidian/` [documented：README]。
- **license/维护/依赖**：MIT；单人（zengming21）；2026-08-16 首发 → 2026-09-12 v0.2.5，7 版
  高频迭代 [documented：registry time 字段]；运行时依赖仅 `yaml@^2.7.0`（fileCount=7，
  unpacked ~51KB）——**极轻**。README 自称已验证至 dsh v0.1.5-alpha.1（兼容矩阵列到
  v0.1.2-alpha.x 全系）[documented]；与我们 pin（0.1.5-rc.2）同 minor 线，是我们普查过的
  插件里兼容线最新的之一。
- **判据速评**：①纯文件直读写，vault 永远是普通文件夹——赔得起；②它的写操作不跑治理检查
  （无 validate 类工具），坏 frontmatter 靠 Obsidian 应用侧兜底——弱于我们 curate；③标准
  DSH 插件（cordis.patch + peerDeps `@deepseek-ai/cordis/dsh-tools/schemastery`）原生可挂；
  ④工具描述克制、无常驻注入面（README 未见 systemPrompt 段）；⑤MIT+极轻+活跃，但单人
  维护单点、发布仅一个月。
- **与我们的关系**：它不解决 §一 的失配——它的 wikilink 解析（basename 唯一匹配）与 Obsidian
  一致、与我们（id→title）不一致。若把它指向**家的 knowledge/**（当 vaultPath），它看到的
  名字链接同样是 unresolved；若指向**用户自己的外部 vault**，则是完全独立的第二个知识面。

---

## 四、官方 scope obsidian 插件成色（@deepseek-ai/dsh-client-ui-obsidian）

- **npm 上不存在**：registry.npmjs.org/@deepseek-ai/dsh-client-ui-obsidian → **HTTP 404**
  （本次会话亲测）[documented absence]。维持 r3 §4.3⑤ 的结论：tarball-only，经商店目录分发，
  repo=gxpppp/dsh-obsidian，tarball 从该 repo release 下载，**不是 npm 的 @deepseek-ai 官方
  发布**。
- r3 已解剖过 tarball：25 个 `obsidian_*` 工具 + 需装 Obsidian 侧 IPC companion 才有编辑器/
  命令类工具；SHA-256 修订、乐观锁、realpath 围栏，工程质量不低；但 README 自述钉死
  "targets DSH 0.1.2-alpha.2 exactly"——落后我们 pin 三条 alpha/rc 线 [observed：r3 调研
  记录，本次未重复解剖]。
- **结论（答 shortlist 未决 3）**：`@deepseek-ai` scope 是**目录登记名，非官方采纳信号**。
  名字与来源不可信等级不变；装前必须以 gxpppp repo 为准核版本。对我们的决策无增量：其
  IPC companion 路线（要 Obsidian 应用配合）还比 dsh-obsidian 的纯文件路线离"MD/文件系统
  原生"更远。

---

## 五、llm-wiki 与 memory-wiki-bridge 的增量判断

### 5.1 @detpecca/dsh-llm-wiki

- **npm 404**（registry.npmjs.org/@detpecca/dsh-llm-wiki，本次亲测）[documented absence]——
  证实 r3 的 GitHub-only 判断。GitHub 侧（github.com/detpecca/dsh-llm-wiki）本次三次 fetch
  失败（超时/连接失败，附 B），源码与 README 未取得一手。
- 仅有的信息仍是 shortlist 的目录转述：v0.1.x、2026-08-18、"wiki_search/read/stats/
  **validate/fix**/errors 工具" [observed：r3 shortlist 存档]。validate/fix 的"机器养护"
  与我们 curate 同哲学，但 **fix（自动修复）恰是我们明确不做的方向**（纯函数报告、编辑即
  评审），且不可 npm 安装的 GitHub-only 单人包按判据⑤直接出局。**无增量，建议从候选池除名。**

### 5.2 @dsh-enhanced/memory-wiki-bridge

- 数据基线：registry 2026-09-24 fetch，latest **0.1.43**（r3 记 0.1.42→现已 +1 版），MIT，
  22-ai-00，2026-08-27 首发 30 版高频；peerDeps 钉 `@deepseek-ai/dsh-agent >=0.1.2-rc.1
  <0.2.0` + **强绑 @dsh-enhanced/personal-wiki 与 personal-memory**（<0.2.0）[documented：
  registry 元数据]。description 一句话未变："Proposal-only, provenance-stable promotion
  between DSH personal Memory and Wiki."
- **对我们还有没有增量**（shortlist 未决 1，r5 时点重答）：**没有运行时增量。** 我们的知识页
  已落地（save_page/pin/promote 三条 provenance 指针路径，docs/home.md §二），其
  knowledge_promote/knowledge_pin 的两条显式晋升语义我们已按 r3 §7.2-5 **借语义不借包**实现。
  它的 bridge 还要求两端都是 @dsh-enhanced 自己的 wiki/memory——挂它等于引入整个全家桶
  （state.sqlite + 审批闭环），与硬过滤（纯 MD/文件系统原生）冲突。
- **残余借鉴点**（事实性）：其幂等键含"源 ids+versions+规范化内容"的 provenance-stable
  设计，若未来我们 pin/promote 需要防重复晋升，可在我们纯文件侧做同款键（比较 generated.at
  + 内容哈希）——一条线，不是一个包。

---

## 六、最小互通路径选项

| 选项 | 内容 | 得失（对照判据） |
|---|---|---|
| **A. 什么都不做** | 现状。人要看就用任意编辑器读 MD | 零成本零风险；放弃 Obsidian 的图/反链/补全体验（用户 wiki 偏好打折扣） |
| **B. 人用 Obsidian 开家的 knowledge/（只读浏览 + 手改 status/正文的窄用）** | 把 `knowledge/` 单目录开成 vault；约定：嵌套 frontmatter 不用属性 UI 碰、重命名在仓侧做（或做后跑 curate） | 零代码。收益：graph 视图、标签面板（tags 字段直接生效）、draft→stable 手改即人审的体验最好。**但名字链接全 unresolved，点击建页是分叉陷阱**——除非约定"链接只写全 id"（人不可读）或接受 unresolved 显示 |
| **C. 挂 dsh-obsidian 处理用户外部 vault** | 用户的个人 Obsidian vault 成为 agent 可检索面（第二知识源） | 与家的 knowledge/ 互补不冲突；MIT 极轻、同 minor 线。风险：单人维护、无治理检查（写坏 frontmatter 无人报）；建议先只读场景（search/read/backlinks） |
| **D. 双向（家 ↔ 外部 vault 互写）** | C + 往用户 vault 写页 | 两套解析语义 + 两套治理的乘积面；当前无需求信号，不取 |
| **E.（若真要 B 的链接体验）小改我们侧** | 三选一：① 写页时把 title 同步进 frontmatter `aliases`（Obsidian 补全可达）；② 链接规范改为"全 id 链接"（双解析器都认，牺牲可读性）；③ 解析器加第三优先级：basename 匹配（对齐 Obsidian）。**这是改动建议，非本调研决定** | 均为百行内纯核改动；①②不改解析器，③改 resolveWikiLink 一处 |

---

## 末、go/no-go 与可借鉴清单（事实性列出，不做最终决定——委托方复核后转 proposed）

**承重事实（复核对象）**：

1. "Obsidian 兼容"声称**半真**：三形态语法双方同构（正则几乎逐字相同，含 dsh-obsidian 的
   实现），但**解析键不同**——我们 id→title，Obsidian（与 dsh-obsidian）basename→aliases。
   名字链接在 Obsidian 侧全部 unresolved，点击建页会分叉图 [affordance+documented，§一]。
2. frontmatter 面基本无害：`tags` 是 Obsidian 默认属性（红利）；嵌套字段
   （generated/verified/sources）Obsidian 属性 UI 不支持，需 Source 模式编辑
   [documented，§二]。
3. `@deepseek-ai/dsh-client-ui-obsidian` npm 404、tarball-only、钉 0.1.2-alpha.2——**非官方
   采纳**，scope 名不可信 [documented absence + r3 记录，§四]。
4. `@detpecca/dsh-llm-wiki` npm 404 + GitHub 不可达（本次），GitHub-only 单人包，validate/fix
   中 fix 与我们"只报告不修复"哲学相反——无增量 [documented absence，§5.1]。
5. `@dsh-enhanced/memory-wiki-bridge`（0.1.43）强绑自家全家桶，其 promote/pin 语义我们已
   落地等价物；残余可借鉴仅"幂等键含源版本+内容哈希"一条线 [documented registry +
   affordance docs/home.md，§5.2]。

**dsh-obsidian 值不值（问题二的答）**：作为**外部 vault 的 agent 检索面**——值得挂（或至少
值得作为我们未来"外部知识源工具"的形状参照）：MIT、依赖一个 yaml 包、同 minor 兼容线、
检索=全文现算+反链纯文件扫描（与我们哲学同源）、安全围栏齐全。作为**家的 knowledge/ 的
互通方案**——不值：它的解析键与 Obsidian 一致而与我们不一致，不解决失配一。活跃度风险
（单人、发布满月）按 r3 判例属"语义参考库，随取随用"。

**最小路径建议（供提案讨论）**：B（人开 knowledge/ 当 vault，窄用）零代码即可做，配两条使用
纪律（别点 unresolved 链接建页、嵌套字段走 Source 模式）；C（挂 dsh-obsidian 管外部 vault）
独立正交、判据全绿；E 的三个小改选项留待委托方拍板要不要把"名字链接在 Obsidian 也可点"
变成真承诺——**不拍板则应把 docs/home.md 里"Obsidian 兼容"的措辞收敛为"语法兼容、解析键
差异见 r5"**，避免下一个人再误信一次。

**可借鉴清单（事实性）**：

- dsh-obsidian `wikilink.ts`：basename 唯一匹配才解析（多命中返回 null）——与我们 ambiguous
  error 同哲学的另一种表达 [affordance URL 见附 A]。
- dsh-obsidian `search.ts`：全文扫描 + 可选 ripgrep 加速自动回退——未来知识检索加压时的参照。
- Obsidian `aliases` 机制：frontmatter 列表属性作第二解析键——E-① 的依据。
- memory-wiki-bridge 幂等键设计（源 ids+versions+规范化内容）。
- Obsidian 官方对互操作的自我表述：别名链接生成 `[[真名|别名]]` "to ensure interoperability
  with other applications using the Wikilink format"——**官方也认为裸别名链接不可移植**，
  这是我们失配一的最佳旁证 [documented：Aliases]。

---

## 附 A：版本基线与来源总表（查证时点 2026-09-24）

| 对象 | 版本/日期 | license | 来源 |
|---|---|---|---|
| 本仓 knowledge 纯核 | HEAD 2026-09-24 | — | [affordance] src/knowledge/page.ts、health.ts、src/index.ts L575-616、src/research/thread.ts L62-66、src/home/room.ts、docs/home.md |
| Obsidian Internal links / Aliases / Properties | obsidian-help master（tree sha bc5b4f2，2026-09-24 fetch） | 官方文档 | raw.githubusercontent.com/obsidianmd/obsidian-help/master/en/Linking%20notes%20and%20files/Internal%20links.md（同目录 Aliases.md）；en/Editing%20and%20formatting/Properties.md |
| dsh-obsidian | 0.2.5（2026-09-12 发布） | MIT | registry.npmjs.org/dsh-obsidian；github.com/mingzeng21/dsh-obsidian src/wikilink.ts、src/search.ts（raw fetch 成功） |
| @deepseek-ai/dsh-client-ui-obsidian | npm 404（tarball 0.4.0，r3 记录） | MIT（自称） | registry 404 亲测；r3 survey §4.3⑤ 解剖记录 |
| @detpecca/dsh-llm-wiki | npm 404；GitHub fetch 失败 | — | registry 404 亲测；仅 shortlist 目录转述 [observed] |
| @dsh-enhanced/memory-wiki-bridge | 0.1.43（2026-09-24T08:01Z） | MIT | registry.npmjs.org/@dsh-enhanced/memory-wiki-bridge |
| DSH pin | dsh-v0.1.5-rc.2 | — | vendor/dsh（本仓） |

## 附 B：fetch 失败/缺口记录（如实）

- `@detpecca/dsh-llm-wiki` GitHub 仓库页与 raw README：三次尝试（web_fetch×2、含 master 分支）
  均超时/连接失败——其 validate/fix 工具面只能以 r3 shortlist 目录转述为证 [observed]，
  未取得一手。
- `mingzeng21/dsh-obsidian` 的 `src/wikilink.ts`、`src/search.ts`：web_fetch 与 curl 多次超时，
  最终 curl 重试成功（内容已引用）；`src/tools.ts`、`src/fs-access.ts`、LICENSE 未取得——
  license 以 npm registry `license: MIT` 字段为准 [documented]。
- obsidian-help 仓库全树 API 响应被截断（recursive tree 太大），改走 contents API 逐目录定位
  后 raw fetch 成功；`en/Internal links.md`（旧路径）404，现行路径为
  `en/Linking notes and files/Internal links.md`。
- `raw.githubusercontent.com/obsidianmd/.../Properties.md` 首次超时，重试成功。
- 手写裸 `[[alias]]` 链接在 Obsidian 应用里是否解析（文档只载补全行为）——未跑应用，本报告
  不下结论，已在 §1.1-4 标注为开放点。
