/**
 * Gate cores for the _backlog/ governance: card liveness and graduation.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join, relative } from 'node:path'
import { parse as parseYaml } from 'yaml'
import { read, frontmatterBlock } from './shared.mjs'

/** Status words that mean a proposal is done and must have left notes/proposed/. */
export const GRADUATED_STATUS = /状态：\*\*(implemented|rejected|archived|已全部实施|已消化|已毕业|已完成|已实施)/

/**
 * A note that says it is done must have left the proposed shelf — the queue is a staging shelf,
 * not a second archive.
 * @param {{ files: { where: string, text: string }[] }} inputs - every note on the shelf, already
 * read by the runner (the runner owns the corpus; this core owns the rule).
 * @returns {string[]} one problem per graduated note still sitting there.
 */
export function graduatedProposalProblems({ files }) {
  const problems = []
  for (const file of files) {
    // The pattern is anchored on the `状态：**…` head, so it is tested against the STATUS LINE —
    // the previous inline body fed it the captured word alone, which can never match: the gate
    // was dead code and a graduated note could sit on the shelf forever (found by this family's
    // fixture, 2026-10-16). The line is also where notes/README.md puts the status.
    const statusLine = file.text.split('\n').find(line => line.startsWith('日期：')) ?? ''
    if (GRADUATED_STATUS.test(statusLine)) {
      problems.push(`${file.where} says it is done but still sits in notes/proposed/ — graduate it to notes/implemented/`)
    }
  }
  return problems
}

/**
 * Backlog liveness (borrowed 2026-10-02 from ai_dsh_loop_advisor/_backlog's `backlog-liveness`,
 * owner-directed): the deliberation space's own mechanical gate. Three checks, all structural —
 * they never judge a card's content:
 *
 * 1. the institution's directories exist (issues / bugs / research / methods and the _archive pools);
 * 2. every issue and bug card opens with frontmatter whose first field is status, plus opened
 *    (and severity on a bug). Research files open with topic and a one-line intent.
 * 3. the research shelves are one directory per research topic (2026-10-30, borrowed from
 *    ai_dsh_deep_research): the directory holds a title page (`README.md`) whose head names the
 *    question, the consumers and the produced cards, and that title page names every material
 *    inside the directory. The area index names the topics; a material moved without its title
 *    page and the title page without the index are the drift this stage exists for. Missing link
 *    targets are the relative-link gate.
 *
 * @param {string} backlogRoot - path of the _backlog/ directory.
 */
