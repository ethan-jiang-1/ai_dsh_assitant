---
topic: 产品 profile 纠偏：独立启动 profile、工作区配置与 bundle 自有启动
intent: 对照 2026-11-01 更新后的 FAQ 26（安装/启动/生命周期），指出上一轮“启动器 + 私有设置文件”的产品模型歪在哪，给出与本插件原始意图一致的替代模型和落地切片。
---

# 产品 profile 纠偏：独立 profile、工作区配置与 bundle 自有启动

## 这一轮要回答什么

用户在 2026-11-01 再次确认产品意图：**插件有自己的独立启动 profile；启动时知道、或在启动过程中询问 workspace 在哪里；插件内容留在插件内部；产生的状态与最终产物（run bundle）在用户 workspace 里；插件能力因此施加到用户指定的 workspace 上。**

上一轮已经按“产品启动器 + 产品 home + `assistant-product/settings.json` + 客户端门”落过一版，随后又提出“DSH 原生安装 + 客户端 onboarding、启动器可选”。FAQ 26 在 2026-11-01 16:00–16:30 连续更新（`2b1cc2e`、`48354c3`、`09a548a`、`12e502f`、`0d8925d`、`6aa365f`），补进了安装通道、生命周期、首启令牌门、home 层不能供货、配置层与 Plugins 页优先等事实。这些事实要求重新检查：上一轮的产品模型是不是把“产品”做成了 DSH 外面的第二层壳，而不是“一个 named profile 的产品组合”。

本篇只回答三件事：更新后的硬事实是什么、上一轮歪在哪、目标模型和落地切片是什么。实施授权与 work 台账在 [产品 profile 对齐卡](../../settled_issues/261101-product-profile-alignment.md)。

## 一、更新后的硬事实（只列影响本产品的）

| # | 事实 | 对本文的意义 |
|---|---|---|
| 1 | **产品 = bundle + named profile + 安装/升级说明**；受支持的 Node 启动只有 `dsh --profile <name>`；外层最多是薄 bootstrap（设环境、确保 profile 存在、`exec dsh`）。 | 产品运行时不是启动器；启动器只能做安装/引导，不能拥有工作区设置与产品状态。 |
| 2 | **应用内 Plugins 页是默认的跨面安装入口**（web 与 Desktop 同一句）；CLI `dsh plugin --profile <p>` 是面绑定自动化，只能 web/headless/sdk 等，**不能 `desktop`**；“装成功”有 pnpm / dependency / `dsh.profile.bundles` 三个状态，只有第三个让功能存在。 | README、`_dist` 手册不能再把 `dsh plugin --profile desktop` 写成 Desktop 装法；tarball + 启动器不是唯一或默认的 DSH 装法。 |
| 3 | **首启只有令牌门**：token URL → 303 + 30 天 HttpOnly cookie → SPA；原生没有欢迎页/向导；`settings.onboarding` 只是设置面板的 step，`welcome-notice` 在 Desktop 不注册。 | “启动时询问 workspace”必须由产品 bundle 的客户端插件回答，不能指望 DSH 原生向导。 |
| 4 | **启动体验在 bundle 的 host/client 层**：host 行可 `workspaceRegistry.create(path)`、`sessionController.create({ workspaceId, agentPreset })`；client 插件负责目录选择、`uiWorkspace.openSession` 与首屏。新增 web 产品 flag 要替换 `web-startup` 并重实现全部 web flags，代价高。 | workspace 解析/登记/会话创建应放在 `assistant-product` 行与客户端门里；不要靠外部启动器写文件、再让 host 读。 |
| 5 | **设置层是 bundle patch → profile patch → home patch → CLI**；`Config.volatile()` 写当前 profile patch；home 层能覆盖、不能供货；dump 只合成补丁栈、不 import 模块。 | 工作区绑定应进 `assistant-product` 的 Config（profile patch），不要另建 `settings.json` 第二套真值；验收必须真启动。 |
| 6 | **产物在 workspace + `present`**：DSH 没有 artifact store；`present` 只记路径；会话导出不含产物内容；附件/spill 不是交付目录。 | run bundle 继续落在 `<workspace>/deliverables/`；不要写回 home，不要把附件库当交付。 |
| 7 | **profile 不是隔离边界**：同一 home 下 profile 共用 sessions/workspace registry/credentials；产品 home 只是路径约定，不是 DSH 服务。 | 产品 home 是部署选项，不是安装要求；不能说“产品 profile 自带隔离”。 |

