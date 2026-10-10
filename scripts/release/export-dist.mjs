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
const upstreamTag = /^\| 钉住的 tag \| `([^`|]+)` \|$/m
  .exec(readFileSync(join(repoRoot, 'vendor', 'UPSTREAM.md'), 'utf8'))?.[1]?.trim()
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

默认装进你日常的 \`web\` profile（DSH 出厂默认名），装完重启就能用：

\`\`\`sh
dsh plugin --profile web add /path/to/${tarballName}
\`\`\`

想先隔离试用、不动日常环境？换一个名字，多一步一次性初始化：

\`\`\`sh
dsh --profile try-assistant --from-default-profile web --dump-config   # 只需第一次
dsh plugin --profile try-assistant add /path/to/${tarballName}
\`\`\`

（后文以 \`web\` 为例；用了别的名字，把命令里的 \`web\` 换成它即可。）

## 二、验证安装

\`\`\`sh
dsh --profile web --dump-config
\`\`\`

输出里应能看到：

- 插件的补丁层（\`dsh-smart-assistant\`）；
- host 面的 \`assistant-memory\` 行（working folder 的四房间存储）；
- \`id: preset-assistant\`（\`assistant\` preset 的组合行）。

## 三、让它出现在界面上

重启 \`dsh web\`（浏览器刷新本身不会加载新模块），然后**硬刷新**页面（⌘⇧R / Ctrl⇧R）。之后：

- 侧栏出现 My Desk 桌面面板（记忆 / 知识页 / 技能 / 养护检查）；
- 新会话把 preset 切到「智能助手」（\`assistant\`），它就带着自己的 working folder 工作。

## 四、卸载（干净，无残留）

\`\`\`sh
dsh plugin --profile web remove dsh-smart-assistant
\`\`\`

卸载后 \`--dump-config\` 不再提及插件，profile 的 package.json 也不留痕迹。working folder
本身（\`<DSH_HOME>/assistant/\`）是数据不是插件：卸载不删它，弃用前自行备份。

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
