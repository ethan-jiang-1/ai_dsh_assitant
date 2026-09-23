# 决策：不引入"dev-loop 指南"物种（ai_dsh_company guides/60 评估，四个指针登记）

日期：2026-09-23 · 状态：**implemented**（决定 + 两处微采纳同 diff）

## 问题

用户直觉：ai_dsh_company 的 docs/guides/60-dev-loop.md（435 行，其 guides/ 层的"开发环手册"）
值得借鉴，但不确定借鉴什么、借鉴多少。本 note 对照本仓现状与 DSH 侧说法，给出判断。

## DSH 侧的说法（vendor/dsh 一手证据）

DSH **没有 dev-loop 指南这个物种**。同一职责被 tier 系统分解（`vendor/dsh/docs/AGENTS.md`）：

- 常备军令 → 根 `vendor/dsh/AGENTS.md`：每条 1–3 行、链接其家、词数预算（root ≤1,950）；
- **程序 → cookbook/**："step-by-step how-tos with numbered verify steps"，设计理由链接 Agent Note；
- 日常开发面 → `vendor/dsh/docs/development.md`：setup 教程 + 贡献者参考（工程布局 / 环境变量 /
  git 集成 / CI lanes / TODO 语义）。其"Daily commands"一节自己就是指针——"root contributor
  instructions summarize common commands, while package.json … own the current script and gate
  inventories"；tier 表还明文禁止它收"check-by-check lists that drift from package.json scripts"；
- 理由 → Agent Notes；事故 → postmortem/；一处事实一个家（slop 清单第一条 = 同一规则多个家）。

**推论**：435 行多主题单册（生命周期 + 调试阶梯 + 设计问 + 插拔 + 升级 + 环境 + RPC + 门禁分层 +
预算 + 越界 + 收尾）正是 tier 系统要分解的对象。对方的 guides/ 分层是其根 AGENTS.md 沉积到 214 行
后的补偿动作（其 R6 净减少结算：AGENTS 214 → 153）；本仓 AGENTS.md 68 行、docs/ 五份各司其职，
无此前置病。

## 逐节对照与判定

| 60-dev-loop 节 | 本仓对应物 | 判定 |
|---|---|---|
| §0/0.5 条目生命周期 + 新会话开场 | intents 台账 + notes/proposed/ + 入口链（discipline 适配 3） | 已有等价物；无队列物种，不引入 |
| §1 六步闭环 | 硬规则 3/5 + discipline 表 | 已落位 |
| §2 调试阶梯（分层排查、栈采样先于二分） | dev.md §五 踩坑清单（症状→事实→做法）+ 探索路由 | 已覆盖已知坑；改分层制触发 = 新类"改了不生效"反复咬人 |
| §3 设计四问 | note 的"需要验证什么" + architecture §四 日志税行 | 已落位 |
| §4 插拔速查 / §5 升级环 | README 装法 + sync-dsh + 纪律表行 | 已落位 |
| §6 双 home / §11 越界写入 | 硬规则 1 + dev.md §一 隔离矩阵 | 已落位 |
| §7 环境引导 | dev.md §二/§三 + README 首次进入 | 已落位 |
| **§8 RPC 驱动 Web 会话**（curl session/create + prompt + 日志断言） | 无——I1–I14 的 live 验证挡板靠手工 Web UI 会话 | **指针**：清挡板 / 建"live 会话检查档"时的现成配方（对方踩通：RPC 信封与 args 命名、ask_user 不走 RPC、完成信号用 turn/end 持久事件、日志 zstd 多帧坑） |
| **§9/9.1 门禁分层**（keyless 快档进迭代环；真模型/真浏览器只进认证档；layering 机械守卫扫 tests 层） | discipline 测试纪律 ⏳ 行 + `snapshots/README.md` | **指针**：快照 harness 触发时的形态参考（"先要它通"判据、layering 守卫的造红方式） |
| **§10 自动化轻任务三上限**（墙钟 / 轮次 / 输出量、可中断、收口优先） | 无（day 0 无自动化） | **微采纳**：写进 iteration-rhythm note（I14 节拍器与未来自动复盘的约束） |
| §12 收尾程序 + 流程合同 | 硬规则 3 + discipline"已声明的适配" | 已落位（同物种）；"删>并>修>记"优先序**微采纳**进 discipline 复查环 |

## 刻意不做

- **不建 guides/ 层、不写 dev-loop 单册**。DSH tier 系统的分解答案 + 本仓 AGENTS.md 未超载
  （68 行；对方分层时是 214 行）。触发条件：AGENTS.md 或 docs/ 某份出现"塞不下但仍属现在时"
  且无法并入既有五份的内容——届时按 cookbook 形状开**小册**（一程序一册、带编号验证步骤），
  不开单册大书。
- **不搬 §2 分层调试阶梯**：对方 3.5–3.9 层是该公司产品特定的坑（client 面、多角色、委派卡）；
  本仓对应的坑已全在 dev.md §五（真踩过的才进表）。

## 验证（真跑过）

- `pnpm verify` 15/15（断链门禁的语料含本 note 与两处微采纳）。
