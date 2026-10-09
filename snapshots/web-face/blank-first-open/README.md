# blank-first-open —— 隔离 home 的真·首开态（web 面期望比对试点）

> 场景契约（snapshots/AGENTS.md：录制命令、profile、判据与 fixture 同 diff）。
> 比对器与 CLI：[`dev/probes/web/webui-expected-core.mjs`](../../../dev/probes/web/webui-expected-core.mjs) +
> [`dev/probes/web/webui-expected.mjs`](../../../dev/probes/web/webui-expected.mjs)；形态夹具：
> `packages/dsh-smart-assistant/tests/tooling/webui-expected-core.spec.mjs`。

## 场景是什么

**全新 home 第一次打开 web UI 的状态**：主区默认是全局桌面，显示「你的桌面」、真实无数据时的空态与「有问题？跟助手说」入口；首开预览版说明在场。不预置 `.desk/state.json`，不含真实经营事项或草稿。Conversation 的首用引导与审批横幅不在这个默认主区内，由进入 Conversation 的场景验证。
共享 dev home 的"空白态"不空白（侧边栏列着真实会话与每分钟变化的相对时间戳），所以本场景
**必须起在隔离 home**——这也正是"首开"的真义。

## 怎么跑

```sh
# ① 起隔离 home 服务（幂等；vendor 产物在位时 ≈6s）
export ASSISTANT_DSH_HOME=$(mktemp -d /tmp/desk-blank-XXXXXX)
bash dev/env/prepare.sh && bash dev/env/setup.sh
# overlay 只固定工作区到隔离 home；不确认首开声明、不复制凭据、不种桌面。
printf -- '- id: workspace-controller\n  name: "@deepseek-ai/dsh-api-workspace-controller"\n  config:\n    documentsDirectory: %s/workspaces\n' "$ASSISTANT_DSH_HOME" > "$ASSISTANT_DSH_HOME/workspace.patch.yml"
pnpm dsh --profile dev --patch "$ASSISTANT_DSH_HOME/workspace.patch.yml" --port 0 --no-open

# ② 比对（漂移即 exit 1，逐条 diff + PNG 路径供人工过目）
pnpm web-expected '<server 打印的 URL>'

# 有意的 UI 变更：过目 diff 后重录期望（重录的 PNG 在临时目录，肉眼核过再提交 JSON）
pnpm web-expected '<server 打印的 URL>' --refresh
```

未种桌面的首开态会被 `pnpm preflight` 的 desk-readiness 检查拒绝；本场景不把该拒绝写成全绿交付。认证、bundle 注册和 boot 图可单独读其结果，DOM 比对仍须无 console/network 错误。K1 默认入口的记录已去除存量期望里的共享工作区经营数据污染；这不是经营账本空态通过证据，当前组件仍读 legacy 工作区快照。

## 比对什么（判据）

比对面是 shots 的 **DOM 证据 JSON**（不是像素）：`title`/`viewport`/`readyState`/`visibleText`/
`textOutline`/`controls`/`consoleErrors`（必须空）/`networkFailures`（必须空）。
忽略清单（六个字段，逐一带理由）与 token 规则（`{{origin}}`）是**纯核里的被审常量**——
不是悄悄磨平；shots 新增输出字段会以 `unowned` 出现在 diff 里，不会静默绕过。
PNG 只作人工审阅副页，不进 git（保持 diff 全文可读）。

## prove-it-red 记录（2026-10-04）

1. **纯核层**：11 个夹具（`webui-expected-core.spec.mjs`）——忽略字段真忽略、比对字段真咬
   （文案变/控件消失/console 噪声/未加载完/视口不符各一红）、origin token 化、未知字段显式化。
2. **全链路**：污染 `expected.dom.json`（改首行品牌词 + 加不存在按钮）→ 真拍比对
   `FAIL — 1 drift line(s)`、**exit 1** → 还原 → 复绿。
3. **残留风险（诚实账）**："改 src → build → 服务真红"这条未演练（build 会动共享 `lib/`，
   与并行会话冲突）；纯核与全链路两红已夹住比对器，实现侧红留第一次真实回归自然验证。

## 成本台账（试点测量，2026-10-04）

| 项 | 实测 |
|---|---|
| 隔离 home 准备（prepare+setup） | 5.7s（vendor 产物在位幂等跳过） |
| 服务启动到可拍 | ~10s |
| 单次拍摄+比对 | ~15s |
| 假红率 | 隔离 home 下间隔 90s 两拍，除忽略清单外**零差异**；共享 dev home 不可用（时间戳漂移） |
| 胶水成本 | core+CLI+spec+本 README ≈ 一个轻切片 |
| 第二场景候选 | 提示词组装面（headless 会话回放）——`dev/probes/session/preset-runner-replay.patch.yml` 已给 keyless 回放半套基建 |

三岔判定待更多打磨轮次的数据（本卡 §二"失败出口"）；当前形态继续。
