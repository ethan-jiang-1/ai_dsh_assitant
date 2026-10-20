---
topic: 技术
intent: "六维打扫卫生深审的发现报告：五路 fresh 审计员并行深挖 + 主线对抗复核的汇总，供本轮 REVIEW 与改善立项取用。"
---

# 261020 · 六维打扫卫生深审报告（供 REVIEW）

> 立档：2026-10-20 ｜ 触发：用户点名六维深审（文档渐进披露 / 代码与测试结构层次 / 整体结构清晰度 /
> 上下文腐化 / 测试资产 / 反馈通路），"先充分把问题挖掘透，REVIEW 后看持续改善"。
> 方法：五路 fresh 审计员（各自独立上下文、只读、带证据回报）+ 主线抽查复核 P0/P1 + 活体验证。
> 背景：同日 20:33–22:07 刚收口 S1–S5 打扫战役（`notes/implemented/2026-10-20-housekeeping-campaign.md`），
> 故本次定位 = **对抗性复核该战役 + 挖其未覆盖面**。

## 一、总评

| 维度 | 评分 | 一句话判决 |
|---|---|---|
| 1+3 文档清晰度/渐进披露/整体结构 | 8/10 | 四层漏斗真实可走（入口层 367 行 ≈ 全链 16%），S1–S5 修复经独立复核立住；灯下黑：裸简称 K1/K2、identity.md 第三份手写清单、一处断链裸路径 |
| 2 代码结构层次 | 8/10 | domain 纯核零例外、目录=导出行 O(1) 定位、catalog→头注→模块三级渐进成立；client/index.ts 仍是装配+逻辑+文案混合体（S4 只抽走两段状态），service.ts 契约归位漏 2/8 |
| 4 上下文腐化/语义漂移 | 7/10 | 数字口径/指针/卡簿记几乎全绿（零漂移面很广）；一条 P0：start.sh 生命周期反转（`0accef4`）文档没跟，dev.md:210 留下反着说的实测句 |
| 5 测试资产 | 8/10 | 组织面近乎样板（证据地图逐行核验零漂移、收口数字精确吻合、S3 声称全部属实）；洞在断言面：presenter 管道零断言、client 交互态无自动车道 |
| 6 反馈通路 | 8/10 | 七条通路全部实存且实测能走、机械地板 ~20s 三层反馈；缺口是"覆盖靠自觉"（web-expected 默认只比 blank，S4 后 banner 真实漏验——本轮活体已补验 PASS） |

**S1–S5 战役对抗复核结论：立住了。** 五路独立证据：verify 43/43 复跑全绿（两路分别跑）、
846 测试全绿（1 例清理竞态 flake 复跑即绿）、26 个入口文件链接锚点全过、四室/Viki GET·POST/四段
order 抽查与代码一致、S2 四项证据主轴（capturedAt/visibleText 20000/--eval 硬失败/loop-probe 终态截图）
全部经真机产物核实、S4 client 五组与 type-only SCC 归零属实。**未发现 P0 级结构问题、无假绿残留。**

## 二、发现清单（按严重度，证据均为 file:line）

### P0（会把 agent 引向错误事实）

1. **dev.md:210 start.sh 生命周期句已反** —「实测退出后端口释放、无残留进程」↔ `0accef4`（今日 19:45）
   已反转为「preflight 绿 = 交接：脚本退出、服务独立存活（kill -TERM -- -<pid> 收）」，该提交零文档跟进。
   按旧句预期行事的探针作者会留下占端口、持 `writer.lock` 的孤儿服务——恰是该行自己警告的形态。
   （主线复核属实：start.sh:13/109/114-117 的交接语义与 diff 一致。）

### P1（明显噪声/半盲面/纪律未贯穿）

2. **discipline.md:18 裸路径断链** —「见 `.agents/notes/README.md`」：本仓 `.agents/` 下只有 `skills/`，
   意图是 vendor/dsh 的路径；反引号文本不进链接门禁，机械检查抓不住。
