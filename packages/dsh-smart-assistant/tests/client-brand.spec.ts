import { createElement } from 'react'
import { describe, expect, it } from 'vitest'

/**
 * The browser half is a client-module registration script, not an importable module: the
 * test installs a fake page-global facade first, imports the script (which submits its
 * registration), then materializes the factory with a module-table require stub.
 */
interface Registration {
  id: string
  factory: (require: (spec: string) => unknown) => Record<string, unknown>
}

const registrations: Registration[] = []
;(globalThis as Record<string, unknown>).__ModuleLoader__ = {
  load: (registration: Registration) => { registrations.push(registration) },
}
// The browser half is deliberately a classic script (zero imports/exports — see the file
// header for why), so TS refuses it as a module import; evaluating it is exactly what the
// shell does with it, and esbuild-run vitest executes it the same way.
// @ts-expect-error TS2306 the browser half is intentionally not a module
await import('../src/client/index.ts')

function materialize(): Record<string, (unknown extends never ? never : unknown)> {
  const registration = registrations[0]
  if (registration === undefined) throw new Error('no registration was submitted')
  return registration.factory((spec) => {
    if (spec === 'react') return { createElement }
    throw new Error(`unexpected module-table require: ${spec}`)
  })
}

describe('client-module registration', () => {
  it('registers the package exactly once under its name', () => {
    expect(registrations).toHaveLength(1)
    expect(registrations[0]?.id).toBe('dsh-smart-assistant')
  })

  it('renders the house mark at the requested size', () => {
    const exports = materialize()
    const mark = exports.AssistantBrandMark as (props: { size: number }) => {
      type: string
      props: { width: number, height: number, viewBox: string, children: unknown[] }
    }
    const svg = mark({ size: 24 })
    expect(svg.type).toBe('svg')
    expect(svg.props.width).toBe(24)
    expect(svg.props.height).toBe(24)
    expect(svg.props.viewBox).toBe('0 0 64 64')
    // Background square, house silhouette, door: three shapes, same as the tab favicon.
    expect(svg.props.children).toHaveLength(3)
  })

  it('names the deployment in the fallback-brand size', () => {
    const exports = materialize()
    const name = exports.AssistantBrandName as () => {
      type: string
      props: { children: unknown, style: { fontSize: string, whiteSpace: string } }
    }
    const span = name()
    expect(span.type).toBe('span')
    expect(span.props.children).toBe('DSH local assistant')
    expect(span.props.style.fontSize).toBe('17px')
    expect(span.props.style.whiteSpace).toBe('nowrap')
  })

  it('declares the slots injection and wires both sidebar brand slots', () => {
    const exports = materialize()
    expect(exports.inject).toEqual(['slots'])
    const calls: string[] = []
    const ctx = {
      slots: {
        // The real registry consumes the contribution callback; a recorder that never
        // calls it would miss the nested registration.
        inject: (slot: string, make: () => unknown) => {
          calls.push(slot)
          void make()
        },
      },
    }
    ;(exports.apply as (ctx: unknown) => void)(ctx)
    expect(calls).toEqual(['sidebar.brand.mark', 'sidebar.brand.name'])
  })
})
