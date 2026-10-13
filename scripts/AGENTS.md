# AGENTS.md —— `scripts/` 子树常设指令

> 根 [`AGENTS.md`](../AGENTS.md) 管全仓规则；本文件拥有**门禁与生成器**的常设指令。
> 进了这个目录再读本文件——DSH 原生指令装载器按目录链加载。

## 门禁的三条纪律

1. **新检查必带负例夹具**：新增一条 `verify` 检查 = 同 diff 在
   `packages/dsh-smart-assistant/tests/tooling/` 里该核所属族的对名 spec（核住 `scripts/checks/gates/<family>.mjs`，
   夹具住 `<family>.spec.mjs`，同名对齐）配一个"造红再证绿"夹具
   （= [`docs/testing.md`](../docs/testing.md) 政策条款的 **prove-it-red**，一词一义）。
   没证明过会失败的守卫不是守卫（借 DSH `docs/testing.md`：introduce the regression, watch red, revert）。
2. **检查逻辑与被检查语料分开**：可夹具化的**纯核**放 `scripts/checks/gates/` 的族模块
   （收路径/输入，返回问题串数组；`verify-checks.mjs` 是它们的汇总出口，verify 与夹具只认这个面）；
   `verify.mjs` 只拥有"什么算语料、退出码、逐条报告"。这样每个接受/拒绝形态都能在 throwaway 夹具上跑。
3. **被阻断的检查不得写成绿色证据**：跑不了/没跑完的检查，报告里如实写"阻断 + 原因"。

## 生成器与 freshness

生成物必须**登记**（生成物 / 生成器 / freshness 检查，表在 [`docs/dev.md`](../docs/dev.md) §二），
并且 freshness 由 `pnpm verify` 守。现有范式：`gen-paths.mjs` → `tsconfig.tsx.json`
（`--check` 模式即门禁）。新增生成器的固定形状：`--check` 与生成同源、diff 非空即红。

## 收尾三连与触发条件

- 每个切片的收尾：`pnpm typecheck && pnpm test && pnpm verify`；
- **改动发布物 / 依赖 / preset 包装 / 工具面**时追加：`pnpm build && pnpm release-smoke`
  （组合测试与 smoke 消费 `lib/` 产物——不 build 会拿到旧行为，历史上真发生过假绿）；
- 换 pin：`pnpm sync-dsh -- --tag <tag>`（它自己跑 typecheck 并按
  [`vendor/UPSTREAM.md`](../vendor/UPSTREAM.md) 的重审触发表提醒复核面）。

## 本子树的风格

纯 ESM `.mjs`，无构建；不引第三方依赖（Node 内置 + 仓内已有）；注释写"为什么这么查"，不写"查什么"。
