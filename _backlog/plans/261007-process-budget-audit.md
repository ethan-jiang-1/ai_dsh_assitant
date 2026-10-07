# 推敲：流程总预算审计——standing instructions / docs / skills 三面处置表

> 立卡：2026-10-07 ｜ 状态：推敲中（B1 审计当日执行，处置表已出；#6 随本卡同 diff，#1/#3 立即切片）｜毕业门判断 = 该做（处置表交付即毕业；实施随各自切片不搭车）｜下一步 = 见处置表各行

## 背景 / 触发

[呈批卡 2026-10-07-dsh-corpus-absorption](../../notes/proposed/2026-10-07-dsh-corpus-absorption.md) B1：把 2026-10-06 的门禁预算制扩展到 standing instructions / docs / skills 三面，判据 = 语料四成本形态（重复记录漂移 / 过长 standing instructions / 无意义 gate 假安全感 / 过细 Skill 仪式）+ 本仓新增第五形态「**驾驭者认知成本**」（语料全是 agent 参与视角；用户「驾驭无力」症状需要自己的判据：用户能不能一眼找到方向盘与仪表盘）。

## 处置表（审计产出；优先序 删 > 并 > 修 > 记，每行指向具体摩擦）

| # | 对象 | 摩擦/误导锚（具体） | 成本形态 | 处置 | 触发/下一步 |
|---|---|---|---|---|---|
| 1 | 根 AGENTS「要落到另一个 home」命令块（~9 行） | 与**硬规则 1 + docs/dev.md §一**三处陈述同一事实；命令串是 runbook 不是 standing order（AGENTS tier 纪律：入口文件只收常设指令与路由）；初读者在命令表中段撞环境细节 | 重复记录漂移 + standing instructions 过长 | **并**：命令串下沉 dev.md §一（owner 已在场），AGENTS 该段收缩为一行指针（硬规则 1 保留规则本体） | ✅ 已执行（2026-10-07）：dev.md §一收命令串，AGENTS 留三行指针 |
| 2 | pre-push-evidence finish line「每切片 typecheck+test+verify 全地板」vs 语料 sdlc 条 35「不重复未失效的检查」 | 实测地板三连 <10s（test 49spec/397tests 2.7s + verify 秒级 + typecheck 秒级）——语料该条的语境是全量极贵的大仓；本仓规模下地板便宜到保证收尾必绿，路由判断仍由窄证据规则承担 | （判定：张力在本仓规模**不成立**） | **记**：地板保留不裁；重评触发 = 全量单项 >30s 的实证（慢测试/慢门禁出现） | 触发条件住本表 |
| 3 | 5 个开发技能的五要素齐度（触发 / 来源 / 判断标准 / 停止条件 / 验证报告——语料 repo-harness 条 21） | pre-push-evidence 五要素齐（finish line 即停止条件）；semantic-drift-audit 有收尾节；repo-live-probe / client-ui-contribution / note-archive-judgment **未逐项核对**——缺「停止条件」的技能会让 agent 不知道何时收手 | 过细 Skill 仪式的反面：要素**残缺** | **修**：逐技能核对一遍，缺停止条件者补一行；齐的记录在案（不改判断标准本身） | ✅ 核对完成（2026-10-07）：五技能五要素**全齐，无需补行**——停止条件分别由 pre-push-evidence「finish line」/ semantic-drift-audit「收尾节」/ note-archive-judgment「Never 节+步骤 4 verify」/ client-ui-contribution「The loop ④+双面验证句」/ repo-live-probe「末节边界句（produces evidence, not decisions）」承担 |
| 4 | 入口链总跳数 | A3 新上下文走查（2026-10-07）：三面六问全部 **1 跳** PASS（预算 ≤2）；README「按问题找」路由行精确命中 | （判定：PASS） | **记**：无处置 | — |
| 5 | docs 六合同体量（~900 行） | 「一个事实一个家」执行严（盘点员半小时未见第二份清单——本表 #1 是审计抓到的第一处真实违例，修后归零）；文档预算 ⏸ 触发条件制为既有裁决（2026-10-06 第二轮审计后一天） | （既有裁决维持） | **记**：不推翻一天前的裁决 | 触发不变：docs 腐化实证再犯即立案 |
| 6 | 「驾驭者认知成本」第五判据缺家 | 语料四成本形态全是 agent 参与视角；本仓用户症状（「测试资产不知道在哪」「驾驭无力」）需要自己的判据 | （新判据缺 owner） | **修**：discipline.md 复查环加一行——流程面/入口链改动时按语料四成本形态 + 驾驭者认知成本（用户一眼能否找到方向盘/仪表盘）过一遍 | 随本卡毕业同 diff |

## 毕业门

- 四门判断：**该做**——处置表 6 行全带摩擦锚与判定，3 修 1 并 3 记（#2/#4/#5 为维持现状的显式记录，负知识价值在防止反复重审）。
- 毕业时：#6 同 diff 落 discipline.md；#1/#3 立即切片；#2/#4/#5 触发条件以本表为家（重提时先读本表）。
