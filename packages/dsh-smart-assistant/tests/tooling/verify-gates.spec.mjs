/**
 * Fixtures for the mechanical-gate cores in scripts/checks/verify-checks.mjs (slice E of the
 * development-foundation remediation, 2026-09-24). Every accepted and rejected shape of the
 * pin, notes-naming, proposal-status, and relative-link checks is pinned here against
 * throwaway directories and throwaway git repositories — the real vendor tree, ROADMAP, and
 * notes are never touched, and no pin is ever upgraded.
 *
 * This file is deliberately plain .mjs: vitest runs it, while `tsc -p tsconfig.test.json`
 * (type-checking the TS specs) does not include non-TS files, so importing the untyped script
 * module costs the type gate nothing.
 */
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, utimesSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  agentsMdStabilityProblems,
  clientScriptSafetyProblems,
  commandAliasProblems,
  configParseProblems,
  dshHomeInheritanceProblems,
  dependencyPoseProblems,
  exportManualProblems,
  GRADUATED_STATUS,
  languageGuardProblems,
  notesNamingProblems,
  notesStateProblems,
  backlogLivenessProblems,
  notesTopLevelProblems,
  pinProblems,
  playbookFrontmatterProblems,
  implementedAlternativesProblems,
  relativeLinkProblems,
  skillFrontmatterProblems,
  startPathProblems,
  testAssetNamingProblems,
  textHygieneProblems,
  vendorClientFreshnessProblems,
} from '../../../../scripts/checks/verify-checks.mjs'
import * as gateCores from '../../../../scripts/checks/verify-checks.mjs'
import { renderIndex } from '../../../../scripts/generate/gen-notes-index.mjs'

const dirs = []

afterEach(() => {
  for (const dir of dirs) rmSync(dir, { recursive: true, force: true })
  dirs.length = 0
})

function temp(prefix) {
  const dir = mkdtempSync(join(tmpdir(), prefix))
  dirs.push(dir)
  return dir
}

// ── relative markdown links ────────────────────────────────────────────────────────────────────

describe('commandAliasProblems', () => {
  const scripts = { verify: 'node scripts/checks/verify.mjs', 'eval:domain': 'node dev/eval/domain-run.mjs' }
  const doc = (path, text) => ({ path, text })

  it('accepts docs whose commands are aliases and whose aliases are documented', () => {
    expect(commandAliasProblems({
      scripts,
      documents: [doc('AGENTS.md', 'pnpm verify  # 门禁\npnpm eval:domain  # 领域评测\npnpm install'), doc('docs/dev.md', 'pnpm exec dsh')],
    })).toEqual([])
  })

  it('rejects a documented command that no alias provides (the class that caught `pnpm symlink`)', () => {
    // Scope note: this rule owns the *alias table*. A bare `dsh plugin add …` invocation belongs to
    // DSH's CLI, not to package.json, so it is deliberately out of scope here.
    const problems = commandAliasProblems({
      scripts,
      documents: [doc('docs/dev.md', '（pnpm symlink 语义）'), doc('AGENTS.md', 'pnpm verify')],
    })
    expect(problems.join(' ')).toContain('pnpm symlink')
    expect(problems.join(' ')).toContain('the doc outlived the alias')
  })

  it('rejects an alias that no current doc names', () => {
    const problems = commandAliasProblems({
      scripts: { ...scripts, silent: 'node scripts/silent.mjs' },
      documents: [doc('AGENTS.md', 'pnpm verify')],
    })
    expect(problems.join(' ')).toContain('pnpm silent')
    expect(problems.join(' ')).toContain('named in no current doc')
  })

  it('reports an empty corpus rather than passing silently', () => {
    expect(commandAliasProblems({ scripts, documents: [] }).join(' ')).toContain('corpus is empty')
  })
})

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

// The production runner's corpus is part of the contract: passing files directly to the pure
// core cannot catch a directory omitted by verify.mjs. Run its unchanged source in a throwaway
// repo, importing the real core; unrelated gates can fail in this deliberately minimal fixture.
describe('verify relative-link corpus wiring', () => {
  it('rejects broken routes in every active backlog area, accepts repaired routes, and leaves _done frozen', () => {
    const root = temp('verify-link-wiring-')
    // Stage the runner at its real depth (scripts/checks/) — verify.mjs derives repoRoot
    // as two levels up from its own location, so the fixture tree must mirror the layout.
    const scripts = join(root, 'scripts', 'checks')
    mkdirSync(scripts, { recursive: true })
    writeFileSync(join(scripts, 'verify.mjs'), readFileSync(join(import.meta.dirname, '../../../../scripts/checks/verify.mjs'), 'utf8'))
    const core = new URL('../../../../scripts/checks/verify-checks.mjs', import.meta.url).href
    writeFileSync(join(scripts, 'verify-checks.mjs'), `export * from ${JSON.stringify(core)}\n`)
    for (const file of ['AGENTS.md', 'README.md']) writeFileSync(join(root, file), '# fixture\n')
    const active = [
      '_backlog/README.md',
      '_backlog/plans/README.md',
      '_backlog/plans/261005-card.md',
      '_backlog/bugs/README.md',
      '_backlog/bugs/BUG-001-example.md',
      '_backlog/reference/README.md',
      '_backlog/reference/261005-flat.md',
      '_backlog/reference/positioning/261005-nested.md',
      '_backlog/reference/tech-exploration/deeper/261005-deep.md',
    ]
    for (const file of [...active, '_backlog/_done/README.md', '_backlog/_done/_reference/261005-frozen.md', '_backlog/unowned.md']) {
      const path = join(root, file)
      mkdirSync(join(path, '..'), { recursive: true })
      writeFileSync(path, '[route](missing.md)\n')
    }
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
    expect(broken).not.toContain('_backlog/_done/README.md links to')
    expect(broken).not.toContain('_backlog/_done/_reference/261005-frozen.md links to')
    expect(broken).not.toContain('_backlog/unowned.md links to')
    for (const file of active) writeFileSync(join(root, file, '..', 'missing.md'), '# destination\n')
    expect(run()).toContain(`ok   ${gate}`)
  })
})

