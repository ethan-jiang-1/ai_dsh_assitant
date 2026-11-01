---
status: 已结
opened: 2026-11-01
---

# 推敲：产品 profile 对齐——独立启动 profile、工作区配置与 bundle 自有启动

> 立卡：2026-11-01 ｜ 状态：已结 ｜ 类型：Feature ｜ 可关闭：是 ｜ 毕业：做现在

**问题与期望结果：** 上一轮把产品做成了“启动器 + 产品 home + `assistant-product/settings.json` + 客户端门”，native 安装时退化为“装了插件的普通 DSH”，与用户要的“插件有独立启动 profile、启动时知道/询问 workspace、插件能力施加到用户 workspace”不一致。本卡把产品 owner 移回 **dedicated `assistant` profile + bundle 自有启动/首屏 + profile Config**，让产品安装器与 DSH 原生安装都能给出同一产品体验。

**用户口径（2026-11-01，第二轮确认）：** 插件有自己的独立启动 profile；启动时知道、或在启动过程中询问 workspace 在哪里；插件的内容留在插件内部；产生的状态与最终输出物（历史口径的 run bundle）在用户 workspace 里；这样插件的能力才能施加到用户指定的 workspace 上。仓库、`_dist` 说明与根 README 都要同步。

**授权（2026-11-01，第三轮）：** 本人授权按本卡推荐实施；**做对最重要，不需要兼容旧产品**；**安装必须尊重 DSH**。本卡转为 work 台账（收口卡），按 `## 落地顺序` 推进；work 证据住本卡。研究依据 = [产品 profile 纠偏](../research/261101-startup-model-comparison/261101-product-model-correction.md)。

**当前情况：** 已有一版产品形态（启动器、产品行、工作区登记、客户端门、`deliverables/` 交付包）可跑；`pnpm product-smoke`、`pnpm web-install-smoke`、web-face 场景是可复用的证据骨架。缺口不是插件能力，而是产品层 owner：工作区绑定只在私有 `settings.json`，没有启动器就没有“知道/询问 workspace”的路径；native 路径装进 `web` profile，与 dedicated `assistant` profile 是两套世界；`_dist/安装手册.md` 仍把启动器写成推荐入口，并含有 `dsh plugin --profile desktop` 这类与更新后 DSH 合同冲突的写法。

**未决问题：** 产品安装器是否保留为“目标用户推荐路径”（建议保留，但降为安装器）；`workspaceDir`/`onboarding` 的 Config 键名；旧 `settings.json` 迁移策略；Desktop 是否本轮真机验证；机器 run manifest 是否现在做（建议延后）。技术未知已缩小：Config/volatile、workspaceRegistry、session create、directoryPicker、openSession 都有源码/探针依据；真机 picker 与 Plugins 页安装仍需切片证据。

**下一步：** 已结；S1–S4 已交付，S5 收口完成；开放项见 `## 仍未取` 与 `_backlog/triggers.md`。

## 怎么 review 这张卡

> 2026-11-01 已授权实施；以下保留为 review 记录，不再等待答复。实施中若发现推荐不可行，按切片停点记录并回退。

1. **先看 owner**：`## 方案与取舍 → 目标形态` + `### 按 DSH 生命周期对齐（37）`。确认“工作区绑定归 profile Config、首启归 client、安装器只做安装”这三条你认。
2. **再看拍板点**：`## 拍板点` 6 条。哪条要改，直接说；不建议改的用推荐。
3. **再看证据**：`## 验收标准` 17 行，尤其 2/3/4/5/13–17（Config、onboarding、native、真启动、版本门、首启/Desktop）。
4. **最后看切片**：`## 详细设计` + `## 落地顺序`。S1+S2 是最小自足集；S3/S4 是安装器/native 与文档收口。
5. **要挑刺的地方**：`## 仍未取` 是否少了一项；`## 4.9 风险` 是否有你见过的坑；`_dist` 十段是否漏了你的交付口径。

## 外部结果三要素

- **触发**：用户拿到 tarball 用产品安装器起，或已有 DSH 的用户建 `assistant` profile 后在 Plugins 页装 bundle 并启动；用户有一个项目目录，或首次启动时被询问。
- **用户得到**：产品在 dedicated `assistant` profile 里启动（或 Desktop 的 Plugins 页路径），首屏知道/询问项目目录；会话一开始就落在该项目；交付包出现在 `<项目>/deliverables/`；助手大脑仍在自己的 home；不写 `settings.json`、不手写 YAML/JSON；不用启动器也能得到同一首启/绑定体验。
- **完成条件**：产品安装器路径与 native 路径都通过真启动证据；`assistant-product.workspaceDir` 写入 profile patch 并在重启后生效；onboarding/recovery/change-workspace 真渲染；`pnpm product-smoke`、`pnpm web-install-smoke`、`pnpm verify`、`pnpm export-dist` 绿；README/docs/`_dist` 口径一致；无浏览器/无 key 的检查如实标 BLOCKED。

## 初衷对齐（P1–P3 / O1–O6）

