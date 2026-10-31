---
topic: 可行性复核
intent: "对研究题与问题卡做一次对抗性复核：初衷是否对齐、哪些点还落不了地、哪些证据还没有；把修法回填到卡上。"
---

# 可行性复核：摸到了什么，还差什么

> 立档：2026-11-01 ｜ 服务卡：[插件即产品](../../issues/261101-plugin-as-product.md)
> 复核对象：本轮三份研究材料 + 问题卡 2026-11-01 初版。

## 0. 结论

**方向可行，初版卡不够落地。** 复核发现十处需要回填，集中在三件事：

1. **产品形态的默认 home 选错了**：初版推荐“用户日常 home”，会把产品会话/工作区/预设与用户其他 DSH 用途混在一起；复核改为**产品自己的 home**，`--home` 才指向日用 home。
2. **run bundle 只写了“产物文件夹”，没有接回产品原来的循环**（账本事项 / 知识页 / 学习 / 会话证据）。复核补了 authority 分家与链接约定。
3. **几处实现级硬点没在设计里交代**：headless 组合的 `connection` 注入、跨 profile 打开产品会话、模型拿不到自己的 session id、`deliverables/` 与用户既有目录混放、`product-smoke` 能证到哪一步。

修法已回填问题卡与切片材料；本材料保留复核过程，便于下次推翻或续推。

## 1. 初衷对齐（P1–P3 / O1–O6）

| 判据 | 本形态怎么服务 | 初版卡的偏差 | 复核后的落点 |
|---|---|---|---|
| **P1 出厂可用的管理岗基座** | 产品形态不改内容；首屏仍是一页纸；第一件事仍应是管理岗质量的拆解 | 验收矩阵几乎全是机制，没有一条“首跑出来的东西像样” | 验收加一行产品级人判/eval：首跑任务产出管理岗质量的一页/交付包 |
| **P2 跟人做几件事就学得进去** | 大脑跟人走，跨工作区学习不碎；run README 记“依据”可引 `memory:`/`knowledge:`/旧 run | 没写学习循环在新形态里怎么继续；产物与知识页可能各写一份 | run README 的“依据”成为学习链；知识页只放蒸馏，不复制交付物；项目 `AGENTS.md`/项目技能做项目级特化 |
| **P3 学到的东西管得住** | 房间仍是人可读文件；run 文件夹也是人可读；curate 仍查房间 | run 文件夹不在 curate 检查面内，也没说谁管 | 明确 run 文件夹是用户内容、无生命周期管理；curate 只管家；run 的治理靠 README 与用户 |
| **O1 拆得对、说得清出处** | 交付包 README 记依据；知识页 sources 仍在 | 初版只写“含问题/依据/产出/状态”，没定格式 | README 固定四段：问题与假设 / 依据（含来源定位）/ 产出 / 未决与状态 |
| **O2 办得成** | 产物落在用户项目，可被拿走/采用；`present` 声明 | 没接回“今天”桌面；用户可能在侧栏与文件夹之间两头找 | 明确 v1 不做 desk→deliverable 直开；作为延后项与触发（用户找不到产物时） |
| **O3 知道自己不知道** | 不变 | — | 不在本卡范围；继续由 persona/手册管 |
| **O4 越用越像本人** | 大脑全局 + run 历史 + 项目笔记 | 没写“像本人”的证据面 | run README 记“本人这次怎么判的”；知识页蒸馏；评测仍走 `eval:domain` 人判 |
| **O5 装得上（企业环境）** | 启动器把三步装配收成一条命令 | 初版把“产品”说得像非技术用户可用；实际上仍要 Node/pnpm/dsh/tarball | 明确这是 O5 的一步，不是 O5 完成；真正的安装器/签名/离线是另一个决定，进“仍未取” |
| **O6 管得住（权限与数据）** | 产品 home 独立、产物在用户项目、无 IM、本地 | 初版默认共享日用 home，数据边界反而模糊 | 默认产品 home；`--home` 才共享；文档写清两物归属 |

**一句话**：新形态应当让“数字分身”更容易被用起来、产物更容易被拿走，而不是把产品做成一套更漂亮的装配器。初版卡的机制面够了，产品面不够；这次复核补的是产品面。

## 2. 十处需要回填的缺口

