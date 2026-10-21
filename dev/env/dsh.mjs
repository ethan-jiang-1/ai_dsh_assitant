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
 *      `notes/archived/2026-10-02-web-fetch-proxy-env.md`）。端口候选：`ASSISTANT_PROXY_URL`
 *      显式指定（置空串=禁用注入）＞ 系统代理设置（macOS `scutil --proxy` 的 HTTP 口）＞
 *      常见混合口 7897，先探测先得；显式导出过 `HTTP(S)_PROXY` 的调用者不被覆盖。
 *   5. 临时文件收进仓内：三个临时根变量指向 `<repo>/.tmp/host/`（硬规则 8：仓外写会被
 *      文件沙箱挡成 approval）。显式导出过的调用者不被覆盖。
 *   6. 默认随调用者一起死，显式 `ASSISTANT_DSH_DETACH=1` 才脱离终端独立存活：不脱离时收到
 *      挂断（SIGHUP）就跟 CLI 一起收场，且**任何退出都带走 CLI**——否则一个用完即弃的调用者
 *      （`pnpm start | tail`、后台任务、agent 的一次性 shell）退出时，服务会活下来占着端口与
 *      会话锁。信号转发在 posix 下用进程组（`set -m` + `kill -<去重后的信号>`）——`pnpm dsh`
 *      是包装层，prepend 的 `sh -c`（pnpm 的 INT trap）与真 CLI 不在同一进程里，只发 pid
 *      会把真 CLI 留成孤儿（docs/dev.md §五）。
 *
 * 不经过本启动器的调用方（release-smoke / dev/env/setup.sh）自己负责设置 `DSH_HOME`。
 */