| 判据 | 本卡怎么服务 |
|---|---|
| **P1 管理岗基座** | 首屏仍是一页纸/产品开始页；内容与 preset 不变。 |
| **P2 跟人学** | 大脑仍跟人走（1A），跨工作区不碎；run README 的“依据”可引 `memory:`/`knowledge:`/旧 run。 |
| **P3 管得住** | 工作区/知识页/run 文件夹都是人可读；curate 不变；新增的 Config 绑定可在 Settings 看见/清除。 |
| **O1 说得清出处** | run README 四段不变；知识页 sources 不变。 |
| **O2 办得成** | 产物在用户项目，可拿走；`present` 不变。 |
| **O3 知道不知道** | 不变；首启 onboarding 必须能“稍后”/取消，不强迫。 |
| **O4 越用越像本人** | 全局大脑 + run 历史 + 项目笔记；不变。 |
| **O5 装得上** | 安装器与 native 两条路都通；安装文档默认 Plugins 页（DSH 用户）与安装器（目标用户）。 |
| **O6 管得住** | 产品 home 可选；工作区绑定在 profile Config；产物在用户项目；无 IM、本地。 |

## 拍板点

> **2026-11-01 已授权：1–6 全按推荐；不做旧产品兼容；安装尊重 DSH。** 以下保留取舍记录，供实现中反转时读。

| # | 决定 | 推荐 | 另一条路 | 代价 |
|---|---|---|---|---|
| 1 | **产品入口** | dedicated `assistant` profile 是产品；启动器只是可选安装器；native 路径一等公民 | 只保留启动器；或只做 native 插件 | 只启动器 = 回到第二层壳；只 native = 目标用户没有一条命令 |
| 2 | **工作区绑定** | `assistant-product` Config `workspaceDir`（volatile；profile patch）+ `ASSISTANT_WORKSPACE` 一次性 env 覆盖；旧 `settings.json` 只迁移 | 保留 `settings.json`；或只靠 env | 私有文件 = 第二真值；只 env = 不持久 |
| 3 | **首启** | 客户端 onboarding（DSH `remote.directoryPicker`）→ POST → 校验/登记/写 Config；可“稍后”；恢复面可重选 | 只用 CLI 参数/TTY；或透明退回普通一页纸 | CLI-only = 非技术用户卡住；透明 = 产品不自足 |
| 4 | **启动器** | 瘦身为安装器：建 profile/装 tarball/设默认 preset/起进程；`--workspace` 只设 env，不写工作区文件；`--stop`/`--no-start` 保留；只碰自己的依赖与默认 preset，用户其他 patch/插件保留 | 删除启动器；或保持现状 | 删除 = 目标用户多步；保持 = 第二套 owner |
| 5 | **大脑与 run bundle** | 大脑跟人走（1A，不变）；run bundle 在 `<workspace>/deliverables/`，README 四段为 v1 状态；机器 manifest 延后 | per-workspace 大脑；现在加 `run.json` | 大脑跟项目 = 平台段落拿不到 session/workspace；manifest = 无消费者先建 schema |
| 6 | **安装文档** | 目标用户 = 安装器；DSH 用户 = Plugins 页（native）；Desktop = Desktop 的 Plugins 页；绝不写 `dsh plugin --profile desktop` | 继续把启动器写成唯一推荐；或把 native 写成唯一 | 旧口径与 DSH 合同冲突；native-only 丢目标用户 |

> **建议全按推荐。** 若本人只想先做一半：S1+S2（Config/state/route + onboarding）是产品自足的最小集；S3（启动器瘦身/native smoke）与 S4（文档/`_dist`）紧随；S5 收口。

## 方案与取舍

### 目标形态

```text
① 插件包：bundle patch / preset / skills / seeds / client / bootstrap.mjs（静态、只读）
② 产品 profile：assistant（web 模板 + 产品 bundle + 默认 preset + 产品 Config）
③ 用户 workspace：项目文件 + deliverables/<date>-<slug>/（run bundle）
④ 宿主 home：sessions / credentials / storages / workspace registry / 产品 home（可选）
```

- **工作区解析**：host 行读 effective Config `workspaceDir`；`ASSISTANT_WORKSPACE` 可一次性覆盖；都没有 → `not-configured` → 客户端 onboarding。
- **持久化**：`ctx.settings.update('assistant-product', { workspaceDir })` 写 profile patch；不写私有 `settings.json`。
- **会话**：client `startSession(workspaceId, { agentPreset: 'assistant' })`；确定性选中用 `uiWorkspace.openSession(sessionId)`。
- **交付**：模型在 cwd 工作；`deliverables/` + README 四段 + `present`；不复制会话日志。
- **启动器**：只做安装/引导；`--workspace` 设 env；`--product` 从 Config/onboarding 恢复；`--stop` 收进程组。

### 按 DSH 生命周期对齐（37）

37 的四阶段判据是本卡的验收框架；不能只验“能装、能起”，要逐阶段验 owner、失败态与生效方式。

