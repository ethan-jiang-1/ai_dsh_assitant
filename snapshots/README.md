# snapshots/ —— 行为回归的证据面

DSH 的行为回归证据面按"录一次、keyless 重放比对"运转（一场景一目录 + 自己的 `snapshot.yml`）。
本 repo 是隔离插件仓，harness 自建最小版。

**本树两类的现状**（状态归这里——`AGENTS.md` 只写入口与边界，不报进度）：

- **web 渲染期望**：**场景清单以 [`web-face/`](web-face/) 目录为准**（2026-11-01：10 个 = 4 客户面 + 2 产品面 + 4 调试面；Viki 4 个带 `#debug=1`，不计入客户首屏回归）。四个客户面/首开场景：
  [`blank-first-open`](web-face/blank-first-open/README.md)（裸首开的一页纸空态，harness 试点）、
  [`first-open-draft-banner`](web-face/first-open-draft-banner/README.md)（有草稿待批的首开横幅）、
  [`desk-eight-matters-first-open`](web-face/desk-eight-matters-first-open/README.md)（eight-matters 种子首页：一页纸 + 「全部（8）」）、
  [`desk-eight-matters-brief-list`](web-face/desk-eight-matters-brief-list/README.md)（同种子的「全部」人读列表）；
  两个**产品面**场景：[`product-workspace-gate`](web-face/product-workspace-gate/README.md)（profile Config 绑定后的门条/CTA）、
  [`product-onboarding`](web-face/product-onboarding/README.md)（未绑定时的首启选目录）；
  四个**调试面**场景（`#debug=1`，不是客户面）：[`viki-panel-disconnected`](web-face/viki-panel-disconnected/README.md)（降级态）、
  [`viki-panel-connected`](web-face/viki-panel-connected/README.md)（固定 mock 的列表）、
  [`viki-panel-search`](web-face/viki-panel-search/README.md)（搜索命中）、
  [`viki-panel-diagnostics`](web-face/viki-panel-diagnostics/README.md)（健康/诊断）。harness 是
  [`dev/probes/web/webui-expected.mjs`](../dev/probes/web/webui-expected.mjs)
  （`--scenario` 必填 + `--wait-text` 就绪令牌）。一键 `pnpm web-face-check --all` 跑全 10 面（默认 4 客户面；另含产品面 2 个）；Viki 面由固定 mock 驱动。
  **场景 posture**：customer/Viki 场景不是产品部署——未绑定的产品门会把首屏换成「选一个项目目录」，wait token 永远等不到；
  `web-face-check` 对它们注入 `assistant-product.onboarding:false`。手工复跑必须同样做（最省事是直接跑
  `pnpm web-face-check --scenario <name>`，它已带上该 posture 与 `lib/` freshness 检查）；场景 README 里的固定 home
  路径应换成 `.tmp/` 下的一次性目录。产品场景（`product-*`）不注入，且须用不加载 dev overlay 的 vendor CLI 起服务。
- **session 回放**：**仍未建**——升级触发条件见文末，当前用什么顶见下。

**当前用什么顶**：

1. **测试**（`packages/dsh-smart-assistant/tests/`）：纯核函数的行为断言 ——
   布局、frontmatter、存储、检索、两档出口、养护检查、摘要预算，
   以及真实组合装载（Loader + preset 站立挂载 + 经属性代理消费服务，keyless）。
   这是"会为这次回归而失败"的最小证据，覆盖绝大多数改动。
2. **web 渲染期望**（本树，已建）：隔离 home 真·首开态的 DOM 证据比对——
   首开 UX 面的 UI 改动有机器会红的回归面了。
3. **会话 JSONL 日志 diff**（落在 `dev/harness-home/sessions/`，gitignore）：
   调试上下文组装时**读日志，不猜**（model-visible ⟺ logged）。

**本树只收什么**（边界）：两类同类证据，owner 是 [`AGENTS.md`](AGENTS.md)——边界全文在那里，此处不复制；
单元/CLI/generator 的纯函数期望输出跟 owning 层走（`tests/`、各自脚本旁），不进这里。

**session 回放的升级触发条件**（够用再升级，别提前造）：提示词组装面出现"只有跑起来才看得出"
的回归，或同一 model-visible 面第三次靠手工探针钉回归——再按 DSH 的形状建
（自带 session JSONL + `snapshot.yml`；`dev/probes/session/preset-runner-replay.patch.yml` 已给 keyless 回放
半套基建）。web 面的同类触发已于 2026-10-03 ui-chat `transcriptView` 事故响过一次，
web 渲染期望 harness 因此先行落地（试点台账在该场景 README）。
