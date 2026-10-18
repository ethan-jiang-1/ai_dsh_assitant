/**
 * Fixtures for the built-artifact freshness core (scripts/checks/gates/build-freshness.mjs).
 *
 * These run the real builders against a throwaway package under the repo scratch root: the
 * freshness question is "would the builders produce these bytes again", and only the builders can
 * answer it, so a stubbed runner would pin nothing. The regression this file exists for is the
 * instrument itself — 2026-10-18 an ad-hoc mtime sweep reported nine stale files that were all
 * false, because `tsc -b` compares sha256 content hashes, not mtimes. So the touch-only case below
 * must stay GREEN; it is the fixture that fails the moment someone "simplifies" the core back to
 * comparing timestamps.
 *
 * Plain .mjs on purpose: vitest runs it, `tsc -p tsconfig.test.json` does not type-check it
 * (same contract as the other tooling specs).
 */
import { execFileSync } from 'node:child_process'
import { mkdirSync, rmSync, utimesSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it, afterEach } from 'vitest'
import { packageBuildFreshnessProblems } from '../../../../scripts/checks/gates/build-freshness.mjs'
import { temp, disposeTempDirs } from './verify-gates-harness.mjs'

afterEach(disposeTempDirs)

/** The repo's own compiler/bundler binaries — a throwaway fixture has no `node_modules`. */
const binDir = join(import.meta.dirname, '..', '..', 'node_modules', '.bin')

/**
 * Mint a throwaway package and build it once, so `lib/` starts out matching `src/`.
 * Deliberately minimal: one host module and one client entry, which is all the two faces read.
 */
function makeBuiltPackage() {
  const packageDir = temp('build-freshness-')
  mkdirSync(join(packageDir, 'src', 'client'), { recursive: true })
  writeFileSync(join(packageDir, 'package.json'), JSON.stringify({ name: 'fixture', type: 'module' }), 'utf8')
  writeFileSync(join(packageDir, 'tsconfig.json'), JSON.stringify({
    compilerOptions: { composite: true, rootDir: 'src', outDir: 'lib', module: 'esnext', target: 'es2022', moduleResolution: 'bundler', skipLibCheck: true },
    include: ['src'],
  }), 'utf8')
  writeFileSync(join(packageDir, 'src', 'host.ts'), 'export const version = 1\n', 'utf8')
  writeFileSync(join(packageDir, 'src', 'client', 'index.ts'), "export const brand = 'fixture'\n", 'utf8')
  writeFileSync(join(packageDir, 'tsdown.config.ts'), `export default {
  entry: 'src/client/index.ts',
  outDir: 'lib/client',
  format: 'iife',
  outputOptions: { entryFileNames: '[name].js' },
  platform: 'browser',
  target: 'es2024',
  minify: false,
  sourcemap: false,
  clean: false,
}
`, 'utf8')
  buildHost(packageDir)
  buildClient(packageDir)
  return packageDir
}

const buildHost = packageDir =>
  execFileSync(join(binDir, 'tsc'), ['-b', join(packageDir, 'tsconfig.json')], { cwd: packageDir, stdio: 'ignore' })

const buildClient = packageDir =>
  execFileSync(join(binDir, 'tsdown'), ['--logLevel', 'silent'], { cwd: packageDir, stdio: 'ignore' })

/** Run the core the way `pnpm verify` will: real paths in, problem strings out. */
const problemsFor = (packageDir, overrides = {}) =>
  packageBuildFreshnessProblems({ packageDir, scratchDir: temp('build-freshness-scratch-'), binDir, label: 'fixture', ...overrides })

describe('packageBuildFreshnessProblems', () => {
  it('passes a package whose built lib/ matches its sources', () => {
    expect(problemsFor(makeBuiltPackage())).toEqual([])
  })

  it('stays green when sources are only touched — the mtime instrument this replaced went red here', () => {
    const packageDir = makeBuiltPackage()
    const source = join(packageDir, 'src', 'host.ts')
    // A future mtime, so an mtime-based core could not answer "fresh" by accident.
    const future = new Date(Date.now() + 60_000)
    utimesSync(source, future, future)
    expect(problemsFor(packageDir)).toEqual([])
  })

  it('flags a source edit that was never rebuilt (the preset rows would serve the old source)', () => {
    const packageDir = makeBuiltPackage()
    const source = join(packageDir, 'src', 'host.ts')
    writeFileSync(source, 'export const version = 2\n', 'utf8')
    const problems = problemsFor(packageDir)
    expect(problems).toHaveLength(1)
    expect(problems[0]).toContain('fixture/lib')
    expect(problems[0]).toContain('pnpm build')
  })

  it('goes green again after the rebuild it asked for', () => {
    const packageDir = makeBuiltPackage()
    writeFileSync(join(packageDir, 'src', 'host.ts'), 'export const version = 3\n', 'utf8')
    // Assert the *stale* verdict, not merely a count: a bare length check also accepts the
    // UNKNOWN diagnostic, which would let a broken instrument pass this file.
    expect(problemsFor(packageDir)[0]).toContain('fixture/lib')
    buildHost(packageDir)
    expect(problemsFor(packageDir)).toEqual([])
  })

  it('flags the client bundle a bare `pnpm typecheck` leaves behind (ESM over the classic bundle)', () => {
    const packageDir = makeBuiltPackage()
    writeFileSync(join(packageDir, 'lib', 'client', 'index.js'), 'export const brand = "fixture"\n', 'utf8')
    const problems = problemsFor(packageDir)
    expect(problems).toHaveLength(1)
    expect(problems[0]).toContain('lib/client/index.js')
    expect(problems[0]).toContain('pnpm build')
  })

  it('passes an unprepared package — no artifact yet is `prepare.sh`/`pnpm build` business, not drift', () => {
    const packageDir = makeBuiltPackage()
    rmSync(join(packageDir, 'lib'), { recursive: true })
    expect(problemsFor(packageDir)).toEqual([])
  })

  it('reports UNKNOWN, never green, when the builders cannot be run', () => {
    const packageDir = makeBuiltPackage()
    const problems = problemsFor(packageDir, { binDir: join(packageDir, 'node_modules', '.bin') })
    expect(problems.some(problem => problem.includes('UNKNOWN'))).toBe(true)
  })
})
