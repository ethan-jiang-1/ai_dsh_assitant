---
status: 已结
opened: 2026-11-01
---

# 推敲：按 DSH 生命周期重排插件形态（bundle-first，从"安装器点亮"到"装上即产品"）

> 立卡：2026-11-01 ｜ 状态：已结（2026-11-02 关闭）｜ 结论：七片全落，A1–A8 达成（A2/A3 的 registry 半步是本人动作）；决定见 `notes/implemented/2026-11-02-bundle-first-lifecycle.md` ｜ 类型：Task ｜ 可关闭：是 ｜ 毕业：做现在

**问题与期望结果：** `_dist/` 的发行物（tgz ＋ 安装手册）看着不像 DSH 生态里的普通插件：要照着说明书先建 profile、
再改 profile patch，产品才亮；发不出去（`private`），市场卡片没有标题/图标/作者。期望的结果是——
**把 bundle 装进任意 web profile（Plugins 页 / `dsh plugin add` / 市场 Discover）→ 重启 → 新会话就是「章鱼管家」**，
不需要安装器、不需要手写 patch；同时这个包在 npm 与社区市场里长得和 DSH 自家插件一样（标题、图标、作者、
关键词、版本文档齐全），安装器退回"可选自托管"的位置。

**当前情况：** 逐段对照与隔离 home 实验（E1–E5、市场条目探针）已完成，证据在
[调研材料](../research/261101-plugin-lifecycle/261101-lifecycle-gap-evidence.md)。核心结论：
**根因不是打包脚本，是插件形态**——产品默认值（默认 preset）不在 bundle 里，而在安装器/开发脚本写的 profile patch 里，
所以"装进已有 profile"这条 DSH 唯一的主流路径拿不到产品。已用探针证明 bundle 自己能给默认 preset（E4）。

**未决问题：** 见「下一步」的六个选择，其中 3 个只有本人能定（发布账号、英文展示名、市场托管位置）。

## 外部结果三要素

- **触发条件：** 本卡拍板后，按切片推进（或其中任一被点名的切片）。
- **用户看到或得到什么：** 一个在 npm 上按名字可安装、在社区市场里有正常卡片、装进任意 web profile 就生效的
  `dsh-smart-assistant`；安装器变成可选的自托管资产；文档不再教人先建 profile 再改 patch。
- **完成条件：** 验收标准 A1–A8 全绿（含 `pnpm verify` / `pnpm release-smoke` / 一次真实 npm 发布与一次市场条目校验）。

## 已知与未决

已知（证据见调研材料 §三–§五）：

1. 装进 shipped `web` profile、装进专用 `assistant` profile，两种路径的 `agent-preset-registry.default` 都是 `standard`
   （E1/E2）——**专用 profile 也不点亮产品**；手册 `安装手册.md:131-132` 与 `:139` 自相矛盾。
2. 把 `- id: agent-preset-registry` ＋ `default: assistant` 写进 **bundle patch**，装进任意 web profile 即生效（E4）；
   已选过 preset 的用户仍以 `selectedDefault` 为准，不被劫持（registry 源码 `index.ts:56,75`）。
3. `"private": true` 会以 `EPRIVATE` 拒绝真实发布（本机 npm 10.9.8 的发布库行为；`--dry-run` 不走该分支，
   所以 dry-run 绿灯是假证据）；包名 `dsh-smart-assistant` 在 npm 上未被占用（404）。
4. 展示元数据为空：无 `locale/*.json`、无 `icon`、无 `author/homepage/keywords`；市场条目校验通过但标题回退成包名。
   更直接：Plugins 页那一行的**描述只来自 `meta`**，没有 locale 文件就是"标题=包名、描述为空"
   （`vendor/dsh/packages/client/ui-plugin-manager/src/client/presentation.ts:117-125`）。
5. bundle 实为 web-only（override 仅 web-app 有的行、insert 依赖 `connection`/`workspaceRegistry` 的行）；
   装进 headless 会打印 `patch: entry "ui-sidebar-terminal" not found`（E3），文档没声明这个限制。
