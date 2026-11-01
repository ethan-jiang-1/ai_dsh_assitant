---
topic: 本产品启动器的合同，以及用 DSH 标准三条命令启动本产品包的两次实验
intent: 分清「启动器自动做的产品绑定」与「标准 DSH 安装只做的基础装载」，并证明缺的开关是工作区绑定（与默认 preset），不是插件能力。
---

# 本产品的启动与标准路径实验

## 一、启动器（产品模式）做了什么

包根 `bootstrap.mjs` 的产品模式：

```sh
node bootstrap.mjs --workspace /abs/project
node bootstrap.mjs --product
node bootstrap.mjs --stop --home ~/.dsh-smart-assistant --product
```

一次产品启动包含：

1. 产品 home（默认 `~/.dsh-smart-assistant`；显式设 `DSH_HOME`，不继承日用 `~/.dsh`）；
2. 经官方 CLI 建/复用 `assistant` profile（web 模板），装当前 tarball，设 `agent-preset-registry.default: assistant`；
3. 校验工作区（绝对、存在、可读写；禁 `/`、用户 home、产品 home、包内），写
   `<productHome>/assistant-product/settings.json`；
4. `dsh --profile assistant --port 0` 起 Web；启动 cwd = 工作区；
5. 产品行 boot 时用 `workspaceRegistry.create()` 登记工作区；客户端门显示 `工作区 · …` 与「开始一件事」，CTA 以
   `startSession(workspaceId, { agentPreset: 'assistant' })` 开会话。

启动器把「装/建 profile/设默认/绑工作区」都收进一条命令；`--product` 复用上次绑定；`--no-start` 只准备；
`--stop` 收进程组。自动证据 = `pnpm product-smoke`；真机 = `product-ready` 截图（门条 + 开始按钮）。

## 二、实验 A：标准三条命令，不写任何产品绑定

在 `<repo>/.tmp/standard-path/` 建临时 home，**不用启动器**：

```sh
dsh --profile assistant --from-default-profile web
dsh plugin --profile assistant add /abs/dsh-smart-assistant-0.1.13.tgz
dsh --profile assistant --port 0 --no-open
```

profile patch 只加了实验需要的 `documentsDirectory`（避免默认工作区落到用户 Documents）与内测声明确认；
没有写 `assistant-product/settings.json`，没有设默认 preset。

结果：

- 插件行 `assistant-product` 在组合里（`--dump-config` 可见），客户端门/产品页也能加载；
- 产品行状态 = `not-configured`；客户端门**透明**（不显示门条，不阻止一页纸）；
- DSH 首启创建了默认工作区（`…/documents/deepseek-harness/default-workspace`）并建了一个会话；
  首屏是**普通 DSH 一页纸**，没有 `工作区 · …`/「开始一件事」；
- 助手的大脑是 `<DSH_HOME>/assistant`（**普通 home**），不是产品 home；
- 此时若直接在这个默认工作区干活，文件工具/`deliverables/` 会落在默认工作区——不是用户项目；
  要落到用户项目，用户得在 DSH 侧栏自己加工作区/开会话。

截图：[standard-no-config.png](standard-no-config.png)。

**结论 A**：标准三条命令能装载、能起、能加载客户端；缺少的不是插件能力，而是**产品工作区绑定**（和
默认 preset）。不补这一步，产品形态退化为「装了插件的普通 DSH」。

## 三、实验 B：标准三条命令 + 一条产品设置

在同一个临时 home 写：

```json
// <DSH_HOME>/assistant-product/settings.json
{"version":1,"workspaceDir":"/abs/project","updatedAt":"2026-11-01T00:00:00.000Z"}
```

再起服务（仍不用启动器）。结果：

- 产品行读取设置，登记 `/abs/project`；状态 = `ready`；
- 首屏出现 `工作区 · project` 与「开始一件事」；
- `workspaces` 同时有默认工作区与 `project`（默认工作区是 DSH 首启留下的，不影响产品绑定）；
- 门、工作区、CTA、`deliverables/` 契约全部可用；缺的只是「一条命令 + 产品 home」。

截图：[standard-with-settings.png](standard-with-settings.png)。

**结论 B**：标准三条命令 + 一个绑定就能保住产品功能；绑定可以来自设置文件（本实验），也可以来自
profile 配置（提案）。启动器的价值是**把绑定、默认 preset、产品 home 一次做完**，不是产品能力的唯一来源。

## 四、实验里撞到的两个坑

1. **profile patch 的 `[]`**：`--from-default-profile web` 生成的 `cordis.patch.yml` 是注释 + `[]`。
   直接追加 rows 会形成第二个 YAML document，启动报
   `YAMLException: end of the stream or a document separator is expected`。标准路径文档要写「替换 `[]`」，
   不能只写「追加」。
2. **默认 preset**：标准三条命令不设 `agent-preset-registry.default`；会话若从 DSH 原生入口新建，
   默认仍是 `standard`。产品门的 CTA 显式传 `agentPreset: 'assistant'`，所以从门进去是对的；
   要所有入口都用产品 preset，profile patch 还要把默认设成 `assistant`（启动器已经这么做）。

## 五、缺口的准确表述

标准路径缺的不是：

- 插件装载（行/客户端/工具都在）；
- 工作区机制（`workspaceRegistry`/`session cwd` 都在）；
- 交付包契约（手册/技能按会话 cwd 写 `deliverables/`）。

标准路径缺的是**产品层的那一下**：

- 用户项目的**默认绑定**（设置文件或 profile `workspaceDir`）；
- **默认 preset**（`agent-preset-registry.default: assistant`）；
- 产品 home（可选；普通 home 也能跑，只是与日用 DSH 混住）；
- 一条命令的体验（启动器）。

因此「仿效 deck-studio 的启动」在机制上可行；要让标准路径达到产品等价，只需补 profile 配置
（工作区 + 默认 preset），不需要改产品行/客户端/交付契约。

## 六、证据与边界

- 实验 home/工作区都在 `<repo>/.tmp/standard-path/`；未写日用 `~/.dsh`。
- 安装包 = `_dist/dsh-smart-assistant-0.1.13.tgz`；标准路径的 `--dump-config` 可见 `assistant-product` 行。
- 截图是页面内容，不含 token/URL；实验正文不记录运行 token。
- 实验 A/B 用的是「设置文件」而不是「profile 配置」；`workspaceDir` 行配置是 proposal，尚未实现。
- 模型行为/首跑质量不在本轮范围；`eval` 仍需 key。
