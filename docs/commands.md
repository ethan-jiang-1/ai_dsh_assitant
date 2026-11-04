# 命令参考（完整清单）

> 本文件拥有**完整命令清单**（alias × 用途 × 判据指针）；根 [`AGENTS.md`](../AGENTS.md) 只留启动（默认 `pnpm start` / 手工五步）+ 日常四条 + 收尾一键。
> 每条命令的深层判据与坑 = [`dev.md`](dev.md) §四/§五；改什么 → 跑什么的证据选择 = [`testing.md`](testing.md) §一页证据地图。
> 本文件不拥有启动语义（根 `AGENTS.md` 的启动段）或发布顺序（[`dev.md`](dev.md) §九）。
> 判据先行：**装好了** = `node_modules/.modules.yaml` 在；**建好了** = `vendor/dsh/packages/boot/app-boot/lib/index.js`、
> `vendor/dsh/packages/client/modules/lib/client.js`、`vendor/dsh/apps/web/dist/index.html` 三个都在（`--dump-config` / `--help` 不加载 lib，不能当判据）。

> **读法**：启动与日常 → 开发环与生成物 → 渲染与反馈 → 组合与探针 → 测试层 → 评测与报告 → 发布与兼容 → 维护 → 部署与装配。

## 启动与日常

`pnpm start` 的语义、手工五步与隔离 home 规则 = 根 [`AGENTS.md`](../AGENTS.md) 的启动段（常设指令 owner）。日常四条（按需单跑）：

```sh
pnpm build              # tsc 出 lib/ + tsdown 出 classic bundle：preset 行加载的是构建物，不是源码
                        #    （忘了它的代价由 verify 的 build: 门禁抓；起服务时 start.sh 会先自证并自动补）
pnpm typecheck          # 委派包级：tsc -b + 测试工程；跑完记得重跑 pnpm build（tsc 会覆盖 classic bundle）
pnpm test               # vitest 全量：分层 spec（纯核+服务合同+agent/client/composition/tooling）
pnpm verify             # 机械门禁链（覆盖面清单 = scripts/checks/verify.mjs）
```

**收尾一键（地板）**：

```sh
pnpm check              # typecheck → test → verify（顺序由脚本钉住）
pnpm check:full         # 阶段收口：check + web-face-check --all + upgrade-smoke + release-smoke
                        #   PASS/FAIL/BLOCKED 分开汇总；floor 失败即停，其余车道尽量跑完
```

`pnpm test:coverage`：同一套全量 + coverage 报告（落 `.tmp/coverage`；只报告，不设阈值）。

## 开发环与生成物

```sh
pnpm gen-paths          # 从 vendor/dsh 重新生成运行期解析入口 tsconfig.tsx.json（换 pin 后必跑）
pnpm gen-catalog        # 重新生成 docs/package-catalog.md（改组合行/exports/工具动词后必跑；freshness 门禁守）
pnpm clean              # 删 lib/（tsc 不清理已改名/删除文件的旧产物；改名后先 clean 再 build）
pnpm sweep [--root <dir>] [--apply] [--min-age-minutes <n>] [--keep <名字>]
                        # .tmp 清扫（硬规则 8）：默认 dry-run；--apply 才真删；跳过 openviking / 新 mtime / 打开句柄 / --keep
pnpm hygiene [--top N] [--json]
                        # 仓库卫生读数：.tmp 可回收项 + worktree + branch + 未提交；只报告，不删除
```

## 渲染与反馈

```sh
pnpm preflight '<URL>'  # 开屏前门禁：证明装得上（auth/boot 图/每个 combo 可解析）；不证明渲染出来
pnpm shots '<URL>' --dom --size 1600x1000 --name <名字>
                        # 渲染证据：PNG + DOM 两件（落仓内 .tmp/shots/）；--eval 拿交互态
pnpm web-expected '<URL>' --scenario <场景目录>
                        # web 渲染期望比对（场景必填；漂移 exit 1）；重录 --refresh
                        # 场景契约 = snapshots/web-face/<场景>/README.md
pnpm web-face-check [--all] [--scenario <名>] [--refresh]
                        # 默认 4 客户面；--all 加 2 产品面 + 4 Viki 调试面（固定 OV mock + #debug=1）
                        # 隔离 home → seed → boot → 比对 → 收；起手自证 lib/ + Chrome，缺失 BLOCKED 2
                        # --refresh 只用于显式 --scenario（拒绝 --all 批量重录）
pnpm session <id|prefix> [--home <dir>] [--reasoning] [--tools] [--system]   # --tools 打印工具名；--system 按标题打印系统提示词与字节
pnpm session --recent [n] [--home <dir>]                          # 最近的会话（时间+cwd+preset），并行会话按上下文挑
                        # 会话日志路径 + request/tool 时间线（symptom→session join；读 dev home）
pnpm loop-probe '<URL>' --ask '<问句>'   # 首用闭环探针：真发问真等回复，JSON 判决 + 截图
pnpm desk-walk '<URL>' [--home <dir>]    # 处理流真机走查（真模型）：屏幕文本+截图
pnpm projection-live [--home <dir>]      # live 补证：断连/重连、3 次重载、420 窄视口、滚动位置；无模型
                                         # 首次先 prepare/setup
pnpm projection-selection '<URL>'        # 交互证据门：点选事项→详情 quote/session 读回（须带 eight-matters 夹具）
pnpm agent-preset-ui '<URL>'             # 运行中干净实例的 Web preset 选择探针（Settings → Agent 预设 → 章鱼管家）
```

