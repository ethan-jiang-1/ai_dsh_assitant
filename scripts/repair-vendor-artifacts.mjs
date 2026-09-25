#!/usr/bin/env node
/**
 * Rebuild the vendor build artifacts a clean checkout cannot produce, so `pnpm dsh` boots after a
 * pin move without the vendor's own (unbootstrappable) release build.
 *
 * Why this exists (evidence in notes/implemented/2026-09-25-dsh-0-1-7-migration.md §六/§十一):
 *   · `vendor/dsh/…/lib/` is gitignored build output. After a pin move it is stale, and the
 *     vendor's `build:lib` cannot run from a clean tree — its tsdown entry for the root package
 *     (`lib/types/{index,invariant,startup}.js`) is itself a build product no published script
 *     regenerates.
 *   · What the runtime actually needs is narrower: per-package typert artifacts
 *     (`lib/typert.host.js`, produced by `WorkspaceTypertGenerator`, which does NOT need tsdown),
 *     plus two subpath bundles (`dsh-headless/startup`, `dsh-subprocess/control`) whose exports
 *     map points at tsdown bundles; plain `tsc` emits the same modules under `lib/types/` and a
 *     named-export shim bridges the path.
 *
 * Idempotent: safe to re-run at any time. Verify with a bare smoke afterwards:
 *   pnpm dsh --profile dev-task "reply with the single word ready"
 *
 * @module scripts/repair-vendor-artifacts
 */
import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { WorkspaceTypertGenerator } from '../vendor/dsh/packages/typert/generator/src/workspace.ts'

const vendorRoot = resolve(fileURLToPath(import.meta.url), '../../vendor/dsh')

/** Packages whose subpath exports need a tsc build plus a named-export shim (lib/<name>.js). */
const SUBPATH_PACKAGES = [
  { directory: 'packages/bundle/headless', entry: 'startup' },
  { directory: 'packages/subprocess/subprocess', entry: 'control' },
]

function step(name, run) {
  process.stdout.write(`▸ ${name}\n`)
  run()
}

step('typert: regenerate per-package artifacts (host face)', () => {
  const hasTypertExport = exports => exports !== null && typeof exports === 'object' && './typert' in exports
  const generator = new WorkspaceTypertGenerator(vendorRoot, { checkDiagnostics: false })
  const packages = generator.discover(['host'])
    .filter(candidate => hasTypertExport(JSON.parse(readFileSync(join(vendorRoot, candidate.root, 'package.json'), 'utf8')).exports))
    .map(candidate => candidate.package)
  let emitted = 0
  for (const artifact of generator.generate(packages, ['host'])) {
    const output = join(vendorRoot, artifact.packageRoot, 'lib')
    mkdirSync(output, { recursive: true })
    writeFileSync(join(output, `typert.${artifact.face}.js`), artifact.js)
    writeFileSync(join(output, `typert.${artifact.face}.d.ts`), artifact.dts)
    if (artifact.remote !== undefined) {
      writeFileSync(join(output, 'typert.remote-client.js'), artifact.remote.js)
      writeFileSync(join(output, 'typert.remote-client.d.ts'), artifact.remote.dts)
      writeFileSync(join(output, 'typert.remote-client.d.ts.map'), artifact.remote.dtsMap)
    } else {
      for (const file of ['typert.remote-client.js', 'typert.remote-client.d.ts', 'typert.remote-client.d.ts.map']) {
        rmSync(join(output, file), { force: true })
      }
    }
    emitted++
  }
  process.stdout.write(`  ok   ${emitted} artifact set(s) across ${packages.length} package(s)\n`)
})

step('tsc: emit the subpath packages the loader imports by path', () => {
  for (const { directory } of SUBPATH_PACKAGES) {
    execFileSync('npx', ['tsc', '-b', join(vendorRoot, directory, 'tsconfig.json')], { cwd: vendorRoot, stdio: 'inherit' })
  }
})

step('shims: bridge lib/<entry>.js → lib/types/<entry>.js (named exports only)', () => {
  for (const { directory, entry } of SUBPATH_PACKAGES) {
    writeFileSync(join(vendorRoot, directory, 'lib', `${entry}.js`),
      `// Build-output shim: the exports map points at lib/${entry}.js (a tsdown bundle this clean tree\n` +
      `// cannot produce); tsc emits the same module at lib/types/${entry}.js. Named exports only —\n` +
      '// these modules have no default export. Recorded in the 0.1.7 migration note.\n' +
      `export * from './types/${entry}.js'\n`)
    process.stdout.write(`  ok   ${directory}/lib/${entry}.js\n`)
  }
})

process.stdout.write('\nrepair-vendor: done. Verify with: pnpm dsh --profile dev-task "reply with the single word ready"\n')
