/**
 * Product settings and workspace path policy: what the launcher may write and what the product
 * row may bind. These are the deterministic rules behind the product route.
 */
import { chmod, mkdir, mkdtemp, readFile, rm, stat, symlink, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'
import {
  PRODUCT_SETTINGS_VERSION,
  productSettingsPath,
  readProductSettings,
  writeProductSettings,
} from '../../src/domain/product/settings.ts'
import {
  resolveWorkspaceDir,
  WorkspacePathError,
} from '../../src/domain/product/workspace-path.ts'

const repoTmp = fileURLToPath(new URL('../../../../.tmp/', import.meta.url))
const dirs: string[] = []

afterEach(async () => {
  for (const dir of dirs.splice(0)) await rm(dir, { recursive: true, force: true })
})

async function tempDir(prefix = 'product-settings-'): Promise<string> {
  const dir = await mkdtemp(join(repoTmp, prefix))
  dirs.push(dir)
  return dir
}

async function expectCode(promise: Promise<unknown>, code: string): Promise<void> {
  await expect(promise).rejects.toMatchObject({ name: 'WorkspacePathError', code })
}

describe('product settings', () => {
  it('round-trips one binding with a version and a 0600 file', async () => {
    const home = await tempDir()
    const path = productSettingsPath(home)
    expect(await readProductSettings(path)).toEqual({ kind: 'missing' })
    const written = await writeProductSettings(path, '/abs/workspace', new Date('2026-11-01T00:00:00Z'))
    expect(written).toEqual({
      version: PRODUCT_SETTINGS_VERSION,
      workspaceDir: '/abs/workspace',
      updatedAt: '2026-11-01T00:00:00.000Z',
    })
    expect(await readProductSettings(path)).toEqual({ kind: 'ok', settings: written })
    expect((await stat(path)).mode & 0o777).toBe(0o600)
    expect(JSON.parse(await readFile(path, 'utf8'))).toMatchObject({ version: 1, workspaceDir: '/abs/workspace' })
  })

  it('reports corrupt, versioned, empty and oversized files as invalid, not missing', async () => {
    const home = await tempDir()
    const path = productSettingsPath(home)
    await mkdir(join(home, 'assistant-product'), { recursive: true })
    await writeFile(path, '{', 'utf8')
    expect(await readProductSettings(path)).toEqual({ kind: 'invalid', reason: 'bad-json' })
    await writeFile(path, JSON.stringify({ version: 2, workspaceDir: '/abs' }), 'utf8')
    expect(await readProductSettings(path)).toEqual({ kind: 'invalid', reason: 'bad-version' })
    await writeFile(path, JSON.stringify({ version: 1, workspaceDir: '   ' }), 'utf8')
    expect(await readProductSettings(path)).toEqual({ kind: 'invalid', reason: 'missing-workspace' })
    await writeFile(path, 'x'.repeat(5000), 'utf8')
    expect(await readProductSettings(path)).toEqual({ kind: 'invalid', reason: 'too-large' })
  })
})

describe('workspace path policy', () => {
  it('canonicalizes a valid directory and refuses relative paths', async () => {
    const root = await tempDir()
    const workspace = await tempDir('product-workspace-')
    const home = join(root, 'home')
    const userHome = join(root, 'user-home')
    const packageRoot = join(root, 'package')
    await mkdir(home)
    await mkdir(userHome)
    await mkdir(packageRoot)
    expect(await resolveWorkspaceDir(workspace, { home, userHome, packageRoot })).toBe(workspace)
    await expectCode(resolveWorkspaceDir('relative/path', { home, userHome, packageRoot }), 'workspace-not-absolute')
  })

  it('distinguishes missing, non-directory and unavailable paths', async () => {
    const root = await tempDir()
    const home = join(root, 'home')
    await mkdir(home)
    const file = join(root, 'file.txt')
    await writeFile(file, 'x', 'utf8')
    await expectCode(resolveWorkspaceDir(join(root, 'missing'), { home, userHome: join(root, 'u'), packageRoot: join(root, 'p') }), 'workspace-missing')
    await expectCode(resolveWorkspaceDir(file, { home, userHome: join(root, 'u'), packageRoot: join(root, 'p') }), 'workspace-not-directory')
  })

  it('refuses the root, the user home, the product home and the package directory', async () => {
    const root = await tempDir()
    const workspace = await tempDir('product-workspace-')
    const home = join(root, 'home')
    const userHome = join(root, 'user-home')
    const packageRoot = join(root, 'package')
    await mkdir(home)
    await mkdir(userHome)
    await mkdir(packageRoot)
    await mkdir(join(home, 'inside'))
    await expectCode(resolveWorkspaceDir('/', { home, userHome, packageRoot }), 'workspace-forbidden')
    await expectCode(resolveWorkspaceDir(userHome, { home, userHome, packageRoot }), 'workspace-forbidden')
    await expectCode(resolveWorkspaceDir(home, { home, userHome, packageRoot }), 'workspace-forbidden')
    await expectCode(resolveWorkspaceDir(packageRoot, { home, userHome, packageRoot }), 'workspace-forbidden')
    await expectCode(resolveWorkspaceDir(join(home, 'inside'), { home, userHome, packageRoot }), 'workspace-forbidden')
    expect(await resolveWorkspaceDir(workspace, { home, userHome, packageRoot })).toBe(workspace)
  })

  it('judges a symlink by its target', async () => {
    if (process.platform === 'win32') return
    const root = await tempDir()
    const packageRoot = await tempDir('product-package-')
    const link = join(root, 'package-link')
    await symlink(packageRoot, link)
    await expectCode(resolveWorkspaceDir(link, {
      home: join(root, 'home'),
      userHome: join(root, 'user-home'),
      packageRoot,
    }), 'workspace-forbidden')
  })

  it('refuses a directory the process cannot write', async () => {
    if (process.platform === 'win32') return
    const root = await tempDir()
    const workspace = await tempDir('product-workspace-')
    await chmod(workspace, 0o500)
    try {
      await expectCode(resolveWorkspaceDir(workspace, {
        home: join(root, 'home'),
        userHome: join(root, 'user-home'),
        packageRoot: join(root, 'package'),
      }), 'workspace-not-writable')
    } finally {
      await chmod(workspace, 0o700)
    }
  })

  it('keeps the WorkspacePathError name stable for route mapping', async () => {
    await expect(resolveWorkspaceDir('relative', {
      home: '/abs/home',
      userHome: '/abs/user',
      packageRoot: '/abs/package',
    })).rejects.toBeInstanceOf(WorkspacePathError)
  })
})