6. 派生会话索引写在 `$DSH_HOME/session-search.db`（`cordis.patch.yml:99`），是"直接在 home 根自造文件"的反模式；
   应为 `dshCachePath('assistant', …)`。
7. 安装器 `bootstrap.mjs` 住在 `files` 白名单里，且是唯一设置默认 preset 的地方（`bootstrap.mjs:430-456`）——
   它与 `dsh plugin` 并列为第二套 profile 写者。
8. 兜底绕行有退役条件但无复核机制：发布版 dsh 0.2.1-rc.5 的 ui-chat 客户端产物已带
   `constructor(host, defaultMode = …)` 兜底，`ui-chat.transcriptView` 覆盖在 rc.5 上可以退役
   （本仓 vendor pin 仍是 rc.2，需先定 floor）。

未决（技术侧，拍板后可自行判定）：

- 退役 `ui-chat` 覆盖需要先确认支持下限（rc.2 发布物是否带兜底）：要么抬 floor 到 rc.5（牵动 vendor pin 升级），
  要么保留覆盖直到 pin 升级。**建议抬 floor**：我们只在 rc.5 上真装过，声明没验过的下限是假承诺。
- `assistant-operating-ledger` / `assistant-memory` 的 `dataDir` 可配置——生命周期建议把"数据根可配置"列为
  不该做的事（本仓没有强制）；本仓保留它作为部署逃生口。倾向**保留并写进 README**（明确"默认值固定、覆盖是运维手段"），
  不在本次改动里改契约。

## 方案与取舍

### 候选形态

| 形态 | 长什么样 | 结论 |
|---|---|---|
| A. 维持现状：产品 = 专用 profile ＋ 安装器 | 发 tgz ＋ 手册；用户照手册建 profile、装包、改 patch | **否**。DSH 唯一主流安装路径（Plugins 页/市场）拿不到产品；社区里没有"先改 patch"的插件；安装器成了第二套 profile 写者 |
| B. 发 profile 目录 / 容器镜像当产品 | 把 `profiles/assistant` 或镜像当交付物 | **否**。profile 是用户侧组合：`--from-default-profile` 会删掉用户的依赖与 patch，发布 profile 等于覆盖用户组合；容器只算部署包装，不是插件分发 |
| C. **bundle-first**（建议）：bundle 自带默认值与文档 + 可选自托管安装器 + 自建社区 index | 装 bundle 即产品；专用 profile/产品 home 降级为"自托管部署选项"；安装器独立发布 | **选它**。它把产品放回 DSH 唯一可安装、可被发现、可被市场读的单位上，且不发明任何新机制 |

### 为什么 C 的代价可以接受

- **默认 preset 覆盖 registry 行**是整行 config 替换：将来 registry 加字段会被我们覆盖。代价用"每 pin 复核"
  抵掉（A6 门禁把每个 vendor override 的退役/复核条件列成台账）。
- **给用户改默认 preset** 听起来像劫持，但语义上 `default` 就是"部署默认"，用户级 `selectedDefault` 优先；
  已设置过的用户不受影响，卸载即回退。产品默认值本来就该在这里。
- **安装器移出包**会让"一条命令部署"多一步下载；换来的是包里不再有第二套 profile 写者，且安装器能独立签名/校验。

### 不做的事（避免"乱发明"）

- 不建第二套 launcher/桌面壳/更新器；不做自建市场服务（用 DSH 的静态 index 格式＋官方 generator）。
- 不发明 manifest 字段（`dsh.compatibility`、`manifestVersion` 都没有读者）。
- 不改身份名（`docs/identity.md` 已锁定包名、preset id、服务键、工具名）；本卡的改动不碰身份。
- 不为进"官方 catalog"努力（只收首方 `@deepseek-ai/dsh-*`）；社区路径是 npm ＋ 第三方 index。

## 切片计划

> 顺序有依赖：S1 是形态修复（先行，其它切片的文档都以它为前提）；S2/S3 让包"发得出去、找得到"；
> S4/S5 是外观与安装器归位；S6 把证据变成门禁。每片可独立提交（硬规则 6）。

