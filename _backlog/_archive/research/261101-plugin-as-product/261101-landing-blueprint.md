---
topic: 落地蓝图
intent: "把 issue 的切片 1–3 拆到文件/API/测试/证据级：新文件、注入、路由、启动器流程、客户端门、手册与技能改动，确保每片能直接开工。"
---

# 落地蓝图：从卡到代码

> 立档：2026-11-01 ｜ 服务卡：[插件即产品](../../settled_issues/261101-plugin-as-product.md)
> 事实底稿：[平台与仓内事实](261101-platform-and-repo-facts.md)、[技术探针](261101-technical-probes.md)、[可行性复核](261101-feasibility-review.md)。

## 0. 切片地图

| 片 | 新文件 | 改文件 | 证据 |
|---|---|---|---|
| 1 Host 工作区绑定 | `src/domain/product/settings.ts`、`src/host/product/index.ts`、`src/host/product/route.ts` | [cordis.patch.yml](../../../../packages/dsh-smart-assistant/cordis.patch.yml)、[package.json](../../../../packages/dsh-smart-assistant/package.json)、[dev/profiles/profile-patch-headless.yml](../../../../dev/profiles/profile-patch-headless.yml)、catalog | `test:domain`、`test:host`、`--dump-config`、product-smoke |
| 2 产品启动器 | —（演进 [bootstrap.mjs](../../../../packages/dsh-smart-assistant/bootstrap.mjs)） | bootstrap、`package.json files`、[export-dist.mjs](../../../../scripts/release/export-dist.mjs)、root README / 包 README / 手册、release/identity/dev/commands | `product-smoke`、`standalone-smoke`、`release-smoke`、`verify` |
| 3 交付契约 + 客户端门 | `src/client/product/`（门组件与 reader） | `src/client/index.ts`、`src/client/projection/home-surface.ts`、[home-map.ts](../../../../packages/dsh-smart-assistant/src/domain/home/home-map.ts)、策展技能、docs | `prompt-smoke`、`test:client`、`web-expected`、真机 |

## 1. 切片 1：Host 工作区绑定

### 1.1 文件与职责

| 文件 | 内容 |
|---|---|
| `src/domain/product/settings.ts` | 纯核：schema `{ version: 1, workspaceDir: string, updatedAt?: string }`；读（4 KiB 上限）、写（`atomicWriteFile` 0600）、路径校验、错误码 |
| `src/host/product/index.ts` | 一行 web-only 插件：`inject = ['connection', 'workspaceRegistry']`；启动时读设置 → 登记工作区 → 注册路由 |
| `src/host/product/route.ts` | `ConnectionFetchRoute`：`GET/POST /api/assistant/product`；四态；POST 校验 + 登记 + 写设置 |
| [cordis.patch.yml](../../../../packages/dsh-smart-assistant/cordis.patch.yml) | 插入 `assistant-product` 行（`name: dsh-smart-assistant/product`） |
| [package.json](../../../../packages/dsh-smart-assistant/package.json) | 加 `./product` 导出子路径 |
| [dev/profiles/profile-patch-headless.yml](../../../../dev/profiles/profile-patch-headless.yml) | `- id: assistant-product` + `disabled: true`（同 `schedule` 先例） |

### 1.2 设置文件

- 路径：`<dshHome>/assistant-product/settings.json`（**不在** `assistant` 大脑树里；不随 `assistant-data` 备份；换机重选）。
- 解析：`resolveDshHome()`（`@deepseek-ai/dsh-home-paths`）；启动器显式 `DSH_HOME=<productHome>`。
- 校验顺序：
  1. 非空、绝对；
  2. `stat` 为目录（缺失 → `workspace-missing`，**不创建**）；
  3. `access` R_OK + W_OK；
  4. `realpath` 后不是 `/`、用户 home 根、`<dshHome>` 本身、包目录；
  5. 存 canonical path。
- 版本不匹配/坏 JSON → `invalid`；不静默当空。
- 读上限 4 KiB；写 0600 + 原子替换。

### 1.3 行与激活

```ts
export const name = 'assistant-product'
export const inject = ['connection', 'workspaceRegistry']

export function apply(ctx: Context) {
  const settingsPath = join(resolveDshHome(), 'assistant-product', 'settings.json')
  let state = readSettings(settingsPath) // 同步/异步读，坏文件记 invalid
  const register = async () => {
    if (state.workspaceDir === undefined) return
    try { state.workspaceId = (await ctx.workspaceRegistry.create(state.workspaceDir)).id; state.status = 'ready' }
    catch (error) { state.status = missingOrInvalid(error) } // ENOENT/ENOTDIR → workspace-missing；不创建
  }
  void register()
  ctx.effect(() => ctx.connection.fetch.register(createProductRoute({ settingsPath, get: () => state, set: (next) => { state = next }, register })))
}
```

