# 推敲：OpenViking 正式接入 assistant 组合（融合缝法与边界语义）

> 毕业去向：层 1 落地 → [implemented note](../../notes/implemented/2026-10-04-openviking-layer1-landing.md)（2026-10-04，AGPL delegated 闭合 + 四量测活体 + eval A/B + 安装器双验收）；层 2/3 门在 note 尾。本卡完整推敲史（八接缝/S1-S13 实弹/旋钮演化）随卡归档。
> 立卡：2026-09-29 ｜ 状态：已毕业（层 1）｜毕业门判断 = 该做（方向用户已拍板「肯定需要融合」；缝法已定到旋钮级；二轮调查（§七）解开了 0.5.8 两个负知识——隐形引擎经 DSH 原生缝可行）｜下一步 = 用户过 §六旋钮剖面 + §七 shim 形态 → AGPL 真人复核（[RFC](../../notes/implemented/2026-09-29-openviking-adoption-rfc.md) 遗留前置）→ 毕业为实施切片

## 背景 / 触发

- RFC 拍 A（引入）时刻意把「正式接入 preset」划为独立决策切片：试点隔离在 ov-trial 裸 profile，六步全绿（[验收台账](../../../notes/implemented/2026-09-29-openviking-adoption-rfc.md)、[二轮](../../../notes/implemented/2026-09-29-openviking-adoption-rfc.md)），助手本体（`packages/dsh-smart-assistant`）零 openviking 行。
- 2026-09-29 用户拍板「肯定需要融合」并要求深度分析缝法。本卡 = 该决策切片的推敲现场，结论全部带源码/实测引证（插件 0.5.8 逐文件读 + vendor/dsh 两路只读调查 + 本机 dump-config/curl 亲验）。

## 已知与未决

> **0.2.0-rc.2 升 pin 复验（2026-10-03，pin c1857a8）**：本节与 §七 的机制缝在新 pin 逐条在场——
> `ctx.tools.restrict` 仍 `core/tools/src/index.ts:1097-1124`（scoped 校验、未知名抛错 1114-1118、
> `tools/change` 声明与 emit 原位）；`isModelInvocable` 仍 `tool-skill/src/index.ts:226`；技能「最近层
> 全胜」语义原样；bundle reconcile 仍 `operations.ts:88-100`；include 同 id 整行覆盖无深合并原样；
> session 格式仍 v4（`core/session/src/types.ts:89`）。**组合面一项新事实**：BUG-001 修复（tool-skill
> 移 host 行，2026-10-02）后 one-shot 会话开始发布技能目录——§五「+2 技能条目」与「待跑实验②」的
> 遮蔽断言自此才在 one-shot 真正可测（修复前 one-shot 从不发布目录，该量测必然空转）。

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
2. **缺席插件**：host 面行引用未安装插件 = 启动警告后继续（仅 7 个全局 required id 致命，`app-boot/src/index.ts:925-939`）；**preset 的 `config.plugins` 行是严格语义**——一行缺席 = 整个 preset broken（`agent-preset-registry/src/index.ts:123` "A mount failure is final"；0.2.0-rc.2 起从 mount.ts 挪入）。
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
| 6 | 工具面 | **DSH 原生解法（§七）**：preset 内 shim 行 `ctx.tools.restrict` 拒掉 `mcp__openviking__*`（schema+dispatch 双消失）；插件侧 `mcpEnabled` 死旋钮仍是事实（§四） | §二.4 + §七 |
| 7 | 上下文管理 | **无冲突**：`takeover*` 旋钮在 DSH 适配器零消费者（grep 亲验，schema-only 声明）；我方 compaction 栈独走 | 亲验 |
| 8 | 子代理 | `skipSubagentSessions: true` 沿用试点值：子代理会话不进记忆 | 试点值 |

