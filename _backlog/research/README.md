# research/ · 喂活跃卡片的调研

> 原料堆：为 [`issues/`](../issues/README.md) 和 [`bugs/`](../bugs/README.md) 里的卡收集的证据阅读、综述、机制笔记。
> 卡只放问题、候选和倾向。地图在 [`../README.md`](../README.md)。

## 契约

- **什么进来**：值得保留、服务于**活跃**卡片的调研——推敲时收集、被卡片引用、喂它的毕业判断。
  半成品合法。
- **什么不进**：一次性草稿（留在树外，见根 `AGENTS.md`）；价值超过所有喂过的卡片的材料
  （留存参考语义归 [notes/archived/](../../notes/README.md)——调研卡的收卷证据台账不变）。
- **命名**：`YYMMDD-<slug>.md`（本仓推敲卡的日期格式），以它服务的卡或主题起名；卡片链接它。
- **主题子目录（2026-10-05 用户拍板）**：材料按主题分装进子目录（`upstream/` = DSH 上游递交面、
  `positioning/` = 定位与打动管理层、`tech-exploration/` = 技术定调与技术实验），**文件名与证据正文保留，相对链接随位置修复**；新主题开新子目录，根目录不再平铺。
  索引记**含子目录的路径**；毕业时随卡 `git mv`，子目录结构随材料走。
- **无状态行**：不把原料伪装成结论。制度级索引互查要求本区文件（含主题子目录）被本 README 点名；活跃正文的相对链接复用 verify 现有纯核。该结构检查不验证证据质量、URL/anchors 或实现/效果，对活跃 `issues/` 和 `bugs/` 同样适用。
- **生命周期——跟着卡片走**：卡片毕业时 `git mv` 到
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

research 喂 `issues/` 和 `bugs/`。推敲有了结论才进 notes，缺陷修好才离开 `bugs/`。材料可喂多张卡，最后一个活跃消费者毕业后才随迁。校准可以加纠正说明。搬迁保留证据正文，并修可解析链接。冻结的 `_archive/` 不纳入正文断链扫描。缺口与修复边界见 [技术审计](tech-exploration/261005-turnaround-evidence-audit.md)。

## 索引

按子目录排。活卡是现在 [`issues/`](../issues/README.md) 或 [`bugs/`](../bugs/README.md) 里还链着这篇的卡。原卡是立档时喂的那张，已经在 [`settled_issues/`](../_archive/settled_issues/README.md)。调研本身不写 `status`。最后一个活跃消费者毕业后，文件仍按上面的生命周期搬走；原卡行只写明它喂过谁。

### positioning/

- [261005-chinese-sme-boss.md](positioning/261005-chinese-sme-boss.md)——活卡：[261007-opening-brief-and-rhythm](../issues/261007-opening-brief-and-rhythm.md)、[261007-input-boundary](../issues/261007-input-boundary.md)。中国中小企业一把手工作画像
- [261005-exec-demo-narratives.md](positioning/261005-exec-demo-narratives.md)——活卡：[261007-input-boundary](../issues/261007-input-boundary.md)。面向 CEO/CFO 的十分钟演示叙事
- [261005-ceo-time-and-decision-research.md](positioning/261005-ceo-time-and-decision-research.md)——活卡：[261007-input-boundary](../issues/261007-input-boundary.md)。一把手时间分配与决策过程
- [261005-ceo-viewpoint-synthesis.md](positioning/261005-ceo-viewpoint-synthesis.md)——原卡：[261005-open-value-deficit](../_archive/settled_issues/261005-open-value-deficit.md)。三路资料与 trial 产物的合成档
- [261005-ceo-voices.md](positioning/261005-ceo-voices.md)——原卡：[261005-open-value-deficit](../_archive/settled_issues/261005-open-value-deficit.md)。一把手声音与 CoS 方法论
- [261005-external-ux-patterns.md](positioning/261005-external-ux-patterns.md)——原卡：[261005-open-value-deficit](../_archive/settled_issues/261005-open-value-deficit.md)。外部同类产品首跑 UX
- [261005-substitute-landscape.md](positioning/261005-substitute-landscape.md)——原卡：[261005-open-value-deficit](../_archive/settled_issues/261005-open-value-deficit.md)。替代品格局
- [261005-coding-agent-exec-barrier.md](positioning/261005-coding-agent-exec-barrier.md)——原卡：[261005-open-value-deficit](../_archive/settled_issues/261005-open-value-deficit.md)。管理层对 coding agent 的却步点
- [261005-demo-walk-and-script-v0.md](positioning/261005-demo-walk-and-script-v0.md)——原卡：[261005-open-value-deficit](../_archive/settled_issues/261005-open-value-deficit.md)。十分钟走查与演示脚本骨架
- [261005-ux-path-annotated-simulation.md](positioning/261005-ux-path-annotated-simulation.md)——原卡：[261005-turnaround-coherence](../_archive/settled_issues/261005-turnaround-coherence.md)。UX 路径纸面走查
- [261005-prototype-cases-and-interview-method.md](positioning/261005-prototype-cases-and-interview-method.md)——原卡：[261005-turnaround-coherence](../_archive/settled_issues/261005-turnaround-coherence.md)。公开案例线索与访谈方法，正文未取回
- [261005-interview-learning-framework.md](positioning/261005-interview-learning-framework.md)——原卡：[261005-open-value-deficit](../_archive/settled_issues/261005-open-value-deficit.md)、[261005-turnaround-coherence](../_archive/settled_issues/261005-turnaround-coherence.md)。短访谈与积累候选

### upstream/

- [261001-upstream-candidates.md](upstream/261001-upstream-candidates.md)——原卡：[261001-first-open-ux](../_archive/settled_issues/261001-first-open-ux.md)。vendor 面上游候选台账
- [261001-upstream-issue-drafts.md](upstream/261001-upstream-issue-drafts.md)——原卡：[261001-first-open-ux](../_archive/settled_issues/261001-first-open-ux.md)。6 条上游 issue 递交草案

### tech-exploration/

- [261005-okf-wiki-tech-case.md](tech-exploration/261005-okf-wiki-tech-case.md)——原卡：[261005-open-value-deficit](../_archive/settled_issues/261005-open-value-deficit.md)、[261005-turnaround-coherence](../_archive/settled_issues/261005-turnaround-coherence.md)。OKF/WIKI 能力边界
- [261005-dsh-native-first-tech-keynote.md](tech-exploration/261005-dsh-native-first-tech-keynote.md)——原卡：[261005-open-value-deficit](../_archive/settled_issues/261005-open-value-deficit.md)。DSH 原生优先的技术定调
- [261005-turnaround-evidence-audit.md](tech-exploration/261005-turnaround-evidence-audit.md)——原卡：[261005-open-value-deficit](../_archive/settled_issues/261005-open-value-deficit.md)、[261005-turnaround-coherence](../_archive/settled_issues/261005-turnaround-coherence.md)。一手代码审计
