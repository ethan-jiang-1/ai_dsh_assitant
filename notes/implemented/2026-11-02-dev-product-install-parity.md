日期：2026-11-02 · 状态：**implemented**

# dev 快环与用户安装路径的 parity：表、tarball 通道与 overlay

## 问题（可观察行为）

仓内开发启动（`pnpm start`）与用户安装走两条不同的载入路：dev 用 pnpm link 装包、用 vendor 源码运行；
用户装的是 tarball、跑已安装的 `dsh`。结果是"dev 里验过的"与"用户装上去会经过的"之间没有登记面：
包的 `files` 白名单、依赖闭包与 packed manifest 只在发布 smoke 里出现，而仓内没有 CI；dev home 还会
累积生成器写下的 profile 用户层（旧的 registry override、headless roster、OV 旋钮），既与
`docs/dev.md` 的"dev 不写 profile patch"相反，也会掩盖"默认值没进 bundle"的回归。

## 决定

1. **差异有唯一登记表。** `docs/dev.md` §十 列机制点（用户路径 / dev 快环 / 判定 / 证据 owner）。
   允许差异只落三类：调试必需、隔离、热重建。表外差异 = `dev-parity` 门禁红。
2. **快环保留 link，另设 tarball 通道。** link 是热重建的前提，不放弃；新增 `pnpm install-parity`
   （pack → 干净 web profile → `dsh plugin add` → `--dump-config`），只证明安装断点与包字节，不 boot。
   boot、UI、升级与数据边界仍归发布前的 smoke。
3. **dev-only 行不写 profile 用户层。** dev-task 的 roster insert 与 OV 旋钮写进
   `$DSH_HOME/dev-overlay-<profile>.yml`，由 `dev/env/dsh.mjs` 按 `--profile` 以 `--patch` 注入。
   `setup.sh` 迁移生成器写过的 patch（留 `.dev-backup`）；用户自己加过行的文件不动。
4. **安装路径事实单一。** 安装器不写默认 preset（bundle patch 拥有它）；产品合同与安装手册生成器
   同一个口径。
5. **门禁守形状，不守语义。** `dev-parity` 只回答"表在不在、行够不够、overlay/lane/脚本形状还在不在"；
   行内容的正确性由同 diff 人审与真机 dump 负责。

## 输掉的方案

- **把 dev 快环改成 tarball**：安装源与身份都同形，但每次 build 后都要重装，热环没了；安装源的风险
  由 `pnpm install-parity` 已覆盖。link 作为"允许差异（热重建）"登记。
- **只加 parity 表、不加证据通道**：表要么把安装源写成"同形"（假），要么写"不同"但不给补救（把已知
  风险写成文案）。
- **把发布 smoke 全塞进 `pnpm verify`**：多条要 Chrome/网络/真 boot，结构门禁会变成发布流水线，单次
  成本与阻断面都不划算。
- **照抄参考仓的"profile 同名 + 团队层版本"**：我们有两条 dev profile（web / headless，混装会撞
  duplicate id），没有团队层；同名会抹掉"在 dev home 还是在产品 home"的提示，版本面已有
  compat/pnpm 矩阵。

## 后果

- dev 组合与用户组合的差异变成一张可对账的表；新增机制点必须同 diff 加行，否则门禁红。
- 开发环多了一条秒级 tarball 通道；包形状与依赖闭包的回归不再只等到发布。
- dev home 的 profile 用户层回到模板内容；dev-only 行透明地住在 overlay 里，`--dump-config` 可见。
- 旧 dev home 升级会经历一次 patch 迁移（`.dev-backup` 保留原文件）。
- 仍未取：profile 名对齐、dev profile 的 bundles 对账、launcher 注入的第二形态——触发条件记在卡上。

## 验收

工作台账、逐片证据与开放项在卡上：[dev 快环与用户安装路径对齐](../../_backlog/issues/261102-dev-product-install-parity.md)。

## 与旧决定的关系

[bundle-first](2026-11-02-bundle-first-lifecycle.md) 规定默认 preset 属于 bundle patch；本决定推进一层：
dev-only 行属于 `--patch` overlay，profile 用户层不写。[产品 profile 对齐](2026-11-01-product-profile-alignment.md)
的安装路径事实不变，只修正了"安装器写默认 preset"的旧口径。
