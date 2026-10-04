/**
 * Fixtures for the mechanical-gate cores in scripts/verify-checks.mjs (slice E of the
 * development-foundation remediation, 2026-09-24). Every accepted and rejected shape of the
 * pin, notes-naming, proposal-status, and relative-link checks is pinned here against
 * throwaway directories and throwaway git repositories — the real vendor tree, ROADMAP, and
 * notes are never touched, and no pin is ever upgraded.
 *
 * This file is deliberately plain .mjs: vitest runs it, while `tsc -p tsconfig.test.json`
 * (type-checking the TS specs) does not include non-TS files, so importing the untyped script
 * module costs the type gate nothing.
 */
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  agentsMdStabilityProblems,
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
  implementedAlternativesProblems,
  relativeLinkProblems,
  skillFrontmatterProblems,
  startPathProblems,
  testAssetNamingProblems,
  textHygieneProblems,
  vendorClientFreshnessProblems,
} from '../../../scripts/verify-checks.mjs'

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
  const scripts = { verify: 'node scripts/verify.mjs', 'eval:domain': 'node dev/eval/domain-run.mjs' }
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
  it('accepts the documented lifecycle set and rejects an undocumented bucket', () => {
    const notes = temp('notes-top-')
    for (const sub of ['proposed', 'implemented', 'rejected', 'archived', 'archived/research']) mkdirSync(join(notes, sub), { recursive: true })
    writeFileSync(join(notes, 'README.md'), '# map\n', 'utf8')
    writeFileSync(join(notes, 'intents.md'), '# intents\n', 'utf8')

    expect(notesTopLevelProblems(notes)).toEqual([])

    mkdirSync(join(notes, 'postmortem'), { recursive: true })
    writeFileSync(join(notes, 'scratch.md'), 'x', 'utf8')
    const problems = notesTopLevelProblems(notes)
    expect(problems.some(p => p.includes('notes/postmortem/'))).toBe(true)
    expect(problems.some(p => p.includes('notes/scratch.md'))).toBe(true)
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

describe('composeRunnerTask', () => {
  it('prepends the standing collaboration boundary to every scripted task', async () => {
    const { composeRunnerTask, COLLABORATION_BOUNDARY } = await import('../../../packages/dsh-smart-assistant/src/preset-runner/index.ts')
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
  const envSh = join(import.meta.dirname, '..', '..', '..', 'dev', 'env.sh')
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
  const prepare = "bash dev/prepare.sh     # 首次必须先跑：补齐 vendor 产物"
  const setup = 'bash dev/setup.sh       # 首次起服务的前置：它才建两个 profile（幂等）'
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
    expect(startPathProblems(agents(beforeSetup))[0]).toContain('launches a profile before dev/setup.sh')
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
    expect(startPathProblems(agents(beforePrepare))[0]).toContain('launches a profile before dev/prepare.sh')
  })

  it('rejects an unmarked preparatory step — an unmarked step is a step agents skip', () => {
    expect(startPathProblems(agents(good.replace(prepare, 'bash dev/prepare.sh')))[0])
      .toContain('dev/prepare.sh without saying it is the first step')
    expect(startPathProblems(agents(good.replace(setup, 'bash dev/setup.sh')))[0])
      .toContain('dev/setup.sh without saying it is the first step')
  })

  it('rejects a missing preparatory step, a lost profile route, and an unreadable entry file', () => {
    expect(startPathProblems(agents(good.replace(`${prepare}\n`, '')))[0]).toContain('dev/prepare.sh nowhere')
    expect(startPathProblems(agents(good.replace(`${setup}\n`, '')))[0]).toContain('dev/setup.sh nowhere')
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
    for (const name of tests) writeFileSync(join(root, 'packages', 'dsh-smart-assistant', 'tests', name), '')
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
