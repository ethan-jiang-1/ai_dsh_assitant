# 产物新鲜度机械化：`build:` 门禁 + 一键启动自证

日期：2026-10-18 · 状态：**implemented**

## 问题（可观察行为）

2026-10-18 一次「启动一下这个插件」的会话里，本人（agent）在起服务前自问"`lib/` 是不是落后于 `src/`"，然后**即兴写了一条 mtime 探针**：扫 `packages/dsh-smart-assistant/src/**` 与 `lib/**` 比修改时间，报出 9 个"陈旧"文件。核查后 9 个全是假阳——`tsc -b` 在 `tsconfig.tsbuildinfo` 里记的是**输入内容的 sha256**，只被 touch 过的文件并不陈旧；剩下 `lib/client/*.js` 那一批更是 tsdown 引入前的死文件（`clean: false` 有意保留，只有 `index.js` 会被服务）。

两件事同时暴露：

1. **判据不在流程里**。`docs/dev.md` §二生成物登记表自己写着这一行「无独立 freshness 门禁」，纪律只活在 prose 里（根 `AGENTS.md` 与 `docs/dev.md` §五都要求人**记得**"改 src 后 `pnpm build`"、§五另有两行讲"`typecheck` 覆盖 classic bundle"与"链式命令吞退出码"的后果）。本人上一轮收尾把这条推回给人："改完 `src/` 记得 `pnpm build`"——而 `scripts/checks/verify.mjs` 开头写着本仓的立场：*everything here is a fact a machine can check, so a person does not have to remember it*。
2. **启动链整条靠人记**。默认启动动作是 ⓪①②③④ 四步加两条纪律（build 与 `pnpm preflight`）串起来的仪式，漏一条的失败点是一句指错方向的报错（`profile "dev" does not exist`）。

本人得到（已交付）：一个**内容式**的 `lib/` 新鲜度判据（同一个核被 `pnpm verify` 与启动链消费），以及一条把经验整条收进去的 `pnpm start`——prepare → setup → 自证（陈旧即 build）→ 起 dev Web → preflight 绿了才交 URL，红了不交并收掉服务。

## 输掉的方案

- **mtime 比对**（本仓既有 `vendorClientFreshnessProblems` 的形态，本人即兴探针也抄了它）：对 vendor 面成立——那里的 client face 由 `prepare.sh` 整批重建、中间没人动源码。对本包不成立：`tsbuildinfo` 是内容哈希，且 `lib/client/*.js` 里躺着一批永不再生成、也确实无需再生成的死文件。实测会报 9 个假阳。
- **自己读 `tsconfig.tsbuildinfo` 复算哈希**：能免掉 spawn，但等于把 tsc 的内部记账格式复刻成第二份真相，随 TS 版本漂移（本仓 TS 6.0.3），且只覆盖 host 面一半。
- **在核里跑一次全量 `pnpm build` 再比全树**：判据最直白，但把 `pnpm verify` 变成分钟级构建，且门禁会改语料（纪律 2 明确核只收输入、返问题串）。
- **只写进 prose**（改 §二登记表、写一句"记得 build"）：正是本轮被指出的失败模式——`verify.mjs` 的立场是机器能查的事不该由人记。这次改动的起因就是上一轮把这条推回给了人。
- **启动时 fail loud 而不自动 build**：换来的是"每次改完 src 起服务都先吃一次红"，而启动的意图本就是跑最新代码；`ensure-build` 只在真陈旧时多花一次 build，且 build 失败会当场炸出来。
- **让 `pnpm start` 直接 `exec pnpm dsh`**（不起包装层）：省一层进程，但就拿不到 URL 去跑 preflight、也无法在红时不交实例——而那两条纪律正是要内化的东西。
- **给 `verify` 里这条检查加 mtime 快路径**（先比时间、可疑才算内容）：省不了多少（实测 `--dry` 0.51s、tsdown 0.1s），却把假阳重新引入。

## 还会约束以后的后果

- **判据按内容，不按时间**：以后任何"产物是否落后"的问题（新生成物、新 bundle、第三方钉存物）先问构建器自己或比字节，mtime 只允许用在"整批重建、中间无人动源"的场景（vendor client face 那一类）。本核的头注写明了这条边界，免得后来者照抄错的那半。
- **一个判据一个核，两个消费者**：`pnpm verify`（红了不合并）与 `dev/env/ensure-build.mjs`（起服务前自动补）消费同一个 `packageBuildFreshnessProblems`；判据若要改，改在核里，两处一起动。
- **`pnpm start` 是默认启动动作**：`docs/dev.md` 首节与根 `AGENTS.md` 命令表首段都指它；它红了不交 URL，所以"交出来的实例"从此隐含"产物与源码一致 + preflight 绿"两条不变量。要偏离（只起服务、不起自证）就显式走 `pnpm dsh`。
- **scratch 用途分家**：verify 用 `.tmp/verify-bundle/`、启动自证用 `.tmp/build-check/`，并行跑不互踩（`dev/env/tmp.mjs` 的"一个用途一个目录"）。
- **`verify.mjs` 的顶层 import 面被夹具镜像**：`tests/tooling/corpus-links.spec.mjs` 把 runner 按文本拷进 throwaway 树，只为它的每个顶层 import 在真实深度打桩（`verify-checks` / `run-gates` / `sync-bookkeeping`，本片又加了 `dev/env/tmp.mjs`）。**新增顶层 import 必须同 diff 补桩**，否则三条 wiring 测试的症状是"stdout 空串"而不是指名失败——本片真踩过一次（3 红，全在同一文件）。
- **[结构还清 note](2026-10-16-structure-paydown.md) 的那条纪律仍然成立**（`tsc -b` 会把 ESM 写进 `lib/client/index.js` 覆盖 classic bundle，推荐顺序仍是 `typecheck → build → test → verify`）——本片只是给它加了一条门禁兜底，两篇互不矛盾、各留其位。
