# BUG-001 修复：技能目录从未发布（组合层修复）+ wrote-path 认 python 写法

日期：2026-10-02 · 状态：**implemented**

bug 卡：[`_backlog/_done/_fixed_bugs/BUG-001-eval-behavior-tasks-red.md`](../../_backlog/_done/_fixed_bugs/BUG-001-eval-behavior-tasks-red.md)
（位置即状态：本 note 是修复的诊断与证据面，卡的状态行持指针）。

## 诊断（证据链，逐环实测）

1. **失败复现**：`breakdown-uses-skill`（模型不按名加载 management-breakdown）、
   `desk-refresh-loop`（判定核报 .desk/state.json 未写）。
2. **desk-refresh 会话日志拆解**：模型**加载了技能、也真重写了桌面文件**——用 bash+python
   （`json.dump(s, open('.desk/state.json','w'))`，技能自己教的流程）；判定核 `wrotePath` 的
   bash 正则只认 JS/shell 写法（writeFileSync / `>` 重定向 / tee）⇒ **判定核漏检，行为无错**。
3. **breakdown 会话日志拆解**：模型全程未考虑技能——深挖发现 **`<available_skills>` 目录消息
   在其上下文中不存在**（system 文本 13,892 字零命中；skill 工具 description 泛指
   "session skill catalog"）⇒ 模型不是"选择不加载"，是**无从知道技能存在**。
4. **发布机制**（vendor `dsh-tool-skill`）：目录以 user message（`<system-reminder>` 包
   `<available_skills>`）在 `agent/pre-step` 发布；两个静默跳过分支：toolVisible 身份检查、
   `!snapshot.complete`。one-shot 单请求 ⇒ 跳过即永缺。
5. **全量日志统计**：one-shot 会话（含 G2 批全部 30 题）`skill-catalog` 事件 **0**；
   dev web 会话（同 preset 行）**有**（seq 11，21 entries）⇒ 变量 = 会话形态 × 挂载层。
6. **隔离实验**：裸 one-shot（base 的 host 层实例，无 preset）**发布成功** ⇒
   **preset 行挂载的实例在 one-shot 不发布，host 行挂载发布**。
7. **旁证**：runner 侧预热 `ctx.skills.snapshot({cwd, scope: agent})` 返回 complete=true、
   19 技能（含 management-breakdown）——发现本身没问题，问题在挂载层与发布监听器的交互
   （vendor 内部身份检查，未继续深挖：组合层修复已实证闭环）。

## 修复

1. **组合层（L0）**：`tool-skill` 从 preset 行移到 **host 行**（web 侧同 id 覆盖 web-app 的
   disabled 行——session-query/ui-chat 同先例；headless 侧覆盖 base 活行，形状不变）。
   裸 one-shot 实证该挂载形态发布目录。
2. **判定核**：`wrotePath` bash 正则扩展 `json\.dump` 与 `open\([^)]*'w'\)`（python 写法），
   保留原 JS/shell 分支；eval self-check 加红绿夹具（python 写必须认、只读命令必须不认）。
3. 顺带保留：preset-runner 的目录预热（`await ctx.skills.snapshot(...)`，完成发现先于首请求）——
   对 host 实例的发布同样是助益。

## 验收（bug 卡判据：5/5 且连续两轮）

- `pnpm eval -- --only breakdown-uses-skill` / `--only desk-refresh-loop`：各两轮 PASS；
- `pnpm eval` 全量：**5/5**（reserved-item-restraint / scope-honesty / continuity-from-home /
  breakdown-uses-skill / desk-refresh-loop）；
- `pnpm verify` 32/32；`pnpm test` 全绿（含 wrote-path 新夹具）。

## 输掉的方案

- **只修判定核不修目录发布**：desk-refresh 绿了，breakdown 的根因还在——模型仍然无从发现
  技能，所有"按名加载"类行为继续退化（P2 学不进去的又一路径）。
- **改任务问法绕开技能断言**（候选①）：把仪表调成绿而不是把产品修好——正是评测卡要防的。
- **给 tool-skill 换自定义实现**：违反"永不改 vendor"与最小组装面；组合层换挂载位一行搞定。
- **runner 侧预热单独作为修复**：预热证实了发现完好、但预热本身不改变发布监听器的跳过分支
  （实测目录仍缺席）——保留它作为助益，修复靠挂载层。
