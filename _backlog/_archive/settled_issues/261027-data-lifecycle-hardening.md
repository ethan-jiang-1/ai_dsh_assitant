---
status: 已结
opened: 2026-10-27
---

# 数据生命周期硬化（Phase 0 + Phase 1）

> 立卡：2026-10-27 ｜ 状态：已结 ｜ 类型：Task ｜ 可关闭：是 ｜ 结论：Phase 0/1 与 G13/G18/G20/G22/G23/G25/G33/G34/G36/G37/G38 已交付；G14/G15 等触发式剩余留卡内。去向 = [implemented note](../../../notes/implemented/2026-10-27-data-lifecycle-hardening.md)。

**问题与期望结果：** FAQ 26 的体检暴露出插件数据面的生命周期缺口：模型可见手册升级后不更新、旧 home 兼容没有证据、单文件账本会撞 1 MiB 投影上限、首次启动后恢复被拒、秘密落在明文文件/日志、数据卡与卸载清理不完整、部分写入不在原子写纪律内。用户应得到一组"发布后部署不会坏"的合同、代码与可执行证据。

**当前情况：** 全部代码项已落：G13–G27/G33–G38 的代码/测试/文档；G28–G32 是平台/产品边界（多用户、project 键、Windows、egress、sessions），已在数据卡与卡内写明。G13 硬删除扩到账本 operation，sessions 仍按平台边界声明。G14 保守合并、G15 加密传输、G17 显式轮转、G24 心跳/启动时间、G35 ui-mode v1、G36 导入上限、G38 per-file 预览。
**未决问题：** 只剩平台/产品边界：G28 多用户、G29 project 键、G30 Windows/网络 FS、G31 明文 egress、G32 sessions 证据链；不改产品定位不实现。
**下一步：** 边界项等真实需求/平台能力；代码项收口。

## 后续切片（用户已授权）