- `inject` 是硬依赖：web 组合等 `connection`/`workspaceRegistry`；headless 组合用 profile patch 禁用整行（探针已见 4 条既有 web-only 行 pending 的形态）。
- 登记在 `apply` 后异步进行；探针已证 `workspaceRegistry.create` + `sessionController.create({ workspaceId })` 的会话 cwd 正确。路由在登记完成前返回 `status: 'registering'` 或 `ready` 前的 `not-configured`——**不要**让客户端在登记完成前开会话；GET 可返回 `pending`，客户端轮询/重试一次。
- 路由只在 `connection` 存在时注册（本行必注，故 web 必有）。

### 1.4 路由契约

`GET /api/assistant/product`：

```json
{
  "version": 1,
  "configured": true,
  "status": "ready",
  "workspaceDir": "/abs/workspace",
  "workspaceId": "uuid-or-absent",
  "artifactDir": "deliverables"
}
```

- `status`: `not-configured` | `ready` | `workspace-missing` | `invalid` | `pending`（登记中）。
- `POST` body `{ "workspaceDir": "/abs/path" }`：同一校验 → `workspaceRegistry.create` → 写设置 → 返回同一形状；失败 400/422/500 + 可读 `error`。
- 不接收任意路径以外的字段；body 上限 4 KiB；`credentials: same-origin` 的浏览器 `web.fetch`；路由经 `connection.fetch` 认证，owner-only。
- 不写 ledger、不碰房间、不替用户建目录。

### 1.5 测试

| 测试 | 证明 |
|---|---|
| `tests/domain/product-settings.spec.ts` | 合法/坏 JSON/版本/缺失/非目录/不可读写/`/`/用户 home/包内；原子写；4 KiB 上限 |
| `tests/host/product-route.spec.ts` | 四态 + POST 成功/失败；坏文件；owner-only 行为（按 `ui-mode`/`rooms` 的 route 核直测） |
| `tests/composition/export-shape.spec.mjs` | 新导出子路径与行 id |
| `tests/composition/preset-composition.spec.ts` | 行在组合里；headless profile patch 里 disabled |
| `product-smoke.mjs` | 真实 profile 里 `storages/workspace.json` 有工作区；in-process 探针证会话 cwd（见 §2.4） |

### 1.6 证据命令

```sh
pnpm build
pnpm test:domain
pnpm test:host
pnpm test:composition
pnpm dsh --profile dev --dump-config | grep -A2 assistant-product
pnpm dsh --profile dev-task --dump-config | grep -A2 assistant-product   # disabled: true
```

## 2. 切片 2：产品启动器

### 2.1 流程（演进 [bootstrap.mjs](../../../../packages/dsh-smart-assistant/bootstrap.mjs)）

1. **参数**：`--workspace <dir>`（首次必填；之后可省）、`--home <dir>`（默认 `~/.dsh-<product>`）、`--profile assistant`、`--dsh <cmd>`、`--no-start`、`--stop`。
2. **home**：默认产品自有 home；启动器显式设 `DSH_HOME=<home>`、`DSH_AGENTS_HOME=<home>/agents-home`、`TMPDIR=<home>/tmp`；不继承日用 `~/.dsh`。`--home ~/.dsh` 显式共享，打警告。
3. **workspace**：校验并写 `<home>/assistant-product/settings.json`（与 §1.2 同一纯核）；不传则读上次；缺失/非目录报错，不空建。
4. **profile**：
   - `profile/package.json` 不存在 → `dsh --profile <p> --from-default-profile web --dump-config`（**只在不存在时**；该命令会整体替换）。
   - 存在但不是我们的（bundle list/dependencies 里没有本包）→ 拒绝并让用户 `--profile` 换名。
   - 存在且是我们的 → 版本对账：读 `profile/node_modules/dsh-smart-assistant/package.json` 的 version 与启动器版本；不同 → 重新 `npm pack` + `dsh plugin --profile <p> add <tgz>`；失败保留旧装并退出。
5. **preset patch**：写 `profile/cordis.patch.yml` 的 `- id: agent-preset-registry\n  config:\n    default: assistant`（沿用 bootstrap 的 marker/空数组处理；不碰用户其他行）。
6. **启动**：`dsh --profile <p> --port 0 --no-open`，`cwd=<workspace>`，detach；解析 `dsh web: <url>`；日志 token 打码；写 `state.json`/`pid`；`--stop` 收进程组。
7. **失败**：不交 URL；保留旧 profile 与数据；错误尾部可读。

### 2.2 profile 事实（已核）

