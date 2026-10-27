/**
 * The room store: one implementation of "a directory of frontmatter files with an archive".
 *
 * Memory records and research threads have different lifecycles but the same substrate, so they
 * share this store instead of each growing their own file handling. A room's active set is the
 * `*.md` files directly inside it; entries that left the active set live in its `archive/`
 * subdirectory and stay readable on purpose — history is not deleted to make a check pass.
 *
 * Reads never throw on a bad file: the listing reports it as a failure so the curation check can
 * name it. A silently skipped file would be an invisible loss of knowledge.
 *
 * @module dsh-smart-assistant/home/room
 */

import { mkdir, readdir, readFile, rename, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { atomicWriteFile } from './atomic-write.ts'
import { parseFrontmatterDocument, renderFrontmatterDocument } from './frontmatter.ts'

const ENTRY_SUFFIX = '.md'

/** Entry ids are file names, so they must be safe as path segments. */
const ENTRY_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/**
 * Whether a string can be used as an entry id (and therefore a file name).
 * @param id - Candidate id.
 * @returns Whether the id matches the entry-id grammar.
 */
export function isEntryId(id: string): boolean {
  return ENTRY_ID.test(id)
}

/** Whether a filesystem error means "this path is not there", as opposed to "we may not look". */
function isMissingPathError(error: unknown): boolean {
  return (error as NodeJS.ErrnoException | null)?.code === 'ENOENT'
}

/** Render a filesystem error as the one-line reason a room failure carries. */
function describeReadError(error: unknown): string {
  const code = (error as NodeJS.ErrnoException | null)?.code
  if (code === 'EACCES' || code === 'EPERM') return 'directory is not readable (permission denied)'
  return code === undefined ? 'directory could not be read' : `directory could not be read (${code})`
}

/** One parsed entry in a room. */
export interface RoomEntry {
  /** Entry id, equal to the file name without its suffix. */
  readonly id: string
  /** Absolute file path. */
  readonly path: string
  /** Parsed frontmatter fields. */
  readonly data: Readonly<Record<string, unknown>>
  /** Prose body. */
  readonly body: string
}

/** A file in a room that could not be read as an entry. */
export interface RoomReadFailure {
  /** Absolute file path. */
  readonly path: string
  /** Why the file is unusable. */
  readonly reason: string
}

/** The active (or archived) set of a room, with the files that failed to parse. */
export interface RoomListing {
  /** Successfully parsed entries, ordered by id. */
  readonly entries: readonly RoomEntry[]
  /** Files that exist but are not usable entries. */
  readonly failures: readonly RoomReadFailure[]
}

/** A directory of frontmatter entries plus its archive subdirectory. */
export class Room {
  /**
   * @param dir - Directory holding the active entries.
   * @param archiveDir - Directory holding entries that left the active set.
   */
  constructor(
    readonly dir: string,
    readonly archiveDir: string,
  ) {}

  /**
   * List the room's active entries.
   * @returns Parsed entries ordered by id, plus per-file failures.
   */
  async list(): Promise<RoomListing> {
    return this.#readDirectory(this.dir)
  }

  /**
   * List the entries that left the active set.
   * @returns Parsed entries ordered by id, plus per-file failures.
   */
  async listArchived(): Promise<RoomListing> {
    return this.#readDirectory(this.archiveDir)
  }

  /**
   * Read one active entry.
   * @param id - Entry id.
   * @returns The entry, or `undefined` when it does not exist or cannot be parsed.
   */
  async read(id: string): Promise<RoomEntry | undefined> {
    if (!isEntryId(id)) return undefined
    return this.#readFile(this.dir, id)
  }

  /**
   * Read one archived entry.
   * @param id - Entry id.
   * @returns The entry, or `undefined` when it does not exist or cannot be parsed.
   */
  async readArchived(id: string): Promise<RoomEntry | undefined> {
    if (!isEntryId(id)) return undefined
    return this.#readFile(this.archiveDir, id)
  }

  /**
   * Write an entry into the active set, replacing any existing file with that id.
   * @param id - Entry id; must satisfy {@link isEntryId}.
   * @param data - Frontmatter fields, in the order they should be written.
   * @param body - Prose body.
   * @returns The written entry.
   */
  async write(id: string, data: Readonly<Record<string, unknown>>, body: string): Promise<RoomEntry> {
    if (!isEntryId(id)) throw new Error(`room entry id "${id}" is not a safe file name`)
    await mkdir(this.dir, { recursive: true, mode: 0o700 })
    const path = join(this.dir, `${id}${ENTRY_SUFFIX}`)
    // The file is user-editable data. Keep fields this build does not know about (a hand-added
    // annotation, or a field from a newer release) instead of silently dropping them on the next
    // write; the caller's fields win on a collision.
    const existing = await this.read(id)
    const merged = existing === undefined ? data : { ...existing.data, ...data }
    await atomicWriteFile(path, renderFrontmatterDocument(merged, body))
    return { id, path, data: merged, body: body.trim() }
  }

  /**
   * Move an active entry into the archive, optionally rewriting fields on the way out.
   * @param id - Entry id.
   * @param patch - Frontmatter fields to replace on the archived copy.
   * @returns Whether an active entry was archived.
   */
  async archive(id: string, patch: Readonly<Record<string, unknown>> = {}): Promise<boolean> {
    const entry = await this.read(id)
    if (entry === undefined) return false
    await mkdir(this.archiveDir, { recursive: true, mode: 0o700 })
    const target = join(this.archiveDir, `${id}${ENTRY_SUFFIX}`)
    // Move first, rewrite second: a crash between the two leaves the record in the archive with
    // its old fields, never two copies (the old write-target-then-remove-source window let a crash
    // leave a duplicate and a later `curate` report duplicate-id). A concurrent archiver that loses
    // the rename has already achieved the move and is not an error.
    try {
      await rename(entry.path, target)
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code
      if (code === 'ENOENT') return true
      if (code === 'EEXIST' || code === 'EPERM') {
        await rm(target, { force: true })
        await rename(entry.path, target)
      } else {
        throw error
      }
    }
    if (Object.keys(patch).length > 0) {
      const data = { ...entry.data, ...patch }
      await atomicWriteFile(target, renderFrontmatterDocument(data, entry.body))
    }
    return true
  }

  /**
   * Delete an active entry without archiving it.
   * @param id - Entry id.
   * @returns Whether a file was removed.
   */
  async remove(id: string): Promise<boolean> {
    if (!isEntryId(id)) return false
    const path = join(this.dir, `${id}${ENTRY_SUFFIX}`)
    try {
      await rm(path)
      return true
    } catch {
      return false
    }
  }

  async #readDirectory(directory: string): Promise<RoomListing> {
    let names: string[]
    try {
      names = await readdir(directory)
    } catch (error) {
      // A directory that does not exist yet is genuinely an empty room (a fresh home, or a room
      // the caller has not scaffolded). Anything else — permission denied above all — is an
      // *unknown* set, and reporting it as empty would tell curate "nothing here" when the truth
      // is "we could not look", the same invisible loss the module promise forbids at file scale.
      if (isMissingPathError(error)) return { entries: [], failures: [] }
      return { entries: [], failures: [{ path: directory, reason: describeReadError(error) }] }
    }
    const entries: RoomEntry[] = []
    const failures: RoomReadFailure[] = []
    for (const name of names.filter(candidate => candidate.endsWith(ENTRY_SUFFIX)).sort()) {
      const id = name.slice(0, -ENTRY_SUFFIX.length)
      if (!isEntryId(id)) {
        failures.push({ path: join(directory, name), reason: 'file name is not a valid entry id' })
        continue
      }
      const entry = await this.#readFile(directory, id)
      if (entry === undefined) {
        failures.push({ path: join(directory, name), reason: 'missing or unparsable YAML frontmatter' })
        continue
      }
      entries.push(entry)
    }
    return { entries, failures }
  }

  async #readFile(directory: string, id: string): Promise<RoomEntry | undefined> {
    const path = join(directory, `${id}${ENTRY_SUFFIX}`)
    let text: string
    try {
      text = await readFile(path, 'utf8')
    } catch {
      return undefined
    }
    const document = parseFrontmatterDocument(text)
    if (document === undefined) return undefined
    return { id, path, data: document.data, body: document.body }
  }
}
