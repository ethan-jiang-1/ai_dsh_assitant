---
status: 待落地
opened: 2026-11-03
---

# 推敲：七维打扫卫生——先修证据面，再修文档漂移，最后动结构

> 立卡：2026-11-03 ｜ 状态：待落地 ｜ 毕业：做现在 ｜ 去向：implemented ｜ 可关闭：否
> 来源：[七维深审](../research/261103-seven-dimension-audit/261103-seven-dimension-audit.md)（2026-11-03，7 路 fresh 审计 + 真机取证）
> 授权：用户 2026-11-03「到了打扫卫生的时候了……先评估一下这七个维度……REVIEW 后看看能不能持续改善」= 授权评估与持续改善；
> 二轮按同一授权推进 A（真相恢复）与 B（地板+证据）批——机械/证据修复，不改产品行为；C 批（CLI 拆分 / 卸载清理 / 主题 seam）按用户「继续往前推进」分批推进。
> 2026-11-03 08:xx：二轮七维评估已交用户；用户确认计划并追加「继续往前推进」→ C 批按切片推进。

**问题与期望结果：** 深审确认骨架与依赖方向立住，但三类接缝在持续消耗 agent：①证据面（web-face 场景）不在 verify 里，
曾被一条 YAML 写坏整条打灭；②高 churn 接缝（client 组合根、docs、vendor 覆盖）在长第二份合同/第二份清单；
③手工地板（typecheck/test/verify 三条命令）没有单一入口，审计窗口内真的出现过“红着提交”。
期望的结果：证据面能在无人记得时自己红；文档与代码的当前事实重新对齐；组合根与面板按已有 seam 拆开；
DSH 约定偏离（`insert` 当 override、两个 packer、client 状态所有权）有明确裁决或修复。
**不做**：不重写入口、不新增流程层、不预建 session 回放/性能/CI 矩阵、不把 coverage 设阈值。


## 二轮 fresh-eyes 停点（2026-11-03 08:xx；下表的分数是 **A/B 批前**判定，当前停点见文末）

> 二轮只读审计（入口链 / 代码与测试层次 / DSH 约定三路子审计 + 主线复核 + 真机）见
> [round2](../research/261103-seven-dimension-audit/261103-seven-dimension-audit-round2.md)。
> 基线：`0506b135`；`pnpm verify` 60/60、`pnpm test` 164 文件 / 1,243 用例、coverage 84.33% 行、
> `pnpm web-face-check --scenario blank-first-open` PASS。

| 维度 | 二轮 | 相对一轮收口 |
|---|---|---|
| 1 文档/渐进披露 | **A- 8.5** | 入口链仍最强；6/13 docs 缺读法行、README 五步指针指空、web-only 清单两处（用途不同） |
| 2 代码/测试层次 | **B+ 8.0** | 依赖方向实测干净；但 CLI bundle 555 行 5 动词、测试所有权 facade 化 |
| 3 整体结构 | **A- 8.3** | 五道门成立；地板仍三条手敲命令，没有单一入口 |
| 4 上下文腐化 | **B+ 7.8** | 收口卡自述自相矛盾（B4 仍余 6/7 已做、下一步写 B1、活跃清单状态反）、生成手册 headless 落后于 self-disable |
| 5 测试资产 | **B+ 7.9** | 量足、层清；reflect 8 动作测 2、product/ui-mode apply 无单测、desk-arms 锁无反例 |
| 6 反馈通路 | **A- 8.5** | 真 Chrome/DOM/截图/session join 都在；10 场景仍手跑、不在 verify |
| 7 DSH 约定 | **A- 8.3** | bundle/patch/preset/安装/卸载有 vendor 锚；一个 P2（卸载残留 profile patch）+ 一个 P3（主题 seam 只在包级登记） |
| **整体** | **≈8.2（B+ 偏 A-）** | 一轮"全 A-"把已修项当成当前债；二轮把 D2/D4/D5 拉回 B+ |

### A/B 批后复评（2026-11-03 08:5x；历史）

下表是二轮判定**批前**的分数；A/B 批落地后按同一口径复评：

