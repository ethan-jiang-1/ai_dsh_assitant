# snapshots/ —— 行为回归的证据面

DSH 的行为回归证据面按"录一次、keyless 重放比对"运转（一场景一目录 + 自己的 `snapshot.yml`）。
本 repo 是隔离插件（方案 A），harness 自建最小版。

**本树两类的现状**（状态归这里——`AGENTS.md` 只写入口与边界，不报进度）：

- **web 渲染期望**：**已建两场景**——[`web-face/blank-first-open/`](web-face/blank-first-open/README.md)
  （裸首开态，harness 试点）与 [`web-face/first-open-draft-banner/`](web-face/first-open-draft-banner/README.md)
  （有草稿待批的首开态，首屏审批横幅的耐久回归面）。harness 是
  [`dev/probes/web/webui-expected.mjs`](../dev/probes/web/webui-expected.mjs)
  （`--scenario` + `--wait-text` 就绪令牌）。
- **session 回放**：**仍未建**——升级触发条件见文末，当前用什么顶见下。

**当前用什么顶**：

1. **测试**（`packages/dsh-smart-assistant/tests/`）：纯核函数的行为断言 ——
   布局、frontmatter、存储、检索、三档出口、养护检查、摘要预算，
   以及真实组合装载（Loader + preset 站立挂载 + 经属性代理消费服务，keyless）。
   这是"会为这次回归而失败"的最小证据，覆盖绝大多数改动。
2. **web 渲染期望**（本树，已建）：隔离 home 真·首开态的 DOM 证据比对——
   首开 UX 面的 UI 改动有机器会红的回归面了。
3. **会话 JSONL 日志 diff**（落在 `dev/harness-home/sessions/`，gitignore）：
   调试上下文组装时**读日志，不猜**（model-visible ⟺ logged）。

**本树只收什么**（边界）：两类同类证据——session 回放 fixture 与 web 渲染期望
（owner 是 [`AGENTS.md`](AGENTS.md)）；单元/CLI/generator 的纯函数期望输出**跟 owning 层走**
（`tests/`、各自脚本旁），不进这里——集中目录只收真正同类的证据。

**session 回放的升级触发条件**（够用再升级，别提前造）：提示词组装面出现"只有跑起来才看得出"
的回归，或同一 model-visible 面第三次靠手工探针钉回归——再按 DSH 的形状建
（自带 session JSONL + `snapshot.yml`；`dev/probes/session/preset-runner-replay.patch.yml` 已给 keyless 回放
半套基建）。web 面的同类触发已于 2026-10-03 ui-chat `transcriptView` 事故响过一次，
web 渲染期望 harness 因此先行落地（试点台账在该场景 README）。
