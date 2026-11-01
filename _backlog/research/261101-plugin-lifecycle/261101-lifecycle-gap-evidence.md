---
topic: DSH 插件生命周期（打包/发布/安装/初始化/配置/启动/更新/卸载/文档）与本仓 0.1.13 发行物的逐段对照
intent: 用官方生命周期规范与隔离 home 实验证实每处距离，回答"是打包问题还是插件形态问题"
---

# 生命周期逐段对照与实验记录（2026-11-01）

## 〇、口径

- **规范侧**：DSH 插件生命周期的建议做法（本轮按"打包 / 发布 / 安装 / 初始化 / 配置 / 启动 / 更新 / 卸载 / 文档"
  逐段对照）。它是同一批语料里的**建议**，不是 DSH 运行时合同，也不在本仓里——所以本文不引它的路径；
  凡写进本文的事实，一律引**仓内**可查的源码与文件，或本次实验读数。
- **平台侧（C，钉住源码）**：`vendor/dsh`（pin `dsh-v0.2.1-rc.2`）与 npm 上的发布物 `@deepseek-ai/dsh@0.2.1-rc.5`。
- **本仓侧（现状）**：`packages/dsh-smart-assistant/`、`_dist/`。
- **实验（T）**：全局 `dsh 0.2.1-rc.5`＋`pnpm 11.28.5`，`DSH_HOME` 全部落在
  `.tmp/lifecycle-probe/home-*`（仓内临时区，未碰 `~/.dsh`）。命令与输出摘录见 §八。

## 一、一句话结论

`_dist/` 的别扭不是打包脚本的问题，是**插件形态**的问题：当前产品形态是
**"bundle ＋ 一个专用 profile ＋ 一个替你改 profile 的安装器"**；而 DSH 唯一可安装、可在市场里被
按名字安装的单位是**bundle 本身，装进用户已有的 profile**——产品 = bundle + profile 组合 + 默认值 + 文档；
安装默认走应用内 Plugins 页，CLI 是面绑定自动化。

安装器与 profile patch 在替 bundle 补三件事——**默认 preset、默认值、首启路径**——所以发行物长成了
"一个需要说明书才能点亮的包"。把这三件事收回 bundle，`_dist/` 才会自然长成普通社区插件的样子。

## 二、实验设置与时间线

| 实验 | 做什么 | 结果一句话 |
|---|---|---|
| E1 | 干净 home 建 shipped `web` profile，`dsh plugin add` 我们的 0.1.13 tgz | 装得上、行全在，但 `agent-preset-registry.default` 仍是 `standard` |
| E2 | 按 README「推荐路径」建专用 `assistant` profile（`--from-default-profile web`），再装 tgz | 同上：`default: standard` ——**专用 profile 也没有点亮产品** |
| E3 | 同一 tgz 装进 shipped `headless` profile | 组合可用，但 stderr 报 `patch: entry "ui-sidebar-terminal" not found`；无 roster 行 |
| E4 | 把 `- id: agent-preset-registry / config: default: assistant` 写进**bundle patch**（探针包），装进干净 `web` profile | dump 出现 `default: assistant`，且该行被标注 `# == @deepseek-ai/dsh-web-app, patched by dsh-smart-assistant`——**bundle 自己能给默认 preset** |
| E5 | `dsh plugin remove` 后检查残留 | profile manifest 与 dump 干净；home 根只剩 `profiles/`（数据目录是首启才建） |
| 启动 | 用 E4 的 home 起 `dsh --profile web --no-open --port 0` | 正常打印 `dsh web: http://127.0.0.1:<port>/?token=…`；首启创建 `<home>/assistant/`（SOUL/MANUAL/AGENTS + 四房间骨架） |
| 市场条目 | 只用今天 manifest 能提供的字段构造 index 条目，用 vendor 的 `parseMarketIndex` 校验 | 条目**合法**，install spec = `dsh-smart-assistant@0.1.13`，但 title 回退成包名、无 icon/author/homepage/keywords |

## 三、逐段对照（生命周期九段）

