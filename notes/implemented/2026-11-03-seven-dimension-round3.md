日期：2026-11-03 · 状态：**implemented**

# 七维三轮：评分只看剩余状态，自述面先于结构

## 问题（可观察行为）

第三轮 fresh-eyes 复评（四路只读子审计 + 主线真机）发现：骨架与门禁仍然硬，但上一轮收口卡自评
「七维全部 9.0」把**本轮修了什么**当成了**现在还剩什么**。按剩余状态重打是 ≈8.5（A-），与二轮批前的
8.2 几乎一致——那一整天的修复主要把债挪了位置。剩下的债集中在两处：**会说谎的自述面**（headless
用户被教「五个 web-only 行自禁用」，照做会踩回 BUG-029；卸载文档称 preset 选择「自然回退」，
实际 `agent-preset/not-found`）与**取证的最后一公里**（「工具是否进了请求」要手搓 `zstd | jq`）。

## 决定

1. **评分只看剩余状态。** 每一维必须列出剩余缺口；A 档要求证据自动化，A- 只允许轻微缺口或手工证据。
   按"本轮修复数"打分会让数字通胀（一天内 8.2 → 9.0，而结构债未动）。
2. **自述面先于结构。** 一张会让用户照做出错的句子，优先于任何重构：web-only 自禁用、卸载回退、
   tarball 引擎门时机、HMR 升级通道。生成物（安装手册）的正文与合同同源，且**不许再出现**自我否定
   的旧口径——`exportManualProblems` 现在钉"每行自带 `disabled: true`"与"不得出现 self-disable"。
3. **取证要一条命令。** `pnpm session <id> --tools` 打印请求里的工具名；`--recent` 列候选会话（时间 /
   preset / cwd），不教 `ls -t`——并行会话下"最新"会指到别人的会话。`--refresh` 先打印逐条 drift
   再写基线，把"过目后重录"从君子协定变成可见动作。
4. **结构按族拆，测试按动词补。** `home/health.ts`（464 行）拆成 types/support/rooms/skills；
   `tool-operating`（459 行）拆成 vocabulary/view/mutations。拆之前先补断言：operating 的
   `revise`/`claim`/`reopen`、research 的 `park`/`promote`、Viki 客户端的五条降级、CLI import 的两个守卫，
   以及 BUG-028 承诺过的红夹具（判据搬进 `publish-shape.mjs`，生成器改为调用它）。
5. **归档索引也是导航面。** `_archive/**/README.md` 进链接语料，其余冻结历史仍排除；两条活着的死链
   与它们的门禁夹具同 diff 修好。归档卡不压缩、不改写。

## 输掉的方案

- **再写一份 research 审计报告。** 两周内已有三份（261020、261028、261103 ×2），单日 866 行；
  第四份只会训练下一次继续写。改为一张薄卡 + 本条 note，报告只在被引用时存在（本会话对话）。
- **`pnpm session --latest`。** 直接违背 `dev/lib/session-logs.mjs` 记录的并行会话事故；`--recent` 给出
  上下文让人自己挑，探针仍用快照差集。
- **把浏览器车道塞进 `pnpm verify`。** Chrome/耗时/flake 会把"跳过即绿"引回来；证据政策已声明它不在
  verify，`check:full` 才是阶段收口的汇总入口。
- **为七维评分新增一个 method 文件。** 规则进本条 note 足够；再多一个方法文件属于为流程而流程。
- **主题 CSS 改成 vendor 的 `ctx.effect` + `data-plugin`。** client 半边有自己的生命周期封装，改动面大于
  收益；作为 P3 余项登记（触发 = 停用/热重组后残留被真实观察到）。

## 后果（还会约束以后的）

- 七维分数必须带"剩余缺口"列，且与上一轮同口径比较；自评不得只列已修项。
- 涉及 headless 组合的文档，必须同时回答"行会不会自禁用"（答案：不会，必须显式 disabled）。
- 生成物里的用户指令，要么有 freshness 门钉住，要么由单一来源生成；两者都没有就不许写进手册。
- 用户选择住在 profile 的 `cordis.patch.yml`（`agent-preset-registry` 行），不是 `settings.yaml`——后者是
  0.2.1 之前的导入源，首次启动会改名成 `.imported`。Settings 写的是**整份有效 config**，所以残留行同时有
  `default: assistant` 与 `selectedDefault: assistant`；只删后者不够。`bootstrap --cleanup-legacy` 只删该行里
  值为 `assistant` 的这两个键，其余键与字节保留。
- 实测：只留 `selectedDefault` 的手写行会让 registry 配置校验失败（缺必填 `default`），全部 preset 变 pending——
  比 `not-found` 更早、更响；照真实形状写 patch，别手写半份 config。
- 全局样式（`--dsha-*`）按 vendor 规则挂在 `ctx.effect` 上并带 `data-plugin`/`data-plugin-css`；没有 owner
  的全局注入会在热重载或停用后残留。
- 计数（工具数、动词数、场景数）只许住生成物或由数组长度派生；散在散文里就是下一处漂移（“six tools”
  这次在四处出现过）。
- 临时目录按层用各自的 harness：tooling 一份 `verify-gates-harness`（可导入的注册表）、host 一份 `dirPool`
  （自带服务 teardown 顺序）、domain 在 spec 内；强行统一会破坏清理顺序。同一层内的重复（三个 tooling spec
  各写一份 `temp()`）已清掉。
- `host/index.ts`（入口 + 实现）与 `host/viki/client.ts`（335 行）**不拆**：前者是 cordis 插件入口的惯例形态
  （vendor 同形），后者围绕一个外部服务的读/写/降级；拆开只会制造第二个真相源，等出现独立 owner 需求时再评。
- 七维复评至少安排一次**不共享对话的读者**按入口链复走两个任务（本轮：加一个工具并证明进请求、headless 五行为何
  显式 disabled）；自评不算数——两个读者在 12–15 步内到达正确答案，同时暴露了计数口径与手写映射的漂移。
- 结构拆分的等价性证据按三层取：旧实现与新实现在同一组输入上的逐字节输出对照、被搬代码块在新文件里
  逐字出现、承载 `lib/` 的安装车道（`release-smoke` / `upgrade-smoke`）；「测试还绿」不单独算证据。
- 新增的 dev 报告入口必须能被 `--tools`/`--recent` 这类"一问一命令"覆盖，否则补它。
- 浏览器车道已见两种假红，两个都已有机制：①就绪 token 命中后、截图前断连（复跑与基线一致）——token 现在
  必须**稳定 400ms** 才算 ready；②就绪界 15s 在满载下误红——默认界改为 30s。界只限定"等多久"，不是延迟 SLO。
