---
status: 已结
opened: 2026-10-28
---

# 收口：数据面校准（会话取数、所有权分类、两个不变量）

> 立卡：2026-10-28 ｜ 状态：已结 ｜ 类型：Task ｜ 可关闭：是
> 授权：用户 2026-10-28 明确“发现的问题都修复”，并指示立 goal 推动落地。决定与输掉的方案 = [`notes/implemented/2026-10-28-data-plane-alignment.md`](../../../notes/implemented/2026-10-28-data-plane-alignment.md)；本卡是唯一 work 台账。
> **结论与去向**：三片全部交付——手册 v22 把会话召回改成 native 优先/raw 回退并装进自己的预算；数据卡拆成用户内容/插件账本/宿主面并把 N2 与账本标签写准；`dataDir` 包内拒绝与 `bundledSkillDir` 两个不变量进代码与测试。证据：`pnpm test` 147 文件 1112 全绿、`pnpm verify` 50/50、`pnpm prompt-smoke` PASS；提交 `55071fd`/`812b33f`/`d10ede1`。去向 = [implemented note](../../../notes/implemented/2026-10-28-data-plane-alignment.md)。

**问题与期望结果：** FAQ 24 对照后，本包的数据面有三处不满足：模型同时收到两条相反的会话召回指令，且原始日志配方依赖私有布局与一个在自定义 `dataDir` 下为假的父目录假设；`<dataDir>` 把用户内容与插件账本混为一类，数据卡/平面标签/N2 依赖登记都不准；两个不变量（dataDir 不得落包内、随包只读技能不得压过用户技能）没有守卫。完成后：模型只收到一条召回策略，跨项目读取是被声明的动作，账本与用户内容各有备份/清理口径，误配立即报错。

**收口证据：** 片 1 的手册 v22 与迁移、`session-recall` 技能重写、手动预算 14336 与 `manual-over-budget`、`prompt-smoke` 新断言；片 2 的数据卡三表、`docs/discipline.md` 适配 13/14、包 README；片 3 的 `assertDataDirOutsidePackage`（memory + ledger）与 `bundledSkillDir` 组合行。静态核验时的问题面（v21 手册指向 raw 配方、`tool-session-query` 常驻 guidance 与之相反、生成手册超出预算、服务层缺包内拒绝、策展技能用 `customSkillDirs`）已全部关闭。

## 外部结果三要素

- **触发**：升级后的一次真实会话里，用户问“上次那个客户的事”或“上周怎么定的”；或运维把 `dataDir` 配到包目录/自定义目录；或用户装了与随包技能同名的技能。
- **用户得到**：模型只收到一条会话召回策略（native 优先、原始日志显式回退）；跨项目读取被声明为动作而不是配方副作用；`dataDir` 误配立即报错；用户同名技能能覆盖随包只读技能；数据卡能直接回答“哪些是我的、哪些是机器的、备份带什么”。
- **完成条件**：三片全部落地并各自提交；手册 v22 迁移/提示测试、技能文本断言、两个护栏的红绿测试、docs 门禁全绿；`pnpm build` / `pnpm typecheck` / `pnpm test` / `pnpm verify` 与 fresh-home prompt-smoke 通过；证据回填本卡，proposed 卡按关闭条件翻 `implemented`。

## 发现（显性化）

> 2026-10-28 静态核验（本包代码 + 组合行 + 钉住的 vendor 文档）。级别：**S1** = 模型可见面/数据安全，**S2** = 合同与维护成本。行号随改动漂移时按名字查。

| # | 发现 | 证据 | 级别 | 处置 |
|---|---|---|---|---|
| D1 | **同一 prompt 有两条相反的会话召回指令**：组合已装 FTS5 索引与 `tool-session-query`（一段常驻 guidance + 五个工具），家手册却说 “Nothing indexes them” 并指向 raw `zstd` 配方 | v21 手册 `## Past conversations` 段（`home-map.ts`）；`cordis.patch.yml:85`（索引）、`:250`（工具行）；`vendor/dsh/packages/experimental/tool-session-query/src/index.ts:52`（固定 guidance） | S1 | 片 1 |
| D2 | **raw 配方绑死平台私有布局与一个可配错的假设**：`session-<id>` 与 vendor 现文档的 `<encoded-id>` 不一致、`v<n>` 代际、外部 `zstd`；“harness home = working folder 父目录”在自定义 `dataDir` 下为假；跨项目读取绕过平台的同 `cwd` 授权，却没作为数据边界声明 | `presets/assistant/skills/session-recall/SKILL.md:14`；`vendor/dsh/packages/session-persistence-jsonl/README.md:62`；`vendor/dsh/packages/experimental/tool-session-query/README.md`（授权仅同 cwd） | S1 | 片 1 |
| D3 | **生成的 manual 超出自己的 prompt 预算，模型看不到尾段**：`renderHomeManual()` 实测 **11,033 bytes**，`MANUAL_BYTE_CAP` 为 **8,192**，截断落在 `## Past conversations` 中间——模型永远看不到 `## Working inside someone else's repository`（含“不提交”边界）、`## Keeping it worth reading` 与 `## Layout on disk`；没有 curate finding，也没有“生成内容必须装进预算”的测试 | `renderHomeManual()` 实测；`src/host/curate-digest.ts:29`（cap）、`rootFileSnapshot` 截断分支 | S1 | 片 1（提预算 + 不变量测试 + 截断 finding） |
| D4 | **一棵树三种所有权被记成一种**：用户内容与插件账本（`skill-usage.json`、`ui-mode.json`、`audit/*.jsonl`、`archive-maintenance/`、`*.bak-*`）在数据卡里同为 P2/U，备份/清理/git/诊断口径混在一起；账本标 P3/H 易读成 `ctx.storageDomain`；`tool-session-query` 是 N2 却与 N1 索引同列 | `docs/delivery.md:35`（数据卡）、`:44`（索引行）；`docs/delivery.md:33`（刻意偏离） | S2 | 片 2 |
| D5 | **R1 缺守卫**：`dataDir` 可配到包目录内而服务不拒绝；`bootstrap.mjs` 对独立 home 已有同类拒绝 | `src/host/index.ts:146`（服务解析）、`bootstrap.mjs:107`（既有拒绝） | S2 | 片 3 |
| D6 | **只读定义压过更具体所有者**：随包策展技能用 `customSkillDirs`（rank 300），高于用户技能（rank 400）；`bundledSkillDir` 的 rank 600 才是随包只读的带 | `cordis.patch.yml:284`；`vendor/dsh/packages/skill/skill-filesystem/README.md:46-52` | S2 | 片 3 |
| D7 | **“digest/manual replay 稳定性”疑虑不成立**：系统提示以 `system/message` 落日志，replay 用已记录请求；resume 时重新组装是设计，不是 replay 破坏 | `vendor/dsh/docs/subsystems/system-prompt.md:44`；`vendor/dsh/docs/subsystems/llm-streaming.md:761` | — | 结论：不立项；proposed 卡 P2 #13 改写成“已解疑” |

