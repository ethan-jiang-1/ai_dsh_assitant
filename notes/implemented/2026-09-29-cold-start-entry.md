# 决策：起服务的第一步必须在入口就显式（fresh agent 不必摸索）

日期：2026-09-29 · 状态：**implemented**

## 问题

**一个全新的 agent 会话进入本仓，能不能在第一次读入口时就明白"怎么把服务起起来"，而不靠摸索？**

实测（`ASSISTANT_DSH_HOME=/tmp/… pnpm dsh --profile dev --dump-config`，空 home）暴露两处缺口：

1. 跳过 `dev/setup.sh` 直接起服务，DSH 的回答是
   `Error: dsh: profile "dev" does not exist; create it with 'dsh plugin --profile dev add <package>'`
   —— 照它做只能得到官方模板 profile：本插件的 bundle 与 roster 指向都不在里面。
   报错**主动把人指向错的命令**，这是"摸索半天"的机械根因。
2. 启动链还有一节谁都没串起来：boot 需要 `vendor/dsh` 的构建产物（依赖 / native addon / host+client lib /
   web dist），而它们是 `docs/dev.md` §三 里**给人逐条敲**的四条命令。漏一条，失败点是 `dev/setup.sh`
   的守卫——它 fail loud，但只报"没建"，不替你把构建跑一遍。

**错了赔得起吗？** 赔得起（都落 dev home），但**代价是每一个新会话的摸索时间**，而新会话就是本仓最常见的读者。
**错了多久能发现？** 只要它按命令表做，第一步就撞——所以这不是边角，是主路。

## 决策

1. **入口（根 `AGENTS.md` 命令表）把启动链拆成"按序跑到底"的一段**，两个前置都点名、标成第一步，
   profile 起服务命令在它们之后；「开发环与舱内工具」独立成第二段，不再与起服务混在一张表里。
2. **`dev/prepare.sh` 包装 §三 的首次构建**：幂等（产物在位即跳过）、逐个产物探存在性，
   并且把两个已知约束写进代码——vendor 根 `postinstall`（lefthook）在 submodule 里必然失败，
   故所有 pnpm 调用带 `--config.verify-deps-before-run=false`；`--dump-config`/`--help` 不加载 lib/，
   故不能当"已建好"的证据（按文件探）。`dev/setup.sh` 的守卫改指向它。
3. **机械门禁 `startPathProblems`**（`scripts/verify-checks.mjs`，接入 `pnpm verify`）钉住三件事：
   两个前置脚本都被标成第一步；两者都排在任何**起服务的**命令之前（`--dump-config`/`--help` 豁免——
   它们 boot-free，不需要 profile 存在）；两个 profile 在 setup 之后都还有路由。
   夹具在 `tests/verify-gates.spec.mjs`（含显式构造的反序/漏标注/缺脚本负例）。
4. **不做的事**：不动既定纪律——`pnpm dsh` 仍无条件强制 dev home；`dev/setup.sh` 仍是 profile 的 owner；
   vendor 仍只读（首建换措辞、不自动触发构建）。

## 验证（真跑过）

- 空 home 复现失败：`pnpm dsh --profile dev --dump-config` → `profile "dev" does not exist`，
  exit 1，且新 home 里一个文件都没生成。
- `bash dev/setup.sh` 幂等重跑：两个 profile 都在位时输出"already exists"，并给出 next 两条命令。
- `pnpm dsh --profile dev --port 0 --no-open` → `http://127.0.0.1:49828/?token=…`；
  `pnpm preflight '<URL>'` 全绿（`dsh-smart-assistant client bundle registers under its name`、boot graph 65 条）。
- `pnpm dsh --profile dev-task "reply with exactly: OK"` → 退出码 0，输出 `OK`。
- `vitest run tests/verify-gates.spec.mjs`：33 passed（含 `startPathProblems` 4 条，正反例）。
- 冷启动复现（干净工作树 + 隔离 `DSH_HOME`，完整走 ①→④）：见下节证据台账。
- 扮演 fresh agent 的会话按文档独立起服务：见下节证据台账。

## 输掉的方案

- **只把话写清楚、不加脚本**：文档解释得了"先建后起"，但解释不了幂等与"漏了哪一条"；
  四条命令的记性负担仍在每个新会话身上。**被否决：修的是新会话的时间，不是文档的措辞。**
- **让 `dev/setup.sh` 自己构建**：setup 的职责是"建 profile + 装插件 + 指 roster"；把 20 分钟级构建塞进去后，
  一个命令失败你分不清是环境没建还是 profile 没建，且破坏它"秒级幂等"的性质。
- **`pnpm install` 的 postinstall 自动构建 vendor**：`vendor/dsh` 是只读 pin，构建由 vendor 自己的
  `build:*` 脚本拥有；隐式触发会把"首建"变成不可预期的副作用，违反探索路由（构造而非猜测）。
- **加一个包脚本别名（`pnpm setup`）替代 `bash dev/…`**：多一个别名只多一处要同步的清单，
  而 `bash dev/…` 已经是本仓既有形态（`dev/setup.sh` 在命令表里就是这么写的）。
- **在 `--dump-config` 上做更严的检查**（要求它在文档里出现位置固定）：收益是文案一致性，
  成本是每次文档重组都可能红——门禁只该钉住会真出错的事实（顺序与标注）。
