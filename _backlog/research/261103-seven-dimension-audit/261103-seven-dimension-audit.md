---
topic: 技术
intent: "2026-11-03 七维打扫卫生深审：fresh-eyes 评估文档渐进披露、代码层次、整体结构、上下文腐化、测试资产、反馈通路与 DSH 约定，给下一轮持续改善提供分级证据、误报纠正与边界。"
---

# 七维深审（2026-11-03）：骨架立住，证据面与接缝在腐

> 触发：用户 2026-11-03「还需要持续跟进，到了打扫卫生的时候了……先评估一下这七个维度……先充分地把问题挖掘透」。
> 方法：七路 fresh 只读审计（入口链 / 代码层次 / 上下文漂移 / 测试资产 / 反馈通路 / DSH 约定）+ 主线逐条复核 + 真机取证；
> 基线 HEAD `7159653a`（审计期间从 `5bc5e27d` 被并行会话推进到 `63a82047` → `8a50a074` → `7159653a`）。
> 分维底稿在 `.tmp/seven-dim/`（临时，不入库）；本文件是持久合成件，引用到的 `file:line` 以 2026-11-03 01:20 的树为准。
> 本报告只做证据与判断，不授予任何实施范围；改善切片在收口卡里等拍板。

## 〇、结论先行

| 维度 | 健康度 | 一句话 |
|---|---:|---|
| 1. 文档/代码清晰度、渐进披露、按需加载 | **7.5 / 10** | 路由链真的 ≤2 跳、owner 表带代码锚；但常驻 `AGENTS.md` 5 天回涨 8%，且新增的是一句与 owner 相反的默认路径。 |
| 2. 代码结构层次（代码与测试） | **7.5 / 10** | 平面 DAG 近乎完美、0 死模块、0 barrel 链；但 client 组合根是 398 行 god function、面板是 805 行 + 902 行镜像 spec。 |
| 3. 文档—执行—验收整体结构 | **8 / 10** | 五道门、外部结果三要素、收据与关闭条件齐；但 `去向` 的时机四份文件两种说法，活跃清单被历史摘要淹没。 |
| 4. 上下文腐化 / 偏移 | **7 / 10** | 无高危假话；6 条中危、5 条低危语义漂移，集中在证据面与适配面；notes/backlog 结构干净。 |
| 5. 测试资产组织 / 测试点 / 覆盖 / 类型 | **7.5 / 10** | 159 spec / 1220 用例 / 84% 行覆盖；但首屏最核心的 composer 接线无测试，探针判据可被 dock 满足，`build-freshness` 负载下会红。 |
| 6. 反馈通路（日志 / 端到端 / 复现） | **6 / 10** | 真页面、真截图、真 DOM 都在；但场景车道曾被一条 YAML 写坏整条打灭，且没有 freshness / BLOCKED / 诊断 / session join 的护栏。 |
| 7. DSH 插件/Harness 约定 | **7 / 10** | bundle 形态、三平面、peer-only、engines、封闭载荷都 DSH-native；但 `insert` 当 override 用、两个 packer、client 状态所有权三处偏离约定。 |
| **整体（判断，不是门禁读数）** | **≈ 7.2 / 10** | 骨架、门禁、依赖方向与测试地板立住；腐化集中在高 churn 接缝、证据面与手工地板，不是全仓。 |

**本轮最重要的三条**：

1. **证据车道曾经整条打灭**（P0，审计中已随首屏切片修）：`setup.sh` 把新 profile 的 patch 写成 `[]`，四个 scene seed 与
   `web-face-check` 的 `productOff` 在这行后面追加 block list → 生成的 YAML 非法 → 服务 boot 死在 URL 之前。
   没有测试解析生成的 patch；同样的“追加”逻辑复制了五处。修好之后，场景能跑，但**这条车道仍不在 `pnpm verify` 里**，
   下一次同形改动还会静默打灭。
2. **`insert` 不是 override**（P1）：`cordis.patch.yml` 用一个 `insert:` 块插入了六行与 vendor 同 id 的 row；
   `insert` 是 append，重复 id 只在 loader 的 `EntryGroup.update` 里**后者覆盖前者**，没有警告。
   一旦下一个 0.2.x pin 给 `schedule`/`tool-skill` 加 config，会被本包的空 config 静默盖掉；这能坏的是**整个 profile 的 boot**，不只是本插件。
3. **手工地板不是一条命令**（P1）：`typecheck`、`test`、`verify` 是三条独立命令，`test` 不跑 typecheck，`verify` 不跑 test；
   审计窗口内就出现过一次“提交了 typecheck 红 + verify 红”的树（随后由 `8a50a074`/`7159653a` 补齐）。
   这不是某个人的疏忽，是**地板没有单一入口**的必然结果。

## 一、维度 1：文档/代码清晰度、渐进披露、按需加载

**判定 7.5/10。** 这是全仓最强的一维：路由链不是自我宣称，实测最大 2 跳；`docs/architecture.md` §八 的功能路由表
（功能 → 链 → 实现入口 → 最低 keyless 验证 → 失败先看）是全仓最好的导航件；`docs/AGENTS.md` 的 owner 表逐行锚到代码/门禁/测试；
12 篇 docs 里对单篇 note 的链接为 0（tier 自守）；5 篇开发 skill 都是 39–75 行单文件 + 正向/负向 `whenToUse`，是真正的按需加载面。

