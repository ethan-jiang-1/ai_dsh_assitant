---
status: 已结
opened: 2026-10-20
---

# 收口：六维改善战役（S1–S10 切片台账）

> 立卡：2026-10-20 ｜ 状态：已结 ｜ 类型：Task ｜ 可关闭：是
> 授权：用户 2026-10-20 23:45「拟订一个 Plan, 然后 setup goal 后推动落地……最后告知我整体的改善情况(打分各个维度)」与 23:50「发现的问题通通要改掉」；2026-10-21 00:58「预算可以加倍，不惜一切代价，静默自主完成所有任务」＋「无论如何，一定要遵循我们的流程」「切记切记，你只能操纵本repo」。
> 决定 note = [six-dimension-improvement](../../../notes/implemented/2026-10-20-six-dimension-improvement.md)；深审依据 = [六维深审报告](../../research/261020-six-dimension-audits/261020-six-dimension-housekeeping-audit.md)

## 外部结果三要素

- **触发**：六维深审报告呈报（26 项分级发现：P0×1、P1×8、P2×17），用户放行"通通要改掉"。
- **用户得到**：26 项全部落地 + 实施中新发现 4 项一并修复 + 六维前后对比评分报告（单独呈报）。
- **完成条件**：切片台账全勾、地板全绿、三场景 PASS、评分呈报——**2026-10-21 全部达成**。

## 结论

十片全部交付。收尾地板：`pnpm typecheck` 0 错、`pnpm test` **106 文件 / 877 测试全绿**（深审基线 846 → 净增 31：presenter 管道 7、sweep 8、eval-sessions 7、session-logs +2 等）、`pnpm build` 绿、`pnpm verify` **43 项全绿**、`pnpm release-smoke` PASS（S8 依赖变更按命令表补跑）。三场景活体复验（各自隔离 home 全链重跑）：blank-first-open **PASS**、first-open-draft-banner **PASS**、desk-eight-matters-first-open（新录，基线+两连拍）**PASS**。全程流程红线与"只操纵本 repo"两条约束未破（隔离 home 全在仓内 .tmp/、服务四起四收端口全释放、日用 ~/.dsh 与 3080 实例未碰）。

## 切片台账

| 片 | 状态 | 证据 |
|---|---|---|
| S1 文档真相对齐 | **已提交 `ea19402`** | 15+8 处编辑：start.sh 生命周期句+交接语义、K1/K2×3、identity row2 收敛（15 行 id 保留（host/agent）注记——identity 门禁的认领标记，第一版删注记被门禁抓红后修正）、discipline 断链×2、命令表补 eval:continuity/ov-trial-rt/touch 规则/typecheck→build、dump-config 去重、README 四房间表去合同化、architecture §一指针+600 字段拆条、收口卡节名入 issues/README；standing-orders 门禁抓"已建"进度词改行为化措辞 |
| S2 契约归位 | **已提交 `57ad9f8`** | HomeHost 扩宽补 8 个路由面方法 + 两 import 改指 service.ts + 三死导出 + 包 AGENTS"目录=导出行"判据；**审计 #6"直接换"经实施校准**（窄契约缺 8 方法才是 S4b"6/8"的真实成因；审计报告已加校准注）；typecheck 绿 + 9 spec 86/86×2 + build 绿 |
| S3 proactivity 四卡随迁 | **已提交 `567d866` + `e811bb6`** | 四卡迁 _archive/research/positioning/（新位置深一级，修链 synthesis 8 处/ux 27 处/baseline 97 行；baseline 5 处少一级的潜在错链按引文证据修到仓根 README）；双索引 + 归档 README 毕业断链修复（新发现②）+ proactive-face L5 索引句改指归档；断链检查器前后全绿 |
| S4 presenter 管道 spec | **已提交 `4dd4c61`** | 新 spec 322 行 7 it：四工具接线投影→持久化→读回正向、durable triple 负例、9 种畸形载荷防静默丢失；7/7 绿 + 破坏试验 3 红复绿 + agent 层 52 全绿；presentation.ts 无 bug 未动 |
| S5 web-expected 场景必填 | **已提交 `f5e61b5` + `be6cf0b`** | 缺 `--scenario` = usage error 列出全部场景（设计裁决见 note）；core 新增 discoverScenarios/buildMissingScenarioUsage；RED-A（旧代码陷阱真机复现）→GREEN 22/22、tooling 层 241 绿；场景文档 8 处同步 |
| S6 反馈链三件 | **已提交 `a6ec465`** | 判决带 sessionId（目录快照差集取，不猜）；usage/observe 剔评测流量（判据唯一家 dev/lib/eval-sessions.mjs，剔除 101 与 desk-loop 历史对上）；pnpm sweep（四条保护 + lsof fail-closed + 活体句柄保护实证）；顺修 observe --json 管道 64KiB 截断（新发现③）；tooling 258 绿 + verify 43/43 |
| S7 client 入口归位 | **已提交 `b613d42`** | 448→317 行：capture 状态→desk/、proactive 处理器+文案→proactive/、settle 4s debounce→rooms/、roomTabs→rooms/；逐字比对 IDENTICAL + 字面量多重集零文案变化 + tests/client 零改动 251 绿；**配套发现并修复 gen-catalog 语料只读顶层（新发现①：S4 起 catalog 命令行陈旧为「（无）」）**，重生成恰一行 diff |
| S8 测试面整顿 | **已提交 `4f8f8f9` + 补笔 `5ec4b77`** | 17 spec 去前缀（文档引用 8 处同步）；三大 spec 切 describe（it 零变化）；6 处 vendor 深 import 改 alias（**含审计漏掉的第 6 处 client-harness（新发现④）**；devDep 声明→fresh clone 直接 test 可绿）；skill-usage flake quiesce（877×3 零 flake）；夹具 README×2+两家分工段；client-surface→harness；mock 白名单第四类政策行；release-smoke 过 |
| S9 代码结构归位 | **已提交 `a220f30`** | Viki 词汇下沉 domain/viki/types.ts（client→host 穿越清零）；room-data-io 拆 prompt-bridge（414→298，逐字比对唯一适配=访问器边界）；desk-process 纯状态机核入 domain/desk（cmp 逐字，R097，spec 随迁）；头注编年史清理 ~80 处（裸片号模式 src/ 清零，11 处换 notes 相对链接逐一验证）；docs/operating.md 合同路径同步；517 定向 + verify 43/43 |
| S10 第三个 web-face 场景 | **已提交 `ab4d36b`** | desk-eight-matters-first-open：确定性账 = v1 夹具无 times → humanTime 渲染器不可达（比"渲染绝对日期"更强），visibleText 机器复核零时间文本；基线录制 + 两连拍 PASS；三场景活体复验全绿；四服务四收端口全释放 |

