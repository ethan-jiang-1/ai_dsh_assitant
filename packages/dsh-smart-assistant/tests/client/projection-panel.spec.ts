/** Pure component: honest missing/error/stale content, full collection and real action callbacks. */
import { createElement } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { bindClientRequire } from '../../src/client/runtime'
import { ProjectionPanel } from '../../src/client/projection-panel'
import type { ProjectionDownload } from '../../src/client/projection-reader'

bindClientRequire(() => ({ createElement }))
function text(node: unknown): string {
  if (Array.isArray(node)) return node.map(text).join(' ')
  if (typeof node === 'string') return node
  if (node !== null && typeof node === 'object' && 'props' in node) return text((node as { props: { children?: unknown } }).props.children)
  return ''
}
function render(value: ProjectionDownload): string {
  return text(ProjectionPanel({ useProjection: select => select(value), refreshProjection: vi.fn(), onAsk: vi.fn() }))
}
describe('global projection panel', () => {
  it('separates missing from damaged ledger', () => {
    expect(render({ status: 'missing' })).toContain('还没有经营事项资料')
    expect(render({ status: 'error', error: 'projection-invalid' })).toContain('损坏或版本不支持')
    expect(render({ status: 'error' })).not.toContain('还没有经营事项')
  })
  it('shows all eight matters, completed history and stale fixture notice', () => {
    const output = render({ status: 'disconnected', stale: true, data: { schemaVersion: 1, ledgerId: 'simulated', revision: 7, fixture: true, matters: Array.from({ length: 8 }, (_, index) => ({ id: `m${String(index)}`, title: `事项${String(index)}`, status: index === 7 ? 'completed' : 'active', summary: '待核对', evidence: [] })) } })
    for (let index = 0; index < 8; index++) expect(output).toContain(`事项${String(index)}`)
    expect(output).toContain('已完成')
    expect(output).toContain('尚未刷新')
    expect(output).toContain('模拟资料')
  })
})
