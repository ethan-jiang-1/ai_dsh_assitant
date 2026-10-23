# AGENTS.md —— `tests/` 子树常设指令

> 根 [`AGENTS.md`](../../../AGENTS.md) 管全仓规则；包层 [`AGENTS.md`](../AGENTS.md) 管包纪律；
> 本文件拥有**测试树的资产形态规则**——进这个目录写测试前先读。

## 命名即车道

- 每个代码文件必须匹配 [docs/testing.md](../../../docs/testing.md) 命名表的**已收编形态**：
  `*.spec.{ts,mjs}`（单元/合同/守卫）或 `*harness.{ts,mjs}`（共享夹具，刻意不被任何 include 选中）。
  `verify` 的 test-asset 门机械执行这条——新形态（`*.e2e.ts`、`*.snapshot.ts`、`*.bench.ts`…）
  **先入 testing.md 的表、同 diff 更新门禁豁免，再落文件**。
- 测试文件名与**被测模块对齐**（`webui-expected-core.spec.mjs` 测 `webui-expected-core.mjs`）；
  测试的是行为，文件头 docstring 列验收点。
- `fixtures/`、`support/` 形态的子目录按上游惯例豁免于门禁；出现时同 diff 进表。
- **目录即被测 interface**（双层寻址：后缀 = 车道，目录 = interface 家）：
  `domain/`（规则与存储基础）、`host/`（服务合同，真 cordis + 临时 home）、`agent/`（工具/段落/provider 合同）、
  `composition/`（配置装载、注册与范围合同；Loader 与直挂两条车道）、`client/`（浏览器注册与交互状态合同）、`tooling/`（仓库工具核）、
  `support/`（共享夹具）。各层能/不能证明什么 = [docs/testing.md 分层表](../../../docs/testing.md)；
  一个 spec 归最主要 interface，跨层依赖文件头注明。

## 树内纪律（与包层纪律互补，不重复）

- 共享夹具放 `*harness.{ts,mjs}` 或将来 `fixtures/`——**绝不 import 另一个 spec**（会重复注册、重复副作用）。
- scoped 注册断言必须带与 `createScope` 同一引用的 scope key；`assemble({ scope })` 免 agent 全家桶
  （实证记录：`composition/registry-lifecycle.spec.ts` 头注释）。
- 新守卫（含 `verify` 检查）必须 prove-it-red：造回归、看红、还原（负例夹具的家：
  `tooling/` 里该核所属族的对名 spec `<family>.spec.mjs`，与 `scripts/checks/gates/<family>.mjs` 同名对齐）。