// The machine-local-path rule was an inline closure with no fixture and a corpus that stopped short
// of `_backlog/`, so a playbook staged there cited the upstream checkout by absolute path and the
// gate stayed green (found 2026-10-08). This drives the real runner over a throwaway tree, the same
// "a negative case through the real runner" shape the link-corpus fixture uses.
describe('verify machine-local-path corpus wiring', () => {
  it('rejects an absolute path in every active backlog area, and leaves notes/ (the provenance home) alone', () => {
    const root = temp('verify-machine-local-')
    const scripts = join(root, 'scripts', 'checks')
    mkdirSync(scripts, { recursive: true })
    writeFileSync(join(scripts, 'verify.mjs'), readFileSync(join(import.meta.dirname, '../../../../scripts/checks/verify.mjs'), 'utf8'))
    const core = new URL('../../../../scripts/checks/verify-checks.mjs', import.meta.url).href
    writeFileSync(join(scripts, 'verify-checks.mjs'), `export * from ${JSON.stringify(core)}\n`)
    for (const file of ['AGENTS.md', 'README.md']) writeFileSync(join(root, file), '# fixture\n')

    const offending = [
      '_backlog/README.md',
      '_backlog/plans/README.md',
      '_backlog/plans/261005-card.md',
      '_backlog/bugs/README.md',
      '_backlog/bugs/BUG-001-example.md',
      '_backlog/reference/README.md',
      '_backlog/reference/positioning/261005-nested.md',
      // The area that motivated the rule: staged playbooks are shared prose too.
      '_backlog/playbooks_plan_and_validate/README.md',
      '_backlog/playbooks_plan_and_validate/some-playbook.md',
    ]
    for (const file of offending) {
      const path = join(root, file)
      mkdirSync(join(path, '..'), { recursive: true })
      writeFileSync(path, 'Protocol lives at /Users/someone/checkout/skills/x/SKILL.md\n')
    }
    // Frozen history keeps its prose, notes/ is where external provenance is allowed to live, and a
    // file outside the institution is not this rule's business.
    for (const file of ['_backlog/_done/README.md', '_backlog/_done/_reference/261005-frozen.md', 'notes/implemented/2026-01-01-topic.md', '_backlog/unowned.md']) {
      const path = join(root, file)
      mkdirSync(join(path, '..'), { recursive: true })
      writeFileSync(path, 'Protocol lives at /Users/someone/checkout/skills/x/SKILL.md\n')
    }

    const gate = 'links: contract docs cite no machine-local absolute paths'
    const result = spawnSync(process.execPath, [join(scripts, 'verify.mjs')], { encoding: 'utf8' })
    expect(result.error).toBeUndefined()
    expect(result.signal).toBeNull()
    // Full exit stays red for unrelated missing-fixture contracts; inspect this gate's real verdict.
    expect(result.status).toBe(1)
    expect(result.stdout).toContain(`FAIL ${gate}`)
    for (const file of offending) expect(result.stdout).toContain(`${file} cites a machine-local absolute path`)
    for (const file of ['_backlog/_done/README.md', '_backlog/_done/_reference/261005-frozen.md', 'notes/implemented/2026-01-01-topic.md', '_backlog/unowned.md']) {
      expect(result.stdout).not.toContain(`${file} cites a machine-local absolute path`)
    }

    // Repaired: every offending file loses the absolute path, and the gate goes green.
    for (const file of offending) {
      writeFileSync(join(root, file), 'Protocol lives in the upstream checkout named in the ledger\n')
    }
    expect(spawnSync(process.execPath, [join(scripts, 'verify.mjs')], { encoding: 'utf8' }).stdout).toContain(`ok   ${gate}`)
  })
})

// A gate core that exists but is never invoked by the top-level command is a script, not a gate —
// no invalid case could reach a real acceptance path (2026-10-07; the corpus's "a negative case
// through the real runner" applied to our own wiring). The core must be *called* in the runner's
// body: import lines prove nothing, and a namespace-style call (`gateCores.x(...)`, one mention)
// is wired all the same. Pinned against the REAL verify.mjs source: the real wiring passes, a
// namespace-wired shape passes, and sabotaged copies (call sites erased / name erased everywhere)
// flag exactly the unwired core — the prove-it-red halves of the wiring gate.
describe('gateWiringProblems', () => {
  const verifySource = readFileSync(join(import.meta.dirname, '..', '..', '..', '..', 'scripts', 'checks', 'verify.mjs'), 'utf8')
  const functionCores = () => Object.entries(gateCores).filter(([, value]) => typeof value === 'function')

  it('accepts the real runner: every exported function core is invoked in the body', () => {
    expect(gateCores.gateWiringProblems({ exportedCores: gateCores, verifySource })).toEqual([])
  })

  it('accepts namespace-style wiring: one body call per core, no named imports', () => {
    // The shape this gate must not false-positive (the first draft's occurrence-count rule did):
    // a core called once via the namespace runs — it is wired.
    const source = functionCores().map(([name]) => `checks.push(gateCores.${name}(...))`).join('\n')
    expect(gateCores.gateWiringProblems({ exportedCores: gateCores, verifySource: source })).toEqual([])
  })

  it('flags a core reduced to its import line (call sites erased) as an unwired gate', () => {
    const name = 'notesNamingProblems'
    const first = verifySource.indexOf(name)
    const head = verifySource.slice(0, first + name.length)
    const tail = verifySource.slice(first + name.length).replaceAll(name, '')
    const problems = gateCores.gateWiringProblems({ exportedCores: gateCores, verifySource: head + tail })
    expect(problems).toHaveLength(1)
    expect(problems[0]).toContain(name)
    expect(problems[0]).toContain('never invoked in the body')
  })

  it('flags a core named nowhere in the runner', () => {
    const name = 'notesStateProblems'
    const problems = gateCores.gateWiringProblems({ exportedCores: gateCores, verifySource: verifySource.replaceAll(name, '') })
    expect(problems).toHaveLength(1)
    expect(problems[0]).toContain(name)
    expect(problems[0]).toContain('never invoked in the body')
  })

  it('reports an empty core module rather than passing silently', () => {
    expect(gateCores.gateWiringProblems({ exportedCores: {}, verifySource }).join(' ')).toContain('no functions')
  })
})

