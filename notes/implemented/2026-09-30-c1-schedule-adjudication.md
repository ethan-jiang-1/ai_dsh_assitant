# C1 片：养护定时的挂法裁决（不默认带）+ 手册段落

日期：2026-09-30 · 状态：**implemented（用户拍板「文档指引，不默认带」；隔离 home 实测三条边界事实进手册）**

采纳卡：[`notes/proposed/2026-09-30-stock-plugin-adoption.md`](../../notes/proposed/2026-09-30-stock-plugin-adoption.md)（C1 片）。

## 决定（用户 2026-09-30 拍板）

`schedule-bundle` 是 experimental OPTIONAL bundle——**不进本包组合**，README 增"养护定时"段指路：
插件页一键开 → `--dump-config` 断言激活判据 → 助手 `schedule_create` 建首个养护任务。
验证过的部分写实证，未验的部分明标（见下）。

## 隔离 home 实测的三条边界事实（手册的依据）

1. **schedule 依赖 web 层**：纯 headless 形状（dev-task = [base, headless]）里 patch 插入 `schedule` 行
   → `pending (waiting for service: sessionController)`，不激活（`/tmp/probe_c1.log`）。
   判据句"dump 里 schedule 不带 pending"因此写进手册。
2. **与我们 B2 的 `time-context` 行同 id 同 config**：再插一条 dump 两行并列、无 warn——组合容忍，
   config 全同无行为差异；若上游 bundle 行将来改 config，后层覆盖语义决定胜负（届时以 dump 为准重查）。
3. **`schedule_create` 契约**：`prompt`+`title` 必填、`after_seconds` 延时秒（`schedule/src/tools.ts:417` 读源码核）；
   回放 fixture（`dev/llm-replay-fixture-schedule-create.json`）编排了真实调用形状备用。

## 如实标注的未验面（⏳）

- **Web 插件页一键开 → web 部署形状下 `schedule_create` 端到端**：dev CLI 建不出"带 web-app 层且收
  位置参数任务"的 profile（`--from-default-profile web` 的 profile 不收任务参数；installation-owned
  `headless` tuple 在源码运行时不生效，只 `dsh plugin add` 缺省 [base]）——三绕未通即停，手册该步骤
  标为 vendor 机制转述（`profile.ts:213-218` + runtime-profiles 消化稿），非本仓实证。

## 输掉的方案

- **profile patch 默认带三行**（用户否）：experimental 进发布形状，上游漂移我们先红。
- **只在 dev home 开**：dev/release 形状分叉，release-smoke 验不到它；且 dev home 是本仓的门面，
  experimental 常驻会混淆"我们验证过的形状"与"上游实验面"。
- **自建定时器**（`assistant-learn` 里挂 setInterval 之类）：重新发明 `ctx.schedule` 现货，且无宿主级
  任务存储与补投递——正是"生态插件只借思路不装包"反面的"自己写一个更差的"。
