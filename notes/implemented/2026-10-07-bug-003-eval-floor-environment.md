# BUG-003 修复：eval 地板的病灶——repo-cwd 泄漏、套内排序、判卷基点与技能遵从度

日期：2026-10-07 · 状态：**implemented**

> 承接 [BUG-003 卡](../../_backlog/_done/_fixed_bugs/BUG-003-eval-floor-red.md)（前科 [BUG-001](../../_backlog/_done/_fixed_bugs/BUG-001-eval-behavior-tasks-red.md)）；
> 证据 = 五个全新 home 的全量复现 + 失败会话日志逐个解剖（正文含模型原话引文）。

## 诊断（先复现——TDD 的红就是任务本身）

共享 dev home 全量 3/5 是**三个不同病灶叠出来的假象**，逐个解剖：

| 表象 | 会话日志解剖（模型原话） | 病灶 |
|---|---|---|
| first-open-intake 全量套内失败（位置 5） | *"I have the digest with 5 active memories. This is not a fresh folder. So no first-conversation skill needed."* | **套内排序**：前序任务往共享 home 记忆房间写记录；freshness 触发器键在记忆房间（10-05 改键），模型「正确地」拒绝开场技能——任务前置被破坏 |
| first-open-intake 单跑首跑失败（virgin home） | *"I'm in a repository ai_dsh_assitant… There are workspace instructions from AGENTS.md of the repo."*——6 次工具全在探索仓库 | **repo-cwd 泄漏**：会话 workspace 被钉仓根 → 本仓 AGENTS.md 以 workspace 指令身份进会话，与助手 persona 抢方向盘（概率性打滑，后续 4 跑都过） |
| breakdown-uses-skill 多数轮失败 | 两种形态：技能加载、假设层在，但动作行**意译**转向条件（ACC2：*"若下滑高度分散 → 转向 H1/H5"*，无字面标签）；或**干脆省略**停止条件（ACC3：三刀拆解+H1-H5 各带检验方式，高质量，但第 4 层动作行无停止条件） | 前者=判据假阴性（实质合规）；后者=**技能遵从度**——技能只在两处顺带提 stop condition，模型时给时不给 |
| desk-refresh-loop（修复过程中新暴露） | 判卷报 *"stale file…432s before this run"*——模型写进一次性 workspace，判卷仍按 run.mjs 的 cwd 读 | **判卷基点**：会话 workspace 与判卷路径解析脱节 |

附带发现：launcher `cwd: repoRoot` 强制是 10-05 P2 归位（`e8d1625`）引入，此后 client-ui 技能（09-26）的「干净目录重启」招法**静默失效**（实证：从 /tmp 调用，会话仍落仓根目录）；`--import tsx/esm` 裸包名按子进程 cwd 解析，中立 cwd 下直接 `ERR_MODULE_NOT_FOUND`。

## 决定（六件）

1. **launcher 显式出口 `ASSISTANT_SESSION_CWD`**（dev/env/dsh.mjs）：默认仍钉仓根（dev 会话就在本仓工作，不变）；显式指定时会话 workspace 落指定目录。tsx 导入改 `import.meta.resolve` 绝对 file URL（cwd 无关）。
2. **eval 每任务一次性干净 workspace**（run.mjs）：`mkdtemp` + `ASSISTANT_SESSION_CWD`，评测量的是产品不是本仓 AGENTS.md；顺带消灭 `.desk` 残留问题。
3. **判卷基点跟随 workspace**（checks.mjs）：file-shape 的相对路径以 `observed.workspaceRoot` 解析；workspace 保留到判卷后由 runTask/domain-run 清理（首版在 finally 提前删掉判卷无物可读——desk-refresh 因此红过一轮）。
4. **first-open-intake 挪全量套第一位**（tasks.mjs + 注释机理）；selfCheck 改按 id 取 scope-honesty（不再绑数组位）。
5. **breakdown 判据放宽到实质**：第四层停止条件接受字面标签（停止条件/stop condition）**或**条件转向形式（若…→）——意译但实质合规的答案不是漏层。
6. **management-breakdown 技能第 4 层显式化**（产品修复——ACC3 形态红得有理）：停止条件不可省略、须显式标签、**信息收集类动作也要有**（「什么结果让这步白做或让计划反转」正是拍板前需要看到的）。client-ui 技能验证循环同步改用新出口。

**交付收口**——外部结果：触发 = 巡检地板红；用户看到 = `pnpm eval` 在正确条件下给出可信 5/5 读数（地板从「红着带噪声」回到「绿着可依赖」）；完成条件 = 全新 home 全量 5/5 连续两轮（BUG-001 判据）。**签收** = **验收实跑：ACC4（/tmp/eval-acc4-TiPF）5/5（intake 11s/breakdown 57s/desk 102s）+ ACC5（/tmp/eval-acc5-Ufnw）5/5（intake 11s/breakdown 55s/desk 98s）**——两个独立全新 home，连续两轮全绿；加 self-check 绿 + 全套门禁（见下）。**未跑项**：dev home 全量（按新口径不适用——共享家自带记忆，intake 触发器按设计不点火，这是任务的运行条件不是缺陷）。

## 输掉的方案

1. **per-task 独立 home**（每任务 setup+凭据 ~40s）——输给「套内只有 intake 需要 fresh、判污染只在跨轮复用同 home」：排序修复 + 每轮独立 home 已覆盖，全套件 per-task home 是为不存在的问题付费。
2. **freshness 触发器改回 desk 文件**——输给 10-05 found-live（desk 残留曾误读「不是首开」，改键记忆房间是那次修复）；倒退复活旧病灶。
3. **给 eval 会话喂假干净 AGENTS.md**——输给诚实原则：那是测无人会用的部署形态；中立 cwd 才是真实用户的第一场对话。
4. **改 launcher 默认 cwd 为调用方 cwd**——输给爆炸半径：全部 dev 会话与脚本依赖仓根默认；显式出口只动评测与交接两个消费者。
5. **判据进一步放宽**（信息收集类动作免停止条件）——输给 ACC3 解剖：那是技能遵从度真缺口（技能明文要求每个动作带停止条件），放宽判据=掩盖产品行为；修技能让地板保持严格。
6. **eval 全量在共享 dev home 上跑并把它当地板**——输给家污染自我强化（BUG-001 已记录：失败会话写线索、digest 广告给下一轮）；地板口径 = 每轮独立全新 home。

## 范围与后果

现在为真：`ASSISTANT_SESSION_CWD` 是会话 workspace 出口（默认不变）；eval 每任务一次性 workspace、判卷跟随基点、判后清理；intake 套内第一；breakdown 判据认实质转向形式；技能第 4 层停止条件显式化。地板读数回到 5/5×2。残留观察：同一 home 连续两轮全量仍会因自我污染失败（BUG-001 修复方向候选③受控 fixture home 的领域）——触发：每轮独立 home 的口径被证实在实践中太贵时再立卡。
