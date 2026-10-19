---
status: 等人拍板
opened: 2026-10-19
---

# 推敲：维护面收口——面板读真值、直写生效、看得见变化（A 卡：P0）

> 立卡：2026-10-19 ｜ 状态：等人拍板 ｜ 类型：Feature ｜ 可关闭：否 ｜ 毕业：做现在 ｜ 下一步 = 本人一次答复（见下「要你答的三句」），答复前不动手

> **定位：** 本卡是 10-19 自更新统筹件的**总卡兼 P0 收口**。B 卡（[Viki 内容面](261019-viki-content-governance.md)）与 C 卡（[学到的东西看得见](261019-learned-skills-surface.md)）是 P1/P2 的独立卡，共用依据档 [261019-self-update-lanes](../research/self-update/261019-self-update-lanes.md)。
> **授权现状（别读错）：** 本人 10-19 只委托了一件事的判定——**冲突/退役的形状**（"旧记忆如果有冲突旧丢弃…或者退役…你自己判断"），那一格已定案（见「冲突与退役」）。其余五问都是**建议**，不是定案；卡上的建议与顺序**不授予实施权限**（[_backlog/AGENTS.md](../AGENTS.md) 铁律 1）。
> **要你答的三句**（一次答复可同时解锁 A/B/C）：① 顺序认不认（A → B → C）；② Q3 退役 `.desk/state.json` 与 `desk-refresh`（减法，但碰合同与模型可见技能）；③ B 卡口径：越界记录整批清除还是先给你看清单。

**问题与期望结果：** 面对"记忆/知识能不能在面板里维护、SKILL 和 Viki 整体怎么提"，发现面板**读的是拷贝、写的是话**：除知识批准外每个按钮都只往会话里投一句话，面板渲染 `desk-refresh` 技能重写的 `.desk/state.json`，所以批准也要等下一次重写才看见；知识正文不在场（只有 200 字片段），技能只有一个计数。要的是**看得见正文、点完当场变、一眼看到最近变了什么**，并消灭那条造成陈旧的拷贝。
**当前情况：** 事实与诊断见依据档 §一/§二/§三（D1 门禁挂错通道、D3 拷贝即第二份真相、D4 知识正文不在场）。批准直调车道**代码已通、但线上不工作**（261004 卡的实测；见下表第 2 行）——这条决定 A2 的形状与代价。
**下一步：** 等上表三句答复；答复后按 A1 → A2 → A3 推进，每片按 `notes/README.md` §二之三立 proposed 卡（红→绿），不另开总卡。

## 已知与未决

| # | 项 | 状态 |
|---|---|---|
| 1 | 面板逐动作今天走哪条路、滞后多久 | 已取证（依据档 §二，含行号） |
| 2 | "直调服务"这条路今天通不通 | ⚠️ **线上不通**（2026-10-19 重核）：261004 已判 rejected——client 端 `$mount` 强制 strict codec、本包 classic-script 面拿不到 zod/schema；挂载失败被 info 级日志吞掉，面板静默回退指令通道。今天的源码里 `requireStrictCodec` 仍在（`vendor/dsh/packages/api/gateway/lib/types/client/index.js:597-611`），`src-json` 只用于 uplink/result（`types/index.js:672-712`）。→ **A1 走宿主 HTTP 路由，A2 走"客户端直调 + 真机证明挂载成功"** |
| 3 | 外部同类产品怎么处理"面板是拷贝/派生索引" | 已对照（依据档 §四 + [先例档](../research/memory-panel/261019-file-memory-panel-precedents.md)；几百个小文件直播读足够，不为面板先建索引） |
| 4 | Q1 新增权 / Q2 直写深度 | **建议**（见「方案与取舍」），非定案 |
| 5 | Q3 `.desk/state.json` 与 `desk-refresh` 技能退役 | **待本人一句确认**（唯一涉及合同删减与模型可见技能退役的一条） |

## 方案与取舍

三片，一次工期。**模型可见面不是"零变化"**：退役 `desk-refresh` 会动模型可见的策展技能目录（依据档 §一已列），这是**减法**，但要走完整门禁（见验收第 9 行）。

| 片 | 做什么 | 形状要点 |
|---|---|---|
| **A1 读权威** | 宿主新增一条只读路由 `assistantRooms`（**形状照 `desk-projection`**：`ctx.connection.fetch.register` 注册固定 GET，不是 Typert Remote——那条正是不通的），把一个会话工作区下四个房间按房间投影成 JSON；客户端面板改读它；`.desk/state.json` 与 `desk-refresh` 技能退役 | 面板按**数据变**渲染，不按轮数；空控制台契约不变；路由只读、不建文件、不受理任意路径 |
| **A2 直写** | 扩直调车道：记忆纠错/退役、知识批准/过时、技能退役 | **只翻状态 + 改一句记忆文本**（建议 Q2）；**不新增**（建议 Q1，交给 C 卡"记下来"），白名单在 C2 落地时**只**加一条"来源=消息 id 的新建"；每次带 `source: panel-direct` 入审批账，并扩 `recordApproval` 的 kind 闭集（`+ correct / retire`，旧行兼容） |
| **A3 收据** | "自上次以来变了什么"：文件 mtime + `audit/approvals.jsonl` 的纯核 | 不新增 `SessionEvent`；替代"刷新"这个动词 |

**A2 的已知风险与先决证据（这是本卡最大的不确定性）：** 261004 判过这条路"需要上游缝"。A2 的第一步不是写功能，而是**一次探针**：在真机 dev profile 上挂一次贡献、读控制台是否出现 `assistantKnowledge remote mounted`，并证明 `approvePage` 真被调到（宿主侧日志）。**探针红 → A2 整体退回指令通道形态**（保留 A1/A3，A2 降级为"把指令通道的话术收窄 + 直写只做状态翻转的模型路径"），这个降级写在卡上，不临时发明。

