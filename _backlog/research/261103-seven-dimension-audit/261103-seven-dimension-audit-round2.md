---
topic: 技术
intent: "2026-11-03 二轮 fresh-eyes 复评：在一轮收口后的树上重打分，重点找一轮自评看不见的腐化（活跃卡自相矛盾、生成物内容漂移、测试所有权 facade 化、生命周期残留），并给出按授权边界可执行的分批。"
---

# 七维二轮复评（2026-11-03 08:xx）：骨架仍硬，债从"接缝"转到"自述"

> 触发：用户 2026-11-03「还需要持续跟进……作为 fresh agent，你来看所有的内容……先评估这 7 个维度」。
> 方法：本会话 fresh 读入口链 + 代码/测试静态分析（三条只读子审计：入口链语义、代码/测试层次、DSH 约定）+
> 主线逐条复核 + 真机取证（`pnpm verify` 60/60、`pnpm test` 164 文件 / 1,243 用例、
> `pnpm test:coverage` 84.33% 行、`pnpm web-face-check --scenario blank-first-open` PASS）。
> 基线：`0506b135`（工作树干净）。本报告只做证据与判断，不授予实施范围。

## 〇、结论先行

| 维度 | 二轮分 | 一句话 |
|---|---:|---|
| 1 文档/渐进披露 | **A- 8.5** | 入口链仍是全仓最强项；6/13 篇 docs 没有「读法」行，README 把"起服务五步"指到一个把五步路由走的文件，web-only 行名在四处重复。 |
| 2 代码/测试层次 | **B+ 8.0** | 依赖方向与纯核**实测干净**（0 循环、0 反向、0 barrel 链）；但 `assistant-data-bundle.ts` 555 行装 5 个动词，测试所有权 facade 化（5 个高价值模块无 owning spec）。 |
| 3 整体结构 | **A- 8.3** | 五道门、证据地图、验收标准、收口卡台账成立；地板仍是三条手敲命令，没有单一入口（一轮 P1 只修了"绿"，没修"一个入口"）。 |
| 4 上下文腐化 | **B+ 7.8** | 一轮的 7 条语义漂移修了，但**新的腐化长在"收口卡自述"**：B4 仍余 7 项里 6 项已交付、下一步还写"完成 B1 余项"、活跃清单状态与 frontmatter 相反；生成手册的 headless 段落后于 self-disable。 |
| 5 测试资产 | **B+ 7.9** | 164 spec / 1,243 用例 / 84% 行覆盖，分层清楚；但 `assistant_reflect` 8 个动作只测了 2 个，`assistant-product`/`ui-mode` 行 apply 无单测，desk-arms 启动锁无反例。 |
| 6 反馈通路 | **A- 8.5** | 真 Chrome + 真 DOM + 真截图 + `pnpm session` 时间线都在，本会话真跑 `blank-first-open` 过；余项是 10 场景仍靠手跑、不在 `verify`。 |
| 7 DSH 约定 | **A- 8.3** | bundle/patch/preset/client/安装/卸载都有 vendor 锚与登记适配；一个 P2（卸载残留 profile patch）+ 一个 P3（主题 seam 只登记在包级）。 |
| **整体** | **≈8.2 / 10（B+ 偏 A-）** | 一轮的"全 A-"把**已修项**当成了**当前债**；二轮把 D2/D4/D5 拉回 B+。 |

**与一轮的差异**：一轮 7.2 → 收口复评全 A-（8.5）→ 二轮 8.2。差异不在"骨架变差"，而在
① 一轮复评按"本轮修了什么"打分，二轮按"现在还剩什么"打分；② 一轮的 7 条漂移修完后，**收口卡自己**
长出了同形漂移（决策已落地却仍写待做）；③ 一轮说"测试充沛"是按数量，二轮按**所有权**看，发现 facade 偏置。

## 一、七个维度的证据

### 1 文档 / 渐进披露 / 按需加载 —— A- 8.5