3. **K1/K2 裸简称无入口链内定义** — AGENTS.md:116-117、dev.md:247-249；定义只在
   notes/implemented/2026-10-06-desk-operating-entry.md:7,23。违反 docs/AGENTS.md:30 与「合同自足」。
4. **identity.md:15 组合行语义第三份手写清单** — 单格 972 字符枚举全部 15 行 id，与 architecture.md §二
   大面积同文、与生成物 package-catalog.md 并存；改一行语义要同 diff 动两处手写文件。
5. **client/index.ts 仍是装配+逻辑+文案混合体（448 行）** — toCaptureStatus 收窄（:120-133）、proactive
   处理器内嵌进会话的中文指令文案（:160-190）、session settle 4s debounce（:330-370）、roomTabs（:380+）；
   S4 只抽走两段持久化。任何 client 特性追溯都要穿无关逻辑——四条读取路径模拟中唯一的高噪声必经文件。
6. **S4b「契约抽 service.ts」只完成 6/8** — rooms-route/index.ts:6、viki/index.ts:15 仍从组装文件
   `../index.ts` 取 `AssistantMemory`，而 service.ts:60 有同名别名；rooms-route 正是 S4 当轮归位的文件——
   纪律在建立它的同一提交里没贯穿。
7. **presenter 管道零断言** — presentation.ts:33-40 的 presentationMeta/summaryFrom 是「model-visible
   means logged」的重建接缝，四个工具接线（tool-memory:349、tool-knowledge:162、tool-research:208、
   learn:488）之后，全部 spec grep 相关符号 = 0 命中；窄化写错只会静默丢摘要。
8. **web-expected 覆盖靠自觉 + 默认场景陷阱** — 无 `--scenario` 默认只比 blank；S4（21:18 client 全量
   重构）后 banner 场景无任何运行证据（四次 web-expected 全 blank）。→ **本轮活体验证已补：banner
   PASS（2026-10-20 23:35，隔离 home 全链）**，但"默认只比一个场景"的结构性陷阱仍在。
9. **research 活跃区 4 张已收割材料该迁未迁** — positioning/261018-proactivity-* 四张的引用卡均已
   结档/毕业（synthesis→261018-proactive-direction 已结；另三张→2026-10-18-proactive-face 已
   implemented），triggers.md 与 README 方向判据均无 proactivity 取用——按 research/README:49 自己的
   随迁规则应整目录迁 _archive/research/；11 张活跃清单中 4 张虚增"未决推敲"表面积。

### P2（可改进，择机）

10. AGENTS.md:193「0.2.1 起由单页拆成目录」演化叙事，与同文件 L51「无状态、无日期、无进度」字面冲突。
11. README:85-86「唯一清单+唯一例外」声明过强：`eval:continuity`（verify 链组成部分）与 `ov-trial-rt`
    不在根命令表，家散在 testing.md:28 与 dev.md:106/234。
12. AGENTS.md 内 dump-config 判据双写（L118/L197）；architecture.md 四段构成两处复述（:14/:240-244）；
    README:46-52 四房间表带合同级内容（verify 只校验 home↔代码，概览表是漂移窗口）；README:99 决策路由
    只指 notes/（"不做 IM"推理主体实际在 _backlog）。
13. 排版噪声：identity.md:15 单格 972 字符、architecture.md:262 单段 ~600 字符、dev.md:206 踩坑行单格
    ~300 字符；表格单元格承载多事实段落，对 agent 是噪声。
14. client→host 平面穿越 ×2（viki-data-io.ts:8、viki-panel.ts:13 type-only import host/viki/client.ts 的
    共享词汇——词汇无家）；room-data-io.ts 一个文件九件事（414 行：env 绑定+四路 fetch+POST+提示词
    构造+导航）；desk-process.ts 570 行纯状态机住在皮肤面。
