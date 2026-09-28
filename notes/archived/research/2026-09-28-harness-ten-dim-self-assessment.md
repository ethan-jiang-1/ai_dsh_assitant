# 十维自评：借 DSH 借鉴 FAQ 的尺子量本仓 harness（第四轮语义漂移审计同轮）

日期：2026-09-28 · 状态：已收卷 · 自评底稿（结论已消化：[质量维持卡](../../implemented/2026-09-28-harness-quality-upkeep.md) 三轨全交付；台账随 2026-09-28 research 层并入迁此）

> **缘起**：用户 2026-09-28 指定语料 `_faq_on_digested/07_borrowing-dsh-harness-idea`（仓外
> digested FAQ，位于 deepseek-harness checkout；对应 DSH 基线 `46a7f68b09` / `dsh-v0.1.7-rc.1`），
> 问两件事：①本仓 harness 是否还有提升空间；②是否需要打扫卫生。本 note 内联其评估框架，
> **读本文不需要那份语料**。
> **方法**：语料 06 号「落地总纲」Phase 1 = 十维打分（道五维 + 术五维）+ 垂直切片 + 漂移审计。
> **尺度校准（用户 2026-09-28：借鉴为主、不照抄）**：本仓是**插件仓**，不是 DSH 本体——组合压力
> 由 `vendor/dsh` 承担，故执行链、披露管线、subagent 隔离等运行时维度按「继承」计，不按「自建」计；
> 语料自己的警告（10 号迁移清单）也说了：组合压力不存在的地方搬插件架构是头号浪费。
> **约束**：维护规则「冻结流程扩张」（用户 2026-09-25）——本轮不新增门禁、不重组 notes。
> **证据分级**：[observed] = 本仓 file:line / 命令输出；[documented] = 语料章节名。
> 普查底稿亲验：审计发现由本轮会话逐条复核原文后才立项（见 §四）。

## 一、十维打分（档位：没有 / 有但不成体系 / 像回事）

| 维 | 档位 | 证据 [observed 除注明外] | 最痛案例 |
|---|---|---|---|
| 变更闭环 | 像回事 | 切片走查 §二；52 篇 implemented note 与切片同 diff；commit message 带意图与验收行（0a0edea 全文） | — |
| 归属 | 像回事 | tier 分家（根/子树 AGENTS.md ×6 + `docs/AGENTS.md` owner 表）；生成 catalog 带 freshness 门禁；断链/路径门禁 3 条 | §四·发现 1/2：浏览器面行「变短」——非机械钉定的散文合同面漂了一轮，靠审计轮抓住（这正是探针存在的理由） |
| 决策记录 | 像回事 | 四态目录 + 取代纪律；「输掉的方案」有**机械门禁**（verify: implemented notes carry what they beat）——强于语料 03 号的最小 ADR 模板 [documented] | implemented 52 篇，冻结树触发线 100（ROADMAP ⏳ 在案） |
| 静与动 | 像回事（大部分继承） | 会话日志真相层 = vendor；`gen-paths`/`gen-catalog` freshness；worktree 残留有 commit-safety 门禁 | — |
| 正确路径 | 像回事 | `docs/architecture.md` L0–L3 阶梯 + 新行为四问；包 AGENTS.md 三平面纪律；client-ui-contribution 技能（三室迁移正是沿它走的） | — |
| 入口链 | 像回事 | `CLAUDE.md` symlink（语料 07 号 Phase 2 动作）；子树入口「合适个数」——6 处各有真实常设规则，其余目录只留 README（正确的少放）；根入口 7.7K 字符（对照 DSH 锚点 ≈2.9–3.9K 中文字，偏厚但服务单包仓的路由密度） | 词数预算门禁触发未到（discipline ⏸ 在案：两轮审计轻度腐化即修，未立案；语料口径「数值不迁移、门禁迁移」[documented]） |
| 执行链 | 继承（vendor 拥有） | 工具走 DSH waterfall（语料 08 号的三环节本仓等价物：presenter 单一出口 `src/tool-support/presentation.ts`；call 先落日志 = vendor `tool/call`） | — |
| 反馈 | 像回事 | verify 32 门禁 + 六层表（`docs/discipline.md`「六层反馈各自证明什么」，逐层能证明什么写明）+ eval / eval:domain / desk-loop / release-smoke；新门禁必带红绿夹具（discipline 复查环） | snapshots/ 仍 day 0（触发未到，[observed] 目录仅两文件）；hook/CI 刻意不做（用户拍板，输掉方案已登记 discipline 适配 4） |
| Skills | 像回事 | 开发技能 5（「重复即建」常设规则）+ 产品技能 9；frontmatter/语法/registry 文法各有门禁 | R12：产品面技能加载摩擦（二轮整改已交付） |
| 披露 | 像回事（继承 + 产品自建同构） | 注入/预算/去重/丢弃顺序 = vendor agent-instructions；产品侧 digest 预算 + 分级降级 + **显式省略标记**（`src/home/digest.ts:176-181`，`omissionMarkers`）——与语料 13 号「可见 budget notice」[documented] 同构，第四圈已落地 | 摘要触顶 4,011/4,096：处置在 ROADMAP ⏳ 等用户裁决，本轮不新增拍板项 |

