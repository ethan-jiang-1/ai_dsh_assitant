---
status: 已结
opened: 2026-10-28
---

# 收口：数据面第二轮复查（手册可见后的真值漂移）

> 立卡：2026-10-28 ｜ 状态：已结 ｜ 类型：Task ｜ 可关闭：是
> 授权：用户 2026-10-28 “再接再厉再来一轮，怕漏了或者有疏忽”。上一轮收口 = [261028-data-plane-alignment](261028-data-plane-alignment.md)；本卡只收第二轮发现，不重开旧卡。
> **结论与去向**：手册 v23 把“三样东西”改成四段、把 `ui-mode.json`/`skill-proposals/`/`audit/`/`deliverables/` 补进布局；`docs/home.md` 的迁移清单补到 v23；`renderHomeManual` 头注与“prompt 不带 dataDir”一致；`session-recall` 补上 cwd 作用域与 `<normalized-cwd>` 推导；`desk-projection` 这个第三数据根也走包内拒绝；技能优先级（项目 100 > 学到 300 > 用户 400 > 随包 600）写进合同。证据：`pnpm test` 147 文件 1114 通过、`pnpm verify` 50/50、`pnpm prompt-smoke` PASS。去向 = 上一轮 [implemented note](../../../notes/implemented/2026-10-28-data-plane-alignment.md)（决定不变，本卡只修文本真值）。

**问题与期望结果：** 上一轮把手册尾段从截断中救出来之后，尾段里原本没人看见的真值漂移开始进入模型上下文：手册说“三样东西随请求”，实际四段；`## Layout on disk` 只列了四房间与一个机器账本，漏了 `ui-mode.json`、`skill-proposals/`、`audit/`、`deliverables/`；`docs/home.md` 的迁移清单停在 v21；`renderHomeManual` 的头注还声称“具体位置随请求单独渲染”，而 prompt 刻意不带 dataDir 路径；`session-recall` 技能没有写 `<normalized-cwd>` 的推导规则。完成后：模型读到的家手册与组合、合同、实际盘上布局一致；文档的迁移清单与代码的 generation 一致；技能配方可照着做。

**收口证据：** 手册 v23（四段常驻 + 完整布局）与 v22→v23 迁移、v19 fixture 走到 v23；`docs/home.md` 的迁移清单与技能优先级、`docs/delivery.md` 的 generation 示例、`docs/architecture.md` 的摘要描述、`docs/home.md` 的 owner/缺理由措辞；`session-recall` 的 cwd 作用域与目录名推导；`desk-projection` 的包内 `dataDir` 拒绝与 `data-dir-guard` 红绿。独立漂移审计另抓的 F7–F12 全部关闭。

## 外部结果三要素

- **触发**：升级后的一次真实会话里，模型要判断“每请求常驻什么”“working folder 里有什么”“旧手册怎么迁移”；或维护者读 `docs/home.md` 核对迁移面。
- **用户得到**：模型看到的手册是四段常驻、布局完整；维护者的迁移清单与代码一致；`session-recall` 的 raw 配方能直接照做；学到技能的优先级是声明过的选择。
- **完成条件**：手册 v23 与迁移/测试落地；`docs/home.md` 迁移清单更新；`renderHomeManual` 头注与事实一致；技能补上 `<normalized-cwd>` 推导；`pnpm test`/`pnpm verify`/`pnpm prompt-smoke` 全绿。

## 发现