| 维度 | 批前 | 批后 | 依据 |
|---|---|---|---|
| 1 文档/渐进披露 | A- 8.5 | **A- 8.6** | 5 篇补读法行、README 五步指针修；web-only 清单两处、用途不同 |
| 2 代码/测试层次 | B+ 8.0 | **A- 8.5** | 测试所有权补 5 类；`assistant-data-bundle.ts` 555 行 5 动词仍未拆（C 余项） |
| 3 整体结构 | A- 8.3 | **A- 8.5** | `pnpm check` 单一地板已落地并被本轮真实使用；覆盖面 = 原三条 |
| 4 上下文腐化 | B+ 7.8 | **A- 8.5** | 卡自述/生成手册/discipline #17/delivery 限定/模块地图/research 指针全修；研究页结论保留首轮 7.2，但有明确后续指针 |
| 5 测试资产 | B+ 7.9 | **A- 8.5** | reflect 6 动作、product/ui-mode 行、desk-arms 锁、ledger corrupt、CLI 导出拒绝均有断言；`tests/cli/` 层与 brief 真 agent 分支未做 |
| 6 反馈通路 | A- 8.5 | **A- 8.5** | 未动；10 场景仍手跑、不在 verify |
| 7 DSH 约定 | A- 8.3 | **A- 8.5** | 卸载文档补旧 profile patch 清理、主题 seam 登记 #18；未做自动清理与 `dsh.client.inject` |
| **整体** | **≈8.2** | **≈8.6（全维 A-）** | A/B 批把"自述面"与"测试所有权"两类债收掉；C 余项仍是 A- 的边界 |

### C 代码切片后复评（2026-11-03 09:0x；历史）

| 维度 | A/B 后 | C 后 | 依据 |
|---|---|---|---|
| 1 文档/渐进披露 | A- 8.5 | **A- 8.6** | 5 篇读法行已补；README 五步指针已修；web-only 清单只有包 README 与 product.md 两处、用途不同 |
| 2 代码/测试层次 | A- 8.5 | **A 9.0** | `assistant-data-bundle.ts` 555 行 5 动词已按 verb 拆成 6 个文件（最大 182 行）；公共面仍是 `assistant-data.ts` facade；测试所有权已补 |
| 3 整体结构 | A- 8.5 | **A- 8.6** | `pnpm check` 已是唯一地板并被连续使用；停点/台账已收敛，但卡内仍保留三张历史评分表 |
| 4 上下文腐化 | A- 8.5 | **A- 8.6** | notes 二轮审计发现 bundle-first 决策 6 与 self-disable 相反（本轮修）；其余无已知假话；research 页 7.2 有"首轮判定"标注 |
| 5 测试资产 | A- 8.5 | **A- 8.6** | reflect 6 动作/行注册/启动锁/corrupt/CLI 拒绝均有断言；`tests/cli` 层与 brief 真 agent 分支仍缺 |
| 6 反馈通路 | A- 8.5 | **A- 8.6** | scratch 门禁不再在"删除未暂存"时 ENOENT 崩；真页面车道待本轮 `--all` 读数 |
| 7 DSH 约定 | A- 8.5 | **A- 8.6** | 卸载文档 + 主题 seam 登记已补；自动清理旧 profile patch 未做（需真实旧 home fixture） |
| **整体** | **≈8.6** | **≈8.7（D2 到 A，其余 A-）** | 结构债收口；剩余是证据/生命周期边界，不是骨架问题 |

**C 代码切片（`cb6b25d2`）**：`src/cli/assistant-data/` 六个文件（export/import/merge/maintenance/manifest/shared，最大 182 行）；`assistant-data.ts` 只做公共面再导出；`pnpm check` 全绿；`release-smoke` 的安装/组合/bins 全过（live turn 无 key = BLOCKED exit 2，不冒充绿）；`upgrade-smoke` passed（升级/remove/re-add 两目录数据保留）。

### 9.0 深挖（2026-11-03 09:5x；当前）

三路子审计（notes/backlog 腐化、测试所有权、DSH 生命周期与文档）后，又发现并修了一批；
只有一项把 D7 拉回 B+：

| 维度 | C 后 | 深挖后 | 依据 |
|---|---|---|---|
| 1 文档/渐进披露 | A- 8.6 | **A 9.0** | 读法行覆盖全部合同文档并写进 `docs/AGENTS.md`；`dev.md` 补 §十一；工具/段落计数改指 `package-catalog.md`；安装器残留的卸载承诺改成条件句；identity 的"此处不复制"改成只点名 |
| 2 代码/测试层次 | A 9.0 | **A 9.0** | 无新结构债 |
| 3 整体结构 | A- 8.6 | **A 9.0** | `pnpm check` 单一地板 + `pnpm check:full` 全证据车道（PASS/BLOCKED/FAIL 汇总）；卡内历史评分表已标注 |
| 4 上下文腐化 | A- 8.6 | **A 9.0** | notes 审计 P1 全修（bundle-first 决策 6、活跃清单、卡的人判/仍未取/下一步、receipt 路径、10-20 引用规则、triggers、openviking 遗留句）；历史评分表已标注 |
| 5 测试资产 | A- 8.6 | **A 9.0** | 新增 `brief` 真 session surface、`sendPrompt` 四条分支（含 15-poll 过期）、content-drawer 真 DOM（Escape/teardown）、product-smoke 旧块清理；1,262 用例 |
| 6 反馈通路 | A- 8.6 | **A 9.0** | scratch 门禁不再 ENOENT；`check:full` 汇总不吞 BLOCKED；product-smoke 通过且五行警告消失；真页面 blank-first-open PASS |
| 7 DSH 约定 | A- 8.6 | **A- 8.9** | 旧安装器 profile 块已手术式清理；[BUG-029](../_archive/fixed_bugs/BUG-029-web-only-host-rows-fail-on-tarball-install.md) 已修（五行 `inject` 启动 + headless overlay 显式 disabled）；唯一余项：vendor `remove` 没有 bundle 钩子，0.2.0 前用安装器装过且**不再重跑 bootstrap** 的 home 仍需手删 profile 块——已文档化，本地无更小修法 |
| **整体** | **≈8.7** | **≈8.98（六维 9.0，D7 8.9）** | D7 的唯一 0.1 是 vendor remove 无钩子的旧 home 手删；不是本地代码缺口 |