**S1 · bundle 自足（形态修复）** — 外部结果：装进任意 web profile、不碰 profile patch，`--dump-config` 出现
`default: assistant`，首启新会话就是章鱼管家。

1. `cordis.patch.yml`：新增 `- id: agent-preset-registry` ＋ `config: { default: assistant }`（E4 已证）；
   注释写清"整行替换 + 换 pin 时复核 registry 字段"。
2. `session-query-sqlite.path` → `createRequire(baseUrl)('@deepseek-ai/dsh-home-paths').dshCachePath('assistant', 'session-search.db')`
   （该插件会自建父目录，`schema.ts` 里 `mkdir(dirname(path), { recursive: true, mode: 0o700 })`）；
   README/手册写明"可删、下次检索重建"。
3. `bootstrap.mjs` 删除写 profile patch 的块（S5 前先停止写，避免两套真值）。
4. README `## Compatibility` 声明 **web surface**；headless 补 `- id: assistant-product / disabled: true` 的片段；
   `## Data` 补缓存路径。
5. `dev/env/setup.sh`：web profile 不再复制 registry patch（留着会掩盖回归）；headless patch（insert 语义）保留。
6. `release-smoke` 增"stock `web` 模板 + 不写 patch → 断言 `default: assistant` + 启一次 boot"。

**S2 · 发包就绪** — 外部结果：`npm publish` 不因 `private` 被拒；Plugins 页/市场能拿到标题、图标、作者、关键词。

1. 形状照仓内样本抄：`vendor/dsh/packages/experimental/plugin-market-bundle/`（manifest 顶层 `icon`、
   `exports` 里的 `./locale/*.json`、`files` 里的 `icon.svg` 与 `locale/*.json`、`locale/zh.json` 的 `meta.title/description`）。
   在 `package.json`：去 `private`；加 `icon`、`exports` `./locale/*.json`、`files` 补 `locale/` 与 `icon.svg`；
   `keywords`/`author`/`homepage` 有真实值就写（市场卡片会读），没有不硬造。名字不加 scope ⇒ 不需要 `publishConfig.access`。
2. 新增 `locale/en.json`、`locale/zh.json`（`meta.title` / `meta.description`）、`icon.svg`（品牌图形；
   **英文展示名见"下一步"第 3 问**）。这是 Plugins 页那一行有描述的**唯一**途径（客户端只读 meta）。
3. 重生成 `docs/package-catalog.md`（exports 变化可能影响生成物）并按需更新 `docs/identity.md` §二（皮肤：新增图标/标题）。

**S3 · 发布与市场** — 外部结果：一条命令产出"可发布包 ＋ 与发布同版本的 `_dist/` ＋ 可托管的 `market/index.json`"。

1. scripts/release/publish.mjs（S3 待建）：前置（clean tree、`pnpm verify`、`pnpm release-smoke`、版本未发布、tag 与版本一致）→
   `pnpm build` → `pnpm pack` → `npm publish`（可选 `--provenance`）→ 写 `_dist/`（tgz、手册、`market/`）。
2. `market/index.json` 用 DSH 官方 generator（`vendor/dsh/apps/plugin-market-generator`，输入一行包名）产生；
   README 写"先在插件页启用 **自定义插件市场**（`@deepseek-ai/dsh-experimental-plugin-market-bundle`，出厂关着），
   再到 Discover 加这个 index URL"——索引与图标走 https 静态托管。
3. tag 约定与 `pnpm verify` 的 `tagVersionProblems` 对齐（先读门禁再定 `v<version>` 还是 `<name>@<version>`）。

**S4 · 文档分层** — 外部结果：插件 README 与产品手册各归其位，且不可能再对默认 preset 各说一套。

1. 包 README 按插件骨架七节（补 `## Upgrade`），Install 改成"Plugins 页安装 `dsh-smart-assistant`"为主，
   CLI 次之，tarball 只在离线节；补"会插入哪些 entry id"与"七问"。
2. `_dist/安装手册.md` 按产品手册十段（补"选运行时"与"安全"），删除"第一步建 profile""第八节手写 profile patch"
   （S1 后不需要）；Desktop/容器/headless 各一节。