## 切片台账

| 片 | 内容 | 状态 | 证据 |
|---|---|---|---|
| 0 | 立卡与授权（本卡 + proposed 决定卡 + goal） | 已完成 | 两个文件 + goal `goal-c7f546ff` |
| 1 | 会话取数：手册 v22 + 迁移 + `session-recall` 技能 + 手动预算（cap 8192→14336）+ “生成内容装进预算”不变量测试 + `manual-over-budget` finding | 已完成 | 手册 v22 与迁移/预算 + 技能重写；`vitest root-files/layout/old-home-compat` 绿；`pnpm test` 1106 通过；`pnpm verify` 50/50；`pnpm prompt-smoke`：新策略在场、`Nothing indexes them` 缺席、六工具在场 |
| 2 | 所有权分类：数据卡拆三表（用户内容/插件账本/宿主面）+ 损坏策略列 + 账本标签 + N2 回退登记（discipline 适配 14）+ README 同步 | 已完成 | `docs/delivery.md` §一、`docs/discipline.md` 适配 13/14、包 README 的 Data/平面表；`pnpm verify` 50/50；doc contract 17 通过 |
| 3 | 两个护栏：`dataDir` 包内拒绝（memory + ledger）+ `bundledSkillDir` rank 600 + 组合测试 | 已完成 | `src/host/package-root.ts` + 两处调用；`data-dir-guard.spec.ts` 5 例；`preset-skill-root.spec.ts` 7 例含 band 断言；`pnpm test` 1112 通过；`pnpm verify` 50/50 |
| 4 | 收口：build/typecheck/test/verify + prompt-smoke + note 翻转 | 已完成 | `pnpm build` OK；`pnpm typecheck` OK；`pnpm test` 147 文件 1112 通过；`pnpm verify` 50/50；`pnpm prompt-smoke` PASS；note 已翻 implemented |

## 验收标准

| 片 | 命令 / 断言 | 红的形态 |
|---|---|---|
| 1 | `pnpm --filter dsh-smart-assistant exec vitest run tests/host/root-files.spec.ts tests/tooling/home-doc-contract.spec.mjs`；fresh-home prompt-smoke 断言新策略文本在场、旧 “Nothing indexes them” 不在场 | 手册仍是 v21 文本、或技能仍把 native 工具说成不可用 |
| 1 | `Buffer.byteLength(renderHomeManual())` ≤ `MANUAL_BYTE_CAP`；超预算文件让 `curate` 报 `manual-over-budget` | 生成手册又长过预算（D3 复发）；超预算却没有 finding |
| 2 | `pnpm verify`（docs-commands / corpus-links / home-doc-contract） | 数据卡与 README 不一致、链接断、平面标签仍写 H |
| 3 | 服务构造一个包内 `dataDir` → 抛出含包根的拒绝；`bundledSkillDir` 行被组合测试/技能遮蔽 spec 消费 | 包内 `dataDir` 能创建目录；同名用户技能被随包技能遮蔽而 rank 仍是 300 |
| 4 | `pnpm build && pnpm typecheck && pnpm test && pnpm verify` | 任一红 |

## 仍未取

- **手册所有权拆分**（`MANUAL.md` + `AGENTS.local.md`）：触发 = 下一次改正文又匹配不到旧段落，或 stale 警告第二次困扰用户。
- **原生跨会话检索工具**（`ctx.sessionQuery` 驱动、snippet 返回、跨项目策略进配置）：触发 = 片 1 上线后跨项目回忆被真实使用，或 raw 配方再次因布局漂移失效。
- **project/workspace 键**：沿 [`2026-10-27-data-lifecycle-review-followups`](../../../notes/proposed/2026-10-27-data-lifecycle-review-followups.md) 的触发，只有真实跨项目串数据投诉再做。
