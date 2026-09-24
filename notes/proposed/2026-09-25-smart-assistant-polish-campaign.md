# 聪明助手打磨战役（长程计划）

日期：2026-09-25 · 状态：**实施中（P0–P3 已提交并验收全绿，P4–P6 进行中；用户 2026-09-25 拍板：全程自主执行、不依赖人——"想办法自己打磨……做实验做测试都不要依赖人"，六七小时后验收；方向级决策由 agent 代拍并逐项标注「我拍的」，用户回来可整体推翻）**

## 一、问题：机制满了，助手还空着

I1–I15 全部 implemented，但证据形态清一色是"机制在场"：真实使用零开始（用量账本空、
knowledge/ 0 页、学到技能 1 个、SOUL.md 还是内置兜底文本、persona 是三行 stub）。
总差距一句话（[handoff 2026-09-24](/tmp/handoff-2026-09-24-dsh-assistant-long-range-plan.md) 定调）：
**"领域专家"目前是空壳——骨骼完整、血肉为零；而信噪比的真值只有真实使用时间能给。**
本战役做的是把骨架里的助手养活：注入领域血肉、首跑学习闭环、纵向测质量、磨真实毛边。

## 二、悬问收口（用户 2026-09-25 两问，本卡一并回答）

1. **「家」术语淘汰**：全仓 notes/docs/AGENTS/README、本仓 34 个会话日志（zstd 全文搜）、
   兄弟仓 dev 会话——**均无"淘汰家"的讨论记录**；现行术语就是「家」。
   [intents.md](../intents.md) §二 原始表述以 **working folder 为主术语**、家是括注。
   **按用户 2026-09-25 指令执行**（原话"这个术语最好是个淘汰的术语，就别再用了"）：
   活跃面全仓去「家」——中文面改「working folder（工作目录）」，英文模型面去 home 隐喻
   （`DEFAULT_SOUL`/手册/工具描述）；历史 notes 保留原词（档案记录当时事实，先例：
   [HOME.md 概念清零](../implemented/2026-09-24-soul-and-agents.md)）。附带收益：**一词一义**——
   "home" 从此只指 DSH harness home（`DSH_HOME`），助手的目录只叫 working folder，
   消除"两个 home"歧义（[session-recall 技能](../../packages/dsh-smart-assistant/presets/assistant/skills/session-recall/SKILL.md) 里本就写着"the harness home is the parent of your home"这种拧巴句子）。
2. **「信噪比」讨论记在哪**（用户提问时口误为"性价比"，2026-09-25 亲自更正：**是信噪比**——
   "信号和噪声，对同一个概念有两个说法、或两个方向，那就是噪声"）：本仓权威记录 =
   [intents.md](../intents.md) §二（talk `agent-101`：「主线是信噪比」）与 §六两判据
   （错了赔得起吗/错了多久能发现）+ 有界常驻（digest 4096B 预算、技能目录 500 字符 cap）
   + 桌面/抽屉分层 + 常驻字节对账（[soul-and-agents note](../implemented/2026-09-24-soul-and-agents.md)
   的 +2.9KB 记账）。**这句更正同时立为本战役第一条设计纪律：一词一义，同义词=噪声**——
   §二.1 的家/working folder 双名并存正是活例，P1 术语切片是它的直接应用。

## 三、阶段计划（~7h 自主执行；每片垂直切片，verify/test 全绿，可停可续；**每阶段完成即 git 提交**——用户 2026-09-25 指令，不攒尾款）

