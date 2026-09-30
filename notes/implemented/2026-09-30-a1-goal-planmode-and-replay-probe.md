# A1 片：goal/plan-mode 挂进 assistant preset ＋ keyless live 探针环（llm-replay）

日期：2026-09-30 · 状态：**implemented（dump-config 行在场；真实会话日志请求侧 30 工具含四新行；301 tests / verify 31 绿）**

采纳卡：[`notes/implemented/2026-09-30-stock-plugin-adoption.md`](../../notes/implemented/2026-09-30-stock-plugin-adoption.md)（本卡 A1 片）。

## 决定与证据

1. **A1 行挂载**：`cordis.patch.yml` 的 preset 行插入 `command-goal`+`tool-goal`+`planning`（isolate 组，
   `planMode: true`，section 文案逐字抄 shipped `standard` preset）。修复"AGENTS.md 硬规则 5 宣称依赖
   plan 呈批、组合里实际没挂"的自相矛盾（adoption 卡的问题 1）。
2. **live 探针环**：`dev/preset-runner-replay.patch.yml` + `dev/llm-replay-fixture.json` —— 用现货
   `@deepseek-ai/dsh-llm-replay`（整脚本 override 习语）替掉真实 adapter，**无 API key 也能产出真实
   会话日志**；证据读请求侧（`system/message` 段 + `request/header.tools` 数组），不读回放文本。
   实测：真实 turn 的请求带 30 个工具，`create_goal/get_goal/update_goal/exit_plan_mode` 全部在场，
   与 `assistant_memory` 等四自有工具同 catalog；另一次探针会话的 assistant 文本 = fixture 原文
   （`probe turn complete`），证明 replay 端到端接管。

## 过程中抓到的三个坑（都进了 patch 头注，防重踩）

1. **patch 的 disable 行 id 漂移是静默的**：真实 api-key adapter 的行 id 是 `llm-deepseek`
   （name 才是 `@deepseek-ai/dsh-llm-deepseek-api-key`）；写错 id 不报错，只在 `--dump-config` 留一行
   `patch: entry … not found`——真实 adapter 照旧接住全部请求，探针看着绿其实什么都没测。
   判据：patch 后必须 `--dump-config` 校对行在场与 disabled。
2. **`replayState` 不是 replay 插件的标记**：它是 llm-deepseek adapter 自己写在 assistant message
   source 里的响应元数据（`llm-deepseek/src/translate.ts:161`）。首轮探针误把它当 replay 接管的证据，
   实际是真模型答的（凭据在 dev home `.credentials.yaml`，env 无 key 也真跑）。判据：回放是否接管
   看 assistant 文本是否 = fixture 原文。
3. **裸 `ReplayEntry[]` 塞 `file` 会让整行不 activate**：`file` 必须是会话 JSONL（走
   `parseSessionFixture`）；整脚本替换要走 `overrideFile`（vendor 习语，见
   `vendor/dsh/snapshots/sdk/session-title-after-turn`）。

## 输掉的方案

- **等有 key 再做 live 探针**：A2/B1/C 每片都要探针，key 是外部依赖；replay 环一次性建成全 goal 复用，
  且真实模型的回答不可重复，fixture 回复才是稳定判据。
- **自写 mock LLM 插件**：`llm-replay` 是现货（test-support 形态），回放脚本/override/child-session
  语义 vendor 已造好——自写只会在 fixture 格式上重造一遍。
- **只插 replay 行、不禁真实 adapter**：同名 provider 双注册时真实 adapter 先接住流（首轮实测），
  replay 永远不被调用；必须两个入口行一起 disabled。