**P1-1 常驻入口里的 working folder 默认路径是错的。** `AGENTS.md:9` 写“默认 `<productHome>/assistant`”，
而 owner 是 `docs/home.md:13`“默认 `<dshHome>/assistant`（`$DSH_HOME` → `~/.dsh`）”，`docs/delivery.md:12` 与包 README:106 同。
即：**可选部署形态被写成了默认值**，写进了每个会话都装载的那一份文件。引入于 2026-11-02 的入口增补；无门禁覆盖散文默认值。
修法：改成 owner 的句子，或只留“跨会话工作目录 = `dataDir`，默认值见 `docs/home.md` §一”的指针。

**P1-2 常驻入口重新胖了，而且新增的是“别人的合同”。** 根 `AGENTS.md` 21,443 B/180 行（10-28 瘦身后）→ 23,181 B/185 行（11-02），
5 天 +8.1%；参考型内容（硬规则 + 探索路由）占 36%。门禁只数“行首 `pnpm`”（上限 10，现在 7），不看散文体积与合同复述。
`_backlog/triggers.md:20` 早就预登记了“文档词数预算：刻意不做，触发 = 同一类腐化再出现”——按它自己的判据，触发已到场。

**P2-1 阅读顺序只覆盖一半。** 12 篇 docs 里只有 `architecture.md`/`dev.md`/`home.md` 有完整「读法」行；
`release.md`（185 行/18 KB/12 节）、`testing.md`（114 行/22 KB）、`delivery.md`（181 行/22 KB）都没有节索引。
成本不是“不可用”，是“滚文件 + grep”，且同一套模式一半有一半没有。

**P2-2 术语撞车：`待落地` 有两个意思。** `_backlog/AGENTS.md:19-20` 是 issue 的状态词（ready，不是授权）；
`docs/home.md:126,181` 用它描述产品内提案“approved 但未 land”。本仓自己的规则是“一词一义”（`notes/README.md:89-91`、`docs/AGENTS.md:35`）。
建议把 `home.md` 的提案词改成“未落地”，或在首现处加括注。

**P3 小项**：安装器默认 home 只写了产品路径，漏了 standalone 的 `<包旁>/assistant-data`（`bootstrap.mjs` 的 `--home` 分支）；
`docs/` 没有 README，doorway 是 `docs/AGENTS.md`（可接受，但 README 直接点进 `docs/product.md` 的读者看不到 owner 表）。

## 二、维度 2：代码与测试的层次

**判定 7.5/10。** 平面 DAG 是**实测**干净：129/129 条跨平面 import 指向 `domain`（host 81、client 18、cli 17、agent 11）；
`client → host/agent`、`host → agent`、`agent → host` 均为 0；`src/domain` 不 import `@deepseek-ai/*`；144/144 源文件可达、0 孤儿、0 barrel 链；
144/144 有模块头 JSDoc；导出布局是“目录 = 独立 plugin 导出行”的规则，生成 catalog 有 freshness 门。测试树按 interface 分层，
0 spec 互相 import、0 `.only/.skip/.todo`、0 `vi.mock`，共享 harness 的使用有明确边界。

**P1-1 client 组合根是 398 行 god function。** `src/client/index.ts:89-486` 的 `clientFactory`（内层 `applyInner` 约 380 行）：
41 个 import、11 个 seat 注册（其中 3 个在 `conversation.input.dock` 同一槽）、两个 HTTP client 内联（receipt paging `:266-287`、
ui-mode GET/POST `:392-417`，而 `projection-reader`/`ui-mode` 已经有自己的模块）。该文件 195 次提交、10-01 以来 116 次，
是 client 面（占源码 38%）的唯一咽喉。修法不是重写，是按已有 surface 拆 `mount*`，把两个内联 transport 搬回 owning module；
`clientFactory` 目标 ≤120 行，公开契约不变。

**P2-1 `projection-panel.ts` 805 行 + 902 行镜像 spec。** 单文件含 95 条 CSS、`SimpleFace`/`ActivityFace`/`MatterBoard`/
`ProjectionPanel` 四态、标签表、glyph、分页；spec 48 个 `it()`。seam 已经以函数形式存在，是“拆分等待发生”，不是重写。

**P2-2 client 子目录是文件夹，不是边界。** 7 个二环：`chrome↔rooms` 9/24、`chrome↔projection` 1/18、`chrome↔product` 2/4、
`desk↔projection`、`debug↔projection`、root↔desk/proactive。`chrome/` 17 个文件里 8 个是产品 surface（dashboard、first-mile、
main-view、commands、navigation、approve-mount、brand、ui-mode-row）；`projection/` 11 个文件里 4 个是 dashboard surface。
“首屏住在哪”有四个目录的答案。最便宜的修法是每个子目录一行 README（内容 + 允许的依赖方向）+ 修正入口的 module map；
文件搬家只在 churn 证明值得时做。

**P2-3 agent 面按文件重新变平。** 6 个工具各自一个文件，registration + inline schema + verb switch 都在里面：
`learn/index.ts:216-478`（263 行、8 动词）、`tool-operating:187-451`（265 行、13 动词）、`tool-memory:182-327`、
`tool-research:99-208`；只有 `tool-operating` 拆了 `schema.ts`。加一个动词要读 110–265 行的闭包。
建议在 `tool-support/` 抽共享的 `defineAssistantTool`/verb dispatch，按 `tool-operating/schema.ts` 的形状拆另外 5 个。

