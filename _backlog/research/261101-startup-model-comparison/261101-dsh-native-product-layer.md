---
topic: 用 DSH 原生安装/启动作底座，把产品开始页与工作区选择做成客户端层
intent: 给出一个不破坏 DSH 安装/启动要求、又保住本产品开始页/工作区选择特殊性的分层设计，并标出可实验的接缝与未决项。
---

# DSH 原生安装 + 产品客户端层

## 一、约束

用户的要求可以拆成两句：

1. **最好别破坏 DSH 建立的安装/启动要求**——用户应该仍能 `dsh plugin add`、`dsh --profile …` 起；
   不要求一套自定义 profile 创建器才能用。
2. **但本产品确实有特殊性**——开始页、工作区选择、产品 preset、产品 home；完全继承 DSH 原生
   （一页纸 + 原生 Workspace 侧栏 + 默认 workspace + 默认 standard preset）会别扭。

这两句不矛盾：**安装/启动归 DSH，产品的第一个页面归客户端插件。** 不把特殊性塞进安装器，也不把
开始页做成第二个应用。

## 二、分层设计

### 1. 安装/分发：DSH 原生，launcher 可选

- 主路径：`dsh plugin --profile assistant add dsh-smart-assistant`（npm/市场；tarball 等价）
  → `dsh --profile assistant --port 0`。profile 可用 `--from-default-profile web` 建，或用用户现有 profile。
- 包仍是 bundle：`dsh.bundle.patch` + `dsh.client`；不新增 app bin，不手写 profile manifest。
- **启动器 `bootstrap.mjs` 保留为可选的“产品安装器”**：一条命令、产品 home、预绑工作区、离线；
  它内部仍走同一套 DSH CLI，不替代 DSH 安装要求。
- 产品 home 不是 DSH 插件能设的：原生路径用当前 `DSH_HOME`（普通 home）；要隔离就用启动器，或用户
  自己 `DSH_HOME=~/.dsh-smart-assistant`。**产品 home 是部署选项，不是安装要求。**

### 2. 开始页：`ProductGate` 的 onboarding 模式

- 产品行 `not-configured` 时，客户端 `main` 槽不显示普通一页纸，而是**产品开始页**：
  - 标题 + 一句“选一个项目目录，助手会在这个项目里工作”；
  - 一个“选择项目目录”按钮（DSH 原生目录选择器）；
  - “稍后”出口（回到普通一页纸/legacy；不强迫）。
- 选中目录后，客户端 POST 到现有 `api/assistant/product`；产品行校验/登记/写设置；门进入 `ready`，
  显示 `工作区 · <项目>` + `开始一件事`。
- 这不改 DSH 安装/启动；只是 `main` 槽的产品首屏。DSH 侧栏/一页纸在绑定后仍是产品首页；不用全页 workbench。
- 产品通过行配置 `onboarding: true` 打开这个首屏；开发/既有 `web` profile 可设 `false`，保持旧行为。
  启动器写设置，因此产品启动器路径不会看到 onboarding（已绑定）。

### 3. 工作区选择：用 DSH 自己的目录选择器

- 客户端可注入 `remote.directoryPicker`（`ui-workspace` 已用同一 Remote；宿主侧是 `ctx.directoryPicker`，
  native/browse 两种后端由 DSH 组合决定）。`pick()` 返回绝对路径或 `null`（取消）。
- 产品行不需要新的 pick 路由：客户端拿到路径后复用 `POST api/assistant/product`；产品行仍做路径策略
  （绝对/存在/可读写/禁 root/home/产品 home/包内）与 `workspaceRegistry.create()`。
- 远程/无 OS 选择器时由 DSH 的 browse 后端提供应用内目录树；插件不自己造文件浏览器。
- 取消/失败：开始页保留，显示可读原因；不自动建目录。

### 4. 默认 preset：产品入口显式带，profile 默认另行处理

- 开始页的“开始一件事”/门 CTA 已经显式 `startSession(workspaceId, { agentPreset: 'assistant' })`；
  从产品首屏进入的会话一定是产品 preset。
- DSH 原生“新会话”仍走 profile 默认。要让它也是 `assistant`：
  - 首选给产品 profile 的 `agent-preset-registry.default` 设 `assistant`（profile patch，或 bundle patch 里
    覆盖该行；后者会改变所有装此 bundle 的 profile 默认，需明确取舍）；
  - 不设时，产品首屏仍是主入口；原生新会话是次要入口。文档写清。
