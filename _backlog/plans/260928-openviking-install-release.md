# 推敲：OpenViking 集成的安装与发布形态

> 立卡：2026-09-28 ｜ 状态：**试点进行中**（2026-09-28 用户过目安装方案、拍板组合 D）｜毕业门判断 = 待触发（试点过审后拍板形态）｜下一步 = 执行下方六步（每步检查点，失败即停记卡）

## 背景 / 触发

用户拍板（2026-09-28）：模型位选**硅基流动**（组合 D：一个 key 配齐 VLM+embedding 两个必需位）；key 走**典型 .env 法——只落本地、永不进 git**（数据安全红线）。要求盘算「这个东西安装发布怎么做」，集中立卡。

与 [260928-self-growth-base-research.md](260928-self-growth-base-research.md) 的分工：姊妹卡管「**要不要引入**」（试点三选一待拍板）；本卡管「**引入后怎么装、怎么发**」。两卡互链，试点是共同前置。

## 已知与未决（安装链四段）

1. **OpenViking server**：PyPI `openviking==0.4.22`（AGPL-3.0；本地 1933 端口；`local-embed` extra 备用）——外部依赖，钉版本。
2. **模型位**：组合 D = 硅基流动一个 key（`BAAI/bge-m3` + Qwen3-VL 系，`provider:"openai"` + `api_base:https://api.siliconflow.cn/v1`）；组合 A = DeepSeek 文字主力 + 本地 Ollama bge-m3。菜单与三条社区踩坑：`vendor/thirdparty/openviking/README.md`。
3. **DSH 适配器**：`@openviking/dsh-memory-plugin` 0.5.8——已钉存 `vendor/thirdparty/openviking/`（SHA512 验真，离线可装）。
4. **key 纪律（用户红线）**：`.env.local`（仓根，day-0 已 gitignore 并经 `git check-ignore` 验证）→ 试点脚本读取后写 `~/.openviking/ov.conf`（**仓外**，0600）→ server。key 不进 git、不进会话日志——**key 由用户亲手粘进 `.env.local`，agent 全程不读明文、不要求贴进对话**。

未决：`dsh plugin add` 对本地 tgz 的装法（pnpm tarball 语义）待验证；上游五周 17 版的钉版升级节奏；全新机器开箱步数。

## 待答问题 / 待跑实验 / 喂给谁

- 待跑：① tgz 直装验证；② 升级/钉版策略（上游旧版强制 deprecated，我们跟 0.5.x 的节奏）；③ 开箱测试——全新机器从零到「会话有记忆」的实际步数与卡点。
- 喂给谁：试点过审 → 毕业为 notes/proposed/ RFC（准入表 + 安装脚本 + 验收标准）；grand plan §2.3「发行组合」的第一个白名单成员候选。

## 候选与取舍

- **S1 依赖打包**（插件进我们 bundle 的 dependencies）：❌ 暂不推荐——让渡版本控制权、碰发布物自包含与 release-smoke 纪律、用户装我们即被动装第三方，与「生态插件只借思路/过准入」的姿态相悖。
- **S2 组合行 + 准入（推荐终点）**：插件保持独立安装（`dsh plugin add @openviking/dsh-memory-plugin@0.5.8` 钉版本）；我们提供**一键安装脚本**（读 `.env.local` → 生成 ov.conf → `dsh plugin add` → `--dump-config` + doctor 探针），准入表过一遍（字段抄 dsh-memento 的 dshWorkshop manifest 设计）；发行动作 = 发行组合里列白名单 + 钉版本。
- **S3 仅文档指引（现在即此形态）**：README runbook + 手动步骤，零耦合——试点期就该这么轻。

## 试点安装方案（2026-09-28 定稿，用户过目）

**环境读数（当日实测）**：Python 3.13.5（homebrew，≥3.10 ✓）；uv 0.7.3 ✓；macOS 26.6.2（wheel 要求 14.0+ ✓）；端口 1933 空闲；`~/.openviking` 不存在（干净）；353GB 可用；git remote = github.com/ethan-jiang-1/ai_dsh_assitant（peer 派生源）。

**四决策**：
- **D1 安装方式 = `uv tool install openviking==0.4.22`**（隔离、钉版、卸载即净；wheel 自带 RAGFS 库与 C++ 向量引擎，免 Rust 工具链）
- **D2 配置落点 = 标准位 `~/.openviking/`**（0600，由 `dev/ov-trial.sh` 从 `.env.local` 生成，agent 不读明文）；回退 B = 沙箱拦写家目录时改 `OPENVIKING_CONFIG_FILE` 指到 `dev/harness-home/ov.conf`（gitignored 区）
- **D3 profile = 裸 `ov-trial`**（无 roster/preset——vendor 契约：不带 patch 即不进 preset，天然隔离试验田）；插件行 + 试点参数（`commitTokenThreshold` 调小——默认 20000 试点会话凑不满、`skipSubagentSessions: true`）由 profile 级 patch 挂
- **D4 插件来源 = 钉存 tgz 优先**（顺带验证离线装）；有 quirk 则退 npm 直装

**六步（每步检查点，失败即停记卡）**：
1. `uv tool install openviking==0.4.22` → `openviking-server --version` 出版本号
2. `dev/ov-trial.sh` 生成两份配置（0600）→ 权限复查
3. 后台起 server → `openviking-server doctor`（embedding 探针出 1024 / VLM 过）——先验社区「静默劣化」坑（#5032）
4. 建 `ov-trial` profile → `dsh plugin add`（钉存 tgz）→ `--dump-config` 断言 `openviking-memory-runtime` 行在场
5. 记忆往返：server 级 curl session→commit→find 找回；DSH 级 headless 会话验召回注入
6. 质量抽评（GLM-4.5V 抽取准头）→ 回填两卡状态行 → 交报告

**风险与退路**：pip 依赖拉取几分钟（一次性）；`dsh plugin add` 对 tgz 有 quirk → 退 npm 直装；全线失败 = `uv tool uninstall openviking` + 删 `~/.openviking` + 删 profile 目录，repo 零留痕。key 纪律全程生效（`.env.local` → ov.conf，不进会话不回显）。

## 毕业门

- **触发**：姊妹卡试点实验 1-2 通过（本地配置质量 + 组合干净度）→ 本卡拍板 S2 细节（脚本形状、准入表、钉版策略）→ 毕业 RFC。
- **何时**：试点是前置，S2 细节在试点后一周内可拍。
- **放弃**：试点失败 → 与姊妹卡一起关闭迁 `_done/_closed_plans/`，结论进 grand plan「输掉的方案」节。