| 阶段 | DSH 的做法（规范） | 本仓现状 | 判定 |
|---|---|---|---|
| 打包 | 只发 bundle；`dsh.bundle.patch` 指一份或有序几份 patch；自包含；`engines.dsh`；预构建产物 | `dsh.bundle.patch: ./cordis.patch.yml` ✓；`files` 只含产物 ✓；`engines.dsh` ✓；预构建 `lib/` ✓ | 基本合规；**包内混着安装器**（D5） |
| 发布 | registry / tarball / git 三形态；准入看 `engines.dsh` 或 DSH peers；发预构建产物 | 只有 `_dist/*.tgz` 手动分发；`"private": true`（`package.json:4`）挡住 `npm publish`（发布库抛 `EPRIVATE`）；无发布脚本/CI；git 源不可用（`lib/` 被 ignore、无 `prepare`） | **不合规**（D2） |
| 安装 | Plugins 页 / `plugin_manager` / `dsh plugin`，写 profile 两个文件 | 三条通道都能装 ✓；但 README／手册主叙事是"填 tarball 绝对路径"，且装完产品不亮（D1） | 通道合规、**体验不合规** |
| 初始化 | profile 首建由 `initProfile` 做，已有文件一律不覆盖；不做自己的"首启"标记 | 无自建 profile 写者（`dsh plugin`/`--from-default-profile`）✓；但 `bootstrap.mjs` 直接写 profile patch（`bootstrap.mjs:430-456`） | 部分偏离（D5） |
| 特殊初始化 | 无插件级迁移钩子；一次性动作自己保证幂等、凭据可判定 | scaffold 无"首启"标记，靠文件缺失判断；幂等 ✓ | 合规 |
| 配置 | 默认值进 bundle patch；可变项做 Config；`config` 是整份替换 | 默认值**不在** bundle patch（默认 preset 在 profile patch）；Config 齐 ✓；`dataDir` 可配置 | **不合规**（D1）＋一处待议（D6） |
| 启动 | named profile；失败分级；不做第二个 launcher | 走 named profile ✓；`bootstrap.mjs` 是"薄 bootstrap"但把它当默认安装入口用 | 形态合规、**定位错位**（D5） |
| 更新 | 卸载再安装；成员变化要重启；**没有命令级回滚** | 手册写了 add 新 tgz、回滚是重装旧版 ✓；README **没有升级节**（`README.md` 小节：Install/What/Configuration/Data/Compatibility/Uninstall） | 部分（D7） |
| 卸载 | 只回收包与 patch 层，数据一律留下 | `remove` 干净 ✓（E5）；数据位置与清理写在 README ✓ | 合规（数据路径另见 D6） |
| 文档 | README 固定形（装/验/配/升/卸/数据）；Plugins 页只读 `package.json` 与导出 locale/icon | 六节基本齐、缺"升级"；**无 `locale/*.json`、无 `icon`、无 `author/homepage/keywords`**；手册与 README 对"默认 preset"互相矛盾 | **不合规**（D3、D7） |

## 四、差距清单（按根因排序）

### D1 产品默认 preset 不在 bundle 里（根因：形态）

- 规范：产品默认值放 **bundle patch**，随 bundle 版本发布；产品 bundle 通常只插产品行、preset 与默认值。
- 平台事实：`agent-preset-registry` 行由 web-app 层提供，`config.default: standard`
  （`vendor/dsh/packages/bundle/web-app/cordis.patch.yml:586-589`）；用户级 `selectedDefault`
  是 volatile 字段，**优先于**部署默认（`vendor/dsh/packages/preset/agent-preset-registry/src/index.ts:56,75`）。
- 现状：默认 preset 由安装器写进 profile patch（`bootstrap.mjs:430-456`），开发环境由
  `dev/env/setup.sh` 复制 dev/profiles/profile-patch.yml（2026-11-02 已删除，默认值改由 bundle patch 提供）写入。**bundle 本身不带**。
- 后果（E1/E2 实测）：任何"装进已有 profile"的用户——也就是 Plugins 页/市场/`dsh plugin add` 的全部用户——
  拿到的是 `default: standard`：产品行、房间面板在，但新会话是普通 agent，working folder 不生效。
  手册自己承认这一点（`_dist/安装手册.md:131-132`「`default:` 可能仍是 `standard`」），
  隔四行又写「新会话默认就是『章鱼管家』」（`:139`）——同一份生成物自相矛盾。
