日期：2026-11-01 · 状态：**proposed（待重审）**（新卡：[产品 profile 对齐](../../_backlog/issues/261101-product-profile-alignment.md)）｜本 note 的“原生安装 + onboarding、启动器可选”方向被收窄为“dedicated `assistant` profile + bundle 自有启动 + 薄安装器”；待拍板后改写或归档，正文保留为取舍记录。

# 启动路径：DSH 原生安装做底座，产品开始页/工作区选择放客户端层

## 问题（可观察行为）

本产品现在靠 `bootstrap.mjs --workspace` 一条命令起：产品 home、`assistant` profile、装 tarball、设默认 preset、
写工作区绑定、起 Web。对照的 `dsh-deck-studio` 走标准 DSH 三条命令：建 profile → `dsh plugin add` → `dsh --profile`；
没有启动器、没有产品 home，项目根/数据根从 profile 配置来。

用户的要求是：**最好别破坏 DSH 建立的安装/启动要求**（这样分发容易），但本产品确实有特殊性质——
开始页、工作区选择、产品 preset、产品 home；完全继承 DSH 原生（一页纸 + 原生 Workspace 侧栏 + 默认 workspace）
会别扭。

实验事实（临时 home，未改产品代码）：

- 标准三条命令能装/能起本包；无绑定时产品行 `not-configured`、门透明，DSH 用默认工作区，交付包会落到默认工作区；
- 补一条产品设置（`assistant-product/settings.json` 的 `workspaceDir`）后，门/工作区登记/CTA/交付包全部回来；
- 标准路径还缺默认 preset；门 CTA 显式传 `assistant`，但 DSH 原生“新会话”仍是 profile 默认；
- deck-studio 的对照路径把项目放在 profile 配置/自己的 workbench，源只读、产物进插件 `dataRoot`——与本产品
  “交付包留在用户项目”相反。

完整证据：[启动路径比较](../../_backlog/research/261101-startup-model-comparison/README.md)、
[DSH 原生安装 + 产品客户端层](../../_backlog/research/261101-startup-model-comparison/261101-dsh-native-product-layer.md)。

## 提案

**安装/启动归 DSH，产品的第一个页面归客户端插件；启动器降为可选。**

1. **主安装/启动 = DSH 原生**：`dsh plugin --profile assistant add dsh-smart-assistant`（npm/市场；tarball 等价）
   → `dsh --profile assistant --port 0`。不要求自定义 profile 创建器；包仍是 bundle；不新增 app bin。
2. **开始页 = `ProductGate` 的 onboarding 模式**：产品行 `not-configured` 时，`main` 槽显示产品首屏
   “选一个项目目录”，用 DSH 原生目录选择器（`remote.directoryPicker`）选路径；客户端 POST 到现有
   `api/assistant/product`；产品行校验/登记/写设置；门进入 `ready`。提供“稍后”回普通一页纸；不强迫。
3. **工作区选择 = DSH 目录选择器 + 现有产品路由**：不新造文件浏览器；native/browse 后端由 DSH 组合决定；
   路径策略/注册/权限沿用产品行；“产品 home”不是安装要求。
4. **preset**：门 CTA 显式 `agentPreset: 'assistant'`，从产品首屏进入的会话一定是产品 preset；
   DSH 原生“新会话”的默认 preset 由 profile patch 或 bundle patch 决定（要改所有装此 bundle 的默认，
   需明确取舍）；没有设时，产品首屏仍是主入口。
5. **启动器保留为可选的“产品安装器”**：一条命令、产品 home、预绑工作区、离线；内部仍走同一套 DSH CLI，
   不替代 DSH 安装要求。目标用户/离线用启动器；DSH 用户走原生安装 + 首屏选目录。
6. **分发**：npm publish/市场索引是 O5 的发布决定；包本身已是标准 bundle；先不把发布宪章改成“已发布”。

**产品特殊性留在客户端首屏，不塞进安装器，也不做全页 workbench/`dataRoot`。** 安装器只做 DSH CLI 的包装；
开始页/工作区选择/门/CTA 是客户端插件的一层。

## 输掉的方案

- **完全继承 DSH 原生、不做 onboarding**：用户装了插件后看到一页纸 + 默认工作区，不知道要选项目；
  交付包落默认工作区；这正是用户说“别扭”的地方。
- **只用启动器**：分发靠 tarball/一条命令，DSH 用户/团队没法用原生 `dsh plugin add`；不适合“分发容易”。
- **标准三条命令 + 只给 `workspaceDir` profile 配置**：能跑、保留功能，但用户要写 YAML；不是优秀
  体验，只适合团队/headless。
- **全盘仿 deck-studio**：全页 workbench + 插件 `dataRoot` + 源只读 + `sessions.create({cwd})`；与四房间/
  账本/一页纸/项目交付包冲突；启动比较不需要动产品面。
- **现在做全页产品壳/隐藏 DSH 侧栏**：这是另一个界面决定；先让开始页/选择器在 `main` 槽成立，再谈壳。
- **给原生路径默认建产品 home**：插件无法设宿主 home；预建隔离会替用户决定数据边界；用 `DSH_HOME` 显式选择，
  或用启动器。

## 验收

若拍板，完成条件：

- 标准临时 profile（三条命令，无启动器）+ 产品行 onboarding 默认打开：首屏是产品开始页，选一个项目目录后
  门显示 `工作区 · <项目>`、`开始一件事`；工作区登记；会话 cwd = 项目；`deliverables/` 落项目。
- 选择器取消/非法路径有可读原因；不自动建目录；“稍后”回普通一页纸。
- 设置文件/行配置仍可预绑（团队/headless）；坏设置仍 `invalid`；headless 仍禁用产品行。
- `pnpm typecheck && pnpm build && pnpm test && pnpm verify` 绿；`pnpm product-smoke` 回归绿（启动器路径不变）；
  新增 onboarding 的 client spec + web-face 场景。
- 文档同 diff：README、包 README、`docs/product.md`、`_dist/安装手册.md`；把“DSH 原生安装 + 首开选目录”
  写成主路径，启动器写成可选；profile patch 只留给团队/headless/默认 preset。
- 分发：npm publish 是否本轮做，单独拍板；不在本卡悄悄改 release charter。

## 证据

- 实验与截图：[启动路径比较](../../_backlog/research/261101-startup-model-comparison/README.md)
- 对照事实：[deck-studio 启动](../../_backlog/research/261101-startup-model-comparison/261101-deck-studio-startup-facts.md)
- 本产品实验：[标准三条命令的无绑定/有设置](../../_backlog/research/261101-startup-model-comparison/261101-our-startup-and-experiments.md)
- 维度/选项：[对比与建议](../../_backlog/research/261101-startup-model-comparison/261101-comparison-and-recommendation.md)
- 分层设计：[DSH 原生安装 + 客户端层](../../_backlog/research/261101-startup-model-comparison/261101-dsh-native-product-layer.md)
- 安装手册事实修复：headless 产品行禁用、产品模式备份/升级、首跑凭据、standalone 指针（见 `_dist/安装手册.md`）
