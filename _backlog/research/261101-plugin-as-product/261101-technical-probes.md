---
topic: 技术探针
intent: "把 headless pending、boot 时工作区登记、workspaceId 会话 cwd、缺 preset 失败形态与产品行 GET/POST 跑成实证，供 issue 把‘应该能行’改成‘已经看到’。"
---

# 技术探针：四条机制的真读数

> 立档：2026-11-01 ｜ 服务卡：[插件即产品](../../issues/261101-plugin-as-product.md)
> 环境：本仓 `dev/harness-home` 与临时 home `.tmp/product-probe/home`；临时 workspace `.tmp/product-probe/workspace`；没有碰日用 `~/.dsh`。
> 性质：**机制原型**，不是产品代码；探针文件只在 `.tmp/`，不进包、不进组合合同。

## 0. 结论

| 探针 | 结果 | 对 issue 的影响 |
|---|---|---|
| headless 组合里 `connection` 依赖行 | **4 条既有 web-only 行 pending**（desk-projection / ui-mode / rooms / viki），启动打 `warning: 4 entries did not activate` | 产品 web 行若必注 `connection`，会变成第 5 条 pending。要么在 headless profile patch 里禁用（`schedule` 先例），要么接受“与既有 4 条一致的 pending”。**“headless 一定不 pending”是过强断言，已改。** |
| boot 时登记工作区 + 用 `workspaceId` 开会话 | **成立**：`workspaceRegistry.create()` 幂等；`sessionController.create({ workspaceId, agentPreset })` 产生的会话 `header.cwd` 等于工作区路径（`process.cwd()` 是仓根，不是工作区）；`storages/workspace.json` 持久化并 attach 了会话 | issue 的验收行 3 可以写成“已由探针证明机制成立；产品 smoke 只需复跑同一路径” |
| 缺 preset 的失败形态 | **`agent-preset/not-found` / `Unknown agent preset: __missing__`** | 跨 profile 打开产品会话不是静默坏，而是有明确错误码；文档/客户端可以据此给可读提示 |
| 产品行：设置 + 登记 + GET/POST | **成立**：web-only 行注入 `connection`/`workspaceRegistry`；GET 返回 state；POST 登记第二个工作区并写 settings；owner token cookie 可访问 | 产品行的集成形状已证；切片 1 只需把内联逻辑换成纯核 + 原子写 + 错误态 |

## 1. headless 组合：`connection` 依赖行的真实形态

**命令**（仓根，keyless 回放；用现有 `dev-task`）：

```sh
pnpm dsh --profile dev-task --patch dev/probes/session/preset-runner-replay.patch.yml "probe: list the pending rows"
```

**输出片段（2026-11-01）**：

```text
dsh: warning: 4 entries did not activate
assistant-desk-projection (dsh-smart-assistant/desk-projection): pending (waiting for service: connection)
assistant-ui-mode (dsh-smart-assistant/ui-mode): pending (waiting for service: connection)
assistant-rooms (dsh-smart-assistant/rooms-route): pending (waiting for service: connection)
assistant-viki (dsh-smart-assistant/viki): pending (waiting for service: connection)
probe turn complete
```

**读法**：

- `connection` 只由 web-app bundle 提供（`vendor/dsh/packages/bundle/web-app/cordis.patch.yml` 的 `@deepseek-ai/dsh-client-connection` 行）；base/headless 组合没有它。
- Cordis 的 `inject` 是**硬依赖**：服务缺失时插件停在 PENDING，且**不报错**；这里的 warning 是 Loader 的汇总提示（4 条），不是每条的失败。
- 本包既有 4 条 web-only 行就是这样被容忍的；`schedule` 是例外，headless patch 显式 `disabled: true`，因为它依赖 web-app 的 `sessionController` 且 warning 会淹没真实失败。
- **产品 web 行的选择**：
  1. **禁用**：headless profile patch 加 `- id: assistant-product-web\n  disabled: true`（同 `schedule` 先例）；headless 里零新增 pending。
  2. **接受**：与既有 4 条一致，多一条 pending warning；不新增失败，但噪声加一。
  3. **不用 `connection`**：把路由与登记拆到 core（无 web 依赖）与 web 行；core 在 headless idle，web 行仍要禁用或 pending。
- 探针只证明了**当前形态**；产品行加入后的 warning 条数要靠复跑同一命令确认。

