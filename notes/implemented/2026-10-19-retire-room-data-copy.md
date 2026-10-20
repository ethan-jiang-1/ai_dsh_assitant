# 维护面 A1b：退役 `.desk/state.json` 拷贝与 `desk-refresh` 技能

日期：2026-10-19 · 状态：**implemented**

## 问题（可观察行为）

A1a/A2/A3 之后面板读真值、点击当场生效、看得见收据，但模型面仍在教两件已经不需要的事：每个会话写一份 `.desk/state.json` 拷贝（`desk-refresh` 技能 + 家手册 Room data 节 + `operating-brief`/`action-plan`/`first-conversation` 交叉引用），面板已经完全不读它；客户端还有 `askRefresh` 这个只投 prompt 的"刷新"动词。留着就是第二份契约和持续的 token 税。A1b 是**纯减法**：删拷贝与技能，把引用、测试、探针、场景、评测任务、指标、旧 home 手册一起收口。

## 决定

1. **模型面减法**：删 `presets/assistant/skills/desk-refresh/`；删家手册 Room data 节及叙述句（`home-map.ts`）；删 `operating-brief` 的 `.desk` 句；删 `action-plan`/`first-conversation` 的交叉引用。模型面只剩"四房间 + 账本"。
2. **客户端减法**：删 `askRefresh`/`DESK_REFRESH_STEP` 与所有 `.desk` 读取/错误文案/注释；删 `retireStaleReceipt` 与旧 desk 分区（`threads/decisions/gaps/actions/recentActivity`）；`looksLikeDesk` 收敛为 route 的 `generatedAt`。保留「重读房间数据」= route 重读，不是 prompt。
3. **preflight**：desk-readiness → **rooms route readiness**（用浏览器 cookie 调 `GET /api/assistant/rooms`，校验 `schemaVersion`+`generatedAt`；空 home 是合法空投影）。
4. **场景**：banner seed 的 `desk` 命令改 `rooms`，只种 working folder 五页；README/`snapshot.yml` 契约同步；blank README 的 desk 表述更新。
5. **评测与指标**：删 `desk-refresh-loop` 任务与对应夹具；`dev/eval/run.mjs` 的 `wrotePath` 自检改通用路径；`dev/reports/desk-loop-report.mjs` 的 `SKILL`/`DESK_PATH`/§1/§4 "点名技能/重写文件"指标退役（保留其余摩擦指标）；`docs/dev.md` 同步。
6. **旧 home 手册迁移（探针发现的缺口）**：既有 home 的 `AGENTS.md` 是 v15 生成版（几周内不会自然更新），探针实测它仍把 Room data/`desk-refresh` 送进 system prompt。`home-map.ts` 升 `HOME_MANUAL_VERSION=16` 并加 `migrateHomeManual`：只移除**精确的**旧生成段落（并替换旧叙述句），手改一字不动；`scaffoldHome` 对已有生成版做迁移，缺文件仍种新版。`root-files` 用"旧生成版 + 手写行"与"无该段的手写手册"两例钉住。
7. **同 diff**：`docs/home.md`（手册迁移）、`docs/architecture.md`（唯一房间数据面）、`docs/operating.md`、`cordis.patch.yml` 注释、`docs/package-catalog.md`（重生成）。

**grep 口径**：活跃的 `src`/`presets`/`docs`/`dev/eval`/`dev/probes`/`dev/reports`/`snapshots` **正向引用为零**；`tests` 里只剩三条 `not.toContain` 负向钉子（`root-files`、`preset-composition`、`client-room-tabs`），它们是退役的回归门，不是遗漏。历史面不改写：`_backlog/`、`notes/`、`dev/eval/domain/sheet-*.md`、`dev/trial-home*`/`dev/harness-home`（运行现场）。

## 输掉的方案

- **保留拷贝/skill 作"兼容"**：面板已不读，模型仍付费；第二份契约必然漂移。
- **只删面板读取、保留模型写入**：A1a 已做到；A1b 要删的是写入契约。
- **只删 skill、不删家手册/交叉引用**：模型会继续找 `.desk`，只是没了技能，更糟。
- **把 preflight 直接删掉**：它还守 auth/boot graph/bundle 注册；只换 readiness 的检查对象。
- **保留 `desk-refresh-loop` 评测任务**：它测的技能不存在，`pnpm eval` 会假红/假绿；退役任务并在 `docs/dev.md` 记一句。
- **只改代码、不改既有 home 的手册**：探针证明模型面实际仍有旧指令；只种新 home 等于对现有用户无效。
- **迁移时整份覆盖 `AGENTS.md`**：手改会被吞；只移除精确旧段，手改保留。
- **只改代码不改测试/场景**：`pnpm test`/`web-expected` 会红；同 diff 收口。
