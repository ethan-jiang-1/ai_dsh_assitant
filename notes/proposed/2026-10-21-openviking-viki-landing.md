日期：2026-10-21 · 状态：**proposed**（已授权实施：用户 2026-10-21 接受 B / H2–H6 按建议；安装/配置为一等交付；推进台账 = [收口卡](../../_backlog/issues/261021-openviking-viki-closure.md)；goal-d890dad3）

# OpenViking 层 2 / Viki 落地（含安装面）

## 问题（可观察行为）

OpenViking 作为第二记忆层已接入，但 live 没跑在设计状态：

- server 0.4.22 / plugin 0.5.26 在位；latest 0.5.1.1 / 0.5.27；**0.5.1.1 修的正是“后续 commit 完成但新记忆 `find`/`search` 搜不到”**。
- dev 组合无 OV config；v3 旋钮只在 dev-ov；`captureToolResults` 对 DSH 默认 `true`、`captureFilters` 为空——云端工具结果当前没有过滤器。
- 自动 recall 只给 overview + 被 `ov-shield` 拒的 `search/read` 提示；Viki 缺搜索/健康/转正。
- **导出包只装插件本体，不教 preset 默认**；OV 安装/配置只活在 `dev/experiments/`、`.env.local` 与 live dev-ov——另一个人拿到插件跑不起来。

## 提案

按 **P0 → P1 → P2 + 安装面** 推进；规格与逐项验收在三张卡与收口卡，不在这里复制：

- **P0 部署/doctor + 安装面**（[部署卡](../../_backlog/issues/261020-openviking-deploy-doctor.md)）：云端例外/ack、`ov-doctor`（可随导出包走）、README/导出手册、Viki baseUrl 默认、配置对账；**另一个人在干净 home/机器按导出包 + 手册装起插件并切到 `assistant`；OV 可选层的安装/配置/启动/doctor 不依赖本仓库**。
- **P1 运行态**（[运行态卡](../../_backlog/issues/261020-openviking-runtime-repair.md)）：server 0.5.1.1、持久存储、v3 旋钮、peer、commit/recall、回滚。
- **P2 检索/Viki**（[检索卡](../../_backlog/issues/261020-openviking-retrieval-viki.md)）：只读检索 A/B（A1 MCP allowlist vs A2 native tool）、Viki 搜索/健康/转正、专用场景。
- **边界不变**：写面不放开、四房间权威、人审不绕过；不接 Gateway；不把 OV 变成必需依赖。

## 输掉的方案

- **A 只修**：能让层 1 恢复，但回答不了“充分利用新版本”；不选。
- **C 换 Gateway**：绕过 DSH 工具/技能/`ov-shield` 治理；与四房间权威 + 写面守住冲突；不选。
- **D 全放 16 个 MCP**：写面风险、工具噪声、错房间；不选。
- **E 等上游**：插件 0.5.26 仍未把 `mcpEnabled`/skill mount 做成活旋钮；不选“干等”。
- **把 OV 行塞进 tracked `profile-patch.yml`**：fresh dev home 无插件时产生 inactive entry 警告、可选层变常态噪声；选 `setup.sh` 仅在插件在场时追加/独立 patch 层。
- **交互式 wizard 作为阻塞项**：先做导出手册 + standalone doctor + clean-home smoke；wizard 走查后仍易错再立。

## 验收

见 [收口卡](../../_backlog/issues/261021-openviking-viki-closure.md) 与三张规格卡。完成 = 安装面（另一人 clean-home 可装起、OV 缺席可降级）+ P0/P1/P2 逐项验收 + 真证据写回卡/提交说明 + `pnpm verify` 通过 + 卡按关闭条件归档。**本卡已获授权实施，不再等点头；交付后改写为 implemented 事实。**
