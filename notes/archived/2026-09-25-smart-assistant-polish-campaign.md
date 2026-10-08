# 聪明助手打磨战役（已实施）

日期：2026-09-25 · 状态：**implemented（P0–P6 全部完成、逐阶段提交：立卡 5be88c5 → P0 c5690f9 → P1 02ddebb → P2 c1465da → P3 e06dead → P4 482f96f → 毛边#3 29bd627 → 毕业本提交；用户 2026-09-25 授权全程自主执行不依赖人，六七小时后验收；方向级决策 agent 代拍见 §四，用户可整体推翻）**
已归档：2026-10-08（决定已经在合同或代码里；下次改决定不用打开本篇。冻结，不再跟踪。）

## 一、问题：机制满了，助手还空着

I1–I15 全部 implemented，但证据形态清一色是"机制在场"：真实使用零开始（用量账本空、
knowledge/ 0 页、学到技能 1 个、SOUL.md 还是内置兜底文本、persona 是三行 stub）。
总差距一句话（2026-09-24 深夜 handoff 定调，其内容已全部吸收进本卡，原件在 /tmp 不复依赖）：
**"领域专家"目前是空壳——骨骼完整、血肉为零；而信噪比的真值只有真实使用时间能给。**
本战役做的是把骨架里的助手养活：注入领域血肉、首跑学习闭环、纵向测质量、磨真实毛边。

## 二、悬问收口（用户 2026-09-25 两问，本卡一并回答）

1. **「家」术语淘汰**：全仓 notes/docs/AGENTS/README、本仓 34 个会话日志（zstd 全文搜）、
   兄弟仓 dev 会话——**均无"淘汰家"的讨论记录**；现行术语就是「家」。
   [mechanism-intents 冻结档](../archived/2026-09-23-mechanism-intents.md) 的原始表述以 **working folder 为主术语**、家是括注。
   **按用户 2026-09-25 指令执行**（原话"这个术语最好是个淘汰的术语，就别再用了"）：
   活跃面全仓去「家」——中文面改「working folder（工作目录）」，英文模型面去 home 隐喻
   （`DEFAULT_SOUL`/手册/工具描述）；历史 notes 保留原词（档案记录当时事实，先例：
   HOME.md 概念清零）。附带收益：**一词一义**——
   "home" 从此只指 DSH harness home（`DSH_HOME`），助手的目录只叫 working folder，
   消除"两个 home"歧义（[session-recall 技能](../../packages/dsh-smart-assistant/presets/assistant/skills/session-recall/SKILL.md) 里本就写着"the harness home is the parent of your home"这种拧巴句子）。
2. **「信噪比」讨论记在哪**（用户提问时口误为"性价比"，2026-09-25 亲自更正：**是信噪比**——
   "信号和噪声，对同一个概念有两个说法、或两个方向，那就是噪声"）：本仓权威记录 =
   [mechanism-intents 冻结档](../archived/2026-09-23-mechanism-intents.md)（talk `agent-101`：「主线是信噪比」）与 §六两判据
   （错了赔得起吗/错了多久能发现）+ 有界常驻（digest 4096B 预算、技能目录 500 字符 cap）
   + 桌面/抽屉分层 + 常驻字节对账（soul-and-agents note
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
| P6 收尾 ✅ | 卡毕业转 implemented（本文）；intents 补强（I7 首请求摘要保证/I15 真实生长/I8 零发现维持）；ROADMAP ⏳ 触发条件逐条对照（见 §八）；最终 verify/test/typecheck 全绿 | 全绿 + 给用户的验收汇报（含 §四代拍决策表） |

## 四、agent 代拍决策表（我拍的，可推翻）

| # | 决策 | 定值 | 理由 |
|---|---|---|---|
| D1 | 助手领域 | 本仓研发域：DSH 插件/harness 工程——assistant 作为本仓的开发伙伴 | 唯一有真实材料可注入的域（tri-line/discipline/vendor docs 全在场）；真实使用=开发会话本身，无人值守期可自动跑；换域=用户改 SOUL.md 一处，成本近零 |
| D2 | 人审门代行 | dev home 内 draft→stable 与提案 approve 由本轮 agent 以开发者身份代行（先例：dev 工作流本就以开发者手改为审）；**品味级内容一律留 draft 等真用户** | 用户明示"不要依赖人"；代行逐次记于本卡 P2/P4 节，回来可逆 |
| D3 | 「家」替换术语 | working folder（工作目录） | intents.md 主术语；纯描述零隐喻；见 §二.1 |
| D4 | 真实使用载体 | preset-runner one-shot 批量为主；dev Web UI 留给用户回来用 | 无人值守期只有 runner 可自动跑；Web UI 不跨会话存活（handoff 环境节） |

## 五、输掉的方案

- **继续加机制（更多工具/房间/门禁）**：机制已领先内容，再建只放大"骨架>血肉"的失衡；
  治理环已闭环（[tri-line](../archived/2026-09-24-tri-line-synthesis.md) 阶段 1–3 全落地）。
