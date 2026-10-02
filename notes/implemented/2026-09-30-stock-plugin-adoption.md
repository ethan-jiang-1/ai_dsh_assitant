# DSH 0.2.0 现货插件采纳：六片全部落地，assistant 能力面补齐

日期：2026-09-30 · 状态：**implemented（六片 A1/A2/B1/B2/C1/C2 全部落地并各自带 note；C1 挂法 2026-09-30 拍板「文档指引，不默认带」，2026-10-02 反转为默认带）**

来源：`/Users/bowhead/deepseek-harness/_digested/plugin-inventory/`（基线 `639ed015` = 本仓当前 pin，快照可直接用）。
依赖姿态事实：11 个 peer 全部 `workspace:^` 指向 vendor，typecheck 已证 0.2.0 无 API 漂移——**"依赖老"的实体不是版本号，是组合面**：下表的现货能力一件都没挂。

## 问题（可观察行为）

1. `pnpm dsh --profile dev --dump-config`（2026-09-30 实测）：assistant preset 里 `tool-goal`/`command-goal`/`plan-mode`/`tool-subagent*`/`tool-jobs`/`tool-workflow` **全部 0 命中**——比出厂 `standard` preset 少整层对话能力面；而根 AGENTS.md 硬规则 5 宣称"复杂任务开工用 plan 呈批……机制都在 base bundle 里，挂着不用等于白挂"，**plan 实际没挂**：宣称与组合自相矛盾。
2. 会话证据检索为零：assistant 无法回答"上次我们怎么定的 X"（memory 存提炼后的事实，不存原始会话）；`session-query-sqlite`（FTS5）出厂随 base 在场但 `openAt: never` 关着。
3. 养护检查全靠人跑 `pnpm`：`usage`/`desk-loop`/`eval` 无定时触发通道；`schedule-bundle` 是 OPTIONAL_BUNDLES 现货。

## 决定（分片，每片一 commit：代码+测试+docs/note 同 diff；全部已执行）

| 片 | 内容 | 挂法 | 验收 |
|---|---|---|---|
| **A1** ✅ 2026-09-30（note：`implemented/2026-09-30-a1-goal-planmode-and-replay-probe.md`） | `command-goal`+`tool-goal`+`plan-mode`（照抄 standard `planning` 组形状，含 ui-user-questions 计划评审联动） | `cordis.patch.yml` preset 行 insert | dump-config 行在场；repo-live-probe 证明模型可见；任务面规则与组合一致 |
| **A2** ✅ 2026-09-30（note：`implemented/2026-09-30-a2-delegation-and-jobs.md`；偏离：不抄 `modelSelectionSettings`） | `delegation` 组：`tool-subagent`+`subagent_fork`+`tool-subagent-control`（in-process 后端；codex/claude-code 照抄 disabled 占位）＋`tool-jobs` | 同上 | 同上；research 线委派探针：一次真实调研委派走通 |（残余：组合与请求侧已证；**模型真实发起委派的端到端**探针未跑——replay fixture 需含 subagent 工具调用脚本，随 eval 轮或 C 片顺带补）
| **B1** ✅ 2026-09-30（note：`implemented/2026-09-30-b1-session-query-search.md`） | `session-query-sqlite` 翻开（`openAt: first-search`+`path`）＋`tool-session-query` 挂 preset；与四房间关系写进 docs/home.md（memory=提炼事实 / session-query=原始证据） | host patch 行 + preset 行 | 检索探针：问"上次怎么定的"能取回会话证据；不与 assistant_knowledge 撞名 |（探针已证：fixture 编排的 session_search 真实执行、索引库落盘）
| **B2** ✅ 2026-09-30（note：`implemented/2026-09-30-b2-time-context.md`；独立挂、不等 C1） | `time-context`（时间感知进 digest 相邻段，stale 判断有"今天"） | 随 B1 或 C1 的 patch | dump-config 在场；digest 探针含时间段 |（探针已证：请求文本含 "Time sampled … +08:00[Asia/Shanghai]"）
| **C1** ✅ 2026-09-30 裁决「文档指引，不默认带」；**2026-10-02 反转为默认带**（0.2.0 里 schedule 转正、原 experimental 前提过期；现行决定档案：`implemented/2026-10-02-schedule-default-adoption.md`，原 C1 卡已完整取代删除） | `schedule-bundle` 打开方式裁决：文档指引（用户插件页一键开）vs 我们 profile patch 默认带；定案后把养护检查接 schedule（`schedule_create` 定时触发养护问答） | 裁决卡→实施 | 养护任务真实定时触发一次的日志证据 |（README 增"养护定时"段：三条隔离 home 实测边界 + ⏳ 标注 Web 端到端未验）
| **C2** ✅ 2026-09-30（note：`implemented/2026-09-30-c2-feedback-desk-loop.md`；stock 行已由出厂层挂好，本片是消费侧） | `message-feedback`/`command-feedback` 赞踩信号进摩擦报告（desk-loop 增一类读数） | 消费侧改动 | desk-loop 报告出现 feedback 类；先探 dev profile 是否已挂 web 层 |（§7 上线：计数+撤回对消+备注表，自检三断言）

## 明确不做（触发条件登记，不排期）

**遗留（已显式登记，非阻塞）**：① 模型真实发起委派的端到端探针（A2 残余，随 eval 轮补）；② Web 形状下 schedule 工具进请求的端到端（C1 原标 ⏳，2026-10-02 反转切片四路对照实测补上，见反转卡验证节）。

- `mcp-client`：等用户要接外部系统。`web-search-exa/perplexity`：等官方搜索质量实证问题。
- `storage-sqlite` 迁移自研 ledger：home 布局是合同（docs/home.md），收益=一致性、代价=迁移风险，⏸。
- `workflow`/`ralph`：research 工具已覆盖单线程调研，编排需求实证出现再议。
- `browser-use`/`computer-use`/语音：experimental 且远离本场景。
- client UI 对齐（ui-slots/ui-primitives 新形态）：独立小调研卡先 probe 我们 client 现状，不在本卡。

## 后果与验收（整卡毕业门，已过）

A1→A2→B1→B2→C1→C2 顺序推进；每片以"真跑过的命令"报告；全部落地后本卡转 implemented 并吸收各片 note；组合行变化同 diff 更新 `docs/package-catalog.md`（生成物）与 `docs/architecture.md`。

**常设守卫（用户 2026-09-30 拍板：web search/fetch 能力一定要有）**：`web_search`/`web_fetch` 与 host 侧
`web-search-deepseek`/`web-fetch-http` 是本插件的底线面——每片验收的探针都顺带断言请求侧 tools 数组仍含这两行
（2026-09-30 实测：30 工具在场）；后续若立 verify 门禁守组合底线，先补"造红再证绿"夹具。

## 输掉的方案

- **自研等价物而不是采纳现货**（goal/plan/委派/检索/时间/赞踩各自造）：本卡的反面——316 包货架上一件
  "你以为要写插件其实不用"的实证清单（inventory 消化稿 01 场景 A–E 全是这个形状）；自研只会慢且无上游红利。
- **一次性大爆炸挂全部六片**：每片一 commit 才有可回退锚点（硬规则 6）；且 A2 的 fail-loud（modelSelectionSettings）
  证明分片让问题在最小半径内暴露。
- **把 experimental 面（schedule/browser-use/语音）打进发布形状**：C1 拍板记录；合同随时漂，进组合即接 upstream 的破壊半径。
