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

**实验二：把四个静态数字替换为 assistantMemory 服务的真实数据。**

1. **暴露 Remote 读取面**：在 host 面（src/index.ts）暴露 digest counts 等只读数据
2. **在 client 面读取**：通过 Remote API 从浏览器侧获取数据
3. **替换 DeskPanel 的静态数字为真实数据**

参考：`vendor/dsh/packages/client/ui-sidebar-documentpreview/src/client/rpc.ts` 看它怎么通过 Remote 读文件。

诊断线索（如果实验二遇到问题）：
   - 打开 Web UI（服务器可能需要重启，见 §服务器）
   - 用浏览器 DevTools Console 看有没有 `[assistant-desk]` 相关警告或报错
   - 读 `vendor/dsh/packages/client/ui-sidebar/src/client/index.ts` 的 `entriesOfSlot` 逻辑
   - 检查我们的 `inject` 调用是否被 sidebar 的 slot 消费端正确接收

2. **可能的嫌疑**（按优先级）：
   - `main` slot 的注册方式可能不对——keyed slot 可能需要不同的注册形状
   - `inject` 的回调返回值可能不匹配 slot 系统的预期
   - scope 不对——sidebar 的 panellist 是 `scope: 'root'`，我们的注册可能在错误的 scope

3. **确认后修好，让 CEO 能看到并点开面板**

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
