# 维护面 A1b：退役 `.desk/state.json` 拷贝与 `desk-refresh` 技能

日期：2026-10-19 · 状态：**proposed（实施中）**（A 卡 v2 A1b；Q3 已按 2026-10-19「落地计划」默认采用——退役；模型面/客户端/preflight/场景/评测任务已落地，`dev/reports` 指标与真机验收待收；切片验收住 [A 卡](../../_backlog/issues/261019-self-update-lanes.md#切片进展)）

## 问题（可观察行为）

A1a 让面板读 working folder 真值、A2 让点击当场生效、A3 给出收据后，模型面仍在教两件已经不需要的事：每个会话写一份 `.desk/state.json` 拷贝（`desk-refresh` 技能 + 家手册 Room data 节 + `operating-brief` 一句 + `action-plan`/`first-conversation` 交叉引用），面板已经完全不读它；客户端还有 `askRefresh` 这个只投 prompt 的"刷新"动词和 `DESK_REFRESH_STEP`。留着就是第二份契约、第二套话术和持续的 token 税。A1b 的任务是**纯减法**：删掉拷贝与技能，把所有引用、测试、探针、场景、评测任务、指标一起收口。

## 提案

1. **模型面减法**：删 `presets/assistant/skills/desk-refresh/`；删家手册的 Room data 节（`home-map.ts` 的 `### Room data` 段）与 `desk-refresh` 的叙述句；删 `operating-brief` 的 `.desk/state.json` 一句；删 `action-plan/SKILL.md` 与 `first-conversation/SKILL.md` 的交叉引用。模型面只剩"四房间 + 账本"的事实。
2. **客户端减法**：删 `room-data-actions.ts` 的 `askRefresh` 与 `DESK_REFRESH_STEP`；`askApproveProposal`/`askRejectProposal`/`flagKnowledgePage` 的 prompt 不再点名已退役技能；`dom-utils` 的「重读房间数据」保留为 route 重读（不是 prompt），`room-tabs` 的重试保留 `loadDeskFor`。删所有 `.desk/state.json` 读取/错误文案/注释（A1a 后已无真读，留下的是命名与注释）。
3. **合同与文档**：`docs/home.md` 删"房间数据文件"最小契约；`docs/architecture.md` 删 `.desk` 读回链与 `desk-refresh` 会话车道（`assistant-rooms` 的 GET/POST/receipt 是唯一房间数据面）；`docs/dev.md` 的 `desk-refresh` 指标与 `desk-loop` 说明改为已退役/删；`docs/package-catalog.md` 由 `pnpm gen-catalog` 重生成；`cordis.patch.yml` 注释里的 `desk-refresh` 更新。
4. **测试/探针/场景**：`tests/host/root-files.spec.ts` 与 `tests/composition/preset-composition.spec.ts` 的家手册/技能断言删 Room data/`desk-refresh`；`tests/client/client-room-tabs.spec.ts`/`client-room-data-io.spec.ts`/`client-entry.spec.ts`/`client-first-mile.spec.ts` 的 `.desk` 文案/注释更新；`webui-preflight.mjs` 的 desk-readiness 改为 **working folder / route readiness**（不再要求 workspace 里有 `.desk/state.json`，否则 `pnpm start` 红）；`snapshots/web-face/first-open-draft-banner/seed.mjs` 删 desk 文件写入（只留 working-folder 知识页），README/snapshot 契约同步；`webui-loop-probe.mjs` 的 `deskStale` 采样删/改。
5. **评测与指标**：删 `dev/eval/tasks.mjs` 的 `desk-refresh-loop` 任务与 `tests/tooling/eval-checks.spec.mjs` 的对应夹具；`dev/eval/run.mjs`/`dev/eval/checks.mjs` 的 `desk-refresh` 路径说明更新；`dev/reports/desk-loop-report.mjs` 的 `SKILL`/`DESK_PATH`/§1/§4 "点名技能/重写文件"指标退役（保留其余摩擦指标）；`docs/dev.md` 的 `pnpm desk-loop` 说明同步。
6. **验证**（A1b 的关）：`pnpm test`、`pnpm verify`、`pnpm start`（preflight 绿）、`pnpm eval --only <受影响任务>` + `repo-live-probe`（模型面只有减法）、`pnpm web-expected` 两场景（seed 改后重录并过目）；全量 grep 零命中。

**grep 口径（零命中；排除历史/运行现场）**：
```sh
grep -rnE 'desk-refresh|\.desk/state\.json|DESK_REFRESH_STEP|askRefresh' \
  packages/dsh-smart-assistant/src packages/dsh-smart-assistant/tests \
  packages/dsh-smart-assistant/presets packages/dsh-smart-assistant/cordis.patch.yml \
  docs dev/eval dev/probes dev/reports snapshots dev/AGENTS.md \
  --exclude-dir='trial-home*' --exclude='sheet-*.md'
```
排除：`_backlog/`（推敲历史）、`notes/archived|implemented`（历史证据）、`dev/trial-home*`/`dev/harness-home`（运行现场）、`dev/eval/domain/sheet-*.md`（历史评测报告）、`vendor/`、`node_modules/`、`.tmp/`。`dev/eval/domain/sheet-*` 是冻结报告，不改写历史。

## 输掉的方案

- **保留拷贝/skill 作"兼容"**：面板已不读，模型仍付费；第二份契约必然漂移。
- **只删面板读取、保留模型写入**：A1a 已做到；A1b 要的是删写入契约，不是再留一条死路径。
- **只删 skill、不删家手册/交叉引用**：模型会继续找 `.desk`，只是没了技能，更糟。
- **把 preflight 直接删掉**：preflight 还守 auth/boot graph/bundle 注册；只把 desk-readiness 换成 rooms/route readiness。
- **保留 `desk-refresh-loop` 评测任务**：它测的技能不存在，`pnpm eval` 会假红/假绿；退役任务并在 `docs/dev` 记一句。
- **只改代码不改测试/场景**：`pnpm test`/`web-expected` 会红；同 diff 收口。

## 验收

- **红先**：`pnpm verify` 的 links/catalog/语言；`pnpm test` 的 `root-files`/`preset-composition`/`client-*`；`pnpm start` 的 preflight；`web-expected` 两场景。先看它们因 `.desk`/`desk-refresh` 红，再改到绿。
- **绿**：`pnpm typecheck && pnpm test && pnpm verify`；`pnpm start`（URL + preflight 绿）；`pnpm web-expected` 两场景 PASS；`pnpm eval --only <受影响任务>`；`repo-live-probe` 看 system prompt 不再有 Room data/`desk-refresh`；全量 grep 零命中（上面的口径）。
- **模型面**：`pnpm gen-catalog` 后 catalog 无 `desk-refresh`；`repo-live-probe` 的段落里没有 `.desk/state.json`/`desk-refresh`；`pnpm eval` 的水位不降。
- **人判**：本人确认面板仍能读正文、点完生效、"自上次以来"仍在；模型不再提 `.desk`/`desk-refresh`。
- **停点**：A1b 绿后停；B 卡另立（Viki 内容面）。
