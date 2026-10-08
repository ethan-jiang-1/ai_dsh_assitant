# 决策：起服务的第一步必须在入口就显式（fresh agent 不必摸索）

日期：2026-09-29 · 状态：**implemented**
已归档：2026-10-08（决定已经在合同或代码里；下次改决定不用打开本篇。冻结，不再跟踪。）

## 问题

**一个全新的 agent 会话进入本仓，能不能在第一次读入口时就明白"怎么把服务起起来"，而不靠摸索？**

实测（`ASSISTANT_DSH_HOME=/tmp/… pnpm dsh --profile dev --dump-config`，空 home）暴露两处缺口：

1. 跳过 `dev/env/setup.sh` 直接起服务，DSH 的回答是
   `Error: dsh: profile "dev" does not exist; create it with 'dsh plugin --profile dev add <package>'`
   —— 照它做只能得到官方模板 profile：本插件的 bundle 与 roster 指向都不在里面。
   报错**主动把人指向错的命令**，这是"摸索半天"的机械根因。
2. 启动链还有一节谁都没串起来：boot 需要 `vendor/dsh` 的构建产物（依赖 / native addon / host+client lib /
   web dist），而它们是 `docs/dev.md` §三 里**给人逐条敲**的四条命令。漏一条，失败点是 `dev/env/setup.sh`
   的守卫——它 fail loud，但只报"没建"，不替你把构建跑一遍。

**错了赔得起吗？** 赔得起（都落 dev home），但**代价是每一个新会话的摸索时间**，而新会话就是本仓最常见的读者。
**错了多久能发现？** 只要它按命令表做，第一步就撞——所以这不是边角，是主路。

## 决策

1. **入口（根 `AGENTS.md` 命令表）把启动链拆成"按序跑到底"的一段**，两个前置都点名、标成第一步，
   profile 起服务命令在它们之后；「开发环与舱内工具」独立成第二段，不再与起服务混在一张表里。
2. **`dev/env/prepare.sh` 包装 §三 的首次构建**：幂等（产物在位即跳过）、逐个产物探存在性，
   并且把三个已知约束写进代码——vendor 根 `postinstall`（lefthook）在 submodule 里必然失败，
   故所有 pnpm 调用带 `--config.verify-deps-before-run=false`；`--dump-config`/`--help` 不加载 lib/，
   故不能当"已建好"的证据（按文件探）；native addon 落在**平台命名**的包里
   （`native/system/packages/<platform>/bin/system.node`），故探测走 glob 而不是写死路径。
   `dev/env/setup.sh` 的守卫改指向它。
3. **机械门禁 `startPathProblems`**（`scripts/checks/verify-checks.mjs`，接入 `pnpm verify`）钉住三件事：
   两个前置脚本都被标成第一步；两者都排在任何**起服务的**命令之前（`--dump-config`/`--help` 豁免——
   它们 boot-free，不需要 profile 存在）；两个 profile 在 setup 之后都还有路由。
   夹具在 `tests/verify-gates.spec.mjs`（含显式构造的反序/漏标注/缺脚本负例）。
4. **不做的事**：不动既定纪律——`pnpm dsh` 仍无条件强制 dev home；`dev/env/setup.sh` 仍是 profile 的 owner；
   vendor 仍只读（首建换措辞、不自动触发构建）。

## 验证（真跑过）

- 空 home 复现失败：`pnpm dsh --profile dev --dump-config` → `profile "dev" does not exist`，
  exit 1，且新 home 里一个文件都没生成。
- `bash dev/env/setup.sh` 幂等重跑：两个 profile 都在位时输出"already exists"，并给出 next 两条命令。
- `bash dev/env/prepare.sh` 在已建好的树上：第一版把 native addon 报成 "missing" 并**每次白建**
  （探测写死了 `node_modules/node-pty/build/Release/pty.node`，真实产物是平台命名的
  `native/system/packages/<platform>/bin/system.node`）——改成 glob 后重跑输出
  `native addon: present` + `already prepared — nothing to build`，exit 0。
  **这条不是笔误而是实测暴露的假设**：写死平台路径在任何别的机器上都会复发。
- `pnpm dsh --profile dev --port 0 --no-open` → `http://127.0.0.1:49828/?token=…`；
  `pnpm preflight '<URL>'` 全绿（`dsh-smart-assistant client bundle registers under its name`、boot graph 65 条）。