**成立的部分**：入口 `AGENTS.md` 13.8 KB / 123 行，只留开工判断、布局、命令、九条硬规则、研发姿态与路由；
`docs/AGENTS.md` 的 owner 表逐行锚到代码/门禁；`docs/architecture.md` §八 功能路由与 §七 三条链路是真正的
"按问题找"；生成物 `package-catalog.md` 的工具×动词表与源码一致（子审计逐条核过 6 工具 / 16 技能 / 10 场景）。
"数字不写进散文、住生成物"这条规则是**真执行**，不是口号。

**新增/未修的缺口**：
- **P2 README 的"唯一清单"指向空手**：`README.md:97` 说"起服务五步……唯一清单 = docs/commands.md"，
  但 `docs/commands.md:11` 把五步路由回根 `AGENTS.md`，正文没有五步块；`docs/dev.md:110` 同。
- **P3 web-only 行名四家**：`packages/.../README.md:18` 与 `:50`、`docs/product.md:86`、`docs/release.md:57`
  各写一遍同一清单；owner 是 product.md，生成物 catalog 已有行名。
- **P3 读法行只覆盖一半**：`architecture/dev/home/delivery/release/testing` 有，`product/commands/discipline/operating/identity`
  没有；`product.md` 167 行、`commands.md` 120 行，读者只能滚文件。
- **P3 schedule 口径**：`README.md:70` "同一组合里还有 `schedule_*`" 与 `:129-130` 的 headless 例外相邻两句。

### 2 代码 / 测试层次 —— B+ 8.0

**代码层次实测干净**（子审计 DFS 全树）：
- `src/domain` 0 个 `@deepseek-ai/*` import；跨平面 import 全部指向 domain；client→host/agent、host→agent/client、
  agent→host/client、cli→client/agent 均为 0；0 个相对 import 循环；
- 21 个 `index.ts` 里只有 `src/index.ts`（12 行）是纯 re-export barrel，其余是服务/插件入口；
- 157 个模块全部可达，22 个"无入边"文件全是 package exports / patch 行入口，不是死代码。

**缺口**：
- **P2 `src/cli/assistant-data-bundle.ts` 555 行装 5 个动词**（export / import / merge / refresh / proposal-archive），
  是唯一真正的 god-module 形态；入口 `assistant-data.ts` 只做再导出，拆分不会动公共面。
- **P1 测试所有权 facade 化**：`src/host/product/index.ts`（60 行）与 `src/host/ui-mode/index.ts`（17 行）的 `apply`
  无任何测试触达（route 有，行注册没有）；`desk-arms.ts:109` 的启动锁没有"双击/第二臂"反例；
  `learn/index.ts` 的 `retire_skill/promote_page/deprecate_page/land_skill` 只经过入口 spec，没有直接断言。
- **P3 测试资产重复**：临时目录 helper 在 `tests/tooling/verify-gates-harness.mjs`、`usage-report.spec.mjs:14`、
  `session-logs.spec.mjs:15` 各写一份；22 个 spec 直接 `mkdtemp`。

### 3 整体结构（文档—执行—验收） —— A- 8.3

**成立**：五道门（研究→定性→落地→审查→归档）在 `_backlog/AGENTS.md` 是状态机，不是口号；每张 issue 有
`## 验收标准`；收口卡有切片台账/仍未取/审查三层；`docs/testing.md` 一页证据地图是唯一表主；
`pre-push-evidence` 技能只写判断规则、不复制表。这一层确实是"结构清晰"。

**缺口**：
- **P1 地板没有单一入口**：一轮把这件事列为 P1（"typecheck/test/verify 三条独立命令，审计窗口内出现过红着提交"），
  B0 只把它们修绿，没有加聚合命令。现在仍是三条手敲；`pre-push-evidence`、`testing.md`、`AGENTS.md`、
  `commands.md` 四处各写一遍"地板 = 三条命令"，既没有单一入口，也没有单一 owner。
