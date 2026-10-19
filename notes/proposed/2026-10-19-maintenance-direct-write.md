# 维护面 A2：直写当场生效（审批 / 纠错 / 退役）

日期：2026-10-19 · 状态：**proposed**（A 卡 v2 A2；2026-10-19「落地计划」授权实施；切片验收与停点住 [A 卡](../../_backlog/issues/261019-self-update-lanes.md#切片进展)）

## 问题（可观察行为）

A1a 后面板读的是 working folder 真值，但"改"仍走 `sendPrompt`：知识批准只在 `assistantKnowledge.approvePage` Remote 挂载成功时直调，失败就投一句话；知识过时、记忆纠错、技能退役都还是模型回合。用户要的是**点完当场变、不靠模型回合**，且每次直写留痕、失败有可读原因；**绝不回退 prompt**。

## 提案

1. **A2a strict-codec 探针（先做，决定知识批准的传输）**：把 [`approve-mount.ts`](../../packages/dsh-smart-assistant/src/client/approve-mount.ts) 的 **parameter** codec 从 `src-json` 改为手写 strict（`{ mode:'strict', typeSymbol, create: () => ({ parse: value => value }) }`），result 仍 `src-json`。真机探针 `dev/probes/web/approve-direct-probe.mjs`：打开知识室、点「批准」，断言 `audit/approvals.jsonl` 出现 `source: panel-direct`（不是 `assistant_reflect`）且无 `remote.session.prompt` 调用。能挂 → 知识批准沿用现有 `assistantKnowledge` namespace；不能挂 → 该 action 也走下面的 POST。无论哪种，**不写 prompt fallback**。
2. **A2b 受控写路由**：`assistant-rooms` 的 exact Fetch route 从 `methods:['GET']` 扩为 `['GET','POST']`（`requestBody:'buffered'`，owner-only）。POST body `{ action, ... }`，白名单：
   - `knowledge.approve` → `promotePage`（`source: panel-direct`，带 before/after）；
   - `knowledge.deprecate` → `deprecatePage`（同上）；
   - `memory.correct` → `saveMemory({ text, supersedes: id, source:'panel-direct' })`（新记录 + 旧记录 archive；**不改旧文件正文**）；随后 `recordApproval('correct', newId, { source:'panel-direct', before, after })`；
   - `memory.retire` → `forgetMemory(id)`（移出活跃集到 `archive/`，**不是硬删**）；`recordApproval('retire', id, { source:'panel-direct', before, after })`；
   - `skill.retire` → `retireSkill(name, reason)`；`recordApproval('retire', name, { source:'panel-direct', before, after })`。
   每个 action 校验 action 白名单、id/name 文法、目标存在与状态；错误映射 400/404/409/500，响应是可读 JSON。**不新增**（C2 的 `source=panel:message:<id>` 新建是唯一例外，A2 先拒）。
3. **A2c 客户端即时换组**：`room-data-actions` 的批准/过时/纠错/退役改走 POST（知识批准先试 A2a 的 Remote，失败再 POST）；成功后在当前 session 的 slice 上就地改 `DeskData`（批准/过时翻 status、纠错换新记录、退役移除行），不等下一次 route 读；失败显示可读 note，行不变。面板给记忆行加「退役」（二次确认），技能退役的 UI 由 C1 接。
4. **审批账 schema**：`ApprovalKind` 扩 `correct | retire`；`ApprovalAuditOptions` 加可选 `before`/`after`（JSON 值），旧行无这两字段仍可读；`retireSkill`/`saveMemory`/`forgetMemory` 不写行的路径由 A2b 的 route 补。

## 输掉的方案

- **保留 prompt fallback**：等于放弃"当场变"；A1a 的读真值后它只会让用户更困惑。
- **给 memory/skill 再建一套 Typert Remote namespace**：B/C 也要写；一个语义混杂的 namespace 或三套挂载不如一条 owner-only POST。
- **直写改旧记忆文件正文**：丢 provenance 与取代链；`saveMemory({supersedes})` 是既有形状（新记录 + 旧记录 archive）。
- **记忆退役做成硬删**：`forgetMemory` 的既有语义是 `archive/` + `status: retired`；保留可读副本。
- **把 before/after 塞进 `id`/`title` 字符串**：不可机械读；加可选字段、旧行兼容。
- **客户端乐观写入后失败静默回滚**：用户看到假状态；先成功响应再改 store，失败保留原行 + note。

## 验收

- **红先**：`tests/host/rooms-actions.spec.ts`（POST 白名单/五动作/错误/台账 before-after）；`tests/host/approval-audit.spec.ts`（`correct|retire` + 旧行兼容）；`tests/client/client-panels.spec.ts`（点击→store 立即换组；失败保留原行）；`tests/client/client-room-data-io.spec.ts`（POST 路径、无 `remote.session.prompt`）；`dev/probes/web/approve-direct-probe.mjs`（A2a 真机）。
- **绿**：`pnpm --filter dsh-smart-assistant exec vitest run tests/host/rooms-actions.spec.ts tests/host/approval-audit.spec.ts tests/client/client-panels.spec.ts tests/client/client-room-data-io.spec.ts`；`pnpm build`；`pnpm test`；`pnpm verify`；`pnpm web-expected` 两场景（面板行变化过目 diff）；A2a 真机探针 + `pnpm webui-preflight`。
- **无 prompt**：客户端 spec 断言动作路径没有 `remote.session.prompt`；台账行 `source: panel-direct`。
- **人判**：本人在真机上点一次批准/纠错/退役，确认"当场变"且刷新页面后仍一致。
- **停点**：A2 绿后停；A3 另立 proposed 卡（收据 baseline/revision）。
