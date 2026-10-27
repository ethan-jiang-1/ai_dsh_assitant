/**
 * Encrypted transport for a data bundle: AES-256/PBKDF2 with the passphrase from an environment
 * variable, never a command-line value. Encryption is not a signature; the recipient still trusts
 * the file source. Extracted from the assistant-data CLI so the maintenance surface stays modular.
 *
 * @module dsh-smart-assistant/cli/assistant-data-seal
 */
import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { chmod, lstat, mkdir, readdir, rm, stat } from 'node:fs/promises'
import { resolve } from 'node:path'

/** Arguments for {@link sealBundle}. */
export interface SealBundleOptions {
  readonly inDir: string
  readonly outFile: string
  /** Environment variable holding the passphrase; never a command-line value. */
  readonly passphraseEnv?: string
}

/** Result of sealing/unsealing. */
export interface SealedBundleResult {
  readonly file: string
  readonly bytes: number
}

/** Arguments for {@link unsealBundle}. */
export interface UnsealBundleOptions {
  readonly inFile: string
  readonly outDir: string
  readonly passphraseEnv?: string
}

/**
 * Seal a bundle directory into one AES-256/PBKDF2 file. The passphrase comes from an environment
 * variable only (default `ASSISTANT_DATA_PASSPHRASE`), so it never lands in shell history or the
 * bundle. This is encryption for transport, not a signature: the recipient still trusts the file
 * source.
 *
 * @param options - Bundle directory and destination file.
 * @returns The sealed file and its byte size.
 * @throws When the passphrase is missing, tools fail, or the destination exists.
 */
export async function sealBundle(options: SealBundleOptions): Promise<SealedBundleResult> {
  const env = options.passphraseEnv ?? 'ASSISTANT_DATA_PASSPHRASE'
  const passphrase = process.env[env]
  if (passphrase === undefined || passphrase.length === 0) throw new Error(`assistant-data: set ${env} to seal the bundle`)
  const outFile = resolve(options.outFile)
  if (existsSync(outFile)) throw new Error(`assistant-data: refusing to overwrite ${outFile}`)
  const source = resolve(options.inDir)
  const tarFile = `${outFile}.${process.pid.toString(36)}-${Date.now().toString(36)}.tgz`
  try {
    execFileSync('tar', ['-czf', tarFile, '-C', source, '.'], { stdio: 'ignore' })
    execFileSync('openssl', ['enc', '-aes-256-cbc', '-pbkdf2', '-salt', '-pass', `env:${env}`, '-in', tarFile, '-out', outFile], { stdio: 'ignore' })
    await chmod(outFile, 0o600)
    return { file: outFile, bytes: (await stat(outFile)).size }
  } finally {
    await rm(tarFile, { force: true })
  }
}

/**
 * Unseal a sealed bundle into a fresh directory. The destination must be absent or empty; the
 * decrypted tarball is removed after extraction.
 *
 * @param options - Sealed file and destination directory.
 * @returns The destination and extracted byte count.
 * @throws When the passphrase is missing, the file is corrupt, or the destination is non-empty.
 */
export async function unsealBundle(options: UnsealBundleOptions): Promise<SealedBundleResult> {
  const env = options.passphraseEnv ?? 'ASSISTANT_DATA_PASSPHRASE'
  if (process.env[env] === undefined || process.env[env]?.length === 0) throw new Error(`assistant-data: set ${env} to unseal the bundle`)
  const inFile = resolve(options.inFile)
  const outDir = resolve(options.outDir)
  const existing = await lstat(outDir).catch(() => undefined)
  if (existing !== undefined && (!existing.isDirectory() || (await readdir(outDir)).length > 0)) {
    throw new Error(`assistant-data: unseal destination is not empty: ${outDir}`)
  }
  await mkdir(outDir, { recursive: true, mode: 0o700 })
  const tarFile = `${outDir}.${process.pid.toString(36)}-${Date.now().toString(36)}.tgz`
  try {
    execFileSync('openssl', ['enc', '-d', '-aes-256-cbc', '-pbkdf2', '-salt', '-pass', `env:${env}`, '-in', inFile, '-out', tarFile], { stdio: 'ignore' })
    execFileSync('tar', ['-xzf', tarFile, '-C', outDir], { stdio: 'ignore' })
    return { file: outDir, bytes: 0 }
  } finally {
    await rm(tarFile, { force: true })
  }
}