更新后的入口与判据以 `deepseek-harness/_faq_on_digested/26_plugin-as-product` 的 `50-launch/10`、`50-launch/40`、`50-launch/70`、`30-external/37`、`10-foundations/16–18` 为准；本篇只取与本产品有关的部分，不复制正文。

## 二、上一轮实际做了什么

### 2.1 已落地的一版

- 包根 [`bootstrap.mjs`](../../../../packages/dsh-smart-assistant/bootstrap.mjs)：产品模式 `--workspace`/`--product`，默认产品 home `~/.dsh-smart-assistant`，经官方 CLI 建/复用 `assistant` profile、装 tarball、设默认 preset、写 `<productHome>/assistant-product/settings.json`、起 Web、`--stop` 收进程组。
- host 行 [`assistant-product`](../../../../packages/dsh-smart-assistant/src/host/product/state.ts)：boot 时读 `settings.json` 的 `workspaceDir`，用 `workspaceRegistry.create()` 登记；GET/POST `api/assistant/product`；headless 禁用。
- 客户端门 [`ProductGate`](../../../../packages/dsh-smart-assistant/src/client/product/product-gate.ts)：ready 显示 `工作区 · <目录>` + “开始一件事”；missing/invalid 显示恢复面；`not-configured`/404 时透明。
- 交付契约 [`docs/product.md`](../../../../docs/product.md) §五：`<workspace>/deliverables/<date>-<slug>/` + README 四段 + `present`；大脑仍在产品 home。
- 文档/手册：根 [`README.md`](../../../../README.md) 把启动器写成“推荐”；[`_dist/安装手册.md`](../../../../_dist/安装手册.md) 以启动器开头，手工装包默认装进 `web` profile。

### 2.2 上一轮的第二次尝试

[`261101-our-startup-and-experiments.md`](261101-our-startup-and-experiments.md) 用临时 home 跑了标准三条命令：

- 无产品绑定时：插件行/客户端都在，但产品行 `not-configured`，首屏是普通 DSH 一页纸，默认工作区接住交付包；
- 补一个 `settings.json` 后：门、工作区、CTA、交付包全部回来。

结论是“标准路径缺的是产品层那一下（工作区绑定 + 默认 preset）”，并提出了 [`2026-11-01-startup-paths`](../../../../notes/rejected/2026-11-01-startup-paths.md)：原生安装 + 客户端 onboarding，启动器降为可选。

这次实验本身是有效的；但它把“缺的那一下”主要归因于“客户端开始页/选择器”，没有把**产品 profile 的启动契约**（Config、host 登记、首启、默认 preset）作为一等对象。于是方案仍然把产品特殊性与安装路径混在一起，且保留了 `settings.json` 这条第二真值。

## 三、歪在哪

