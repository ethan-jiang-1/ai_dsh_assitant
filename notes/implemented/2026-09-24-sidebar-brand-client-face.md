# 2026-09-24 · 侧栏品牌：dsh.client 浏览器面首落地（占用 sidebar.brand.* 通用 slot）

日期：2026-09-24 · 状态：**implemented（本切片）**

## 需求（用户原话）

左栏 "DSH Local Build" 字样调成 "DSH local assistant"，边上的图标（鲸鱼）也换掉，如果可能。

## 机制发现（vendor 源码实证）

- `sidebar.brand.mark` / `sidebar.brand.name` 是 ui-sidebar 声明的**单占位**（kind: single）通用
  slot；无占用者时兜底渲染鲸鱼 + locale 键 `brand.localBuild`（"DSH Local Build"）。
- 官方品牌包 `ui-brand-official` 只在 `DSH_CLIENT_BUILD_PROFILE === 'official'` 时注册——
  **本地构建里两个 slot 空置**。这两个 slot 就是留给部署方的品牌位。
- client-modules 的发现面：扫 host Loader 条目的 package.json `dsh.client`（嵌套在 `dsh` 对象
  下）+ `./client` 出口。既有 `assistant-memory` bundle 行即载体——**零额外接线**，不用动
  web-app bundle。

## 决定

1. **包获得浏览器面**：`dsh.client: {platform: web}` + `./client` 出口（tsc 发射 `lib/client/`，
   `files` 已覆盖）。
2. **`src/client/index.ts` 用 `createElement` 而非 JSX**：纯 `.ts` 落进 verify 门禁扫描
   （facade 检查只扫 `.ts`，主动避开门禁盲区），零 JSX 编译配置改动。
3. **official 档案让位**：与官方品牌包同款守卫；浏览器无 `process`，守卫恒假 → 我们注册。
4. mark 复用 favicon 同款房子（青底白房青门），name "DSH local assistant" 以 17px 对齐侧栏
   兜底文案字号。
5. **判断**：这是占用**既有通用 slot**，不是 architecture §六 延后的"专属 Web 卡片"（其触发
   条件是"通用卡不够用"，未到）；`dsh.client` 面因通用 slot 需要占用者而提前落地。

## 门禁进化（红绿在案）

facade 检查原只认"包根 → src"条目；扩展支持 vendor 惯例的 `pkg/client → src/<sub>` 子路径
条目（判定属主项目 + 校验 `<target>/index.ts`）。红：扩展前 4 problem；绿：扩展后 15/15，
既有 7 条行为不变。

## 顺带修复（上一切片引入未察觉的测试工程暗伤）

- shadow 测试首次把 vendor 源码拉进测试工程（rootDir 冲突 + schemastery 源码在本仓严格标志
  下误报）。`tsconfig.test.json` 改 `paths: {}`（整体覆盖）→ 经 node_modules 解析到 vendor
  **构建声明**（lib/types + skipLibCheck）；源码面漂移仍归根 `tsc -b` 项目引用管。
- type-only 依赖按 vendor 规则补进 devDependencies（host-webserver 此前靠 paths 隐性解析、
  未声明；新增 ui-renderer / ui-sidebar）。
- `webBrandingInjection` 返回类型收紧为 `Extract<IndexInjection, {kind: 'script'}>`（测试
  工程第一次完整跑过后暴露的联合类型窄化缺失）。

## 输掉的方案 / 已知限制

| 输掉的 | 为什么 |
|---|---|
| 改 vendor（locale 词典 / sidebar 组件 / 品牌包） | 违反第一硬规则（vendor 永不改） |
| DOM patching（注入脚本 MutationObserver 换侧栏文案） | 与 React 渲染对抗，脆弱，否 |
| **official 构建共存守卫（已知限制）** | 浏览器无 `process.env`，我们 tsc 发射不做构建期内联（vendor 用 tsdown 内联）；若本插件装进 official 构建会与官方品牌双占位——未验，真实需要时经构建管线或 boot 信号再解，登记延后 |

## 验证（真跑过）

- `pnpm --dir packages/dsh-smart-assistant typecheck`（含测试工程）/ 根 `pnpm typecheck` /
  `pnpm test` / `pnpm build` / `pnpm verify` / `pnpm release-smoke`（发布形状含
  `./client` 出口与 `dsh.client` 声明）。
- `pnpm preflight`：对真伺服页面的组合脚本逐个经典脚本编译检查（见修正记录第三节）。

## 修正记录（同日三轮，教训全档）

第一版（77a0561）的客户端半面是 tsc 直出的**纯 ESM 模块**。实况：vendor 客户端 bundle 是
tsdown 产出的 `__ModuleLoader__.load({id, factory})` **注册包裹**（factory 收绑定模块表的
同步 require，内部零 ESM 语法），浏览器把多条 bundle 拼成**经典脚本** combo 伺服——ESM
语句在经典脚本里是解析级炸药，一条语句让整条 combo 全灭、其后所有注册丢失（报错只有一句
"loaded without registering"，第一次打开页面的人就是 crash-test dummy）。

第二版把文件改写成注册包裹形状，但保留 `import type` → tsc 给"类型导入全被擦除的模块"
**合成 `export {};` 模块标记**——同样致命。`verbatimModuleSyntax: true` 也拦不住（实验实证，
配置已回滚）。附带假阴性教训：`node --check` 在 Node 22 的模块语法检测下**通过**了带
`export {};` 的文件——经典脚本检查必须用 `new Function` 编译。

第三版（本版）：`src/client/index.ts` 刻意写成**零 import 的脚本**——vendor 契约类型用
本地结构镜像（slot 名与 props 形状极小，漂移会在注册时 fail loud），react 类型经
`typeof import('react')` 类型查询；tsc 对脚本文件不合成任何模块标记。为此撤回第一版为
类型导入加的 ui-renderer/ui-sidebar paths/references/devDeps（host-webserver 保留：web-branding
真实使用）。

**三道闸**（用户要求固化的实践：界面交给人之前机器先验一遍）：
1. verify 源级：client 半面禁运行时 import/export、必须触达 `__ModuleLoader__` ——红绿在案
   （对第一版红：runtime import ×1 + runtime export ×2）。
2. verify 发射物级：`new Function(lib/client/index.js)` 经典脚本编译——红绿在案（对第二版
   的 `export {};` 发射物红，存档 /tmp/emit-before.js 复验；对第一版为推断：运行时
   import/export 原样保留，同款解析失败）。
3. `pnpm preflight '<URL>'`：起服务器后、交给人之前，按浏览器姿势（token → cookie → 文档）
   取回每个 plugin combo 并编译检查 + 本仓 bundle 注册在案。`node --check` 的假阴性在
   preflight 同样规避。
