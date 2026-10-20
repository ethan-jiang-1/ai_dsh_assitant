---
status: 已结
opened: 2026-10-19
---

# 推敲：Viki 的内容面——可枚举、可读、可删、冲突并排（B 卡：P1）

> 立卡：2026-10-19 ｜ 状态：已结 ｜ 类型：Feature ｜ 可关闭：是 ｜ 毕业：做现在 ｜ 结论（2026-10-20）= **B1/B2/B3/B4 全部收口**：宿主路由 12 条 spec 全绿；右栏浏览器 seat 记 vendor 渲染盲区；**B4 真数据已于 2026-10-20 经本人委托执行完毕**——目标是用户级存储 `~/.openviking/workspace`（"14 条" = [ov-rt.mjs](../../../dev/experiments/openviking/ov-rt.mjs) 的虚构人设哨兵语料），dry-run 28 → snapshot `99753d2` → 删 28 叶子 + 陈旧壳（含旧 peer `assistant`），终态 persona 关键词 find/recall 0 命中；回执与契约修正见 [viki-cleanup note](../../../notes/implemented/2026-10-19-viki-cleanup.md)。去向 = campaign close note + 归档
> **依赖与自家缝：** 面板骨架沿用 A 卡（[维护面收口](261019-self-update-lanes.md)）的 A1a（共享 tab/drawer/route 形状）；但 **Viki 的宿主路由是 B 自己新增的**：`assistantViki`（`GET/POST /api/assistant/viki`，形状照 `desk-projection` 的 `ctx.connection.fetch.register`）——A 卡不拥有任何 Viki 路由，别读成"继承"。**不要**再用 `knowledge-approve-remote` 的 Typert Remote 方法做删除：那条车道今天要么修 parameter codec（见 A 卡 A2），要么走 host POST；B 的删除/恢复直接用 POST。
> **依据：** [依据档](../research/self-update/261019-self-update-lanes.md) §5.2（实测）/§5.3（冲突判据）/§九（复审更正）；外部先例在 [先例档](../research/memory-panel/261019-file-memory-panel-precedents.md)。
> **2026-10-19 复审重写：** 修正 Viki 存储树（抽取物在 `peers/<peer>/memories`，不是 `user/<space>/memories`）、摘要来源（`fs/attrs.memory.summary`，不是 `fs/ls.abstract`）、引用模型（没有 `key`/`supersedes`；知识 `sources` 是自由列表）、删除/恢复（`snapshot/commit` 带 `paths`；`snapshot/restore` 是 forward-commit）、配置（不硬编码 `127.0.0.1:1933`）与 B4 判据。

**问题与期望结果：** Viki 的记忆今天**没有读者也没有写者**——`ov-shield` 只挡了它的工具面与技能面，抽取物仍然自动进每轮召回块；人能看见它的唯一方式是"觉得它记错了"。真代价付过一次：真机往返里助手主动指出长期记忆压着**另一家的**底子（[pin note](../../../notes/implemented/2026-10-19-openviking-pin-catch-up.md) 遗留节，记作 14 条，**那是另一次运行看到的、本机不可复核**）。要的是：**能列出它记得什么、能读正文、能一条一条删（删得回来）、两条矛盾时能并排看见并指定以哪条为准**。

**当前情况（本机 0.4.22 server 只读实测，2026-10-19）：**