| 维度 | 上一轮的做法 | 更新后的合同 | 后果 |
|---|---|---|---|
| **产品入口** | 启动器是“推荐”入口；产品体验从 `node bootstrap.mjs` 开始。 | named profile 是唯一启动入口；外层最多薄 bootstrap。 | 产品被做成 DSH 外面的第二层壳；`dsh --profile assistant` 单独启动时，产品层不完整。 |
| **工作区设置** | `<productHome>/assistant-product/settings.json` + 自定义 route 读写。 | 设置走 profile patch / `Config.volatile()`；不要两套真值。 | native 安装、手工装包、团队 profile patch 都无法自然绑定工作区；换机/换 profile 行为分叉。 |
| **启动/登记逻辑** | 启动器写文件，host 行 boot 时读文件、登记、暴露 route。 | host 行读 effective Config，登记 workspace；client 负责首屏/选择。 | 没有启动器就没有“知道 workspace”的路径；产品能力依赖外部文件。 |
| **独立 profile** | 产品模式用 `assistant`，手工路径却教用户装进 `web`；两套世界。 | 产品 profile 是稳定、非 shipped 的 dedicated profile；安装/启动说明围绕它写。 | 用户装进 `web` 得到的是“装了插件的普通 DSH”，不是产品；两个 profile 的数据/默认 preset 不一致。 |
| **首启** | 只有启动器会“问工作区”；native 安装首屏是 DSH 一页纸，产品行透明。 | 首启由 bundle 的客户端插件回答；原生只有令牌门。 | “启动时知道或询问 workspace”只在启动器路径成立；产品本身不自足。 |
| **安装文档** | 手册以 tarball + 启动器为主；Desktop 写 `dsh plugin --profile desktop`。 | 默认 Plugins 页（web/Desktop 同一句）；CLI 仅 web 自动化；`desktop` CLI 双门禁闭。 | Desktop 用户会装进 `profiles/web` 或直接被拒；手册与 DSH 合同冲突。 |
| **产品 home** | 默认 `~/.dsh-smart-assistant`，文档把它写成产品的一部分。 | 产品 home 是部署选项，不是安装要求；原生路径用当前 `DSH_HOME`。 | 用户以为不用产品 home 就不是产品；native 路径被写成二等公民。 |
| **run bundle** | `<workspace>/deliverables/` + README 四段；只有 prompt/技能约定。 | 产物在 workspace + `present`；没有 artifact store。 | 方向正确；缺的是机器可核的“运行态”边界（本轮先不强行加 manifest，见 §六）。 |

### 3.1 一句话概括

上一轮把“产品”实现成了 **package 的一个安装模式**（启动器 + 私有 home + 私有设置文件），而不是 **一个 dedicated profile 的产品组合**（bundle + profile + 设置层 + bundle 自有的启动/首屏）。所以一旦不用启动器，产品就退化成“装了插件的普通 DSH”；而一旦用启动器，产品又绕开了 DSH 的 profile/settings/install 合同。两次尝试各对了一半，但没有合成一个自足的产品 profile。

### 3.2 为什么这不是“全部推倒”

已落地的这些仍然有效，保留：

- 包仍是 bundle；`assistant` preset、工具、四房间、账本、curate 不变。
- 工作区会话的 `header.cwd` = 工作区；`deliverables/` + `present` 的交付契约不变。
- 大脑跟人走（1A）：四房间/账本留产品 home，不按工作区分区；这条是 2026-11-01 已拍板的决定，本轮不反转。
- 产品行是 web-only、headless 禁用；客户端门在 ready 时显示门条/CTA；这些形状可保留。
- `product-smoke`、`web-install-smoke`、web-face 场景是可复用的证据骨架。

要改的是**产品层的归属与入口**，不是插件能力本身。

### 3.3 过程反省：为什么上次会做歪

不是“没想到 DSH 的某条事实”，而是**做法本身让错的那层显得最顺手**。按发生顺序复盘：

