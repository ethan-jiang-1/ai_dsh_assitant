---
status: 已结
opened: 2026-10-19
---

# 推敲：维护面收口——面板读真值、直写生效、看得见变化（A 卡：P0）

> 立卡：2026-10-19 ｜ 状态：已结 ｜ 类型：Feature ｜ 可关闭：是 ｜ 毕业：做现在 ｜ 结论（2026-10-20）= **A/B/C 已结**：A1a/A2/A3 真机验（知识室正文、批准 9→8 + 审批账、收据/已读）；A1b 探针 PASS；B/C 见各卡。外部剩余 = 右栏 vendor seat（浏览器 tab 盲区）与 B4 真数据（本人另一工作区）。去向 = campaign close note + 三卡归档
> **定位：** 本卡是 10-19 自更新统筹件的 **P0 总卡，兼维护面 IA / route 契约的 owner**；授权后转为该战役的收口卡（切片停点与证据住本卡）。B 卡（[Viki 内容面](261019-viki-content-governance.md)）与 C 卡（[学到的东西](261019-learned-skills-surface.md)）是独立卡，共用依据档 [self-update/261019-self-update-lanes](../research/self-update/261019-self-update-lanes.md)。
> **授权现状（别读错）：** 本人 10-19 委托了**冲突/退役的形状**（那一格已定案，见「冲突与退役」），并在 2026-10-19 以「落地计划」授权按本卡 v2 的切片顺序实施；**A1a/A2/A3/A1b 与 B/C 全部切片已交付**（逐片 note 在 `notes/implemented/2026-10-19-*.md`）。剩余是 campaign close 的**凭据/人判/B4 真数据**，不是新功能。
> **待你拍板项已按 2026-10-19「落地计划」与后续「主动往前跑」指令采用默认（still vetoable）：** ② Q3 = **退役** `.desk/state.json` 与 `desk-refresh`（A1b）；③ B 清理 = **先 dry-run 清单、确认后整批清除**（B4 的真数据仍由本人执行并回填回执）。当前不再重复提问。
> **默认值（agent-selected，vetoable；2026-10-19「落地计划」已采用，still vetoable）：** 面板 IA 四 tab——记忆 / 知识 / 技能 / Viki，research 仍是房间、不单开 tab；C2 v1 只做 **assistant 消息**的"记下来"；A3 baseline = "自你上次打开维护面板以来" + "全部标为已读"；C1 成本列 v1 省略（或只报 always-on 字节估算，不用整份 `SKILL.md` 冒充）；B 删除回执带 commit id + 一个"恢复这次删除"的动作；A2 传输由 Step 0 探针决定（strict codec 优先，不能挂走 host POST，**绝不回退 prompt**）。
> **2026-10-19 复审重写：** 修正 A1 真值源（working folder，不是会话工作区）、A2 传输前提（strict codec 可手写；261004 的"需要上游缝"结论不成立，待真机探针）、A3 baseline、退役清单与验收；依据档 [§九](../research/self-update/261019-self-update-lanes.md#九2026-10-19-复盘更正) 同步更正。

**问题与期望结果：** 面对"记忆/知识能不能在面板里维护、SKILL 和 Viki 整体怎么提"，发现面板**读的是拷贝、写的是话**：除知识批准外每个按钮都只往会话里投一句话，面板渲染 `desk-refresh` 技能重写的 `.desk/state.json`；知识正文不在场（只有 200 字片段），技能只有一个计数。要的是**看得见正文、点完当场变、一眼看到最近变了什么**，并消灭那条造成陈旧的拷贝。

**当前情况：** 事实与诊断见依据档 §一/§二/§三。三条经复审确认的硬事实：

1. **四个房间的真值在 assistant working folder**（`<dataDir>/memory|research|skills|knowledge`，默认 `<dshHome>/assistant`），**不是会话工作区**；`.desk/state.json` 是模型写在 session workspace 的拷贝（读取点 [`room-data-io.ts:77`](../../../packages/dsh-smart-assistant/src/client/rooms/room-data-io.ts#L77)）。[`docs/operating.md:86`](../../../docs/operating.md#L86) 的"working folder 根"与 `desk-refresh` 技能的"session workspace"互相矛盾——A1a 顺手修掉。
2. **知识正文不是缺 host API**：`listKnowledge()` 返回 `KnowledgePage.body`，`readKnowledgePage()` 还带反链（[`knowledge-room.ts:164`](../../../packages/dsh-smart-assistant/src/host/knowledge-room.ts#L164)、[`host/index.ts:270`](../../../packages/dsh-smart-assistant/src/host/index.ts#L270)）。缺的是**客户端展示**（抽屉/正文）。
3. **直调车道的失败点已定位到 codec 形状，不是"classic script 拿不到 strict codec"**：strict codec 只是 `{ mode: 'strict', typeSymbol, create(): { parse } }`（[`types.ts:326`](../../../vendor/dsh/packages/typert/protocol/src/types.ts#L326-L361)），`create()` 直接调用（[`gateway/src/index.ts:1671`](../../../vendor/dsh/packages/api/gateway/src/index.ts#L1671)），**不需要 zod/模块表**；`requireStrictInputs` 只查 parameter/uplink/context，不查 result（[`client/index.ts:803`](../../../vendor/dsh/packages/api/gateway/src/client/index.ts#L803-L818)）。现有贡献把 **parameter** 写成 `{ mode: 'src-json' }`（[`approve-mount.ts:31`](../../../packages/dsh-smart-assistant/src/client/chrome/approve-mount.ts#L31-L42)），这才是挂载失败的直接原因。**A2 第一步是 codec 探针**；能挂则沿用现有 namespace，不能挂则 host POST，均不回退 prompt。

**下一步：** A1a/A2/A3/A1b 与 B1/B2/B3 已交付；B4 脚本/试跑已交付（真数据本人）；下一片 **C1/C2**；人判收口在 campaign close。

## 已知与未决

| # | 项 | 状态 |
|---|---|---|
| 1 | 面板逐动作今天走哪条路、滞后多久 | 已取证（依据档 §二，含行号） |
| 2 | "直调服务"这条路今天通不通 | **代码级阻塞点已定位**：parameter `src-json` → strict codec 可手写；真机探针未跑（A2 第一条红测试）。不再把 261004 的"需要上游缝"当定论 |
| 3 | 外部同类产品怎么处理"面板是拷贝/派生索引" | 已对照（依据档 §四 + [先例档](../research/memory-panel/261019-file-memory-panel-precedents.md)） |
| 4 | Q1 新增权 / Q2 直写深度 | **建议**（见「方案与取舍」），非定案 |
| 5 | Q3 `.desk/state.json` 与 `desk-refresh` 退役 | **待本人一句确认**（唯一涉及合同删减与模型可见技能退役的一条） |
| 6 | A1 真值源到底是什么 | **已核**：working folder 四房间；`.desk/state.json` 是 session workspace 拷贝（`docs/home.md` 布局 + `room-data-io.ts:77`） |
| 7 | 记忆退役是否有 `why` / `supersededBy` | **都没有**：`MemoryRecord` 只有 `source` + `supersedes`（[`record.ts:24`](../../../packages/dsh-smart-assistant/src/domain/memory/record.ts#L24-L59)）；`forgetMemory` 移到 `memory/archive/` 并标 `status: retired`，不收理由（[`memory-room.ts:136`](../../../packages/dsh-smart-assistant/src/host/memory-room.ts#L136-L141)）。理由进审批账，不新增字段 |
| 8 | 审批账能否带"前后状态" | 今天只有 `at/kind/id/title/sessionId/source`（[`approval-audit.ts:40`](../../../packages/dsh-smart-assistant/src/host/approval-audit.ts#L40-L49)），kind 是 `promote|deprecate|land`；A2 是 schema 变化，不是闭集加两项 |
| 9 | 收据"自上次以来"的 baseline | 默认 = 上次打开维护面板（面板内"全部标为已读"重置），不新增服务端状态；待确认 |
| 10 | 面板 IA / route 契约 | 本卡拥有；默认四 tab（记忆/知识/技能/Viki），A1a 出 tab/drawer/receipt 骨架，B/C 只加自己的 tab |
| 11 | `proactive-idle-probe` 能否证明"零模型回合" | **不能**：它只数 session 日志文件数、hash ledger/schedule；已有会话里的模型回合是 append，不会新增文件。A/B/C 的"零模型回合"改用客户端 spec（断言没有 `remote.session.prompt`）+ 会话日志无新 panel 消息 |
| 12 | 新 host 行要改哪些门 | `cordis.patch.yml` + `docs/architecture.md` §二 + `docs/identity.md` §一 + `pnpm gen-catalog`；`pnpm verify` 的 composition/identity 门会抓（[`verify.mjs:313`](../../../scripts/checks/verify.mjs#L313)） |

## 方案与取舍

### 切片与次序

| 片 | 做什么 | 形状要点 |
|---|---|---|
| **A1a 读权威** | 宿主新增只读路由 `assistantRooms`（`GET /api/assistant/rooms`；形状照 `desk-projection` 的 `ctx.connection.fetch.register`），从 **`assistantMemory` 服务**取四房间真值；客户端面板改读它；知识正文抽屉；共享 tab/drawer 骨架 | route 注入 `assistantMemory` + `connection`，**不接收 session/workspace 路径**；只读、不建文件、不解析 `.desk/state.json`；正文随列表（受 byte cap）或 `?kind=&id=` 单读；错误态 missing/invalid/oversized；`revision` 供 A3 |
| **A2 直写** | A2a 真机探针：strict parameter codec 修复后，client entry 仍无法消费动态挂载的 namespace（Cordis inject 守卫）→ 产品统一走**同一条 `assistant-rooms` 的 POST**（`knowledge.approve/deprecate`、`memory.correct/retire`、`skill.retire`）；每次 `source: panel-direct` + before/after 入审批账 | 记忆纠错 = 新记录 + `supersedes` 旧 id（旧记录进 archive，不改正文）；退役 = 移出活跃集（不是硬删）；白名单按 action + id + 状态；kind 扩 `correct|retire` 并加 before/after（旧行兼容）；**不新增**（C2 例外只允许 `source=panel:message:<id>` 的新建）；**不回退 prompt**，失败回 POST |
| **A3 收据** | "自上次以来变了什么"：`revision`/mtime + `audit/approvals.jsonl` 的纯核；面板 receipt；"全部标为已读" | 不新增 `SessionEvent`；baseline 住客户端（localStorage，按 working folder 键）；复用 client 已有的"会话 settle → 4s 重读"触发（[`client/index.ts:339`](../../../packages/dsh-smart-assistant/src/client/index.ts#L339-L369)），不另造 poller |
| **A1b 退役** | Q3 确认后：删 `.desk/state.json` 契约、`desk-refresh` 技能、`DESK_REFRESH_STEP`、刷新动词、model-visible 手册/交叉引用、全部测试/探针/场景 | 全量 grep 零命中（排除 `_archive`/历史 note/trial-home）；preflight 改用新 route；`desk-refresh-loop` eval 任务退役；`pnpm start` 绿；`pnpm eval` + `repo-live-probe` 证明模型面只有减法 |

**A1a 与 A1b 必须分开**：A1a/A2/A3 让面板读真值、点完生效、看得见变化；A1b 才删拷贝与技能。这样每一步都能独立回退，不会出现"读/写/收据都还没证，先把合同删了"的中间态。

### route / IA 契约（本卡拥有）

- **路径**：`/api/assistant/rooms`（GET；列表 + `?kind=knowledge&id=<id>` 单读）；A2 写路径 `/api/assistant/rooms/actions`（POST）。两者都走 exact Fetch route，owner-only（403 其余 principal），`cache-control: no-store`。
- **数据源**：`ctx.assistantMemory` 的 `listMemories`/`listKnowledge`/`readKnowledgePage`/`listResearch`/`learnedSkillNames`/`skillUsage`；**不**读 `.desk/state.json`，**不**接受调用方给的路径。
- **形状**：四个房间各一段（memory/research/skills/knowledge）+ `counts` + `revision`；知识页带 `body`（或单读接口），技能带 `description/source/learnedAt`，研究带 `status/why/lean`；错误态用可读 JSON。
- **IA**：四 tab（记忆/知识/技能/Viki），research 仍是房间、不单开 tab；共享 `tabBody` 泛型、只读 `ContentDrawer`、`Receipt` 组件；B/C 只注册自己的 tab 与数据，不另造 store/parser。Viki tab 在 B 卡落地；技能 tab 在 C1 落地；A1a 先出骨架并让现有两 tab 走新 route。
- **新 host 行**：`assistant-rooms`（与 `assistant-desk-projection` 同级）；同 diff 进 `cordis.patch.yml`、`docs/architecture.md` §二、`docs/identity.md` §一、`pnpm gen-catalog`。

### 冲突与退役（本人 10-19 委托、已定案；完整论证 = 依据档 §5.3）

- **取代**（同一事实新值进来）→ 新记录带 `supersedes: <旧 id>`，旧记录进 `archive/` 并标 `superseded`，**不删文件**。今天没有 `supersededBy` 字段；引用方向只有新→旧，**不要按双向指针设计**。
- **冲突**（两条矛盾、没有权威谁新谁对）→ 机器**不代删**，并排摆出来 + 一句"以哪条为准"；人点完才转成取代/删除。A2 的 v1 只做"记忆纠错/退役"，**不做自动冲突配对**（B3 的 Viki 并排是另一次人工选择）。
- **退役**（人判"不该再被用"）→ 从活跃集移出并保留可读副本：房间进 `archive/`（`status: retired`），Viki 走 snapshot + delete。**不是硬删**。理由写 `audit/approvals.jsonl`（记忆没有 `why` 字段）；引用证明 = 扫 `supersedes`/知识 `sources`/线索指针，命中的先确认。

**已输掉的做法**（逐条在依据档 §5.1/§七）：自由 Markdown 编辑器；面板直接调模型 API；每写先排队等人批（候选层）；自动轮询拷贝；统一存储；为面板先建派生索引；**prompt fallback**（直写失败就投一句话，等于放弃"当场变"）；**把 `src-json` 用在 parameter 上**；**硬编码 Viki 地址/auth**；**用 `SKILL.md` 全文冒充常驻成本**。

## 验收标准

| # | 行为 / 判据 | 类 | 输入状态与通过信号 | 负例或互补态 | 证据 owner | 人判 |
|---|---|---|---|---|---|---|
| A1a-1 | 面板数据源 = working folder 真值 | 编排 | host route 从 `assistantMemory` 取数；客户端 fetch `/api/assistant/rooms`；`src/client` 不再解析 `.desk/state.json` | 负例：改 session workspace 的 `.desk/state.json` 不影响面板；route 不接收 session/workspace 路径 | `tests/host/rooms-route.spec.ts` + `tests/client/client-room-data-io.spec.ts` | 无 |
| A1a-2 | 知识正文可读 | 编排 | 面板抽屉内容 == `knowledge/<id>.md` body；hash 相等；≥2000 字不截断（或标注） | 负例：读失败显示可读错误，不显示空面板 | `tests/client/client-room-tabs.spec.ts` + 同 route spec | **是**（本人看正文） |
| A1a-3 | 计数器口径 = 领域纯核 | 确定性 | 空房间 / 只有 draft / 含 deprecated 三案与 `listKnowledge`/`listMemories` 同值 | — | `tests/domain/*.spec.ts`（房间纯核） | 无 |
| A1a-4 | 共享 IA / route 契约可复用 | 编排 | `tabBody`/`RoomKind`/`ContentDrawer` 被 memory/knowledge 使用；B/C 只加 tab；新 host 行进 patch/arch/identity/catalog | 负例：新行未进 §二树 → `pnpm verify` composition 红 | `tests/client/client-entry.spec.ts`、`tests/composition/preset-composition.spec.ts`、`pnpm verify` | 无 |
| A2-1 | 点击 → UI 即时换组 | 编排 | 客户端 mock POST 成功 → store 在下一渲染帧换组（待审→已确立/记忆退役），不等待 poll | 负例：POST 失败保留原行 + 可读错误；不做乐观写入后静默回滚 | `tests/client/client-panels.spec.ts` | **是**（本人点一遍） |
| A2-2 | 直写真机可达（A2 先决） | 编排 | strict codec 探针：`$mount` + `approvePage` 成功，台账 `source: panel-direct`；或 POST 200 + 台账行 | 负例：探针红 → 走 POST，**不得**回退 prompt；台账只有 `assistant_reflect` 不算直调 | `dev/probes/web/` 下新增 approve-direct-probe.mjs（抓 info 日志 + 读台账；A2 第一条红测试） | 无 |
| A2-3 | 直写只做受限动作 | 确定性 | 每个 action 白名单：id 不存在 / 状态非法 / 未授权 action → 拒绝 + 可读原因 | 负例：`新建` 被拒（C2 只允许 `source=panel:message:<id>`）；记忆纠错不改旧文件正文 | `tests/host/rooms-actions.spec.ts` | 无 |
| A2-4 | 每次直写留痕 | 确定性 | `audit/approvals.jsonl` 追加 `source: panel-direct` + kind + id + 前后状态（或 kind/id/source，若 schema 不扩） | 负例：kind 越界被拒；旧行仍可被 A3 读；`forgetMemory`/`retireSkill` 也写行 | `tests/host/approval-audit.spec.ts` + 同 route spec | 无 |
| A3-1 | 收据是纯核 + baseline 明确 | 确定性 | mtime/`revision` + 台账三案：有新写入 / 无变化 / 只退役；baseline = 上次打开面板 | 负例：grep 断言无新 `SessionEvent`；同内容重写不产生假变化 | `tests/domain/receipt.spec.ts` | **是**（像不像一句人话） |
| A3-2 | 收据零模型回合 | 编排 | 客户端 spec 断言没有 `remote.session.prompt`；会话日志无新 panel 消息 | **不**用 `proactive-idle-probe` 单独证明（它只数文件） | `tests/client/client-panels.spec.ts` + 会话日志断言 | 无 |
| A1b-1 | 退役清单零悬空 | 编排 | 全量 grep 零命中（排除 `_archive`/历史 note/trial-home）：`desk-refresh`、`.desk/state.json`、`DESK_REFRESH_STEP`、`askRefresh`、`reloadDesk`、`loadDesk`；preflight 改新 route；`desk-refresh-loop` 任务退役；`root-files`/`preset-composition` spec 更新；scene seed 更新 | 负例：任一命中 → `pnpm verify`/`pnpm test`/`pnpm start` 红；`pnpm start` 必须绿 | `pnpm verify` + `pnpm test` + `pnpm start` + grep | 无 |
| A1b-2 | 模型面只有减法 | 编排 | `pnpm build` + `pnpm test:composition` + `pnpm eval --only <task-id>` + `repo-live-probe`：catalog 无 `desk-refresh`，手册/交叉引用不再教它 | 负例：模型仍能加载/被提示 `desk-refresh` | `pnpm gen-catalog` diff + `pnpm eval` + `repo-live-probe` | **是**（本人确认朗读/行为） |
| A1b-3 | 全量收尾 | — | `pnpm typecheck && pnpm test && pnpm verify` 绿；`pnpm web-expected` 两场景过目 diff 后重录；`pnpm release-smoke`（新行/exports） | — | 命令本身 | 无 |
| X-1 | 交叉检查（prove-it-red） | — | 把面板改回读拷贝 → A1a-1 红；去掉白名单 → A2-3 红；把 preflight 改回 desk 检查 → A1b-1 红 | — | 本条即证明 | 无 |
| X-2 | 收尾 | — | A1a/A2/A3/A1b 各自的命令与真机证据记在本卡或提交说明；B/C 仍按各自卡 | — | 命令本身 | 无 |

本人的验收面（不代判）：能不能在面板上看到那页正文、点完是否立刻变、"最近变了什么"是否像一句人话、退役后模型是否真的不再提 `desk-refresh`。

## 切片进展

| 片 | 状态 | 证据 / 停点 |
|---|---|---|
| **A1a 读权威** | **已交付**（2026-10-19） | `91f979f`（host route/row/tests）、`f1cb051`（client 换源/抽屉/文档/scene）、`8d46246`（scene 凭据+期望）、`c9cf41a`（web hook 探针+抽屉主题）；`vitest` 764 绿、`verify` 42 绿、`web-expected` 两场景 PASS、`webui-preflight` 绿；**人判待本人**：在真机上看一条知识页正文。决定 note = [maintenance-read-authority](../../../notes/implemented/2026-10-19-maintenance-read-authority.md) |
| **A2 直写** | **已交付**（2026-10-19） | `3a0d125`（host POST 五动作 + ledger before/after + client 即时换组 + `approve-direct-probe`）；`vitest` 776 绿、`verify` 42 绿；探针 PASS（`source: panel-direct`，无 prompt）；**人判待本人**：真机点一次批准/纠错/退役。决定 note = [maintenance-direct-write](../../../notes/implemented/2026-10-19-maintenance-direct-write.md) |
| **A3 收据** | **已交付**（2026-10-19） | `627b1f2`（纯核 + route ledger + ReceiptView + docs）；`vitest` 786 绿、`verify` 42 绿；**人判待本人**：打开面板看"自上次以来"、点"全部标为已读"归零。决定 note = [maintenance-receipt](../../../notes/implemented/2026-10-19-maintenance-receipt.md) |
| **A1b 退役** | **已交付**（2026-10-19） | `cfd5e63` + 收口提交（模型面/客户端/preflight/场景/评测任务/报告指标/旧 home 手册迁移）；`vitest` 785、`verify` 42、`pnpm start` preflight 绿、`web-expected` 两场景 PASS、keyless prompt probe before/after（`.desk`/`desk-refresh`/`Room data` True→False）；**人判待本人**：打开交接 URL 核对面板与模型面；note = [retire-room-data-copy](../../../notes/implemented/2026-10-19-retire-room-data-copy.md) |

## 关闭条件

A1a/A2/A3/A1b 落地（A1b 以 Q3 记录为前提；Q3 已按 2026-10-19 计划采用）且上表 A1a-1…A1b-3 有真证据（spec 名、探针判决、命令输出记在本卡或指向的提交说明）；`desk-refresh` 与房间数据文件合同同 diff 退役，不留第二份契约、不留悬空交叉引用；本人在真机上确认"读到正文、点完生效、看得见变化"；结论与去向按[关闭条件](../../README.md#关闭条件)交接后归档。

B/C 的验收、关闭与实现分别住 [B 卡](261019-viki-content-governance.md) 与 [C 卡](261019-learned-skills-surface.md)；本卡只在 IA/route 契约上保持它们不漂移。
