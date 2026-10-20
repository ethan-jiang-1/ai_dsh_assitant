#!/usr/bin/env node
/**
 * `pnpm sweep` —— 仓内 `.tmp/` 的清扫机制（根 AGENTS.md 硬规则 8 说「清扫即回收」，但回收
 * 此前只存在于人工动作：.tmp 积到 135 条/82M 从未清扫，审计 261020 #25；那次人工清扫还实测
 * 抹掉过并行会话的在途证据——保护规则①就是那条教训的机制化）。
 *
 * 形态：默认 dry-run 只列出将删条目（名称+大小+mtime）；`--apply` 才真删。
 * 保护规则（为什么这些条目不删，按判定顺序）：
 *   ① 名叫 openviking 的条目——活服务工作区（storage 指到 `.tmp/openviking`，docs/dev.md §四）；
 *   ② `--keep <名字>` 白名单——人显式点名的保留位（可重复给）；
 *   ③ mtime 新于 `--min-age-minutes`（默认 60）——刚落地的产物大概率还在途。
 *      边界（如实说）：条目自身的 mtime 只随**直接子项**的增删变化，深层文件的活动不刷新它；
 *      深层在途由打开句柄那条兜，已关句柄的深层追加是这条规则的残余盲区；
 *   ④ lsof 显示有打开句柄的条目——活进程还在用（zstd/浏览器/服务把句柄开着的时候删掉它们的
 *      工作区，就是「在途证据被清」的事故形态）。跑一次 `lsof +D <root>` 收集路径集；lsof
 *      不可用时 dry-run 降级（带警告继续列计划）、`--apply` 拒跑（fail-closed：宁可不清扫，
 *      不可误删）。测试与 CI 注入 `openPaths` 参数绕过系统 lsof——判据核同一份。
 *
 * 用法（仓根）：
 *   pnpm sweep                                       # dry-run：列出将删条目与保留原因
 *   pnpm sweep --apply                               # 真删
 *   pnpm sweep --root <dir>                          # 清扫任意目录（可测性；默认 <repo>/.tmp）
 *   pnpm sweep --min-age-minutes 1440 --keep probe-home --apply
 * 退出码：0 = 正常（含「无可删条目」与「根不存在」）；1 = --apply 因 lsof 不可用拒跑；2 = 参数错。
 *
 * Style: scripts/AGENTS.md —— 纯 ESM，Node 内置 + 仓内已有，注释写"为什么"。
 */