| # | 发现（claim → fact） | 级别 | 处置 |
|---|---|---|---|
| F1 | 手册 `## What is always in front of you` 说“Three things ride in every request”，实际四段：`docs/architecture.md` 的模型可见表与 `docs/home.md` §三都列四段（身份 100 / 手册 300 / 经营账本段 400 / 摘要 10150），`docs/testing.md` 也写“四个段落” | S1 模型可见 | 片 1 |
| F2 | 手册 `## Layout on disk` 的树只列 `SOUL.md`、`AGENTS.md`、`skill-usage.json` 与四房间；`docs/home.md` §一 的布局还有 `ui-mode.json`、`skill-proposals/`、`audit/`、`deliverables/`。尾段被救出后，模型第一次能读到这棵不完整的树 | S1 模型可见 | 片 1 |
| F3 | `docs/home.md` §五 的迁移清单写“退役的 Room data 段、v19→v20、v20→v21”，漏掉已交付的 v21→v22（召回策略 + 项目事实边界）；v23 落地后还会漏 v22→v23 | S2 合同 | 片 2 |
| F4 | `renderHomeManual` 头注声称“The concrete location rides in the prompt separately, rendered fresh per request — see manualSnapshot”，但 `manualSnapshot` 不加路径，`tests/host/root-files.spec.ts` 明确禁止 prompt 携带 dataDir 路径（2026-10-01 决定） | S2 注释 | 片 2 |
| F5 | `session-recall` 技能写“Project directories are `--<normalized-cwd>--/`”，但没有写目录名 = 会话 cwd 把 `/` 换成 `-` 再包 `--`；v21 手册曾写过这条，重写时丢了。模型只能靠列目录碰运气 | S1 模型可见 | 片 1 |
| F6 | 技能优先级未声明：项目 100 > 学到 300 > 用户 400 > 随包 600；`skill-shadowed` 只在学到的技能被遮蔽时报，学到技能遮蔽用户同名技能不报 | S2 合同 | 片 2 |
| F7 | 会话索引的作用域表述把 working folder 当成了 cwd：技能写“usually exactly your working folder's sessions”，但索引按会话 `cwd` 授权，working folder 是 `dataDir`、不是 cwd | S1 模型可见 | 片 1 |
| F8 | `package-root.ts` 头注说“every data root”，但 `desk-projection` 的 `dataDir` 没走守卫（第三个插件自有数据根） | S2 代码 | 片 1 |
| F9 | `docs/home.md` 说 `layout.ts` 是布局唯一 owner，但 §一 的 `ui-mode.json` 由 `src/host/ui-mode/route.ts` 拼路径、不在 `HomePaths`；`deliverables/` 也不在 scaffold 面 | S2 合同 | 片 2 |
| F10 | `docs/home.md` 把“缺理由的 drop”列成 curate 检查，但没有对应 finding code——实际经线程校验以 `unreadable-file` 报出 | S2 合同 | 片 2 |
| F11 | `docs/delivery.md` 的 generation 示例停在“不冒充 v21”，手册已到 v23，读起来像两代前的口径 | S2 合同 | 片 2 |
| F12 | `docs/architecture.md` 把 digest 描述成“精选记忆与线索条数”，漏了知识签树 | S3 合同 | 片 2 |

> F1–F6 由主线复查发现；F7–F12 由一次独立的新上下文漂移审计（只读，读 entry chain + 模型可见文案）发现，两边的 F1/F2 互相印证。

## 切片台账

| 片 | 内容 | 状态 | 证据 |
|---|---|---|---|
| 1 | 手册 v23（四段常驻 + 完整布局）+ 迁移 + fixture + 技能补 `<normalized-cwd>` 推导 | 已完成 | `home-map.ts` v23 + 两段迁移；`root-files` 的 seed/预算/v22→v23 用例；`old-home-v19` fixture 3,581 bytes 走到 v23；`layout` 的召回面断言；技能 cwd 作用域与目录名推导 |
| 2 | 合同漂移：`docs/home.md` 迁移清单 + `renderHomeManual` 头注 + 技能优先级声明 + owner/drop 措辞 + delivery/architecture | 已完成 | `docs/home.md` §一/§二/§四/§五、`docs/delivery.md` 格式政策、`docs/architecture.md` 模型可见表；`renderHomeManual` 头注改为“prompt 不带 dataDir” |
| 3 | 独立漂移审计结果收口（F7–F12）+ `desk-projection` 第三数据根守卫 + 全套门 | 已完成 | `desk-projection` 调用 `assertDataDirOutsidePackage`；`data-dir-guard` 3 例；`pnpm test` 147 文件 1114 通过；`pnpm verify` 50/50；`pnpm prompt-smoke` PASS（含四段常驻断言） |

## 验收标准

| 片 | 命令 / 断言 | 红的形态 |
|---|---|---|
| 1 | `vitest root-files/layout/old-home-compat`：手册含 “Four things”、`ui-mode.json`、`skill-proposals/`、`audit/`、`deliverables/`；v22→v23 迁移保手改；v19 fixture 走到 v23 | 手册仍是 “Three things” 或布局缺项；旧 home 停在 v22 并报 stale |
| 1 | `Buffer.byteLength(renderHomeManual()) ≤ MANUAL_BYTE_CAP` | v23 又超预算 |
| 2 | `pnpm verify`：`docs/home.md` 与代码迁移面一致、链接可解析 | 迁移清单仍停在 v21 |
| 3 | `pnpm test`（全量）、`pnpm verify`、`pnpm prompt-smoke` | 任一红 |

## 仍未取

- 学到技能遮蔽用户技能时的反向 finding：需要 registry 的完整名字表与新的 FindingCode；触发 = 真实用户被学到技能压过同名用户技能的事件。
- 手册所有权拆分（`MANUAL.md` + `AGENTS.local.md`）：上一轮已记触发，本卡不重开。
