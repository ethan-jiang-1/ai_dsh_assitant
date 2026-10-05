# reference/ · 服务于活跃卡片的调研材料

> 推敲空间的原料堆：为 [plans/](plans/README.md) 与 [bugs/](bugs/README.md) 里的卡片做推敲时
> 产出的证据阅读、综述、机制笔记。它承载推敲的**证据半边**——卡片的倾向由它喂出来；卡片本体
> 只放问题、候选与倾向。规矩手册 = [`../README.md`](../README.md)。

## 契约

- **什么进来**：值得保留、服务于**活跃**卡片的调研——推敲时收集、被卡片引用、喂它的毕业判断。
  半成品合法。
- **什么不进**：一次性草稿（留在树外，见根 `AGENTS.md`）；价值超过所有喂过的卡片的材料
  （留存参考语义归 [notes/archived/](../../notes/README.md)——调研卡的收卷证据台账不变）。
- **命名**：`YYMMDD-<slug>.md`（本仓推敲卡的日期格式），以它服务的卡或主题起名；卡片链接它。
- **主题子目录（2026-10-05 用户拍板）**：材料按主题分装进子目录（`upstream/` = DSH 上游递交面、
  `positioning/` = 定位与打动管理层、`tech-exploration/` = 技术定调与技术实验），**文件名与内容不变**；新主题开新子目录，根目录不再平铺。
  索引记**含子目录的路径**；毕业时随卡 `git mv`，子目录结构随材料走。
- **无状态行、无逐文件门禁**（2026-10-02 借鉴时的定界）：纯约定；唯一的文件级检查是制度级
  索引互查（本区文件——含子目录内文件，2026-10-05 门禁随分装升为递归——必须被本 README 的
  索引点名），对 `plans/` 与 `bugs/` 同样适用。
- **生命周期——跟着卡片走**：卡片毕业时 `git mv` 到
  [`../_done/_reference/`](../_done/_reference/)，文件名不变、内容不重写。喂完最后一张卡的
  材料不留在这里。

## 索引

- [261001-upstream-candidates.md](upstream/261001-upstream-candidates.md)——vendor 面上游候选台账（喂 261001-first-open-ux：9 稳定 + 3 条件 + 2 已关闭，逐条带 vendor 锚点）
- [261001-upstream-issue-drafts.md](upstream/261001-upstream-issue-drafts.md)——6 条上游 issue 递交草案（D1-D6，英文贴用文本 + 中文摘要；待用户过目后递交）
- [261005-external-ux-patterns.md](positioning/261005-external-ux-patterns.md)——外部同类产品首跑 UX 模式调研（喂 261005-open-value-deficit：Clay/Martin/NotebookLM/Limitless 等的首跑、主动价值与主对象）
- [261005-substitute-landscape.md](positioning/261005-substitute-landscape.md)——替代品格局调研（喂 261005-open-value-deficit：ChatGPT/Claude/Gemini 原生记忆现状、AI chief of staff 品类成败 → 我们的真实增量）
- [261005-exec-demo-narratives.md](positioning/261005-exec-demo-narratives.md)——面向 CEO/CFO 的十分钟 AI 演示叙事调研（Lindy/Martin/Day/Reclaim/Huper 营销叙事骨架、向董事会演示 AI 的公开方法、CFO 采纳关注点、演示方法论 → 演示叙事的可借框架）
- [261005-demo-walk-and-script-v0.md](positioning/261005-demo-walk-and-script-v0.md)——现状十分钟管理层走查 + 督办主线演示脚本骨架 v0（喂 261005-open-value-deficit 第 7-9 轮；供攻击的推敲材料）
- [261005-coding-agent-exec-barrier.md](positioning/261005-coding-agent-exec-barrier.md)——管理层对 coding agent 的却步点调研（喂 261005-open-value-deficit：Codex/Claude Code/ChatGPT Enterprise 官方叙事取证 + 高管真实声音 + 权威调研阻力数字 → 三轴归纳「看不懂/管不住/说不清价值」）
- [261005-chinese-sme-boss.md](positioning/261005-chinese-sme-boss.md)——中国中小企业一把手（含 BU 一把手）工作画像调研（喂 261005-open-value-deficit：时间节律/痛点榜 2024-2026/数字化 AI 采纳/信息流四类取证，附画像卡与未证实清单；web_fetch 受限处改用 curl 并注明）
- [261005-ceo-voices.md](positioning/261005-ceo-voices.md)——真实一把手声音与 CoS 职业方法论调研（喂 261005-open-value-deficit：VandeHei 全司实测一手、三份官方 JD 提炼「雇总助买什么」、Buffett/Bezos/Horowitz 逐字诉求、失败模式 7 条 → 设计红线；BU 级盲区如实标注）
- [261005-ceo-time-and-decision-research.md](positioning/261005-ceo-time-and-decision-research.md)——一把手时间分配与决策过程实证调研（喂 261005-open-value-deficit：CEO 时间研究 60,000 小时数据、pre-mortem/决策日志方法论、执行缺口 85%/27%/1/5 等硬数字、信息环境 MUM effect/CSF/BLUF 四类取证 + 十点产品推论 + 未证实清单；GM/BU 级证据单独标注；web_fetch DNS 故障全程 curl/r.jina.ai/Web Archive 并注明）
- [261005-ceo-viewpoint-synthesis.md](positioning/261005-ceo-viewpoint-synthesis.md)——典型一把手视角与诉求合成档（喂 261005-open-value-deficit 第 17 轮：三路外证×n=1 内证互校 → 工作形状实证表、诉求分层清单（日常/每周/遇事/边界）、十二条可检验推论、演示引用纪律）
- [tech-exploration/261005-okf-wiki-tech-case.md](tech-exploration/261005-okf-wiki-tech-case.md)——技术定调：OKF/WIKI 结构化知识层为什么承重一把手的判断工作（喂 261005-open-value-deficit 第 5/11 轮：认识论定位、六字段价值、2×2 实验与失败归因、可证伪预言）
- [tech-exploration/261005-dsh-native-first-tech-keynote.md](tech-exploration/261005-dsh-native-first-tech-keynote.md)——技术定调：双注确认（OKF/VK）+ DSH 原生能力优先（插件机制用足；组合→缝→自建三问尺、现状 A/B/C 盘点、验证器挂钩）