| 阶段 | 内容 | 验收 |
|---|---|---|
| P0 基线快照 ✅ | preset-runner 探针会话（身份/家况问答）+ system prompt 分段字节盘点 + 家现状 counts，全部落档 | §七：盘点+双探针+分段字节+毛边#1（digest 冷启动）即修即测 |
| P1 术语切片 ✅ | 全仓去「家」：docs/AGENTS/README×2/preset.yml/模型面（soul.ts、home-map.ts 手册 v3→v4、工具文案、SKILL.md×4、persona prefix）/tests 断言；dev home 重种（v4+working folder SOUL，digest 1550B 热）；包 README 顺带修「三房间/三工具/5 入口」过时腐化 | 活跃树 rg「家」清零（排除 专家/赢家 同字异义词与 notes 档案）；剩余 home 全为代码注释/标识符（边界见 §五）；test 164/164、verify 22/22 |
| P2 知识注入 ✅ | 领域=本仓研发域（D1）。经**真实写路径**长出首批 knowledge 页（目标 8–12 页 → **10 页 stable**）：DSH 平台三页（composition layers / preset semantics / skills provider contract，sources=vendor docs）+ 标准三页（OKF subset / Agent Skills / One term one meaning）+ 哲学四页（signal-to-noise / why research separate / harness home vs working folder / governance loop）；三个 preset-runner 会话 save_page→draft→代行评审（D2，逐页读+会话自查互链）→stable | digest 树 10 页全上桌 3110/4096 不截断；search 命中带理由（text 查询四命中）；curate **零发现**；[[互链]]成网无断链 |
| P3 记忆策展 ✅ | 助手自策展（preset-runner 会话，先 load memory-hygiene）：kfcf（09-23 战役语境）与 zrxy（提案已批准）各 supersede 为当前事实；新增术语决定与用户工作偏好两条（偏好来自 /tmp handoff——不捕就蒸发）；预算门真实咬合两次（纯新增被拒→按 home-curation 设计内动作收紧：合并偏好为一条、消两段机制长段落细节留在 note/test）| 6 active / 2 open / 1 skill / 10 pages；digest 4004/4096 不截断全上桌；curate 零发现；archive 14 条留痕（supersede 版本链，含预算抗争的重试历史） |
| P4 学习闭环首跑 ✅ | 真实全环：新会话（无战役上下文，凭 brief+战役卡+session-recall 挖当日学费）提炼 `repo-to-knowledge` 提案（批量蒸馏工作流，与 knowledge-craft 互补——单页手艺 vs 批次流程；实测数字 118–159B/行、3880/4096 事故、六条失败模式表）→ propose（proposed r1，不直写技能房）→ 代行 approve（D2，逐句评审）→ land（provenance `proposal:repo-to-knowledge#r1`，提案文件记 landed 留尸体）→ 落地会话真加载一次做 QA | 账本首批真实计数：knowledge-craft×3 / self-reflection×4 / memory-hygiene×1 / repo-to-knowledge×1（P2/P3 会话真实加载的副产物）；curate 零发现；落地会话现场应用新技能预算教训（拒绝在 92B 余量写记忆——技能落地即生效的自证） |
| P5 纵向质量+毛边 ✅ | ①预算压力真实触发并按设计治理（P2 节）；②**毛边 #2** parseWikiLinks 不跳 code span（修复+测试）；③**毛边 #3（探针复跑逼出二轮真相）**：P0 的 digest 冷启动修复（构造预热）实测是**毫秒掷硬币**——时间戳探针：section 求值 T+113ms(冷) vs digest 完成 T+115ms，P3/P4 会话没发现皆因显式调工具不读 prompt；最终修复=cordis `Service.init` 钩子（loader await 实例 init promise 才算装载完成，fiber.ts:257）+ memoized prewarm，构造 fire-and-forget 保留（直接构造/测试路径）；④探针前后对照：**前**=自报"摘要位是空的模板文字"（271B），**后**=首请求逐字报出 6 记忆+2 线索+10 页树（4004B，不调工具）；知识房间使用前后对照：**前**（P0 探针②）读仓内源码答，**后**调 assistant_knowledge×9 全答自知识房、缺整表时诚实降级只读 docs/home.md 该节并说明理由 | 毛边 #3 有 fix 有测试（init 钩子确定性用例，无 waitFor）；note 二轮改写带完整时序证据；前后对照双探针逐字在案 |
| P6 收尾 | 卡毕业转 implemented（带输掉的方案+证据指针）；intents 补强（I14 新数据点）；ROADMAP ⏳ 触发条件对照真实数据逐条核（漏召回是否真出现）；最终 verify/test/typecheck | 全绿 + 给用户的验收汇报（含 §二代拍决策表） |

## 四、agent 代拍决策表（我拍的，可推翻）

