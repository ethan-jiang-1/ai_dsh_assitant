日期：2026-11-01 · 状态：**proposed**（已授权，按收口卡推进）

# 插件即产品：产品 profile、工作区作业面与 run bundle 归属

## 问题（可观察行为）

这个包现在要装进用户既有 profile、再去 Settings 选预设；会话落在 DSH 的某个 Workspace（用户机器上常见是 Documents 下的默认工作区），而插件的 working folder 另在 `$DSH_HOME/assistant`。用户要的是产品：一条命令起自己的 profile，启动时指定或询问一个项目工作区；插件内容留在插件侧，一次作业的状态与产物（历史口径的 run bundle）落到用户工作区；助手的能力因此施加到用户指定的工作区上。

## 提案

1. **形态**：包仍是 bundle；另出一个**产品启动器**（演进 `bootstrap.mjs`），经已安装的 `dsh` 用官方 CLI 建/复用 `assistant` profile、装当前包、设默认 preset，然后 `dsh --profile assistant` 起 Web。不打包 DSH 运行时、不新增 app bin、不手写 profile manifest。
2. **home**：默认**产品自有 home**（`~/.dsh-<product>`，具体名由启动器定），显式设 `DSH_HOME`，不继承日用 `~/.dsh`；`--home ~/.dsh` 才是显式共享。这样产品会话/工作区/预设不与用户其他 DSH 用途混，跨 profile 缺 preset 的风险被隔离。
3. **工作区**：启动器校验并持久化 `<productHome>/assistant-product/settings.json` 的 `workspaceDir`；Host web-only 产品行在 boot 时用 `workspaceRegistry.create()` 登记，客户端用 `workspaceId` 开会话（`header.cwd` = 工作区）。路径缺失/非法不空建、不崩，给恢复面。
4. **大脑**：四房间、账本、学到的技能仍跟人走，留产品 home；**不按工作区分区**。
5. **产物**：一次作业 = `<workspace>/deliverables/<YYYY-MM-DD>-<slug>/`，README 四段（问题与假设 / 依据 / 产出 / 未决与状态）+ 交付物 + `present`；不复制会话日志，模型不强制写 session id。知识页只蒸馏、不复制正文；账本事项用 id/标题关联，不加 schema。项目 `AGENTS.md`、`.dsh/skills`、`.agents/skills` 是用户面，助手只读/建议、不静默写。
6. **headless**：产品行是 web-only，headless profile patch 里 `disabled: true`（同 `schedule` 先例），避免多一条 pending。
7. **顺序**：D0 拍板 → S1 产品行 → S2 启动器 → S3 客户端门 + 交付契约 → S4 文档/分发 → S5 收口；每片一个 commit，测试计划在收口卡尾部。

## 输掉的方案

- **B：大脑跟项目走**（每个工作区一套四房间/账本）。好处是项目可连同助手交接、业务天然隔离；代价是服务、四段落、面板、账本、备份、curate 与测试全改，且提示词段落拿不到 session/workspace，只能退到“一个实例一个工作区”或新建平台接缝。与既有 [数据面校准](../implemented/2026-10-28-data-plane-alignment.md) 的 home 单例决定相反。延后，触发 = 真实用户要求项目连同助手交接，或多业务知识串味成为实际抱怨。
- **C：混合**（身份/技能跟人，业务记忆/知识/账本跟项目）。需要 scope 前缀、摘要/检索过滤、面板展示与两处真相的长期维护；在“一个实例一个工作区”的前提下才可行。先不做。
- **默认共享日用 home**：凭据/会话直接复用，但产品会话/工作区/预设与用户其他 DSH 用途混在一起，跨 profile 打开产品会话可能缺 preset；改为产品自有 home，`--home` 保留共享出口。
- **包内 app bin / 自带运行时**：违反“只有 dsh profile 启动应用”；启动器是部署包装，仍由 `dsh --profile` 启动。
- **现在做机器 run manifest / 面板枚举**：没有消费者；先保留人可读 README，触发 = 首页“这周做了什么”、eval 核对产物或审计。
- **把知识页当交付正文**：两份正文必漂移；交付包给用户，知识页只蒸馏，run README 做桥。
- **复制会话日志进工作区**：隐私/体积/格式代际；`present` 也不复制，日志归宿主。

## 验收

完整验收矩阵、切片顺序与证据在收口卡：[插件即产品](../../_backlog/issues/261101-plugin-as-product.md)。本卡只持决定与它击败的做法；实现证据不进 note。
