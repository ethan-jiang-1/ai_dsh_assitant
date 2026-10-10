# AGENTS.md —— `packages/dsh-smart-assistant/` 子树常设指令

> 根 [`AGENTS.md`](../../AGENTS.md) 管全仓规则与本子树的入口；本文件只拥有**包内**的常设指令
> （一个事实一个家：包的形状与边界在这里，运行手册在 [`docs/`](../../docs/)）。
> 进了这个目录再读本文件——DSH 原生指令装载器按目录链加载，你所在目录的 owner 文件自动在场。

## 这是什么包

一个 **bundle**（不是 profile）：`package.json` 只声明 `dsh.bundle.patch = ./cordis.patch.yml`；
它贡献 plugin 子路径导出（host + agent + client 三平面）——清单与计数以生成物 `docs/package-catalog.md` 为准
（本文件不复述数字：数过即过期）。
它给 agent 一个 **working folder**（`assistant` 的 `dataDir`，默认 `<dshHome>/assistant`）——不是进程 cwd/workspace。

## 入口、平面与组合行

**完整清单（入口 × 平面 × 组合行 id、工具 × 动词、策展技能、pin 与依赖姿态）以生成物为准**：
[`docs/package-catalog.md`](../../docs/package-catalog.md)（`pnpm gen-catalog` 生成，`pnpm verify` 守 freshness）。
本文件只拥有**不在生成物里的纪律**：

- 三个平面别混：**HOST**（服务 = Service Definition + 同包唯一 Provider）、**AGENT**（preset 的 agent 行，
  model-facing：工具与提示词段落）、**CLIENT**（浏览器面，皮肤，模型不可见）。
- **工具不合并**：动词集互不重叠，合并只会让模型在错误的房间找东西。
- **改模型可见面**（工具 description、提示词段落、persona 文本）必须同 diff 做三件事：
  ① 语言用英文（根 `AGENTS.md` 语言分工）；② `model-visible means logged`——必须能从会话日志重建；
  ③ 在 [`docs/identity.md`](../../docs/identity.md) 登记面与名，并配快照或真实组合断言。
- **改了组合行/exports/工具动词** → 必须重跑 `pnpm gen-catalog`，否则 freshness 门禁红。

## 包内 owner 面

| 模块 | 拥有什么 |
|---|---|
| `src/domain/home/layout.ts` | **working folder 布局的唯一 owner**：路径、scaffold、种子文件、健康检查 |
| `src/domain/home/` 其余 | frontmatter、Room 存储抽象、摘要渲染、手册渲染、节拍器、curate findings |
| `src/domain/memory/` `src/domain/research/` `src/domain/skills/` `src/domain/knowledge/` | 四个房间的**词汇与纯核**（校验、生命周期、检索排序、findings） |
| `src/domain/operating/` + `src/host/operating-ledger/` + `src/host/desk-projection/` | **经营账本与投影**（第二持久化面）：纯核归约、单 writer 服务、固定只读下载（契约 = [`docs/operating.md`](../../docs/operating.md)） |
| `src/agent/`（`tool-*`、`tool-support`、`memory-digest`、`home-preamble`、`operating-brief`、`learn`、`ov-shield`） | agent 面入口：自有工具、共享 presenter 管道（`presentationMeta` 投影与读回）、段落贡献、学习 provider、遮蔽盾 |
| `src/dev/preset-runner/` | 验证驱动（非产品能力；`./preset-runner` 公开出口保留，dev patch 按包名解析不受路径影响） |
| `src/host/index.ts` | 服务实现（host 面）：四个房间的读写、curate、digest、提案收件箱；根 `src/index.ts` 是它的薄导出稳定入口（同 class 身份，不持第二份实现） |
| `presets/assistant/` | 策展技能（`skills/`，**模型用**）；shipped preset 组合由包根 `cordis.patch.yml` 的 `preset-assistant` 行拥有 |
| `tests/` | 纯核 + 服务级合同 + 真实组合装载（服务级用真 cordis 构造，不依赖 DSH 运行时） |

## 本子树的纪律

1. **不在这里改** [`vendor/dsh/`](../../vendor/dsh/)：DSH 源码永不改，升级只走 `pnpm sync-dsh`。
2. **不在包内跑裸 node 起 harness**：一律经仓根 `pnpm dsh`（它强制 dev home，永不碰日用 `~/.dsh`）。
3. **改动分两层验**：纯核改 `tests/domain/*.spec.ts`（层表见 [`docs/testing.md`](../../docs/testing.md)）；模型可见面改必跑仓根真实组合测试
   （包根 `cordis.patch.yml` 的 `preset-assistant` 行 + Standing mount + 代理消费）、`pnpm build`
   （组合测试与 `release-smoke` 消费 `lib/` 产物，不 build 会拿到旧行为）与 `pnpm eval`
   （行为回归：真实请求跑一遍，判定读会话日志——改 persona/工具描述/家手册/协作边界时它是唯一会红的那层）。
4. **客户端色值走主题，不写死**：平台 token 与组件规则在 `vendor/dsh/docs/web-styling.md`。本条只写本包的落点：中性角色（文字/背景/边框）一律消费 vendor `--dsw-alias-*` 语义
   alias；warn/accent 走 `src/client/theme.ts` 的 `ensureThemeVars` 注入的 `--dsha-*` 契约块
   （亮值自带、暗值引用 vendor statics——vendor amber 阶无亮面 ≥AA 档、teal 不在其调色板）；
   组件样式零字面色值，唯品牌 SVG 的白色剪影除外（固定 logo 色，自绘背景）。AA 由
   `tests/client/client-theme.spec.ts` 的色彩契约测试持有（组件零字面色 + 契约亮值逐个 ≥4.5:1）。
5. **包 README 与 `docs/` 的分工**：README 写"这个包是什么形状"；`docs/` 写"它现在的合同"
   （布局契约在 [`docs/home.md`](../../docs/home.md)）。两者都不写决策理由——那进 `notes/`。