export function backlogLivenessProblems(backlogRoot) {
  const problems = []
  // Stage 1 — institution dirs: the charter's own shelves.
  problems.push(...institutionDirProblems(backlogRoot))
  if (!existsSync(backlogRoot)) return problems

  // Shared vocabulary for the three card walks below: per-shelf statuses, the closed
  // leaning heads, research topics, and the frontmatter reader that reports into `problems`.
  const cardNames = (dir) => readdirSync(join(backlogRoot, dir), { withFileTypes: true })
    .filter(entry => entry.isFile() && entry.name.endsWith('.md') && entry.name !== 'README.md')
    .map(entry => entry.name)

  const cardStatus = {
    issues: new Set(['推敲中', '等人拍板']),
    // Bugs carry a four-value active vocabulary since the 2026-10-12 process card (borrowed
    // from ai_dsh_loop_advisor's same-day card): 活跃 was renamed 排查中 because "active"
    // collides with the manual's own 活跃区 once several active values coexist, and the
    // gerund restores symmetry with 推敲中. 修复就绪 carries the fix ticket AND its
    // authorization in one flip; 修复落地 makes "implementation is not acceptance" visible;
    // 等人拍板 is shared with issues. The exits (已修/待修) keep their meaning — 待修 is an
    // archived known-unfixed pool, deliberately NOT fix-ready.
    bugs: new Set(['排查中', '修复就绪', '修复落地', '等人拍板']),
    [join('_archive', 'settled_issues')]: new Set(['已结']),
    [join('_archive', 'suspended_issues')]: new Set(['叫停']),
    [join('_archive', 'fixed_bugs')]: new Set(['已修']),
    [join('_archive', 'suspended_bugs')]: new Set(['待修']),
  }
  // The closed leaning heads (2026-10-12): the four doors are the closing table's own rows,
  // so a wild head means the leaning was never routed through them. Legacy 毕业门判断 fields
  // predate the law and stay free-form by design; only the 毕业： token is checked.
  const GRADUATION_LEANING_HEADS = new Set(['未定', '做现在', '以后做', '不做', '已在别处'])
  const headProblems = (text, where, expect) => {
    const block = frontmatterBlock(text)
    if (block === undefined) {
      problems.push(`${where} has no frontmatter`)
      return
    }
    let data
    try {
      data = parseYaml(block)
    } catch (error) {
      problems.push(`${where} frontmatter is not parsable YAML: ${String(error).split('\n')[0]}`)
      return
    }
    if (data === null || typeof data !== 'object' || Array.isArray(data)) {
      problems.push(`${where} frontmatter is not a field map`)
      return
    }
    const keys = Object.keys(data)
    if (expect.kind === 'card') {
      if (keys[0] !== 'status') problems.push(`${where} frontmatter must start with status`)
      else if (!expect.statuses.has(String(data.status))) problems.push(`${where} status ${JSON.stringify(data.status)} is not a status of this shelf`)
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(data.opened ?? ''))) problems.push(`${where} frontmatter needs opened: YYYY-MM-DD`)
      if (expect.bug && !['P0', 'P1', 'P2'].includes(data.severity)) problems.push(`${where} frontmatter needs severity: P0, P1, or P2`)
    } else {
      // `topic` describes the material itself (free text); it is no longer an enum pinned to a
      // theme directory. The title page is what groups materials, so the gate must not pretend a
      // material's topic word has a directory to agree with.
      if (keys[0] !== 'topic') problems.push(`${where} frontmatter must start with topic`)
      if (typeof data.intent !== 'string' || data.intent.trim() === '' || data.intent.includes('\n')) problems.push(`${where} frontmatter needs a one-line intent`)
    }
    // The parsed map feeds the mirror law below; failure paths already pushed their problem.
    return data
  }

  // Stage 2 — active shelves (issues, bugs): per card, frontmatter status first, then index
  // membership, then the mirror law and the leaning head.
  const activeShelfProblems = () => {
    for (const area of ['issues', 'bugs']) {
      const areaDir = join(backlogRoot, area)
      if (!existsSync(areaDir)) continue
      const index = readFileSync(join(areaDir, 'README.md'), 'utf8')
      for (const name of cardNames(area)) {
        const where = `_backlog/${area}/${name}`
        const text = readFileSync(join(areaDir, name), 'utf8')
        const data = headProblems(text, where, { kind: 'card', statuses: cardStatus[area], bug: area === 'bugs' })
        if (!index.includes(name)) problems.push(`${where} is not named by ${area}/README.md's active index`)
        // The mirror law (2026-10-12, borrowed with the process card): on the ACTIVE shelves
        // the status line must mirror the frontmatter — frontmatter is the one home of the
        // current phase, the line mirrors it and owns the history (verdict appends, former
        // status at exit). Archived cards stay exempt: their historical line variants
        // (已毕业 where frontmatter says 已结, dated 毕业 records) are records, not drift, and
        // shelf + frontmatter already pin them. Only the head's first 12 lines are read, the
        // same hukou segment the graduation check trusts.
        if (data) {
          const head = text.split('\n').slice(0, 12).join('\n')
          const mirrored = /状态：\s*\**([^｜|\n（(]+)/.exec(head)?.[1]?.replaceAll('*', '').trim()
          if (mirrored === undefined) {
            problems.push(`${where} has no 状态： line — an active card mirrors its frontmatter in the head`)
          } else if (mirrored !== String(data.status)) {
            problems.push(`${where} status line says ${JSON.stringify(mirrored)} but frontmatter says ${JSON.stringify(String(data.status))} — the line mirrors the frontmatter; history appends, it does not fork`)
          }
          const leaning = /毕业：\s*\**([^｜|\n（(]+)/.exec(head)?.[1]?.replaceAll('*', '').trim()
          if (leaning !== undefined && !GRADUATION_LEANING_HEADS.has(leaning)) {
            problems.push(`${where} 毕业 head ${JSON.stringify(leaning)} is not one of 未定|做现在|以后做|不做|已在别处`)
          }
        }
      }
    }
  }

  // Stage 3 — research topics (active + archived): each topic directory owns a title page, and the
  // title page names its own materials. Walking directories (not a flat file list) is the whole
  // point of the 2026-10-30 layout: a material that exists but is named by no title page is a file
  // the topic cannot account for. "Does the index name this topic directory" stays with the
  // structure gate (researchSubdirProblems) — one drift, one gate.
  const researchTopicProblems = () => {
    const materialNames = (dir, prefix = '') => readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
      if (entry.isDirectory()) return materialNames(join(dir, entry.name), join(prefix, entry.name))
      if (entry.isFile() && entry.name.endsWith('.md')) return [join(prefix, entry.name)]
      return []
    })
    // The title page head is the 名头 contract, checked shape-only: the question, who it served and
    // what it produced on every topic, plus the archive date and the past-tense consumer label once
    // the topic has left the active shelf. A long value may wrap onto `> ` continuation lines; only
    // the labelled heads are required.
    const titlePageProblems = (text, where, archived) => {
      const head = text.split('\n').slice(0, 12).join('\n')
      // Active topics name their live consumers; an archived topic's consumers are all historical,
      // so the label itself carries that fact instead of repeating "历史" inside the value.
      const labels = ['问题', archived ? '历史消费者' : '消费者', '产出的卡']
      for (const label of labels) {
        if (!new RegExp(`^> ${label}：`, 'm').test(head)) problems.push(`${where} has no \`> ${label}：\` line in its head`)
      }
      if (archived && !/^> 归档：\d{4}-\d{2}-\d{2}/m.test(head)) {
        problems.push(`${where} has no \`> 归档：YYYY-MM-DD\` line — an archived topic carries its archive date`)
      }
    }
    for (const [dir, archived] of [
      ['research', false],
      [join('_archive', 'research'), true],
    ]) {
      const fullDir = join(backlogRoot, dir)
      if (!existsSync(fullDir)) continue
      const topics = readdirSync(fullDir, { withFileTypes: true })
        .filter(entry => entry.isDirectory())
        .map(entry => entry.name)
      for (const topic of topics) {
        const topicDir = join(fullDir, topic)
        const where = `_backlog/${dir}/${topic}`
        const titlePage = join(topicDir, 'README.md')
        if (!existsSync(titlePage)) {
          problems.push(`${where} has no title page (README.md) — a research topic is a directory plus its 名头`)
          continue
        }
        const titleText = readFileSync(titlePage, 'utf8')
        titlePageProblems(titleText, `${where}/README.md`, archived)
        for (const name of materialNames(topicDir).filter(name => name !== 'README.md')) {
          const materialWhere = `_backlog/${dir}/${topic}/${name}`
          headProblems(readFileSync(join(topicDir, name), 'utf8'), materialWhere, { kind: 'research' })
          if (!titleText.includes(name)) problems.push(`${materialWhere} is not named by its title page (${where}/README.md)`)
        }
      }
    }
  }

  // Stage 4 — the four archive pools: flat files named by the pool README.
  const archivePoolProblems = () => {
    for (const dir of [
      join('_archive', 'settled_issues'), join('_archive', 'suspended_issues'),
      join('_archive', 'fixed_bugs'), join('_archive', 'suspended_bugs'),
    ]) {
      const fullDir = join(backlogRoot, dir)
      if (!existsSync(fullDir)) continue
      const indexPath = join(dir, 'README.md')
      const index = readFileSync(join(backlogRoot, indexPath), 'utf8')
      const bug = dir.endsWith('bugs')
      for (const name of cardNames(dir)) {
        const where = `_backlog/${dir}/${name}`
        headProblems(readFileSync(join(fullDir, name), 'utf8'), where, { kind: 'card', statuses: cardStatus[dir], bug })
        if (!index.includes(name)) problems.push(`${where} is not named by ${indexPath}'s index`)
      }
    }
  }

  // The stage order is the output order the fixtures pin: dirs → active shelves →
  // research → archive pools.
  activeShelfProblems()
  researchTopicProblems()
  archivePoolProblems()
  return problems
}

