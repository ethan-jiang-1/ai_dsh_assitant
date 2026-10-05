# P1 验证可信度：真实组合、资产发现与 runner 身份守卫

日期：2026-10-05 · 状态：**implemented**

## 决定

P1 采用最小证据链修复组合与测试门禁的可见性缺口，不迁测试目录、不改变产品行为、不改 vendor。真实组合从包根 `cordis.patch.yml` 的 `preset-assistant` 行读取配置，只筛选 `dsh-smart-assistant/*` agent rows；组合入口 `pnpm test:composition` 先构建再运行，直接运行缺少 `lib/index.js` 时明确失败而不是跳过。带 `!!js` 的 YAML 由 Include 使用的 `entryListSchema` 与 `js-yaml` 解析，保持与生产配置形状一致。

`testAssetNamingProblems` 递归检查包测试树，`fixtures/` 与 `support/` 子树豁免；`verify-gates.spec.mjs` 提供嵌套非法代码资产的负例及嵌套 fixture harness 的正例。

`export-shape.spec.mjs` 明确解析四个实际 runner patch：`expert-probe.patch.yml`、`recall-probe.patch.yml`、`preset-runner.patch.yml`、`preset-runner-replay.patch.yml`。它递归读取 `insert` 行，筛选 `dsh-smart-assistant/preset-runner`，并断言每个 patch 恰有一行、`!!js` task 保持惰性表达式、模块没有 default、Loader unwrap 往返成立、插件导出名保持 `assistant-preset-runner`，以及每个现行 patch row id 保持其显式身份：expert/recall 为 `preset-runner`，main/replay 为 `assistant-preset-runner`。

## 反证与证据

- runner 身份反证：临时把 expert patch 的 `id: preset-runner` 改成错误值后，`pnpm --filter dsh-smart-assistant exec vitest run tests/export-shape.spec.mjs` 以 exit 1 失败，命中该文件的显式身份断言；随后恢复。
- 配置缺行反证：临时从 shipped YAML 删除 `assistant-memory-tool` 后，组合 spec 以 exit 1 失败，两个要求四工具的断言都缺少 `assistant_memory`；随后恢复。
- 绿色窄证据：`export-shape.spec.mjs` 四 runner patch + 包行共 13 tests 通过；`preset-composition.spec.ts` 6 tests 通过，共 19 tests。
- 递归资产检查的旧实现负例与缺构建物负例已在本片实现前实际执行并恢复，详见 P1 计划与测试门禁夹具。

## 输掉的方案

1. 保留手写 `OWN_ROWS`：它不能随 shipped 配置变化而失败，无法证明真实 preset 行；改为从 `preset-assistant` row 派生，并明确只覆盖本包 agent seam。
2. 继续用 `parseRows` 解析 dev patch：它不是嵌套 YAML 解析器，会误读 replay 的 provider/model 行；改用 Include 的生产 schema 与直接 dev patch 清单。
3. 仅覆盖主 runner patch：expert、recall、replay 都是实际使用的 runner 身份面；四文件逐一断言，避免“默认 patch 通过”掩盖 sibling drift。
4. 缺构建物时 `describe.skip`：这会把发布物旧行为当绿；改为直接报错并在组合命令前置 build。

## 范围与后果

本片证明 shipped agent preset 的真实配置消费、构建物前置、测试资产递归发现和四个 dev runner patch 的身份一致性；不等同于完整产品 boot、live 模型回合、浏览器渲染或发布安装全出口。四个 patch 的 id 修复保持公开 runner 插件导出名一致，不改变 runner 的行为、命令或 profile/home 语义。
