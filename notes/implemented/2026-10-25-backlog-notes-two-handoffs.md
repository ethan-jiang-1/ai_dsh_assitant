# backlog 与 notes：两个 handoff，不是一条管道

日期：2026-10-25 · 状态：**implemented**

## 问题（可观察行为）

已结卡上的「下游处理」长期只有一行去向，方法要求的完整申请（日期、接收方、内容）几乎不出现；「做」的结论被递给 notes，但 work 的授权、验收和台账其实住在 proposed、收口卡和规格卡。10-12 之后流程文本冻结，campaign 形态（proposed + 规格卡 + 收口卡 + note）没有写进合同。10-20 的「implemented 只留决定」清理把 K4、晨报、proactive-face 的「本人的验收面（未取）」删掉——机器已绿、人的判断还没取的东西在 memory 树里没有位置。归档卡里指向 note 的「去向」指针也在烂，而 link gate 排除 `_archive`。

## 决定

1. **两个 handoff**：结论＝做且要授权的，走 **work handoff**（proposed 授权 → 收口卡台账 → 实施）；结论＝以后做/不做/已有结论的，走 **memory handoff**（note 或 trigger）。[`issue-to-note`](../../_backlog/methods/issue-to-note.md) 路由两者，不再把「做」的结论只递给 notes。
2. **proposed 是 memory 的未来架，不是 work 板**：`proposed` ＝ 尚未成为当前权威（可待点头，也可已授权、在飞）；授权是**决定事实**，写在状态行，不是第二套生命周期词。
3. **收口卡是唯一 work 台账**：切片推进、停点、证据、开放验收、未取的人判断都住 [`_backlog/issues/`](../../_backlog/issues/README.md) 的收口卡；规格卡是规格，不单独授权、不持台账；proposed 卡只指针到收口卡。
4. **毕业前移开放 work**：note 毕业时，未取的人判断/延后验收先移到活卡（本次＝[261025-open-human-verdicts](../../_backlog/_archive/settled_issues/261025-open-human-verdicts.md)），note 只留指针；「implemented 只留决定」不再把开放 work 当交付证据删掉。
5. **handoff 记录降为 destination ＋ 一句理由**：只有真要用户裁决 note 该不该写时，才写完整申请（日期/接收方/内容）。「去向」是记录，不是申请书。
6. **归档的 note 指针是活指针**：搬迁/毕业要修；`_archive` 的 handoff 指针进 scoped gate（不扫全部历史链接）。

## 输掉的方案

- **A 把 proposed 整体搬到 `_backlog`**：树最干净，但迁移大、09-25 的「将来/当前/过去」时间轴断，且 link churn 与本次要修的指针问题混在一起。保留 proposed 在 notes，用「决定事实」补状态。
- **C note 在授权时毕业**：`implemented` 会变成「决定已定」而不是「已交付」，与既有 implemented notes 的语义冲突；不选。
- **只改 `issue-to-note`，不改 [`notes/README.md`](../README.md)**：状态词/验收归属仍在 memory 合同里，proposed 的 1/1 冲突和 10-20 清理会复发；不选。
- **继续在 implemented note 里保留整段验收**：memory 树装 work，note 会重新长成台账；与 10-20 的清理目标相反；不选。
- **把 10-20 清理回滚成「保留整段验收」**：会把交付证据带回 note；只恢复开放 work 到活卡，不回滚整段。
- **给 `_archive` 加全量链接门禁**：全部历史研究链接会被一次性拖进来，范围失控；只查 handoff 相关的 `notes/` 指针。

## 还会约束以后的后果

- 新卡先判 work/memory；`notes/proposed` 可已授权、在飞，但 work 台账在收口卡。
- 规格卡不再写「已授权实施」/「本卡不授权写代码」；它们只写规格，指向收口卡。
- implemented note 的「仍未取」只留指针；开放 work 的账在收口卡/活卡。
- 归档卡的 note 指针由 scoped gate 守；note 归档技能只修 note→note，不覆盖卡→note。
- [`docs/discipline.md`](../../docs/discipline.md) 登记 note 时机：切片决定 note 同 commit；campaign 收口/毕业 note 在收口提交。
- [10-02 治理借鉴](2026-10-02-backlog-governance-borrow.md) 的「四门/不调度」仍有效；「管道」说法由本篇收窄。
