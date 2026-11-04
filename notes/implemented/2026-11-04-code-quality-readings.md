日期：2026-11-04 · 状态：**implemented**

# 代码质量读数：报告不是门禁

## 问题（可观察行为）

ub-mode 对照暴露了两个一直靠人补的缺口：代码形状与测试强度没有机器读数，清理仪式只覆盖 `.tmp`。
七维审计连续三轮手工量函数长度/决策点、手工找 god-module；mutation 只在“新守卫”上做 prove-it-red，
行为 spec 的强度没有读数。清理侧 `pnpm sweep` 只扫 `.tmp`，worktree 与分支靠偶尔想起来。

## 决定

1. **`code-shape` 是读数，不是门禁。** 它报函数长度、决策点；不设阈值，不因 findings 非零退出；
   `--self-check` 进 `pnpm verify` 只自证仪表本身。阈值与门禁等第一处它本可提前抓到的真实回归。
2. **mutation 保持一次性探针，不常驻。** 手工改一个文件、跑 owning spec、立即恢复；survivor 按
   “补测 / equivalent 理由 / 删死代码”处置。第三次需要同一流程时才考虑常驻（本仓“第三次就立”规则）。
3. **`hygiene` 只报告，不删除。** 四段：`.tmp` 可回收项、worktree、branch、未提交。删除仍由人执行
   `pnpm sweep --apply` / `git worktree prune` / `git branch -d`；未合并分支保留，报告只提示。
4. **GAP 3 不改仓。** 外部 `diagnosing-bugs` 技能与 bug 通道的“根因有证据”已覆盖诊断；
   触发 = 接下来两个 bug 周期重复同一前提，才在 bug 模板加一句“先写前提、数 actor、再动手”。
5. **重复不建 dryer。** 12 行窗口的重复为 0；8 行有 10 组，集中在 schema 字段块与少量字段构造，
   当前不构成需要工具化的痛点；触发 = 首次真实重复事故。

## 输掉的方案

- **直接上 CRAP<10 / 重复率阈值 / coverage 门**：没有“删了才对”的死代码实证，阈值会逼出拆函数凑数；与既有的 coverage 读数姿态冲突。
- **装 Stryker / jscpd / eslint**：维护与组合成本大于当前收益；本仓 scripts 纪律是 Node 内置 + 仓内已有。
- **中央 GLOSSARY**：会造第二份词表；domain 词汇已分散在模块 JSDoc + docs owner 表。
- **把 git 报告塞进 `sweep --git`**：`.tmp` 清扫与 git 卫生是两个关注点，混在一个命令会让两边都不清；改立独立只读报告 `hygiene`。
- **自动删除未合并分支 / worktree**：未提交工作等决定；删除权不交给脚本。
- **再写一份七维审计报告**：round3 已判定“第四份只会训练下一次”；读数与卡上的证据足够。

## 后果（还会约束以后的）

- `pnpm code-shape` 与 `pnpm hygiene` 只做读数；不要因为“报告里数字大”就加阈值——先找到它本可提前抓到的回归。
- 测试强度的默认读法是手工 mutation probe，不是常驻工具；survivor 的 equivalent 判定要写理由。
- 分支与 worktree 的删除永远是人的决定；`hygiene` 只把选择摆出来。
- GAP 3 未成文是决定，不是遗漏；重复出现两次再立规则。
- 卡的完整证据（复杂度分布、18 个 mutant 的 killed/survived、清理前后大小）在
  [261104 收口卡](../../_backlog/_archive/settled_issues/261104-code-quality-readings.md)；本 note 只留决定与输掉的方案。
