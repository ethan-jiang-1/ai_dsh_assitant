# dsh-smart-assistant

一个 DSH 插件：**一个领域专家式的助手，它拥有一个自己的 working folder（跨会话的工作目录）**。

核心命题借自 `Agent = Model + Harness` —— 模型决定上限，**那一圈**决定你能拿到多少。
本 repo 做的就是那一圈：给 agent 一个**跨会话存在的 working folder**，并让它始终"有用的多、没用的少"。

## 它为谁、怎样算干成（方向判据）

**动机**（2026-09-25 拍板）：给中小企业管理者（CEO / VP）养一个**数字分身**——先有一个出厂可用的
**管理岗基座**（管理/销售/财务都懂一点、擅长拆复杂问题），再跟人配合做几件事就把他的判断标准学进去。
**立场 = 辅助本人**：帮他想、帮他做，对外内容由他过目，不代他出面；第一个真人 = 用户本人；
首批一起做的事 = 复杂经营问题的拆解与行动计划。产品定位 = **B 底座 + 专家包**（角色内容来源 =
`ai_dsh_company`，本仓做基座与学习机制）。数据边界 = **严格本地**（反转属用户）；交互面只在 DSH
自己的 Web/Desktop，**不做 IM**（2026-09-27）。本仓 dev home 的内容 = 基座试车场数据，可随意处置；
产品要件 = 到用户手上能自己学习、自己养护（2026-09-28）。

| # | 意图 | 外部可观察行为 |
|---|---|---|
| P1 | **出厂可用的管理岗基座** | 未学过任何人时，给一个典型经营难题（如"下季度销售掉了 20%"），能从管理/销售/财务视角拆解并给出可执行的行动计划；由用户判"像样" |
| P2 | **跟人做几件事就学得进去** | 一起完成 3 件同类拆解后，第 4 件不必再交代，按他的标准、口径与模板来做，并能指出"这条是哪次学来的" |
| P3 | **学到的东西管得住** | 学到了什么，用户能看、能改、能删；学错了能被发现（人可读文件 + 机器检查） |

| # | 结果意图 | 外部可观察行为 |
|---|---|---|
| O1 | **拆得对，且说得清出处** | 拆解按"现象 → 原因假设 → 取舍标准 → 行动"分层，与该用户的判断标准一致；每条事实性依据可指到原文定位 |
| O2 | **办得成（不只是说）** | 从拆解走到可执行行动计划（负责人/时间/指标/风险与止损），落成交付物，被人采用 |
| O3 | **知道自己不知道** | 超出知识、权限或立场时明确说"我不知道"并指路；不编造（错答即红线） |
| O4 | **越用越像本人** | 👎 反馈 → 修正提案 → 评审 → 落地，且评测分不回退 |
| O5 | **装得上（企业环境）** | 一条命令在企业机器装好并可用；管理员不写 YAML 就能配置与评审 |
| O6 | **管得住（权限与数据）** | 知识变更可追溯；数据不出企业边界；对外内容需本人过目 |

本人的经营事实、判断标准与数据边界由本人提供或确认；原型可先用公开案例与标注模拟验证方法和机制，不等真人回访。
**当前边界**（本节是它的家）：方向已定案——一把手总助定位（19 轮推敲），已落地切片各有 implemented note；
阶段 4-5（信息积累与能力验证、检查与继续取舍）是**持续实践**，不是待交付物。未落地候选全部是**带触发条件的延后项**：
①C 分身（真用 30 天后触发验证）②OKF/VK 仪器（第一次需要证明「越用越好」时触发）③督办完整契约（真用出现状态歧义时触发）
④一句话定位 A/B/C 排序（用户真用后自然选择，不催）。方向与技术偏好已确认 ≠ 效果已验证 ≠ 整个路线获实施授权；
推敲结论不构成新增产品能力的授权。推敲史与用户原话在
[定位卡](_backlog/_archive/settled_issues/261005-open-value-deficit.md) 与
[自洽卡](_backlog/_archive/settled_issues/261005-turnaround-coherence.md)（冻结档案，作出处与史据引用）；
[旧真用第一](notes/rejected/2026-10-01-real-use-first.md) 只作被取代方案的防错历史；研发姿态判据的常设指令在根
`AGENTS.md`。

## working folder 有四个房间

| 房间 | 放什么 |
|---|---|
| `memory/` | 已确立的事实 / 偏好 / 决定 |
| `research/` | 意图还不清晰的探索（backlog） |
| `skills/` | 学到的本事（DSH 技能格式） |
| `knowledge/` | 领域知识页（概念/实体/来源，`[[互链]]`） |

