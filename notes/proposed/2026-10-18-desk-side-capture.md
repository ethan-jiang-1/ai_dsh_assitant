# 桌面侧受理新事项（受理位 + 状态显性化 + 待认领栏卫生）

日期：2026-10-18 · 状态：**proposed**（已授权实施 2026-10-18；推进台账 = [`_backlog/issues/261018-desk-side-capture-closure.md`](../../_backlog/issues/261018-desk-side-capture-closure.md)）

## 问题（可观察行为）

本人在真机桌面上提出（原话）：「桌面上要有新的 ITEM，这个流程是如何弄？原来是靠对话的，但这个切换…看着桌面有点想不起来」，并要求「东西都要显性化」。

可观察现状（真机与代码证据，逐条可复现）：

- 桌面唯一的新事项入口是工具栏按钮「＋ 交代新事项」，它是一扇**通向对话的门**（`desk-arms.ts` 的 `startIntake()` 会 `openSession` 把主区切走）；桌面**没有任何就地输入位**（真机 DOM 里 `textarea`／`textbox`／`contenteditable` 计数全为 0）。
- 而 Day-0 面板**有**就地输入且**不切主区**：`first-mile.ts` 的 `send()` 走 `sendPrompt(text, 'desktop-landing', 'desk', sid)`。同一意图，两个年龄的界面两种待遇。
- 账本侧"捕获但未归类"已是一等状态：`note` 无归属 → `retain` → `UnclaimedMaterial`（`domain/operating/ledger.ts` 的 `applyNote`，"绝不按标题匹配"）；桌面已有「待认领——还没说清是哪件事，不猜」一栏，但**没有"是噪音、不归户"的出口**（已登记缺口）。
- 三轮同源推敲（10-05 入口编排 / 10-11 走查"找不到加事项入口"→加按钮 / 10-16 判"两入口并排保留"）裁决的都是"给一扇通向对话的门"，**"桌面自己收下一句话"从未被裁决**。

**4 项判定已由本人逐条拍板（2026-10-18，均照 agent 判定；逐条理由、代价与可推翻点住 [结项卡](../../_backlog/_archive/settled_issues/261018-desk-side-capture.md)）**：

1. **默认去处 = 记一笔（→ 待认领）**，不默认立项；助手在同一回合用一句话提议"要不要立成事项"。依据：`create` 的 `title` 是必填——默认立项等于在半成形的话上替本人命名，而账本纪律是"归属永不按标题猜"。
2. **最小信号**：桌面显形"在途 → 轮到我"，并显示助手问的那一句（≤ 一行）；会话正文不上桌面。
3. **状态的家**：「刚投、账本还没动静」归客户端投递回执；「它在跑／轮到我／它说完了」读**原生** `SessionStatus` 三格（`running`／`pendingInteraction`／`completionUnread`）——durable、刷新不丢、非会话正文。由此得一条规则：**要问就正经问**（追问必须走平台 question 交互，否则不产生 `pendingInteraction`）。
4. **两扇门并存**：受理位＝记一下（默认待认领，不切走）；`＋ 交代新事项`＝当面立项（开会话当面谈）；两处都把重量写在文案上。

**外部同范（只作旁证，未逐字引用）**：成熟做法把"捕获"与"归类"分成两步、要求捕获侧无摩擦（GTD 的 Capture → Clarify 分步、inbox → triage 模式）。

## 提案

五片，片 0 独立可先落；每片的验收都是可执行的（见下），实施纪律按 [notes/README §二之三](../README.md)——先答"怎么算对"，造红→实现→变绿。

### 片 0 —「未成」出口：待认领片段的终态（前置，独立可落）