// ── notes naming & proposal status ─────────────────────────────────────────────────────────────

describe('notesNamingProblems', () => {
  it('accepts date-named notes and README/non-markdown exemptions; rejects other names', () => {
    const notes = temp('notes-')
    for (const sub of ['proposed', 'implemented', 'archived/research']) mkdirSync(join(notes, sub), { recursive: true })
    writeFileSync(join(notes, 'proposed', '2026-09-24-a-proposal.md'), 'x', 'utf8')
    writeFileSync(join(notes, 'implemented', '2026-09-23-a-decision.md'), 'x', 'utf8')
    writeFileSync(join(notes, 'archived', 'research', 'README.md'), 'x', 'utf8')
    writeFileSync(join(notes, 'implemented', '.gitkeep'), '', 'utf8')
    writeFileSync(join(notes, 'archived', 'research', 'random-jottings.md'), 'x', 'utf8')

    const problems = notesNamingProblems(notes)
    expect(problems).toHaveLength(1)
    expect(problems[0]).toContain('notes/archived/research/random-jottings.md')
    expect(problems[0]).toContain('YYYY-MM-DD-topic.md')
  })
})

describe('notesStateProblems', () => {
  const line = (date, word) => `# t\n\n日期：${date} · 状态：**${word}**（说明）\n`

  it('accepts canonical lines whose word matches the directory and the filename date', () => {
    const notes = temp('notes-state-')
    for (const sub of ['proposed', 'implemented', 'archived', 'rejected']) mkdirSync(join(notes, sub), { recursive: true })
    writeFileSync(join(notes, 'proposed', '2026-09-25-a.md'), line('2026-09-25', 'proposed'), 'utf8')
    writeFileSync(join(notes, 'implemented', '2026-09-25-b.md'), line('2026-09-25', 'implemented'), 'utf8')
    writeFileSync(join(notes, 'archived', '2026-09-25-c.md'), line('2026-09-25', 'implemented') + '已归档：2026-09-25（冻结）\n', 'utf8')
    writeFileSync(join(notes, 'rejected', '2026-09-25-d.md'), line('2026-09-25', 'rejected'), 'utf8')

    expect(notesStateProblems(notes)).toEqual([])
  })

  it('rejects a missing line, a wrong directory word, a date mismatch, and an unfrozen archive', () => {
    const notes = temp('notes-state-')
    for (const sub of ['proposed', 'implemented', 'archived']) mkdirSync(join(notes, sub), { recursive: true })
    writeFileSync(join(notes, 'proposed', '2026-09-25-no-line.md'), '# no state line\n', 'utf8')
    writeFileSync(join(notes, 'implemented', '2026-09-25-wrong-dir.md'), line('2026-09-25', 'proposed'), 'utf8')
    writeFileSync(join(notes, 'implemented', '2026-09-25-date-drift.md'), line('2026-09-24', 'implemented'), 'utf8')
    writeFileSync(join(notes, 'archived', '2026-09-25-unfrozen.md'), line('2026-09-25', 'implemented'), 'utf8')

    const problems = notesStateProblems(notes)
    expect(problems.some(p => p.includes('no-line.md') && p.includes('unreadable'))).toBe(true)
    expect(problems.some(p => p.includes('wrong-dir.md') && p.includes('directory and status must agree'))).toBe(true)
    expect(problems.some(p => p.includes('date-drift.md') && p.includes('filename date'))).toBe(true)
    expect(problems.some(p => p.includes('unfrozen.md') && p.includes('已归档'))).toBe(true)
  })

  it('requires a rejection reason and a wound-up survey in the ledger', () => {
    const notes = temp('notes-state-')
    for (const sub of ['rejected', 'archived/research']) mkdirSync(join(notes, sub), { recursive: true })
    writeFileSync(join(notes, 'rejected', '2026-09-25-bare.md'), '日期：2026-09-25 · 状态：**rejected**\n', 'utf8')
    writeFileSync(join(notes, 'archived', 'research', '2026-09-25-done.md'), '日期：2026-09-25 · 状态：已收卷 · 结论在 §5\n', 'utf8')
    writeFileSync(join(notes, 'archived', 'research', '2026-09-25-not-wound.md'), '日期：2026-09-25 · 状态：进行中\n', 'utf8')

    const problems = notesStateProblems(notes)
    expect(problems.some(p => p.includes('bare.md') && p.includes('rejection reason'))).toBe(true)
    expect(problems.some(p => p.includes('not-wound.md') && p.includes('已收卷'))).toBe(true)
    expect(problems.some(p => p.includes('live.md'))).toBe(false)
  })
})

describe('notesTopLevelProblems', () => {
  it('accepts the documented lifecycle set (incl. the generated INDEX.md) and rejects an undocumented bucket', () => {
    const notes = temp('notes-top-')
    for (const sub of ['proposed', 'implemented', 'rejected', 'archived', 'archived/research']) mkdirSync(join(notes, sub), { recursive: true })
    writeFileSync(join(notes, 'README.md'), '# map\n', 'utf8')
    // 生成索引是 notes 根唯一被接纳的非 README 文件——接纳形状与生成器同 diff 登记（2026-10-07）
    writeFileSync(join(notes, 'INDEX.md'), '<!-- GENERATED by scripts/generate/gen-notes-index.mjs -->\n', 'utf8')

    expect(notesTopLevelProblems(notes)).toEqual([])

    mkdirSync(join(notes, 'postmortem'), { recursive: true })
    writeFileSync(join(notes, 'scratch.md'), 'x', 'utf8')
    const problems = notesTopLevelProblems(notes)
    expect(problems.some(p => p.includes('notes/postmortem/'))).toBe(true)
    expect(problems.some(p => p.includes('notes/scratch.md'))).toBe(true)
  })
})

