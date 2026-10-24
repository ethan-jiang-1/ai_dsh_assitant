---
status: 已结
opened: 2026-09-28
---

# 推敲：OpenViking 集成的安装与发布形态

> 立卡：2026-09-28 ｜ 状态：**试点六步全部完成**（2026-09-29；第 5/6 步结果见「试点现场」节）｜毕业门判断 = 待触发（试点已过审条件达成：安装✅ 往返✅ 质量✅——**拍板 A/B/C + S2 形态待用户**）｜下一步 = 用户拍板采用与发布形态 → 毕业 RFC ｜ **毕业：2026-09-29 用户拍板 A（引入）→ [RFC](../../../notes/implemented/2026-09-29-openviking-adoption-rfc.md)（准入表 + S2 形态 + 验收标准全量承继本卡）**

## 试点现场（2026-09-29 checkpoint，自动续跑会话）

- **插曲·VLM 换型**：首轮抽取在 GLM-4.5V 下 400 失败——根因（读 server 源码定案）：抽取循环的 python 协议把预取工具结果渲染成**连续 user 消息**（`extraction_output_protocol/python_protocol.py` 的 render_tool_result_messages 返回 user 角色；`sanitize_openai_messages` 只删空 assistant 不合并），硅基流动 GLM 强制严格轮替 → code 20015 拒收（`[user,user]` 探针复现）。**处置：VLM 位换 `deepseek-ai/DeepSeek-V3.2`**（`.env.local` 已改、ov.conf 重生成、server 重启）；GLM-4.5V 降为负知识（runbook 模型菜单已记）。喂图能力随之不可用（纯文字），属已知边界。
- **第 1–3 步 ✅**：server 0.4.22 装好、`dev/ov-trial.sh` 两份配置 0600、doctor **全绿**（两处 FAIL 均修复：workspace 目录提权建好；embedding 探针两次超时确认是网络抖动——手测 3/3 秒回 0.14–0.21s、1024 维）。
- **第 4 步 ✅**：裸 profile `ov-trial`（headless 模板、无 preset）+ **钉存 tgz 离线直装成功**（绝对路径；相对路径会被 pnpm 按 profile 目录解析而 ENOENT——D4 的 quirk 答案）；profile patch 挂试点参数（`commitTokenThreshold: 2000`、`skipSubagentSessions: true`）；`--dump-config` 断言 `openviking-memory-runtime` 行在场且标注 patched。
- **第 5 步 ✅（2026-09-29 完成）**：server 级往返全链通——`pnpm ov-trial-rt` 建 `dsh-trial-probe-002`、14 条哨兵语料、commit 归档、**DeepSeek-V3.2 抽取成功**（GLM 时代是秒拒 400；换型后任务跑了 ~8 分钟落库）。**质量抽评：15 条记忆（偏好 2/实体 8/事件 5），七组事实全覆盖；改口探针取终值（生日 10-20）；保密标注被理解（"仅限用户与助手知晓"）；每条事件带 ChatLog 出处；零编造；语义找回命中正确（"小满的生日" → 家人/小满.md 0.788 第一名）。**抽取物在 `viking://user/default/memories/`（实体按 公司/家人/同事 分组、事件按 年/月/日）。
- **第 6 步 ✅（同上）**：质量抽评即上方读数——**本地小模型（云端文字模型）质量疑虑解除**：抽取准头、结构、出处、保密处理全部合格（官方跑分用云端 Doubao 的顾虑，实测 DeepSeek-V3.2 文字位同样成立）。喂图（多模态摄取）未测——DeepSeek-V3.2 纯文字，属已知边界。

## 背景 / 触发

用户拍板（2026-09-28）：模型位选**硅基流动**（组合 D：一个 key 配齐 VLM+embedding 两个必需位）；key 走**典型 .env 法——只落本地、永不进 git**（数据安全红线）。要求盘算「这个东西安装发布怎么做」，集中立卡。

与 [260928-self-growth-base-research.md](260928-self-growth-base-research.md) 的分工：姊妹卡管「**要不要引入**」（试点三选一待拍板）；本卡管「**引入后怎么装、怎么发**」。两卡互链，试点是共同前置。

## 已知与未决（安装链四段）