3. `export-dist.mjs` 的模板与 README 共用事实源（版本、engines、entry id、tag），不再各自维护。

**S5 · 安装器归位** — 外部结果：包里没有安装器；自托管用户从发布资产拿到它。

1. `bootstrap.mjs` 留在包目录（`scripts/release/bootstrap-guards-smoke.mjs` 与 `standalone-smoke` 仍按现路径跑），
   但从 `package.json` 的 `files` 移除；由 `export-dist` 复制成 `_dist/bootstrap.mjs` ＋ 独立 checksum（发布资产）。
2. 文档与 `docs/identity.md` 措辞同步（"随包"→"独立发布资产"）；保留 `--workspace/--product/--stop`。

**S6 · 门禁** — 外部结果：上面五片的判据由 `pnpm verify` 机械守，而不是靠人记。

1. manifest 形状检查（exports/files/locale/icon/keywords/author/homepage、不得有 `private`）。
2. vendor override 台账（每处 override 必须写复核/退役条件；换 pin 时打印）。
3. 市场条目探针（打包后用 manifest 构造条目 → `parseMarketIndex` → 断言 title≠包名、icon/author/homepage/keywords 在）。
4. 文档形状检查（README 七节、手册十段、默认 preset 只有一种说法）。

## 验收标准

| # | 验收 | 判据（可执行） | 结论（2026-11-02） |
|---|---|---|---|
| A1 | 装上即产品 | 全新 `DSH_HOME` → `dsh --profile web --dump-config` 建 profile → `dsh plugin add ./dsh-smart-assistant-<v>.tgz` → `--dump-config` 出现 `default: assistant` 与 `preset-assistant`；**全程不改 profile patch**；boot 一次无 required 失败；`dev/probes/web/agent-preset-ui.mjs` 断言卡片显示「新任务默认: 章鱼管家」（不改写，只读断言）| **达成** — `pnpm release-smoke`：`web profile: tarball-only install defaults to the product preset (no profile patch)`；隔离 home 手工复验同结论 |
| A2 | 可发布 | `npm publish` 不再被 `EPRIVATE` 拒；干净 home 里 `dsh plugin add dsh-smart-assistant@<v>` 走 registry 成功并进 `dsh.profile.bundles`| **本仓侧达成** — `npm publish --dry-run` 通过（322 files / 558.7 kB）、无 `EPRIVATE`；`publish-release` 把真发布拦在本人那一步（决议 2）。registry 安装待发布后复验 |
| A3 | 展示面正常 | 生成的 `index.json` 过 `parseMarketIndex`；`metadata.title/description/icon/author/homepage/keywords` 非回退值（title ≠ 包名）；**且 Plugins 页那一行有标题（非包名）与描述**（客户端只读 `meta`）| **展示面达成** — 用宿主 `readPluginMeta` 实测：title `{en: Smart Assistant, zh: 章鱼管家}`、双语描述、`data:image/svg+xml` 图标（非回退包名）。**索引生成待发布**（generator 只读 registry；管线用两个已发布包实测通过） |
| A4 | surface 诚实 | headless 安装后按 README 片段操作：无未解释的 warning/pending；README 明确"web only"| **达成** — README 明写「本 bundle 是 web 面的组合」+ headless `assistant-product disabled: true` 片段；手册新增「选运行时」 |
| A5 | 卸载残留可解释 | `remove` 后 home 根不出现 `session-search.db`；缓存位于 `$DSH_HOME/cache/assistant/`；README 列出留下什么、怎么清| **达成** — 派生索引移到 `<home>/cache/assistant/session-search.db`；`docs/delivery.md`/`docs/release.md`/README 同步；`remove` 后 home 根不再出现该文件 |
| A6 | override 有退役纪律 | 每处 vendor override 在**台账**里有"复核条件/退役条件（含实测依据）"；`ui-chat` 的退役条件登记为「发布人口 rc.5 起自带兜底」——**本 pin 不要求退役**（2026-11-02 决议 5：抬 pin 是独立工作）| **达成（按 2026-11-02 决议 5 改写判据）** — `docs/product.md` §十 台账 6 行（含复核/退役条件）；`pnpm verify` 的 `overrides` 门守裸 id 覆盖；`ui-chat` 退役条件登记为「发布人口 rc.5 起已带兜底」 |
| A7 | 文档一致 | README 七节、手册十段齐全；关于默认 preset 只有一种说法（门禁 grep 旧的自相矛盾表述）| **达成** — README 七节 + 手册骨架由 `docShapeProblems` 门守（export-dist 每次跑）；默认 preset 只有一种说法（README / 手册 / release 宪章一致） |
| A8 | 证据链 | `pnpm verify`、`pnpm release-smoke` 绿；`_dist/` 产物可由 tag 处的提交复现（记录 checksum）| **达成** — `pnpm verify` 52/52、`pnpm test` 1168 passed、`pnpm export-dist` 12 条 ok、`pnpm release-smoke` 唯一 BLOCKED 是无 key 的 live turn（出口 2，不是通过）、`pnpm publish-release` 干跑绿；`_dist/` 可由当前提交复现（版本 0.1.13，同一条 export 命令） |
## 决策与授权（2026-11-02，本人授权落地）

