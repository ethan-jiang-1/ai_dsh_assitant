---
status: 推敲中
opened: 2026-10-21
---

# 收口：OpenViking 层 2 / Viki 落地（含安装面）

> 立卡：2026-10-21 ｜ 状态：推敲中 ｜ 类型：Task ｜ 可关闭：否 ｜ 已授权实施（H1 B / H2–H6 按建议；安装面一等交付）｜ 授权指针 = [proposed 卡](../../notes/proposed/2026-10-21-openviking-viki-landing.md) ｜ goal-d890dad3

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
| S4 = A2 检索面「生产候选」，待落地 | **S4 = A2 已采用**（2026-10-23，`cordis.patch.yml` 的 `assistant-recall-tool`）；A1 只作历史。剩余是真人安装走查/用户 review，不是 A2 实施。 |
| S5 = Viki 4 场景 PASS；S6 = 全部 7 场景 PASS | Viki 自 2026-10-24 起改为 **debug flag 门**；4 个旧 Viki 场景曾失效，**2026-10-25 已以 `#debug=1` 重录并全部 PASS**。场景总数现 **8**（新增 `desk-eight-matters-brief-list`）。 |
| Viki 是「专家/高级用户」人审面 | Viki 是**内部调试面**；客户审批走首页审批卡/知识室，不走 Viki。转正若做是内部动作。 |

## 切片台账

| 片 | 状态 | 证据 |
|---|---|---|
| S0 裁决/载体 | 已交付 | [方向评审卡](../_archive/settled_issues/261020-openviking-direction-review.md) 已结；本卡 + [proposed 卡](../../notes/proposed/2026-10-21-openviking-viki-landing.md) |
| S1 安装/配置面 | 部分交付 | [部署卡](261020-openviking-deploy-doctor.md) §5：`_dist/安装手册.md` 已含 preset 默认 + OV 安装/配置/启动/Viki/工具结果关闭 + doctor；`release-smoke` 的 `web-smoke` 干净 home 已证 install + preset 默认 + 包内 doctor + **OV 在场 mock doctor exit 0 / 缺席 exit 2**；`dev/env/dsh.mjs`/`ov-install.sh` 已默认 `captureToolResults: false`。**2026-10-21 agent 干净 home dry run 通过（未替代真人环境）**：按手册装 tgz、替换占位 `[]` 后 dump-config 见 `preset-assistant`、boot URL 出、包内 doctor OV 缺席 exit 2；并修掉手册“追加到 `[]` 后产生非法 YAML”的真卡点（生成器已改）。**待做**：真人另一人走查（agent dry run 不替代）、用户侧 OV 安装脚本（手册路径已证，脚本可选） |
| S2 部署/doctor | 进行中 | 云端暴露收口已落 `dsh.mjs`/`ov-install.sh`；包内 `bin/ov-doctor.mjs` 已交付（1/2/3/4/6/6b/6c/6d/6m/7/8/9/10；5 写探针仍 SKIP）；**6m MCP `initialize.instructions` 已落并 live 验证（`server=openviking; instructions empty`）**；Viki baseUrl 默认已落并测，真机 `pnpm start` → `GET /api/assistant/viki` 200 `connected:true`；**6m MCP instructions 已 live 验证**；check 5 `--write` 在一次 0.5.1.1 temp server 上真跑通过（sentinel commit + task completed），默认仍只读；check 7 假绿已修；`OPENVIKING_CLOUD_ACK=1` 下 live doctor exit 0（1 warn/2 skip）——云端 ack 是显式环境变量，不是代码默认 |
| S3 运行态 0.5.1.1/存储/旋钮 | 部分交付 | [运行态卡](261020-openviking-runtime-repair.md)：**0.5.1.1 + 持久存储 + v3 旋钮 + 两次 commit + 真机 recall/commit（stats 6→8；新记忆在 assistant peer）+ 回滚副本 + fresh-home 无插件均已过**；**预算/召回抽样已记**（3 会话：6 记忆、`detail=overview`、≈3.3k 字符/830 token、占 input 17–45%，口径见运行态卡）；doctor 云端 ack、用户 review 待做；**旧 peer 回填已决定不做**（保留 provenance；`search/find` 实测命中旧 peer）；受控预算 A/B 转为回归触发项（抽样已记） |
| S4 只读检索 A/B | **已采用（A2，2026-10-23）** | [检索卡](261020-openviking-retrieval-viki.md) A/B：固定 12 题、0–2 评分表、A1/A2 原型指针（A1 `ab/a1-allowlist` @ `3fa7b4d`、A2 `ab/a2-recall`）、采用 = A2（`cordis.patch.yml` 的 `assistant-recall-tool`）；pointer probe 证明 A2 `assistant_recall read` 是唯一可达按需读路径；A1 资源发现被 `denyServerResources` 挡住，只作历史。`pnpm verify` 通过（条数以 verify.mjs 为准）、build、release-smoke 通过；**`pnpm eval` 7/7**（1 个 web-only NOT EVALUATED）；曾经的 0/7 是 headless harness 未注入 key，[BUG-024](../_archive/fixed_bugs/BUG-024-eval-baseline-red.md) 已修；`pnpm test` 通过（条数以测试运行为准） |
| S5 Viki 面板 | 部分交付（Viki 已改调试门） | [检索卡](261020-openviking-retrieval-viki.md) Viki：**诊断 + 搜索 + token + `Viki(调试)` tab 已交付**（0.5.1.1 live 搜索「合同」6 条；token 行真机可见），但自 2026-10-24 起**只在 `#debug=1` 下可见**，不是客户/专家面。**Viki 4 个场景已于 2026-10-25 以 flag 重录并 PASS**；当前 8 个场景。**转正不做（2026-10-25）**：Viki 是调试面，内部需要走 `assistant_memory save` + 既有审批，不再造面板写/审面。 |
| S6 收口 | 技术门禁已绿，待真人 | `pnpm verify` 通过（条数以 verify.mjs 为准）、`pnpm test` 通过（条数以测试运行为准）、`pnpm eval` 7/7（1 web-only NOT EVALUATED）、`eval:continuity` PASS；剩 S1 真人走查（记录表在部署卡）+ S3 用户 review/旧 peer/受控量测 + 卡归档/note 改写 |

