# BUG-001：行为评测两任务既有红（breakdown-uses-skill / desk-refresh-loop）

> 严重级别：P1（重要——评测是行为回归的主仪表，红着的主仪表让每次交付都带着噪声）｜发现：2026-10-01｜状态：活跃 — fixed 2026-10-02：两根因各自实证修复——①技能目录从未在会话上下文发布（<available_skills> system-reminder 缺席，模型无从知道技能存在；裸 one-shot host 层实例可发布、preset 行实例从不发布，全量历史日志统计坐实）→ tool-skill 移 host 行（组合层 L0）；②wrote-path 判定只认 JS/shell 写法、不认技能教的 python json.dump/open('w') → 判定核扩展。验收：5/5（连续两轮 breakdown+desk 各两绿）；修复 commit 与诊断证据见 g2 后续切片 note

## 症状

`pnpm eval` 稳定 3/5：`breakdown-uses-skill` 与 `desk-refresh-loop` 两任务红，其余三任务绿。
A/B 矩阵（2026-10-01，全部真跑）证明与当日在途改动无关：

| 配置 | breakdown | desk-refresh |
|---|---|---|
| 基线代码 + dev home | PASS×1（后证为噪声） | 未测 |
| 在途改动三种形态 + dev home | FAIL×3 | FAIL |
| **基线代码 + 全新 home**（v9 烤路径手册） | **FAIL** | **FAIL** |
| 在途改动 + 全新 home（v10 符号根手册） | FAIL | FAIL |

失败签名（两任务不同）：breakdown 是模型**不按名加载** `management-breakdown`（whenToUse 不触发），
答案缺"停止条件"层；desk-refresh 是 `.desk/state.json` 未被真重写。另观测到污染强化：
失败的评测会话自己往家写"签单"线索（今日 08:19/08:24 两条，其一 20KB），digest 把线索标题
advertised 给下一次运行——翻家行为自我强化。

## 根因（假设）

`breakdown-uses-skill` 于 2026-09-25 立任务时 3/3 全绿；此后组合面持续增长
（0.2.0 pin、专家包技能 9→11、现货采纳六片、手册多轮扩写）。假设：技能目录变大后
whenToUse 竞争加剧 / 手册技能加载清单扩长，模型对"该加载哪个技能"的判断被稀释；
且 dev home 满是领域评测积累的"签单"材料，任务提示词被读成"继续既有分析"而非
"fresh 拆解"（干净 home 上同样失败排除了纯污染解释，但污染让 dev home 上的读数更糟）。

## 复现

`ASSISTANT_DSH_HOME=<全新 home> pnpm eval -- --only breakdown-uses-skill` → 0/1。
（全新 home 需：`bash dev/setup.sh` + 凭据文件**权限必须 0600**——凭据服务拒绝组/其他人
可读的凭据文件，`cp` 默认落 644 会静默变成 MISSING_CREDENTIAL，本次实测踩中。）

## 修复关联

- 诊断素材：今日 A/B 全记录在 [手册可移植化 note](../../notes/implemented/2026-10-01-home-manual-portable.md) §评测 A/B。
- 修复方向候选（未裁）：① 任务侧——拆细判据（skill-loaded 与答案分层计分）、给 breakdown
  任务换不受既有材料影响的问法；② 组合侧——审查 whenToUse 的触发面与手册技能清单的措辞；
  ③ 基建侧——行为评测用受控 fixture home（隔离领域材料），评测会话写家后自动清场。
- 修复完成判据：全新 home 上 5/5，且连续两轮全绿。
