---
status: 推敲中
opened: 2026-10-25
---

# 推敲：出厂身份与首跑——默认就是管理岗，还是通用助手加可选装配

> 立卡：2026-10-25 ｜ 状态：推敲中 ｜ 类型：Task ｜ 可关闭：否 ｜ 毕业：做现在

**问题与期望结果：** 产品判据 P1 要求“出厂可用的管理岗基座”，但装出来的默认身份是通用 `SOUL.md`；管理岗身份与知识种子只在 [`dev/deploy/expert-setup.mjs`](../../dev/deploy/expert-setup.mjs#L38-L58) 里，而 [`dev/AGENTS.md`](../../dev/AGENTS.md) 明说它是“仓库用，非发行命令”，`seeds/` 也不在包的 `files` 里（[package.json](../../packages/dsh-smart-assistant/package.json#L108-L114)）。装出来的 preset 叫“章鱼管家”、带管理技能，但身份不是管理岗，是“半专家”。期望明确：这次交付的对象是不是管理岗；如果是，全新安装就应该拿到管理岗基座，且安装本身不写用户数据；种子只在显式装配时进入数据。

**当前情况：**

- `DEFAULT_SOUL` 是通用长期助手身份；`SOUL.md` 是数据，种子一次、手改不覆盖（[soul.ts](../../packages/dsh-smart-assistant/src/domain/home/soul.ts#L25-L43)、[layout.ts](../../packages/dsh-smart-assistant/src/domain/home/layout.ts#L135-L162)）。
- `expert-setup` 只在 SOUL 仍是未改动的默认种子时替换成管理岗身份；知识种子按治理路径写成 `draft`，不自动 stable（[expert-setup.mjs](../../dev/deploy/expert-setup.mjs#L38-L58)）。它是仓库命令，tarball 不带。
- 预设本身已经是管理场景：`章鱼管家` 描述、管理/销售/财务技能都在 `presets/assistant/skills/`。缺的是“默认身份 + 可选种子装配”的产品化。
- 安装不应写用户数据：DSH 的 bundle 安装没有 post-install hook；在安装时自动写 `SOUL.md`/knowledge 会违反 agent/数据分离，也不可逆。

**未决问题：**

1. 这次 handoff 的对象是否就是中小企业管理者？本卡按“是”设计；若否，撤掉本卡并回 [分发合同](261025-distribution-contract.md) 说明“通用 + 可选装配”。
2. seeds 是“随包但显式导入”还是“不随包、只给仓库用户”？本卡按“随包 + 显式装配”设计；不自动导入。
3. 默认 SOUL 改成管理岗，是否要保留用户的“通用助手”选择？本卡按“默认管理岗，用户仍可编辑/替换”设计；不提供第二套身份开关。
4. 是否把 `expert-setup` 从 dev 脚本升级为随包命令？本卡按“随包只读内容 + 显式装配脚本/命令”设计；若做成 `bin`，只做数据装配，不做应用启动。

**下一步：** 先确认目标对象与管理岗默认身份；再改 `DEFAULT_SOUL`、把 seeds 纳入发布物、提供显式装配路径；最后用 prompt 证据/eval 收口。

## 已知与未决

- **已知**：默认 SOUL 是通用身份；管理岗 SOUL/seeds 在 dev-only 路径；preset 的管理技能已随包；安装时写数据不可取。
- **未决**：目标对象是否管理岗；seeds 是否随包；装配命令的形态；默认身份改动的人审口味。

## 方案与取舍

**选 A：管理岗身份做默认（agent 侧），seeds 随包但只在显式装配时导入（data 侧）。**

- 把 `DEFAULT_SOUL` 改成管理岗身份；用户首次打开就是管理岗，仍可手改 `SOUL.md` 替换。
- `seeds/management` 进发布物（或随装配件），但**安装不导入**；提供一条显式命令/脚本（把 `expert-setup` 产品化）在用户同意后写入 `draft`，不自动 stable。
- 装配幂等、只替换未改动的默认 SOUL、不覆盖主人已编辑的身份；知识种子走既有治理写路径。
- 模型可见面改动同 diff 更新 [`docs/identity.md`](../../docs/identity.md)、prompt 快照与行为 eval。

**落选的方案：**

- **保持通用 SOUL，把 expert-setup 留在 dev**：干净，但不满足 P1 的“出厂”；用户拿到的是“半专家”。
- **安装时自动导入 seeds/替换 SOUL**：安装即写用户数据、不可逆、难审；违反分离。
- **把管理岗身份做成数据种子而不是默认**：那仍然要求用户先跑装配，不是“出厂”。
- **同时提供通用/管理两套默认开关**：多一个产品选择面；本轮先用一个默认，用户可编辑。

## 验收标准

| 行为 | 类别 | 输入/状态 | 通过信号 | 负例/恢复 | 证据 owner | 人判断 |
|---|---|---|---|---|---|---|
| 全新安装即管理岗身份 | 模型行为 | 空 home，装 tgz，开新会话 | 身份段逐字是管理岗 SOUL；prompt/会话日志可重建 | 仍是通用默认 = 红；SOUL 缺失/空必须回退到管理岗默认，不是通用旧默认 | prompt snapshot / 会话日志；`tests` 断言 seed | 管理岗话术/口味是否像样 |
| 安装不写用户数据 | 确定性 | 空 home，只装包 | 安装后没有新建/修改 `SOUL.md`、`AGENTS.md`、knowledge/seeds | 安装即写 working folder = 红 | 干净 home 文件清单/时间戳断言 | 无 |
| seeds 显式装配且不自动 stable | 确定性 | 用户执行装配命令 | seeds 以 `draft` 落 knowledge；搜索/摘要不含它们；用户手改 stable 后才进 | 自动 stable/自动搜索 = 红；重复装配幂等 | 装配脚本测试；`assistant_knowledge` 读回 | 是否愿意让助手先提议再导入 |
| 不覆盖主人已编辑的 SOUL | 确定性 | 已改 `SOUL.md` 再跑装配 | 文件逐字不变；命令说明跳过原因 | 覆盖 = 红线 | 测试 + 脚本输出 | 无 |
| 发布物含装配所需内容 | 确定性 | `pnpm pack`/`export-dist` | seeds/装配件在 `files` 白名单；tarball 清单断言命中；无作者路径 | 缺 seeds = 装配不可用；带作者数据 = 红 | `export-dist` 清单断言；pack 测试 | 无 |
| 模型可见面有回归证据 | 模型行为 | 默认身份/技能变化 | `pnpm eval` 相关题不退化；identity/prompt 快照更新 | eval 红或 prompt 缺段 = 红 | `pnpm eval`、prompt 快照；`docs/identity.md` | 首答是否“像管理岗” |

## 关闭条件

- 目标对象确认；默认身份与 seeds 装配方案落地；全新安装/不写数据/幂等装配/不覆盖主人四条有证据。
- `docs/identity.md`、包 README/手册、prompt 快照与 eval 同步；发布物清单断言命中。
- 若最终选“通用 + 可选”，本卡以“不做”结档并说明 P1 的“出厂”口径改为“可选装配”；结论与残留路由到 [交付合同 note](../../notes/proposed/2026-10-25-delivery-contract.md)。
