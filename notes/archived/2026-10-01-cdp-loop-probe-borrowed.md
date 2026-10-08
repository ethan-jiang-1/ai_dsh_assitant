# 决定：借入通用 CDP 驱动 + 本仓首用闭环探针（`pnpm loop-probe`）

日期：2026-10-01 · 状态：**implemented**（真机双验：试用 home 首屏断言全绿 exit 0；一次性 home
已归档：2026-10-08（决定已经在合同或代码里；下次改决定不用打开本篇。冻结，不再跟踪。）
`--ask` 全环绿——发问→5s 回复→答案尾部捕获，零 console 错误）

## 问题（可观察行为）

首用 UX 战役（[首开 UX 卡](../../_backlog/_done/_closed_plans/261001-first-open-ux.md)）的闭环彩排全靠手工：
六次分离的 `pnpm shots --eval` 调用 + 单表达式内联 JS，每步一个发现（composer 拒绝 execCommand、
发送/停止按钮是可靠的回合完成信号、工作区之问的回归判据……）。这些知识**只存在于当次会话**，
无法复用、无法进回归——下次组合变更又得重新即兴。owner 指令：兄弟仓
`ai_dsh_loop_advisor` 已有现成的 CDP 探针（驱动 + 场景两层），借鉴过来。

## 决定

1. **拷入驱动**（[dev/probes/web/cdp-driver.mjs](../../dev/probes/web/cdp-driver.mjs)，源仓逐字节复制 + 来源注记）：
   一次性无头 Chrome（port 0 + DevToolsActivePort 防孤儿 Chrome）、CDP 连接、evaluate/click 带
   20s 超时竞速、console 错误与未捕获异常捕获、settle 清理。五条环境坑已编码成规则
   （`--no-sandbox`、桌面视口、禁用 virtual-time-budget 等）。零仓内依赖，纯 Node 内置——合
   scripts/AGENTS.md 风格。
2. **场景本仓化**（[dev/probes/web/webui-loop-probe.mjs](../../dev/probes/web/webui-loop-probe.mjs)，`pnpm loop-probe`）：
   - 首屏断言（产品承诺面）：composer 挂载、引导条在场、无"三室"黑话、无工作区之问
     （`Choose a workspace to start` / `Unable to create default workspace`）、zh hero（报告项）。
   - `--ask '<问句>'` 全产品环：粘贴真发问 → 点发送 → 等停止按钮消失（回合完成信号）→
     捕获回复尾部。**会在目标 home 真建会话**（指向一次性 home）。
   - JSON 判决 + 退出码 0/1/2（沿用源仓场景形状）。
3. **注册**：package.json `loop-probe` 别名；根 AGENTS.md 命令表与 docs/dev.md 各一行
   （文档命令互证门禁守一致性）。

## 场景层沉淀的硬知识（都真踩过）

1. **composer 必须用 ClipboardEvent paste**：`execCommand('insertText')` 在该编辑器上返回 false
   且编辑器状态不动（2026-10-01 实测）。
2. **发送/停止按钮必须 aria-label 精确匹配**（`发送消息`/`Send message`、`停止生成`/`Stop generating`）：
   子串匹配被侧栏会话条目毒化——其 aria-label 内嵌 LLM 生成的会话标题，问"停止条件"得到的标题
   让 `/停止/` 永远命中，探针在一个 4 秒完成的回合上超时 450 秒（2026-10-01 实测）。
3. **空 composer 的发送键本来就地禁用**——"等发送键可用"作为粘贴前预检是同义反复；正确形状是
   **粘贴后重试**（粘贴 → 发送键启用 = 编辑器收下了文本；否则重贴，最多 6 次）。全新 home 的
   composer 在默认工作区初始化落地（异步 ~10s）前会静默丢文本。
4. **驱动 evaluate 不 awaitPromise**——场景里的多步 UI 流程（👎 对话框：分类→备注→提交）必须
   拆成**顺序分步** evaluate，一个 async IIFE 的 promise 会被放弃在半路（对话框开着、事件没落盘，
   2026-10-01 实测）。

## 能力面（2026-10-01 第二批）

- `--follow-up '<问句>'`：同一会话的第二轮——多轮连续性（P2）一次跑验证。
- `--dislike`：给最后一条助手消息 👎（分类+备注+提交）——反馈管线（摩擦报告 §7）的回归探针，
  事件落盘已验证（`feedback/message-put`，rating/note/category 完整）。
- `waitSamples`：回合等待期间每 ~4.5s 采样（bodyLen/思考行/工具行），**量化等待是否"活着"**——
  修复前（无 transcriptView 预置的全新 home）等待 152s 全冻结；修复后 bodyLen 连续增长
  （1415→6745），思考行与工具行全程可见。

## 输掉的方案

- **扩展 `webui-shots` 加 probe 模式**：shots 是截图/DOM 证据器（单表达式 eval、一次性 Chrome）；
  探针需要多步有状态交互 + 每调用超时竞速 + console/异常捕获——塞进同一脚本会搅混两个职责。
  源仓的分层（通用驱动 / 本仓场景）正是为此；驱动声明"任何项目直接拷走"。
- **继续手工内联 eval**：即本次战役的实际做法——六个分离调用、知识留在会话里、无法重复。
  正是被本切片取代的形态。
- **引 playwright 等测试框架**：scripts/ 风格禁第三方依赖；CDP 原生就是 WebSocket + JSON，
  Node 22 内置足够。
- **抽成跨仓共享包**：源头注释已选定"拷贝即共享"（自包含零依赖）；等第三个消费者出现再议抽包，
  不预铺抽象。

## 验证（真跑过）

- 试用 home（53649）首屏断言：`{"composerMounted":true,"firstMileStripShown":true,
  "noRoomJargon":true,"workspaceReady":true,"zhHero":true}` + 零 console 错误，exit 0。
- 一次性 home（59120）`--ask '用两句话说明：什么是生意的毛利底线？'`：pasted→sent→
  replySeconds 5→replyTail 捕获到完整中文回复（含诚实的"我这边没有你们公司的具体底线数字"），
  零 console 错误，exit 0。
- `pnpm verify` 31/31（文档命令互证含新别名）。
- 第二批（同日）：全新 home（ux-exp2）`--ask + --follow-up + --dislike` 全环绿——首问 146s、
  追问 24s 且引用上一轮上下文（多轮连续性 ✓）、👎 事件落盘；`release-smoke` 绿（发布物含
  首开预置两行）。
