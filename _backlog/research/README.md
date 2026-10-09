# research/ · 卡片的调研依据

> 原料堆：为 [`issues/`](../issues/README.md) 和 [`bugs/`](../bugs/README.md) 里的卡收集的证据阅读、综述、机制笔记。
> 短结论写回卡片，较长的依据放这里。先从卡片链接读取需要的材料，不必通读目录；流程在 [backlog 入口](../README.md)。

## 契约

- **什么进来**：值得保留、服务于**活跃**卡片的调研——推敲时收集、被卡片引用、帮助形成结论。
  半成品合法。
- **什么不进**：一次性草稿（留在树外，见根 `AGENTS.md`）。有超过原卡范围的长期用途时，说明用途并向 [下游](../../notes/README.md) 申请处理，是否形成 note 由下游决定。
- **命名**：`YYMMDD-<slug>.md`（本仓推敲卡的日期格式），以它服务的卡或主题起名；卡片链接它。
- **主题子目录（2026-10-05 用户拍板）**：材料按主题分装进子目录（`upstream/` = DSH 上游递交面、
  `positioning/` = 定位与打动管理层、`tech-exploration/` = 技术定调与技术实验），**文件名与证据正文保留，相对链接随位置修复**；新主题开新子目录，根目录不再平铺。
  索引记**含子目录的路径**；最后一张使用它的活卡关闭时随迁，子目录结构随材料走。
- **无状态行**：不把原料伪装成结论。制度级索引互查要求本区文件（含主题子目录）被本 README 点名；活跃正文的相对链接复用 verify 现有纯核。该结构检查不验证证据质量、URL/anchors 或实现/效果，对活跃 `issues/` 和 `bugs/` 同样适用。
- **生命周期——跟着卡片走**：最后一张使用它的活卡关闭时 `git mv` 到
  [`../_archive/research/`](../_archive/research/)，文件名、frontmatter 与历史证据正文保留，修可解析链接。喂完最后一张卡的
  材料不留在这里。

## frontmatter

新条目照这个写。文件第一行是 `---`，字段顺序固定，第一项是 `topic`。不写 `status`。

```yaml
---
topic: 定位
intent: "背后那一句思路。"
---
```

| 字段 | 写什么 |
|---|---|
| `topic` | 跟子目录走。`positioning/` 写 `定位`，`upstream/` 写 `上游`，`tech-exploration/` 写 `技术`。新主题先开子目录，`topic` 用一个短中文词，和这个目录对应 |
| `intent` | 一行，加引号。写这篇为什么存在、背后的思路，不写证据正文 |

搬走时 `topic` 和 `intent` 不动。随卡进 [`_archive/research/`](../_archive/research/README.md)。

## 使用与校准

证据不必迎合方向。原始资料保留 URL、原句、样本/版本、获取限制与反证；合成档分开引用事实和产品推论。候选演示/实验写清实现状态，不从 schema、官网或代理读数推出收益/真实采纳。

research 为问题和缺陷提供依据。问题按 [关闭条件](../README.md) 交接或关闭；缺陷按 [缺陷规则](../bugs/README.md) 离场，包括查明未修后的挂起。材料可以供多张卡使用，最后一张活卡关闭后才随迁。校准可以加纠正说明；搬迁保留证据正文并修相对链接。冻结的 `_archive/` 不纳入正文断链扫描。历史修复边界在已随卡归档的 [技术审计](../_archive/research/tech-exploration/261005-turnaround-evidence-audit.md)。

## 索引

先按当前使用关系分组。“活卡”表示正文直接引用；“间接使用”写明引用链和用途。“原卡”只说明立档背景，不证明现在还有使用者。没有任何活卡正文引用的材料，随迁到 [调研归档](../_archive/research/README.md)。调研不写 `status`。

### 活卡直接使用

从活卡链接进入，按正在解决的问题选读。

- [261005-chinese-sme-boss.md](positioning/261005-chinese-sme-boss.md)——活卡：[261007-opening-brief-and-rhythm](../issues/261007-opening-brief-and-rhythm.md) 用口语化红线；[261007-input-boundary](../issues/261007-input-boundary.md) 用五谷渔粉案例作需求线索。中国中小企业一把手工作画像
- [261005-exec-demo-narratives.md](positioning/261005-exec-demo-narratives.md)——活卡：[261007-input-boundary](../issues/261007-input-boundary.md) 只用它划清 Huper 式全量接入的边界。面向 CEO/CFO 的十分钟演示叙事
- [261005-ceo-time-and-decision-research.md](positioning/261005-ceo-time-and-decision-research.md)——活卡：[261007-input-boundary](../issues/261007-input-boundary.md) 用它说明时间碎片和输入特点。一把手时间分配与决策过程

### 间接使用

只在需要核实对应引用链时进入。

- [261005-external-ux-patterns.md](positioning/261005-external-ux-patterns.md)——间接使用：[输入边界卡](../issues/261007-input-boundary.md) → [演示叙事](positioning/261005-exec-demo-narratives.md) → 本篇，仅作资料抓取限制的旁证；原卡：[261005-open-value-deficit](../_archive/settled_issues/261005-open-value-deficit.md)。外部同类产品首跑 UX
