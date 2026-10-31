---
topic: 改动面与切片
intent: "把从插件到产品的代码、脚本、文档、分发与证据改动面摊开，按可回退切片排好，供问题卡授权后直接转收口台账。"
---

# 改动面与切片

> 立档：2026-11-01 ｜ 服务卡：[插件即产品](../../settled_issues/261101-plugin-as-product.md)

## 0. 原则

- 一次交付 = 一个垂直切片（代码 + 测试 + 合同同 diff）；每片一个可回退 commit。
- 文档只写现在：`docs/` 在切片落地时才改成事实，不在提案期先写未来合同。
- 能复用的不新造：profile 建法沿用 [bootstrap.mjs](../../../../packages/dsh-smart-assistant/bootstrap.mjs)；会话创建沿用 `uiWorkspace.startSession`；交付沿用 `present` 与 `deliverables/`。
- 手工 `dsh plugin add` 路径全程保留；产品启动器是新增入口，不是替代。

## 1. 改动面盘点

| 面 | 要动的东西 | 为什么 | 证据/门禁 |
|---|---|---|---|
| Host 行 | 包内新增**一行 web-only 产品行**（必注 `connection`/`workspaceRegistry`，负责 boot 登记与路由；headless profile patch `disabled: true`，同 `schedule` 先例）；[cordis.patch.yml](../../../../packages/dsh-smart-assistant/cordis.patch.yml) 加行；[package.json](../../../../packages/dsh-smart-assistant/package.json) 加导出子路径 | 工作区登记、状态查询、客户端恢复面；headless 不新增 pending | `pnpm test:host`、导出形态守卫、`--dump-config`、catalog freshness |
| 域核 | 包内新增产品设置纯核（路径守卫、原子写、版本化）与 run 目录命名/校验纯函数 | 宿主与启动器共用；可纯测 | `pnpm test:domain` |
| 启动器 | 演进 [bootstrap.mjs](../../../../packages/dsh-smart-assistant/bootstrap.mjs)：`--workspace`、**产品自有 home**、设置文件、profile 所有权/版本对账、危险路径守卫；干净房间模式保留为 `--home` | 一条命令的产品入口 | 新增 `product-smoke.mjs`；更新 `bootstrap-guards-smoke`、`standalone-smoke` |
| 模型可见面 | [home-map.ts](../../../../packages/dsh-smart-assistant/src/domain/home/home-map.ts) 的交付段：工作区 + `deliverables/<date>-<slug>/` + README 四段；**不强制模型写 session id**；策展技能新增交付技能，第一会话/行动计划技能指过去；项目 `AGENTS.md`/`.agents/skills` 只读/建议 | 让模型稳定把产物写进项目 | `pnpm test:agent` 预算合同、`pnpm prompt-smoke`、`pnpm eval`（有 key） |
| 客户端 | 产品门：读产品路由；无设置保持现状，有设置但缺失时恢复面；首页显示当前工作区；CTA 用 `uiWorkspace.startSession` | 首屏知道在哪个项目、能恢复 | `pnpm test:client`、`pnpm web-expected` 现有/新增场景 |
| 发布/分发 | [export-dist.mjs](../../../../scripts/release/export-dist.mjs) 手册模板；`files`/`must` 清单加启动器；`handoff-scan` 拒绝产品设置目录；`release-smoke` 断言新产品文件 | `_dist/安装手册.md` 是生成物，改生成器再重跑 | `pnpm export-dist`、`pnpm release-smoke`、`pnpm verify` |
| 冒烟 | 新增 `product-smoke.mjs`（pack → 解包 → 临时 home+workspace → `--no-start` 断言 → 真 boot → `storages/workspace.json` 断言 → stop）；更新 `bootstrap-guards-smoke`、`standalone-smoke` | 产品形态自己的机器证据 | `pnpm product-smoke`、`pnpm verify` 的 commands 门 |
| 根 README | 首段改产品定位；「装法」产品启动优先、手工装包其次；新增“工作区与产物”一节；路由表加产品合同页 | 用户第一眼看到产品 | `pnpm verify` 断链 |
| 根 AGENTS.md | 首段“working folder”定义改成“助手之家 + 用户工作区”两分；命令表加产品启动；硬规则 1 保持（产品自有 home 不是日用 `~/.dsh`），产品启动器的 home 语义写进产品页 | 入口链不能自相矛盾 | `pnpm verify` 入口链/命令门 |
| docs | 新增产品合同页（产品形态、启动、工作区、run bundle、数据卡、失败模式）；[docs/home.md](../../../../docs/home.md) 加指针并标家的 `deliverables/` legacy；[docs/delivery.md](../../../../docs/delivery.md) 数据卡加工作区产物；[docs/release.md](../../../../docs/release.md) 宪章改写；[docs/architecture.md](../../../../docs/architecture.md) 加行/客户端门/链路；[docs/dev.md](../../../../docs/dev.md) 加第四个根；[docs/commands.md](../../../../docs/commands.md) 加冒烟；[docs/identity.md](../../../../docs/identity.md) 去禁令、登记新名；[docs/discipline.md](../../../../docs/discipline.md) 适配 11/13 扩写；[docs/testing.md](../../../../docs/testing.md) 证据地图加行；[docs/package-catalog.md](../../../../docs/package-catalog.md) 重生成 | 一个事实一个家；合同跟代码同 diff | `pnpm verify`、语义漂移审计 |
| 包文档 | [包 README](../../../../packages/dsh-smart-assistant/README.md) 六节重写；[包 AGENTS.md](../../../../packages/dsh-smart-assistant/AGENTS.md) 加产品行 | 发布物门面 | `pnpm verify` |
| 测试 | domain（设置/路径/run 目录）、host（注册/路由/缺失/headless idle）、client（门状态）、composition（新行）、tooling（export-dist 清单） | 每层只证明自己能证明的 | `pnpm test:*` |
| 记忆 | 先落本研究的消费者问题卡；方向拍板后 work 去向记 proposed/收口卡；切片完成后写 implemented note，输掉的方案入 note | 决定理由要有家 | `pnpm verify` 的 notes 形状 |

