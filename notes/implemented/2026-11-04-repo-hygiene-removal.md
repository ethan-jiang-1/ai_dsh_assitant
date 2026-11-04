日期：2026-11-04 · 状态：**implemented**

# repo-hygiene 去留：删掉包装，保留收口动作

## 问题（可观察行为）

`repo-hygiene` 是 `pnpm sweep` 加三条 git 命令的只读包装：它把 `.tmp` 计划、worktree、分支、未提交
读成一张表，但不删除任何东西。建成后没有消费者；减法扫描把代码里成规模的重复收完后，它是唯一
还成规模的自造工具。

## 决定

- 删除 `repo-hygiene` 报告（实现与 spec 已不在仓库）、`hygiene` alias、verify self-check、命令文档行。
- 阶段收口保留动作本身：`pnpm sweep`（dry-run 后按需 `--apply`）、`git worktree prune`、分支逐个复盘；
  删除仍由人执行，不自动删。
- `code-shape` 保留：它是减法/形状的前后测量仪，不是这次删的对象。
- 重建触发：连续两次阶段收口漏掉 stale worktree 或该复盘的分支。

## 输掉的方案

- **保留一个月再决定**：没有消费者；293 行包装对 3 行收口动作，保留只是把“我们一直在堆”再延长一个月。
- **把 git 报告塞进 `sweep --git`**：`.tmp` 清扫与 git 卫生是两个关注点，混在一个命令会让两边都不清。
- **自动删分支 / worktree**：未提交工作等决定；删除权不交给脚本。

## 后果

- 阶段收口按 [`docs/commands.md`](../../docs/commands.md) 的 sweep 行执行 `git worktree prune` 与分支复盘。
- 重建触发写在 [`_backlog/triggers.md`](../../_backlog/triggers.md)。
- 这是对 [读数 note](2026-11-04-code-quality-readings.md) 的部分收窄；其余决定（`code-shape`、mutation 探针、
  不设阈值、GAP 3 不改仓）不变。
