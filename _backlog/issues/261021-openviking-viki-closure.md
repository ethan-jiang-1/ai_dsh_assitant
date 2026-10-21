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

**完成条件**：S1–S5 的验收全部满足；`pnpm verify` 通过；三张规格卡与 proposed 卡按生命周期归档/改写；另一个人走查记录在案；未做的项有触发条件或明确叫停。

## 切片台账

| 片 | 状态 | 证据 |
|---|---|---|
| S0 裁决/载体 | 已交付 | [方向评审卡](../_archive/settled_issues/261020-openviking-direction-review.md) 已结；本卡 + [proposed 卡](../../notes/proposed/2026-10-21-openviking-viki-landing.md) |
| S1 安装/配置面 | 部分交付 | [部署卡](261020-openviking-deploy-doctor.md) §5：`_dist/安装手册.md` 已含 preset 默认 + OV 安装/配置/启动/Viki/工具结果关闭 + doctor；`release-smoke` 的 `web-smoke` 干净 home 已证 install + preset 默认 + 包内 doctor + **OV 在场 mock doctor exit 0 / 缺席 exit 2**；`dev/env/dsh.mjs`/`ov-install.sh` 已默认 `captureToolResults: false`。**待做**：用户侧 OV 安装脚本（手册路径已证，脚本可选）、另一人走查 |
| S2 部署/doctor | 进行中 | 云端暴露收口已落 `dsh.mjs`/`ov-install.sh`；包内 `bin/ov-doctor.mjs` v0 已交付（1/2/3/4/6/7/8/9/10；5 与 MCP 子项 SKIP）；Viki baseUrl 默认已落并测，真机 `pnpm start` → `GET /api/assistant/viki` 200 `connected:true`；README/check 5/MCP 全量待做 |
| S3 运行态 0.5.1.1/存储/旋钮 | 待开始 | [运行态卡](261020-openviking-runtime-repair.md) 验收：副本迁移、两次 commit、持久存储、dump-config、真机召回、回滚 |
| S4 只读检索 A/B | 待开始 | [检索卡](261020-openviking-retrieval-viki.md) A/B：固定题集、评分表、原型指针、裁决 |
| S5 Viki 面板 | 部分交付 | [检索卡](261020-openviking-retrieval-viki.md) Viki：**诊断 + 搜索已交付**（同 tab + 折叠；host `?q=`；live search 当前 500 由 embedding 连接导致，面板如实报错）；健康/任务/统计在诊断内；token 用量、转正、专用场景待做 |
| S6 收口 | 待开始 | 全验收 + verify + 卡归档 + note 改写 |

## 验收标准

- **S1 安装面**：`pnpm export-dist` 手册覆盖前置、插件安装 + `agent-preset-registry.default: assistant`、可选 OV 安装/配置/启动/doctor/故障表、卸载；手册无本机绝对路径/真 key；干净 home 装 tgz 后 `--dump-config` 看到 `preset-assistant`；OV 缺席 → doctor exit 2 / Viki 503 / 插件照常；OV 在场 → doctor 绿 / Viki 200；另一人走查有记录。证据 owner = [部署卡](261020-openviking-deploy-doctor.md) §5 与验收。
- **S2 部署/doctor**：按 [部署卡](261020-openviking-deploy-doctor.md) 验收全绿；当前 `captureToolResults` + `captureFilters` 的云端暴露已收口；doctor 读运行中 server 同一份 config；Viki 正常启动 200、缺席 503。
- **S3 运行态**：按 [运行态卡](261020-openviking-runtime-repair.md) 验收全绿；0.5.1.1、两次 commit 可检索、持久存储、v3 旋钮不被覆盖、真机 recall 非仅 overview、回滚演练。
- **S4 检索 A/B**：固定题集 ≥10、评分表、A1/A2 原型（不进发布物）、裁决与输掉的理由；若选 A1/A2，实施后同题复跑不低于赢家。
- **S5 Viki**：搜索走 stateless `find` 且三态分开；健康/任务/用量有源才显示；转正按 P1/P2 之一并留审计；Viki 专用场景或 blocked 读法协议；现有全部 web-face 场景不漂移。
- **总**：`pnpm verify` 通过；写面/四房间/人审边界未被绕过；未做的 skills/experiences、plugin 0.5.27、agent-team 记忆有触发或去向。

## 关闭条件

- S1–S5 验收满足，证据写回本卡/提交说明；三张规格卡与 proposed 卡按生命周期归档/改写。
- 另一人安装走查完成并记录卡点；若只能做到 clean-home dry run，如实写“未替代真人环境”。
- 未完成/未授权的项写清触发条件或叫停，不留在活跃区当“以后再说”。
- 归档冻结：不修改 `_backlog/_archive/` 与 `notes/archived/` 的正文；旧决定只作历史引用。
