/**
 * Gate cores for the dev/ tree drawers and the backlog research index.
 */
/**
 * A drawer map (doorplate "哪个抽屉" table) is a claim about the tree: a first-level entry that
 * exists on disk but is named nowhere in the map is a drawer a fresh agent will puzzle over —
 * the 2026-10-12 round found three such omissions in dev/AGENTS.md (desk probes, fixture
 * families, the 30-day observation home), each invisible to every other gate. Coverage = the
 * entry appears as `<name>/`, is named bare, or matches a `<stem>*` glob row; the doorplate
 * file itself is exempt.
 *
 * @param {{ entries: string[], drawerText: string, where?: string }} input
 */
export function devDrawerCoverageProblems({ entries, drawerText, where = 'dev/AGENTS.md' }) {
  const problems = []
  const globStems = [...drawerText.matchAll(/([A-Za-z0-9_-]+)\*/g)].map(match => match[1])
  for (const entry of entries) {
    if (entry === 'AGENTS.md' || entry.startsWith('.')) continue
    const covered = drawerText.includes(`${entry}/`)
      || drawerText.includes(`\`${entry}\``)
      || globStems.some(stem => entry.startsWith(stem))
    if (!covered) {
      problems.push(`${where} drawer table does not name \`${entry}\` — a drawer outside the map is a drawer a fresh agent will puzzle over; add a row or remove the directory in the same diff`)
    }
  }
  return problems
}

/**
 * The research README's topic-directory claims are claims about the tree: a directory with no
 * tracked material beneath it is a claimed-active shell (the 2026-10-12 round found
 * `tech-exploration/` empty on disk two days after its materials moved to the archive, with the
 * README still calling it active), and a directory the README never names is outside the index
 * contract ("制度级索引互查要求本区文件被本 README 点名"). Since the 2026-10-30 research-topic
 * layout the same rule runs on both shelves: an archived topic no index names is a topic nobody
 * can find again.
 *
 * @param {{ subdirs: string[], readmeText: string, trackedRelPaths: string[], where?: string }} input
 */
export function researchSubdirProblems({ subdirs, readmeText, trackedRelPaths, where = '_backlog/research/README.md' }) {
  const problems = []
  for (const dir of subdirs) {
    const hasMaterial = trackedRelPaths.some(path => path.startsWith(`${dir}/`))
    if (!hasMaterial) {
      problems.push(`research topic dir \`${dir}/\` holds no tracked material — remove the empty shell or move materials in, in the same diff that updates ${where}`)
      continue
    }
    if (!readmeText.includes(dir)) {
      problems.push(`${where} does not name research topic dir \`${dir}/\` — the index is the tree's only map`)
    }
  }
  return problems
}