## 2. boot 时登记工作区 + `workspaceId` 会话 cwd

**做法**：在临时 home 的 `dev` profile 里放一个探针插件（不注入产品行），`--patch` 插入；boot Web（`--port 0 --no-open`），探针在 `apply` 里：

1. `ctx.workspaceRegistry.create('/abs/.tmp/product-probe/workspace')` 两次（验幂等）；
2. `ctx.sessionController.create({ workspaceId, agentPreset: 'assistant' })`；
3. `ctx.sessions.get(sessionId).header.cwd` 与 `process.cwd()` 对照；
4. 故意用不存在的 preset 再建一次，记录错误。

**探针插件（`.tmp`，非产品代码）**：

```js
export const name = 'product-probe'
export const inject = ['workspaceRegistry', 'sessionController', 'sessions']

export function apply(ctx) {
  const workspacePath = '/abs/product-probe/workspace'
  const main = async () => {
    const first = await ctx.workspaceRegistry.create(workspacePath)
    const second = await ctx.workspaceRegistry.create(workspacePath)
    console.log('[probe] workspace', first.id, first.path, 'idempotent', second.id === first.id)
    const created = await ctx.sessionController.create({ workspaceId: first.id, agentPreset: 'assistant' })
    const session = ctx.sessions.get(created.sessionId)
    console.log('[probe] session', created.sessionId, 'preset', created.agentPreset,
      'cwd', session?.header.cwd, 'process.cwd', process.cwd())
    try {
      await ctx.sessionController.create({ cwd: workspacePath, agentPreset: '__missing__' })
      console.log('[probe] missing-preset: NO ERROR')
    } catch (error) {
      console.log('[probe] missing-preset error', error?.code, error?.message)
    }
  }
  main().catch(error => console.error('[probe] failed', error?.stack ?? error))
}
```

**输出片段（2026-11-01）**：

```text
[probe] workspace 1d514685-99c3-4191-9ac8-cf3c28e38388 /abs/product-probe/workspace idempotent true
[probe] session session-e0acfb30-... preset assistant cwd /abs/product-probe/workspace process.cwd <repo>
[probe] missing-preset error agent-preset/not-found Unknown agent preset: __missing__
```

**`storages/workspace.json` 片段**：

```json
{
  "global": { "initialized": true, "workspaceIds": ["1d514685-..."] },
  "tables": { "workspaces": { "1d514685-...": {
    "path": "/abs/product-probe/workspace",
    "title": "workspace",
    "sessionIds": ["session-e0acfb30-..."]
  } } }
}
```

**读法**：

- 登记按 canonical path 幂等；会话创建后 `header.cwd` 就是工作区，**与进程 cwd 无关**。这是产品“能力落在工作区”的硬证据。
- workspace 登记与会话 attach 都持久化；`global.initialized` 为 true、`defaultWorkspaceId` 未出现，意味着 Web 首用不会在 Documents 下再建默认工作区（Registry 非空 + 已有会话）。
- 探针用 `sessionController.create` 的 Host 直调；真实产品路径是 Web Client 的 `session.create` / `uiWorkspace.startSession`，走的同一个命令核。探针证明命令核与持久化，不证明浏览器端点击。

## 3. 缺 preset：跨 profile 打开产品会话的真实失败码

- 源码：`sessionController.composeAgent` → `agentPresets.resolve(id)`；registry 的 `resolve` 在找不到时抛 `RemoteError('agent-preset/not-found', 'Unknown agent preset: <id>', { available })`（`vendor/dsh/packages/preset/agent-preset-registry/src/index.ts`）。
- 探针：上面 `agentPreset: '__missing__'` 的调用得到同一错误码与消息。
- 含义：跨 profile 打开产品会话（该 profile 没有 `assistant` preset）**不会静默换 preset**，而是明确失败。产品文档可以写“从产品入口打开”；客户端/DSH 侧的错误文案需要可读化（后续切片）。

## 4. 产品行原型：设置 + 登记 + GET/POST

**做法**：在同一个临时 home 的 `dev` profile 里放一条 web-only 探针行（`inject = ['connection','workspaceRegistry']`），`--patch` 插入；启动前写 `<home>/assistant-product/settings.json`；boot Web 后，用 token URL 拿 cookie，curl 打 `GET/POST /api/assistant/product`。