// ── gen-notes-index（找卡索引的渲染核：生成物 + freshness，2026-10-07）───────────────────────
// 只读两件事实（文件名日期、首个标题），正文一律链接过去——夹具钉的是这个"不复制正文"的形状。

describe('gen-notes-index renderIndex', () => {
  it('lists newest first with relative links and section counts', () => {
    const notes = temp('gen-notes-')
    for (const sub of ['implemented', 'proposed', 'rejected']) mkdirSync(join(notes, sub), { recursive: true })
    writeFileSync(join(notes, 'implemented', '2026-10-01-older.md'), '# 旧卡\n', 'utf8')
    writeFileSync(join(notes, 'implemented', '2026-10-07-newer.md'), '# 新卡\n', 'utf8')
    writeFileSync(join(notes, 'proposed', '2026-10-06-idea.md'), '# 想法\n', 'utf8')

    const rendered = renderIndex(notes)

    const newerAt = rendered.indexOf('implemented/2026-10-07-newer.md')
    const olderAt = rendered.indexOf('implemented/2026-10-01-older.md')
    expect(newerAt).toBeGreaterThan(-1)
    expect(olderAt).toBeGreaterThan(newerAt) // 新的在前
    expect(rendered).toContain('[新卡](implemented/2026-10-07-newer.md)')
    expect(rendered).toContain('## implemented（当前 rationale owner）（2）')
    expect(rendered).toContain('## proposed（将来 · 待用户拍板）（1）')
    expect(rendered).toContain('## rejected（被否决的提案 · 负知识）（0）')
    expect(rendered).toContain('（空）') // 空目录给占位，不给假计数
  })

  it('never copies note bodies: a note without a heading renders a placeholder, pipes in titles are escaped', () => {
    const notes = temp('gen-notes-')
    mkdirSync(join(notes, 'implemented'), { recursive: true })
    writeFileSync(join(notes, 'implemented', '2026-10-03-no-title.md'), '只有正文，没有标题\n', 'utf8')
    writeFileSync(join(notes, 'implemented', '2026-10-04-piped.md'), '# 含 | 竖线的标题\n', 'utf8')

    const rendered = renderIndex(notes)

    expect(rendered).toContain('（无标题）')
    expect(rendered).toContain('含 \\| 竖线的标题')
    expect(rendered).not.toContain('只有正文') // 正文一字节都不进索引
  })
})


// ── backlog liveness（2026-10-02 治理借鉴：状态行户口 + 制度目录 + 索引互查）────────────────

describe('backlogLivenessProblems', () => {
  function bootBacklog(dir) {
    for (const sub of ['plans', 'bugs', 'reference', join('_done', '_closed_plans'), join('_done', '_fixed_bugs'), join('_done', '_suspended_plans'), join('_done', '_suspended_bugs'), join('_done', '_reference')]) {
      mkdirSync(join(dir, sub), { recursive: true })
    }
    writeFileSync(join(dir, 'plans', 'README.md'), '# plans\n\n| 卡 | 一句话 | 倾向 |\n|---|---|---|\n', 'utf8')
    writeFileSync(join(dir, 'bugs', 'README.md'), '# bugs\n\n| Bug | 标题 | 严重级 | 发现 |\n|---|---|---|---|\n', 'utf8')
    writeFileSync(join(dir, 'reference', 'README.md'), '# reference\n', 'utf8')
    for (const pool of ['_closed_plans', '_fixed_bugs', '_suspended_plans', '_suspended_bugs', '_reference']) {
      writeFileSync(join(dir, '_done', pool, 'README.md'), `# ${pool}\n`, 'utf8')
    }
    writeFileSync(join(dir, '_done', 'README.md'), '# _done\n', 'utf8')
  }

  it('accepts a live backlog: hukou lines present, every card indexed', () => {
    const backlog = temp('backlog-ok-')
    bootBacklog(backlog)
    writeFileSync(join(backlog, 'plans', '260928-demo.md'),
      '# 推敲：demo\n\n> 立卡：2026-09-28 ｜ 状态：推敲中｜下一步 = 想清楚\n', 'utf8')
    writeFileSync(join(backlog, 'plans', 'README.md'),
      '| 卡 |\n|---|\n| [260928-demo.md](260928-demo.md) |\n', 'utf8')
    expect(backlogLivenessProblems(backlog)).toEqual([])
  })

  it('rejects a dead draft (no status line) and an unindexed card, and a missing pool', () => {
    const backlog = temp('backlog-red-')
    bootBacklog(backlog)
    writeFileSync(join(backlog, 'plans', '260928-dead.md'), '# 推敲：死稿\n\n没有状态行。\n', 'utf8')
    writeFileSync(join(backlog, 'plans', '260928-live.md'),
      '# 推敲：活卡\n\n> 状态：推敲中\n', 'utf8')
    const problems = backlogLivenessProblems(backlog)
    expect(problems.some(p => p.includes('260928-dead.md') && p.includes('状态：'))).toBe(true)
    expect(problems.some(p => p.includes('260928-live.md') && p.includes('index'))).toBe(true)

    rmSync(join(backlog, '_done', '_suspended_plans'), { recursive: true, force: true })
    expect(backlogLivenessProblems(backlog).some(p => p.includes('_suspended_plans'))).toBe(true)
  })

  it('rejects reference material missing from its index', () => {
    const backlog = temp('backlog-ref-')
    bootBacklog(backlog)
    writeFileSync(join(backlog, 'reference', '260928-survey.md'), '# 调研材料\n', 'utf8')
    expect(backlogLivenessProblems(backlog).some(p => p.includes('260928-survey.md') && p.includes('index'))).toBe(true)
    writeFileSync(join(backlog, 'reference', 'README.md'), '# reference\n\n| 文件 |\n|---|\n| [260928-survey.md](260928-survey.md) |\n', 'utf8')
    expect(backlogLivenessProblems(backlog)).toEqual([])
  })

  it('walks topic subdirectories: subdir material must be named by its subpath, else red', () => {
    const backlog = temp('backlog-refsub-')
    bootBacklog(backlog)
    mkdirSync(join(backlog, 'reference', 'tech-exploration'), { recursive: true })
    writeFileSync(join(backlog, 'reference', 'tech-exploration', '261005-case.md'), '# 技术定调\n', 'utf8')
    // 2026-10-05 reference 分装子目录——子目录文件若脱离索引互查，检查就等于没守住那半边
    expect(backlogLivenessProblems(backlog).some(p => p.includes('tech-exploration/261005-case.md') && p.includes('index'))).toBe(true)
    writeFileSync(join(backlog, 'reference', 'README.md'), '# reference\n\n| 文件 |\n|---|\n| [261005-case.md](tech-exploration/261005-case.md) |\n', 'utf8')
    expect(backlogLivenessProblems(backlog)).toEqual([])
  })

  it('rejects an archived card missing from its pool index', () => {
    const backlog = temp('backlog-arch-')
    bootBacklog(backlog)
    writeFileSync(join(backlog, '_done', '_closed_plans', '260928-gone.md'),
      '# 推敲：已毕业\n\n> 状态：已关闭\n', 'utf8')
    // _closed_plans README 不点名它
    expect(backlogLivenessProblems(backlog).some(p => p.includes('260928-gone.md') && p.includes('index'))).toBe(true)
  })
})

