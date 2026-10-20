/**
 * The color contract (`src/client/theme.ts` + the whole client source tree): the panels keep
 * to theme tokens, and the contract block's light values clear AA on white.
 *
 * A source-level guard, because the first R8 sweep missed two colours and only a reviewer
 * caught them (R11, narrow review 2026-09-27). Anything the component tests cannot see, this
 * can. Since the theme-token borrowing (R4 survey, 2026-09-27) the components carry no raw
 * colour literals: neutrals ride the vendor `--dsw-alias-*` palette and warn/accent ride the
 * `--dsha-*` contract block (theme.ts) — so the AA claim is checked against that block's LIGHT
 * values (the dark values ride vendor statics and the dark palette, not white).
 *
 * S2 (261007 bigfile-split): the source is multi-module now — the whole-color scan walks
 * every `.ts` under `src/client/` and the contract block comes from `chrome/theme.ts`.
 */
import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'

const clientDir = new URL('../../src/client/', import.meta.url)

/** Every `.ts` under the client tree, sorted by path (the source is grouped into subdirs). */
function collect(dir: URL): URL[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const child = new URL(`${entry.name}${entry.isDirectory() ? '/' : ''}`, dir)
    return entry.isDirectory() ? collect(child) : entry.name.endsWith('.ts') ? [child] : []
  })
}

const source = collect(clientDir)
  .sort((left, right) => left.pathname.localeCompare(right.pathname))
  .map(file => readFileSync(file, 'utf8'))
  .join('\n')

describe('color contract (R8/R11)', () => {
  it('keeps the client on theme tokens, and the colour contract at or above AA on white (R8/R11)', async () => {
    const luminance = (colour: string): number => {
      const hex = colour.replace('#', '')
      const channels = [0, 2, 4].map(index => parseInt(hex.slice(index, index + 2), 16) / 255)
      const linear = channels.map(value => value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4)
      return 0.2126 * linear[0]! + 0.7152 * linear[1]! + 0.0722 * linear[2]!
    }
    const contrastOnWhite = (colour: string): number => (1.05) / (luminance(colour) + 0.05)
    // The discipline: the only quoted hex left in the tree is the brand-mark silhouette — a fixed
    // logo colour that paints its own background and never sits on a theme surface.
    const quoted = [...source.matchAll(/'(#[0-9a-fA-F]{3,8})'/g)].map(match => match[1] as string)
    expect([...new Set(quoted)]).toEqual(['#ffffff'])
    // The light-skin text colours from the contract block must each clear AA on white.
    const lightBlock = source.slice(0, source.indexOf('body[data-ds-dark-theme]'))
    const contract = [...lightBlock.matchAll(/--dsha-(?:warn|accent|success):(#[0-9a-fA-F]{6})/g)]
      .map(match => match[1] as string)
    expect(contract.length).toBeGreaterThanOrEqual(3)
    const below = [...new Set(contract)].filter(colour => contrastOnWhite(colour) < 4.5)
    expect(below).toEqual([])
  })
})
