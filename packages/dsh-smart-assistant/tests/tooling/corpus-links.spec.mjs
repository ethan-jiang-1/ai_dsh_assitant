/**
 * Fixtures for the tracked-markdown-corpus cores
 * (scripts/checks/gates/corpus-links.mjs), including the three 'real runner' wiring
 * fixtures that drive the actual verify.mjs over a throwaway staged tree.
 *
 * Plain .mjs on purpose: vitest runs it, `tsc -p tsconfig.test.json` does not type-check it
 * (same contract as the other tooling specs).
 */
import { spawnSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { describe, expect, it, afterEach } from 'vitest'
import {
  markdownCorpusFromTracked,
  notePointerProblems,
  relativeLinkProblems,
} from '../../../../scripts/checks/gates/corpus-links.mjs'
import { temp, disposeTempDirs } from './verify-gates-harness.mjs'

afterEach(disposeTempDirs)

describe('relativeLinkProblems', () => {
  it('accepts resolving links, anchors on them, and out-of-scope targets; rejects broken ones', () => {
    const root = temp('links-')
    writeFileSync(join(root, 'a.md'), [
      '[good](b.md)',
      '[good with anchor](b.md#heading)',
      '[external](https://example.com/x.md) is fine',
      '[same-file anchor](#section) is fine',
      '[placeholder](url) and [placeholder](…) are prose, not links',
      '[broken](missing.md)',
    ].join('\n'), 'utf8')
    writeFileSync(join(root, 'b.md'), '# B\n', 'utf8')

    const problems = relativeLinkProblems([
      { file: join(root, 'a.md'), where: 'a.md' },
    ])
    expect(problems).toHaveLength(1)
    expect(problems[0]).toContain('a.md links to missing.md')
  })

  it('resolves relative to the linking file, not the corpus root', () => {
    const root = temp('links-nested-')
    mkdirSync(join(root, 'sub'), { recursive: true })
    writeFileSync(join(root, 'sub', 'page.md'), '[parent](../index.md)\n[peer](other.md)\n', 'utf8')
    writeFileSync(join(root, 'index.md'), '# index\n', 'utf8')

    const problems = relativeLinkProblems([
      { file: join(root, 'sub', 'page.md'), where: 'sub/page.md' },
    ])
    expect(problems).toHaveLength(1)
    expect(problems[0]).toContain('other.md')
  })
})

describe('verify relative-link corpus wiring', () => {
  it('rejects broken routes in every active backlog area, accepts repaired routes, and leaves _archive frozen', () => {
    const root = temp('verify-link-wiring-')
    // Stage the runner at its real depth (scripts/checks/) — verify.mjs derives repoRoot
    // as two levels up from its own location, so the fixture tree must mirror the layout.
    const scripts = join(root, 'scripts', 'checks')
    mkdirSync(scripts, { recursive: true })
    writeFileSync(join(scripts, 'verify.mjs'), readFileSync(join(import.meta.dirname, '../../../../scripts/checks/verify.mjs'), 'utf8'))
    const core = new URL('../../../../scripts/checks/verify-checks.mjs', import.meta.url).href
    writeFileSync(join(scripts, 'verify-checks.mjs'), `export * from ${JSON.stringify(core)}\n`)
    // The runner also reads the pin bookkeeping's parse (pinnedTagFrom) — stage that stub at
    // its real depth too, or the copied verify.mjs dies on import and proves nothing.
    const bookkeeping = new URL('../../../../scripts/maintenance/sync-bookkeeping.mjs', import.meta.url).href
    mkdirSync(join(root, 'scripts', 'maintenance'), { recursive: true })
    writeFileSync(join(root, 'scripts', 'maintenance', 'sync-bookkeeping.mjs'), `export * from ${JSON.stringify(bookkeeping)}\n`)
    for (const file of ['AGENTS.md', 'README.md']) writeFileSync(join(root, file), '# fixture\n')
    const active = [
      '_backlog/README.md',
      '_backlog/triggers.md',
      '_backlog/issues/README.md',
      '_backlog/issues/261005-card.md',
      '_backlog/bugs/README.md',
      '_backlog/bugs/BUG-001-example.md',
      '_backlog/research/README.md',
      '_backlog/research/261005-flat.md',
      '_backlog/research/positioning/261005-nested.md',
      '_backlog/research/tech-exploration/deeper/261005-deep.md',
      '_backlog/methods/README.md',
      '_backlog/methods/some-method.md',
      // Loose tracked markdown in the deliberation space routes readers too — the tracked-corpus
      // gate covers it (the old hand-picked corpus omitted exactly this shape).
      '_backlog/unowned.md',
    ]
    for (const file of [...active, '_backlog/_archive/README.md', '_backlog/_archive/research/261005-frozen.md', '_backlog/_archive/fixed_bugs/BUG-009-frozen.md']) {
      const path = join(root, file)
      mkdirSync(join(path, '..'), { recursive: true })
      writeFileSync(path, '[route](missing.md)\n')
    }
    trackFixtureRepo(root)
    const gate = 'links: relative markdown links point at existing files'
    const run = () => {
      const result = spawnSync(process.execPath, [join(scripts, 'verify.mjs')], { encoding: 'utf8' })
      expect(result.error).toBeUndefined()
      expect(result.signal).toBeNull()
      // Full exit stays red for unrelated missing-fixture contracts; inspect the real link verdict.
      expect(result.status).toBe(1)
      return result.stdout
    }
    const broken = run()
    expect(broken).toContain(`FAIL ${gate}`)
    for (const file of active) expect(broken).toContain(`${file} links to missing.md`)
    expect(broken).not.toContain('_backlog/_archive/README.md links to')
    expect(broken).not.toContain('_backlog/_archive/research/261005-frozen.md links to')
    expect(broken).not.toContain('_backlog/_archive/fixed_bugs/BUG-009-frozen.md links to')
    for (const file of active) writeFileSync(join(root, file, '..', 'missing.md'), '# destination\n')
    expect(run()).toContain(`ok   ${gate}`)
  })
})

describe('verify machine-local-path corpus wiring', () => {
  it('rejects an absolute path in every active backlog area, and leaves notes/ (the provenance home) alone', () => {
    const root = temp('verify-machine-local-')
    const scripts = join(root, 'scripts', 'checks')
    mkdirSync(scripts, { recursive: true })
    writeFileSync(join(scripts, 'verify.mjs'), readFileSync(join(import.meta.dirname, '../../../../scripts/checks/verify.mjs'), 'utf8'))
    const core = new URL('../../../../scripts/checks/verify-checks.mjs', import.meta.url).href
    writeFileSync(join(scripts, 'verify-checks.mjs'), `export * from ${JSON.stringify(core)}\n`)
    // The runner also reads the pin bookkeeping's parse (pinnedTagFrom) — stage that stub at
    // its real depth too, or the copied verify.mjs dies on import and proves nothing.
    const bookkeeping = new URL('../../../../scripts/maintenance/sync-bookkeeping.mjs', import.meta.url).href
    mkdirSync(join(root, 'scripts', 'maintenance'), { recursive: true })
    writeFileSync(join(root, 'scripts', 'maintenance', 'sync-bookkeeping.mjs'), `export * from ${JSON.stringify(bookkeeping)}\n`)
    for (const file of ['AGENTS.md', 'README.md']) writeFileSync(join(root, file), '# fixture\n')

    const offending = [
      '_backlog/README.md',
      '_backlog/triggers.md',
      '_backlog/issues/README.md',
      '_backlog/issues/261005-card.md',
      '_backlog/bugs/README.md',
      '_backlog/bugs/BUG-001-example.md',
      '_backlog/research/README.md',
      '_backlog/research/positioning/261005-nested.md',
      '_backlog/methods/README.md',
      '_backlog/methods/some-method.md',
      // Loose tracked markdown in the deliberation space is held to the same rule (tracked-corpus).
      '_backlog/unowned.md',
    ]
    for (const file of offending) {
      const path = join(root, file)
      mkdirSync(join(path, '..'), { recursive: true })
      writeFileSync(path, 'Protocol lives at /Users/someone/checkout/skills/x/SKILL.md\n')
    }
    // Frozen history keeps its prose, notes/ is where external provenance is allowed to live.
    for (const file of ['_backlog/_archive/README.md', '_backlog/_archive/research/261005-frozen.md', '_backlog/_archive/fixed_bugs/BUG-009-frozen.md', 'notes/implemented/2026-01-01-topic.md']) {
      const path = join(root, file)
      mkdirSync(join(path, '..'), { recursive: true })
      writeFileSync(path, 'Protocol lives at /Users/someone/checkout/skills/x/SKILL.md\n')
    }
    trackFixtureRepo(root)

    const gate = 'links: contract docs cite no machine-local absolute paths'
    const result = spawnSync(process.execPath, [join(scripts, 'verify.mjs')], { encoding: 'utf8' })
    expect(result.error).toBeUndefined()
    expect(result.signal).toBeNull()
    // Full exit stays red for unrelated missing-fixture contracts; inspect this gate's real verdict.
    expect(result.status).toBe(1)
    expect(result.stdout).toContain(`FAIL ${gate}`)
    for (const file of offending) expect(result.stdout).toContain(`${file} cites a machine-local absolute path`)
    for (const file of ['_backlog/_archive/README.md', '_backlog/_archive/research/261005-frozen.md', '_backlog/_archive/fixed_bugs/BUG-009-frozen.md', 'notes/implemented/2026-01-01-topic.md']) {
      expect(result.stdout).not.toContain(`${file} cites a machine-local absolute path`)
    }

    // Repaired: every offending file loses the absolute path, and the gate goes green.
    for (const file of offending) {
      writeFileSync(join(root, file), 'Protocol lives in the upstream checkout named in the ledger\n')
    }
    expect(spawnSync(process.execPath, [join(scripts, 'verify.mjs')], { encoding: 'utf8' }).stdout).toContain(`ok   ${gate}`)
  })
})

describe('verify scratch-path corpus wiring', () => {
  it('rejects out-of-repo scratch, ties the tmpdir exemption to the vitest redirect, and leaves notes/ alone', () => {
    const root = temp('verify-scratch-')
    const scripts = join(root, 'scripts', 'checks')
    mkdirSync(scripts, { recursive: true })
    writeFileSync(join(scripts, 'verify.mjs'), readFileSync(join(import.meta.dirname, '../../../../scripts/checks/verify.mjs'), 'utf8'))
    const core = new URL('../../../../scripts/checks/verify-checks.mjs', import.meta.url).href
    writeFileSync(join(scripts, 'verify-checks.mjs'), `export * from ${JSON.stringify(core)}\n`)
    // The runner also reads the pin bookkeeping's parse (pinnedTagFrom) — stage that stub at
    // its real depth too, or the copied verify.mjs dies on import and proves nothing.
    const bookkeeping = new URL('../../../../scripts/maintenance/sync-bookkeeping.mjs', import.meta.url).href
    mkdirSync(join(root, 'scripts', 'maintenance'), { recursive: true })
    writeFileSync(join(root, 'scripts', 'maintenance', 'sync-bookkeeping.mjs'), `export * from ${JSON.stringify(bookkeeping)}\n`)
    for (const file of ['AGENTS.md', 'README.md']) writeFileSync(join(root, file), '# fixture\n')

    const packageDir = join(root, 'packages', 'dsh-smart-assistant')
    const tests = join(packageDir, 'tests')
    mkdirSync(tests, { recursive: true })
    // The fixture text is assembled instead of written out: the forbidden forms must live in the
    // throwaway file, and a contiguous copy in this spec would make the gate flag its own test.
    const outside = ['', 'tmp', 'fixture-scratch'].join('/')
    const tmpdirCall = ['tmpdir', '()'].join('')
    const shellMktemp = ['home=$(mk', 'temp -d)'].join('')
    const literalUser = join(tests, 'scratch.spec.ts')
    writeFileSync(literalUser, `const dir = '${outside}'\n`)
    const tmpdirUser = join(tests, 'fixture.spec.ts')
    writeFileSync(tmpdirUser, `import { tmpdir } from 'node:os'\nconst dir = ${tmpdirCall}\n`)
    const shellUser = join(root, 'dev', 'fixture.sh')
    mkdirSync(join(shellUser, '..'), { recursive: true })
    writeFileSync(shellUser, `${shellMktemp}\n`)
    // History keeps the paths of its day; only live surfaces are held to the rule.
    const historical = join(root, 'notes', 'implemented', '2026-01-01-old.md')
    mkdirSync(join(historical, '..'), { recursive: true })
    writeFileSync(historical, `Evidence sat in '${outside}'\n`)
    // No redirect yet: the same tmpdir() call is scratch outside the repo.
    writeFileSync(join(packageDir, 'vitest.config.ts'), 'export default {}\n')
    trackFixtureRepo(root)

    const gate = 'scratch: temporary files stay under the repo .tmp/'
    const run = () => spawnSync(process.execPath, [join(scripts, 'verify.mjs')], { encoding: 'utf8' })
    // Match this gate's own finding text: the fixture's note path also shows up in unrelated
    // problems (the notes-shape gates read the same throwaway tree).
    const finding = (where, line) => `${where}:${line} points at scratch outside the repo`
    const literalLine = finding('packages/dsh-smart-assistant/tests/scratch.spec.ts', 1)
    const tmpdirLine = finding('packages/dsh-smart-assistant/tests/fixture.spec.ts', 2)
    const mktempLine = finding('dev/fixture.sh', 1)
    const first = run()
    expect(first.error).toBeUndefined()
    expect(first.stdout).toContain(`FAIL ${gate}`)
    expect(first.stdout).toContain(literalLine)
    expect(first.stdout).toContain(tmpdirLine)
    expect(first.stdout).toContain(mktempLine)
    expect(first.stdout).not.toContain(finding('notes/implemented/2026-01-01-old.md', 1))

    // The redirect exists now, so the calls it covers stop being violations — the literal and the
    // bare shell `mktemp` (which no test-process env can redirect) stay violations.
    writeFileSync(join(packageDir, 'vitest.config.ts'), "export default { test: { env: { TMPDIR: '.tmp/vitest' } } }\n")
    const second = run()
    expect(second.stdout).toContain(`FAIL ${gate}`)
    expect(second.stdout).not.toContain(tmpdirLine)
    expect(second.stdout).toContain(literalLine)
    expect(second.stdout).toContain(mktempLine)

    writeFileSync(literalUser, "const dir = '.tmp/fixture-scratch'\n")
    writeFileSync(shellUser, 'home=$(mktemp -d "$PWD/.tmp/home-XXXXXX")\n')
    expect(run().stdout).toContain(`ok   ${gate}`)
  })
})

describe('markdownCorpusFromTracked', () => {
  it('keeps every tracked entry-chain file and drops the frozen _archive pool', () => {
    const root = temp('corpus-')
    const tracked = [
      'AGENTS.md',
      'dev/AGENTS.md',
      'packages/dsh-smart-assistant/README.md',
      'scripts/checks/README.md',
      '.agents/skills/x/SKILL.md',
      '_backlog/issues/261001-card.md',
      '_backlog/_archive/settled_issues/260929-card.md',
      'notes/archived/2026-09-30-note.md',
      'package.json', // non-markdown is not corpus
    ]
    const corpus = markdownCorpusFromTracked(tracked, root)
    expect(corpus).toHaveLength(7)
    expect(corpus.some(path => path.includes(join('_archive', 'settled_issues')))).toBe(false)
    expect(corpus.some(path => path.endsWith(join('dev', 'AGENTS.md')))).toBe(true)
    expect(corpus.some(path => path.endsWith('SKILL.md'))).toBe(true)
  })
})

describe('notePointerProblems', () => {
  /** A throwaway "repo" with one real note: existence checks resolve against it. */
  const setup = () => {
    const root = temp('note-ptr-')
    mkdirSync(join(root, 'notes', 'implemented'), { recursive: true })
    writeFileSync(join(root, 'notes', 'implemented', '2099-01-01-real.md'), 'real\n', 'utf8')
    return root
  }

  it('flags a note path that does not exist, wherever it hides (patch-YAML comment class)', () => {
    const root = setup()
    const problems = notePointerProblems({
      repoRoot: root,
      files: [{ file: join(root, 'patch.yml'), where: 'patch.yml', text: '# 决定 notes/implemented/2099-01-01-gone.md，D1=a' }],
    })
    expect(problems).toHaveLength(1)
    expect(problems[0]).toContain('2099-01-01-gone.md')
    expect(problems[0]).toContain('does not exist')
  })

  it('accepts resolving pointers in any file type and markdown links inside notes/', () => {
    const root = setup()
    const problems = notePointerProblems({
      repoRoot: root,
      files: [
        { file: join(root, 'patch.yml'), where: 'patch.yml', text: '# 决定 notes/implemented/2099-01-01-real.md，D1=a' },
        { file: join(root, 'notes', 'implemented', 'other.md'), where: 'notes/implemented/other.md', text: '见 [另一形态](notes/implemented/2099-01-01-real.md)。' },
      ],
    })
    expect(problems).toEqual([])
  })

  it('rejects bare full-filename mentions inside notes/ (the tree links, not quotes)', () => {
    const root = setup()
    const problems = notePointerProblems({
      repoRoot: root,
      files: [{ file: join(root, 'notes', 'implemented', 'other.md'), where: 'notes/implemented/other.md', text: '现行决定在 notes/implemented/2099-01-01-real.md 里。' }],
    })
    expect(problems).toHaveLength(1)
    expect(problems[0]).toContain('bare text')
  })

  it('ignores note paths that are tails of external or vendor paths (not our pointers)', () => {
    const root = setup()
    const problems = notePointerProblems({
      repoRoot: root,
      files: [
        { file: join(root, 'notes', 'archived', 'x.md'), where: 'notes/archived/x.md', text: '出处：/Users/someone/ai_dsh_company/notes/archived/research/2099-01-01-elsewhere.md' },
        { file: join(root, 'docs', 'x.md'), where: 'docs/x.md', text: '规则见 [implemented 事实维护](../../vendor/dsh/.agents/notes/implemented/AGENTS.md)' },
      ],
    })
    expect(problems).toEqual([])
  })

  it('flags a backlog card pointer whose card settled into _archive (stale issues/ path in a dev script header)', () => {
    const root = setup()
    mkdirSync(join(root, '_backlog', '_archive', 'settled_issues'), { recursive: true })
    writeFileSync(join(root, '_backlog', '_archive', 'settled_issues', '261001-card.md'), 'settled\n', 'utf8')
    const problems = notePointerProblems({
      repoRoot: root,
      files: [{ file: join(root, 'probe.mjs'), where: 'dev/probes/web/probe.mjs', text: '// K4 probe (_backlog/issues/261001-card.md open item 2).' }],
    })
    expect(problems).toHaveLength(1)
    expect(problems[0]).toContain('_backlog/issues/261001-card.md')
    expect(problems[0]).toContain('does not exist')
  })

  it('accepts resolving backlog pointers as bare text — the link-form rule stays notes-internal', () => {
    const root = setup()
    mkdirSync(join(root, '_backlog', 'issues'), { recursive: true })
    writeFileSync(join(root, '_backlog', 'issues', '261001-card.md'), 'active\n', 'utf8')
    const problems = notePointerProblems({
      repoRoot: root,
      files: [{ file: join(root, 'notes', 'implemented', 'n.md'), where: 'notes/implemented/n.md', text: '推进台账住 _backlog/issues/261001-card.md。' }],
    })
    expect(problems).toEqual([])
  })
})

const trackFixtureRepo = root => {
  const git = (...args) => spawnSync('git', ['-C', root, '-c', 'user.email=fixture@example.test', '-c', 'user.name=fixture', ...args], { encoding: 'utf8' })
  git('init', '-q')
  git('add', '-A')
  git('commit', '-qm', 'fixture')
}