| 阶段 | 37 的判据 | 本卡的落点 | 卡在哪 |
|---|---|---|---|
| **① 装** | bundle patch；GUI 默认 Plugins 页、CLI 仅 web 自动化、`desktop` 双门禁闭；三个“装成功”；版本门按 pin 实际合同（`engines.dsh`/peer）；`npm pack` 清单可复现。 | 包已是 bundle；不写本 pin 不读的版本字段；安装器 = shell/自托管路径；DSH 用户走 Plugins 页；手册删 `--profile desktop`。 | S3/S4；acceptance 11–13 |
| **② 起** | profile 四件套；`insert:`；失败三级；三种生效；启动体验在 bundle；session create ≠ UI 选中。 | dedicated `assistant` profile；产品行 `insert:`；host 登记 + client 首屏/选中；不替换 `web-startup`；安装/更新重启、客户端刷新。 | S1–S3；acceptance 1/4/5/14 |
| **③ 配** | bundle → profile → home → CLI；默认值在 bundle；用户设置 profile patch；home 能覆盖、不能供货；dump ≠ 真启动。 | 默认值在 bundle patch；`workspaceDir` 在 `assistant-product` Config（profile patch）；不写 home；无 `settings.json` 第二真值；真启动验。 | S1；acceptance 2/6/15 |
| **④ 首启** | 只有令牌门；无欢迎页/向导；不依赖 `settings.onboarding`/`welcome-notice`；六类载体；可推迟；Desktop 有替代路径。 | 客户端 `ProductGate` onboarding 在 `main` 槽；选择/“稍后”/恢复；不依赖 `welcome-notice`；Desktop 文档给替代路径。 | S2/S4；acceptance 3/7/16 |

**37 暴露的七个具体缺口（落地时必须回答）**：

1. 37 提到 `engines.dsh` + `dsh.compatibility.dshReleases` 两处；**本 pin 的 manifest reader 只读 `engines.dsh`/peer**（`plugin-compatibility.ts` 已核），没有 `dsh.compatibility`。本卡按 pin 实际合同做；等升级到读取该字段的 DSH 再加，避免假声明。
2. **Plugins 页装“当前 profile”，不创建 profile**；不能说“在 Plugins 页装完就有 dedicated `assistant` profile”。必须先建 profile（CLI 一次性命令或安装器），或者诚实写“当前 profile 的插件模式”。
3. **首启不能依赖 `welcome-notice`/`settings.onboarding`**；产品 onboarding 必须是自己的 client 面，且可“稍后”。
4. **真启动是门槛**：`--dump-config` 只证补丁栈；必须读 stderr 的 `did not activate`/`skipping profile bundle`。
5. **生效方式写对**：宿主行/组合变化 = 重启 profile；只换 client = 刷新；HMR 只在宿主应用时成立；CLI 装完宿主不知道。
6. **Desktop 是另一条 profile 线**：同一 bundle、`desktop` profile；CLI 双门禁闭；首启不能依赖 Desktop 不注册的 `welcome-notice`；替代路径要写，真机未验 = BLOCKED。
7. **安装器是 shell/自托管路径，不是 GUI 默认**：目标用户可用；DSH 用户 Plugins 页并列；不能把安装器说成 DSH 默认安装方式。

### 被击败的方案

- **只保留启动器（现状延续）**：产品仍是 DSH 外面的第二层壳；native 安装退化；`settings.json` 第二真值；与更新后的 50-launch/37 冲突。
- **只做 native 插件（上一轮提案的极端）**：把产品特殊性全塞进客户端开始页，丢掉 dedicated profile/产品 home/一条命令；目标用户（CEO）没有 DSH 经验。
- **全盘仿 deck-studio（workbench + dataRoot + 源只读）**：与四房间/账本/一页纸/项目交付包冲突；是另一个产品面。
- **per-workspace 大脑（B/C）**：平台段落拿不到 session/workspace；与 1A 决定相反；另立决定。
- **现在加机器 run manifest**：没有消费者；先用 README 四段，触发 = 产品 UI/自动化核对产物。

## 详细设计

> 这一节是给 review 的实现级设计；拍板后按它落 S1–S4。命名/键名是建议值，S1 可微调，但“owner 与优先级”不变。

### 4.1 数据与 Config 合同

`assistant-product` 行新增 Config：

```ts
interface Config {
  /** 工作区绝对路径；volatile，Settings UI 可写当前 profile patch。 */
  workspaceDir?: string
  /** 首启是否显示 onboarding；部署/默认值，默认 true。 */
  onboarding?: boolean
}
```

- `workspaceDir`：`z.string()` + `.volatile()`；路径策略复用 `src/domain/product/workspace-path.ts`（绝对、存在、目录、可读写、禁 `/`/用户 home/产品 home/包内；符号链接按目标判）。
- `onboarding`：`z.boolean().default(true)`；bundle patch 默认 true，dev/standalone profile patch 可 false；不作为用户 Settings 字段（v1）。
- **有效值优先级**：`ASSISTANT_WORKSPACE`（一次性 env）> effective Config `workspaceDir`（profile/home/CLI patch 合成）> legacy `settings.json`（只迁移）> `not-configured`。
- **持久化**：成功登记后调用 `ctx.settings.update('assistant-product', { workspaceDir })`；写当前 profile patch。没有 settings 服务时状态 `invalid` + `error: 'settings-unavailable'`，不静默丢。
- **不写**：`<home>/assistant-product/settings.json`、home patch、其他 profile；产品 home 的 `assistant`/`assistant-operating` 不变。

### 4.2 Host 状态机与 route

`src/host/product/state.ts`：

| 状态 | 触发 | 行为 |
|---|---|---|
| `pending` | boot 初始 | 读 env/Config/legacy，校验/登记中 |
| `not-configured` | 三处都没有 | 不改 registry；客户端 onboarding |
| `ready` | 校验/登记成功 | snapshot 带 `workspaceDir`/`workspaceId`/`onboarding` |
| `workspace-missing` | 路径不存在/不是目录 | 不空建；可重选 |
| `invalid` | 坏 Config/权限/禁路径/settings 不可用 | 保留原因码；可重选/修配置 |