- 已证的补法（E4）：把 `- id: agent-preset-registry` ＋ `config: { default: assistant }` 放进
  **bundle patch**，装进任意 web profile 即得 `default: assistant`；已选过 preset 的用户不受影响
  （`selectedDefault` 优先）。代价：`config` 是整份替换，registry 行将来加字段会被我们覆盖掉
  → 必须跟 pin 复核（见验收标准 A6）。

### D2 发布不出来（根因：缺发布纪律）

- `"private": true`（`packages/dsh-smart-assistant/package.json:4`）。`npm publish --dry-run` 能过，
  但真发布会以 `EPRIVATE` 被拒（本机 npm 10.9.8 的实测行为；dry-run 不走该分支）——所以 dry-run 的绿灯是假证据。
- 名字可用：`npm view dsh-smart-assistant` → 404（未占用）。
- 无发布流水线：`pnpm export-dist` 自述「导出 ≠ 发布：不 bump 版本、不跑门禁链、不发 registry——按工作树现状打包」
  （`scripts/release/export-dist.mjs` 头注）。发行物与 tag/commit 无绑定。
- git 通道结构性不可用：`lib/` 被 `.gitignore:11 packages/*/lib/` 排除，`package.json` 没有 `prepare`；
  市场 git 条目会装出一份没有 `lib/index.js` 的包。⇒ 社区分发必须走 npm，且文档要写明。

### D3 市场/Plugins 页读不到展示元数据（根因：缺元数据）

- 平台事实：Plugins 页与 Discover 只读 `package.json` ＋ 导出的 `locale/<lang>.json`（`meta.title/description`）
  ＋ `icon`（`vendor/dsh/packages/boot/app-boot/src/package-meta.ts`）；市场条目还读
  `author`、`homepage`、`keywords`（`vendor/dsh/apps/plugin-market-generator/README.md`「What gets listed」）。
- **客户端列表只用 meta**：标题没有 meta 时回退包名，描述没有 meta 时**为空**
  （`vendor/dsh/packages/client/ui-plugin-manager/src/client/presentation.ts:117-125`）；manifest 的
  `description` 只用在安装预览。⇒ 没有 `locale/*.json` 不只是"卡片不漂亮"，是 Plugins 页那一行没有一句介绍。
- 现状：`exports` 里有 `./package.json`、`./client`，**没有 `./locale/*.json`、没有 `./icon`**；
  `package.json` 没有 `icon`/`author`/`homepage`/`keywords`。
- 后果（市场条目探针）：条目合法、可安装，但卡片标题是 `dsh-smart-assistant`（回退包名），
  没有图标、作者、主页、检索关键词——与 DSH 自家 343 个包的形状不同。

### D4 面（surface）声明只是隐含的（根因：文档未声明）

- bundle 是 **web-only**：override `ui-chat`／`locale`／`ui-sidebar-terminal`（仅 web-app 层有），
  insert `assistant-product`（必注 `connection`＋`workspaceRegistry`）。
- E3 实测：装进 headless profile 时 `dsh` 报 `patch: entry "ui-sidebar-terminal" not found`（只警告、不失败），
  `assistant-product` 在无 web 服务的组合里会停在 pending（本仓 dev headless 用 profile patch 显式 disable，
  见 `dev/profiles/profile-patch-headless.yml`）。
- 规范要求：安装说明必须写清运行在哪个 surface、headless 怎么装。我们 README 只提
  "headless/SDK/ACP 没有 Plugins 页，用 CLI"，没写"本 bundle 只支持 web，headless 要补一行 disable"。

### D5 安装器住在 bundle 里，且承担了 bundle 该做的事（根因：形态错位）

- 规范：安装器只给 shell/自托管，是**独立发布单位**，有自己的 checksum/签名；产品不拥有 launcher；
  外层最多一个薄 bootstrap。
