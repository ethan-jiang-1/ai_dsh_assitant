/**
 * The brand occupants (`src/client/brand.ts`): the octopus mark, the deployment name, and the
 * blank-session hero mark.
 *
 * The registration id and the seat wiring live with the entry (client-entry.spec.ts);
 * this file owns the mark/name component contracts.
 *
 * The browser half is multi-module source (relative imports, tsdown-inlined — see the
 * entry's file header), so the harness evaluates it exactly the way the shell does, after
 * installing the page-global facade.
 */
import { describe, expect, it } from 'vitest'
import { inertReactShim, loadClientRegistration, materializeClient } from '../support/client-harness.ts'
import { MARK_TEAL } from '../../src/client/chrome/theme'

const registration = await loadClientRegistration()

function materialize(): Record<string, (unknown extends never ? never : unknown)> {
  // The inert shim, not bare createElement: the desk chip reads the store through useState/useEffect.
  return materializeClient(registration, inertReactShim())
}

describe('client-module registration', () => {
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
    // Background tile, then the shared octopus silhouette: head, two eyes, tentacle strokes.
    const [tile, ...silhouette] = svg.props.children as [{ props: { fill?: string } }, ...{ props: { fill?: string } }[]]
    expect(tile.props.fill).toBe(MARK_TEAL)
    expect(silhouette).toHaveLength(4)
  })

  it('names the deployment in the fallback-brand size', () => {
    const exports = materialize()
    const name = exports.AssistantBrandName as () => {
      type: string
      props: { children: unknown, style: { fontSize: string, whiteSpace: string } }
    }
    const span = name()
    expect(span.type).toBe('span')
    // 2026-10-10 renamed with the principal: 章鱼管家 — many arms tracking many matters.
    expect(span.props.children).toBe('章鱼管家')
    expect(span.props.style.fontSize).toBe('17px')
    expect(span.props.style.whiteSpace).toBe('nowrap')
  })

  it('renders the deployment mark at the size the hero asks for', () => {
    const mark = (materialize().AssistantHeroMark as (props: { size: number, className?: string }) => {
      type: string
      props: { width: number, height: number, className: string, children: unknown[] }
    })({ size: 34, className: 'hero-mark' })
    expect(mark.type).toBe('svg')
    expect(mark.props.width).toBe(34)
    expect(mark.props.height).toBe(34)
    expect(mark.props.className).toBe('hero-mark')
    expect(mark.props.children).toHaveLength(5)
  })
})