## 2. 切片（授权后按序）

### 切片 0：决策收口

- 产出：问题卡的四项拍板有答复；work 去向（proposed 卡/本卡转收口）记录。
- 不做代码。
- 关闭：按 [_backlog 关闭条件](../../../README.md#关闭条件) 留齐问题、方案、范围、比较过的选择、验收标准与去向。

### 切片 1：Host 工作区绑定

- 代码：产品设置纯核 + **一行 web-only 产品行**（必注 `connection`/`workspaceRegistry`，boot 登记 + 路由）+ `cordis.patch.yml` 行 + 导出子路径；headless patch `disabled: true`（同 `schedule` 先例）。
- 测试：设置读写/坏文件/路径守卫；路由四态（未配置 / 就绪 / 工作区缺失 / 写失败）；登记幂等；headless 下 web 行 disabled、core idle、不 pending；路由 owner-only。
- 文档：产品合同页只写已落地部分；architecture 组合行；catalog 重生成。
- 验收：`pnpm build && pnpm test:host`；`pnpm dsh --profile dev --dump-config` 能看到产品行；无设置时旧行为不变；dev-task 不 pending。
- 回退：删行/删文件即回到现状；不影响手工安装。

### 切片 2：产品启动器

- 代码：启动器 `--workspace`、**产品自有 home**（显式设 `DSH_HOME`）、设置写盘、profile 所有权/版本对账、危险路径守卫、cwd=workspace；首次 TTY 询问工作区。
- 测试：新增 product-smoke；更新 bootstrap 守卫与 standalone smoke；`release-smoke` 的 tarball 清单断言；日用 `~/.dsh` 不被默认触碰。
- 文档：根 README、包 README、release 宪章、identity、dev/commands、`_dist` 生成器 + 重生成。
- 验收：`pnpm product-smoke`、`pnpm standalone-smoke`、`pnpm release-smoke`、`pnpm verify`；产品 home 的 `storages/workspace.json` 出现指定路径；profile 里有两行/preset；用户自装插件在升级后保留。
- 回退：启动器的新旗标是加法；失败保留旧 profile 与数据。

### 切片 3：交付契约与客户端门

- 代码/文本：手册交付段（README 四段 + 不强制 session id）、交付技能、run 目录约定、四件物分权；项目 `AGENTS.md`/`.agents/skills` 只读/建议；客户端产品门（未配置=现状，缺失=恢复面，就绪=CTA/工作区名）。
- 测试：手册预算、prompt-smoke 新指令在场、client spec；有 key 的 eval/真机（无 key = BLOCKED）；跨 profile 打开会话的探针。
- 文档：home/delivery/architecture 浏览器链/testing 证据地图；产品页写四件物与项目面。
- 验收：真机从产品首页在工作区里开会话；模型产出 `deliverables/<date>-<slug>/README.md` + 文件并 `present`；知识页只蒸馏；项目 `AGENTS.md` 不被静默覆盖；家的 `deliverables/` 不再被新会话选作落点。
- 回退：手册/技能文本与客户端门可单独回退；不影响 Host 行。

### 切片 4：全仓文档/分发收口

- 文档：所有 docs 互链与口径；`_dist/安装手册.md` 重生成；语义漂移审计。
- 验收：`pnpm verify`、`pnpm export-dist`、README/手册/产品页三处口径一致；无未来时措辞。
- 回退：单 commit，文档可整体回退。

### 切片 5：note 收口

- 把 proposed 转 implemented（或归档），写决定、输掉的方案、重看触发；更新 `triggers.md` 的延后行（若有）。
- 验收：`pnpm verify` 的 notes 形状；问题卡按关闭条件归档。

## 3. 验收设计的落点

完整矩阵住在问题卡的 `## 验收标准`（按 [验收设计](../../../methods/validation-design.md) 的字段）。这份材料只记“为什么这样分”：

- **确定性**（设置解析、路径守卫、run 目录命名、profile 清单）→ domain/host/tooling spec，红绿对照。
- **编排**（profile 建/装、boot 登记、会话 cwd、客户端门、版本对账）→ **拆开证**：profile/登记/URL 由 `product-smoke` 证；会话 `header.cwd` 由 host/composition spec 或带 token 的 Web 探针证；headless 的 optional inject 由 dev-task 证。不要把三者塞进一条 smoke。
- **模型行为**（产物落 `deliverables/<date>-<slug>/`、README 四段、present、知识页只蒸馏）→ prompt-smoke 证“指令在场”，eval 证“行为地板”，真机证“这一次做对了”；三者不互相冒充。不要求模型写 session id。
- **人判断**（第一屏是否像产品、目录名是否好懂、工作区绑定是否可信、首跑产出是否像样）→ 一次真机走查，记录在问题卡/收口卡，不写成自动门禁。
- **负面**：坏路径、缺目录、不可读写、外来 profile、headless、跨 profile 打开会话、无设置、用户自装插件被覆盖、项目 `AGENTS.md` 被静默写、更新失败、并发写；每个都要有互补状态，不只测 happy path。

## 4. 风险与回退

| 风险 | 影响 | 对策 |
|---|---|---|
| 手册预算（当前渲染约 11k，预算 14,336） | 交付段改写可能挤掉既有内容 | 同 diff 跑预算 spec；过程性内容进技能，不进手册 |
| 模型行为漂移 | 产物仍写回家或写错目录 | prompt-smoke + eval + 真机；必要时加只写 run 目录的工具 |
| profile 更新失败 | 产品起不来 | 保留旧装、fail loud、product-smoke 覆盖 |
| 用户自装插件/配置被覆盖 | 产品升级像“重装” | 启动器只碰自己的依赖与默认行；product-smoke 断言用户改动保留 |
| headless 多一条 pending | 真失败被淹没 | 产品行 optional inject；路由只在 connection 存在时注册；dev-task 断言 |
| 跨 profile 打开产品会话 | 缺 preset、静默坏 | 探针确认行为；文档声明产品入口；失败给可读提示 |
| 模型不知道 session id | run README 编造字段 | 不要求模型写；run 身份 = 文件夹名 + 日期；host manifest 以后补 |
| 产品自有 home 与用户预期不符 | 用户以为能和日用 DSH 共用 | 默认自有，`--home ~/.dsh` 显式共享并警告；README/手册写清 |
| `deliverables/` 与用户文件混放 | 找不到、误删 | 默认混放 + README 说明；想隔离用产品子目录（拍板 2） |
| dev 与日用 home 混淆 | 开发测试污染日用 `~/.dsh` | 产品自有 home；所有冒烟强制 `--home` 临时目录；硬规则 1 保持 |
| boot 登记副作用 | 写 `workspace.json` 打扰用户 | 只在设置文件存在时登记；无设置=idle；登记幂等 |
| 文档漂移 | README/手册/合同三处说法不同 | 切片 4 语义漂移审计 + `pnpm verify` |
| O5 过度承诺 | 把“一条命令”说成“非技术用户可装” | 文档写明前提；安装器另立决定 |
| Windows/Desktop | 未验证平台 | 沿用现有边界，不宣称矩阵 |

回退锚点：切片 1/2/3 各自可单独回退；手工装包路径全程可用；产品设置缺失时行为与今天一致。

## 5. 原型状态（落 `.tmp/`）

**已完成（2026-11-01，见 [技术探针](261101-technical-probes.md)）**：

1. **boot 登记 + 会话 cwd**：`workspaceRegistry.create()` 幂等；`sessionController.create({ workspaceId })` 的会话 `header.cwd` = 工作区；`storages/workspace.json` 持久化。
2. **headless 与跨 profile**：dev-task 里 4 条既有 web-only 行 pending 等 `connection`；缺 preset 的失败码 = `agent-preset/not-found`。

**仍要做**：

3. **客户端门**：用现有 `assistant` preset 在临时工作区起一次，验证 `GET /api/assistant/product`（先用手写 JSON 路由）与 `uiWorkspace.startSession` 能落到目标工作区；确认不需要新增 `remote.workspace` 注入。产品 web 行自身的 settings/route 用 host spec + product-smoke。

原型只证明机制，不进入产品代码；结论回填问题卡的「仍未取/验收标准」。

## 6. 明确不做

- 不把 DSH 运行时/Node 打进包，不做 Electron/独立应用。
- 不做 per-workspace 大脑（除非问题卡拍板 B，另立决定）。
- 不复制会话日志进工作区，不做多租户，不替用户删工作区文件。
- 不在旧路径上自动造空目录；不手写/篡改 profile manifest。
- 不新增自有 slot 域名；客户端门走通用 `main` 座位。
- 不预建 session 回放快照、机器 run manifest 或 per-workspace 面板。
- 不在 v1 做 O5 的安装器/签名/离线包；不在 v1 做首次 GUI 目录选择器（CLI 提示先行）。
- 不把项目 `AGENTS.md`/`.agents/skills` 当作产品可静默写入的面；v1 只读 + 建议。