1. **先有“一条命令”的解法，再找架构理由。** 目标用户要一条命令、要项目工作区；最省事的实现是启动器写一个 `settings.json`、host 读它。于是“启动器 + 私有设置”成了事实上的产品架构，而不是先问“这块事实该归哪一层”。
2. **把“独立 profile”误读成“独立 home + 启动器”。** profile 是组合，home 是数据根；两者不是一回事。实现把产品身份放进了 home 和启动器，profile 只剩一个被启动器创建的名字。用户要的是 profile 作为产品启动单位，不是“另一个 home”。
3. **没有先做 owner 表。** 工作区绑定、首启、安装、默认 preset 分别归谁，没有在动手前写死；默认落到了“谁先跑谁拥有”——启动器先跑，于是它拥有工作区。owner 一旦落错，后面的测试和文档都会围着错层长。
4. **验收只覆盖自己修的那条路。** `product-smoke` 验的是启动器路径，`web-face` 验的是门条；没有“无启动器”的反例，也没有按 37 的装/起/配/首启逐阶段验。绿了，但绿的是错的那条路；测试反而把 `settings.json` 锁成了合同。
5. **把“产品设置”当成可以自建的文件，没有先核对 DSH 的设置层。** 15/17 明确说产品设置可以走 profile Config，也可以自建；选了自建，却没有定义“唯一真值、迁移、备份、卸载”。于是同一事实有两个家：`settings.json` 和 profile 组合。
6. **第二次尝试过度修正。** 看到 native 三条命令能跑，就把启动器降为可选、允许装进用户现有 profile；这解决了“安装路径”，却丢了用户刚强调的 dedicated profile。两次尝试各对一半，但没有合成一个自足的产品 profile。
7. **文档跟着实现走，而不是拿 DSH 合同审文档。** README/手册写的是“我们做出来的路径”，所以把启动器写成推荐、把 `dsh plugin --profile desktop` 写进手册。文档没有当合同验，门禁也只看链接/锚点，抓不住这种语义错。
8. **决策卡把问题框成了“选哪个结果”，没把“owner 放哪层”作为拍板点。** 1A/2/3/4 问的是大脑、产物、home、命名；没有问“工作区绑定和首启归启动器还是归 profile/bundle”。用户批准的是方向；实现自由度填进了错层。这是最根本的一条：**拍板点没有覆盖承重的 owner 选择。**

一句话：**上次不是判断错，而是没有先把“哪层拥有哪件事”变成设计约束；然后用一条能跑通的捷径替代了 layering，用只覆盖捷径的证据替代了生命周期验收。**

### 3.4 这次的防歪规则

| # | 规则 | 怎么执行 |
|---|---|---|
| 1 | **先 owner 表，再代码** | 本材料 §4.1/§4.4 + 卡上的四阶段表先写死；任何实现选择先回答“这块事实归哪层”。 |
| 2 | **native 路径是 reference implementation，安装器只是 wrapper** | 先让 `dsh --profile assistant` 无启动器走通；启动器只做建 profile/装包/起进程。没有 native 证据不算完成。 |
| 3 | **一条事实一个家** | 工作区只在 `assistant-product.workspaceDir`（profile patch）；不写 `settings.json`、不写 home；迁移只读旧文件。 |
| 4 | **按 37 四阶段验收，不只验自己修的路** | 装（三成功/版本门/清单）、起（真启动/失败三级/生效方式）、配（四层/home 不供货/真启动）、首启（令牌门/onboarding/可稍后/Desktop 替代）。 |
| 5 | **反例先写** | “无启动器”“home 供货”“dump 绿但真启动 warning”“Desktop 用 CLI”都要在验收矩阵里当红例。 |
| 6 | **文档当合同审，不当实现说明** | 每片同 diff 改 README/docs/`_dist`；审读对齐 37/50 的合同，不按“我们怎么做的”写。 |
| 7 | **拍板点覆盖 owner** | 本卡 6 个拍板点里，1/2/3/4 都是 owner 选择；不再只问“要不要一条命令”。 |

## 四、目标模型

### 4.1 四层，各归各

```text
① 插件包（只读、随版本）      bundle patch / preset / skills / seeds / client / bootstrap.mjs
② 产品 profile（用户侧组合）   assistant profile：web 模板 + 产品 bundle + preset 默认值 + 产品 Config
③ 用户 workspace（用户项目）   项目文件 + <workspace>/deliverables/<date>-<slug>/（run bundle）
④ 宿主 home（DSH 运行态）      sessions / credentials / storages / workspace registry / 产品 home（可选）
```

- **插件内容在 ①**：静态内容随包，不写进用户项目，也不写进 profile。
- **产品身份在 ②**：`assistant` 是 dedicated profile；产品 bundle 的 patch 决定组合与默认值；用户设置写 profile patch。
- **生产状态/产物在 ③**：一次作业的 run bundle、README、交付物、`present` 都落在 workspace。
- **助手大脑在 ④**：四房间/账本跟人走（1A），不按 workspace 分区；产品 home 是 ④ 的部署选项，不是 ② 的要求。

### 4.2 启动与工作区解析

