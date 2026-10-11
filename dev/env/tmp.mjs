#!/usr/bin/env node
/**
 * 本仓的临时文件根：`<repo>/.tmp/<用途>/`。
 *
 * 为什么存在（根硬规则 8）：文件沙箱只放行会话工作目录，仓外写（`/tmp`、`os.tmpdir`、
 * `$HOME`）会被挡下并转成一次人工 approval —— 每写一个临时文件就要人点一次同意。
 * 所以仓里的脚本、探针、评测、测试夹具一律把临时产物写进 `<repo>/.tmp/<用途>/`，
 * 这是仓内**唯一**的临时文件形式（`.gitignore` 忽略 `.tmp/`，`pnpm verify` 有门禁守）。
 *
 * 谁用：`dev/**` 与 `scripts/**` 的脚本（探针、评测、报告、release-smoke）与
 * `packages/dsh-smart-assistant/vitest.config.ts`（把测试进程的 `TMPDIR` 收进仓内）。
 * 谁不用：**模型可见面**（SKILL.md 那一类）不能 import 本模块——运行时技能在别人的机器上跑，
 * 它们的口径是"写进会话工作目录的 `.tmp/`"，不是本仓的绝对路径。
 */
import { mkdirSync, mkdtempSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

/** 仓根（本文件在 `dev/env/` 下，两层上去）。 */
export const repoRoot = fileURLToPath(new URL('../..', import.meta.url))

/**
 * 取（必要时建）一个仓内临时目录：`<repo>/.tmp/<purpose>`。
 *
 * `purpose` 用短横线小写，一个用途一个目录（`shots`、`probe-home`、`eval`…），
 * 这样清扫一次 `.tmp/` 就能回收全部临时产物，也不会两个用途互相踩。
 */
export function tmpDir(purpose) {
  const dir = join(repoRoot, '.tmp', purpose)
  mkdirSync(dir, { recursive: true })
  return dir
}

/**
 * 取（必要时建）一个仓内临时目录下的新唯一子目录：`<repo>/.tmp/<purpose>/<prefix><unique>`。
 * 语义等同于 Node 的 `mkdtemp` 配系统临时根，只是根换成了仓内。
 */
export function mkTmpDir(purpose, prefix = 'tmp-') {
  return mkdtempSync(join(tmpDir(purpose), prefix))
}
