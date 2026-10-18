#!/usr/bin/env node
/**
 * 启动前的**产物自证**：让 `lib/` 与 `src/` 对齐，于是没有人需要记得 `pnpm build`。
 *
 * 为什么需要它（而不是再写一句提醒）：preset 行与 `exports` 加载的是构建物 `lib/`，而
 * `pnpm test` 读的是 `src/`——"改了没重建"在测试里完全不可见，只会把上一版行为端上来。
 * `scripts/AGENTS.md` 的收尾三连早写着"不 build 会拿到旧行为，历史上真发生过假绿"，
 * 但那句话本身也是要人记住的 prose。
 *
 * 为什么判据不在这里：判据归门禁核 `scripts/checks/gates/build-freshness.mjs`，同一个核也被
 * `pnpm verify` 消费——本脚本只拥有**修复动作**（陈旧就 build），两处若各写一份判据必然漂移
 * （`scripts/AGENTS.md` 纪律 2）。scratch 用途目录与 verify 分开，免得并行跑时互相踩。
 *
 * 用法：`node dev/env/ensure-build.mjs`（供 `dev/env/start.sh` 与手工调用）
 * 退出码：0 = 一致（含"刚修好"）；1 = build 之后仍不一致，或 build 本身失败。
 */
import { execFileSync } from 'node:child_process'
import { join } from 'node:path'
import { packageBuildFreshnessProblems } from '../../scripts/checks/gates/build-freshness.mjs'
import { repoRoot, tmpDir } from './tmp.mjs'

const packageDir = join(repoRoot, 'packages', 'dsh-smart-assistant')
const problems = () => packageBuildFreshnessProblems({
  packageDir,
  scratchDir: tmpDir('build-check'),
  label: 'packages/dsh-smart-assistant',
})

const stale = problems()
if (stale.length === 0) {
  console.log('▸ artifacts: lib/ matches src/')
  process.exit(0)
}

console.log('▸ artifacts: lib/ is behind src/ — running `pnpm build`')
for (const problem of stale) console.log(`    ${problem}`)
execFileSync('pnpm', ['build'], { cwd: repoRoot, stdio: 'inherit' })

const remaining = problems()
if (remaining.length > 0) {
  console.error('✗ lib/ still does not match src/ after `pnpm build` — the loaded artifact cannot be trusted:')
  for (const problem of remaining) console.error(`    ${problem}`)
  process.exit(1)
}
console.log('▸ artifacts: lib/ now matches src/')
