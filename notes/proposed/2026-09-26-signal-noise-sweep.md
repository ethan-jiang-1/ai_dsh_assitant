# 信噪比清理包：探针链/执行链的五处腐化点（2026-09-26 审计）

日期：2026-09-26 · 状态：**proposed**（用户已拍板按序全做；切片逐项落地后本卡毕业至 implemented）

## 问题（可观察行为）

Fresh-agent 审计（2026-09-26）沿入口链（AGENTS.md → ROADMAP → 卡 → docs/）走查探针链与任务执行链：
两条链整体清楚（verify 31/31、目录链注入与开发技能发现均实测生效），但查得五处降低信噪比的残留，各带实证：

1. **过时的绕坑地图（A→B→C 残留）**：[handoff §5](../research/2026-09-26-handoff-ceo-sidebar-cultivation.md)
   教"pnpm 被依赖检查挡住，用 `npx` 绕过"——peerDep 事故回退后 `pnpm build` 已实测 exit 0（2026-09-26）；
   B 时期的生存知识留到了 C 之后。
2. **一个事实三个家**：client 架构四事实（classic script / slot 系统 / tab 类型≠可见 / 仓外 Remote 需 typert 清单）
   同时住在[活动卡 §四+§九](2026-09-25-ceo-sidebar-ux.md)、handoff §3、
   [`.agents/skills/client-ui-contribution/SKILL.md`](../../.agents/skills/client-ui-contribution/SKILL.md)
   ——skill 是 how-to 的家，交接文档应链接不应复述。
3. **第二份清单漂移**：[notes/README §三](../README.md) 的计数（proposed 空 / implemented 39 / research 1）
   与实际（4 卡 / 43 篇 / 2 篇）全数过期，与其自身 §二"不设集中索引"矛盾。
4. **队列长成 changelog**：[ROADMAP](../../ROADMAP.md) 条目 15–17 每条数百字状态叙述，与卡 §〇 双份维护。
5. **踩坑表断表**：[docs/dev.md §五](../../docs/dev.md) 四段散文插在表中间，后五行成无表头孤儿行。

## 提案

五个独立小切片，各自一个提交，verify 随片走：

- **切片 1**：handoff §5 改写为"历史坑已修"（保留"别给 package.json 加 vendor 依赖"的教训本体）；
  §3 四事实改为链接开发技能（§3.1 desk 协议与 §3.5 诚实限制保留——本战役独有）。
- **切片 2**：notes/README §三 拆除计数，保留节号（§四 被别处引用），目录树即清单。
- **切片 3**：docs/dev.md §五 断表归位（表格连回一整张，散文移到表后）。
- **切片 4**：ROADMAP 条目 15–17 瘦身回"主题+标记+链接"，状态叙述归卡 §〇。
- **切片 5**：活动卡 §九 命令块与架构事实清单链接化（只留本战役特有项）；形态拍板（右侧栏 tab，2026-09-26）
  落 §〇/§四·五。

## 输掉的方案

- **给 README 计数加"与目录一致"门禁**：把第二份清单变成要供养的第二份状态，不如删掉清单本身。
- **一次性大改提交**：违背步步为营；五个切片互不依赖，独立提交独立回退。
- **把 handoff 整个删掉换成"只读技能与卡"**：交接文档的"一分钟上手"与战役独有知识（desk 协议、
  诚实限制、环境快照）有独立价值，去腐不废人。

## 验收

- 每切片 `node scripts/verify.mjs` 绿（31 项）；报告只列真跑过的命令。
- 终态抽查：四事实在活跃树只余两个家（skill + 活动卡 rationale）；notes/README 无计数；
  ROADMAP 条目 ≤3 行；dev.md §五 表格连续。
- 全部落地后本卡按生命周期毕业至 `implemented/`（进度节改写为验收结果），队列行离队。

## 进度

- 切片 0（立卡+登记）：本提交。
- 切片 1–5：随片提交，见 git log。