- **P2 收口卡有 6 个重叠的状态面**：顶部 A- 表、每维小节、`## 当前情况`、`## 下一步`、`## 切片台账`、
  `## 仍未取`；其中三个在二轮已与台账矛盾（见 D4）。这是结构问题，不只是文风。

### 4 上下文腐化 / 偏移 —— B+ 7.8

**新发现（均带 claim→fact）**：

| # | 严重度 | claim | fact |
|---|---|---|---|
| 1 | **P1** | 收口卡 `:127` "B4 仍余：一个 packer……client bundling/死 Remote……product-face store……README 发布状态……旧包 fixture……重复 id 门禁……" | 这些在本卡自己的台账里已交付：`69668754`（pnpm pack + npm publish 同字节）、`668ca625`（死 Remote）、`70ed3629`（product-face per materialization）、`35b17d1f`（README 发布状态/旧包 fixture）、`21a020d4`（重复 id 门禁）。7 项里 6 项已做，仍写"待做" |
| 2 | **P1** | 收口卡 `:140` "下一步：1. 完成 B1 余项……" | `:121-122` 已写 B1 "基本完成"→"完成"；B1 无余项 |
| 3 | **P1** | `_backlog/issues/README.md:7` "`推敲中`：七维深审的改善批次" | 卡 frontmatter `:2` 是 `status: 待落地`；同一张卡的活跃清单位置与状态相反 |
| 4 | **P1** | `notes/implemented/2026-11-02-distribution-alignment.md` 决定 4 "默认部署 = 专用 custom profile + 安装器" | `docs/release.md:79` "安装器是可选的自托管包装，不是默认路径"；`2026-11-02-bundle-first-lifecycle.md` 已把安装器移出包。该 note 没有"部分收窄"指针 |
| 5 | **P2** | `_dist/安装手册.md` §九 "然后写下面的 profile patch"（含 `assistant-product`/`schedule` disabled） | `packages/.../README.md:50` "五个 web-only 行……自禁用，headless 组合不需要手写 patch"；`export-dist.mjs:537-565` 是同一段旧文案；手册的 freshness 门只钉版本/包名/基线三行 |
| 6 | **P2** | `_backlog/research/261103-seven-dimension-audit/README.md` 结论 "七维各 6–8 分，整体约 7.2/10" | 收口卡复评 "七维全部 A-，整体 ≈8.5"；研究页 `已定性` 但结论与当前卡矛盾，且材料表只列一轮报告 |
| 7 | **P3** | `docs/delivery.md:105` "home 默认在包目录旁边的 `assistant-data/`" | `bootstrap.mjs:128` 只在 standalone 分支这样；product 分支默认 `~/.dsh-smart-assistant`（`docs/product.md:75`）。句子没写模式 |
| 8 | **P3** | `src/client/index.ts:27-31` 模块地图列 `chrome/rooms/desk/projection/proactive/local-state` | 实际还有 `client/product/`、`client/debug/`；地图漏两组 |
| 9 | **P3** | `docs/discipline.md` "已声明的适配" 1–16 在 `:78` 结束，`:124` 又出现 "17." | 17 落在「六层反馈」「三道门禁」之后，从标题不可达；门禁只查文件存在 |

**判定**：没有"全仓假话"；腐化集中在三处**自述面**：收口卡的状态摘要、生成物（手册）的正文、
跨文档的默认路径/归属。这与用户担心的"迭代多了会偏"一致——不是代码错了，是**说代码的那层**没跟上。

### 5 测试资产组织 / 测试点 / 覆盖 / 类型 —— B+ 7.9

**读数**：`pnpm test` 164 文件 / 1,243 用例；`pnpm test:coverage` 行 84.33%、语句 80.42%、分支 72.90%。
分层：domain 20 文件、host 36、agent 9、client 44、composition 9、tooling 46；`tests/support` 4 个 harness。
夹具三家（tests/support、tests/host/fixtures、dev/fixtures）边界清楚，无孤儿夹具。真渲染 10 场景、真安装 smoke 齐全。