- `setWorkspace(workspaceDir)`：串行队列（沿用）；校验 → `workspaceRegistry.create` → `settings.update` → `ready`。并发 POST 不交错；`settings` revision 冲突返回可读错误，客户端重试/提示。
- `refresh()`：boot 一次；若 settings 服务有 `settings/document-updated` 或 `loader/volatile-update`，可选监听并重读；v1 不监听也可，文档写“Settings 改后重启/刷新”。
- route：GET 返回 snapshot；POST `{ workspaceDir }`；4 KiB 上限；400/422/409/500 的错误码稳定；不接收任意路径、不接受 query。
- headless：行 `disabled: true`；不读 Config/env；不注册；现有 4 条 web-only pending 不新增。

### 4.3 客户端 onboarding

`ProductGate` 四种面：

| 面 | 条件 | 内容 |
|---|---|---|
| `legacy` | 404/传输失败/无产品行/onboarding=false | 原 dashboard，零变化 |
| `onboarding` | 产品行在、`not-configured`、onboarding=true | 标题 + 一句说明 + “选择项目目录” + “稍后” |
| `ready` | `ready` | 保留门条 `工作区 · <name>` + “开始一件事” + “换项目” |
| `recovery` | `workspace-missing`/`invalid` | 原因 + 路径 + “选择另一个目录” + 安装器/配置指引 |

- 选择器：`ctx.remote.directoryPicker.pick()`；取消返回 null → 留在 onboarding，不报错。
- 选择后：POST `api/assistant/product`；loading/disable 按钮；422 显示可读原因；409 重新拉取 snapshot 再试。
- “稍后”：仅本会话隐藏（或 localStorage `product.onboarding.dismissed`，v1 用会话级，避免第二设置）；刷新后可再出现。
- 无 picker：显示 `<profile>/cordis.patch.yml` 的 `workspaceDir` 示例 + 安装器命令；不崩。
- 无 session：onboarding 不自动建会话；CTA 显式建；避免“幽灵会话”。
- 选中确定性：`startSession(workspaceId, { agentPreset: 'assistant' })` 后调用 `uiWorkspace.openSession(sessionId)`；若 startSession 不返回 id，用 remote 返回值/列表最新，拿不到则文档标 BLOCKED。
- “换项目”：picker → POST → 新 workspace；旧 session/旧 registration 不删；当前会话不迁移；新会话用新工作区。

### 4.4 启动器（`bootstrap.mjs`）

| 步骤 | 做什么 | 不做什么 |
|---|---|---|
| 解析 | `--workspace`/`--product`/`--home`/`--profile`/`--dsh`/`--offline`；早校验 workspace（预检） | 不写工作区文件 |
| profile | 不存在才 `--from-default-profile web`；已有 profile 不重置；缺 web-app/外来 profile 给明确错误 | 不覆盖用户 patch/依赖 |
| 安装 | `pnpm pack` → `dsh plugin --profile assistant add <tgz>`；版本对账；同版本跳过；失败保留旧装 | 不手写 `dsh.profile.bundles` |
| 默认 preset | 只写自己的 `agent-preset-registry.default: assistant`（或文档让用户 Settings 选） | 不改用户其他行 |
| 启动 | `ASSISTANT_WORKSPACE=<canonical>`（仅 `--workspace`）；`dsh --profile assistant --port 0`；cwd 可设工作区 | 不替换 `web-startup`、不加产品 flag |
| 停止 | `--stop` 收进程组；pid/`bootstrap.json` 0600；token 打码 | 不碰其他实例 |
| 模式 | standalone 保留 dev/demo；文档不写主路径 | 不把 standalone 当产品 |

### 4.5 native 路径（无启动器）

Web DSH 用户：

```sh
# 1) 一次性建 dedicated profile（CLI 自动化；已有 profile 不要用 --from-default-profile）
dsh --profile assistant --from-default-profile web
# 2a) CLI 自动化装（启动前）
dsh plugin --profile assistant add /path/to/dsh-smart-assistant-<ver>.tgz
# 2b) 或先启动、在 Plugins 页装（当前 profile），再重启
dsh --profile assistant --port 0
# 3) 启动
dsh --profile assistant --port 0
```

- 文档必须写清 2a/2b 的顺序差异：Plugins 页没有 profile 参数，装的是当前 profile；它**不创建** profile。
- 首启：token URL → onboarding → 选目录 → POST → ready。
- 验收：`--dump-config` 有行；roster 有 bundle；真启动 stderr 无 warning；首启 onboarding 真渲染。

Desktop：

- 只用 Desktop 的 Plugins 页；CLI `--profile desktop` 双门禁闭；不承诺 dedicated profile/产品 home。
- 首启替代路径：Settings/配置文件/命令；`welcome-notice` 不作为依赖；真机未验 = BLOCKED。

### 4.6 迁移

- 旧 `<home>/assistant-product/settings.json`（version 1，`workspaceDir`）：
  1. effective Config 有值 → 忽略旧文件，日志警告；不覆盖。
  2. Config 无值、旧文件有效 → 校验/登记 → `settings.update` 写 Config → 旧文件原子改名 `settings.json.migrated`（保留内容）。
  3. 旧文件坏/路径非法 → `invalid`，保留文件，不静默当空；给迁移指引。
