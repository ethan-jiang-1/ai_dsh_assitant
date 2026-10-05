/**
 * YAML frontmatter substrate shared by every file the home stores.
 *
 * A home file is `---\n<yaml>\n---\n<body>`: frontmatter carries the machine-readable
 * fields, the body carries the prose a person reads. Parsing never throws — an unreadable
 * file becomes a curation finding instead of a crash, because a file that fails to parse is
 * otherwise silently absent from the digest.
 *
 * @module dsh-smart-assistant/home/frontmatter
 */

import { parse as parseYaml, stringify as stringifyYaml } from 'yaml'

/** A parsed frontmatter document: machine-readable fields plus the prose body. */
export interface FrontmatterDocument {
  /** Parsed YAML mapping. */
  readonly data: Readonly<Record<string, unknown>>
  /** Body text after the closing delimiter, trimmed. */
  readonly body: string
}

const DELIMITER = '---'

/**
 * Parse a frontmatter document.
 * @param text - Full file contents.
 * @returns The parsed document, or `undefined` when the delimiters or the YAML mapping are unusable.
 */
export function parseFrontmatterDocument(text: string): FrontmatterDocument | undefined {
  const normalized = text.replace(/^\uFEFF/, '')
  const lines = normalized.split(/\r?\n/)
  if (lines[0] !== DELIMITER) return undefined
  let end = -1
  for (let index = 1; index < lines.length; index += 1) {
    if (lines[index] === DELIMITER) {
      end = index
      break
    }
  }
  if (end === -1) return undefined
  let parsed: unknown
  try {
    parsed = parseYaml(lines.slice(1, end).join('\n'))
  } catch {
    return undefined
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return undefined
  return {
    data: parsed as Record<string, unknown>,
    body: lines.slice(end + 1).join('\n').trim(),
  }
}

/**
 * Render a frontmatter document. Field order follows `data`'s own insertion order, so callers
 * control the reading order of the header.
 * @param data - Machine-readable fields; `undefined` values are omitted.
 * @param body - Prose body.
 * @returns File contents ending with exactly one newline.
 */
export function renderFrontmatterDocument(data: Readonly<Record<string, unknown>>, body: string): string {
  const cleaned: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) cleaned[key] = value
  }
  const yamlText = stringifyYaml(cleaned, { lineWidth: 0 }).trimEnd()
  return `${DELIMITER}\n${yamlText}\n${DELIMITER}\n\n${body.trim()}\n`
}