1. **OpenViking server**：PyPI `openviking==0.4.22`（AGPL-3.0；本地 1933 端口；`local-embed` extra 备用）——外部依赖，钉版本。
2. **模型位**：组合 D = 硅基流动一个 key（`BAAI/bge-m3` + Qwen3-VL 系，`provider:"openai"` + `api_base:https://api.siliconflow.cn/v1`）；组合 A = DeepSeek 文字主力 + 本地 Ollama bge-m3。菜单与三条社区踩坑：`vendor/thirdparty/openviking/README.md`。
3. **DSH 适配器**：`@openviking/dsh-memory-plugin` 0.5.8——已钉存 `vendor/thirdparty/openviking/`（SHA512 验真，离线可装）。
4. **key 纪律（用户红线）**：`.env.local`（仓根，day-0 已 gitignore 并经 `git check-ignore` 验证）→ 试点脚本读取后写 `~/.openviking/ov.conf`（**仓外**，0600）→ server。key 不进 git、不进会话日志——**key 由用户亲手粘进 `.env.local`，agent 全程不读明文、不要求贴进对话**。

未决：~~`dsh plugin add` 对本地 tgz 的装法（pnpm tarball 语义）待验证~~（2026-09-29 已验证：绝对路径直装成功，见试点现场）；上游五周 17 版的钉版升级节奏；全新机器开箱步数。

## 待答问题 / 待跑实验 / 喂给谁

- 待跑：① tgz 直装验证；② 升级/钉版策略（上游旧版强制 deprecated，我们跟 0.5.x 的节奏）；③ 开箱测试——全新机器从零到「会话有记忆」的实际步数与卡点。
- 喂给谁：试点过审 → 毕业为 notes/proposed/ RFC（准入表 + 安装脚本 + 验收标准）；grand plan §2.3「发行组合」的第一个白名单成员候选。

## 候选与取舍

- **S1 依赖打包**（插件进我们 bundle 的 dependencies）：❌ 暂不推荐——让渡版本控制权、碰发布物自包含与 release-smoke 纪律、用户装我们即被动装第三方，与「生态插件只借思路/过准入」的姿态相悖。
- **S2 组合行 + 准入（推荐终点）**：插件保持独立安装（`dsh plugin add @openviking/dsh-memory-plugin@0.5.8` 钉版本）；我们提供**一键安装脚本**（读 `.env.local` → 生成 ov.conf → `dsh plugin add` → `--dump-config` + doctor 探针），准入表过一遍（字段抄 dsh-memento 的 dshWorkshop manifest 设计）；发行动作 = 发行组合里列白名单 + 钉版本。**发布做法参考：兄弟仓 `ai_dsh_architect/_dist`（用户点名 2026-09-28，「把精神抄袭过来」——读它的发布产物与流程，只借思路不搬文件；2026-09-29 自主窗口被审批层拦在 workspace 外读，待读）**。

  **S2 细节草案（2026-09-29 自主窗口拟，待 _dist 对照修订 + 试点过审后拍板）**：
  - **脚本形状**：`dev/ov-install.sh` 幂等七步（每步检查点、失败即停——六步试点经验直接入脚本）：① `uv tool install openviking==<PIN>`（已装则跳过）② `dev/ov-trial.sh` 生成双配置（0600，已有资产）③ 起 server + `doctor` 全绿门 ④ 建/复用目标 profile（裸 headless 模板，参数化 profile 名）⑤ `dsh plugin add <钉存 tgz 的绝对路径>`（D4 已验证：**必须绝对路径**）⑥ 写 profile patch（`commitTokenThreshold`/`skipSubagentSessions` 参数化）⑦ `--dump-config` 断言 `openviking-memory-runtime` 行 + 尾行打印「下一步怎么说一句话试记忆」。发布期另配 `pnpm ov-install` 别名。
  - **准入表字段**（精神抄 dsh-memento dshWorkshop manifest）：name/钉版+SHA512/license（插件 Apache-2.0，与 server AGPL-3.0 的进程边界一行说明）/peer 兼容（`0.1.7-rc.2` 亲验）/维护方（volcengine 组织级）/更新节奏（上游五周 17 版 → 双钉 `0.4.22+0.5.8`，升级=人工触发重跑准入+doctor+往返冒烟，不自动追 latest）/数据流向（全本地 server、telemetry 是请求级 opt-in 非外发）/回退（`uv tool uninstall` + 删 profile 即净）。
  - **白名单位置**：grand plan §2.3「发行组合」（用户拍板位，非 agent 可定）。
  - **脚本自身验收**：干净 home 从零跑到「会话有记忆」（即本卡待跑③开箱测试）。
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
- **放弃**：试点失败 → 与姊妹卡一起关闭迁 `_archive/settled_issues/`，结论进 grand plan「输掉的方案」节。
