---
status: 推敲中
opened: 2026-11-02
---

# 收口：发行版口径对齐（26_harness-release）

> 立卡：2026-11-02 ｜ 状态：推敲中 ｜ 已授权实施（用户 2026-11-02「开工」点名；授权事实在状态行，不在提案卡） ｜ 类型：Task ｜ 可关闭：否

## 外部结果三要素

- **触发**：用户带来一份更规整的外部语料（`_faq_on_digested/26_harness-release`），要求术语、做法与历史一起对齐，并维持高信噪比（避免上下文腐化与漂移）。
- **用户得到**：repo 里"插件怎么交出去"只有一个说法——一份发行版宪章（六轴 owner + 生命周期十段索引 + 术语表）；用户手里的 README 与安装手册按 DSH 骨架写、不再教错操作；历史不再有两篇都自称当前；退役词与新骨架由门禁守住。
- **完成条件**：本卡「发现清单」每一行都有落地动作与可指认证据；`pnpm verify` 绿；`pnpm export-dist` 自检绿且新门禁有负例造红；`standalone-smoke` / `product-smoke` 有真实结果（无浏览器则如实 BLOCKED）；决定写进 implemented note（由 [发行版口径 note](../../notes/proposed/2026-11-02-distribution-alignment.md) 在 S8 改写成 implemented）。

## 切片台账

| 片 | 内容 | 状态 | 证据 |
|---|---|---|---|
| S1 | `docs/release.md` 重写为发行版宪章：术语与判据、六轴 owner 表、生命周期十段索引、部署叙事与偏离 | 待做 | — |
| S2 | 包 README 按 DSH 七节重排；`publish-shape.mjs` 骨架同步 + 负例 | 待做 | — |
| S3 | 安装手册模板修正（headless insert、import --replace、默认 preset、配置段、建 profile 顺序、tarball checksum） | 待做 | — |
| S4 | 修 `standalone-smoke` / `product-smoke` 对"包内 bootstrap"的断言（bundle-first 后必红） | 待做 | — |
| S5 | 合同陈旧断言清零（包内 bootstrap、private、profile patch 设 default、profiles/web、六条路由、两/三根文件、SessionInspect、web-face 计数等） | 待做 | — |
| S6 | 退役词全量替换 + 门禁（退役词、骨架进 verify、六轴/十段存在性） | 待做 | — |
| S7 | 历史按 notes 取代判据逐篇处置（当前权威改真 + 指针；归档只加索引声明） | 待做 | — |
| S9 | 噪声合并：同一事实的多个"说法"按 owner 收敛（删 > 并 > 修；其余只留名字 + 指针） | 待做 | — |
| S8 | 收口：implemented note、全量证据、卡归档 | 待做 | — |

## 发现清单（逐条落地）

两轮独立审计（6 面并行 + 1 次 fresh-eyes 全链）合并去重后的全部发现；每条都要有落地动作。证据形态：`位置 → 冲突事实`。

### 术语（product 不修饰交付对象）

| ID | 发现 | 位置 | 片 |
|---|---|---|---|
| F01 | 「产品 = dedicated `assistant` profile 的组合」把交付单位说成 profile | `docs/product.md:9`、`README.md:74`、包 `README.md:8`、`_dist/安装手册.md:23` | S1/S2/S5 |
| F02 | 退役复合词「产品 profile／产品 bundle」 | `docs/product.md:3,13,19`、`docs/architecture.md:24`、`docs/dev.md:397`、`README.md:78`、`_dist/安装手册.md:54` | S5/S6 |
| F03 | 同类对象词：产品 home／产品行／产品门／产品模式／产品安装器 | `AGENTS.md:8,12,119`、`docs/product.md` 全篇、`docs/release.md:67`、`_backlog/triggers.md:30` | S6 |
| F04 | profile 归属未按 DSH 三态声明（本仓 = custom profile；发行方拥有 bundle 顺序与默认 patch） | `docs/product.md:19`、`docs/release.md` | S1 |
| F05 | 包描述把 bundle 说成 agent preset | `packages/dsh-smart-assistant/package.json` `description` | S5 |
| F06 | 归档索引仍以「插件即产品」为题 | `_backlog/_archive/research/README.md:19` | S7 |

### 做法（对齐 50 生命周期与六轴）

