# 2026-09-23 · 文档一致性修正（结构审计切片）

日期：2026-09-23 · 状态：**implemented**（本切片）
已归档：2026-10-08（战役、审计或收口已结束；结论在现行合同或仍有效的决定里。本篇冻结，不再跟踪。）

## 背景

对全 repo 做了一次结构审计（系统性 / 结构性 / 一致性 / 自洽性四维，agent 第一视角）。
发现 8 处问题，除目录名拼写刻意不改外，全部为"登记型"修正：零代码行为变更，不动 verify 逻辑。

## 修正清单

| # | 问题 | 修正 |
|---|---|---|
| 1 | README.md 开发命令仍是单 profile 旧方案（`pnpm dsh --profile dev "one task"`），与 dev/dev-task 双 profile 现状矛盾——README 是人的第一入口，照跑会踩"one-shot 不进 preset"的坑 | 对齐 AGENTS.md 命令表：one-shot = dev-task；Web UI = `dev --port 0` |
| 2 | 已交付的实现 note 躺在 `proposed/`：repo-structure 自家时态纪律明文"不留 proposed/ 到交付后"，却连标题都还写"未实现"；dev-home-launcher 已标"已定并已实现"也还在 proposed/ | 两份同日搬入 `implemented/`（`git mv` 保历史）；repo-structure 标题、时态节、验证项编号（两个 6）与"尚未实跑"过期句一并补记 |
| 3 | intents.md 全表 I1–I14 停在 `proposed` 且无挡板说明，新读者分不清"没做"还是"没更新" | 表头补一行：外部可观察行为待 dev Web UI 真实会话验证后才翻 `implemented` |
| 4 | AGENTS.md 布局表漏 `snapshots/`（有自述 README、verify 强制其存在，但"谁管它"无处可查） | 补一行 owner 行 |
| 5 | AGENTS.md 硬规则 2 的 docs/capability-seams.md 指向不明（紧跟 `vendor/dsh/docs/…` 之后，读起来像本 repo docs/ 的文件，真身在 vendor） | 写全路径 `vendor/dsh/docs/capability-seams.md` |
| 6 | 语言分工事实上存在（模型可见面 = 英文，人读文档 = 中文）但未成文，repo 内脚本注释中英混用 | AGENTS.md 登记一行约定（脚本随文件现状，不整批改写） |
| 7 | `home.md` 引用外部会话编号"talk ⑤"（合同文档不该有需要外部解码的引用）；`src/index.ts` #requireActiveThread 语句粘在 `{` 后未换行 | 分别改为判据自持 / 正常换行 |

## 刻意不做

- **repo 目录名 `ai_dsh_assitant`（少一个 s）不改**：所有机器面（verify/setup/启动器）都经
  `git rev-parse --show-toplevel` 自动定位，改名零功能收益，却有 handoff 与文档引用成本。留此记录。
- **verify 未加"布局表 ↔ 目录存在"反向检查**：表→存在方向可查，存在→表不可机械查（要维护
  白名单，必腐化）；靠审计与 agent 顺手补行（本次即第 4 条的由来）。
- **repo-structure note 的搬家破了一次"同 diff"纪律**：教训写在它的时态节，不粉饰。
