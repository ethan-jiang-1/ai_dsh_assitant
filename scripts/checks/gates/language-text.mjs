/**
 * Gate cores for language and text hygiene of model-facing sources.
 */
import { readFileSync } from 'node:fs'
import { read, COMMENT_LINE } from './shared.mjs'

/** CJK ideographs: the model-facing surface is English (AGENTS.md language split). */
const CJK_TEXT = /[\u4e00-\u9fff]/

/**
 * Model-facing text is English; the browser shell and the preset display name are the Chinese
 * skin face by design. This scans the prompt-and-tool sources plus the skill bodies, skips
 * comment-only lines in TypeScript, and expects the caller to have excluded the skin files.
 *
 * @param {readonly string[]} files - absolute paths to scan (src *.ts, skills *.md).
 */
export function languageGuardProblems(files) {
  const problems = []
  for (const file of files) {
    const isTypeScript = file.endsWith('.ts')
    const lines = read(file).split('\n')
    for (const [index, line] of lines.entries()) {
      if (isTypeScript && COMMENT_LINE.test(line)) continue
      // Markdown skill bodies carry an HTML-comment escape hatch: a vocabulary line that must
      // teach the model a Chinese product word (e.g. threads = 「在跟的事」) is meta-information,
      // not prose — the `<!--` prefix marks it as such. CJK in prose still bites.
      if (file.endsWith('.md') && /^\s*<!--/.test(line)) continue
      if (CJK_TEXT.test(line)) {
        problems.push(`${file}:${index + 1} carries CJK outside a comment — model-facing text is English`)
      }
    }
  }
  return problems
}

/**
 * Managed text is strict UTF-8 and ends with exactly one newline, so a mojibake byte or a
 * missing/extra final newline is a red gate instead of a silent diff.
 *
 * @param {readonly string[]} files - absolute paths to scan.
 */
export function textHygieneProblems(files) {
  const problems = []
  for (const file of files) {
    const bytes = readFileSync(file)
    let text
    try {
      text = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
    } catch {
      problems.push(`${file} is not valid UTF-8`)
      continue
    }
    if (!text.endsWith('\n')) problems.push(`${file} has no trailing newline`)
    else if (text.endsWith('\n\n')) problems.push(`${file} ends with more than one newline`)
  }
  return problems
}