import { execFileSync } from 'node:child_process'
import { existsSync, lstatSync, readdirSync, realpathSync, rmSync } from 'node:fs'
import { join, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = fileURLToPath(new URL('../..', import.meta.url))

/** 名字即活物的条目（判据①：openviking = 活服务工作区）。 */
const PROTECTED_ENTRY_NAMES = ['openviking']

/**
 * `lsof +D <root>` 收集 root 下的打开路径集（机器可读形态 `-Fn`：一行一条记录，`n` 前缀 =
 * 路径——含空格的路径也不断列；p/f 记录混在其中，解析只认 `n` 行）。lsof 报的是**真实路径**
 * （macOS 上 `/tmp` → `/private/tmp`），调用方两侧都过 realpath 再比对。
 *
 * 失败形态（实测 macOS lsof 4.91）：退出码 0 = 正常列出；退出码 1 + stdout 空 + stderr 空 =
 * 「没有打开的文件」（健康）；退出码 1 + stderr 有 WARNING（目录缺失/不可读）或二进制不存在
 * （ENOENT 抛出）= 扫不了——抛出，让 `--apply` 拒跑。
 * @param root - 要扫的根目录（绝对路径）。
 * @returns 打开路径的数组（去重）。
 * @throws lsof 不可用或扫描失败时。
 */
export function collectOpenPaths(root) {
  const rootPath = resolve(root)
  // 先自证根在：lsof 对不存在的 +D 目标会把 WARNING+usage 直接打到控制终端（绕过 stdio 捕获，
  // 实测 lsof 4.91），而那也不是「扫不了句柄」的真信号、只是参数错——Node 侧先挡掉，报错更干净。
  if (!existsSync(rootPath)) throw new Error(`lsof 无从扫描：根目录不存在（${rootPath}）`)
  let stdout = ''
  let stderr = ''
  try {
    stdout = execFileSync('lsof', ['-Fn', '+D', rootPath], { maxBuffer: 64 * 1024 * 1024 }).toString('utf8')
  } catch (error) {
    // 二进制不存在（无 lsof 的环境）：必须抛——「空集」会谎称没有活句柄。
    if (error.code === 'ENOENT') throw new Error('lsof 不可用：系统里没有 lsof 二进制')
    stdout = String(error.stdout ?? '')
    stderr = String(error.stderr ?? '')
  }
  // macOS lsof 4.91 实测：`+D` **有命中也退 1**（本仓 .tmp 上的活服务句柄就是这么撞见的），
  // 退出码不可作信号；stderr 有内容（can't stat 一类 WARNING）才是真「扫不了」——抛出，
  // 让 --apply 拒跑（fail-closed）、dry-run 降级，绝不给一份静默残缺的句柄集。
  if (stderr !== '') throw new Error(`lsof 扫描失败（stderr: ${stderr.slice(0, 200)}）`)
  return [...new Set(stdout.split('\n').filter(line => line.startsWith('n')).map(line => line.slice(1)).filter(Boolean))]
}

/** 目录的递归字节数（lstat：不跟符号链接——链接算链接自身的尺寸，不深入目标）。 */
function treeBytes(directory) {
  let total = 0
  const visit = (dir) => {
    for (const name of readdirSync(dir)) {
      try {
        const stat = lstatSync(join(dir, name))
        if (stat.isDirectory()) visit(join(dir, name))
        else total += stat.size
      } catch {
        // 扫描途中的增删竞态：这一项不计，不让整个计划死掉。
      }
    }
  }
  try {
    visit(directory)
  } catch {
    return 0
  }
  return total
}

/**
 * 产出清扫计划（纯读，不删任何东西——dry-run 与 --apply 共用这份判定）。
 * @param options
 * @param {string} options.root - 清扫根（只判它的**直接子项**）。
 * @param {number} [options.minAgeMinutes=60] - 判据③的窗口（默认 60 分钟）。
 * @param {string[]} [options.keep=[]] - 判据②的白名单名字。
 * @param {string[]} [options.openPaths=[]] - 判据④的打开路径集（系统 lsof 的产物或测试注入）。
 * @returns `{ root, minAgeMinutes, entries }`；每条 entry 带
 *   `{ name, path, type, bytes, mtimeMs, ageMinutes, action: 'delete'|'keep', reason }`
 *   （reason ∈ 'openviking' | 'keep' | 'min-age' | 'open-handle' | 'expired'）。
 */
export function planSweep({ root, minAgeMinutes = 60, keep = [], openPaths = [] }) {
  const rootPath = resolve(root)
  const cutoffMs = Date.now() - minAgeMinutes * 60_000
  const keepSet = new Set(keep)
  // lsof 报真实路径（/tmp → /private/tmp 一类），条目路径同样过 realpath 再比对；
  // 前缀比对带分隔符，防止 'probe' 误匹配 'probe-home'。
  const openResolved = openPaths.map(path => {
    try {
      return realpathSync(path)
    } catch {
      return resolve(path)
    }
  })
  const entries = []
  if (existsSync(rootPath)) {
    for (const name of readdirSync(rootPath).sort()) {
      const path = join(rootPath, name)
      let stat
      try {
        stat = lstatSync(path)
      } catch {
        continue // 扫描途中消失的条目：不是任何一方的责任，跳过。
      }
      const mtimeMs = stat.mtimeMs
      const entry = {
        name,
        path,
        type: stat.isDirectory() ? 'dir' : stat.isSymbolicLink() ? 'symlink' : 'file',
        bytes: stat.isDirectory() ? treeBytes(path) : stat.size,
        mtimeMs,
        ageMinutes: Math.max(0, Math.round((Date.now() - mtimeMs) / 60_000)),
        action: 'keep',
        reason: 'expired',
      }
      let openUnderIt = false
      try {
        const real = realpathSync(path)
        openUnderIt = openResolved.some(open => open === real || open.startsWith(real + sep))
      } catch {
        // 条目在 realpath 时消失：按无句柄处理（rm 阶段的 force 兜底）。
      }
      if (PROTECTED_ENTRY_NAMES.includes(name)) entry.reason = 'openviking'
      else if (keepSet.has(name)) entry.reason = 'keep'
      else if (mtimeMs > cutoffMs) entry.reason = 'min-age'
      else if (openUnderIt) entry.reason = 'open-handle'
      else entry.action = 'delete'
      entries.push(entry)
    }
  }
  return { root: rootPath, minAgeMinutes, entries }
}

/**
 * 执行计划里 action='delete' 的条目（`--apply` 的落锤步骤；rmSync 的 force 容忍计划与执行
 * 之间的消失，报告按计划口径）。
 * @param plan - planSweep 的产物。
 * @returns 实删（按计划口径）的条目名数组。
 */
export function applySweep(plan) {
  const deleted = []
  for (const entry of plan.entries) {
    if (entry.action !== 'delete') continue
    rmSync(entry.path, { recursive: true, force: true })
    deleted.push(entry.name)
  }
  return deleted
}

/**
 * 一次完整清扫（CLI 与测试共用）：收打开路径集 → 计划 → （apply 时）落锤。
 * `openPaths` 给了就**注入**（测试/CI 绕过系统 lsof 的缝）；没给才跑系统 lsof，且失败时：
 * apply ⇒ 拒跑（`{ refused: 'lsof-unavailable' }`，一个不删）；dry-run ⇒ 空集降级 + 警告。
 * @param options
 * @param {string} options.root - 清扫根。
 * @param {boolean} [options.apply=false] - 是否真删。
 * @param {number} [options.minAgeMinutes=60] - 判据③窗口。
 * @param {string[]} [options.keep=[]] - 判据②白名单。
 * @param {string[]} [options.openPaths] - 判据④注入的打开路径集（不给则跑系统 lsof）。
 * @returns `{ lsof: 'injected'|'collected'|'unavailable', warning?, plan, deleted }`
 *   或拒绝时 `{ refused: 'lsof-unavailable', detail, deleted: [] }`。
 */
export function runSweep({ root, apply = false, minAgeMinutes = 60, keep = [], openPaths }) {
  if (openPaths !== undefined) {
    const plan = planSweep({ root, minAgeMinutes, keep, openPaths })
    return { lsof: 'injected', plan, deleted: apply ? applySweep(plan) : [] }
  }
  let resolvedOpenPaths
  let warning
  try {
    resolvedOpenPaths = collectOpenPaths(resolve(root))
  } catch (error) {
    if (apply) {
      // fail-closed：打开句柄这一列判不了就一个都不删——误删在途证据的代价高于不清扫。
      return { refused: 'lsof-unavailable', detail: String(error?.message ?? error), deleted: [] }
    }
    warning = String(error?.message ?? error)
    resolvedOpenPaths = []
  }
  const plan = planSweep({ root, minAgeMinutes, keep, openPaths: resolvedOpenPaths })
  return { lsof: warning === undefined ? 'collected' : 'unavailable', warning, plan, deleted: apply ? applySweep(plan) : [] }
}

/** 人读的大小（B/KB/MB/GB，一位小数）。 */
function sizeText(bytes) {
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB', 'TB']
  let value = bytes
  let unit = -1
  do {
    value /= 1024
    unit += 1
  } while (value >= 1024 && unit < units.length - 1)
  return `${value.toFixed(1)} ${units[unit]}`
}

const when = (mtimeMs) => new Date(mtimeMs).toISOString().replace('T', ' ').slice(0, 16)

const REASON_TEXT = {
  openviking: 'openviking 活服务工作区',
  keep: '--keep 白名单',
  'min-age': 'mtime 在保护窗内',
  'open-handle': '有打开句柄（lsof）',
}

/** CLI：解析参数 → runSweep → 打印。退出码见文件头注。 */
function main(argv = process.argv.slice(2)) {
  const apply = argv.includes('--apply')
  const rootAt = argv.indexOf('--root')
  const rootGiven = rootAt >= 0 ? argv[rootAt + 1] : join(repoRoot, '.tmp')
  if (rootGiven === undefined || rootGiven === '') {
    console.error('sweep: --root 需要一个目录参数')
    process.exit(2)
  }
  let minAgeMinutes = 60
  const minAt = argv.indexOf('--min-age-minutes')
  if (minAt >= 0) {
    minAgeMinutes = Number(argv[minAt + 1])
    if (!Number.isFinite(minAgeMinutes) || minAgeMinutes < 0) {
      console.error('sweep: --min-age-minutes 需要一个非负数字')
      process.exit(2)
    }
  }
  const keep = []
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--keep' && argv[i + 1] !== undefined && argv[i + 1] !== '') keep.push(argv[i + 1])
  }

  const result = runSweep({ root: rootGiven, apply, minAgeMinutes, keep })
  if (result.refused !== undefined) {
    console.error(`sweep: 已拒跑（--apply 需要打开句柄判据，而 ${result.detail}）——一个条目都没删`)
    process.exit(1)
  }
  const { plan, deleted } = result
  const deletable = plan.entries.filter(entry => entry.action === 'delete')
  const kept = plan.entries.filter(entry => entry.action === 'keep')
  console.log(`sweep: ${plan.root}${apply ? '（--apply）' : '（dry-run——不带 --apply 只列不删）'}`
    + `｜窗口 ${plan.minAgeMinutes} 分钟｜条目 ${plan.entries.length}（将删 ${deletable.length} / 保留 ${kept.length}）`)
  if (result.warning !== undefined) console.log(`警告：${result.warning}（本次计划未考虑打开句柄）`)
  if (plan.entries.length === 0) {
    console.log('（根不存在或为空——没有可清扫的条目）')
    process.exit(0)
  }
  for (const entry of deletable) {
    console.log(`  将删  ${entry.name}${entry.type === 'dir' ? '/' : ''}  ${sizeText(entry.bytes)}  ${when(entry.mtimeMs)}  (${entry.ageMinutes} 分钟前)`)
  }
  for (const entry of kept) {
    console.log(`  保留  ${entry.name}${entry.type === 'dir' ? '/' : ''}  ${sizeText(entry.bytes)}  ${when(entry.mtimeMs)}  （${REASON_TEXT[entry.reason] ?? entry.reason}）`)
  }
  if (apply && deleted.length > 0) console.log(`已删 ${deleted.length} 条`)
  process.exit(0)
}

// 只在直接运行时做 IO/打印；被 import（测试）时不动文件系统。
if (process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main()