| 片 | Gap | 状态 | 验收 |
|---|---|---|---|
| A | G13 显式审计硬删除 | 已完成 | `assistant-data purge --kind --id --reason --yes` 删除 active/archive/快照；先写 `audit/purges.jsonl`；拒绝无确认/无理由/未知 id/路径穿越/符号链接；`assistant-data-purge.spec.mjs` |
| B | G20 更老手册再生 | 已完成 | `assistant-data refresh-manual --assistant --yes` 先备份再渲染当前版；`assistant-data-manual.spec.mjs` |
| C | G38 导入 dry-run | 已完成 | `import --dry-run` 只校验并报计划，不写；`assistant-data.spec.mjs` |
| D | G18 夹具默认权威 | 已完成 | 默认 404；`assistant-desk-projection.allowFixture` 显式开启；测试/组合/探针 patch 已更新 |
| E | G16 用户手改 CAS / digest 外部编辑 | 部分（digest + thread/page CAS） | `digestSnapshotNow` 按 size/mtime fingerprint 刷新；`Room.write` 支持 raw-text CAS，线索更新与知识状态翻转已传入；`save_page`/memory 写仍未 CAS |
| F | G17/G23/G25 retention | 部分（读数/告警/索引/上限/提案轮转） | `status`/`check` 报读数与阈值；G25 归档回执 O(1) 索引 + 256 MiB 读取上限；`archive-proposals` 显式轮转；自动轮转/删除未取 |
| G | G22 deliverables/present | 已完成 | manual v21 加「交付写 cwd + `present`」；v20→v21 迁移；prompt-smoke PASS / eval 无 key 未跑 |
| H | G24/G33/G34 | 部分（G24/G33/G34） | G33 source 引用完整性、G34 archive 先移后改写、G24 release 只删自己的锁/接管回读/唯一 tmp 已落；PID 复用与 heartbeat 未取 |


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
| 卡与授权 | Phase 0/1 已交付 | 本卡 + [implemented note](../../../notes/implemented/2026-10-27-data-lifecycle-hardening.md) |
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
| G13 | **没有硬删除/擦除**：forget/deprecate/retire/discard 都进 archive 或留原地，审计与账本永久保留 | 已修（房间 + 账本操作；sessions 边界） | 高（隐私/合规） | `assistant-data purge` 删 active/archive/snapshot；`--kind ledger` 从状态与归档移除 operation；sessions 无 delete API，仍不删 |
| G14 | **没有跨机合并/同步**：import 是整目录 replace，两份 home 不能 merge，冲突无策略 | 已修（保守合并） | 中 | `assistant-data merge` 默认 dry-run，只补缺失、冲突保留当前，目标独有不删；`--prefer incoming` 才替换工作目录文件并备份；账本冲突不覆盖；同步/git 语义仍未取 |
| G15 | **备份无加密/签名**：bundle 是明文业务数据，导入不验签 | 已修（加密传输；无签名） | 中（部署/隐私） | `seal`/`unseal` 用环境变量口令做 AES-256/PBKDF2；签名/密钥托管仍未取 |
| G16 | **用户手改与插件写冲突**：read-modify-write 无 CAS；未知 frontmatter 字段在下次写时被丢弃；digest 缓存看不见外部编辑 | 已修（房间写 CAS） | 中 | `Room.write` 保留未知字段并支持 raw-text CAS；thread/knowledge/save_page 与 memory archive 传入 expected text；新 memory 写是新增，不是覆盖 |
| G17 | **归档/审计/提案无 retention**：`operations-archive.jsonl`、`approvals.jsonl`、房间 archive、skills archive、skill-proposals 都只增；只有 skill snapshots 保 3 份 | 已修（显式轮转） | 中 | `status`/`check` 读数与阈值；`rotate --older-than --apply` 移动旧归档并审计；自动删除不做（审计历史价值高于磁盘） |
| G18 | **`desk-projection.json` 夹具可在无账本时冒充真桌面** | 已修 | 中 | 默认 404；`allowFixture: true` 才回退；测试/组合/探针 patch 已更新 |
| G19 | **投影 receipts 只含最近窗口**：旧回执不在桌面，客户端若要读旧回执需走工具 | 边界（无客户端需求） | 低 | 旧回执经 `assistant_operating read operation_id` 可读；分页等真实客户端需求再做 |
| G20 | **更老 generation 的手册没有迁移表**：只覆盖退役 Room data 段与 v19→v20；v0/v18 等只警告，没有"备份后重新生成"动作 | 已修（显式再生） | 中 | `assistant-data refresh-manual --yes` 备份后渲染当前版；不自动覆盖手改 |
| G21 | **SOUL 默认值漂移**：已有 home 永不覆盖（刻意），新默认身份只到新 home | 边界 | 低 | 身份是 owner 数据；发布说明写"想换默认就手动替换" |
| G22 | **`deliverables/` 孤儿**：无代码读写、无生命周期、无 `present` 指引；最终交付可能落在 home 而不是 workspace | 已修（模型指引） | 中 | manual v21 明确「交付写 session cwd + `present`，working folder 是笔记本」；home 的 `deliverables/` 仍是用户数据，无生命周期 |
| G23 | **`skill-proposals/archive/` 配置了但没用**：landed/rejected 提案留在收件箱，只增 | 已修（显式轮转） | 低 | `assistant-data archive-proposals --yes` 只移 landed/rejected；proposed/approved 留下；再提案从 archive 继承 revision/created |
| G24 | **锁的工程边界**：takeover 是 rename 不是 CAS；PID 复用可能把残锁当活锁；无 heartbeat；`ledger.json.tmp` 固定名 | 已修（POSIX 启动时间 + 心跳） | 低-中 | `releaseWriter` 只删自己的锁；接管回读；进程启动时间不匹配或心跳 >15 分钟接管；tmp 唯一；非 POSIX 无启动时间时退回 PID 存活判断 |
| G25 | **归档读取无上限/无索引**：`readArchive` 整文件读入；`readOperation` O(n)；大归档会吃内存 | 已修（索引+上限） | 低-中 | 归档按 size/mtime 缓存并建 `operationId` 索引；整文件读取有 256 MiB 默认上限，超限 fail loud；分片/流式仍未取 |
| G26 | **`ov-doctor --write` 留远端 sentinel；OpenViking 数据不在备份** | 未取 | 低 | 外部服务边界；按其手册清理，数据卡已声明 |
| G27 | **`expert-setup` 种子的凭据扫描只覆盖技能路径；知识页扫描非阻断** | 已修（种子阻断） | 低 | `assembleExpertHome` 对 seed 渲染文本做凭据审计，命中即拒绝写盘；普通知识写仍是 warn |
| G28 | **多用户/远程无隔离**：一个 Host/home 一个 principal；remote 用户共享数据；`session-search.db` 索引全部会话 | 边界 | 中 | 产品定位=单 principal；多人部署用不同 `DSH_HOME`/Host，文档已写 |
| G29 | **无 per-workspace 键**：working folder/账本按人，不按项目；多项目混在一起 | 边界 | 中 | 刻意；要隔离用独立 home。真实串项目抱怨再做 project tag |
| G30 | **Windows/网络文件系统未验证**：rename/权限/锁语义随平台变 | 边界 | 中 | 未宣称 Windows 支持；claim 前跑矩阵 |
| G31 | **模型/备份 egress**：working folder/账本进 prompt、进备份，含业务敏感内容；无逐字段 consent/脱敏 | 边界 | 中 | 产品信任模型；README/数据卡声明明文与去向，秘密不入库 |
| G32 | **`session` 证据链跨机断**：只恢复两目录后，账本里的 `sessionId` 在别处无对应会话 | 边界（sessions 宿主拥有） | 低 | 恢复整 home（含 sessions）才有原始会话；插件不复制/不删除 session，数据卡已声明 |
| G33 | **`knowledge` sources / 账本 sessionId 无引用完整性检查** | 已修（knowledge sources）/ 边界（sessionId） | 低 | `page-source-missing` 查 `memory:`/`research:` 指针；sessionId 需宿主会话索引，插件不越界 |
| G34 | **`Room.archive` 非事务**：先写 archive 再删 source，崩溃留两份 → curate `duplicate-id` | 已修 | 低 | 改为先 `rename` 到 archive 再改写 patch；崩溃留旧字段的单份，不产生两份；并发输家按已归档处理 |
| G35 | **`ui-mode` 双源（host 文件 + localStorage）无版本/迁移** | 已修（v1 envelope） | 低 | host 文件写 `{version:1, mode}`；旧 `{mode}` 可读，下次写升级；未知 version 422 |
| G36 | **备份含 `deliverables/` 无大小上限；import 可把任意大目录搬入** | 已修（告警 + 导入上限） | 低 | `check` >512 MiB 告警；`import --max-bytes` 默认 512 MiB 拒绝超大 bundle |
| G37 | **import 不检查两目标嵌套/包含** | 已修 | 低 | 已加 containment 守卫 + 测试 |
| G38 | **`assistant-data` 无 `--dry-run`/差异预览**：`--replace` 会整目录换掉，只留旁路 | 已修（dry-run + per-file 预览） | 中 | `import --dry-run` 报文件数、旁路目标与 add/replace/remove 文件列表；内容级 diff 不展开 |

## 仍未取（按触发排序）

- **G14/G15 同步与备份加密**：跨机/上云的真实需求出现再做；G38 的 dry-run 已给恢复前预览，合并/加密仍开放。
- **G16 用户手改 CAS**：未知字段、digest 外部编辑、thread/page 状态写已修；`save_page`/memory 写仍未 CAS。
- **G17 retention**：`status`/`check` 读数与告警、G23 提案轮转、G25 索引+读取上限已有；归档自动轮转/删除未取。
- **G19 投影 receipts 窗口**：合同已写，客户端旧回执分页未取。
- **G24**：PID 复用/心跳仍未取；release/接管回读/唯一 tmp 已修。G33 的 knowledge source / G34 的 archive 事务已修，账本 sessionId 仍不查。
- **G26/G27/G32/G35/G36**：OV sentinel、种子凭据、跨会话证据、ui-mode 版本、备份大小，低优先。
- **G28/G29/G30/G31 边界**：单 principal/home、无 workspace 键、Windows 未验证、明文 egress；文档已写，主张变了再改。

