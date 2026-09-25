# 阈值退役（治理环切片 1c）

日期：2026-09-24 · 状态：**implemented**
依据：三线合流提案 `notes/implemented/2026-09-24-tri-line-synthesis.md` 阶段 1 切片 1c
（D4 已定参数：30d 未用→stale、90d→archived，配置行可调，dsh-mind 样板；归档=移出 provider
扫描目录、不删、可恢复）；R2 §9.3-3（"有用量统计后此件自然长出"——本片消费 1a 的数据面）。

## 问题

技能房间只有入口没有出口：`save_skill` 写入后，一个从未被加载的死技能永远躺在房间里——
而每个技能的 name+description 都在会话技能目录里占**常驻上下文**，死技能每请求都在付费
（Claude `/skill-doctor` 的存在证明这是官方认可的治理件，R2 §3.4）。

## 决定

1. **双档阈值，配置行可调**：`staleSkillDays`（默认 30）→ `skill-stale`（info：退役候选，
   去留归 agent）；`retireSkillDays`（默认 90）→ `skill-retirable`（warn：已过退役线——
   常驻目录成本正在为死技能付费）。
2. **年龄锚点诚实**：账本 `lastUsedAt`（1a 的数据面）；从未加载的用 SKILL.md 的
   `metadata.learnedAt`（scanner 新读此字段）；两者都没有（手写、无 provenance）**不判年龄**
   ——不能凭空断代，该技能已有 `skill-without-provenance` finding 管着。被遮蔽的豁免
   （出口是 1b 的 shadow finding，且名字键的账本计数归赢家）。
3. **出口动词 `assistant_reflect action=retire_skill`（name, reason?）**：bundle 移入
   `skills/archive/<name>/`（平文件技能归档为平文件）——移出 provider 扫描目录=立即从
   会话目录消失（provider 有 watch，实况验证），**不删**，搬回去即恢复。归档副本盖章
   `metadata.retiredAt`（+可选 `retireReason`）——尸体写死因。**先写归档再删原件**：
   失败时留下两份可读副本（curate 可见），而不是丢技能。
4. **不自动归档**：检测归代码（curate 纯函数契约不破——"names candidates, never repairs"），
   动作归 agent。1e 节拍器落地后定期驱动处理 findings，治理门"轻但在"。这与 D4 落选 B
   （"只报不退役"）的区别：出口动词真实存在且由数据驱动，不是没有门。
5. **布局**：`skills/archive/` 进 HomePaths + scaffold（与 memory/archive、research/archive
   同构）；scanner 跳过 archive 目录（provider 侧已亲验：无 SKILL.md 的子目录静默跳过，
   `vendor/dsh/packages/skill/skill-filesystem/src/index.ts` discoverRoot——parseSkillFile
   失败即 continue）。
6. **错误语义**：退役一个已归档的名字报 `already archived`（比"no learned skill"诚实——
   名字在家里的 archive 里，不是不存在）。

## 输掉的方案

| 输掉的 | 为什么输 |
|---|---|
| curate 里自动归档 90d 技能 | 破"纯检查不复修"契约；静默动作违背治理门哲学（门的点在于决策可指认） |
| dsh-mind 式后台自动策展周期 | 引入 timer/后台任务面；1e 节拍器（已有 proposed 决策）是同一职责的正确落点，不重复造 |
| 退役时删文件 | 尸体是给未来的自己看的；恢复必须零成本（搬回去就行） |
| 年龄锚点用文件 mtime | git checkout 就变，不是真年龄 |
| retire 理由必填（同 drop） | 技能的"死因"已由数据面承载（90d 未用是事实）；drop 的理由必填是因为线索的 why 无法从数据推出 |

## 证据

- 纯核 + 服务级：`tests/skill-retirement.spec.ts`（4 测试：scanner 跳 archive 且读 learnedAt /
  bundle 移动+盖章+出房间 / 未知名/非法名/双重退役的错误 / 平文件技能归档）；
  `tests/health.spec.ts` 扩 2 测试（双档 finding 分档与锚点诚实 / 遮蔽豁免）。
  **95/95 全绿**（`pnpm test`）。
- 机械门禁：`pnpm typecheck` && `pnpm build` && `pnpm verify` 16/16。
- **live 实证**（preset-runner one-shot，2026-09-24，会话
  `session-26b8fb9d-194e-43a0-99e9-53a0d8ceebe5`，assistant preset，retire_skill/retiredAt
  相关 19 处在日志；dev home 的 HOME.md 已按新契约重生成——旧图由 scaffold 产出无手改）：
  1. fs 写入 learnedAt=2026-06-15 的夹具技能（100 天未加载、无账本条目）；
  2. curate **逐字**报 `warn: skill "legacy-migration-notes" has been unused for 100 days, past
     the 90-day threshold (never loaded since it was learned 2026-06-15): retire it with
     assistant_reflect action=retire_skill — the bundle moves to skills/archive/ and stays
     recoverable`——锚点回退 learnedAt 的分支在真实会话里走通；
  3. `retire_skill` 返回 `Retired skill "legacy-migration-notes" to skills/archive/; it no
     longer loads and nothing was deleted — move the bundle back to restore it.`；
  4. 复跑 curate：learned skills 2→1，`Home is clean: no findings.`（红绿在案）；
  5. 归档副本带 `retiredAt: 2026-09-23T20:39:13.190Z` + `retireReason` 逐字盖章。
  live 助手在报告里自行解释了机制（learnedAt 兜底、archive 在扫描根之下一层）——
  行为与实现互相印证。