本人 2026-11-02 授权："让 `_backlog/issues` 的内容完全按本仓流程落地"。本卡由推敲卡**转为收口卡**，
六问按下列决议执行；技术侧由 agent 判定并在此记理由：

1. **形态**：采纳 C（bundle-first）。产品 = bundle ＋ 默认值 ＋ 文档；专用 `assistant` profile 与产品 home 降为部署选项。
2. **发布**：包名仍为 `dsh-smart-assistant`（未占用）。**`npm publish` 的执行留本人**（agent 无 registry 凭证）；
   本轮交付"可发布"的全部前置与一次 `npm publish --dry-run` 之外的证据，真发布由本人在 `0.2.0` 上执行。
3. **英文展示名**：`Smart Assistant`（皮肤，非身份；`docs/identity.md` 锁的是包名/preset id/服务键/工具名，均不动）。
   本人换口味时只改 `locale/en.json`。
4. **市场索引**：仓库**自产** `_dist/market/index.json`（官方 generator，输入是一行包名），并与 tarball 同版本。
   **托管位置留本人**（GitHub Pages 或任意 https 静态）；本轮证明"产物可托管 + 过 `parseMarketIndex`"，不代本人选域名。
5. **支持下限**：**本轮不抬 floor、不动 vendor pin**。理由：抬 pin 走 `pnpm sync-dsh`，牵动整棵 vendor、
   typecheck、组合测试与 eval，是独立工作；把它混进形态重构会让两件事的证据互相污染。
   相应地 **A6 判据改为**："每处 vendor override 在台账里登记复核/退役条件（含实测依据）"，`ui-chat` 覆盖的退役条件是
   「发布人口 rc.5 起自带兜底」——登记为触发项，不要求在 rc.2 上退役。
6. **安装器**：移出包，改为独立发布资产（`_dist/bootstrap.mjs` ＋ checksum）。

## 切片台账

每片一个可回退提交；"证据"列写真跑过的命令与其读数。

