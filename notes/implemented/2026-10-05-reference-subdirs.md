# reference/ 按主题子目录分装（含门禁递归升级）

日期：2026-10-05 · 状态：**implemented**

## 约束 → 适配 → 证据

- **约束**：用户 2026-10-05 拍板——`_backlog/reference/` 平铺开始不可用（一天内长出 7 份材料、
  两个主题），要求按主题子目录分装，"今后使用起来方便"。章程约束：reference/ 的命名
  （`YYMMDD-<slug>.md`）、无状态行、索引互查门禁、随卡毕业 `git mv` 四条不变。
- **适配**：材料移入主题子目录，**文件名与内容不变**（位置即状态精神不变，变的只是组织层）；
  索引（`reference/README.md`）记含子目录路径；`backlog-liveness` 门禁的 reference 互查从
  顶层 readdir 升为**递归**（`scripts/checks/verify-checks.mjs` `backlogLivenessProblems`——否则子目录
  文件会静默脱离索引互查，检查覆盖面必须跟着布局走）；同 diff 配红绿夹具
  （`verify-gates.spec.mjs`：子目录文件未以含子路径点名 → 红；点名 → 绿）。
- **证据**：`pnpm vitest run packages/dsh-smart-assistant/tests/verify-gates.spec.mjs` 48 绿
  （含新夹具）；`pnpm typecheck && pnpm test && pnpm verify` 全绿（收尾三连，见下）。

## 子目录划分（新主题开新目录，根目录不再平铺）

- `upstream/`——DSH 上游递交面（候选台账 + issue 草案；喂 261001-first-open-ux）；
- `positioning/`——定位与打动管理层（外部调研、合成档与演示候选；实际材料以 [reference 索引](../../_backlog/reference/README.md) 为准）；
- `tech-exploration/`——技术定调与技术实验（首件：OKF/WIKI 结构化知识层的技术定调材料，
  用户点名"这是技术定调"）。

## 输掉的方案

- **按服务卡分子目录**（`261001-first-open-ux/`、`261005-open-value-deficit/`）：毕业迁移最顺
  （整目录走），但主题跨卡复用差（上游递交面同时服务未来任何卡），且卡名变化会牵动目录名
  ——输给主题式。
- **平铺 + 命名前缀约定**（现状即此）：零迁移成本，但用户明示不可用（7 份已乱）——输给子目录。
- **门禁维持顶层不递归**：迁移成本为零，但子目录文件静默脱离索引互查 = 契约 halves 失守；
  违背"看不见的检查等于没有检查"——输给递归升级（成本 = 一个 flatMap + 一只夹具）。

## 依据

- 用户 2026-10-05 原话（分装）与同日"技术定调"点名（tech-exploration 子目录的设立依据）。
- 章程修订：[_backlog/README.md](../../_backlog/README.md)（目录树注 + 调研材料区节）、
  [reference/README.md](../../_backlog/reference/README.md)（契约 + 索引全路径）。
