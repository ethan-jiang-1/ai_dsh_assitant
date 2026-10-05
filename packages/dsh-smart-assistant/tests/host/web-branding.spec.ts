import { describe, expect, it } from 'vitest'
import { DEFAULT_WEB_TITLE, webBrandingInjection } from '../../src/web-branding.ts'

describe('web branding injection', () => {
  it('is one body script row', () => {
    const row = webBrandingInjection()
    expect(row.kind).toBe('script')
    expect(row.placement).toBe('body')
  })

  it('embeds the title as a JSON literal', () => {
    expect(webBrandingInjection('专家助手 · dev').text).toContain('"专家助手 · dev"')
  })

  it('brands the tab with the assistant title by default', () => {
    expect(webBrandingInjection().text).toContain(JSON.stringify(DEFAULT_WEB_TITLE))
  })

  it('replaces the favicon with an inline SVG data URI', () => {
    const text = webBrandingInjection().text
    expect(text).toContain('data:image/svg+xml,')
    expect(text).toContain("querySelectorAll('link[rel~=\"icon\"]')")
  })

  it('applies immediately, without waiting for DOMContentLoaded', () => {
    expect(webBrandingInjection().text).not.toContain('DOMContentLoaded')
  })

  it('cannot close the script element early, whatever the title carries', () => {
    for (const hostile of ['</script>', '</SCRIPT x>', 'a</scriptb', '<svg onload=alert(1)>']) {
      expect(webBrandingInjection(hostile).text).not.toContain('</script')
      expect(webBrandingInjection(hostile).text).not.toContain('</SCRIPT')
    }
  })
})
