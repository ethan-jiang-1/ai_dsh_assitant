/**
 * Expert-home assembly shared by the repo deployment CLI and the shipped `expert-setup` bin.
 *
 * The assembly owns two data-side acts only:
 *   1. the identity file may be moved from the retired generic seed to the shipped management
 *      default — and only while it is still that untouched text (an edited soul is the owner);
 *   2. the management seed pages are imported as `draft` using the same on-disk page vocabulary
 *      and credential audit as a normal knowledge write, never promoted automatically. The bin
 *      runs outside a session, so it deliberately does not touch the digest or normalize wiki
 *      links (the shipped seeds contain none); status is preserved across re-imports.
 *
 * It deliberately does not need a DSH runtime: the bin must work from an installed tarball whose
 * profile does not physically contain the harness peers. Only pure domain modules and `yaml` are
 * touched, which is also why the repo CLI and the installed bin cannot drift apart.
 *
 * @module dsh-smart-assistant/cli/expert-setup
 */

import { existsSync } from 'node:fs'
import { readdir, readFile } from 'node:fs/promises'
import { basename, extname, join, relative, resolve, sep } from 'node:path'
import { atomicWriteFile } from '../domain/home/atomic-write.ts'
import { parseFrontmatterDocument, renderFrontmatterDocument } from '../domain/home/frontmatter.ts'
import { homePaths, scaffoldHome } from '../domain/home/layout.ts'
import { DEFAULT_SOUL, LEGACY_GENERIC_SOUL } from '../domain/home/soul.ts'
import { planSourcePage } from '../domain/knowledge/ingest.ts'
import { PAGE_STATUSES, pageToDocument, parseWikiLinks, type KnowledgePage, type PageStatus } from '../domain/knowledge/page.ts'
import { auditSkillCredentials } from '../domain/skills/audit.ts'

/** Where the assembly reads and writes. */
export interface ExpertSetupOptions {
  /** Assistant working folder (the service's `dataDir`), not the harness home. */
  readonly dataDir: string
  /** Directory containing the seed documents (normally `<package>/seeds/management`). */
  readonly seedsDir: string
  /** Clock override for tests. */
  readonly now?: Date
}

/** What one assembly run did. */
export interface ExpertSetupResult {
  /** `seeded` = fresh default written; `migrated` = legacy generic seed replaced; `kept` = owner data left alone. */
  readonly soul: 'seeded' | 'migrated' | 'kept'
  /** Seed pages written this run (id + path). */
  readonly imported: readonly { readonly id: string; readonly path: string }[]
  /** Existing pages whose status was preserved (stable/deprecated) rather than reset to draft. */
  readonly preserved: readonly string[]
}

/** Read the existing page's status so a re-import refreshes content without rolling governance back. */
async function existingStatus(path: string): Promise<PageStatus | undefined> {
  let text: string
  try {
    text = await readFile(path, 'utf8')
  } catch {
    return undefined
  }
  const document = parseFrontmatterDocument(text)
  const status = document?.data.status
  return typeof status === 'string' && (PAGE_STATUSES as readonly string[]).includes(status)
    ? status as PageStatus
    : undefined
}

/** Recursively collect seed documents; README and dot files are not seeds. */
async function collectSeeds(dir: string): Promise<string[]> {
  const found: string[] = []
  for (const entry of (await readdir(dir, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
    if (entry.name.startsWith('.') || /^readme\.md$/i.test(entry.name)) continue
    const path = join(dir, entry.name)
    if (entry.isDirectory()) found.push(...await collectSeeds(path))
    else if (['.md', '.markdown', '.txt'].includes(extname(entry.name).toLowerCase())) found.push(path)
  }
  return found
}

/**
 * Assemble the management-post expert into an assistant working folder.
 *
 * @param options - Assistant data dir, seed dir, and optional clock.
 * @returns What the run wrote or preserved.
 * @throws When the seed directory is missing or a seed cannot be written.
 */
export async function assembleExpertHome(options: ExpertSetupOptions): Promise<ExpertSetupResult> {
  const dataDir = resolve(options.dataDir)
  const seedsDir = resolve(options.seedsDir)
  if (!existsSync(seedsDir)) throw new Error(`expert-setup: seed directory not found: ${seedsDir}`)

  const paths = homePaths(dataDir)
  const scaffold = await scaffoldHome(paths)

  // Identity: scaffold already wrote the management default into a fresh home. An existing home
  // may still carry the retired generic seed; replace only that exact text. Anything else is the
  // owner's voice and stays untouched (including an empty file, which the prompt already treats
  // as "use the default").
  let soul: ExpertSetupResult['soul'] = 'kept'
  const current = (await readFile(paths.soulFile, 'utf8')).trim()
  if (scaffold.soulWritten) {
    soul = 'seeded'
  } else if (current === '' || current === LEGACY_GENERIC_SOUL.trim()) {
    await atomicWriteFile(paths.soulFile, `${DEFAULT_SOUL}\n`)
    soul = 'migrated'
  }

  const imported: { id: string, path: string }[] = []
  const preserved: string[] = []
  const now = options.now ?? new Date()
  for (const file of await collectSeeds(seedsDir)) {
    const text = await readFile(file, 'utf8')
    const rel = relative(seedsDir, file).split(sep).join('/')
    const ref = join('seeds', basename(seedsDir), rel).split(sep).join('/')
    const plan = planSourcePage({ ref, title: basename(file).replace(/\.[^.]+$/u, ''), text })
    const path = join(paths.knowledgeDir, `${plan.id}.md`)
    const status = await existingStatus(path)
    if (status !== undefined && status !== 'draft') preserved.push(plan.id)
    const body = plan.body
    const page: KnowledgePage = {
      id: plan.id,
      status: status ?? 'draft',
      type: 'source',
      title: plan.title,
      description: plan.description,
      generated: { by: 'process:expert-setup', at: now.toISOString() },
      sources: plan.sources.map(resource => ({ resource })),
      tags: plan.tags,
      body,
      links: parseWikiLinks(body),
    }
    const document = pageToDocument(page)
    const rendered = renderFrontmatterDocument(document.data, document.body)
    const findings = auditSkillCredentials(plan.id, rendered)
    if (findings.length > 0) {
      throw new Error(`expert-setup: seed ${plan.id} failed the credential audit: ${findings.map(finding => finding.message).join('; ')}`)
    }
    await atomicWriteFile(path, rendered)
    imported.push({ id: plan.id, path })
  }

  return { soul, imported, preserved }
}
