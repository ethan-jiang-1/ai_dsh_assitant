# P4 产品源码职责切分：src 按 domain/host/agent/client/dev 归位（四片迁移 + 段末出口四证）

日期：2026-10-05 · 状态：**implemented**

## 决定

按[提案](../proposed/2026-10-05-repo-navigability.md) P4 与冻结卡「主要迁移归属」表，包 src 从平铺目录切分为职责子树
（client 原地不动；一次一片独立提交锚点；**稳定外部 interface 全程不变**——包名、工具名/动词、preset/组合行 id、
`ctx.assistantMemory`、exports 子路径键、根命令名、两 profile 语义、home/dataDir、存储格式）：

| 片 | 提交 | 内容 |
|---|---|---|
| 1 host | `61a867f` | `src/index.ts` 服务实现（1178 行）迁 `src/host/index.ts`，根 index 改**薄导出**（`export *` + `export { default }`，同 class 身份；cordis 模块增广随实现加载）；knowledge-approve-remote、web-branding 随迁 `src/host/` |
| 2 agent | `c18178a` | tool-memory/research/knowledge、tool-support、home-preamble、memory-digest、learn、ov-shield 八件迁 `src/agent/`；agent 内互引（learn/tool-support）保持兄弟相对零改动 |
| 3 domain | `65ca01b` | home/memory/research/skills/knowledge 五件迁 `src/domain/`；域内互引保持兄弟相对零改动 |
| 4 dev | `f2cfd25` | preset-runner 迁 `src/dev/preset-runner/`（`./preset-runner` 出口键保留） |
| 段末修复 | `1209356` | dev/deploy 两 CLI 的 src import 指新树（扫尾自查抓到的真断链） |

**exports 映射**：12 个键全保留，仅目标换 lib 新树——`.`→`lib/index.js`（薄入口）、`./tool-*` 等 7 键→`lib/agent/`、
`./knowledge-approve-remote`→`lib/host/`、`./preset-runner`→`lib/dev/`、`./client` 不变。patch 行按包名经 exports 解析，
行 id/name 全程不变。**守卫与生成器显式适配**（不再从子路径猜布局）：export-shape 的 `sourceOf` 改显式
`SOURCE_LAYER` 映射；gen-catalog 工具推导读 `src/agent/{dir}/`；verify 的 REQUIRED_PATHS×4 与两处 join 硬编码
（SKILL_NAME_PATTERN、docs/home.md 房间合同）同片迁移。

## 证据（真跑过的命令）

- **每片干净构建 + 全链**：`rm -rf lib && rm -f tsconfig.tsbuildinfo && pnpm build` → `typecheck` → `test`（43 件
  374 断言全绿零 skip）→ `verify` 34 全绿。**构建教训（片2 实证）**：`rm -rf lib` 不够——包根 `tsconfig.tsbuildinfo`
  残留使 `tsc -b` 只发射变更树（preset-composition 抓到 `lib/index.js` 缺失），必须连 tsbuildinfo 一起清。
- **段末出口四证**：
  1. `pnpm release-smoke` PASS——pack → 干净 home → `dsh plugin add` → 组合断言（host 行在场、preset 为 profile
     默认、preset-mounted runner 可组装）。
  2. `pnpm dsh --profile dev --dump-config`——preset-assistant、assistant-knowledge-approve、assistant-home-preamble、
     assistant-memory-digest、assistant-memory-tool、assistant-learn、assistant-ov-shield 行 id/name 全部在场未变。
  3. **keyless replay 经真实 preset 装载并查日志**：`pnpm dsh --profile dev-task --patch
     dev/probes/session/preset-runner-replay.patch.yml "probe"` → 「probe turn complete」；session log 请求侧
     `agentPreset: assistant`，组装出的请求带 35 工具、四个 assistant 工具（memory/research/knowledge/reflect）全在场。
  4. **新 tarball 逐个解析全部公开 exports**（extract 后逐键验 js+types 文件在场，不用 workspace alias）：12/12 键
     零失败；tarball lib 顶层 = agent/client/dev/domain/host + index.*，**零旧布局残留**。
- **deploy CLI 解析证明**：expert-setup/import-knowledge 三处 import 经 tsx 实际加载成功（`AssistantMemory` class
  身份在、DEFAULT_SOUL、planSourcePage）。
- 门禁咬合实录：链接门禁三轮共抓到 11 处漏改（snapshots/archived/活跃台账的 anchor 与 backtick 路径）——修后复绿。

## 输掉的方案

1. **根 index 保持 1178 行实现不迁**：稳定入口与实现混居，host 面无法成为职责子树——输给薄导出（同 class 身份 +
   模块增广随实现加载，export-shape 的 Service default 检查继续通过）。
2. **domain 先行或一次性全搬**：domain-first 虽省一次 import 改写，但外部合同（薄入口模式）最后才定形；一次性全搬
   路径失效面叠加不可定位——输给冻结卡既定次序（host 先稳定入口，再 agent/domain，一次一片）。
3. **exports 键随布局改**（如 `./agent/tool-memory`）：破坏 dev patch 与安装方的解析——键是合同，目标可变键不可变。
4. **守卫继续从子路径猜 src 布局**：移动即静默漂移——输给显式 SOURCE_LAYER 映射（export-shape）与显式目录清单
   （gen-catalog），猜不中就响亮失败。
5. **只靠 typecheck/verify 收尾**：dev/deploy 的 tsx 运行时 import 两道门都不覆盖（扫尾自查抓到真断链）——文件迁移
   的消费者闭合要含「运行时才解析」的调用方，逐个真加载证明。

## 范围与后果

P4 完成：src 五职责子树成形（domain/host/agent/client/dev），lib 产物树与 exports 一一对应，gen-catalog 重生成后
freshness 绿（工具 label 4 行变化）。**未验项（如实，P5 出口必跑）**：新上下文无指引驾驭验收（P5 全部内容）；
`pnpm eval` / `loop-probe` 真模型行为未跑（模型可见面零改动——四工具/段落文本未动，组合与装载已由 replay+dump-config
证）；`pnpm export-dist` 未跑（与 release-smoke 同包装面，手动分发时再验）。**发现的缺口（不搭车修）**：
gen-catalog 的 devPatch 仍指向 dev 根下的 preset-runner.patch.yml——该文件 P2 后实际位置是
[`dev/probes/session/preset-runner.patch.yml`](../../dev/probes/session/preset-runner.patch.yml)，existsSync
静默空转——devRows 为空不影响当前 freshness，但台账失真，值得后续小修或门禁化。下一步：P5 驾驭验收——新上下文
只从根文档完成五条功能定位/验证/失败定位，真实证据记 implemented 后整个提案收卷。
