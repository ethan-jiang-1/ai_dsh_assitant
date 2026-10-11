---
status: 已修
severity: P2
opened: 2026-10-11
---

# BUG-009：会话挂载相位的判据面随负载变红——超时不可配、失败不自解释，底下还压着两处真竞态

> 严重级别：P2（次要）｜发现：2026-10-11｜状态：已修（2026-10-11）

## 症状

`node dev/probes/web/desk-process-e2e.mjs`（K4 处理流全链探针）在**会话挂载之后**稳定停在
`composer-accept`：`pasteResult: "pasted"`，随后取状态的 `Runtime.evaluate` **超时**
（`CDP evaluate timed out: Runtime.evaluate`，driver 的 20s 上限）。三个阶段（matter-list /
matter-detail / conversation-switch）都绿——即桌面渲染与「处理这件事 → 切到会话」都正常，
卡死发生在 composer 出现之后的粘贴/发送窗口。

同一天 `pnpm loop-probe <走查实例> --ask 你好` 也全红（`composerMounted: false` 等，见 BUG-010 的
另一半原因），`webui-shots`/`web-expected` 两场景在同负载下**照常绿**（它们只拍桌面，不进会话）。

## 根因（已查明：不是本仓回归，是环境 + 会话挂载期的重活）

- **排除法两次**：把当天最后一刀（交代首事臂）整体回退 → 同样红；`git switch --detach 1abaa93`
  （交接提交，探针当时绿）→ 同样红。⇒ 与当天任何切片无关。
- **机器负载**：复现窗口内 `uptime` 显示 load 20–26 / `hw.ncpu` 10——**2–2.6 倍超载**，
  主要来源是**别的仓库**的 Playwright/Chrome（`ai_dsh_company`、`ai_dsh_deep_research`，非本仓）。
  会话挂载这一刻的活最重（首屏 React 渲染 + 回放 burst 的流式 chunk + 转录 markdown 重渲染），
  在超载下很容易跨过 20s 的 evaluate 上限。
- 本仓自身的重复服务（同一走查 home 上残留的三个 `--profile dev` 实例）已清掉两个，负载未降。

## 复现

```sh
uptime && sysctl -n hw.ncpu     # 需要 <2× 才有意义；高负载下必红
H=$PWD/.tmp/probe-home/k4-probe-home
node dev/probes/web/desk-process-e2e.mjs --home "$H"
# 期望：三阶段 PASS + intake 轮；高负载下停在 composer-accept（本次已给状态取证）
```

## 补记（2026-10-11 晚）

交代首事臂的**浏览器证据已经另行取得，且比回放探针更强**：真模型在走查实例上走了一遍
「桌面 → ＋ 交代新事项 → 说一件新事 → 自动返回并选中新建的那件事」（账本真写入 m-4、
承诺 2026-10-18/核对 2026-10-14 由模型从本人原话里提，桌面 4 件在办、详情停在新事项上、
无 console/exception）。因此 `desk-process-e2e` 的第三轮**降级为回归资产**（机器空下来再跑，
不必为它单独阻塞交付）。负载敏感这条本身仍然成立。

## 修复（2026-10-11，共三处；前两处是判据面，后两处是真竞态）

**① 判据面：预算可配 + 失败自解释**（commit `1ad00e2`）

- `cdp-driver.mjs`：新增 `evaluateTimeoutMs`（默认 20s 不变，便宜读取不受影响）；超时消息带上实际预算。
- `desk-process-e2e.mjs`：`--eval-timeout <ms>`（本探针默认 60s，因为它的相位含会话挂载 + 回放 burst）；
  `loadavg >= ncpu` 时启动即打醒目警告；**每份判决都带 `host { ncpu, loadavg, evalTimeoutMs }`**；
  composer 相位失败时附 `hostHint`。
- **机制红绿**（同一页面、同一次调用）：`evaluateTimeoutMs: 1` → `CDP evaluate timed out after 1ms: Runtime.evaluate`；
  `30000` → `2`。**诊断证据**：load 50.67/10 核那次红，判决里就有 `host.loadavg: [50.67, …]` + 预算 60000，
  一目了然是环境——这正是当晚我白查两轮回退要买的东西。

**② 真竞态一：粘贴撞上探针自己起的回合**（commit `858d187`）

处理会话一挂载，注入的「正在处理事项…」消息就起了一个真实模型回合；回合运行中 vendor 的 composer 是
「停止」态——**没有发送键、粘贴被丢**（失败取证：composer 在、`valueLength: 0`、`send: false`）。
于是在哪一拍粘贴成功，取决于「那个回合多快结算」这个纯负载量。修法：新增相位 `conversation-idle`——
粘贴前等停止键消失、发送键回来（顺路点掉审批门），预算 120s。

**③ 真竞态二：回放脚本被种子回合顶掉一格**（同 commit）

记录里的第一组是 report+propose，但种子回合排在主轮之前，把它吃掉了；粘贴那一轮于是拿到**拒绝续段**：
提案当场被拒、没有待确认 → 桌面**正确地**返回，而探针期望「留在对话」必红。**这个错位从 `1abaa93`
（种子落地）起就存在，只是没人重跑过探针**。修法：脚本第一格服务种子回合（一句「读到了、等指令」，
不产生工具调用），映射恢复为 种子 → 录制 report+propose → 作者拒绝 → 作者 entrust；对齐契约写进探针头注。

**绿证据**（共享探针 home，load ~7.5/10，全套 exit 0）：
`matter-list / matter-detail / conversation-switch / conversation-idle / pending-stays-in-chat /
reject-auto-return / durable-rejection / confirmed-dates-unchanged / return-selection /
intake-entry / intake-auto-return / intake-return-selection / double-click-single-session`
——其中交代臂三轮是 ② 的浏览器面证据（`intake-auto-return` 建成 m-2、返回并选中它）。

## 遗留（不是本卡的）

- 「会话挂载相位」在这台机器上仍会随负载变慢（`--eval-timeout` 与 `conversation-idle` 已把判据面
  与负载解耦到「等得够久就绿」）；**红之前先看判决里的 `host`** 这条纪律留在探针头注与
  [`docs/dev.md`](../../docs/dev.md) §五踩坑清单。
- 同期发现的 [BUG-010](BUG-010-loop-probe-stale-first-screen.md)（首用探针首屏断言过时）已另行修掉。