**P2-4 rooms 写协议没有 domain owner。** `domain/rooms/projection.ts` 自称“rooms 线格式的唯一 owner”，但只管 read payload；
write 的六个动词在 `host/rooms-route/route.ts:109-180` 与 `client/rooms/room-data-actions.ts:45,69,94,120,143` +
`message-action.ts:30` 各存一份，payload 形状也写了两遍，host 还按错误消息正则映射（`route.ts:98-108`）。
建议加 `domain/rooms/actions.ts`：`ROOM_ACTIONS` union、每动作输入类型、`validateRoomAction`，host/client 消费同一份。

**P3 小项**：`src/client/index.ts:17-22` 的 module map 仍列已删除的 `default panel selection`，漏 `product/` 与 `debug/`；
`tests/support/client-harness.ts:6` 与 `entry.spec.ts:18` 说“每个 client spec 都需要 harness”，实测 18/42；
`tests/tooling/` 44/159 个 spec 测的是仓库脚本，CLI 面 8 个 spec 没有 `tests/cli/` 镜像；
`lib/client` 有 57 个死 chunk（约 396 KB）+ 1.05 MB sourcemap 会随包（P3 载荷）。

## 三、维度 3：文档—执行—验收的整体结构

**判定 8/10。** 五道门（研究 → 定性 → 落地 → 审查/验收 → 归档）、外部结果三要素、`## 验收标准` 的行为/类别/输入状态/通过信号/负例/证据 owner/人判、
收口卡切片台账、`审查：` 三层记录——规则层是完整的；11-03 归档的首屏卡是第一个同时具备这些形状的合规实例。
`notes/` 的“一篇 note = 一个还会被拿来改决定的取舍”与 `/proposed` 毕业规则也立得住。问题在**措辞层的时序**与**doorway 的自增长**：

**P2-1 `去向` 什么时候写：四份文件两种说法。** 窄说：`AGENTS.md:23`「在 issue 定性门 / bug 修复落地出口选」、
`_backlog/AGENTS.md:58`「在 issue 的 `待落地` 或 bug 的 `修复落地` 出口选」。宽说：`_backlog/issues/README.md:79`
（“以后做/不做/已在别处”直接 `推敲中 → 已结`，同样要求 `去向` 已记）与 `_backlog/README.md:37-40`（四种结论都要留去向）。
而 `_backlog/AGENTS.md:37` 明说后三种不经过 `待落地`——于是入口层对大多数卡没有答案。归档统计：117 张卡里只有 13 张带 `去向：`。
修法：把两处窄句改成“结论确定时写（`待落地` 或 `推敲中 → 已结` 的同一次改动）”。

**P2-2 活跃清单被历史摘要淹没，且没有空态。** `_backlog/issues/README.md:5` 的 `## 活跃清单` 现在是空节，
紧接一行约 1.7 KB 的“已结档：……”摘要（10 张已结卡的标题 + 一句话结论），与 `_backlog/_archive/settled_issues/README.md` 重复；
它每结一张卡就长一截（审计窗口内从 1,558 长到 1,756 字符）。读者要在一段历史里确认“现在没有活跃卡”。
修法：删掉摘要（历史的家是归档索引），空节写「（空）」；顺带修 `settled_issues/README.md:19` 行尾多出的 `|---|`。

**P2-3 收据是新的，缺生效日与正确样板。** 117 张归档卡里：`## 验收标准` 44、`切片台账` 20、`去向` 13、`审查` 1
（就是刚归档的首屏卡，形状对）。但规则没说“`审查：`/`去向：` 自 2026-11-02 起生效，旧卡不回填”，
读者无法区分“祖父豁免”和“跳过”；`_backlog/issues/README.md:54` 还把 K4 卡当收口卡样板，而 K4 没有
`外部结果三要素 / 切片台账 / 仍未取`。修法：加生效日一句；把样板指向 `261102-first-screen`。

**P2-4 在飞状态没有可见位置。** 审计开始时首屏卡的切片台账三行全是“待做”，但工作树里 S1/S2 的产物已经在了；
唯一能看出占用的是 `git status`。这不是漏写：`_backlog/AGENTS.md:37` 明说 `待落地` 不追“做到哪”，
且同仓可能有并行会话。两者叠加 = 并行会话之间没有占位机制。**本轮实证**：审计期间另一个会话在同一工作树完成了首屏 S1–S5
并提交 `63a82047`；本审计的 fresh-eyes 报告在 00:39–01:05 之间看到的是半成品树。修法不能加状态词；
可选：切片台账的“已开工”行填 commit 短 SHA/分支名，或硬性要求“开工即一个可回退提交”（硬规则 6 已有此意）。

## 四、维度 4：上下文腐化 / 偏移

**判定 7/10。** 没有高危假话（数据/安全/身份面没有）；notes/backlog 结构干净：`proposed/`、`issues/`、`bugs/` 空；
BUG 028→29 编号自洽；research 只剩 261011（消费者是活触发行，不是孤儿）；首屏研究题已 `已定性` 并归档，链接全通；
取代/收窄指针齐（10-25-delivery、11-01-product-profile、10-23-ui-modes、10-12-backlog）。真正的腐化在**证据面/适配面**：

