/**
 * Fixtures for the dev-channel parity core (scripts/checks/gates/dev-parity.mjs).
 *
 * The core reads text, not the repo: every accept/reject shape below is a throwaway string.
 * The red cases are the regressions the gate exists for — a deleted table, a table that lost a
 * load-bearing row, the profile user layer being written again, a missing overlay injection, and
 * the tarball lane dropping out of the dev-loop contract.
 */
import { describe, expect, it } from 'vitest'
import { devParityProblems } from '../../../../scripts/checks/gates/dev-parity.mjs'

const row = name => `| ${name} | user path | dev path | bounded | \`scripts/release/install-parity.mjs\` |`
const section = (rows = 8) => [
  '## 十、与产品安装路径的 parity',
  '',
  '判据：表外新增差异 = `pnpm verify` 的 `dev-parity` 门禁红。',
  '',
  '| 机制点 | 用户安装路径 | dev 快环 | 判定 | 证据 owner |',
  '|---|---|---|---|---|',
  ...Array.from({ length: rows }, (_, index) => row(`机制 ${index + 1}`)),
  '',
  'dev-only 行住 `$DSH_HOME/dev-overlay-<profile>.yml`；通道 = `pnpm install-parity`。',
  '',
  '## 十一、下一节',
].join('\n')

const valid = {
  devDoc: `# 启动与调试\n\n${section()}\n`,
  setupScript: 'overlay_for() { printf \'%s/dev-overlay-%s.yml\' "$DSH_HOME" "$1"; }\n',
  launcher: "const overlayArgs = existsSync(overlayPath) ? ['--patch', overlayPath] : []\nconst overlayPath = join(home, 'dev-overlay-x.yml')\n",
  commandsDoc: 'pnpm install-parity     # lane\n',
  testingDoc: '| 安装面 | `pnpm install-parity` | lane |\n',
  laneExists: true,
  scripts: { 'install-parity': 'node scripts/release/install-parity.mjs' },
}

describe('devParityProblems', () => {
  it('accepts a section with the load-bearing rows and a wired lane', () => {
    expect(devParityProblems(valid)).toEqual([])
  })

  it('flags a missing section', () => {
    const problems = devParityProblems({ ...valid, devDoc: '# dev\n\n## 一、隔离模型\n' })
    expect(problems).toHaveLength(1)
    expect(problems[0]).toContain('parity')
  })

  it('flags a table that lost mechanism rows', () => {
    const problems = devParityProblems({ ...valid, devDoc: `${section(3)}\n` })
    expect(problems.join('\n')).toContain('mechanism row')
  })

  it('flags a section that no longer names the overlay', () => {
    const devDoc = valid.devDoc.replace('dev-overlay-<profile>.yml', 'the profile layer')
    const problems = devParityProblems({ ...valid, devDoc })
    expect(problems.join('\n')).toContain('dev-overlay-')
  })

  it('flags setup.sh writing the profile user layer again', () => {
    const setupScript = 'cp "$repo_root/dev/profiles/profile-patch-ov.yml" "$dir/cordis.patch.yml"\n'
    const problems = devParityProblems({ ...valid, setupScript })
    expect(problems.join('\n')).toContain('cordis.patch.yml')
  })

  it('flags a launcher that stopped injecting --patch', () => {
    const launcher = "const forwarded = process.argv.slice(2)\n"
    const problems = devParityProblems({ ...valid, launcher })
    expect(problems.join('\n')).toContain('--patch')
  })

  it('flags the tarball lane dropping out of the contract', () => {
    expect(devParityProblems({ ...valid, laneExists: false }).join('\n')).toContain('install-parity')
    expect(devParityProblems({ ...valid, commandsDoc: '' }).join('\n')).toContain('docs/commands.md')
    expect(devParityProblems({ ...valid, testingDoc: '' }).join('\n')).toContain('docs/testing.md')
    expect(devParityProblems({ ...valid, scripts: {} }).join('\n')).toContain('install-parity')
  })
})