- 现状：`bootstrap.mjs` 在 `files` 白名单里（`package.json:116-125`），随 npm 包装进每个用户机器；
  它做三件超出"薄"的事：`npm pack` 本包、`dsh plugin add`、**直接写 profile patch 设默认 preset**
  （`bootstrap.mjs:430-456`，并有一条自承的 warning：「profile default still standard; select 章鱼管家 in the Web UI」）。
- 后果：一个市场上装 bundle 的用户，手里同时有一个"能替他建 home、建 profile、改 patch、起 Web、记 pid 的脚本"——
  它与 `dsh plugin`/`plugin_manager` 并列为第二套安装/状态写者，正是"两个更新器/两个 profile 写者"这一类反模式。

### D6 派生索引写在 `$DSH_HOME` 根（根因：数据面分类错误）

- 现状：`session-query-sqlite` 的 `path` = `dshHomePath('session-search.db')`（`cordis.patch.yml:99`）
  → `$DSH_HOME/session-search.db`，一个**通用名文件直接躺在 home 根**。
- 规范：可重建的索引属于**缓存**（`$DSH_HOME/cache`），不在 home 根自造通用名文件；
  `vendor/dsh/packages/util/home-paths/src/index.ts:170` 的 `dshCachePath` 就是这条路径的助手。
- 后果：卸载后留下一个别人也可能想要的名字；两个 bundle 都用同名文件就会互相踩。
  修法：`dshCachePath('assistant', 'session-search.db')`，README 写明"可删、下次检索重建"。

### D7 文档形状（根因：文档层级未分开）

- README（插件面，骨架 = 装/贡献/配置/数据/兼容/升级/卸载）：缺 `## 升级`（重启、无命令级回滚、重装旧版）；Install 首页仍以
  "填 tarball 绝对路径"为主叙事，而规范口径是"在 Plugins 页安装 `<包名>`"；七个必答问题里
  #1（会插入哪些 entry id）与 #6（升级/回退）没有直答。
- 手册（产品面，十段 = 是什么/前置/选运行时/安装/首启/验证/配置/升级/卸载/排错/安全）：缺"选运行时"（npm 全局 / Desktop / wheel / 源码）与"安全"两段；
  Install 章先教 `--from-default-profile` 建 profile、第八节教手写 profile patch——在 D1 修好之后
  这些都会变成多余步骤。
- 两份文档各自维护"默认 preset 怎么生效"，已经漂成互相矛盾（见 D1 引的两行）。

### D8 每个 pin 上的 vendor 行 override 没有退役纪律（根因：缺复核机制）

- bundle patch 覆盖了 8 处 vendor 行（`ui-chat`、`locale`、`tool-skill`、`session-query-sqlite`、
  `time-context`、`schedule`、`ui-schedule`、`ui-sidebar-terminal`）。其中两处是**已知 bug 的绕行**：
  `ui-chat.transcriptView`（此 pin 预构建 client 落后于 src）与 `tool-skill` 的 host 迁移。
- 实测：npm 上 `@deepseek-ai/dsh@0.2.1-rc.5` 的 `dsh-client-ui-chat/lib/client.js:12912` 已有
  `constructor(host, defaultMode = DEFAULT_TRANSCRIPT_VIEW_MODE)` 兜底 ⇒ 该绕行在 rc.5 上**已可退役**；
  对一个装进别人 profile 的 bundle 来说，继续覆盖 `transcriptView` 等于**替用户改他已有的偏好**。
- 规范：产品默认值可以覆盖，但"绕行"必须写退役条件并按 pin 复核（本仓 patch 注释里其实写了退役条件，
  只是没有机制在换 pin 时逼着执行）。

### D9 `bin` 的可发现性（根因：小）

`assistant-data`／`ov-doctor`／`expert-setup` 在手册里用
`node <DSH_HOME>/profiles/<p>/node_modules/dsh-smart-assistant/bin/*.mjs` 调用——能用（`nodeLinker: hoisted`），
但对社区用户不友好；README 没有任何一条运行方式。

## 五、市场条目探针（把"缺什么"变成可复现的检查）

用今天 manifest 能提供的字段构造条目，`@deepseek-ai/dsh-plugin-market-index` 校验通过（脚本可随用随放 `.tmp/`，只用仓内模块）：

