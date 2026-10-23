/** Operating-brief unattended-turn red line (261018 proactive 片 3): the section text must carry
 * every adjudicated element — the allow list, each forbidden verb by name, the no-standing-schedule
 * rule with its incident anchor, the never-silent-failure rule, and the user-turn boundary.
 * One assertion per element: deleting any element from the text turns exactly its line red. */
import { describe, expect, it } from 'vitest'
import { OPERATING_BRIEF_SECTION_ORDER, OPERATING_BRIEF_TEXT, name } from '../../src/agent/operating-brief/index'

describe('operating-brief unattended red line (261018 片 3)', () => {
  it('teaches the one-page home lane and page-action lines (2026-10-23)', () => {
    expect(OPERATING_BRIEF_TEXT).toContain('Home page lane')
    expect(OPERATING_BRIEF_TEXT).toContain('[首页]')
    expect(OPERATING_BRIEF_TEXT).toContain('entrust or revise the matter')
    expect(OPERATING_BRIEF_TEXT).toContain('Page action lines')
  })

  it('names the section and seats it in the instruction band', () => {
    expect(name).toBe('assistant-operating-brief')
    expect(OPERATING_BRIEF_SECTION_ORDER).toBe(400)
  })

  it('allows reading, noting, proposing, and suggesting a named watch', () => {
    for (const allowed of ['READ freely', '`note` what you observed', '`propose` what you inferred', 'suggest a named watch']) {
      expect(OPERATING_BRIEF_TEXT).toContain(allowed)
    }
  })

  it.each([
    'confirm', 'reject', 'complete', 'revise', 'discard', 'claim', 'promote_page', 'land_skill',
  ])('names the forbidden verb %s explicitly', (verb) => {
    expect(OPERATING_BRIEF_TEXT).toContain(verb)
  })

  it('forbids creating standing schedules, anchored to the 2026-10-13 duplicate incident', () => {
    expect(OPERATING_BRIEF_TEXT).toContain('must NOT create a standing schedule yourself')
    expect(OPERATING_BRIEF_TEXT).toContain('2026-10-13')
  })

  it('makes failure loud: the only silent outcome is success with nothing to report', () => {
    expect(OPERATING_BRIEF_TEXT).toContain('Failure is never silent')
    expect(OPERATING_BRIEF_TEXT).toContain('the only silent outcome is success with nothing to report')
  })

  it('binds unattended turns only — the principal\'s own turn keeps commitment-becomes-a-schedule', () => {
    expect(OPERATING_BRIEF_TEXT).toContain('binds unattended turns only')
    expect(OPERATING_BRIEF_TEXT).toContain("the principal's own turn")
    expect(OPERATING_BRIEF_TEXT).toContain('commitment-becomes-a-schedule')
  })

  it('names the proposal slot as already the compliant shape (Q4 adjudication)', () => {
    expect(OPERATING_BRIEF_TEXT).toContain('proposal slot is already exactly this shape')
  })

  it('names the three unattended turn sources so the line is self-locating', () => {
    expect(OPERATING_BRIEF_TEXT).toContain('maintenance metronome')
    expect(OPERATING_BRIEF_TEXT).toContain('scheduled delivery')
    expect(OPERATING_BRIEF_TEXT).toContain('goal-completion proposal')
  })
})

describe('operating-brief desk capture lane (261018 desk-side-capture 片 2)', () => {
  it('names the "[桌面] " marker and defaults to a verbatim note with provenance', () => {
    expect(OPERATING_BRIEF_TEXT).toContain('[桌面] ')
    expect(OPERATING_BRIEF_TEXT).toContain('`note` it into the ledger verbatim')
    expect(OPERATING_BRIEF_TEXT).toContain('this session as')
  })

  it('requires a same-turn acknowledgement', () => {
    expect(OPERATING_BRIEF_TEXT).toContain('one-sentence acknowledgement in the same turn')
  })

  it('routes the promotion choice through the question interaction, never a self-directed entrust', () => {
    expect(OPERATING_BRIEF_TEXT).toContain('question interaction')
    expect(OPERATING_BRIEF_TEXT).toContain('never `entrust` a captured line on your own')
    expect(OPERATING_BRIEF_TEXT).toContain('takes their explicit answer')
  })

  it('keeps the heavy-door path for entrusts spoken in conversation', () => {
    expect(OPERATING_BRIEF_TEXT).toContain('(the heavy door) keeps the path above')
  })

  it('treats a desk action line as a command: no note of the instruction, exactly one watch schedule (BUG-020)', () => {
    expect(OPERATING_BRIEF_TEXT).toContain('Desk action lines')
    expect(OPERATING_BRIEF_TEXT).toContain('do not `note` the instruction itself')
    expect(OPERATING_BRIEF_TEXT).toContain('create exactly ONE schedule')
  })
})
