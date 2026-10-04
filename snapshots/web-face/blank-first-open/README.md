# blank-first-open —— 隔离 home 的真·首开态（web 面期望比对试点）

> 场景契约（snapshots/AGENTS.md：录制命令、profile、判据与 fixture 同 diff）。
> 比对器与 CLI：[`scripts/webui-expected-core.mjs`](../../../scripts/webui-expected-core.mjs) +
> [`scripts/webui-expected.mjs`](../../../scripts/webui-expected.mjs)；形态夹具：
> `packages/dsh-smart-assistant/tests/webui-expected-core.spec.mjs`。

## 场景是什么

**全新 home 第一次打开 web UI 的状态**：空会话列表、首开引导条（hero + 「第一次来？」行）、
右栏桌面入口——[首开 UX](../../../_backlog/plans/261001-first-open-ux.md) 反复打磨的那个面。
共享 dev home 的"空白态"不空白（侧边栏列着真实会话与每分钟变化的相对时间戳），所以本场景
**必须起在隔离 home**——这也正是"首开"的真义。

## 怎么跑

```sh
# ① 起隔离 home 服务（幂等；vendor 产物在位时 ≈6s）
ASSISTANT_DSH_HOME=/tmp/dsh-expected-home bash dev/prepare.sh && bash dev/setup.sh
ASSISTANT_DSH_HOME=/tmp/dsh-expected-home pnpm dsh --profile dev --port 0 --no-open

# ② 比对（漂移即 exit 1，逐条 diff + PNG 路径供人工过目）
pnpm web-expected '<server 打印的 URL>'

# 有意的 UI 变更：过目 diff 后重录期望（重录的 PNG 在临时目录，肉眼核过再提交 JSON）
pnpm web-expected '<server 打印的 URL>' --refresh
```

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
| 第二场景候选 | 提示词组装面（headless 会话回放）——`dev/preset-runner-replay.patch.yml` 已给 keyless 回放半套基建 |

三岔判定待更多打磨轮次的数据（本卡 §二"失败出口"）；当前形态继续。
