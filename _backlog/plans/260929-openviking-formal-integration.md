# 推敲：OpenViking 正式接入 assistant 组合（融合缝法与边界语义）

> 立卡：2026-09-29 ｜ 状态：推敲中｜毕业门判断 = 该做（方向用户已拍板「肯定需要融合」；缝法已定到旋钮级，工具面姿态受 0.5.8 现实约束见 §五）｜下一步 = 用户过层 1 旋钮剖面 → AGPL 真人复核（[RFC](../../notes/proposed/2026-09-29-openviking-adoption-rfc.md) 遗留前置）→ 毕业为实施切片

## 背景 / 触发

- RFC 拍 A（引入）时刻意把「正式接入 preset」划为独立决策切片：试点隔离在 ov-trial 裸 profile，六步全绿（[验收台账](../../notes/archived/research/2026-09-29-openviking-acceptance-audit.md)、[二轮](../../notes/archived/research/2026-09-29-openviking-acceptance-audit-round2.md)），助手本体（`packages/dsh-smart-assistant`）零 openviking 行。
- 2026-09-29 用户拍板「肯定需要融合」并要求深度分析缝法。本卡 = 该决策切片的推敲现场，结论全部带源码/实测引证（插件 0.5.8 逐文件读 + vendor/dsh 两路只读调查 + 本机 dump-config/curl 亲验）。

## 已知与未决

### 一、两侧表面（本轮亲验）

**OpenViking 插件 0.5.8**（本机装于 ov-trial，源码逐文件读）——单 HOST 行 `openviking-memory-runtime` 挂 8 个钩子：

