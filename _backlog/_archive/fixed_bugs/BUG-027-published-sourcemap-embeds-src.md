---
status: 已修
severity: P1
opened: 2026-11-01
---

# BUG-027：发布物内含 59 个 `src/` 源文件（client sourcemap 的 `sourcesContent`），三条门禁都看不见

> 严重级别：P1（重要）｜发现：2026-11-01｜状态：已修（2026-11-02）

## 症状

`_dist/dsh-smart-assistant-0.1.13.tgz`（891,199 B）里最大的一份文件是
`package/lib/client/index.js.map`（681,941 B，约 **77%** 的包体），它的 `sourcesContent` 逐字嵌进了
**59 个 `../../src/{client,domain}/**.ts`** 源文件（合计 499,244 字符）。

```
$ tar -xzOf _dist/dsh-smart-assistant-0.1.13.tgz package/lib/client/index.js.map | node -e '
  const m=JSON.parse(require("fs").readFileSync(0,"utf8"));
  console.log(m.sources.filter(s=>s.includes("/src/")).length, (m.sourcesContent||[]).reduce((a,s)=>a+s.length,0))'
59 499244
```

这与发布宪章 [`docs/release.md`](../../docs/release.md) §三「发布物…不含…」与
[`export-dist.mjs`](../../scripts/release/export-dist.mjs) 头注「开发面不进发布物」直接冲突：
**开发面确实进了发布物**，而且是原文，不是类型或注释。

## 根因（假设）

三处判据都只看"条目名"或"文本后缀"，不看 `.map` 的**载荷**：

1. `export-dist.mjs` 的禁入清单按**路径前缀**判断（`package/src/`、`package/tests/`…），
   `.map` 的路径是 `package/lib/...`，通过。
2. `handoff-scan.mjs` 只扫 `TEXT_EXTENSIONS` 里的文件，`.map` 不在其中，通过。
3. `build-freshness.mjs` 只比较 `lib/index.js` 与源码时间戳，不读 map 内容。

而 `tsdown` 默认给浏览器入口产出带 `sourcesContent` 的 sourcemap，`files` 又是整个 `lib`，
于是 map 随包发出。**待确认**：是 tsdown 默认值还是本包 `tsdown.config.ts` 显式开了 sourcemap。

## 复现

任一 `pnpm build && pnpm export-dist` 后用上面的一行 node 读包内 `package/lib/client/index.js.map`；
`_dist/` 现有 0.1.13 产物已可直接复现。

## 修复关联

- 与 [插件生命周期对齐卡](../settled_issues/261101-plugin-lifecycle-align.md) 的 S2（发包就绪）同批处理：
  一公开就要发 npm，带着源码发出去属于**发布前必须清零**的项。
- 候选修法（择一或并用）：① 发布构建关掉 `sourcesContent`（`sourcemap: 'hidden'` 或
  `sourcesContent: false`）；② `files` 排除 `**/*.map`；③ 在 `export-dist` 的清单边界里加
  "包内任何 `.map` 不得带指向 `../src/` 的 `sourcesContent`" 的断言。
- 建议②+③：体积从 891 KB 降到约 210 KB，且门禁可造红证明。

## 修复（2026-11-02）

- `packages/dsh-smart-assistant/package.json` 的 `files` 追加 `"!lib/**/*.map"`：**map 不进发布物**。
  源码本来就不随包（`files` 不含 `src`），map 对消费者只剩泄漏价值；本地 `lib/` 仍保留 map，开发调试不受影响。
- 判据进 `scripts/release/publish-shape.mjs` 的 `sourcemapLeakProblems`（按**内容**判：任何 map 的
  `sourcesContent` 嵌了本包 `src/` 就红），由 `export-dist` 对真实 tarball 调用，不再靠路径前缀。
- 负例夹具：`packages/dsh-smart-assistant/tests/tooling/publish-shape.spec.mjs`（泄漏 map / 无 sources 的
  payload / 坏 JSON 三红，依赖源与无 map 两绿）。证据：该 spec 11 passed；`pnpm export-dist` 报
  `no shipped map embeds package sources — 0 map(s) shipped`；包体 891 KB → 548 KB，条目 605 → 322。

## 修好定义

- 新 `_dist` 产物里不存在带 `src/` 载荷的 `.map`（或根本没有 `.map`）；
- `pnpm verify`（或 `export-dist` 的清单边界）新增一条**带负例夹具**的检查：
  拿当前产物跑必红、修后用同一夹具必绿（[`scripts/AGENTS.md`](../../scripts/AGENTS.md) 门禁纪律 1）；
- `pnpm release-smoke` 对真实 tarball 断言同一条；
- `docs/release.md` §三把"不发布源码"从隐含改为可执行判据。
