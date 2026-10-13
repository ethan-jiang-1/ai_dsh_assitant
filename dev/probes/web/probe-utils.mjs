/**
 * The small helpers every browser probe re-declared: CLI argument parsing and sleep.
 *
 * `option()`/`flag()` grew as seven verbatim copies across probes/web and reports/ (one per
 * script), so a parsing fix would have been seven edits at seven speeds — the same rot the
 * dialogue idioms and the service orchestration each got a library for. The functions take
 * `args` explicitly instead of closing over it: a probe keeps owning how it slices argv.
 *
 * Style: scripts/AGENTS.md — pure ESM, Node built-ins only.
 */

/**
 * Read a `--name value` option from an argv slice.
 * @param {string[]} args - the probe's argv (typically process.argv.slice(2)).
 * @param {string} name - option name without the leading dashes.
 * @param {string} [fallback] - value returned when the option is absent or has no value.
 * @returns {string} the option's value or the fallback.
 */
export const option = (args, name, fallback) => {
  const at = args.indexOf(`--${name}`)
  return at >= 0 && at + 1 < args.length ? args[at + 1] : fallback
}

/**
 * Read a boolean flag from an argv slice.
 * @param {string[]} args - the probe's argv.
 * @param {string} name - flag name without the leading dashes.
 * @returns {boolean} whether the flag is present.
 */
export const flag = (args, name) => args.includes(`--${name}`)

/** @param {number} ms @returns {Promise<void>} resolves after `ms` milliseconds. */
export const sleep = (ms) => new Promise((resolve) => { setTimeout(resolve, ms) })