**挂载形态**（§二.1/2 直接推论）：`dsh plugin add`（绝对路径 tgz）进目标 profile → 行自动出现 → profile patch 同 id 整行覆盖挂旋钮（ov-trial patch 的成熟形状照搬）。**不进** assistant preset 的 `config.plugins`（严格语义，缺席即 broken）；**不写进**我们包的 `cordis.patch.yml`（S1 输掉的理由继承 + 给所有装包者强插缺席警告行）。发布面 = `ov-install.sh` 参数化目标 profile（RFC 提案 3 已设计七步形状）。

### 四、两个 0.5.8 承重负知识（插件侧事实；解法见 §七，已不解自困）

1. **`mcpEnabled` 是死旋钮**：`shared/config-schema.mjs:63` 有声明，本 bundle **零消费者**（全包 grep 唯一命中即声明行；0.5.9 复测同样成立，见 §七.①）；`index.mjs:83` 无条件 `mountOpenVikingMcp(ctx, config)`。设 false 无任何效果，12 个 mcp 工具照挂。
2. **skills provider 无条件挂载**：`index.mjs:84` 无条件 `mountOpenVikingSkills(ctx)`，不吃 config；想保留记忆而关技能目录，0.5.8/0.5.9 只能整行禁用或层遮蔽。

配套事实：DSH mcp 层无工具过滤、MCP 桥是程序化挂载（无组合行可 patch）、permission 层非工具过滤——**但这三条只堵「配置面」，DSH 另有注册表原生的执法缝（§七.②），「隐形引擎」经我们自己的包可达成**。上游 issue 候选（三件，截至 2026-09-29 检索无在途 issue/PR [observed]；**2026-10-03 复查维持**：npm 无 >0.5.9 版本，repo issue/PR 检索零相关命中，唯一相关的 PR #4157（2026-08-20 合并）是现行 MCP 桥形状的**起源**而非修复——它带来的正是 §四 的 16 工具无条件挂载）：① 给 `mcpEnabled` 接上消费者；② skills mount 条件化；③ server 侧 `/mcp` 端点开关。上游接上之日 = shim 退役之时。

### 五、残留的模型可见变更（诚实登记——实施切片须走 model-visible 纪律）

「融合」不是零模型可见变更，是三笔：

1. **+召回段**：每 turn 一条有界 user 段（`<openviking-context source="recall">`，≤2000 token）——产品价值本体，非噪声；其中的 `viking://` URI 在 shim 姿态下是**装饰**（内容已内联；模型若追 URI 见 §七.② 代价账 d 的死胡同账）。
2. **+12 个 mcp 工具**进请求工具 schema（逐 turn token 成本 + 模型在 `assistant_memory save` 与 `mcp__openviking__remember` 两个写入面之间的选择风险——「四工具不合并」纪律防的就是错房间找东西）——**经 §七 shim 拒掉后归零**。
3. **+2 个技能目录条目**（`openviking-memory`/`openviking-skills`，教 MCP 用法——工具在场所以自洽，但与我们四工具的动词界有叙述重叠）——**经 §七 modelInvocable:false 遮蔽后从目录消失**。

层 1 带 shim 的净残留（诚实账）：**只有召回段本身**（价值本体）+ §七.②代价账 c/d 两行（list() 中立视图条目、warn 日志噪声、URI 死胡同的追逐风险）。原「接受/stub/等上游」三选项作废，被 §七.② 的更优形态取代。

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

**层 1 的另一半 = 我们包里的 shim 行**（§七.② 的落地形状，随 preset `config.plugins` 挂、OpenViking 缺席时零影响）：

```yaml
# packages/dsh-smart-assistant/cordis.patch.yml 的 preset plugins 追加（行 id 与命名走 identity.md 拍板）：
# 实弹测试改判（2026-09-29 晚）：读写分离——server context 模式只出指针级召回，
# 叶子内容必须靠只读工具展开；治理关切只在写面。
- id: assistant-ov-shield          # 名字待拍板，暂拟
  name: dsh-smart-assistant/ov-shield
  config:
    denyToolNames:                 # 治理执法面：6 个写/删工具（前缀枚举兜 server 升级新增写面）
      - mcp__openviking__remember
      - mcp__openviking__write
      - mcp__openviking__edit
      - mcp__openviking__forget
      - mcp__openviking__add_resource
      - mcp__openviking__add_skill
    shadowSkills: ["openviking-memory", "openviking-skills"]  # modelInvocable:false 同名遮蔽
```

