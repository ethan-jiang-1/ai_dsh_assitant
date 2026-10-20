# 全仓打扫卫生：真相对齐、证据主轴与结构归位

日期：2026-10-20 · 状态：**proposed**（2026-10-20 用户点名「修复全部」；授权 S1–S5 按序推进，未毕业）

> 授权：用户 2026-10-20「我们已经发现的问题都要修复……别莽撞修复」。切片推进、停点与证据缺口住
> [收口卡](../../_backlog/issues/261020-housekeeping-closure.md)；本卡只承载提案与验收。

## 问题（可观察行为）

2026-10-20 全仓审计（四路只读审计 + 反馈链实跑）确认：骨架强，**叙述层已出现上下文腐化**。
可观察行为按严重度：

1. **包 README 40 行内 5 处与代码相反**：右栏“两室”实际四室；`desk-projection` 说“固定 JSON”
   实际优先活渲染账本；客户端说“只用 v1 解析器”实际 v1/v2；说“事项处理路由尚未提供”实际已落地；
   说 `npm pack` 实际 `pnpm pack`（[README.md:24](../../packages/dsh-smart-assistant/README.md#L24)、
   [:26](../../packages/dsh-smart-assistant/README.md#L26)、[:28](../../packages/dsh-smart-assistant/README.md#L28)、
   [:39](../../packages/dsh-smart-assistant/README.md#L39)）。
2. **生成物 catalog 短两项**：少 `conversation.chat.assistant-actions` 座位与 `desk-activity` 命令；
   生成器正则不认连字符，freshness 门禁只会稳定再生同一份残表
   （[package-catalog.md:77](../../docs/package-catalog.md#L77)、[gen-catalog.mjs:103](../../scripts/generate/gen-catalog.mjs#L103)）。
3. **docs 合同层 20 处语义漂移**：Viki 仍写“只读”实际 GET+POST；“右栏两室”仍出现在
   architecture/identity；四段顺序写反（经营段实际在摘要前）；§七请求链漏 `assistant:operating-brief`；
   Rooms 边界句说“不接收 session”实际接收 `sessionId`；`pnpm start` 说串起 ⓪① 实际没有；
   `test:composition` 只跑 1/7 个 composition spec。
4. **notes/implemented 变成战役日志**：29 篇中 18 篇仍是提案骨架，10+ 篇带 `PASS`/`全绿`/commit/
   `tests 644` 这类交付证据；[2026-10-06-desk-primary-view.md:3](../archived/2026-10-06-desk-primary-view.md#L3)
   状态行是 200 字交付流水，[:11](../archived/2026-10-06-desk-primary-view.md#L11) 仍说
   “统一经营投影与事项处理读回尚未交付”——与代码相反。notes/README 明说切片记录/收口数字不是 note。
5. **执行/验收地板不自足**：`pnpm test` 含读 `lib/` 的 composition spec，干净 clone 会红、stale lib 会假绿；
   `pnpm test:composition` 只跑 `preset-composition` 一个；`web-expected` 不在 `verify` 链。
6. **反馈边界致盲**：实测 dev home 的“预览版说明”模态盖住桌面，但 DOM 证据的 `visibleText` 恰好 2000 字、
   不含模态，只有 `textOutline`/`controls` 含；preflight 的 Remote namespace 检查因引号风格真空绿；
   web 证据与会话日志没有 session id/时刻/pid 的 join key。
7. **代码噪声**：client 36 个文件平铺、无子目录；`client/index.ts` 522 行、fan-out 29、45 键测试面；
   host `rooms-route.ts` 与 `rooms-route/index.ts` 同名并存；服务 interface 住在组装文件里形成 7 节点
   type-only SCC。
8. **测试缺口**：5 个模型工具中 4 个 `execute` 从未被测试调用；`rooms-route/index`、`viki/index`、
   `knowledge-approve-remote` 只测手搭替身；client 测试用 inert React shim，drawer 局部状态永不渲染；
   web-face 只有 2 个首开静态场景 × 1 视口。

影响：新 agent 在入口链第二跳读到过期合同；门禁绿但语义错；症状与日志对不上，反馈通路在边界处失明。

## 提案

按 S1–S5 垂直切片推进；每片独立可回退，先消除假绿与误导，再补证据与结构。**S1 里多数是
“文档与代码相反”的缺陷，可当场修；S4/S5 是跨切片工作，需本卡授权。**

### S1 真相对齐（P0）

- 包 README 五处；catalog 生成器正则（允许连字符）并重生成；Viki GET+POST；两室→四室；
  四段顺序；请求链补 `operating-brief`；Rooms session 边界；`pnpm start` 链；`docs/dev.md` 的
  `facade:` 标签、eval 首题、shots `--dom` 口径；`docs/discipline.md` 的 `/tmp`、eval 两级、
  归档卡 owner。
- `test:composition` 改为跑 `tests/composition` 全 7 个；`pnpm test` 消除隐式 build 依赖
  （显式 build 或清晰失败）。
- preflight：Remote manifest 为 0 或抽不到 `declared` 时明确红，并兼容单/双引号；
  `--dsh-home` 文案删掉或实现；`webui-shots` 头注与 `--eval` 能力对齐。

### S2 证据主轴（P1）

- 抬高/取消 `visibleText` 截断；DOM/verdict 写入 sessionId（若在会话内）、采集时刻、服务 pid；
- `loop-probe` 出成功/失败截图，拒错误气泡；`desk-walk` 把 `returned` 变断言；`--eval` 抛错硬失败；
- 把 `projection-live-mechanics`（唯一 reload/窄视口/断连证据）升成命令表一行。

### S3 测试接缝（P1）

- 4 个模型工具 `execute` 参数化 spec（memory/research/knowledge/reflect，含 `updateThread`、
  必填参数拒绝、`presentationMeta`）；
- `rooms-route/index`、`viki/index`、`knowledge-approve-remote` 各一个真服务 wiring spec；
- drawer 断言或改标题；补 `room-data-core` 的 store 边界；
- 第 3 个 web 场景（选事项→详情→重读）或把 `projection-selection` 接成可复跑门；
- 修 `corpus-links` 的 5s 超时（该 spec 会 spawn 完整 verify runner）。

### S4 结构归位（P2）

- `client/index.ts` 抽三段状态策略（seenRunning / proactive UI / session settle），收窄 45 键测试面；
- client 按 desk / projection / rooms / proactive 分组；
- host 抽 `service.ts` 放 `AssistantMemory` 公开类型，消 7 节点 type-only SCC；
- `rooms-route/{index,route}.ts`、`desk-projection/{index,download}.ts` 命名归位；清 stale `lib/`。

### S5 上下文清理（P2）

- 逐篇判 notes：纯切片记录归档；当前理由改写成“决定 + 输掉的方案”，删进度/PASS/计数；
- 修三篇孤儿 note（repo-tmp / build-freshness / pin）的入链；
- docs 内剩余历史句清零。

## 输掉的方案

- **一次性全仓重写/大爆炸**：会同时动文档、门禁、client 结构，回归面不可控，违背“一次一个可回退锚点”。
- **先做 client 重构**：没有 S3 的真接缝护着，重构只能靠假替身验证；先补证据再动结构。
- **加 coverage/CI/全量 jsdom**：docs/testing 已有明确触发条件，当前证据不支持提前建；先把现有门禁的
  假绿修掉，比加新门更有价值。
- **把 notes/implemented 全量归档**：会丢掉仍在约束下次改动的理由；按篇判，不按批量。
- **只修文档不修门禁**：同一类漂移会再长回来；S1 同轮把能机械化的类（catalog 完整性、
  composition 车道、test build 前置）加门禁。

## 验收

- **S1**：`pnpm verify`、`pnpm test`、`pnpm test:composition` 全绿；catalog 重生成后 source/catalog
  清单计数一致；preflight 对空 manifest/抽不到 inject 明确红；包 README/docs 逐条对表不再有与代码相反句。
- **S2**：真机 `shots` 的 `visibleText` 含模态；web 证据带 session id/时刻；`loop-probe` 错误气泡红；
  `desk-walk` 的 `returned` 进 exit code；`--eval` 抛错硬失败。
- **S3**：新增 spec 先红后绿；`pnpm test` 全量绿；第 3 个 web 场景在隔离 home PASS。
- **S4**：typecheck/test/verify 全绿，行为零变化；SCC 归零；client 目录分组。
- **S5**：`pnpm verify`；逐篇 note 判据（只在还会指导下次改动时留在 implemented）。
- **总**：`pnpm verify`、`pnpm test`、`pnpm test:composition`、`pnpm web-expected`（隔离 home）
  全绿；已知“绿但语义错”的条目清零。

## 关闭条件

S1–S5 按用户拍板的顺序落地；每片有同 diff 的回归证据；本卡毕业后把仍约束以后的取舍写进
`notes/implemented/`，其余进 `archived/`。
