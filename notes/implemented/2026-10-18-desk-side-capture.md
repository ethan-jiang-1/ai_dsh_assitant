# 桌面侧受理新事项（受理位 + 状态显性化 + 待认领栏卫生）

日期：2026-10-18 · 状态：**implemented**（已交付 2026-10-18：五片全部落地；逐片真证据的家 = [收口卡台账](../../_backlog/_archive/settled_issues/261018-desk-side-capture-closure.md)；4 项判定与逐条理由住 [结项卡](../../_backlog/_archive/settled_issues/261018-desk-side-capture.md)）

## 问题（可观察行为）

本人在真机桌面上提出（原话）：「桌面上要有新的 ITEM，这个流程是如何弄？原来是靠对话的，但这个切换…看着桌面有点想不起来」，并要求「东西都要显性化」。

交付前的现状（真机与代码证据）：桌面唯一的新事项入口是「＋ 交代新事项」——一扇**通向对话的门**（`openSession` 把主区切走）；桌面没有任何就地输入位；账本侧"捕获但未归类"已是一等状态（`note` → `retain` → `UnclaimedMaterial`）但桌面没有出口；三轮同源推敲裁决的都是"给一扇通向对话的门"，"桌面自己收下一句话"从未被裁决。

**4 项判定（本人逐条拍板，依据住结项卡）**：①默认去处＝记一笔（→待认领），不默认立项（`create.title` 必填＝不许在半成形的话上替本人命名）；②最小信号＝桌面显形"在途 → 轮到我"＋助手问的那一句（≤一行）；③状态的家＝投递回执归客户端、三态读**原生** `SessionStatus`（由此得"要问就正经问"）；④两扇门并存、重量写在文案上。

## 交付（五片全部落地；证据指针到收口卡台账）

### 片 0 —「未成」出口：待认领片段的终态 ✅

`domain/operating` 新增 `discard` 操作（与事项 `abandon` 同构——弃置是留档带原因的终态，不是删除）；工具动作集 +1（英文 description、identity 登记、operating.md 动作表、组合断言）；客户端片段详情「是噪音，不归户」。

### 片 1 — 桌面受理位与状态显性化 ✅

受理位常驻一行（Enter 提交、提交即清草稿）；投递走 queue 通道带 `[桌面] ` 独立来源标记、**不 `openSession`**；在途条由客户端回执驱动、三态接**原生 `SessionStatus`**（纯核 `captureWait`：pendingInteraction 优先、刷新不丢）；虚线形态不复用事项卡；两门重量文案。

### 片 2 — 助手侧默认与「要问就正经问」✅

指令段落进 `operating-brief`（英文）：`[桌面] `＝轻门，默认 `note` 逐字落账＋同回合 ack；立项选择走 question 交互正经问；**绝不自行 `entrust`**（重门路径保留）。真车道判决：含糊话 → note 逐字落账（matters 不变）＋零 `entrust` ＋ ack 与立项选择折叠进 `ask_user_question`（三选项）。

### 片 3 — intake 臂「返回」语义修订 ✅

创建信号显性化为契约：`judgeIntakeReturn` 只认 `committed` 的新 matter 回执——**bound 会话里的 capture note（retained）永不充当创建信号**（纯核新案＋prove-it-red 独红/复绿）；就地受理不切主区、结果接管在途条由真车道探针承载。

### 片 4 — 验收资产 ✅

走查两帧（在途条在场/结果接管，`.tmp/shots/desk-capture-{inflight,takeover}.png`）；`blank-first-open` 基线由 proactive-face 片 1 同 diff 重录并复验 PASS；observe 口径缺口记录（`[桌面] ` 的话被 B/C 口径排除出劳动口径；替代读数＝计为本人；仪器修订记候选）；右侧栏核查＝**能承载**（per-Session 停靠面＋现成 `subagentchat` tab 型），「＋不夺主区」记候选改造。

## 验收（已执行；逐片命令与红形态 = 收口卡台账）

| 面 | 判决 |
|---|---|
| 纯核与组件 | 域 discard 矩阵 4 案、服务边界 1 案、工具边界 1 案、客户端 discard/受理位/在途/四态等 20+ 案、intake 判据 capture-note 负例＋prove-it-red；包全量 `pnpm test` 721/721 |
| 真机 | 片 0 DOM 两出口并列；片 1 受理位在场＋新钩子桌面不崩；片 2/4 走查两帧＋全相位 PASS；`blank-first-open` 复验 PASS |
| 模型可见面 | 合同 4 案（desk capture lane 要素）；`pnpm eval` **9/9 全绿**（含新任务 `desk-capture-note`） |
| 真车道 | `desk-capture-live.mjs` 全相位 PASS：逐字落账、matters 不变、零 `entrust`、question 挂起 |
| 收尾 | `pnpm build && pnpm test && pnpm verify` 全绿（42 checks） |

**本人的验收面（不代判）**：两门文案的重量读感；question 选项的话术；「是噪音，不归户」的措辞——日常使用即验。

## 输掉的方案

- **桌面表单直写账本**：客户端不拥有经营权威；写入必须走 `assistant_operating` 带逐字引用与来源会话。
- **桌面内联下拉选归属 + 自动代发指令**：把桌面变成写入口、替本人偷发，且归属确认本身可能是一问一答。
- **只加提示文案教本人去会话说**：死胡同依旧、负担没动。
- **默认立项**：`create.title` 必填＝在半成形的话上替本人命名，与"归属永不按标题猜"相反。
- **"轮到我"只靠客户端内存**：刷新即丢；改用原生 `SessionStatus`。
- **静默入队**：`{accepted:true}` 只证明受理、不证明会处理；静默让人分不清"它在忙"与"它没收到"。
- **把"当面交代"塞进受理位**：立项要谈的是一组事实，塞进默认 `note` 的槽＝把重的事降级成轻的事。
- **账本收件箱**：被"输入边界先观察 30 天"推迟；本提案不重开它。
- **碎片一删了之**：与事项 `abandon` 的既有形状不一致（账本保留操作与出处）。
- **（交付期新增）e2e 回放续段跨 turn 追加**：位置对齐漂移（运行消费 12 位 vs 记录 11，拒绝相位被喂错位响应）——已回滚；确定性 capture 相位需要 llm-replay 的按 turn 续段支持，记上游候选族；真车道探针承载该验收意图。