**BUG-029 的结论**：不是 peer/subpath，而是五行的 `disabled: !!js "!ctx.get('connection')"` 在 entry 创建时
因 `connection` 晚注册而为真，Loader 跳过 entry 且不再启动；启动审计只看到「enabled 无 fiber」，打印无 stack 的
`failed to import`。修复 = 删五行表达式、靠 `inject` 启动；headless 在 profile overlay 显式 disabled。
证据：product-smoke 通过、`dev-task --dump-config` 五行 disabled、one-shot 只剩 MISSING_CREDENTIAL。

**C 余项（不阻塞 A-，下一轮按需）**：
- ~~`assistant-data-bundle.ts` 按 5 动词拆 `src/cli/assistant-data/*`~~ 已完成（`cb6b25d2`；最大文件 182 行）；
- ~~`tests/cli/` 层~~ 评估后不做：CLI 行为 spec 住 `tests/tooling/` 是**已登记的例外**（共用 throwaway 夹具；被测面是 facade，不是浏览器/host 平面），见 `docs/testing.md` 分层表后的 CLI 例外；
- 卸载残留 profile patch 的自动清理（0.2.0 前安装器；当前已文档化手工清理，自动清理需真实旧 home fixture）；
- `dsh.client.inject`：vendor 文档说明它是 client module 依赖边，不是 Cordis 服务清单；本包没有非 baseline 的 module 请求，**不加**（不是债）；
- web-only 清单：包 README 的用户面点名 + product.md 的合同清单，两处用途不同，**不是重复，不合并**。

**当前停点（2026-11-03 11:1x）**：BUG-029 已修并归档；`pnpm check` 1,262 用例 / verify 60/60；product-smoke 通过（五行警告消失、workspaceDir 落盘）；headless 五行 disabled、one-shot 无 pending；`upgrade-smoke` passed、`web-face-check --all/blank-first-open` PASS、`release-smoke` 安装/组合/bins 绿（live turn BLOCKED）。六维 9.0；D7 8.9 的唯一余项是 vendor remove 无钩子的旧 home 手删。下一步：决定 D7 是否按"无本地可修"记 9.0，然后 campaign 收口。B0–B3 已交付。B4 除"preset 拆 `presets/*.patch.yml`（可选）"外均已交付
（packer 由 `69668754` 定为 pnpm pack + npm publish 同字节；死 Remote/product-face/旧包 fixture/重复 id 门禁
均已落地）。二轮 **A 批（真相恢复）** 与 **B 批（地板+证据）** 属一轮授权内的机械/证据修复，本轮直接推进；
**C 批（CLI 拆分 / 卸载清理 / 主题 seam）** 按用户「继续往前推进」分批推进。

## 一轮收口复评（历史，2026-11-03 03:xx）

> 口径：**A** = 无材料性缺口且证据自动；**A-** = 仅余轻微缺口/手工证据，无已知失败；**B+** = 一个材料性缺口（未决真人输入、未门禁化的关键面、或未修复的约定偏离）；**B** = 两个以上材料性缺口。
> 复评基线：`38c70a02`；`pnpm test` 163 文件 / 1,233 用例、`pnpm verify` 56/56、`pnpm typecheck` 绿。

