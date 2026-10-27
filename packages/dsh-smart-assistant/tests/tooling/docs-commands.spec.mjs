/**
 * Fixtures for the docs-command and dev-tooling routing cores
 * (scripts/checks/gates/docs-commands.mjs): command aliases, the startup path, and the
 * DSH_HOME inheritance boundary.
 *
 * Plain .mjs on purpose: vitest runs it, `tsc -p tsconfig.test.json` does not type-check it
 * (same contract as the other tooling specs).
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, expect, it, afterEach } from 'vitest'
import {
  commandAliasProblems,
  dshHomeInheritanceProblems,
  rootCommandBudgetProblems,
  startPathProblems,
} from '../../../../scripts/checks/gates/docs-commands.mjs'
import { temp, disposeTempDirs } from './verify-gates-harness.mjs'

afterEach(disposeTempDirs)

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

describe('rootCommandBudgetProblems', () => {
  const entry = (source, max = 3) => rootCommandBudgetProblems({ agentsPath: 'AGENTS.md', source, max })

  it('accepts an entry that keeps only startup and daily commands', () => {
    expect(entry('```sh\npnpm install\npnpm build\npnpm test\n```\n')).toEqual([])
  })

  it('rejects the reference table creeping back into the entry file', () => {
    const problems = entry('pnpm a\npnpm b\npnpm c\npnpm d\n')
    expect(problems.join(' ')).toContain('4 pnpm command lines')
    expect(problems.join(' ')).toContain('docs/commands.md')
  })

  it('counts indented lines and reports a missing source instead of passing silently', () => {
    expect(entry('  pnpm a\n  pnpm b\n  pnpm c\n  pnpm d\n').join(' ')).toContain('4 pnpm command lines')
    expect(entry('').join(' ')).toContain('cannot be checked')
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
