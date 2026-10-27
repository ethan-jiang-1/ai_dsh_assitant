---
status: 推敲中
opened: 2026-10-27
---

# 数据生命周期硬化（Phase 0 + Phase 1）

> 立卡：2026-10-27 ｜ 状态：推敲中 ｜ 类型：Task ｜ 可关闭：否 ｜ 已授权实施（2026-10-27 用户点名本卡，按 G13+ 继续）

**问题与期望结果：** FAQ 26 的体检暴露出插件数据面的生命周期缺口：模型可见手册升级后不更新、旧 home 兼容没有证据、单文件账本会撞 1 MiB 投影上限、首次启动后恢复被拒、秘密落在明文文件/日志、数据卡与卸载清理不完整、部分写入不在原子写纪律内。用户应得到一组"发布后部署不会坏"的合同、代码与可执行证据。

**当前情况：** Phase 0 与 Phase 1 已交付：原子/fsync 写、秘密、数据卡、`status`/`check`、`import --replace`、手册迁移与旧 home fixture、账本有界 + 归档、并发口径。登记表里 G13+ 是**未取的后续缺口**，不是本卡未开始的切片。
**未决问题：** 硬删除/擦除、跨机合并与备份加密、用户手改 CAS、归档 retention、夹具默认权威、更老手册再生；各有触发条件。
**下一步：** 按 G13→G20→G38→G18→G16→G17/G23/G25→G22→G24/G33/G34 的顺序推进；每片代码 + 测试 + 合同同 diff，稳定即提交。

## 后续切片（用户已授权）

| 片 | Gap | 状态 | 验收 |
|---|---|---|---|
| A | G13 显式审计硬删除 | 已完成 | `assistant-data purge --kind --id --reason --yes` 删除 active/archive/快照；先写 `audit/purges.jsonl`；拒绝无确认/无理由/未知 id/路径穿越/符号链接；`assistant-data-purge.spec.mjs` |
| B | G20 更老手册再生 | 已完成 | `assistant-data refresh-manual --assistant --yes` 先备份再渲染当前版；`assistant-data-manual.spec.mjs` |
| C | G38 导入 dry-run | 已完成 | `import --dry-run` 只校验并报计划，不写；`assistant-data.spec.mjs` |
| D | G18 夹具默认权威 | 已完成 | 默认 404；`assistant-desk-projection.allowFixture` 显式开启；测试/组合/探针 patch 已更新 |
| E | G16 用户手改 CAS / digest 外部编辑 | 部分（digest 外部编辑已修；CAS 未取） | `digestSnapshotNow` 按房间文件 size/mtime fingerprint 失效并后台刷新；`tests/host/digest-external-edit.spec.ts`；写前 CAS 仍未取 |
| F | G17/G23/G25 retention | 待开始 | 只读计数/告警 + 显式清理；不自动删 |
| G | G22 deliverables/present | 待开始 | 手册 generation 迁移加交付指引；prompt-smoke/eval |
| H | G24/G33/G34 | 待开始 | 锁 takeover/CAS、source 引用完整性、archive 事务；按可观察触发 |


## 外部结果三要素

- **触发**：用户完成一次安装/升级/备份恢复/卸载，或一个 home 连续使用到账本操作数接近四位数。
- **用户得到**：恢复有可执行顺序且不会因首次启动被拒；升级后模型拿到的规则与当前发布一致；旧 home 的读取有真实 fixture 证明；账本不会在约 600 次操作后让桌面 404/413；卸载说明能说清留在盘上的每个文件；秘密不落明文日志；技能写入崩溃不产生截断文件。
- **完成条件**：Phase 0 与 Phase 1 的切片全部交付并提交；`assistant-data` 有 `status`/`check` 与 `import --replace`；手册迁移、旧 home fixture、账本规模测试、并发口径都有可复跑证据；proposed 卡转 implemented。**这些已满足；本卡继续承载 G13+ 的后续登记。**

## 验收标准

