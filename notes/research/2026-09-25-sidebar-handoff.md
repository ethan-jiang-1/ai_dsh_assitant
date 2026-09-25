# Handoff：CEO 助手的 Sidebar 交互实验

日期：2026-09-25 · 状态：**进行中**（交接文档，实验一b 卡在 panellist 注册的运行时可见性）

交接对象：接手的 Agent · 交接原因：当前会话上下文耗尽

## 你接手的是什么

一个 DSH 插件仓（`dsh-smart-assistant`），正在做**CEO 助手的 sidebar 交互实验**——
用户（CEO 本人）要看能在 DSH Web UI 的 sidebar 里看到"助手此刻在跟什么、知道什么、等我什么"。

用户 2026-09-25 的意图：**"我们都实验一下吧，你看看我们这个角色拿这些交互到底呈现什么东西，
好好思考思考，正好是一个挺好的练习，让我熟悉一下DSH底下交互怎么设计"**

## 当前状态

**实验一b ✅ 已成功**——CEO 确认看到了 My Desk 图标并打开了面板。当前任务：**实验二（接真数据）**。

具体状态：
- 客户端代码在 `packages/dsh-smart-assistant/src/client/index.ts`
- 使用 `inject + register` 方式注册 panellist 条目（学自 `ui-schedule` 插件，vendor 源码）
- 代码在 combo 里（curl 验证过 19 处命中），构建/类型检查/门禁全绿
- **但浏览器里看不到图标**——问题在运行时

## 你要做什么

**实验二：把四个静态数字替换为 assistantMemory 服务的真实数据 + 加交互。**

### 技术路径（Remote API 的正确做法）

DSH 的 Remote API 用 **TypertRemoteService** 协议。参照物：

| 文件 | 看什么 |
|---|---|
| `vendor/dsh/packages/api/workspace-files/src/index.ts` | 一个完整的 TypertRemoteService 实现（`WorkspaceFiles extends TypertRemoteService`）——我们的参照物 |
| `vendor/dsh/packages/typert/protocol/src/index.ts` | `TypertRemoteService` 基类、`Remote`、`RemoteError` 的定义 |
| `vendor/dsh/packages/api/remotes/src/index.ts` | Remote 的装载与事件转发层 |

### Host 面要做的

在 `src/index.ts`（AssistantMemory 服务）里：
1. 导入 `TypertRemoteService` 相关类型
2. 创建一个 `AssistantDeskSnapshot extends TypertRemoteService`（或直接在现有服务上挂 Remote 方法）
3. 暴露一个只读方法 `deskSnapshot()`，返回：
   ```json
   {
     "counts": { "memories": 8, "knowledgeStable": 13, "knowledgeDraft": 0, "skills": 8, "threads": 0 },
     "threads": [{ "id": "...", "question": "...", "lean": "...", "status": "open" }],
     "recentMemories": [{ "id": "...", "text": "...", "kind": "fact", "updated": "..." }]
   }
   ```
   （数据来源：`this.digest()` 和 `this.curate()` 已有的服务端计算）

### Client 面要做的

在 `src/client/index.ts` 的 DeskPanel 里：
1. `inject` 列表加 `'remote'`（和 `'remote.assistantMemory'` 如果有独立 Remote 服务名）
2. 在 DeskPanel 组件里通过 `ctx.remote.assistantMemory.deskSnapshot()` 获取数据
3. 渲染真实数字替换静态占位
4. 加交互：线索可点击展开（显示 lean + why）；快捷操作按钮点击后往输入框插入 prompt

### 交互设计（CEO 确认过的）

面板不只是数字——要有**活内容**：
- **等你决定**：draft 知识页数（点击跳到知识面板或提示 CEO 审批）
- **在跟的事**：open threads 列表（问题 + 当前倾向，点击展开）
- **最近记住的**：最近 3 条记忆（一句话 + 时间，点击看全文）
- **快捷操作**：三个按钮（拆解一个问题 / 回顾上周 / 清理），点击往输入框插 prompt 文本

### 最简起步（如果 Remote API 太复杂）

如果 TypertRemoteService 的搭建太重，备选方案：
- 在 host 面加一个简单的 HTTP JSON endpoint（利用 `dsh-host-webserver`），client 用 `fetch` 读取
- 这不是 DSH 原生路径，但能快速验证概念后再迁移到 Remote API

## 怎么起服务器

```sh
cd /tmp/desk && node /Users/bowhead/ai_dsh_assitant/scripts/dsh.mjs --profile dev --port 0 --no-open
# 从输出里拿 URL（带 token），交给用户打开
# 交付前必须跑 preflight：
#   cd /Users/bowhead/ai_dsh_assitant && node scripts/webui-preflight.mjs '<URL>'
```

**注意**：必须从 `/tmp/desk` 目录起（干净上下文，不带开发仓的 AGENTS.md），不要从仓根起。

## 关键文件

| 文件 | 干什么的 |
|---|---|
| `packages/dsh-smart-assistant/src/client/index.ts` | **你要修的文件**——client 面入口，包含品牌标记 + DeskPanel + DeskIcon |
| `vendor/dsh/packages/client/ui-sidebar/src/client/index.ts` | **参照物**——sidebar 的 panellist 消费逻辑 |
| `vendor/dsh/packages/client/ui-schedule/src/client/index.ts` | **学自这里**——一个成功注册 panellist 的插件 |
| `notes/proposed/2026-09-25-ceo-sidebar-ux.md` | **实验卡**——完整的设计与计划 |
| `notes/proposed/2026-09-25-expert-pack-v0.md` | 专家组合件卡（相关但非当前焦点） |

## 已有的架构决策（不要推翻）

1. **client 是 SCRIPT 不是 ESM**——web shell 把 client bundle 拼成 classic-script combo，
   不能有 import/export。所有类型用结构镜像，所有依赖用 `require()`。
2. **品牌标记已经工作**——`inject('sidebar.brand.mark')` + `register` 是已验证的路径。
3. **tab 类型注册≠tab 可见**——实验一（右侧 sidebar tab type）注册了但不可见，这个教训已记。
4. **三个 tab 全部自建**（桌面/知识/记忆）——不装第三方包（用户拍板的第七条硬规则）。
5. **语言**：模型面用英文，人与文档用中文。

## 验收标准

- CEO 打开 URL，左侧 sidebar 出现 "My Desk" 图标
- 点击图标，主区域显示四个数字（Memories 8 / Knowledge 13 / Skills 8 / Threads 0——静态占位）
- `pnpm verify` 31/31 exit 0
- `pnpm build` exit 0

## 下一步（修好实验一之后）

实验二：把四个静态数字替换为 assistantMemory 服务的真实数据（需要暴露 Remote 读取面）。
完整计划在 `notes/proposed/2026-09-25-ceo-sidebar-ux.md` §五。

## 仓的纪律（必读）

- 开工先读 `AGENTS.md`（根目录）——七条硬规则
- 队列在 `ROADMAP.md`——当前 ▶ 条目就是本实验
- 每步提交（步步为营）；`git add` 只加自己改的路径
- `vendor/dsh/` 永不改
- 提交前 `node scripts/verify.mjs` 必须绿

## 服务器状态

最后已知 URL：`http://127.0.0.1:62048/?token=e7_DAqyK3xmYjVIZ6ILOGF8RRuEAYYMCzHdmXTJqU3w`
（可能已死，按上面命令重启）