| ID | 发现 | 位置 | 片 |
|---|---|---|---|
| F07 | 无六轴 owner 表，「完整/可控」无法自证 | `docs/release.md` 全文 | S1 |
| F08 | 无生命周期十段索引（打包/发布/安装/初始化/特殊初始化/配置/启动/更新/卸载/文档） | `docs/release.md` | S1 |
| F09 | README 骨架自造：有架构段、缺「验证」「排障」 | 包 `README.md` §Install…§Uninstall | S2 |
| F10 | 骨架门禁钉自造七节且无负例 | `scripts/release/publish-shape.mjs:126-138` | S2 |
| F11 | 手册教 headless 写裸 `- id: agent-preset-registry`（headless 无此行，须 `insert:`） | `_dist/安装手册.md:350-352`（模板 `export-dist.mjs`） | S3 |
| F12 | 手册说恢复「要求目标目录为空」「必须先清空」，与 `import --replace` 相反（会删在用数据） | `_dist/安装手册.md:289,298,423` | S3 |
| F13 | 手册说装完 `default:` 可能仍是 `standard`（bundle patch 已设 `assistant`） | `_dist/安装手册.md:165` | S3 |
| F14 | 手册说安装器「设部署默认 `assistant`」（11-02 起不再写） | `_dist/安装手册.md:391` | S3 |
| F15 | 手册缺 `## 配置` 段；门禁只查 7 个标题却自称十段 | `_dist/安装手册.md`；`publish-shape.mjs:139-150` | S3 |
| F16 | 手册教「仍没有就按第八节写 profile patch」→ 默认值两个 owner | `_dist/安装手册.md:417` | S3 |
| F17 | CLI 行缺「先建 web 模板 profile」；全新 home 上 `dsh plugin` 只建 base-only | `docs/product.md:32`、手册 §八 | S3/S5 |
| F18 | web-only 与专用 profile 默认两个选择未登记进纪律适配表 | `docs/discipline.md` 已声明适配 | S1/S5 |
| F19 | 发布物无校验和（参考清单要求至少一项） | `scripts/release/export-dist.mjs` | S3 |
| F20 | patch 五层顺序与 `!!js` 规则未写进宪章 | `docs/release.md` | S1 |
| F21 | 手册宣传 Git/本地目录安装，但包无 `prepare`、`lib/` 被 ignore | `_dist/安装手册.md:62,71` | S3 |
| F22 | 默认部署叙事与理由（为何推荐专用 profile 而非任意 web profile）未写 | `docs/release.md`、`docs/product.md` | S1 |

### 陈旧与自相矛盾

| ID | 发现 | 位置 | 片 |
|---|---|---|---|
| F23 | 「包内 bootstrap.mjs」（实际是 `_dist` 独立资产） | `docs/release.md:10`、`docs/dev.md:19`、`docs/delivery.md:25,104`、包 `AGENTS.md:14` | S5 |
| F24 | 两条 smoke 仍断言解包后有 bootstrap 并去那里跑（bundle-first 后必红） | `standalone-smoke.mjs:56,67`、`product-smoke.mjs:59` | S4 |
| F25 | 「包仍是 private」（包已无该字段） | `docs/identity.md:45` | S5 |
| F26 | 「setup.sh + profile patch 设 default」（实际随 bundle patch） | `docs/architecture.md:395` | S5 |
| F27 | 「六条功能路由」实为七行 | `docs/architecture.md:384`、`docs/AGENTS.md:23` | S5 |
| F28 | §九「不做安装器」与 §2.2 有已发布安装器 | `docs/product.md:152` | S5 |
| F29 | 包 AGENTS 说 manifest 只声明 `dsh.bundle.patch`（还声明 `dsh.client.platform`） | 包 `AGENTS.md:9` | S5 |
| F30 | README 说无账本回退 fixture，与同文件 §Configuration 及代码默认 `false` 相反 | 包 `README.md:192` | S2 |
| F31 | 备份/诊断命令路径写 `profiles/web`（产品 profile 是 `assistant`） | `docs/delivery.md:114` | S5 |
| F32 | 「四房间、两个根文件」实为三个 | `README.md:108` | S5 |
| F33 | 只读 inspect 工具名写成 `SessionInspect`（实际 `cordis_inspect_list/query`） | `AGENTS.md:181` | S5 |
| F34 | `web-face-check --all` 计数少 2（还有 2 个产品面） | `dev/AGENTS.md:33` | S5 |
| F35 | 宪章说安装器「只写自己的默认 preset」（代码已不写） | `docs/release.md:67` | S1 |
| F36 | 宪章把市场校验记在 `export-dist`（实际在 `pnpm market`） | `docs/release.md:30` | S1 |
| F37 | 禁则「不自动改默认 preset」与 §一 bundle 默认值表述冲突 | `docs/release.md:99` | S1 |
| F38 | §九把「转 npm/registry」列为未来触发（已是主渠道） | `docs/release.md:107` | S1 |
| F39 | 宪章 README 节清单六节且漏 `Upgrade` | `docs/release.md:38` | S1 |
| F40 | 「装进任意 web profile 都直接生效」缺「需重启」 | `README.md:121` | S2 |
| F41 | 把建 profile 当启动（`--from-default-profile` 是破坏性重置且需 `--dump-config`） | `README.md:27` | S2 |
| F42 | 根 README 的安装器命令缺 `--package`，按写法必失败 | `README.md:88` | S2 |
| F43 | 手册称 Plugins 页接受 Git/本地目录，与无构建产物冲突（与 F21 同因） | `_dist/安装手册.md:62,71` | S3 |

