/**
 * Gate core for handoff hygiene: an agent artifact may contain code, prompts, skills and seeds,
 * but never user state, secrets, harness-home data, or machine-local absolute paths.
 *
 * The scanner's caller supplies relative paths and, for text files, their contents. Keeping the
 * rules pure makes every acceptance/rejection shape testable without building a tarball.
 */

/** Directories that belong to a person's runtime, not to a shippable agent artifact. */
const ROOT_DIRECTORIES = [
  'assistant',
  'assistant-operating',
  'data',
  'sessions',
  'deliverables',
  'profiles',
  'storages',
  'logs',
  'dev/harness-home',
  '.tmp',
  '.desk',
  '.pi',
  '_dist',
  'node_modules',
  '.git',
]

/** Root files that are runtime state, credentials or derived indexes. */
const ROOT_FILES = [
  '.anonymous-user-id',
  'settings.yaml',
  'settings.yaml.imported',
  'session-search.db',
]

/** Files forbidden at any depth. */
const ANY_FILES = [
  '.env',
  '.env.local',
  '.credentials.yaml',
  'credentials.yaml',
  'auth.json',
  'id_rsa',
  'id_ed25519',
]

/** Machine-local paths; the manual uses symbolic `~/.dsh` / `$DSH_HOME` instead. */
const HOST_PATH = /(?:\/Users\/[^/\s]+\/|\/home\/[^/\s]+\/|[A-Za-z]:\\Users\\[^\\\s]+\\)/

/** Obvious live-secret shapes; fixtures such as sk-test-not-a-key stay below the length. */
const SECRET_PATTERNS = [
  /\bsk-[A-Za-z0-9_-]{16,}\b/,
  /\bghp_[A-Za-z0-9]{20,}\b/,
  /\bAKIA[0-9A-Z]{16}\b/,
  /-----BEGIN (?:RSA |OPENSSH |EC )?PRIVATE KEY-----/,
]

/**
 * Path-only rules for one relative entry.
 * @param {string} path - POSIX-style relative path.
 * @returns {string[]} one problem per forbidden path.
 */
export function handoffPathProblems(path) {
  const normalized = path.replaceAll('\\', '/').replace(/^\.\//, '')
  if (normalized === '' || normalized.startsWith('../')) return [`${path} escapes the handoff root`]
  const problems = []
  for (const directory of ROOT_DIRECTORIES) {
    if (normalized === directory || normalized.startsWith(`${directory}/`)) {
      problems.push(`${normalized} is runtime/user data, not an agent artifact`)
    }
  }
  if (normalized.startsWith('dev/trial-home')) problems.push(`${normalized} is runtime/user data, not an agent artifact`)
  const name = normalized.split('/').pop() ?? normalized
  if (ROOT_FILES.includes(normalized)) problems.push(`${normalized} is runtime/user data, not an agent artifact`)
  if (ANY_FILES.includes(name)) problems.push(`${normalized} is a credentials/env file`)
  if (name.endsWith('.key') || name.endsWith('.pem')) problems.push(`${normalized} is a key/certificate file`)
  return problems
}

/**
 * Text rules for one file: host-absolute paths and obvious live secrets.
 * @param {{ path: string, text: string }} file - relative path and text content.
 * @returns {string[]} one problem per matched shape (the secret itself is never echoed).
 */
export function handoffTextProblems({ path, text }) {
  const problems = []
  if (HOST_PATH.test(text)) problems.push(`${path} carries a machine-local absolute path`)
  for (const pattern of SECRET_PATTERNS) {
    if (pattern.test(text)) problems.push(`${path} carries what looks like a live secret`)
  }
  return problems
}

/**
 * Combine both rule sets over a handoff candidate.
 * @param {{ entries: string[], files: { path: string, text: string }[] }} input - relative paths
 * and the text of files small enough to inspect.
 * @returns {string[]} all findings; empty = the candidate may be handed to another person.
 */
export function handoffProblems({ entries, files }) {
  const problems = new Set()
  for (const entry of entries) for (const problem of handoffPathProblems(entry)) problems.add(problem)
  for (const file of files) for (const problem of handoffTextProblems(file)) problems.add(problem)
  return [...problems]
}
