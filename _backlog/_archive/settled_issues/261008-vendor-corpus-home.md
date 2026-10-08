---
status: 已结
opened: 2026-10-08
---

# 推敲：DSH 平台语料的家——vendor 留事实，本仓只写差量

> 立卡：2026-10-08 ｜ 状态：已消化｜毕业门判断 = 已消化｜下一步 = 落点：根 AGENTS.md 硬规则 2 与探索路由；`docs/discipline.md` 表行与适配 9；`docs/AGENTS.md`；`notes/README.md` §四；`.agents/skills/client-ui-contribution`、`pre-push-evidence`、`note-archive-judgment`

## 背景 / 触发

用户原话：DSH 内部的信息——docs、skill、notes 的处理——在 `vendor/dsh` 里找得到；不知道该写到哪里，现在从那儿搬到这儿，不合理。先琢磨最合适的家，不搬家。

这和 2026-10-07 语料吸收审计是同一类痛，切面更窄：那次裁的是「主仓治理制度不自动适用独立插件仓」；这次裁的是「平台事实的正文该住哪」。

## 已知与未决

已核实（钉 `vendor/dsh` @ `639ed01539`，tag `dsh-v0.2.0-rc.2`）：

- **平台事实的家已经在 submodule 里。** 文档 tier 表在 `vendor/dsh/docs/AGENTS.md`（「一个事实一个家，别处链接」）。Agent Note 合同在 `vendor/dsh/.agents/notes/README.md`。主仓开发技能在 `vendor/dsh/.agents/skills/`（`dsh-doc`、`dsh-pre-push-checks`、`dsh-archive-agent-notes` 等），frontmatter 写明服务对象是 **deepseek-harness 本体**。主仓没有 `_backlog/`；推敲在它那边就是 `proposed/` note。
- **本仓编码 agent 不会自动加载那些技能。** 运行时发现根是最近的 `.git` 祖先（`vendor/dsh/docs/subsystems/skills.md`「Local discovery priority」；`vendor/dsh/packages/skill/skill-filesystem/README.md` 写明不做 monorepo 子项目选择）。仓根的 `.git` 是本仓，submodule 里的 `.agents/skills` 不进本仓技能目录。Cursor 只在打开 `vendor/dsh` 下的文件时才把那边的技能注进当轮上下文。
- **整份 symlink 或复制 `dsh-*` 会跑错仓库。** 那些技能的命令是 `pnpm doc-sync`、`gh stack`、coverage 门；note 路径是 `{lifecycle}/{class}/` 加冻结 manifest。相对链接 `../../notes/README.md` 也假设 cwd 是主仓。
- **本仓已经有对的家，只是缺一句「别再抄正文」。** `docs/discipline.md` 是继承表（借 / 适配 / 刻意不做）。`notes/README.md` §四已写：继承分类学精神，不复制 `{lifecycle}/{class}/`。根 `AGENTS.md` 硬规则 2 只路由「机制结论 → 读 vendor 文档和源码」，没覆盖 docs tier、技能、notes 处理。于是后来的会话把平台段落再写进本仓。
- **`cordis-plugin-development` 不是这层的替身。** 它在 `vendor/dsh/packages/preset/agent-preset/skills/`，给的是运行中的 Harness 用 `plugin_manager` 装 bundle。本仓开发用的是仓根 `.agents/skills/`，两套不共享 registry（根 `AGENTS.md` 已写）。

### 待答问题

分家规则认不认。认了之后，哪几份现有正文该瘦成指针，单独成片，不在本卡做。

### 待跑实验

无。分家是归属判断，不靠实验。

### 喂给谁

认规则之后的一小片：根 `AGENTS.md` 探索路由补一句；`client-ui-contribution` 一类把平台机制复述进技能正文的，改成链接加本仓路径。

## 候选与取舍

三条规则：

1. **平台事实**——DSH 怎么工作：架构、技能发现、文档 tier、主仓 note 制度、主仓命令、client 机制。家是钉住的 `vendor/dsh`。本仓只留链接。不把段落贴进 `docs/`、`notes/` 或技能正文。
2. **适配声明**——我们借了哪条、改了哪条、刻意不借。家是 `docs/discipline.md` 的一行。新的差异加行，不新开一篇复述。
3. **本仓才能执行的步骤**——路径、命令、门禁是本仓的。家是仓根 `.agents/skills/` 的短技能，链到 vendor 那一页，只写差量。本插件的取舍进 `notes/`。本插件的合同（home、身份、命令、测试地图）留 `docs/`。`_backlog/` 是本仓的推敲空间，主仓没有，继续留在这儿。

不放的地方：不改 `vendor/dsh`；不把主仓 note 树搬进 `notes/`；不把 `dsh-*` 复制或 symlink 进 `.agents/skills/`。

| 现有件 | 判断 |
|---|---|
| `docs/discipline.md` | 留。表本身就是适配声明 |
| `notes/README.md` | 留。这是本仓 note 合同；§四已经拒绝复制主仓目录 |
| `pre-push-evidence`、`semantic-drift-audit`、`repo-live-probe`、`note-archive-judgment` | 留。命令和路径是本仓的。与主仓相同的判断标准用链接，不把 `dsh-archive-agent-notes` / `dsh-pre-push-checks` 的正文再抄一遍 |
| `client-ui-contribution` | 瘦。classic-script、slot、boot 的机制主人是 vendor 的 client 源码和文档；技能只留「从本包贡献时的路径和验证命令」 |
| 根 `AGENTS.md` 硬规则 2 | 补一句：docs tier、技能、notes 处理同样先读 `vendor/dsh` 对应页，本仓只落差量 |

输掉的做法：

- **继续整段搬。** 升 pin 之后两份一起烂。`docs/discipline.md` 已把「继承跟 pin 走」写成复查环，抄正文正好打穿它。
- **只读 vendor、本仓不再写技能。** 发现根不是 submodule，常驻上下文里没有那些技能；本仓的命令表也没有第二份家。
- **symlink `dsh-*`。** 相对路径和命令都指向主仓流程。

## 毕业门

- 该做：用户认上面三条规则。然后另开一小片改路由和瘦技能，不在本卡里改。
- 待触发：用户认为某份平台正文必须常驻本仓上下文（发现根覆盖不到、打开 vendor 文件太晚）。触发到了再单独立卡，写明哪一份、为什么链接不够。
- 不做：把本仓 `notes/`、`docs/`、`.agents/skills/` 迁进 submodule，或把主仓语料整树再搬一次。
- 消化：规则若已写进根 `AGENTS.md` 与 `docs/discipline.md`，本卡关闭，指向那两处，不另留一份章程。
