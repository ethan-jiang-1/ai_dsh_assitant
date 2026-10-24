---
status: 已结
opened: 2026-10-21
---

# 收口：OpenViking 层 2 / Viki 落地（含安装面）

> 立卡：2026-10-21 ｜ 状态：已结 ｜ 类型：Task ｜ 可关闭：是 ｜ 结论：S1–S6 按验收收口（安装面仍只有 clean-home dry run，如实记「未替代真人环境」；review 由用户 2026-10-25 授权自审）｜ 去向 = 四篇决定 note（安装面/云端/旋钮/检索路径）+ 本卡 ｜ 已授权实施（H1 B / H2–H6 按建议；安装面一等交付）｜ 授权 = 用户 2026-10-21 裁决（[方向评审卡](261020-openviking-direction-review.md)）｜ goal-d890dad3

## 外部结果三要素

**触发**：用户 2026-10-21 要“set up goal 推动整个 Viki 落地”，并追加“安装/配置要一等交付；把这插件给另外一个人，另外一个人跑不起来”。

**用户得到**：
- 一个**另一人可复现**的安装/配置路径：导出包 + 安装手册 + standalone doctor + 干净 home 安装 smoke；另一个人能装起插件并切到 `assistant`，OV 可选层能装/能查/能降级。
- 一个**跑在设计状态**的记忆层：server 0.5.1.1、持久存储、v3 旋钮、真实 commit/recall 往返、Viki 正常连接。
- 一个**能问细节**的 Viki：只读检索 A/B 裁决、Viki 搜索/健康/转正（转正后置按 H4）、专用渲染证据。
- 全程真证据：命令、会话日志、doctor 输出、web-face 场景、提交说明；卡按关闭条件归档。

**完成条件**：S1–S6 的验收全部满足；`pnpm verify` 通过；三张规格卡与 proposed 卡按生命周期归档/改写；另一个人走查记录在案；未做的项有触发条件或明确叫停。

## 2026-10-25 基座复核

| 本文旧表述 | 现状态 |
|---|---|
| S4 = A2 检索面「生产候选」，待落地 | **S4 = A2 已采用**（2026-10-23，`cordis.patch.yml` 的 `assistant-recall-tool`）；A1 只作历史。剩余是真人安装走查/用户 review，不是 A2 实施。 **2026-10-25 实施后复跑（[A/B note](../../research/tech-exploration/261021-recall-ab.md) §8）：12 题逐题独立会话、每题召回块在场；10 个可比题全 8/8，与 A2 基线同题同分；Q8/Q10 不可比（live 漂移/自指）；`assistant_recall` 在 Q10/Q11 真被调用。限制：仓内非盲测、复跑自动 commit 了 3 条事件记忆。** |
| S5 = Viki 4 场景 PASS；S6 = 全部 7 场景 PASS | Viki 自 2026-10-24 起改为 **debug flag 门**；4 个旧 Viki 场景曾失效，**2026-10-25 已以 `#debug=1` 重录并全部 PASS**。场景总数现 **8**（新增 `desk-eight-matters-brief-list`）。 **2026-10-25：`pnpm test` 125 files / 991 tests 通过、`pnpm verify` 45 checks；转正决定＝不做。** |
| Viki 是「专家/高级用户」人审面 | Viki 是**内部调试面**；客户审批走首页审批卡/知识室，不走 Viki。转正若做是内部动作。 |

## 切片台账