**缺口（按影响）**：
- **P1 `assistant_reflect` 8 个动作只测 2 个**：`save_page`/`save_skill` 有断言；`brief`、`retire_skill`、
  `promote_page`、`deprecate_page`、`propose_skill`、`land_skill` 在 `tests/agent/tool-adapters.spec.ts:137` 之外
  没有直接断言（host 服务层有部分覆盖，但适配器的参数映射/输出文案/错误分支没有）。
- **P1 `assistant-product` / `assistant-ui-mode` 行 apply 无单测**：route 核有 spec，`apply` 的
  `connection.fetch.register` / `ctx.effect` / config 读取没有；`pnpm test` 抓不到"行注册坏了"。
- **P2 `desk-arms` 启动锁无反例**：`tests/client/desk-arms.spec.ts` 走的是入口级 harness，没有
  "同一臂双击/第二臂并发"的负例。
- **P2 分支缺口**：`host/operating-ledger/index.ts:272-277` 的 corrupt/not-v1 拒绝；`cli/assistant-data-bundle.ts:130`
  的"导出目标在数据目录内"拒绝；`domain/operating/ledger.ts:561` 的 unknown-operation throw。
- **P3 组织**：`src/cli`（8 文件 / 1,427 行）没有 `tests/cli/` 层，测试全通过 `assistant-data.ts` facade；
  `src/cli` 行覆盖 92.7%，但所有权在 tooling 层，改 CLI 面时证据地图会指错层。

### 6 反馈通路（日志 / 端到端 / 复现） —— A- 8.5

**真跑过的**：`pnpm web-face-check --scenario blank-first-open` → 隔离 home → 真 Chrome → DOM 证据 →
`PASS`（`.tmp/web-expected/.../expected-1600x1000.png` 104 KiB）；`pnpm session` 有真实会话日志可 join；
`pnpm usage` 读到 485 会话 / 126 个评测会话剔除；`web-expected` 失败时 exit 1 + 逐条 diff；
缺 Chrome / 旧 lib = `BLOCKED` exit 2，不冒充 PASS。

**余项**：10 场景默认只跑 4 客户面，`--all` 仍靠人记得；浏览器车道**不在** `verify`（文档已声明是刻意）；
`usage` 在并发负载下 >60s（本会话与 test/coverage 并行时被移到背景），不是门禁但会拖慢诊断。

### 7 DSH 插件 / Harness 约定 —— A- 8.3

**符合（vendor 锚）**：`dsh.bundle.patch` / `dsh.client.platform` / `exports['./client']` 形状
（`vendor/dsh/docs/user/develop/basic/publish.md:42,64`、`docs/subsystems/client-modules.md:94`）；
patch 的 `insert` vs 裸 id 覆盖语义（`publish.md:124-134`）；preset 是普通 `@deepseek-ai/dsh-agent-preset` 行，
registry 默认在 bundle 层（`agent-preset-registry/README.md:46-48`）；首屏挂在 vendor 声明槽
（`sidebar.brand.*`、`conversation.hero.brand.mark`、`sidebar.panellist`）而不是替换壳；无 `postinstall`、
无安装时下载；卸载只回收包与 patch 层（`plugin-manager/README.md:140-160`）；`engines.dsh` 是唯一安装门。
`workspace:^` peer + pnpm pack 具体化是登记过的适配（`docs/discipline.md:42-46`）。

**缺口**：
- **P2 卸载/重装残留**：`bootstrap.mjs:451-456` 检测到旧安装器写的 `agent-preset-registry` profile patch 块时
  **只打日志不清理**；`dsh plugin remove` 也不会清 profile patch。旧装用户 remove 后 profile 仍默认
  `assistant` 但定义已不在；重装时旧块继续压过 bundle 默认。这是用户生命周期面的真实残留，
  但只影响 0.2.0 之前用安装器装过的 home。
