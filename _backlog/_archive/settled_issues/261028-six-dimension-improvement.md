---
status: 已结
opened: 2026-10-28
---

# 收口：六维深审后的持续改善（S1–S4）

> 立卡：2026-10-28 ｜ 状态：已结（已授权实施，S1–S4 全交付） ｜ 类型：Task ｜ 可关闭：是
> 授权：用户 2026-10-28 在「S1+S2 / S1–S4 全做 / 只做 S2 / 先暂停」中选 **S1–S4 全做**。
> 提案与取舍 = [implemented note](../../../notes/implemented/2026-10-28-six-dimension-continuous-improvement.md)；证据与边界 = [六维深审](../../research/tech-exploration/261028-six-dimension-audit.md)。

## 外部结果三要素

- **触发**：2026-10-28 六维打扫卫生深审（四路 fresh 审计 + 主线复核 + 真机取证）确认 12 处机械漂移已修，仍有四类接缝问题：入口上下文税、反馈假绿、代码 seam 绕过、测试缺口。用户批准四片全做。
- **用户得到**：根 `AGENTS.md` 不再背着参考型命令表；eval / web-face / release smoke 的红绿不再把「没跑」说成绿；账本归档格式只有一个 owner；纯核 ledger 与真页面交互有直接回归面。
- **完成条件**：S1–S4 逐片提交；每片按卡上验收真跑；阶段收尾 `pnpm typecheck && pnpm test && pnpm verify` 全绿 + `web-expected --scenario desk-eight-matters-first-open` PASS；本卡按关闭条件归档，proposed 卡毕业或收窄。

## 切片台账

| 片 | 状态 | 证据 |
|---|---|---|
| S1 入口瘦身（命令表迁 `docs/commands.md`；根留启动+日常+指针；命令预算门） | 已交付 | 根 180 行 / 21.4KB / 7 条 `pnpm` 行（原 221 行 / 27.9KB / 40 条）；`docs/commands.md` 106 行；命令预算门 + 红夹具；`pnpm verify` 49/49；`pnpm test` 143 文件 / 1083 |
| S2 反馈诚实性（refresh 健康门、eval BLOCKED、smoke 跳过→BLOCKED、expected 健康门） | 已交付 | refresh 纯核红绿 spec；eval 无日志 **BLOCKED exit 2**（空 profile 实测）；release-smoke 无 key **BLOCKED exit 2**（实测）；web-install 无 Chrome **BLOCKED exit 2**（实测）；expected 健康门（complete/空错误/controls/token）；`pnpm test` 143/1090、`verify` 50/50 |
| S3a 账本归档 seam（格式收进 `domain/operating`；cli/desk-projection 消费） | 已交付 | `archive.ts` 移入 `src/domain/operating/`；host/cli/desk-projection/test 全部改指；无 `host/operating-ledger/archive` 内部引用；typecheck + 143/1090 + verify 50 |
| S3b 面板四态拆分（props 契约不变） | 已交付 | SimpleFace / ActivityFace / MatterBoard 三个命名组件；主函数 366→228 行；`pnpm test` 144/1096、`verify` 50/50；真机 `web-expected desk-eight-matters-first-open` PASS |
| S3c data CLI 按命令拆分（入口只做 argv 分发） | 已交付 | 入口 `assistant-data.ts` 27 行（只再导出）；实现 = `assistant-data-bundle.ts` 563 行 + `assistant-data-types.ts` 144 行；typecheck + 144/1096 + verify 50；tooling 348 |
| S4a 纯核 ledger spec（revision/重放/冲突/未知事项） | 已交付 | `tests/domain/operating-ledger.spec.ts` 6 it：revision 增长、同 id 重放 no-op、同 id 异内容拒绝、未知事项留回执、revive 回填；`test:domain` 18/202 |
| S4b 真页面交互回归（客户面 4 场景） | 已交付 | `pnpm web-face-check` 全跑 PASS：隔离 home/seed/boot/比对/收；banner 旧 runbook 已按当前一页纸入口重录（新会话 + composer 文案门），PNG 过目；Viki 调试面仍手工（需 OV mock） |
| S4c coverage 只报告（不设阈值） | 已交付 | `pnpm test:coverage` 跑同一套 144 文件 / 1096 测试；语句 79.46% / 分支 71.89% / 函数 76.08% / 行 83.62%；报告 `.tmp/coverage/coverage-summary.json`；无阈值、不进门禁 |

## 仍未取

- S4b 的落地形态：`happy-dom` / `react-dom` 已在 pnpm store，但 `pnpm add --offline` 被 supply-chain policy 拦下；首选用现有 Chrome/CDP 探针做 keyless `web-face-check`，不把新依赖当默认路径。
- S4c 的 coverage 工具：`@vitest/coverage-v8` 不在本机 store，report-only 也需联网安装；安装路径明确前不把它当已完成项。
- S3c 已按「types / bundle / 27 行再导出」一次拆完；若后续命令族继续增长，再按命令族分模块，仍以行为测试为回归。

## 验收标准

- **S1**：`pnpm verify` 全绿；根 `AGENTS.md` 不再含参考命令表、`grep -c '^pnpm '` 降到日常级；`package.json` 的每个 alias 仍在至少一份当前文档出现；启动门禁仍从根读到 `prepare.sh` → `setup.sh` → 两个 `--profile` 入口。新增的命令预算门有红夹具（在根里塞回一条参考命令即红）。
- **S2**：refresh 健康门有红绿 spec（坏 `consoleErrors`/未 complete 写盘必须 exit 1）；无 key 的 `pnpm eval` 输出 `BLOCKED`、exit 2；无 Chrome 的 `web-install-smoke` exit 2、`standalone-smoke` 不再打印 `passed`；`pnpm test` + `pnpm verify` 全绿；docs/dev、docs/release、docs/testing 同步。
- **S3a**：`grep -R "host/operating-ledger/archive" src/cli src/host/desk-projection` 为空；`pnpm typecheck && pnpm test && pnpm build && pnpm test:composition` 全绿；归档解析/合并有直接 spec 或既有 host spec 仍覆盖。
- **S3b**：面板 45 个 spec 不改断言而绿；`web-expected --scenario desk-eight-matters-first-open` PASS；`projection-panel.ts` 主函数不再单函数承担四态。
- **S3c**：`cli/assistant-data.ts` ≤ 250 行且只做 argv 分发；`tests/tooling/assistant-data.spec.mjs` 全绿。
- **S4a**：新增 ledger spec 先红后绿；`pnpm test:domain` 绿。
- **S4b**：删掉 store 订阅或去掉一次点击后的读回必须红；选 jsdom 则只加一个最小环境并说明依赖；选 web-face-check 则 8 场景可一键复跑并在 `docs/testing.md` 登记车道。
- **S4c**：coverage 报告能生成；`pnpm verify` 不因阈值红；报告里写明「只报告，未设门」。
- **收尾**：每片一个 commit；报告只列真跑过的命令；本卡台账逐片补证据。

## 结论

S1–S4 全部交付。最终地板（2026-10-28）：`pnpm typecheck` 绿；`pnpm test` 144 文件 / 1096 测试；`pnpm verify` 50/50；`pnpm web-face-check` 4 个客户面全部 PASS；`pnpm test:coverage` 只报告（无阈值）。决定 = [implemented note](../../../notes/implemented/2026-10-28-six-dimension-continuous-improvement.md)。
