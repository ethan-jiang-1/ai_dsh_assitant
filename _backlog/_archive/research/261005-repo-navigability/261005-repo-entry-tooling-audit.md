---
topic: 技术
intent: "从源码核对运行入口和路径消费者，不冒充 live 证明。"
---

# Repo entry/tooling audit：运行入口、交互链与路径消费者

> 基线：`36f1f00d834ba931d10f0d728b7cabeca6beee9e`（2026-10-05）。本底稿只记录可从源码/配置核验的入口、消费者与风险；未在本轮启动 Web 服务、模型、OV server 或迁移目录。
>
> 证据词义：**源码支持**表示文件/配置明确提供了能力；**执行观察**只表示父 agent 本轮确实执行过的命令。源码链不冒充 live 证明。

## 结论摘要

- 仓库有四类入口：根 `pnpm` 命令/脚本、`dev/` 环境与 profile patch、包内 `cordis.patch.yml` 组合、包内 `src/` 的 host/agent/client 贡献。它们的能力并不缺，难点是入口与责任分散在不同树。
- `pnpm dsh` 的唯一启动器是 [`scripts/dsh.mjs`](../../../../scripts/dsh.mjs)。它覆盖继承的 `DSH_HOME`，默认使用 `dev/harness-home`，并以仓根为子进程 `cwd`；调用 shell 的 cwd 不能改变这一事实。`DSH_HOME`、助手 `dataDir`、进程 cwd/workspace 是三个不同根，导航必须分别说明。
- `dev/setup.sh` 建立 `dev` Web profile 与 `dev-task` headless profile，安装本包并复制 profile patch。headless 模板本身没有 preset roster；`dev-task` 不带 patch 是 host 面冒烟，带 `preset-runner.patch.yml` 才挂载本包 assistant preset。
- shipped preset 的事实入口是本包 [`cordis.patch.yml`](../../../../packages/dsh-smart-assistant/cordis.patch.yml#L129-L164) 中 `preset-assistant.config.plugins`；[`presets/assistant/agent.cordis.yml`](../../../../packages/dsh-smart-assistant/presets/assistant/agent.cordis.yml) 是空文件。包说明、setup 输出和部分探针仍需统一到真实入口；空文件在删除前必须全仓搜消费者。
- UI 的动作不是单一通道：client 通过 `remote.session.prompt` 发送带标记的请求，服务回写 working folder 的 `.desk/state.json`，client 轮询文件变化；知识批准另有 Remote 直调候选，挂载失败时回退到模型提示。源码证明车道与回退，不证明当前 GUI 实际成功走过每条车道。
- 调试工具有明确层次：`dump-config` 看组合行，`preflight` 看 auth/boot/Remote/desk readiness，`shots`/`web-expected` 看 DOM，`loop-probe` 走真实会话，`preset-runner-replay.patch.yml` 用 keyless replay 记录请求侧 system/tools。它们不能互称 E2E，也不能把 `dump-config` 当渲染证明。
- `preset-runner` 当前是 package export、dev patch 和 release smoke 的共同消费者。整理时可改变源码归属，但不能静默删除 `./preset-runner` 出口；若要使它只进开发包，必须另立发布边界方案。

## 1. 三根路径与两个 profile

### 1.1 启动器

[`scripts/dsh.mjs`](../../../../scripts/dsh.mjs#L113-L122) 用 pinned DSH source 启动 CLI，设置 `TSX_TSCONFIG_PATH`，并将 child `cwd` 固定为 `repoRoot`。启动前负责 dev home 和代理环境；它不是通用“从任意 cwd 启动一个 workspace”的 wrapper。

[`dev/env.sh`](../../../../dev/env.sh#L15-L29) 的默认 `DSH_HOME` 是 `<repo>/dev/harness-home`，`ASSISTANT_DSH_HOME` 是有意的隔离出口；同时设置 `DSH_AGENTS_HOME` 与 preset root。运行残留、凭据、profile、session 与 assistant dataDir 随 home，不是 tracked repo 内容。

三个根的导航定义：

| 根 | owner/含义 | 换它会改变什么 |
|---|---|---|
| `cwd` / workspace | `scripts/dsh.mjs` 固定到 repo root；工作区文件与根 AGENTS/项目命令从这里解析 | 改变业务交付与项目指令上下文；不能靠调用 shell 目录改变 |
| `DSH_HOME` | DSH profile、session、storage、credentials 的持久根 | 改变运行实例与隔离边界；必须与 setup/启动同值 |
| `dataDir` | 插件助手 working folder，默认 `<dshHome>/assistant`，代码由 `src/home/layout.ts`拥有 | 改变记忆/研究/技能/知识页与 `.desk` 等产品状态位置；不是 cwd |

### 1.2 profile 入口

[`dev/setup.sh`](../../../../dev/setup.sh#L4-L16) 的顺序是：从 web 模板建立 `dev`、安装 bundle、复制 `dev/profile-patch.yml`；从 headless 模板建立 `dev-task`，再复制 `dev/profile-patch-headless.yml`。脚本明确防止 Web 与 headless bundle 因 `code-runtime` 重复而混装。

[`dev/AGENTS.md`](../../../../dev/AGENTS.md#L15-L28) 所定义的验证语义是：

- `dev`：Web UI，验证 preset 行为、工具、persona、提示词段落、摘要；
- `dev-task`：不带额外 patch 时验证 host 装载、服务行和 scaffold；
- `dev-task` + `preset-runner.patch.yml`：one-shot 挂载 assistant preset，验证自动化驱动。

setup 的输出仍把 one-shot 描述成“on the assistant preset”，但没有同时指出需 preset-runner patch；这属于入口文案要修的误导，不等于改变 profile 行为。

## 2. 实际组合与请求链

### 2.1 组合层

本包 manifest 的 `dsh.bundle.patch` 指向 `cordis.patch.yml`；该 patch 同时声明 host 行、伴生 host 行、preset roster 的 `preset-assistant` 和 agent plugins。生成目录/入口索引由 [`scripts/gen-catalog.mjs`](../../../../scripts/gen-catalog.mjs#L99-L132) 从 patch、源码工具声明、client 面与 package exports 读取。

`presets/assistant/agent.cordis.yml` 当前为空，不能作为 shipped preset 的装配来源。真实组合的安装/开发路径是：bundle patch 进入 profile，再由 roster 选 `assistant`；`preset-skill-root.spec.ts` 也从真实 patch 解析 `skill-filesystem` 行及 Loader 的 `!!js` 语义 [`preset-skill-root.spec.ts`](../../../../packages/dsh-smart-assistant/tests/preset-skill-root.spec.ts#L36-L65)。

开发探针中的 runner 行存在身份漂移风险：`dev/recall-probe.patch.yml` 和 `dev/expert-probe.patch.yml` 仍插入 id `preset-runner`，而函数插件导出/主 patch 约定是 `assistant-preset-runner`。现有 `export-shape.spec.mjs` 只覆盖 `dev/preset-runner.patch.yml`，并不覆盖所有探针 patch；P1 应补全配置身份负例，而不应靠手工观察。

### 2.2 功能请求链

源码可核验的主链为：

```text
用户聊天 / UI 动作
  -> client registration
  -> remote.session.prompt（部分动作带 [桌面] 标记）
  -> agent preset / model turn
  -> assistant_* tool 或 prompt section
  -> ctx.assistantMemory（host Service）
  -> dataDir 房间 / .desk/state.json
  -> client 读回、轮询、呈现 receipt / room / banner
```

- client 发送函数在 [`src/client/index.ts`](../../../../packages/dsh-smart-assistant/src/client/index.ts#L648-L709)，通过 sessionId 选择目标，写 pending 状态，轮询 `.desk/state.json` 生成时间变化；队列接受不等于完成。
- 知识批准在 [`src/client/index.ts`](../../../../packages/dsh-smart-assistant/src/client/index.ts#L817-L838) 先尝试 `assistantKnowledge.approvePage`，失败则发送批准提示；host 的机械翻转在 [`src/index.ts`](../../../../packages/dsh-smart-assistant/src/index.ts#L875-L886)。Remote 审计路径与注释声称的 session event 不是一回事，不能在导航中写成统一审计已证实。
- host service、agent tools/prompt sections、client classic script 分属不同面；client shim 测试能证明注册与组件回调，但不能证明真实 web boot。真实 web 场景需要 isolated home + preflight + 每个显式 scene 的 expected runner。

## 3. 工具与证据路由

| 目的 | 当前入口 | 证明范围 | 不能证明 |
|---|---|---|---|
| 组合行是否存在 | `pnpm dsh --profile <p> --dump-config` | profile 中的 id/name/disabled 与 patch 落法 | agent 真组装、DOM、模型请求 |
| Web 依赖/desk 前置 | `pnpm preflight <url>` | auth、boot graph、Remote manifest、目标 home 的 desk readiness | 组件已正确渲染 |
| DOM 采集 | `pnpm shots <url> --dom` | PNG/DOM capture | committed expectation 是否匹配 |
| DOM 回归 | `pnpm web-expected <url> --scenario <dir> [--wait-text <token>]` | 一个显式 scene 的 DOM expectation diff | 其他 scene；默认只选 blank scene |
| 首用交互 | `pnpm loop-probe <url> --ask <question>` | 首屏 + 真 session prompt/reply 闭环 | 确定性业务规则；可能消耗 key |
| keyless 请求侧 | `pnpm dsh --profile dev-task --patch dev/preset-runner-replay.patch.yml ...` | preset-mounted session log 的 system/tools 组装 | 固定 reply 自主选择工具；必须读 log request side |
| 发行组合 | `pnpm release-smoke` | pnpm pack、peer ranges、clean home 安装、dump-config shape；有 key 才跑 live turn | 无 key 时真实 turn；所有 public exports 逐个可解析 |
| package 当前索引 | `pnpm gen-catalog --check` | catalog freshness | 测试发现集合、live 行为 |

`webui-expected.mjs` 默认场景来自 `snapshots/web-face/blank-first-open`；`first-open-draft-banner` 必须显式 `--scenario` 和 readiness token。场景的 `snapshot.yml` 是声明/合同，不会被 runner 自动遍历。

## 4. 迁移消费者与保守建议

任何移动前须搜这些消费者：

- Node 脚本的 `repoRoot`、`process.cwd()`、`import.meta.url`、`import.meta.dirname`、`../../../scripts`/`../../../dev` 相对 import；
- shell 的 `source dev/env.sh`、`dev/prepare.sh`、`dev/setup.sh`、patch 文件中的 `!!js process.cwd()`；
- package `exports`、`main/types/files`、`cordis.patch.yml` 的 module names、`gen-catalog` 的 `src/<row>` 推导、`verify` 的 required paths 和 asset roots；
- tests 的 `packageRoot = tests/..`、sourceOf(row) 与 `tsconfig.test.json` include；
- snapshots 的 scene README/snapshot.yml/seed、release smoke 的 generated patch 与 tarball inventory；
- docs/AGENTS/backlog/reference 的相对 Markdown links。

保守迁移顺序：P0 先修真实入口与三根路径地图；P1 先补全部探针 name/id、真实 patch 组合范围、built-lib 缺失/陈旧和递归资产守卫；再以一个 tooling 或 feature slice 试点，记录发现集合与定位时间；通过后才扩展 scripts/dev/tests/src 归位。保持 root pnpm aliases、插件身份、exports、profile 语义、dataDir 与运行数据不变。`preset-runner` 继续保留公开出口，除非另立发布方案。

## 5. 证据边界

本轮父 agent 执行并记录：窄 Vitest 2 文件/15 断言通过；`vitest list --filesOnly` 列出 43 个 spec；`pnpm typecheck && pnpm test` 通过，43 文件/366 断言、无 skipped。上述执行证明当前基线可发现、可类型检查、可运行；没有证明 Web GUI、真实模型、OV server、完整安装 exports 或全部 shipped patch 行。

本底稿不执行目录迁移、不改 profile、不写日用 `~/.dsh`，也不把建议目录树当现状。
