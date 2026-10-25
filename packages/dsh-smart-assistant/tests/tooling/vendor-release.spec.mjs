/**
 * Fixtures for the vendor-pin and release-posture cores
 * (scripts/checks/gates/vendor-release.mjs). The pin fixtures build throwaway git
 * repositories — the real vendor tree is never touched and no pin is ever upgraded.
 *
 * Plain .mjs on purpose: vitest runs it, `tsc -p tsconfig.test.json` does not type-check it
 * (same contract as the other tooling specs).
 */
import { execFileSync } from 'node:child_process'
import { mkdirSync, utimesSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it, afterEach } from 'vitest'
import {
  dependencyPoseProblems,
  exportManualProblems,
  pinProblems,
  tagVersionProblems,
  vendorClientFreshnessProblems,
} from '../../../../scripts/checks/gates/vendor-release.mjs'
import { temp, disposeTempDirs } from './verify-gates-harness.mjs'

afterEach(disposeTempDirs)

describe('pinProblems', () => {
  it('passes a consistent pin', () => {
    const { root } = makePinnedRepo()
    expect(pinProblems(root)).toEqual([])
  })

  it('flags a checkout that moved without bookkeeping', () => {
    const { root, innerGit } = makePinnedRepo()
    writeFileSync(join(root, 'vendor', 'dsh', 'packages', 'core', 'tools', 'src', 'index.ts'), 'export const drift = 1\n', 'utf8')
    innerGit(['add', '.'])
    innerGit(['commit', '-q', '-m', 'move ahead'])

    const problems = pinProblems(root)
    expect(problems.some(p => p.includes('UPSTREAM.md records'))).toBe(true)
  })

  it('allows the pending tail of a sync-dsh run (gitlink behind, bookkeeping current)', () => {
    const { root, innerGit, tagName } = makePinnedRepo()
    writeFileSync(join(root, 'vendor', 'dsh', 'packages', 'core', 'tools', 'src', 'index.ts'), 'export const next = 1\n', 'utf8')
    innerGit(['add', '.'])
    innerGit(['commit', '-q', '-m', 'next tag'])
    innerGit(['tag', 'dsh-v0.1.6-rc.1'])
    const newSha = execFileSync('git', ['-C', join(root, 'vendor', 'dsh'), 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()
    recordUpstream(root, 'dsh-v0.1.6-rc.1', newSha)
    // The outer repo's committed gitlink deliberately stays at the old SHA.

    expect(pinProblems(root)).toEqual([])
    expect(tagName).toBe('dsh-v0.1.5-rc.2') // the fixture moved off it, as asserted above
  })

  it('flags modified tracked sources but not untracked artifacts', () => {
    const { root } = makePinnedRepo()
    writeFileSync(join(root, 'vendor', 'dsh', 'packages', 'core', 'tools', 'src', 'index.ts'), 'export const edit = 1\n', 'utf8')
    writeFileSync(join(root, 'vendor', 'dsh', 'packages', 'core', 'tools', 'src', 'generated.artifact.js'), 'generated\n', 'utf8')

    const problems = pinProblems(root)
    expect(problems).toHaveLength(1)
    expect(problems[0]).toContain('tracked-source changes')
  })
})

describe('dependencyPoseProblems', () => {
  const upstream = (tag) => `| 项 | 值 |\n|---|---|\n| 钉住的 tag | \`${tag}\` |\n`

  it('accepts peers + a recorded pinned tag and rejects a runtime dep or a drifted list', () => {
    const dir = temp('deps-')
    const upstreamPath = join(dir, 'UPSTREAM.md')
    writeFileSync(upstreamPath, upstream('dsh-v0.1.5-rc.2'), 'utf8')

    const good = join(dir, 'good.json')
    writeFileSync(good, JSON.stringify({
      dependencies: { yaml: '^2.8.1' },
      peerDependencies: { '@deepseek-ai/cordis': '*' },
      dsh: { compatibility: { dshReleases: { '0.1.5-rc.2': 'verified' } } },
    }), 'utf8')
    expect(dependencyPoseProblems(good, upstreamPath)).toEqual([])

    const bad = join(dir, 'bad.json')
    writeFileSync(bad, JSON.stringify({
      dependencies: { '@deepseek-ai/cordis': '0.1.5-rc.2' },
      dsh: { compatibility: { dshReleases: { '0.1.4': 'verified' } } },
    }), 'utf8')
    const problems = dependencyPoseProblems(bad, upstreamPath)
    expect(problems.some(p => p.includes('peerDependencies'))).toBe(true)
    expect(problems.some(p => p.includes('does not name the pinned upstream tag'))).toBe(true)
  })
})

describe('exportManualProblems', () => {
  const manifest = { name: 'dsh-smart-assistant', version: '1.2.3' }
  const PIN = 'dsh-v9.9.9'
  // Rows mirror the exact shape export-dist.mjs generates (安装包 carries a suffix after the
  // filename) — the first red run of this gate was a fixture/reality mismatch on that suffix.
  const manual = (version, tarball, baseline = PIN) => [
    '# 手册',
    '',
    '| | |',
    '|---|---|',
    `| 版本 | ${version === undefined ? '（缺行）' : `\`${version}\``} |`,
    `| 安装包 | \`${tarball}\`（与本手册同目录） |`,
    `| 验证基线 | ${baseline === undefined ? '（缺行）' : `DSH \`${baseline}\`（Node ≥ 22）`} |`,
    '',
  ].join('\n')
  const call = file => exportManualProblems({ manualPath: file, manifest, upstreamTag: PIN })

  it('accepts a missing manual (nothing exported yet) and a manual that matches manifest and pin', () => {
    expect(call(join(temp('dist-'), 'absent.md'))).toEqual([])
    const dir = temp('dist-')
    const file = join(dir, '安装手册.md')
    writeFileSync(file, manual('1.2.3', 'dsh-smart-assistant-1.2.3.tgz'), 'utf8')
    expect(call(file)).toEqual([])
  })

  it('rejects a manual whose version no longer matches the package (bump without re-export)', () => {
    const dir = temp('dist-')
    const file = join(dir, '安装手册.md')
    writeFileSync(file, manual('1.2.2', 'dsh-smart-assistant-1.2.3.tgz'), 'utf8')
    const problems = call(file)
    expect(problems).toHaveLength(1)
    expect(problems[0]).toContain('says 1.2.2')
    expect(problems[0]).toContain('pnpm export-dist')
  })

  it('rejects a manual whose tarball name drifts from the manifest', () => {
    const dir = temp('dist-')
    const file = join(dir, '安装手册.md')
    writeFileSync(file, manual('1.2.3', 'dsh-smart-assistant-9.9.9.tgz'), 'utf8')
    expect(call(file)[0]).toContain('expected dsh-smart-assistant-1.2.3.tgz')
  })

  it('rejects a stale 验证基线 row (pin bumped without a re-export) — the 0.1.7→0.2.0 escape', () => {
    const dir = temp('dist-')
    const file = join(dir, '安装手册.md')
    writeFileSync(file, manual('1.2.3', 'dsh-smart-assistant-1.2.3.tgz', 'dsh-v0.1.7-rc.2'), 'utf8')
    const problems = call(file)
    expect(problems).toHaveLength(1)
    expect(problems[0]).toContain('验证基线')
    expect(problems[0]).toContain('dsh-v0.1.7-rc.2')
    expect(problems[0]).toContain('pnpm export-dist')
  })

  it('rejects a manual missing any pinned header row (版本 / 安装包 / 验证基线)', () => {
    const dir = temp('dist-')
    const bare = join(dir, 'bare.md')
    writeFileSync(bare, '没有表头的手册\n', 'utf8')
    const problems = call(bare)
    expect(problems).toHaveLength(3)
    expect(problems[0]).toContain('says nothing')
    expect(problems[2]).toContain('验证基线 row is missing')
  })
})

describe('vendorClientFreshnessProblems', () => {
  const T = 1_700_000_000_000
  const at = offset => new Date(T + offset)

  /** Fake vendor tree with deterministic clocks: sources at T, faces/dist wherever the case needs. */
  function fakeVendor({ faceOffsets = {}, distOffset }) {
    const root = temp('vendor-fresh-')
    const packages = join(root, 'packages')
    const web = join(root, 'apps-web')
    const stamp = (path, offset) => utimesSync(path, at(offset), at(offset))
    // face name → lib mtime offset; src always sits at T. A name absent from faceOffsets gets no lib at all.
    for (const [group, name, offset] of [
      ['client', 'fresh-ui', faceOffsets['client/fresh-ui'] ?? 1000],
      ['client', 'stale-ui', faceOffsets['client/stale-ui'] ?? 1000],
      ['client', 'src-only', faceOffsets['client/src-only'] ?? 1000],
      ['api', 'fresh-api', faceOffsets['api/fresh-api'] ?? 1000],
      ['api', 'stale-api', faceOffsets['api/stale-api'] ?? 1000],
      ['experimental', 'stale-exp', faceOffsets['experimental/stale-exp'] ?? 1000],
    ]) {
      const pkg = join(packages, group, name)
      mkdirSync(join(pkg, 'src'), { recursive: true })
      writeFileSync(join(pkg, 'src', 'index.ts'), 'export {}\n', 'utf8')
      stamp(join(pkg, 'src', 'index.ts'), 0)
      if (faceOffsets[`${group}/${name}`] !== undefined || name !== 'src-only') {
        mkdirSync(join(pkg, 'lib'), { recursive: true })
        writeFileSync(join(pkg, 'lib', 'client.js'), '// built\n', 'utf8')
        stamp(join(pkg, 'lib', 'client.js'), offset)
      }
    }
    if (distOffset !== undefined) {
      mkdirSync(join(web, 'dist'), { recursive: true })
      writeFileSync(join(web, 'dist', 'index.html'), '<html></html>\n', 'utf8')
      stamp(join(web, 'dist', 'index.html'), distOffset)
    }
    return { vendorPackagesRoot: packages, webAppRoot: web }
  }

  it('accepts fresh faces and skips unbuilt, src-only, and experimental ones', () => {
    const tree = fakeVendor({
      faceOffsets: {
        'experimental/stale-exp': -1000, // preview-only group: never rebuildable, must stay exempt
      },
      // src-only has no lib at all → prepare.sh territory; dist absent → never built here
    })
    expect(vendorClientFreshnessProblems(tree)).toEqual([])
  })

  it('flags a client face and an api face whose lib predates their sources', () => {
    const tree = fakeVendor({
      faceOffsets: { 'client/stale-ui': -1000, 'api/stale-api': -1000 },
    })
    const problems = vendorClientFreshnessProblems(tree)
    expect(problems).toHaveLength(2)
    expect(problems.some(problem => problem.includes('client/stale-ui/lib/client.js'))).toBe(true)
    expect(problems.some(problem => problem.includes('api/stale-api/lib/client.js'))).toBe(true)
    expect(problems[0]).toContain('pnpm --dir')
  })

  it('flags a web dist older than client sources, and accepts one that is newer', () => {
    const stale = vendorClientFreshnessProblems(fakeVendor({ distOffset: -100 }))
    expect(stale).toHaveLength(1)
    expect(stale[0]).toContain('web shell')

    const fresh = vendorClientFreshnessProblems(fakeVendor({ distOffset: 2000 }))
    expect(fresh).toEqual([])
  })
})

function makeInnerRepo(dir, tagName) {
  execFileSync('git', ['init', '-q', dir], { env: process.env })
  const git = args => execFileSync('git', ['-C', dir, '-c', 'user.email=t@example.com', '-c', 'user.name=t', ...args], { stdio: 'ignore' })
  mkdirSync(join(dir, 'packages', 'core', 'tools', 'src'), { recursive: true })
  writeFileSync(join(dir, 'packages', 'core', 'tools', 'src', 'index.ts'), 'export {}\n', 'utf8')
  git(['add', '.'])
  git(['commit', '-q', '-m', 'pin'])
  git(['tag', tagName])
  return git
}

function recordUpstream(root, tagName, sha) {
  writeFileSync(join(root, 'vendor', 'UPSTREAM.md'), [
    '# bookkeeping',
    '| 项 | 值 |',
    '|---|---|',
    `| 钉住的 tag | \`${tagName}\` |`,
    `| 精确 SHA | \`${sha}\` |`,
    '',
  ].join('\n'), 'utf8')
}

