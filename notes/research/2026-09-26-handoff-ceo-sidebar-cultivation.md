# Handoff：CEO 助手的 Sidebar 培养面（交接给新 Agent）

日期：2026-09-26 · 状态：**进行中**（交接文档；工作未完成，本文件是接手的入口）
交接人：责任圈会话（第 18–24 圈）· 接手人：新 Agent

---

## 0. 一分钟上手

```sh
cd /Users/bowhead/ai_dsh_assitant

# 1) 读这三份（按序）
#    AGENTS.md          —— 七条硬规则 + 命令表 + 探索路由
#    ROADMAP.md         —— 当前队列（▶ 条目就是本工作）
#    notes/proposed/2026-09-25-ceo-sidebar-ux.md  —— 本工作的活动卡（§〇 状态一览）

# 2) 起 Web UI（必须从干净目录起，否则会话会读到开发仓的 AGENTS.md）
cd /tmp/desk && node /Users/bowhead/ai_dsh_assitant/scripts/dsh.mjs --profile dev --port 0 --no-open
# 输出里有 URL（带 token）

# 3) 交付给用户之前必须过 preflight（会查 boot 图 + Remote 清单 + desk 文件内容段）
cd /Users/bowhead/ai_dsh_assitant && node scripts/webui-preflight.mjs '<URL>'

# 4) 改动后的最小验证
node scripts/verify.mjs                 # 机械门禁 31 项
cd packages/dsh-smart-assistant && npx vitest run   # 本包测试（36 通过 / 1 已知降级失败文件）
```

---

## 1. 你接手的是什么

**产品**：`dsh-smart-assistant` —— 一个 DSH 插件仓，做一个"领域专家式助手"（给 agent 一个跨会话的
working folder：记忆 / 探索线索 / 知识 / 技能 + 养护检查）。

**北极星**（用户 2026-09-25 拍板）：**中小企业 CEO/VP 的数字分身**——管理岗基座 + 跟人配合即学进去；
立场=辅助本人（不代他出面）；首位真人=用户本人；首批任务=复杂经营问题的拆解与行动计划。

**当前焦点（用户拍板的进行中 Goal）**：**CEO 助手的 Sidebar 培养面**——把 DSH Web 客户端的三个面板
做成"培养数字分身"的界面。用户原话："**助手有时候昏的话，至少能指出来你这玩意在哪儿弄错了。要培养
数字分身啊**"。

**用户拍板的优先级**：**先把表达/UX 想透、看得见，再落实底层实现**（"表达上思考清楚了之后，UX 体验
出来了之后，咱们再把底下落实的东西给落实了"）。

**Goal 本体**：会话里有一个 active goal（`goal-de6aa24c-…`），objective 写着完整职责、当前焦点、
本轮已完成、已知阻塞、五条长期纪律、证据阶梯与红线。**接手前先 `get_goal` 读它。**

---

## 2. 现在到哪了

### 已完成（全部有 live 证据）

| 能力 | 说明 |
|---|---|
| **三个 sidebar 面板** | 我的桌面 / 知识室 / 记忆室（左侧 sidebar 三个图标，点开在主区域；DSH 的 `sidebar.panellist` + `main` 机制） |
| **桌面协议** | 助手经 `desk-refresh` 技能维护会话工作区的 `.desk/state.json`；面板经**已在清单里的** `workspaceFiles` Remote 命名空间读它 |
| **培养循环（四类对象都可就地处置）** | 记忆（这条记错了）、知识页（批准 / 有问题 / 过时了）、技能（有问题 / 没用了）、线索（问进展 / 先放放 / 收了）、决定（回答 / 看选项） |
| **行动计划有家** | `action-plan` 技能把计划落成 `type: plan` 的知识页；桌面「在办的事」从它提取（真跑出 6 条，四要素齐全） |
| **其它桌面栏** | 等你决定 / 缺什么（gaps）/ 在跟的事 / 它最近做了什么（recentActivity）/ 我记住的规模 |
| **信任线** | 每条记忆/知识页显示出处（`source`/`sources`），更正的记录出处写着"用户 … 更正" |
| **新鲜度** | 面板显示 `generatedAt`；落后对话超过一分钟就告警"对话比这份桌面新…点刷新"；会话更新后自动重读 |
| **preflight 关口** | ⑤a boot 图可满足性、⑤b Remote 清单校验、⑥ desk 文件内容段检查（防"交一个啥都看不到的 URL"） |
| **面板渲染测试** | `tests/client-panels.spec.ts`（5 个测试：分段渲染、生命周期动作、出处、空态、陈旧告警） |
| **新能力** | `promote_page` / `deprecate_page`（服务方法 + 工具动作 + 回执分支，live 探针验过） |