| # | 级别 | 声明 → 事实 |
|---|---|---|
| 1 | 中 | `docs/architecture.md:338`“会话只有对话/轨迹” → 同文件 `:85-86`、`cordis.patch.yml:487`、`docs/product.md:164` 都写轨迹页 `ui-trajectory` 整行禁用。 |
| 2 | 中 | `docs/release.md:77`“默认部署 = 专用 profile + 安装器” → 同文件 `:16`“可选安装器”、`:58/:82/:133`“安装器仅 shell/自托管”；`docs/product.md:36` 明说“不是 DSH 的默认安装方式”。 |
| 3 | 中 | `snapshots/web-face/product-onboarding/README.md:12,32` 仍要求「稍后」出口 → 代码/期望/`docs/product.md:82` 都已无「稍后」。 |
| 4 | 中 | `blank/banner/desk/Viki` 的 README 手跑 runbook 不含 `assistant-product.onboarding:false` → `web-face-check` 对非产品场景注入该 posture；按 README 手跑会看到门，wait token 永远等不到。 |
| 5 | 中 | `product-workspace-gate/README.md:14`“没有产品 Config 时门必须透明” → `product-onboarding` 与 `docs/product.md:82` 说没有 workspaceDir 必须出现开始页；透明只限 404/传输失败/pending/`onboarding:false`。 |
| 6 | 中 | `docs/discipline.md:61` 适配 10“唯一窄例外 = WeakSet，不持导航偏好、不进入持久存储” → `main-view.ts:22,83-86` 把 `dsha:main-view` 写进 `localStorage`；硬规则 4 要求先登记偏离。 |
| 7 | 低 | `docs/home.md:8`“两个语义文件” → 同文件 `:206`“三个”。 |
| 8 | 低 | `docs/home.md:82` 把 `~/.agents/skills` 记成 400 → vendor `skills.md:73-74`：user-dsh 400 / user-agents 500。 |
| 9 | 低 | `dev/probes/web/web-face-check.mjs:5-6,15-18` 说 `--all` 只加 4 个 Viki → 实际还有 2 个产品面（10 面）。 |
| 10 | 低 | `_backlog/README.md:13` 修复授权例外 4 项 → `_backlog/bugs/README.md:13` 是 6 项（多“入口链”“门禁与验收合同”）。 |
| 11 | 低 | `docs/architecture.md:92`/`README.md:62`“A2 已裁决”无定义无链接 → docs 自己禁裸简称。 |

**为什么这些会累积**：改动发生在 11-01～11-03（发行口径、首屏、dev overlay），改的是硬事实；docs 主体跟得较紧，
漏的是**证据面 README 与 discipline 适配行**——它们不在每次收尾必跑的路径上。`pnpm verify` 的 56 条门禁
（链接、命令互证、身份、note 形状、catalog freshness）全绿，恰好因为这些是**散文语义**，机器看不见。

**notes 的两处低危**：`2026-10-20-six-dimension-improvement.md` 与 `2026-10-28-six-dimension-continuous-improvement.md`
标题逐字相同、互不链接（建议改名或互链）；后者 `:35` 仍说 `--all` 跑“客户面 + Viki”，现在还有 2 个产品面。

## 五、维度 5：测试资产组织 / 测试点 / 覆盖 / 类型

**判定 7.5/10。** 资产量足：159 个 spec / 1,220 个用例 / 22,289 行；按 domain 19、host 36、agent 9、client 42、composition 9、
tooling 44、support 3 harness 分层；另有 10 个 web-face 场景、13 个 eval 任务、19 个 gate 族、18 个 release smoke、31 个 web 探针。
覆盖率 84.00% 行 / 72.56% 分支 / 77.31% 函数：domain 96.0%、cli 92.7%、host 90.9%、client 77.6%、agent 66.1%、dev 10.0%。
没有 `.only/.skip/.todo`、没有 spec 互相 import、没有 `vi.mock`，负例密度高，真 Loader 组合、冻结 v19 home 字节都在。
这是本仓最厚的资产之一。

**P1-1 首屏最核心的 composer 接线没有测试。** `src/client/index.ts:236-241` 通过 `ctx.inject(['conversation'])` 挂
`mountProductInputGate`；`tests/client/entry.spec.ts:154-157` 的 fake scope 返回 `{register}`，`blocks` 是 undefined 直接早退；
`tests/composition/client-entry-lifecycle.spec.mjs` 不 provide `conversation`。**删掉这段接线，全部 vitest 仍绿。**
模块级 `applyProductInputGate`/`mountProductInputGate` 有 fake writer/list 的测试，但没有经过真实入口的 scope 注入。
最高价值的补测：一个 client composition seam spec——真 Cordis + 真 SlotRegistry/LayoutController + `ctx.provide('conversation', { blocks: writer })`，
断言 onboarding/recovery 时 block、ready/404 时清除、新 Session 经 list 订阅被 block、`ctx.fiber.dispose()` 后全清。

**P1-2 真机探针的 `newSessionBlocked` 是假绿判据。** `dev/probes/web/product-first-screen.mjs:100-112` 断言
`[data-composer-seat]` 的 innerText 含门原因；但 dock（`conversation.input.dock`）也渲染在同一个 seat 内
（vendor `ConversationContent.tsx:184` + `InputBar.tsx:520`），两者共享文案。**只有 dock、没有 composer block 也会绿。**
修法：断言 composer 真的 `disabled`/`inert`（或 placeholder/aria-disabled），不要断言 seat 文案。

**P1-3 `build-freshness.spec.mjs` 负载下会红。** 20s/用例（`:23`）在并发全量里超时；单跑 7/7 绿（约 17s，最慢 4.9s）。
审计窗口内两次有负载的全量各红一次；本轮最终全量也红在它（1/1220）。这违反本仓自己的“单跑才绿 = spec 自身缺陷”，
也会让 agent 把“测试挂了”误判成产品回归。修法：把 fixture 的 build 预算抬到与真实 build 相称（如 60s），
或把 7 个用例的 fixture 预构建/共享，只让需要 rebuild 的用例真跑 builder；不要加 retry。