- profile 是 `$DSH_HOME/profiles/<name>/package.json` 的 `dsh.profile.bundles` 有序数组 + `dependencies`；`dsh plugin add` 更新两者（pnpm 120s 文件锁）。
- `--from-default-profile` 走 `initializeProfileFromDefault`，**替换**目标 profile；对已存在 profile 重跑会丢用户层/依赖——启动器只在不存在时调用。
- 外来同名 profile 的判定：`dsh.profile.bundles` 包含 `dsh-smart-assistant` 或 `dependencies` 有该键；否则拒绝。
- 版本：以 `profile/node_modules/dsh-smart-assistant/package.json` 的 `version` 为准；tarball 留在 `<home>/assistant-product/pkg/`，home 搬移后按 bootstrap 逻辑重建。

### 2.3 文件与发布

- `package.json` 的 `files` 已含 `bootstrap.mjs`；不新增 bin。
- [export-dist.mjs](../../../../scripts/release/export-dist.mjs) 的 `must` 清单与手册模板要含启动器；`release-smoke` 断言 tarball 里有它。
- `handoff-scan` 拒绝 `assistant-product/`（产品设置是机器本地，不进交接物）。
- `bootstrap-guards-smoke` 更新：默认 home、workspace 危险路径、外来 profile、版本/缺 pnpm/npm 的失败。
- `standalone-smoke` 保持：干净房间模式用 `--home <tmp>`。

### 2.4 product-smoke 的证据设计

`product-smoke.mjs` 分两段，**不要把两件事塞进一条命令**：

1. **profile/登记**：临时 home + 临时 workspace → `bootstrap --no-start` 断言 profile/dump/preset/settings → 真 boot → 读 `storages/workspace.json` 断言 canonical path → `--stop`。
2. **会话 cwd**：在临时 profile 里放一个 in-process 探针（`inject = ['workspaceRegistry','sessionController','sessions']`，同 [技术探针](261101-technical-probes.md) §2），`--patch` 插入；`sessionController.create({ workspaceId })` 后断言 `header.cwd`。探针文件由 smoke 写到临时 profile（不进包）；或作为 release 脚本旁的 fixtures 测试资产。

### 2.5 证据命令

```sh
pnpm build
pnpm product-smoke
pnpm standalone-smoke
pnpm release-smoke
pnpm verify
```

## 3. 切片 3：交付契约 + 客户端门

### 3.1 客户端门

- **座位**：`main` 是单占位；不能新增第二个 `main` 注册（现有 `src/client/index.ts` 的 `ctx.slots.inject('main', ...)` 是唯一入口）。
- **集成**：在 `dashboardComponent`（`projection === undefined ? DashboardMainPanel : HomeSurface`）外面包一层 `ProductGate`；门内部再渲染原组件。未配置/无设置 → 原样；`workspace-missing`/`invalid` → 恢复面；`ready` → 原组件 + 工作区名。
- **读取**：`web.fetch('/api/assistant/product', { credentials: 'same-origin', cache: 'no-store', redirect: 'error' })`（同 `room-data-io` 的 `web.fetch` 口径）；客户端 state 用一个轻量 store（同 `ui-mode` 的 store 模式）。
- **开会话**：`ctx.uiWorkspace.startSession(workspaceId, { agentPreset: 'assistant' })`（已注入 `uiWorkspace`）；不自动建会话，CTA 点击才开。
- **恢复**：缺失时显示可读文案 + 重新选择入口；v1 先给“用 `--workspace` 重启”的明确指引；GUI 目录选择器是拍板 3 的另一条路。
- **测试**：`tests/client/product-gate.spec.ts`（fake fetch 四态）；`entry.spec` 仍断言 `main` 单占位；`web-expected` 新增/复用场景。

### 3.2 手册与技能

- [home-map.ts](../../../../packages/dsh-smart-assistant/src/domain/home/home-map.ts) 的 `CURRENT_DELIVERY_BULLETS`：
  - 写 `<session cwd>/deliverables/<YYYY-MM-DD>-<slug>/`；
  - README 四段：问题与假设 / 依据（含来源定位）/ 产出 / 未决与状态；
  - `present` 关键文件；
  - 工作区是用户的，不是家的 `deliverables/`；
  - 项目 `AGENTS.md`/`.dsh/skills`/`.agents/skills` 只读/建议，不静默写。
- **预算**：当前 `renderHomeManual()` = **11,936 bytes**，`MANUAL_BYTE_CAP` = **14,336**（[curate-digest.ts](../../../../packages/dsh-smart-assistant/src/host/curate-digest.ts)）；headroom 2,400 bytes。新增交付段控制在 ~800 bytes；过程性内容进技能，不进手册。测试 = `tests/host/root-files.spec.ts` 的 `keeps the generated manual inside its prompt budget`。
- **技能**：新增 `presets/assistant/skills/work-delivery/SKILL.md`（英文；模型用）：一次作业一个文件夹、README 四段、来源写法、`present`、知识页只蒸馏、项目面只读；`first-conversation`/`action-plan` 指过去。
- **证据**：`pnpm test:agent`（预算/段落）、`pnpm prompt-smoke`（新指令在场，旧“家 deliverables”指令不在场）、`pnpm eval`（有 key；无 key = BLOCKED）。