**探针行（摘要，`.tmp`，非产品代码）**：

```js
export const name = 'product-row-probe'
export const inject = ['connection', 'workspaceRegistry']
// apply: 读 settings.json → workspaceRegistry.create() → connection.fetch.register({
//   path: '/api/assistant/product', methods: ['GET','POST'], requestBody: 'buffered',
//   fetch: GET 返回 state；POST 校验 workspaceDir → create → 写 settings → 返回 state
// })
```

**输出（2026-11-01）**：

```text
GET:  {"version":1,"configured":true,"status":"ready",
       "workspaceDir":".../.tmp/product-probe/workspace","workspaceId":"1d514685-..."}
POST: {"version":1,"configured":true,"status":"ready",
       "workspaceDir":".../.tmp/product-probe/workspace-two","workspaceId":"a6b652eb-..."}
GET2: 同上（workspace-two）
```

**读法**：

- web-only 行可以同时注入 `connection`/`workspaceRegistry`；路由经 connection 认证，**owner token cookie 可访问**。
- 设置文件是唯一输入；GET 返回状态；POST 登记第二个工作区并写设置；GET 读回。产品行的形状成立。
- 真实切片把探针的内联逻辑换成纯核 + `atomicWriteFile` + 错误态；探针证明的是集成点，不是最终代码。

**不证明**：

- 客户端门渲染/恢复面；非法/缺失/不可读状态的文案；原子写/并发；非 owner/remote 访问。
- 启动器与产品 home；`deliverables/` 交付契约；模型行为。
- 探针的 POST 写设置是普通 `writeFile`，不是原子写；这正好留给切片 1 的纯核测试。

## 5. 这些探针证明什么 / 不证明什么

**证明**：

- boot 时用 `workspaceRegistry.create` 登记 + `sessionController.create({ workspaceId })` 产生正确 `header.cwd` 的链路是通的，且持久化形状如预期。
- headless 组合的 `connection` 依赖行为是 PENDING + 汇总 warning，不是崩溃；产品行可以按 `schedule` 先例禁用。
- 缺 preset 是明确错误码，不是静默坏。

**不证明**：

- 产品 web 行**自身**的 settings/route 行为（探针没有产品行；产品行要单独 host spec + `product-smoke`）。
- 浏览器首屏/客户端门/恢复面的渲染（无浏览器；要 `web-expected` 或真机）。
- 真实模型是否按手册写 `deliverables/`、是否引来源（要 `prompt-smoke` + 有 key 的 eval/真机；无 key = BLOCKED）。
- 启动器的 profile 建/装/版本对账/失败回滚（要 `product-smoke`）。
- Windows/Desktop。

## 6. 对 issue 的修订（已回填）

- “headless 不 pending”改为：**产品 web 行在 headless patch 里禁用**（零新增 pending）；否则与既有 4 条一致，多一条 warning。验收行 3/5 同步。
- “跨 profile 可能缺 preset”改为：**失败码 `agent-preset/not-found`**；文档声明产品入口，客户端给可读提示。
- “boot 登记是否稳定”从“未决”移到“已由探针证明机制”；产品 smoke 只需复跑同一路径并断言 `storages/workspace.json`。
- `product-smoke` 的证据设计：**登记/会话 cwd 可以用同一个 in-process 探针行证明**，不必等浏览器；浏览器只用于首屏/门/恢复面。

## 7. 复跑

```sh
# 1) headless pending（现有 4 条）
pnpm dsh --profile dev-task --patch dev/probes/session/preset-runner-replay.patch.yml "probe"

# 2) 临时 home + 探针（探针文件在 .tmp，不随包）
ASSISTANT_DSH_HOME="$PWD/.tmp/product-probe/home" bash dev/env/setup.sh
# 把 §2 的 product-probe.mjs / probe.patch.yml 放进 .../profiles/dev/，然后：
ASSISTANT_DSH_HOME="$PWD/.tmp/product-probe/home" pnpm dsh --profile dev \
  --patch "$PWD/.tmp/product-probe/home/profiles/dev/probe.patch.yml" --port 0 --no-open
# 读输出里的 [probe] 行与 .../storages/workspace.json
```

探针目录是 `.tmp/`（已忽略）；结论在本材料，文件不随包、不随研究归档复制。