```js
import { parseMarketIndex, marketInstallTarget } from '<repo>/vendor/dsh/packages/util/plugin-market-index/lib/index.js'
const m = /* 打包并解出的 package.json */
const entry = {
  name: m.name,
  title: m.name,                 // 回退：没有 locale meta
  description: m.description,    // 回退：package.json.description
  distTags: { latest: m.version },
  versions: [{ version: m.version, publishTimestamp: Math.floor(Date.now() / 1000),
    source: { type: 'npm' }, engines: { dsh: m.engines.dsh } }],
}
const parsed = parseMarketIndex({ format: 1, title: 'probe', plugins: [entry] }, 'https://example.test/index.json')
console.log(marketInstallTarget(parsed.plugins[0].name, parsed.plugins[0].versions[0]))
```

输出：

```
VALID index; parsed plugin keys: [ 'name', 'title', 'description', 'metadata', 'versions' ]
install target: {"spec":"dsh-smart-assistant@0.1.13"}
parsed title/description: "dsh-smart-assistant" "A DSH agent preset that owns a home: durable memory, …"
```

结论：**格式不是障碍，展示面是空的**——补上 `locale/{en,zh}.json`、`icon.svg`、`keywords`、`author`、`homepage`
之后，同一条目就会变成"有标题、有图标、有作者、可检索"的普通条目。该探针可以直接做成验收脚本（见卡上 A3）。

## 六、平台机制备忘（这次核实到的、与方案直接相关的八条）

1. **profile 的 pnpm 设置**：`nodeLinker: hoisted` ＋ `autoInstallPeers: false`
   （`vendor/dsh/packages/boot/app-boot/src/profile.ts:247-258`）⇒ 我们的 peer 策略（peer+dev 双写、运行时解析）
   正是宿主期望的形状，`yaml` 是唯一 dependencies ✓。
2. **安装三个状态**：pnpm 成功 → dependency 写入 → 进 `dsh.profile.bundles`；第三步才让功能存在（平台实测）。
   E1/E4 都到第三步。
3. **`--from-default-profile` 是破坏性替换**，不是升级；把它当"安装第一步"写进文档会让用户以为
   每次升级都要重置。
4. **市场是第三方静态 index**：DSH 不带任何索引源；Discover 由 experimental 的
   `custom plugin markets` bundle 提供（`vendor/dsh/.agents/notes/implemented/feature/2026-10-02-plugin-market-discover.md`），
   用户自己加 index URL。官方 catalog 是 `@deepseek-ai/*` 首方包名的生成物
   （`vendor/dsh/packages/boot/app-boot/src/official-bundles.generated.ts`：条目名全是 `@deepseek-ai/dsh-*`，
   每条都带 en/zh 标题与图标）——**我们进不了官方 catalog，只能走社区 index**。
5. **发布版 `@deepseek-ai/dsh` 的 latest = 0.2.1-rc.5**，与我们 `engines.dsh` 的 `>=0.2.1-rc.2 <0.3.0-0` 匹配；
   本仓 vendor pin 仍是 rc.2，两者对 `ui-chat` 是否带兜底结论不同（D8）。
6. **`plugin_manager` 工具出厂关着**（`vendor/dsh/packages/bundle/base/cordis.patch.yml:16-19` 的 `disabled: true`），
   只在 Creator（`cordis`）preset 里按 `profileContext` 打开
   （`vendor/dsh/packages/bundle/web-app/presets/cordis.patch.yml:131-134`）⇒ 普通用户唯一的 GUI 安装入口是
   **Plugins 页**；"让模型替你装"不是可依赖的路径（我们的 preset 也没挂它）。
7. **页面里的本地路径必须是绝对路径**（`vendor/dsh/packages/boot/plugin-manager/src/install-spec.ts:69-88`：
   `file:`/`link:` 前缀会被剥掉、相对路径直接拒），只有 CLI 的 `add .` 会按调用目录锚定
   （vendor/dsh 的 plugin-manager `operations.ts` 的 `anchorPathSpec`）。所以手册写"填 tarball 绝对路径"没错，
   错在把它当主叙事。
