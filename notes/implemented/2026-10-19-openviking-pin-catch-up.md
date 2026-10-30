# OpenViking 记忆层跟上 `dsh-v0.2.1-rc.2`：钉存版本被兼容闸跳过

日期：2026-10-19 · 状态：**implemented**

## 问题（可观察行为）

DSH 升到 `dsh-v0.2.1-rc.2` 后，`dev` profile 起动时打一行并**静默跳过整个 bundle**：

```
dsh: skipping profile bundle "@openviking/dsh-memory-plugin": Error: Plugin
@openviking/dsh-memory-plugin@0.5.8 is incompatible with dsh 0.2.1-rc.2: requirements
{"@deepseek-ai/dsh-llm":">=0.1.0-rc.6 <0.2.0 || ^0.1.5-rc.1 || ^0.1.7-rc.2", ...}
```

0.5.8 的 peer 范围上限是 `0.1.7-rc.2`/`<0.2.0`，不含 0.2.1。后果不是报错，是**记忆第二层不再提供**：
`ov-shield` 仍在组合树里（它属于我们的 preset，治理 `mcp__openviking__*` 前缀 + 遮蔽两个同名技能），
但它治理的工具面此时根本不存在——治理层空转，用户侧表现为"助手不再记得"。

本插件**不受**影响：按 [RFC](2026-09-29-openviking-adoption-rfc.md) 决定 1/4（[层 1 落地](../archived/2026-10-04-openviking-layer1-landing.md) 为历史记录），
OpenViking 用 `dsh plugin add` 进 profile，**不进** assistant preset 的 `config.plugins`——"可选增强不能成单点故障"。
所以 0.2.1 跳它不破坏组合、不破坏 preset、不破坏发布物。

## 当时的选项

**上游已经解决了范围问题，不必等它**：查 registry（截至 2026-10-19），peer 范围从 **0.5.20 起**放宽成
`>=0.1.0-rc.6 <1.0.0-0`，正好覆盖 0.2.1。latest = **0.5.26**（2026-10-15），零运行时依赖，
`engines.node ^22.19.0 || >=24`，打包形态仍是 `dsh.bundle.patch = ./cordis.patch.yml`。版本现值与升级
依据见 [`vendor/thirdparty/openviking/README.md`](../../vendor/thirdparty/openviking/README.md)。

三个选项（**当时需要拍板的事项**）：

| | 做法 | 代价 |
|---|---|---|
| **A（推荐）** | 重新 vendor **0.5.26** tgz，替换 profile 依赖 | 跨 0.5.8→0.5.26 共 18 个小版本，需重跑准入表 + 核对它的 `cordis.patch.yml` 有没有动我们依赖的机制（`mcpEnabled` / skills mount 那两个死旋钮是否仍无消费者） |
| **B** | 钉 **0.5.20**（最早放宽范围的版本） | 变更面最小，只为过兼容闸；但落后 latest 六个版本，下次升 pin 可能又撞上 |
| **C** | 给 0.5.8 授 exact-version 豁免 | 零升级成本，但**明确接受**上游自己标为"may cause crashes or data loss"的风险；且 0.5.8 对新 pin 的真实行为未经验证 |

**不选"摘掉"**：它已被 [准入 RFC](../implemented/2026-09-29-openviking-adoption-rfc.md) 正式采纳为第二记忆层
（用户 2026-09-29 拍 A），摘掉等于撤销一个已生效的决定，不是升级切片能顺手做的事。

选 A/B 时，改 `vendor/thirdparty/openviking/` 属于跨切片新工作，按 AGENTS.md 硬规则需用户点头后才动手。

**拍板与执行（2026-10-19）**：用户选 **A**（升 latest）——vendor 0.5.8 → 0.5.26，0.5.8 tgz 留档作回退参照；准入复核、sha512 与五个旋钮的核对记录见 [vendor/thirdparty/openviking/README.md](../../vendor/thirdparty/openviking/README.md)（验收与提交史由 git 持有，不在此复制）。

## 输掉的方案

- **等上游**：不需要——0.5.20 已经把范围放开，等的是我们自己升版本。
- **改我们的 `ov-shield` 迁就旧版**：治理层与被治理对象的版本无关，迁就它等于把兼容负担搬到我们这边，且换不来记忆层恢复。
- **给本包声明 `engines.dsh` 从而"顺带处理"OpenViking**：两者无关，`plugin-engines-dsh` 判的是**各自**的 declaration。