## 26 项发现逐项对账（深审编号 → 落点）

| # | 发现 | 落点 |
|---|---|---|
| 1（P0） | dev.md:210 start.sh 生命周期句被 `0accef4` 反转 | S1 `ea19402`（含 AGENTS:77 交接语义半句） |
| 2 | discipline.md:18 断链裸路径 | S1（两处改 vendor 链接） |
| 3 | K1/K2 裸简称（AGENTS:116-117、dev.md:247-249） | S1（三处去代号） |
| 4 | identity.md row2 第三份手写清单（972 字符格） | S1（行 id+单字注记保留，语义指向 architecture/catalog） |
| 5 | client/index.ts 装配+逻辑+文案混合体（448 行） | S7 `b613d42`（→317）+ S9 拆 prompt-bridge（→298） |
| 6 | service.ts 契约只覆盖 6/8 消费者 | S2 `57ad9f8`（HomeHost 扩宽；审计判断经校准） |
| 7 | presenter 管道零断言 | S4 `4dd4c61` |
| 8 | web-expected 默认只比 blank（S4 后 banner 真实漏验） | S5 `f5e61b5`（场景必填）+ S10（三场景复验全绿） |
| 9 | proactivity 四卡滞留活跃区 | S3 `567d866`+`e811bb6` |
| 10 | AGENTS.md:193 演化叙事 | S1 |
| 11 | 命令表缺 eval:continuity/ov-trial-rt | S1（两行入表 + dev.md 收行） |
| 12 | dump-config 双写 / README 四房间表合同化 / README:99 只指 notes / architecture 四段复述 | S1（四处收敛各归 owner） |
| 13 | 排版三处（identity 972 格 / architecture:262 长段 / dev.md:206 坑格 / G2 裸称） | S1 |
| 14 | viki 词汇平面穿越 / room-data-io 九件事 / desk-process 住皮肤面 | S9 `a220f30`（词汇下沉 domain、prompt-bridge 拆出、状态机核入 domain/desk） |
| 15 | 头注契约混编年史裸片号 | S7（entry）+ S9（src/ 全树 ~80 处清零） |
| 16 | tests/client 命名两套前缀 / 三个大 spec 单 describe | S8 `4f8f8f9`（17 改名 + 29/21/17 it 分组零测试体变化） |
| 17 | 死导出 ×3 | S2 |
| 18 | vendor lib 深 import ×5 | S8（实为 6 处：含审计漏的 client-harness；alias + devDep） |
| 19 | skill-usage spec flake（1/2 全量触发） | S8（quiesce 先停再删；877×3 零 flake） |
| 20 | 探针判决缺 sessionId | S6 `a6ec465` |
| 21 | usage/observe 未剔评测流量 | S6（判据同源，101 对上） |
| 22 | 命令表第一跳缺 touch 规则与 typecheck→build 口径 | S1（build/typecheck 行补注） |
| 23 | 夹具文档不均 / 两家分工不明 / client-surface 命名 | S8（README×2 + testing.md 分工段 + harness 命名） |
| 24 | sessionQuery stub 白名单灰区 | S8（政策第四类成文） |
| 25 | .tmp 从未清扫（135 条/82M 积压） | S6（pnpm sweep；本轮已实清一次） |
| 26 | 目录=导出行未写下 / 收口卡节名无模板 | S2（包 AGENTS 判据行）+ S1（issues/README 落笔形状） |
| 新① | gen-catalog 语料只读顶层（catalog 命令行自 S4 起陈旧） | S7 |
| 新② | 归档 README 261008 行毕业断链（proposed→implemented） | S3 |
| 新③ | observe --json 管道 64KiB 截断 | S6 |
| 新④ | client-harness 第 6 处 vendor 深 import | S8 |

## 停点与授权

- 2026-10-20 23:45 / 23:50、2026-10-21 00:58：授权链见卡头（含流程红线与只操纵本 repo 两条约束）。
- 2026-10-21 04:05：十片交付、地板全绿（typecheck 0 / test 877 / verify 43 / release-smoke PASS）、三场景 PASS——按关闭条件归档；六维前后评分呈报单独交付用户。
