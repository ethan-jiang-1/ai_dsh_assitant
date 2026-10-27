日期：2026-10-28 · 状态：**proposed（待拍板）**（来源 = [2026-10-28 六维深审](../../_backlog/research/tech-exploration/261028-six-dimension-audit.md)；机械真相修复已落 `5cb43b8` / `21dab8d`）

# 六维深审后的持续改善（S1–S4）

## 问题（可观察行为）

深审确认骨架立住，但三类接缝在持续消耗 agent：常驻上下文变贵、真页面反馈可假绿、代码 seam 被绕过。

1. **入口在单调变重**：根 `AGENTS.md` 已 27.9KB / 221 行 / 40 条命令；命令表 76 行（34%）。过去 33 天从 11.7KB / 13 条长到 27.9KB / 40 条，门禁注释自己写着根表应保持短。每个新会话先付约 8–10k tokens。
2. **真页面回归面手工且可假绿**：web-face 8 个场景不在 verify 里；`--refresh` 不校验 `readyState` / `consoleErrors` / `networkFailures`，一次误录可把坏状态固化成基线。本轮已实证 runbook 因夹具 opt-in 失效（缺 patch 超时红，补上 PASS）。
3. **环境红 / 行为红 / 跳过混在退出码**：`pnpm eval` 无会话日志记 `passed:false`；无 Chrome 的 `web-install-smoke` 直接 `exit 0`；`standalone-smoke` 跳过 client/preset UI 仍打印 `passed`。
4. **代码接缝**：`src/cli/` 以 value import 取 `host/operating-ledger/archive.ts`；`desk-projection/receipts.ts` 跨行直读同一归档格式，绕过账本服务 seam；697 行 `cli/assistant-data.ts` 兼作第二 barrel；366 行 `projection-panel` 单函数含四态。
5. **测试缺口**：`domain/operating/ledger.ts` 无直接 spec；客户端 React shim 的 `useState` 是 `[initial, vi.fn()]`、`useEffect` no-op，无真 DOM 重渲染；coverage 无机器读数（政策是「先纪律后机器门」，见 docs/testing.md）。

## 提案

四片，按 S1 → S2 → S3 → S4 推进；每片独立提交、独立回退。S1/S2 优先：一个降上下文税，一个堵假绿。

**S1 入口瘦身（只动文档与门禁，不动行为）**

- 新建 docs/commands.md（提案中的新文件），承接根 `AGENTS.md` 的 35 条参考命令（保留每条的命令、判据、指向）；根只留「`pnpm start` 五步 + 日常四条（build/test/verify/start）+ 一指针」。
- 更新命令清单的 owner 指针（`README.md`、`docs/dev.md` §四/§六、`docs/testing.md`、`dev/AGENTS.md`、`docs/AGENTS.md` owner 表），保持「一个清单一个家」。
- `docs-commands` 门禁与启动门禁继续读根；`commandAliasProblems` 仍扫全语料，别名不会因搬家漏文档。补一条「根命令表不再出现」的结构检查（红夹具）。
- 目标：根降到约 18KB / ≤150 行；`pnpm verify` 全绿。

**S2 反馈诚实性（让红/绿说真话）**

- `webui-expected` refresh 硬门：写 `expected.dom.json` 前要求 `readyState === 'complete'`、`consoleErrors` 与 `networkFailures` 为空；违反则打印原因并 exit 1。把判定抽成 `webui-expected-core` 的纯函数，配红绿 spec；8 个现有 expected 先全部通过（当前扫描：全 complete、错误列表空）。
- `pnpm eval` 缺 key / 无会话日志 → **BLOCKED**（exit 2），不并入 pass/fail；输出与 `eval:continuity` 同形；补自检负例。`docs/dev.md` 的「缺 key 不能算行为红」与实现一致。
- 发布 smoke 的跳过改为 **BLOCKED**：无 Chrome 的 `web-install-smoke` exit 2；`standalone-smoke` 的 UI 半场未跑时末尾打印 `BLOCKED` 并 exit 2，不再 `passed`；`release-smoke` 的 keyless 跳过不再记 `ok`。`docs/release.md` §七同步。
- （可选，独立小片）给 `expected.dom.json` 加 verify 健康门：`complete` + 两个错误列表空 + `controls > 0` + 场景 token 在 `visibleText`；当前 8 个全过，加红夹具。

