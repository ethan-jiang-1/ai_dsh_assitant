# P5 驾驭验收：新上下文无指引完成五条功能×五问（提案收卷）

日期：2026-10-05 · 状态：**implemented**

## 决定

repo-navigability 提案的终段（P5）：一个**全新上下文**（后台子代理，无会话历史、无口头提示）只从根入口文档
（README + AGENTS → docs 链）出发，对五条功能路径各答五问。**五条全部 PASS**，总耗时 7 分钟
（共享入口链 4 分钟 + 每路径 1–4 分钟，全部 ≤5 分钟/条的时间预算线）；预验收（文档面自查）无盲点，
正式验收发现四个小文档缺口（当日修复，`1740f52`）。

验收执行的硬约束：禁读 notes/ 与 _backlog/（决策史非导航面）、每路径 ≤5 分钟、§八的 keyless 命令**全部实跑**。

## 证据（验收报告要点，全文档链与命令输出在案）

- **五路径判定**：记忆保存/检索 PASS ｜ 知识草稿/批准/检索 PASS ｜ 提示词摘要 PASS ｜ 桌面刷新 PASS ｜
  插件装载 PASS。
- **实跑命令全过**（exit 0，共 95 断言 + replay one-shot）：record+recall 15 ｜ knowledge-write 8 ｜
  digest+prewarm 12 ｜ client-panels+commands 41 ｜ test:composition 6 ｜ export-shape 13 ｜
  keyless replay one-shot（"probe turn complete"，7s，session log 含 digest×20/home-manual/assistant_memory）。
- **五问可答性**：Q2–Q4 从 §八路由表一行 + 一两份 owner 文档直接可得；Q1（构建物/preset 来源）跨
  README+§七+dev.md 三处拼装仍可答；**Q5（失败分层）最难**——需合成 §七三张失败模式表 + testing.md
  六分归因行 + dev.md §五，无单点 owner（如实记录，不新建大册）。
- **无死链**：docs 全部链接目标实测存在。
- **发现的四个缺口当日修复**（P5 的设计目的即此）：desk 契约模板源未点名、digestMaxBytes 键位未点名、
  批准两车道术语不回链、检索 host 函数名不互链；第五项（docs 引 notes 不可自足）为文档 tier 设计使然，
  判非缺陷。
- 运行事故与教训（如实）：第一次验收子代理超时卡死、中断丢失报告；重发版带三重保险（报告增量落盘
  /tmp、每路径限时、禁跑重命令）——原代理实际完成并送达完整报告，重发版冗余被停。子代理交付物
  **必须边做边落盘**，此教训记入本次验收。

## 提案收卷

[P0 残尾](2026-10-05-p0-entry-map-residue.md) ｜ [P1](2026-10-05-p1-validation-trustworthiness.md) ｜
[P2](2026-10-05-p2-tooling-home.md) ｜ [P3](2026-10-05-p3-test-asset-layering.md) ｜
[P4](2026-10-05-p4-source-responsibility.md) ｜ P5（本 note）——全部六段交付，
[提案](2026-10-05-repo-navigability.md)状态改为 **implemented**（按其收尾条款改写）。

**结构标准逐条**（提案终验）：默认测试发现无减少（43 件不变，P3 表证明）；公开命令/exports 全兼容
（P4 出口四证）；两浏览器场景明确执行（P2 实跑四 PASS；P5 验收读者可循文档找到）；源码与运行数据有区分
（P2/P4 归位 + 运行 home 原地保留）；根 AGENTS 未变大手册（P5 读者 7 分钟走完入口链为证）。

## 卫生阶段出口声明

[自洽卡](../../_backlog/plans/261005-turnaround-coherence.md) 阶段 1（repo 卫生）的出口判据现已满足：
活跃入口无失效任务/冲突指令（链接/命令门禁 + P5 无死链实测）；重大疑项有清楚 owner（四段 note + 修正的
文档面）；新会话能读出方向/下一具体问题（P5 五路 PASS 即此判据的直接证明）。**阶段 1 出口，产品落地
（UX 切片）按同卡阶段 2→3 开始**——UX 路径 v0 与首切方案（B 缺数连线 / A' Day-0 intake「它先问」）已备
（[UX 路径档](../../_backlog/reference/positioning/261005-ux-path-annotated-simulation.md)），
用户已授权静默自主推进。

## 输掉的方案

1. **由熟悉仓库的本人代理自答五问**：有偏见，测不出文档面真实可答性——输给全新上下文子代理 + 禁读决策史。
2. **P5 发现缺口即判 FAIL 全盘重测**：四个缺口均为小修且不影响五问可答性；修复后 §八命令与链接门禁
   复绿即可——判 PASS 并当日修缺口，比仪式性全量重跑诚实且省。
3. **为 Q5 失败分层新建一份大册**：三处 owner 已覆盖，缺口是互链不是缺文档——输给修互链不建第二份清单
   （一个事实一个家）。