### 七、解法突破（2026-09-29 二轮：五条路逐一实证）

用户问「能不能努力解决」——五条路全部验证，按代价排序：

| 路 | 判决 | 证据 |
|---|---|---|
| ① 上游升级 | **关闭（今日新负知识）**：0.5.9（2026-09-29T07:28Z，发布于调查当天）与 0.5.8 全树 diff 仅 4 文件——config 版本号、mcp-env/proxy 的 debug 管道小改；`index.mjs` 逐字节相同，两处无条件挂载原样 | tgz 下载亲测 diff [observed] |
| ② **DSH 原生缝（推荐）** | **可行，双缝齐备**：工具面 `ctx.tools.restrict({deny})`（`core/tools/src/index.ts:1097-1124`，scoped 生效、schema 投影与 dispatch 双消失，`view()` 1195-1201 逐层 admits；对未知名抛错 1114-1118 → 须配 `tools/change` 事件动态重试）；技能目录同名遮蔽 + `invocation:{modelInvocable:false,userInvocable:false}`（目录唯一过滤器 `isModelInvocable` 在 `tool-skill/src/index.ts:226` 替我们执行移除；`skill` 工具拒载 138/145、`/name` 不注入 195；preset 层同名全胜 global 层，`skill/skill/src/index.ts:551-565`） | 两轮 vendor 源码引证 |
| ③ server 侧关 `/mcp` 端点 | **死路**：`~/.openviking/ov.conf` 配置域仅 embedding/vlm/storage/server(host,port) 四域，无 MCP 位；端点在原生层（`openviking-server` 经 `rust_cli` 引导，Python 侧无路由）[observed] | 本机实测 |
| ④ 补丁重打包 | **机械成立但降为备选**：spike 实证 2 行守卫（`mcpEnabled`/`skillCatalog` 均为 schema 已声明旋钮，包住 index.mjs:83-84 两行挂载）+ `--ignore-scripts` 等价重打包 → `0.5.8-dshsa.1` tgz 造出（SHA512 在 spike 记录，未入库）；维护税 = 每次上游升级重打 | /tmp spike 亲测 |
| ⑤ 接受 + stub 遮蔽 | **被 ② 取代**：`modelInvocable:false` 遮蔽正是 ⑤ 的更优形态（不是写 stub 内容，是让目录过滤器删行） | 同 ② |

**② 的完整代价账（诚实登记；2026-10-04 对抗评审修正两处）**：a) shim 是我们包的**模型可见面变更**——走 identity.md 登记 + gen-catalog + 快照/eval 纪律；b) `restrict` 时序：MCP 工具连接后异步注册，shim 须监听 `tools/change`（`core/tools` 199-209 声明）动态补 deny（前缀枚举，server 升级加新工具也覆盖）；~~c) 技能遮蔽残留：`ctx.skills.list()` 中立视图仍有条目 + 每次 fresh collect 一条 registry warn~~ **c) 修正**：跨层遮蔽在 registry 是**静默覆盖**（`merged.set` 无 warn；warn 只在同层去重时发）——真实残留 = 两条**幽灵条目**：无论 ov 在场与否都在不过滤的 `list()` 中立视图在场（模型不可见；BUG-001 runner 预热 snapshot 计数 19→21 一类断言会移位），且 `skills.register` 缺省 invocation 是**双 true**——遮蔽条目必须显式双 false（fail-deadly 默认，测试钉死）；d) **URI 死胡同**：召回块内联 `viking://` URI（`recall-core.mjs:396` 每命中一行），工具被拒后模型若追 URI → 守卫 deny 并指向不存在的 mcp 工具 → UNKNOWN_TOOL——内容已内联，正常不需要追；eval 量测追逐率，若显著再议只读放开（`allowReadonlyTools`）。