import { spawn, execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { join, resolve } from 'node:path'
import { homedir } from 'node:os'
import { existsSync, mkdirSync } from 'node:fs'
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
// P0 云端暴露收口：OpenViking 插件对 DSH 默认抓完整工具结果；dev 的 VLM/embedding 走云端，
// 所以默认关。显式设 OPENVIKING_CAPTURE_TOOL_RESULTS=true 才开（env 是插件最高优先层）。
process.env.OPENVIKING_CAPTURE_TOOL_RESULTS ??= 'false'

// ── 临时文件收进仓内（硬规则 8）──────────────────────────────────────────────
// 文件沙箱只放行会话工作目录：vendor 默认把 spill 写进系统临时根，dev 会话里那就是仓外，
// 每次落盘都要人点一次 approval。启动器把三个临时根变量指到 `.tmp/host/`，spill 与任何
// 走 TMPDIR 的临时产物随之入仓；`TMP`/`TEMP` 是 Windows 与部分工具的取值名。
// 显式导出过的人不被覆盖（与出网代理同款哲学：只补默认，不夺方向盘）。
const hostTmp = join(repoRoot, '.tmp', 'host')
mkdirSync(hostTmp, { recursive: true })
process.env.TMPDIR ??= hostTmp
process.env.TMP ??= hostTmp
process.env.TEMP ??= hostTmp

// ── 出网代理条件注入（规则见文件头第 4 条）──────────────────────────────────
const probe = (host, port) => new Promise(resolveProbe => {
  const socket = connect({ host, port })
  const done = ok => { socket.destroy(); resolveProbe(ok) }
  socket.setTimeout(300, () => done(false))
  socket.once('connect', () => done(true))
  socket.once('error', () => done(false))
})

// 自定义候选可能来自 scutil 或 env，形状不一定合法：取不出 host/port 就跳过，别把启动器炸掉。
const probeTarget = (url, source) => {
  try {
    const { hostname, port } = new URL(url)
    return { hostname, port: Number(port) }
  } catch {
    console.error(`[dsh] ignoring malformed ${source} ${url}`)
    return undefined
  }
}

const explicitUrl = process.env.ASSISTANT_PROXY_URL
const proxyAlreadySet = process.env.HTTP_PROXY !== undefined || process.env.HTTPS_PROXY !== undefined
let proxyUrl = ''
if (explicitUrl !== undefined) {
  // 显式指定：空串=禁用注入；非空=探测这一个，活着才注入（死了注入=把出网指向死端口）。
  if (explicitUrl !== '') {
    const target = probeTarget(explicitUrl, 'ASSISTANT_PROXY_URL')
    if (target !== undefined && await probe(target.hostname, target.port)) proxyUrl = explicitUrl
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
    const target = probeTarget(candidate, 'proxy candidate')
    if (target !== undefined && await probe(target.hostname, target.port)) { proxyUrl = candidate; break }
  }
}
if (proxyUrl !== '' && !proxyAlreadySet) {
  process.env.HTTP_PROXY ??= proxyUrl
  process.env.HTTPS_PROXY ??= proxyUrl
  console.error(`[dsh] outbound via local proxy ${proxyUrl} (web_fetch needs it under fake-ip DNS; see docs/dev.md §五)`)
}

// ── 从钉住的源码启动 CLI ─────────────────────────────────────────────────────
// 会话 workspace 默认钉在仓根（dev 会话就在本仓上工作，这是对的）。但评测与人手交接需要
// 干净目录：仓根 cwd 会把本仓自己的 AGENTS.md 注入会话的 workspace 指令，跟助手 persona
// 抢方向盘（BUG-003 实测：冷启动首开会话绕进仓库探索、不加载开场技能）。显式出口与
// ASSISTANT_DSH_HOME 同款哲学：ASSISTANT_SESSION_CWD 指定时会话落在那里，不指定默认不变。
const sessionCwd = process.env.ASSISTANT_SESSION_CWD !== undefined && process.env.ASSISTANT_SESSION_CWD !== ''
  ? resolve(process.env.ASSISTANT_SESSION_CWD)
  : repoRoot
// `--import tsx/esm` 是裸包名，Node 按子进程 cwd 解析——session cwd 挪去仓外时找不到本仓的
// node_modules。从启动器自身位置解析成绝对 file URL，cwd 无关。
const tsxEntry = import.meta.resolve('tsx/esm')

// ── 生命周期（规则见文件头第 6 条）────────────────────────────────────────────
// 默认：服务是启动器的子进程，启动器在，服务在——调用者一退（Ctrl-C、挂断、父进程死），
// 服务跟着收场，不留孤儿占端口与账本 `writer.lock`。要一个**交接出去、脱离终端**跑下去的
// 实例，调用者显式置 `ASSISTANT_DSH_DETACH=1`（人面的一键启动 `dev/env/start.sh` 就这么做）：
// 那时服务不跟着启动器死，寿命归打印出来的那个 `kill`。
const detached = process.env.ASSISTANT_DSH_DETACH === '1'
const posix = process.platform !== 'win32'
const child = spawn(process.execPath, ['--import', tsxEntry, bin, ...process.argv.slice(2)], {
  cwd: sessionCwd,
  env: { ...process.env, TSX_TSCONFIG_PATH: join(repoRoot, 'tsconfig.tsx.json') },
  stdio: 'inherit',
  // posix 下给 CLI 自己的进程组（`set -m` 的等价物），按组收才不会剩孤儿；detach 时顺带脱离终端会话。
  detached: posix,
})

let closed = false
const stopChild = signal => {
  if (closed || child.exitCode !== null || child.signalCode !== null) return
  if (posix) {
    // 发给整个组（CLI 自己 + 它启的子进程）。SIGHUP 的等价物是 SIGTERM：`kill -1 -<pgid>` 在
    // 进程组语义里是“重载”，而我们要的是“收场”。
    const wire = signal === 'SIGHUP' ? 'SIGTERM' : signal
    try { process.kill(-child.pid, wire) } catch { /* 组已经空了 */ }
  } else {
    try { child.kill(signal) } catch { /* 已经退了 */ }
  }
}

if (detached) {
  // 交接后的句柄就是这一行：pid 在，`kill -TERM -- -<pid>` 连组一起收（单发 pid 只杀 CLI
  // 本身，它启的子进程就成孤儿）。猜 pid 的人会打错杀到自己的话，所以启动器自己报。
  console.error(`[dsh] detached service pid ${child.pid} — stop it with \`kill -TERM -- -${child.pid}\``)
} else {
  // 收到可捕获的信号：转给服务（先礼后兵），服务退了我们用同一信号结束自己（让调用者看到真实死因）。
  for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
    process.on(signal, () => {
      stopChild(signal)
      setTimeout(() => stopChild('SIGKILL'), 5000).unref()
    })
  }
  // 启动器自己要退了（未捕获异常、`process.exit`）——服务不给它留成孤儿。
  process.on('exit', () => stopChild('SIGTERM'))
}

child.on('exit', (code, signal) => {
  closed = true
  if (signal) process.kill(process.pid, signal)
  else process.exit(code ?? 1)
})
