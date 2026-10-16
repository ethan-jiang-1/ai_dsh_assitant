/**
 * Fixtures for the home-document contract core (scripts/checks/gates/home-doc-contract.mjs):
 * every room constant the layout declares must be named in `docs/home.md`, and so must every room
 * tool. Plain .mjs (vitest runs it; the type gate does not include it).
 */
import { describe, expect, it } from 'vitest'
import { homeDocContractProblems } from '../../../../scripts/checks/gates/home-doc-contract.mjs'

const layout = ["export const MEMORY_ROOM = 'memories'", "export const ARCHIVE_DIRECTORY_NAME = 'archive'"].join('\n')
const document = 'rooms: memories, archive · tools: assistant_memory'
const fixture = overrides => ({
  layoutText: layout,
  documentText: document,
  roomConstants: ['MEMORY_ROOM', 'ARCHIVE_DIRECTORY_NAME'],
  tools: ['assistant_memory'],
  ...overrides,
})

describe('homeDocContractProblems', () => {
  it('accepts a document that names every declared room and tool', () => {
    expect(homeDocContractProblems(fixture({}))).toEqual([])
  })

  it('flags a constant the layout does not declare', () => {
    const problems = homeDocContractProblems(fixture({ roomConstants: ['MEMORY_ROOM', 'RESEARCH_ROOM'] }))
    expect(problems).toEqual(['layout.ts does not declare RESEARCH_ROOM'])
  })

  it('flags a declared room value the document never mentions', () => {
    const problems = homeDocContractProblems(fixture({ documentText: 'tools: assistant_memory' }))
    expect(problems).toHaveLength(2)
    expect(problems[0]).toContain('docs/home.md never mentions memories')
    expect(problems[1]).toContain('docs/home.md never mentions archive')
  })

  it('flags a room tool the document never mentions (the assistant_knowledge red-control case)', () => {
    const problems = homeDocContractProblems(fixture({ tools: ['assistant_memory', 'assistant_knowledge'] }))
    expect(problems).toEqual(['docs/home.md never mentions assistant_knowledge'])
  })
})
