---
status: 已结
opened: 2026-10-25
---

# 推敲：出厂身份与首跑——默认就是管理岗，还是通用助手加可选装配

> 立卡：2026-10-25 ｜ 状态：已结 ｜ 类型：Task ｜ 可关闭：是 ｜ 毕业：做现在
>
> 结论：S2 已交付；管理岗话术/种子口味 verdict 留收口卡 ｜ 去向 = [收口卡](261025-delivery-closure.md) + [implemented note](../../../notes/implemented/2026-10-25-delivery-contract.md)

**问题与期望结果：** 产品判据 P1 要求“出厂可用的管理岗基座”，但装出来的默认身份是通用 `SOUL.md`；管理岗身份与知识种子只在 [`dev/deploy/expert-setup.mjs`](../../../dev/deploy/expert-setup.mjs) 里，而 [`dev/AGENTS.md`](../../../dev/AGENTS.md) 明说它是“仓库用，非发行命令”，`seeds/` 也不在包的 `files` 里（[package.json](../../../packages/dsh-smart-assistant/package.json)）。装出来的 preset 叫“章鱼管家”、带管理技能，但身份不是管理岗，是“半专家”。期望明确：这次交付的对象是不是管理岗；如果是，全新安装就应该拿到管理岗基座，且安装本身不写用户数据；种子只在显式装配时进入数据。

**当前情况：**

- `DEFAULT_SOUL` 是通用长期助手身份；`SOUL.md` 是数据，种子一次、手改不覆盖（[soul.ts](../../../packages/dsh-smart-assistant/src/domain/home/soul.ts)、[layout.ts](../../../packages/dsh-smart-assistant/src/domain/home/layout.ts)）。
- `expert-setup` 只在 SOUL 仍是未改动的默认种子时替换成管理岗身份；知识种子按治理路径写成 `draft`，不自动 stable（[expert-setup.mjs](../../../dev/deploy/expert-setup.mjs)）。它是仓库命令，tarball 不带。
- 预设本身已经是管理场景：`章鱼管家` 描述、管理/销售/财务技能都在 `presets/assistant/skills/`。缺的是“默认身份 + 可选种子装配”的产品化。
- 安装不应写用户数据：DSH 的 bundle 安装没有 post-install hook；在安装时自动写 `SOUL.md`/knowledge 会违反 agent/数据分离，也不可逆。

**2026-10-25 实测：** `DEFAULT_SOUL` 已是管理岗；旧通用种子只作精确迁移对象，新 home 不再种它。`seeds` 随包（tarball seeds ×8）；`bin/expert-setup.mjs` 从已安装 profile 直接跑通：8 页以 draft 落盘、重复运行幂等、已有 stable/deprecated 不回滚、编辑过的 SOUL 不覆盖。`release-smoke` 断言 `dsh plugin add` 后 `<home>/assistant` 不存在（安装零写入）；full tests 1005、`pnpm eval` 11/11。

**未决问题：** 只剩管理岗话术与 8 页种子“像样/有用”的人审口味——S5 第二机走查时取，不由 agent 代判。

**下一步：** S2 已交付；S5 走查取口味 verdict，随后按关闭条件归档。

## 已知与未决

- **已知**：默认身份管理岗；seeds 随包、显式装配为 draft；安装零写入；装配幂等且不覆盖主人编辑；eval/组合测试通过。
- **未决**：管理岗话术/种子内容的人审口味（S5 真人走查）。

## 方案与取舍

**选 A：管理岗身份做默认（agent 侧），seeds 随包但只在显式装配时导入（data 侧）。**

- 把 `DEFAULT_SOUL` 改成管理岗身份；用户首次打开就是管理岗，仍可手改 `SOUL.md` 替换。
- `seeds/management` 进发布物（或随装配件），但**安装不导入**；提供一条显式命令/脚本（把 `expert-setup` 产品化）在用户同意后写入 `draft`，不自动 stable。
- 装配幂等、只替换未改动的默认 SOUL、不覆盖主人已编辑的身份；知识种子走既有治理写路径。
- 模型可见面改动同 diff 更新 [`docs/identity.md`](../../../docs/identity.md)、prompt 快照与行为 eval。

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
- 若最终选“通用 + 可选”，本卡以“不做”结档并说明 P1 的“出厂”口径改为“可选装配”；结论与残留路由到 [交付合同 note](../../../notes/implemented/2026-10-25-delivery-contract.md)。