### 3.3 四件物与数据链接

| 物 | 位置 | 写入者 | 链接 |
|---|---|---|---|
| 交付包 | `<workspace>/deliverables/<date>-<slug>/` | 模型 + 用户 | README 指它；`present` |
| run README | 同目录 `README.md` | 模型 | 四段；不强制 session id；可写知识页 id / 账本事项 id（纯文本） |
| 知识页 | `<home>/assistant/knowledge/` | `assistant_reflect save_page` | 只蒸馏；sources 可指 `memory:`/`research:`/URL/旧 run；**不复制正文** |
| 账本事项 | `<home>/assistant-operating/ledger.json` | `assistant_operating` | `matter.id`/`title` 与 README 标题对齐；不加 schema |

- `KnowledgeSource.resource` 是任意非空字符串（`domain/knowledge/page.ts`），所以“旧 run”路径可存；`curate` 只校验 `memory:`/`research:` 前缀的 source，不会把工作区路径报成断链。
- `MatterRecord` 有 `id`/`title`/`summary`/`revision`，没有 deliverable 字段；v1 用标题/纯文本关联，**不改 schema**。
- `present` 只记绝对路径、不复制（平台事实）；会话导出不含交付物内容。文档要写清。

### 3.4 项目面

- `AGENTS.md`：`dsh-base` 的 agent-instructions 从项目根（最近 `.git` 祖先；无 `.git` 用 cwd）读到会话 cwd，预算 65,536 bytes；产品只读/建议，不静默覆盖。
- 项目技能：`.dsh/skills` rank 100、`.agents/skills` rank 200（`skill-filesystem` README）；学到的 300。项目同名会遮蔽学到的技能；`curate` 的 `skill-shadowed` 要能解释。
- 工作区不是 git 仓库时，项目根 = 会话 cwd；`.agents/skills` 仍可用（根解析回退 cwd）。

### 3.5 证据命令

```sh
pnpm build
pnpm test:agent
pnpm test:client
pnpm prompt-smoke
pnpm eval --only <task-id>          # 有 key；无 key = BLOCKED
pnpm web-expected '<URL>' --scenario <场景>
```

## 4. 切片 4：文档/分发

- 根 README：产品启动优先、手工装包其次、工作区与产物、数据归属。
- 包 README 六节；[docs/home.md](../../../../docs/home.md) 加“家 vs 工作区”指针并把家的 `deliverables/` 标 legacy；[docs/delivery.md](../../../../docs/delivery.md) 数据卡加工作区产物/四件物；[docs/release.md](../../../../docs/release.md) 宪章；[docs/identity.md](../../../../docs/identity.md) 新行/禁令改写；[docs/architecture.md](../../../../docs/architecture.md) 行/链路；[docs/dev.md](../../../../docs/dev.md) 第四根；[docs/commands.md](../../../../docs/commands.md) `product-smoke`；[docs/testing.md](../../../../docs/testing.md) 证据地图；[docs/package-catalog.md](../../../../docs/package-catalog.md) 重生成。
- `_dist/安装手册.md`：改 [export-dist.mjs](../../../../scripts/release/export-dist.mjs) 模板再重跑，不手改。
- 验证：`pnpm verify`、`pnpm export-dist`、语义漂移审计。

## 5. 风险与回退（逐片）

| 片 | 风险 | 回退 |
|---|---|---|
| 1 | headless pending；登记竞态；坏设置文件 | 行 disabled；GET `pending` + 客户端重试；坏文件报 `invalid` 不静默 |
| 2 | `--from-default-profile` 误替换；外来 profile；版本失败 | 只在不存在时建；外来拒绝；失败保留旧装 |
| 3 | 手册超预算；模型不照做；项目面被误写 | 预算测试；prompt-smoke/eval/真机；项目面只读/建议 |
| 4 | 文档漂移 | `pnpm verify` + 漂移审计 |

## 6. 已证 vs 待证

- **已证**：registry 登记幂等；`workspaceId` 会话 cwd；`storages/workspace.json` 持久化；headless 4 条 web-only 行 pending；缺 preset = `agent-preset/not-found`（[技术探针](261101-technical-probes.md)）。
- **待证**：产品行自身的 settings/route；启动器 profile 建/装/回滚；客户端首屏/恢复面；模型写 `deliverables/` 的行为；Windows/Desktop。

## 7. 复跑命令

```sh
pnpm build
pnpm typecheck
pnpm test
pnpm verify
pnpm product-smoke
pnpm standalone-smoke
pnpm release-smoke
pnpm prompt-smoke
```
