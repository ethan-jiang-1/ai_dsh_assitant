# 身份与命名（第 0 天清单 · 已锁定）

> 判别式：**被机器在边界上引用或持久化的名字是身份，只被人读的名字是皮肤。**
> 身份名发布后改一次就是一次断兼容；皮肤随时改。本表是身份的**唯一权威**，
> 代码、patch、preset、文档一律以本表为准；`pnpm verify` 机械校验其一致性。

## 一、身份（已锁定）

> **当前声明的完整清单**（入口 × 平面 × 组合行 id、工具 × 动词）以生成物 [`package-catalog.md`](package-catalog.md) 为准；
> 本表拥有的是**语义与改名代价**，不是"当前有哪些"。

| # | 名字 | 取值 | 文法 / 约束 | 谁钉死了它 | 改名代价 |
|---|---|---|---|---|---|
| 1 | npm 包名 | `dsh-smart-assistant` | npm 规则；含 `dsh` 便于生态发现 | npm registry 全局；profile 层清单按真实安装名 reconcile | = 发新包，老用户不升级 |
| 2 | 插件行 id（前缀 `assistant-`） | `assistant-memory`（host）<br>`assistant-knowledge-approve`（host；知识批准服务行，无 config，client 直调当前回退）<br>`assistant-desk-projection`（host；固定只读投影下载，无经营写入）<br>`assistant-operating-ledger`（host；权威经营账本单 writer，独立 `assistant-operating` dataDir，首次写才认领锁）<br>`assistant-memory-tool`（agent）<br>`assistant-research-tool`（agent）<br>`assistant-operating-tool`（agent；经营账本工具，消费 host 行服务）<br>`assistant-knowledge-tool`（agent）<br>`assistant-memory-digest`（agent）<br>`assistant-home-preamble`（agent）<br>`assistant-operating-brief`（agent；经营账本提示词段落）<br>`assistant-learn`（agent）<br>`assistant-ov-shield`（agent；治理遮蔽行，`denyToolPrefix`/`denyServerResources`/`shadowSkills` 三 config 键） | 无强制文法，组合内唯一 | patch 按 id 做**整行配置替换**；`--dump-config` | 下游 patch overlay 落空 |
| 3 | ctx 服务键 | `assistantMemory`、`assistantOperatingLedger` | 与 Service Definition 同名 | 其他插件的 `inject`；capability-seams 生成目录 | 所有 Consumer 的 `inject` 断 |
| 4 | 工具 wire 名 | `assistant_memory`、`assistant_research`、`assistant_reflect`、`assistant_knowledge`、`assistant_operating` | 短 kebab / snake_case，生态惯例；**带专家前缀**（一个专家一个前缀） | **会话日志逐字记录** `tool/call.name`；`tool.call.toolview` slot 按名 keyed | 旧会话重放断 |
| 5 | SessionEventMap 事件名 | **day 0 不新增**（延后项表：`docs/architecture.md` §六） | 必须先声明 merging 进 map 才能写日志 | 事件名写进 JSONL | 旧日志读不出 = 格式迁移级 |
| 6 | preset id | `assistant` | `[a-z0-9][a-z0-9-]*`；id 是 `agent-preset` 行的 `config.id`（0.1.7 起不再是目录名） | registry 解析；会话切换记录进日志 | 用户会话的 preset 引用断 |
| 7 | settings namespace | `assistant`（**保留，day 0 不注册**） | 小写字母/数字/连字符 | 用户覆盖层按 namespace 持久化 | 用户设置被孤儿化 |
| 8 | slot 域名 | **消费方清单 = 生成物** [`package-catalog.md`](package-catalog.md)「客户端座位面」节（生成器从 `src/client/` 模块树抽取，freshness 门禁守）；都是 DSH 的域名，我们没有自有域名——不对外暴露注入面 | `<domain>.<entry>.<hole>`；消费方按注册方的键取值 | 注册方（vendor）与消费方的合约 | 换一个消费的槽位名＝改我们这一侧；自有域名将来若建，才需要一次命名 |

**避开 DSH 保留面**（不是我们的命名空间）：`@deepseek-ai` scope、核心 ctx 服务名（`ctx.agents` 等）、
shipped preset id（`standard`/`ptc`/`cordis`/`minimal`）、保留 profile 名（`web`/`headless`/`sdk`/`sdk-minimal`/`acp`/`desktop`）、
核心事件名（`SessionEventMap` 成员，以钉住 vendor 的定义为准）、home 布局（`~/.dsh`、`profiles/`、`.agent-presets`、`sessions/`）。包不得带 `bin`。

## 二、皮肤（随时可改，零身份代价）

preset 显示名与描述（`cordis.patch.yml` 的 `preset-assistant` 行 config）、一切 UI 文案（走 locale）、`SOUL.md`/`AGENTS.md` 的措辞与内置回退身份文本、技能正文、
Web 壳的页标题、图标与侧栏品牌（`src/host/web-branding.ts` 注入行 + `src/client/brand.ts` 的
`sidebar.brand.*` slot 占位；侧栏名 `BRAND_NAME`「章鱼管家」，页签标题 `DEFAULT_WEB_TITLE`「章鱼管家 · 本地经营总管」）。
工具 **description 是中间地带**：名字是身份，description 是**模型可见输入** —— 改它不是改名，
是**行为变更**，要走 model-visible 纪律（配快照）。

## 三、刻意不做（第 0 天）

三个"刻意不做"——**不新增 SessionEventMap 成员、不注册 settings namespace、不做跨出通用座位的专属 Web 卡面**
（＝自有 slot 域名；品牌、记忆/知识两间的房间 tab 与经营桌面投影消费的都是 DSH 通用座位，清单见生成物
[`package-catalog.md`](package-catalog.md)「客户端座位面」节）——
都是**延后**而非永久否决。理由与触发条件的唯一出处是 `docs/architecture.md` 第六节延后项表；
本表只管身份面：触发后按 §一 的文法与代价登记新行，涉及模型可见文案时按第二节走 model-visible 纪律。

## 四、改名窗口

- **发布前**：全部可改，只有 repo 内部引用跟着动 —— 这正是现在的窗口（包仍是 `private`）。
- **有用户安装后**：按上表逐行断，须按破坏性变更发 major 并写迁移说明。
- **折中通道**：工具名可经 Config 暴露为部署参数（`tool-subagent` 的 `toolName` 先例），
  把"名字"从代码身份降级为部署选择 —— 但它不撤销历史日志里的旧名。