（四房间的路径、生命周期、**出口与提案车道的合同** = [`docs/home.md`](docs/home.md) §一/§二；本表只做产品概览，不复制合同内容。）

**桌面与抽屉**：常驻上下文 = 身份（SOUL.md）+ 手册 + 一份**有界摘要**（精选记忆 + 开放线索 +
知识签树）+ 经营账本段；完整记录、归档、技能正文都在抽屉里，用工具取。过程性知识（怎么写记忆、怎么养护、怎么复盘）
一律放技能，不占常驻上下文。

## 工具

自有工具：`assistant_memory`（记忆）、`assistant_research`（线索）、`assistant_reflect`（复盘 / 技能 / 知识页写入）、
`assistant_knowledge`（只读检索）、`assistant_operating`（经营账本；独立 `assistant-operating` dataDir，契约 = [docs/operating.md](docs/operating.md)）、`assistant_recall`（按需只读记忆检索；find/search/read/tree，A2 已裁决并随 preset 挂载）。
各工具的**动词与完整清单以生成物 [`docs/package-catalog.md`](docs/package-catalog.md)「工具 × 动词」节为准**，此处不复制。

`curate`（`assistant_memory` 的一个动词，不是独立工具；另有一条 host 节拍器按轮自动插入养护 turn，
见 [`docs/home.md`](docs/home.md) §四）是**机器能跑的养护检查**（重复、悬空引用、摘要预算、过期线索、
技能遮蔽/退役/断链/凭据、知识页治理等——**非穷举**，完整检查面 = [`docs/home.md`](docs/home.md) §四）—— 能让代码查的，别让 AI 自己说。

这些是本插件的**自有**工具；同一组合里还有 DSH 现货工具在场——`session_query` 族（原始会话
检索）、`schedule_*` 定时四件、`skill`（技能加载）等，完整组合见 `docs/architecture.md` §二。

## 装法

研发期**不做正式发行**（没有 npm 发布路径）：拿到的就是这个 Git 仓，装它三步：

```sh
git submodule update --init                                       # vendor/dsh（pin 的唯一出处：vendor/UPSTREAM.md）
pnpm install && pnpm build                                        # build 必需：包的入口是 lib/，而 lib/ 不入库
dsh plugin --profile <p> add file:./packages/dsh-smart-assistant   # <p>＝你的 profile 名；第三步要 dsh 在 PATH 上
```
装完在 Web UI 的 Settings → Agent 预设里把 `章鱼管家` 设为默认；headless/自动化再把 profile 的
`agent-preset-registry` 行 `default` 设成 `assistant`（模板：`dev/profiles/profile-patch.yml`）。
随后 `dsh --profile <p> --dump-config` 应能看到 `preset-assistant`。装包的形状由 `pnpm release-smoke` 机械验证。

**可选 OpenViking 记忆层（不装也照常跑）**：插件与四房间不依赖 OV；缺席时 `ov doctor` exit 2、Viki 503，这是明确的降级而不是装坏。要装就按 [《安装手册》](_dist/安装手册.md)（`pnpm export-dist` 生成，含 server 0.5.1.1 的安装/配置/启动/doctor/故障表/卸载，命令不含本机绝对路径）；关键前提是 server 起在 `127.0.0.1:1933`、storage 指向持久目录、doctor 读的是运行中 server 同一份 config。装好后 profile 的 `openviking` 行默认 `baseUrl` 即可接上，再跑一次 doctor 确认绿。
（仓内开发时用 `pnpm dsh --profile …`；它经 `dev/env/dsh.mjs` 启动 pinned CLI，强制 `DSH_HOME=dev/harness-home` 并把仓根作为 cwd。）

## 从哪个入口开始

起服务五步、开发环、验证链、评测的命令与判据，**唯一清单** = 根 [`AGENTS.md`](AGENTS.md) 命令表
（本 README 不复述；唯一例外是下面「知识导入」与「专家部署装配」两条部署 CLI，家在本文）。

**按问题找**（纯路由，不复制正文）：

