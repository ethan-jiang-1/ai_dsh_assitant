# 维护面 A1a：面板读 working folder 真值

日期：2026-10-19 · 状态：**proposed**（A 卡 v2 A1a；本人 2026-10-19「落地计划」授权实施；切片验收与停点住 [A 卡](../../_backlog/issues/261019-self-update-lanes.md#方案与取舍)）

## 问题（可观察行为）

记忆/知识两间的面板今天渲染模型写在 session workspace 的 `.desk/state.json`（[`room-data-io.ts`](../../packages/dsh-smart-assistant/src/client/room-data-io.ts#L77)），而四个房间的真值在 assistant working folder（`<dataDir>/memory|research|skills|knowledge`）。结果是：模型改了房间，面板要等下一次 `desk-refresh` 重写拷贝才看见；知识正文只有 200 字片段；"刷新"成为唯一出路。用户要的是**面板读到的就是房间真值、知识正文可读**，且这一步不删除任何合同（退役在 A1b）。

## 提案

1. **宿主只读路由**：新增 `assistant-rooms` 行（`ctx.connection.fetch.register`，`GET /api/assistant/rooms`，owner-only，`no-store`，byte cap）。路由注入 `assistantMemory`，用它的 `listMemories` / `listKnowledge` / `readKnowledgePage` / `listResearch` / `learnedSkillNames` / `skillUsage` 组 JSON（`schemaVersion`、`generatedAt`、`revision`、`counts`、四房间数组；知识列表带 `excerpt`，`?kind=knowledge&id=` 单读返回 `body` + backlinks）。**不接收** session/workspace/任意路径。
2. **客户端换源**：`room-data-io` 的 `loadDesk`/`loadDeskFor` 改为 fetch 路由并把响应映射到现有 `DeskData`（面板/切片/行状态不动）；删除 `.desk/state.json` 的读取与 `looksLikeDesk`/`NOT_A_DESK` 的拷贝错误态，换成 route 错误态；`generatedAt` 用房间数据的最大更新时间（不是 `Date.now()`），让现有 pending gate 仍能判"数据真的动了"。
3. **正文抽屉**：新增共享 `ContentDrawer`；知识行加"读全文"，内容 = 单读接口的 `body`（hash 与磁盘 `knowledge/<id>.md` 相等）。research/skills/Viki 后续复用同一抽屉，不再各造。
4. **共享 IA 骨架**：`tabBody`/route parser 保持通用；本片只让现有 memory/knowledge 两 tab 走新 route，不新增 tab（skills/Viki 由 C1/B 注册）。新行同 diff 进 `cordis.patch.yml`、`docs/architecture.md` §二、`docs/identity.md` §一、`pnpm gen-catalog`；`docs/operating.md` 的"面板读 `.desk/state.json`"与 `docs/architecture.md` 的读回链改为"面板读 host route；拷贝是模型写、A1b 退役"。
5. **场景与门禁**：`first-open-draft-banner` 的 seed 增加 3 条 working-folder `knowledge/*.md`（保留 desk seed 供 preflight/旧路径），`expected.dom.json` 过目 diff 后重录；`webui-preflight` 暂不改（A1b 改）；`pnpm start` 仍绿。

## 输掉的方案

- **保留 `.desk/state.json` 作为面板源、只加第二轮刷新**：治标；拷贝还在，A1b 的陈旧类 bug 仍在。
- **按会话工作区读四个房间**：真值不在 session workspace；多会话会串数据，且与 `docs/operating.md:86` 同错。
- **路由直接读文件、不用 `assistantMemory`**：重复 archive/parse failure/backlink 语义，第二份实现必漂移。
- **把正文全塞进列表 / 每行再发一次请求**：列表过大或 N+1；采用"列表 excerpt + 单读 body"。
- **新增 `SessionEvent` 做变更通知**：与 `docs/identity.md` 的"不新增 SessionEventMap"冲突；A3 用 `revision` + 现有会话 settle 重读即可。
- **在本片就删 `.desk/state.json`/`desk-refresh`**：Q3 未确认；A1a 只换源，退役留给 A1b。

## 验收

- **红先**：`tests/host/rooms-route.spec.ts`（新）先红——断言 route 从 `assistantMemory` 取数、无 session/路径入参、`?kind=knowledge&id=` 返回 body、错误态；`tests/client/client-room-data-io.spec.ts` 先红——断言 fetch `/api/assistant/rooms`、不再调用 `workspaceFiles.read('.desk/state.json')`、route 错误态可读；`tests/client/client-room-tabs.spec.ts` 先红——抽屉内容 == 磁盘 body（hash）。
- **绿**：`pnpm --filter dsh-smart-assistant exec vitest run tests/host/rooms-route.spec.ts tests/client/client-room-data-io.spec.ts tests/client/client-room-tabs.spec.ts`；`pnpm build`；`pnpm test`；`pnpm test:composition`（新行）；`pnpm verify`；`pnpm web-expected`（两场景；`first-open-draft-banner` 过目 diff 后 `--refresh`）；`pnpm shots '<URL>' --dom --size 1600x1000 --name a1a-rooms`；`pnpm start`（preflight 绿）。
- **负例**：改 session workspace 的 `.desk/state.json` → 面板不变；route 不接收 `?path=`/session；知识读失败显示可读错误；新行未进 §二树 → `pnpm verify` 红。
- **人判**：本人在真机上看一条知识正文，确认"这是全文，不是 200 字片段"。
- **停点**：A1a 绿后停；A2 另立 proposed 卡，不在本片顺手改写入路径。