/** The institution's own directories are part of the charter: every required shelf must exist. */
function institutionDirProblems(backlogRoot) {
  const problems = []
  const requiredDirs = [
    'issues', 'bugs', 'research', 'methods',
    join('_archive', 'settled_issues'), join('_archive', 'suspended_issues'),
    join('_archive', 'fixed_bugs'), join('_archive', 'suspended_bugs'),
    join('_archive', 'research'),
  ]
  for (const dir of requiredDirs) {
    if (!existsSync(join(backlogRoot, dir))) problems.push(`_backlog/${dir} is missing (the institution's directories are part of the charter)`)
  }
  return problems
}

/**
 * Liveness proves that a card exists and is indexed, but not that it still belongs in the active area.
 * An explicit closure verdict must therefore be checked separately from deliberation status.
 * “可关闭：是” and “关闭条件 = 已满足” are current wording; legacy fields remain accepted so old cards
 * keep their protection. Partial delivery, missing evidence and pending user choices are not closure.
 * Only the first 12 lines are read, so historical verdicts quoted in discussion do not close a card.
 * The exported name stays stable for the runner and existing fixtures.
 * @param {string} backlogRoot - path of the _backlog/ directory.
 */
export function backlogGraduationProblems(backlogRoot) {
  const problems = []
  const plansDir = join(backlogRoot, 'issues')
  if (!existsSync(plansDir)) return problems

  // Require a complete verdict token: 是否/是非未定 are questions, not closure declarations.
  const CLOSABLE = /可关闭\s*[：:=＝]\s*\**\s*是\**\s*(?=[｜|\n（(]|$)/
  const CLOSURE_MET = /关闭条件(?:判断)?\s*[：:=＝]\s*\**\s*(?:已满足|已通过|已过)\**\s*(?=[｜|\n（(]|$)/
  // Existing cards keep their old field; renaming prose must not remove their protection.
  const GATE_DONE = /毕业门(?:判断)?\s*[=＝]\s*\**\s*(?:已过|已通过|已毕业)/
  // A status field that *is* a completion word ("状态：**已毕业**"). Anchored immediately after the
  // field label, so "状态：推敲中｜毕业门判断 = 该做…" can never match by reaching across the ｜.
  const STATUS_DONE = /状态：\**\s*(?:已全部实施|已消化|已毕业|已完成|已实施)/
  // "已交付" is ordinary mid-flight wording ("S1 已交付，S2 进行中"), so it counts only as the
  // *terminal* content of the status field — the shape a card uses once every slice has landed.
  // Without the lookahead this pattern red-lines every partially delivered card and gets turned off.
  const STATUS_DELIVERED = /状态：\**\s*[^｜|\n]*已交付\**\s*(?=｜|$)/
  const signals = [CLOSABLE, CLOSURE_MET, GATE_DONE, STATUS_DONE, STATUS_DELIVERED]

  const plansIndex = join(plansDir, 'README.md') // issues/README.md, the active ledger
  const index = existsSync(plansIndex) ? read(plansIndex) : ''

  for (const entry of readdirSync(plansDir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.md') || entry.name === 'README.md') continue
    // Only the header is read: a card may legitimately *discuss* completion deeper in its
    // body (an evidence section quoting a passing gate) without being finished.
    const head = read(join(plansDir, entry.name)).split('\n').slice(0, 12).join('\n').replaceAll('**', '')
    if (!signals.some(pattern => pattern.test(head))) continue
    const stillListed = index.includes(entry.name)
    problems.push(
      `_backlog/issues/${entry.name} declares closure conditions met but still sits in issues/` +
      `${stillListed ? ' and is still named by issues/README.md\'s active list' : ''}` +
      ` — close it with \`git mv\` to _backlog/_archive/settled_issues/ and add its index row`,
    )
  }
  return problems
}
