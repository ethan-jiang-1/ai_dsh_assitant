日期：2026-11-02 · 状态：**implemented**

# bundle-first：产品默认值回到 bundle，发布走 npm，安装器退成独立资产

> **部分收窄（2026-11-03）**：第 6 条的"headless 用一行 `disabled: true`"曾改成 `disabled: !!js "!ctx.get('connection')"` 自禁用，随后证明该表达式会让 entry 在创建时被跳过且永不启动——回退为"`inject` 激活 + headless overlay 显式 disabled"（见 [BUG-029](../../_backlog/_archive/fixed_bugs/BUG-029-web-only-host-rows-fail-on-tarball-install.md)）；"`ctx.inject` 条件激活"仍不做。

## 问题（可观察行为）

`_dist/` 的发行物不像 DSH 生态里的普通插件：要照说明书先建 profile、再改 profile patch，产品才亮；发不出去
（`private: true`），Plugins 页与市场卡片没有标题、图标、作者。根因不是打包脚本，是**插件形态**——
产品默认 preset 不在 bundle 里，而在安装器与开发脚本写的 profile patch 里。DSH 唯一可安装、可被市场发现的
单位是 bundle 装进用户已有 profile，所以"装进已有 profile"这条主流路径拿不到产品。

## 决定

1. **产品默认值属于 bundle patch。** `cordis.patch.yml` 用裸 id 覆盖 `agent-preset-registry.default: assistant`；
   任何安装通道（Plugins 页 / `dsh plugin add` / 市场 Discover）装进任意 web profile 都直接得到产品，
   不需要安装器或开发脚本再改一遍 profile patch。用户级 `selectedDefault` 仍优先，卸载即回退 `standard`。
2. **安装器不再是包的一部分。** `bootstrap.mjs` 离开 `files`，由 `export-dist` 产成 `_dist/bootstrap.mjs`
   ＋ `.sha256`；新增 `--package <解开的包>`，因为它不能再假设自己躺在包里。它**不再写 profile patch**——
   组合里没有产品默认就报错，而不是拿手写 patch 盖住。
3. **主渠道是 npm registry；市场索引只是发现层。** 顺序锁死：先 `npm publish`，再跑官方 generator 产
   `_dist/market/index.json`（它只读 registry）。索引是声明不是分发：DSH 出厂不配索引，市场 bundle 出厂关着。
   真发布与托管是本人动作（凭证/域名），仓库负责"可发布 + 可托管 + 过校验"。
4. **发布物不带源码。** `files` 排除 `lib/**/*.map`：源码本来就不随包，map 只剩泄漏价值（此前 client map
   嵌了 59 个 `src/` 文件、占包体 77%）。
5. **覆盖 vendor 行要有台账。** `docs/product.md` §十 记每一处 override 的复核与退役条件；裸 id 覆盖没有台账
   条目时 `pnpm verify` 红——因为目标消失时只有一条 `entry not found` 警告，行不会出现。
6. **两处判断延后，不当场扩权**：不抬 DSH pin（`ui-chat` 覆盖的退役条件是"发布人口 rc.5 起自带兜底"，登记为触发）；
   不把 web-only 行改成 `ctx.inject` 条件激活；五行靠现有 `inject` 激活，headless 在 profile overlay 显式 `disabled: true`（`dev/profiles/profile-patch-headless.yml`）。**不要**在 bundle patch 用 `disabled` 表达式 gate 晚注册的 `connection`：entry 创建时被跳过且永不启动。

## 输掉的方案

- **继续用安装器写默认 preset**：一条命令能用，但 Plugins 页/市场装出来的产品是"装了不亮"，而且
  `bootstrap.mjs` 与 `dsh plugin` 并列为第二套 profile 写者（两个写者 = 状态漂移）。
- **只把产品特殊性放客户端开始页**：能装进任意 profile，却丢掉"新会话就是章鱼管家"这个产品身份。
- **把 `ui-chat` 覆盖在本 pin 上退役**：预构建 client bundle 的兜底属于**发布人口**而非 vendor 源树；
  rc.2 发布物未验，退役等于用没跑过的版本下线一个崩溃绕行。抬 floor 是独立工作，混进来会污染两边的证据。
- **把 web-only 行改成 `ctx.inject` 条件激活**：能让 bundle 在任何 profile 静默不激活，代价是"永远等不到服务"
  也不报错；当前取舍是 **`inject` 激活 + headless overlay 显式 disabled**，`ctx.inject` 条件激活仍不做。
- **自己拼市场 JSON**：format 1 有生成者义务（version/publishTimestamp/engines.dsh/dist-tags 必须与 registry
  一致、显示字段按已安装插件规则取），自己拼就是第二套实现且必然漂移。

## 后果

- 装 bundle 即产品：`--dump-config` 就有 `default: assistant`；开发环境（`dev/env/setup.sh`）也不再抄 profile patch，
  回归藏不住。
- `pnpm publish-release`（预检，默认不发）/ `pnpm market`（发布后）成为发布路径；`_dist/` 里 tarball、手册、
  安装器、checksum 同版本产出。
- 包体 891 KB → 548 KB；条目 605 → 321；`private` 缺省，`npm publish --dry-run` 通过。
- Plugins 页/市场卡片读到 `{en: Smart Assistant, zh: 章鱼管家}` 与图标（用宿主 `readPluginMeta` 实测）。
- 派生搜索索引离开 home 根，落到 `<home>/cache/assistant/`；卸载后的 home 根可解释。
- 四条新门禁（包形状、override 台账、市场条目、文档形状）各带负例夹具。

## 验收

工作台账、逐片证据与开放项在收口卡（已归档）：[插件生命周期对齐](../../_backlog/_archive/settled_issues/261101-plugin-lifecycle-align.md)。
仍未取的本人动作（真 npm 发布、索引托管）与触发条件记在该卡。

## 与旧决定的关系

[产品 profile 对齐](2026-11-01-product-profile-alignment.md) 的 1/3/4/5 条仍有效（dedicated profile 作为部署选项、
产品行读 Config、首启由客户端回答、Plugins 页为主路径）；本决定**收窄第 4 条**：安装器不再随包、也不再写默认值。
[产品 profile 对齐] 里"默认 preset 只能靠安装器写"的部分被本决定推翻。