| # | 决策 | 定值 | 理由 |
|---|---|---|---|
| D1 | 助手领域 | 本仓研发域：DSH 插件/harness 工程——assistant 作为本仓的开发伙伴 | 唯一有真实材料可注入的域（tri-line/discipline/vendor docs 全在场）；真实使用=开发会话本身，无人值守期可自动跑；换域=用户改 SOUL.md 一处，成本近零 |
| D2 | 人审门代行 | dev home 内 draft→stable 与提案 approve 由本轮 agent 以开发者身份代行（先例：dev 工作流本就以开发者手改为审）；**品味级内容一律留 draft 等真用户** | 用户明示"不要依赖人"；代行逐次记于本卡 P2/P4 节，回来可逆 |
| D3 | 「家」替换术语 | working folder（工作目录） | intents.md 主术语；纯描述零隐喻；见 §二.1 |
| D4 | 真实使用载体 | preset-runner one-shot 批量为主；dev Web UI 留给用户回来用 | 无人值守期只有 runner 可自动跑；Web UI 不跨会话存活（handoff 环境节） |

## 五、输掉的方案

- **继续加机制（更多工具/房间/门禁）**：机制已领先内容，再建只放大"骨架>血肉"的失衡；
  治理环已闭环（[tri-line](../implemented/2026-09-24-tri-line-synthesis.md) 阶段 1–3 全落地）。
- **全自动蒸馏灌库（agent 直写 stable/直落技能）**：违背 propose-only 与 draft→stable 纪律；
  生态翻车案例集中区（R2 §6：fold-in 冲突/记忆变脏/投毒/绕门）。
- **把 ai_dsh_company 的 TCO 分析认作「信噪比」讨论的记录**：话题不同（公司采购成本 vs
  助手上下文信噪比），不冒领；用户已亲自更正术语为信噪比，见 §二.2。
- **重命名标识符与文件名（src/home/、docs/home.md、DSH_HOME）**：术语是词汇不是标识符；
  重命名零功能收益、高链接成本（先例：[doc-consistency](../implemented/2026-09-23-doc-consistency.md):25）。
  且 DSH_HOME 语义（harness 安装目录）与 working folder（助手目录）本就该是两个词——
  去「家」之后这个区分才第一次变干净。
- **先跑 Web UI 真人会话再磨**：用户不在场，此路径六七小时内不可用；runner 探针先行，
  Web UI 会话留给用户回来后作为下一批真实使用。

## 六、依据

- [handoff 长程打磨计划（2026-09-24 深夜）](/tmp/handoff-2026-09-24-dsh-assistant-long-range-plan.md)
  ——用户原话、方向骨架、决策分界与用户偏好全部继承。
- [intents.md](../intents.md)——I1–I15 与 §六判据（本战役的"对"以它为准）。
- [tri-line 合流](../implemented/2026-09-24-tri-line-synthesis.md)——治理环/知识房间/触发演进已落地的边界。
- 用户 2026-09-25 三条指令：①全程自主不依赖人；②「家」术语淘汰；③六七小时后验收。

## 七、基线快照（P0 · 2026-09-25，战役前后对比的"前"）

**机械盘点**（dev home）：4 条活跃记忆（2 归档）/ 2 条开放线索 / 1 个学到技能
（campaign-evidence-recording）/ 0 知识页 / 0 提案 / 无用量账本（=零使用）；常驻 SOUL 830B +
手册 v3 4341B。

**system prompt 分段实测**（preset-runner 会话 `session-ff3377c2`，真实 LLM turn）：
总 10040B = SOUL 1007B + 手册 4342B + digest **271B**（只剩状态 blurb，应为 ~1530B——见下）+ 基础
bundle 其余。

**探针①（身份/家况，`session-ff3377c2`）**：身份与手册推演全对；**诚实报"摘要本轮没携带任何
内容"、拒绝编造计数**（诚实本身是好信号）；规则知识（三档出口/技能退休）从手册正确复述。
**毛边 #1 就此抓到**：digest 冷启动竞态——`digestSnapshot()` 同步返回缓存，冷缓存只给 blurb、
后台刷新赶不上 one-shot 会话的唯一一次请求；Web 长会话第一轮同样中招。I7/I12 历史证据全来自
多轮会话第二轮以后，故漏网。修复=构造时链式预热（[note](../implemented/2026-09-25-digest-cold-start-prewarm.md)）。

**探针②（领域知识零态，`session-73b5efd6`）**：知识页为零如实声明；转而凭常驻手册+按需读
仓内源码（`page.ts`/`health.ts`）**答对全部领域问题**（四房间职责/生命周期/draft→stable=人改
文件/deprecated 就地留），区分了家房间与仓内 docs/notes，守住了双 home 纪律；**并主动提议
写第一页知识草稿**——P2 注入循环的"需求侧"已自己出现，缺的只是执行。