- `viking://user/default/memories` 只有 `identity.md`、`soul.md`（模板态）；**6 条抽取 events 在 `viking://user/default/peers/<peer>/memories/events/YYYY/MM/DD/*.md`**（本机 peer = `github.com-ethan-jiang-1-ai_dsh_assitant`）。`stats/memories` 报 `events: 6`，而 `user/default/memories` 只返回 2 个模板文件——**按卡上的 `user/<space>/memories` 列，真正的记忆一条都看不见**。
- `fs/ls` 的 `abstract` 对这批文件是空串；每条的标题/摘要/类型在 `fs/attrs.result.attrs.memory`：`event_name` / `summary` / `memory_type` / `version` / `source_extraction_id`。`content/abstract?uri=<file>` 返回的是**父目录**摘要，不是文件的。
- `fs/ls?recursive=true` 的深度行为不可靠：从 `memories` 根只递归到 `events/YYYY/MM`，不到 `DD` 与叶子；从 `events/YYYY` 才一次列出 `MM/DD/*.md`。**B1 必须走树（或对 `events/YYYY` 逐个 ls），不能假设一次 recursive 拿到所有叶子**；`.overview.md`/隐藏文件默认不列，要与 `stats/memories` 做带说明的交叉核。
- 注入面不止画像：profile 块读 `user/<space>/memories/profile.md` + `preferences/` + `entities/`（今天不存在，块为空）；**召回**搜 `viking://~/memories`，默认 `autoRecall: true` / `recallPeerScope: "all"`，所以 peer 的 events 会通过召回进来。删 profile/preferences 不会自动清掉 events；清理与"什么被注入"的故事必须覆盖 peers + 召回旋钮。
- 端点/鉴权来自插件凭据链：`OPENVIKING_URL` / `OPENVIKING_API_KEY` / `~/.openviking/ovcli.conf` / `ov.conf`；`authMode` 是 `trusted` 或 `api_key`（[`credentials.mjs`](../../../dev/harness-home/profiles/dev/node_modules/@openviking/dsh-memory-plugin/shared/credentials.mjs)）。**卡上不能硬编码 `127.0.0.1:1933` + dev auth**。
- 那批 14 条旧记录**不在本机这份工作区**；依据档只支持"推断在另一份工作区/宿主目录"（[§5.2](../research/self-update/261019-self-update-lanes.md#52-viki-内容面的存量事实2026-10-19-在本机-dev-server-上实测推翻了本节早期的一处假设)），不能写成"本机任何工作区都没有"。
- `snapshot/restore` 的语义是 **forward-commit**（"rebuild project_dir from source_commit on top of HEAD"）；`snapshot/commit` 接受 `paths`，可以只备份一条。**删除回执必须带 commit id，恢复要提示"恢复的是该 commit 的状态，可能影响之后的其他改动"**。

**下一步：** 本人确认口径后开工 B1；B1 依赖 A1a 的 tab/drawer 骨架，B2 的传输走 POST（不依赖 A2 的 Remote 修复）。B4 是本人执行条目。

## 已知与未决

| # | 项 | 状态 |
|---|---|---|
| 1 | 抽取物存在哪、怎么注入 | **已实测**：peer 树 + `fs/attrs` 摘要；profile 块空；events 走召回；`user/<space>/memories` 只有模板 |
| 2 | 能否逐条删、能否回滚 | **能**（`fs DELETE` + `snapshot/commit(paths)` + `snapshot/restore`）；restore 是 forward-commit，要写清语义 |
| 3 | 那批越界记录在哪 | **不在本机这份工作区**；依据档只支持"推断在另一份工作区/宿主目录"，不是"全机不存在" |
| 4 | 越界数据怎么处置 | **建议**：先 dry-run 出清单，确认后整批清除；判据 = peer/工作区归属（见 B4），不是逐条读别家经营数据 |
| 5 | "冲突并排"是否进本卡 v1 | **进，但只做人工并排**：没有 `key`/`supersedes`，不做自动矛盾检测；人选两条，点"以哪条为准"才删另一条 |
| 6 | 删除的"引用证明" | 知识 `sources` 是自由列表，**不假装没有交叉指针**：删前扫 `sources`/`links` 是否含该 uri；命中则二次确认。同 `event_name`/摘要近似的活跃副本也列出 |
| 7 | 面板放哪 | 默认：A1a 的四 tab 骨架里新增 **Viki tab**；不在知识面板里混排 |

## 方案与取舍

| 片 | 做什么 | 要点 |
|---|---|---|
| **B1 可枚举 + 可读** | **已交付**（2026-10-19）：`assistant-viki` host 行 + `VikiClient` + Viki tab；6 host + 2 client specs；真机 7 条/读正文；`pnpm verify` 42、`release-smoke`；note = [viki-read](../../../notes/implemented/2026-10-19-viki-read.md)。原方案要点：只读路由把 `user/<space>/memories` **和** `peers/*/memories/**` 投影成条目（uri / 分类 / 标题 / 摘要 / mtime / 正文）；面板逐条可读 | 树走 `fs/ls`（对 `events/YYYY` 逐个/递归到 `MM/DD`），摘要取 `fs/attrs.memory.summary`（fallback frontmatter/首行），正文 `content/read`（默认 cleaned；要原文才 `raw=true`）；过滤 `.overview.md`/隐藏；`stats/memories` 做带说明的交叉核；路由只接受 `space`/`peer` 白名单，不接受任意 uri |
| **B2 逐条删（带备份）** | **已交付**（2026-10-19）：`POST` 的 references/delete/restore；引用未确认 409 带回引用；commit 失败 409 不删；回执 commit id；审计 `room:'viki'`；note = [viki-delete](../../../notes/implemented/2026-10-19-viki-delete.md)。原方案要点：`snapshot/commit(paths)` → `fs DELETE` → 回执 | 删前扫知识 `sources`/`links` 是否含该 uri、同 `event_name`/摘要近似的活跃副本；命中要求二次确认；**没有** `supersedes`/`key` 字段，不按它们设计；无 snapshot 则拒绝删除 |
| **B3 冲突并排（人工）** | **已交付**（2026-10-19）：逐行选择两条 → 并排摘要/正文/来源 →「以 A/B 为准」删另一条（复用 B2）；不选/「两条都留」不删；见 [viki-delete](../../../notes/implemented/2026-10-19-viki-delete.md)。原方案要点：人选两条 → 并排 → 以哪条为准 | 不做自动检测；不新增 `retired` 状态；Viki 侧落体就是"带备份的删除"，措辞不许写成"退役" |
| **B4 存量清理（本人执行）** | **脚本/夹具/试跑已交付**（2026-10-19）：`dev/deploy/viki-cleanup.mjs`；dry-run 默认，`--apply` 先 tree snapshot；保护 identity/soul/.overview；当前 server 试跑 keep 5/remove 0/protected 2；note = [viki-cleanup](../../../notes/implemented/2026-10-19-viki-cleanup.md)。真数据由本人执行。原方案要点：判据脚本 + dry-run 清单 + 回执 + tree snapshot | **判据**：目标工作区的 `--keep-space`/`--keep-peer` 之外、或 `source_extraction_id` 属于旧批次的记录；`identity.md`/`soul.md`/`.overview.md` 永远保护；输入 = 工作区/server 地址，输出 = 回执 json（清了什么/备份 commit/保护了什么）；先在 fixture 上证明 |

**配置与缺席：** `assistantViki` 行有 `baseUrl`（默认读 `OPENVIKING_URL`；dev 才回退 `http://127.0.0.1:1933`）、`apiKey`（`OPENVIKING_API_KEY`）、`space`/`peer`（可选）；server 未配置/不可达时 tab 隐藏或显示"未连接"，**不阻断启动**（沿用 OpenViking 可选增强纪律）。路由只接受配置里的 space/peer 与白名单内 uri；`POST` body 走 `buffered` JSON。

**做法取舍：**

- **不做候选层/事先审批**：外部没人这么做（依据档 §四 结论 1），且内容本来就可枚举可删（§5.2）——套队列是把可控当不可控。
- **不做逐条挑那批越界记录**：越界是 scope 错误，不是值错误；先 dry-run 清单，确认后整批。
- **不做"把 Viki 灌进房间"**：抽取质量不足以当权威；房间仍是唯一权威，Viki 是情景层。
- **不接 `profile.md` 掐中间的改造**：先把可读可删做出来，截断行为留给真机读数决定。
- **不做自动矛盾检测**：没有 key/supersedes；人工并排是唯一诚实形态。
- **不硬编码 server 地址/鉴权**：用插件凭据链或 host 行 config。

## 验收标准

| # | 行为 / 判据 | 类 | 输入状态与通过信号 | 负例或互补态 | 证据 owner | 人判 |
|---|---|---|---|---|---|---|
| 1 | 列表 = 两处真值 | 编排 | 面板条目数 == `user/<space>/memories` 叶子 + `peers/*/memories/**` 叶子（排除 `.overview.md`/隐藏）；与 `stats/memories` 的 events 数做带说明交叉核 | 负例：只列 `user/<space>/memories` → 条目只剩 2 个模板，测试必须红；server 不可达 → 可读"未连接" | `tests/host/viki-route.spec.ts`（mock server） | 无 |
| 2 | 摘要/分类/正文各来自正确字段 | 确定性 | 每行摘要 == `fs/attrs.memory.summary`（空则 frontmatter/首行），分类 == `memory_type`，正文 == `content/read`（cleaned；raw 选项另测） | 负例：`fs/ls.abstract` 空串时不得显示空列/父目录摘要；读失败可读错误 | 同上 + `tests/client/client-viki-panel.spec.ts` | 无 |
| 3 | 删除可回滚 | 编排 | 删一条 → `snapshot/restore`（或 B2 回执的恢复动作）后 content hash 与原件相等；回执带 commit id | 负例：无 snapshot / commit 失败 → 拒绝删除；目录 uri → 拒绝 | `tests/host/viki-route.spec.ts`（fixture 文件树） | **是**（本人删一条再恢复） |
| 4 | 删除有引用证明 | 确定性 | 知识 `sources`/`links` 含该 uri、或同 `event_name`/摘要近似活跃副本命中 → 二次确认后才删 | 负例：命中时首点被拒并列出指向者；没有 `supersedes` 字段时不假装有 | 同上 | 无 |
| 5 | 冲突并排（人工） | 编排 | 人选两条 → 并排可见正文/摘要/来源；指定"以 A 为准"后 B **被删除（带备份）**且 A 保留 | 未指定时两条都留（不得自动删）；不做自动检测 | `tests/client/client-viki-panel.spec.ts` + host spec | **是**（本人选两条试） |
| 6 | 清理流程在 fixture 上跑通 | 确定性 | "越界 + 在域 + 保护文件"混合 fixture：脚本只清越界、保护 `identity/soul/.overview`、dry-run 不写、回执记录清了几条/备份 commit | 负例：判据为空时一条都不清；保护文件被删 → 红；无 dry-run 直接写 → 拒 | `tests/tooling/viki-cleanup.spec.mjs`（或 `tests/host/`） | 无 |
| 7 | 真数据清理（本人条目） | — | 本人在那份工作区先 dry-run 看清单，再执行；回填回执路径；`fs/ls` 与 `stats/memories` 双读数都不含旧公司实体 | 未执行 = 本卡不关 | 人工回执 | **是** |
| 8 | 不靠 prompt / 不靠模型回合 | 编排 | 列表/读正文/删除/恢复全部走 host 路由；客户端 spec 断言没有 `remote.session.prompt`；会话日志无新 panel 消息 | 不用 `proactive-idle-probe` 单独证明（它只数文件） | `tests/client/client-viki-panel.spec.ts` + 会话日志断言 | 无 |
| 9 | route/配置/缺席 | 编排 | `assistantViki` 新行进 patch/arch/identity/catalog；`baseUrl`/`apiKey` 从 config/env 取；server 缺席不阻断启动 | 负例：硬编码 1933/dev auth → 红；任意 uri → 403/拒绝 | `tests/composition/preset-composition.spec.ts`、`pnpm verify`、`pnpm release-smoke` | 无 |
| 10 | 收尾 | — | `pnpm typecheck && pnpm test && pnpm verify` 绿；动 client 先 `pnpm build` + `pnpm web-expected`（新 tab 过目 diff 后重录）+ `pnpm shots`；动发布物/行加 `pnpm release-smoke` | — | 命令本身 | 无 |

## 关闭条件

B1–B3 落地且上表 1–6、8–10 有真证据；第 7 行（真数据清理）由本人先 dry-run 清单、确认后整批执行并回填回执路径；本人在真机上确认"能列出、能读、能删、删得回来"；结论与去向按[关闭条件](../../README.md#关闭条件)交接后归档。B4 的判据/脚本/回执是本卡交付；真数据清理不代做。
