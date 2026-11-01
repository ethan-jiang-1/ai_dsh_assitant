---
topic: 产品启动器与 deck-studio 标准启动的维度对比、优缺点与双路径建议
intent: 给「要不要仿效 deck-studio 的启动」一个可拍板的选项集与推荐，区分机制可行、产品等价与不该抄的部分。
---

# 对比与建议

## 一、维度对比

| 维度 | 本产品启动器（现状） | deck-studio（标准 DSH 启动） | 本产品走标准三条命令（实验） |
|---|---|---|---|
| 启动步骤 | 1 条：`bootstrap.mjs --workspace` | 3 条：建 profile → `plugin add` → `dsh --profile` | 3 条 + profile patch（工作区/默认 preset） |
| profile 所有权 | 启动器建/复用 `assistant`，设默认 preset | 用户建 `deckline`；安装文档不设默认 preset | 用户建 `assistant`；需补默认 preset |
| home | 产品自有 home（默认 `~/.dsh-smart-assistant`） | 普通 `DSH_HOME` | 普通 `DSH_HOME`（要隔离就自己设） |
| 项目绑定 | 设置文件 + 产品行 `workspaceRegistry` | profile `projectsRoot`/`decks[]` + 客户端 `sessions.create({cwd})` | 设置文件（实验）；profile `workspaceDir`（提案） |
| 会话 cwd | 工作区 | deck 源目录（只读） | 工作区 |
| 产物落点 | 会话 cwd 的 `deliverables/`（用户项目） | 插件 `dataRoot`；源 deck 只读 | 会话 cwd 的 `deliverables/`（用户项目） |
| 首屏 | DSH 一页纸 + 产品门条（ready 时） | 全页 workbench + 欢迎命名 + 示例 deck | DSH 一页纸 + 产品门条（有绑定时） |
| 配置入口 | CLI/设置文件；profile patch 可覆盖 | profile patch（`projectsRoot`/`decks`/render） | profile patch（工作区 + 默认 preset） |
| 分发 | 本地 tarball/启动器 | npm / 插件市场 / git / 本地 | tarball（无 npm 发布） |
| 首跑无绑定 | 不适用（启动器必绑） | 默认示例 deck/项目根，不依赖 DSH Workspace | 普通 DSH 默认工作区，无门条 |
| 失败面 | profile 所有权/版本/路径策略/headless | 配置路径/数据根/只读源 | 无绑定→默认工作区；profile patch `[]` 陷阱 |
| 维护面 | 启动器代码 + profile/安装/版本对账 | 无启动器；插件自管配置/工作台 | 无启动器；文档/profile patch 承担绑定 |
| 目标用户 | 非 DSH 用户/CEO，一条命令 | 用 DSH 做内容的人，已会装插件 | DSH 用户/团队分发 |

## 二、优缺点

### 本产品启动器

**优点**

- 一条命令完成「建 profile + 装包 + 设默认 preset + 绑工作区 + 起 Web」，用户不需要学 DSH 的 profile 概念。
- 产品 home 与日用 `~/.dsh` 隔离，凭据/会话/工作区/预设不混；换机/试用边界清楚。
- 工作区在启动时确定，路径策略（禁 `/`、home、产品 home、包内）与版本对账在启动器统一做。
- 产品门/恢复面/CTA 与工作区绑定是同一条链，产品形态完整。
- 自动化证据 `product-smoke` 覆盖 profile/settings/登记/会话 cwd/stop。

**缺点**

- 启动器是自有代码：profile 创建、安装、版本对账、进程管理都要维护，且要跟 DSH CLI 演进而变。
- 分发仍靠 tarball/本地包，没有 npm/市场的「装插件」体验；用户要先拿到包。
- 绕开了 DSH 用户熟悉的「自己建 profile、自己装插件」路径；团队/高级用户可能更愿意用原生流程。
- 产品 home 与普通 home 的差异要多写文档；用户想复用日用凭据/会话时反而多一步。

### deck-studio 标准启动

**优点**

- 完全复用 DSH 的 profile/安装/启动语义；用户已有的 DSH 经验、凭据、插件市场、升级路径都能用。
- 没有启动器代码；插件只贡献 bundle patch + 客户端 + 工具，边界干净。
- profile patch 是配置的唯一来源，适合团队统一分发/受控环境。
- 全页 workbench 让产品首屏就是产品，不被 DSH 外壳淹没；示例 deck/风格开箱即用。
- npm/市场安装是真正的「插件」分发。

**缺点**

- 用户要自己建 profile、装插件、写 profile patch；对非 DSH 用户门槛高。
- 没有产品 home：数据根 `${DSH_HOME}/deckline` 与日用 DSH 混住；没有产品级隔离。
- 没有 DSH Workspace 绑定/门：项目是插件自己的 `projectsRoot`/`decks`，会话 cwd 用 `sessions.create({cwd})`；
  没有「启动时绑定一个用户项目」的产品层。
