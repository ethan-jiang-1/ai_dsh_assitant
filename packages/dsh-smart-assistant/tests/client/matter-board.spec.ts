/**
 * Unclaimed fragments as first-class selectable items (principal direction 2026-10-12): the
 * card, the detail's two terminals, one selection, and the honest vanished-selection copy. The
 * board lives in `src/client/projection/matter-board.ts`; the fixture renders the full panel.
 */
import { describe, expect, it, vi } from 'vitest'
import { createProjectionViewStore } from '../../src/client/projection/projection-view'
import { defineStore } from '@deepseek-ai/dsh-client-store'
import { ProjectionPanel } from '../../src/client/projection/projection-panel'
import type { ProjectionDownload } from '../../src/client/projection/projection-reader'
import { findButton, findButtonBySubstring, panelProps, text } from '../support/projection-harness.ts'

describe('unclaimed fragments are first-class selectable items (principal direction 2026-10-12)', () => {
  const fragment = { id: 'u-1', note: '2026-10-11 19:20 收到口头转述：「有一笔二期款已经付了」…', sessionId: 'session-src' }
  const claimFixture = (): ProjectionDownload => ({ status: 'ready', data: { schemaVersion: 2 as const, ledgerId: 'test', revision: 3, receipts: [], unclaimed: [fragment], matters: [
    { id: 'a', title: '事项 A', status: 'active', summary: 'A 摘要', responsible: '', revision: 1, times: {}, proposals: [], evidence: [] },
  ] } })
  const claimProps = (view: ReturnType<ReturnType<typeof createProjectionViewStore>['create']>, onClaim: (id: string) => void) =>
    panelProps(claimFixture(), view, { onClaim })

  it('renders the fragment card as a selectable button whose detail carries note, source and the claim action', () => {
    const view = createProjectionViewStore(defineStore).create()
    const onClaim = vi.fn()
    const output = ProjectionPanel(claimProps(view, onClaim))
    const card = findButtonBySubstring(output, '二期款已经付了')
    expect(card).toBeDefined()
    card?.onClick?.()
    const detail = ProjectionPanel(claimProps(view, onClaim))
    expect(text(detail)).toContain('二期款已经付了')
    expect(text(detail)).toContain('来自 session-src')
    const claimButton = findButton(detail, '认领这件事')
    expect(claimButton).toBeDefined()
    claimButton?.onClick?.()
    expect(onClaim).toHaveBeenCalledWith('u-1')
  })

  it('offers the fragment\'s other terminal — 「是噪音，不归户」 hands the same id back', () => {
    const view = createProjectionViewStore(defineStore).create()
    const onDiscard = vi.fn()
    const props = panelProps(claimFixture(), view, { onDiscard })
    // Select first, then render: the detail carries the proportionate actions for the fragment.
    ProjectionPanel(props)
    view.actions.selectFragment('u-1')
    const detail = ProjectionPanel(props)
    expect(text(detail)).toContain('还没说清是哪件事——认领后原文与来源随附入账')
    const discardButton = findButton(detail, '是噪音，不归户')
    expect(discardButton).toBeDefined()
    discardButton?.onClick?.()
    expect(onDiscard).toHaveBeenCalledWith('u-1')
  })

  it('selecting a matter again clears the fragment selection (one selection, not two)', () => {
    const view = createProjectionViewStore(defineStore).create()
    const onClaim = vi.fn()
    ProjectionPanel(claimProps(view, onClaim))
    view.actions.selectFragment('u-1')
    expect(view.getSnapshot().selected).toEqual({ kind: 'fragment', id: 'u-1' })
    view.actions.selectMatter('a')
    expect(view.getSnapshot().selected).toEqual({ kind: 'matter', id: 'a' })
    expect(text(ProjectionPanel(claimProps(view, onClaim)))).toContain('事项 A')
  })

  it('reports a vanished fragment selection instead of silently falling back', () => {
    const view = createProjectionViewStore(defineStore).create()
    const onClaim = vi.fn()
    view.actions.selectFragment('gone')
    const value: ProjectionDownload = { status: 'ready', data: { schemaVersion: 2 as const, ledgerId: 'test', revision: 1, receipts: [], unclaimed: [], matters: [] } }
    const output = text(ProjectionPanel(panelProps(value, view, { onClaim })))
    expect(output).toContain('所选片段不在当前投影中')
  })
})
