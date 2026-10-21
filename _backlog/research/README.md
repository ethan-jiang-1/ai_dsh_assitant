# research/ · 卡片的调研依据

> 原料堆：为 [`issues/`](../issues/README.md) 和 [`bugs/`](../bugs/README.md) 里的卡收集的证据阅读、综述、机制笔记。
> 短结论写回卡片，较长的依据放这里。先从卡片链接读取需要的材料，不必通读目录；流程在 [backlog 入口](../README.md)。

## 契约

- **什么进来**：值得保留、服务于**活跃**卡片的调研——推敲时收集、被卡片引用、帮助形成结论。
  半成品合法。
- **什么不进**：一次性草稿（留在树外，见根 `AGENTS.md`）。有超过原卡范围的长期用途时，说明用途并向 [下游](../../notes/README.md) 申请处理，是否形成 note 由下游决定。
- **命名**：`YYMMDD-<slug>.md`（本仓推敲卡的日期格式），以它服务的卡或主题起名；卡片链接它。
- **主题子目录（2026-10-05 用户拍板）**：材料按主题分装进子目录（`upstream/` = DSH 上游递交面、
  `positioning/` = 定位与打动管理层、`self-update/` = 助手怎么学到东西与学到了怎么维护、
  `memory-panel/` = 记忆/知识面板的外部产品先例、
  `tech-exploration/` = 技术定调与技术实验、`usage/` = 真实使用观察），**文件名与证据正文保留，相对链接随位置修复**；新主题开新子目录，根目录不再平铺。
  子目录**随材料在档而在**（材料不再被取用即整目录随迁，见「使用与校准」）：当前在档 `positioning/`、`usage/`、`tech-exploration/`（261020 六维深审重开）；`upstream/`、`self-update/`、`memory-panel/` 已迁入调研归档，再需要时新开同名目录即可。
  索引记**含子目录的路径**。
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
| `topic` | 跟子目录走。`positioning/` 写 `定位`，`self-update/` 写 `自更新`，`memory-panel/` 写 `记忆面板`，`upstream/` 写 `上游`，`tech-exploration/` 写 `技术`，`usage/` 写 `使用`。新主题先开子目录，`topic` 用一个短中文词，和这个目录对应 |
| `intent` | 一行，加引号。写这篇为什么存在、背后的思路，不写证据正文 |

搬走时 `topic` 和 `intent` 不动。随卡进 [`_archive/research/`](../_archive/research/README.md)。

## 使用与校准

证据不必迎合方向。原始资料保留 URL、原句、样本/版本、获取限制与反证；合成档分开引用事实和产品推论。候选演示/实验写清实现状态，不从 schema、官网或代理读数推出收益/真实采纳。

research 为问题和缺陷提供依据。问题按 [关闭条件](../README.md) 交接或关闭；缺陷按 [缺陷规则](../bugs/README.md) 离场，包括查明未修后的挂起。材料可以供多张卡使用，最后一张活卡关闭后才随迁。校准可以加纠正说明；搬迁保留证据正文并修相对链接。冻结的 `_archive/` 不纳入正文断链扫描。历史修复边界在已随卡归档的 [技术审计](../_archive/research/tech-exploration/261005-turnaround-evidence-audit.md)。

## 索引

先按当前使用关系分组。**引用卡**（下表「引用卡：」）= 正文直接引用该材料的卡——多已结档，但结论仍被 [`README.md`](../../README.md) 的方向判据或活触发行取用，故材料留在活跃区；`usage/` 的 30 天读数档是**活观察**（被 [triggers.md](../triggers.md) 点名），观察期结束前不迁。「间接使用」写明引用链和用途。「原卡」只说明立档背景，不证明现在还有使用者。引用它的卡全部结档、且结论已不再被任何方向判据或触发行取用的材料，随迁到 [调研归档](../_archive/research/README.md)。调研不写 `status`。

### 直接引用

从引用卡链接进入，按正在解决的问题选读。

- [261020-six-dimension-housekeeping-audit.md](tech-exploration/261020-six-dimension-housekeeping-audit.md)——引用卡：无（2026-10-20 用户点名六维深审，本档是本轮 REVIEW 的直接输入；改善项立项后由对应卡引用）。六维打扫卫生深审发现报告：五路 fresh 审计员 + 主线对抗复核；S1–S5 战役复核结论（立住）、26 条分级发现、改善三批次路线、banner 场景活体复验 PASS

- [261021-assistant-ui-modes.md](tech-exploration/261021-assistant-ui-modes.md)——引用卡：[三档界面](../issues/261021-assistant-ui-modes.md)（研究完成；等 Viki 收口 + 用户拍板）。三档呈现的平台缝、现有面清单、候选架构、矩阵与证据

- [261021-recall-ab.md](tech-exploration/261021-recall-ab.md)——引用卡：[检索卡](../issues/261020-openviking-retrieval-viki.md)（A/B 题集/评分表已产出；A1/A2 原型待建，不进发布物）。只读检索 A/B 的 12 题、评分表与 A1/A2 原型约定

- [261011-input-observation.md](usage/261011-input-observation.md)——引用卡：[输入边界](../_archive/settled_issues/261007-input-boundary.md)（**活观察**：读数档被 [triggers.md](../triggers.md) 的触发行点名，30 天观察期结束前留在活跃区）。30 天输入观察的读数档：A 自发投递 / B 时长 / C 入口后的操作的口径、剔除规则、环境创建约定与每周快照（读数命令 `pnpm observe`）
- [261005-exec-demo-narratives.md](positioning/261005-exec-demo-narratives.md)——间接使用：[差异性对照](positioning/261012-personal-agent-differentiation.md) 引用其 Huper 边界与 CFO 证据行；原引用卡（输入边界）已结档。面向 CEO/CFO 的十分钟演示叙事
- [261005-ceo-time-and-decision-research.md](positioning/261005-ceo-time-and-decision-research.md)——间接使用：[差异性对照](positioning/261012-personal-agent-differentiation.md) 两处引用（一把手时间与真实需求）；原引用卡（输入边界）已结档。一把手时间分配与决策过程

### 间接使用

只在需要核实对应引用链时进入。

- [261005-external-ux-patterns.md](positioning/261005-external-ux-patterns.md)——间接使用：[输入边界卡](../_archive/settled_issues/261007-input-boundary.md) → [演示叙事](positioning/261005-exec-demo-narratives.md) → 本篇，仅作资料抓取限制的旁证；原卡：[261005-open-value-deficit](../_archive/settled_issues/261005-open-value-deficit.md)。外部同类产品首跑 UX
- [261012-personal-agent-landscape.md](positioning/261012-personal-agent-landscape.md)——间接使用：2026-10-12 用户直接请求（近月 personal agent 生态）→ [差异性对照](positioning/261012-personal-agent-differentiation.md) 引用本篇；无引用卡，待定位推敲取用。Muse/dots/Instinct/CC/Cowork 的时间线、能力形态、市场反响与未能证实清单
- [261012-personal-agent-differentiation.md](positioning/261012-personal-agent-differentiation.md)——间接使用：同上请求 → 本篇。机制级对照本仓产品（对着 [README.md](../../README.md) 判据）：合理性论据、steelman 威胁表、逐维度对比与借鉴清单；无引用卡，待定位推敲取用
- [261012-decision-continuity-evidence.md](positioning/261012-decision-continuity-evidence.md)——间接使用：2026-10-12 用户要求网络验证「经营事项连续性层」假设 → 本篇。区分组织执行连续性、个人管理者记忆问题与产品效果证据，含支持、反证、来源限制与本仓待验证项
