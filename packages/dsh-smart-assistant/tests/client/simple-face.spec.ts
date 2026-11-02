/**
 * Simple density: the desk keeps the board but hides the activity tab and the proactive rows,
 * shows one next thing, and offers the standard-density switch. The face lives in
 * `src/client/projection/simple-face.ts`; the fixture renders the full panel.
 */
import { describe, expect, it, vi } from 'vitest'
import { createProjectionViewStore } from '../../src/client/projection/projection-view'
import { getUiModeStore, initUiModeStore } from '../../src/client/chrome/ui-mode'
import { defineStore } from '@deepseek-ai/dsh-client-store'
import { ProjectionPanel } from '../../src/client/projection/projection-panel'
import type { ProjectionDownload } from '../../src/client/projection/projection-reader'
import { findButton, panelProps, text } from '../support/projection-harness.ts'

describe('simple interface mode', () => {
  it('keeps the board but hides the activity tab and the proactive rows', () => {
    const view = createProjectionViewStore(defineStore).create()
    const value: ProjectionDownload = {
      status: 'ready',
      data: {
        schemaVersion: 2 as const, ledgerId: 'test', revision: 1, receipts: [], unclaimed: [],
        matters: [{ id: 'a', title: '事项A', status: 'active', summary: '', responsible: '', revision: 1, times: {}, proposals: [], evidence: [] }],
      },
    }
    initUiModeStore({ getItem: () => 'simple', setItem: () => {} })
    const output = text(ProjectionPanel(panelProps(value, view)))
    expect(output).toContain('事项A')
    expect(output).not.toContain('流水')
    expect(output).not.toContain('它替你看过')
    expect(output).not.toContain('让它替你盯')
    initUiModeStore({ getItem: () => 'standard', setItem: () => {} })
  })

  it('shows one card for the first active matter and the show-more switch', () => {
    const view = createProjectionViewStore(defineStore).create()
    const value: ProjectionDownload = {
      status: 'ready',
      data: {
        schemaVersion: 2 as const, ledgerId: 'test', revision: 1, receipts: [], unclaimed: [],
        matters: [
          { id: 'a', title: '事项A', status: 'active', summary: '先做 A', responsible: '', revision: 1, times: { nextCheckpoint: '2026-10-24' }, proposals: [], evidence: [] },
          { id: 'b', title: '事项B', status: 'completed', summary: '', responsible: '', revision: 1, times: {}, proposals: [], evidence: [] },
        ],
      },
    }
    initUiModeStore({ getItem: () => 'simple', setItem: () => {} })
    const simple = text(ProjectionPanel(panelProps(value, view)))
    expect(simple).toContain('事项A')
    expect(simple).not.toContain('事项B')
    expect(simple).toContain('先做 A')
    expect(simple).toContain('还有 1 件在账上')
    const more = findButton(ProjectionPanel(panelProps(value, view)), '显示更多 · 切到标准')
    expect(more).toBeDefined()
    more?.onClick?.()
    expect(getUiModeStore().getSnapshot()).toBe('standard')
    const standard = text(ProjectionPanel(panelProps(value, view)))
    expect(standard).toContain('All matters')
    expect(standard).toContain('Activity')
    expect(standard).toContain('事项B')
  })

  it('offers the first unclaimed fragment when there is no matter to show', () => {
    const view = createProjectionViewStore(defineStore).create()
    const onClaim = vi.fn()
    const value: ProjectionDownload = {
      status: 'ready',
      data: {
        schemaVersion: 2 as const, ledgerId: 'test', revision: 1, receipts: [],
        unclaimed: [{ id: 'u-1', note: '有一笔二期款已经付了', sessionId: 's1' }],
        matters: [],
      },
    }
    initUiModeStore({ getItem: () => 'simple', setItem: () => {} })
    const output = ProjectionPanel(panelProps(value, view, { onClaim }))
    expect(text(output)).toContain('有一条还没归户的事')
    expect(text(output)).toContain('有一笔二期款已经付了')
    findButton(output, '认领这件事')?.onClick?.()
    expect(onClaim).toHaveBeenCalledWith('u-1')
    initUiModeStore({ getItem: () => 'standard', setItem: () => {} })
  })
})
