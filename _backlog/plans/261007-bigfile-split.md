# 两大文件拆分：host 按房间切片，client 走 DSH 同款 tsdown 管线

> 立卡：2026-10-07 ｜ 状态：**S1 已交付，S2 待拍板**｜毕业门 = S2 出口全绿（S1 已过其全套门）｜下一步 = 用户拍板 S2（build 加 tsdown，vendor 同款工具零新依赖）后照卡实施

**S1 交付证据（2026-10-07，commit c803726）**：index.ts 1178 → 288 行薄壳；六模块 memory-room 141 /
research-room 221 / skills-room 249 / knowledge-room 181 / curate-digest 238 / self-turns 104。
门实测：typecheck 零错、45 spec 388 tests 全绿零 skip、verify 34、test:composition 6/6、
dump-config assistant 系 10 行 id 全在场、keyless replay 请求侧 `agentPreset: assistant` + 四工具
（memory/research/knowledge/reflect）全在场、release-smoke PASS。
关键判断记录：private → 包内可见的字段清单与 cordis overlay Reflect 转发语义核验（vendor
cordis src/utils.ts:130-218，传 host 进自由函数与原 this 等价）；输入类型随房间模块走、
index.ts `export type` 原位 re-export（`src/index.ts` 的 `export *` 公开面零变化）。

残留③（2026-10-07 走查残留，goal 跟踪中）。结构判定与分段计划在这，实施各片独立提交锚点。

## 承重事实（2026-10-07 实测）

1. `packages/dsh-smart-assistant/src/client/index.ts` **2950 行**——单文件是**结构性的**：
   client bundle 是 classic script，零 import（一个 import/export 就炸整条 combo）；
   我们无打包步骤，tsc 一源文件一产物 ⇒ 一棵 2950 行的 TS 树只能长在一个文件里。
2. `src/host/index.ts` **1178 行**——纯 tsc 服务编排（`AssistantMemory` 一个类 ~30 个方法，
   按房间清晰分组：memory 366-464 / research 465-594 / skills+proposals 659-875 / knowledge 876-958 /
   curate 959-1052 / digest 737-831）；多文件拆分在 tsc 下机械安全。
3. **vendor 先例**：client faces（ui-schedule 等）= 多文件 src/client/*.ts + **tsdown 打成单文件
   `lib/client.js`**；tsdown ^0.22.2 在 vendor devDeps，`pnpm install` 已并入本仓——
   `node_modules/.bin/tsdown` 在场，**零新增依赖**。姿态①「流程随 DSH」直接适用。
4. `./client` export 指向 `lib/client/index.js`（单文件）——拆分后打包产物落**同一路径**，
   exports/组合行/工具语义零变化。

## 候选与取舍

| 片 | 内容 | 门 |
|---|---|---|
| **S1 host 拆分**（机械，先做） | `src/host/` 按房间切模块（memory/research/skills/knowledge/curate-digest），每片导出以显式 internal 接口收 `rooms + config + ctx` 的纯函数；`index.ts` 变薄壳：构造 state → 委派。类身份、public 方法签名、Config、exports 全不动 | `typecheck && test`（43 件）+ `test:composition` + `dump-config` 行身份 + keyless replay；exports 未变，release-smoke 一枚收尾即可 |
| **S2 client 拆分**（采纳 tsdown） | `pnpm build` 加 tsdown 步骤（`tsc -b` 出 host/agent/domain 产物 + tsdown 把 `src/client/*.ts` 多模块打成 `lib/client/index.js` 单文件）；client src 按座位/面板/命令/主题注入切片；classic-script 约束由打包消除 | 同 S1 全套 + `pnpm preflight`（combo 可解析）+ `web-expected` 两场景 + `pnpm shots` 渲染证据 + release-smoke（发布物形状变了） |
| C client 只加段标记不拆 | 廉价，治标不治本——agent 仍要整文件进上下文 | 输给 S2 |

输掉的方案：①上 esbuild/rollup 自配管线——vendor 已有 tsdown 且版本随 pin 走，自配是第二套管线必然漂移；
②client 拆成多 exports 文件——classic script 组合不支持 import，一轮就死（技能 client-ui-contribution §1）；
③host 用 mixin/继承拆类——类身份与 `ctx.assistantMemory` 增广耦合，纯函数 + 薄壳比继承层次可测。

## 次序与回退

S1 → S2（S2 依赖 S1 无关，可并行，但 S1 先行把服务面门禁跑顺）。每片一提交；
S2 的构建管线变更若 preflight/两场景炸且当日修不动，回退 = revert 单片提交，client 回单文件，
卡上记死路原因。

## 验收

- 行为零变化：`dump-config` 行 id/name 全同、keyless replay 请求侧 35 工具 + 四工具在场、
  43 件 spec 全绿、`verify` 34 全绿。
- 行数判据：`src/host/index.ts` ≤ 300 行（薄壳）；client src 最大单文件 ≤ 800 行。
- S2 出口：preflight 绿 + `web-expected` 两场景零 diff + release-smoke PASS。
