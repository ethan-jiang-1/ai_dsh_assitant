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

## 修复

构造函数把 digest 预热链到既有 `ensureHome()` 之后（`src/index.ts`）：scaffold（尽力而为，
失败只警告）→ `digest()` 首渲。启动到首个 LLM 请求之间隔着整个 harness 装配，毫秒级文件
读取的竞态实际关闭；写入路径的 `touch()` 失效即重热原本就在，不动。

## 证据

- 红绿测试 `tests/digest-prewarm.spec.ts`（2 用例）：①同目录二次构造（缓存冷、该实例无任何
  写入触发）→ `vi.waitFor` 摘要含预置记录——修复前必然超时红，修复后绿；②写后无需 curate
  摘要即含新记录。
- 修复前后 live 对照在战役卡 §七（P5 复跑探针补"后"值）。

## 输掉的方案

- **把 section text 改成异步等待**：vendor `system-prompt` 契约只有同步 `string |
  (context) => string`（vendor/dsh/packages/core/system-prompt/src/index.ts:66），没有异步位；
  改契约是升 pin 级别的事，不是本切片的量级。
- **摘要落盘缓存（digestCache.json）**：派生物落盘违背"索引是派生物"的既定理由（tri-line
  尸体清单"反链索引服务"行同构），且引入缓存失效面；进程内预热已够。
- **只在 runner/Web 启动事件里预热**：比构造晚、覆盖面窄（漏掉其他 host 形态），无增益。