- `pnpm dsh --profile dev-task "reply with exactly: OK"` → 退出码 0，输出 `OK`。
- `pnpm typecheck` exit 0；`pnpm test` 299 passed / 39 files；`pnpm verify` 31/31（含新门禁）。
- `vitest run tests/verify-gates.spec.mjs`：34 passed（`startPathProblems` 4 条 + `ASSISTANT_DSH_HOME` 解析 1 条）。
- 隔离路径端到端：干净工作树 + `ASSISTANT_DSH_HOME=/tmp/cold-start/home`，
  `bash dev/env/setup.sh` 原样跑通（不再需要补丁副本），两个 profile 落在隔离 home，仓库 dev home 未被改写。
- 冷启动探针 v2（干净工作树，从①走到④）**先跑失败、再跑通**，见下条——
  这条"失败"是本次最有价值的机械证据。

## 探针 v2 抓到的假绿：`prepare.sh` 一直在空转（我自己的 bug）

v2 在干净工作树上走到④时 boot 崩了：`client-modules: client bundle not found`（几十个 client 包），
而②`prepare.sh` 报的是全 `present`、`already prepared — nothing to build`。查到底，是**三个叠加**的事实：

1. **`[ -e "$2" ]` 对 glob 输入恒真**。`need()` 写的是
   `if [ -e "$2" ] || compgen -G "$2" …`，而 `[ -e ]` **从不展开 glob**——它只判那个字面字符串
   非空，于是第一个条件永远为真、`compgen` 那半截**从来没被求值过**。结果：所有探测恒报 present，
   脚本**没有执行过任何一步构建**（干净树里 `vendor/dsh/node_modules` 条目数为 **0**，即
   `pnpm --dir vendor/dsh install` 也从未跑过）。
2. **`[[ -e glob ]]` 在这里也不可用**：本仓的脚本跑在 macOS 自带的 **bash 3.2** 上，
   而"`[[ -e ]]` 展开 glob"是 bash 4+ 的行为。改成 `[[ -e ]]` 的第一次修法因此同样报错答案。
3. **判据必须对"整批产物"**：`build:lib` 的产物是**整批** client 包的 `lib/*.js`
   （clean 树 61 个 `lib/` 目录全缺；主仓库 `index.js` 61 个、`client.js` 56 个），
   探单个文件（甚至探 `client/modules/lib/client.js` 这个在干净树上并不存在的路径）都会假绿。

**最终写法**：`present() { compgen -G "$1" > /dev/null 2>&1; }`——bash 3.2 兼容、对文件与 glob 都成立；
四个探测点分别探 `vendor/dsh/node_modules`、`native/**/*.node`、`client/*/lib/client.js`、`web/dist/index.html`。
`dev/env/setup.sh` 的守卫原本探的正是那个假判据文件（`client/modules/lib/client.js`），
同样会在干净检出上假绿放行、把失败推迟到 boot；已改为 `find packages/client -maxdepth 3
-path '*/lib/*' -name index.js`（主仓库实测 61/61 都有）。

**为什么值得单列**：这不是笔误，是"我在已构建的主仓库上验证过，于是以为探测是对的"——
而主仓库的 `vendor/dsh` 是预先构建好的，**真正的 bug 只在干净检出上显形**。
判据若与 boot 实际加载的产物集不对齐，就是假绿；这也是"实验优先于推理"的直接收益。

## 实验反馈（三个 fresh agent 会话，真跑过）

**A. 默认路径试跑（成功，1 分 27 秒到 URL）**：它按 AGENTS.md ②③④ 走到
`http://127.0.0.1:57918/?token=…`，preflight 全绿（boot graph 65 条、本包 client bundle 在列），
`pnpm shots` 出图无 console 错误。它点名表扬的句子正是 ③ 的注释（预告失败形态与"报错会把你指向错的命令"），
并说 ①的 `pnpm install` **没有判据**（它靠 `.modules.yaml` 自己推的）——已补进命令表。
**结论：默认 dev home 路径下文档足够，不必摸索。**

**B. 隔离路径试跑（撞墙，改了代码）**：我用 `ASSISTANT_DSH_HOME` 给它做隔离，它却卡了 3~4 分钟，
最后**自己搓了一个 1 行补丁副本**才跑通（`dev/env/env.sh:13` 无条件覆盖 `DSH_HOME`，而启动器认这个出口
→ profile 建在 A、启动器读 B）。它的原话："文档说它是显式出口，实际是 launcher 专属"。
为避免重写我正在用的 dev home，它**拒绝**原样跑 setup.sh——隔离在那一刻不是洁癖，是必需。
**反馈即缺陷**：`dev/env/env.sh` 已改为 `${ASSISTANT_DSH_HOME:-$ASSISTANT_REPO/dev/harness-home}`，
两个脚本的 fail-loud 守卫同步放宽（显式指向 `~/.dsh` 时警告而不拦截，与启动器同语义），
`docs/dev.md` §一 补上"建 profile 与起服务必须同 home"这句它缺的话。
**回归证据**：34 个门禁夹具全绿（新增一个真 bash 子进程夹具钉住 env.sh 的解析）+ 干净工作树里
`ASSISTANT_DSH_HOME=/tmp/… bash dev/env/setup.sh` → 打印 `DSH_HOME=/tmp/cold-start/home`、
两个 profile 落在隔离 home，而仓库 dev home 的 profile mtime 未变（没被重写）。