| 片 | 命令 / 断言 | 红的形态 |
|---|---|---|
| P0-5 技能原子写 | `pnpm --filter dsh-smart-assistant exec vitest run tests/domain/skill-file.spec.ts`；断言无 `.tmp` 残留、文件 mode 0600、覆盖后内容完整 | 先写一个"目标已存在 + 覆盖"用例，改成原子写前失败（内容/模式断言） |
| P0-3 秘密 | `tests/host/viki-auth.spec.ts` + `pnpm standalone-smoke`；断言 bootstrap state 0600、日志不含 token、Viki 从 env 取值 | 先加断言：token 出现在日志/文件 0644 时红 |
| P0-4 数据卡/卸载 | `pnpm verify` 文档门禁 + `tests/tooling/assistant-data.spec.mjs` 的 `status`/`check`；README Data/Uninstall 提到 `session-search.db` | 文档断言缺行即红（可在 tooling spec 里钉） |
| P0-2 恢复 | `tests/tooling/assistant-data.spec.mjs` 的 "scaffold 后 import --replace" / 截断 / 活锁用例 | `--replace`/完整性校验未实现时用例红 |
| P0-1 手册迁移 | `tests/host/root-files.spec.ts`：v19 home → `ensureHome` → prompt 含 v20 规则；未匹配旧手册 prompt 带 generation warning | 迁移表未覆盖时 v19 原样保留，测试红 |
| P1-1 旧 home | `tests/host/old-home-compat.spec.ts` + `tests/host/fixtures/old-home-v19/`；`pnpm test:host` | 新代码读旧 fixture 失败/字段丢失时红 |
| P1-2 账本 | 规模测试：生成 N 条操作，断言 `ledger.json` 有界、投影仍可读、旧 operationId 仍可读回执 | 当前全量单文件在 N=1000 时超 1 MiB/投影 413，测试红 |
| P1-3 并发 | 两个 service 同 home 的冲突用例；或文档断言 + 检测 | 两个 writer 都成功且丢更新时红 |
| P2 check | `tests/tooling/assistant-data.spec.mjs`：坏 ledger/相对 dataDir 的 check 输出 | check 未实现时红 |

## 切片台账

| 片 | 状态 | 证据 |
|---|---|---|
| 卡与授权 | Phase 0/1 已交付 | 本卡 + [implemented note](../../notes/implemented/2026-10-27-data-lifecycle-hardening.md) |
| P0-5 技能原子写 | 已完成 | `skill-file.ts` 改 `atomicWriteFile`；`skill-file.spec.ts` 新增覆盖/mode/tmp 用例 |
| P0-3 秘密 | 已完成 | `viki/auth.ts` + `apiKeyEnv`/secret role；`bootstrap.mjs` 0600/失败也打码；`viki-auth.spec.ts`；`standalone-smoke` 断言 |
| P0-4/P0-2 数据卡、status、恢复 | 已完成 | 数据卡 + README；`status`/`check`/`import --replace` + 完整性/活锁校验；`assistant-data.spec.mjs` 13 例 |
| P0-1/P1-1 手册迁移、旧 home | 已完成 | v19→v20 迁移表 + stale prompt 警告；冻结 `tests/host/fixtures/old-home-v19/` + `old-home-compat.spec.ts`；`root-files.spec.ts` 新增迁移/警告用例 |
| P1-2 账本拆分 | 已完成（归档保留仍开放） | `ledger.json` 有界 + `operations-archive.jsonl`；`operationCount`、幂等重试、matter snapshot 合并；`operating-ledger-archive.spec.ts`；投影 cap 8 MiB |
| P1-3 并发 | 已完成（策略 + 账本 guard） | 单 writer 口径写入 `docs/delivery.md`/`docs/home.md`；账本 `writer.lock` 拒绝第二 writer；房间 last-write-wins 是明示边界，不承诺合并 |
| P2 check / 相对路径 | 已完成 | `status`/`check`、`import --replace`、bundle 计数/截断/writer.lock 校验；相对 `dataDir` 归一化；`assistant-data.spec.mjs` |

## 全量 gap 登记（FAQ 26 的十八问 / 6+2 对照）

> 第一轮只列了"会阻断部署且本轮能动代码"的 8 条；这张表是把每个数据面按所有权/作用域/寿命/可见性/迁移/删除/秘密/并发/备份/卸载过一遍后的全量登记。**状态**：已修 = 本轮已落代码/合同/测试；未取 = 真缺口、本轮不做，写明触发；边界 = 刻意选择，不是缺陷。

