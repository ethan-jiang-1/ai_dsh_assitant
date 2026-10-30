# 维护面 A1a：面板读 working folder 真值

日期：2026-10-19 · 状态：**implemented**

## 问题（可观察行为）

记忆/知识两间的面板曾渲染模型写在 session workspace 的 `.desk/state.json`，而四个房间的真值在 assistant working folder（`<dataDir>/memory|research|skills|knowledge`）。于是模型改了房间、面板要等下一次 `desk-refresh` 重写拷贝才看见；知识正文只有 200 字片段；"刷新"成为唯一出路。

## 决定

1. **只读 route**：新增 host 行 `assistant-rooms`（`GET /api/assistant/rooms`，exact Fetch route，owner-only，`no-store`，byte cap），注入 `assistantMemory`，用它的 `listMemories` / `listThreads` / `listKnowledge` / `readKnowledgePage` / `learnedSkillNames` / `skillUsage` 组 JSON。route **不接收** session/workspace/任意路径；`?kind=knowledge&id=<id>` 单读返回 `body` + backlinks；`generatedAt` 用房间数据的最大更新时间（不是 `Date.now()`），`revision` 是投影哈希（客户端读回只比 `generatedAt`；收据不用它）。见 [`rooms-route.ts`](../../packages/dsh-smart-assistant/src/host/rooms-route/route.ts) 与 [`rooms-route/index.ts`](../../packages/dsh-smart-assistant/src/host/rooms-route/index.ts)。
2. **client 换源**：`loadDesk`/`loadDeskFor` 改为 fetch 该 route，映射到现有 `DeskData`；删除 `.desk/state.json` 的 `workspaceFiles.read` 与拷贝错误态，换成 route 错误态；空房间用 `misses` 保持"先开始第一件事"的入口。见 [`room-data-io.ts`](../../packages/dsh-smart-assistant/src/client/rooms/room-data-io.ts)。
3. **正文抽屉**：共享 `ContentDrawer`（A1a 骨架；C1/B 复用），知识行"读全文"经单读 route 取全文；正文失败是 note，不是空面板。见 [`content-drawer.ts`](../../packages/dsh-smart-assistant/src/client/rooms/content-drawer.ts) 与 [`panels.ts`](../../packages/dsh-smart-assistant/src/client/rooms/panels.ts)。
4. **"刷新"改为"重读房间数据"**：按钮 re-read route，不再投 prompt；stale warning 不再教用户点刷新。`askRefresh`/`desk-refresh` 已随 A1b 退役；面板只读 route。
5. **同 diff 的合同面**：`cordis.patch.yml`、`docs/architecture.md` §二/浏览器链/功能路由、`docs/identity.md` §一、`docs/operating.md`、`docs/home.md`、`pnpm gen-catalog`；`first-open-draft-banner` 场景 seed 增加 working-folder 五页（3 draft + 2 stable），并合并 dev home 的凭据 refs。

## 输掉的方案

- **保留 `.desk/state.json` 作为面板源、只加第二轮刷新**：治标；拷贝还在，陈旧类 bug 与"刷新"动词都还在。
- **按会话工作区读四个房间**：真值不在 session workspace；多会话会串数据，且与 `docs/operating.md` 的旧措辞同错。
- **route 直接读文件、不用 `assistantMemory`**：重复 archive/parse failure/backlink 语义，第二份实现必漂移。
- **把正文全塞进列表 / 每行再发一次请求**：列表过大或 N+1；采用"列表 excerpt + 单读 body"。
- **新增 `SessionEvent` 做变更通知**：与 `docs/identity.md` 的"不新增 SessionEventMap"冲突；用现有会话 settle 重读即可。
- **在 A1a 就删 `.desk/state.json`/`desk-refresh`**：Q3 未确认；A1a 只换源，退役留给 A1b。
- **在 `bindDeskEnv` 里直接读 `ctx.web`**：Cordis 对未 inject 的服务抛错，client entry 会 failed；改为 try/catch 的可选 test hook，生产读 `document`/`location`。
