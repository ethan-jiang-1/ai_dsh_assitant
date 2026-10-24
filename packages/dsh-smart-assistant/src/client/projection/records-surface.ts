/**
 * "它记下的": the read-only records surface behind the one-page home.
 *
 * Why (2026-10-24 audit): the home's "它记下的" used to call the conversation right sidebar's
 * `openBeside('knowledgeRoom')`. On the main panel there is no right sidebar, so the link was a
 * dead door. This surface is the main panel's own answer: knowledge, memory, skills and research
 * read in one place, with a way back to 今天. Editing stays in the conversation's room tabs; this
 * view never writes.
 *
 * @module dsh-smart-assistant/client/projection/records-surface
 */

import type { ReactNode } from 'react'
import { createElement as ce } from '../chrome/runtime'
import { humanTime } from '../chrome/format'
import { useDesk, type DeskData } from '../rooms/room-data-core'

const STYLES = [
  '.dsha-records{display:flex;flex-direction:column;gap:18px;padding:28px clamp(20px,6vw,72px) 40px;height:100%;overflow-y:auto;box-sizing:border-box;}',
  '.dsha-records-head{display:flex;align-items:baseline;gap:12px;flex-wrap:wrap;}',
  '.dsha-records-title{margin:0;font-size:22px;font-weight:600;color:var(--dsw-alias-label-primary);}',
  '.dsha-records-sub{font-size:13px;color:var(--dsw-alias-label-tertiary);}',
  '.dsha-records-links{margin-left:auto;}',
  '.dsha-records-link{border:0;background:none;color:var(--dsw-alias-label-secondary);font:inherit;font-size:13px;cursor:pointer;padding:2px 0;}',
  '.dsha-records-link:hover{color:var(--dsw-alias-label-primary);}',
  '.dsha-records-body{width:min(780px,100%);margin:0 auto;display:flex;flex-direction:column;gap:22px;}',
  '.dsha-records-section{display:flex;flex-direction:column;gap:8px;}',
  '.dsha-records-section-head{display:flex;align-items:baseline;gap:8px;border-bottom:0.5px solid var(--dsw-alias-border-l2);padding-bottom:6px;}',
  '.dsha-records-section-title{margin:0;font-size:15px;font-weight:600;color:var(--dsw-alias-label-primary);}',
  '.dsha-records-count{font-size:12px;color:var(--dsw-alias-label-tertiary);}',
  '.dsha-records-row{display:flex;flex-direction:column;gap:3px;padding:8px 0;}',
  '.dsha-records-row-head{display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;}',
  '.dsha-records-row-title{font-size:14px;font-weight:600;color:var(--dsw-alias-label-primary);overflow-wrap:anywhere;}',
  '.dsha-records-row-meta{font-size:12px;color:var(--dsw-alias-label-tertiary);}',
  '.dsha-records-row-line{margin:0;font-size:13px;line-height:1.6;color:var(--dsw-alias-label-secondary);overflow-wrap:anywhere;}',
  '.dsha-records-empty{margin:12px 0;font-size:13px;color:var(--dsw-alias-label-tertiary);}',
  '.dsha-records-note{width:min(780px,100%);margin:0 auto;font-size:12px;color:var(--dsw-alias-label-tertiary);}',
].join('')

const KNOWLEDGE_STATUS: Record<string, string> = { draft: '草稿', stable: '已批准' }

type Knowledge = NonNullable<DeskData['knowledge']>[number]
type Memory = NonNullable<DeskData['memories']>[number]
type Skill = NonNullable<DeskData['skills']>[number]

function line(text: string | undefined, max = 180): string {
  if (text === undefined) return ''
  const first = text.split('\n').map(part => part.trim()).find(part => part !== '') ?? ''
  return first.length > max ? `${first.slice(0, max)}…` : first
}

function when(value: string | undefined): string {
  return value === undefined || value === '' ? '' : humanTime(value)
}

function Section(props: { title: string, count: number, children?: ReactNode }): ReturnType<typeof ce> {
  return ce('section', { className: 'dsha-records-section' },
    ce('div', { className: 'dsha-records-section-head' },
      ce('h2', { className: 'dsha-records-section-title' }, props.title),
      ce('span', { className: 'dsha-records-count' }, `${String(props.count)} 条`)),
    props.children)
}

