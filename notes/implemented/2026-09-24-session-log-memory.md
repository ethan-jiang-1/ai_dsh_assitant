# 会话日志记忆面（sessions/ 是被浪费的记忆原料吗）

日期：2026-09-24 · 状态：**implemented（D1=a+ 已落地并验证；b/c 路线转 ⏳ 触发型留 ROADMAP）**

## 问题

家的记忆是策展后的蒸馏物，原始会话日志（JSONL 纯文件）躺在 DSH_HOME 的 sessions/ 里无人
问津。三问：

1. DSH 会话日志的盘上结构与内容（rg 到底能查到什么）？
2. 生态对位 `dsh-palimpsest` 深评（怎么解析、工具面、存储形态）？
3. 我们的最小 MD-first 形态：什么也不建（agent 直接 rg）/ 薄工具动词 / 挂桥——事实对照。

## 当前状态

- 深评落稿：[r6 survey](../research/2026-09-24-r6-session-log-memory-survey.md)；承重主张
  五条已由委托方亲验（布局/zstd 魔数/沙箱只限写/literal 谓词/openAt:never——各自有盘上或
  vendor 源码指认）。
- 深评结论：**原料齐全、可达、可查，瓶颈只是知识**——会话日志在 `<DSH_HOME>/sessions/
  --<规范化cwd>--/session-<id>/session.v3.jsonl.zstd`（zstd 压缩，`rg --pre` 两段式配方
  0.72s/34 会话实测）；agent 的 fs/shell 读路径本就开放。DSH 自带 session-query 层
  （literal 过滤不依赖 FTS，sqlite 索引默认 openAt:never 关闭）；palimpsest 设计成熟但
  零社区单维护者（创建即最后 push，~4s/20 会话）。

## 决策点（待拍板）

| # | 问题 | 选项 |
|---|---|---|
| D1 | 最小形态 | a+：**只补知识**——家手册/策展技能带"在哪/是 zstd/rg 配方"三句话（零代码，MD 原生）；b1/b2 薄动词、c 挂 palimpsest 转 ⏳ 触发型（触发=真实使用中真去查历史会话且配方不够用） |
| D2 | 若将来建动词 | b1（spawn zstd\|rg，文件系统原生但依赖 zstd CLI）vs b2（ctx.sessionQuery literal filter，免外部依赖但是服务调用非 FS 原生——后端可用性待细查）；palimpsest 作设计参照（cwd 硬范围/脱敏/命中排序）不挂依赖 |
| D3 | 部署项 | compression:'none' 可让裸 rg 成立（代价盘占）——部署层决定，不属本插件 |

## 依据

- [R1 shortlist](../research/2026-09-24-r1-memory-shortlist.md)（palimpsest 行）与
  [R4 Hermes 调研 §四](../research/2026-09-24-r4-hermes-identity-survey.md)（session_search
  作为记忆第三支柱的对照表）
- 用户硬过滤（2026-09-24 拍板）：文件系统原生、rg 可查、无 SQLite/FTS；纯本地。

## 验收（毕业条件）

拍板后：D1=a+ 则落地知识与技能后毕业（改写为 implemented）；b/c 路线转实施提案。
未复核保留项：palimpsest 是否真走 ctx.sessionQuery（README 未逐字写明）。

## 落地（2026-09-24，commit 2569e46）

- 家手册 v2 新增 Past conversations 节（[r6](../research/2026-09-24-r6-session-log-memory-survey.md)
  结论"原料齐全、可达、可查，瓶颈只是知识"的落点）：在哪（`<harness-home>/sessions/
  --<规范化cwd>--/`、harness home=家的父目录）/ 是 zstd 压缩 JSONL、每行一事（消息全文、
  工具完整参数、header）/ 查法指向 session-recall 技能。
- 策展技能 `presets/assistant/skills/session-recall/SKILL.md`：rg --pre 两段式配方（wrapper
  脚本 + `./` 前缀防 `--` 旗标；实测 0.7s/34 会话）、zstd CLI 依赖声明、判断纪律（找到的
  是会话不是记忆，durable 结论走 reflect 一次）。
- `HOME_MANUAL_VERSION` 1→2：手册漂移 finding 机制首次真实运转（旧手册被 curate 报
  info，dev home 已重种 v2、curate clean）。

## 输掉的方案

- **b1 薄动词（spawn zstd|rg 包装）**：输给触发纪律——配方已让"查"可行，建动词要等真实
  使用证明配方不够用（触发条件在 ROADMAP ⏳）。文件系统原生但依赖 zstd CLI 于服务内。
- **b2 薄动词（ctx.sessionQuery literal filter）**：同上输给触发纪律；且它是服务调用非 FS
  原生、后端可用性（openAt:never 下 literal 走哪个后端）待细查——触发日再查。
- **c 挂 palimpsest**：设计成熟（cwd 硬范围/脱敏/命中排序已录 r6 作参照）但零社区单维护者
  （创建即最后 push），当依赖是险的；触发日若要建自己的动词，照抄其设计图案。
- **部署级 compression:'none'**：非本插件可独断（全局副作用），r6 §D3 已记录，不动。