```text
安装：把包装进 assistant profile（产品安装器 / DSH 原生 Plugins 页 / CLI 自动化）
启动：dsh --profile assistant
  └─ host 行 assistant-product 读 effective Config（profile patch）与环境覆盖
       ├─ 有 workspaceDir / ASSISTANT_WORKSPACE：校验 → workspaceRegistry.create → ready
       ├─ 没有：not-configured → 客户端 onboarding 询问（DSH directoryPicker）
       │     └─ POST /api/assistant/product → 校验 → 登记 → settings.update 写回 profile Config
       └─ 路径缺失/非法：workspace-missing / invalid → 恢复面 + 重新选择
会话：client startSession(workspaceId, { agentPreset: 'assistant' }) → header.cwd = workspace
      client uiWorkspace.openSession(sessionId) 做确定性选中
作业：模型在 cwd 工作，交付包写 <workspace>/deliverables/<date>-<slug>/，present 声明
```

关键点：

1. **工作区是 profile Config，不是私有文件。** `assistant-product` 定义 `workspaceDir?: string`（volatile）；Settings UI 或产品 route 通过 `ctx.settings.update('assistant-product', { workspaceDir })` 写入当前 profile patch。没有 `settings.json`。环境变量 `ASSISTANT_WORKSPACE` 只作一次启动的覆盖（启动器/CI 用），不形成第二持久真值；若产品行成功登记，可选择把它持久化到 Config。
2. **首启由 bundle 回答。** 产品行存在且未配置时，客户端门显示 onboarding（选择项目目录 / 稍后）；不再透明地退回普通一页纸。手动装包但没配置的用户也能看到产品入口。
3. **启动器只做安装器。** `bootstrap.mjs` 保留，但职责收窄为：解析产品 home、确保 `assistant` profile 存在（不存在才从 web 模板建）、按版本装/升级 tarball、设置部署默认 preset、`exec dsh --profile assistant`；`--workspace` 只设置 `ASSISTANT_WORKSPACE` 环境变量，不写工作区文件。`--product` 直接启动，让 Config/onboarding 决定。`--stop` 保留（进程管理是安装器/监督者的职责）。
4. **native 路径是一等公民。** `dsh --profile assistant --from-default-profile web` → Plugins 页/CLI 装 bundle → `dsh --profile assistant`；没有启动器也能首启选目录、登记、开会话、写交付包。产品 home 不是必需；要用独立 home 就设 `DSH_HOME` 或用安装器。
5. **Desktop 走 Desktop 的 Plugins 页。** Desktop 使用保留的 `desktop` profile，CLI 不能管理；文档只写“在 Desktop 的 Plugins 页安装”，不写 `dsh plugin --profile desktop`。Desktop 上没有 dedicated `assistant` profile 时，产品以 Desktop 当前 profile 运行；这是 surface 边界，不混入 Web 的 dedicated-profile 说法。

### 4.3 安装路径（文档口径）

| 路径 | 谁 | 怎么做 | 产品 home | 工作区绑定 |
|---|---|---|---|---|
| **A. 产品安装器**（目标用户） | 拿到 tarball、不熟 DSH 的用户 | `node bootstrap.mjs --workspace <dir>`；之后 `--product` | 默认 `~/.dsh-smart-assistant`（可 `--home`） | 首启 env + 产品行持久化到 profile Config |
| **B. DSH 原生**（已有 DSH 的用户） | 已维护 profile 的用户 | ① `dsh --profile assistant --from-default-profile web`（一次性建 profile；CLI 自动化）→ ② `dsh plugin --profile assistant add <tarball>`（CLI 自动化）→ ③ `dsh --profile assistant`；或建好 profile 后先启动、在 Plugins 页装（当前 profile），再重启 | 当前 `DSH_HOME`（要隔离就自己设） | 首启 onboarding 写 profile Config |

> **顺序不是装饰**：Plugins 页没有 profile 参数，装的是“当前 profile”。所以 GUI 路径必须先有并启动 `assistant` profile，再在 Plugins 页装、再重启；CLI 路径可以在启动前装。文档不要写成“先 Plugins 页装、再建 profile”——这两步的顺序在 DSH 里不成立。
| **C. Desktop** | Desktop 用户 | Desktop 的 Plugins 页安装；重启应用 | Desktop 的 `desktop` profile | 首启 onboarding（若客户端可用）；不承诺独立 profile/home |

