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
  `pnpm test` 70/70 / `pnpm build` / `pnpm verify` 15/15 / `pnpm release-smoke`（发布形状含
  `./client` 出口与 `dsh.client` 声明）。
- 盘上实证：重启 dev web 后 boot 图含 `dsh-smart-assistant` 客户端行，侧栏呈房子图标 +
  "DSH local assistant"（用户浏览器回填）。
