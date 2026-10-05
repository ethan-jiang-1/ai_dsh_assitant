# B1 片：session-query 全文检索翻开 + `tool-session-query` 挂进 preset

日期：2026-09-30 · 状态：**implemented（replay 探针端到端：fixture 编排的 session_search 真实执行、索引库首搜落盘 49MB；301 tests / verify 31 绿）**

采纳卡：[`notes/implemented/2026-09-30-stock-plugin-adoption.md`](../../notes/implemented/2026-09-30-stock-plugin-adoption.md)（B1 片）。

## 决定与证据

1. **host 行翻开**（`cordis.patch.yml` host 段，整行替换 base 的出厂行）：`openAt: never → first-search`
   （首次检索才建索引，不付启动税）+ 持久库 `<dshHome>/session-search.db`（重启后历史仍可搜）。
   路径经 peer 现货 `dshHomePath()` 解析，不在 patch 里复刻 resolveDshHome 的兜底逻辑。
2. **preset 挂 `tool-session-query`**（五工具族，Config 用默认）。
3. **证据**：replay 探针 fixture 编排 `session_search {"query":"pin"}` → 会话日志有真实
   `tool/call` + `tool/result` 事件、派生索引库 `dev/harness-home/session-search.db`（49MB）首搜落盘；
   dump-config 无 warn 无重复 id（base 行被后层替换）。

## 探针环的增量（本片顺带）

`dev/probes/session/preset-runner-replay.patch.yml` 的 fixture 路径改为可 env 覆盖（`REPLAY_SCRIPT`/`REPLAY_PRIMARY`）；
新增 `dev/fixtures/llm-replay-fixture-session-search.json`（三段：tool-call → 文本 → 标题调用）。标题生成
（`session-title-first-prompt-llm`）也走 LLM——fixture 少一段会报 `script exhausted`，这是第三次调用
的真实来源，不是 bug。

## 输掉的方案

- **`openAt: startup`**：进程一启动就建/开索引——dev 冒烟与一次性任务都付这笔税；`first-search` 让
  不检索的会话零成本（base 注释里两种都合法，选型依据是本仓"窄证据"姿态）。
- **索引库放 working folder 里**：working folder 布局是合同（docs/home.md），外来的 `.db` 会被
  curate/布局检查当成异物；索引是 DSH home 的派生机器，家在 home 根（与 `sessions/`、`storages/` 同级）。
- **在 patch 里手拼 `process.env.DSH_HOME`**：env 为空时行为与 `resolveDshHome` 漂移（homedir 兜底、
  `~` 展开）；helper 是现货 peer，复刻即第二份清单。
