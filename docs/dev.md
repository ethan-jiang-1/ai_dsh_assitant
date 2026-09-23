# 启动与调试（dev 运行手册 · 只写现在）

> 这份手册回答：怎么在不碰日用 DSH 的前提下，从零跑起本插件的 dev 实例。
> 家的布局契约在 `docs/home.md`；插件架构在 `docs/architecture.md`；决策在 `notes/`。

## 一、隔离模型（什么被隔离、什么没有被隔离）

一切持久化的根是 `DSH_HOME`（解析优先级：显式配置 > `$DSH_HOME` > `~/.dsh`）。
**dev 实例 = `DSH_HOME=<repo>/dev/harness-home`**，由 `scripts/dsh.mjs`（`pnpm dsh` 的唯一入口）
无条件强制 —— 继承来的 `DSH_HOME=~/.dsh` 会被覆盖并在 stderr 打一行说明；
显式出口是 `ASSISTANT_DSH_HOME`（冒烟/实验用，指向 `~/.dsh` 会被警告）。

| 通道 | 是否随 DSH_HOME 隔离 | dev 的处理 |
|---|---|---|
| profiles / sessions / storages / attachments / settings / credentials / 技能用户根 / `.agent-presets` / 家的 dataDir | ✅ | 自动落在 dev home |
| skills 的共享 agent 根（默认 `~/.agents`） | ❌ 不隔离 | 启动器接管为 `$DSH_HOME/agents-home` |
| telemetry | 身份按 home 独立；默认 FEEDBACK_ONLY | 启动器设 `DSH_TELEMETRY_DISABLED=1` |
| spill 临时文件 | ❌ 用 OS tmpdir（`dsh-spill-*`），启动清扫会清过期文件 | 低危：dev 启动可能清掉日用实例**已过期 30 天**的临时输出 |
| pnpm 全局 store | ❌ 内容寻址缓存 | 良性共享 |
| Web 端口 `127.0.0.1:3080` | ❌ | 与日用 web 撞车 = boot **fail loud**（不是劫持，实测 `EADDRINUSE`）；日用开着时用 `pnpm dsh --profile dev --port 0`（OS 分配端口 + token 鉴权，实测可跑） |
| LLM key | ❌ 网络面 | dev home 的 `.credentials.yaml` 自己配一份，与日用凭据互不可见 |

`.env` **不能**设置 `DSH_*`（bootstrap-only 前缀，DSH 直接抛错）—— home 只能来自继承环境或启动器。
工具子进程拿到的 `DSH_*` 会被 DSH 清洗后重注入本进程解析值，不会漏继承。

## 二、两个解析门面（编译期 vs 运行期）

类型检查与"从钉住的源码启动"都要把 `@deepseek-ai/*` 解析到 vendor/dsh 的 **`src`**（而不是未构建的
`lib/` 产物）——typecheck 的报错落在真实源码，agent 也能顺着跳转读实现。本 repo 用**两个 tsconfig
门面**做这件事，职责不同，别混：

| 门面 | 管什么 | 谁维护 |
|---|---|---|
| `tsconfig.base.json` | **编译期**：只列我们直接 import 的 6 个 `@deepseek-ai/*` 包（paths → vendor `src`）+ 公共编译选项；`packages/dsh-smart-assistant/tsconfig.json` extends 它，并为每个包配 project reference —— `tsc -b` 按项目引用构建它们，API 漂移在编译期暴露，又不把 DSH 源码并进本程序（撞 `rootDir`） | 手维护：src 里新增 `@deepseek-ai/*` import 时加一行 paths（`pnpm verify` 机械检查） |
| `tsconfig.tsx.json` | **运行期**：全量别名（280 条），`scripts/dsh.mjs` 经 `TSX_TSCONFIG_PATH` 让 tsx 加载 DSH 的 `src` 启动 CLI | `pnpm gen-paths` 从 vendor/dsh 生成；`pnpm verify` 查不过期（换 pin 后必跑） |

`pnpm typecheck`（根 `tsconfig.json` 按项目引用聚合到包工程）走编译期门面；`pnpm dsh` 走运行期门面。

## 三、一次性准备（每个 pin 一次）

```sh
pnpm install                              # 并入 vendor/dsh 整树
pnpm --dir vendor/dsh install             # vendor 树自己的依赖（1266 包）
pnpm --dir vendor/dsh run build:native-system
pnpm --dir vendor/dsh run build:lib       # host + client 双 face 的 lib/
pnpm --dir vendor/dsh run build:web       # 只有跑 Web UI 才需要（前端 dist）
```

- **known pitfall**：vendor 树的根 `postinstall`（lefthook）在 submodule 里会失败
  （`extensions.worktreeConfig` + `core.worktree` 冲突）。包已全部就位，可忽略；
  但它会卡住 pnpm 的 `verify-deps-before-run` 自动 install —— 用
  `pnpm --config.verify-deps-before-run=false run <script>` 绕过。
- 完整 boot 需要构建产物（40+ client bundle、native addon、各包 `lib/`）；
  `--dump-config` / `--help` 不加载它们，**不能**作为"能 boot"的证据。

## 四、开发环（日常）

```sh
bash dev/setup.sh          # 幂等：建 dev（web）+ dev-task（headless）两个 profile + link 装插件
pnpm dsh --profile dev-task "one task"   # one-shot 任务（headless）＝ host 面冒烟；不进 preset（§五）
pnpm dsh --profile dev-task --patch dev/preset-runner.patch.yml "<task>"   # preset 挂载的 one-shot（验证自动化；行替换形状见该 patch 头注）
pnpm dsh --profile dev --port 0 --no-open   # Web UI：**不自动开浏览器**
pnpm preflight '<server 打印的 URL>'    # 开屏前检查；绿了才把 URL 交给浏览器
pnpm typecheck && pnpm test && pnpm verify
```