### 待办（都记在卡里）

1. **形态已拍板（2026-09-26，用户）：右侧栏 tab**——机制已查清（卡 §四·五），body 直接拿到
   sessionId（还顺便解决"读哪个工作区"的问题），待开工。
2. **用户的实测反馈**：更正循环/决定回答/行动处置都只经过代理会话验证，**没有真人用过**。
   助手已把"你亲手试一次更正循环"作为一条决定提上桌面。
3. **底层实现（用户拍板后置）**：自有 Remote 命名空间的 typert 集成（见 §3.4）。
4. 规模：面板没有检索/过滤，知识页上百后需要。

---

## 3. 架构与机制（血泪教训，别再踩一遍）

### 3.1 desk 文件协议（为什么不用 Remote 命名空间）

助手用**自己已有的工具**维护会话工作区里的 `.desk/state.json`；面板用 `remote.workspaceFiles.read(sessionId, '.desk/state.json', {})`
读它（Result 包装：`{ ok, value: { text } }`）。字段与填法写在模型用技能
`packages/dsh-smart-assistant/presets/assistant/skills/desk-refresh/SKILL.md`。

**契约**：`generatedBy` / `generatedAt` / `counts` / `decisions[]` / `actions[]` / `gaps[]` / `threads[]` /
`memories[]` / `knowledge[]` / `skills[]`（后两者带 `sources` / `kind`）。

### 3.2–3.4 客户端机制四事实（权威是开发技能，不在交接文档复述）

client 是 classic script 不是 ESM（一条 import/export 就解析错误、杀掉同一 combo 里之后的所有注册）、
一切可见面走 slot 系统（`inject`+`register`，**注册 tab 类型 ≠ 出现 tab**）、Remote 代理按 inject 声明
物化（`Object.keys(remote)` 为空是正常的）、**仓外插件开不了新的 Remote 命名空间**（清单由 typert
生成器从 vendor 工作区构建期产出；可用的替代 = 清单内已有的 27 个命名空间）——

四条的**完整展开与验证循环的权威是开发技能 [`client-ui-contribution`](../../.agents/skills/client-ui-contribution/SKILL.md)**；
typert 阻塞的证据链与死路回退（DeskRemote 整段删除）在[卡 §四·二](../proposed/2026-09-25-ceo-sidebar-ux.md)。
（旧版在本节逐条复述，与技能双写——2026-09-26 审计拆除，见[清理卡](../implemented/2026-09-26-signal-noise-sweep.md)。）

### 3.5 两道闸门是纪律，不是机械门禁（诚实记录）

`promote_page` / `deprecate_page` **没有**机械校验"委托人确实批准过"——agent 单次调用就能翻页/退役。
可审计的证据只有 frontmatter 的 `status` 与回执留痕。能做的：工具描述写死前提 + 面板把动作做成明确的
用户点击 + 回执报出改了哪一页。另：`sources` 也不校验目标存在（`"probe"` 也接受）。

---

## 4. 关键文件

| 文件 | 是什么 |
|---|---|
| `packages/dsh-smart-assistant/src/client/index.ts` | **面板的全部实现**（三个面板 + 共享 desk store + 所有动作发送器） |
| `packages/dsh-smart-assistant/presets/assistant/skills/desk-refresh/SKILL.md` | 模型用技能：desk 文件契约与填法（**改面板字段必须同步改它**） |
| `packages/dsh-smart-assistant/presets/assistant/skills/action-plan/SKILL.md` | 行动计划技能（含"计划必须落成 plan 页"） |
| `packages/dsh-smart-assistant/src/index.ts` | AssistantMemory 服务（`writePage` / `promotePage` / `deprecatePage` / `listKnowledge` / `digest` …） |
| `packages/dsh-smart-assistant/src/learn/index.ts` | `assistant_reflect` 工具（动作集 + 回执 render） |
| `packages/dsh-smart-assistant/src/tool-research/index.ts` | `assistant_research` 工具（线索生命周期） |
| `scripts/webui-preflight.mjs` | 交付前关口（boot 图 + Remote 清单 + desk 文件内容段） |
| `packages/dsh-smart-assistant/tests/client-panels.spec.ts` | 面板渲染测试（装置：装门面 → 求值脚本 → 带 hook shim 物化工厂） |
| `notes/proposed/2026-09-25-ceo-sidebar-ux.md` | **活动卡**：状态一览、设计、机制、证据、输掉的方案 |
| `.agents/skills/client-ui-contribution/SKILL.md` | 开发技能：怎么给 DSH Web 客户端加界面（四个坑 + 验证循环） |

