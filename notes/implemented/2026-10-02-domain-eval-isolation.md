# 领域评测批的题间 deliverables 隔离

日期：2026-10-02 · 状态：**implemented**

来源：校准导览 `dev/eval/domain/calibration-2026-09-29.md` 挂的"隔离或清场待下一批改进"——
2026-09-28 批实测 Q17 的依据部分骑在 Q1/Q2 的 memo 上、Q19 骑在 Q17/Q12 上（串行批共享
repo 根 `deliverables/`，会话 cwd=repo root 是设计），"依据在场"维被迫降档看待。

## 决定

`dev/eval/domain-run.mjs`（`pnpm eval:domain`）默认开题间隔离：

- 批开始：repo 根 `deliverables/` 若存在 → 移入 `.runs/<stamp>/pre-batch/`；
- 每题跑完：该题新写的 `deliverables/` → 移入 `.runs/<stamp>/<题号>/`（每题独槽，可事后核对）；
- 批结束（含异常退出，`finally`）：pre-batch 树还原回 repo 根——批后仓库与批前完全一致。
- `--no-isolate` 逃生口：复现旧共享行为做对照用；打分表头打印隔离模式（开/关与目录），报告自带口径。
- `.runs/` 进 `.gitignore`（打分表与题目本就排除：真实经营内容不进 Git）。

隔离器 `createDeliverablesIsolator` 注入 fs 操作，self-check 用夹具全覆盖四分支
（批前暂存 / 逐题入槽 / 还原 / no-op），`--self-check` 实跑绿。

## 输掉的方案

- **每题独立临时 cwd**：会话 cwd 进 persona 后缀与文件工具的相对路径解析，公司盘引用路径
  部分按 cwd 相对解析——换 cwd 会改变题目测的东西（测"换个目录还答得上来吗"），超出
  "消除跨题骑乘"的目的；不动 cwd、只隔离 deliverables 是最小改动。
- **批前清空 deliverables/ 不还原**：预批内容（历史 memo）也是骑乘源，但删掉它们改变
  working folder 引用的落盘事实；暂存 + 还原两边都不撒谎。
- **只隔离不保留每题产出**：校准明确"抽一分核对那份清单的数字"是打分动作的一部分，
  每题独槽保留产出供核对。

## 验证（真跑过的命令）

1. `node dev/eval/domain-run.mjs --self-check`——解析/重试/隔离四分支全绿。
2. `node --check dev/eval/domain-run.mjs`——语法绿。
3. 首个真批（2026-10-02，30 题当前组合）运行中：隔离头打印、`.runs/<stamp>/` 建槽、
   Q1 产出已入 `Q1/` 槽——批后读数与 G2 预判见同日 G2 机器预判卡。
