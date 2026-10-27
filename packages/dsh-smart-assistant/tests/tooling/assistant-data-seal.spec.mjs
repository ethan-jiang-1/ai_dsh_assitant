/**
 * Encrypted transport: seal a bundle directory into one AES-256/PBKDF2 file, unseal it into a
 * fresh directory, and never accept the passphrase as a command-line value. This is encryption,
 * not a signature; tests use an environment variable and skip when openssl/tar are absent.
 */

import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { sealBundle, unsealBundle } from '../../src/cli/assistant-data.ts'
import { temp } from './verify-gates-harness.mjs'

const envKey = 'ASSISTANT_DATA_TEST_PASSPHRASE'
function tools() {
  try {
    execFileSync('openssl', ['version'], { stdio: 'ignore' })
    execFileSync('tar', ['--version'], { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

describe.skipIf(!tools())('assistant-data seal/unseal', () => {
  afterEach(() => { delete process.env[envKey] })

  it('round-trips a bundle and refuses a missing passphrase', async () => {
    const root = temp('data-seal-')
    const source = join(root, 'bundle')
    mkdirSync(source, { recursive: true })
    writeFileSync(join(source, 'SOUL.md'), 'sensitive but portable\n', 'utf8')
    const sealed = join(root, 'bundle.enc')
    process.env[envKey] = 'correct horse battery staple'
    const result = await sealBundle({ inDir: source, outFile: sealed, passphraseEnv: envKey })
    expect(result.bytes).toBeGreaterThan(0)
    expect(existsSync(sealed)).toBe(true)

    const restored = join(root, 'restored')
    await unsealBundle({ inFile: sealed, outDir: restored, passphraseEnv: envKey })
    expect(readFileSync(join(restored, 'SOUL.md'), 'utf8')).toBe('sensitive but portable\n')

    delete process.env[envKey]
    await expect(sealBundle({ inDir: source, outFile: join(root, 'again.enc'), passphraseEnv: envKey }))
      .rejects.toThrow('set ASSISTANT_DATA_TEST_PASSPHRASE')
  })
})