### 历史（当前权威互相矛盾）

| ID | 发现 | 位置 | 片 |
|---|---|---|---|
| F44 | 交付合同仍写「手工 tgz 是当前渠道」、把 npm 列为输掉的方案、包内 bootstrap、README 六节 | `notes/implemented/2026-10-25-delivery-contract.md:11,13,32,40,42` | S7 |
| F45 | 产品 profile 对齐 note 第 4 条被推翻且无「部分收窄」指针 | `notes/implemented/2026-11-01-product-profile-alignment.md:18` | S7 |
| F46 | 安装面 note 说发布物两件套（现为 tgz+手册+安装器+checksum） | `notes/implemented/2026-10-21-install-surface-first-class.md:13` | S7 |
| F47 | 触发器说安装器「不做」而它已发布 | `_backlog/triggers.md:30` | S7 |
| F48 | 归档研究正文仍是"现状"口吻（D1/D5/D6 已落地） | `_backlog/_archive/research/261101-plugin-lifecycle/` | S7 |
| F49 | 归档卡里的过期读数（台账 6 行、`engines.pnpm` 安装门、产品=bundle+默认值+文档、直接 add 升级、没有 `engines.dsh`、E1–E4 漏 E5） | `_backlog/_archive/settled_issues/*`、`_backlog/research/261102-first-screen/README.md:13` | S7 |

### 门禁（防回潮）

| ID | 发现 | 位置 | 片 |
|---|---|---|---|
| F50 | 无退役词门禁 | `scripts/checks/verify.mjs` | S6 |
| F51 | 骨架门禁只在 export-dist，不进 verify | 同上 | S6 |
| F52 | 六轴表 / 十段索引无存在性检查 | 同上 | S6 |

### 噪声：同一事实的多个"说法"（先找噪声，再按 删 > 并 > 修 收敛）

判据：**一个事实一个家**。同一件事被 ≥2 个 owner 文件用不同措辞重写，就是噪声——不是"待同步的副本"。
处置只有三种：**删**（重复的复述整段去掉）、**并**（保留最该说话的那处，其余压成一句指针）、**修**（owner 自己写错）。
下表是实测的文件级分布（`grep -rIl` 于 docs/ + 三份入口 README/AGENTS + 生成手册）：

