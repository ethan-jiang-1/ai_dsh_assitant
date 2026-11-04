---
status: 已结
opened: 2026-11-04
---

# 推敲：代码形状与仓库卫生的机器读数（ub-mode 对照的三处缺口）

> 立卡：2026-11-04 ｜ 状态：已结 ｜ 毕业：做现在 ｜ 去向：implemented ｜ 可关闭：是
> 授权：2026-11-04 用户明确授权 agent 自主推进（“长期的、正确的就好，别短视，你来帮助我”）；不可逆删除（未合并分支、仓外目录）仍需单独确认。
> 结论：三项读数落地——`code-shape` 只报告不设阈值；mutation 一次性 probe 补掉 3 个 meaningful survivor；`hygiene` 只报告并完成安全清理（`.tmp` 301M→190M、worktree 元数据已 prune、未合并分支保留）。GAP 3 不改仓，触发 = 同一前提重复两个 bug 周期。
> 审查：agent — 机械 `pnpm verify` / `pnpm check`；语义自审跨 `dev/`、`scripts/`、`docs/`；用户授权自主推进，不再逐片 review。
> 去向 = [implemented note](../../../notes/implemented/2026-11-04-code-quality-readings.md)。

## 外部结果三要素

- **触发**：2026-11-04 用 ub-mode 对照本仓，发现三处缺口：①代码形状与测试强度只有人工审计，没有机器读数；②清理仪式只覆盖 `.tmp`，不覆盖 git worktree / 分支；③“attack the premise”未成文。
- **用户得到**：一份有数字的 S0 决策备忘；按证据决定是否常驻的 `pnpm code-shape` 只读读数；被 mutation survivor 指向的补测；`pnpm hygiene` 只读报告 + 一次性安全清理；GAP 3 的处置记录。
- **完成条件**：`pnpm check` 全绿；新读数带 `--self-check` 且不因 findings 非零退出；`docs/commands.md` / `docs/testing.md` / `dev` 文档同步；没有新增代码形状门禁、阈值或第三方依赖；删除动作全部有记录；每片一个带 why/what/evidence 的 commit。

## 方案与取舍

- **读数不是门禁**：复杂度、重复、mutation 只出报告；阈值与门禁等第一处真实缺陷证据。借 ub-mode 的意图，不借它的数字。
- **先手工做一遍再决定是否造工具**：S0 用 `.tmp` 抛掷脚本量复杂度、跑 10 个 mutant；只有它证明“报告会提前抓到真问题”才建 `code-shape`。
- **mutation 不引第三方**：手工 harness 改一个文件、跑对应 spec、立即恢复；不装 Stryker，不跑全量。
- **清理只报告**：`hygiene` 不删任何东西；`.tmp` 删除复用 `pnpm sweep` 的保护规则；worktree 只 `prune` 元数据；未合并分支保留，记录用途待定。
- **GAP 3 不改仓**：外部 `diagnosing-bugs` 技能已覆盖诊断，bug 通道已有根因证据要求；加模板行是第二份。触发 = 接下来两个 bug 周期重复同一前提。

**输掉的方案**

- **直接上 CRAP<10 / 重复率阈值 / coverage 门**：没有“删了才对”的死代码实证，阈值会逼出拆函数凑数；与 `docs/testing.md` 的 coverage 姿态冲突。
- **装 Stryker/jscpd/eslint**：维护与组合成本大于当前收益；本仓 scripts 纪律是 Node 内置 + 仓内已有。
- **中央 GLOSSARY**：会造第二份词表；domain 词汇已分散在模块 JSDoc + docs owner 表。
- **`sweep --git`**：把 git 报告塞进 `.tmp` 清扫器，两个关注点混在一个命令；改立独立只读报告 `hygiene`。
- **自动删除未合并分支/worktree**：未提交工作等决定；删除权不交给脚本。

## 验收标准

1. **S0**：复杂度基线（函数数、>60 行、>10 决策点、top N、按目录分布）+ 重复扫描（8/12 行窗口）+ mutation probe（18 个 mutant，killed/survived/invalid 表）落卡；给出“建不建 `code-shape`、补哪些测试”的明确决定。
2. **S1（条件）**：`pnpm code-shape` 可跑；纯核有 `tests/tooling/code-shape.spec.mjs`；`--self-check` 接进 `pnpm verify`；findings 不影响退出码；`docs/commands.md` 与 `docs/testing.md` 各一行；无阈值、无新门禁。
3. **S2（条件）**：每个 meaningful survivor 有处置（补测 / equivalent 理由 / 删死代码）；补测红→绿；复跑 mutant 确认 killed；`pnpm check` 绿。
4. **S3**：`pnpm hygiene` 输出 `.tmp` / worktree / branch / 未提交四段，只读；纯核有 spec；`docs/commands.md` + `docs/dev.md` 同步；一次性 `.tmp` 清理与 `git worktree prune` 执行并记录；未合并分支保留并记录。
5. **S4**：GAP 3 的“不改仓 + 触发”决定写进本卡；不新增规则。
6. **全局**：`pnpm check` 全绿；`pnpm verify` 的 freshness 门不因新文档/命令红；切片 commit 带 why/what/evidence。

