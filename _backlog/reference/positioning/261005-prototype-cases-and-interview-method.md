# 原型研究：公开来源线索与可执行的模拟变式

> 查证日期：2026-10-05。喂 [访谈/学习框架](261005-interview-learning-framework.md) 与 [自洽卡](../../_done/_closed_plans/261005-turnaround-coherence.md)。本轮定位到一手入口，但未取回正文，**尚未达到两个已核实具体决定案例的验收**。以下保留有限线索和明确标注的模拟设计，不把搜索摘要当案例事实。

## 1. 研究结果与限制

`web_search` 能定位官方页面，`web_fetch` 对 Amazon、GitLab、GOV.UK 等域名返回 `hostname resolves to a non-public IP address`。没有逐句取回，无法填出原始决定时点、当时备选/约束、动作与结果，也没有可信原文引句。网络受限不应转化为“等本人提供一件事”的任务；原型仍可用模拟调试路径，经营事实与方法出处继续未核。

| 待核线索 | 原始入口 | 本轮可声称什么 / 不能声称什么 |
|---|---|---|
| Amazon 决策原则 | [官方股东信归档](https://ir.aboutamazon.com/annual-reports-proxies-and-shareholder-letters/default.aspx) | 定位入口；one-way/two-way door 的原句、适用例外、具体决定与结果未核。搜索命中的 [第三方 filing 镜像](https://getfilings.com/sec-filings/160405/AMAZON-COM-INC_8-K/d168744dex991.htm) 只作线索，不算一手正文 |
| GitLab 数据库事故 | [官方 postmortem](https://about.gitlab.com/blog/postmortem-of-database-outage-of-january-31/) | 定位到可候选作失败反例的文章；当时备份/复制状态、动作、丢失与恢复量、选项与owner均未核，不能用熟知故事补字段 |
| 事件/情境访谈 | [GOV.UK contextual inquiry](https://www.gov.uk/guidance/contextual-inquiry)、[understand user needs](https://www.gov.uk/service-manual/service-standard/point-1-understand-user-needs)、[choosing methods](https://www.gov.uk/service-manual/user-research/choosing-methods) | 定位官方方法入口；未核正文，不能把本仓十问框架称为官方方法已验证的实现 |

本轮已尝试访问上述入口；原始发表/更新日期未核。既有 [CEO时间与决策研究](261005-ceo-time-and-decision-research.md#45-简报形态的两个高可信参照amazon-六页备忘录与军方-bluf) 留有 [Amazon 2017 letter](https://www.aboutamazon.com/news/company-news/2017-letter-to-shareholders) 六页叙事的核引，但那不补足本轮“具体决定→动作→结果”的缺口。

## 2. 取回后怎样形成可重放案例

字段模板由 [框架](261005-interview-learning-framework.md#案例记录模板公开材料和未来访谈共用) 拥有。本档不再复制全套空字段；可访问时先核下列会改变结论的缺口：

- Amazon：选一个具体事件，而非泛原则。什么材料支持可逆性、回滚成本、最坏损失和反馈速度？实际选过哪些方案，含延后/不做？原则描述与事件当时记录分开。
- GitLab：固定破坏性动作前的截止时点。最后一个当时已确认的恢复点是什么，备份“存在”与“已验证可恢复”如何区分？谁有权停写/切换/升级，约束与完成证据是什么？复盘中的补救不能回填当时所知。
- 访谈方法：核官方原句与适用情境，再判断本仓问题设计是否需要调整。当前框架属于设计候选，允许碎片、unknown与对方纠正，不声称有效性已证。

缺字段继续 unknown；结果只能写 `observed_outcome`，不能回填 `known_then`。公开材料非本人公司事实，后验成功/失败不能单独判断当时决策质量或证明助手收益。

## 3. 可自主检查的学习候选（模拟，尚未执行）

`change_id: reversible-cost-v0`。这是本仓提出的设计假设，受到上述待核线索启发；**并非从两个已核案例蒸馏出的规则**。候选输出先辨识可逆性、回滚成本、尾部损失、反馈速度；缺数就问会改变选择的缺口，不自动判断“小试验”低风险。

| 明确标注的模拟输入 | 预期应观察的行为 |
|---|---|
| 内部草稿，可撤回、低成本、反馈快 | 能直接准备草稿/小试验，注明范围、owner和停止信号 |
| 同一小试验，但资金缓冲不足，撤回也承受不起损失 | 建议与缺口应随约束改变；不能因为可逆就沿用“先试” |
| 模拟数据库恢复，备份存在但恢复能力未验证 | 不编安全恢复点；先辨识数据损失/停写/升级与验证条件。不是 GitLab 的真实事故重放 |
| 对外承诺，文本可删但声誉后果难撤回 | 分开技术回滚与业务可逆性，保留本人拍板/对外确认边界 |
| 成本低但反馈很慢 | 不把低成本当即时可判；调整观察窗口/停止条件 |

验证方式用 [行为验证卡](261005-interview-learning-framework.md#行为验证卡候选)：同输入/预算比较baseline与候选，区分条件改变、来源准确、缺数诚实和回归。上表全部是**参与候选设计的变式**，不算held-out；真正未见病例需另选且不用于提炼。测试未运行，成本/verdict均待测。改变无关条件不必改变建议，只有会影响选择/风险的条件变化才应有相应反应。

作用范围限资料整理与访谈摘要；不替本人拍板、不执行外部系统、不估算真实ROI。可撤回候选规则并恢复前版。它可成为方法/技能草案，不能写成用户永久偏好；技能落盘与加载计数不证明能力增益。

## 4. 本轮能支持的决定

支持继续设计事件访谈、来源/未知分栏和模拟UX路径，真人不可用不阻塞这些工作。不能支持“已完成两例一手重放”、方法效果、真实需求、个性化、经营采用或长期收益结论。

来源访问恢复后在本档补原句与案例，不另建研究排队清单；本轮保留有界访问限制，不再铺更多未核网页。