- 迁移只在 web 产品行 active 时发生；headless 不读。
- 回滚：保留旧文件；Config 可手动清 `workspaceDir` 回 onboarding；不物理删用户数据。

### 4.7 文档与分发

| 文件/生成器 | 改什么 |
|---|---|
| `README.md` | 产品定义、A/B/C 三条路径、首启/换项目、数据归属；把“装进 web 的插件”降为 advanced；修链接 |
| `docs/product.md` | 重写 1–9 节：layers/profile/install、startup Config、workspace/session、run bundle、project surface、data、failure、boundaries |
| `docs/architecture.md` | 产品行 Config/flow；删 settings.json；§七/§八 链路 |
| `docs/delivery.md` | 数据卡：settings → profile Config；迁移；备份；`assistant-data` 不变 |
| `docs/testing.md` | 证据地图：product-smoke/native smoke/onboarding/web-face/真启动 |
| `docs/release.md` | 安装/更新/兼容/重启/刷新/HMR；版本门按 pin 实际合同；Plugins 页优先 |
| `docs/identity.md` | 行/config 变化；不改名 |
| `docs/dev.md` | 产品实例：安装器 vs native；dev home 不变 |
| `docs/commands.md` | `product-smoke`/`native product smoke` 描述；命令清单 |
| `docs/discipline.md` | 适配行 13：product settings 改 profile Config；产品 home 可选 |
| `docs/AGENTS.md` | owner 表：product.md 描述、测试/发布 owner |
| 包 `README.md`/`AGENTS.md` | 包形状、入口、owner 面（settings 变 legacy/迁移） |
| 根 `AGENTS.md` | “这是什么”产品启动句；硬规则 1 的产品 home 口径 |
| `_dist/安装手册.md` | 由 `scripts/release/export-dist.mjs` 重生成，不手改；十段 + A/B/C + Desktop + 迁移/卸载 |
| `scripts/release/export-dist.mjs` | 手册模板、must 清单、版本/日期；版本门按 pin 实际合同 |

### 4.8 测试与证据

| 层 | 新增/更新 | 证明 |
|---|---|---|
| domain | `product-settings.spec.ts` 改 Config/迁移；`workspace-path` 反例 | 路径/版本/优先级/坏文件 |
| host | `product-route.spec.ts` 改 settings.update/无 settings/并发；state spec | 状态机/route/持久化 |
| client | `product-gate.spec.ts` 加 onboarding/稍后/恢复/换项目/无 picker | 四种面 |
| composition | `export-shape.spec.mjs` 加 Config/row；`--dump-config` | 组合行 |
| web-face | 新 onboarding 场景 + ready/recovery；seed 改 profile Config | 真渲染/CTA |
| smoke | `product-smoke` 改 Config/无 settings.json；新增 native product smoke；`web-install-smoke` 保持 web plugin 路径 | 安装器/native 两条路 |
| 真启动 | 读 stderr `did not activate`/`skipping profile bundle`；roster/row | 失败三级 |
| 文档 | `verify`/`export-dist`/漂移审计 | 口径一致 |

### 4.9 风险与边界

- settings 服务缺席/远程：返回可读错误，不静默；文档给 profile patch 手工路径。
- picker native/browse/remote/无：v1 本机 native 优先；browse 另测；无 picker 给指引。
- 并发 POST/settings revision：串行 + 409 + 重试。
- 路径策略：symlink、root/home/产品 home/包内、不可读写、非目录；不空建。
- profile：外来同名、base-only、缺 web-app、版本不兼容；明确错误，不重置。
- 版本门：本 pin 的 reader 只读 `engines.dsh`/peer；不写 `dsh.compatibility.dshReleases`（37 的更高版本约定）；exemption 只 exact。
- 同版本重装不刷新；升级先 bump；重启/刷新/HMR 分清。
- headless：行 disabled；不新增 pending。
- Desktop：CLI 双门禁闭；首启替代路径；真机 BLOCKED。
- home patch 覆盖：可覆盖、不供货；产品不写 home。
- 旧 workspace registration：不删；只换当前绑定。
- 迁移：保留旧文件；坏文件不静默。
- 文档漂移：每片同 diff；`_dist` 由生成器出。

## 落地顺序（拍板后即 work 台账）

```text
S0 研究/方案（本卡）
  └─> S1 Config/state/route（产品行 + 域核 + legacy 迁移 + host spec）
        └─> S2 客户端 onboarding/recovery/change workspace（client spec + web-face）
              └─> S3 安装器瘦身 + native 产品 smoke（profile + 安装 + 首启 + 会话 cwd）
                    └─> S4 文档/README/_dist/identity/release/testing
                          └─> S5 收口（证据、迁移、triggers、归档）
```

