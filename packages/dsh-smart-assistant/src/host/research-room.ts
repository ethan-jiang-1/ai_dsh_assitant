/**
 * Research room of the home: unresolved questions and their threads (`research/`, archived as
 * `research/archive/`). Functions here are the moved bodies of the {@link AssistantMemory}
 * research methods; they take the host instance (the service itself or the cordis shadow overlay,
 * which forwards field access) so the class methods stay one-line delegates.
 *
 * @module
 */
import type { AssistantMemory, RoomReadResult } from './index.ts'
import { touchDigest } from './curate-digest.ts'
import type { RoomEntry } from '../domain/home/room.ts'
import {
  CLOSED_THREAD_STATUSES,
  newThreadId,
  threadFromEntry,
  threadToDocument,
  type ResearchThread,
} from '../domain/research/thread.ts'
import { scanLearnedSkills } from '../domain/skills/scan.ts'

/** Input for {@link AssistantMemory.openThread}. */
export interface OpenThreadInput {
  /** The thing that is not known yet. */
  readonly question: string
  /** Why it deserves attention. */
  readonly why: string
  /** Current best answer and its weakness. */
  readonly lean?: string
  /** What is already known. */
  readonly evidence?: readonly string[]
  /** Where the thread came from. */
  readonly source?: string
  /** Explicit file-name slug; defaults to a slug of `question`. */
  readonly slug?: string
}

/** Fields {@link AssistantMemory.updateThread} may append to or replace. */
export interface ThreadUpdate {
  /** Replacement question text. */
  readonly question?: string
  /** Replacement rationale. */
  readonly why?: string
  /** Replacement lean. */
  readonly lean?: string
  /** Evidence entries to append. */
  readonly evidence?: readonly string[]
}

/** Where a closed thread's answer lives. */
export interface PromoteTarget {
  /** Id of the memory record or skill name that carries the answer. */
  readonly promotedTo: string
}

async function requireActiveThread(host: AssistantMemory, id: string): Promise<RoomEntry> {
  const entry = await host.research.read(id)
  if (entry === undefined) {
    const archived = await host.research.readArchived(id)
    if (archived !== undefined) throw new Error(`thread "${id}" is already closed and archived`)
    throw new Error(`thread "${id}" does not exist`)
  }
  return entry
}

async function setThreadStatus(
  host: AssistantMemory,
  id: string,
  status: ResearchThread['status'],
  extra: Readonly<Record<string, unknown>> = {},
): Promise<ResearchThread> {
  const entry = await requireActiveThread(host, id)
  const thread = threadFromEntry(entry)
  if (thread === undefined) throw new Error(`thread "${id}" is not readable`)
  const next: ResearchThread = {
    ...thread,
    status,
    updated: new Date().toISOString(),
    ...(typeof extra.reason === 'string' ? { reason: extra.reason } : {}),
    ...(typeof extra.promotedTo === 'string' ? { promotedTo: extra.promotedTo } : {}),
  }
  const document = threadToDocument(next)
  await host.research.write(next.id, document.data, document.body)
  // Only a closed thread (dropped or promoted) leaves the active room: park stays in
  // research/ — digest visibility is a render concern, not a location concern.
  // Regression: tests/host/park-contract.spec.ts (the campaign found park archiving the file).
  if (CLOSED_THREAD_STATUSES.includes(status)) {
    await host.research.archive(next.id)
  }
  touchDigest(host)
  return next
}

/**
 * List research threads.
 * @param host - The home service whose research room is read.
 * @returns Active threads, archived threads, and unreadable files.
 */
export async function listThreads(host: AssistantMemory): Promise<RoomReadResult<ResearchThread> & { readonly archived: readonly ResearchThread[] }> {
  const active = await host.research.list()
  const archived = await host.research.listArchived()
  return {
    entries: active.entries.map(threadFromEntry).filter((thread): thread is ResearchThread => thread !== undefined),
    archived: archived.entries
      .map(threadFromEntry)
      .filter((thread): thread is ResearchThread => thread !== undefined),
    failures: [...active.failures, ...archived.failures],
  }
}

/**
 * Open a thread.
 * @param host - The home service whose research room is written.
 * @param input - The question, its rationale, and optional lean and evidence.
 * @returns The written thread.
 * @throws when the question or the rationale is empty.
 */
