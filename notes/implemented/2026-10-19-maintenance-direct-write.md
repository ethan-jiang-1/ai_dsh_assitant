# 维护面 A2：直写当场生效（审批 / 纠错 / 退役）

日期：2026-10-19 · 状态：**implemented**

## 问题（可观察行为）

A1a 后面板读的是 working folder 真值，但"改"仍走 `sendPrompt`：知识批准只在 `assistantKnowledge.approvePage` Remote 挂载成功时直调，失败就投一句话；知识过时、记忆纠错、技能退役都还是模型回合。用户要的是**点完当场变、不靠模型回合**，且每次直写留痕、失败有可读原因；**绝不回退 prompt**。

## 决定

1. **传输 = host POST，不是 Remote**：A2a 探针先跑了 strict-codec 修复（`approve-mount.ts` 的 parameter 改为手写 strict，result 仍 `src-json`）；探针随后在真机抓到的失败不是 codec，而是 **client entry 无法消费动态挂载的 namespace**（`cannot get property "remote.assistantKnowledge" without inject`——Cordis 对未 inject 的服务抛错，而 namespace 在 apply 内才挂载，不能静态 inject）。因此产品路径统一走 host `POST /api/assistant/rooms`；`assistantKnowledge` host 行保留，client 不再从它取产品行为（`client/index.ts` 仍尝试挂载，失败只 console.info）；`approve-mount.ts` 的 codec 事实修正保留，探针保留为核查。
2. **受控写路由**：`assistant-rooms` 的 exact route 扩为 `GET/POST`（`requestBody:'buffered'`，owner-only）。POST `{ action, ... }` 白名单：`knowledge.approve` / `knowledge.deprecate` / `memory.correct` / `memory.retire` / `memory.remember`（[C2](2026-10-19-message-remember.md) 增） / `skill.retire`。每个动作校验 action/id/name/状态；错误 400/404/409，响应可读 JSON。见 [`rooms-route.ts`](../../packages/dsh-smart-assistant/src/host/rooms-route/route.ts)。
3. **记忆的语义**：纠错 = `saveMemory({ text, supersedes: oldId, source:'panel-direct' })`——新记录 + 旧记录进 `archive/`，**不改旧文件正文**；退役 = `forgetMemory`（移出活跃集到 `archive/`，不是硬删）；技能退役 = `retireSkill`（bundle 进 `skills/archive/`）。
4. **审批账**：`ApprovalKind` 扩 `correct | retire`；`ApprovalAuditOptions` 加可选 `before`/`after`；`recordApproval` 行带这两字段（旧行无字段仍可读）。knowledge approve/deprecate 由 `promotePage`/`deprecatePage` 内部写行；memory/skill 由 route 写行。见 [`approval-audit.ts`](../../packages/dsh-smart-assistant/src/host/approval-audit.ts)。
5. **客户端即时换组**：`room-data-actions` 的批准/过时/纠错/退役走 `postRoomsAction`，成功后 `patchRoomRows` 就地把当前 session 的投影翻状态/换记忆记录/移除行并重算 counts；失败保留原行 + 可读 note。记忆行加「退役」二次确认。**没有 prompt fallback**。

## 输掉的方案

- **保留 prompt fallback**：等于放弃"当场变"；A1a 读真值后它只会让用户更困惑。
- **给 memory/skill 再建一套 Typert Remote namespace**：B/C 也要写；一个语义混杂的 namespace 或三套挂载不如一条 owner-only POST；而且 A2a 已证明 client entry 消费不了动态 namespace。
- **直写改旧记忆文件正文**：丢 provenance 与取代链；`saveMemory({supersedes})` 是既有形状。
- **记忆退役做成硬删**：`forgetMemory` 的既有语义是 `archive/` + `status: retired`。
- **把 before/after 塞进 `id`/`title` 字符串**：不可机械读；加可选字段、旧行兼容。
- **客户端乐观写入后失败静默回滚**：用户看到假状态；先成功响应再改 store，失败保留原行 + note。
