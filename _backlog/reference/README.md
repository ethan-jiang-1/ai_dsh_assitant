# reference/ · 服务于活跃卡片的调研材料

> 推敲空间的原料堆：为 [plans/](../plans/README.md) 与 [bugs/](../bugs/README.md) 里的卡片做推敲时
> 产出的证据阅读、综述、机制笔记。它承载推敲的**证据半边**——卡片的倾向由它喂出来；卡片本体
> 只放问题、候选与倾向。规矩手册 = [`../README.md`](../README.md)。

## 契约

- **什么进来**：值得保留、服务于**活跃**卡片的调研——推敲时收集、被卡片引用、喂它的毕业判断。
  半成品合法。
- **什么不进**：一次性草稿（留在树外，见根 `AGENTS.md`）；价值超过所有喂过的卡片的材料
  （留存参考语义归 [notes/archived/](../../notes/README.md)——调研卡的收卷证据台账不变）。
- **命名**：`YYMMDD-<slug>.md`（本仓推敲卡的日期格式），以它服务的卡或主题起名；卡片链接它。
- **主题子目录（2026-10-05 用户拍板）**：材料按主题分装进子目录（`upstream/` = DSH 上游递交面、
  `positioning/` = 定位与打动管理层、`tech-exploration/` = 技术定调与技术实验），**文件名与证据正文保留，相对链接随位置修复**；新主题开新子目录，根目录不再平铺。
  索引记**含子目录的路径**；毕业时随卡 `git mv`，子目录结构随材料走。
- **无状态行、无逐文件研究质量门禁**：不强迫原料伪装成结论。制度级索引互查要求本区文件（含主题子目录）被本 README 点名；活跃正文的相对链接复用 verify 现有纯核。该结构检查不验证证据质量、URL/anchors 或实现/效果，对活跃 `plans/` 与 `bugs/` 同样适用。
- **生命周期——跟着卡片走**：卡片毕业时 `git mv` 到
  [`../_done/_reference/`](../_done/_reference/)，文件名与历史证据正文保留，修可解析链接。喂完最后一张卡的
  材料不留在这里。

## 使用与校准

证据不必迎合方向。原始资料保留 URL、原句、样本/版本、获取限制与反证；合成档分开引用事实和产品推论。候选演示/实验写清实现状态，不从 schema、官网或代理读数推出收益/真实采纳。

reference → plans → proposed 是证据到裁决的关系，不是三份活计划。材料可喂多张卡，最后一个活跃消费者毕业后才随迁；校准可以加纠正说明/修解释，毕业搬迁保留证据正文但修可解析链接。本轮修复了 verify 漏扫活跃 backlog 正文的语料接线，相对链接现在纳入常设检查，冻结 `_done` 不扩扫；原缺口与最终修复边界见 [技术审计](tech-exploration/261005-turnaround-evidence-audit.md)。

## 索引

- [261005-prototype-cases-and-interview-method.md](positioning/261005-prototype-cases-and-interview-method.md)——公开一手来源线索与访问限制；正文未取回，具体案例验收未达；模拟变式支持原型设计，不作已核重放/真人证据
- [261005-interview-learning-framework.md](positioning/261005-interview-learning-framework.md)——短访谈、案例记录与知识/偏好/技能积累候选：来源/范围/例外、前后/未见病例验证、现有载体与未建闭环

