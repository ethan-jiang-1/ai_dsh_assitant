#!/usr/bin/env node
/**
 * 仓库卫生读数：`.tmp` 可回收项、worktree、branch、未提交数。**只报告，不删除任何东西。**
 *
 * 为什么存在：ub-mode 的 "Worktree Cleanup" 与本仓的实际缺口——`.tmp` 有 `pnpm sweep`，但
 * worktree / 分支只靠人偶尔想起来；2026-11-04 实测 `.tmp` 301M、一个 prunable worktree、三条
 * 落后 392–743 个提交的未合并分支。这个读数把四件事收进一条命令；删除仍由人执行
 * （`pnpm sweep --apply` / `git worktree prune` / `git branch -d`），脚本不代劳。
 *
 * 用法：
 *   pnpm hygiene               # 四段读数（默认扫仓根 .tmp）
 *   pnpm hygiene --json        # 结构化输出
 *   pnpm hygiene --self-check  # 仪表自证（合成 git 输出 → 已知计数；已接进 pnpm verify）
 *
 * @module dev/repo-hygiene
 */
import { execFileSync } from 'node:child_process'
import { join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { runSweep } from '../../scripts/maintenance/sweep.mjs'

const repoRoot = resolve(fileURLToPath(new URL('../..', import.meta.url)))

function bytesText(bytes) {
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB', 'TB']
  let value = bytes
  let unit = -1
  do {
    value /= 1024
    unit += 1
  } while (value >= 1024 && unit < units.length - 1)
  return `${value.toFixed(1)} ${units[unit]}`
}

/**
 * Parse `git worktree list --porcelain` records.
 * @param text - Porcelain output.
 * @returns `{ path, head, branch, detached, prunable }` entries.
 */
export function parseWorktrees(text) {
  const records = text.trim().length === 0 ? [] : text.trim().split(/\n\n+/)
  return records.map(record => {
    const entry = { path: '', head: '', branch: '', detached: false, prunable: '' }
    for (const line of record.split('\n')) {
      if (line.startsWith('worktree ')) entry.path = line.slice('worktree '.length)
      else if (line.startsWith('HEAD ')) entry.head = line.slice('HEAD '.length)
      else if (line.startsWith('branch ')) entry.branch = line.slice('branch '.length).replace(/^refs\/heads\//, '')
      else if (line === 'detached') entry.detached = true
      else if (line.startsWith('prunable ')) entry.prunable = line.slice('prunable '.length)
    }
    return entry
  })
}

/**
 * Parse `git for-each-ref --format=%(refname:short)\t%(committerdate:iso8601)\t%(upstream:track)`
 * plus the merged set and per-branch ahead/behind counts.
 * @param text - for-each-ref output.
 * @param options - `merged` names and `aheadBehind` map (`{ behind, ahead }`).
 * @returns Branch entries, newest first.
 */
export function parseBranches(text, { merged = [], aheadBehind = {} } = {}) {
  const mergedSet = new Set(merged)
  return text
    .trim()
    .split('\n')
    .filter(line => line.length > 0)
    .map(line => {
      const [name = '', date = '', upstream = ''] = line.split('\t')
      const counts = aheadBehind[name] ?? { behind: 0, ahead: 0 }
      return { name, date, upstream, behind: counts.behind, ahead: counts.ahead, merged: mergedSet.has(name) }
    })
    .sort((left, right) => right.date.localeCompare(left.date))
}

function tableRow(cells) {
  return `| ${cells.join(' | ')} |`
}

/**
 * Render the four sections. Read-only by construction: it prints the follow-up commands, never runs them.
 * @param data - collected hygiene data.
 * @param options - `top` caps the `.tmp` list.
 */
export function renderReport(data, { top = 8 } = {}) {
  const limit = Number.isInteger(top) && top > 0 ? top : 8
  const lines = ['repo-hygiene — read-only (nothing is deleted)', '']

  const tmp = data.tmp
  lines.push('## .tmp', '')
  lines.push(`${tmp.entries} entries: ${tmp.deletable} deletable / ${tmp.kept} kept; reclaimable ${bytesText(tmp.deletableBytes)}`)
  if (tmp.lsof === 'unavailable') lines.push(`warning: lsof unavailable — open-handle protection was not evaluated${tmp.warning === undefined ? '' : ` (${tmp.warning})`}`)
  if (tmp.top.length > 0) {
    lines.push('', tableRow(['entry', 'size', 'reason']), tableRow(['---', '---:', '---']))
    for (const entry of tmp.top) lines.push(tableRow([`\`${entry.name}\``, bytesText(entry.bytes), entry.reason]))
  }
  lines.push('', `act: \`pnpm sweep --apply\` (safe: keeps open handles, recent mtime and \`--keep\`); inspect first with \`pnpm sweep\`.`)

  lines.push('', '## worktrees', '')
  if (data.worktrees.length === 0) lines.push('none')
  else {
    lines.push(tableRow(['path', 'branch', 'state']), tableRow(['---', '---', '---']))
    for (const worktree of data.worktrees) {
      const state = worktree.prunable !== '' ? `prunable (${worktree.prunable})` : worktree.detached ? 'detached' : 'ok'
      lines.push(tableRow([`\`${worktree.path}\``, worktree.branch === '' ? '—' : `\`${worktree.branch}\``, state]))
    }
    lines.push('', 'act: `git worktree prune` removes stale metadata only; the directory is left in place.')
  }

  lines.push('', '## branches', '')
  if (data.branches.length === 0) lines.push('none')
  else {
    lines.push(tableRow(['branch', 'last commit', 'behind', 'ahead', 'merged']), tableRow(['---', '---', '---:', '---:', '---']))
    for (const branch of data.branches) {
      lines.push(tableRow([`\`${branch.name}\``, branch.date.slice(0, 10), branch.behind, branch.ahead, branch.merged ? 'yes' : 'no']))
    }
    lines.push('', 'unmerged branches are reported, never deleted: confirm the experiment is not still in use before `git branch -d`.')
  }

  lines.push('', '## uncommitted', '')
  lines.push(data.uncommitted.length === 0 ? 'clean' : `${data.uncommitted.length} path(s); run \`git status --short\` before any cleanup`)
  if (data.uncommitted.length > 0) {
    for (const path of data.uncommitted.slice(0, 5)) lines.push(`- \`${path}\``)
    if (data.uncommitted.length > 5) lines.push(`- … ${data.uncommitted.length - 5} more`)
  }

  lines.push('', '读数不是清理命令；删除仍需人执行，未提交工作在决定前不动。')
  return lines.join('\n')
}

/** Synthetic fixture with known counts. `--self-check` fails loudly if the instrument drifts. */
export function selfCheck(log = console.log) {
  const worktrees = parseWorktrees([
    'worktree /repo',
    'HEAD aaaaaaa',
    'branch refs/heads/master',
    '',
    'worktree /repo-wt',
    'HEAD bbbbbbb',
    'detached',
    'prunable gitdir file points to non-existent location',
  ].join('\n'))
  const branches = parseBranches(
    ['master\t2026-10-01T00:00:00+08:00\t', 'feature\t2026-10-02T00:00:00+08:00\t[origin/feature: ahead 1]'].join('\n'),
    { merged: ['master'], aheadBehind: { feature: { behind: 3, ahead: 2 } } },
  )
  const report = renderReport({
    tmp: { entries: 2, deletable: 1, kept: 1, deletableBytes: 1024, lsof: 'collected', top: [{ name: 'old', bytes: 1024, reason: 'expired' }] },
    worktrees,
    branches,
    uncommitted: [],
  })

  const problems = []
  if (worktrees.length !== 2) problems.push(`expected 2 worktrees, got ${worktrees.length}`)
  if (worktrees[1]?.prunable === '' || !worktrees[1]?.detached) problems.push('expected the second worktree to be detached and prunable')
  if (branches.length !== 2) problems.push(`expected 2 branches, got ${branches.length}`)
  if (branches[0]?.name !== 'feature' || branches[0]?.behind !== 3 || branches[0]?.ahead !== 2) problems.push('branch order or ahead/behind drifted')
  if (!report.includes('repo-hygiene — read-only')) problems.push('renderer lost its read-only header')
  if (!report.includes('unmerged branches are reported')) problems.push('renderer lost the unmerged-branch warning')

  for (const problem of problems) log(`repo-hygiene --self-check: ${problem}`)
  if (problems.length > 0) return 1
  log('repo-hygiene --self-check: ok — synthetic git output gives the known worktree/branch counts')
  return 0
}

function git(args) {
  return execFileSync('git', args, { cwd: repoRoot, encoding: 'utf8' })
}

/** Collect the four sections. Git is read-only; `.tmp` uses the sweep planner (also read-only). */
export function collectHygiene({ tmpRoot = join(repoRoot, '.tmp'), top = 8 } = {}) {
  const sweep = runSweep({ root: tmpRoot, apply: false })
  const plan = sweep.plan ?? { entries: [] }
  const deletable = plan.entries.filter(entry => entry.action === 'delete')
  const kept = plan.entries.filter(entry => entry.action !== 'delete')
  const tmp = {
    root: relative(repoRoot, tmpRoot),
    entries: plan.entries.length,
    deletable: deletable.length,
    kept: kept.length,
    deletableBytes: deletable.reduce((sum, entry) => sum + entry.bytes, 0),
    lsof: sweep.lsof,
    warning: sweep.warning,
    top: [...deletable].sort((left, right) => right.bytes - left.bytes).slice(0, top).map(entry => ({ name: entry.name, bytes: entry.bytes, reason: entry.reason })),
  }

  const worktrees = parseWorktrees(git(['worktree', 'list', '--porcelain']))
  const refText = git(['for-each-ref', '--format=%(refname:short)\t%(committerdate:iso8601)\t%(upstream:track)', 'refs/heads'])
  const names = refText.trim().split('\n').filter(line => line.length > 0).map(line => line.split('\t')[0]).filter(name => name !== 'master')
  const aheadBehind = {}
  for (const name of names) {
    const output = git(['rev-list', '--left-right', '--count', `master...${name}`]).trim().split(/\s+/)
    aheadBehind[name] = { behind: Number(output[0] ?? 0), ahead: Number(output[1] ?? 0) }
  }
  const merged = git(['branch', '--merged', 'master']).split('\n').map(line => line.replace(/^[*+]\s*/, '').trim()).filter(Boolean)
  const branches = parseBranches(refText, { merged, aheadBehind })
  const uncommitted = git(['status', '--porcelain']).split('\n').filter(line => line.length > 0).map(line => line.slice(3))

  return { tmp, worktrees, branches, uncommitted }
}

function main() {
  const args = process.argv.slice(2)
  if (args.includes('--self-check')) process.exit(selfCheck())
  const topIndex = args.indexOf('--top')
  const top = topIndex >= 0 ? Number(args[topIndex + 1]) : 8
  if (!Number.isInteger(top) || top < 1) {
    console.error('repo-hygiene: --top must be a positive integer')
    process.exit(2)
  }
  const data = collectHygiene({ top })
  if (args.includes('--json')) console.log(JSON.stringify(data, null, 2))
  else console.log(renderReport(data, { top }))
}

if (process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main()