**读法**：十维无「没有」、无「有但不成体系」；语料答案 §「立即借」清单（短根文件/symlink/now-vs-why 分家/归属表+可机械检查/三段管线）在本仓**全部已在场**（逐条映射见 §三）。结论不是「无可改进」，而是：**借贷面已饱和，剩余提升空间 = 已借机制的维持成本**（§五）。

## 二、垂直切片（0a0edea，最新真实变更：死按钮退役 + tab 图标）

| 走查问 | 结果 | 证据 |
|---|---|---|
| ① 用户可观察结果写得出吗 | ✓ 死按钮消失（besideBtn:false）、每室 tab 自带图标（hasSvg:true）——真机验证 | 迁卡证据节 [observed] |
| ② 从任务到 owner 不带路能走到吗 | ✓ 根 AGENTS.md 布局表 → 包 AGENTS.md 平面纪律 → `src/client/index.ts`；how-to 权威 client-ui-contribution 技能 | [observed] |
| ③ 持久取舍有家吗 | ✓ 迁卡同 diff（决定/证据/输掉的方案/后果 四节俱全） | notes/implemented/2026-09-28-rooms-to-right-sidebar.md |
| ④ 哪项证据在旧行为上红 | ✓ 夹具先红后绿两例（引导条文案被 client-first-mile 夹具当场抓住；滚动修复根元素样式断言先红） | 同上 |
| ⑤ 证据状态如实标注 | ✓ commit message 验收行：284/284 · build 0 · typecheck 0 · verify 32/32 | git log [observed] |

切片判定：语料 01 号定义的变更闭环（意图 → owner → 有条件的决定 → 实现+文档+证据同交付 → 聚焦检查 → 归位）在本仓走得通，且缺口如实标注的纪律（绿灯不掩盖缺口）在真实变更里有实例。

## 三、借贷映射（语料章 → 本仓落点 → 状态）

| 语料章 [documented] | 本仓落点 | 状态 |
|---|---|---|
| 01 变更闭环 | 切片 diff + note 同 diff（无 GitHub，commit 即 PR——discipline 适配 1） | ✅ 适配 |
| 02 归属 | tier 表 + owner 表 + 生成 catalog freshness | ✅ |
| 03 决策记录 | notes 四态 + 取代纪律 + 输掉的方案机械门禁 | ✅（强于最小模板） |
| 04 静与动 | vendor 日志层；本仓 freshness 门禁与「模型可见 ⟺ 落日志」表（architecture §四） | ✅ 继承为主 |
| 05 正确路径 | L0–L3 阶梯 + 四问 + 包内 owner 面 | ✅ |
| 06 落地总纲 Phase 2/3/4/8 | symlink+短根文件 / docs-vs-notes / 归属表+verify / verify.mjs+漂移探针 | ✅ 全在场 |
| 07 入口链 | symlink、合适个子树入口；预算门禁 ⏸ 触发未到 | ✅ / ⏸ |
| 08 执行链 | vendor 拥有循环；本仓 presenter 单一出口 | 继承 |
| 09 反馈 | 32 门禁 + 红绿夹具纪律 + 六层表 + 评测阶梯 | ✅；hook/CI 刻意不做（拍板登记） |
| 10 迁移清单 | 四边界（可读≠简单等）在 discipline 门禁边界表体现 | ✅ |
| 11 Skills | 两类技能分家（开发用/模型用）+「重复即建」 | ✅ |
| 12 运行时查询 | `--dump-config`（本轮实证 boot-free，exit 0 / 1343 行）+ 生成 catalog + usage/desk-loop/eval；inspect 工具刻意不挂（AGENTS.md 探索路由载明理由） | ✅ |
| 13 披露管线 | 注入/回收 = vendor；产品 digest 预算+降级+省略标记 = 自建同构 | ✅ |
| 14 七缺口 | 铁律/组成/为什么/改哪里/流程/证据/交付完整——各 owner 均在（AGENTS/architecture+catalog/notes/阶梯+四问/技能/六层/同 diff 规则） | ✅ |