| # | 面 / 问题 | 状态 | 严重度 | 说明 / 触发 |
|---|---|---|---|---|
| G01 | 学到的 `SKILL.md` 普通写、非原子、默认 mode | 已修 | 高 | `atomicWriteFile` + 0600 + 测试 |
| G02 | 手册（模型可见规则）升级后停在旧 generation | 已修（已知段落） | 高 | v19→v20 精确替换 + 未匹配时 prompt 标 stale；更老版本无迁移表，见 G20 |
| G03 | 旧 home 兼容只有合成 smoke，没有真实旧字节 | 已修 | 高 | 冻结 v19 fixture + `old-home-compat.spec.ts` 读全房间/账本/手册 |
| G04 | `assistant-data import` 与首次启动后的非空目录相撞 | 已修 | 高 | `import --replace` 旁路 `.pre-import-*` + 失败恢复 + 测试 |
| G05 | 数据卡缺 `session-search.db`/client 键/归档/卸载清理 | 已修 | 中 | `docs/delivery.md` 数据卡；README Data/Uninstall；`status`/`check` |
| G06 | Viki key 与 bootstrap token 落明文 | 已修 | 高 | `apiKeyEnv` + `role('secret')`；bootstrap state/log 0600、日志 token 打码、失败路径也打码 |
| G07 | 单文件账本撞 1 MiB 投影上限 | 已修（状态有界） | 高 | 最近 256 条 + 归档；投影 revision=operationCount；cap 8 MiB 桥接旧 home |
| G08 | 账本归档会把已归档 operation 的重试再应用一次 | 已修 | 高 | `submitOperation` 先查归档 + 内容比对 |
| G09 | 房间/技能/提案写不是原子、目录 0755 | 已修（写路径） | 中 | 技能原子写、Room/skills/snapshot mkdir 0700；旧目录不批量 chmod |
| G10 | `atomicWriteFile` 不 fsync；SOUL/AGENTS 普通写 | 已修 | 中 | temp fsync + rename + 目录 fsync；scaffold 改原子写 |
| G11 | 备份 manifest 的 files/bytes 不校验；目标有活锁仍可导 | 已修 | 中 | import 拒绝 fewer files/bytes 与 `writer.lock`；测试 |
| G12 | 相对 `dataDir` 按进程 cwd 散落 | 已修 | 低 | memory/ledger/projection 统一 `resolve()`；`check` 报相对路径 |
| G13 | **没有硬删除/擦除**：forget/deprecate/retire/discard 都进 archive 或留原地，审计与账本永久保留 | 已修（房间记录；账本/会话仍不删） | 高（隐私/合规） | `assistant-data purge` 删 active/archive/snapshot 并写 `audit/purges.jsonl`；账本 history 与会话是明示边界 |
| G14 | **没有跨机合并/同步**：import 是整目录 replace，两份 home 不能 merge，冲突无策略 | 未取 | 中 | 触发：第二个真实设备/团队共享。先做 dry-run + 冲突报告，再考虑 git/外部同步 |
| G15 | **备份无加密/签名**：bundle 是明文业务数据，导入不验签 | 未取 | 中（部署/隐私） | 触发：备份上云/跨人传递。至少文档声明"备份是明文"，加密包另立提案 |
| G16 | **用户手改与插件写冲突**：read-modify-write 无 CAS；未知 frontmatter 字段在下次写时被丢弃；digest 缓存看不见外部编辑 | 部分（未知字段 + digest 外部编辑已修） | 中 | `Room.write` 保留未知字段；`digestSnapshotNow` 按 size/mtime fingerprint 后台刷新；写前 CAS 仍未取。触发：真实用户手改后丢内容 |
| G17 | **归档/审计/提案无 retention**：`operations-archive.jsonl`、`approvals.jsonl`、房间 archive、skills archive、skill-proposals 都只增；只有 skill snapshots 保 3 份 | 未取（check 告警已加） | 中 | `check` 在归档 >64 MiB、approvals >16 MiB 时告警；自动轮转/删除未取 |
| G18 | **`desk-projection.json` 夹具可在无账本时冒充真桌面** | 已修 | 中 | 默认 404；`allowFixture: true` 才回退；测试/组合/探针 patch 已更新 |
| G19 | **投影 receipts 只含最近窗口**：旧回执不在桌面，客户端若要读旧回执需走工具 | 未取（合同已写） | 低 | 旧回执经 `assistant_operating read operation_id` 可读；若客户端需要，再做分页 |
| G20 | **更老 generation 的手册没有迁移表**：只覆盖退役 Room data 段与 v19→v20；v0/v18 等只警告，没有"备份后重新生成"动作 | 已修（显式再生） | 中 | `assistant-data refresh-manual --yes` 备份后渲染当前版；不自动覆盖手改 |
| G21 | **SOUL 默认值漂移**：已有 home 永不覆盖（刻意），新默认身份只到新 home | 边界 | 低 | 身份是 owner 数据；发布说明写"想换默认就手动替换" |
| G22 | **`deliverables/` 孤儿**：无代码读写、无生命周期、无 `present` 指引；最终交付可能落在 home 而不是 workspace | 未取 | 中 | 触发：真实交付找不到/不随项目走。方案：手册加"交付写 cwd + present"，并给 home 的 deliverables 一个显式归档口径 |
| G23 | **`skill-proposals/archive/` 配置了但没用**：landed/rejected 提案留在收件箱，只增 | 未取 | 低 | 与 G17 一起做 retention/归档 |
| G24 | **锁的工程边界**：takeover 是 rename 不是 CAS；PID 复用可能把残锁当活锁；无 heartbeat；`ledger.json.tmp` 固定名 | 未取 | 低-中 | 触发：真实出现双 writer/残锁。加进程启动时间/心跳与 CAS takeover |
| G25 | **归档读取无上限/无索引**：`readArchive` 整文件读入；`readOperation` O(n)；大归档会吃内存 | 未取 | 低-中 | 触发：归档 >64 MiB。先做只读 status 警告，再考虑索引/分片 |
| G26 | **`ov-doctor --write` 留远端 sentinel；OpenViking 数据不在备份** | 未取 | 低 | 外部服务边界；按其手册清理，数据卡已声明 |
| G27 | **`expert-setup` 种子的凭据扫描只覆盖技能路径；知识页扫描非阻断** | 未取 | 低 | 种子是包内只读内容；写入面已有 audit findings |
| G28 | **多用户/远程无隔离**：一个 Host/home 一个 principal；remote 用户共享数据；`session-search.db` 索引全部会话 | 边界 | 中 | 产品定位=单 principal；多人部署用不同 `DSH_HOME`/Host，文档已写 |
| G29 | **无 per-workspace 键**：working folder/账本按人，不按项目；多项目混在一起 | 边界 | 中 | 刻意；要隔离用独立 home。真实串项目抱怨再做 project tag |
| G30 | **Windows/网络文件系统未验证**：rename/权限/锁语义随平台变 | 边界 | 中 | 未宣称 Windows 支持；claim 前跑矩阵 |
| G31 | **模型/备份 egress**：working folder/账本进 prompt、进备份，含业务敏感内容；无逐字段 consent/脱敏 | 边界 | 中 | 产品信任模型；README/数据卡声明明文与去向，秘密不入库 |
| G32 | **`session` 证据链跨机断**：只恢复两目录后，账本里的 `sessionId` 在别处无对应会话 | 未取（文档已写） | 低 | 恢复整 home（含 sessions）才有原始会话；账本 quote 仍在 |
| G33 | **`knowledge` sources / 账本 sessionId 无引用完整性检查** | 未取 | 低 | curate 已查 page links；sources 指向消失的 memory/session 不报 |
| G34 | **`Room.archive` 非事务**：先写 archive 再删 source，崩溃留两份 → curate `duplicate-id` | 未取 | 低 | 可恢复的重复，不是丢失；可加 idempotent 收编 |
| G35 | **`ui-mode` 双源（host 文件 + localStorage）无版本/迁移** | 未取 | 低 | host 为真；坏文件 422，客户端保留本地；低风险 |
| G36 | **备份含 `deliverables/` 无大小上限；import 可把任意大目录搬入** | 未取 | 低 | 触发：备份膨胀。先 `status` 报大小，不做自动裁剪 |
| G37 | **import 不检查两目标嵌套/包含** | 已修 | 低 | 已加 containment 守卫 + 测试 |
| G38 | **`assistant-data` 无 `--dry-run`/差异预览**：`--replace` 会整目录换掉，只留旁路 | 已修（dry-run） | 中 | `import --dry-run` 报文件数与将被旁路的目标；时间戳/内容差异预览仍未取 |

## 仍未取（按触发排序）

- **G14/G15 同步与备份加密**：跨机/上云的真实需求出现再做；G38 的 dry-run 已给恢复前预览，合并/加密仍开放。
- **G16 用户手改 CAS**：未知字段与 digest 外部编辑已修；read-modify-write 前置仍未取。
- **G17/G23/G25 retention**：`check` 只读告警已有，自动轮转/删除未取。
- **G19 投影 receipts 窗口**：合同已写，客户端旧回执分页未取。
- **G22 deliverables**：手册加 `present` 指引前，不新造交付目录。
- **G24/G33/G34**：锁 takeover/PID、source 引用完整性、archive 事务，按可观察触发。
- **G26/G27/G32/G35/G36**：OV sentinel、种子凭据、跨会话证据、ui-mode 版本、备份大小，低优先。
- **G28/G29/G30/G31 边界**：单 principal/home、无 workspace 键、Windows 未验证、明文 egress；文档已写，主张变了再改。