- **域**：`domain/operating/` 新增一个操作 kind（暂名 `discard`），与事项的 `abandon` **同构**——**弃置不是删除，是终态**：片段离开待认领通道，操作记录留下原因与其原话；原始 `note` 操作的 `quote` 本就在账本里，字面不丢。
- **工具面（模型可见面）**：`assistant_operating` 动作集 +1 → 同 diff 做英文 description、[`docs/identity.md`](../../docs/identity.md) 登记、[`docs/operating.md`](../../docs/operating.md) §二动作表、`pnpm gen-catalog`、组合断言、`pnpm eval`。
- **客户端**：待认领片段详情加「是噪音，不归户」（选择契约：每个 item 选中即有相称动作）；栏内区分"本人一句话"与"助手分析残留"。
- **本人待定一行**：弃置**留档带一行原因**（我的建议，理由=与 `abandon` 同构、保住原话与出处）还是**直接删**。建议前者；这行在片 0 开工时确认即可。

### 片 1 — 桌面受理位与状态显性化（client 为主）

- 受理位：桌面工具栏下常驻一行（Enter 提交；形态参考 `first-mile.ts` 的输入条）。
- 投递：复用 `startIntake` 的会话选择与绑定判据，但**不 `openSession`**；走 `panelPromptRequest` 同族通道，带**独立来源标记**（暂名 `[桌面] `，与 `[面板] ` 并列；字面是实现选择）。
- 在途条：客户端回执（`requestId` + `accepted`）驱动；三态读原生 `sessionStatus`；虚线形态，**不得复用事项卡结构**。
- 两门文案写明重量。

### 片 2 — 助手侧默认与「要问就正经问」（模型可见面）

- 默认 `note`（记一笔）＋同回合短 ack＋需要本人选时走 question 交互提议立项。
- owner 面：preset 的 agent 段落或 `src/agent/operating-brief/`（英文）；`docs/identity.md` 登记；组合断言在场；`pnpm eval` 真实请求回归。

### 片 3 — intake 臂「返回」语义修订（契约改动，不是纯加法）

- 今天：交代 → 做 → **回桌面**并选中新事项。桌面能就地受理后，桌面不再是"被返回的地方"，而是在途条的落点与结果接管处——`IntakePath` 的绑定/返回判据、以及"首次回复只追问不落账则不返回"这条负例，都要按新形态重述。

### 片 4 — 验收资产

- 走查相位（`desk-flow-walk.mjs` 加"就地交代"一段）；截图基线（`snapshots/web-face/` 场景）；仪器对齐（`pnpm observe --home dev/trial-home-30d` 读数前后对比）。
- 实施时顺带核一件事：DSH 右侧栏（per-Session、beside the conversation）能否就地承载会话——若能，「＋」可改成不夺主区（[sidebar-right.md](../../vendor/dsh/docs/subsystems/sidebar-right.md)）。

## 输掉的方案

- **桌面表单直写账本**：客户端不拥有经营权威；写入必须走 `assistant_operating` 带逐字引用与来源会话（[2026-10-11-one-operating-desk.md](../../notes/implemented/2026-10-11-one-operating-desk.md) 输掉的方案 3）。
- **桌面内联下拉选归属 + 自动代发指令**：把桌面变成写入口、替本人偷发，且归属确认本身可能是一问一答（[261012 选择契约](../../_backlog/_archive/settled_issues/261012-desk-selection-contract-attach-ux.md) 输掉的方案 1）。
- **只加提示文案教本人去会话说**：死胡同依旧、负担没动（同上，输掉的方案 2）。
- **默认立项**：`create.title` 必填＝在半成形的话上替本人命名，与"归属永不按标题猜"相反（判定 1 的反面）。
- **"轮到我"只靠客户端内存**：刷新即丢，与判定 2 直接相冲；改用原生 `SessionStatus`（判定 3 的修订缘由）。
- **静默入队**：`{accepted:true}` 只证明受理、不证明会处理；静默会让人分不清"它在忙"与"它没收到"，而现状（当面说当面答）没有这个失败模式。
- **把"当面交代"塞进受理位**：立项要谈的是一组事实（谁/何时/什么算办完），塞进默认 `note` 的槽＝把重的事降级成轻的事。
- **账本收件箱**：被"输入边界先观察 30 天"推迟（[261007-input-boundary.md](../../_backlog/_archive/settled_issues/261007-input-boundary.md)）；本提案不重开它。
- **碎片一删了之**：与事项 `abandon` 的既有形状不一致（账本保留操作与出处）。