- **全自动蒸馏灌库（agent 直写 stable/直落技能）**：违背 propose-only 与 draft→stable 纪律；
  生态翻车案例集中区（R2 §6：fold-in 冲突/记忆变脏/投毒/绕门）。
- **把 ai_dsh_company 的 TCO 分析认作「信噪比」讨论的记录**：话题不同（公司采购成本 vs
  助手上下文信噪比），不冒领；用户已亲自更正术语为信噪比，见 §二.2。
- **重命名标识符与文件名（src/home/、docs/home.md、DSH_HOME）**：术语是词汇不是标识符；
  重命名零功能收益、高链接成本（先例：[doc-consistency](../archived/2026-09-23-doc-consistency.md):25）。
  且 DSH_HOME 语义（harness 安装目录）与 working folder（助手目录）本就该是两个词——
  去「家」之后这个区分才第一次变干净。
- **先跑 Web UI 真人会话再磨**：用户不在场，此路径六七小时内不可用；runner 探针先行，
  Web UI 会话留给用户回来后作为下一批真实使用。

## 六、依据

- 2026-09-24 深夜 handoff（/tmp 交接文档，一次性载体——用户原话、方向骨架、决策分界与
  用户偏好已全部吸收进本卡 §三/§四/§七，不再依赖原件）。
- [mechanism-intents 冻结档](../archived/2026-09-23-mechanism-intents.md)——I1–I15 与 §六判据（本战役的"对"以它为准；现行判据见 [`README.md`](../../README.md)）。
- [tri-line 合流](../archived/2026-09-24-tri-line-synthesis.md)——治理环/知识房间/触发演进已落地的边界。
- 用户 2026-09-25 指令：①全程自主不依赖人；②「家」术语淘汰；③信噪比不是性价比
  （"同一概念两个说法就是噪声"）；④每步完成即提交；⑤六七小时后验收。

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
多轮会话第二轮以后，故漏网。修复两轮收口（构造预热 → Service.init 装载等待）：
note。

**探针②（领域知识零态，`session-73b5efd6`）**：知识页为零如实声明；转而凭常驻手册+按需读
仓内源码（`page.ts`/`health.ts`）**答对全部领域问题**（四房间职责/生命周期/draft→stable=人改
文件/deprecated 就地留），区分了家房间与仓内 docs/notes，守住了双 home 纪律；**并主动提议
写第一页知识草稿**——P2 注入循环的"需求侧"已自己出现，缺的只是执行。

## 八、收官数字（P6 · 战役前后对比的"后"）

| 面 | 前（P0 基线） | 后（收官） |
|---|---|---|
| 知识页 | 0 | **10 stable**（互链成网、search 命中带理由、curate 零发现） |
| 活跃记忆 | 4（含 2 条过时） | **6**（全当前；2 条过时者 supersede 留痕于 archive 14 条版本链） |
| 学到技能 | 1（never loaded） | **2**（repo-to-knowledge 经 propose→approve→land 全环，provenance 在案） |
| 用量账本 | 无文件（零使用） | **4 技能 9 次真实加载**（knowledge-craft×3/self-reflection×4/memory-hygiene×1/repo-to-knowledge×1） |
| 首请求 digest | 271B blurb（掷硬币） | **4004/4096 全量保证**（Service.init 装载等待，live 前后对照逐字在案） |
| 领域问答 | 读仓内源码 | 调 assistant_knowledge 全答自知识房（×9），缺整表时诚实降级并说明 |
| 「家」术语 | 全仓现行 | 活跃树零命中，working folder 单名，home 只指 DSH_HOME |

**⏳ 触发条件逐条对照（全部未触发，首批数据在案）**：语义检索/embedding——无真实漏召回
（知识 search 目标查询 4 命中/宽查询 10 命中）；FTS/trigram——同左；会话薄动词 b1/b2——
session-recall 的 rg 配方在 P4 真实够用（提案会话搜到 save_page 会话）；全自动蒸馏——账本
首批计数远低于任何收益阈值且无人审成本对照；E 名字链接/dsh-obsidian 挂桥/workflow-as-MD/
跨 harness 共库/license 字段——无新触发数据。各 ⏳ 维持原判据。
（2026-09-25 补记：**E 名字链接已触发并落地**——真实使用中报"链接在 Obsidian 点不开"，
见 obsidian-interop §落地；其余维持原判据。）

**留给用户的拍板点（战役中显式登记、未擅动）**：
1. **digest 树行格式**：现 `- title — description (id)` 每行 118–159B，id 占 30–40%；
   去 id 省约 350B 但取页多一次 search 往返——桌面形状的品味级取舍。
2. **digest 余量 92B**：下一条记忆/第 11 页会再触预算门（按设计=策展信号；也可调
   digestMaxBytes 配置）。
3. **D1 领域定位复核**：本仓研发域是我拍的（§四），若你的助手另有领域，改 dev home 的
   `SOUL.md` 一处即可（D1 理由行）。
4. 已知怪癖（登记不立案）：记录 id 的 UTC 日期前缀与本机 +08 偶差一天；手册称"目录树"
   实为平铺清单（探针如实指出，措辞 nit）。
