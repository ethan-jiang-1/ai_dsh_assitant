---
status: 活跃
severity: P2
opened: 2026-10-11
---

# BUG-009：负载稍高时两个浏览器探针在会话挂载后判红——渲染主线程无响应，判据面被环境压死

> 严重级别：P2（次要）｜发现：2026-10-11｜状态：活跃

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

## 修复关联

**不是代码缺陷，是判据面的环境依赖**。两个候选方向（未裁决）：
1. 探针侧：把 evaluate 的超时做成**可配**（`--eval-timeout <ms>`），高负载时给足预算；失败信息里
   带上 host 负载（`os.loadavg()`），让「红」自己说明是不是环境；
2. 会话侧：给回放 burst 一个可配节流（探针已有 `paceMs`），让挂载期的渲染压力可预测。

在那之前：**挂载期相位红 ≠ 回归**——先看 `uptime`，再决定是否当回归查（本轮为此白查了两轮回退，
成本记在这里）。取证命令与相位设计见 `dev/probes/web/desk-process-e2e.mjs` 头注与 BUG-010。
