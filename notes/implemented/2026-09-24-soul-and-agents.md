# 2026-09-24 · 身份与引导文件：SOUL.md + AGENTS.md（抄 Hermes 的形状，落 DSH 的地）

日期：2026-09-24 · 状态：**implemented（同日拍板 D1/D2/D3=a 并落地，红绿与真组合断言在案）** · 依据：[Hermes 调研 r4](../research/archive/2026-09-24-r4-hermes-identity-survey.md)

## 问题

家的根文件 `HOME.md` 是自造名：**没有任何装载器读它**（persona 与 digest 口头指路，agent
按需 read），不进任何"初始引导"语义；persona 是 preset 里的硬编码静态文本（`dsh-persona`
只吃字符串）——**身份是代码不是数据**，人想改"这个人是谁"只能改插件源码。现行病：dev home
的 `HOME.md` 已烂一代（仍写 Three rooms），scaffold 只在缺失时写、curate 不报漂移。

业界与 DSH 的对照（r4 §三/§六）：AGENTS.md 是跨工具惯例（DSH 原生装载器认
`AGENTS.md`/`CLAUDE.md`，项目根 + user-global `$DSH_HOME/AGENTS.md` 两档）；Hermes 用
**SOUL.md（身份）+ AGENTS.md（引导）双文件**，分工一句话：**到处适用的进 SOUL，属于一个
地方的进 AGENTS**。

## 形状（抄什么）

家根两文件，语义照 Hermes 逐条对齐：

### 构件一：`SOUL.md` —— 身份（agent 是谁、怎么说话）

- **位置**：`<home>/SOUL.md`（家根，只从家根读，不探 cwd——人格属于实例不属于项目）。
- **种子**：scaffold 缺则种（内容 = 现 persona 身份段的等价拆分，见下）；**已有永不覆盖**；
  空文件 = 不注入。
- **注入**：新 prompt section（`ctx.systemPrompt.section`，digest 同款接缝，placement 贴
  persona 位）：非空 → verbatim（注入扫描 + 字节上限截断，超限告警）；缺/空/坏 → **回退内置
  默认身份**（即今天的 persona 文本，挪进插件源码当常量）——Hermes 语义：SOUL 完全替换内置
  默认，内置默认是回退不是叠加。
- **preset persona 行**：保留（它 shadow 部署级 persona 的职能不动），prefix 缩为一句 stub，
  身份正文由我们的 section 拥有——两段不叠加（section 有文件内容时才是正文，stub 恒一句）。

### 构件二：`AGENTS.md` —— 引导（这个家怎么用：房间、出口、工具、curate）

- **位置**：`<home>/AGENTS.md`，内容 = 现 `HOME.md` 的地图角色 + persona 里的操作指引段
  （digest 是有界视图、写记忆前先加载哪个技能）——身份与操作手册按 Hermes 分工线拆开。
- **注入**：同接缝的第二个 section，随 system prompt 装载（Hermes 对项目 AGENTS.md 的做法：
  baseline 进 durable context）；**digest blurb 相应减负**（不再复述房间职责，只留家的状态面）。
  静态引导（AGENTS.md，跨请求稳定，cache 友好）与动态状态（digest：计数/精选/线索）分离。
- **漂移修法**：种子时在文件头盖 `scaffold-version:` 标记；curate 加 info finding——盘上文件
  的版本旧于当前 scaffold 版本时报"地图落后一代"（**手改不报**：手改内容不是漂移，版本标记
  才是）。病根（生成物静默腐烂）与知识房 `index.md` 不落盘是同一个教训，这里因为**人要能
  手改**不能不落盘，所以用机器检查补"错了多久能发现"。

### 明确不做的

- **不动 `$DSH_HOME/AGENTS.md` user-global 槽**：那是 DSH 原生的用户全局引导位（对所有会话
  生效，含非 preset 会话），不是插件的领地；想用的人手写即可，插件不 scaffold 不越界。
- **不动记忆房间**：Hermes 的 MEMORY.md/USER.md 角色由我们的 `memory/` 已覆盖（r4 §四）。
- **不做 `/personality` 类会话 overlay**：触发=真实需求出现。