| 步 | 内容 | 主要文件 | 门（做完的判据） | 停点 |
|---|---|---|---|---|
| **S0** | 研究/方案显性化 | 本卡 + [纠偏材料](../research/261101-startup-model-comparison/261101-product-model-correction.md) | 材料/卡互链；`pnpm verify` backlog 形状 | 本卡 |
| **S1** | `assistant-product` 加 `workspaceDir`/`onboarding` Config；state 读 Config/env；route POST 写 `settings.update`；旧 `settings.json` 一次性迁移；headless 保持禁用 | `src/host/product/{index,state,route}.ts`、`src/domain/product/{settings,workspace-path}.ts`、`cordis.patch.yml`、`tests/domain/product-settings.spec.ts`、`tests/host/product-route.spec.ts` | `pnpm test:domain`、`test:host`、`test:composition`、`--dump-config`；坏 Config/缺目录/不可读写/无 settings 服务 | 一个 commit |
| **S2** | 客户端 onboarding（DSH picker）+ 恢复面重选 + “稍后”；ready 门条/CTA 保留；确定性 `openSession` | `src/client/product/product-gate.ts`、`src/client/index.ts`、`tests/client/product-gate.spec.ts`、`snapshots/web-face/product-workspace-gate/` | `pnpm test:client`、`pnpm web-face-check --scenario product-workspace-gate`（含 onboarding 场景）；无浏览器 = BLOCKED | 一个 commit |
| **S3** | 启动器瘦身：`--workspace` 只设 `ASSISTANT_WORKSPACE`；不写工作区文件；`--product` 从 Config 恢复；`assistant` profile 只在不存在时从 web 模板建，已有 profile 不重置（缺 web-app 时给明确错误/救援提示）；standalone 保留为 dev/demo（是否改显式 flag 由实现时定，不作为硬项）；版本门按 pin 实际合同（`engines.dsh`/peer；不写 pin 不读的未知字段）；native 产品 smoke | `packages/dsh-smart-assistant/bootstrap.mjs`、`packages/dsh-smart-assistant/package.json`、`scripts/release/product-smoke.mjs`、`scripts/release/standalone-smoke.mjs`、`scripts/release/bootstrap-guards-smoke.mjs`、新增 native smoke | `pnpm product-smoke`、native smoke、`standalone-smoke`、`bootstrap-guards-smoke`、`release-smoke`（无 key 部分 BLOCKED）；版本门/真启动无 warning | 一个 commit |
| **S4** | README/docs/`_dist`/身份/发布/testing 同 diff；手册重写为 A/B/C 三路径（含“Plugins 页装当前 profile、不创建 profile”与 Desktop 替代路径）；去掉 Desktop CLI 错写；发布前 8 条判据逐条落 | `README.md`、`docs/product.md`、`docs/` 下的 architecture/delivery/testing/release/identity/dev/commands/discipline 各自 `.md` 与 `docs/AGENTS.md`、`_dist/安装手册.md`、`scripts/release/export-dist.mjs`、`packages/dsh-smart-assistant/README.md`、`AGENTS.md` | `pnpm verify`、`pnpm export-dist`、语义漂移审计、`_dist` 手册无 `--profile desktop`；37 的 8 条发布判据有对应文档 | 一个 commit |
| **S5** | 收口：证据表、迁移说明、triggers、旧 note/归档路由 | 本卡、相关 note/trigger、归档 | 关闭条件满足；`pnpm verify` notes | — |

**并行/不可并行**：S1 与 S2 的文本可在 S1 schema 冻结后并行；S3 依赖 S1（Config 键）与 S2（首启行为）；S4 依赖 S1–S3 的行为；S5 依赖全部。

## 验收标准

