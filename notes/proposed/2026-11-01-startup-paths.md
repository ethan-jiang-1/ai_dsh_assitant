日期：2026-11-01 · 状态：**proposed**（待拍板；本轮只做对比实验，未改产品代码）

# 启动路径：保留产品启动器，另开标准 DSH 安装

## 问题（可观察行为）

本产品现在的启动是一条命令：`node bootstrap.mjs --workspace /abs/project`。它建/复用 `assistant` profile、
装 tarball、设默认 preset、写工作区绑定、起 Web，并把产品 home 放在 `~/.dsh-smart-assistant`。
对照的 `dsh-deck-studio` 走标准 DSH 三条命令：用户建 profile → `dsh plugin add` → `dsh --profile … --port …`；
没有启动器、没有产品 home，项目根与数据根都从 profile patch 来。

要回答的是：**仿效 deck-studio 的启动办法，能不能保住本产品已经设计好的 profile/home/工作区/门/交付包？**
两条路径各自的代价是什么？本次实验（临时 home，未改产品代码）给出的结论：

- 标准三条命令能装、能起、能加载本产品的客户端与产品行；
- 但没有产品绑定时，产品行 `not-configured`、门透明、DSH 用默认工作区，交付包会落到默认工作区而不是用户项目；
- 补一条产品设置（`assistant-product/settings.json` 的 `workspaceDir`）后，门条、工作区登记、CTA、交付包全部回来；
- 标准路径还缺默认 preset（`agent-preset-registry.default: assistant`）；不设时从 DSH 原生入口新建的会话仍是
  `standard`，只有产品门 CTA 显式传 `assistant`。

完整差异、优缺点和实验证据在[启动路径比较](../../_backlog/research/261101-startup-model-comparison/README.md)。

## 提案

**A. 双路径；启动器仍是主入口。**

1. **产品模式（现状保留）**：`bootstrap.mjs --workspace` 一条命令，产品 home、profile、默认 preset、工作区绑定、
   门/CTA、`--product`/`--stop` 全保留。目标用户/打包产品走这条。
2. **标准 DSH 模式（新增文档与一行配置）**：用户按 deck-studio 同形三条命令建 `assistant` profile、装 tarball、起 Web；
   profile patch 里写两行：
   ```yaml
   - id: agent-preset-registry
     name: '@deepseek-ai/dsh-agent-preset-registry'
     config:
       default: assistant
   - id: assistant-product
     name: 'dsh-smart-assistant/product'
     config:
       workspaceDir: '/abs/project'
   ```
   新 profile 的 `cordis.patch.yml` 里是 `[]`，要**替换**它，不是追加（实验实际撞到 YAML 解析错误）。
   想同时要产品 home，就在跑三条命令前设 `DSH_HOME=~/.dsh-smart-assistant`；否则用当前普通 home。
3. **代码**：给 `assistant-product` 行加可选 Config `workspaceDir`；状态优先级 = 设置文件（用户选择）> 行配置（部署默认）>
   `not-configured`；设置文件损坏仍报 `invalid`，不静默回退。不新增模型可见面，不改路由/门/交付契约。
4. **文档**：`README`、包 README、`docs/product.md`、`_dist/安装手册.md` 同 diff 写清两条路径与 profile patch 的
   `[]` 规则；启动器仍是推荐路径。
5. **不做**：不把 deck-studio 的全页 workbench、`dataRoot`、`projectsRoot/decks`、源只读模型搬过来；不改
   `deliverables/` 的位置与四房间/账本/一页纸。

## 输掉的方案

- **B. 用标准三条命令替换启动器**：丢掉一条命令、产品 home、profile 所有权/版本对账与目标用户；标准用户仍要写
  YAML/选 preset。不推荐。
- **C. 只保留启动器**：标准 DSH 用户自己装、自己写设置文件；没有 profile 配置时产品行 idle、门透明，默认工作区接住
  交付包。可行但不完整；A 的一行配置成本很低，值得补。
- **D. 全盘仿 deck-studio**：全页 workbench + 插件 `dataRoot` + `projectsRoot/decks` + 客户端 `sessions.create({cwd})`。
  这是另一个产品面：与四房间/账本/一页纸/项目交付包冲突，改动远超启动层；拒绝。
- **E. 现在就做 GUI 工作区选择器**：方向对，但它是独立的客户端/remote 切片；A 的 profile 配置先解决「启动时知道
  工作区」，选择器解决「启动中询问」，可后置。触发 = 标准路径用户明确拒绝写 YAML，或产品要交给非技术用户。
- **给标准路径默认建产品 home**：预建隔离会替用户决定数据边界；先让用户用 `DSH_HOME` 显式选择。

## 验收

若拍板 A，完成条件：

- 标准临时 profile（三条命令）+ 上述 profile patch 起服务：门显示 `工作区 · <项目>`、`开始一件事`；工作区登记成功；
  会话 cwd = 项目；`deliverables/` 落在项目。
- 设置文件仍覆盖行配置；坏设置仍 `invalid`；无配置/无设置仍 `not-configured`、门透明。
- `pnpm typecheck && pnpm build && pnpm test && pnpm verify` 绿；`pnpm product-smoke` 回归绿（启动器路径不变）。
- 文档同 diff：README、包 README、`docs/product.md`、`_dist/安装手册.md`；写明 `[]` 替换与默认 preset。
- 无模型可见面变更；若确有，按既有规则另跑 `prompt-smoke`/`eval`（无 key = BLOCKED）。

## 证据

- 实验与截图：[启动路径比较](../../_backlog/research/261101-startup-model-comparison/README.md)、
  [本产品实验](../../_backlog/research/261101-startup-model-comparison/261101-our-startup-and-experiments.md)。
- deck-studio 对照：[事实材料](../../_backlog/research/261101-startup-model-comparison/261101-deck-studio-startup-facts.md)。
- 决策维度与选项：[对比与建议](../../_backlog/research/261101-startup-model-comparison/261101-comparison-and-recommendation.md)。