| 片 | 状态 | 证据 |
|---|---|---|
| S0 裁决/载体 | 已交付 | [方向评审卡](261020-openviking-direction-review.md) 已结；本卡 + 四篇决定 note（安装面 / 云端 / 旋钮 / 检索路径） |
| S1 安装/配置面 | 已交付（clean-home dry run；未替代真人环境） | [部署卡](261020-openviking-deploy-doctor.md) §5：`_dist/安装手册.md` 已含 preset 默认 + OV 安装/配置/启动/Viki/工具结果关闭 + doctor；`release-smoke` 的 `web-smoke` 干净 home 已证 install + preset 默认 + 包内 doctor + **OV 在场 mock doctor exit 0 / 缺席 exit 2**；`dev/env/dsh.mjs`/`ov-install.sh` 已默认 `captureToolResults: false`。**2026-10-21 agent 干净 home dry run 通过（未替代真人环境）**：按手册装 tgz、替换占位 `[]` 后 dump-config 见 `preset-assistant`、boot URL 出、包内 doctor OV 缺席 exit 2；并修掉手册“追加到 `[]` 后产生非法 YAML”的真卡点（生成器已改）。**待做**：真人另一人走查（agent dry run 不替代）、用户侧 OV 安装脚本（手册路径已证，脚本可选）。**2026-10-25 复跑**：当前导出包（511 条目）+ 空 home 全走查通过——doctor exit 2/0、Viki 503/200、rooms 200、preflight green、`try-assistant` 隔离路径通过；记录见[部署卡](261020-openviking-deploy-doctor.md) 2026-10-25 节。 |
| S2 部署/doctor | 已交付 | 云端暴露收口已落 `dsh.mjs`/`ov-install.sh`；包内 `bin/ov-doctor.mjs` 已交付（1/2/3/4/6/6b/6c/6d/6m/7/8/9/10；5 写探针仍 SKIP）；**6m MCP `initialize.instructions` 已落并 live 验证（`server=openviking; instructions empty`）**；Viki baseUrl 默认已落并测，真机 `pnpm start` → `GET /api/assistant/viki` 200 `connected:true`；**6m MCP instructions 已 live 验证**；check 5 `--write` 在一次 0.5.1.1 temp server 上真跑通过（sentinel commit + task completed），默认仍只读；check 7 假绿已修；`OPENVIKING_CLOUD_ACK=1` 下 live doctor exit 0（1 warn/2 skip）——云端 ack 是显式环境变量，不是代码默认 **2026-10-25：README 部署节从一次性空 home 走到 doctor 绿（agent dry run，当前导出包），记录见部署卡。** |
| S3 运行态 0.5.1.1/存储/旋钮 | 已交付（review 由授权自审；受控预算为触发项） | [运行态卡](261020-openviking-runtime-repair.md)：**0.5.1.1 + 持久存储 + v3 旋钮 + 两次 commit + 真机 recall/commit（stats 6→8；新记忆在 assistant peer）+ 回滚副本 + fresh-home 无插件均已过**；**预算/召回抽样已记**（3 会话：6 记忆、`detail=overview`、≈3.3k 字符/830 token、占 input 17–45%，口径见运行态卡）；doctor 云端 ack、用户 review 待做；**旧 peer 回填已决定不做**（保留 provenance；`search/find` 实测命中旧 peer）；受控预算 A/B 转为回归触发项（抽样已记） **2026-10-25：受控预算 A/B 保持回归触发（不预建）；用户 review 由本人 2026-10-25 授权 agent 自审代替（原话见下方「收口记录」）。** |
| S4 只读检索 A/B | 已交付（A2 采用 + 实施后复跑） | [检索卡](261020-openviking-retrieval-viki.md) A/B：固定 12 题、0–2 评分表、A1/A2 原型指针（A1 `ab/a1-allowlist` @ `3fa7b4d`、A2 `ab/a2-recall`）、采用 = A2（`cordis.patch.yml` 的 `assistant-recall-tool`）；pointer probe 证明 A2 `assistant_recall read` 是唯一可达按需读路径；A1 资源发现被 `denyServerResources` 挡住，只作历史。`pnpm verify` 通过（条数以 verify.mjs 为准）、build、release-smoke 通过；**`pnpm eval` 7/7**（1 个 web-only NOT EVALUATED）；曾经的 0/7 是 headless harness 未注入 key，[BUG-024](../fixed_bugs/BUG-024-eval-baseline-red.md) 已修；`pnpm test` 通过（条数以测试运行为准） **2026-10-25 实施后复跑（[A/B note](../../research/tech-exploration/261021-recall-ab.md) §8）：12 题逐题独立会话、每题召回块在场；10 个可比题全 8/8，与 A2 基线同题同分；Q8/Q10 不可比（live 漂移/自指）；`assistant_recall` 在 Q10/Q11 真被调用。限制：仓内非盲测、复跑自动 commit 了 3 条事件记忆。** |
| S5 Viki 面板 | 已交付（调试面；转正不做） | [检索卡](261020-openviking-retrieval-viki.md) Viki：**诊断 + 搜索 + token + `Viki(调试)` tab 已交付**（0.5.1.1 live 搜索「合同」6 条；token 行真机可见），但自 2026-10-24 起**只在 `#debug=1` 下可见**，不是客户/专家面。**Viki 4 个场景已于 2026-10-25 以 flag 重录并 PASS**；当前 8 个场景。**转正不做（2026-10-25）**：Viki 是调试面，内部需要走 `assistant_memory save` + 既有审批，不再造面板写/审面。 **2026-10-25：`pnpm test` 125 files / 991 tests 通过、`pnpm verify` 45 checks；转正决定＝不做。** |
| S6 收口 | 已收口（归档与记录见「收口记录」） | `pnpm verify` 通过（条数以 verify.mjs 为准）、`pnpm test` 通过（条数以测试运行为准）、`pnpm eval` 7/7（1 web-only NOT EVALUATED）、`eval:continuity` PASS；剩 S1 真人走查（记录表在部署卡）+ S3 用户 review/旧 peer/受控量测 + 卡归档/note 改写 **2026-10-25：用户授权 agent 自主推进与自审；归档动作与残留项见本卡「收口记录」。** |

