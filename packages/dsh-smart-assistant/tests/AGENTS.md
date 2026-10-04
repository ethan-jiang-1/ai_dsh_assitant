# AGENTS.md —— `tests/` 子树常设指令

> 根 [`AGENTS.md`](../../AGENTS.md) 管全仓规则；包层 [`AGENTS.md`](../AGENTS.md) 管包纪律；
> 本文件拥有**测试树的资产形态规则**——进这个目录写测试前先读。

## 命名即车道

- 每个代码文件必须匹配 [docs/testing.md](../../../docs/testing.md) 命名表的**已收编形态**：
  `*.spec.{ts,mjs}`（单元/合同/守卫）或 `*harness.ts`（共享夹具，刻意不被任何 include 选中）。
  `verify` 的 test-asset 门机械执行这条——新形态（`*.e2e.ts`、`*.snapshot.ts`、`*.bench.ts`…）
  **先入 testing.md 的表、同 diff 更新门禁豁免，再落文件**。
- 测试文件名与**被测模块对齐**（`webui-expected-core.spec.mjs` 测 `webui-expected-core.mjs`）；
  测试的是行为，文件头 docstring 列验收点。
- `fixtures/`、`support/` 形态的子目录按上游惯例豁免于门禁；出现时同 diff 进表。

## 树内纪律（与包层纪律互补，不重复）

- 共享夹具放 `*harness.ts` 或将来 `fixtures/`——**绝不 import 另一个 spec**（会重复注册、重复副作用）。
- scoped 注册断言必须带与 `createScope` 同一引用的 scope key；`assemble({ scope })` 免 agent 全家桶
  （实证记录：`registry-lifecycle.spec.ts` 头注释）。
- 新守卫（含 `verify` 检查）必须 prove-it-red：造回归、看红、还原（负例夹具的家：
  `verify-gates.spec.mjs`）。
