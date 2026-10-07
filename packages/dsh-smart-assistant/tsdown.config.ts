/**
 * tsdown pipeline for the client face (S2, 261007 bigfile-split).
 *
 * Deliberately a zero-import config object: `tsdown` is not a dependency of THIS package's
 * node_modules closure under pnpm's strict layout — importing 'tsdown' in a config file
 * resolves only via defineConfig from the package itself, which would defeat the point.
 * The plain object is the schema tsdown reads directly.
 *
 * Why these values:
 * - entry src/client/index.ts → the entry module assembles the whole client tree via
 *   relative imports; the bundle lands at lib/client/index.js, the exact path the
 *   `./client` export already points at (exports/composition unchanged).
 * - format 'iife': the web shell concatenates client bundles into classic-script combos —
 *   the artifact must parse as a classic script (gated by scripts/checks/verify.mjs via
 *   clientScriptSafetyProblems). outputOptions.entryFileNames pins the output name to
 *   `index.js` (tsdown suffixes iife builds with `.iife` inside the default file pattern,
 *   which would miss the path the `./client` export points at).
 * - minify false: the artifact is the reviewable surface; size is not a constraint here.
 * - sourcemap true: build provenance for the bundle.
 * - clean false (CRITICAL): `pnpm build` runs `tsc -b` first and tsdown overwrites ONLY
 *   lib/client/index.js; cleaning outDir would delete tsc's index.d.ts and break the
 *   `./client` types export. The tsc per-module chunk .js files under lib/client remain
 *   as dead files — accepted (they are unreferenced; only index.js is served).
 */
export default {
  entry: 'src/client/index.ts',
  outDir: 'lib/client',
  format: 'iife',
  outputOptions: { entryFileNames: '[name].js' },
  platform: 'browser',
  target: 'es2024',
  minify: false,
  sourcemap: true,
  clean: false,
}
