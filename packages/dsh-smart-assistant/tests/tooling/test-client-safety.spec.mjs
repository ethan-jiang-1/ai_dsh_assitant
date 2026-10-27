/**
 * Fixtures for the tests-tree asset-shape and client classic-script-safety
 * cores (scripts/checks/gates/test-client-safety.mjs).
 *
 * Plain .mjs on purpose: vitest runs it, `tsc -p tsconfig.test.json` does not type-check it
 * (same contract as the other tooling specs).
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { describe, expect, it, afterEach } from 'vitest'
import {
  clientScriptSafetyProblems,
  testAssetNamingProblems,
  webFaceExpectedHealthProblems,
} from '../../../../scripts/checks/gates/test-client-safety.mjs'
import { temp, dirs, disposeTempDirs } from './verify-gates-harness.mjs'

afterEach(disposeTempDirs)

describe('testAssetNamingProblems', () => {
  function fakeRepo({ tests = [], webFace = {} }) {
    const root = mkdtempSync(join(tmpdir(), 'gate-test-assets-'))
    dirs.push(root)
    mkdirSync(join(root, 'packages', 'dsh-smart-assistant', 'tests'), { recursive: true })
    for (const name of tests) {
      const file = join(root, 'packages', 'dsh-smart-assistant', 'tests', name)
      mkdirSync(dirname(file), { recursive: true })
      writeFileSync(file, '')
    }
    for (const [scenario, files] of Object.entries(webFace)) {
      mkdirSync(join(root, 'snapshots', 'web-face', scenario), { recursive: true })
      for (const [name, text] of Object.entries(files)) writeFileSync(join(root, 'snapshots', 'web-face', scenario, name), text)
    }
    return root
  }

  it('accepts the shipped shapes: specs, a harness file, and contract-complete scenes', () => {
    const root = fakeRepo({
      tests: ['layout.spec.ts', 'verify-gates.spec.mjs', 'client-harness.ts'],
      webFace: { 'blank-first-open': { 'snapshot.yml': 'version: 1', 'README.md': 'contract' } },
    })
    expect(testAssetNamingProblems(root)).toEqual([])
  })

  it('rejects a code file that is neither spec nor harness (the "enter the table first" rule)', () => {
    const root = fakeRepo({ tests: ['helper.test.ts'] })
    const problems = testAssetNamingProblems(root)
    expect(problems.length).toBe(1)
    expect(problems[0]).toContain('helper.test.ts')
    expect(problems[0]).toContain('docs/testing.md')
  })

  it('recursively rejects an unadmitted nested code asset instead of letting it bypass the gate', () => {
    const root = fakeRepo({ tests: ['nested/accidental-helper.ts'] })
    const problems = testAssetNamingProblems(root)
    expect(problems.length).toBe(1)
    expect(problems[0]).toContain('tests/nested/accidental-helper.ts')
    expect(problems[0]).toContain('docs/testing.md')
  })

  it('accepts an admitted nested harness asset and an upstream fixture directory', () => {
    const root = fakeRepo({ tests: ['fixtures/client-harness.ts', 'fixtures/README.md'] })
    expect(testAssetNamingProblems(root)).toEqual([])
  })

  it('rejects a scene directory without its contract files', () => {
    const root = fakeRepo({ webFace: { 'second-scene': { 'expected.dom.json': '{}' } } })
    const problems = testAssetNamingProblems(root)
    expect(problems.some(p => p.includes('second-scene') && p.includes('snapshot.yml'))).toBe(true)
    expect(problems.some(p => p.includes('second-scene') && p.includes('README.md'))).toBe(true)
  })

  it('ignores markdown (rules live beside the tests) and a web-face tree that does not exist', () => {
    const root = fakeRepo({ tests: ['AGENTS.md', 'README.md'] })
    rmSync(join(root, 'snapshots'), { recursive: true, force: true })
    expect(testAssetNamingProblems(root)).toEqual([])
  })
})

describe('webFaceExpectedHealthProblems', () => {
  const healthy = {
    readyState: 'complete',
    visibleText: '它在盯什么',
    controls: ['button h=24: 全部'],
    consoleErrors: [],
    networkFailures: [],
  }
  const scene = ({ expected = healthy, runner = "version: 1\nrunner: README.md\nwait_text: '它在盯什么'\n" } = {}) => {
    const root = temp('web-face-health-')
    const dir = join(root, 'snapshots', 'web-face', 'scene')
    mkdirSync(dir, { recursive: true })
    if (expected !== undefined) writeFileSync(join(dir, 'expected.dom.json'), JSON.stringify(expected))
    writeFileSync(join(dir, 'snapshot.yml'), runner)
    writeFileSync(join(dir, 'README.md'), 'contract')
    return root
  }

  it('accepts a complete, quiet capture whose readiness token is present', () => {
    expect(webFaceExpectedHealthProblems(scene())).toEqual([])
  })

  it('rejects a half-loaded, noisy, empty or non-rendered baseline', () => {
    expect(webFaceExpectedHealthProblems(scene({ expected: { ...healthy, readyState: 'interactive' } })).join(' ')).toContain('readyState')
    expect(webFaceExpectedHealthProblems(scene({ expected: { ...healthy, consoleErrors: ['error: boom'] } })).join(' ')).toContain('consoleErrors')
    expect(webFaceExpectedHealthProblems(scene({ expected: { ...healthy, networkFailures: ['ERR'] } })).join(' ')).toContain('networkFailures')
    expect(webFaceExpectedHealthProblems(scene({ expected: { ...healthy, visibleText: '  ' } })).join(' ')).toContain('visibleText')
    expect(webFaceExpectedHealthProblems(scene({ expected: { ...healthy, controls: [] } })).join(' ')).toContain('controls')
  })

  it('rejects a baseline whose visible text lacks the scene wait token', () => {
    const problems = webFaceExpectedHealthProblems(scene({ expected: { ...healthy, visibleText: '别的页面' } }))
    expect(problems.join(' ')).toContain('wait token')
  })

  it('still reads the legacy runner token for a pre-contract scene', () => {
    const legacy = scene({ runner: "runner: pnpm web-expected '<url>' --scenario scenes --wait-text '它在盯什么' #\n" })
    expect(webFaceExpectedHealthProblems(legacy)).toEqual([])
  })

  it('skips a draft scene without an expectation and a missing web-face tree', () => {
    expect(webFaceExpectedHealthProblems(scene({ expected: undefined }))).toEqual([])
    const root = temp('web-face-health-empty-')
    expect(webFaceExpectedHealthProblems(root)).toEqual([])
  })
})

describe('clientScriptSafetyProblems', () => {
  const fixture = (files, bundle) => {
    const root = temp('client-gate-')
    const clientDir = join(root, 'src', 'client')
    mkdirSync(clientDir, { recursive: true })
    for (const [name, text] of Object.entries(files)) {
      writeFileSync(join(clientDir, name), text, 'utf8')
    }
    let bundlePath
    if (bundle !== undefined) {
      bundlePath = join(root, 'lib', 'client', 'index.js')
      mkdirSync(dirname(bundlePath), { recursive: true })
      writeFileSync(bundlePath, bundle, 'utf8')
    }
    return { clientDir, bundlePath }
  }
  const entry = "const facade = globalThis['__ModuleLoader__']\nif (facade) facade.load({ id: 'x', factory: () => ({}) })\n"

  it('rejects an empty src/client — the dsh.client declaration promises a browser half', () => {
    const root = temp('client-gate-empty-')
    const clientDir = join(root, 'src', 'client')
    mkdirSync(clientDir, { recursive: true })
    const problems = clientScriptSafetyProblems({ clientDir, bundlePath: join(root, 'lib', 'client', 'index.js') })
    expect(problems).toHaveLength(1)
    expect(problems[0]).toContain('src/client is empty')
  })

  it('rejects a bare external runtime import and a bare external side-effect import', () => {
    const bare = fixture({ 'index.ts': entry, 'mod.ts': "import { createElement } from 'react'\nexport const x = createElement\n" })
    const problems = clientScriptSafetyProblems(bare)
    expect(problems.some(p => p.includes('mod.ts') && p.includes('bare external runtime import') && p.includes('react'))).toBe(true)

    const sideEffect = fixture({ 'index.ts': entry, 'mod.ts': "import 'react'\n" })
    const problems2 = clientScriptSafetyProblems(sideEffect)
    expect(problems2.some(p => p.includes('mod.ts') && p.includes('side-effect import') && p.includes('react'))).toBe(true)
  })

  it('accepts relative runtime imports, import type (even external), and runtime exports', () => {
    const ok = fixture({
      'contracts.ts': 'export interface Foo { a: number }\n',
      'mod.ts': "import type { Foo } from 'react'\nexport function make(): number { return 1 }\n",
      'index.ts': `import { make } from './mod'\n${entry}`,
    })
    expect(clientScriptSafetyProblems(ok)).toEqual([])
  })

  it('rejects an entry that never touches __ModuleLoader__', () => {
    const silent = fixture({ 'index.ts': 'export const x = 1\n' })
    const problems = clientScriptSafetyProblems(silent)
    expect(problems.some(p => p.includes('index.ts') && p.includes('__ModuleLoader__'))).toBe(true)
  })

  it('rejects a bundle that is not a classic script, accepts a classic bundle, and passes a fresh clone without lib', () => {
    const esmBundle = fixture({ 'index.ts': entry }, "import { x } from './y'\nexport {}\n")
    const problems = clientScriptSafetyProblems(esmBundle)
    expect(problems.some(p => p.includes('does not parse as a classic script'))).toBe(true)

    const missingFacade = fixture({ 'index.ts': entry }, 'const x = 1\n')
    const problems2 = clientScriptSafetyProblems(missingFacade)
    expect(problems2.some(p => p.includes('lib/client/index.js never touches __ModuleLoader__'))).toBe(true)

    const classic = fixture(
      { 'index.ts': entry },
      "(function () { globalThis['__ModuleLoader__'].load({ id: 'x', factory: function () { return {} } }) })()\n",
    )
    expect(clientScriptSafetyProblems(classic)).toEqual([])

    const freshClone = fixture({ 'index.ts': entry })
    expect(freshClone.bundlePath).toBeUndefined()
    expect(clientScriptSafetyProblems({ clientDir: freshClone.clientDir, bundlePath: join(freshClone.clientDir, '..', '..', 'lib', 'client', 'index.js') })).toEqual([])
  })
})
