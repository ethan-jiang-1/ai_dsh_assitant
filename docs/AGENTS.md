# AGENTS.md —— `docs/` 子树常设指令

> 根 [`AGENTS.md`](../AGENTS.md) 管全仓规则；本文件拥有**文档 tier** 的常设指令。
> 进了这个目录再读本文件——DSH 原生指令装载器按目录链加载。

## 文档只写现在

- **禁历史叙事**：不用 `previously / now / no longer / 曾经 / 已不再`；不写"以前是 X，现在改成 Y"。
- **合同自足**：当前事实写在本目录。不链接单篇 note，也不把「见某篇决定」当成合同的一句。
- **平台事实读 vendor**：DSH 怎么工作（机制、文档 tier、主仓技能、主仓 note 制度）的正文在 `vendor/dsh`。本目录只写本插件的合同。路由在根 [`AGENTS.md`](../AGENTS.md) 硬规则 2。
- **合同与代码对齐**：`docs/` 的每一句"是什么"都必须与代码现况一致；不一致就是 bug。
- **生成物不手改**：[`package-catalog.md`](package-catalog.md) 由 [`scripts/generate/gen-catalog.mjs`](../scripts/generate/gen-catalog.mjs) 生成（`pnpm gen-catalog`），改它等于改生成器。

## 谁拥有什么（改前先认领）

| 文件 | 拥有的事实 | 与代码的钉定关系 |
|---|---|---|
| [`home.md`](home.md) | working folder **布局与房间语义**（路径、生命周期、curate 检查面、四房间动词） | 布局 owner = `packages/dsh-smart-assistant/src/domain/home/layout.ts`；`verify` 校验本文列出的房间与代码常量一致 |
| [`operating.md`](operating.md) | **经营账本与桌面投影**（第二持久化面：账本服务、13 动作工具、投影下载与客户端读回链） | 账本服务 owner = `packages/dsh-smart-assistant/src/host/operating-ledger/index.ts`；下载 route = `desk-projection/download.ts`；工具动词表 = 生成物 `package-catalog.md` |
| [`delivery.md`](delivery.md) | **交接/备份/数据边界**（agent 物 vs 用户数据、handoff 扫描、两目录导出/导入、升级的数据承诺） | 实现 = `scripts/release/handoff-scan.mjs`、`scripts/release/handoff-core.mjs`、`packages/dsh-smart-assistant/src/cli/assistant-data.ts`；测试 = `tests/tooling/handoff-scan.spec.mjs`、`assistant-data.spec.mjs` |
| [`architecture.md`](architecture.md) | 组合层级、两个平面、部件与 owner 面、参与阶梯、**界面三层（常用/深看/调试）**、新行为归属、三条运行链路与六条功能路由 | 与 `cordis.patch.yml` 的行一致（host 行 + `preset-assistant` 行的 plugins）；链路引用的源码/脚本/命令真实存在 |
| [`identity.md`](identity.md) | **名字与皮肤面**（身份名、改名代价、皮肤清单） | 改包名/patch 行 id/preset id 等必须同 diff 更新本文；`verify` 校验声明的身份名都在场 |
| [`dev.md`](dev.md) | 开发环境：双 home、两个 profile、命令、生成器与 freshness、调试手册 | 命令与 `package.json` scripts 一致 |
| [`discipline.md`](discipline.md) | **纪律继承表**（逐源枚举：借什么/怎么适配/偏离登记）与反馈层、门禁边界 | 新门禁/新纪律先在这里登记一行（约束 → 适配 → 证据） |
| [`testing.md`](testing.md) | **测试面合同**：一页证据地图、插件证据五台阶、政策禁令、已定姿态与升级触发 | 样板文件路径与 spec 现读机制须与 `tests/`、`cordis.patch.yml` 现况一致 |
| [`package-catalog.md`](package-catalog.md) | 包当前形状的**生成索引**（入口×平面、工具×动词、行 id、pin 与依赖姿态） | 生成物；freshness 由 `pnpm verify` 的 `gen-catalog --check` 守 |

## 写文档前自检（作者视角）

**只拿到 HEAD、没有会话 transcript 的读者，能否解析每个引用并核验每个 claim？**
裸简称（`R1`、`r5 §末` 之类）一律写成可点链接；跨文件引用用相对 Markdown 链接（`verify` 可机械检查）。
术语用一个词一个意思；与 DSH 官方词撞名时在首现处加括注说明**我方含义**。