## 验收标准

- **S1 安装面**：`pnpm export-dist` 手册覆盖前置、插件安装 + `agent-preset-registry.default: assistant`、可选 OV 安装/配置/启动/doctor/故障表、卸载；手册无本机绝对路径/真 key；干净 home 装 tgz 后 `--dump-config` 看到 `preset-assistant`；OV 缺席 → doctor exit 2 / Viki 503 / 插件照常；OV 在场 → doctor 绿 / Viki 200；另一人走查有记录。证据 owner = [部署卡](261020-openviking-deploy-doctor.md) §5 与验收。
- **S2 部署/doctor**：按 [部署卡](261020-openviking-deploy-doctor.md) 验收全绿；当前 `captureToolResults` + `captureFilters` 的云端暴露已收口；doctor 读运行中 server 同一份 config；Viki 正常启动 200、缺席 503。
- **S3 运行态**：按 [运行态卡](261020-openviking-runtime-repair.md) 验收全绿；0.5.1.1、两次 commit 可检索、持久存储、v3 旋钮不被覆盖、真机 recall 非仅 overview、回滚演练。
- **S4 检索 A/B**：固定题集 ≥10、评分表、A1/A2 原型（不进发布物）、裁决与输掉的理由；若选 A1/A2，实施后同题复跑不低于赢家。
- **S5 Viki**：搜索走 stateless `find` 且三态分开；健康/任务/用量有源才显示；转正不做（内部走 `assistant_memory save` + 审批；2026-10-25 决定）；Viki 4 个调试面场景以 `#debug=1` PASS；客户面 4 个场景不漂移。
- **总**：`pnpm verify` 通过；写面/四房间/人审边界未被绕过；未做的 skills/experiences、plugin 0.5.27、agent-team 记忆有触发或去向。

## 仍未取

- S1 另一人安装走查（记录表在部署卡；agent dry run 不替代）。
- S3 用户 review / 受控量测。
- S6 收口：三张规格卡与 proposed 卡按生命周期归档/改写。

## 关闭条件

- S1–S6 验收满足，证据写回本卡/提交说明；三张规格卡与 proposed 卡按生命周期归档/改写。
- 另一人安装走查完成并记录卡点；若只能做到 clean-home dry run，如实写“未替代真人环境”。
- 未完成/未授权的项写清触发条件或叫停，不留在活跃区当“以后再说”。
- 归档冻结：不修改 `_backlog/_archive/` 与 `notes/archived/` 的正文；旧决定只作历史引用。
