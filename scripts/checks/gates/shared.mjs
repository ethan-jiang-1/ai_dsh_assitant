/**
 * Shared helpers used by more than one gate family. Deliberately NOT re-exported
 * by the verify-checks barrel: gateWiringProblems would flag every exported function
 * that verify.mjs does not invoke, and helpers are nobody's gate.
 */
import { readFileSync } from 'node:fs'

export const read = path => readFileSync(path, 'utf8')

/**
 * The frontmatter block of a SKILL.md, mirroring the loader's own scan: the first line must be
 * exactly `---` and the block ends at the next line that is exactly `---`.
 *
 * @param {string} text - the skill file's contents.
 * @returns {string | undefined} the block between the delimiters, or undefined when absent.
 */
export function frontmatterBlock(text) {
  const firstLineEnd = text.indexOf('\n')
  if (firstLineEnd < 0 || text.slice(0, firstLineEnd).replace(/\r$/, '') !== '---') return undefined
  let lineStart = firstLineEnd + 1
  while (lineStart <= text.length) {
    const nextNewline = text.indexOf('\n', lineStart)
    const lineEnd = nextNewline < 0 ? text.length : nextNewline
    if (text.slice(lineStart, lineEnd).replace(/\r$/, '') === '---') return text.slice(firstLineEnd + 1, lineStart)
    if (nextNewline < 0) return undefined
    lineStart = nextNewline + 1
  }
  return undefined
}

/** Comment-only lines are not model-visible; the language rule leaves existing comments as-is. */
export const COMMENT_LINE = /^\s*(\/\/|\/\*|\*|#)/
