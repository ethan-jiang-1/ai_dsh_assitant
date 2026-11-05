# dev 启动路径：复用活实例、默认跑构建物、门禁不换速度

日期：2026-11-05 · 状态：**implemented**

## 决定

1. **`pnpm start` 默认复用**账本（`.tmp/start/instance.json`）里健康且产物没变过的实例，只重跑
   `preflight` 就交 URL；`--fresh` 强制新起，带任何 dsh 旗标时不复用。判据 = [`dev/env/instance.mjs`](../../dev/env/instance.mjs)。
   技能正文（`presets/assistant/skills/**`）**不算**失效面——它是活根，改它不需要新进程。
2. **`dev/env/setup.sh` 跳过不产生变化的安装**：profile 已按同一路径 link 本插件且清单指纹未变时
   不跑 `dsh plugin add`；dev overlay 内容没变就不重写（它的 mtime 是复用判据的一部分）。
   无条件重装的口子 = `ASSISTANT_FORCE_PLUGIN_ADD=1`。
3. **`dev/env/dsh.mjs` 默认跑已构建的 vendor CLI**（`apps/cli/lib/bin.js`），但只在三条前提同时成立时：
   `lib/` 在、`vendor/dsh` 的 HEAD 等于 `vendor/UPSTREAM.md` 记的 SHA、且 `lib/bin.js` 不早于该簿记。
   任一条不成立就回**源码启动**（`src/bin.ts` + `tsconfig.tsx.json`）；`ASSISTANT_DSH_FROM_SOURCE=1`
   强制源码。判据 = [`dev/env/launch-mode.mjs`](../../dev/env/launch-mode.mjs)，`pnpm dsh` 每次打印走了哪条。
4. **每一步打印耗时**，交接时打总耗时（`dev/env/start.sh` 的 `⏱` 行）。

契约（现行事实）= [`docs/dev.md`](../../docs/dev.md) §二「运行期入口的两条启动路径」；
操作手册 = [`.agents/skills/dev-startup/SKILL.md`](../../.agents/skills/dev-startup/SKILL.md)。

## 这几条为什么成立（归因，不是体感）

- 定位靠的是**分段证据**：先出现的是一次远高于平时的启动，而当时脚本不打印任何分段；
  加计时后才知道时间在 prepare / setup / 自检 / boot / preflight 之间怎么分。
- boot 的大头是 **Node 模块加载**：对源码启动做 CPU profile，三秒级的 boot 里超过三分之二在
  读文件、编译 ESM 与 GC，本插件自己只占个位数毫秒。换 CLI 的启动形态（构建物）能省掉的是
  "把几千个 `.ts` 现读现编"，不是插件逻辑。
- 因此可省的是**重复工作**（重复安装、重复编译、无谓重启），不可省的是**证明工作**
  （产物自检、preflight）。两者在结果上都是"几秒"，性质完全不同。

## 复核后未改

- `ensure-build` 与 `preflight` 原样保留：前者是"改了 `src` 忘了 build"的唯一拦截点，后者是
  "浏览器开屏必炸"的唯一拦截点。给它们加缓存能省半秒，换掉的正是它们存在的理由。
- 冷页缓存造成的那几秒不优化：那是磁盘读，不是启动路径的问题；能绕开它的只有"别重起"。
- 没有为提速去动 vendor 的构建形态（单包打包等）：动态插件装载让打包不现实，且收益不确定。

## 遗留

- `dev-task` 的 headless 冒烟仍缺本机 dev home 的 API key（见 [pin 迁 rc.5 那篇](2026-11-05-dsh-pin-0-2-1-rc-5.md)），
  与启动路径无关。

## 输掉的方案

- **一律从源码启动**（改前状态）：正确但每启动一次都要现读现编几千个 `.ts`；开发环最常做的
  "起一下看看"不该是这个代价。保留为**回退路径**而不是默认。
- **一律跑构建物、不设判据**：`lib/` 是 gitignored 构建物，换 pin 或裸 `git submodule update`
  之后它属于上一个 pin；不校验就默认用它，会出现"测试说新 pin、页面跑旧 pin"的分裂。
- **`NODE_COMPILE_CACHE` / 预热转储**：交错实测对 boot 的改善落在噪声里（脚本每次都换解析面，
  缓存命中不覆盖模块读取本身），还要多一份需要失效管理的磁盘状态。
- **给自检或 preflight 加"上次绿了就跳过"的缓存**：省半秒，代价是把"证明"变成"相信上一次的证明"，
  且失效条件（工具链、内容相同但 mtime 变了）比收益难维护。
- **常驻一个预热备用实例**：多占一个端口与同一 home，出问题时分不清在看哪个；收益也只是把
  boot 前移到人看不见的时候，代价是双份内存与状态。
- **只加计时、不做复用**：能解释慢，但不能让它变快；解释与加速是两件事，都要。
