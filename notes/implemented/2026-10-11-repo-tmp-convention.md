# 仓内临时文件唯一形式：`.tmp/<用途>/`

日期：2026-10-11 · 状态：**implemented**（用户拍板：临时文件只落仓内、只此一种形式；入口是 AGENTS.md）

## 决定

本 repo 产生的一切临时/中间文件——脚本默认落点、探针与评测产物、测试夹具、dev 启动器下插件运行时
（含 vendor 的 spill）、**进模型上下文的指令里的路径**——只落在**仓根 `.tmp/<用途>/`** 下，一个用途一个
子目录。规则本体在根 `AGENTS.md` 硬规则 8（常设指令面，含动机），本 note 只留取舍与后果。

**为什么不是洁癖**：文件沙箱只放行会话工作目录。仓外写（系统临时根、`os.tmpdir`、`$HOME`）被挡下后
转成一次人工 approval——每写一个临时文件点一次同意，等于把"全自动跑通"废掉。动机是躲审批，
顺带收益是残留与证据都在仓内、可 ignore、可一次清扫。

**机制（谁在守这条）**：

| 面 | 收口点 |
|---|---|
| 规则 | 根 `AGENTS.md` 硬规则 8；`.gitignore` 的 `.tmp/` 条目写明语义 |
| 仓内脚本 | `dev/env/tmp.mjs` 的 `tmpDir(purpose)` / `mkTmpDir(purpose, prefix)`——`dev/**` 与 `scripts/**` 的落点都经它 |
| 插件运行时 | `dev/env/dsh.mjs` 把 `TMPDIR`/`TMP`/`TEMP` 收进 `<repo>/.tmp/host/`，vendor 的 spill 随之入仓；显式导出过的人不被覆盖 |
| 测试进程 | `packages/dsh-smart-assistant/vitest.config.ts` 用 `test.env` 把临时根收进 `.tmp/vitest/` |
| 模型可见面 | `session-recall` 技能教模型把 wrapper 写进**会话工作目录**的 `.tmp/`（运行时在别人机器上，不能用本仓绝对路径） |
| 门禁 | `pnpm verify` 的 `scratch: temporary files stay under the repo .tmp/`（纯核 `scratchPathProblems`，负例夹具在 `tests/tooling/verify-gates.spec.mjs`） |

**门禁语料是"活的可执行面"**：git 跟踪的 `dev/ scripts/ docs/ snapshots/ packages/ .agents/` + 根入口文件。
`notes/` 与 `_backlog/` 保留当日路径（历史证据），`vendor/` 自带政策，被 ignore 的运行目录天然不在语料里，
门禁自己的目录（`scripts/checks/`）也不在——它必须写出被禁形式才能描述规则。它咬三种形态：绝对临时根路径
字面量、`os.tmpdir` 调用、裸 `mktemp`；注释行不算写盘（说明规则的注释不该被误杀），三形态里只有第二种
在**测试进程确被重定向**时豁免——豁免是重定向的影子，删掉重定向（或把同一个 spec 拿去裸跑）豁免随之消失。

## 输掉的方案

- **逐个改约 30 个测试文件的 `mkdtemp(join(tmpdir(), …))`**：30 处改动、30 份漂移面，而"根在哪"是一个事实。
  改在 vitest 配置一处、调用点保持原习语。代价是测试临时根依赖"经 vitest 跑"这个前提——所以门禁把豁免
  绑在重定向在场这一事实上，不绑在文件名单上。
- **只写纪律、不建门禁**：本片第一次全仓扫描就找出 20+ 处仓外落点（含模型可见的 `/tmp/zstd-cat`）；
  "每次都记得"正是会第三次漂回去的那类事。
- **让启动器无条件覆盖 `TMPDIR`**：会夺走调用者的方向盘（与出网代理同款取舍），所以只补默认值。
- **改 vendor 的 spill 默认落点**：vendor 永不改；从环境变量收口是唯一合规入口（代价：只对经本仓启动器的
  实例生效，日用实例不经它、不受影响）。更窄的旋钮是 vendor 自己给的 `spill-local` 配置 `root`（默认
  "OS 临时根下的 0700 进程目录"）——它只覆盖 spill 一个面，而 `TMPDIR` 同时覆盖同一进程里任何走临时根的
  代码，所以先取后者；将来若 spill 需要精确锚点，`root` 是那条正路（不再加第二个机制）。
- **`.tmp-<用途>/` 平级多目录**：用户拍板取"仓根一个 `.tmp/`、内部按用途分"——一条 ignore、一条门禁规则、
  一次清扫即回收。
- **照 `/Users`、`/home` 的语言门禁只扫 markdown 契约面**：这次的真落点在脚本与测试里，所以语料取可执行面；
  妥协是 `notes/` 的历史引用不进语料（它们的价值恰恰是"当时那份路径"）。

## 后果

- `.tmp/` 是运行残留：git 忽略，`pnpm verify` 的 commit-safety 与 `.gitignore` 同 diff 守它的可忽略性。
- 仓外写不再出现在活的面里；新脚本要临时目录时用 `dev/env/tmp.mjs`，新测试沿用 `os.tmpdir()`（重定向兜着）。
- 未覆盖的边界：不经本仓启动器起的实例（日用 DSH）仍用系统临时根——那不属于本仓能拥有的决定。
