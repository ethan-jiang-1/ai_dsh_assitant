# 六维改善战役：深审 26 项发现的通改（S1–S10）

日期：2026-10-20 · 状态：**proposed**（已授权实施——用户 2026-10-20 23:45「拟订一个 Plan, 然后 setup goal 后推动落地…最后告知我整体的改善情况(打分各个维度)」+ 23:50「发现的问题通通要改掉」）

## 问题（可观察行为）

2026-10-20 六维深审（[报告](../../_backlog/research/tech-exploration/261020-six-dimension-housekeeping-audit.md)）产出 26 项分级发现（P0×1、P1×8、P2×17）：一条被反转的 start.sh 生命周期句子（`0accef4` 反转行为、文档没跟）、三个战役灯下黑（K1/K2 裸简称、identity 第三份手写清单、discipline 断链裸路径）、两处纪律未贯穿（service.ts 契约 6/8、client 入口混合体）、presenter 管道零断言、web-expected 默认只比一个场景（S4 重构后 banner 真实漏验）、四张已收割调研卡滞留活跃区、以及排版噪声/死导出/测试命名两套/flake/vendor 深 import/头注片号等边角。骨架与门禁体系经五路对抗复核**立住**——本战役只修发现，不动骨架。

## 提案

**范围 = 全部 26 项**（原报告"丙批触发条件制"被用户拍板覆盖：已发现项一次清完；"不预建"的机制本身不变，未来新发现仍走触发）。十个切片，每片独立提交、带红绿/地板证据：

| 片 | 内容（发现编号） | 主证据 |
|---|---|---|
| S1 文档真相对齐 | dev.md:210 生命周期句+AGENTS:77 交接语义（#1）、discipline:18 断链（#2）、K1/K2（#3）、identity row2 收敛（#4）、AGENTS:193 叙事（#10）、命令表补全 eval:continuity/ov-trial-rt/touch 规则/typecheck→build（#11 #22）、dump-config 与四房间表与 README:99 与四段复述收敛（#12）、排版三处（#13）、收口卡节名（#26b） | verify（links/notes/命令互证） |
| S2 代码机械修 | rooms-route/viki 两 import 改 service.ts（#6）、三死导出（#17）、包 AGENTS 写下"目录=导出行"判据（#26a） | typecheck + 受影响 spec |
| S3 proactivity 四卡随迁 | research→_archive/research + 索引与入链修复（#9） | verify 卡簿记 |
| S4 presenter 管道 spec | project→persist→narrow 读回正负例（#7） | 新 spec 绿 + 破坏试验 |
| S5 web-expected 默认全部场景 | 无 `--scenario` 循环全部已建场景（#8） | prove-it-red + core spec |
| S6 反馈链三件 | 判决带 sessionId（#20）、usage/observe 剔探针流量（#21）、pnpm sweep 清扫机制（#25） | 各自 spec + 命令表 |
| S7 client 入口归位 | proactive 处理器+文案入 proactive/、settle 刷新入 lifecycle、入口只留座位注册与依赖表（#5，含该文件头注片号 #15） | client spec 全绿 + 头注 module map 更新 |
| S8 测试面整顿 | tests/client 命名统一（#16a）、三个大 spec 切 describe（#16b）、五处 vendor 深 import 改 alias（#18）、skill-usage flake（#19）、夹具 README×2 + support 分工说明（#23）、mock 白名单政策行（#24） | test 全量 + tooling spec |
| S9 代码结构归位 | viki 词汇下沉（#14a）、room-data-io 拆提示词构造（#14b）、desk-process 核入 domain（#14c）、头注片号改链接（#15 余下四处） | typecheck + test |
| S10 第三个 web-face 场景 | eight-matters 夹具交互态基线，补 client 交互态自动车道 | 场景三件套 + 真机录制 PASS |

## 输掉的方案

- **分批放行（甲先乙后丙触发）**：报告原建议；用户拍板全量通改——触发条件制的机制保留给未来新发现，已发现项不再等触发。
- **一次性大提交**：违背"一次一个可回退锚点"（硬规则 6）；十片各自提交。
- **顺手重构骨架**：审计已证骨架立住；只修发现，不趁机重造结构、不改门禁体系。
- **只修文档不修测试**：S5/S6/S8 的行为变化必须带红绿资产，否则同类漂移按本仓自己的记录会再长回来。

## 验收

1. 每片独立提交，提交说明带该片真跑过的命令与结果（地板 = `pnpm typecheck && pnpm test && pnpm verify`）。
2. 26 项发现逐项对账：收口卡台账记每项落点（提交或"按 X 改道"的理由）。
3. 收尾：隔离 home 上两既有场景 + 新第三场景 `pnpm web-expected` 全 PASS。
4. 最终呈报：六维前后对比评分（基线 = 深审报告 8/8/7/8/8/8），逐切片证据清单。