---

## 5. 怎么跑、怎么验

```sh
# 起 Web UI（干净目录！）
cd /tmp/desk && node /Users/bowhead/ai_dsh_assitant/scripts/dsh.mjs --profile dev --port 0 --no-open

# 交付前关口（必须绿；它会报 desk 文件的段）
cd /Users/bowhead/ai_dsh_assitant && node scripts/webui-preflight.mjs '<URL>'

# 机械门禁 + 测试（pnpm 直跑即可）
node scripts/verify.mjs
pnpm test        # 全仓；只要本包时 cd packages/dsh-smart-assistant && npx vitest run

# preset 挂载的 one-shot（验证模型面行为；如让助手刷新桌面）
cd /tmp/desk && node /Users/bowhead/ai_dsh_assitant/scripts/dsh.mjs --profile dev-task \
  --patch /Users/bowhead/ai_dsh_assitant/dev/preset-runner.patch.yml "刷新我的桌面。"

# 组合里有没有这一行（boot-free：不加载 loader entries，故不能当"能 boot"的证据）
node scripts/dsh.mjs --profile dev --dump-config | grep -A3 '<row id>'
```

**历史坑（已修，别再绕）**：2026-09-26 之前 pnpm 曾被依赖前置检查挡住（package.json 与 lockfile 不一致时
报 `xlsx` integrity，源于误加的 peerDep）——旧版交接文档教的 `npx` 绕过法已随修复过时删除，
`pnpm build` / `pnpm test` 现在**直跑**（2026-09-26 实测 build exit 0）。仍然有效的教训：**别给 package.json
加 vendor 依赖**——本仓约定 vendor 包不声明为依赖（靠工作区 + tsconfig 路径解析），加了会让 pnpm 全家挂
（踩过，已回退）。vendor lefthook postinstall 卡 `verify-deps` 的正牌绕法见 [`docs/dev.md`](../../docs/dev.md) §三。

---

## 6. 纪律（用户拍板，长期有效）

1. **生态插件只借思路，不装包**（第七条硬规则）：先看 popularity 与内部思路；要那个功能就自建。
2. **环境修复必须固化成可重跑脚本**（修复只存在于手上＝没修复；范式 `pnpm repair-vendor`）。
3. **步步为营**：一个锚点一提交；死路 git 回退并记 note。
4. **交给人之前 preflight 必须绿，且必须验"人打开能看到东西"**（用户原话："让我评估的时候，
   环境一定要准备好"）。
5. **进行中的工作显性化到 `notes/proposed/` 并登记 ROADMAP**（看不见的工作等于没在做）。
6. 红线：`vendor/dsh/` 永不改（只走 `pnpm sync-dsh`）、不碰 `~/.dsh`、**提交只 add 自己的路径**
   （同仓有并行会话）、报告只列真跑过的命令。

---

## 7. 下一圈候选（按价值）

1. **形态**：右侧栏 tab（用户一句话就能定；机制已查清）。
2. **真人反馈**：等用户亲手用一次更正循环 → 按反馈改表达。
3. **规模**：面板加检索/过滤（知识页/记忆多了之后）。
4. **底层**：typert 清单集成（用户拍板后置；卡 §四·二 有完整证据链与三段注册方式）。
5. 其它可做：把"等你说"的（决定）做成可折叠历史；行动按状态分组（在办/已完成）。

---

## 8. 环境快照（写这份时）

- 最后一次交付 URL：见会话末尾（服务器可能已死，按 §5 重启；**每次都要重跑 preflight**）。
- dev home：`dev/harness-home/assistant/` —— 记忆 7 条、知识页 14（含 3 页管理视角 draft + 1 页 Q3 计划）、
  技能 2 件学来的 + 9 件随包、线索 1 条。
- desk 文件：`<会话工作区>/.desk/state.json`（仓根与 /tmp/desk 各有一份；`.desk/` 已在 `.gitignore`）。
- 工作树里可能有**并行会话**的未提交改动（README/docs/notes 等）——**不是你的，别碰、别提交**。