文档默认写 A 给目标用户、B 给 DSH 用户、C 单独一段；不再把“装进 `web` 的插件”当产品主路径。

### 4.4 设置与数据归属（目标）

| 事实 | 位置 | Owner | 备注 |
|---|---|---|---|
| 插件静态内容（patch/preset/skills/seeds/client） | 包内 | 插件 | 只读，随版本 |
| 产品 profile 组合/默认 preset | `<home>/profiles/assistant/` | 用户/profile | `dsh plugin` / 安装器写；不手写 manifest |
| 工作区绑定 | `assistant-product` Config（profile patch） | 用户/产品 | `workspaceDir`，volatile；无 `settings.json` |
| 助手大脑（四房间/账本） | `<home>/assistant`、`<home>/assistant-operating` | 插件 | 跟人走，不按 workspace 分区 |
| run bundle | `<workspace>/deliverables/<date>-<slug>/` | 用户 | README 四段 + 交付物 + `present` |
| sessions/credentials/workspace registry | `<home>/` | 宿主 | 另备整 home |
| 浏览器 UI 状态 | localStorage | 浏览器 | 换 origin 会丢 |

### 4.5 按 37 的四阶段对齐（DSH 约定）

37 把“从拿到插件到第一次成功”拆成装/起/配/首启，四阶段各有自己的 owner 与失败态。本产品必须逐阶段对齐，而不是只对齐“能装、能起”。

| 阶段 | 37 的判据 | 本产品的落点 | 验收证据 |
|---|---|---|---|
| **① 装** | bundle 声明 `dsh.bundle.patch`；GUI 默认 Plugins 页、CLI 仅 web 自动化、`desktop` 双门禁闭；三个“装成功”（pnpm / dependency / roster）；版本门按 pin 实际合同（本 pin 只读 `engines.dsh`/peer）；`npm pack` 清单能复现 README 命令。 | 包已是 bundle；不写本 pin 不读的版本字段；产品安装器 = shell/自托管安装器（目标用户），DSH 用户走 Plugins 页；CLI 命令标“仅 `dsh web`”；手册不出现 `--profile desktop`。 | `--dump-config` 有 `assistant-product`/`preset-assistant`；roster 含 bundle；`npm pack`/`export-dist` 清单；版本门拒绝不兼容。 |
| **② 起** | profile 四件套 + 有序 patch；新增 row 用 `insert:`；失败三级（bundle skip / pending / import warning）；三种生效（宿主行重启 / 客户端刷新 / HMR）；启动体验在 bundle 的 host/client，不需要第二层 launcher；session create ≠ UI 选中。 | dedicated `assistant` profile；产品行用 `insert:`；不替换 `web-startup`、不加产品 web flag；host 行登记工作区，client 做首屏/选中；安装/更新后重启，客户端变更刷新。 | 真启动 stderr 无 `did not activate`/`skipping profile bundle`；`--dump-config` 行在；CTA `startSession` + `openSession`；重启/刷新文档正确。 |
| **③ 配** | 四层 bundle → profile → home → CLI；默认值放 bundle；用户设置写 profile patch；home 能覆盖、不能供货；dump 只合成补丁栈，验收要真启动。 | 产品默认值进 bundle patch；工作区 `workspaceDir` 进 `assistant-product` Config（profile patch）；不写 home；不用 `settings.json` 第二真值；迁移只读旧文件。 | profile patch 有 `workspaceDir`；重启后 `ready`；home 不写；`--dump-config` + 真启动。 |
| **④ 首启** | 只有令牌门（401 / 303 + cookie → SPA）；没有欢迎页/向导；`settings.onboarding` 不是首屏保证；六类载体；可推迟；Desktop 上有替代路径，不依赖 `welcome-notice`。 | 客户端 `ProductGate` onboarding 在 `main` 槽：token 后第一屏；选择/“稍后”/恢复；用 `workspaceRegistry` + session create；无选择器时给可读指引；Desktop 文档给替代路径。 | web-face onboarding/取消/稍后/恢复；不依赖 `welcome-notice`；Desktop 路径文档化（真机未验 = BLOCKED）。 |