| 事实 | 唯一 owner | 现有复述（噪声面） | 处置 |
|---|---|---|---|
| 安装入口与顺序（Plugins 页 → 重启；先建 profile） | `docs/product.md` §二（策略表）＋包 README（用户步骤）＋手册（离线用户步骤） | 根 `README.md` §产品怎么开始（整段步骤）、`docs/release.md` §三（重复步骤）、`docs/dev.md` §一（安装面行） | 删根 README 的步骤段，压成 3 行 + 指针；release 只留"谁可以在哪装"的策略，不写步骤 |
| 默认 preset 的来源（bundle patch，`selectedDefault` 优先） | `docs/release.md` §一 patch 轴＋`docs/product.md` §十 override 台账 | 根 `README.md` 118–123（整段机制复述）、`docs/architecture.md` §八 🄕、包 README 安装段（第二遍）、手册 §三（第三遍） | 删根 README 整段；product/架构/manual 各压成一句读数（"`--dump-config` 应看到 `default: assistant`"），机制只讲一次 |
| 安装器（存在、在包外、职责边界） | `docs/product.md` §2.2 | `docs/release.md` §二/§三、`docs/architecture.md` §二表、`docs/identity.md` §一避让段、`docs/delivery.md` §二（整段机制）、根 `AGENTS.md` 硬规则 1、`docs/discipline.md` 适配 11、包 AGENTS、包 README、手册 | 保留 product 为 owner；delivery 只留"交接后的独立启动用发布资产"一句 + 指针；AGENTS/discipline 各留一句为什么，不重述行为 |
| web-only 面与 headless 处置 | `packages/dsh-smart-assistant/README.md`「安装」末段 | `docs/product.md` §四、`docs/architecture.md`、`docs/identity.md`、`docs/discipline.md`、包 AGENTS、手册 §九、根 `README.md` 养护定时段 | owner 给完整 YAML；其余只写"web-only，headless 显式禁用"一词 + 指针 |
| 数据归属与卸载承诺 | `docs/delivery.md` §一数据卡 | `docs/product.md` §七（速查表整张重复）、包 README「卸载与数据」、手册 §八、根 `AGENTS.md` 硬规则 1 尾段 | 删 product.md §七整表，改一句指针；其余保留面向该读者的最小行 |
| 市场索引（发现层，先发布后生成） | `docs/release.md` §三之二 | 包 README 安装末段、手册 §一/E、`docs/commands.md` market 行 | 其余压成一句；命令清单保留命令本身 |
| 兼容范围（`engines.dsh` 等三处） | `docs/release.md` §五 | 包 README「装什么」、手册「〇、安装前提」、`docs/product.md` §2.3、`packages/dsh-smart-assistant/release-verification.json` 说明 | 各留一条读数行；不复制矩阵结论 |
| 版本与标签 | `docs/release.md` §六（政策）＋`docs/dev.md` §九（操作） | 根 `README.md`、手册表头、`docs/commands.md` | 合法二分（政策/步骤），保留；不再加第三处 |
| 首次启动 / onboarding | `docs/product.md` §四 | 包 README「验证/排障」、手册 §二、`docs/architecture.md` §七链路、快照场景 README | 保留 owner + 各读者一格；快照只写"证明什么" |
| 验证读数（`--dump-config` 应看到什么） | 包 README「验证」 | `docs/release.md` §一、`docs/product.md` §2.3、手册 §三、`docs/dev.md` §六 | owner 给完整读数；其余只给"跑什么"，不给"应看到什么" |
| 只发 bundle / 发布物形态 | `docs/release.md` §二 | 根 `README.md`、包 README「装什么」、`docs/product.md` §一 | 根 README 压成一句；product 只讲 profile 归属 |

**统计口径**：`bootstrap.mjs` 出现在 13 个 owner 文件、`assistant-product` 11 个、`headless` 11 个、`Plugins 页` 7 个。
出现次数本身不是问题（指针也要写名字）；问题是**重述行为**。上表处置后，同一行为的完整描述应只剩 1 处，
其余是"名字 + 指针"。

上表自左至右共 **N01–N12**（N01 = 安装入口与顺序 …… N12 = 只发 bundle）；S9 按编号逐条处置并留证据。


1. `rg -n "产品 profile|产品 bundle|产品型|插件即产品" docs/ README.md AGENTS.md packages/*/README.md packages/*/AGENTS.md` 零命中（登记豁免行除外）。
2. `pnpm verify` 绿，且新增的三类门禁各有 prove-it-red 负例（`tests/tooling/` 同名族 spec）。
3. `pnpm export-dist` 绿：README 新骨架、手册十段（含配置）、tarball checksum 产出；**且**把骨架改坏时 export-dist 报红。
4. `pnpm product-smoke` 与 `pnpm standalone-smoke` 对 `_dist` 形态（安装器在包外）有真实结果；无浏览器 = BLOCKED exit 2，不写成绿。
5. 发现清单 F01–F52 每条能在提交或卡上指到动作与证据。
6. 噪声 N01–N12 每条有"删/并/指针"的落点：同一行为的完整描述只剩一个 owner，其余文件不再复述行为。

## 仍未取

- 首屏形态（A–D）属产品口味，在 [261102 首屏归谁](261102-first-screen.md)；本卡只写"首屏由发行版 client 回答"的原则，不改实现。
- 真 npm 发布、索引托管、Windows/Desktop 真机矩阵仍是本人动作，不在本卡。
