/**
 * The first mile: the blank-session hero mark and the strip above the composer.
 *
 * These two seats are where a first-time principal looks, and the walkthrough (2026-09-26)
 * found nothing of the product there. The test asserts the copy, the one action, and that
 * `apply` actually claims both seats.
 *
 * The browser half is a classic script (zero imports/exports — see its file header), so the
 * test installs the page-global facade, evaluates the script, and materializes the factory
 * with a module-table require stub, the same harness as client-panels.spec.ts.
 */
import { createElement } from 'react'
import { describe, expect, it } from 'vitest'

interface Registration {
  id: string
  factory: (require: (spec: string) => unknown) => Record<string, unknown>
}

const registrations: Registration[] = []
;(globalThis as Record<string, unknown>).__ModuleLoader__ = {
  load: (registration: Registration) => { registrations.push(registration) },
}
// @ts-expect-error TS2306 the browser half is intentionally not a module
await import('../src/client/index.ts')

interface Element {
  type: unknown
  props: Record<string, unknown> & { children?: unknown }
}

interface ClientExports {
  apply: (ctx: unknown) => void
  AssistantHeroMark: (props: { size: number, className?: string }) => Element
  FirstMileDock: (props: { openRoom?: (kind: string) => void }) => Element
}

function materialize(): ClientExports {
  const registration = registrations[0]
  if (registration === undefined) throw new Error('no registration was submitted')
  return registration.factory((spec) => {
    if (spec === 'react') return { createElement }
    throw new Error(`unexpected module-table require: ${spec}`)
  }) as unknown as ClientExports
}

/** Every element of one tag in a tree, depth-first. */
function elementsOf(node: unknown, tag: string): Element[] {
  if (node === null || node === undefined || typeof node !== 'object') return []
  if (Array.isArray(node)) return node.flatMap(child => elementsOf(child, tag))
  const element = node as Element
  const own = element.type === tag ? [element] : []
  return [...own, ...elementsOf(element.props?.children, tag)]
}

/** Every string in a tree, so copy can be asserted without a DOM. */
function textsOf(node: unknown): string[] {
  if (typeof node === 'string') return [node]
  if (node === null || node === undefined || typeof node !== 'object') return []
  if (Array.isArray(node)) return node.flatMap(textsOf)
  return textsOf((node as Element).props?.children)
}

/** A browser context that runs every inject callback, recording slot registrations. */
function recordingContext(): {
  ctx: unknown
  registered: { name: string, declaration: Record<string, unknown> }[]
} {
  const registered: { name: string, declaration: Record<string, unknown> }[] = []
  const ctx = {
    slots: {
      // Slot registrations ride `inject` callbacks; run them so the declarations are visible.
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

describe('first-mile seats', () => {
  it('renders the deployment mark at the size the hero asks for', () => {
    const mark = materialize().AssistantHeroMark({ size: 34, className: 'hero-mark' })
    expect(mark.type).toBe('svg')
    expect(mark.props.width).toBe(34)
    expect(mark.props.height).toBe(34)
    expect(mark.props.className).toBe('hero-mark')
    expect(mark.props.children).toHaveLength(3)
  })

  it('tells a first-time principal what to say and offers the desk', () => {
    const opened: string[] = []
    const dock = materialize().FirstMileDock({ openRoom: kind => { opened.push(kind) } })

    const copy = textsOf(dock).join(' ')
    // The two gaps the walkthrough named: what do I say first, and what can this thing do.
    expect(copy).toContain('第一次来')
    expect(copy).toContain('例：')
    expect(copy).toContain('敲 / 看它现在能做什么')

    const buttons = elementsOf(dock, 'button')
    expect(buttons).toHaveLength(1)
    expect(textsOf(buttons[0]).join('')).toBe('打开我的桌面')
    ;(buttons[0]?.props.onClick as () => void)()
    expect(opened).toEqual(['desk'])
  })

  it('claims the hero mark and the blank-session dock when applied', () => {
    const { ctx, registered } = recordingContext()
    materialize().apply(ctx)

    const names = registered.map(entry => entry.name)
    expect(names).toContain('conversation.hero.brand.mark')
    expect(names).toContain('conversation.input.dock')
    const dock = registered.find(entry => entry.name === 'conversation.input.dock')
    expect(dock?.declaration.id).toBe('assistant-first-mile')
    // The dock's action must reach the opener through the inject face, not a closure over ctx.
    expect(typeof (dock?.declaration.inject as () => unknown)()).toBe('object')
  })
})