**P2 其他洞**：
- `product-onboarding/README.md` 仍写「稍后」（与期望/代码相反），而 `verify` 的 scene-health 只看 `readyState/console/controls/wait-token`，抓不到；
- `content-drawer.ts` 0% 行、`prompt-bridge.ts` `sendPrompt` 16.2%、`viki-panel.ts` 33.7%、`approve-mount.ts` 30%、`failureMessage` 9 个 code 只测 1 个；
- `agent/learn/index.ts` 30.9% 行 / 27.6% 分支：只测了 `save_page`/`save_skill`，`brief`/`retire_skill`/`promote_page`/`deprecate_page`/`propose_skill`/`land_skill` 的工具层没测；
- 层级混放：`tests/domain/desk-process.spec.ts` 里约 185 行测的是 client 文案；`tests/agent/self-turns.spec.ts` 测 host 机制（头注已解释，可接受但有张力）；
- `tests/tooling` 44/159 个 spec 测仓库脚本，CLI 面没有 `tests/cli/` 镜像（要么建，要么在 `tests/AGENTS.md` 明写例外）；
- 覆盖率报告在 suite 失败时不存在（vitest 行为），恰在需要时缺失；`describe.skipIf(!tools())` 会在缺 openssl/tar 时静默零化 seal 套件。

## 六、维度 6：反馈通路（日志 / 端到端 / 复现）

**判定 6/10，是七维里最低的一维。** 先说不该动的：真页面能看（`pnpm start` 交 URL、preflight 绿、
`webui-shots --dom` 出 PNG + DOM，`readyState=complete`、console/network 干净）；真渲染回归有 10 个 commit 的场景；
`eval` 的 FAIL/BLOCKED/NOT EVALUATED 语义是全仓最诚实的；`webui-expected --refresh` 已有健康门（complete + 两错误列表空 + visibleText 非空）；
`web-face-check` 隔离 home、seed、boot、比对、收，全程不碰日用 `~/.dsh`。

**P0（审计中曾 live，已随 `63a82047` 修）**：`setup.sh` 把 profile patch 写成 `[]`，四个 scene seed 与
`web-face-check` 的 `productOff` 在 `[]` 后追加 block list → YAML 非法（`Unexpected seq-item-ind token "-" at line 7`）→
服务 boot 死在 URL 之前。`web-face-check` 只打印 `service never printed its URL (stderr tail: at composeProfile…)`，
没有 scene FAIL、没有清理、没有剩余场景。整条 seeded 场景车道（banner/desk/product-onboarding/product-workspace-gate +
所有 customer/Viki）都不可用。修复是“替换 `[]`”而不是“追加”，但这套逻辑复制在五处，且没有测试解析生成的 patch。

**P1-1 场景车道不检查 `lib/` freshness。** `web-face-check` 只跑 `prepare.sh` + `setup.sh`，但 preset 行和浏览器 bundle
读的是 built `lib/`；`ensure-build.mjs` 只在 `pnpm start` 里。改完 `src/` 直接跑场景，可能拿昨天的 build 比对（甚至 `--refresh` 把旧 UI 录成新基线），
而且一定绿。当前 lib 是 fresh，所以是潜在陷阱，不是当前假绿。

**P1-2 boot 失败不可读、不清理。** `probe-service.mjs:103` 每个 stderr chunk 覆盖 `bootError`，`:107` 只留最后 400 字符；
真正的 YAML/compose 错误在第一段，留下的是 stack 尾巴。`startProbeService` 的 throw 在 `web-face-check` 里没有 catch，
于是进程从 uncaught 退出：没有 `FAIL <scene>`、没有剩余场景、没有 `rmSync(home)`（实测留下了
`.tmp/web-face-check/product-onboarding-home-*`）。

**P2 假绿/缺口**：
- `normalizeDomEvidence` 把未知字段放进 `unowned`，注释说“新证据通道会变成可见 diff”，但 `compareEvidence` 只遍历
  `COMPARED_FIELDS`——新增一个 `newShotsChannel` 仍 `problems: []`。要么比较 `unowned`，要么拒绝未知字段。
- PNG 只给人看，从不比对；颜色、间距、z-order、裁剪、重叠回归可以在 DOM 文字/控件/圆角高度不变时通过。
- `--refresh` 只要求 complete + 非空 + 无 console/network 错误；一个“完全错误的页面”也能过（实测 `[]`）。
  `WEB_FACE_REFRESH=1 pnpm web-face-check --all` 会一次重写全部基线，没有逐场景 review。
- 无 Chrome / 缺 zstd / 缺 profile 走 `exit 1`（红），不是 `BLOCKED exit 2`；对比 `eval/run.mjs:444`、`prompt-smoke.mjs:35/39`、
  release smokes 的 BLOCKED 语义，这里会让 agent 去修“产品回归”。
- 场景 README 与 runner 脱节（见维度 4 #3/#4/#5）：手跑 README 会红，runner 绿；`product-first-screen` 又被
  `docs/testing.md:25` 列成证据，但 `8a50a074` 的 dev overlay 把 dev 面的门关了，按 `pnpm start` 的 URL 跑会 false-red。