describe('agentsMdStabilityProblems', () => {
  it('accepts standing orders and rejects dates and progress marks', () => {
    const dir = temp('agents-')
    const clean = join(dir, 'AGENTS.md')
    writeFileSync(clean, '## 规则\n- 永远不要碰日用的 ~/.dsh。\n', 'utf8')
    expect(agentsMdStabilityProblems(clean)).toEqual([])

    const dirty = join(dir, 'DIRTY.md')
    writeFileSync(dirty, '## 规则\n- （用户拍板 2026-09-24）开工即立卡。\n- 队列标记：▶ 可开工。\n', 'utf8')
    const problems = agentsMdStabilityProblems(dirty)
    expect(problems.some(p => p.includes('carries a date'))).toBe(true)
    expect(problems.some(p => p.includes('progress mark'))).toBe(true)
  })
})

describe('implementedAlternativesProblems', () => {
  it('requires 输掉的方案 from the gate date on; grandfathers and English headings pass', () => {
    const implemented = temp('implemented-')
    // Gate date and later: must carry the section (Chinese or English heading both count).
    writeFileSync(join(implemented, '2026-09-25-with-alternatives.md'), '## 决定\n…\n## 输掉的方案\n- b) 慢而稳\n', 'utf8')
    writeFileSync(join(implemented, '2026-09-25-english-heading.md'), '## Decision\n…\n## Alternatives considered\n- b\n', 'utf8')
    writeFileSync(join(implemented, '2026-09-26-bare.md'), '## 决定\n只有决定，没记击败了什么。\n', 'utf8')
    // Before the gate date: grandfathered, shape untouched.
    writeFileSync(join(implemented, '2026-09-24-old-shape.md'), '## 决定\n没有备选节的旧 note。\n', 'utf8')

    const problems = implementedAlternativesProblems(implemented)
    expect(problems).toHaveLength(1)
    expect(problems[0]).toContain('2026-09-26-bare.md')
    expect(problems[0]).toContain('输掉的方案')
    expect(problems[0]).toContain('re-litigation')
  })
})

describe('GRADUATED_STATUS', () => {
  it('matches every known completion word and no in-progress wording', () => {
    for (const done of ['状态：**已全部实施', '状态：**已消化', '状态：**已毕业', '状态：**已完成', '状态：**已实施', '状态：**implemented', '状态：**rejected', '状态：**archived']) {
      expect(GRADUATED_STATUS.test(done)).toBe(true)
    }
    for (const pending of ['状态：**待接手实施', '状态：**部分实施', '状态：**proposed', '状态：**调研中', '待接手实施']) {
      expect(GRADUATED_STATUS.test(pending)).toBe(false)
    }
  })
})

// ── submodule pin ──────────────────────────────────────────────────────────────────────────────

/** Minimal inner git repo standing in for vendor/dsh, tagged so `describe --tags` is exact. */
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

// ── language guard, text hygiene, dependency posture ────────────────────────────────────────────

describe('languageGuardProblems', () => {
  it('flags CJK outside comments, exempts comment lines, and passes English sources', () => {
    const dir = temp('language-')
    const good = join(dir, 'good.ts')
    writeFileSync(good, "// 中文注释随文件现状（允许）\nexport const message = 'Load the skill first.'\n", 'utf8')
    const bad = join(dir, 'bad.ts')
    writeFileSync(bad, "export const message = '先加载技能'\n", 'utf8')
    const skill = join(dir, 'SKILL.md')
    writeFileSync(skill, '# Title\n\nLoad this before saving.\n', 'utf8')

    const problems = languageGuardProblems([good, bad, skill])
    expect(problems).toHaveLength(1)
    expect(problems[0]).toContain('bad.ts')
    expect(problems[0]).toContain('English')
  })

  it('exempts an HTML-comment vocabulary line in a skill body, but not CJK prose beside it', () => {
    const dir = temp('language-md-')
    const skill = join(dir, 'SKILL.md')
    writeFileSync(skill, [
      '# Title',
      '',
      '<!-- 词汇（用户可见散文）：threads 一律称「在跟的事」 -->',
      'Call threads 「在跟的事」 in prose.',
      '',
    ].join('\n'), 'utf8')
    const problems = languageGuardProblems([skill])
    expect(problems).toHaveLength(1)
    expect(problems[0]).toContain('SKILL.md:4')
    expect(problems[0]).toContain('English')
  })
})