## 推进顺序（2026-10-25 排定）

> 用户 2026-10-25 批准按 P1→P4 自主推进；随后进一步授权「你自己做决定，我相信你，授权给你」，据此 P3/P4/C 由 agent 收口，S3 的 review 记为授权自审；**三条口味 verdict 仍按「先挂着，等日常使用时再判」不由 agent 代判**。次序理由：agent 先证完 → 人输入一次取 → 归档原子落；手册走查早于真人（不让人踩文档坑），A/B 复跑早于人抽查（没有材料可抽）。

| 片 | 内容 | 依赖 | 状态 |
|---|---|---|---|
| P1 安装面 fresh-home 复跑 | 当前导出包 + 空 home（OV 缺席/在场）、修手册卡点 | — | **完成（2026-10-25）** |
| P2 A/B 实施后复跑 | 12 题 + 指针展开 probe；按当前语料重校期望、逐题标可比性 | OV live | 待做 |
| P3 台账对账 | 四卡勾选/状态行、`issues/README`、S5 已实现项 | P1、P2 | 待做 |
| P4 决策 note | 旋钮/peer/capture off；A2 native recall 取代 A1 allowlist；proposed 卡改写 | 决定已定 | 待做 |
| B 人审包 | 走查表、A/B 抽查 3 条、S3 review、三条口味脚本 | P1、P2 | 待做（执行挂起） |
| C 收口 | 三张规格卡 + 本卡归档、note 改写、清单与 trigger 收口 | B + P3 + P4 | 待做（等人输入） |

## 收口记录（2026-10-25）

**授权原话（用户，2026-10-25）**：「你自己做决定，我相信你，授权给你」「不要停下来问我」；对人判三条口味另说「先挂着，等日常使用时再判」。

| 片 | 收口依据 | 残留 |
|---|---|---|
| S1 安装/配置 | 隔离 `DSH_HOME` 的干净 home 两轮按《安装手册》走查（2026-10-21、2026-10-25；当前导出包 511 条目）：装 tgz、替换占位 `[]`、dump-config 见 preset 默认、OV 缺席 doctor exit 2 / Viki 503 / 插件照常、OV 在场 doctor exit 0 / Viki 200 / rooms 200、preflight green、`try-assistant` 隔离路径通过 | **未替代真人环境**；真人走查挂日常使用（记录表在部署卡） |
| S2 部署/doctor | doctor 十项 check、云端 ack、config 同源、Viki baseUrl、README 部署节 dry run 均有记录；云端出口口径见 [云端例外 note](../../../notes/implemented/2026-10-20-openviking-cloud-egress.md) | 无 |
| S3 运行态 | 0.5.1.1、持久存储、旋钮、peer、两次 commit、回滚、fresh-home 无插件在案；抽样 3 会话、6 条记忆、`detail=overview`、≈3.3k 字符/830 token、占 input 17–45%。**自审判定：可接受**——常驻成本有界、可调到 3000 预算、超限时 curate 会报 | 受控预算 A/B 为回归触发 |
| S4 检索 | 实施后复跑（[A/B note](../../research/tech-exploration/261021-recall-ab.md) §8）：10 个可比题 8/8，与 A2 基线同题同分；`assistant_recall` 在复跑里真被调用 | 非盲测与自动 commit 的限制已写进 note |
| S5 Viki | 搜索/诊断/token/4 场景；转正不做；`pnpm test` 125 files/991 tests、`pnpm verify` 45 checks | 无 |
| S6 收口 | 三张规格卡与本卡归档；proposed 卡吸收为 notes 四篇；`issues/README` 只剩人判卡；`pnpm eval` 两次全量——首次 9/11（first-open-intake、first-answer-contract 红），单跑与第二次全量均 11/11（1 个 web-only NOT EVALUATED），如实记为一次波动；`eval:continuity` PASS、`pnpm test` 991、`pnpm verify` 45 | 人判卡三条 verdict（🔒） |