## 实弹测试台账（2026-09-29 起 ongoing；目标 goal-01c7b263）

**环境**：dev-ov 探针 profile（headless + assistant preset + ov 五旋钮）／dev-task 对照（零 ov）／dev（web）同步挂载。命令形状：`pnpm dsh --profile dev-ov --patch dev/preset-runner.patch.yml "<task>"`；日志 `dev/harness-home/sessions/--<cwd>--/<sid>/session.v4.jsonl.zstd` 按 [repo-live-probe](../../.agents/skills/repo-live-probe/SKILL.md) 解包。

**二期稳定性台账（2026-09-29 深夜起；goal-2c3fbe0e）**：

| 场景 | 判据 | 结果 |
|---|---|---|
| S8 重复性 ×3 | 同题跨会话召回一致 | ❌ **判词反转=发现本身**：召回通道**不确定**（planner 时延双峰 0.2s↔>15s，快慢决定走会话感知还是 find 降级；`bypassSession` 是死旋钮——`isBypassed` 零调用点）。**画像通道 3/3 稳定**（名字类事实全对）；实体页细节（过敏/喂养）召回 0/3，仅工具读可达。**确定性契约 = 画像（事实）+ 工具读（深度）**，召回是尽力而为加速器 |
| S10 事实更新 | 新值赢、旧值不复活 | ✅ **过**：换车位种子→抽取 `parking_space_change`（0.87，09/30）压过旧 `parking_space_correction`（0.84，09/29）；放开工具后模型自主四源查证（assistant_memory recall + ov 语义检索 + grep + 事件目录），产出完整更迭链 B2-117→B2-171（取代）→B3-205（现行，带 URI+「无更晚翻转」核验） |
| S13 flush 时机 | 源码级结论（能实测则实测） | ✅ **源码定案**：`session/flush` ≠ commit——插件 flush 只等消息写入（`runtime.mjs:400-403`）；commit 仅在 turn/end 且 `pending_tokens ≥ commitTokenThreshold`（`runtime.mjs` maybeCommit，默认 20000）。**推论：短会话（<20000 token）默认永不进抽取——个人助手主场景的记忆丢失缺口**。层 1 剖面 v3 必改：commitTokenThreshold 降至 2000-4000（试点 2000 的判断才是对的）；精确值待真实 web 会话校准（需真人多轮，headless 无法模拟） |
| S12 中断恢复 | 重启后记忆/队列/召回完好 | ✅ **2/2 过**（18 条、38 条两次重启全保留；find-back 即时 0.83 双命中；插件无状态 HTTP 天然跨重启） |

**二期结论**：靠不靠谱的最终形状——**画像+工具读是确定性主通道（可承诺），召回块是统计性加速器（不可承诺）**。shim 读写分离设计三期不变且更必要。

**一期场景电池**（每轮至少推进一格；全绿 ≥3 轮才可毕业）：

| 场景 | 判据 | 状态 |
|---|---|---|
| S1 基础往返 ×3 轮（换哨兵语料） | 种子会话→手动 commit→抽取→**新会话** recall 块含哨兵事实且模型答对 | ✅✅✅ **3/3 全绿**（轮1 年糕 / 轮2 香樟 / 轮3 车位账期教练）|
| S2 修正探针（先说错再改口） | 找回取**终值**（试点证过 server 级，DSH 级待复验） | ✅ **过**：答 B2-171（终值），召回块带原句「from B2-117 to B2-171 … final correct number」 |
| S3 保密标注 | 敏感事实（估值底线类）抽取物带保密语义 | ✅ 判分过：答「60 天（机密等级，仅对你本人复述）」+ 事件名 `confidential_` 前缀 ✅；双面发现保留：口头保密拦不住 server 落盘（stone_pixiu 实体在盘），入库拦截是产品缺口 ⚠️ |
| S4 多会话累积 | 后轮 recall 能见前轮事实（累积不覆盖） | ✅ 过（轮1+轮2 事实同会话全对，出处精确到 URI） |
| S5 对照组 | dev-task 同题答「不知道」+ 零 ov 注入 | ✅ 轮1 过（诚实拒答+枚举上下文自证） |
| S6 无中生有拒答 | 未种过的问题不编造（recall 无命中时模型明说没有） | ✅ 过（问母亲生日→「没有」+枚举实见画像，零编造） |
| S7 表面纪律 | system prompt 无 ov 污染；profile 块 ≤3000 token；工具面计数稳定 | 轮1 已测：13031 chars 干净 / profile 538 chars / 16 个 mcp__openviking__* |