15. 头注契约混战役编年史：route.ts:10 "A1a, 2026-10-19"、client/index.ts:7 "S2 (261007)"、theme.ts
    "R8"、viki/client.ts "B1"、ledger.ts "K3"——裸片号对无 transcript 的新 agent 不可解析。
16. tests/client 命名两套前缀并存（17 个 client-* vs 9 个裸名）；三个大 spec 单 describe 平铺
    （proactive-face 1/29、operating-ledger 1/21、health 1/17）——失败无法按子行为归因。
17. 死导出三处：dom-utils.ts:39 inlineMarkdown、metronome.ts:15 DEFAULT_MAINTENANCE_EVERY_ROUNDS
    全仓零引用；projection-view.ts:81 export 冗余。
18. 5 个 client spec 深引 vendor 构建产物（projection-panel:9、projection-lifecycle:3、projection-view:2、
    projection-reader:4、client-desk-arms:26 → vendor lib/types/index.js，submodule 内未追踪产物）——
    fresh clone 不跑 prepare.sh 直接 `pnpm test` 会红；换 pin 拿旧行为。vitest.config 自己声明 alias
    机制正是为避开它。
19. 门禁地板 flake：skill-usage spec afterEach ENOTEMPTY（1/2 全量运行触发；dirPool 不 dispose 真服务，
    异步账本写与 rmSync 赛跑）——agent 追一次鬼影红。
20. 探针判决缺 sessionId（loop-probe/desk-walk verdict JSON 无会话指针）——capturedAt 解决了时钟没
    解决 join key，日志↔截图对时靠"最新会话目录"推断。
21. usage/observe 未剔除探针/评测流量（observe A 清单混入注入前言与 loop-probe 问句；desk-loop 剔了
    101 评测会话而另两个没剔）。
22. 命令表第一跳缺两个口径：策展技能改动需 touch cordis.patch.yml（无门禁兜）、"typecheck 后必须重
    build"（有门禁兜但判据在第二跳）。
23. 夹具文档不均：desk-projection README 是样板，desk-process/eval-continuity 无本地 README；
    tests/support/ 与 dev/fixtures/ 的分工无一处明说。
24. rooms-row-wiring.spec.ts:42 sessionQuery 手搭 stub 处于 mock 白名单字面灰区（头注已诚实标注）。
25. .tmp 从未清扫过（135 条/82M 积压，硬规则 8 说"清扫即回收"但无清扫机制与触发）——本轮已人工清
    （82M→16M，保留活物）；机制化候选见改善路线。
26. 「目录=独立 plugin 导出行」这条本包最重要的导航规则未写下（host 平铺 vs 子目录的分界要读
    package.json 反推）；收口卡落笔形状（三要素落"首节"）在骨架模板无对应节名，需看先例对齐。

## 三、主线补充动作（本轮已做的处bulb置，均有验证）

- **.tmp 清扫（用户授权）**：82M→16M、135 条→8 条；保留 = openviking 活服务（lsof 在握）+
  ⑤号审计员活跃工作区（vitest/eval/domain-eval/audit-feedback）+ 防撞位（verify-bundle/build-check/host）。
  过程中实测验证了 E 的发现 21 变体：**并行会话下 .tmp 在途证据会被清扫抹掉**（⑤号审计证据被清，
  幸其读数已先行记录）——已列入踩坑清单候选。
- **notes/implemented 逐篇归档判断（29/29 KEEP）**：按 note-archive-judgment 判据（未来决策价值轴）
  逐篇过，无一满足归档条件——每篇都持有仍约束未来的取舍、被门禁/章程/活跃卡引用、或持有 why-not-X
  负知识（viki 三篇正被活跃卡 261020-openviking-retrieval-viki 消费；S5 今日刚归档两篇纯历史）。
  结论：notes 堆不腐，密度是真的。
- **pin-catch-up 事实补记**：2026-10-19-openviking-pin-catch-up.md 正文停在"提案待拍板"语气，拍板结果
  （用户选 A、vendor 0.5.8→0.5.26）只在 vendor README——决定已做出却记成 pending，正是语义漂移的
  典型形态。已补记一行（去掉提交哈希后过 note 证据门禁，verify 43/43）。