| 你的问题 | 去哪儿 |
|---|---|
| 某个功能的主链、实现入口、最小验证 | [docs/architecture.md](docs/architecture.md) §八（功能路由） |
| 一条命令 / 一条消息 / 一次点击进来经谁、哪里可观察 | [docs/architecture.md](docs/architecture.md) §七（运行链路 + 失败模式表） |
| 组合里到底有没有这一行 | `pnpm dsh --profile dev --dump-config`（路由见 [docs/dev.md](docs/dev.md) §六） |
| 运行态现在长什么样（四房间、两个根文件） | [docs/home.md](docs/home.md)；实际文件在 `dev/harness-home/assistant/` |
| 怎么把插件交给别人、怎么备份/迁移一个人的数据 | [docs/delivery.md](docs/delivery.md)（agent 物 vs 用户数据、handoff 扫描、两目录导出/导入） |
| 某次会话为什么答成这样 | [docs/dev.md](docs/dev.md) §六「逐事件复盘」行（过滤样例：[repo-live-probe](.agents/skills/repo-live-probe/SKILL.md)）；聚合视图 `pnpm usage` / `pnpm desk-loop` |
| 我要改 X，最小验证是什么、回归资产在哪 | [docs/testing.md](docs/testing.md) §一页证据地图（唯一表主）；判断细则与假绿清单在 [.agents/skills/pre-push-evidence/](.agents/skills/pre-push-evidence/SKILL.md) |
| 改了为什么不生效 | [docs/dev.md](docs/dev.md) §四 三条纪律（build / preset 代际 / pin） |
| 这个决定为什么这么定 | 先查 `docs/` 对应合同（理由多已内联）；再按关键词搜 `notes/`（`grep -ril '<关键词>' notes/`；负知识在 `notes/rejected/`；怎么读见 [notes/README.md](notes/README.md)）；**方向类推敲史**在 `_backlog/_archive/settled_issues/` 与 `_backlog/research/`（同法按关键词 grep） |

运行数据的 `DSH_HOME`、助手 `dataDir` 与源码 cwd 是三个不同根，详见 [开发手册](docs/dev.md)。

打包安装的形状（`pnpm pack` 出 tarball 再 `dsh plugin add <tarball>`）由 `pnpm release-smoke` 机械验证：
pack → 干净 home → 装 → 组合断言。装完只需把该 profile 的 `agent-preset-registry` 行的 `default` 设成
`assistant`（模板：`dev/profiles/profile-patch.yml`）。registry 不扫目录、也不接受 preset 路径：
`assistant` 的定义随包发（`package.json` 的 `dsh.bundle.patch` → `cordis.patch.yml` 里的 `preset-assistant`
行），装包即进组合 —— 不必再指 `presets/` 目录。

**知识导入**（把文件/目录导成知识页草稿）：`pnpm import-knowledge -- --data-dir <assistant 目录> <文件或目录>… [--dry-run]`。

**专家部署装配**（把全新的 working folder 装成管理岗专家的）：`pnpm expert-setup -- --data-dir <assistant 目录>`
—— 只在 `SOUL.md` 还是未经改动的默认种子时替换为管理岗身份（改过就跳过：装配不覆盖它的主人），
知识种子按治理写入路径落 `draft`；`draft → stable` 的人审有两条合法路径——**你亲手改** `status`（那一下就是评审），
或**你明确批准后由助手 `promote_page` 执行那次翻转**（批准是你的，助手只做编辑）。

**养护定时（默认带）**：本包的 host patch 直接挂 `schedule` + `ui-schedule` 两行。Web 组合开箱即用：到期任务
以原会话 follow-up 消息投递、重启后仍生效，`schedule_create`（`prompt`+`title` 必填、`after_seconds`
延时秒）即可建首个养护或提醒任务。**headless 组合例外**：`schedule` 依赖 web-app 层的
`sessionController`，纯 headless 部署里挂上激活不了，profile patch 应显式 `disabled: true` 该行
（本仓先例：`dev/profiles/profile-patch-headless.yml`）；依赖机理与报错形态的合同 =
[docs/architecture.md](docs/architecture.md) §二 schedule 行。

## 开发

```sh
git submodule update --init     # vendor/dsh submodule（pin 出处见上「装法」）
pnpm install
pnpm typecheck && pnpm test && pnpm verify
```

首次进入到此为止。日常开发环（dev / dev-task 两个 profile 各自验什么、one-shot 与 Web UI 的分工、
换 pin 的步骤）：命令清单唯一表主 = 根 [`AGENTS.md`](AGENTS.md) 命令表，展开细节在
[`docs/dev.md`](docs/dev.md) §四 —— 本段不复制。

契约在 `docs/`（`docs/home.md` 是 working folder 的契约，`docs/identity.md` 是身份名），
决策与被否决的方案在 `notes/`，agent 的入口链在 `AGENTS.md`。