- [261001-upstream-candidates.md](upstream/261001-upstream-candidates.md)——vendor 面上游候选台账（喂 261001-first-open-ux：9 稳定 + 3 条件 + 2 已关闭，逐条带 vendor 锚点）
- [261001-upstream-issue-drafts.md](upstream/261001-upstream-issue-drafts.md)——6 条上游 issue 递交草案（D1-D6，英文贴用文本 + 中文摘要；档头记录已放行，尚无已递链接，本轮不递交）
- [261005-external-ux-patterns.md](positioning/261005-external-ux-patterns.md)——外部同类产品首跑 UX 模式调研（喂 261005-open-value-deficit：Clay/Martin/NotebookLM/Limitless 等的首跑、主动价值与主对象）
- [261005-substitute-landscape.md](positioning/261005-substitute-landscape.md)——替代品格局调研（喂 261005-open-value-deficit：ChatGPT/Claude/Gemini 原生记忆现状、AI chief of staff 品类成败 → 我们的真实增量）
- [261005-exec-demo-narratives.md](positioning/261005-exec-demo-narratives.md)——面向 CEO/CFO 的十分钟 AI 演示叙事调研（Lindy/Martin/Day/Reclaim/Huper 营销叙事骨架、向董事会演示 AI 的公开方法、CFO 采纳关注点、演示方法论 → 演示叙事的可借框架）
- [261005-demo-walk-and-script-v0.md](positioning/261005-demo-walk-and-script-v0.md)——现状十分钟管理层走查 + 督办主线演示脚本骨架 v0（喂 261005-open-value-deficit 第 7-9 轮；供攻击的推敲材料）
- [261005-ux-path-annotated-simulation.md](positioning/261005-ux-path-annotated-simulation.md)——UX 路径 v0 纸面走查（喂自洽卡阶段2：打开→给片段→看选项/缺数→拍板→看跟进 六步 × DeskData 现行载体 × 诚实状态标注；reversible-cost-v0 标注模拟场景；首切候选=入口/空态/引导）
- [261005-coding-agent-exec-barrier.md](positioning/261005-coding-agent-exec-barrier.md)——管理层对 coding agent 的却步点调研（喂 261005-open-value-deficit：Codex/Claude Code/ChatGPT Enterprise 官方叙事取证 + 高管真实声音 + 权威调研阻力数字 → 三轴归纳「看不懂/管不住/说不清价值」）
- [261005-chinese-sme-boss.md](positioning/261005-chinese-sme-boss.md)——中国中小企业一把手（含 BU 一把手）工作画像调研（喂 261005-open-value-deficit：时间节律/痛点榜 2024-2026/数字化 AI 采纳/信息流四类取证，附画像卡与未证实清单；web_fetch 受限处改用 curl 并注明）
- [261005-ceo-voices.md](positioning/261005-ceo-voices.md)——真实一把手声音与 CoS 职业方法论调研（喂 261005-open-value-deficit：VandeHei 全司实测一手、三份官方 JD 提炼「雇总助买什么」、Buffett/Bezos/Horowitz 逐字诉求、失败模式 7 条 → 设计红线；BU 级盲区如实标注）
- [261005-ceo-time-and-decision-research.md](positioning/261005-ceo-time-and-decision-research.md)——一把手时间分配与决策过程实证调研（喂 261005-open-value-deficit：CEO 时间研究 60,000 小时数据、pre-mortem/决策日志方法论、执行缺口 85%/27%/1/5 等硬数字、信息环境 MUM effect/CSF/BLUF 四类取证 + 十点产品推论 + 未证实清单；GM/BU 级证据单独标注；web_fetch DNS 故障全程 curl/r.jina.ai/Web Archive 并注明）
- [261005-ceo-viewpoint-synthesis.md](positioning/261005-ceo-viewpoint-synthesis.md)——典型一把手视角与诉求合成档（喂 261005-open-value-deficit 第 17 轮：三路资料×trial 产物形态对照，非真人 n=1；分开样本/解释、诉求假设、十二条推论与引用边界）
- [tech-exploration/261005-okf-wiki-tech-case.md](tech-exploration/261005-okf-wiki-tech-case.md)——OKF/WIKI 能力边界与实验候选（喂定位/自洽卡：schema affordance、可用性四格、等内容结构消融、隔离与未验证结果）
- [tech-exploration/261005-dsh-native-first-tech-keynote.md](tech-exploration/261005-dsh-native-first-tech-keynote.md)——技术定调：OKF/VK 方向与 DSH 原生优先（组合→缝→自建三问尺、现有载体与机会面；收益未验证）
- [261005-turnaround-evidence-audit.md](tech-exploration/261005-turnaround-evidence-audit.md)——本轮一手代码审计（喂定位/自洽卡：UI 审批实际车道、OV 外部存储/peer 与数据流、verify 漏扫 backlog 的事实/反证/待补跑）
- [261007-semantic-sweep-src.md](tech-exploration/261007-semantic-sweep-src.md)——产品源码高风险语义扫描（喂 BUG-003～007：sdlc 06 §4 八维度 × src/ 54 文件，F1-F12 逐条带位置/风险/测试盲区；F1 承重发现委派方亲验；ov-shield 对照 vendor 核实无绕过）
