---
status: 推敲中
opened: 2026-10-28
---

# 收口：六维审计 P3 残余

> 立卡：2026-10-28 ｜ 状态：推敲中（用户点名「继续处理 P3」） ｜ 类型：Task ｜ 可关闭：否

## 外部结果三要素

- **触发**：六维审计收口后仍留 5 个 P3：catalog 缺 bin/engines、`domain` 的「纯核」措辞有缝、`session-logs` 缺 zstd 时只抛栈、`snapshot.yml` 的 `runner:` 像可执行命令、命令参数形状无门；Viki 调试面与 coverage 阈值是刻意延后。
- **用户得到**：catalog 真正覆盖包形状；「纯核」有一个与事实一致的定义；日志工具在缺 zstd 时给出可操作错误；场景契约不再把描述写成命令。
- **完成条件**：P3-a～P3-d 各自落地并有回归；最终 `pnpm test` + `pnpm verify` 全绿；本卡按关闭条件归档。

## 切片台账

| 片 | 状态 | 证据 |
|---|---|---|
| P3-a catalog 补 bin / engines.pnpm | 已交付 | catalog 列出 3 个 bin 与 `engines.pnpm`；`gen-catalog --check` 绿；`catalog.spec` 断言 bin/pnpm |
| P3-b「纯核」定义对齐（含 fs 存储原语） | 已交付 | `architecture.md` 依赖段定义「纯核 = 不 import DSH 运行时，不代表无 I/O」；包 AGENTS/testing 的误导措辞改域核 |
| P3-c `session-logs` 缺 zstd 的明确错误 | 已交付 | `readEvents` 缺 zstd 报含二进制与日志路径的错误；`session-logs.spec` 用空 PATH 红绿；`docs/dev.md` 前置说明 |
| P3-d `snapshot.yml`：`runner:` 只做 README 指针，`wait_text:` 机器可读 | 已交付 | 8 个 `snapshot.yml` 的 runner 指 README + 独立 wait_text；健康门读 wait_text（旧 runner fallback）；测试红绿；`snapshots/AGENTS.md` 说明 |

## 仍未取

- **命令参数形状门**：需要单独设计可机械判定的模式，避免把自然语言命令误判；触发 = 再次出现缺 `<URL>` 的文档命令。
- **Viki 4 个调试面一键化**：需要 OV mock server 与 `#debug=1` 的 evals；触发 = 下一次需要跑全 8 场景或 Viki 面改动。
- **coverage 阈值**：刻意不做；触发仍是第一处「删了才对」的死代码实证。

## 验收标准

- **P3-a**：`docs/package-catalog.md` 列出 3 个 bin 与 `engines.pnpm`；`pnpm gen-catalog --check` 绿；生成器 spec 有 bin/engines 断言。
- **P3-b**：`docs/architecture.md` 的依赖方向段明说「纯核 = 不 import DSH 运行时，不代表无 I/O」；不批量改词。
- **P3-c**：删掉 PATH 上的 zstd 时 `readEvents` 报含 `zstd` 与日志路径的明确错误；`tests/tooling/session-logs.spec.mjs` 有红绿。
- **P3-d**：8 个 `snapshot.yml` 的 `runner:` 只指 README，`wait_text:` 独立；expected 健康门仍能取出 token；测试覆盖新字段。
- **总验收**：`pnpm test` 全绿、`pnpm verify` 全绿、`pnpm gen-catalog --check` 绿；不改变产品行为。

## 结论

P3-a～P3-d 全部交付：catalog 完整、措辞有定义、缺 zstd 有可操作错误、场景契约不再把描述当命令。最终地板：`pnpm test` 144 文件 / 1099 测试、`pnpm verify` 50/50、`pnpm gen-catalog --check` 绿；无产品行为变化。命令形状门、Viki 4 面一键化、coverage 阈值是刻意延后项。