**刻意不借（登记理由，非遗漏）**：插件图与 seam 全家桶（vendor 承担组合压力——语料 10 号自己排在最后 [documented]）；双语 triplet + hash 配对（非双语仓）；加权批准/Project 状态机（单人仓，discipline 适配 1）；per-file 100% coverage（无此压力）；`./invariant` companion（无未钉定的活关系——六层表已覆盖；新增即违反冻结）；hook/CI 接线（用户拍板，输掉方案在案）。

## 四、第四轮语义漂移审计（只读不知情子代理；发现经本轮逐条复核）

方法：semantic-drift-audit 技能（前三轮：零 / 六 / 七）。本轮 **6 处实锤，同 diff 修复**：

1. `docs/architecture.md:20`「不做 client」已死——client 已以通用座位交付（ad23b45 三室迁右栏；client/index.ts:1986-2008）→ §一改写为「浏览器面只消费 vendor 通用座位，不做专属 Web 卡片（触发见 §六）」。
2. `docs/architecture.md` §二/§三浏览器面行「变短」——只写品牌两 slot，漏掉三室右栏 tab（定义+guide 条目+keyed 座位 tab/tab.title）、会话面三座位（header.utilities / hero.brand.mark / input.dock）、房间命令 → 补全（与 identity.md:21 对齐；identity 当时已更新、architecture 未更——两文不同步正是此行无机械钉定的证据）。
3. `docs/identity.md:21` 仍列已退役 `sidebar.panellist` / `sidebar.main`（代码零命中；client-brand.spec 断言其不存在）→ 删。
4. 设计卡形态行入口列表含已退役按钮「在对话旁打开」（迁卡证据②退役；同日自相矛盾类）→ 删该入口。
5. `cordis.patch.yml:68` 注释里的提案指针悬空——soul-and-agents note 已毕业至 `notes/implemented/`（原指针写的是它毕业前所在 proposed/ 的旧路径；YAML 注释逃过断链门禁——新类，记入技能）→ 改指 implemented。
6. `docs/dev.md:142` 家手册版本戳「v5」死掉（现 v9）→ 去版本号改指针。

**类硬化（同轮）**：AGENTS.md 命令表去易腐计数（「2 生成物 + 3 自检 + 32 条」→ 类别 + 「条数与清单以 scripts/verify.mjs 为准」）；ROADMAP 摘要行「切线以下看不见」精确为「内容不进摘要（模型只见到省略计数）」——省略标记第四圈已落地，原文措辞会让读者以为全无可见性。**新门禁不加**（冻结流程扩张；无产品回归驱动），新类记入 semantic-drift-audit 技能（计数更新为四轮 19 处）。

**核对相符项（抽样全过，[observed]）**：verify 恰 32 条；四工具×动词与 catalog/patch/README 三方一致；产品技能 9；tsconfig paths 325；home.md 数字（metronome 5 / staleSkillDays 30 / retireSkillDays 90 / 快照留 3）；AGENTS 命令表 ↔ package.json scripts；ROADMAP 全部 notes 链接在盘；identity 行 id / wire 名与 catalog/patch 一致；questions.local.md 确在 gitignore。

## 五、结论

1. **借贷面饱和**：`docs/discipline.md` 的逐源枚举就是这个 FAQ 的本仓实现；十维无红档。用户问「还能不能往上提」——能提的**不在机制层**（再借新机制违反冻结且无压力驱动），在**维持成本层**：本轮 6 处漂移全属「行清单变短 / 退役残留 / 指针悬空 / 版本戳死」类，对策 = 审计轮常设 + freshness 门禁 + 数字指针化，均已在本轮到位。
2. **卫生判定**：需要且已打扫——机器面本就 32/32 绿，脏在散文合同面（这正是机械门禁的盲区，审计轮的价值所在）。
3. **待拍板项**：无新增。产品侧摘要触顶的裁决已在 ROADMAP ⏳（用户裁决为准）；本轮不动它。
