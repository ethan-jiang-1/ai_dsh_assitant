# 全仓打扫卫生：真相对齐、证据主轴与结构归位

日期：2026-10-20 · 状态：**implemented**
已归档：2026-10-30（战役收口；各项决定已由 docs/、门禁与代码持有，本篇只余历史与拒绝清单）

## 问题（可观察行为）

2026-10-20 的全仓审计确认：骨架（门禁、证据阶梯、domain 纯核）是好的，但**叙述层已腐化**。
入口链第二跳能读到与代码相反的句子：包 README 把四室写成两室、把活渲染写成固定 JSON、
把 v1/v2 解析器写成 v1、把已实现的事项处理写成"尚未提供"；生成的 catalog 因生成器正则不认
连字符而短了座位与命令；`docs/architecture.md` 夹着 A1a/A2/B1 等内部片号与"已退役"历史；
`notes/implemented` 的当前理由里混着交付流水与测试计数。执行面上，`pnpm test` 依赖隐式 build、
`test:composition` 只跑一个 spec、preflight 的 Remote 检查真空绿；代码面上 client 是 36 个文件
平铺的平面、入口兼做状态层，host 的公开类型住在组装文件里形成 type-only 环。

## 决定

1. **真相对齐**：包 README、docs 合同、组合 YAML 的陈述逐条对到代码；Viki 改回 GET/POST，
   右栏改回四室，四段提示词按 order 100/300/400/10150 记述；移除 docs 里的内部片号与历史叙事，
   归档两篇只剩历史价值的 note。catalog 生成器接受连字符；`test:composition` 跑整层；
   `pnpm test` 先 build；`pnpm start` 缺 submodule/依赖时自行补齐。preflight 从 remotes bundle 的
   `<namespace>/<method>` 键解析 namespace 与双引号 inject，抽不到就红，不再以 0 namespace 通过。
2. **证据主轴**：`shots` 的 `visibleText` 上限抬到 20000（真实数据态的模态不再被截断），DOM 证据带
   `capturedAt`，`--eval` 抛错硬失败；`loop-probe` 产出终态截图并拒绝错误气泡；`desk-walk` 记录采集时刻。
   这样一张页面证据能与会话日志按时间对上，而不是只剩一个 exit code。
3. **测试接缝**：四个模型工具（memory/research/knowledge/reflect）的 `execute` 有了真服务上的参数化
   spec；rooms-route、viki、knowledge-approve 三个生产接缝有了真 wiring spec；drawer 的 spec 标题
   改成它实际证明的 fetch，不再声称渲染；`projection-selection` 升成命令；`pnpm test` 的全量地板
   不再受 5s 默认超时影响。
4. **结构归位**：client 按 `chrome/`、`rooms/`、`desk/`、`projection/`、`proactive/` 分组，入口的
   两段本地状态抽到 `local-state.ts`；host 的公开契约抽到 `service.ts`，房间与摘要不再反向依赖
   组装文件；`rooms-route/{index,route}.ts` 与 `desk-projection/{index,download}.ts` 命名归位；
   `pnpm clean` 收掉 tsc 不删除的旧产物。
5. **上下文清理**：`notes/implemented` 只留决定与输掉的方案，交付证据回测试/提交/收口卡；新增
   `notes: implemented notes stay decision-only` 门禁，把通过结论、测试计数与提交哈希挡在门外。

## 输掉的方案

- **一次性全仓重写/大爆炸**：会同时动文档、门禁与 client 结构，回归面不可控，违背"一次一个可回退锚点"。
- **先做 client 重构**：没有 S3 的真接缝护着，重构只能靠假替身验证；先补证据再动结构。
- **加 coverage/CI/全量 jsdom**：docs/testing 已有明确触发条件；先把现有门禁的假绿修掉，比加新门更有价值。
- **把 notes/implemented 全量归档**：会丢掉仍在约束下次改动的理由；按篇判，只归档两篇纯历史。
- **只修文档不修门禁**：同一类漂移会再长回来；catalog、composition 车道、note 证据门与 preflight
  解析同轮机械化。

## 后果

- 新增/加强的门禁：note 证据门、catalog 完整性（生成器测试）、composition 整层车道、preflight
  的 manifest 解析失败即红。
- 当前路径：client 分组见 [`src/client/`](../../packages/dsh-smart-assistant/src/client/)；host 契约见
  [`service.ts`](../../packages/dsh-smart-assistant/src/host/service.ts)。
- 未在本轮改动的取舍：`web-expected` 仍需一个运行中的隔离实例，未进 `verify` 链；
  `knowledge-approve` 直调 lane 与 `domain/knowledge/ingest.ts` 的 dev-only 定位按既有理由保留。
  这些是下一次触发的候选，不是未完成的本轮切片。
- 切片台账与逐片证据在 [收口卡](../../_backlog/_archive/settled_issues/261020-housekeeping-closure.md)。
