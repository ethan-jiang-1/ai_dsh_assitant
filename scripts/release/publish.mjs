#!/usr/bin/env node
// 何时跑：准备把当前版本发到 npm 时。默认**不发布**——它把可发布性跑到最后一步然后停下，
// 因为凭证在本人手里（docs/release.md §二：agent 无 registry 凭证）。
// 用法：
//   node scripts/release/publish.mjs            # 预检：干净树检查 + build + 导出产物与形状判据，停在 publish 前
//   node scripts/release/publish.mjs --publish  # 真发布：额外要求干净树与 release-smoke 绿，然后 npm publish <_dist tarball>
//
// 为什么发布不是"顺手一条 npm publish"（从包目录）：
//   · 包体是**预构建**的（`lib/` 是 gitignore 的），发出去的字节必须来自一次成功的 `pnpm build`，
//     而不是工作区里碰巧在的旧产物；
//   · `_dist/` 的 tarball 与手册要和 registry 里那份同版本同内容，所以先 export-dist 再发布同一份 tarball；
//   · npm pack 与 pnpm pack 对 workspace 协议/scripts 的处理不同（pnpm pack-parity），从包目录裸
//     `npm publish` 发的不是判定过的那份字节；发布命令一律用 `npm publish <tgz>`。
//   · `private: true` 会让 publish 以 EPRIVATE 拒绝、而 `--dry-run` 不经过那条分支——形状判据在
//     export-dist 里已经按真实产物跑过（scripts/release/publish-shape.mjs）；
//   · 回滚没有命令级手段（DSH 也没有）：发错版本只能 bump 新 patch，所以版本一致性先查。
import { execFileSync, spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const packageDir = join(repoRoot, 'packages', 'dsh-smart-assistant')
const publish = process.argv.includes('--publish')
const skipSmoke = process.argv.includes('--skip-smoke')
const skipVerify = process.argv.includes('--skip-verify')

const failures = []
const ok = (name, detail) => console.log(`ok   ${name}${detail === undefined ? '' : ` — ${detail}`}`)
const bad = (name, detail) => {
  console.log(`FAIL ${name}${detail === undefined ? '' : ` — ${detail}`}`)
  failures.push(name)
}
const run = (command, args, options = {}) => spawnSync(command, args, { cwd: repoRoot, encoding: 'utf8', ...options })

const packageManifest = JSON.parse(readFileSync(join(packageDir, 'package.json'), 'utf8'))
const rootManifest = JSON.parse(readFileSync(join(repoRoot, 'package.json'), 'utf8'))
const spec = `${packageManifest.name}@${packageManifest.version}`

// 1. 版本一致性：两处 manifest 必须同版本，否则 tag 与产物会对不上（docs/release.md §五）。
packageManifest.version === rootManifest.version
  ? ok('version consistency', spec)
  : bad('version consistency', `root ${rootManifest.version} vs package ${packageManifest.version}`)

// 2. 工作区必须干净：脏树发布会把别人的未提交改动打进发布物（硬规则 3）。
const dirty = execFileSync('git', ['status', '--porcelain'], { cwd: repoRoot, encoding: 'utf8' }).trim()
if (dirty === '') ok('clean worktree')
else if (publish) bad('clean worktree', `${dirty.split('\n').length} path(s) uncommitted — commit or stash before publishing`)
else ok('clean worktree (warn only in dry mode)', `${dirty.split('\n').length} path(s) uncommitted`)

// 3. 版本没发过：同一个版本不能被两个不同的 tarball 占用。
const published = run('npm', ['view', spec, 'version', '--cache', join(repoRoot, '.tmp', 'npm-cache')])
const registrySaid = `${published.stdout ?? ''}${published.stderr ?? ''}`
if (published.status === 0 && (published.stdout ?? '').trim() === packageManifest.version) {
  bad('version not already published', `${spec} already exists on the registry — bump the version`)
} else if (published.status === 0) {
  ok('version not already published', `registry answered ${(published.stdout ?? '').trim() || '(empty)'}`)
} else if (/\bE404\b|\b404 Not Found\b/.test(registrySaid)) {
  ok('version not already published', 'registry has no such package yet')
} else {
  ok('version not already published (registry check unavailable)', registrySaid.trim().split('\n').pop() ?? 'offline')
}

// 4. 构建 + 产物：发布的字节必须来自这次 build，产物与手册由 export-dist 一次生成并逐条判定。
const built = run('pnpm', ['build'])
built.status === 0 ? ok('build') : bad('build', (built.stderr ?? '').trim().split('\n').slice(-6).join(' | '))
const exported = built.status === 0 ? run('pnpm', ['export-dist']) : { status: 1, stdout: '', stderr: 'skipped (build failed)' }
if (exported.status === 0) ok('export-dist', '_dist/ tarball + manual + shape checks')
else bad('export-dist', `${(exported.stdout ?? '').trim().split('\n').filter(line => line.startsWith('FAIL')).join(' | ') || (exported.stderr ?? '').trim().split('\n').pop()}`)
const tarball = join(repoRoot, '_dist', `${packageManifest.name}-${packageManifest.version}.tgz`)
existsSync(tarball)
  ? ok('publish artifact', relative(repoRoot, tarball))
  : bad('publish artifact', `${relative(repoRoot, tarball)} is missing — export-dist must produce the tarball that will be published`)

// 5. 门禁：verify 总是跑（快）；release-smoke 只在真发布前跑（它装真 tarball、起真进程）。
if (!skipVerify) {
  const verified = run('pnpm', ['verify'])
  verified.status === 0 ? ok('verify') : bad('verify', (verified.stdout ?? '').trim().split('\n').slice(-3).join(' | '))
}
if (publish && !skipSmoke) {
  const smoke = run('pnpm', ['release-smoke'])
  smoke.status === 0 ? ok('release-smoke') : bad('release-smoke', 'see the smoke output above (BLOCKED = no key/browser, not a pass)')
}

if (failures.length > 0) {
  console.error(`\npublish: ${failures.length} check(s) failed — nothing was published`)
  process.exit(1)
}

if (!publish) {
  console.log(`\npublish: dry run complete; ${spec} is shippable.`)
  console.log(`publish: 真发布（本人执行，凭证在本人手里）：`)
  console.log(`  npm publish ${relative(repoRoot, tarball)} --access public --cache .tmp/npm-cache`)
  console.log(`publish: 发布后再生成市场索引：pnpm market（只读 registry，所以必须后置）`)
  console.log('publish: 之后跑 pnpm release-smoke，用干净 home 装 registry 上的版本，作为发布后验证。')
  process.exit(0)
}

const published_ = run('npm', ['publish', tarball, '--access', 'public', '--cache', join(repoRoot, '.tmp', 'npm-cache')], { cwd: repoRoot })
if (published_.status !== 0) {
  console.error(`publish: npm publish failed — ${(published_.stderr ?? '').trim().split('\n').slice(-8).join('\n')}`)
  process.exit(1)
}
ok('npm publish', spec)
console.log('\npublish: next — `pnpm market` to regenerate _dist/market/index.json, then host that directory over https.')