## 决策点（已拍板 2026-09-24）

| # | 问题 | 选项 | 决定 |
|---|---|---|---|
| D1 | 引导文件名 | a) `AGENTS.md`（业界惯例 + DSH 原生同名同语义） b) `agent.md`（用户原话，单数） | **a** |
| D2 | 引导文件装载 | a) 随 system prompt 自动注入（真"初始引导"，digest 减负，静态/动态分离） b) 维持被动参考（digest 承担在场面） | **a** |
| D3 | SOUL.md 种子内容 | a) 现 persona 身份段拆出（"long-lived assistant + 三习惯"） b) 另写一份新声音 | **a**（day-0 行为零变化） |

## 分片（获批后）

1. **切片 1（身份）**：SOUL.md 文件契约 + scaffold 种子 + identity section（回退=现 persona
   文本）+ preset persona 行缩 stub + 测试 + docs/identity.md 登记。
2. **切片 2（引导）**：HOME.md → AGENTS.md 改名 + 引导 section + digest blurb 减负 +
   scaffold-version 漂移 finding + dev home 迁移（删旧烂图、种新）+ docs（home.md §五、
   architecture 布局行、AGENTS.md 布局表）+ 测试。

## 输掉的方案（保留尸体）

- **保留 HOME.md 名字**：自造名无生态对接；"它没坏"不成立——它正烂着一代且无人报。
- **身份继续住 preset**：`dsh-persona` 只吃字符串，身份改动要发版；"身份是数据"（可改可
  git 可 diff）输给不了任何东西。
- **AGENTS.md 放 `$DSH_HOME` 根骑原生装载器**：零代码，但那是 harness 的用户全局位——
  插件 scaffold 进去越界，且语义错了（我们的引导是"这个家的用法"，不是"所有会话的全局
  规则"）。
- **地图不落盘（knowledge index.md 先例，现场合成）**：无漂移可烂，但牺牲了"人手改引导"
  ——Hermes 的引导文件是用户可编辑物，这点我们抄。

## 落地证据（2026-09-24，同 diff 提交）

- **身份语义红绿**：`tests/root-files.spec.ts`（8 用例）——种子=内置默认（day 0 零变化）、
  手改逐字生效、空文件回退默认、手册缺失现场渲染当前版（缺文件永不落后）、漂移 finding
  报旧版本/静默于当前版。
- **真组合断言**：`tests/preset-composition.spec.ts` 扩为三段落——真实 Loader+roster+standing
  mount+代理路径组装 system prompt，断言 `assistant:soul` < `assistant:home-manual` <
  `assistant:memory-digest` 顺序与各段内容；`tests/service-shadow-access.spec.ts` 扩为三快照
  方法的代理回归（原 #private 翻车路径）。
- **scaffold**：`tests/layout.spec.ts`——双文件种子、幂等、手改不覆盖。
- **dev home 迁移实跑**：删旧烂图（仍写 Three rooms 的 HOME.md）→ ensureHome 种出 SOUL.md +
  AGENTS.md（`manualWritten/soulWritten: true`）→ curate 零发现、digest 1941→1530 字节
  （blurb 减负兑现，对冲手册新增的常驻重量）。
- **常驻字节对账**（提案判据「总常驻不升」修正为如实记账）：+SOUL ~740B +AGENTS ~2.6KB
  −旧 blurb ~410B ≈ **+2.9KB 常驻**，换来的是引导与身份从"口头指路+按需读"变为真实在场——
  这是 D2=a 拍板时接受的代价，如实记录。
- **旧概念清零**（用户明确指令：概念换了旧词就是噪声）：代码/测试/docs/preset 全扫——
  `HOME.md`/`HOME_MAP_*`/`mapFile`/`renderHomeMap`/「地图」措辞清空；连原计划的
  `LEGACY_HOME_MAP_FILE_NAME` 检测都删了（世上无旧家种群，那行代码本身就是迁移期噪声）；
  渲染器自带的 "Three rooms" 烂行一并修掉。历史 notes 保留原词（档案记录当时事实）。
- 门禁：typecheck ×2、test 161/161（29 文件）、verify 全绿（见提交）。
