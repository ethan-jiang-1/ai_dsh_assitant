#!/usr/bin/env node
/**
 * dev 工具的 DSH home 解析：一个地方回答「这个工具读/驱动哪个 home」。
 *
 * 硬规则的正文 owner 是 `dev/env/dsh.mjs`（启动器只读继承值是为了覆盖并警告），这里只写
 * 工具侧口径：dev 工具**永不继承** `DSH_HOME`（`pnpm verify` 逐文件守这条），唯一出口是
 * `ASSISTANT_DSH_HOME`；两个都没给就落仓内 dev home——日用的 `~/.dsh` 在任何情况下都不碰。
 *
 * 优先级与各处原实现一致：本工具自己的 `--home` 类旗标 > `ASSISTANT_DSH_HOME` >
 * `<repo>/dev/harness-home`。空串按"没给"处理（`dev/eval/run.mjs` 原本就是这么判的，
 * 空 home 从来不是意图）。
 */
import { join, resolve } from 'node:path'
import { repoRoot } from './tmp.mjs'

/**
 * 解析本次运行使用的 DSH home。
 * @param {string|undefined} [explicit] - 本工具自己的 `--home` 类旗标值；给了就优先。
 * @returns {string} 绝对路径形式的 home。
 */
export function devHome(explicit) {
  if (explicit !== undefined && explicit !== '') return resolve(explicit)
  const fromEnv = process.env.ASSISTANT_DSH_HOME
  if (fromEnv !== undefined && fromEnv !== '') return resolve(fromEnv)
  return resolve(join(repoRoot, 'dev', 'harness-home'))
}