| # | 行为 | 输入/状态 | 通过信号 | 反例/恢复 | 证据 owner |
|---|---|---|---|---|---|
| 1 | dedicated `assistant` profile 起产品 | 干净 home + `assistant` profile + 产品 bundle | `dsh --profile assistant` 起 Web；`--dump-config` 有 `preset-assistant` 与 `assistant-product`；首屏是产品开始页 | 装进 `web` 也叫产品 → 红；profile 缺 web-app → 明确报错 | native 产品 smoke；`--dump-config` |
| 2 | 工作区来自 Config | `assistant-product.workspaceDir` 写 profile patch | 重启后 `ready`；`workspace.json` 有 canonical path；会话 `header.cwd` = 工作区 | 只读 env、不写 Config → 重启丢；坏 Config → `invalid`，不静默当空 | host/domain spec；product-smoke |
| 3 | 首启询问 | 无 Config/env；产品行在场 | 首屏 onboarding；选择目录 → POST → `ready` + 门条 + CTA | 取消/坏路径 → 可恢复；无 picker → 可读指引，不崩 | client spec；web-face；真机 |
| 4 | native 路径不用启动器 | `assistant` profile + Plugins 页/CLI 安装 | 首屏 onboarding；绑定后会话 cwd = 项目；交付包落项目 | 没有启动器就没有产品入口 → 红 | native 产品 smoke |
| 5 | 启动器只做安装/引导 | `bootstrap --workspace X` | 建/复用 profile、装包、`ASSISTANT_WORKSPACE=X`、起 Web；不写 `settings.json`/工作区文件；只碰自己的依赖与默认 preset，用户其他 patch/插件保留；已有 `assistant` profile 不重置（`--from-default-profile` 只用于不存在/救援）；`--product` 从 Config 恢复 | 启动器写工作区/设置 → 红；同版本重装 → 跳过；已有 profile 被重置 → 红；外来 profile → 拒 | product-smoke；bootstrap-guards |
| 6 | 旧设置迁移 | 旧 `<home>/assistant-product/settings.json` | 首次 boot 读取 → 登记 → 写 Config → 旧文件改名 `.migrated`；坏文件保留并报 `invalid` | 迁移后仍读旧文件 → 红；坏文件静默当空 → 红 | host spec；product-smoke |
| 7 | 恢复面可重选 | Config 指向已删/不可读目录 | `workspace-missing`/`invalid`；首屏可重选目录；不空建 | 只给 `--workspace` 重启提示 → 不足 | client spec；web-face |
| 8 | run bundle 在 workspace | 一个真实任务 | `deliverables/<date>-<slug>/README.md` 四段 + 交付物 + `present`；知识页只蒸馏；项目 `AGENTS.md` 不被覆盖 | 产物写回 home → 红；复制会话日志 → 红 | prompt-smoke；eval/真机 |
| 9 | 大脑仍跟人走 | 多工作区 | 四房间/账本仍在一个 home；不按 workspace 分区 | 隐式 per-workspace 分叉 → 红 | 现有域/服务 spec |
| 10 | headless 不回归 | headless profile | 产品行 `disabled: true`；零新增 pending | 多一条 `assistant-product` pending → 红 | `--dump-config`；composition |
| 11 | 文档/分发一致 | README/docs/`_dist` | 三处都说 dedicated profile + Config + run bundle；无 `dsh plugin --profile desktop`；`pnpm export-dist` 重生成 | 仍把启动器写成唯一/推荐；手册旧装法 → 红 | `pnpm verify`；语义漂移审计 |
| 12 | 安装三成功/重启 | CLI 安装/应用内安装 | 文档写清 pnpm/dependency/roster 三状态与重启；不把 exit 0 当生效 | “装完立即生效” → 红 | 文档审计；release-smoke |
| 13 | 版本门按 pin 实际合同 | 包 manifest | 本 pin 的 reader 只读 `engines.dsh`/peer（`vendor/dsh/packages/boot/app-boot/src/plugin-compatibility.ts`）；不兼容安装前拒绝；exemption 只 exact。37 提到的 `dsh.compatibility.dshReleases` 是更高版本约定，升级 pin 时再补，**不写本 pin 不读的字段** | 把 37 的外部约定当本 pin 强制门 → 假声明 | manifest 断言；release-smoke；pin 源码核对 |
| 14 | 真启动无警告 | `assistant` profile 真 boot | stderr 无 `did not activate`/`skipping profile bundle`；`--dump-config` 行在；重启/刷新/HMR 文档正确 | 只看 dump 绿 → 假绿 | native 产品 smoke；启动日志 |
| 15 | home 不写/不供货 | home patch 场景 | 产品默认值在 bundle；工作区在 profile Config；产品不写 home；home 供货 → 明确失败提示 | 靠 home 插入行/包 → 红 | composition；真启动 |
| 16 | 首启不依赖原生向导 | token URL 进入 | 产品 onboarding 是 client 自己的面；不依赖 `welcome-notice`/`settings.onboarding`；“稍后”可退出；Desktop 有替代路径 | 等 `welcome-notice` → Desktop 空白；阻塞无出口 → 红 | client/web-face；文档审计 |
| 17 | 打包清单可复现 | `npm pack`/`export-dist` | README 提到的 bootstrap/bin/presets/seeds/lib 都在；`files` 不漏；`export-dist` must 清单绿 | 手册提到但包里没有 → 红 | `pnpm export-dist`；tarball inventory |

**不在本矩阵里冒充的**：Plugins 页真机安装（更新后 FAQ 仍未测）、Desktop 真机与首启替代路径、模型首跑质量、无 key 的 eval——各自标 BLOCKED 或另立触发。

## 切片台账

| 步 | 内容 | 状态 | 证据 |
|---|---|---|---|
| S0 | 研究/方案（本卡 + 纠偏材料） | **已完成** | 本卡；`pnpm verify` backlog 形状 |
| S1 | Config/state/route；删除 `settings.json` 域核（不做旧产品兼容） | **已完成** | `pnpm test:domain`（208）、`test:host`（205）、`test:composition`（全量 152 files）；`--dump-config`；`pnpm product-smoke`（profile Config、无 settings 文件） |
| S2 | 客户端 onboarding/recovery/换项目 + 目录选择器 | **已完成** | `pnpm test:client`（269）；`pnpm web-face-check --scenario product-onboarding` / `product-workspace-gate` 真渲染 |
| S3 | 安装器瘦身（env only）+ native 产品 smoke + 版本门按 pin 合同 | **已完成** | `pnpm product-smoke`、`pnpm product-native-smoke`（GET not-configured/onboarding → POST → 登记 + Config + 会话 cwd）、`standalone-smoke`、`bootstrap-guards-smoke`、`release-smoke`（live turn BLOCKED） |
| S4 | README/docs/`_dist`/身份/发布/testing 同 diff | **已完成** | `pnpm verify` 51 checks；`pnpm export-dist` 重生成；手册 A/B/C + 无 `--profile desktop` |
| S5 | 收口：全量证据、triggers、note/归档路由 | **已完成** | `pnpm typecheck`、`pnpm test`（152 files / 1151）、`pnpm verify`（51）、`web-install-smoke`、`prompt-smoke`、`upgrade-smoke`；implemented note + rejected note + triggers 已落 |

## 仍未取（本轮不做或延后）

