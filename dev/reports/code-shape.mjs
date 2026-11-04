#!/usr/bin/env node
/**
 * 代码形状读数：函数长度与决策点数。**只报告，不设阈值，不因 findings 非零退出。**
 *
 * 为什么存在：七维审计手工量过三次——261103 两轮找 god-module（`assistant-data-bundle` 555 行、
 * `health.ts` 464 行、`tool-operating` 459 行），2026-11-04 的 ub-mode 对照又量了一次。按根
 * AGENTS.md「同一多步流程第三次就立」的常设规则，固化成仓内读数；它回答「哪里在长、哪里决策密集」，
 * 不回答「多少算坏」——阈值与门禁等第一处真实回归的证据（与 coverage 同一姿态）。
 *
 * 为什么不再报重复：重复扫描在 12 行窗口是 0，8 行窗口只剩 schema 字段块与少量字段构造；
 * 没有可行动的重复，保留它只是给读数加一个不会改变决定的分区。重复仍可用一次性脚本查，
 * 不进常驻工具。
 *
 * 两条诚实纪律：
 *   ① 只报测得到的东西：函数跨度按 AST 行号算，决策点按 if/循环/case/&&/||/??/三元算。
 *   ② 不评级、不设 PASS/FAIL：findings 只进 stdout；退出码只表达工具自身是否跑通。
 *
 * 用法：
 *   pnpm code-shape                    # 默认包内 src，top 20
 *   pnpm code-shape --top 30
 *   pnpm code-shape --json             # 结构化输出，便于脚本消费
 *   pnpm code-shape --self-check       # 仪表自证（合成源码 → 已知计数；已接进 pnpm verify）
 *
 * @module dev/code-shape
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const repoRoot = resolve(fileURLToPath(new URL('../..', import.meta.url)))

const DECISIONS = new Set([
  ts.SyntaxKind.IfStatement,
  ts.SyntaxKind.ConditionalExpression,
  ts.SyntaxKind.ForStatement,
  ts.SyntaxKind.ForInStatement,
  ts.SyntaxKind.ForOfStatement,
  ts.SyntaxKind.WhileStatement,
  ts.SyntaxKind.DoStatement,
  ts.SyntaxKind.CaseClause,
  ts.SyntaxKind.CatchClause,
  ts.SyntaxKind.AmpersandAmpersandToken,
  ts.SyntaxKind.BarBarToken,
  ts.SyntaxKind.QuestionQuestionToken,
])

const isFunctionLike = node => ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node)
  || ts.isArrowFunction(node) || ts.isFunctionExpression(node)
  || ts.isGetAccessor(node) || ts.isSetAccessor(node) || ts.isConstructorDeclaration(node)

function decisionCount(fn) {
  let count = 1
  const visit = node => {
    if (node !== fn && isFunctionLike(node)) return
    if (DECISIONS.has(node.kind)) count += 1
    ts.forEachChild(node, visit)
  }
  ts.forEachChild(fn, visit)
  return count
}

function nameOf(fn) {
  if (fn.name && ts.isIdentifier(fn.name)) return fn.name.text
  if (fn.name) return fn.name.getText().slice(0, 48)
  const parent = fn.parent
  if (parent && ts.isVariableDeclaration(parent) && ts.isIdentifier(parent.name)) return parent.name.text
  if (parent && ts.isPropertyAssignment(parent)) return parent.name.getText()
  return '<anonymous>'
}

function scriptKind(fileName) {
  if (fileName.endsWith('.tsx')) return ts.ScriptKind.TSX
  if (fileName.endsWith('.jsx')) return ts.ScriptKind.JSX
  return ts.ScriptKind.TS
}

/**
 * Analyze in-memory sources. Pure: no filesystem, no clock, no output.
 * @param sources - `{ fileName, text }` entries.
 * @returns `{ files, functions }`.
 */
export function analyzeSources(sources) {
  const functions = []
  for (const source of sources) {
    const fileName = source.fileName
    const sf = ts.createSourceFile(fileName, source.text, ts.ScriptTarget.ES2024, true, scriptKind(fileName))
    const visit = node => {
      if (isFunctionLike(node)) {
        const start = sf.getLineAndCharacterOfPosition(node.getStart(sf))
        const end = sf.getLineAndCharacterOfPosition(node.getEnd())
        functions.push({
          file: fileName,
          line: start.line + 1,
          name: nameOf(node),
          lines: end.line - start.line + 1,
          decisions: decisionCount(node),
        })
      }
      ts.forEachChild(node, visit)
    }
    visit(sf)
  }
  return { files: sources.length, functions }
}

/** Group a repo-relative path by the directory under `src/`, or its first segment. */
function groupOf(file) {
  const parts = file.split('/')
  const srcIndex = parts.indexOf('src')
  return srcIndex >= 0 ? (parts[srcIndex + 1] ?? '.') : (parts[0] ?? '.')
}

function tableRow(cells) {
  return `| ${cells.join(' | ')} |`
}

/**
 * Render the reading as Markdown. No grade, no threshold, no exit-code implication.
 * @param result - output of {@link analyzeSources}.
 * @param options - `top` caps each ranking.
 */