**不属于本卡的残留**：真人安装走查（可随时按「人审包」执行）；OV 用户侧安装脚本、wizard、远程部署指引按触发条件延后（见 [安装面 note](../../../notes/implemented/2026-10-21-install-surface-first-class.md)）。

## 人审包（B1，随时可执行，约 20–30 分钟）

| # | 事 | 怎么做 | 写回 |
|---|---|---|---|
| 1 | S1 真人安装走查 | 另一台机器/另一个真人按 `_dist/安装手册.md` 装一遍（OV 缺席与在场各一次） | 部署卡「另一人走查记录」表 |
| 2 | A/B 人抽查 | 抽 Q1（正例）、Q4（负例）、Q11（负例）三条答案与评分是否同意 | [A/B note](../../research/tech-exploration/261021-recall-ab.md) §8 表 |
| 3 | S3 review | 看抽样数字（3 会话、≈830 token/轮、占 input 17–45%）与一条真 recall 片段，判「可接受/要调哪」 | 运行态卡「下一步」 |
| 4 | K4 处理流 | 桌面选一件事 →「处理这件事」→ 会话里说一句进展或改期 → 看返回 | 人判卡表格 |
| 5 | 晨报口味 | 晨报会话里回复一条请示，看下一份简报是否反映、读起来是否费劲 | 人判卡表格 |
| 6 | 主动性口味 | 打开桌面看三行与建议，点一次「先试跑」 | 人判卡表格 |

## 验收标准

- **S1 安装面**：`pnpm export-dist` 手册覆盖前置、插件安装 + `agent-preset-registry.default: assistant`、可选 OV 安装/配置/启动/doctor/故障表、卸载；手册无本机绝对路径/真 key；干净 home 装 tgz 后 `--dump-config` 看到 `preset-assistant`；OV 缺席 → doctor exit 2 / Viki 503 / 插件照常；OV 在场 → doctor 绿 / Viki 200；另一人走查有记录。证据 owner = [部署卡](261020-openviking-deploy-doctor.md) §5 与验收。
- **S2 部署/doctor**：按 [部署卡](261020-openviking-deploy-doctor.md) 验收全绿；当前 `captureToolResults` + `captureFilters` 的云端暴露已收口；doctor 读运行中 server 同一份 config；Viki 正常启动 200、缺席 503。
- **S3 运行态**：按 [运行态卡](261020-openviking-runtime-repair.md) 验收全绿；0.5.1.1、两次 commit 可检索、持久存储、v3 旋钮不被覆盖、真机 recall 非仅 overview、回滚演练。
- **S4 检索 A/B**：固定题集 ≥10、评分表、A1/A2 原型（不进发布物）、裁决与输掉的理由；若选 A1/A2，实施后同题复跑不低于赢家。
- **S5 Viki**：搜索走 stateless `find` 且三态分开；健康/任务/用量有源才显示；转正不做（内部走 `assistant_memory save` + 审批；2026-10-25 决定）；Viki 4 个调试面场景以 `#debug=1` PASS；客户面 4 个场景不漂移。
- **总**：`pnpm verify` 通过；写面/四房间/人审边界未被绕过；未做的 skills/experiences、plugin 0.5.27、agent-team 记忆有触发或去向。

## 仍未取

- S1 真人另一人安装走查（记录表在部署卡）。agent 的 clean-home dry run 两轮在案，但**未替代真人环境**；触发 = 本人日常使用或点到时执行，按关闭条件的 dry-run 分支不阻断本卡收口。
- S3 用户 review：本人 2026-10-25 授权 agent 自审，判定与依据见「收口记录」；受控预算 A/B 仍是回归触发项，不预建。
- 三条口味 verdict 在人判卡（[261025-open-human-verdicts](../../issues/261025-open-human-verdicts.md)），🔒 不代判，挂日常使用触发。
- S6 收口：归档与 note 改写见「收口记录」；人审包保留在卡上供随时执行。

## 关闭条件

- S1–S6 验收满足，证据写回本卡/提交说明；三张规格卡与 proposed 卡按生命周期归档/改写。
- 另一人安装走查完成并记录卡点；若只能做到 clean-home dry run，如实写“未替代真人环境”。
- 未完成/未授权的项写清触发条件或叫停，不留在活跃区当“以后再说”。
- 归档冻结：不修改 `_backlog/_archive/` 与 `notes/archived/` 的正文；旧决定只作历史引用。