**C. 冷启动在①就死（另一个真缺陷）**：干净工作树跑 `pnpm install` →
`[ERR_PNPM_MISSING_TARBALL_INTEGRITY] Cannot install package "xlsx@https://cdn.sheetjs.com/…"`。
根 lockfile 里 `xlsx` 的 resolution **没有 integrity 字段**（`git log -S` 显示从来没有过，
pnpm 11 之前被缓存/旧版掩盖），而 `vendor/dsh` 的同一条有值。
我下载该 tarball 自己算 sha512，与 vendor 记录的值**逐字节一致**，据此补上那一行；
`pnpm install --frozen-lockfile --force` exit 0（frozen 会拒绝坏 lockfile，这是它作为验证的意义）。
**诚实边界**：整条链的"①`pnpm install` 真跑通 + ②prepare 的构建分支"仍未被端到端跑完
（node_modules 常驻，install 是空跑）；已证的是 ① 不再在解析期即败、②③ 在干净工作树 + 隔离 home 下通过。

**D. 闭环（修复后再放一个新会话跑同一条路）**：仍然只用 AGENTS.md 命令表 + `docs/dev.md` 起隔离 home 的
Web UI，**0 卡点 / 0 重试 / 0 报错**，且**没有读 `dev/env/env.sh`、`dev/env/dsh.mjs`、`dev/env/setup.sh` 的源码**、
一条脚本都没改（对比实验 B：卡 3~4 分钟 + 自搓补丁副本 + 读三个脚本）。
它实证了隔离（仓库 `dev/harness-home` 与 `~/.dsh` 的 mtime 均未变、两个 profile 只落在隔离 home），
并点名三条判据真起作用：`.modules.yaml`（据此跳过①）、三个 vendor 产物（据此跳过②）、
`ls $DSH_HOME/profiles` 见 `dev`+`dev-task`（据此验③）。
**它唯一提的缺口已补**：命令表缺"隔离 home 变体"——要隔离的人得自己把两个文件的信息拼起来，
而隔离恰是"不碰日用 `~/.dsh`"最常用的落地形态；已加一节逐条带 `ASSISTANT_DSH_HOME` 的可复制命令。

## 输掉的方案

- **只把话写清楚、不加脚本**：文档解释得了"先建后起"，但解释不了幂等与"漏了哪一条"；
  四条命令的记性负担仍在每个新会话身上。**被否决：修的是新会话的时间，不是文档的措辞。**
- **让 `dev/env/setup.sh` 自己构建**：setup 的职责是"建 profile + 装插件 + 指 roster"；把 20 分钟级构建塞进去后，
  一个命令失败你分不清是环境没建还是 profile 没建，且破坏它"秒级幂等"的性质。
- **让 `ASSISTANT_DSH_HOME` 只在启动器生效、文档写"别用它跑脚本"**：那是把不一致写进文档，
  等于要求读者记住"隔离时脚本与启动器不共用一个 home"——实验 B 证明这一步会真的卡住人，
  且卡住时他只能去读三个脚本。**被否决：契约一致比措辞免责便宜。**
- **给 dev 脚本加一个独立的 `DSH_DEV_HOME` 变量**：多一个变量就要多一处文档、
  多一处与启动器同步的清单；`ASSISTANT_DSH_HOME` 已经是既有出口，复用它不增面。
- **手动往 lockfile 写一个"看起来对"的哈希**：没验证过的 integrity 会在下游变成更难诊断的
  安装失败；要么从 CDN 算、要么让 pnpm 写，两者都做完了才算证据。
- **`pnpm install` 的 postinstall 自动构建 vendor**：`vendor/dsh` 是只读 pin，构建由 vendor 自己的
  `build:*` 脚本拥有；隐式触发会把"首建"变成不可预期的副作用，违反探索路由（构造而非猜测）。
- **加一个包脚本别名（`pnpm setup`）替代 `bash dev/…`**：多一个别名只多一处要同步的清单，
  而 `bash dev/…` 已经是本仓既有形态（`dev/env/setup.sh` 在命令表里就是这么写的）。
- **在 `--dump-config` 上做更严的检查**（要求它在文档里出现位置固定）：收益是文案一致性，
  成本是每次文档重组都可能红——门禁只该钉住会真出错的事实（顺序与标注）。