## 组合与探针

```sh
pnpm dsh --profile dev --dump-config     # boot-free 查组合树：行 id、disabled、realm 一目了然
pnpm dsh --profile dev-task --patch dev/probes/session/preset-runner.patch.yml "<task>"
                                         # preset 挂载的 one-shot（验证自动化驱动）
pnpm dsh --profile dev-task --patch dev/probes/session/preset-runner-replay.patch.yml "<task>"
                                         # 同上但 keyless：llm-replay 回放替掉真实 adapter，无 key 出真实会话日志
```

## 测试层

```sh
pnpm test:domain        # 纯核规则与存储基础
pnpm test:host          # 服务合同（真 cordis + 临时 home；route 核可直测）
pnpm test:agent         # agent 面合同（段落预算、工具 presenter、养护回合）
pnpm test:client        # 浏览器注册与交互状态合同（React shim，无浏览器）
pnpm test:tooling       # 仓库工具核与门禁族
pnpm test:composition   # 真 Loader + built lib（先 pnpm build）
```

## 评测与报告

```sh
pnpm eval               # 行为评测：真实请求经 preset 会话，判定读会话日志（串行）
pnpm eval:domain        # 领域评测：本人出题逐题跑 → 人打分的报告（模板 = dev/eval/domain/TEMPLATE.md）
pnpm eval:continuity    # 续接行为地板：隔离 fixture 首回合读回判据（红绿对照挂 verify）
pnpm usage [--since N]  # 意图级仪表：会话/工具混合/自用率/摩擦（读 dev home；--since 只看最近 N 天；--self-check 仪表自证）
pnpm code-shape [--top N] [--window N] [--json]
                        # 代码形状读数：函数长度/决策点/重复窗口；只报告，不设阈值（--self-check 仪表自证）
pnpm desk-loop          # 培养循环摩擦报告（读 dev home 会话日志）
pnpm observe [--home <dir>]   # 输入边界 30 天观察读数（A/B/C 口径与读数档 = docs/dev.md §五）
pnpm ov-trial-rt        # OpenViking 真服务记忆往返试验（前提 server 已在 127.0.0.1:1933）
```

## 发布与兼容

```sh
pnpm install-parity     # 开发环的安装面快通道：pack → 干净 web profile → dsh plugin add → dump 断言（不 boot、无浏览器）
pnpm release-smoke      # pack → 干净 home → dsh plugin add → 组合断言 + live turn（key = 环境变量或 dev home 凭据；改动发布物/依赖/preset 包装/工具面必跑）
pnpm upgrade-smoke      # 旧包→新包升级 + remove/re-add 后两目录数据保留（`-- --old <上一个发布 tgz>` 用真实前版）
pnpm pack-parity        # 诊断：pnpm pack 与 npm pack 的文件集/内容是否一致（不一致 exit 1）
pnpm standalone-smoke   # 无 .git 提取包 → bootstrap → 隔离 home → preflight → client boot/UI → stop
pnpm product-smoke      # 安装器：pack → bootstrap --workspace → profile/Config → 真 boot → workspace.json + in-process 会话 cwd → stop
pnpm product-native-smoke  # 无安装器：web 模板建 assistant profile → dsh plugin add → 真 boot → GET not-configured/onboarding → POST → 登记 + Config + 会话 cwd
pnpm web-install-smoke [-- --tarball <old> --upgrade-tarball <new>]
                        # 标准 web profile：安装 → preflight → client boot/preset UI；upgrade 选项再加运行中升级
pnpm install-resilience-smoke  # 损坏 tarball 被拒 → profile 保持空 → 有效 tarball 重试；两个并发 add 一份依赖
pnpm bootstrap-guards-smoke    # 独立启动的坏输入：profile 穿越/保留名/缺旧 pnpm/npm 在创建 home 前拒绝
pnpm pnpm-matrix -- --pnpm <v> --expect install|reject   # pnpm 版本矩阵
pnpm prompt-smoke       # 无 key 回放一次 preset one-shot，断言 prompt 段落与自有工具真进了请求（清单/计数 = `package-catalog.md`）；前置 = dev-task profile + PATH 上有 `zstd`（先 `pnpm start` 或 `bash dev/env/setup.sh`），缺任一 = BLOCKED exit 2
pnpm compat-matrix -- --dsh <path> --version <v> --expect install|reject   # 真实 DSH CLI 的下界/拒绝矩阵
pnpm export-dist        # pnpm pack → _dist/ 的 tgz + 清单边界断言 + 自动生成《安装手册》
pnpm publish-release    # 发布预检：版本一致/干净树/版本未发过/build/export-dist/verify；加 `-- --publish` 才真发 npm，且发布 `_dist/*.tgz` 同一份字节
pnpm market             # npm 发布之后：官方 generator 产 _dist/market/index.json（只读 registry，失败不落残留）
```

## 维护

```sh
pnpm sync-dsh -- --tag <dsh-tag>   # 换 submodule tag + SHA 簿记 + typecheck + 对照 docs/discipline.md 重校纪律表
pnpm repair-vendor                 # 修 vendor 构建产物的混合态（build 半途失败后）
```

## 部署与装配（家在 README）

`pnpm import-knowledge` 与 `pnpm expert-setup` 的语义、参数与「装配不覆盖主人」边界 = [`README.md`](../README.md)「知识导入」「专家部署装配」两节；本文件不复制。
