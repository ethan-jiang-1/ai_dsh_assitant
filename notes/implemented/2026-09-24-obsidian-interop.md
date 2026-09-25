# Obsidian 互通（家的 knowledge 房间 × Obsidian 生态）

日期：2026-09-24 · 状态：**implemented（D1=a 窄用+措辞收敛落地；E 小改于 2026-09-25 触发并落地；dsh-obsidian 挂桥转 ⏳ 触发型留 ROADMAP）**

## 问题

1. 家的 `knowledge/` 目录直接当 Obsidian vault 打开，人编辑体验如何、什么会坏？（重点疑点：我们页文件是 id 命名、`[[链接]]` 却写名字——Obsidian 按文件名解析，失配行为待逐条分析）
2. `dsh-obsidian` 桥（处理用户自己的外部 vault）值不值得挂/借鉴？

## 当前状态

- 深评落稿：[r5 survey](../research/archive/2026-09-24-r5-obsidian-interop-survey.md)；承重主张已由
  委托方亲验（resolveWikiLink id→title 于 page.ts:205-220 逐字对上；官方 scope 包 npm 404
  复测实锤；dsh-obsidian 源码抽查由代理完成）。
- 深评结论：**"Obsidian 兼容"只对了一半**——语法双方逐字同，解析键不同（我们 id→title，
  Obsidian basename→aliases）：名字链接在 Obsidian 全部 unresolved，点击新建空页分叉图、
  回来被 curate 报 error（坏法可见但要一次 round-trip）；frontmatter 基本无害（tags 是红利，
  嵌套字段要 Source 模式）。dsh-obsidian 作外部 vault 检索面判据全绿但单人维护；官方 scope
  包非官方；llm-wiki 无一手且 fix 动词与我们哲学相反（除名）；memory-wiki-bridge 无运行时增量。

## 决策点（待拍板）

| # | 问题 | 选项 |
|---|---|---|
| D1 | 最小互通路径 | a) **B 窄用 + 措辞收敛**：零代码——人把 knowledge/ 单目录开成 vault（graph/tags/draft→stable 手改即人审），两条使用纪律（别点 unresolved 建页、嵌套字段走 Source 模式）进 docs；docs/home.md 的"Obsidian 兼容"收敛为"语法兼容、解析键差异见 r5" b) a + E 小改（save_page 同步 aliases / 全 id 链接 / 解析器加 basename 第三优先级，三选一，百行内）让名字链接真可点 |
| D2 | dsh-obsidian 挂不挂 | 挂进 preset（助手可操作用户外部 vault）/ ⏳ 触发型（触发=用户真想让助手管某个外部 vault；在 ROADMAP）/ 只借鉴不挂 |
| D3 | r3 shortlist 收尾 | 官方 scope 线关闭、llm-wiki 除名、memory-wiki-bridge 仅记"幂等键含源版本+内容哈希"借鉴线——随 D1 落地一并归档 |

## 依据

- [R3 shortlist](../research/archive/2026-09-24-r3-knowledge-shortlist.md)（其未决问题 1-4 即本卡深评清单）
- 用户硬过滤（2026-09-24 拍板）：一切方案 MD/文件系统原生，对 AI coding agent 全透明；纯本地。

## 验收（毕业条件）

拍板后按结论实施（a 路线=docs 切片半小时级；b 路线加百行内代码切片）后毕业；E 若转 ⏳
触发型（触发=窄用真被用起来且名字链接不可点成为真实摩擦；在 ROADMAP）则本卡按 a 毕业并留触发条目。

## 落地（2026-09-24）

- `docs/home.md` knowledge 行后新增 **Obsidian 互通（窄用）**段：语法兼容/解析键差异的
  诚实收敛（我们 id→title，Obsidian basename→aliases，名字链接 unresolved）、单目录开
  vault 的窄用法、两条使用纪律（别点 unresolved 建页——会分叉图且 curate 可见坏法；
  嵌套字段走 Source 模式）；E 小改与 dsh-obsidian 桥的 ⏳ 触发条件指 ROADMAP。
- r3 shortlist 收卷：未决 1-4 由 r5 关闭（官方 scope 404 非官方、llm-wiki 除名、
  memory-wiki-bridge 无增量仅记幂等键借鉴线、断链检查 curate 已有）。

## 落地（2026-09-25 · E 触发：真实摩擦出现）

**触发**：用户真把 `knowledge/` 当 vault 用，报告名字链接点不开——即 D1 里写明的触发条件
（"窄用真被使用且名字链接不可点成为真实摩擦"），本轮不再延后。

**选项 ① 先被证据杀死**：r5 把"写 `aliases` 让名字链接可点"标为开放点（官方文档只承诺补全
行为）。本轮查实为**否**——Obsidian 官方文档自述别名链接生成 `[[真名|别名]]`
"to ensure interoperability"，而 1.12.7 的实测（反编译的 `getLinkpathDest` 只读
`uniqueFileLookup`，该索引只登记文件名、从不登记 `frontmatter.aliases`）显示**裸别名链接不解析、
点击即建新页**，社区回复确认这是"一直如此、刻意设计"
[documented：obsidian-help `Aliases`；observed：forum.obsidian.md/t/113902]。

