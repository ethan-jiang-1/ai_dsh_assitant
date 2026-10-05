# 现状十分钟走查 + 演示脚本骨架 v0（督办主线，一把手视角）

> 服务对象：[261005-open-value-deficit](../plans/261005-open-value-deficit.md) 第 7-9 轮（打动管理层）。
> 性质：**推敲材料 v0，供攻击，非实施授权**。走查基于既有证据（blank-first-open 快照、trial home
> 真实桌面、261001 卡第 13/16 轮 naive-CEO 读数）；脚本框架借自
> [261005-exec-demo-narratives](261005-exec-demo-narratives.md) 的可借框架（逐条标出处）。

## 一、现状十分钟走查（管理层第一视角，逐分钟）

| 时刻 | 他看到什么 | 判定 |
|---|---|---|
| 0:00 | 全中文首屏（locale 已修）；hero「探索未至之境」；「预览版说明」弹窗；composer 占位「描述你想要**构建**的内容」 | **却步点 #1：第一句就是开发者语言**（vendor 面，上游候选）；弹窗打断待议（信任加分 or 流程打断） |
| 0:30 | 引导条「直接说一句你手头的经营问题就行」+ 例句 | 全站最贴一把手的一句话（我方皮肤） |
| 1:00-3:00 | 提问后等待 1-2 分钟；滚屏：工具行、绝对路径、英文思考预览、tok/s | **却步点最密集窗口**（261001 卡摩擦 4，多为 vendor 面） |
| 3:00 | 军师级回答（已知/假设分离、可证伪假设、透镜分歧、动作表） | **wow #1**（naive-CEO 判「军师级」） |
| 4:30 | 「打开我的桌面」→ 空态或旧账面；点刷新再等 30-90s | 第二个 wow 延迟到达，体验风险 |
| 6:00 | 桌面：决策卡 A/B/C/D+代价+不可逆标记、行动表 owner/due/stop、缺的数 | **wow #2——全产品最像「给一把手做的」**（第 13 轮读数原话） |
| 8:00 | 知识室：待你审批（3）、来源、excerpt | 治理语言在，但「为什么我要审」没回答（审批内联化未做） |
| 9:30 | 记忆室「它把你理解成什么」 | P3 卖点，但单看像设置页 |
| 10:00 | —— | **缺一击 CTA**（微软框架：jaw-drop + CTA；Vinci Rufus：Ask 要有 break-even） |

**走查结论**：现状的两个 wow 都在 3 分钟之后；第一分钟全是开发者内脏与等待。按 Great Demo!
「Do the Last Thing First」（第一分钟给 payoff 画面），**演示必须倒装：先给桌面，再讲怎么来的。**

## 二、十分钟脚本骨架 v0（督办主线，供攻击）

框架：Great Demo! 倒装四步（Situation→Illustration→Do It→Peel Back）；Vinci Rufus（前 3 分钟
定生死、Ask 带 break-even）；Atlassian（一把手亲演示自身用例→采纳 +90%）；微软（relevance
优先、1-2 个点、分钟级闭环）；Lindy（"Nothing irreversible happens without your approval"）；
Huper（"高管早晨五分钟"、insight 可溯源）；Gartner CFO（human-in-the-loop 应对 audit——审批
从税变卖点）。

| 段 | 内容 | 出处锚点 |
|---|---|---|
| **0:00-1:30 先给 payoff** | 打开桌面（真账面）：「这是我两周里真实拍过的决定、在跟的事、缺的数——它替我盯着。」一句话人设：「这是一把手的总助——我拍板，它盯到闭环。」 | Great Demo! 倒装；Vinci Rufus 60 秒开场模板 |
| **1:30-3:00 现场收尾一件真事** | 挑真实决策卡（大客户让价）：「48 小时不动价」这条明天到期——它今早提醒过我；缺的数（现毛利 m）催收中 | 微软「relevance+分钟级闭环」；督办主线落点 |
| **3:00-6:00 现场拍一件新事（Do It）** | 问一个真难题→拆解→落新决策卡→当场批一条（审批内联：「按这个口径办」→下一句确认+留痕）——决定从对话到账面的闭环 | Great Demo! Do It 最少点击；Gartner human-in-the-loop |
| **6:00-8:00 Peel Back：凭什么可信** | 决策卡出处=口径页（sources、你 10-04 批的那页）；draft→stable 状态机；curate+40 题评测——「可审计、数据不出域」一页带过 | Huper「Every insight traceable」；CFO 语言（Gartner/Deloitte） |
| **8:00-9:30 它的错也给你看** | 👎→修正提案→留痕；「每条都指得出哪次学来的」（P2） | Deloitte「Trust will become a defining leadership capability」 |
| **9:30-10:00 CTA + break-even** | 「明天早上给它十分钟，它把你脑子里挂着的事变成盯得到的账面」；Ask 明确（带一个真问题来，用两周） | Vinci Rufus Ask/break-even；微软 CTA |

**演示纪律**：不进终端、不展示 tok/s/轨迹、不 live 改配置；等待窗口走**受控路径**（账是真的、
路是走熟的——折中 Vinci Rufus「董事会不用 live demo」与「真账面比样板间有说服力」的张力）。

## 三、待攻击点（自己先当反方）

1. **第一分钟给桌面 = 依赖真账面厚度**。trial home 现在只有 2 张决策卡+4 条行动——够不够撑
   90 秒？不够就先养账面（真用优先的直接理由）。
2. **现场拍新事是 live 风险最大段**（1-2 分钟回合+审批链）——预录还是受控路径？影响工程优先级。
3. **「它的错也给你看」放 8 分钟后还是砍掉**——Huper 把 audit trail 当卖点，倾向保留；但演示
   场合自曝错误是否减分，待真实受众读数。
4. **全程没有 coding agent 对照帧**——要不要放一屏"Codex 界面 vs 桌面"？等却步点调研
   （261005-coding-agent-exec-barrier，在途）回来定。
5. **Peel Back 段的说服力依赖口径页质量**——知识种子现在 7 页管理岗内容；OKF 四格实验顺手
   回答「哪页该厚」。
