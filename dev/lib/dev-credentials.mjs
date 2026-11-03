/**
 * The dev harness's model credential, resolved once for every lane that runs a live turn.
 *
 * The headless `dev-task` composition has no credentials service, so a one-shot reads
 * `DEEPSEEK_API_KEY` from the environment. The dev web profile stores that key in
 * `dev/harness-home/.credentials.yaml` (the `refs:` section) — the eval runner and release
 * smoke both need it, and each used to carry its own copy of this rule. Never print the value;
 * callers report BLOCKED when neither source has it.
 *
 * Precedence: an exported env var wins, then the dev home's refs entry.
 *
 * @module dev/dev-credentials
 */
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')

/** The dev home's credential file (the only non-env source; the daily home is never read). */
export const DEV_CREDENTIALS_PATH = join(repoRoot, 'dev', 'harness-home', '.credentials.yaml')

/**
 * Read the key out of a credentials file body.
 * @param {string} text - YAML text (only the refs line is needed; the file may hold records too).
 * @returns {string | undefined} The key, or undefined when the refs line is absent.
 */
export function deepseekKeyFrom(text) {
  const lines = text.split('\n')
  const start = lines.findIndex(line => /^refs:\s*$/.test(line))
  if (start === -1) return undefined
  for (const line of lines.slice(start + 1)) {
    if (/^\S/.test(line)) break // the next top-level key ends the refs block
    const match = /^\s+DEEPSEEK_API_KEY:\s*(\S+)\s*$/.exec(line)
    if (match !== null) return match[1].replace(/^["']|["']$/g, '')
  }
  return undefined
}

/**
 * The env patch a child process needs, or `{}` when the caller already exported the key.
 * @param {{ env?: NodeJS.ProcessEnv, path?: string, exists?: (path: string) => boolean, read?: (path: string) => string }} [options]
 * @returns {{ DEEPSEEK_API_KEY?: string }} Empty when the env already has it or no source does.
 */
export function credentialEnv({ env = process.env, path = DEV_CREDENTIALS_PATH, exists = existsSync, read = readFileSync } = {}) {
  if (typeof env.DEEPSEEK_API_KEY === 'string' && env.DEEPSEEK_API_KEY !== '') return {}
  if (!exists(path)) return {}
  const key = deepseekKeyFrom(read(path, 'utf8'))
  return key === undefined ? {} : { DEEPSEEK_API_KEY: key }
}

/**
 * The resolved key (env first, then the dev home), or undefined. Callers must not log it.
 * @param {{ env?: NodeJS.ProcessEnv, path?: string, exists?: (path: string) => boolean, read?: (path: string) => string }} [options]
 * @returns {string | undefined} The key.
 */
export function deepseekKey(options = {}) {
  const env = options.env ?? process.env
  const fromEnv = typeof env.DEEPSEEK_API_KEY === 'string' ? env.DEEPSEEK_API_KEY.trim() : ''
  if (fromEnv !== '') return fromEnv
  return Object.values(credentialEnv(options))[0]
}
