日期：2026-10-20 · 状态：**implemented**

# 按需检索只走 native 工具，Viki 不造转正面板

## 问题（可观察行为）

自动 recall 每轮只给一段有界内容。召回块在 context 模式下可能只给目录/摘要级指针并提示「用
search/read 展开」，而 `ov-shield` 整前缀拒 `mcp__openviking__*`（连带把只读面也拒了）——结果是
「只给指针、又没法展开」。另一条路是把 7 个只读 MCP 工具加入 allowlist（A1），但指针展开探针显示：
放行后模型先调 `list_mcp_resources`，被 `denyServerResources: openviking` 拒，随后退回磁盘文件读取，
7 个 MCP 工具一次都没被调用。也就是说 A1 的失败不是模型不选，而是**资源发现被挡住**，工具「可见但
不可发现」。

## 决定

- **按需读路径 = 一个 native 工具**（`assistant_recall`，动词 find/search/read/tree），经 host 服务
  访问 OpenViking，scope 只读配置的 space/peer；它随 assistant preset 挂载。
- **`ov-shield` 继续整前缀拒 MCP 工具与 resources**；写面不放开，工具面不引入 16 个 MCP。
- **Viki 保持调试面，不做「转正到 memory/」面板**；内部若要把一条情景记忆转正，走已有的
  `assistant_memory save` + 既有审批。面板点击没有 open turn，不能套 `ctx.approval` 的
  `approval/asked`/`approval/decided` 对；home 的 `recordApproval` 是另一套审计，两者不混用。
- **选型证据是指针展开探针，不是固定题集的分差**：同一批题在 A1/A2 两侧的分差不可分离，不能据此
  选型；A2 的 read 在探针里真的被调用并返回全文，A1 不能。工具的错误体必须给可读信息（对象错误体
  不能变成 `[object Object]`），否则模型无法自我纠正。

**重开触发**：手工转正实际频繁（例如每月 >5 次）或客户明确要一个 Viki 入口；A1 若重提，必须先解决
资源发现（allowlist 只放工具不够）。

## 输掉的方案

- **A1：MCP allowlist**：工具可见但资源发现被 `denyServerResources` 挡住，模型退回磁盘；不选。
- **A3：只靠自动 recall，不提供按需工具**：指针展开场景答不出细节；不选。
- **16 个 MCP 全放**：写面风险、工具噪声、错房间；不选。
- **Viki 转正面板**：第二个写/审面，与四房间权威和既有审批冲突；不选。
- **面板点击走 `ctx.approval`**：没有 open turn，机制上不成立。