| # | 缺口 | 为什么重要 | 修法 | 回填到 |
|---|---|---|---|---|
| 1 | **默认 home 选错** | 共享日用 home 会让产品会话、工作区、预设与用户其他 DSH 用途混在一起；跨 profile 打开产品会话还可能缺 preset；也迫使仓库硬规则 1 改口径 | 默认**产品自己的 home**（`~/.dsh-<product>`，具体名在命名点定）；`--home ~/.dsh` 才共享；产品启动器显式设 `DSH_HOME`，不继承日用的 | 问题卡拍板点 3、切片 2、材料 2 §5 |
| 2 | **headless 组合的 `connection` 注入** | 探针已见：`connection` 只在 web-app 组合里，现有 4 条 web-only 行在 headless pending 并打 `warning: 4 entries did not activate`；产品行若必注入它，会多一条 pending | **一行 web-only 产品行 + headless profile patch `disabled: true`**（同 `schedule` 先例）；optional inject / 拆 core 只作备选；产品行禁用后零新增 | 问题卡验收行 3/5、切片 1、材料 3 §1/§4、[技术探针](261101-technical-probes.md) |
| 3 | **跨 profile 打开产品会话** | 会话是 home 共享的；用户在产品 home 里另建/使用别的 profile 打开产品会话时，`assistant` preset 可能不在组合里，行为未验证 | 切片 1/3 用探针确认：能开/不能开/如何报错；文档先声明“产品会话从产品入口打开”；必要时给一个可读的失败提示 | 问题卡验收行 8、材料 1 §8、材料 3 §5 |
| 4 | **模型拿不到自己的 session id** | 初版要求 run README 写 session id；模型上下文不保证有这个值，写了也可能是编的 | run 的身份 = 文件夹名 + 日期；session id 由 Host/后续机器 manifest 补；README 不强制模型写 session id | 问题卡 run bundle 段与验收行 6、材料 2 §4 |
| 5 | **`deliverables/` 与用户既有目录混放** | 用户项目可能已有 `deliverables/`，产品的 run 文件夹会与用户自己的文件混在一起 | 拍板点 2 增一个子选择：直接放 `deliverables/`（简单、复用惯例）vs `deliverables/<product>/`（隔离但多一层）；默认前者，README 说明 | 问题卡拍板点 2、材料 2 §4 |
| 6 | **首次“问 workspace”的形态** | 启动器 TTY 询问是确定性做法，但 CEO 产品的第一屏更像在 GUI 里选目录；两种体验差别很大 | 拍板点 3 增一列：v1 CLI 提示（推荐，简单确定）/ 客户端目录选择器（更产品，但要处理 native/browse 两条路与取消） | 问题卡拍板点 3、材料 3 §2 切片 3 |
| 7 | **product-smoke 能证到哪一步** | 它可以证 profile/登记/URL，不能证“会话 cwd 就是工作区”；把两者混在一行会假绿 | 证据拆开：登记 = product-smoke 读 `storages/workspace.json`；会话 cwd = host/composition spec 或 Web 探针（带 token 建会话读 header） | 问题卡验收行 1/3、材料 3 §3 |
| 8 | **profile 所有权与覆盖** | 用户可能在 `assistant` profile 里装别的插件；启动器“版本对账”不能清掉用户改动 | 启动器只碰自己的依赖 + registry 默认行；其余 profile 内容保留；外来同名 profile 拒绝；升级失败保留旧装 | 问题卡启动器段、验收行 1/8、材料 3 §1 |
| 9 | **工作区不是只有 `deliverables/`** | DSH 原生从项目根读 `AGENTS.md`，项目技能根 `.agents/skills` 也按项目发现；产品若只认 `deliverables/`，就丢掉了“能力施加到工作区”的一半，还会让项目技能遮蔽学到的技能时无人解释 | 工作区合同加两条：`AGENTS.md` 是用户所有的项目笔记（助手可读，写要本人确认）；`.agents/skills/` 是用户所有的项目技能（助手可建议，不静默写）；项目技能 rank 100 会遮蔽学到的 300，curate 的 `skill-shadowed` 要能解释 | 问题卡工作区段、材料 2 §3.5、材料 3 §1 |
| 10 | **run bundle 与知识页/账本的 authority 没分** | 同一份决策备忘可能同时出现在工作区交付包、知识页、账本事项里；谁是真值不清 | 明确四件物：工作区交付包 = 用户可拿走的完整文档（authority for the user-facing text）；知识页 = 助手蒸馏的理解/教训（不是副本）；账本事项 = 业务状态；run README = 一次作业的记录与链接（不是第三份正文） | 问题卡 run bundle 段、材料 2 §4.5、验收行 6 |

补充两条不是缺口但必须写进边界的：

- **O5 不是本轮完成**：启动器仍要求 Node/pnpm/dsh 与 tarball；非技术用户的安装器、签名、离线包是另一个决定，进“仍未取”。
- **日用 `~/.dsh` 的硬规则不用反转**：默认产品 home 后，仓库硬规则 1 继续成立；`--home ~/.dsh` 是用户显式选择，启动器给警告即可。

## 3. 数据卡补丁：四件物与两个项目面

### 3.1 一次作业的四件物

| 物 | 位置 | Authority | 关系 |
|---|---|---|---|
| 交付包（用户文档） | `<workspace>/deliverables/<date>-<slug>/` | 用户可拿走的完整正文 | run README 指向它；`present` 声明 |
| run README（记录） | 同目录 `README.md` | 这次作业的问/据/出/未决/状态 | 不是第三份正文；记录链接与判断 |
| 知识页（蒸馏） | `<home>/assistant/knowledge/` | 助手可复用的理解/教训；draft→stable 人审 | 不复制交付正文；来源可指向记忆/研究/URL；不强制指向工作区路径 |
| 账本事项（状态） | `<home>/assistant-operating/ledger.json` | 业务进展/待办/复查 | 与交付包通过 id/标题关联；不为它加 schema |

