日期：2026-10-28 · 状态：**implemented**（来源 = [六维深审](../../_backlog/research/tech-exploration/261028-six-dimension-audit.md)；收口 = [已结卡](../../_backlog/_archive/settled_issues/261028-six-dimension-improvement.md)）

# 六维改善：入口分层、反馈诚实性与结构接缝

## 问题（可观察行为）

深审确认骨架立住，但四类接缝在持续消耗 agent：

1. **入口在单调变重**：参考命令表长期留在根 `AGENTS.md`，每次加功能顺手加一行，常驻上下文越来越贵；而入口文件本应只收常设指令与路由。
2. **真页面反馈可假绿**：web-face 的 `--refresh` 只写文件，不校验 `readyState` / 控制台 / 网络失败；场景 runbook 会随 UI 漂移，坏状态一旦录成基线就会永远通过。
3. **环境红与行为红混在一起**：eval 无会话日志记 FAIL，无 Chrome 的 smoke 直接 exit 0，跳过被记成通过；agent 会被引去改 prompt/任务。
4. **代码接缝被绕过**：账本归档格式散在 host / cli / desk-projection，CLI 与面板各有一个 697 / 366 行的门面；纯核 ledger 无直接 spec，客户面 web-face 也没有一条命令可复跑。

## 决定

1. **入口分层**：根 `AGENTS.md` 只留启动五步、日常四条与指针；完整命令清单迁 `docs/commands.md`；加命令预算门，防止参考表回涨。
2. **反馈诚实**：`web-expected --refresh` 写盘前要求 complete、无控制台/网络错误、visibleText 非空；eval 与 release smoke 的缺失前置报 `BLOCKED`（exit 2）；expected DOM 增加健康门；客户面 4 场景由 `pnpm web-face-check` 一键复跑。
3. **结构接缝**：`operations-archive` 格式与解析收进 `domain/operating`；面板按 simple / activity / board 三个命名组件组织，主函数只做编排；`data` CLI 入口只做再导出，实现拆 types / bundle。
4. **测试与读数**：纯核 ledger 增直接 spec；客户面 web-face 走一键真渲染车道；coverage 只出报告、不设阈值，机器门继续等死代码实证。

## 输掉的方案

- **重写根入口**：入口密度是刻意路由层，重写会丢「先判能不能开工」的顺序收益；只搬参考表，保留前 30 行与布局/硬规则。
- **给每句文档加语义门禁**：自然语言禁令可被措辞绕过，只会制造假安全感；能机械化的只做命令参数形状与 expected 健康。
- **删 web-face、靠单测**：单测证明不了真渲染；错的是手工编排与 refresh 守卫，不是场景本身。
- **把整套浏览器测试塞进 vitest / verify**：依赖、耗时与 flake 成本高于收益；先用现有 Chrome/CDP 探针做独立车道。
- **为账本格式另建共享包**：domain 已是账本词汇的家，再开一层是把同一事实放第二处。
- **立刻上 per-file coverage 门**：没有死代码实证时，阈值只会逼出凑覆盖；先保留读数。
- **board 与 detail 拆成两个组件**：它们是同一个选择状态机的两个 pane，拆开只会把同一组 props 穿两遍；保持 `MatterBoard` 一个组件。

## 还会约束以后的后果

- 根 `AGENTS.md` 只收启动五步与日常四条；新命令进 `docs/commands.md`，命令预算门是硬门。
- 任何「跳过 / 阻断」必须报 `BLOCKED` 并 exit 2，不得打印 `passed`，也不得并入绿名单。
- web-face 场景的 runbook、expected 与 wait token 同 diff 维护；客户面用 `pnpm web-face-check`，Viki 调试面仍按各自 README（需 OV mock）。
- 账本归档格式的 owner = `src/domain/operating/archive.ts`；CLI 入口只做再导出。
- coverage 是读数不是门；机器门的触发条件仍是第一处「删了才对」的死代码实证。