/** Outer repo shaped like ours: .gitmodules + vendor/UPSTREAM.md + a committed gitlink. */
function makePinnedRepo() {
  const root = temp('pin-')
  mkdirSync(join(root, 'vendor'), { recursive: true })
  execFileSync('git', ['init', '-q', root], { env: process.env })
  const outerGit = args => execFileSync('git', ['-C', root, '-c', 'user.email=t@example.com', '-c', 'user.name=t', ...args], { stdio: 'ignore' })
  const tagName = 'dsh-v0.1.5-rc.2'
  const innerGit = makeInnerRepo(join(root, 'vendor', 'dsh'), tagName)
  const sha = execFileSync('git', ['-C', join(root, 'vendor', 'dsh'), 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()
  writeFileSync(join(root, '.gitmodules'), '[submodule "vendor/dsh"]\n\tpath = vendor/dsh\n\turl = https://example.com/dsh.git\n', 'utf8')
  recordUpstream(root, tagName, sha)
  outerGit(['add', '.gitmodules', 'vendor/UPSTREAM.md', 'vendor/dsh'])
  outerGit(['commit', '-q', '-m', 'pin vendor/dsh'])
  return { root, outerGit, innerGit, tagName, sha }
}


describe('tagVersionProblems', () => {
  it('accepts a tag that names the version at its commit', () => {
    expect(tagVersionProblems({ tags: [{ name: '0.1.0', version: '0.1.0' }] })).toEqual([])
  })

  it('flags a tag cut on a commit whose manifest says another version', () => {
    expect(tagVersionProblems({ tags: [{ name: '0.1.0', version: '0.0.0' }] })).toEqual([
      'tag 0.1.0 points at package version 0.0.0 — a tag names the release it marks, so version the commit and retag',
    ])
  })

  it('flags a tag whose commit has no readable manifest', () => {
    expect(tagVersionProblems({ tags: [{ name: '9.9.9', version: undefined }] })).toEqual([
      'tag 9.9.9 points at package version nothing — a tag names the release it marks, so version the commit and retag',
    ])
  })
})