| 维度 | 分数 | 结论 |
|---|---|---|
| 1 文档/渐进披露 | **A-** 8.5 | `8f2f7c62`：入口 23.3 KB → **13.8 KB**，命令表回 `docs/commands.md`、路由回 `docs/dev.md` §十一；≤16 KB 门禁 + prove-it-red（verify 57） |
| 2 代码层次 | **A-** 8.6 | 入口 491→336、`clientFactory` 398→249、`projection-panel` 805→317，schemas/commands/rooms 已归位；余 agent verb switch |
| 3 整体结构 | **A-** 8.5 | 五道门 + 证据地图 + 收口卡台账成立；流程仍有手工/文本重量 |
| 4 上下文漂移 | **A-** 8.5 | 一次 fresh 语义审计 7 项全修（schedule 归属、headless 行、启动编号、`pnpm start` owner、日常四条、YAML §五/七行）；新增非 markdown 段指针门禁 + web-only 自禁用门禁；二轮复评见 round2 |
| 5 测试资产 | **A-** 8.6 | 163 文件/1,233 用例、DOM/行为/web-face 多层；CLI 层组织与覆盖度量仍缺 |
| 6 反馈通路 | **A-** 8.5 | `pnpm session` 时间线 + 真 Chrome/DOM/服务日志；全 10 场景车道仍靠手跑，不在 verify |
| 7 DSH/Harness 约定 | **A-** 8.5 | 裸 id 覆盖、web-only 自禁用、死 Remote、状态所有权、死 chunk、发布真实性、旧包 `--old`、重复 id 门禁、client bundle 偏离登记均收；`69668754` 把发布物统一为 `pnpm pack` 的 `_dist/*.tgz`，`npm publish <tgz>` 发同一字节，packer 差异不再影响发布（安全默认，可回退） |

**整体 ≈8.5（A-）；七维全部达到 A-。**

### D1 → A-（已到）
- `8f2f7c62`：`AGENTS.md` 13.8 KB（目标 ≤16 KB）；命令表回 `docs/commands.md`，探索路由回 `docs/dev.md` §十一；`rootProseBudgetProblems` 门禁 + 2 条 prove-it-red；`pnpm verify` 57/57。
- 余项：入口里的重复事实清理归 D4 的单一事实源巡检（不阻塞 D1 分数）。

### D4 → A-（本轮）
- 一次 fresh 语义审计（read-only，独立上下文）报了 7 项：README 仍称本包挂 `schedule`/`ui-schedule`；architecture 仍称 headless 由 profile 显式 disabled；根启动块 ④⑤ 编号丢失；docs 仍称根拥有 `pnpm start`；`日常四条` 下列了五条；`cordis.patch.yml` §五「根部的两个文件」；YAML 注释「下面四行」实为七行。
- 全修：`fdc33b0a`；`pnpm start` 回到根命令表，手工链补 ④/⑤；`docs/commands.md` 日常四条恢复四条、coverage 单列；YAML 注释同步。
- 机制化：散文预算（16 KB）+ 非 markdown `§` 指针门禁（`docs/<file>.md §N「title」` 对标题）+ web-only 自禁用门禁；`verify` 59。
- 证据：7/7 定向复检绿；`pnpm test` 1,238 绿；二轮复评已返回——收口卡自述、生成手册与跨文档默认值出现新漂移，见 [round2](../research/261103-seven-dimension-audit/261103-seven-dimension-audit-round2.md)。

### D7 → A- 计划（历史；已收口，余项见台账）
- 已交付：pnpm pack 统一发布字节、死 Remote 删除、`product-face` per materialization、README 发布状态、旧包 fixture、重复 id 门禁、web-only 自禁用。
- 仍未取：client bundling 按 vendor `clientBundle()` 重写（C 批，按用户「继续往前推进」评估）。
- 做法：① 出 packer 决策简报（唯一真人输入，pnpm vs npm）；② 按 vendor `clientBundle()` 改 client 打包，删/证明死 Remote；③ 把 `product-face` store 改成每 materialization 一个 owner，去 `useState` 镜像；④ 对齐 README 发布状态，补旧版本 tarball 升级/卸载 fixture；⑤ 把 `--dump-config` 的重复 row id 检查接进 verify。
- 证据：干净安装/升级/卸载 + `pnpm start`/真 Chrome、`release-smoke`、`product-native-smoke`、`web-face-check --all`。

> Goal：`goal-0457ded3-6496-4297-ad6b-3cc2d73e7abc`（revision 2，40 轮）已把验收线改为“全维 ≥ A-”；D1 已到线，D4/D7 为当前两个低于线维度。

## 一轮基线（历史，证据在深审报告里）

- 维度分：1=7.5、2=7.5、3=8、4=7、5=7.5、6=6、7=7；整体 ≈7.2/10。
- P0（审计中已修）：scene seed / `web-face-check` 的 `productOff` 在 `[]` 后追加 block list → 生成的 profile patch 非法 YAML，
  整条 seeded 场景车道 boot 失败；修复在 `63a82047`，无回归测试、同样逻辑五处。
- P1：`insert` 当 override 用（6 个重复 row id，后者静默覆盖 vendor config）；两个 packer（judged 字节 ≠ published 字节）；
  client 组合根 398 行 / 195 次提交；首屏 composer 接线无测试、探针 `newSessionBlocked` 可被 dock 满足；
  `build-freshness` 负载下超时；`AGENTS.md:9` 默认路径与 owner 相反；根入口 5 天 +8.1%。