**S3 代码接缝（行为不变）**

- 把 `operations-archive.jsonl` 的文件名常量、解析、序列化、合并从 `host/operating-ledger/archive.ts` 收进 `src/domain/operating/`（账本词汇的现有家）；`cli` 与 `desk-projection` 改为消费它。收益：消灭 `cli→host` 与 `host→host` 两条内部依赖，归档格式只有一个 owner。
- 拆 `projection-panel.ts` 的 366 行单函数为 four-state 子组件 + 标签表，props 契约不变；现有 45 个面板 spec 与 `web-expected` 作回归。
- 拆 `cli/assistant-data.ts` 按命令分文件，入口只做 argv 分发；删掉底部长 re-export；`tests/tooling/assistant-data.spec.mjs` 保行为。

**S4 测试缺口（先测行为，再谈覆盖率）**

- `domain/operating/ledger.ts` 直接 spec：revision 单调、同 operationId 重放 no-op、同 revision 第二笔冲突、unknown matter 拒绝并留回执；改坏自增应红（`pnpm test:domain`）。
- 给客户端加一个最小真 DOM 环境（jsdom/happy-dom + React DOM）或把 `projection-selection` / `projection-live` 固化成 `pnpm web-face-check` 门；先覆盖「输入→提交→in-flight disabled→revision 推进后恢复」这一条，证明删掉 `useStore` 订阅会红。
- coverage 先只报告（`@vitest/coverage-v8`），不设阈值；按 `docs/testing.md` 既有触发，等第一处「删了才对」的死代码实证再上 per-file 门。

**共同边界**：不重写入口、不拆所有 >400 行文件、不新增流程层；只动有证据的三处代码 seam 与三个反馈出口。

## 输掉的方案

- **一次性重写根 `AGENTS.md`**：入口的密度是刻意路由层，重写会丢“先判能不能开工”的顺序收益；只搬参考表，保留前 30 行与布局/硬规则。
- **给每句文档加语义门禁**：自然语言禁令可被措辞绕过（identity 的 bin 句就是例子），只会制造假安全感；能机械化的只做命令参数形状与 expected 健康。
- **只压缩命令表行数、仍留在根**：上下文税照付；命令表是参考 runbook，不是常设指令。
- **删 web-face 场景、靠单测**：那是唯一真渲染证据；错的是手工与 refresh 守卫，不是场景本身。
- **把整套浏览器测试塞进 vitest / verify**：依赖、耗时与 flake 成本高于收益；先用现有探针与独立 `web-face-check` 车道。
- **为账本格式另建共享包**：domain 已是账本词汇的家，再开一层是把同一事实放第二处。
- **立刻上 per-file coverage 门**：政策写明「先纪律后机器门」；没有死代码实证时，阈值只会逼出凑覆盖。

## 验收

- **S1**：`pnpm verify` 全绿（48+ 条）；根 `AGENTS.md` ≤ ~18KB 且不再含命令表；`grep -c '^pnpm ' AGENTS.md` 明显下降；所有 `package.json` alias 仍在至少一份当前文档中出现；fresh 读者按根能在 3 分钟内走到启动五步。
- **S2**：refresh 健康门有红绿 spec（坏 evidence 写盘必须 exit 1）；无 key 的 `pnpm eval` 输出 `BLOCKED` 且 exit 2；无 Chrome 的 `web-install-smoke` exit 2、`standalone-smoke` 不再打印 `passed`；`pnpm test` + `pnpm verify` 全绿；docs/dev、docs/release、docs/testing 同步。
- **S3**：`grep -R "host/operating-ledger/archive" src/cli src/host/desk-projection` 为空；`pnpm typecheck && pnpm test && pnpm build && pnpm test:composition` 全绿；`pnpm web-expected --scenario desk-eight-matters-first-open` PASS；面板 45 spec 不改断言而绿。
- **S4**：新增 ledger spec 先红后绿；真 DOM 用例删订阅必须红；`web-face-check`（若建）8 场景全 PASS；coverage 报告生成但 `pnpm verify` 不因阈值红。
- **收尾**：每片一个 commit；阶段收口跑 `pnpm typecheck && pnpm test && pnpm verify`，报告只列真跑过的命令；跨片授权变化写回本卡状态行与 `_backlog/issues/` 收口卡。
