---
status: 已结
opened: 2026-11-04
---

# 推敲：减法 campaign（步进、行为不变）

> 立卡：2026-11-04 ｜ 状态：已结 ｜ 毕业：做现在 ｜ 去向：implemented ｜ 可关闭：是
> 授权：2026-11-04 用户授权静默自主执行；要求步步为营、每刀 `pnpm check` 绿、不破坏原功能、失败即回退。
> 结论：S1–S3 减法落地（code-only −72 行，55+/127−）；S4 评估后不落（没有净减法）；S5 保留 `repo-hygiene` + 一个月无消费者触发；S6 复盘。行为由现有 spec 与全量套件钉住；无新工具/门禁/文档层。host load 高时先用 `--maxWorkers=2` 跑通；负载降至 ~40 后 canonical `pnpm check` 复跑通过（172 文件 / 1,313 tests、verify 60/60）。
> 审查：agent — 机械 `typecheck`/`build`/全量套件（`--maxWorkers=2`）/`verify`；语义自审跨 dev/domain/agent/docs；用户授权静默自主执行。
> 去向 = [读数 note](../../../notes/implemented/2026-11-04-code-quality-readings.md)。

## 外部结果三要素

- **触发**：ub-mode 的减法半边对照后，确认近期一直在加工具/文档/断言；上一轮已做两刀样本（`submitMutation` 决策 75→63、11 个 `!` 清零；`assistant-data-status` 复用 `countTree`，−20 行）。
- **用户得到**：净减法而不是新功能——去掉 `code-shape` 的推测性重复扫描半边、去重命令文档、收掉 `desk-process` 四处 return 形状、收掉 `learn` 的 save/propose 字段映射；对分派器与 `repo-hygiene` 做出有证据的保留/不切决定。
- **完成条件**：每片一 commit、`pnpm check` 绿、`code-shape` 前后读数不升、行为不变（现有 spec 即证）；不新增工具/门禁/文档层；失败即回退并记原因；收口卡与 note 同步。

## 基线（2026-11-04，S0）

- `code-shape`：169 files、1672 个函数/方法/回调、41 个 >60 行、87 个 >10 决策点、12 行重复 0 组、8 行 10 组。
- 最高：`ProjectionPanel` 67/248、`submitMutation` 63/144（本轮已减）、`learn.execute` 54/231、`OnePageHome` 51/246。
- 已完成的样本：`957054bc`（operating 验证收一处 + `carriedFields`）、`d2853dd2`（CLI `countTree` 复用）。
- 8 行重复点：`learn/index.ts` 277/364、`desk-process.ts` 381/563 与 429/481、`assistant-data/shared.ts:19` 与 `assistant-data-status.ts:75`（已修）、schema 字段块（不修）。

## 切片台账

| 片 | 动作 | 状态 | 证据 |
|---|---|---|---|
| S1 | `code-shape` 去重复扫描；命令文档只留 `commands.md` + `testing.md`；更新 note | 已交付 | code-shape 282→200 行、duplicate/`--window` 移除；docs 只留两处；172/1313 tests（`--maxWorkers=2`，host load ~70；canonical check 的 test 阶段超时）；verify 60/60 |
| S2 | `desk-process.ts` 四处 return 形状收一个 helper | 已交付 | 5 处 `decision:'return'` 收成 `returnToDesk`；该文件 8 行重复组 4→0；函数 35→36（helper），决策 130→128，行 246→234；domain spec 60；172/1313 tests；verify 60/60 |
| S3 | `learn/index.ts` save/propose 字段映射收一个 helper | 已交付 | `skillDraft` 统一校验+字段；`learn.execute` 54→44 决策、231→213 行；文件 106→102 决策；agent 72 tests；172/1313 tests；verify 60/60 |
| S4 | 评估一个分派器；有安全切法才落 | 已评估，不落 | `tool-memory.execute` 26/109、`tool-research.execute` 27/77、`learn.execute` 44/213；`requireId`/optional-spread 只会净 0 行搬移守卫，表驱动会改模型可见结构；没有净减法，停 |
| S5 | `repo-hygiene` 保留/删除决定 + 触发 | 已决定：保留 | 只读、一条命令；删除要反转 note/card/trigger，成本大于收益；加“一个月无消费者即删”触发 |
| S6 | 复盘两个新工具与总读数 | 已交付 | code-only −72 行（55+/127−）；`code-shape` 282→200 行；函数 1671→1673（两个 helper）；`learn.execute` 54→44；desk-process 8 行重复 4→0；全局 8 行重复 10→5；docs 提法 −2 |

## 每刀硬规则

1. 一个关注点、一个 commit；同 diff 不夹带新功能/门禁/文档。
2. 先钉行为：有 spec 直接用；没有就先加会红的断言。
3. 每刀前后 `pnpm code-shape`；净行/决策/重复组不升。
4. `pnpm check` 绿才进下一刀；行为变化、门禁红、模型可见文本变化 → 回退。
5. 单刀 ≤ ~200 行净变化；超过就拆。
6. 不引入需要类型断言/联合类型的新抽象；抽 helper 后只搬家不算减法。

## 验收标准

1. **S1**：`code-shape` 不再有 duplicate 段/`--window`/self-check 重复断言；命令文档只留两个 owner；note 的“重复窗口”句更新；`pnpm check` 绿。
2. **S2**：四处 `decision: 'return'` 的对象由一个 helper 产出；stay 形状不变；domain spec 绿；前后决策数/重复组下降或持平。
3. **S3**：save/propose 共用字段 helper；错误文案不变；agent spec 绿；不改工具描述。
4. **S4**：只做一个分派器；若没有“验证收一处 + 净减”的安全切法，记录理由并停，不硬改。
5. **S5**：给出保留或删除的决定与触发；不新增命令。
6. **S6**：`code-shape` 总读数、两个工具去留、剩余候选（UI 热点/schema）记录；`pnpm check` 绿。

## 仍未取

- UI 热点（`ProjectionPanel` / `OnePageHome` / `VikiPanel`）：等下次改到它们时按相位拆，不做 drive-by。
- schema 8 行重复：声明式、清楚，保留。
- `repo-hygiene` 的最终去留：S5 决定；若保留，加“一个月无消费者即删”触发。