| 钩子 | 行为 | 开关（消费者已核） |
|---|---|---|
| `ctx.provide` | host 服务 `openvikingMemory` | `enabled` 总闸 |
| `agent/session-start` | 注入 profile 块（`<openviking-context source="profile">`：ov 抽取的用户画像 + available-memories 清单） | `noAutoInject`；预算 `profileTokenBudget`（默认 **10000**） |
| `agent/pre-step`（prepend） | 追加召回块（`source="recall"`：相关性命中，试点实测 10 条 score 0.74–0.77，内容三档内联） | `autoRecall`；预算 `recallTokenBudget`（默认 2000） |
| `session/event` | 捕获 + turn/end 阈值提交（抽取异步 10–19 分钟） | `autoCapture` / `commitTokenThreshold`（默认 20000） |
| `tools/pre|post-execute` | `viking://` URI 守卫：fs 工具遇 viking:// **deny 并改道 MCP 工具** | 无 |
| MCP 桥 | 挂 `mcp__openviking__*` ≈12 工具（search/read/list/tree/grep/glob/**remember/write/edit/forget/add_resource/add_skill**） | `mcpEnabled` **死旋钮**（见 §四负知识） |
| skills provider | 第二个 `dsh-skill-filesystem` 实例（provider 名 `openviking`，rank 600，仅扫包内 2 个内置技能 `openviking-memory`/`openviking-skills`） | **无条件挂载，无开关** |
| session-start `<available-skills>` | 服务器端技能库目录注入（`GET /api/v1/skills`，与 ctx.skills 是平行通道） | `skillCatalog`（有效，默认 true） |

**我方 dev 组合**（[cordis.patch.yml](../../packages/dsh-smart-assistant/cordis.patch.yml) 亲读）：persona prefix → SOUL.md → AGENTS.md 手册 → digest（有界 4096B）→ 四工具 → 双技能 provider（策展 + `assistant-learned`，都在 preset 层）→ compaction 栈。**常驻桌面实测 ≈3k token**（SOUL 1049B + 手册 6836B + digest ≤4096B，本机 working folder 量得）。

### 二、DSH 机制结论（vendor 源码引证）

1. **挂载点**：插件自带 `dsh.bundle.patch` 在 `dsh plugin add` 后经 reconcile **自动进该 profile 的 `dsh.profile.bundles`**——安装即对**该 profile 全部会话**生效（`vendor/dsh/packages/boot/plugin-manager/src/operations.ts:88-113`；层序 bundles → profile patch → home patch → `--patch`，`profile-context.ts:63-70`）。我们的 profile patch 只需**同 id 整行 config 覆盖**（`vendor/dsh/vendor/include/src/index.ts:120-123` 顶层字段逐一赋值、无深合并）。
2. **缺席插件**：host 面行引用未安装插件 = 启动警告后继续（仅 7 个全局 required id 致命，`app-boot/src/index.ts:925-939`）；**preset 的 `config.plugins` 行是严格语义**——一行缺席 = 整个 preset broken（`agent-preset-registry/src/mount.ts:266` "A mount failure is final"）。
3. **技能多 provider**：跨层「最近层全胜」（rank 不参与）、同层 rank → 注册序（`skill/skill/src/index.ts:551-582, 807-811`）；同名静默遮蔽（输家仅 logger.warn）。我方双 provider 在 **preset 层**，ov 的在 **global 层**（host 行）→ 同名时**我方无条件压过**，反向不可能。
4. **DSH 的 mcp-client 无按工具过滤能力**（README/src 双零命中）；permission-presets 是 sandbox+approval 打包器（`interaction/permission-presets/README.md`），非工具过滤。

### 三、碰撞地图与缝法裁决（八接缝）

| # | 接缝 | 裁决 | 依据 |
|---|---|---|---|
| 1 | 常驻提示词 | **共存 + 预算收紧**：ov profile 块压到 ≤3000（默认 10000 会把桌面翻三倍）；内容与 SOUL/手册不同层（用户画像 vs 身份手册），不重叠 | §一预算实测 |
| 2 | 记忆召回 | **互补分工**：digest = 策展事实目录（桌面常驻）；ov pre-step = 情景记忆逐 turn 相关性召回（抽屉自动化）。自建 embedding 缝已被拍 A 关闭，此处兑现 | RFC + 试点实测 |
| 3 | 记忆写入 | **双轨 + 单向桥**：`autoCapture` 开（ov 自动抽取 = 第二储存层的料）；治理不认自动写入——转正唯一路径 = 人审 save（层 2 扩 `source: openviking:<id>` 语法） | RFC 治理边界 |
| 4 | 知识/资源 | **不接**（层 3 远期）：knowledge/ 的 draft→stable 人审、sources 必填、`[[互链]]` 治理不动；Resources 留在 ov 侧 | [docs/home.md](../../docs/home.md) |
| 5 | 技能 | **三 provider 共存安全**：层语义保证我方 preset 层全胜；残留 +2 目录条目（§五） | §二.3 |
| 6 | 工具面 | **0.5.8 敞开无解**（§四负知识）：12 个 mcp 工具会进模型面；接受 + 量化 + 行为观察，上游反馈位 | §二.4 |
| 7 | 上下文管理 | **无冲突**：`takeover*` 旋钮在 DSH 适配器零消费者（grep 亲验，schema-only 声明）；我方 compaction 栈独走 | 亲验 |
| 8 | 子代理 | `skipSubagentSessions: true` 沿用试点值：子代理会话不进记忆 | 试点值 |

**挂载形态**（§二.1/2 直接推论）：`dsh plugin add`（绝对路径 tgz）进目标 profile → 行自动出现 → profile patch 同 id 整行覆盖挂旋钮（ov-trial patch 的成熟形状照搬）。**不进** assistant preset 的 `config.plugins`（严格语义，缺席即 broken）；**不写进**我们包的 `cordis.patch.yml`（S1 输掉的理由继承 + 给所有装包者强插缺席警告行）。发布面 = `ov-install.sh` 参数化目标 profile（RFC 提案 3 已设计七步形状）。

### 四、两个 0.5.8 承重负知识（上游反馈位）

1. **`mcpEnabled` 是死旋钮**：`shared/config-schema.mjs:63` 有声明，本 bundle **零消费者**（全包 grep 唯一命中即声明行）；`index.mjs:83` 无条件 `mountOpenVikingMcp(ctx, config)`。设 false 无任何效果，12 个 mcp 工具照挂。
2. **skills provider 无条件挂载**：`index.mjs:84` 无条件 `mountOpenVikingSkills(ctx)`，不吃 config；想保留记忆而关技能目录，0.5.8 只能整行禁用或层遮蔽。

配套事实：DSH mcp 层无工具过滤、MCP 桥是程序化挂载（无组合行可 patch）、permission 层非工具过滤——**「隐形引擎」（只留召回/捕获、藏掉面板）在 0.5.8 四条路全堵**。上游 issue 候选：① 给 `mcpEnabled` 接上消费者；② skills mount 条件化；③（DSH 侧）mcp-client 按 serverName/工具名过滤。三件都不由我们改第三方码解决（硬规则 7 精神）。

### 五、残留的模型可见变更（诚实登记——实施切片须走 model-visible 纪律）

「融合」不是零模型可见变更，是三笔：

1. **+召回段**：每 turn 一条有界 user 段（`<openviking-context source="recall">`，≤2000 token）——产品价值本体，非噪声；但 URI 守卫语义下其中的 `viking://` URI 变成**可行动**路径（fs 工具会被 deny 改道 mcp read——工具在场，所以 coherent）。
2. **+12 个 mcp 工具**进请求工具 schema（逐 turn token 成本 + 模型在 `assistant_memory save` 与 `mcp__openviking__remember` 两个写入面之间的选择风险——「四工具不合并」纪律防的就是错房间找东西）。
3. **+2 个技能目录条目**（`openviking-memory`/`openviking-skills`，教 MCP 用法——工具在场所以自洽，但与我们四工具的动词界有叙述重叠）。

缓解选项（按代价排序，实施切片择一）：a) 接受 + eval 观察错面调用率；b) preset 层同名遮蔽两个内置技能成 stub（层语义保证我方全胜，维护成本 2 个 stub 文件）；c) 等上游开关。

### 六、层 1 旋钮剖面（第一切片的落点，全部消费者已核）

```yaml
# dev/harness-home/profiles/dev/cordis.patch.yml 追加（同 id 整行覆盖）：
- id: openviking-memory-runtime
  name: '@openviking/dsh-memory-plugin'
  config:
    endpoint: http://127.0.0.1:1933
    skillCatalog: false          # 服务器端 <available-skills> 注入关（平行通道收掉）
    skipSubagentSessions: true   # 子代理噪声不进记忆
    peerId: assistant            # 定死 peer：记忆跟助手走，不随 cwd/profile 分叉
    profileTokenBudget: 3000     # 默认 10000 会把桌面翻三倍——压到与 SOUL+手册+digest 同量级
    # autoRecall/autoCapture 用默认 true；commitTokenThreshold 用默认 20000（试点 2000 是短会话凑数）
    # mcpEnabled 写了也无效（§四.1），不写，避免假开关误导后来人
```

注：`peerId: assistant` 切到新记忆空间——试点 15 条哨兵语料在 workspace 派生 peer 下，正式接入后不可见（新空间从零攒，验收用新哨兵）。

## 待答问题 / 待跑实验 / 喂给谁

- **待答**：① 模型在双写入面（四工具 vs mcp 工具）的错面调用率；② +12 工具的逐 turn schema token 增量实测；③ commitTokenThreshold 真实长会话的最优值（默认 20000 一次/长会话 vs 更频繁）；④ `recallExcludeUris` 是否需要排目录生成文件（上游默认空表有此注释）。
- **待跑**（实施切片验收，天然 A/B：dev 挂 / dev-task 不挂）：① `--dump-config` 断言行+旋钮；② [repo-live-probe](../../.agents/skills/repo-live-probe/SKILL.md)（preset 会话拆日志按节量测：召回段在场、工具 schema 增量、错面调用）；③ `pnpm eval` 对照挂前/挂后；④ 记忆往返在新 peer 复现（`pnpm ov-trial-rt` 参数化形状）。
- **喂给谁**：层 2 治理桥的立项（`source: openviking:<id>` 转正语法 + digest 加情景记忆计数行）；`ov-install.sh` 参数化设计；上游反馈清单（§四三件）。

## 候选与取舍（输掉的方案）

- **塞进 assistant preset 的 `config.plugins`**：严格语义（缺席 = preset broken）直接否决——可选增强不能变成 preset 的单点故障。
- **写进我们包的 `cordis.patch.yml`（bundle 行）**：S1 依赖打包输掉的理由全部继承（发布物自包含、被动安装、release-smoke），且给未装者留一行永久的缺席警告。
- **「隐形引擎」姿态（MCP 面+技能面全藏）**：0.5.8 四条路全堵（§四），等上游开关后再议；不 fork 不 patch 第三方码。
- **只读 MCP（留 search/read 关 write）**：DSH mcp 层无过滤能力，全有或全无——记为 DSH 侧功能请求，非本卡可达成。
- **knowledge/ 房间接 Resources**：治理语义（人审/sources/互链）与 ov 自动资源库不同构，无真实痛点——层 3 不立项。

## 毕业门（四问 + 验收判据）

- **该不该**：已过（用户拍板「肯定需要融合」）。
- **何时**：层 1 待 AGPL 真人复核（RFC 遗留前置）+ 用户过 §六旋钮剖面；层 2 待层 1 跑一个真实使用周期（eval 有对照数据）。
- **次序**：层 1（引擎+敞开面板+量化）→ 观察（§五缓解选项择一）→ 层 2（治理桥）→ 层 3 不立项。
- **放弃**：上面五个输掉的方案已记录；若 eval 证实双写入面错乱不可控且上游无开关，回退 = 从 `dsh.profile.bundles` 移除该 bundle（`operations.ts` 机制：无需卸载包）。

**验收判据**（实施切片完成 = 本卡毕业为 implemented note）：dump-config 断言；repo-live-probe 三量测（召回段/工具增量/错面率）；eval 对照不红；新 peer 往返命中；AGPL 复核记录在案。
