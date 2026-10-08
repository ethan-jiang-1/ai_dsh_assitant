# C1 反转：schedule 默认带（host patch 直挂两行）

日期：2026-10-02 · 状态：**implemented（用户 2026-10-02 拍板"默认带"；完整取代 2026-09-30 的
"文档指引不默认带"裁决——原卡同 diff 删除，理由与边界事实已吸收进本文）**

来源：对 `_digested/`（基线 `639ed015` = 本仓 pin）的反省轮——0.2.0 变更日志证实 Schedule 已转正为
`schedule-bundle`（OPTIONAL_BUNDLES，插件页一键开），原裁决的前提"experimental 合同随时漂"过期。
方向拍板：用户 2026-10-02 三选一（默认带 / 维持文档指引 / 真用后再裁）中选**默认带**。

## 决定

1. 本包 host patch（`cordis.patch.yml`）直挂 `schedule` + `ui-schedule` 两行（照抄 schedule-bundle
   的 patch 形状；`time-context` 行本仓已有，不重复）。**不装 bundle 包、不加 peer**——行按名引用
   现货与 session-query-sqlite/time-context 同先例（peer 只收本包代码 import 的包）。
2. **headless 例外**：`schedule` 注入的 `sessionController` 是 web-app 层服务（web-app patch :121），
   headless 组合永远等不到——`dev/profiles/profile-patch-headless.yml` 显式 `disabled: true` 该行
   （`- id: schedule / disabled: true`，与 preset-runner patch 禁 headless-runner 同形状），避免每次
   one-shot 挂常驻 pending warning 淹没真实激活失败。Web 组合不受影响。
3. 养护检查定时触发（原 C1 预留的接入点）与"每周提醒我过经营状况"类主动感，全部走
   `schedule_create`（`prompt`+`title` 必填、`after_seconds` 延时秒；`schedule/src/tools.ts:417`）——
   到期以原会话 follow-up 消息投递，持久化、重启后仍生效，零自写代码。
4. README"养护定时"段改写为默认带合同（含 headless 判据句）；`docs/architecture.md` 组合树补两行。

## 原卡（2026-09-30）裁决为何反转、什么保留

- **反转的只是"进不进组合"**：原"不默认带"的唯一理由是 experimental 漂移风险；转正 + 本仓钉 tag
  （不追 main）后该风险被 pin 吸收。原卡三条实测边界事实**全部保留且仍然成立**：
  ① schedule 依赖 web 层（headless pending 判据句——本次从"手册指路"升格为"headless profile 显式
  禁用"的工序）；② time-context 同 id 并列容忍（本次直挂两行后该问题不复存在，观察记录在案）；
  ③ schedule_create 契约（读源码核，未变）。
- **原卡的 ⏳ 未验面本次实证补上**：Web 部署形状下 schedule 工具进请求的端到端，见下节验证 3。

## 验证（真跑过的命令与判决）

1. `pnpm dsh --profile dev --dump-config`——`schedule`/`ui-schedule` 行在场、无 warn。
2. `pnpm dsh --profile dev-task --patch dev/probes/session/preset-runner.patch.yml "<探针任务>"`（headless 冒烟）——
   schedule 行 disabled 后**无激活警告**；模型自述工具表无 schedule 工具（headless 正确形状）。
3. **Web 端到端**（隔离 home 对照实验 + loop-probe 真会话，四路交叉）：
   - stock 对照（/tmp 一次性 home，web profile + `dsh plugin add` schedule-bundle，standard preset）：
     request/header 30 工具含全部四个 `schedule_*`；
   - 二分 A（同法 + 本包，standard preset）：30 工具含四个 `schedule_*`（证本包 host 行等价 stock bundle）；
   - 二分 B（同法 + 本包 + roster 默认 assistant）：38 工具含四个 `schedule_*`（证 assistant preset 兼容）；
   - 本仓 dev home（assistant preset，干净重启后）：41 工具含四个 `schedule_*`，`web_search`/`web_fetch`
     底线面在场（adoption 卡常设守卫）。
   - 同批日志实证 digest 尾部带摆位（slice
     [`2026-10-02-digested-recheck-chores.md`](../archived/2026-10-02-digested-recheck-chores.md)：模型自述 +
     system/message 字节位——status 段位于全部工具段之后、persona 后缀之前）。
4. `pnpm preflight '<dev URL>'`——绿（boot graph 67 entries、Remote manifest 27 namespaces）。
5. 门禁链：`pnpm verify` / `pnpm test` / `pnpm release-smoke`（组合变化必跑）——绿，读数见提交时输出。

## 如实记录的异常（未复现，不阻塞）

首次起的 dev Web 服务器（本切片组合已含 schedule 行）上，loop-probe 新建会话的 request/header 为
35 工具：**无 schedule_*、无 mcp_resources 三件、多一个 `workflow`**——像是吃到了旧组合代；同机
干净重启后同形状全对（41 工具）。两次服务器的 preflight boot graph 指纹相同（67 entries, 同 rev），
两次会话均为新建（session id 不同、`agentPreset: assistant` 同）——宿主组合一致而 agent scope 工具
面不同，根因未定位；四路交叉验证均正常，判为长命 dev home 的瞬态（疑与 dev home 内残留的旧
代际/长命进程有关）。若再现，立推敲卡查 dev home 代际卫生；证据文件：`/tmp/web-probe.jsonl`（35 工具
侧）与 `/tmp/dev2.jsonl`（41 工具侧）的工具集 diff（`workflow` 独有 vs `schedule_*`+`mcp_resources`
独有）。

## 输掉的方案

- **维持"文档指引不默认带"**（2026-09-30 原裁决）：前提（experimental）已被 0.2.0 转正证伪；且目标
  用户是"不知道怎么用"的本人，主动感出厂即在比面最小重要（用户 2026-10-02 拍板）。
- **装 `schedule-bundle` 包而不是直挂行**：bundle 行会整体叠加（含我们已有的 time-context，同 id
  并列容忍但白背一层）；直挂两行最小、来源单一。装包版作为对照实验用过即弃。
- **只在 dev home 开**（原卡同款）：dev/release 形状分叉，release-smoke 验不到它——本次 release-smoke
  断言的就是发布形状自带两行。
- **自建定时器**（原卡同款，仍然输）：重新发明现货，且无宿主级任务存储与补投递。
- **为 headless 也补 sessionController 行让 schedule 全域激活**：把 web API 面拖进 headless 组合，
  违反它"over the shipped Web composition"的设计意图；headless 本来就不该有 wall-clock 定时投递。
