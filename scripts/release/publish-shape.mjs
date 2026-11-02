/**
 * Publish-shape judges: pure predicates over what a packed artifact and its manifest actually
 * contain. They take data (never paths they read themselves) so every accept/reject form can run
 * on a throwaway fixture — the discipline in `scripts/AGENTS.md` §2.
 *
 * Why these live apart from `scripts/release/export-dist.mjs`: the export script owns "what is
 * shipped and which files are read"; the rules own "what makes a shipped shape wrong". A rule that
 * can only be exercised by producing a real tarball cannot be proven red.
 *
 * @module scripts/release/publish-shape
 */

/** @typedef {{ path: string, text: string }} ArtifactMember  One artifact member and its decoded text. */

/**
 * Source that must never reach a published artifact: the package's own TypeScript tree.
 * Shipped sourcemaps are useless to a consumer (the sources are not shipped) and hand away the
 * development surface; `export-dist` used to miss them because it only judged entry names.
 */
const OWN_SOURCE = /(^|\/)\.\.?\/.*\/src\//

/** A `sourcesContent` entry counts as shipped source unless it belongs to a dependency. */
function embeddedOwnSource(source) {
  if (source.startsWith('node_modules/')) return false
  return OWN_SOURCE.test(source) || /(^|\/)src\//.test(source)
}

/**
 * Judge the macOS/Linux path is irrelevant; the rule is "no shipped map embeds our own sources".
 * @param maps - every `.map` member of the artifact, decoded.
 * @returns human-readable problems; empty means clean.
 */
export function sourcemapLeakProblems(maps) {
  const problems = []
  for (const map of maps) {
    let parsed
    try {
      parsed = JSON.parse(map.text)
    } catch {
      problems.push(`${map.path}: not valid JSON — a published map must be parseable or absent`)
      continue
    }
    const record = parsed
    const sources = Array.isArray(record.sources) ? record.sources.filter(s => typeof s === 'string') : []
    const contents = Array.isArray(record.sourcesContent) ? record.sourcesContent : []
    const leaking = sources.filter(embeddedOwnSource)
    if (contents.length > 0 && sources.length === 0) {
      problems.push(`${map.path}: carries sourcesContent with no sources list — its payload cannot be reviewed`)
      continue
    }
    for (const source of leaking) {
      const index = sources.indexOf(source)
      if (contents[index] !== undefined && contents[index] !== null) {
        problems.push(`${map.path}: embeds the source of ${source}`)
      }
    }
  }
  return problems
}

/**
 * Manifest shape a publishable bundle must have. `private` blocks `npm publish` with `EPRIVATE`
 * (a dry run does not exercise it); display metadata is what the Plugins page and the market read.
 * @param manifest - the parsed `package.json` of the package about to be packed.
 * @returns human-readable problems; empty means publishable.
 */
export function manifestShapeProblems(manifest) {
  const problems = []
  if (manifest.private === true) problems.push('package.json: "private": true — `npm publish` refuses with EPRIVATE')
  const dsh = manifest.dsh
  if (dsh?.bundle?.patch === undefined) problems.push('package.json: declares no dsh.bundle.patch — the host would treat it as a plain dependency')
  const engines = manifest.engines
  if (typeof engines?.dsh !== 'string' || engines.dsh.trim() === '') {
    problems.push('package.json: declares no engines.dsh — install and boot would have no version gate')
  }
  if (typeof manifest.icon !== 'string' || manifest.icon.trim() === '') {
    problems.push('package.json: declares no icon — the Plugins page falls back to a generic mark')
  }
  if (typeof manifest.description !== 'string' || manifest.description.trim() === '') {
    problems.push('package.json: declares no description — the Plugins card has no one-liner')
  }
  return problems
}

/**
 * The locale dictionaries the host reads for display text. A missing English dictionary is not an
 * error at runtime (titles fall back to the package name) but it is the difference between a card
 * that says `dsh-smart-assistant` and one that says what the plugin is.
 * @param locales - `{ language: parsed document }` for every `locale/<lang>.json`.
 * @returns human-readable problems; empty means display metadata is complete.
 */
export function localeShapeProblems(locales) {
  const problems = []
  const english = locales.en
  if (english === undefined) {
    problems.push('locale/en.json: missing — the Plugins page title falls back to the package name')
    return problems
  }
  for (const [language, document] of Object.entries(locales)) {
    const meta = document?.meta
    if (meta === undefined || typeof meta !== 'object') {
      problems.push(`locale/${language}.json: no "meta" object — the host reads nothing from this file`)
      continue
    }
    for (const field of ['title', 'description']) {
      const value = meta[field]
      if (typeof value !== 'string' || value.trim() === '') {
        problems.push(`locale/${language}.json: meta.${field} must be a non-empty string`)
      }
    }
  }
  return problems
}

/**
 * The two documents a plugin and its product owe a reader: the package README (install / what /
 * configuration / data / compatibility / upgrade / uninstall — the order the host's own packages
 * use) and the generated install manual (the ten-section skeleton). Shape only: this judge does not
 * read prose. It exists because both documents are generated or hand-maintained next to code that
 * moves, and the failure is silent — a missing "Upgrade" section is a reader who cannot roll back.
 * @param input - `{ readme, manual }`: the package README text and the generated manual text.
 * @returns problem strings; empty means both keep their contractual headings.
 */
export function docShapeProblems({ readme, manual }) {
  const problems = []
  // The plugin README's seven sections as the host's own packages present them to an installer:
  // what it is and where it lands, install, verify, configure, upgrade, uninstall-and-data, and
  // troubleshooting. Architecture and contribution notes deliberately have no section here.
  const readmeHeadings = [
    '## 装什么、装到哪',
    '## 安装',
    '## 验证',
    '## 配置',
    '## 升级',
    '## 卸载与数据',
    '## 排障',
  ]
  const readmeLines = readme.split('\n')
  for (const heading of readmeHeadings) {
    if (!readmeLines.some(line => line.startsWith(heading))) problems.push(`README: missing "${heading}" — the plugin README keeps the host's seven sections`)
  }
  const manualHeadings = [
    ['## 产品是什么', 'what the distribution is'],
    ['## 〇、安装前提', 'prerequisites'],
    ['## 〇之二、选运行时', 'runtime choice'],
    ['## 一、安装', 'install'],
    ['## 二、首启', 'first launch'],
    ['## 三、验证安装', 'verify'],
    ['## 五、配置', 'configuration'],
    ['## 七、升级', 'upgrade'],
    ['## 八、卸载', 'uninstall'],
    ['## 常见问题', 'troubleshooting'],
    ['## 十二、安全', 'security'],
  ]
  const manualLines = manual.split('\n')
  for (const [heading, label] of manualHeadings) {
    if (!manualLines.some(line => line.startsWith(heading))) problems.push(`manual: missing "${heading}" (${label}) — the install manual keeps the ten-section skeleton`)
  }
  return problems
}