export async function openThread(host: AssistantMemory, input: OpenThreadInput): Promise<ResearchThread> {
  const question = input.question.trim()
  const why = input.why.trim()
  if (question.length === 0) throw new Error('assistant_research open requires a question')
  if (why.length === 0) {
    throw new Error('assistant_research open requires why the thread deserves attention')
  }
  await host.ensureHome()
  const now = new Date()
  const stamp = now.toISOString()
  const thread: ResearchThread = {
    id: newThreadId(now, question, undefined, input.slug),
    status: 'open',
    question,
    why,
    ...(input.lean !== undefined ? { lean: input.lean } : {}),
    evidence: [...(input.evidence ?? [])],
    created: stamp,
    updated: stamp,
    ...(input.source !== undefined ? { source: input.source } : {}),
  }
  const document = threadToDocument(thread)
  await host.research.write(thread.id, document.data, document.body)
  touchDigest(host)
  return thread
}

/**
 * Append to or revise an active thread.
 * @param host - The home service whose research room is written.
 * @param id - Thread id.
 * @param update - Fields to replace; `evidence` entries are appended, not replaced.
 * @returns The updated thread.
 * @throws when the thread is missing or already closed.
 */
export async function updateThread(host: AssistantMemory, id: string, update: ThreadUpdate): Promise<ResearchThread> {
  const entry = await requireActiveThread(host, id)
  const thread = threadFromEntry(entry)
  if (thread === undefined) throw new Error(`thread "${id}" is not readable`)
  const next: ResearchThread = {
    ...thread,
    ...(update.question !== undefined ? { question: update.question.trim() } : {}),
    ...(update.why !== undefined ? { why: update.why.trim() } : {}),
    ...(update.lean !== undefined ? { lean: update.lean } : {}),
    evidence: [...thread.evidence, ...(update.evidence ?? [])],
    updated: new Date().toISOString(),
  }
  const document = threadToDocument(next)
  await host.research.write(next.id, document.data, document.body)
  touchDigest(host)
  return next
}

/**
 * Park a thread: still valid, not now. It stays in the room but leaves the digest.
 * @param host - The home service whose research room is written.
 * @param id - Thread id.
 * @returns The parked thread.
 */
export async function parkThread(host: AssistantMemory, id: string): Promise<ResearchThread> {
  const thread = await setThreadStatus(host, id, 'parked')
  return thread
}

/**
 * Drop a thread: wrong, moot, or not worth it. The reason is required — it is what stops a future
 * session from reopening the same question.
 * @param host - The home service whose research room is written.
 * @param id - Thread id.
 * @param reason - Why it was dropped.
 * @returns The archived thread.
 * @throws when `reason` is empty.
 */
export async function dropThread(host: AssistantMemory, id: string, reason: string): Promise<ResearchThread> {
  const trimmed = reason.trim()
  if (trimmed.length === 0) {
    throw new Error('assistant_research drop requires a reason: a thread dropped without one gets reopened')
  }
  return setThreadStatus(host, id, 'dropped', { reason: trimmed })
}

/**
 * Promote a thread: the question got answered. The destination must already exist, so one writer
 * owns each room and the archived thread's `promotedTo` stays checkable.
 * @param host - The home service whose research room is written.
 * @param id - Thread id.
 * @param target - Id of the memory record or skill name that carries the answer.
 * @returns The archived thread.
 * @throws when the destination does not exist.
 */
export async function promoteThread(host: AssistantMemory, id: string, target: PromoteTarget): Promise<ResearchThread> {
  const destination = target.promotedTo.trim()
  if (destination.length === 0) throw new Error('assistant_research promote requires promotedTo')
  const memory = await host.memory.read(destination)
  const archivedMemory = memory ?? await host.memory.readArchived(destination)
  const skills = await scanLearnedSkills(host.paths.skillsDir)
  const knowledge = await host.listKnowledge()
  const known = archivedMemory !== undefined
    || skills.skills.some(skill => skill.name === destination)
    || knowledge.entries.some(page => page.id === destination)
  if (!known) {
    throw new Error(`promotedTo names "${destination}", which is neither a memory record, a learned skill, nor a knowledge page`)
  }
  return setThreadStatus(host, id, 'promoted', { promotedTo: destination })
}