function KnowledgeRow(props: { row: Knowledge }): ReturnType<typeof ce> {
  const row = props.row
  const status = row.status === undefined ? '' : KNOWLEDGE_STATUS[row.status] ?? row.status
  return ce('div', { className: 'dsha-records-row' },
    ce('div', { className: 'dsha-records-row-head' },
      ce('span', { className: 'dsha-records-row-title' }, row.title ?? row.id ?? '未命名'),
      ce('span', { className: 'dsha-records-row-meta' }, [status, when(row.updated)].filter(Boolean).join(' · '))),
    ce('p', { className: 'dsha-records-row-line' }, line(row.description ?? row.excerpt)))
}

function MemoryRow(props: { row: Memory }): ReturnType<typeof ce> {
  return ce('div', { className: 'dsha-records-row' },
    ce('p', { className: 'dsha-records-row-line' }, line(props.row.text)),
    ce('span', { className: 'dsha-records-row-meta' }, when(props.row.updated)))
}

function SkillRow(props: { row: Skill }): ReturnType<typeof ce> {
  const row = props.row
  return ce('div', { className: 'dsha-records-row' },
    ce('div', { className: 'dsha-records-row-head' },
      ce('span', { className: 'dsha-records-row-title' }, row.name ?? '未命名'),
      ce('span', { className: 'dsha-records-row-meta' }, row.count === undefined ? '' : `用过 ${String(row.count)} 次`)),
    ce('p', { className: 'dsha-records-row-line' }, line(row.description)))
}

function rows<T>(items: readonly T[], row: (item: T, index: number) => ReturnType<typeof ce>): ReturnType<typeof ce>[] {
  return items.slice(0, 8).map((item, index) => row(item, index))
}

/**
 * Pure records view; `RecordsSurface` supplies the live desk data so this can be tested without
 * the room store.
 * @param props - Desk rows (may be absent while loading) and the way back home.
 * @returns The records page.
 */
export function RecordsView(props: { data: DeskData | undefined, onBackHome: () => void }): ReturnType<typeof ce> {
  // The rooms hold the agent's raw material (deprecated meta pages, internal rules, research);
  // this page is the principal's read view, so it shows only what is still in use and about them.
  const knowledge = (props.data?.knowledge ?? []).filter(row => row.status !== 'deprecated')
  const memories = (props.data?.memories ?? []).filter(row => row.kind !== 'rule')
  const skills = props.data?.skills ?? []
  const loading = props.data === undefined
  const empty = !loading && knowledge.length + memories.length + skills.length === 0
  const body = ce('div', { className: 'dsha-records-body' },
    ce(Section, { title: '知识', count: knowledge.length },
      knowledge.length === 0
        ? ce('p', { className: 'dsha-records-empty' }, '还没有知识页。')
        : rows(knowledge, row => ce(KnowledgeRow, { key: row.id ?? row.title ?? 'k', row }))),
    ce(Section, { title: '记忆', count: memories.length },
      memories.length === 0
        ? ce('p', { className: 'dsha-records-empty' }, '还没有记住的事。')
        : rows(memories, row => ce(MemoryRow, { key: row.id ?? row.text ?? 'm', row }))),
    ce(Section, { title: '技能', count: skills.length },
      skills.length === 0
        ? ce('p', { className: 'dsha-records-empty' }, '还没有学到的技能。')
        : rows(skills, row => ce(SkillRow, { key: row.name ?? 's', row }))),
    )
  return ce('main', { className: 'dsha-records', 'data-assistant-records': true },
    ce('style', {}, STYLES),
    ce('header', { className: 'dsha-records-head' },
      ce('h1', { className: 'dsha-records-title' }, '它记下的'),
      ce('span', { className: 'dsha-records-sub' }, '只显示仍在用的知识、跟你有关的记忆和它学会的手艺；归档与内部规则不在这里。'),
      ce('div', { className: 'dsha-records-links' },
        ce('button', { className: 'dsha-records-link', type: 'button', onClick: () => props.onBackHome() }, '回到今天'))),
    loading
      ? ce('p', { className: 'dsha-records-note' }, '正在读取它记下的东西…')
      : empty
        ? ce('p', { className: 'dsha-records-empty' }, '还没有记下的东西。它会在做事的过程里攒。')
        : body)
}

/**
 * The live records surface: binds the shared desk store and renders the pure view.
 * @param props - The way back home.
 * @returns The records page.
 */
export function RecordsSurface(props: { onBackHome: () => void }): ReturnType<typeof ce> {
  const walk = useDesk()
  return ce(RecordsView, { data: walk.data, onBackHome: props.onBackHome })
}