## 切片台账

| 片 | 状态 | 证据 |
|---|---|---|
| S0 证据探针 | 已交付 | 1671 个函数/方法/回调；41 个 >60 行；87 个 >10 决策点；12 行重复 0 组、8 行 10 组；18 个 mutant 14 killed / 4 survived |
| S1 code-shape 读数 | 已交付 | `dev/reports/code-shape.mjs` + `tests/tooling/code-shape.spec.mjs`；`pnpm code-shape` 可跑；`--self-check` 进 verify；故意破坏决策计数 → self-check 红 |
| S2 survivor 补测 | 已交付 | 3 个 meaningful survivor 补测（长值不折行、数组 body、`no knowledge page` 404）；复跑 17 killed / 1 equivalent |
| S3 hygiene 报告 + 清理 | 已交付 | `dev/reports/repo-hygiene.mjs` + `tests/tooling/repo-hygiene.spec.mjs`；`.tmp` 301M→190M（删 24 条）；`git worktree prune` 清掉 stale 元数据；3 条未合并分支保留 |
| S4 GAP 3 处置 | 已交付 | 不改仓；触发 = 接下来两个 bug 周期重复同一前提，写进本卡与 note |

## 证据

- **复杂度基线**：`src` 共 1671 个函数/方法/回调；41 个 >60 行、87 个 >10 决策点。分布：client 882/14/27、domain 302/8/20、host 313/6/19、cli 52/4/11、agent 111/9/9。最高：`submitMutation` 75 决策/158 行、`ProjectionPanel` 67/248、`learn.execute` 54/231、`OnePageHome` 51/246。热点多为动词分派与 UI 组件，当前不构成必须拆的缺陷；决定建只读读数而不是阈值。
- **重复**：12 行归一化窗口 0 组；8 行窗口 10 组，集中在 schema 字段块与少量字段构造（`learn/index.ts`、`tool-operating/mutations.ts`、`cli/assistant-data`）。当前不建 dryer；触发 = 首次真实重复事故。
- **mutation probe**（`.tmp` 抛掷 harness，目标 `frontmatter.ts` + `rooms/actions.ts`，跑 owning domain spec + host spec）：
  - 初始 18 个：14 killed / 4 survived（F8、F9、R2、R8）。
  - S2 后 17 killed / 1 survived。F8 是 equivalent：`yaml.stringify` 本身省略 `undefined`，显式 guard 保留为防御；F9 补“长值不折行”；R2 补“数组 body = invalid-body”；R8 补“`no knowledge page` → 404”。
- **S1**：`pnpm code-shape` 输出函数长度/决策点/重复窗口；`--self-check` 已进 `pnpm verify`；findings 不影响退出码。prove-it-red：临时关掉决策计数，self-check 报 `expected a >10-decision function, max was 1`，恢复后绿。
- **S3**：`pnpm hygiene` 输出 `.tmp` / worktree / branch / 未提交四段；只读，不删除。一次性清理：`pnpm sweep --apply` 删 24 条（`.tmp` 301M→190M；`web-expected/` 189.7M 有打开句柄，保留）；`git worktree prune` 清掉 stale 元数据（仓外目录当时已不存在）。三条未合并分支保留：`ab/a1-allowlist`、`ab/a2-recall`、两条 `prototype/*`。
- **全局**：`pnpm verify` 60/60；`pnpm check` 通过（typecheck → build/test → verify）。

## 仍未取

- 三条未合并分支（`ab/a1-allowlist`、`ab/a2-recall`、两个 `prototype/*`）的保留/删除：脚本只报告，删除需单独确认；本轮保留。
- `.tmp/web-expected/`（189.7M）有打开句柄：保留，待进程结束后再清扫。
- `code-shape` 的阈值/门禁：不设；触发 = 第一处它本可提前抓到、但审计后才发现的回归。
- mutation 常驻工具：不建；触发 = 第三次需要手工 mutation（同一多步流程第三次）。
- GAP 3：不改仓；触发 = 接下来两个 bug 周期重复同一前提。
