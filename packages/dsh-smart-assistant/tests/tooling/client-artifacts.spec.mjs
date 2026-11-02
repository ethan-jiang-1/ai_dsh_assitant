/**
 * The client build's artifact pruning: tsc emits one .js/.d.ts per source module, tsdown inlines
 * the tree into `lib/client/index.js`, and only the four entry artifacts are reachable from the
 * `./client` export. `files: ["lib"]` would otherwise ship the dead chunks.
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it, afterEach } from 'vitest'
import { pruneClientChunks } from '../../scripts/prune-client-chunks.mjs'
import { temp, disposeTempDirs } from './verify-gates-harness.mjs'

afterEach(disposeTempDirs)

describe('pruneClientChunks', () => {
  it('keeps the four entry artifacts and removes every nested chunk', () => {
    const dir = temp('client-prune-')
    for (const name of ['index.js', 'index.js.map', 'index.d.ts', 'index.d.ts.map']) {
      writeFileSync(join(dir, name), 'keep', 'utf8')
    }
    mkdirSync(join(dir, 'chrome'), { recursive: true })
    writeFileSync(join(dir, 'chrome', 'brand.js'), 'dead', 'utf8')
    writeFileSync(join(dir, 'chrome', 'brand.d.ts'), 'dead', 'utf8')

    const removed = pruneClientChunks(dir)
    expect(removed).toHaveLength(2)
    expect(existsSync(join(dir, 'chrome', 'brand.js'))).toBe(false)
    for (const name of ['index.js', 'index.js.map', 'index.d.ts', 'index.d.ts.map']) {
      expect(existsSync(join(dir, name))).toBe(true)
    }
  })

  it('fails the build when tsdown did not produce the entry', () => {
    const dir = temp('client-prune-missing-')
    expect(() => pruneClientChunks(dir)).toThrow('index.js is missing')
  })
})