- 产物在插件 `dataRoot`，源目录只读；这与我们「交付包留在用户项目」的设计相反。
- profile patch 的 `[]` 陷阱、默认 preset 未设、任意已有文件夹仍要写配置；首跑仍有 YAML 摩擦。

## 三、选项

| 选项 | 内容 | 判断 |
|---|---|---|
| **A. 双路径** | 保留启动器（产品模式）；另开标准 DSH 安装：3 条命令 + profile patch（`workspaceDir` + `agent-preset-registry.default: assistant`）；文档写清「替换 `[]`」 | **推荐** |
| B. 用标准启动替换启动器 | 只保留 3 条命令 + profile patch/工作区选择器；删启动器/产品 home | 不推荐：丢掉一条命令、产品 home、版本对账与目标用户；标准用户仍要写 YAML/选 preset |
| C. 只保留启动器 | 现状；标准 DSH 用户自己装、自己写设置文件 | 可行但不完整：标准路径没有产品绑定/门，默认工作区会接住交付包 |
| D. 全盘仿 deck-studio | 全页 workbench + `dataRoot` + `projectsRoot`/`decks` + `sessions.create({cwd})` | 不推荐：这是另一个产品面；与四房间/账本/一页纸/`deliverables/` 冲突，改动远超启动 |
| E. 现在就做 GUI 工作区选择器 | 标准路径无配置时，客户端门让用户选目录并 POST | 方向对，但可后置；A 的 profile 配置先解决「知道工作区」；选择器解决「问工作区」，是独立 UI 切片 |

## 四、推荐：A（双路径），启动器仍是主入口

### 为什么

- **机制已证**：标准三条命令能装/能起；补上设置后门/工作区/交付包全部回来（实验 B）。缺的只是绑定与默认 preset，不是产品能力。
- **产品身份不该丢**：一条命令、产品 home、启动时确定工作区是目标用户的差异点；deck-studio 没有这些，不代表我们要放弃。
- **DSH 用户该有原生路径**：团队/高级用户想用 `dsh plugin add` + profile patch；给他们一条 `workspaceDir` 配置，比让他们手写设置 JSON 干净。
- **不该抄 workbench/dataRoot**：全页工作台、源只读、产物进插件数据根，和「管理助手 + 四房间 + 项目交付包」是两种产品；启动比较不需要动产品面。

### A 的最小实现面（若拍板）

1. `assistant-product` 行增加可选 Config `workspaceDir`（profile patch 用）；状态优先级：
   设置文件（用户选择）> 行配置（部署默认）> `not-configured`；设置文件损坏仍报 `invalid`，不静默回退。
2. 标准路径文档：3 条命令 + 一段 profile patch（工作区 + 默认 preset），明确「替换 `[]`、不是追加」；
   产品 home 用「设 `DSH_HOME=~/.dsh-smart-assistant` 再跑 3 条命令」表达，或直接用启动器。
3. 测试：行配置无设置 → ready；设置覆盖配置；坏设置仍 invalid；标准临时 profile + patch 真机门条/登记。
4. 文档：`README`、包 README、`docs/product.md`、`_dist/安装手册.md` 同 diff；启动器路径不变。
5. 不做：全页 workbench、dataRoot 迁移、改 `deliverables/` 契约、改产品行路由/客户端门。

### 风险与缓解

- **两条路径文档漂移**：`docs/product.md` 作为唯一合同；README/手册只指过去，不复制判据。
- **配置/设置优先级混淆**：设置 > 配置写死；状态 `configured` 明确；测试覆盖。
- **标准路径用普通 home**：文档写「想隔离就 `DSH_HOME=…` 或启动器」；不假装标准路径有产品 home。
- **profile patch `[]`**：标准文档写替换；示例给完整文件；`--dump-config` 自检。
- **默认 preset 漏设**：profile patch 带 `agent-preset-registry.default: assistant`；门 CTA 也显式传 preset。
- **分发**：标准路径仍要 tarball；npm/市场是 O5 的后续，不阻塞 A。

### 触发/后置

- **GUI 工作区选择器**（E）：标准路径用户明确拒绝写 YAML，或产品交给非技术用户；触发时再做。
- **npm/市场分发**：第一次真实团队分发，或用户要求 `dsh plugin add <name>` 而不是 tarball。
- **Windows/Desktop 矩阵**：第一次真实用户在这两类平台安装/启动。
- **是否给标准路径也做产品 home**：只有真实用户要求标准安装也隔离时才做；默认不预建。

## 五、证据边界

- 机制实验在临时 home/工作区；标准路径的「profile 配置」尚未实现，实验 B 用设置文件等价证明。
- 未验证：真模型首跑质量、npm 安装、Windows/Desktop、deck-studio 的完整出图链。
- 本材料不构成实施授权；拍板在 [启动路径取舍 note](../../../notes/proposed/2026-11-01-startup-paths.md)。