- 没有 symptom→session/prompt/tool-result/UI-frame 的 join 命令：`usage` 聚合无 id 且错误地说日志没有 preset 字段；
  `desk-loop` 用前 8 位、`input-observation` 用后 8 位、`eval` 用前 8 位；`desk-loop` 说“id 可以直接 rg”，但日志是 zstd；
  只有 `loop-probe` 返回 sessionId + 截图，且它断言的是门之前的一页纸，对未绑定产品已过时。
- product scene 的 workspace 固定在 `.tmp/web-face-check/product-workspace`（`web-face-check.mjs:277` + seed），
  并行跑会互相删除；应改成 `dirname(home)/<basename(home)>-workspace`。
- 确定性只做了一半：首个 document 跟随宿主 locale（`webui-shots.mjs:267-272`），`textOutline` 含字体/OS 相关的圆角高度，
  `snapshot.yml` 没有 Chrome/OS/lang 指纹；当前 10 个基线没有时间 token，TZ 暂不是问题。

**P3 小项**：默认 4 vs 广告 10（`pre-push-evidence` 仍写 4 客户 + 4 Viki，漏 2 产品面）；crash 跳过清理；
Viki 固定端口 19433；`prompt-smoke` 的 newest-by-mtime 与 `eval` 的 `fresh.at(-1).sort()` 在并行会话下会选错；
`cdp-driver.close` 是 `chrome.kill()` 不是组杀；`--wait-text ''` 会立即“就绪”。

## 七、维度 7：DSH 插件/Harness 约定

**判定 7/10。** 形态是真的 DSH-native，不是“像插件”：`dsh.bundle.patch`、三平面（host rows / preset / client）、
peer-only 的 14 个 `@deepseek-ai/*` + `engines.dsh` 作为唯一安装门、封闭载荷（tarball 里 0 `.map`、0 `src/`）、
只消费公开 slot/service（`main` 键控槽、`conversation.input.dock`、`ctx.layout`、`ctx.conversation.blocks`、
`connection.fetch.register`、`webserver/index-inject`）、不手写 `dsh.profile.bundles`、不自动导入 seeds、
override ledger + gate、publish-shape 纯函数 + 负例、BLOCKED 如实报。生命周期：安装/初始化/首屏/卸载基本 conformant；
发布有一个真偏离，市场索引未产出（顺序正确）。

**P1-1 `insert` 当 override 用：合树里 6 个重复 row id。** `cordis.patch.yml:15` 的 `insert:` 里，
`session-query-sqlite`、`schedule`、`ui-chat`、`locale`、`tool-skill`、`ui-schedule` 六行与 vendor 同 id。
`insert` 是 append（`vendor/dsh/vendor/include/src/index.ts:92-94`），没有去重警告；重复只在 loader 的
`EntryGroup.update` 里 last-wins（`vendor/dsh/vendor/loader/src/config/group.ts:47-51`）。
实测 `--dump-config` 的 210 个 row 里 `grep '^- id:' | uniq -d` 正好这六个。真正被吞的是 **vendor 行的 config**：
下一次 0.2.x pin 给 `schedule`/`tool-skill` 加字段，会被本包的空 config 静默盖掉。`schedule`/`ui-schedule`
在本 pin 的 web-app 已经有（`:139,:398`），注释里的“schedule-bundle 可选”是旧 pin 的说法。
修法：六行改成 `- id:` 裸覆盖并写全 `name` + `config`；删掉两条多余的 schedule insert；加一个 compose 后
“同 id 出现两次即红”的门禁；把 row id 补进 `docs/product.md` §十 台账。

**P1-2 两个 packer：被 judge 的字节 ≠ 发布出去的字节。** `export-dist.mjs:63-68` 用 `pnpm pack` 并 judge 它；
`bootstrap.mjs:430` 用 `npm pack`；`publish.mjs:87` 让本人跑 `npm publish`。实测 `npm pack` 留下 `workspace:^` peers，
`pnpm pack` 改写成 `^0.2.1-rc.2`。DSH 的兼容门对 `workspace:` peer 有显式 allowlist（`plugin-compatibility.ts:71`），
pnpm 11.28.5 也能装（peer warning），所以今天不致命；但 `_dist` 里的 sha256、手册描述的 tarball、registry 字节
描述的是两份 manifest。修法：要么发布也用 `pnpm publish`，要么让 `export-dist`/`publish` 用 npm pack 并 judge 那份。
pnpm 10.6 下限的真实安装是 **BLOCKED**（本机无 Corepack 网络），不能算绿。

**P2-1 client 构建绕开 DSH 的 client bundling preset。** `src/client/index.ts:135-140` 自己实现了一个
`@deepseek-ai/dsh-client-store`（它其实是平台模块，`vendor/dsh/packages/client/web/src/platform.ts:11`），
bundle 是手写 iife，经 `globalThis.__ModuleLoader__` 注册；同一个根因让 `knowledge-approve-remote` 的 client mount
在严格 codec 下失败（`src/host/knowledge-approve-remote/index.ts:12-18` 自述），但行还挂着、namespace 还发布。
修法：按 vendor 的 `clientBundle()` 形状构建（或至少让 `require('@deepseek-ai/dsh-client-store')` 走平台模块表），
再决定 Remote 是修还是退役。

**P2-2 页面全局单例。** `main-view.ts:44-52` 把 WeakSet 挂在 `globalThis.__DSH_SMART_ASSISTANT_MAIN_VIEW_ROOTS__`；
vendor `vendor/dsh/packages/AGENTS.md` 明说“给共享状态一个 owner，不要新增 global current/active/selection 单例，
`globalThis`/`window.__X__` 是绕过 owner”。同文件 `:83-86` 还把 `dsha:main-view` 写进 localStorage（这是产品偏好，不是 WeakSet 的“不持导航偏好”）。
修法：把“每 root 只恢复一次”的决定挂在 `apply` 创建的 store handle 或 `ctx.effect` 作用域里；如果 HMR 需要跨代，
用平台的服务/注册，不要 globalThis。

