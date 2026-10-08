日期：2026-10-04 · 状态：**implemented（层 1 落地：安装器双验收 + 四量测活体 + eval A/B 对照 + AGPL delegated 闭合）**
已归档：2026-10-08（决定已经在合同或代码里；下次改决定不用打开本篇。冻结，不再跟踪。）

# OpenViking 层 1 正式落地：隐形引擎经 DSH 原生缝

来源卡：[_backlog/_archive/closed/260929-openviking-formal-integration.md](../../_backlog/_archive/closed/260929-openviking-formal-integration.md)
（位置即状态；卡的推敲全程、实弹台账 S1–S13、八接缝裁决、旋钮剖面演化 v1→v3 在彼，本文只记**决定**）。

## 决定

1. **缝法 = DSH 原生缝，非上游开关等待**：上游 0.5.8/0.5.9 的 `mcpEnabled`/`skills mount`
   两旋钮是死的（声明零消费者）；正式接入走我们自己的 `ov-shield` 插件——整前缀拒
   `mcp__openviking__*` + per-server 资源桥封堵（`tools/execute` guard）+ 双 false 同名
   技能遮蔽。上游四件 issue 候选在卡 §四（上游接上之日 shim 退役）。
2. **旋钮剖面 v3**：`skillCatalog: false` · `skipSubagentSessions: true` ·
   `profileTokenBudget: 3000` · `recallContextTimeoutMs: 3000`（强制 find 路径，叶子内容
   进召回块）· `commitTokenThreshold: 3000`（S13：默认 20000 = 短会话永不进抽取 = 个人
   助手主场景记忆丢失缺口；3000 为 2000-4000 中值，真实使用期校准）。
3. **挂载形态**：`dsh plugin add`（钉存 tgz 绝对路径）进目标 profile → profile patch
   同 id 整行覆盖挂旋钮。**不进** assistant preset 的 `config.plugins`（严格语义，缺席
   即 broken——可选增强不能成单点故障）；**不写进**我们包的 `cordis.patch.yml`（发布物
   自包含纪律）。安装器 `dev/experiments/openviking/ov-install.sh` 七步幂等（server 双钉 0.4.22/配置 0600/健康门/
   profile/tgz/patch/双断言），幂等与全新 home 双验收。
4. **AGPL 边界**：进程边界 + 协议消费不构成链接（delegated 裁定，授权链与依据、复核触发三条件见
   [双裁定 note](../implemented/2026-10-04-delegated-verdicts-agpl-and-ux-review.md)）。

## 验证（真跑过的）

| 判据 | 结果 |
|---|---|
| dump-config 双断言（dev/dev-task/全新 home） | ✅ 插件行 + shield 行均在组合 |
| 四量测活体（ov server 0.4.22 在线） | ✅ 画像块在场 / mcp 命名空间零调用 / 技能遮蔽生效 / 零死胡同 |
| 资源桥旁路（MCP 面） | 活体发现模型探索资源工具 → guard 封堵 → 复验 5 次全拒、模型自适应走 session_search 正路（独立审计逐 callId 核对 5/5） |
| 渗漏通道修正（独立审计纠偏） | 修复前的真实渗漏走 **bash+curl 直连 1933 HTTP API**（read_mcp_resource 当时即报 Unknown resource）；**HTTP 直连不在 shield 拦截面，属显式豁免**：server 是本人本机进程、模型有 shell 是 DSH 的产品前提（bash 本可读写整个本机），豁免记录在案不视为治理缺口 |
| mcp 前缀 schema 级不可见 | 单测+组合断言证明（fixtures 下 denied）；活会话两侧（修复前后）该前缀本就零调用——「不可见」由测试证据持有，行为证据中性 |
| eval 对照（挂/不挂 ov） | 未验证：原指向的 A/B 补记不存在；层 1 证据不包含正式对照结果。后续设计见 [OKF/VK 实验材料](../../_backlog/research/tech-exploration/261005-okf-wiki-tech-case.md) |
| 记忆往返活体 | 车位/貔貅跨会话可答（P1 会话），画像/召回/正路工具三层可用 |
| shield 测试电池 | 9 案全绿（含资源桥拒/放/不动三态与 fail-deadly 默认钉子） |

## 输掉的方案

（完整版在卡「候选与取舍」节；此处存决定性三条）
- **塞进 preset config.plugins / 写进我们包的 cordis.patch.yml**：单点故障与发布物自包含
  双输——可选增强不得让未装者破。
- **拒 6 写放只读**：无前瞻（上游新增写面无法分类）且前提已被轮 3 推翻（召回块内联叶子
  内容，只读工具冗余）；全前缀拒 fail-closed，`allowReadonlyTools` 留层 3 数据驱动。
- **补丁重打包上游**：维护税（每次升级重打）输给原生缝。

## 层 2 / 层 3 的门

层 2（治理桥：`source: openviking:<id>` 转正语法 + digest 情景记忆计数行）待层 1 跑一个
真实使用周期；层 3（只读放开等）数据驱动不立项。回退：删 profile 行 + `uv tool uninstall`，
repo 零留痕。