describe('textHygieneProblems', () => {
  it('accepts exact UTF-8 + one newline and rejects missing, doubled, or invalid endings', () => {
    const dir = temp('text-')
    const clean = join(dir, 'clean.md')
    writeFileSync(clean, '# ok\n', 'utf8')
    const noNewline = join(dir, 'no-newline.md')
    writeFileSync(noNewline, '# ok', 'utf8')
    const doubleNewline = join(dir, 'double.md')
    writeFileSync(doubleNewline, '# ok\n\n', 'utf8')
    const invalid = join(dir, 'invalid.md')
    writeFileSync(invalid, Buffer.from([0xff, 0xfe, 0x0a]))

    expect(textHygieneProblems([clean])).toEqual([])
    const problems = textHygieneProblems([noNewline, doubleNewline, invalid])
    expect(problems.some(p => p.includes('no-newline.md') && p.includes('no trailing newline'))).toBe(true)
    expect(problems.some(p => p.includes('double.md') && p.includes('more than one newline'))).toBe(true)
    expect(problems.some(p => p.includes('invalid.md') && p.includes('not valid UTF-8'))).toBe(true)
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

describe('skillFrontmatterProblems', () => {
  it('accepts a well-formed bundle and flags a name/directory mismatch, a missing description, and a missing file', () => {
    const dir = temp('skills-')
    mkdirSync(join(dir, 'good-skill'), { recursive: true })
    writeFileSync(join(dir, 'good-skill', 'SKILL.md'), '---\nname: good-skill\ndescription: does a thing\n---\n\nbody\n', 'utf8')
    mkdirSync(join(dir, 'wrong-name'), { recursive: true })
    writeFileSync(join(dir, 'wrong-name', 'SKILL.md'), '---\nname: other-name\ndescription: x\n---\n\nbody\n', 'utf8')
    mkdirSync(join(dir, 'no-description'), { recursive: true })
    writeFileSync(join(dir, 'no-description', 'SKILL.md'), '---\nname: no-description\n---\n\nbody\n', 'utf8')
    mkdirSync(join(dir, 'empty-bundle'), { recursive: true })

    const problems = skillFrontmatterProblems(dir)
    expect(problems.some(p => p.includes('good-skill'))).toBe(false)
    expect(problems.some(p => p.includes('declares name other-name'))).toBe(true)
    expect(problems.some(p => p.includes('has no description'))).toBe(true)
    expect(problems.some(p => p.includes('empty-bundle/ has no SKILL.md'))).toBe(true)
  })

  // The shape that hid two curated skills (2026-09-25): present on disk, absent from the catalog,
  // `skill <name>` answering "unknown" — a plain scalar with an inner `: ` is a YAML parse error,
  // which a line-scanning gate cannot see. The loader skips such a file with a warning only.
  it('rejects frontmatter the loader would silently skip, not just a wrong name', () => {
    const dir = temp('skills-')
    mkdirSync(join(dir, 'inner-colon'), { recursive: true })
    writeFileSync(join(dir, 'inner-colon', 'SKILL.md'),
      '---\nname: inner-colon\ndescription: ok\nwhenToUse: the execution shape: who does what by when\n---\n\nbody\n', 'utf8')
    mkdirSync(join(dir, 'legacy-invocation'), { recursive: true })
    writeFileSync(join(dir, 'legacy-invocation', 'SKILL.md'),
      '---\nname: legacy-invocation\ndescription: ok\ndisableModelInvocation: true\n---\n\nbody\n', 'utf8')
    mkdirSync(join(dir, 'non-boolean-invocation'), { recursive: true })
    writeFileSync(join(dir, 'non-boolean-invocation', 'SKILL.md'),
      '---\nname: non-boolean-invocation\ndescription: ok\nuser-invocable: maybe\n---\n\nbody\n', 'utf8')

    const problems = skillFrontmatterProblems(dir)
    expect(problems.some(p => p.includes('inner-colon') && p.includes('not parsable YAML'))).toBe(true)
    expect(problems.some(p => p.includes('uses unsupported "disableModelInvocation"'))).toBe(true)
    expect(problems.some(p => p.includes('sets "user-invocable" to a non-boolean value'))).toBe(true)
  })
})

describe('playbookFrontmatterProblems', () => {
  // The staging area's shape is flat `<name>.md`, which the bundle-shaped core above cannot reach.
  // Without this check a draft could rot in _backlog/ and only fail at graduation — exactly when
  // the file has to be trustworthy, and after the reader has stopped expecting surprises.
  it('accepts a SKILL-shaped draft and flags a basename/name mismatch, missing description, and missing frontmatter', () => {
    const dir = temp('playbooks-')
    writeFileSync(join(dir, 'good-playbook.md'),
      '---\nname: good-playbook\ndescription: does a thing\nwhenToUse: when doing the thing\n---\n\nbody\n', 'utf8')
    writeFileSync(join(dir, 'misnamed.md'),
      '---\nname: something-else\ndescription: x\nwhenToUse: y\n---\n\nbody\n', 'utf8')
    writeFileSync(join(dir, 'no-description.md'),
      '---\nname: no-description\nwhenToUse: y\n---\n\nbody\n', 'utf8')
    writeFileSync(join(dir, 'no-when-to-use.md'),
      '---\nname: no-when-to-use\ndescription: x\n---\n\nbody\n', 'utf8')
    writeFileSync(join(dir, 'naked.md'), '# no frontmatter at all\n', 'utf8')
    // The area's own account book is not a playbook and must not be judged as one.
    writeFileSync(join(dir, 'README.md'), '# the area index\n', 'utf8')

    const problems = playbookFrontmatterProblems(dir)
    expect(problems.some(p => p.includes('good-playbook'))).toBe(false)
    expect(problems.some(p => p.includes('README.md'))).toBe(false)
    expect(problems.some(p => p.includes('misnamed.md') && p.includes('pure move'))).toBe(true)
    expect(problems.some(p => p.includes('no-description.md') && p.includes('has no description'))).toBe(true)
    expect(problems.some(p => p.includes('no-when-to-use.md') && p.includes('has no whenToUse'))).toBe(true)
    expect(problems.some(p => p.includes('naked.md') && p.includes('does not start with frontmatter'))).toBe(true)
  })

  it('rejects YAML the loader would skip, the same way the serving homes do', () => {
    const dir = temp('playbooks-')
    writeFileSync(join(dir, 'inner-colon.md'),
      '---\nname: inner-colon\ndescription: ok\nwhenToUse: the execution shape: who does what\n---\n\nbody\n', 'utf8')

    const problems = playbookFrontmatterProblems(dir)
    expect(problems.some(p => p.includes('inner-colon.md') && p.includes('not parsable YAML'))).toBe(true)
  })

  it('treats an absent staging directory as no problems (the area is optional)', () => {
    expect(playbookFrontmatterProblems(join(temp('playbooks-'), 'never-created'))).toEqual([])
  })
})

describe('composeRunnerTask', () => {
  it('prepends the standing collaboration boundary to every scripted task', async () => {
    const { composeRunnerTask, COLLABORATION_BOUNDARY } = await import('../../../../packages/dsh-smart-assistant/src/dev/preset-runner/index.ts')
    const composed = composeRunnerTask('跑一次 curate')
    expect(composed.startsWith(COLLABORATION_BOUNDARY)).toBe(true)
    expect(composed).toContain('跑一次 curate')
    expect(composed).toContain('you do not commit')
    expect(composed).toContain('not yours to trigger')
  })
})

describe('configParseProblems', () => {
  it('accepts a resolvable !!js scalar and rejects a plain scalar starting with a backtick', () => {
    const dir = temp('config-')
    const good = join(dir, 'good.yml')
    writeFileSync(good, 'task: !!js ctx.headlessStartup.task\n', 'utf8')
    const bad = join(dir, 'bad.yml')
    writeFileSync(bad, 'task: !!js `prefix${ctx.headlessStartup.task}`\n', 'utf8')

    expect(configParseProblems([good])).toEqual([])
    const problems = configParseProblems([bad])
    expect(problems).toHaveLength(1)
    expect(problems[0]).toContain('does not parse as YAML')
  })
})

describe('dev script probes: a presence check must answer both ways under bash 3.2', () => {
  /**
   * The first draft of `dev/prepare.sh` probed with `[ -e "$glob" ]`, which never expands a glob and
   * is true for any non-empty string — so every step it owned was silently skipped on a fresh clone
   * (`vendor/dsh/node_modules` was still absent) and the failure surfaced at boot as dozens of
   * "client bundle not found". `[[ -e glob ]]` is not the fix either: this repo's scripts run under
   * macOS's bash 3.2, where that does not expand globs. Only `compgen -G` answers both ways there.
   */
  const probe = pattern => {
    const script = `present() { compgen -G "$1" > /dev/null 2>&1; }; present ${JSON.stringify(pattern)}`
    try {
      execFileSync('bash', ['-c', script], { stdio: 'ignore', env: { PATH: process.env.PATH ?? '' } })
      return true
    } catch {
      return false
    }
  }

  it('answers present for a real path and missing for a glob that matches nothing', () => {
    expect(probe(join(import.meta.dirname, 'verify-gates.spec.mjs'))).toBe(true)
    expect(probe('definitely/not/here/*.js')).toBe(false)
  })
})

describe('dev env.sh: the isolation exit is honoured by the shell scripts too', () => {
  /**
   * `scripts/dsh.mjs` has always honoured `ASSISTANT_DSH_HOME`; `dev/env.sh` used to overwrite
   * `DSH_HOME` unconditionally, so an isolated run built profiles in one home while the launcher
   * read another — and the only symptom was `profile "dev" does not exist`. Exercised in a real
   * bash subprocess, against a throwaway ASSISTANT_REPO so nothing of the repo is touched.
   */
  const envSh = join(import.meta.dirname, '..', '..', '..', '..', 'dev', 'env', 'env.sh')
  const resolvedHome = (assistantDshHome, extraEnv = {}) => {
    const probeHome = temp('env-home-')
    const scratchRepo = temp('env-repo-')
    const script = `source ${JSON.stringify(envSh)}\nprintf 'RESOLVED=%s\\n' "$DSH_HOME"`
    const env = { PATH: process.env.PATH ?? '', HOME: probeHome, ASSISTANT_REPO: scratchRepo, ...extraEnv }
    if (assistantDshHome !== undefined) env.ASSISTANT_DSH_HOME = assistantDshHome
    return execFileSync('bash', ['-c', script], { encoding: 'utf8', env })
  }

  it('uses ASSISTANT_DSH_HOME when set, and the repo dev home when unset', () => {
    const isolated = join(temp('env-iso-'), 'home')
    expect(resolvedHome(isolated)).toContain(`RESOLVED=${isolated}`)
    // The unset case is the safety net: whatever DSH_HOME the calling shell had, the default wins.
    const fallback = resolvedHome(undefined, { DSH_HOME: '/tmp/env-should-not-win' })
    expect(fallback).toContain('RESOLVED=')
    expect(fallback).not.toContain('RESOLVED=/tmp/env-should-not-win')
    expect(fallback).toMatch(/RESOLVED=\S*\/dev\/harness-home\n/)
  })
})

describe('startPathProblems', () => {
  // Entry-file fixtures are inline text: the check reads AGENTS.md's bytes, so a throwaway file
  // would add nothing but a second place for the shape to drift.
  const agents = source => ({ agentsPath: 'AGENTS.md', source })
  const prepare = 'bash dev/env/prepare.sh     # 首次必须先跑：补齐 vendor 产物'
  const setup = 'bash dev/env/setup.sh       # 首次起服务的前置：它才建两个 profile（幂等）'
  const good = [
    '## 命令表',
    '',
    '要起服务，照这一串顺序走：',
    '',
    '```sh',
    'pnpm install',
    prepare,
    setup,
    'pnpm dsh --profile dev --port 0 --no-open',
    'pnpm dsh --profile dev-task "one task"',
    '```',
    '',
  ].join('\n')

  it('accepts both marked first steps ordered before the launches, with both profiles routed', () => {
    expect(startPathProblems(agents(good))).toEqual([])
  })

  it('rejects each wrong order that boots the "profile does not exist" failure', () => {
    // Fixtures are written out in full rather than patched with string surgery: a fixture built by
    // replacements can silently stop testing what it claims to (the first draft of this one did).
    const beforeSetup = [
      '```sh',
      'pnpm install',
      prepare,
      'pnpm dsh --profile dev --port 0 --no-open',
      setup,
      'pnpm dsh --profile dev-task "one task"',
      '```',
      '',
    ].join('\n')
    expect(startPathProblems(agents(beforeSetup))[0]).toContain('launches a profile before dev/env/setup.sh')
    const beforePrepare = [
      '```sh',
      'pnpm install',
      'pnpm dsh --profile dev --port 0 --no-open',
      prepare,
      setup,
      'pnpm dsh --profile dev-task "one task"',
      '```',
      '',
    ].join('\n')
    expect(startPathProblems(agents(beforePrepare))[0]).toContain('launches a profile before dev/env/prepare.sh')
  })

  it('rejects an unmarked preparatory step — an unmarked step is a step agents skip', () => {
    expect(startPathProblems(agents(good.replace(prepare, 'bash dev/env/prepare.sh')))[0])
      .toContain('dev/env/prepare.sh without saying it is the first step')
    expect(startPathProblems(agents(good.replace(setup, 'bash dev/env/setup.sh')))[0])
      .toContain('dev/env/setup.sh without saying it is the first step')
  })

  it('rejects a missing preparatory step, a lost profile route, and an unreadable entry file', () => {
    expect(startPathProblems(agents(good.replace(`${prepare}\n`, '')))[0]).toContain('dev/env/prepare.sh nowhere')
    expect(startPathProblems(agents(good.replace(`${setup}\n`, '')))[0]).toContain('dev/env/setup.sh nowhere')
    expect(startPathProblems(agents(good.replace('pnpm dsh --profile dev-task "one task"\n', '')))[0])
      .toContain('never launches profile `dev-task`')
    // A missing/empty file must read as "could not check", never as a silent pass.
    expect(startPathProblems(agents(''))[0]).toContain('cannot be checked')
  })
})

describe('dshHomeInheritanceProblems', () => {
  it('rejects dev tooling that reads the inherited DSH_HOME and accepts ASSISTANT_DSH_HOME', () => {
    const dir = temp('dev-home-')
    const bad = join(dir, 'bad.mjs')
    writeFileSync(bad, "const home = process.env.DSH_HOME ?? 'x'\n", 'utf8')
    const good = join(dir, 'good.mjs')
    writeFileSync(good, "const home = process.env.ASSISTANT_DSH_HOME ?? 'dev/harness-home'\n", 'utf8')

    expect(dshHomeInheritanceProblems([good])).toEqual([])
    expect(dshHomeInheritanceProblems([bad])[0]).toContain('must use ASSISTANT_DSH_HOME')
  })

  it('exempts the launcher by exact path — it overrides DSH_HOME, a sibling does not', () => {
    const dir = temp('dev-home-launcher-')
    const launcher = join(dir, 'dev', 'env', 'dsh.mjs')
    mkdirSync(dirname(launcher), { recursive: true })
    writeFileSync(launcher, "const inherited = process.env.DSH_HOME // read only to override + warn\n", 'utf8')
    const sibling = join(dir, 'dev', 'env', 'other.mjs')
    writeFileSync(sibling, "const home = process.env.DSH_HOME ?? 'x'\n", 'utf8')

    expect(dshHomeInheritanceProblems([launcher])).toEqual([])
    expect(dshHomeInheritanceProblems([sibling])[0]).toContain('must use ASSISTANT_DSH_HOME')
  })
})

describe('exportManualProblems', () => {
  const manifest = { name: 'dsh-smart-assistant', version: '1.2.3' }
  // Rows mirror the exact shape export-dist.mjs generates (安装包 carries a suffix after the
  // filename) — the first red run of this gate was a fixture/reality mismatch on that suffix.
  const manual = (version, tarball) => [
    '# 手册',
    '',
    '| | |',
    '|---|---|',
    `| 版本 | ${version === undefined ? '（缺行）' : `\`${version}\``} |`,
    `| 安装包 | \`${tarball}\`（与本手册同目录） |`,
    '',
  ].join('\n')

  it('accepts a missing manual (nothing exported yet) and a manual that matches the manifest', () => {
    expect(exportManualProblems({ manualPath: join(temp('dist-'), 'absent.md'), manifest })).toEqual([])
    const dir = temp('dist-')
    const file = join(dir, '安装手册.md')
    writeFileSync(file, manual('1.2.3', 'dsh-smart-assistant-1.2.3.tgz'), 'utf8')
    expect(exportManualProblems({ manualPath: file, manifest })).toEqual([])
  })

  it('rejects a manual whose version no longer matches the package (bump without re-export)', () => {
    const dir = temp('dist-')
    const file = join(dir, '安装手册.md')
    writeFileSync(file, manual('1.2.2', 'dsh-smart-assistant-1.2.3.tgz'), 'utf8')
    const problems = exportManualProblems({ manualPath: file, manifest })
    expect(problems).toHaveLength(1)
    expect(problems[0]).toContain('says 1.2.2')
    expect(problems[0]).toContain('pnpm export-dist')
  })

  it('rejects a manual whose tarball name or missing header rows drift from the manifest', () => {
    const dir = temp('dist-')
    const file = join(dir, '安装手册.md')
    writeFileSync(file, manual('1.2.3', 'dsh-smart-assistant-9.9.9.tgz'), 'utf8')
    expect(exportManualProblems({ manualPath: file, manifest })[0]).toContain('expected dsh-smart-assistant-1.2.3.tgz')

    const bare = join(dir, 'bare.md')
    writeFileSync(bare, '没有表头的手册\n', 'utf8')
    const problems = exportManualProblems({ manualPath: bare, manifest })
    expect(problems).toHaveLength(2)
    expect(problems[0]).toContain('says nothing')
  })
})

// ── vendor client-face freshness ────────────────────────────────────────────────────────────────

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

// The client classic-script gate moved semantics with S2 (261007 bigfile-split): the source is
// multi-module (relative imports inlined by tsdown), so the gate is "no bare external runtime
// imports / entry names the facade / the bundle parses as a classic script". Every accepted and
// rejected shape is pinned here on a throwaway src/client tree.
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
