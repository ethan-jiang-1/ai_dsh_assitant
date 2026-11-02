/**
 * Gate core for the distribution surface's two written contracts.
 *
 * 1. The retired vocabulary stays retired. `product` names the whole running dsh (and this
 *    business), never one delivered object: a "product profile" or "product home" is a second
 *    ontology that makes authors guess where the boundary is. The registry row in
 *    `docs/release.md` carries `term-policy` and is skipped.
 * 2. `docs/release.md` keeps the six-axis owner table and the ten-stage lifecycle index. They are
 *    the only place a reader can answer "who owns this axis" and "which stage writes this file";
 *    losing a row silently shrinks the charter to prose.
 *
 * Both take their corpus from the caller so fixtures can exercise accept and reject shapes.
 */

const RETIRED_TERMS = [
  '产品 profile',
  '产品 bundle',
  '产品型',
  '产品行',
  '产品门',
  '产品 home',
  '产品安装器',
  '产品模式',
  '产品入口',
  '插件即产品',
]

/** Lines carrying this marker are the term registry itself, not prose that uses the terms. */
const TERM_REGISTRY_MARKER = 'term-policy'

/**
 * Report retired distribution compounds in the managed prose corpus.
 * @param {{ files: Array<{ path: string, text: string }> }} inputs - one entry per scanned file.
 * @returns {string[]} one problem per line that uses a retired compound.
 */
export function retiredTermProblems({ files }) {
  const problems = []
  for (const { path, text } of files) {
    const lines = text.split('\n')
    for (const [index, line] of lines.entries()) {
      if (line.includes(TERM_REGISTRY_MARKER)) continue
      for (const term of RETIRED_TERMS) {
        if (line.includes(term)) problems.push(`${path}:${index + 1} uses the retired term "${term}" — name the object (bundle / custom profile / 专用 home / 入口行 / 安装器) or point at the owner`)
      }
    }
  }
  return problems
}

const AXES = ['运行时', 'profile', 'patch 层', 'app surface', 'home 与数据', '生命周期']
const STAGES = ['打包', '发布', '安装', '初始化', '特殊初始化', '配置', '启动', '更新', '卸载', '文档']

/**
 * Report a charter that lost the six-axis table or a lifecycle stage row.
 * @param {{ text: string }} inputs - `docs/release.md` as text.
 * @returns {string[]} one problem per missing section, axis row, or stage row.
 */
export function releaseCharterProblems({ text }) {
  const problems = []
  const lines = text.split('\n')
  if (!lines.some(line => line.startsWith('## 一、六轴 owner'))) problems.push('docs/release.md lost its six-axis owner section')
  for (const axis of AXES) {
    if (!lines.some(line => line.startsWith('| **') && line.includes(`**${axis}**`))) {
      problems.push(`docs/release.md six-axis table never names ${axis}`)
    }
  }
  if (!lines.some(line => line.startsWith('## 七、生命周期十段'))) problems.push('docs/release.md lost its lifecycle index section')
  for (const stage of STAGES) {
    if (!lines.some(line => line.startsWith(`| ${stage} |`))) {
      problems.push(`docs/release.md lifecycle index never names ${stage}`)
    }
  }
  return problems
}
