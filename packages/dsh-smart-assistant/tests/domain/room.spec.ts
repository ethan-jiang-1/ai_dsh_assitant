/**
 * The room store is shared by two rooms with different lifecycles, so these tests pin the substrate
 * they agree on: safe ids, atomic writes, archiving that keeps history readable, and — most
 * importantly — reporting unreadable files instead of dropping them silently.
 */

import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
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

  it('refuses to write an id that is not a safe file name', async () => {
    const room = await fixtureRoom()

    await expect(room.write('../escape', {}, 'body')).rejects.toThrow(/not a safe file name/)
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

  it('treats a missing directory as an empty room', async () => {
    const room = await fixtureRoom()
    await mkdir(join(room.dir, '..'), { recursive: true })

    const listing = await room.list()

    expect(listing.entries).toEqual([])
    expect(listing.failures).toEqual([])
  })
})
