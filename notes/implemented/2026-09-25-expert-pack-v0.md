# 专家部署组合件 v0（管理岗专家包的装配）

日期：2026-09-25 · 状态：**implemented**（2026-09-25 落地：v0 四件全部交付并 live 验证；探针抓到的真 bug 当日修复；v0 之外的后续项已入队列，见 §四）

## 一、v0 是什么

把已验证的零件拼成**一条命令可装配的管理岗专家部署**：领域身份（SOUL）+ 两件基座 SOP 技能 +
知识种子包 + read-only 权限形状。依据：intents §〇·二"我可以先准备的"四件之二，与总纲阶段 1 第 1 项。

## 二、交付物与 live 证据（非门禁绿）

1. **两件 SOP 技能**（`presets/assistant/skills/`，模型面英文）：
   `management-breakdown`（四层拆解：现象/可检验假设/各视角取舍标准/行动；事实要有出处、
   保留分歧、一页纸、不编造公司事实）与 `action-plan`（每项行动带负责人/时限/度量/**停止条件**；
   延后项要带理由；结论先行）。出处＝本仓自己的意图定义（P1/O1/O2），不碰兄弟仓的场景事实。
   **补记**：`action-plan` 落地当天其实进不了任何会话的技能目录——它的 frontmatter 里
   一个 `: ` 让 YAML parse 失败、加载器静默 skip；同批修好并加了门禁，见
   [策展技能被静默跳过](2026-09-25-curated-skill-frontmatter-silent-skip.md)。
2. **装配脚本** `pnpm expert-setup -- --data-dir <assistant 目录>`（`scripts/expert-setup.mjs`）：
   SOUL **仅在未被主人改过时**替换为管理岗专家身份（改过则跳过并说明——装配不覆盖其所有者）；
   知识种子经治理写入路径导入为 draft；报告部署形状与"draft→stable 由你亲手改＝人审"。
   实测两遍：全新家→SOUL 替换+3 种子；复跑→SOUL 跳过、种子幂等。
3. **拆解探针**（真实会话，专家形状 read-only）："这季度销售掉了 20%，帮我拆解"——回答**完整呈现
   P1 行为**：四层结构、口径三线并列、CFO/Sales 分歧被显式保留（"不要调和成再观察观察"）、
   每项行动带负责人/时限/度量/停止条件、owner 标注为占位待改真名、"毛利率底线只有你能给"。

## 三、探针抓到的真 bug（已修复，2026-09-25 当日收口）

**策展技能 provider 在 preset 会话里整个缺席**——不是新技能的问题：目录里只有 `.agents/skills/`
（项目根，开发技能）与 working folder `skills/`（学到的技能），**8 件策展技能（含旧 6 件）全都不在**；
`--dump-config` 显示 `skill-filesystem` 行在 preset 的 plugins 里，所以问题不在"行挂没挂上"。

**根因**：`cordis.patch.yml` 里那行的 `customSkillDirs` 写的是相对 `baseUrl` 的 `presets/assistant/skills/`，
而 **bundle patch 的行继承的 `baseUrl` 是 profile 目录**（探针实测 `…/dev/harness-home/profiles/dev-task/`），
不是包根 —— 路径指到包外，provider 扫一个不存在的根：不报错、不告警、目录空。迁移前 preset 是独立文件
（baseUrl = 该文件目录）所以这条路径曾成立，属于 pin 迁移的连带错事实（迁移 note §二 原表也写错了这条）。

**修法与证据**（完整记录与输掉的方案）：[0.1.7 迁移 note §十二](2026-09-25-dsh-0-1-7-migration.md)。
要点：改为按包名解析（`createRequire(baseUrl).resolve('dsh-smart-assistant/package.json')` + 包内相对路径，
shipped `cordis` preset 的同款惯用法）；新增红夹具 `tests/preset-skill-root.spec.ts`（修复前解析到包外＝红）；
live 探针重跑：按名加载 `management-breakdown` 成功、8 件策展技能全在；账本出现迁移后第一次策展技能加载。

**并发修复的裁决记录（责任圈会话补记，2026-09-25）**：本 bug 被两个会话同时独立诊断（同一探针法：
在 `!!js` 里打印 `baseUrl`）。责任圈会话曾实施候选修复（learn 模块代码挂载第二 provider，
`CURATED_PROVIDER_NAME`），在探针确认并行修复有效后已 `git checkout` 回退——两修复并存＝双挂 provider
（技能重复出现），且并行方案更小（一行表达式 vs 新挂载点）。裁决依据：死路回退、谁的切片完整保留谁的、
提交只 add 自己的路径。并行修复的切片（YAML + 红夹具 + 迁移 note 更正）由该会话自行提交。

## 四、交付时的回归与 v0 之外的后续

**回归（交付时真跑）**：

1. §三 的根因修复 ✅（红夹具 + live 重跑 + 账本三条证据）；
2. 技能加载探针 ✅（按名加载 `management-breakdown` 成功）；`pnpm eval` 行为回归 ✅ **3/3**
   （`reserved-item-restraint`、`scope-honesty`、`continuity-from-home`）。注：同一轮里另一次读数 2/3——
   那次 `reserved-item-restraint` 会话把判断写成了 note 而不是只回复，被 `no-write-tools` 判 FAIL；
   同一任务重跑 PASS，故按单样本噪声记，不当作稳定回归。另一条背景：修前 eval 恒报"没有会话日志"，
   那是日志发现写死 v3 的独立 bug（见[会话日志代次配方卡](2026-09-25-session-log-generation-recipe.md)）；
   **P1 有了可重跑回归（责任圈会话补，2026-09-25）**：`pnpm eval` 第 4 个任务 `breakdown-uses-skill`——
   任务**不给任何加载提示**（测判断，不测听话），断言会话自主按名加载 `management-breakdown`
   （检查类型 `skill-loaded`，读会话日志里的 skill 调用参数）且回答含假设层与停止条件。
   夹具正反各一（未加载必红）；**live PASS（104s）**。此前 P1 只有一份探针记录，现在是一条回归。
3. 装配脚本接 `package.json` 脚本名 ✅（`pnpm expert-setup` 接上 tsx 入口，实跑：全新目录→SOUL 替换+3 种子，
   复跑→SOUL 跳过、种子 id 稳定不新增；README 装法段同时修掉迁移后失效的"指向 `presets/` 目录"旧步骤，
   依据见[迁移 note §十三](2026-09-25-dsh-0-1-7-migration.md)）。

**v0 之外的后续项（不在本卡范围，各有队列归宿）**：

- **IM 渠道**（O5）——**不做**（用户 2026-09-27 拍板：只考虑 DSH 自己的交互面）；条目已离队，判据收窄为
  「一条命令装好、管理员不写 YAML」；
- **MCP 连接**（v0 先用文件替身）：ROADMAP ⏳ 条目（触发=需要真实系统数据接入会话时）；
- **概念页抽取**：并入既有 ROADMAP ⏳「知识导入的转换与概念抽取」（触发=docx/pdf 文档集出现或评测集 v0 就位）。

## 五、输掉的方案

- **每个专家一条独立 preset 行（复制 19 行插件）**：第二个领域出现前不抽象（总纲阶段 3 规则）；
  v0 用"同一 preset + 领域 SOUL/知识/技能"表达专家性。
- **把领域身份写进 persona 前缀**：persona 在组合层，专家身份属所有者数据（SOUL），装配不动组合。
- **expert-setup 直接改 SOUL 无论现状**：覆盖所有者身份＝装配凌驾其主人；只在字节等于默认种子时替换。
