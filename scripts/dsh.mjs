#!/usr/bin/env node
/**
 * 开发启动器：`pnpm dsh <argv>` 的唯一入口。
 *
 * 为什么存在：DSH 用 `DSH_HOME` 决定一切持久化（profile、凭据、会话日志、插件安装、assistant working folder 的 dataDir）。
 * 用户 shell 里可能已经导出了 `DSH_HOME=~/.dsh`（日用实例）—— 那么任何"忘了 source dev/env.sh
 * 就直接跑"的调用都会读写日用的 home：装进日用 profile、写日用会话日志、甚至拿到日用凭据。
 * `dev/env.sh` 是兜底，但兜底会被人（和 agent）忘掉；**默认值必须是安全的**。
 *
 * 规则（有意做死，不做开关矩阵）：
 *   1. `pnpm dsh` 永远用 `<repo>/dev/harness-home`，覆盖任何继承来的 `DSH_HOME`
 *      （覆盖继承值时在 stderr 打一行说明，让发生的事可见）。
 *   2. 唯一出口是 `ASSISTANT_DSH_HOME`：显式指定另一个开发用 home（冒烟/实验），指向
 *      `~/.dsh` 时不拦截但会打印显著警告 —— 本 repo 没有任何场景需要日用 home。
 *   3. 从钉住的源码启动 CLI（vendor/dsh/apps/cli/src/bin.ts），经运行期tsconfig 解析入口
 *      `tsconfig.tsx.json` 加载 DSH 的 src（契约：`docs/dev.md` §二「两个 tsconfig 解析入口」）。
 *
 * 不经过本启动器的调用方（release-smoke / dev/setup.sh）自己负责设置 `DSH_HOME`。
 */
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { join, resolve } from 'node:path'
import { homedir } from 'node:os'
import { existsSync } from 'node:fs'

const repoRoot = fileURLToPath(new URL('..', import.meta.url))
const devHome = join(repoRoot, 'dev', 'harness-home')
const bin = join(repoRoot, 'vendor', 'dsh', 'apps', 'cli', 'src', 'bin.ts')

if (!existsSync(bin)) {
  console.error(`vendor/dsh is not checked out (${bin}) — run \`git submodule update --init\``)
  process.exit(1)
}

// ── home 决策 ────────────────────────────────────────────────────────────────
const override = process.env.ASSISTANT_DSH_HOME
const inherited = process.env.DSH_HOME
const warn = (...lines) => console.error(...lines.map(l => `  ⚠ ${l}`))

if (override) {
  process.env.DSH_HOME = resolve(override)
  if (process.env.DSH_HOME === join(homedir(), '.dsh')) {
    warn(`ASSISTANT_DSH_HOME points at the daily ~/.dsh —`,
         `this dev session will read and write your daily harness home.`)
  }
} else if (inherited && inherited !== devHome) {
  warn(`inherited DSH_HOME=${inherited} is overridden to keep the daily home untouched.`)
  process.env.DSH_HOME = devHome
} else {
  process.env.DSH_HOME = devHome
}

console.error(`[dsh] DSH_HOME=${process.env.DSH_HOME} (dev home; ~/.dsh untouched)`)

// ── 其余两条按 home 共享、不随 DSH_HOME 隔离的通道（vendor 源码审计结论）──────
// skills 的"共享 agent 根"默认 ~/.agents（skill-filesystem 直接读，不经 DSH_HOME）。
// dev 自包含：没有显式设置才接管，指向本 dev home 内。
process.env.DSH_AGENTS_HOME ??= join(process.env.DSH_HOME, 'agents-home')
// dev 不出遥测（默认 FEEDBACK_ONLY；显式设置过就尊重）。
process.env.DSH_TELEMETRY_DISABLED ??= '1'

// ── 从钉住的源码启动 CLI ─────────────────────────────────────────────────────
const child = spawn(process.execPath, ['--import', 'tsx/esm', bin, ...process.argv.slice(2)], {
  cwd: repoRoot,
  env: { ...process.env, TSX_TSCONFIG_PATH: join(repoRoot, 'tsconfig.tsx.json') },
  stdio: 'inherit',
})

child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal)
  else process.exit(code ?? 1)
})
