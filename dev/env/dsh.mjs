#!/usr/bin/env node
/**
 * 开发启动器：`pnpm dsh <argv>` 的唯一入口。
 *
 * 为什么存在：DSH 用 `DSH_HOME` 决定一切持久化（profile、凭据、会话日志、插件安装、assistant working folder 的 dataDir）。
 * 用户 shell 里可能已经导出了 `DSH_HOME=~/.dsh`（日用实例）—— 那么任何"忘了 source dev/env/env.sh
 * 就直接跑"的调用都会读写日用的 home：装进日用 profile、写日用会话日志、甚至拿到日用凭据。
 * `dev/env/env.sh` 是兜底，但兜底会被人（和 agent）忘掉；**默认值必须是安全的**。
 *
 * 规则（有意做死，不做开关矩阵）：
 *   1. `pnpm dsh` 永远用 `<repo>/dev/harness-home`，覆盖任何继承来的 `DSH_HOME`
 *      （覆盖继承值时在 stderr 打一行说明，让发生的事可见）。
 *   2. 唯一出口是 `ASSISTANT_DSH_HOME`：显式指定另一个开发用 home（冒烟/实验），指向
 *      `~/.dsh` 时不拦截但会打印显著警告 —— 本 repo 没有任何场景需要日用 home。
 *   3. 从钉住的源码启动 CLI（vendor/dsh/apps/cli/src/bin.ts），经运行期tsconfig 解析入口
 *      `tsconfig.tsx.json` 加载 DSH 的 src（契约：`docs/dev.md` §二「两个 tsconfig 解析入口」）。
 *   4. 出网代理**条件注入**（有没有 VPN 都能跑）：本地代理端口活着才把 `HTTP(S)_PROXY`
 *      注入子进程环境，死了就什么都不注入（直连 + 真实 DNS，web_fetch 的 SSRF 预解析自然
 *      通过）。为什么不能写死进 home `.env`：代理进程不在时那两行会把一切出网——含模型
 *      调用——指向死端口。为什么需要注入：TUN 代理的 fake-ip DNS 把所有域名解析进
 *      198.18.0.0/15 保留段，直连 hop 的 SSRF 预解析全拒（机制与证据：
 *      `notes/implemented/2026-10-02-web-fetch-proxy-env.md`）。端口候选：`ASSISTANT_PROXY_URL`
 *      显式指定（置空串=禁用注入）＞ 系统代理设置（macOS `scutil --proxy` 的 HTTP 口）＞
 *      常见混合口 7897，先探测先得；显式导出过 `HTTP(S)_PROXY` 的调用者不被覆盖。
 *
 * 不经过本启动器的调用方（release-smoke / dev/env/setup.sh）自己负责设置 `DSH_HOME`。
 */
import { spawn, execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { join, resolve } from 'node:path'
import { homedir } from 'node:os'
import { existsSync } from 'node:fs'
import { connect } from 'node:net'

const repoRoot = fileURLToPath(new URL('../..', import.meta.url))
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

// ── 出网代理条件注入（规则见文件头第 4 条）──────────────────────────────────
const probe = (host, port) => new Promise(resolveProbe => {
  const socket = connect({ host, port })
  const done = ok => { socket.destroy(); resolveProbe(ok) }
  socket.setTimeout(300, () => done(false))
  socket.once('connect', () => done(true))
  socket.once('error', () => done(false))
})

const explicitUrl = process.env.ASSISTANT_PROXY_URL
const proxyAlreadySet = process.env.HTTP_PROXY !== undefined || process.env.HTTPS_PROXY !== undefined
let proxyUrl = ''
if (explicitUrl !== undefined) {
  // 显式指定：空串=禁用注入；非空=探测这一个，活着才注入（死了注入=把出网指向死端口）。
  if (explicitUrl !== '') {
    const { hostname, port } = new URL(explicitUrl)
    if (await probe(hostname, Number(port))) proxyUrl = explicitUrl
  }
} else if (!proxyAlreadySet) {
  const candidates = []
  if (process.platform === 'darwin') {
    try {
      const out = execFileSync('scutil', ['--proxy'], { encoding: 'utf8', timeout: 1000 })
      if (/HTTPEnable\s*:\s*1/u.test(out)) {
        const host = /HTTPProxy\s*:\s*(\S+)/u.exec(out)?.[1]
        const port = /HTTPPort\s*:\s*(\d+)/u.exec(out)?.[1]
        if (host !== undefined && port !== undefined) candidates.push(`http://${host}:${port}`)
      }
    } catch { /* scutil 不可用就只试默认口 */ }
  }
  candidates.push('http://127.0.0.1:7897')
  for (const candidate of candidates) {
    const { hostname, port } = new URL(candidate)
    if (await probe(hostname, Number(port))) { proxyUrl = candidate; break }
  }
}
if (proxyUrl !== '' && !proxyAlreadySet) {
  process.env.HTTP_PROXY ??= proxyUrl
  process.env.HTTPS_PROXY ??= proxyUrl
  console.error(`[dsh] outbound via local proxy ${proxyUrl} (web_fetch needs it under fake-ip DNS; see docs/dev.md §五)`)
}

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
