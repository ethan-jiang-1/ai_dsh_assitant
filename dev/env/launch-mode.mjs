#!/usr/bin/env node
/**
 * "这次从哪儿启动 CLI"的判定：已构建的 `lib/` 还是钉住的源码。
 *
 * 为什么要有这个选择（实测 2026-11-05，同一台机器、交错跑五轮）：
 *   · 从源码启动（`node --import tsx/esm …/src/bin.ts`）boot→URL 中位数 ≈ 4.4s；
 *   · 从已构建的 `lib/bin.js` 启动中位数 ≈ 2.5s。
 * 差的不是 tsx 的转译（那份有磁盘缓存），是每启动一次都要让 Node 读进并编译几千个 `.ts`
 * 模块——`--cpu-prof` 显示 3.1s 的 boot 里 2.16s 花在模块加载（读文件 568ms、GC 147ms、
 * ESM 编译 136ms），本插件自己只占 4ms。
 *
 * 但"跑构建物"只有在构建物**确实对应钉住的源码**时才安全，所以判定保守，任一条不成立就回源码：
 *   1. `ASSISTANT_DSH_FROM_SOURCE=1` —— 显式要求源码（调试平台代码时用）；
 *   2. `vendor/dsh/apps/cli/lib/bin.js` 不在（没跑过 `dev/env/prepare.sh`）；
 *   3. `vendor/dsh` 的 HEAD 与 `vendor/UPSTREAM.md` 记的精确 SHA 不一致（裸 `git submodule update`
 *      挪过、或临时跟了开发分支）——这时 lib/ 可能属于另一个 pin；
 *   4. pin 簿记缺失 / 读不出 HEAD / lib 比簿记旧（`sync-dsh` 刚挪 pin、还没重建 vendor 产物——
 *      `prepare.sh` 只探存在不探新旧）。
 * 回源码不是降级：源码路径永远正确，只是慢一点——这正是 2/3/4 三条的形状。
 *
 * 纯函数、无 IO：`dev/env/dsh.mjs` 负责取 stat/git 事实，测试直接喂判定表。
 */

/**
 * @param {object} input
 * @param {boolean} input.fromSource - 显式要求源码启动。
 * @param {boolean} input.built - `vendor/dsh/apps/cli/lib/bin.js` 是否存在。
 * @param {number | undefined} input.builtMtime - 上面那个文件的 mtime（ms）。
 * @param {number | undefined} input.recordMtime - `vendor/UPSTREAM.md` 的 mtime（ms）。
 * @param {string | undefined} input.recordedSha - `vendor/UPSTREAM.md` 记的精确 SHA。
 * @param {string | undefined} input.headSha - `vendor/dsh` 当前 HEAD。
 * @returns {{ mode: 'built' | 'source', reason: string }}
 */
export function chooseLaunchMode({ fromSource, built, builtMtime, recordMtime, recordedSha, headSha }) {
  if (fromSource === true) return { mode: 'source', reason: 'ASSISTANT_DSH_FROM_SOURCE=1' }
  if (built !== true) return { mode: 'source', reason: 'vendor lib/ is not built (run dev/env/prepare.sh)' }
  if (typeof recordMtime !== 'number') {
    return { mode: 'source', reason: 'vendor/UPSTREAM.md is missing — the pin is unbooked, so lib/ cannot be trusted' }
  }
  const recorded = normaliseSha(recordedSha)
  const head = normaliseSha(headSha)
  if (recorded !== undefined) {
    if (head === undefined) return { mode: 'source', reason: 'cannot read the vendor/dsh HEAD' }
    if (recorded !== head) {
      return { mode: 'source', reason: 'vendor/dsh HEAD does not match the SHA recorded in vendor/UPSTREAM.md' }
    }
  }
  if (typeof builtMtime === 'number' && builtMtime < recordMtime) {
    return { mode: 'source', reason: 'vendor lib/ is older than the pin record — rebuild the vendor tree' }
  }
  return { mode: 'built', reason: '' }
}

/** SHA 在簿记里是反引号包着的一段 hex；取不出就返回 undefined（交给"未知不放行"以外的分支）。 */
function normaliseSha(value) {
  if (typeof value !== 'string') return undefined
  const match = /[0-9a-f]{40}/u.exec(value)
  return match?.[0]
}