- 这条是“开始页”特殊性的一部分，不是安装要求。

### 5. 交付包/四房间/门：不变

- 工作区绑定后，会话 cwd = 项目；`deliverables/<date>-<slug>/`、四房间、账本、项目面都不变。
- 不把 deck-studio 的 `dataRoot`/源只读/全页 workbench 搬进来；产品数据仍按既有数据卡。

## 三、可行性证据

| 事实 | 证据 |
|---|---|
| 标准三条命令能装/能起本包 | 临时 profile 实验：`--from-default-profile web` + `plugin add` + `dsh --profile`，行/客户端都在 |
| 无绑定 → 门透明、DSH 默认工作区 | 同实验；`not-configured`、一页纸、无门条 |
| 有绑定 → 门/登记/交付包回来 | 同实验 + 设置文件；`工作区 · project`、`开始一件事`、`workspaces` 有项目 |
| 目录选择器存在，客户端可调 | `ui-workspace` 客户端注入 `remote.directoryPicker`；宿主 `ctx.directoryPicker`；native/browse 后端 |
| 产品行可接收路径 | `POST api/assistant/product` 已有；路径策略/登记已实现 |
| CTA 已带产品 preset | 门 CTA `startSession(workspaceId, { agentPreset: 'assistant' })`；web-face 场景验过开会话 |

**未验证**：开始页选择器在真 Web 组合里的点击/取消、browse 后端、npm 安装、bundle 默认 preset 的影响。
这些是实现切片要补的证据，不是机制未知。

## 四、若要落地（建议切片）

1. **行配置 + 快照**：`assistant-product` 加 `onboarding?: boolean`、`workspaceDir?: string`；
   `not-configured` 快照带 `onboarding`；设置 > 行配置 > 无；坏设置仍 invalid。
2. **客户端开始页**：`ProductGate` 加 onboarding 分支；注入 `remote.directoryPicker`；选择 → POST；
   “稍后”回 legacy；样式走主题 token。
3. **组合默认**：bundle patch 或 profile patch 决定 `onboarding` 默认；dev/headless 显式关；
   默认 preset 的取舍（bundle/profile/只靠 CTA）。
4. **测试**：host 配置/快照；client onboarding 状态与 POST；web-face 场景（标准 profile、无设置、
   onboarding 真渲染；选择器点击可 stub/真机）；`product-smoke` 回归。
5. **分发**：npm publish/市场索引是 O5 的发布决定；包本身已是标准 bundle；launcher 保留为可选离线/
   一条命令/产品 home 路径。
6. **文档**：README/包 README/`docs/product.md`/`_dist` 手册把“DSH 原生安装 + 首开选择目录”写成主路径，
   启动器写成可选产品安装器；profile patch 只留给团队/headless/默认 preset。

## 五、风险与未决

- **onboarding 的默认值**：bundle 默认 true 会让所有装此包的 profile 首次打开看到开始页；开发/既有
  `web` profile 需要 false。默认值本身是产品取舍。
- **DSH 默认 workspace 可能先被创建**：产品行在 boot 时未绑定，客户端首启仍可能初始化默认 workspace；
  产品开始页绑定项目后，默认 workspace 留在侧栏。是否要隐藏/忽略它是 UI 取舍，不是绑定错误。
- **目录选择器依赖组合**：web profile 有 `remote.directoryPicker`；若某个组合没有，客户端会等待该 inject；
  产品是 web-only，可接受；需要文档/降级（没有选择器时给手输路径？）的取舍。
- **产品 home**：原生路径没有；要隔离只能 `DSH_HOME` 或启动器。不要把“产品 home”写成安装要求。
- **npm/市场**：发布策略、包名、许可证、版本、市场索引、支持面都是 O5 的发布决定；本轮不改 release charter。
- **全页 workbench/侧栏隐藏**：本轮不做；开始页是 `main` 槽的一页，DSH 外壳保留。若产品要更像独立应用，
  那是另一个界面决定，不是安装层。

## 六、结论

**可以同时做到**：DSH 原生安装/启动作底座，不要求自定义 profile 创建器；产品的开始页与工作区选择
放在客户端 `ProductGate` 的 onboarding 分支里，用 DSH 目录选择器 + 现有产品路由绑定。产品 home、
一条命令、离线由启动器作为**可选**产品安装器提供。这样分发走 DSH 插件，体验的特殊性留在产品首屏，
不需要把 DSH 原生整套界面当成产品界面，也不破坏 DSH 的安装要求。