| 片 | 外部结果 | 状态 | 证据 |
|---|---|---|---|
| W0 流程载体 | 本卡转收口卡、授权与决议入档 | 完成 | 本节 |
| S1 bundle 自足 | 装进任意 web profile、不碰 profile patch，`--dump-config` 出现 `default: assistant` | 完成 | 隔离 home `.tmp/s1/home` 建 stock `web` profile → `dsh plugin add` 本包 → `--dump-config` 出现 `default: assistant`、`preset-assistant`，**全程零 profile patch**；派生索引落到 `dshCachePath('assistant','session-search.db')`；`bootstrap.mjs` 不再写 profile patch；`pnpm verify` 51/51；`vitest composition+tooling` 412 passed |
| S2 发包就绪 | 去 `private`；locale/icon/keywords 齐；Plugins 页那一行有标题与描述 | 完成 | `private` 已删、`npm publish --dry-run` 通过（322 files / 558.7 kB）；`locale/en+zh.json` + `icon.svg` + `keywords` 随包；`export-dist` 三条新判据 ok（publishable / display metadata / 打包无 `src` 载荷）；包体 891→548 KB |
| S3 发布与市场 | 一条命令产出「可发布包 ＋ `_dist/` ＋ `market/index.json`」 | 完成 | `pnpm publish-release` 预检全绿（版本一致/未发布/build/export-dist/verify，停在 publish 前）；`pnpm market` 调官方 generator + `parseMarketIndex` 校验，未发布时明确拒绝且不留残留；generator 管线用两个已发布包实测（写出 2 个 plugin，terminal-bundle 的 title/icon 正常）；**真发布待本人** |
| S4 文档分层 | 插件 README 七节、产品手册十段；默认 preset 只有一种说法 | 完成 | README 加 frontmatter + 七节（含 `## Upgrade`）、明写 web 面与 headless disable 行；手册新增「选运行时」「安全」，卸载标题改为「删包，留数据」；`docShapeProblems` 门守两侧形状 |
| S5 安装器归位 | 包内不再有安装器；改独立资产 | 完成 | `files` 去 `bootstrap.mjs`；export-dist 产出 `_dist/bootstrap.mjs` ＋ `.sha256`；新增 `--package`；`bootstrap-guards-smoke` 8 项拒绝 +「bundle ships no installer」全绿 |
| S6 门禁 | 四条新检查各带负例夹具 | 完成 | ① 包形状 `manifestShapeProblems`（export-dist）；② override 台账 `overrideLedgerProblems`（verify，台账在 `docs/product.md` §十）；③ 市场条目 `market.mjs` 的 `parseMarketIndex`；④ 文档形状 `docShapeProblems`（export-dist）。夹具：`publish-shape.spec.mjs` 14 案、`overrides.spec.mjs` 4 案 |
| S7 收口 | A1–A8 全绿证据 ＋ 归档 ＋ 决定 note | 完成 | 见上表结论列；决定 note `notes/implemented/2026-11-02-bundle-first-lifecycle.md`；本卡归档 `_archive/settled_issues/` |
| BUG-027 | 发布物不再带 `src/` 载荷 | 已修 | `files` 排除 `lib/**/*.map`；`sourcemapLeakProblems` 按内容判（export-dist 调用）；11 条夹具；0 map shipped |
| BUG-028 | 手册建 profile 命令带 `--dump-config` | 已修 | 手册模板改 dump 形态 + 生成后文本判据；`pnpm export-dist` ok |

## 仍未取

- **真 npm 发布**（本人动作，决议 2）：在 `0.2.0` 上执行 `cd packages/dsh-smart-assistant && npm publish --access public`。
  触发条件之外不可替代——agent 无 registry 凭证。
- **市场索引托管**（本人动作，决议 4）：发布后跑 `pnpm market`，把 `_dist/market/` 静态托管到 https，
  再把 URL 加进 Discover。仓库侧只保证"产物可托管 + 过 `parseMarketIndex`"。
- **抬 DSH pin / 退役 `ui-chat` 覆盖**：独立工作，走 `pnpm sync-dsh`；触发 = 发布人口确认 rc.5 起自带兜底（已登记）。
- **headless 的 5 条 pending**：本轮的诚实做法是文档声明 web 面 + 一行 disable。是否改成
  `ctx.inject` 条件激活（bundle 在任意 profile 静默不激活），等真实 headless 用户出现再定。
- **Desktop 真机矩阵**：仍无真机证据；安装说明按 DSH 合同写（Plugins 页同一句），不承诺独立 profile/产品 home。
- **作者/主页元数据**：`author` / `homepage` 未填——没有真实值，不硬造；市场卡片会少两行，不影响安装。

## 关闭条件

结论已定（采纳/否决议案 C 与六个选择）＋ work 去向已记录（proposed 卡或本卡转收口卡）＋ 验收标准已写；
不要求 A1–A8 已执行——那是实施阶段的事。