**轮 1 现场记录**（探针 #1 = session-2f3fd292）：
- ✅ 捕获：server 会话 2 条消息在库（user+assistant 轮都进）。
- ✅ **profile 块到达 preset 会话**：`<openviking-context source="profile">` 含试点实体画像（咖啡因/小满/华芯/Q3 回款）+ available-memories 清单，538 chars。
- ✅ **recall 块到达**：种子会话即有命中（score 0.77，试点遗留 + resources 样板页）——注入管道不等抽取也活。
- ✅ 对照（S5）：dev-task 同题诚实「不知道」并枚举其上下文自证。
- ⚠️ **偏差①**：`peerId: assistant` **不开新记忆空间**——`viking://user` 下只有 `default`；peer 是请求侧 actor 维度，画像与记忆是 user 级（试点语料直接喂进本轮画像）。§六剖面「新空间从零攒」假设作废；正式接入的隔离思路要重想（若要隔离须 `recallPeerScope: actor` 级别，未测）。
- ⚠️ **偏差②**：one-shot 退出**不自动 commit**（无 session_commit 任务出现；手动 `POST /commit` 后任务才建，14:10:07 起 running）。探针流程手动 commit 兜底；web 真实会话的 flush→commit 行为待验（产品面关键项）。
- 📏 工具面实测 **16 个** `mcp__openviking__*`（文档口径 12 之外另有 cancel_watch/find/health/list_watches）——shim 用前缀拒恰好全覆盖，固定名单设计会漏。
- ⚠️ **偏差③（可靠性主发现，2026-09-29 晚）→ 已修复**：抽取任务存在 **~600s 单次 LLM 调用超时墙**（三路并发与单发全灭于 602-606s，连 3 条消息的小会话也同点超时）。**根因 = `vlm.timeout` 默认 600.0s**（`vlm_config.py:160`，schema 自述「慢端点请调大」）。**修复**：`dev/ov-trial.sh` 生成器加 `timeout: 1500` → 重生成 ov.conf → server 重启 → 同语料抽取 **38s 完成**（timeout 提升+重启复合归因，诚实记）；18 条存量记忆重启后完好。
- ⚠️ **偏差①（修正再修正）**：`peerId: assistant` **生效**——记忆落 `viking://user/default/peers/assistant/` 子空间（fs 实证）；但**画像（profile.md）是 user 级**（试点语料跨 peer 共享进画像）。更正后的语义：**记忆 peer 隔离、画像全局共享**——「新空间从零攒」对记忆成立、对画像不成立。
- 🎯 **召回深度发现（第一轮判词，已被轮3终局发现部分取代）**：server 默认走的 context 模式只出目录级 overview，四旋钮两轮验证无效（`recallPreferAbstract`/`recallMaxContentChars` 是降级路径专用，`recallLimit`/`recallMaxTokens` 不改粒度）——当时据此把 shim 改判**读写分离**（拒 6 写放只读，读展开端到端验证过）。轮 3 找到真根因（见下条）后，「到不了事实级召回」的悲观判词作废，但读写分离的 shim 结论**独立成立**（治理拒写不变；只读展开补深读）。
- 🎯 **轮3 终局发现（召回质量根因 + 旋钮级修复）**：插件在 DSH 会话里走 **session-aware `/search/search`（带 session_id，server 侧 LLM 规划「自行决定给什么上下文」）**——实测对聚焦查询返回陈旧/相邻内容（同 4 命中跨查询不变，`recallQueryExpansion: off` 无效）；而**查询式 `/find` 命中精准**（0.84/0.87 直打全对）。**修复 = `recallContextTimeoutMs: 3000`**（会话感知规划调用实测 >15s，3s 超时必然触发插件既有降级路径 → /find）——召回块从指针级 4 条（3051 chars）变**叶子全文 5497 chars**（含「B2-117→B2-171 final correct」原句），模型零工具答对终值+机密等级。**通道分工终版：画像=蒸馏事实，召回（find 路径）=叶子事实，工具=深读。**
- 📏 **抽取时延（修复后）**：38s / 106s / 48s 三轮（修复前 600s 墙全灭）。

