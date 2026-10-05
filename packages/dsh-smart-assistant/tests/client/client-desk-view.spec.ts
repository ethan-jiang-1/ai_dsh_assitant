/**
 * The desk as a conversation view (desk-primary-view proposal, 2026-10-06): the desk stops
 * being only a right-sidebar tab and claims a first-class view beside chat.
 *
 * Acceptance points:
 * - `apply` claims the `conversation.view` seat with id `dsh-smart-assistant-desk-view`,
 *   zh label 「桌面」, and a session-scoped inject that supplies the body's `sessionId` —
 *   the shape mirrored from vendor ui-chat's chat view registration.
 * - The body delegates to the same panel wrapper the room tab uses, so the session binding,
 *   loading and empty states are the room tab's, not a second implementation.
 * - The registration must NOT try to replace chat as the default view (vendor hardcodes the
 *   chat fallback) nor the blank-phase hero (vendor-owned; the first-mile dock owns that) —
 *   this suite pins that the claim is exactly one view-tab entry, nothing more.
 *
 * The browser half is a classic script (zero imports/exports), so the test installs the
 * page-global facade, evaluates the script, then materializes the factory — the same harness
 * as client-first-mile.spec.ts.
 */
import { describe, expect, it } from 'vitest'
import { inertReactShim, loadClientRegistration, materializeClient } from '../support/client-harness.ts'

const registration = await loadClientRegistration()

interface MaterializedExports {
  apply: (ctx: unknown) => void
  DeskViewBody: (props?: { sessionId?: string }) => { type: unknown, props: Record<string, unknown> }
}
const materialize = (): MaterializedExports =>
  materializeClient(registration, inertReactShim()) as unknown as MaterializedExports

function recordingContext(): {
  ctx: unknown
  registered: { name: string, declaration: Record<string, unknown> }[]
} {
  const registered: { name: string, declaration: Record<string, unknown> }[] = []
  const ctx = {
    slots: {
      inject: (_name: string, contribute: () => unknown) => { contribute() },
      register: (declaration: { name: string }) => {
        registered.push({ name: declaration.name, declaration })
        return undefined
      },
    },
    sidebarRightTabs: { register: () => undefined },
    sidebarRight: { openTab: () => {} },
    inject: () => undefined,
  }
  return { ctx, registered }
}

describe('desk primary view', () => {
  it('claims exactly one conversation.view entry beside the room tabs', () => {
    const { ctx, registered } = recordingContext()
    materialize().apply(ctx)

    const views = registered.filter(entry => entry.name === 'conversation.view')
    expect(views).toHaveLength(1)
    const declaration = views[0]?.declaration
    expect(declaration?.id).toBe('dsh-smart-assistant-desk-view')
    expect(declaration?.order).toBe(5)
    expect(typeof declaration?.label).toBe('function')
    expect((declaration?.label as () => string)()).toBe('桌面')
  })

  it('supplies the body its session identity through the inject face, not a closure', () => {
    const { ctx, registered } = recordingContext()
    materialize().apply(ctx)
    const declaration = registered.find(entry => entry.name === 'conversation.view')?.declaration
    const inject = declaration?.inject as (sessionId: string) => { sessionId: string }
    expect(typeof inject).toBe('function')
    expect(inject('session-1')).toEqual({ sessionId: 'session-1' })
  })

  it('renders the room tab\'s loading state, not a second desk implementation', () => {
    const body = materialize().DeskViewBody as
      (props?: { sessionId?: string }) => { type: unknown, props: Record<string, unknown> }
    const tree = JSON.stringify(body({ sessionId: 'session-1' }))
    // The wrapper's loading branch (session known, slice not yet read) must show the same
    // copy the room tab shows — the view body must not invent its own states.
    expect(tree).toContain('正在读这个会话的桌面')
  })

  it('exports DeskViewBody for the view seat', () => {
    const exports = materialize()
    expect(typeof exports.DeskViewBody).toBe('function')
  })
})