**为什么 preflight（2026-09-24 两轮实锤）**：客户端 bundle 若不能被经典脚本组合解析，
一条语句就让整条 combo 全灭、其后所有注册丢失，浏览器只报一句莫名的 "loaded without
registering"——而第一个打开页面的人就成了 crash-test dummy。`pnpm preflight` 用浏览器
同款姿势（token → cookie → 文档）逐个取回 plugin 组合脚本并用 `new Function` 做**经典脚本
编译检查**（只编译不执行）。它证明：服务器在、认证通、boot 图组装了、每个 combo 可解析、
本仓客户端 bundle 在列且注册在案；**不证明**客户端树真的渲染——那仍是真会话的事。

**两个 profile 是刻意的**：web-app 与 headless 两个 bundle 都 `insert` 了 `id: code-runtime`，
混装进同一个 profile 必撞 `duplicate loader entry id`（DSH 已把该组合列为退役元组）。
- `dev` = `[dsh-base, dsh-web-app, dsh-smart-assistant]`，roster 用 dev/profile-patch.yml（替换语义）。
- `dev-task` = `[dsh-base, dsh-headless, dsh-smart-assistant]`，roster 用 dev/profile-patch-headless.yml
  （insert 语义 —— headless 模板里没有 agent-presets 行可替换）。两个 patch 文件不可互换。

**三条纪律（为什么"改了不生效"）：**

1. preset 行加载的是**构建物**（package.json exports → `lib/`）——改 `src/` 后必须 `pnpm build`。
   setup.sh 用**裸路径 link**（pnpm symlink 语义）装插件，所以不用重新 `plugin add`；
   `file:` 是复制语义，开发环禁用（改码必须重装）。
2. preset 代际只看 `agent.cordis.yml` 的 mtime+size —— 改 `presets/assistant/skills/*` 或
   `preset.yml` 后要 `touch` 该文件，新会话才拿得到新代。
3. 换 vendor/dsh pin 后：`pnpm gen-paths` → 重跑第三节的 vendor 构建 → `pnpm typecheck`。

## 五、踩坑清单（每条都真踩过或有源码证据）

| 坑 | 事实 | 正确做法 |
|---|---|---|
| `pnpm dsh web --profile dev` | `dsh web` 别名**硬编码 profile 'web'**，会在 dev home 里自动创建一个 shipped `web` profile | 用 `pnpm dsh --profile dev`（dev profile 自带 web-app bundle） |
| one-shot 无反应 | web 模板没有 one-shot runner 行（在 `@deepseek-ai/dsh-headless` bundle） | setup.sh 已把 headless 追加进 profile bundles |
| 无 key 的行为 | boot 不失败；首个 live turn 抛 `MISSING_CREDENTIAL`。"self-skip" 是**测试机制**不是产品行为 | 在 `$DSH_HOME/.credentials.yaml` 配 `DEEPSEEK_API_KEY`（或 `$DSH_HOME/.env`） |
| **one-shot 不进 preset** | headless runner 建**裸 agent**，roster 只在"创建会话的一方"被消费（web 会话创建 / 子 agent 继承父 composition）—— vendor 源码注释明文："A deployment that DOES configure one has to join it here first" | preset 行为（三工具/persona/摘要段落）用 **dev profile 的 Web UI 会话**验证；dev-task 只冒烟 host 面（插件装载、家 scaffold、服务行） |
| API 抖动 | `TRANSPORT` 错误（"DeepSeek API request failed"）会触发 attempt 重试循环，模型可能开始即兴行为 | 重试即可；会话日志（`sessions/<proj>/<id>/session.v3.jsonl.zstd`）能逐事件还原 |
| vendor install 失败 | 根 postinstall（lefthook）在 submodule 里必然失败 | 包已就位；build 用 `--config.verify-deps-before-run=false` 绕过 |
| 命令表象不可信 | `--dump-config`/`--help` 不加载 loader entries | "能不能跑"的最低证据 = 真 boot 一次 |
| preset 遮蔽 | roots 先到先赢同 id；roster 的 `!!js` 读 `ASSISTANT_PRESETS_DIR ?? cwd` 拼接 | `pnpm dsh` 固定以 repo 根为 cwd，兜底成立 |
| Web 开屏 `resume failed` | 残留的旧 dev web 进程仍持有空白 seed 会话的跨进程写锁（`session.lock` 是 flock 目标，进程死即释放）；web 客户端开屏按 workspace 最新会话自动恢复空白会话，新实例撞锁 | 起新例前 `lsof -iTCP -sTCP:LISTEN -P` 找本仓 cwd 的残留 node 并 kill；锁随进程死亡自动释放，勿手删 |

## 六、组合的四个层（dev 里谁改谁生效）

```text
bundle 层（@deepseek-ai/dsh-base → dsh-web-app → dsh-headless → dsh-smart-assistant）
  → profiles/dev/cordis.patch.yml        # dev/profile-patch.yml 拷贝（roster 指向 repo presets）
  → $DSH_HOME/cordis.patch.yml           # home 级（作用于该 home 全部 profile）—— dev 不用它
  → --patch                              # 临时覆盖
```

patch 是**整行 config 替换**（不是合并）；`insert` 追加行；id 没命中只 warn。
诊断组合用 `pnpm dsh --profile dev --dump-config`（boot-free，输出整棵组合树）。
