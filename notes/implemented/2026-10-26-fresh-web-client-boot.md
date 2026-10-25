日期：2026-10-26 · 状态：**implemented**

# Fresh Web install boots: own the client store, shadow the brand row

## 问题（可观察行为）

从 0.1.4 tarball 安装到一个干净的 `web` profile 后，Web 首屏只显示
`Failed to load plugins / dsh-smart-assistant: failed`。开发 profile 正常，`release-smoke`
也绿，所以问题只在“标准安装形状 + 真实浏览器”出现。

根因有两条：

1. 客户端 bundle 用 `clientRequire('@deepseek-ai/dsh-client-store')` 取 store 原语。该包是
   package-library，不是 client module；web shell 的模块表只有 React 和 client modules。
   开发组合恰好有这层，干净安装没有。
2. `sidebar.brand.mark`/`sidebar.brand.name` 是 single slot。标准 web profile 的官方品牌行
   已在 priority 0 占位；本包同优先级注册直接抛错，整条 client entry 变 `failed`。

## 决定

- **在包内实现两个小原语**：`src/client/chrome/store.ts` 提供 `createSnapshotStore` 与
  `defineStore`（浅 draft + 订阅），入口用相对 import。这样既不走 `clientRequire`，也不违反
  “浏览器半边只能相对 import / import type”的门禁。vendor 的 store 仍留在 devDependencies，
  只给测试当参考实现，不进发布产物的依赖。
- **品牌槽用 shadowing priority -1**：`sidebar.brand.mark`、`sidebar.brand.name` 与
  `conversation.hero.brand.mark` 显式 `priority: -1`（最低渲染），覆盖官方品牌行；同优先级
  的第二次注册仍然按平台规则抛错，不改成静默跳过。
- **apply 失败留可读日志**：client entry 的 `apply` 捕获后先 `console.error` 再抛，避免下次
  只看到 `failed` 而没有原因。
- **回归资产**：`standalone-smoke` 在 preflight 后跑 `agent-preset-ui`，证明提取包的 client
  真的 boot 且 preset 选择面可达；没有 Chrome 时明确 skip，不写成绿。

## 输掉的方案

- **保留动态 `clientRequire`**：开发绿、安装红，正是这次的事故形状。
- **往 web shell 模块表塞 store**：把插件依赖变成宿主改动，换一台标准机器仍然坏。
- **静态 import vendor store**：会触发浏览器半边的 bare-import 门禁；把门禁放宽等于让下一次
  安装再踩模块表缺失。
- **发现品牌已占位就跳过注册**：那会静默保留官方品牌，本包的品牌面消失；用户无法从
  首屏认出助手。`priority: -1` 才是 DSH 的覆盖语义。
- **把 apply 失败吞掉**：整条 client entry 消失且无原因，比可见的 boot 失败更难查。

## 后果

- 客户端 bundle 只增加本地两个小原语（不引入 zustand/immer）；包仍只有一个运行时依赖
  `yaml`。vendor store 仍是测试参考实现，不是发布依赖。
- 以后新增 single-slot 注册必须检查官方占位者与 priority；标准安装的 client boot 由
  `standalone-smoke` 兜底，不再只靠开发组合。
