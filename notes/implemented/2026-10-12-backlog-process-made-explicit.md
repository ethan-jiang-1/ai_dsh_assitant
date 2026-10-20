# backlog 流程显式化：两轨入场票、缺陷修复流、状态生命周期与 agent 面

日期：2026-10-12 · 状态：**implemented**

来源：本人指示借鉴 `ai_dsh_loop_advisor` 同日同题卡（`ai_dsh_loop_advisor/_backlog/issues/2026-10-12-backlog-process-made-explicit.md`，仓外路径；其证据基座 = 该仓生命周期研究，读 DSH 平台自己的状态机 + 归档卡全量翻转观察）立本仓推敲卡并同轮落地——「借助这个 issue 把我们 repo 的 _backlog 里头的内容调整对」。三项裁定沿源卡（2026-10-12 本人）：门禁升格延后、格式先行；修复就绪自授权 + 严重/变向例外；两轨状态生命周期。制度同源链与四门/不调度的 owner 是 [治理借鉴](2026-10-02-backlog-governance-borrow.md)，目录名与 frontmatter 形状的 owner 是 [架子命名](2026-10-09-backlog-shelf-names.md)。

## 落了什么（事实的家在各文件，这里只记取舍）

1. **两轨一张入场票**（[`_backlog/README.md`](../../_backlog/README.md)「一件事怎么走」）：问题清楚 + 验收手段，由格式承载——issues 的载体是 `## 验收标准`，bugs 的是 `## 修好定义`。先前 issues 侧散在三处、bugs 侧没有，这是第一处两轨共说的家。
2. **缺陷修复流成文**（[`_backlog/bugs/README.md`](../../_backlog/bugs/README.md)「修复通道与授权」）：修复就绪一翻同时是车票与授权——根 AGENTS.md 豁免清单的「bug 修复卡毕业」一直是这个方向的雏形，现在边界写全：P0，或修复触及 根 AGENTS.md 常设指令 / docs 合同 / 包的公开行为 / 已记录决定（notes）→ 不自授权，走本人。这条也是 severity 的消费方（此前 P0/P1/P2 只记不读）。根因假设→确认要有证据；证伪的假设留在卡上；修好定义可挂 riding 依赖；当场修复的同类清扫写进该轮交付记录。
3. **铁律带日期例外**（`_backlog/README.md`）：「卡上的状态、方案或建议都不授予实施权限」保持，例外显式写出——不让新修复流与铁律自相矛盾。
4. **两轨生命周期**：frontmatter `status` 是当前阶段唯一家，状态行镜像并拥有历史，目录承载粗位置；沉默不翻转；出口值只在归档那次改动里翻。翻转表 issues 在 [`issues/README.md`](../../_backlog/issues/README.md)、bugs 在 [`_backlog/bugs/README.md`](../../_backlog/bugs/README.md)、共享法在入口 README。bugs 词汇：`活跃`→`排查中` 改名 + 增 `修复就绪`/`修复落地`/`等人拍板`——对应源仓 investigating/fix-ready/fix-landed/waiting-for-owner；`待修` 保留「查明未修挂起」的归档语义，**不**与修复就绪合并。
5. **agent 面**（[`_backlog/AGENTS.md`](../../_backlog/AGENTS.md) 门牌）：嵌套 AGENTS.md 随目录链自动注入（平台机制，vendor agent-instructions）——规则到达落进区域的 agent，不再只靠它选择去读。门牌无日期无进度（入口文件稳定性门禁管着），事实的家仍在各 README。
6. **门禁加强**（[verify-checks.mjs](../../scripts/checks/verify-checks.mjs) 的 liveness 族内，无新检查族）：cardStatus 新枚举、**活跃卡**状态行↔frontmatter 镜像互查、「毕业：」闭集头（`未定|做现在|以后做|不做|已在别处`，即关闭表四门）。归档卡豁免镜像与闭头——历史行（`已毕业`、带日期的 `毕业：` 记录）是记录不是漂移，位置与 frontmatter 已钉住。负例夹具三组在 [backlog.spec](../../packages/dsh-smart-assistant/tests/tooling/backlog.spec.mjs)：bug 四值镜像通过 / 旧词活跃+镜像分叉+缺行三红 / 野头红+归档豁免绿。旧卡 `毕业门判断` 字段保持兼容，刻意不匹配。

## 与源仓的差异（本地适配，非偏离）

- **RFC 不经 proposed/ 停放**：点头与交付同轮到达，按 [notes 合同](../README.md)「已交付且确有持久取舍的，直接写 implemented/」直接落本篇；源卡流程里的「notes INDEX 再生」在本仓不适用——本仓 notes 刻意不设集中索引（目录树就是清单）。
- **`待修` 语义分叉**：源仓 fix-ready 是活跃态；本仓 `待修` 是归档出口（查明未修），两者并存、词汇不混。
- **缺口差异**：复现字段本仓模板已有（源仓缺口 3 不成立）；根 AGENTS.md 已带 `_backlog/` 路由（源仓缺口 5 只半成立），门牌补的是落区域的推送面。
- **词汇中文**：与源仓英文枚举一一对应（排查中/修复就绪/修复落地 ↔ investigating/fix-ready/fix-landed），卡名维持六位 `YYMMDD`（2026-09-28 拍板不翻）。

## 刻意延后（under-pressure，不是否掉）

- **「验收在场」检查族**（per-state 必备节，如修复就绪必须带修好定义）：按 promote-on-recurrence 延后——第一次出现缺验收字段的卡在门禁绿的情况下溜过去时再提，那是真回归；现在做是无压力预建。延后句子以本篇为家。
- **`rejected` 终态词汇**：从未发生过的情形，不预建；发生时新开卡引用本篇。

## 输掉的方案

- **仅 README、不做门牌（pull-only）**：规则到不了没选择去读的 agent——嵌套 AGENTS.md 自动注入是现成机制，不用白不用。
- **验收在场族现在就上门禁**：无压力预建，违背本仓 promote-on-recurrence 姿态（门禁纪律一：没证明过会失败的守卫不是守卫）。
- **缺陷修复走本人轮/issue RFC（历史实践）**：本人已否——缺陷卡就是工作项，豁免清单的「bug 修复卡毕业」与此同向。
- **`proposed` 状态**：每张卡立刻离开的状态；queued-vs-touched 是被否的调度语义（两仓同款负知识）。
- **`blocked` 状态**：平台 goal 机需要它是自主环必须自报僵局；卡是读者消费的，依赖随修好定义/下一步走。
- **向后翻转禁止**：证伪与本人复活都会翻车——被撤回的根因假设会逼人 churn 两张卡。
- **`待修` 改造成 fix-ready**：两个语义挤一张出口卡，归档池与授权态混淆。
- **保留 `活跃`**：与手册自己的「活跃区」撞词；零活跃 bug 卡时改名免费，以后改要迁移。
- **镜像检查扫归档**：~30 张历史卡的状态行变体立刻全红——位置+frontmatter 已钉住归档，历史行是记录。
- **`已结` 改名 `已解决`**：分裂归档词汇；它就是本轨的 resolved。
- **issues 加工作态**：卡就是判断记录；bugs/issues 不对称是刻意的（bugs 有实施翻转，issues 没有），章程写明。