**37 暴露出的具体缺口（本轮要补）**：

1. **版本门按 pin 实际合同。** 本 pin 的 manifest reader 只读 `engines.dsh`/peer（`vendor/dsh/packages/boot/app-boot/src/plugin-compatibility.ts`）；37 提到的 `dsh.compatibility.dshReleases` 是更高版本约定，本 pin 不读。不要写假声明；升级到读取该字段的 DSH 时再补。
2. **“独立 profile” 不是 Plugins 页能单独创建的**：Plugins 页装当前 profile，不创建 profile。必须诚实写“一次性建 profile 命令（CLI 自动化）或产品安装器”，不能把 Plugins 页说成“装完就有 dedicated profile”。
3. **首启不能依赖 `welcome-notice`/`settings.onboarding`**：它们在 Desktop/不同 composition 下不可靠；产品 onboarding 必须是自己的 client 面，且可“稍后”。
4. **真启动是验收门槛**：`--dump-config` 只证明补丁栈；必须读 stderr 的 `did not activate`/`skipping profile bundle`，否则“应用能开、功能没有”会假绿。
5. **安装/更新后的生效方式要写对**：宿主行/组合变化 = 重启 profile；只换 client 模块 = 刷新；HMR 只在宿主应用时成立。CLI 装完宿主不知道，不能写“装完立即生效”。
6. **Desktop 的首启/安装是另一条 profile 线**：同一 bundle、不同 profile；CLI 不能管理 `desktop`；首启不能依赖 Desktop 不注册的 `welcome-notice`。文档要给 Desktop 的替代路径，真机未验就标 BLOCKED。
7. **产品安装器是 shell/自托管路径，不是 GUI 默认**：目标用户可以用，但文档要把它写成“安装器（自托管）”，并把 DSH 用户的 Plugins 页路径并列；不能把安装器说成 DSH 的默认安装方式。

## 五、取舍

| 选择 | 推荐 | 另一条路 | 理由 |
|---|---|---|---|
| 产品入口 | dedicated `assistant` profile + 可选薄安装器 | 只保留启动器；或只做 native 插件 | dedicated profile 是用户要的“独立启动 profile”；native 路径保证不自足依赖启动器。 |
| 工作区绑定 | `assistant-product` Config（profile patch）+ env 一次性覆盖 | 保留 `settings.json`；或只靠 env | Config 是 DSH 的 sanctioned settings 层；env 服务启动器/CI；私有文件是第二真值。 |
| 首启 | 客户端 onboarding（DSH directoryPicker） | 只用 CLI 参数/TTY；或透明退回一页纸 | 原生首启没有向导；产品必须自己回答第一屏，且要能在 native 安装下工作。 |
| 启动器 | 薄安装器（建 profile/装包/起进程），不拥有工作区 | 删除启动器；或保持现状 | 目标用户需要一条命令；DSH 用户需要 native；两者共用同一 profile 契约。 |
| 产品 home | 部署选项，默认给安装器用户 | 强制所有路径都用产品 home | DSH 插件无法设宿主 home；native 用户应能用当前 home。 |
| 大脑 | 跟人走（1A，不变） | per-workspace 大脑（B/C） | 已拍板；平台段落拿不到 session/workspace；run bundle 已覆盖“项目可带走”的需求。 |
| run bundle 状态 | README 四段为 v1 状态；机器 manifest 延后 | 现在就加 `run.json` | 没有消费者；先不建第二套 schema；触发 = 产品 UI/自动化核对产物。 |
| standalone | 保留为 dev/demo；是否改显式 flag 由实现时定 | 继续做默认 | 产品故事只讲 `assistant` profile；standalone 是测试/演示，不混入 README 主路径。 |

## 六、证据与未决

### 已有证据