- P2：`去向` 时机两种说法；`issues/README.md` 历史摘要 1.7 KB 占据活跃清单；收据缺生效日；
  `product-onboarding/README.md` 仍写「稍后」；场景 README 缺 `onboarding:false`；`discipline.md` 适配 10 未改；
  `main-view`/`product-face` 违反 vendor 状态所有权；web-only 行不自禁用；市场/README 发布状态不一致。
- P3：57 个死 client chunk + 1.05 MB map 随包；`tests/tooling` 与 CLI 层不对齐；module map 过期；note 同名；A2 裸简称。

## 方案与取舍

按“先证据、后文档、再结构、最后 DSH 约定”的顺序，五个可独立回退的批：

| 批 | 内容 | 为什么这个顺序 |
|---|---|---|
| B0 地板 | 已由 `63a82047`/`8a50a074`/`7159653a` 补齐：typecheck/verify 绿、scratch 路径、dev overlay | 没有绿地板，后面所有证据都不可信 |
| B1 反馈诚实性 | `ensure-build`、boot 诊断/catch/cleanup、Chrome/zstd/profile BLOCKED、`[]` helper + YAML 单测、comparator `unowned`、逐场景 refresh、client composition seam spec、probe 断言 composer、scene README、per-run workspace、session join | 这是本轮唯一 P0 的出生地，也是“agent 抓瞎”的直接来源 |
| B2 文档漂移 | 深审 §四 的 11 条 + `去向` + 活跃清单 + 收据生效日 + 读法 + 入口散文预算 | 机械/语义可一次 verify 收口，不改变行为 |
| B3 结构 | client 组合根拆 `mount*` + 两个内联 transport 归位；`projection-panel` 拆三态；rooms write 进 domain；agent 工具抽 dispatch；`tests/cli/` 或例外 | 高 churn 接缝，需要独立可回退的切片，不与证据面混 |
| B4 DSH 约定 | `insert`→裸 id 覆盖 + 重复 id 门禁；一个 packer；client 按 `clientBundle()`；状态所有权；web-only self-disable；README 发布状态；真实旧包 fixture；preset 拆分（可选） | 会影响组合/发布形态，必须单独裁决与验证 |

**输掉的方案**：
- **一次性全改**：跨证据面/结构/发布，无法逐片回退；用户明确要求“先挖透再改善”，分批才看得清每批的证据。
- **只修文档、不修证据面**：文档会再次与场景脱节；P0 的根因（五处复制 + 无 parse 测试）还在。
- **把 web-face 塞进 verify**：Chrome/耗时/key 成本高，且会重演“跳过即绿”；正确做法是独立车道 + 单一命令 + BLOCKED 语义。
- **为并行会话加一个 `落地中` 状态词**：违反 `_backlog/AGENTS.md:37` 的“不追做到哪”；用切片台账的开工锚点/提交锚点解决。
- **把 `insert` 全部改成 `append` 新 id**：会改变组合身份（`--dump-config` 的 row id），下游 patch 落空；应改成裸 `- id:` 整行覆盖。
- **给 coverage 设阈值**：没有“删了才对”的死代码实证；阈值只会逼出凑覆盖。

## 外部结果三要素

- **触发**：用户 review 七维报告后点名某一批；或证据面再次因同形改动打灭；或 DSH 约定偏离在真实安装/boot 上显形。
- **用户看到/得到**：证据面能用一条命令真跑真比对，失败有可读原因；文档与代码当前事实一致；client 组合根不再每次都被打开；
  `--dump-config` 不再有静默覆盖；发布字节与判据字节一致。
- **完成条件**：本卡 `## 验收标准` 全过；每批的机械地板（typecheck/test/verify + 受影响车道）有真跑读数；
  文档/合同与代码同 diff；证据进 `## 切片台账`。

## 验收标准

