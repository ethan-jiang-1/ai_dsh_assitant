/**
 * The records surface (`src/client/projection/records-surface.ts`): the main panel's answer to
 * the old dead "它记下的" link. It reads the shared desk store, never writes, and always has a
 * way back to 今天.
 */
import { describe, expect, it } from 'vitest'
import { inertReactShim, textsOf } from '../support/client-harness.ts'
import { bindClientRequire } from '../../src/client/chrome/runtime'
import { RecordsView } from '../../src/client/projection/records-surface'
import type { DeskData } from '../../src/client/rooms/room-data-core'

bindClientRequire((spec: string) => {
  if (spec === 'react') return inertReactShim()
  throw new Error(`unexpected module-table require: ${spec}`)
})

function data(): DeskData {
  return {
    knowledge: [
      { id: 'k1', title: '报价 480 万：接不接', status: 'stable', type: 'decision-memo', description: '结论：条件接。', sources: [], excerpt: '' },
      { id: 'k0', title: 'Agent preset semantics', status: 'deprecated', type: 'reference', description: '内部归档。', sources: [], excerpt: '' },
    ],
    memories: [
      { id: 'm1', kind: 'preference', text: '不接受超过 10% 的折扣。', updated: '2026-10-20T09:00:00+08:00' },
      { id: 'm2', kind: 'rule', text: '内部规则：先读台账。', updated: '2026-10-21T09:00:00+08:00' },
    ],
    skills: [{ name: '报价复盘', description: '把报价拆成毛利、现金与交付。', kind: 'learned', count: 3 }],
  }
}

function texts(tree: unknown): string {
  return textsOf(tree).join(' ')
}

describe('RecordsView', () => {
  it('renders knowledge, memory and skills with counts and the way back', () => {
    const tree = RecordsView({ data: data(), onBackHome: () => {} })
    const copy = texts(tree)
    expect(copy).toContain('它记下的')
    expect(copy).toContain('知识')
    expect(copy).toContain('1 条')
    expect(copy).toContain('报价 480 万：接不接')
    expect(copy).toContain('已批准')
    expect(copy).toContain('记忆')
    expect(copy).toContain('不接受超过 10% 的折扣')
    expect(copy).toContain('技能')
    expect(copy).toContain('报价复盘')
    expect(copy).toContain('用过 3 次')
    expect(copy).not.toContain('Agent preset semantics')
    expect(copy).not.toContain('内部规则：先读台账')
    expect(copy).toContain('回到今天')
  })

  it('loads and empty states are honest', () => {
    expect(texts(RecordsView({ data: undefined, onBackHome: () => {} }))).toContain('正在读取')
    expect(texts(RecordsView({ data: {}, onBackHome: () => {} }))).toContain('还没有记下的东西')
  })

  it('calls back home', () => {
    let back = 0
    const tree = RecordsView({ data: data(), onBackHome: () => { back += 1 } })
    const find = (node: unknown): { props?: { onClick?: () => void } } | undefined => {
      if (node === null || typeof node !== 'object') return undefined
      const element = node as { type?: unknown, props?: { children?: unknown, onClick?: () => void } }
      if (element.props?.onClick !== undefined) return element as { props?: { onClick?: () => void } }
      const children = element.props?.children
      const list = Array.isArray(children) ? children : children === undefined ? [] : [children]
      for (const child of list) { const found = find(child); if (found !== undefined) return found }
      return undefined
    }
    find(RecordsView({ data: data(), onBackHome: () => { back += 1 } }))?.props?.onClick?.()
    expect(back).toBe(1)
    void tree
  })
})