- **P3 主题 seam 只在包级登记**：`src/client/chrome/theme.ts:22-37` 每页注入 `<style id="dsha-theme-vars">`，
  这不完全符合 vendor 的"全局样式归 ui-theme / 语义 token"（`vendor/dsh/docs/web-styling.md:11,18`），
  但包级 `AGENTS.md` 规则 4 已把它写成受 AA 测试约束的合同（vendor 色阶缺口）；`docs/discipline.md` 未登记这一条，
  属登记位置差一层，不是未声明的偏离。
- **P3 bins / `dsh.client.inject`**：三个 bin 不在 PATH（`dsh plugin add` 只跑 pnpm），
  `dsh.client` 只写 `platform`、没写 `inject`（合法但 vendor 行通常声明）。

## 二、横向结论

1. **骨架、门禁、依赖方向、真机证据都立住**——二轮没有发现需要推翻架构的东西。
2. **腐化的主战场从"代码接缝"移到"自述面"**：收口卡、生成手册、跨文档默认值/状态。
   这类漂移 `pnpm verify` 看不见，一轮的语义审计也只查入口链、不查活跃卡与生成物正文。
3. **测试的短板不是数量，是所有权**：facade 级 spec 让"入口还能跑"变绿，但模块自己的失败分支没有家。
4. **流程的短板不是门禁，是入口**：三条命令 + 多个状态面，靠人记得；一轮的 P1 只修了"绿"。

## 三、按授权边界的分批

> 一轮收口卡授权："机械/证据修复，不改产品行为；B3/B4 仍需 review 后点名。" 下面 **A/B 批在此范围内**；
> **C 批是结构/行为改动，需 review 后点名**。

| 批 | 内容 | 维度 | 证据 | 边界 |
|---|---|---|---|---|
| **A 真相恢复** | 收口卡状态面收敛（一个停点 + 一个台账）；活跃清单状态与 frontmatter 对齐；安装手册 headless 段改为"仅默认 preset 需要 insert，web-only 行已自禁用"；distribution note 加部分收窄指针；research 题名页指向二轮；README 五步指针；delivery.md standalone 限定；client 模块地图；discipline #17 归位 | D4/D1 | `pnpm verify` + 逐条 claim→fact 复核 | 纯文档/卡，不改行为 |
| **B 地板与证据** | 加根 `pnpm check`（typecheck → test → verify），四处"地板"改指它；补 `assistant_reflect` 6 个动作的适配器断言；补 `assistant-product`/`ui-mode` 行 apply 的注册断言；补 `desk-arms` 启动锁反例；补 ledger corrupt / CLI export-inside 拒绝两个分支 | D3/D5/D2 | `pnpm check` 全绿 + 定向 spec 红绿（先造红） | 测试/脚本，不改产品行为 |
| **C 结构（待点名）** | `assistant-data-bundle.ts` 按 5 个动词拆 `src/cli/assistant-data/*`；卸载残留 profile patch 的清理/拒绝；theme seam 归位或登记；`dsh.client.inject`；`tests/cli/` 层；读法行补齐；web-only 行名去重 | D2/D5/D7 | 全量 + `release-smoke`/`upgrade-smoke`/`web-face-check --all` | 动代码结构/用户生命周期，单独裁决 |

**批 A/B 的完成条件**：`pnpm check` 首次全绿；每条 finding 的 claim 在树上消失或被新事实取代；
新测试在删掉实现时真红（prove-it-red）；报告只列真跑过的命令。

## 四、残余不确定

- `pnpm usage` >60s 是负载还是实现：本会话与 `pnpm test`、`pnpm test:coverage` 并行，未单独计时。
- `learn/index.ts` 的 `brief` 分支持久化面需要真 agent session surface；本轮不造。
- `desk-arms` 启动锁的"双击"是否已有 web-face 场景兜底：场景只跑单次点击，未验证。
- 卸载残留 profile patch 是否会把"缺 preset 定义"变成硬失败：未跑真实 remove/reinstall 循环，只读源码与 vendor 规则。