| # | 行为 | 类别 | 输入状态 | 通过信号 | 负例/恢复 | 证据 owner |
|---|---|---|---|---|---|---|
| 1 | 场景车道在 `lib/` 落后时不会假绿 | 确定性 | 改 `src/` 不 build，跑 `web-face-check` | 命令在 provisioning 前失败并提示 `pnpm build`（或自动 build） | lib fresh → 正常跑；缺失 build 不应被记成场景红 | `dev/probes/web/web-face-check.mjs` + 一条 compose/parse spec |
| 2 | 场景 boot 失败可读且可清理 | 编排 | 造一个非法 profile patch | `FAIL <scene>: <首行>` + stderr 日志路径 + home 清理；剩余场景继续 | `--keep` 保留现场；成功场景不受影响 | `probe-service` + `web-face-check` 的负例夹具 |
| 3 | 生成 profile patch 永远可解析 | 确定性 | 空 `[]` profile + 每个 seed/`productOff` | YAML parse 测试绿；五处共用同一 helper | 追加到 `[]` 的旧写法 → 红 | dev/probes/web/scene-home.mjs（新增，待建）+ `tests/tooling/` spec |
| 4 | 缺 Chrome/zstd/profile = BLOCKED | 环境 | `PATH` 无 Chrome / 无 zstd | `BLOCKED` + exit 2，不打印 passed | 有 Chrome → 正常 PASS/FAIL | `webui-shots` + `web-face-check` + `webui-loop-probe` |
| 5 | 未绑定 composer 真被禁 | 编排（client） | 真 `ctx.inject('conversation')` + onboarding | block writer 收到 session id；composer disabled/inert；dispose 后清除 | ready/404 → 不 block；dock 单独存在不算数 | `tests/composition/client-entry-lifecycle.spec.mjs`（扩）+ 探针 |
| 6 | `--refresh` 不会把坏状态录成基线 | 编排 | 错误页面 + wait token | 逐场景 `--refresh --reviewed`/`--force`，输出 diff；默认拒绝 | 健康页面 refresh 成功；reviewed 记录可审计 | `webui-expected` + `web-face-check` |
| 7 | 症状可 join 到会话/日志 | 编排 | 给定 session id/前缀 | 一条命令打印完整路径 + request/tool 时间线；id 格式统一 | 不存在 id → 明确 not-found，不猜 | `dev/lib/session-logs.mjs` + `package.json` script |
| 8 | 文档与当前事实一致 | 确定性 | 深审 §四 的 11 条 | `pnpm verify` 绿 + 逐条 claim→fact 复核 | 旧句保留 → 审计复现 | docs/README/scene README 同 diff |
| 9 | 组合根不再 god function | 结构 | 改任一 client surface | `clientFactory` ≤120 行；`mount*` 单测/入口 spec 不变；`entry.spec` 全绿 | 任何公开注册面变化 → `entry.spec` 红 | `src/client/index.ts` + `tests/client/entry.spec.ts` |
| 10 | `insert` 不再静默覆盖 | 约定 | `--dump-config` | 合并树无重复 row id；裸 `- id:` 覆盖带完整 `name` + `config` | 重复 id → 新门禁红 | `cordis.patch.yml` + `scripts/checks/gates/overrides.mjs`（扩） |
| 11 | judged 字节 = published 字节 | 约定 | `export-dist` / `publish-release` | 同一 packer；sha256/手册/registry 描述同一 manifest | 两个 packer → 负例 red | `scripts/release/*` + `install-parity` |
| 12 | client 状态有 owner | 约定 | 两次 materialization + HMR | 无 `globalThis.__…__` 单例；store 经 slot/handle；HMR 不重选 | 模块级单例 → 断言红 | `main-view`/`product-face` + composition spec |

人判：B4 的 client bundling 改法仍是可选，需本人拍板；发布渠道已由 `69668754` 定为 pnpm pack + `npm publish <tgz>` 同字节，不再是待判项。
（按 [`validation-design`](../methods/validation-design.md)；行为/类别/输入状态/判据/负例/证据 owner/人判）

## 切片台账