## 层 1 最终旋钮剖面（实弹验证版，v3——2026-10-04 定稿）

```yaml
- id: openviking-memory-runtime
  config:
    endpoint: http://127.0.0.1:1933
    skillCatalog: false          # 服务器端技能目录注入关
    skipSubagentSessions: true
    profileTokenBudget: 3000     # 画像块实测 538-755 chars，余量充足
    recallContextTimeoutMs: 3000 # 关键旋钮：强制降级到查询式 find（叶子内容进召回块）
    commitTokenThreshold: 3000   # v3 新增（S13 结论）：默认 20000 = 短会话永不进抽取 = 个人助手主场景记忆丢失缺口；
                                 # 取 2000-4000 中值。自主拍板依据：可逆 config 旋钮、试点 2000 实证可用、
                                 # 精确值留真实使用期校准（多轮真人会话 headless 模拟不了）
    # peerId: assistant 可留作 actor 归因（记忆落 peers/assistant/；画像是 user 级，不隔离）
    # recallQueryExpansion: off 无效留档；mcpEnabled 死旋钮勿写
```
- 🎯 **轮2 现场记录**：S1 轮2 ✅（香樟/清明修枝/貔貅钥匙三题全对，①②带 URI 出处）；抽取 106s；S4 同探针验证 ✅。**通道分工浮现**：**画像块=事实主力**（跨轮蒸馏事实，年糕/香樟都在），**召回块=主题指针**（单题聚焦时命中好），**工具展开=叶子内容**。⚠️ **多主题稀释**：四题连问时召回查询（=整段 prompt）被「机密/不要外传」字眼带偏，4 个命中全是私密治理 flavored，轮 3 新事实零命中——真实会话多单题，稀释有限，但长复合问题要拆。⚠️ **S3 双面**：抽取物命名带 `confidential_` 前缀（保密语义进了抽取物 ✅）；但「这件事只有你知道」的口头意图拦不住 server 抽取——`stone_pixiu_statue` 实体照样落盘（本地明文，治理注记：敏感事实的入库拦截是产品缺口，非本切片能修）。⚠️ 画像重建滞后：轮 3 事实抽取完成后未即时进 profile.md（重建节奏待观察）。

## 待答问题 / 待跑实验 / 喂给谁

- ~~实施切片四量测~~ **已跑（2026-10-04，dev home 活体，ov server 0.4.22 在线）**：①画像块在场 ✓（本轮 recall 未触发——按 S8 结论召回是尽力而为加速器，不承诺）；②`mcp__openviking__*` 零调用零 UNKNOWN_TOOL ✓（shield 行为证据）；③目录无两个 ov 技能 ✓（遮蔽生效）；④URI 零死胡同 ✓。**附加发现与封堵**：通用 MCP 资源工具（`read_mcp_resource` 等，按 `server` 参数寻址）是 deny 前缀的**读桥旁路**——活体会话实证模型经它读到 `viking://` 实体页；修复 = per-server `tools/execute` guard（browser-use 先例，`b1446d5`，红绿测试三态），复验 5 次资源尝试全部被拒、模型自适应走 session_search 正路取回内容。证据：`/tmp/ux-evidence-1004/ov-live-session{,2}.jsonl`。
- **待答**：① ~~URI 追逐率~~ 已测：追逐存在（模型主动探索）但经 guard 拒后转正路，无死胡同——`allowReadonlyTools` 层 3 选项维持不启用；② commitTokenThreshold 真实长会话最优值（v3 定 3000，真实使用期校准）；③ `recallExcludeUris` 是否需排目录生成文件（上游默认空表）；④ ~~restrict 未知名时序~~ 已解（增量发现设计天然规避，同步监听器无窗口）。
- **待跑**（层 1 正式落地验收，AGPL 过门后）：`--dump-config` 断言 + 干净安装的 ov-install.sh 端到端 + eval 对照挂前/挂后 + 新 peer 记忆往返。
- **喂给谁**：层 2 治理桥的立项（`source: openviking:<id>` 转正语法 + digest 加情景记忆计数行）；上游反馈清单（§四三件 + 新增第四件：资源工具无 per-server 权限面——我们的 guard 是组合层补丁，上游修了可退役）。

