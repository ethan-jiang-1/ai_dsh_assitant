# RFC：引入 OpenViking 作为自成长基座（准入表 + 发布形态 + 验收标准）

日期：2026-09-29 · 状态：**implemented**

毕业自两张卡（均已关闭归档）：[260928-self-growth-base-research](../../_backlog/_archive/settled_issues/260928-self-growth-base-research.md)（三选一拍板）与 [260928-openviking-install-release](../../_backlog/_archive/settled_issues/260928-openviking-install-release.md)（试点六步 + S2 细节草案）。

## 问题（可观察行为）

「什么都自己做」的自成长基座现状让用户无感（自建工作量巨大、外部成熟度红利拿不到）。OpenViking 试点证明：官方 DSH 插件（Apache-2.0，peer 当时显式兼容 `0.1.7-rc.2`）+ 本地 server（AGPL-3.0，独立进程）在最小配置下**记忆抽取/检索质量合格**（试点 15 条记忆七组事实全覆盖、修正探针取终值、保密标注正确、零编造、找回命中）。

## 决定（S2 形态：组合行 + 准入，非依赖打包）

1. **引入形态**：插件独立安装——`dsh plugin add <钉存 tgz 绝对路径>`（相对路径会被 pnpm 按 profile 目录解析，已踩）；server 双钉 `openviking==0.5.1.1` + 插件 `0.5.26`（2026-09-29 初钉为 0.4.22 + 0.5.8；升级=人工触发重跑准入+doctor+往返冒烟，不自动追 latest）。
2. **发布物两件套**（兄弟仓 `_dist` 精神，2026-09-29 对照确认）：**打包 tgz + 安装手册 md**，同目录即完整发布。手册七段：表头基线表（版本/包名/打包日期/验证基线 DSH pin+Node）→ 自包含声明（不依赖 registry/克隆）→ 安装（默认 profile + 隔离试用两种，命令可直接复制）→ 验证（`--dump-config` 应看到的确切标记）→ 界面出现方式（重启+硬刷新类操作细节）→ 卸载（干净无残留声明）→ 常见问题表（现象→原因与处理）。铁律：**手册只写发布冒烟验证过的路径**（兄弟仓原话「是被证明过的顺序，不是设想」）。**本仓已有同款机制**：`pnpm export-dist`（自家插件：pack → tgz + 脚本生成安装手册，版本注入防漂、verify 门禁守一致）——OpenViking 的安装手册生成复用该先例。
3. **一键脚本**（已建于 dev/ 下，名 ov-install.sh；幂等七步，试点经验入脚本）：装 server → `dev/experiments/openviking/ov-trial.sh` 生成配置（0600）→ 起 server + doctor 通过门 → 建/复用裸 profile → 装 tgz → 写 profile patch（`commitTokenThreshold`/`skipSubagentSessions` 参数化）→ dump-config 断言 + 「怎么试记忆」提示。
4. **治理边界**：本仓治理层完全不动（draft→stable 人审、`sources` 必填、provenance）；OpenViking 做自成长记忆的**第二储存层**（技能目录当前关闭，同名技能被 ov-shield 遮蔽），与自研三房间**并存观察**；双记忆重叠靠 profile 隔离控制（`ov-trial` 先行，正式接入 preset = 独立决策切片，不在本 RFC）。
5. **模型位**：VLM = `deepseek-ai/DeepSeek-V3.2`（云端 provider，需 `OPENVIKING_CLOUD_ACK`；文字位；**必须宽容连续 user 消息**——抽取协议按宽容假设设计，GLM-4.5V/Qwen3-VL 已证不可用，见 runbook 负知识）；embedding = `BAAI/bge-m3`（1024 维实测）；喂图（多模态摄取）待后续另议。
6. **AGPL 边界**：独立进程 + HTTP/MCP 消费不构成链接（初判成立）；fork server 才触发——**合规复核已于 2026-10-04 以 delegated 形态闭合**（AGPL 认；三条复核触发见 [delegated 裁定](2026-10-04-delegated-verdicts-agpl-and-ux-review.md)）。

## 准入表（字段精神抄 dsh-memento dshWorkshop manifest）

| 字段 | 值 |
|---|---|
| name / 版本 | `@openviking/dsh-memory-plugin` 0.5.26 + `openviking` 0.5.1.1（双钉） |
| 完整性 | tgz SHA512 与 registry 一致（已验，见 runbook） |
| license | 插件 Apache-2.0；server AGPL-3.0（进程边界，见提案 6） |
| peer 兼容 | `>=0.1.0-rc.6 <1.0.0-0`（0.5.20 起放宽，覆盖 pin `0.2.1-rc.2`） |
| 维护方 | volcengine 组织级（38.8k★，周更） |
| 数据流向 | 本地 server + 显式云 VLM/embedding 出口（默认关；四道闸 + `OPENVIKING_CLOUD_ACK`，见 [云端例外](2026-10-20-openviking-cloud-egress.md)） |
| 回退 | `uv tool uninstall openviking` + 删 profile 目录，repo 零留痕 |

## 输掉的方案

- **S1 依赖打包**（插件进我们 bundle dependencies）：让渡版本控制权、破发布物自包含与 release-smoke 纪律、用户装我们即被动装第三方。
- **B 只借机制不引入**：L0/L1/L2、memory_diff、Skill Workshop 进借用清单——零依赖，但自建工作量巨大、「无感」根因不变（试点已证外部成熟度红利真实存在）。
- **C 更大范围引入**（memento/skills-manager 等）：无真实痛点驱动，违反「做在触发之前」。
- **GLM-4.5V 填 VLM 位**：连续 user 消息被硅基流动拒收（20015），抽取必炸——负知识已录 runbook。
- **直装生态知识库插件**（dsh-kb-sieve / dsh-knowledge-base）：单人维护未过准入，且与治理语义重叠。

## 遗留与边界

- 喂图（多模态摄取）未测：DeepSeek-V3.2 纯文字；要喂图须换宽容连续 user 的视觉模型（runbook 菜单已备探针配方）。
- 运维边界（两轮验收实测，配方在 runbook 试点运维节）：抽取时长 10–19 分钟波动、失败不回滚（残留走 fs delete 清理）、事件级重复随语料回放累积——ov-install.sh 的等待/健康门/清理设计以此为据；失败重入语义待实施切片验收。
- ~~`_dist` 对照修订~~：已完成（2026-09-29，发布物两件套 + 手册七段结构已并入提案 2）。
- 升级节奏：上游周更快，双钉 + 人工升级窗口；上游旧版强制 deprecated 的应对待遇真实现场再定。
