# 干净发布：src 出发布物 + export-dist 手动分发导出

日期：2026-09-29 · 状态：**implemented（用户拍板"抄 company 的 _dist 思想、发干干净净的包"，同轮落地）**

## 交付了什么

1. **发布物边界收窄**：`packages/dsh-smart-assistant` 的 `files` 去掉 `src`、exports 摘除
   `"./src/*"`。tarball 从此只装运行时四件套：`lib/ + presets/ + cordis.patch.yml + README.md`
   （实测 145 条目，`src/` 的 33 个 `.ts` 不再入包）。
2. **`scripts/export-dist.mjs`（`pnpm export-dist`）**：手动分发导出，三规矩照搬
   `ai_dsh_company` 的同名脚本——① `_dist/` 是导出目的地不是源（tgz 走根 `.gitignore` 已有的
   `*.tgz` 规则，《安装手册》是唯一 tracked 例外）；② 打包步 = `release-smoke` 每轮证明的同一条
   `pnpm pack`；③ 手册脚本生成、注入版本/日期/条目数，永不手改。导出 ≠ 发布：不 bump、不发
   registry，按工作树现状打包；打包前要求 `lib/` 已构建（缺 `lib/index.js` 直接 fail，指向
   `pnpm build`）。清单边界断言在必备条目之外带**禁入清单**（`src/`、`tests/`、`node_modules/`、
   `vendor/`、`tsconfig*`、`package/` 外文件）与 peer 具体化断言。
3. **verify 新门禁**「release: the exported install manual matches the package」：手册若在，
   版本行与安装包名必须等于包 manifest（bump 不重导 = 红）；无 `_dist/` 即无导出，门禁绿。
   纯核 `exportManualProblems` 进 `verify-checks.mjs`，负例夹具进 `tests/verify-gates.spec.mjs`
   （缺席/一致收红，版本漂移/包名漂移/表头缺失各红）。

## 澄清的事实（本轮困惑的正面回答）

**`vendor/dsh` 在发布时不需要任何处理**：它是纯开发期依赖——typecheck 的 paths 入口、`pnpm dsh`
的 tsx 启动源、release-smoke 的启动器——三者都不经过 pack。运行时的 `@deepseek-ai/*` 依赖走
`peerDependencies`，安装时由宿主 DSH 运行时提供；`files` 白名单把 vendor 挡在 tarball 外。
风险不在 vendor 而在**打包姿势**：在仓库根对无 `files` 的根 manifest 跑 pack，会得到一个
36 MB、含 vendor 全树（13,832 文件）的 tarball（本轮实测）——发布物只能是
`packages/dsh-smart-assistant`，这正是导出后断言"无 `package/` 外文件"要拦的形状。
另一个澄清：DSH 各包发布 `src` 是 house convention（`vendor/dsh/vendor/README.md` 记过裁决），
原因是 **DSH 自家的 release 运行时跑源码（tsx）**；本插件运行时入口是编译后的 `lib/`，
不在该 convention 的适用范围内。

## 输掉的方案

- **照 DSH house convention 保留 `src` + `"./src/*"` export**：败因——本仓无任何消费者走该
  export（挂载全走具名 `lib` 子路径；dev 脚本读 src 走仓库相对路径 + tsx，不过 exports）；
  company 包 lib-only 实证宿主不需要插件源码；export map 指向缺席文件是 vendor README 记过的雷。
- **`npm pack`（照 company 原样）**：败因——本包 peers 写 `workspace:^`，只有 pnpm 改写；
  原判定在 repo-structure note（docs/discipline.md「已声明的适配」5 有指针）。
- **导出挂全套门禁链（bump + verify + smoke 才许导）**：败因——导出 ≠ 发布是借来三规矩之一；
  smoke 已由「改动发布物必跑」规则在发布语义变更时强制，导出只是快照工作树。
- **连 sourcemaps 一起剔**（lib 的 `.map` 指向缺席的 `../src`）：未采——map 便于对着仓库源码
  调试安装产物，无害，company 亦保留；真要剔走 tsc 选项，不进本轮。

## 验证（实跑）

`pnpm typecheck` 绿；`pnpm test`、`pnpm verify`（30 检查含新 release 门禁与夹具）、
`pnpm build && pnpm release-smoke`（发布物变更必跑）、`pnpm export-dist` 全绿——导出产物
`_dist/dsh-smart-assistant-0.0.0.tgz` 清单断言 145 条目、无禁入路径、peers 具体。
release 门禁首跑即咬真实产物：安装包行带后缀（与本手册同目录）而夹具没钉这个形状，正则行尾
锚点失配报红——修正则并让夹具镜像生成器后全绿；守卫有效性由此实证（会咬真红，不是摆设）。

## 取代检查

以 release-smoke / export / 发布 / _dist / pack 为关键词搜过 notes 活跃树（implemented 与
proposed 两目录）：
[repo-structure](2026-09-23-repo-structure.md) 拥有 pack 工具判定（本文只引用不取代）；
[dsh-alignment-borrowables](2026-09-25-dsh-alignment-borrowables.md) 明言"发布 lane（registry
三态）未建、本仓 private"——手动分发是对**人**交付 tarball，不是 registry 发布 lane，两者并存
互不取代；本文与其互链。其余命中（repo-structure、dev-home-launcher、cultivation-remediation）
是同名机制的不同事实面，无同决定旧 note。