**冲突与退役的形状（本人 10-19 委托、已定案，完整论证 = 依据档 §5.3）：**

- **取代**（同一事实新值进来）→ 机器标 `superseded` + 指针，**不删文件**：旧值曾经真过，审计链要留。
- **冲突**（两条矛盾、没有权威谁新谁对）→ 机器**不代删**，并排摆出来 + 一句"以哪条为准"；人点完才变成取代并丢弃另一条。
- **退役**（人判"不该再被用"）→ 真的删除，但**先备份**（房间 `archive/`、Viki snapshot）且**引用证明**（`supersedes`/`supersededBy`/线索指针都不指向它）。

已输掉的做法（逐条在依据档 §5.1）：自由 Markdown 编辑器、面板直调模型 API、每写先排队等人批（候选层）、自动轮询拷贝、统一存储、为面板先建派生索引。

## 验收标准

| # | 行为 / 判据 | 类 | 输入状态与通过信号 | 负例或互补态 | 证据 owner | 人判 |
|---|---|---|---|---|---|---|
| 1 | 面板数据源 = 房间真值 | 编排 | 客户端读路由的取数路径不再解析 `.desk/state.json`：断言落点是 `src/client/**` 零读（`room-data-io`/`room-tabs`/`client/index` 三处引用清除） | 宿主侧**仍可**保留一句历史注释；不要求 `src/` 全域零命中 | `tests/client/client-room-data-io.spec.ts`、`client-room-tabs.spec.ts`（分层见 [docs/testing.md](../../docs/testing.md)） | 无 |
| 2 | 合同与模型面同 diff 收口 | 编排 | 同 diff 删 `presets/assistant/skills/desk-refresh/`、改 `action-plan/SKILL.md:46` 的交叉引用、改 `home-map.ts:66`（家手册 Room data 节）、`operating-brief/index.ts:39`（prompt 句）、`docs/home.md:201`、`docs/architecture.md:262,288`、`docs/dev.md:135`；`pnpm gen-catalog` 后 catalog 无 `desk-refresh` | 反例：任一处漏改 → 门槛 + 人工 grep 双红 | `pnpm verify`（links/catalog freshness）+ `pnpm gen-catalog` diff | 无 |
| 3 | 计数器口径不变 | 确定性 | 空房间 / 只有 draft / 含 deprecated 三案与今天同值 | — | `tests/domain/*.spec.ts`（房间纯核） | 无 |
| 4 | 状态翻转当场生效 | 编排 | 给定路由数据变更，store 在下一轮取数内换组（待审 → 已确立） | **刷新动词消失**：`askRefresh` 不再导出（spec 断言导出表）+ `pnpm web-expected` 场景重录 | `tests/client/client-room-tabs.spec.ts`；`pnpm web-expected` | 无 |
| 5 | 直调真机可达（A2 先决） | 编排 | dev profile 真机：控制台出现 `assistantKnowledge remote mounted`，且宿主日志可见 `approvePage` 调用与台账行 | 红 → 走卡上写好的降级形态，**不得**把指令通道当直调 | `pnpm shots` 控制台证据 + `<dataDir>/audit/approvals.jsonl` 行 | 无 |
| 6 | 直写只做受限动作 | 确定性 | 每个方法白名单校验（id 不存在 / 状态非法 → 拒绝 + 可读原因） | 负例：`新建` 被拒（C2 落地前） | 宿主服务 spec（`tests/host/`） | 无 |
| 7 | 每次直写留痕 | 确定性 | `audit/approvals.jsonl` 追加 `source: panel-direct` + 动作 + id + 前后状态 | 负例：kind 越界被拒；旧行仍可被 A3 读 | `tests/host/` 审批账 spec | 无 |
| 8 | 收据是纯核 | 确定性 | mtime + 台账三案：有新写入 / 无变化 / 只退役 | grep 断言无新 `SessionEvent` 名 | `tests/domain/` 或 `tests/host/` 收据 spec | 无 |
| 9 | 收据零成本 + 面不退化 | 编排 | 真机探针 `dev/probes/web/proactive-idle-probe.mjs`：35s 窗口内会话数不变、无模型回合 | 模型面改动另跑 `pnpm eval`（水位不降） | 探针 JSON 判决；`pnpm eval` | 无 |
| 10 | 交叉检查（prove-it-red） | — | 把面板改回读拷贝 → 第 1 行红；去掉白名单 → 第 6 行红 | — | 本条即证明 | 无 |
| 11 | 收尾 | — | `pnpm typecheck && pnpm test && pnpm verify` 绿；动 client 先 `pnpm build` + `pnpm shots`；动技能/preset 加 `pnpm gen-catalog && pnpm build && pnpm eval`；动发布物加 `pnpm release-smoke` | — | 命令本身 | 无 |

本人的验收面（不代判）：能不能在面板上看到那页正文、点完是否立刻变、"最近变了什么"是否像一句人话。

## 关闭条件

A1–A3 落地（或 A2 按卡上降级形态落地）且上表 1–11 有真证据（spec 名与探针判决记在本卡或指向的提交说明）；`desk-refresh` 与房间数据文件合同同 diff 退役，不留第二份契约、不留悬空交叉引用；本人在真机上确认"读到正文、点完生效、看得见变化"三件事；结论与去向按[关闭条件](../README.md#关闭条件)交接后归档。