**因此 D1=b 只取剩下的两条，合成一个形态**（我拍的，可推翻）：

- **链接形态 = ② 全 id + 显示文本**：`[[<id>|<title>]]` 是两个解析器都认的唯一写法
  （Obsidian 按 basename、我们按 id 全等），且显示文本让它在两边、在纯文本里都可读。
- **`aliases` = ① 的残余价值**：每页 `aliases` 镜像自己的 title——它不参与解析，但让人在
  Obsidian 里打 `[[` + 名字能补全到页，而 Obsidian 补全选中的正是 ② 那一形态（官方互操作路径）。
- **写入即规范化**：`save_page` 写入时把可解析的裸名字链接改写成 ②（`normalizeWikiLinks`，
  跳代码跨距、跳带显示文本者、跳解析不到者——未写成的知识仍是信号，不清洗掉）；
  `resolveWikiLink` 顺手容忍 Obsidian 的 `.md` 后缀写法。
- 证据指针：`packages/dsh-smart-assistant/src/knowledge/page.ts`（`normalizeWikiLinks` /
  `parseAliases` / 解析器）、`src/index.ts` `writePage`；夹具 `tests/knowledge-page.spec.ts`
  （规范化四例 + 别名往返 + `.md` 解析）、`tests/knowledge-write.spec.ts`（写入面：id 链接、
  别名、反链成立）；合同措辞 `docs/home.md` Obsidian 段。
- **存量数据**：dev working folder 的 10 页用真实代码路径跑了一遍迁移（正文 25 处名字链接
  全部转成 id 形态、每页补 `aliases`；迁移后 0 未解析链接、二次运行零改动=幂等）。
  dev home 是 gitignore 运行态，不进 diff；备份留在
  `dev/harness-home/assistant/.pre-obsidian-fix-backup/`。

**仍存的边界（不掩盖）**：目标是还没写成的页面时无法规范化（没有 id 可指），这些链接在
Obsidian 侧仍是 unresolved——docs 的纪律因此保留"别点它建页"；页面被写成之后，重写一次
该页或人手补一次即可。

## 输掉的方案

- **b 路线（现在就改 aliases/全 id 链接/解析器加 basename）**：输给触发纪律——窄用还没
  被真实使用过，"名字链接在 Obsidian 不可点"尚不是真实摩擦；百行内三选项已备在
  [r5 §末](../research/archive/2026-09-24-r5-obsidian-interop-survey.md)，触发日任选其一。
  （该触发条件已于 2026-09-25 满足，见上节"落地"。）
- **只加 `aliases`（选项 ① 单独用）**：2026-09-25 证据否掉——别名不参与 Obsidian 的链接
  解析（只进补全），加别名并不能让任何一条既有链接变得可点；它作为**补全入口**保留，与
  id 形态链接配合使用。
- **只给解析器加 basename 第三优先级（选项 ③ 单独用）**：改的是我们这一侧的读法，
  而坏掉的是 Obsidian 这一侧的读法——名字链接在 Obsidian 仍是 unresolved，修不了用户的病；
  `.md` 后缀容忍是它的残余价值，已顺手并入。
- **把页文件名改成可读 title（让 Obsidian 按 basename 直接命中）**：id = 文件名是房间契约，
  且 id 被 `memory:` / `research:` 的 sources 指针与摘要树引用——改名等于让所有既有指针悬空，
  换来的是"文件名好看"。
- **抄社区那 30 行 Obsidian 插件（把 aliases 注册进 `uniqueFileLookup`）**：能修，但把
  vault 的可读性绑到用户机器上装一个插件，违背"MD/文件系统原生、对任何 agent 透明"的硬过滤；
  链接形态是我们自己写的数据，改数据比让每个读者装补丁便宜。
- **写完页后定期批量重写正文链接**：已在写入边界做了规范化，就没有第二个写者；周期性
  重写只会引入"文件在无人操作时自己变"的意外。
- **现在挂 dsh-obsidian**：判据全绿但单人维护 + 用户尚无"助手管外部 vault"的需求；
  其 basename 唯一匹配（多命中拒解析）哲学已录 r5 作参照。

## 触发判定权（用户 2026-09-25 裁决）

E 项（名字链接在 Obsidian 可点）由一次真实使用会话判为触发并落地（提交见该会话）；用户裁决：**保留该实现**，
但补一条纪律——**保留项（队列里标 🔒 的行）的触发只能由用户判定**，会话可以报告"条件看起来已满足"并给建议，
不得自行判触发、删行或实现。纪律落在三处：家手册 v5 的 "Working inside someone else's repository" 节、
ROADMAP 维护规则（机械门禁 `reserved items` 查标记形态）、preset-runner 的每个会话前置指令。
