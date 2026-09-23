import { describe, expect, it } from 'vitest'
import { AssistantBrandMark, AssistantBrandName } from '../src/client/index.ts'

describe('sidebar brand occupants', () => {
  it('renders the house mark at the requested size', () => {
    const svg = AssistantBrandMark({ size: 24 })
    expect(svg.type).toBe('svg')
    expect(svg.props.width).toBe(24)
    expect(svg.props.height).toBe(24)
    expect(svg.props.viewBox).toBe('0 0 64 64')
    // Background square, house silhouette, door: three shapes, same as the tab favicon.
    expect(svg.props.children).toHaveLength(3)
  })

  it('names the deployment in the fallback-brand size', () => {
    const span = AssistantBrandName()
    expect(span.type).toBe('span')
    // createElement's children argument does not surface in the props type; narrow for the test.
    const props = span.props as { children: unknown, style: { fontSize: string, whiteSpace: string } }
    expect(props.children).toBe('DSH local assistant')
    expect(props.style.fontSize).toBe('17px')
    expect(props.style.whiteSpace).toBe('nowrap')
  })
})