export function renderReport(result, { top = 20 } = {}) {
  const limit = Number.isInteger(top) && top > 0 ? top : 20
  const long = result.functions.filter(row => row.lines > 60)
  const complex = result.functions.filter(row => row.decisions > 10)
  const groups = new Map()
  for (const row of result.functions) {
    const entry = groups.get(groupOf(row.file)) ?? { functions: 0, long: 0, complex: 0 }
    entry.functions += 1
    if (row.lines > 60) entry.long += 1
    if (row.decisions > 10) entry.complex += 1
    groups.set(groupOf(row.file), entry)
  }

  const lines = [
    `code-shape — ${result.files} files, ${result.functions.length} function-like nodes`,
    `counts: >60 lines ${long.length}; >10 decisions ${complex.length}`,
    '',
    '## per top-level directory',
    '',
    tableRow(['dir', 'functions', '>60 lines', '>10 decisions']),
    tableRow(['---', '---:', '---:', '---:']),
  ]
  for (const [group, entry] of [...groups.entries()].sort((left, right) => right[1].complex - left[1].complex)) {
    lines.push(tableRow([group, entry.functions, entry.long, entry.complex]))
  }
  lines.push(tableRow(['**total**', `**${result.functions.length}**`, `**${long.length}**`, `**${complex.length}**`]))

  lines.push('', `## top ${limit} by decision count`, '', tableRow(['decisions', 'lines', 'site', 'function']), tableRow(['---:', '---:', '---', '---']))
  for (const row of [...result.functions].sort((left, right) => right.decisions - left.decisions || right.lines - left.lines).slice(0, limit)) {
    lines.push(tableRow([row.decisions, row.lines, `\`${row.file}:${row.line}\``, `\`${row.name}\``]))
  }

  lines.push('', `## top ${limit} by length`, '', tableRow(['lines', 'decisions', 'site', 'function']), tableRow(['---:', '---:', '---', '---']))
  for (const row of [...result.functions].sort((left, right) => right.lines - left.lines || right.decisions - left.decisions).slice(0, limit)) {
    lines.push(tableRow([row.lines, row.decisions, `\`${row.file}:${row.line}\``, `\`${row.name}\``]))
  }

  lines.push('', '读数不是门禁；阈值与门禁等第一处真实回归的证据。')
  return lines.join('\n')
}

/** Synthetic sources with known counts. `--self-check` fails loudly if the instrument drifts. */
export function selfCheck(log = console.log) {
  const simple = [
    'export function simple(x: number) {',
    '  if (x > 0) return 1',
    '  if (x < 0) return -1',
    '  return 0',
    '}',
  ].join('\n')
  const longBody = Array.from({ length: 70 }, (_, index) => `  const value${index} = ${index}`).join('\n')
  const long = `export function longOne() {\n${longBody}\n  return value0\n}`
  const complexBody = Array.from({ length: 11 }, (_, index) => `  if (input === ${index}) return ${index}`).join('\n')
  const complex = `export function complexOne(input: number) {\n${complexBody}\n  return -1\n}`

  const result = analyzeSources([
    { fileName: 'simple.ts', text: simple },
    { fileName: 'long.ts', text: long },
    { fileName: 'complex.ts', text: complex },
  ])
  const problems = []
  const longest = Math.max(...result.functions.map(row => row.lines))
  const mostDecisions = Math.max(...result.functions.map(row => row.decisions))
  if (longest <= 60) problems.push(`expected a >60-line function, longest was ${longest}`)
  if (mostDecisions <= 10) problems.push(`expected a >10-decision function, max was ${mostDecisions}`)
  if (!renderReport(result, { top: 3 }).includes('function-like nodes')) problems.push('renderer lost its header')

  for (const problem of problems) log(`code-shape --self-check: ${problem}`)
  if (problems.length > 0) return 1
  log('code-shape --self-check: ok — synthetic sources give the known length and decision counts')
  return 0
}

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const stat = statSync(full)
    if (stat.isDirectory()) yield* walk(full)
    else if ((entry.endsWith('.ts') || entry.endsWith('.tsx')) && !entry.endsWith('.d.ts')) yield full
  }
}

function optionValue(args, name) {
  const index = args.indexOf(name)
  return index >= 0 ? args[index + 1] : undefined
}

function main() {
  const args = process.argv.slice(2)
  if (args.includes('--self-check')) process.exit(selfCheck())

  const root = resolve(repoRoot, optionValue(args, '--root') ?? 'packages/dsh-smart-assistant/src')
  const top = Number(optionValue(args, '--top') ?? 20)
  if (!Number.isInteger(top) || top < 1) {
    console.error('code-shape: --top must be a positive integer')
    process.exit(2)
  }

  const sources = []
  for (const file of walk(root)) sources.push({ fileName: relative(repoRoot, file), text: readFileSync(file, 'utf8') })
  const result = analyzeSources(sources)
  if (args.includes('--json')) console.log(JSON.stringify(result, null, 2))
  else console.log(renderReport(result, { top }))
}

if (process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main()
