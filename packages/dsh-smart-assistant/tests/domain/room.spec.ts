/**
 * The room store is shared by two rooms with different lifecycles, so these tests pin the substrate
 * they agree on: safe ids, atomic writes, archiving that keeps history readable, and — most
 * importantly — reporting unreadable files instead of dropping them silently.
 */

import { chmod, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { Room, isEntryId } from '../../src/domain/home/room.ts'

const roots: string[] = []

async function fixtureRoom(): Promise<Room> {
  const root = await mkdtemp(join(tmpdir(), 'assistant-room-'))
  roots.push(root)
  return new Room(join(root, 'memory'), join(root, 'memory', 'archive'))
}

afterEach(async () => {
  await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true })))
})

describe('isEntryId', () => {
  it('accepts kebab-case file names and rejects anything that could escape the room', () => {
    expect(isEntryId('20260923-note-ab12')).toBe(true)
    expect(isEntryId('note')).toBe(true)
    expect(isEntryId('../escape')).toBe(false)
    expect(isEntryId('sub/dir')).toBe(false)
    expect(isEntryId('UPPER')).toBe(false)
    expect(isEntryId('-leading')).toBe(false)
    expect(isEntryId('')).toBe(false)
  })
})

describe('Room', () => {
  it('writes, lists, and reads entries', async () => {
    const room = await fixtureRoom()
    await room.write('a-1', { id: 'a-1', status: 'active' }, 'First claim.')
    await room.write('b-2', { id: 'b-2', status: 'active' }, 'Second claim.')

    const listing = await room.list()

    expect(listing.failures).toEqual([])
    expect(listing.entries.map(entry => entry.id)).toEqual(['a-1', 'b-2'])
    expect(listing.entries[0]?.body).toBe('First claim.')
    expect((await room.read('a-1'))?.data.status).toBe('active')
  })

  it('replaces an entry with the same id instead of appending', async () => {
    const room = await fixtureRoom()
    await room.write('a-1', { id: 'a-1', status: 'active' }, 'Old claim.')
    await room.write('a-1', { id: 'a-1', status: 'retired' }, 'New claim.')

    const listing = await room.list()

    expect(listing.entries).toHaveLength(1)
    expect(listing.entries[0]?.body).toBe('New claim.')
  })

  it('preserves frontmatter fields this build does not know about', async () => {
    const room = await fixtureRoom()
    await room.write('a-1', { id: 'a-1', status: 'active', owner_note: 'checked by hand' }, 'Claim.')
    await room.write('a-1', { id: 'a-1', status: 'retired' }, 'Claim.')

    const entry = await room.read('a-1')
    expect(entry?.data.owner_note).toBe('checked by hand')
    expect(entry?.data.status).toBe('retired')
  })

  it('refuses a write when the entry changed since it was read', async () => {
    const room = await fixtureRoom()
    const entry = await room.write('a-1', { id: 'a-1', status: 'active' }, 'Claim.')
    await room.write('a-1', { id: 'a-1', status: 'active' }, 'Hand edit happened.')

    await expect(room.write('a-1', { id: 'a-1', status: 'retired' }, 'Stale write.', entry.text))
      .rejects.toThrow('changed since it was read')
    expect((await room.read('a-1'))?.body).toBe('Hand edit happened.')
  })

  it('refuses an archive when the entry changed since it was read', async () => {
    const room = await fixtureRoom()
    const entry = await room.write('a-1', { id: 'a-1', status: 'active' }, 'Claim.')
    await room.write('a-1', { id: 'a-1', status: 'active' }, 'Hand edit happened.')
    await expect(room.archive('a-1', { status: 'superseded' }, entry.text))
      .rejects.toThrow('changed since it was read')
    expect((await room.read('a-1'))?.body).toBe('Hand edit happened.')
  })

  it('survives two concurrent writes of the same id — both resolve, the winner is whole', async () => {
    // BUG-007 F8 (2026-10-07): the temp file name was fixed (`${path}.tmp`), so a concurrent
    // write of the same id lost its temp to the other writer's rename (ENOENT) — the home is a
    // cross-session shared folder, so this is a real (if rare) shape.
    const room = await fixtureRoom()
    const first = room.write('race-1', { id: 'race-1', status: 'active' }, 'First whole body.')
    const second = room.write('race-1', { id: 'race-1', status: 'active' }, 'Second whole body.')
    await expect(Promise.all([first, second])).resolves.toBeDefined()

    const listing = await room.list()
    expect(listing.failures).toEqual([])
    expect(listing.entries).toHaveLength(1)
    expect(['First whole body.', 'Second whole body.']).toContain(listing.entries[0]?.body)
  })

  it('refuses to write an id that is not a safe file name', async () => {
    const room = await fixtureRoom()

    await expect(room.write('../escape', {}, 'body')).rejects.toThrow(/not a safe file name/)
  })

  it('survives two concurrent archives of the same id — both resolve, the copy is whole', async () => {
    // Same class as the write() race above, on the sibling call site that BUG-007 missed:
    // archive() wrote through a fixed `${target}.tmp`, so the second archiver's rename lost its
    // temp to the first one's (ENOENT). archive() then rm's the active file, so a failed rename
    // here does not merely lose a write — it can leave the entry only partly moved.
    const room = await fixtureRoom()
    await room.write('race-2', { id: 'race-2', status: 'active' }, 'Whole archived body.')

    const first = room.archive('race-2', { status: 'superseded' })
    const second = room.archive('race-2', { status: 'superseded' })
    await expect(Promise.all([first, second])).resolves.toBeDefined()

    const archived = await room.readArchived('race-2')
    expect(archived?.body).toBe('Whole archived body.')
    expect(await room.read('race-2')).toBeUndefined()
  })

  it('archives with a field patch and keeps the entry readable', async () => {
    const room = await fixtureRoom()
    await room.write('a-1', { id: 'a-1', status: 'active' }, 'Claim.')

    expect(await room.archive('a-1', { status: 'superseded' })).toBe(true)

    expect(await room.read('a-1')).toBeUndefined()
    const archived = await room.readArchived('a-1')
    expect(archived?.data.status).toBe('superseded')
    expect(archived?.body).toBe('Claim.')
    expect((await room.list()).entries).toEqual([])
  })

  it('reports a file with unusable frontmatter as a failure rather than skipping it', async () => {
    const room = await fixtureRoom()
    await room.write('good-1', { id: 'good-1' }, 'Fine.')
    await writeFile(join(room.dir, 'bad-1.md'), 'no frontmatter at all', 'utf8')
    await writeFile(join(room.dir, 'Not-An-Id.md'), '---\nid: x\n---\nbody', 'utf8')

    const listing = await room.list()

    expect(listing.entries.map(entry => entry.id)).toEqual(['good-1'])
    expect(listing.failures).toHaveLength(2)
    expect(listing.failures.map(failure => failure.reason).join(' ')).toMatch(/frontmatter|entry id/)
  })

  it('reports an unreadable directory as a failure rather than an empty room', async () => {
    // The module promises "a silently skipped file would be an invisible loss of knowledge". A
    // directory we are not allowed to read is the same loss at directory scale: reporting it as
    // an empty room tells curate "nothing here", which is the opposite of the truth. A *missing*
    // directory is genuinely empty (next test) — only permission-class errors are unknown.
    const room = await fixtureRoom()
    await room.write('a-1', { id: 'a-1' }, 'Claim.')
    await chmod(room.dir, 0o000)

    try {
      const listing = await room.list()

      expect(listing.entries).toEqual([])
      expect(listing.failures).toHaveLength(1)
      expect(listing.failures[0]?.path).toBe(room.dir)
    } finally {
      await chmod(room.dir, 0o700)
    }
  })

  it('treats a missing directory as an empty room', async () => {
    const room = await fixtureRoom()
    await mkdir(join(room.dir, '..'), { recursive: true })

    const listing = await room.list()

    expect(listing.entries).toEqual([])
    expect(listing.failures).toEqual([])
  })
})