## 候选与取舍（输掉的方案）

- **塞进 assistant preset 的 `config.plugins`（OpenViking 本体行）**：严格语义（缺席 = preset broken）直接否决——可选增强不能变成 preset 的单点故障。shim 行是例外：它**不依赖** OpenViking 在场（缺席时 deny 枚举为空、遮蔽条目不可见，零影响），进 preset 合法。
- **写进我们包的 `cordis.patch.yml`（OpenViking 本体 bundle 行）**：S1 依赖打包输掉的理由全部继承（发布物自包含、被动安装、release-smoke），且给未装者留一行永久的缺席警告。
- **被动等上游开关（原「隐形引擎不可达」判词）**：二轮调查推翻——DSH 原生缝（§七.②）已可达，不等上游；上游接上开关之日 shim 退役（换回一行配置）。
- **补丁重打包（§七.④）**：机械成立（spike 实证），但维护税（每次上游升级重打 + provenance 叙事复杂化）输给 DSH 原生缝——降级为 shim 失效时的备选。
- **只读 MCP 放开（留 search/read 关 write）**：原判「全有或全无」已被 §七 推翻——shim 的 deny 按名生效，选择性放开可达成；暂不启用（`allowReadonlyTools` 留作层 3 选项，等 URI 追逐率数据）。
- **knowledge/ 房间接 Resources**：治理语义（人审/sources/互链）与 ov 自动资源库不同构，无真实痛点——层 3 不立项。

## 毕业门（四问 + 验收判据）

- **该不该**：已过（用户拍板「肯定需要融合」）。
- **何时**：层 1 待 AGPL 真人复核（RFC 遗留前置）+ 用户过 §六旋钮剖面；层 2 待层 1 跑一个真实使用周期（eval 有对照数据）。**复核面的事实收敛（2026-10-03，随 §七.② 定形）**：本卡缝法对 AGPL 侧零改动零重分发（`ov-install.sh` 安装上游原样 tgz；server 独立进程；shim 属我方 MIT 包、经 DSH 原生缝执法）——RFC 提案 6 初判的场景（独立进程 + HTTP/MCP 消费不构成链接）就是复核的全部场景，fork/改动触发条件在本缝法下不存在；判断仍归真人。
- **次序**：层 1（插件行 + shim 行 = 隐形引擎）→ 量化（URI 追逐率/eval 对照）→ 层 2（治理桥）→ 层 3（只读放开等，数据驱动）不立项。
- **放弃**：上面六个输掉的方案已记录；若 eval 证实召回段噪声或 URI 追逐不可控，回退 = 从 `dsh.profile.bundles` 移除该 bundle + preset 里禁 shim 行（`operations.ts` 机制：无需卸载包）。

**验收判据**（实施切片完成 = 本卡毕业为 implemented note）：dump-config 断言（插件行 + shim 行）；repo-live-probe 四量测（召回段在场 / mcp 工具不在 / 2 技能不在 / URI 追逐计数）；eval 对照不红；新 peer 往返命中；AGPL 复核记录在案；shim 行走 identity.md + gen-catalog + 快照（模型可见面纪律）。
