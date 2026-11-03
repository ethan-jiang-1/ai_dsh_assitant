# dev/probes/web/ —— 浏览器探针的抽屉

> 本页只回答「哪个探针回答什么问题、跑它要什么前置、留下什么证据」。
> **命令清单唯一家** = [`docs/commands.md`](../../../docs/commands.md)（已起服务的 alias 形态）；
> **意图路由（先判断你要证明什么）** = [`docs/dev.md`](../../../docs/dev.md) §六；
> **场景契约** = `snapshots/web-face/<场景>/README.md`。三处都不在这里复制。

## 前置：三类探针

| 形态 | 谁属于它 | 要什么 |
|---|---|---|
| 自编排（推荐） | `web-face-check`、`loop-probe`、`desk-walk`、`projection-live`、`product-first-screen` | 一条命令从隔离 home 起服务、拍、比、收；缺 Chrome = `BLOCKED` exit 2 |
| 只要一个已起的 URL | `webui-shots`、`web-expected`、`preflight`、`agent-preset-ui`、`approve-direct-probe` | 一个真实例（`pnpm dsh --profile dev --port 0 --no-open` 打印的 URL） |
| 只要一个已起的服务 | `desk-projection-download`、`projection-panel`、`projection-selection` | 隔离 home + 固定夹具（见场景 README） |

缺 Chrome / 缺 `zstd` / 缺 profile 一律 `BLOCKED`（exit 2），不冒充 PASS——这是本仓的证据政策。

## 入口探针（一问一命令）

| 探针 | 回答什么问题 | 怎么跑 | 留下什么 |
|---|---|---|---|
| `preflight` | 这个实例能交给真人吗（route / Remote / 注册面可达） | `pnpm preflight '<URL>'` | 逐项 ok/FAIL；红了不交 URL |
| `webui-shots` | 页面现在长什么样 | `pnpm shots '<URL>' --dom` | PNG + DOM 证据在 `.tmp/shots/` |
| `web-face-check` | 10 个场景里哪些与基线一致 | `pnpm web-face-check [--scenario <名>\|--all]` | 逐场景 PASS/FAIL/BLOCKED + diff + PNG |
| `webui-expected` | 单个场景当前页 vs 基线；有意变更重录 | `pnpm web-expected '<URL>' --scenario <目录> --wait-text <token> [--refresh]` | 退出码 + 逐条 diff；`--refresh` 先打印 drift 再写 |
| `webui-loop-probe` | 首用闭环：首页输入 → 交给它 → 一页纸 | `pnpm loop-probe '<URL>' --ask '<问句>'` | JSON 判决 + `sessionId`（快照差集） |
| `desk-flow-walk` | 处理流真机走查（人判话术/层级） | `pnpm desk-walk '<URL>' [--home <dir>]` | 屏幕文本 + 截图 + 逐相位 sessionId |
| `product-first-screen` | 未绑定 home 的首屏门 / 首启选目录 / 恢复面 | `node dev/probes/web/product-first-screen.mjs '<URL>'` | 两处缺陷的 live 判决 |
| `agent-preset-ui` | Settings → Agent 预设能否选「章鱼管家」 | `pnpm agent-preset-ui '<URL>'` | 一条人工探针（不是自动门禁） |
| `projection-live-mechanics` | 断连/重连、3 次重载不增殖、窄视口与滚动保留 | `pnpm projection-live [--home <dir>]` | 逐相位 verdict |
| `projection-selection` | 一页纸「看依据」的 quote/source 读回 | `pnpm projection-selection '<URL>'` | 读回证据（需夹具） |
| `desk-projection-download` | 固定只读下载的字节与错误/限额 | `node dev/probes/web/desk-projection-download.mjs '<url>' <fixture>` | 独立字节比对 |
| `approve-direct-probe` | 知识批准直调车道在这一 pin 上真的挂上了吗 | `node dev/probes/web/approve-direct-probe.mjs '<URL>'` | 挂载/回退证据 |
| `desk-process-e2e` | 处理流的确定性端到端三场景（flow/claim/wake） | `node dev/probes/web/desk-process-e2e.mjs --scenario flow` | 相位 verdict JSON |
| `desk-continuity-live` / `desk-daily-brief-live` | web 会话里的接续首回合 / 晨报模型行为 | `node dev/probes/web/desk-continuity-live.mjs`（同族） | 会话日志判据 |

## 共用件（不单独跑）

`cdp-driver`（Chrome/CDP 生命周期）、`probe-service`（起停真服务）、`scene-home`（写场景 profile 行）、
`dialogue`（对话习语：按文案找/点）、`probe-utils`（参数与 sleep）、`preflight-core`（预检纯核）、
`webui-expected-core`（比对纯核，spec 在 `tests/tooling/webui-expected-core.spec.mjs`）。

## 战役一次性探针

`multiview-live`、`desk-capture-live`、`proactive-*`（idle/shots/watch/unattended）各自服务一个**已归档验收行**；
保留供复跑，不进任何门禁，也不出现在 `docs/commands.md`（没有 alias）。用到时先读文件头的「为什么存在」。

## 加一个新探针

先问它属于上表哪一类；能进 `web-face-check` 场景的**不进**新脚本（场景有基线、有门禁、有人审）。
新入口必须同时更新本页一行与 `docs/commands.md`（如果给了 alias）；没有 alias 的，跑法写在本页。
