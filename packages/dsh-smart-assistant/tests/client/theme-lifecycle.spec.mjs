// @vitest-environment happy-dom
/**
 * The theme contract block is a global stylesheet, so it follows the vendor ownership rule
 * (`ui-theme/src/client/styles.ts`): one effect per sheet, `data-plugin`/`data-plugin-css`
 * markers, and a disposer that removes the tag. The colours themselves are pinned by
 * `theme.spec.ts`; this pins the lifetime that file cannot see.
 */
import { describe, expect, it } from 'vitest'
import { installThemeVars } from '../../src/client/chrome/theme.ts'

describe('theme vars lifetime', () => {
  it('injects under an owning effect, marks the sheet, and removes it on dispose', () => {
    const disposers = []
    const ctx = { effect: (run, label) => { labels.push(label); disposers.push(run()) } }
    const labels = []
    installThemeVars(ctx)

    const style = document.getElementById('dsha-theme-vars')
    expect(style).not.toBeNull()
    expect(style.dataset.plugin).toBe('dsh-smart-assistant')
    expect(style.dataset.pluginCss).toBe('dsh-smart-assistant/theme-vars')
    expect(style.textContent).toContain('--dsha-accent')
    expect(labels).toEqual(['assistant-theme: vars'])

    for (const dispose of disposers.splice(0)) dispose()
    expect(document.getElementById('dsha-theme-vars')).toBeNull()
  })

  it('does nothing without a document (headless composition)', () => {
    const saved = globalThis.document
    // The module reads the global at call time, so hiding it proves the guard rather than trusting it.
    Reflect.deleteProperty(globalThis, 'document')
    try {
      let called = false
      installThemeVars({ effect: () => { called = true } })
      expect(called).toBe(false)
    } finally {
      globalThis.document = saved
    }
  })
})
