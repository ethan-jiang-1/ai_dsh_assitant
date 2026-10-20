# 261019 维护面战役收口（A/B/C 三卡毕业收卷）

日期：2026-10-20 · 状态：**implemented**
已归档：2026-10-20（战役记录；权衡已住在 A/B/C 各 implemented note，本篇冻结不再跟踪。）

## 决定

[261019 维护面收口](../../_backlog/_archive/settled_issues/261019-self-update-lanes.md)（A 卡）、
[Viki 内容面](../../_backlog/_archive/settled_issues/261019-viki-content-governance.md)（B 卡）、
[学到的东西](../../_backlog/_archive/settled_issues/261019-learned-skills-surface.md)（C 卡）
按 2026-10-19「落地计划」的切片顺序落地完毕，三卡同日毕业归档。逐片理由与输掉的方案留在
[`notes/implemented/2026-10-19-*.md`](../implemented/)，本篇只记交付、证据与外部剩余。

## 交付

| 片 | 交付 |
|---|---|
| A1a 读真值 | 面板四 tab 读 working folder；知识正文/抽屉/批准；`assistant-rooms` GET |
| A2 直写 | 同一 route POST 五动作（`knowledge.approve\|deprecate`、`memory.correct\|retire`、`skill.retire`），`source: panel-direct` + before/after 审批账 |
| A3 收据 | `buildReceipt` + 「全部标为已读」baseline；面板「收据/已读」 |
| A1b 退役 | `.desk/state.json` 与 `desk-refresh` 退役；既有 home 手册迁移 v16；keyless prompt 探针 PASS（无 `.desk`/`desk-refresh`/`Room data`） |
| B1/B2/B3 | `assistant-viki` 只读投影；`snapshot/commit` 带 `paths` 的删/恢复；人工并排；12 条宿主 spec |
| B4 | `dev/deploy/viki-cleanup.mjs` dry-run 默认、`--apply` 先 tree snapshot；保护 identity/soul/.overview；当前 server keep 5/remove 0/protected 2 |
| C1/C2 | 技能 tab（出处/用量/正文/退役）；assistant 消息「记下来」（`sessionQuery` 逐字，`source=panel:message:<sessionId>/<messageId>`） |

## 证据

- `pnpm test` 97 文件 / 812 测试通过；`pnpm verify` 42 项通过；`web-expected` 两场景 PASS；`pnpm eval` 7/7（真实 key，throwaway home）。
- 真机：知识室完整渲染（`待你审批（9）` → 批准 → `9→8` + 审批账 `promote draft→stable room:knowledge source:panel-direct`）；收据/已读可交互、零 console error；A1b 无 key 探针 PASS。
- 逐片理由：[maintenance-read-authority](../implemented/2026-10-19-maintenance-read-authority.md)、
  [maintenance-direct-write](../implemented/2026-10-19-maintenance-direct-write.md)、
  [maintenance-receipt](../implemented/2026-10-19-maintenance-receipt.md)、
  [retire-room-data-copy](../implemented/2026-10-19-retire-room-data-copy.md)、
  [viki-read](../implemented/2026-10-19-viki-read.md)、
  [viki-delete](../implemented/2026-10-19-viki-delete.md)、
  [viki-cleanup](../implemented/2026-10-19-viki-cleanup.md)、
  [learned-skills](../implemented/2026-10-19-learned-skills.md)、
  [message-remember](../implemented/2026-10-19-message-remember.md)。

## 外部剩余

1. **右栏浏览器 seat**：B/C 的 `memoryRoom`/`vikiRoom`/`skillsRoom` tab 在 vendor `rightbar.session` 上无法渲染（插槽挂载但内容为 `display: contents`；`RightbarRoot`/`SidebarRight` 的 active/selected 条件不满足）。宿主路由/面板单测证据完整；页面本身可用（本人已看到）。这是 vendor 渲染条件，不改 vendor。
2. **B4 真数据**：B 卡 §5.2 的 14 条越界在另一份工作区；当前 server 试跑 0 条越界。脚本/夹具/回执格式已交付，真数据由本人执行并回填回执。

## 去向

A/B/C 三卡 → [`_backlog/_archive/settled_issues/`](../../_backlog/_archive/settled_issues/README.md)；
依据档 → [`_backlog/_archive/research/`](../../_backlog/_archive/research/README.md)；
逐片理由保持 `notes/implemented/`（当前理由，不归档）。