**P2-3 模块级可变 store + useState 镜像。** `product-face.ts:42-44` 有 `let store`/`let runtime`/`let generation`，
`:88-98` 又手写 `useProductFace` 把 store 镜像进 `useState`；vendor `client/AGENTS.md` 明说 module-level handles 禁止、
业务组件不该做订阅机制/镜像外部 snapshot。修法：把 store 作为 `ctx.slots.register({ store })` 的 store handle，
或经注入的 hooks compartment 传；不要在模块顶层放单例。

**P2-4 web-only 行不自禁用。** `assistant-product`（`cordis.patch.yml:46-47`）在 headless/SDK/ACP 里必然 pending；
README 把 `disabled: true` 推给用户。平台自己的 idiom 是 `disabled: !!js "ctx.get('profileContext')?.name !== 'desktop'"`
（web-app:47）；本仓以“不靠 optional inject 猜”为由选择了用户补丁。修法：按 `connection`/`workspaceRegistry` 的存在性
做 self-disable，或至少在 README 里把它写成安装后置条件而不是排障项。

**P3 小项**：preset 内联在 488 行 patch 里（vendor bundle 用 `presets/*.patch.yml` + exports）；`_dist/market/` 空、
`npm view dsh-smart-assistant version` 404，而包 README 的 Plugins 页默认写“填 `dsh-smart-assistant`”（应加“尚未发布，先用 tarball”）；
`upgrade-smoke` 的“旧包”是同代码改版本号（自述 synthetic），只证明安装/卸载/数据边界，不证明真实格式迁移；
client bundle 末尾 `sourceMappingURL=index.js.map` 指向的 map 被 `files` 排除，host 请求会 404（cosmetic）。

## 八、横向结论：腐化不是全仓，是三类接缝

1. **高 churn 接缝**：client 组合根（195 次提交）、`docs/architecture.md` / `release.md` / `product.md`、`cordis.patch.yml` 的 vendor 覆盖、
   证据面 README。每次加功能顺手加一行，门禁只保“有”，不保“短/不重复/不反向”。
2. **证据面在 verify 之外**：web-face 10 场景、release smokes、eval、探针都不在 `pnpm verify` 里；
   这是刻意的（Chrome/耗时/key），但代价是**文档与场景合同可以静默腐烂**，只靠人记得跑。本轮 P0 就是一次实证。
3. **手工地板**：`typecheck && test && verify` 是三条命令，没有 single entry；`test` 不 typecheck，`verify` 不 test；
   并行会话没有占位。结果是“红着提交”在一次会话里真的发生了（`63a82047` 的 typecheck/verify 红，`8a50a074`/`7159653a` 才补齐）。

**没有腐化的部分（不要动）**：domain 叶层与跨平面 DAG、owner 表的代码锚、§八 功能路由、notes/backlog 的分类与关闭条件、
生成 catalog 的 freshness、publish-shape 的负例、eval 的 BLOCKED 语义、10 个场景的隔离 home、`.tmp` 纪律。

## 九、改善批次（按优先级；详细验收在收口卡）

> 原则：先修地板与证据面，再修文档漂移，最后动结构；不新增流程层，不重写入口，不预建未触发的车道。

**Batch 0 — 地板（本轮已由并行会话/主线补齐，保留作回归）**
- `pnpm typecheck` / `pnpm verify` 在 `7159653a` 全绿；`pnpm test` 的 `build-freshness` 负载红是下一批要修的。
- 全量 `web-face-check --all` 结果见 §十；以它为准，不以单场景绿代替。

**Batch 1 — 反馈诚实性（最高优先，P0/P1）**
1. `web-face-check` 起手跑 `ensure-build`（或 `lib` 落后即 fail）；`webui-expected --refresh` 同样。
2. `probe-service` 累积 stderr（头+尾），`withService` catch boot throw，打 `FAIL <scene>: <首行>` + 日志路径，
   始终清理（除非 `--keep`），剩余场景继续跑。
3. 抽出唯一“从 `[]` 写 profile rows”的 helper（四个 seed + `web-face-check` 共用），加一条 YAML parse 单测。
4. Chrome/zstd/profile 缺失 → `BLOCKED` exit 2（`webui-shots` 的 no-browser 也区分 2/1）。
5. comparator 比较或拒绝 `unowned`；`--refresh` 改成逐场景 review/`--force`；至少输出一个非阻塞的视觉 artifact。
6. 补 client composition seam spec（真 `ctx.inject('conversation')` + block/clear/dispose）；把 `product-first-screen`
   的 `newSessionBlocked` 改成断言 composer 真禁用。
7. 修场景 README（去「稍后」、补 `onboarding:false`、`mktemp`、与 runner 同命令）；product scene workspace 改成 per-run；
   `product-first-screen` 的 docs 行写清“未绑定产品 home”的 posture。
8. 加 `pnpm session <id|prefix>`（或 `session-logs locate`）打印完整路径 + request/tool 时间线；统一用完整 `session-<uuid>`；
   `usage` 用 `agentPreset` 或删掉错误声明。