- [标准路径实验](261101-our-startup-and-experiments.md)：无绑定 → 产品行 `not-configured`、普通一页纸；有绑定 → 门/工作区/CTA 回来。
- `pnpm product-smoke`：产品 home/profile/settings、工作区登记、in-process 会话 `header.cwd`、stop（当前基于 `settings.json`，需要改造）。
- `pnpm web-install-smoke`：`web` profile + tarball + 预检 + preset UI（native 安装骨架）。
- `snapshots/web-face/product-workspace-gate/`：门条/CTA/恢复面的真渲染。
- [启动路径对比](261101-comparison-and-recommendation.md)：两条路径的优缺点与 A–E 选项。

### 还缺的证据（落地切片要补）

1. **native 产品路径**：`assistant` profile（web 模板）+ 安装 + 无绑定启动 → onboarding 选目录 → POST → workspace.json/header.cwd/交付包；证明不用启动器也是产品。
2. **Config 持久化**：`assistant-product.workspaceDir` 写入 profile patch；重启后 `ready`；坏值/缺目录/不可读写仍 `workspace-missing`/`invalid`。
3. **迁移**：旧 `settings.json` → Config 的一次性迁移；迁移后不再读写旧文件；坏文件不静默当空。
4. **首启真渲染**：onboarding/选择器/取消/“稍后”/恢复面的 web-face 场景；无浏览器时 BLOCKED。
5. **启动器瘦身**：`--workspace` 只设 env、不写工作区文件；`--product` 从 Config 恢复；`--stop`/`--no-start` 回归；standalone 不影响。
6. **文档/分发**：README、`docs/product.md`、`_dist/安装手册.md`、包 README、identity/release/testing 同 diff；`pnpm export-dist` 重生成；`pnpm verify` 绿。
7. **Desktop 口径**：手册不再出现 `dsh plugin --profile desktop`；Desktop 只写 Plugins 页；首启替代路径（Settings/配置/命令）写清；真机未验 = BLOCKED。
8. **版本门按 pin 实际合同**：本 pin 只读 `engines.dsh`/peer；不兼容安装前拒绝；exemption 只 exact。37 的 `dsh.compatibility.dshReleases` 升级 pin 时再评估，不写本 pin 不读的字段。
9. **真启动无警告**：stderr 无 `did not activate`/`skipping profile bundle`；`--dump-config` 只作补丁栈证据，不作运行证据。
10. **打包清单**：`npm pack`/`export-dist` 的 must 清单覆盖 README 提到的 bootstrap/bin/presets/seeds/lib；手册提到的脚本/资源都在包里。

### 未决（需要本人或后续切片定）

| # | 问题 | 建议 | 何时定 |
|---|---|---|---|
| 1 | 产品安装器是否保留为“推荐给目标用户”的路径？ | 保留，但写成安装器；native 路径并列，不写成二等公民。 | 本卡拍板 |
| 2 | `workspaceDir` 的 Config 键名/是否带 `onboarding` 开关 | `workspaceDir`（volatile）+ `onboarding`（默认 true） | S1 |
| 3 | 旧 `settings.json` 迁移策略 | 读一次 → 成功登记 → 写 Config → 旧文件改名 `.migrated`；失败保留并报 `invalid` | S1/S3 |
| 4 | Desktop 是否本轮真机验证 | 本轮只改文档口径；真机矩阵另立触发 | 本卡 |
| 5 | 机器 run manifest 是否现在做 | 延后；先用 README 四段 | 本卡 |
| 6 | 是否给 native 用户也默认建产品 home | 不；`DSH_HOME` 显式或安装器 | 本卡 |

## 七、结论

- 上一轮不是“方向全错”，而是**产品层的 owner 放错了**：启动器和私有设置文件承担了本应属于 profile/Config/bundle 的职责，导致 native 路径退化为“普通 DSH + 插件”。
- 目标模型一句话：**dedicated `assistant` profile 是产品；bundle 自带启动/首屏与工作区解析；工作区绑定写 profile Config；run bundle 在 workspace；启动器只是可选安装器。**
- 落地顺序、验收矩阵与 work 台账见 [产品 profile 对齐卡](../../settled_issues/261101-product-profile-alignment.md)。