- **banner 场景活体复验（E 点名的 S4 后缺口）**：隔离 home 全链（prepare→setup→seed patch→起服务→
  shots 首连→seed rooms→web-expected --scenario banner）**PASS**；DOM 证据亲读核实横幅全文与
  「点这里去审批」控件在场；服务 TERM 干净收场（端口释放）。

## 四、改善路线建议（供 REVIEW 拍板，分三批）

**甲批·即刻机械修（一次切片，全部有门禁可验）**：#1 dev.md:210 生命周期句重写 + AGENTS.md:77 补交接
语义半句；#2 discipline.md:18 裸路径改 vendor 链接；#3 K1/K2 展开成人话或链接定义卡；#4 identity.md
row 2 收敛为指针；#6 rooms-route/viki 两处 import 改指 './service.ts'（typecheck 即证）；#10 AGENTS.md:193
去掉演化叙事框架保留导航信息；#11 命令表补 eval:continuity/ov-trial-rt 或声明其家；#17 删三处死导出；
#9 proactivity 四卡随迁 _archive/research/（含 research/README 索引行与入链修复）。

**乙批·小切片（各带一个红绿）**：#7 presenter 管道 spec（project→persist→narrow 读回正负例）；#8
web-expected 默认循环全部已建场景（或 verify 场景清单登记两场景必跑）；#5 client/index.ts 按 S4 分组
继续拆（proactive 处理器+文案入 proactive/、settle 刷新入 lifecycle、入口只剩座位注册）；#19
skill-usage spec 先 stop 再删；#18 五处 vendor lib 深 import 改 alias；#20 判决 JSON 带 sessionId；
#21 三报告共用 desk-loop 剔除判据；#25 .tmp 清扫机制（pnpm sweep 或 triggers.md 加"阶段收口扫 .tmp"行）。

**丙批·立卡候选（触发条件制，不预建）**：#16.5 第三个 web-face 场景（带 eight-matters 夹具的交互态，
收口卡已登记）；#14 room-data-io 拆分 / viki 词汇下沉 / desk-process 核入 domain（下次触碰顺势做）；
#15 头注片号改链接或删；#16 tests/client 命名统一；#26 "目录=导出行"判据写进包 AGENTS + 收口卡模板
节名；#23 夹具 README 补齐（以 desk-projection 为模板）。

## 五、活体验证记录（2026-10-20 23:30–23:36）

- 隔离 home：`.tmp/dsh-expected-banner-home`（场景 README 契约路径）；prepare/setup/seed-patch 三步 rc=0。
- 服务：`pnpm dsh --profile dev --port 0 --no-open`（后台作业，127.0.0.1:52234）。
- shots 首连：PNG 93KB + DOM 证据落 `.tmp/shots/audit-live-banner-1600x1000.*`。
- web-expected（--scenario first-open-draft-banner + 契约 eval + --wait-text '在等你审批'）：
  **PASS——matches**；DOM 证据亲读：横幅全文 + 按钮控件在场（capture `.tmp/web-expected/webui-expected-Msb0CX/`）。
- 收场：lsof 找监听 pid → TERM → 端口释放、后台作业 exit 0。
- 判据：S4 client 重构后审批横幅回归面**未破**；E 发现的结构性陷阱（默认只比 blank）由本轮人工显式
  指定场景补上——陷阱本身待乙批修。

## 六、证据与审计作业账

- 五路审计员原始报告：主会话留存（agent 3f50e3/803882/6847ebf/224d9d/cea066）；⑤号门禁实跑日志
  15 份在 `.tmp/audit-feedback/`（transient，结论已收进本档）。
- 门禁复核：pnpm verify 43/43（两轮）；pnpm typecheck PASS；pnpm test 846/846（首跑 1 flake 复跑全绿）。
- 本档是 REVIEW 输入，不是授权：改善项按批次落卡或走修复通道后再动手。