**Batch 2 — 文档漂移（P2，机械+语义，一次 verify）**
- `AGENTS.md:9` 默认路径；`docs/release.md:77` 安装器默认；`docs/architecture.md:338` 轨迹页；`docs/home.md` 两/三个文件 + 400/500；
  `web-face-check.mjs` 头注 4 Viki；`_backlog/README.md:13` 授权例外；`A2` 裸简称；`docs/discipline.md` 适配 10；
  `product-onboarding/README.md`「稍后」；两篇同名 note；`2026-10-28` note 的 `--all` 面数。
- `release.md`/`testing.md`/`delivery.md` 加一行「读法」。
- `issues/README.md` 删历史摘要 + 写「（空）」；`settled_issues/README.md:19` 的 `|---|`；`去向` 两处窄句；
  backlog 收据生效日；收口卡样板指向 `261102-first-screen`。
- 常驻入口散文预算：把 `_backlog/triggers.md:20` 的触发落成一条门禁（硬规则 + 探索路由合计 ≤ 阈值，或“规则只写约束 + 指针”）。

**Batch 3 — 结构（P1/P2，独立可回退）**
- 拆 client 组合根（`mount*` per surface；两个内联 HTTP client 搬回 owning module；`clientFactory` ≤120 行）。
- 拆 `projection-panel.ts` 与其 902 行 spec（按已有 Simple/Activity/Board 三态 + styles/paging）。
- rooms write 协议进 `domain/rooms/actions.ts`（union + 输入类型 + validate），host/client 同源。
- agent 工具抽 `defineAssistantTool`/verb dispatch，按 `tool-operating/schema.ts` 拆 schema。
- `tests/cli/` 或明写 `tests/tooling` 例外；修 `client/index.ts` module map 与 harness 头注；包载荷去掉死 chunk/maps。

**Batch 4 — DSH 约定（P1/P2）**
- 六行 `insert` 改裸 `- id:` 覆盖；删多余 schedule 行；加“compose 后同 id 两次即红”门禁；台账补 row id。
- 一个 packer：`pnpm publish` 或让 export-dist/publish 用 npm pack；pnpm 10.6 真实安装补跑（BLOCKED 时如实写）。
- client 按 `clientBundle()` 形状构建；Remote 修或退役；`main-view`/`product-face` 的状态所有权按 vendor 规则改。
- `assistant-product` self-disable；README 加“尚未发布”限定；`_dist/market` 在真发布后生成；升级 smoke 加一个真实旧包 fixture；
  preset 拆 `presets/assistant.patch.yml`（可选）。

**Batch 5 — 入口预算（可并进 Batch 2）**
- 修 `AGENTS.md:9`；把硬规则里的机理搬回 owner（规则 1 的 launcher 行为、规则 8 的 `.tmp` 理由、规则 6 的 `repair-vendor` 范式）；
  目标 ≤16 KB；加散文预算门 + prove-it-red。

## 十、基线读数与残余不确定

**本轮真跑**（2026-11-03，HEAD `7159653a`）：
- `pnpm typecheck` → 绿。
- `pnpm verify` → **56/56**。
- `pnpm test` → **1,219/1,220**；唯一红是 `tests/tooling/build-freshness.spec.mjs` 的 20s 超时（负载敏感）；
  该文件单跑 **7/7 绿，17.4s**。
- `pnpm start` → preflight 绿；`pnpm shots` 出 PNG + DOM；`product-first-screen` 探针在**未绑定产品 home**上 PASS
  （deskGate / noLaterEscape / newSessionBlocked / dockExplains / bindAccepted / reloadStaysInConversation 全 true）。
- `pnpm web-face-check --all` → **PASS，10/10**（4 客户 + 2 产品 + 4 Viki；单独跑、无并发 build）。
  这一条同时纠正了审计早期的一次假红：产品场景在并发 `pnpm test` 的 build 期间跑会超时，单独跑即过——
  场景车道与 build 之间没有锁，是 Batch 1 的候选。
- `pnpm usage` → 482 sessions，126 eval 剔除；输出无 session id。
- 覆盖率（分维审计时跑）→ 84.00% lines / 72.56% branches / 77.31% functions / 80.12% statements。

**残余不确定（不写成绿）**：
- `web-face-check --all` 的 8 个非产品场景本轮只做了全量一次；如果 Red，先按 Batch 1 的诊断修，不按产品回归修。
- pnpm 10.6 下界安装 **BLOCKED**（无 Corepack 网络），不能宣称已验证。
- 真实 npm 发布、市场索引、Windows/Desktop 真机矩阵、0.3.x 兼容：均未跑，按原触发条件。
- 审计窗口内 HEAD 被并行会话推进；本报告的 finding 以 `7159653a` 复核，若后续提交再动 docs/场景，行号会漂。

## 附录：审计方法与分维底稿

- 方法：七路 fresh 只读 subagent（入口链/结构、代码与测试层次、语义漂移、测试资产、反馈通路、DSH 约定）+ 主线逐条对证
  （`pnpm typecheck`/`verify`/`test`/`start`/`shots`/`web-face-check`/`dump-config`/`usage`）+ 真机截图与 probe。
- 分维底稿：`.tmp/seven-dim/01-entry-and-structure.md`、`02-code-hierarchy.md`、`03-context-drift.md`、`04-tests.md`、
  `05-feedback.md`、`06-dsh-conventions.md`（临时目录，不入库；需要复核时用本报告的 `file:line` 对树）。
- 误报纠正：不把“美股/发布矩阵未跑”写成绿；不把“审计员没读到的实现”写成缺陷；不把归档卡里的历史数字当当前事实。
