# 第五轮验收（换场景：开发仪表与工具链）

日期：2026-09-29 · 状态：已收卷 · 证据范围：`pnpm usage` / `pnpm desk-loop` 报告数字 vs **全部 211 个
会话日志（含 subagent）逐事件重建真值**；AGENTS.md 新命令表实存性；起 dev Web UI 真跑
`pnpm preflight`（13 项）+ `pnpm shots`（DOM/PNG 渲染证据）。方法同前四轮。

## 结论一句话

**工具链层干净——这是五轮里第一个「零缺陷」轮**：usage 仪表 11/11 项指标与原始日志逐位对账一致
（含复刻其分类规则后的三项），preflight/shots 全绿，desk-loop 与已知历史自洽。收获是两条结构性
观察与一条正面确认。

## usage 仪表对账（核心工作）

| 指标 | usage 报 | 日志真值 | 判定 |
|---|---|---|---|
| 会话 | 211 | 211（210 `session-*` + **1 个无前缀 subagent 目录**） | ✅ |
| 轮 / 步 | 247 / 3185 | 247 / 3185 | ✅ 逐位 |
| 助手消息 | 3176 | 3176 | ✅ 逐位 |
| 自用率分子 | 136/211 | 136 | ✅ 逐位 |
| 工具混合前 8 | bash 2255 / read 600 / assistant_memory 343 / edit 331 / skill 180 / assistant_research 144 / grep 110 / assistant_knowledge 70 | 全部一致 | ✅ 逐位 |
| 真人 / 面板 / 注入前导 | 106 / 16 / 672 | 复刻其规则（注入前导正则 + `[桌面]` 标记）后 106 / 16 / 672 | ✅ |
| 有请求 | 435 | 我的 `request/header` 计数 215——**单位不同非错误**（usage 数 `system/message` 事件，另一事件类型） | ✅（口径差异记录） |

## 两条结构性观察（记录，不改代码）

1. **「面板动作」术语碰撞**：usage 用 `[桌面]` 文本标记（16 次，A10 客户端整改后才有标记），
   desk-loop 用 `rpcId: desk-*` 结构判定（29 次，全时段）——同名不同尺，跨工具读数**不可互比**；
   差值主体是 A10 之前的旧会话。两工具各自口径都在自身文档/注释里言明，属阅读陷阱而非缺陷。
2. **subagent 会话存储无 `session-` 前缀**（裸 UUID 目录，`parentSession` 字段指向父）——usage
   正确计入，但手工审计/脚本若按 `session-*` glob 会漏（本轮第一把尺子就漏了 1 个）。任何
   「数会话」的脚本与技能都该按「目录内含 session.v*.jsonl.zstd」判，别按前缀。

## 其余核验

- **AGENTS.md 新命令表实存性**（并行会话刚改的，新声明最脆）：`dev/env/prepare.sh` 存在 ✓；
  三个判据文件（app-boot/lib、client modules lib、web dist/index.html）+ `.modules.yaml` 全在 ✓；
  export-dist 面（scripts + note）存在 ✓（在途，未验内容）。
- **preflight**：13 项全绿——token 交换、模块装载（11MB bundle 解析）、
  `dsh-smart-assistant client bundle registers under its name`、boot 图 65 条、Remote 清单 27 命名空间
  （agentPresets/workspaceFiles/session 全在场）、desk 文件 8 分区。
- **shots**：581 元素渲染证据 + PNG；**我们的 client 面真实在页**（「智能助手」首公里 hero、
  「打开我的桌面」按钮、会话列表含 `[桌面]` 动作史）；测试后 Web UI 已关停。
- **desk-loop**：§1–§4 摩擦读数全部落在 09-26/27（早于 S7/R11 整改），报告自带「先与修复对齐」
  告警——自洽。`.desk/` 已 gitignore ✓。
- `pnpm eval` 未跑（真实模型调用串行，无人声称其当前绿）——非本轮声明，不虚报。

## 修复记录

无需修复的缺陷。本台账 + 两条观察即产出（观察 2 值得回流进 `.agents/skills/repo-live-probe` 的
「数会话」配方——按内容判目录，不按前缀；留待下次触到该技能时并入）。

## 输掉的方案（本审计自身的取舍）

- **把「面板动作」两工具口径统一**（改其一命名或规则）：各有正当用途（标记 vs 结构），统一是
  产品决策不是审计修复——记录进台账即止，不动代码。
- **跑全量 `pnpm eval`**：机时与模型成本大，且本轮没有任何声明押在它上面；行为回归留给下次
  真有模型可见面改动时跑（那时它才是「会为这次回归而失败」的检查）。
