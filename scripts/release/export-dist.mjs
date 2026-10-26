#!/usr/bin/env node
// 何时跑：需要把插件交付给仓库外的人时（版本变动后、给无仓库权限者、风险变更前快照）；秒级，无 key。
// 用法：node scripts/export-dist.mjs（或 pnpm export-dist）
//
// 手动分发导出（精神借 ai_dsh_company 的 export-dist，它借 ai_dsh_architect，2026-09-29）：
// 把 dsh-smart-assistant 打成 _dist/ 下的 tarball + 同目录生成《安装手册》。三条规矩照搬：
//   ① _dist/ 是导出目的地不是源——tgz 全 gitignore（根 .gitignore 的 *.tgz 已覆盖），
//      手册是唯一 tracked 例外，版本由 verify 门禁对着 package.json 防漂；
//   ② 打包步 = release-smoke 每轮证明的同一条 `pnpm pack`——必须是 pnpm 不是 npm：
//      本包 peerDependencies 写的是 `workspace:^`，只有 pnpm 会在打包时改写成具体版本
//      （npm 原样带上，装出去没人能解析；release-smoke 对产物断言同一条）；
//   ③ 手册由脚本生成、注入版本与日期，永不手改——手册和旁边的 tarball 不可能漂。
// 导出 ≠ 发布：不 bump 版本、不跑门禁链、不发 registry——按工作树现状打包。
// 与 company 的两处差异是刻意的：
//   · 打包前要求 lib/ 已构建（发布物是编译产物；空 lib 打出去手册条目再对也装不上）；
//   · 清单边界在必备条目之外再加禁入清单（src/tests/node_modules/vendor/tsconfig）——
//     开发面不进发布物，这条在 src 还在 files 白名单里的年代是拦不住的。
import { execFileSync, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, isAbsolute, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { pinnedTagFrom } from '../maintenance/sync-bookkeeping.mjs'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const packageDir = join(repoRoot, 'packages', 'dsh-smart-assistant')
const distDir = join(repoRoot, '_dist')
const manualName = '安装手册.md'

const failed = []
const report = (name, ok, detail) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`)
  if (!ok) failed.push(name)
}

const manifest = JSON.parse(readFileSync(join(packageDir, 'package.json'), 'utf8'))
const tarballName = `${manifest.name}-${manifest.version}.tgz`

// 手册的验证基线行锚定 vendor/UPSTREAM.md 的钉住 tag（唯一出处）。它曾是硬编码字面量，
// 0.1.7→0.2.0 换 pin 时烂掉一次（手册落后一个基线）——verify 的 export-manual 门现钉这一行。
// 行解析的家：sync-bookkeeping.mjs 的 pinnedTagFrom（五个消费方的唯一出处）。
const upstreamTag = pinnedTagFrom(readFileSync(join(repoRoot, 'vendor', 'UPSTREAM.md'), 'utf8'))
if (!upstreamTag) {
  console.error('vendor/UPSTREAM.md has no 钉住的 tag row — fix the pin bookkeeping before exporting')
  process.exit(2)
}

// lib/ 是 gitignore 的构建产物：不 build 就 pack 会静默导出旧代码或空包，先把它变成响亮的错。
if (!existsSync(join(packageDir, 'lib', 'index.js'))) {
  console.error('packages/dsh-smart-assistant/lib/index.js is missing — run `pnpm build` first')
  process.exit(2)
}

mkdirSync(distDir, { recursive: true })
// 只清本脚本自己的旧产物，不动 _dist/ 里别人放的东西
for (const name of readdirSync(distDir)) {
  if (name === manualName || new RegExp(`^${manifest.name}-.*\\.tgz$`).test(name)) {
    rmSync(join(distDir, name), { force: true })
  }
}

// 1. 打包——与 release-smoke 同一条 `pnpm pack`
const packed = spawnSync('pnpm', ['pack', '--pack-destination', distDir], { cwd: packageDir, encoding: 'utf8' })
const packedPath = (packed.stdout ?? '').trim().split('\n').filter(Boolean).pop()
// pnpm 打印绝对路径，npm 打印裸文件名
const tarball = packedPath && isAbsolute(packedPath) ? packedPath : join(distDir, packedPath ?? '')
report('pnpm pack', packed.status === 0 && packedPath === join(distDir, tarballName),
  `exit ${packed.status}, ${packedPath ?? 'no tarball'}${(packed.stderr ?? '').trim() ? `: ${(packed.stderr ?? '').trim().split('\n')[0]}` : ''}`)

// 2. 清单边界——对导出的产物本体断言发布形状
const listed = spawnSync('tar', ['-tzf', tarball], { encoding: 'utf8' })
const entries = (listed.stdout ?? '').split('\n').filter(Boolean)
const must = [
  'package/package.json',
  'package/cordis.patch.yml',
  'package/lib/index.js',
  'package/lib/client/index.js',
  'package/lib/cli/expert-setup.js',
  'package/lib/cli/assistant-data.js',
  'package/bin/ov-doctor.mjs',
  'package/bin/expert-setup.mjs',
  'package/bin/assistant-data.mjs',
  'package/bootstrap.mjs',
  'package/LICENSE',
  'package/seeds/management/management-lens-ceo.md',
  'package/README.md',
]
const missing = must.filter((entry) => !entries.includes(entry))
const skills = entries.filter((entry) => /^package\/presets\/assistant\/skills\/.+\/SKILL\.md$/.test(entry))
const seeds = entries.filter((entry) => /^package\/seeds\/.+\/(?!README\.md$).+\.md$/.test(entry))
const forbidden = entries.filter((entry) =>
  !entry.startsWith('package/')
  || entry.startsWith('package/src/')
  || entry.startsWith('package/tests/')
  || entry.startsWith('package/node_modules/')
  || entry.startsWith('package/tsconfig')
  || entry.includes('/vendor/'))
report('tarball inventory', listed.status === 0 && missing.length === 0 && skills.length > 0 && seeds.length > 0 && forbidden.length === 0,
  `${entries.length} entries, skills ×${skills.length}, seeds ×${seeds.length}`
  + `${missing.length ? `; missing: ${missing.join(', ')}` : ''}`
  + `${forbidden.length ? `; forbidden: ${forbidden.slice(0, 5).join(', ')}${forbidden.length > 5 ? ' …' : ''}` : ''}`)

const handoff = spawnSync(process.execPath, [join(repoRoot, 'scripts', 'release', 'handoff-scan.mjs'), tarball], { encoding: 'utf8' })
report('handoff scan', handoff.status === 0,
  handoff.status === 0 ? 'no user data, credentials, host paths or live-secret shapes'
    : `${(handoff.stderr ?? handoff.stdout ?? '').trim().split('\n').slice(-5).join(' | ')}`)

// 3. 产物 manifest——peer 范围必须是具体 semver（pnpm 改写发生没发生的直接证据）
let packedManifest
try {
  packedManifest = JSON.parse(execFileSync('tar', ['-xzOf', tarball, 'package/package.json'], { encoding: 'utf8' }))
} catch { /* 缺 package.json 时上面已 FAIL，这里不再叠加堆栈 */ }
const badPeers = Object.entries(packedManifest?.peerDependencies ?? {})
  .filter(([, range]) => String(range).startsWith('workspace:') || !/^[\^~]?\d/.test(String(range)))
report('packed peer ranges are concrete', packedManifest !== undefined && badPeers.length === 0,
  badPeers.length ? badPeers.map(([name, range]) => `${name}: ${range}`).join(', ') : `${Object.keys(packedManifest?.peerDependencies ?? {}).length} peers`)
report('packed name/version match the working tree',
  packedManifest?.name === manifest.name && packedManifest?.version === manifest.version,
  packedManifest ? `${packedManifest.name}@${packedManifest.version}` : 'manifest unreadable')

// 4. 手册——脚本生成，版本/日期/条目数注入；步骤镜像 release-smoke 验证过的安装路径
const prodDeps = Object.keys(packedManifest?.dependencies ?? {})
const date = new Date().toISOString().slice(0, 10)
const manual = `# dsh-smart-assistant 手动安装手册

| | |
|---|---|
| 版本 | ${manifest.version} |
| 安装包 | \`${tarballName}\`（与本手册同目录） |
| 打包日期 | ${date} |
| 验证基线 | DSH \`${upstreamTag}\`（Node ^22.19.0 || >=24） |

这个安装包是自包含的：bundle 补丁（\`cordis.patch.yml\`，含 \`assistant\` preset 的完整组合）、
编译产物（\`lib/\`，含浏览器端桌面面板与专家装配模块）、策展技能（\`presets/assistant/skills/\`）、
管理种子（\`seeds/management/\`）、三个 bin（\`ov-doctor\` / \`expert-setup\` / \`assistant-data\`）、
独立启动 \`bootstrap.mjs\`、README。
DSH 本体一律按 peerDependencies 由宿主运行时提供，包里不带任何
\`@deepseek-ai/*\` 代码；唯一的 npm 依赖是 ${prodDeps.map((name) => `\`${name}\``).join('、') || '（无）'}
（安装时经 npm registry 拉取）。DSH 安装时会按包里的 \`engines.dsh\` 检查兼容；
不满足会拒绝安装，不要用强制安装跳过它。安装与 headless 附录路径由仓库发布冒烟
（release-smoke）验证；Web UI 选择路径由 \`agent-preset-ui\` 探针在运行实例上验证。

## 一、安装

默认装进你日常的 \`web\` profile（DSH 出厂默认名）。装完还要选默认 preset：Web 用下一节的
UI；headless 用本文末尾的 profile patch。安装只带定义，不改默认。

\`\`\`sh
dsh plugin --profile web add /path/to/${tarballName}
\`\`\`

想先隔离试用、不动日常环境？换一个名字，多一步一次性初始化：

\`\`\`sh
dsh --profile try-assistant --from-default-profile web --dump-config   # 只需第一次
dsh plugin --profile try-assistant add /path/to/${tarballName}
\`\`\`

（后文以 \`web\` 为例；用了别的名字，把命令里的 \`web\` 换成它即可。）

## 二、在 Web UI 里选择默认 preset

安装只把 \`assistant\` 的**定义**带进组合；profile 的默认 preset 仍是 \`standard\`。打开 Web UI 的
Settings（或新会话的 preset 选择器），在 Agent presets / 自定义组里选 \`章鱼管家\`，设为默认。
之后新会话就用它。

如果界面里没有出现：

- 先跑 \`dsh --profile web --dump-config\`，确认组合里有 \`preset-assistant\`；
- 重启 \`dsh web\` 并硬刷新页面；
- 仍没有，按本文末尾的 headless / 自动化附录写 profile patch 兜底，并把界面缺口记下来。

## 三、验证安装

\`\`\`sh
dsh --profile web --dump-config
\`\`\`

输出里应能看到：

- 插件的补丁层（\`dsh-smart-assistant\`）；
- host 面的 \`assistant-memory\` 行（working folder 的四房间存储）；
- \`id: preset-assistant\`（\`assistant\` preset 的组合行）。

（如果你在第二步用了 UI，\`default:\` 可能仍是 \`standard\`——默认值是用户设置 \`selectedDefault\`，
以 UI 选择为准；headless/自动化才需要 profile 的部署默认。）

## 四、让它出现在界面上

重启 \`dsh web\`（浏览器刷新本身不会加载新模块），然后**硬刷新**页面（⌘⇧R / Ctrl⇧R）。之后：

- 侧栏出现 My Desk 桌面面板（记忆 / 知识页 / 技能 / 养护检查）；
- 新会话默认就是「章鱼管家」（\`assistant\`），它带着自己的 working folder 工作；若仍是 standard，回第二步。

## 五、OpenViking / Viki（可选）

不装这一层，插件照常工作；Viki 面板显示未连接。要开第二记忆层：

### 1. 装 server

需要 Python 3.10+。有 \`uv\` 时：

\`\`\`sh
uv tool install openviking==0.5.1.1
\`\`\`

没有 \`uv\` 时用 pip/pipx 装同一版本。\`uv tool install\` 装不进系统目录（沙箱/受管机器常见）时，
用隔离 venv，并用该 venv 的 \`openviking-server\` 启动：

\`\`\`sh
uv venv ~/.openviking/venv
~/.openviking/venv/bin/pip install openviking==0.5.1.1
\`\`\`

server 与插件是独立进程，插件不会替你拉起它。

### 2. 写配置

\`~/.openviking/ov.conf\`（0600；不要提交真 key）：

\`\`\`json
{
  "vlm": {
    "provider": "openai",
    "api_base": "https://your-provider.example/v1",
    "api_key": "sk-...",
    "model": "your-vlm-model"
  },
  "embedding": {
    "dense": {
      "provider": "openai",
      "api_base": "https://your-provider.example/v1",
      "api_key": "sk-...",
      "model": "your-embedding-model",
      "dimension": 1024
    }
  }
}
\`\`\`

- VLM 必须支持 function calling；embedding 的 \`dimension\` 要与模型一致。
- 不写 \`storage\` 时 server 用 \`~/.openviking/workspace\`（持久）；不要把存储指到临时目录。
- 云端 provider：\`OPENVIKING_CLOUD_ACK=1\` 是显式标记；doctor 会检查 ack 与工具结果。

### 3. 起 server

\`\`\`sh
nohup openviking-server --config ~/.openviking/ov.conf --port 1933 > ~/.openviking/server.log 2>&1 &
curl -s http://127.0.0.1:1933/health
\`\`\`

health 绿只说明进程活着，不等于 search/commit 可用。

### 4. 装 DSH 侧插件

server 与插件是两个进程：只起 server，DSH 组合里没有 \`openviking-memory-runtime\` 行，doctor 会报
\`OFF\` / exit 2，Viki 也不会连上。装钉住的 0.5.26：

\`\`\`sh
dsh plugin --profile web add @openviking/dsh-memory-plugin@0.5.26
\`\`\`

离线或想用仓内钉存件时，把上面换成 \`/path/to/dsh-memory-plugin-0.5.26.tgz\`。装完
\`dsh --profile web --dump-config\` 应看到 \`openviking-memory-runtime\` 行。

### 5. 让 DSH 连上

在启动 \`dsh web\` 的同一个 shell：

\`\`\`sh
export OPENVIKING_URL=http://127.0.0.1:1933
export OPENVIKING_CAPTURE_TOOL_RESULTS=false
export OPENVIKING_CLOUD_ACK=1   # 云端 provider 才需要；本地 provider 省略
dsh web
\`\`\`

- 本机默认 \`http://127.0.0.1:1933\`；只有远程/非默认端口才需要设 \`OPENVIKING_URL\`。
- 插件对 DSH 默认会抓完整工具结果；云端 provider 下先设 \`false\`，除非你已配置 \`captureFilters\`。
- 云端 provider 必须显式 \`OPENVIKING_CLOUD_ACK=1\`；doctor 会检查。

### 6. 自检：ov-doctor

包内带一个只读 doctor；在装了插件的 profile 里运行（把 \`<DSH_HOME>\`/\`web\` 换成你的）：

\`\`\`sh
node <DSH_HOME>/profiles/web/node_modules/dsh-smart-assistant/bin/ov-doctor.mjs \\
  --config ~/.openviking/ov.conf
\`\`\`

退出码：\`0\` 健康 / \`1\` 坏了 / \`2\` 可选层缺席或配置读不到。覆盖 health、config、upstream doctor、
search、composition、storage、cloud/capture、版本、config 同源与 MCP \`initialize.instructions\`；
commit 写探针默认 SKIP；加 \`--write\` 才创建 sentinel 会话并真提交（会新增一条记忆，慎用）。云端 provider 运行时，
命令前加 \`OPENVIKING_CLOUD_ACK=1\`，与上面的显式 ack 是同一个门。它不会打印 key。

### 7. 故障表

| 现象 | 原因与处理 |
|---|---|
| Viki 503 / 未连接 | server 没起；远程/非默认端口还需要设 \`OPENVIKING_URL\` 或 \`assistant-viki.baseUrl\`；先 \`curl /health\` |
| health 绿但 search 空/500 | 模型位不可达或 embedding 熔断；看 \`~/.openviking/server.log\` 的 provider/model/key |
| commit failed | VLM 连接/function calling/连续 user 消息兼容；看 \`/api/v1/tasks\` 与 server 日志 |
| 记忆重启后丢 | storage 指到了临时目录；改成持久路径并重启 |

## 六、升级与备份

**升级前先备份**：插件拥有的数据在两个目录，不是代码目录：

\`\`\`sh
cp -R "<DSH_HOME>/assistant" "<备份目录>/assistant"
cp -R "<DSH_HOME>/assistant-operating" "<备份目录>/assistant-operating"
\`\`\`

包内 \`assistant-data\` 把这两目录打成带 schema manifest 的备份；恢复要求目标目录为空：

\`\`\`sh
node <DSH_HOME>/profiles/web/node_modules/dsh-smart-assistant/bin/assistant-data.mjs export \\
  --assistant <DSH_HOME>/assistant --operating <DSH_HOME>/assistant-operating --out <备份目录>
node <DSH_HOME>/profiles/web/node_modules/dsh-smart-assistant/bin/assistant-data.mjs import \\
  --in <备份目录> --assistant <DSH_HOME>/assistant --operating <DSH_HOME>/assistant-operating
\`\`\`

它只带这两个插件目录，不含 sessions/credentials/settings；manifest 的 \`schemaVersion\` 不匹配会拒绝，
不会猜着导入。

升级：

\`\`\`sh
dsh plugin --profile web add /path/to/<新版本>.tgz
dsh --profile web --dump-config
\`\`\`

\`--dump-config\` 仍应看到 \`preset-assistant\`；运行中的 Web 实例不会热替换代码，重启 \`dsh\` 后新版本生效。实测直接 \`add\` 新 tgz 会更新版本并保留
working folder/账本；若 CLI 拒绝同版本或要求先 remove，按 CLI 提示先 \`remove\` 再 \`add\`——
\`remove\` 不删 working folder/账本，但升级前仍建议备份。
回滚：保留上一版 tgz；\`remove\` 新版后 \`add\` 旧版；若新版引入不可读的数据格式，先恢复备份。

整 home 备份（含 sessions/credentials/settings）也可以，但不要把代码目录当数据目录。

## 七、卸载（干净，无残留）

\`\`\`sh
dsh plugin --profile web remove dsh-smart-assistant
\`\`\`

卸载后 \`--dump-config\` 不再提及插件，profile 的 package.json 也不留痕迹；运行中的实例重启后不再加载。working folder
本身（\`<DSH_HOME>/assistant/\`）是数据不是插件：卸载不删它，弃用前自行备份。

装了 OpenViking 的，另停 server 并 \`uv tool uninstall openviking\`；\`~/.openviking\` 是配置/数据，
备份后再删。

## 八、headless / 自动化：profile patch

Web UI 不可用或要跑 one-shot 时，用 profile patch 设部署默认。打开
\`<DSH_HOME>/profiles/web/cordis.patch.yml\`：如果里面是占位 \`[]\`，把 \`[]\` 整行替换成下面的块；
文件不存在就整段写入（\`<DSH_HOME>\` 默认是 \`~/.dsh\`）：

\`\`\`yaml
- id: agent-preset-registry
  config:
    default: assistant
\`\`\`

然后 \`dsh --profile web --dump-config\` 应看到 \`default: assistant\` 与 \`preset-assistant\`。
用了别的 profile 名，把路径里的 \`web\` 换掉。

## 九、专家装配（可选：导入管理种子）

新 home 的默认身份已经是管理岗；管理知识种子**不会自动导入**——安装不写 working folder。
要把管理参考页按治理路径先落成 draft：

\`\`\`sh
node <DSH_HOME>/profiles/web/node_modules/dsh-smart-assistant/bin/expert-setup.mjs \\
  --data-dir <DSH_HOME>/assistant
\`\`\`

- 只迁移未经改动的旧通用 SOUL；你编辑过 \`SOUL.md\` 就跳过。
- 种子以 \`draft\` 落 \`knowledge/\`，不进检索/摘要；在 Web UI 知识室（或手改文件）把 \`draft\` 改成
  \`stable\` 才是批准。
- 重复运行幂等；已有的 \`stable\`/\`deprecated\` 页不会被回滚。

## 十、独立目录启动（无 git）

把 tarball 解开到任意目录（不需要 \`.git\`、不需要本仓），在解开的 \`package/\` 里：

\`\`\`sh
node bootstrap.mjs
\`\`\`

前提：PATH 上有兼容的 \`dsh\`（或 \`--dsh <命令>\`）和 Node 自带的 \`npm\`（脚本会先把目录打成 tarball 再装）。脚本会：

- 在 \`--home\`（默认包目录旁的 \`assistant-data/\`）建隔离 \`DSH_HOME\`、workspace、agents-home、tmp；
- 用 \`web\` 模板建 \`assistant-standalone\` profile，装当前包，设部署默认 \`assistant\`；
- 起 \`dsh --port 0\`，打印 URL 与停止命令；不碰日用 \`~/.dsh\`。

\`--home\` 必须在包目录外；指向包内会被拒绝（数据不能混进 agent 物）。

停止：\`node bootstrap.mjs --stop\`（用了 \`--home\` 就带同一个目录）；只建不启动：\`--no-start\`。
离线：\`--offline\` 让 pnpm 走离线；前提是 pnpm/Corepack 本身已在机器上、\`yaml\` 已在 store/缓存。Corepack 首次下载 pnpm 仍需网络；冷缓存会明确失败。
首次模型：新 home 没有凭据，在 Web UI 里配置 provider，或按你的部署方式提供。

## 常见问题

| 现象 | 原因与处理 |
|---|---|
| 刷新后什么都没出现 | 浏览器刷新不加载新模块：重启 \`dsh web\`，再硬刷新页面 |
| Web UI 里没有章鱼管家 | 先确认 \`preset-assistant\` 在组合里；重启并硬刷新；仍没有就按第八节写 profile patch，并记录界面缺口 |
| 升级后数据在哪 | 仍在 \`<DSH_HOME>/assistant\` 与 \`assistant-operating\`；\`remove\` 不删；升级前先备份 |
| 备份怎么恢复 | 用 \`assistant-data import\`，目标目录必须先清空；它按 manifest 的 schemaVersion 拒绝不兼容备份 |
| 独立启动要 dsh 吗 | 要，PATH 上有兼容 \`dsh\` 或传 \`--dsh\`；没有 dsh 的便携包是另一个产品，不在本手册范围 |
| 独立启动的数据在哪 | 默认 \`./data\`（可用 \`--home\` 换）；它不写日用 \`~/.dsh\` |
| DSH 版本不兼容 | 安装会被 \`engines.dsh\` 拒绝；升级 DSH 或换兼容的包版本，不要强制绕过 |
| 管理种子怎么导入 | 默认身份已是管理岗；种子用 \`bin/expert-setup.mjs\` 显式导入为 draft，不会自动进检索 |
| 想确认装了什么版本 | \`dsh plugin --profile web list\`，或看本手册表头的版本号 |
| 安装时要联网吗 | 只为拉那一个 npm 依赖；其余全部由宿主 DSH 提供，不需要克隆任何仓库 |
`
writeFileSync(join(distDir, manualName), manual, 'utf8')
report('install manual generated', true, join('_dist', manualName))

if (failed.length > 0) {
  console.error(`\nexport-dist: ${failed.length} check(s) failed — _dist/ 里的产物不可信，先修再发`)
  process.exit(1)
}
console.log(`\nexport-dist: ${tarballName} + ${manualName} → _dist/`)
