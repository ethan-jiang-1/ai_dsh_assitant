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
  'package/bin/ov-doctor.mjs',
  'package/README.md',
]
const missing = must.filter((entry) => !entries.includes(entry))
const skills = entries.filter((entry) => /^package\/presets\/assistant\/skills\/.+\/SKILL\.md$/.test(entry))
const forbidden = entries.filter((entry) =>
  !entry.startsWith('package/')
  || entry.startsWith('package/src/')
  || entry.startsWith('package/tests/')
  || entry.startsWith('package/node_modules/')
  || entry.startsWith('package/tsconfig')
  || entry.includes('/vendor/'))
report('tarball inventory', listed.status === 0 && missing.length === 0 && skills.length > 0 && forbidden.length === 0,
  `${entries.length} entries, skills ×${skills.length}`
  + `${missing.length ? `; missing: ${missing.join(', ')}` : ''}`
  + `${forbidden.length ? `; forbidden: ${forbidden.slice(0, 5).join(', ')}${forbidden.length > 5 ? ' …' : ''}` : ''}`)

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
| 验证基线 | DSH \`${upstreamTag}\`（Node ≥ 22） |

这个安装包是自包含的：bundle 补丁（\`cordis.patch.yml\`，含 \`assistant\` preset 的完整组合）、
编译产物（\`lib/\`，含浏览器端桌面面板）、策展技能（\`presets/assistant/skills/\`）、README，
共 ${entries.length} 个条目。DSH 本体一律按 peerDependencies 由宿主运行时提供，包里不带任何
\`@deepseek-ai/*\` 代码；唯一的 npm 依赖是 ${prodDeps.map((name) => `\`${name}\``).join('、') || '（无）'}
（安装时经 npm registry 拉取）。下面的步骤与仓库发布冒烟（release-smoke）每轮自动验证的
路径一致，是被证明过的顺序。

## 一、安装

默认装进你日常的 \`web\` profile（DSH 出厂默认名）。装完还要做下一步：把 profile 的默认 preset
切成 \`assistant\`——安装只带定义，不改默认。

\`\`\`sh
dsh plugin --profile web add /path/to/${tarballName}
\`\`\`

想先隔离试用、不动日常环境？换一个名字，多一步一次性初始化：

\`\`\`sh
dsh --profile try-assistant --from-default-profile web --dump-config   # 只需第一次
dsh plugin --profile try-assistant add /path/to/${tarballName}
\`\`\`

（后文以 \`web\` 为例；用了别的名字，把命令里的 \`web\` 换成它即可。）

## 二、把 preset 默认切到 assistant

安装只把 \`assistant\` 的**定义**带进组合；profile 的默认 preset 仍是 \`standard\`。打开
\`<DSH_HOME>/profiles/web/cordis.patch.yml\`：如果里面是占位 \`[]\`，把 \`[]\` 整行替换成下面的块；文件不存在就整段写入（\`<DSH_HOME>\` 默认是 \`~/.dsh\`）：

\`\`\`yaml
- id: agent-preset-registry
  config:
    default: assistant
\`\`\`

用了别的 profile 名，把路径里的 \`web\` 换掉。

## 三、验证安装

\`\`\`sh
dsh --profile web --dump-config
\`\`\`

输出里应能看到：

- \`default: assistant\`（你刚写的 registry 默认）；
- 插件的补丁层（\`dsh-smart-assistant\`）；
- host 面的 \`assistant-memory\` 行（working folder 的四房间存储）；
- \`id: preset-assistant\`（\`assistant\` preset 的组合行）。

## 四、让它出现在界面上

重启 \`dsh web\`（浏览器刷新本身不会加载新模块），然后**硬刷新**页面（⌘⇧R / Ctrl⇧R）。之后：

- 侧栏出现 My Desk 桌面面板（记忆 / 知识页 / 技能 / 养护检查）；
- 新会话默认就是「智能助手」（\`assistant\`），它带着自己的 working folder 工作。

## 五、OpenViking / Viki（可选）

不装这一层，插件照常工作；Viki 面板显示未连接。要开第二记忆层：

### 1. 装 server

需要 Python 3.10+。有 \`uv\` 时：

\`\`\`sh
uv tool install openviking==0.5.1.1
\`\`\`

没有 \`uv\` 时用 pip/pipx 装同一版本。server 与插件是独立进程，插件不会替你拉起它。

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

## 七、卸载（干净，无残留）

\`\`\`sh
dsh plugin --profile web remove dsh-smart-assistant
\`\`\`

卸载后 \`--dump-config\` 不再提及插件，profile 的 package.json 也不留痕迹。working folder
本身（\`<DSH_HOME>/assistant/\`）是数据不是插件：卸载不删它，弃用前自行备份。

装了 OpenViking 的，另停 server 并 \`uv tool uninstall openviking\`；\`~/.openviking\` 是配置/数据，
备份后再删。

## 常见问题

| 现象 | 原因与处理 |
|---|---|
| 刷新后什么都没出现 | 浏览器刷新不加载新模块：重启 \`dsh web\`，再硬刷新页面 |
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
