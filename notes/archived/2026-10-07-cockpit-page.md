# 驾驭者座舱：按问题出发的单页路由

日期：2026-10-07 · 状态：**implemented**
已归档：2026-10-08（决定已经在合同或代码里；下次改决定不用打开本篇。冻结，不再跟踪。）

## 决定

README「从哪个入口开始」节新增一张**按问题找**速查表（**纯链接路由，不复制规则正文**），
从驾驭者的问句出发路由到既有 owner 面：功能主链与最小验证（[architecture.md](../../docs/architecture.md)
§七/§八）、组合行诊断与逐事件会话复盘（[dev.md](../../docs/dev.md) §六）、运行态布局
（[home.md](../../docs/home.md)）、最小证据选择（[testing.md](../../docs/testing.md) +
[pre-push-evidence](../../.agents/skills/pre-push-evidence/SKILL.md)）、不生效排查（dev.md §四纪律）、
决定理由检索（`notes/implemented/` 按机制名 grep）。同 diff 两处指针补齐：dev.md §六补
「逐事件复盘某次会话」一行（读法此前只住在 agent 技能 repo-live-probe 里，人找不到）；
architecture.md §八摘要路由补预算旋钮位置（`digestMaxBytes`/`recallLimit` = host 行 config）。

立项与走查依据：2026-10-05 [repo 可驾驭性提案](2026-10-05-repo-navigability.md)的结构交付（P0–P5）
经 2026-10-07 人视角五问走查复验对人成立，卡壳全为指针缺失；本决定只新增**人视角的问题轴**，
不改那批路由的正文。运行态分层（run bundle 候选）不在本决定范围。

同次拍板立的常设姿态（带日期的原始记录）：用户 2026-10-07「我们要看长期的利益，而不是短期的。
你觉得如果我这样要求你，你会怎么办呢」→ 研发姿态 3「长期利益优先于短期便利」（常设指令住
根 `AGENTS.md`，此处只存出处与原话）。

## 证据（真跑过的命令与走查）

- `pnpm verify` **34 项全绿**（relative links 门禁覆盖新表链接；docs-commands 门禁覆盖表内 `pnpm` 引用；
  首轮红两处——proposed→implemented 相对链接层级、反引号路径被当作真实引用——修后复绿）。
- **新上下文走查复跑**（验收第 3 条，两个独立 fresh 上下文只从 README 表出发）：
  任务 1 逐事件复盘会话（README→dev.md §六→repo-live-probe，3 跳，~2–3 分钟）**PASS**；
  任务 2 运行态布局（README→home.md §一→`dev/harness-home/assistant/` 实地对照，2 跳）**PASS**；
  任务 3 决定理由首轮**条件 PASS**（复跑者指出 98 张卡无索引、没说怎么找）→ 按其建议同 diff
  在表行内补 `grep -il` 方法 → 第二个新上下文复验（查"养护定时为什么默认带"，2 步 <1 分钟，
  命中 [schedule-default-adoption](../implemented/2026-10-02-schedule-default-adoption.md)）**PASS**。

## 输掉的方案

1. **新立一个 docs/ 大而全座舱页**：路由正文一旦复制就是第二份清单，必然漂移
   （[doc-consistency](../archived/2026-09-23-doc-consistency.md) 的教训）；输给 README 内纯链接表。
2. **重切目录结构**：走查证据不支持——五问全部可达，卡壳全是指针缺失；P3/P4 归位刚收卷，
   再动的 churn 大于收益。目录证据变化时按 [repo 可驾驭性提案](2026-10-05-repo-navigability.md) 重开。
3. **run bundle 实体化混入本决定**：运行态分层是 [home.md](../../docs/home.md) 的 owner 面，
   混入则验收做不可执行；有真实需求时另立推敲卡。

## 后续观察（未裁决，非本决定范围）

- `dev/harness-home/assistant/` 实测多出 `deliverables/`，不在 [home.md](../../docs/home.md) §一布局树——
  若属运行期产物，契约里值得一行注记防读者误判为第五房间（走查复跑者的观察）。
