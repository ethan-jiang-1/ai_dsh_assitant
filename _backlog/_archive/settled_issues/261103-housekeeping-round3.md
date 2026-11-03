---
status: 已结
opened: 2026-11-03
---

# 推敲：第三轮七维打扫卫生——先修会说谎的句子，再补取证与结构

> 立卡：2026-11-03 ｜ 状态：已结 ｜ 毕业：做现在 ｜ 去向：implemented ｜ 可关闭：是 ｜ 审查：agent — `pnpm check`、定向 spec、真机 `web-face-check --all`、`--dump-config` 定案
> 授权：用户 2026-11-03「先评估这 7 个维度…确认 GAP…拟订计划…持续改善」；答复批范围 A–E 全做、两个结构都拆、BUG-028 补红夹具。
> 来源：本会话四路只读子审计（代码/测试层次、文档腐化、DSH 约定、反馈通路）+ 主线真机取证。**不另立 research 报告**（理由见 [决定 note](../../../notes/implemented/2026-11-03-seven-dimension-round3.md)）。

## 外部结果三要素

- **触发**：用户要求在新一轮打扫卫生里重评七维；上一轮收口卡自评"全维 9.0"，与 fresh-eyes 读到的剩余债不符。
- **用户看到/得到**：一份按"剩余状态"打分的评分卡与 GAP 表；四条会说谎的句子被改真（web-only 自禁用、卸载回退、tarball 引擎门、升级通道）；"工具是否进请求 / 该看哪个会话"一条命令可答；两个多族模块按族拆开；`.tmp` 从 916MB 回收到 273MB。
- **完成条件**：评分卡与 GAP 表交用户；每条 GAP 要么修掉并有证据，要么写进「仍未取」；`pnpm check` 与真机车道的读数只列真跑过的。

## 评分卡（只看剩余状态，A/B 制）

| 维 | 本轮 | 上一轮自评 | 剩余缺口 |
|---|---:|---:|---|
| 1 文档/渐进披露 | **A- 8.6** | 9.0 | 根门牌同表两种寻址；入口散文 14.1KB/16KB |
| 2 代码/测试层次 | **A- 8.6** | 9.0 | `host/index.ts` 入口+实现混合；`host/viki/client.ts` 仍未拆；55 个源文件只有传递覆盖 |
| 3 整体结构 | **A- 8.5** | 9.0 | 探测器的战役一次性探针仍无 retirement 判据 |
| 4 上下文腐化 | **A- 8.5** | 9.0 | 不自授权例外清单三份（`_backlog/AGENTS.md` 少一项）；归档卡 5 张评分表冻结未压 |
| 5 测试资产 | **A- 8.6** | 9.0 | 24 个 spec 绕过 `dirPool`；`client-surface` 测试面未收窄 |
| 6 反馈通路 | **A- 8.6** | 9.0 | `pnpm usage` 无 `--since`/`--self-check` |
| 7 DSH 约定 | **A- 8.4** | 9.0 | 主题 CSS 未按 vendor `data-plugin` + `ctx.effect` 归属；卸载 residue 只文档化未自动清 |
| **整体** | **≈8.5（A-）** | ≈9.0 | 与二轮批前 8.2 几乎一致：债被挪位，结构债与最后里程未动 |

## 验收标准

| # | 行为 | 通过信号 | 证据 owner |
|---|---|---|---|
| 1 | headless 用户不再被教"五行自禁用" | 手册 §九 与根 README 给显式 `disabled: true`；`--dump-config` 五行 disabled | 本卡台账 A1 |
| 2 | 卸载后的 preset 选择不再被谎称"自然回退" | 文档写 `agent-preset/not-found` 与清理办法 | 台账 A2 |
| 3 | "工具是否进请求"一条命令可答 | `pnpm session <id> --tools` 打印工具名 | 台账 B1 |
| 4 | 基线不会被静默改写 | `--refresh` 先打印逐条 drift 再写 | 台账 B2 |
| 5 | 三个未测动词与 research 的 park/promote 有断言 | 定向 spec 红绿 | 台账 C1 |
| 6 | 两个多族模块按族拆开且行为不变 | 全量 spec 与组合 spec 绿；文件行数上限下降 | 台账 D1/D2 |
| 7 | 归档索引的死链被门禁挡住 | `_archive/**/README.md` 进语料，负例夹具红 | 台账 E3 |

## 切片台账

| 片 | 状态 | 证据 |
|---|---|---|
| A 真相修复 | 完成 `d35b9f28` | 手册/README 自禁用、卸载 residue、tarball 引擎门、HMR 升级、§号、路径基准、探测取会话；`verify` 60/60 + 两条 prove-it-red |
| B 取证最后一公里 | 完成 `bac456d5` | `--tools`/`--recent`、`--refresh` 先 diff、`dev/probes/web/README.md`；`pnpm check` 绿 |
| C 测试所有权 | 完成 `a19daf14` + `66ac8f5a` | operating 三动词、research park/promote、viki 五条降级、CLI 两守卫、BUG-028 红夹具 |
| D 结构 | 完成 `6029857e` + `66ac8f5a` | health 464→5 文件（最大 173 行）；tool-operating 459→4 文件（最大 195 行） |
| E 卫生与自述面 | 完成（本卡） | `.tmp` 427→15 条、916MB→273MB；§八 补两行；归档索引进门禁；本卡 + note 替代第四份报告 |

## 仍未取

- `pnpm usage` 的 `--since` 与 `--self-check`（P3；触发 = 下一次被 24s 全量拖慢）。
- 24 个 spec 绕过 `dirPool`、`client-surface` 测试面收窄（P3；触发 = 下一次测试夹具事故）。
- 不自授权例外清单三份并一份（P3；触发 = 三份再次出现口径差）。
- 主题 CSS 按 vendor `ctx.effect` + `data-plugin` 归属（P3；触发 = 停用/热重组后残留被真实观察到）。
