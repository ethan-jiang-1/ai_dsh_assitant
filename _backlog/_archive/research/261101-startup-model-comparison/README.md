# 启动路径比较：产品启动器 vs deck-studio 标准启动

> 问题：如果仿效 `dsh-deck-studio` 的「三条命令」启动（建 profile → `dsh plugin add` → `dsh --profile … --port …`），本产品还能不能保住已经设计好的产品 profile、产品 home、工作区绑定、客户端门与 `deliverables/` 交付包？两条路径各自付什么代价；更新后的 FAQ 26（安装/首启/生命周期）是否要求把产品层从启动器移回 profile/bundle。
> 历史消费者：[启动路径取舍 note](../../../../notes/rejected/2026-11-01-startup-paths.md)（rejected：被本决定取代）、[产品 profile 对齐卡](../../settled_issues/261101-product-profile-alignment.md)（已授权实施）
> 归档：2026-11-01
> 产出的卡：[产品 profile 对齐卡](../../settled_issues/261101-product-profile-alignment.md)

## 材料

| 文件 | 作用 | 日期 |
|---|---|---|
| [261101-deck-studio-startup-facts.md](261101-deck-studio-startup-facts.md) | deck-studio 的安装/启动/profile 配置/项目根/会话 cwd/数据根/首屏事实，以及本机 3 条命令实验 | 2026-11-01 |
| [261101-our-startup-and-experiments.md](261101-our-startup-and-experiments.md) | 本产品启动器的合同、标准 3 条命令的两次实验（无绑定/有设置）、缺口感与证据 | 2026-11-01 |
| [261101-comparison-and-recommendation.md](261101-comparison-and-recommendation.md) | 维度对比、优缺点、A–E 选项、推荐的双路径与门槛/风险 | 2026-11-01 |
| [261101-dsh-native-product-layer.md](261101-dsh-native-product-layer.md) | DSH 原生安装 + 客户端开始页/工作区选择的分层设计、可行性、切片与未决 | 2026-11-01 |
| [261101-product-model-correction.md](261101-product-model-correction.md) | 更新后的 FAQ 26 硬事实、上一轮“启动器 + settings.json”歪点、dedicated profile + Config + bundle 自有启动的目标模型 | 2026-11-01 |

## 实验资产（本机临时 home 真渲染，不参与判定）

| 文件 | 是什么 |
|---|---|
| [deck-studio-workbench.png](deck-studio-workbench.png) | deck-studio 三条命令起后的首屏：全页 workbench + 欢迎命名弹窗 + 示例 deck |
| [launcher-gate.png](launcher-gate.png) | 本产品启动器 `--workspace` 起后的首屏：`工作区 · …` 门条 + `开始一件事` |
| [standard-no-config.png](standard-no-config.png) | 本产品走标准三条命令、无产品绑定的首屏：仍是 DSH 一页纸，无门条（默认工作区） |
| [standard-with-settings.png](standard-with-settings.png) | 本产品走标准三条命令 + 产品设置后的首屏：门条 + `工作区 · project` + `开始一件事` |

## 读法

1. 先读 deck-studio 事实：它把「启动」交给 DSH，把「项目」交给 profile 配置 + 自己的 workbench；没有产品 home、没有 DSH workspace 绑定。
2. 再读本产品实验：标准三条命令能装、能起，但默认工作区不是用户项目；补上产品设置后，门/工作区/交付包全部回来。
3. 然后读对比与推荐：为什么建议「保留启动器 + 另开标准 DSH 安装（`workspaceDir` profile 配置）」，以及哪些东西不该抄。
4. 最后读纠偏：更新后的 FAQ 26 把“产品 = bundle + named profile”“首启由 bundle 回答”“设置走 profile patch”钉死；上一轮把产品 owner 放在启动器/私有设置文件，native 路径因此退化。目标模型 = dedicated `assistant` profile + `assistant-product.workspaceDir` Config + 客户端 onboarding + 薄安装器。

## 边界

- 本轮没有改产品代码；所有实验在 `<repo>/.tmp/` 的临时 home/工作区里跑，未碰日用 `~/.dsh`。
- 标准路径的「profile 配置」还只是提案（`workspaceDir` 行配置）；实验证明的是「标准三条命令 + 产品设置文件」这条等价路径。
- 截图是页面内容，不含 token；研究正文不记录运行 URL/token 或机器绝对路径。
- deck-studio 只作对照：读它的 README/安装文档/配置/客户端代码，并在临时 home 装它跑了一次；不复制它的代码、不引入依赖。