- **per-workspace 大脑（B/C）**：另立决定；触发 = 真实用户要求项目连同助手交接，或多业务知识串味成为实际抱怨。
- **机器 run manifest / 面板枚举 / desk→deliverable 直开**：延后；触发 = 产品 UI/自动化核对产物，或用户找不到产物。
- **首次 GUI 选择器的所有边缘**：native/browse 两条后端、远程/SSH、无 picker 降级；v1 先做 web 本机 picker，其余在 S2 标 BLOCKED/后续。
- **npm publish / 市场索引**：O5 的发布决定；本轮只改包内安装路径与文档。
- **Windows / Desktop 真机矩阵**：本轮只改 Desktop 文档口径与替代路径；真机另立触发。
- **自动更新 UX / 多工作区最近列表**：v1 先不做；触发 = 真实用户切换多个项目。
- **产品 home 的强制隔离**：不强制；native 用当前 home，隔离用 `DSH_HOME` 或安装器。

## 实测记录（2026-11-01）

| 命令/证据 | 结果 |
|---|---|
| `pnpm typecheck` | 通过 |
| `pnpm test` | 152 files / 1151 tests 通过 |
| `pnpm verify` | 51 checks passed |
| `pnpm product-smoke` | 通过：安装器建 profile/装包、`--workspace` 只设 env、profile Config 持久化、`workspace.json`、会话 `header.cwd`、stop；未写 `settings.json` |
| `pnpm product-native-smoke` | 通过：web 模板建 `assistant` profile → `dsh plugin add` → 真 boot → GET `not-configured`/onboarding → POST → 登记 + Config + 会话 cwd |
| `pnpm web-face-check --scenario product-onboarding` | 通过：真渲染首启选目录 |
| `pnpm web-face-check --scenario product-workspace-gate` | 通过：门条/CTA/换项目，CTA 打开会话 |
| `pnpm standalone-smoke` | 通过：standalone 不回归 |
| `pnpm bootstrap-guards-smoke` | 通过：坏输入在创建 home 前拒绝 |
| `pnpm release-smoke` | 安装/组合/零写入通过；live turn **BLOCKED**（无 `DEEPSEEK_API_KEY`） |
| `pnpm web-install-smoke` | 通过：标准 web profile 安装/启动/preset UI |
| `pnpm prompt-smoke` | 通过：模型可见段落/工具在场 |
| `pnpm upgrade-smoke` | 通过：升级/remove/re-add 两目录保留 |
| `pnpm export-dist` | 通过：tarball + A/B/C 手册重生成 |
| `pnpm eval` / `eval:domain` | **BLOCKED**：无 key / 需本人判 |
| Desktop / Plugins 页真机 | **BLOCKED**：本轮未验，见 `## 仍未取` |

## 结论（2026-11-01）

- 产品层 owner 从启动器/`settings.json` 移到 dedicated `assistant` profile + `assistant-product.workspaceDir`（profile Config）+ 客户端 onboarding；安装器只做安装/引导。
- native 与安装器两条路径都有真启动证据；旧 `settings.json` 不再读取（明确不做兼容）。
- 未取项（per-workspace 大脑、机器 run manifest、npm 发布、Windows/Desktop 真机、选择器边缘）已留 `## 仍未取` 与 `_backlog/triggers.md`。
- 去向：[产品 profile 对齐 note](../../../notes/implemented/2026-11-01-product-profile-alignment.md)；研究题归档；本卡归档。

## 关闭条件

- **决策层**：6 个拍板点有本人答复；方向、范围、比较过的选择与理由、验收标准写回本卡；work 去向（proposed 或本卡收口）记录。
- **实施层**：S1–S4 的可机械验证项完成（native + installer 两条路径、Config 持久化、onboarding、迁移、文档/`_dist`）；模型/人判/平台矩阵 = BLOCKED 的已留在 `## 仍未取` 并转触发。
- **以后做/不做**：写清理由、触发条件与观察点，路由到 note 或 trigger 后再归档；不存在“没结论先归档”。

## 参考

- [产品 profile 纠偏](../research/261101-startup-model-comparison/261101-product-model-correction.md)
- [标准路径实验](../research/261101-startup-model-comparison/261101-our-startup-and-experiments.md)
- [启动路径对比](../research/261101-startup-model-comparison/261101-comparison-and-recommendation.md)
- [DSH 原生 + 客户端层](../research/261101-startup-model-comparison/261101-dsh-native-product-layer.md)
- 现行合同：[`README.md`](../../../README.md)、[`docs/product.md`](../../../docs/product.md)、[`docs/delivery.md`](../../../docs/delivery.md)、[`docs/architecture.md`](../../../docs/architecture.md)、[`docs/testing.md`](../../../docs/testing.md)
- 现行实现：[`bootstrap.mjs`](../../../packages/dsh-smart-assistant/bootstrap.mjs)、[`src/host/product/`](../../../packages/dsh-smart-assistant/src/host/product/)、[`src/client/product/`](../../../packages/dsh-smart-assistant/src/client/product/)、[`src/domain/product/`](../../../packages/dsh-smart-assistant/src/domain/product/)
- 现行决定：[产品 profile 对齐](../../../notes/implemented/2026-11-01-product-profile-alignment.md)、[插件即产品](../../../notes/implemented/2026-11-01-plugin-as-product.md)（部分收窄）、[启动路径取舍](../../../notes/rejected/2026-11-01-startup-paths.md)（rejected：被本决定取代）
- 外部依据：FAQ 26 `deepseek-harness/_faq_on_digested/26_plugin-as-product`（2026-11-01 16:28 更新；`50-launch/10`、`50-launch/40`、`50-launch/70`、`30-external/37`、`10-foundations/16–18`）