| 片 | 状态 | 证据 |
|---|---|---|
| B0 地板 | 已完成（并行会话 + 主线） | 当前：`pnpm typecheck` 绿；`pnpm verify` 60/60；`pnpm test` 163 文件 / 1,243 用例绿；`pnpm web-face-check --all` **PASS**（客户 + 产品 + Viki 全场景，`2188fad6` 后复跑）；`pnpm start` preflight 绿；`pnpm upgrade-smoke`、`pnpm publish-release -- --skip-verify` 预检绿。基线 `7159653a` 的 1/1220 红是 load-sensitive build-freshness，已由 60s budget 治 |
| B1 反馈诚实性 | 基本完成 | `45a97abb`：`scene-home.mjs` 单一 patch writer + YAML parse spec；`web-face-check` 起手 `ensure-build`、Chrome 缺失 BLOCKED 2、provision 失败 BLOCKED 2；`probe-service` 头+尾 stderr + sibling log、child 退出即停、`withService` catch 不中断剩余场景；`product-first-screen` 断言 composer 真禁用 + placeholder；`webui-shots`/`webui-expected` 的 no-Chrome 2/1 区分；`build-freshness` 20s→60s（budget，不是 retry）。`dbcb4a8d`：comparator 比较 `unowned`。`a9dd7212`：真 Cordis + conversation blocks 的入口接线 spec（删除入口 `ctx.inject` 块即红）。`1d6d41bf`：`pnpm session <id|prefix>` 时间线（symptom→session join）；`--refresh` 必须显式 `--scenario`，拒绝 `--all` 批量重录；product scene 的 workspace 改 per-run parent（叶子仍叫 `product-workspace`，并发不互删） |
| B1 仍余 | 完成 | `a6650ae2`：四个非产品场景 README 加 posture 指针；`--scenario` 缺值 / 空 `--wait-text` 的 CLI 洞已关。B3/B4 之外没有 B1 开口（refresh review / session join / per-run workspace 已交付） |
| B2 文档漂移 | 基本完成 | `d477076f`：11 条漂移（轨迹页/安装器默认/两三个文件/400-500/`--all` 10 面/授权例外/A2/`discipline` 适配 10）+ `AGENTS.md:9` 默认路径 + `去向` 时机 + 收据生效日 + 收口卡样板 + 读法三篇 + note 同名互链/面数 + 产品失败模式行 + 场景 posture 中心说明 |
| B2 仍余 | 完成 | `8f2f7c62`：常驻入口 13.8 KB + ≤16 KB 门禁 + prove-it-red；命令/路由参考移出常驻面 |
| B3 结构 | 进行中 | `0afdefea`：ui-mode HTTP transport 与 receipt archive paging 从入口搬回 owning module；两处新 spec（HTTP remote / receipt page）。`a4cc318d`：`mountCommands` 提取到 `chrome/commands.ts`，入口只传 room opener + activity 回调；新增 dispatch 单测。`797e330d`：`mountRoomTabs` 提取到 `rooms/mount-rooms.ts`（desk load + settle refresh + "+" guides + tab bodies）。`fe9e2f32`：product face（route runtime / binding store / conversation block）提取到 `product/mount-product.ts`，入口只留 dashboard 包装与 dock 注册。`115e94f5`：dashboard `main` 槽（inject 面 / keyed 注册 / restore+track）提取到 `projection/mount-dashboard.ts`；`index.ts` 491→336 行、`clientFactory` 398→249 行。`4375de70`：rooms 受控写的六个动词、字段校验与错误到 HTTP 状态的映射收进 `domain/rooms/actions.ts`；host route 与 client `postRoomsAction` 同源；新增 3 条 domain 测试。`d39fe3f7`：五个 agent 工具的 output schema 从 `index.ts` 收进各自 `schema.ts`（沿 `tool-operating/schema.ts` 先例），五个 index 共 -213 行；`pnpm prompt-smoke` 六工具仍全在。`b44df4b5`：CSS 95 条 → `panel-styles.ts`，`SimpleFace` → `simple-face.ts`，共享 `DeskData`/`STATUS_LABEL` → `panel-shared.ts`。`96e94fbd`：`ActivityFace` → `activity-face.ts`、`MatterBoard` + 专属 helpers → `matter-board.ts`；`projection-panel.ts` 805→317 行；desk 场景 PASS。`47786bae`：spec harness 抽到 `tests/support/projection-harness.ts`，`projection-panel.spec.ts` 902→612 行，新增 `simple-face.spec.ts`/`matter-board.spec.ts`；163 文件 / 1,233 用例绿。仍余：agent verb switch dispatch、`tests/cli/` |
| B4 DSH 约定 | 进行中（D1/D3/D7 已交付） | `bd966d87`：`session-query-sqlite`/`ui-chat`/`locale`/`tool-skill` 从 `insert` 改为裸 `- id:` 整行覆盖；`tool-skill` 显式 `disabled: false`；删掉与 web-app 重复的 `schedule`/`ui-schedule` insert；`--dump-config` 0 重复 row id、`tool-skill` enabled、ui-chat/locale config 在场；`preset-composition.spec` 的 strict patcher seed 了这四行；`pnpm start` preflight 绿 + blank 场景 PASS。台账/架构树同步。`eb331dbd`：D3 — `main-view` 去掉 `globalThis.__…__`，改按 Client root 键控的 WeakMap 恢复门（新页面根重新开始，HMR 靠记住的 chat 偏好），`discipline` 适配 10 同步。`3f55bcb7`：D7 — 五个 web-only 行（product / desk-projection / ui-mode / rooms / viki）在 bundle patch 里按 `!!js "!ctx.get('connection')"` 自禁用；headless overlay 不再手写这些行；`pnpm dsh --profile dev-task` one-shot 只剩 MISSING_CREDENTIAL，无 pending；`pnpm start` preflight 绿；catalog 重生成。`65bd4ef2`/`850ca79b`：web-only 自禁用门禁 + 2 条红绿夹具（verify 58）。`70ed3629`：`product-face` 从模块级 store 改成每 materialization 一个 `ProductFace` handle，gate/dock/first-mile 都显式拿同一 handle；新增两 materialization 独立测试；product onboarding/workspace-gate 真机场景 PASS。`4c352324`：client 构建后 prune 256 个不可达 tsc chunk（260→4 文件，1.1 MB 只剩 index + map/d.ts 伴生），build 脚本 + 2 条红绿测试。`21a020d4`：新增 insert/override 行形门禁（insert id 不得与 vendor base/web-app 重复；bare override 必须命中 vendor；同 id 不得重复），读真 vendor patch + 红绿夹具（verify 60）。`668ca625`：client inject 去掉未消费的 `remote.agentPresets`/`remote.workspaceFiles` 两条死车道。`a4a837ea`：新增 `pnpm pack-parity` 诊断——pnpm pack 与 npm pack 的 `package.json` 不一致（pnpm 把 `workspace:^` 改写成版本并去掉 scripts；npm 保留 workspace 协议/scripts），**这是 packer 决策所需的实证**；未改发布路径。`35b17d1f`：包 README 的安装/升级命令改为 tarball 优先（尚未发布到 registry），headless 行改为五 web-only 行自禁用；`upgrade-smoke -- --old <上一发布 tgz>` 支持真实前版字节（合成 predecessor 仍跑通）。`fa58a505`：`docs/discipline.md` 适配 17 登记 client bundle 的本地 IIFE + facade 契约（vendor preset 不发布；无 CSS/asset 输入）。`69668754`：发布物统一为 `pnpm pack` 的 `_dist/*.tgz`，`publish.mjs` 用 `npm publish <tgz>` 发同一字节；`publish-release -- --skip-verify` 预检绿并打印真实发布命令 |
| B4 仍余 | 已收口 | packer 已定（`69668754`：pnpm pack + `npm publish <tgz>` 同字节）；死 Remote（`668ca625`）、`product-face` per materialization（`70ed3629`）、README 发布状态/旧包 fixture（`35b17d1f`）、重复 id 门禁（`21a020d4`）均已落地。仅余**可选**的 `presets/*.patch.yml` 拆分与 C 批 client bundling 重写 |
| 二轮 A 真相恢复 | 完成（`95cf7c18` 记录，`90f5fb07`/`b5344909` 文档与手册） | 收口卡停点/台账收敛；活跃清单 `待落地`；安装手册 §九 改为"仅默认 preset 需要 insert，web-only 行已自禁用"（`export-dist.mjs` + `_dist/安装手册.md` 重生）；distribution note 加部分收窄指针；research 题名页/索引挂二轮；README 五步指针与 schedule 口径；delivery standalone 限定；client 模块地图补 product/debug；discipline #17 归位 |
| 二轮 B 地板+证据 | 完成（`90f5fb07` 地板，`6e9b1fb0` 测试） | `pnpm check`（typecheck → test → verify）全绿：1,255 用例、verify 60/60。新增断言：`assistant_reflect` 的 promote/deprecate/retire/propose/land/brief 与缺 sources 负例（`tests/agent/tool-adapters.spec.ts`）；product/ui-mode 行注册+dispose（`tests/host/*-route.spec.ts`）；desk-arms 启动锁双击反例（`tests/client/desk-arms.spec.ts`）；ledger corrupt/not-v1 拒绝（`tests/host/operating-ledger.spec.ts`）；CLI 导出目标在数据目录内的拒绝（`tests/tooling/assistant-data.spec.mjs`） |
| 二轮 C 代码切片 | 完成（`cb6b25d2`、`0888a4c3`） | CLI bundle 拆 6 文件（最大 182 行）；scratch 门禁不再 ENOENT 崩；`--all` 摘要补 product；`tests/cli` 登记为例外；auto-cleanup 决策 = 文档化手工清理（需真实旧 home fixture 才做自动）。`pnpm check` 1,255 用例 / verify 60/60；`release-smoke` 安装/组合/bins 绿 + live turn BLOCKED（无 key, exit 2）；`upgrade-smoke` passed；`web-face-check --all` PASS（customer + product + viki） |
| 收口 | 待做 | 决定 note、卡归档、research 归档、清单同步 |

## 仍未取

- **B4 的 client bundling 改法**：按 vendor `clientBundle()` 重写构建，还是先修 module-table request？后者能救 Remote，但需要先证明 `@deepseek-ai/dsh-client-store` 在干净安装里可解析；前者会动构建链，风险更大。
- **pnpm 10.6 下限**：本机无 Corepack 网络，BLOCKED；真实安装矩阵要另找环境。
- **并行会话占位**：切片台账的“开工锚点”是否作为常设纪律（不加状态词），待 B2 与用户一起定。
- **测试地板偶发（已修）**：`host-harness` 的 `memoryPool` 现在在删 home 前 dispose 自己的 Context（`e73f69ea`），`knowledge-curation` 单跑 5 次 + 全量 2 次绿；不再依赖 `rmSync` retry 掩盖竞态。

## 下一步

A/B/C 已交付；只剩 **收口**：写 implemented note（只留决定与输掉的方案）、卡归档、research 题归档、
两边清单同步。C 的残余（client bundling、legacy 自动清理的真实旧 home fixture）是独立可选片，不阻塞收口。
