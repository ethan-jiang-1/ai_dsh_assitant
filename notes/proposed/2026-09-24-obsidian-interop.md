# Obsidian 互通（家的 knowledge 房间 × Obsidian 生态）

日期：2026-09-24 · 状态：**待实施（已拍板 D1=a 窄用+收敛、D2=⏳ 触发；E 转 ⏳，见 ROADMAP）**

## 问题

1. 家的 `knowledge/` 目录直接当 Obsidian vault 打开，人编辑体验如何、什么会坏？（重点疑点：我们页文件是 id 命名、`[[链接]]` 却写名字——Obsidian 按文件名解析，失配行为待逐条分析）
2. `dsh-obsidian` 桥（处理用户自己的外部 vault）值不值得挂/借鉴？

## 当前状态

- 深评落稿：[r5 survey](../research/2026-09-24-r5-obsidian-interop-survey.md)；承重主张已由
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
| D2 | dsh-obsidian 挂不挂 | 挂进 preset（助手可操作用户外部 vault）/ ⏳ 触发型（触发=用户真想让助手管某个外部 vault）/ 只借鉴不挂 |
| D3 | r3 shortlist 收尾 | 官方 scope 线关闭、llm-wiki 除名、memory-wiki-bridge 仅记"幂等键含源版本+内容哈希"借鉴线——随 D1 落地一并归档 |

## 依据

- [R3 shortlist](../research/2026-09-24-r3-knowledge-shortlist.md)（其未决问题 1-4 即本卡深评清单）
- 用户硬过滤（2026-09-24 拍板）：一切方案 MD/文件系统原生，对 AI coding agent 全透明；纯本地。

## 验收（毕业条件）

拍板后按结论实施（a 路线=docs 切片半小时级；b 路线加百行内代码切片）后毕业；E 若转 ⏳
触发型（触发=窄用真被用起来且名字链接不可点成为真实摩擦）则本卡按 a 毕业并留触发条目。