8. **社区命名实况**：第三方包以 **unscoped `dsh-*`** 为主（`dsh-codex-ui`、`dsh-agent-plugins-market` 等），
   `@deepseek-ai/*` 是首方 scope；另有把"目录"本身发成 npm 包的（catalog/feed 类）与"自带市场 UI 的 bundle"。
   ⇒ `dsh-smart-assistant` 这个名字在惯例内；我们不需要自建市场 UI 或 catalog 包。

## 七、未测与证据强度

未测（写方案时不能当作已证）：

- Desktop 真机（Plugins 页在 Desktop 上装 third-party 的完整回路）、Windows。
- Discover 页真机（需要装 experimental market bundle 并加一个 https index）。
- 真 `npm publish`（只在 dry-run 层面验证了 `EPRIVATE` 会拦；没有账号/token）。
- headless 里 `assistant-product` 的 pending 形态（只读到源码与文档声明；E3 未起 boot）。
- 会话级"新会话 preset id = assistant"（要凭据或浏览器；E4 只证到 `--dump-config` 与 boot）。
- rc.2 发布物的 `ui-chat` 是否有兜底（只验了 rc.5；rc.2 需另取发布物）。

证据强度：E1–E5 与市场探针均为今日实跑（T）；平台事实为钉住源码与 npm 发布物阅读（C）；
规范侧条目是建议（不是合同）。

## 八、附录：命令与输出摘录

```sh
# 环境：dsh 0.2.1-rc.5（全局）、pnpm 11.28.5、node v22.23.1；DSH_HOME 均在 .tmp/lifecycle-probe/

# E1  干净 web profile + 我们的 tgz
DSH_HOME=.tmp/lifecycle-probe/home-web dsh --profile web --dump-config
DSH_HOME=.tmp/lifecycle-probe/home-web dsh plugin --profile web add ./_dist/dsh-smart-assistant-0.1.13.tgz
#   manifest: bundles = [dsh-base, dsh-web-app, dsh-smart-assistant]
#   dump: agent-preset-registry → default: standard；assistant-* 行与 preset-assistant 都在

# E2  专用 profile（README 推荐路径）
dsh --profile assistant --from-default-profile web --dump-config
dsh plugin --profile assistant add ./_dist/dsh-smart-assistant-0.1.13.tgz
#   dump: default: standard   ← 专用 profile 也没点亮产品

# E3  headless
dsh --profile assistant-hl --from-default-profile headless --dump-config
dsh plugin --profile assistant-hl add ./_dist/dsh-smart-assistant-0.1.13.tgz
#   stderr: dsh: [dsh-smart-assistant] patch: entry "ui-sidebar-terminal" not found

# E4  bundle 自带默认 preset（探针包 = 解包目录 + 追加下面两行后 npm pack）
#   - id: agent-preset-registry
#     config:
#       default: assistant
dsh plugin --profile web add .tmp/lifecycle-probe/dsh-smart-assistant-0.1.13.tgz
#   dump: default: assistant
#   dump: 629:# == @deepseek-ai/dsh-web-app, patched by dsh-smart-assistant

# 启动（E4 的 home）
dsh --profile web --no-open --port 0
#   dsh web: http://127.0.0.1:51706/?token=…
#   首启创建 <home>/assistant/{SOUL.md,MANUAL.md,AGENTS.md,memory,research,skills,knowledge,skill-proposals}

# E5  卸载
dsh plugin --profile web remove dsh-smart-assistant
#   manifest 只剩 profile 字段；dump 提及次数 = 0；home 根只剩 profiles/

# 市场条目探针：见 §五 的脚本（只用仓内 vendor 的校验模块）

# 名字与发布物
npm view dsh-smart-assistant version   → 404（未占用）
npm view @deepseek-ai/dsh dist-tags    → latest 0.2.1-rc.5
```

环境噪声（不是差距）：pnpm 首次在 home 外安装时提示 store 位置（`The store at ~/Library/pnpm/store/v11 is not used…`），
并把 store 落到仓内 `.pnpm-store/`；`npm pack`/`npm view` 需要把 cache/logs 指向仓内 `.tmp/`（沙箱只放行会话目录）。
