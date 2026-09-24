# digest 冷启动预热（战役毛边 #1 修复）

日期：2026-09-25 · 状态：**implemented（代码+测试同 diff；live 复验见战役卡 §七）**

## 问题（基线探针现场抓到）

战役 P0 基线探针①（preset-runner 会话 `session-ff3377c2`，2026-09-25）暴露：**每个新进程的
第一个请求里，digest 段只有 271B 状态 blurb，~1.2KB 的摘要正文（活跃记忆/开放线索/知识树）
全部缺席**。助手在会话里诚实报告"摘要本轮没有携带任何内容"——I7/I12 的"摘要常驻"实际只在
多轮会话的第二轮以后成立。

根因：`digestSnapshot()` 走 vendor 同步 section 契约（`text: string | (context) => string`，
无异步位），缓存冷时只能返回 blurb 并后台刷新；one-shot 会话（preset-runner 驱动）只有一次
请求，刷新完成时会话已结束。Web 长会话的第一轮同样中招——而第一轮恰恰是用户打招呼、
问"你知道什么"的那一轮。历史验证证据全部来自多轮会话第二轮以后，故漏网。

## 修复（二轮，2026-09-25 战役探针复跑逼出真相）

**第一轮（构造函数 fire-and-forget）不够**：战役 P5 探针复跑（`session-40647e65`/`session-0fedb7e1`）
仍见冷 blurb——时间戳探针实测（one-shot 复现）：**service 构造 T+0 → 首次 prompt 组装求值
digest section T+113ms（缓存冷）→ 异步 digest 完成 T+115ms——差 2ms 的掷硬币**，每个新进程
五五开。P3/P4 会话没发现，因为它们都是显式调 curate/digest 工具拿数字，不从 prompt 读。

**最终修复 = cordis `Service.init` 生命周期钩子**（vendor/dsh/vendor/cordis/src/fiber.ts:257：
class 插件实例化后 loader **await `instance[Service.init]()` 返回的 promise** 才算装载完成）：
预热链抽成 memoized `prewarm()`（scaffold 尽力而为 → 首渲 digest），构造函数照旧 fire-and-forget
（直接构造路径与测试不变），`async [Service.init]()` await 同一个 promise——装载路径把
"尽力预热"变成"保证预热"。

## 证据

- 红绿测试 `tests/digest-prewarm.spec.ts`（3 用例）：①同目录二次构造（缓存冷、该实例无任何
  写入触发）→ `vi.waitFor` 摘要含预置记录——修复前必然超时红；②写后无需 curate 摘要即含
  新记录；③**init 钩子确定性测试**：`await svc[Service.init]()` 后摘要**立即**（无 waitFor）
  含预置记录——loader 的 await 就是保证。
- live 前后对照（战役卡 §七）：修复前探针自报"摘要位是空的模板文字"（271B blurb）；
  修复后同题 one-shot 首请求逐字报出 6 条记忆标题 + 2 条开放线索 + 10 页目录树（4004B 全量）。
- 时序实测：`[constructor T+0] → [section evaluated T+113ms, warm: false] → [digest done T+115ms]`。

## 输掉的方案

- **只靠构造函数 fire-and-forget（第一轮修法）**：输给毫秒级竞态——runner 首请求组装与
  digest I/O 同时完成，掷硬币不是保证。
- **把 section text 改成异步等待**：vendor `system-prompt` 契约只有同步 `string |
  (context) => string`（vendor/dsh/packages/core/system-prompt/src/index.ts:66）。
- **挂 `system-prompt/assemble` 瀑布等预热**：瀑布在 section 文本**求值之后**才触发
  （assemble() 先解析 sections/contexts 再 waterfall）——结构上来不及。
- **摘要落盘缓存（digestCache.json）**：派生物落盘违背"索引是派生物"的既定理由（tri-line
  尸体清单"反链索引服务"行同构），且引入缓存失效面。
- **冷路径同步渲染（readFileSync 一套房列举）**：能赢但复制一套 I/O 代码；init 钩子零重复
  且语义正确（"装载完成前预热好"）。若未来出现 init 也覆盖不了的更早消费方，此方案是备选。
