# 信噪比清理包：探针链/执行链的五处腐化点（2026-09-26 审计与修复）

日期：2026-09-26 · 状态：**implemented**（五切片同日全部落地，各自独立提交）

## 问题（可观察行为）

Fresh-agent 审计（2026-09-26）沿入口链（AGENTS.md → ROADMAP → 卡 → docs/）走查探针链与任务执行链：
两条链整体清楚（verify 31/31、目录链注入与开发技能发现均实测生效），但查得五处降低信噪比的残留，各带实证：

1. **过时的绕坑地图（A→B→C 残留）**：[handoff §5](../archived/research/2026-09-26-handoff-ceo-sidebar-cultivation.md)
   教"pnpm 被依赖检查挡住，用 `npx` 绕过"——peerDep 事故回退后 `pnpm build` 已实测 exit 0（2026-09-26）；
   B 时期的生存知识留到了 C 之后。
2. **一个事实三个家**：client 架构四事实（classic script / slot 系统 / tab 类型≠可见 / 仓外 Remote 需 typert 清单）
   同时住在[活动卡 §四+§九](../archived/2026-09-25-ceo-sidebar-ux.md)、handoff §3、
   [`.agents/skills/client-ui-contribution/SKILL.md`](../../.agents/skills/client-ui-contribution/SKILL.md)
   ——skill 是 how-to 的家，交接文档应链接不应复述。
3. **第二份清单漂移**：notes/README §三 的计数（proposed 空 / implemented 39 / research 1）
   与实际（4 卡 / 43 篇 / 2 篇）全数过期，与其自身 §二"不设集中索引"矛盾。
4. **队列长成 changelog**：ROADMAP 条目 15–17 每条数百字状态叙述，与卡 §〇 双份维护。
5. **踩坑表断表**：docs/dev.md §五 四段散文插在表中间，后五行成无表头孤儿行。

## 决定与落地

**决定**：五处各修各的，互不合并；每一处 = 一个独立小切片提交，verify 随片走（步步为营，独立回退）。

| # | 落地 | 提交 |
|---|---|---|
| 0 | 立卡 + 登记 | `1f43c01` |
| 1 | handoff 去腐：§5 改"历史坑已修"（教训本体保留）、dump-config 注释改真实理由；§3 四事实链接开发技能；§2 形态拍板同步 | `efbf2da` |
| 2 | notes/README §三 计数拆除（节号保留，目录树即清单） | `abdaa70` |
| 3 | docs/dev.md §五 断表归位（内容零改动） | `8bf6e53` |
| 4 | ROADMAP 条目 15–17 瘦身回"主题+标记+链接" | `3855257` |
| 5 | 活动卡 §九 链接化 + 形态拍板落卡（右侧栏 tab） | `441ac08` |
| 6 | 本卡毕业至 implemented + 队列行离队 | 本提交 |

## 输掉的方案

- **给 README 计数加"与目录一致"门禁**：把第二份清单变成要供养的第二份状态，不如删掉清单本身。
- **一次性大改提交**：违背步步为营；切片互不依赖，独立提交独立回退。
- **把 handoff 整个删掉换成"只读技能与卡"**：交接文档的"一分钟上手"与战役独有知识（desk 协议、
  诚实限制、环境快照）有独立价值，去腐不废人。

## 验收

- 每切片 `node scripts/checks/verify.mjs` 绿（31 项，逐片实跑）；纯文档 diff 的证据面就是 verify
  （typecheck/test 与其无交，未跑也不列入证据——按"窄证据"只跑会为这次回归而失败的检查）。
- 终态抽查：四事实在活跃树只余两个家（skill + 活动卡 rationale）；notes/README 无计数；
  ROADMAP 条目 ≤3 行；dev.md §五 表格连续；handoff 里 pnpm 绕过法清零。
- **证据阶梯位置**：本次全部是机械门禁层证据（verify），与改动面（纯文档）相称；
  行为层（eval / live 探针）无涉，故缺席不是缺口。

## 后续

- 培养面下一圈入口不变：handoff → [活动卡 §〇](../archived/2026-09-25-ceo-sidebar-ux.md)；
  形态已拍板**右侧栏 tab**，待开工（拍板记录在活动卡 §四·五）。
- 同型腐化的预防不新立门禁："第二份清单必漂移"的教训已由 notes/README §二承载；
  "交接文档只链接、不复述活命令"的教训记录在本卡，下一次 handoff 由作者自检。