**判据**：用户拿走的和助手记住的不是同一份；一个给外部，一个给内部。run README 是桥，不是第二份正文。

### 3.2 工作区的两个原生面

| 面 | Owner | 助手怎么碰 | 与产品机制的关系 |
|---|---|---|---|
| `<workspace>/AGENTS.md` | 用户 | 读；建议追加；不静默覆盖 | DSH 原生装载器从项目根读；项目级事实的合法落点 |
| `<workspace>/.agents/skills/` | 用户 | 读；建议；不静默写 | 项目技能 rank 100，会遮蔽学到的 300；curate 的 `skill-shadowed` 要能解释 |

**判据**：产品不把项目知识搬到家里，也不把家里的知识偷偷写进项目；两边各有 owner。

## 4. “摸透了吗 / 准备透了吗”

### 已经摸透、可以现在拍板的

- 平台硬约束：没有 `--workspace`；profile 只能经 CLI 建；会话 cwd 创建后不可变；段落拿不到 session；present 只记路径。
- 数据归属的 A/B/C 三个方向与代价。
- 产品 home 的默认选择（复核后改为自有 home）。
- run bundle v0 的形态与 authority 分家。
- 启动器经官方 CLI 建 profile、只碰自己的依赖与默认行。
- **boot 登记 + `workspaceId` 会话 cwd 已由探针证明**（`storages/workspace.json` 持久化；`header.cwd` = 工作区）。
- **headless pending 的真实形态已由探针证明**（4 条既有 web-only 行；产品行禁用/接受）。
- **缺 preset 的失败码已由探针证明**（`agent-preset/not-found`）。
- **产品行的设置/登记/GET/POST 集成形状已由探针证明**（owner token cookie）。
- 手册预算 11,936/14,336；项目技能 rank 100/200；`present`/导出边界；知识页 source 与账本 matter 字段。

### 还没摸透、必须切片内证实才能算数的

1. 无会话首屏/客户端门/恢复面的真渲染（浏览器；`web-expected` + client spec）。
2. 产品行的错误态/原子写/并发（host spec；探针用的是内联普通写）。
3. 启动器自身代码：profile 建/装/版本对账/失败回滚（product-smoke 的升级分支）。
4. 模型是否稳定按手册写 `deliverables/<date>-<slug>/`（prompt-smoke + 有 key 的 eval/真机；无 key = BLOCKED）。
5. Windows/Desktop（沿用现有边界，不宣称）。

**结论**：现在“可以拍板方向”，剩余未知都是**切片内实现级**，不是架构未知；问题卡的 D0 拍板 + S1 的 host spec / S2 的 product-smoke / S3 的真机，就是“准备透”的门。技术读数见 [技术探针](261101-technical-probes.md)，文件级落地见 [落地蓝图](261101-landing-blueprint.md)。

## 5. 回填清单（本复核改了什么）

- **问题卡**：加初衷对齐；拍板点 3 改为产品自有 home + 首次询问形态；拍板点 2 补 `deliverables/` 混放选择；run bundle 补四件物与 authority 分家、去掉 session id 硬要求；工作区补 `AGENTS.md`/项目技能；验收矩阵补 headless、跨 profile、证据拆分、产品级首跑；仍未取补 O5/desk 直开/首跑 GUI。
- **材料 2**：布局改产品 home；补 §3.5 项目面与 §4.5 四件物；备份矩阵按产品 home 重写；补账本 scope 与项目技能遮蔽。
- **材料 3**：切片 1 补 web-only 行/headless disable；切片 2 补产品 home/profile 所有权；切片 3 补首次询问与项目面；证据拆分；风险补跨 profile/模型 session id/O5；原型补 headless 与跨 profile。
- **新增材料**：[技术探针](261101-technical-probes.md)（headless pending / boot 登记 + 会话 cwd / 缺 preset 失败码）与 [落地蓝图](261101-landing-blueprint.md)（切片 1–3 的文件/API/测试级）。
- **题名页与索引**：材料数 3→6（复核、技术探针、落地蓝图）。

## 6. 仍然需要本人决定的（不藏在复核里）

1. 大脑跟谁走：A 跟人（推荐）/ B 跟项目 / C 混合。
2. run bundle：`deliverables/` 根（推荐）/ `deliverables/<product>/` / 隐藏 / 分家 / 机器 manifest。
3. 产品 home：自有 home（推荐）/ 共享日用 home；首次询问：CLI（推荐 v1）/ GUI 选择器。
4. 命名：profile `assistant`、产物 `deliverables`（推荐）/ 其他。

其余实现级未知由切片 1 前原型收口，不需要本人拍。