## 验收

下游按片验收；每条给出**命令 / 断言对象 / 红的形态**。公司级门禁永远是 `pnpm verify`（42 条）。

| 片 | 命令 | 断言对象 | 红的形态 |
|---|---|---|---|
| 0 | `pnpm test:domain` | `domain/operating` 纯核：`discard` 的接受/拒绝矩阵（未知 id、已消费片段、非 unclaimed）与新枚举分发 | 任一负例未拒 = 红 |
| 0 | `pnpm gen-catalog --check`（`pnpm verify` 内） | 工具动词集与目录生成物一致（动作 +1） | 目录过期 = 红 |
| 0 | `pnpm test:composition` | 新动作行与 description 在场（真组合装载） | 段落/行缺席 = 红 |
| 0 | `pnpm eval` | 模型可见面回归：不因新动作而改行为基调 | 既有任务失败 = 红 |
| 0 | `pnpm shots '<URL>' --dom` | 片段详情出现「是噪音，不归户」；账本读回后该片段离开待认领通道，原 `note` 的 quote 仍在 | DOM 无该按钮 / 片段仍在栏内 = 红 |
| 1 | `pnpm test:client` | 受理位组件 + 状态映射三态（`running`→等助手；`pendingInteraction`→轮到我；`completionUnread`→说完了）；在途条不复用事项卡结构 | 状态映射缺失或复用卡结构 = 红 |
| 1 | `pnpm shots '<URL>' --dom`（三态各一张） | 未投递／在途／轮到我 三态**各有其形**；两门文案写明重量 | 两态同形 = 红 |
| 1 | 真机刷新前后两帧 DOM 比对 | 刷新后：客户端回执消失（桌面不再叙述"刚投、还没落账"），但原生三态仍在 | 刷新后仍显示假的在途条 = 红（否定断言） |
| 2 | `pnpm eval`（新增/扩展任务） | 桌面投一句含糊话 → 默认落 `note`→`retained`；同回合有 ack；需要本人选时走 question 交互 | 直接立项 / 无 ack / 只在正文问 = 红 |
| 2 | 会话日志读回 | 落账操作带逐字 `quote` 与来源会话；面板/桌面来源标记可重建 | 无 quote 或无来源 = 红 |
| 3 | `node dev/probes/web/desk-process-e2e.mjs --scenario flow` | 相位按新形态重述：就地受理不切主区、结果接管在途条 | 相位缺断言或沿用"回桌面"旧语义 = 红 |
| 3 | prove-it-red（按 [docs/testing.md](../../docs/testing.md)） | 反转返回判据 → 该相位独红；还原复绿 | 反转后不红 = 红 |
| 4 | `pnpm desk-walk '<URL>'` | 走查新相位：桌面就地交代 → 停在桌面看到在途 → 看到它变成待认领/事项 | 需要切走才能完成 = 红 |
| 4 | `pnpm web-expected '<URL>'` | 场景无漂移，或按场景契约 `--refresh` 重录并提交 DOM | 未按契约重录 = 红 |
| 4 | `pnpm observe --home dev/trial-home-30d` | 桌面侧投递的自发碎片能被 A 口径读到（或明确记录读不到并说明替代读数） | 读数口径与投递形态不符且未记录 = 红 |
| 全 | `pnpm build && pnpm test && pnpm verify`（改发布物/工具面时另加 `pnpm release-smoke`） | 收尾三连（[scripts/AGENTS.md](../../scripts/AGENTS.md)） | 任一红即未完成 |
