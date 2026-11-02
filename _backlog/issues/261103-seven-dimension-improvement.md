---
status: 待落地
opened: 2026-11-03
---

# 推敲：七维打扫卫生——先修证据面，再修文档漂移，最后动结构

> 立卡：2026-11-03 ｜ 状态：待落地 ｜ 毕业：做现在 ｜ 去向：implemented ｜ 可关闭：否
> 来源：[七维深审](../research/261103-seven-dimension-audit/261103-seven-dimension-audit.md)（2026-11-03，7 路 fresh 审计 + 真机取证）
> 授权：用户 2026-11-03「到了打扫卫生的时候了……先评估一下这七个维度……REVIEW 后看看能不能持续改善」= 授权评估与持续改善；
> 本轮按 B1（证据面）与 B2（文档漂移）的已发现项自定范围推进（机械/证据修复，不改产品行为）；B3/B4 仍需 review 后点名。

**问题与期望结果：** 深审确认骨架与依赖方向立住，但三类接缝在持续消耗 agent：①证据面（web-face 场景）不在 verify 里，
曾被一条 YAML 写坏整条打灭；②高 churn 接缝（client 组合根、docs、vendor 覆盖）在长第二份合同/第二份清单；
③手工地板（typecheck/test/verify 三条命令）没有单一入口，审计窗口内真的出现过“红着提交”。
期望的结果：证据面能在无人记得时自己红；文档与代码的当前事实重新对齐；组合根与面板按已有 seam 拆开；
DSH 约定偏离（`insert` 当 override、两个 packer、client 状态所有权）有明确裁决或修复。
**不做**：不重写入口、不新增流程层、不预建 session 回放/性能/CI 矩阵、不把 coverage 设阈值。

## 当前情况（证据在深审报告里）

- 维度分：1=7.5、2=7.5、3=8、4=7、5=7.5、6=6、7=7；整体 ≈7.2/10。
- P0（审计中已修）：scene seed / `web-face-check` 的 `productOff` 在 `[]` 后追加 block list → 生成的 profile patch 非法 YAML，
  整条 seeded 场景车道 boot 失败；修复在 `63a82047`，无回归测试、同样逻辑五处。
- P1：`insert` 当 override 用（6 个重复 row id，后者静默覆盖 vendor config）；两个 packer（judged 字节 ≠ published 字节）；
  client 组合根 398 行 / 195 次提交；首屏 composer 接线无测试、探针 `newSessionBlocked` 可被 dock 满足；
  `build-freshness` 负载下超时；`AGENTS.md:9` 默认路径与 owner 相反；根入口 5 天 +8.1%。
- P2：`去向` 时机两种说法；`issues/README.md` 历史摘要 1.7 KB 占据活跃清单；收据缺生效日；
  `product-onboarding/README.md` 仍写「稍后」；场景 README 缺 `onboarding:false`；`discipline.md` 适配 10 未改；
  `main-view`/`product-face` 违反 vendor 状态所有权；web-only 行不自禁用；市场/README 发布状态不一致。
- P3：57 个死 client chunk + 1.05 MB map 随包；`tests/tooling` 与 CLI 层不对齐；module map 过期；note 同名；A2 裸简称。

## 方案与取舍

按“先证据、后文档、再结构、最后 DSH 约定”的顺序，五个可独立回退的批：

| 批 | 内容 | 为什么这个顺序 |
|---|---|---|
| B0 地板 | 已由 `63a82047`/`8a50a074`/`7159653a` 补齐：typecheck/verify 绿、scratch 路径、dev overlay | 没有绿地板，后面所有证据都不可信 |
| B1 反馈诚实性 | `ensure-build`、boot 诊断/catch/cleanup、Chrome/zstd/profile BLOCKED、`[]` helper + YAML 单测、comparator `unowned`、逐场景 refresh、client composition seam spec、probe 断言 composer、scene README、per-run workspace、session join | 这是本轮唯一 P0 的出生地，也是“agent 抓瞎”的直接来源 |
| B2 文档漂移 | 深审 §四 的 11 条 + `去向` + 活跃清单 + 收据生效日 + 读法 + 入口散文预算 | 机械/语义可一次 verify 收口，不改变行为 |
| B3 结构 | client 组合根拆 `mount*` + 两个内联 transport 归位；`projection-panel` 拆三态；rooms write 进 domain；agent 工具抽 dispatch；`tests/cli/` 或例外 | 高 churn 接缝，需要独立可回退的切片，不与证据面混 |
| B4 DSH 约定 | `insert`→裸 id 覆盖 + 重复 id 门禁；一个 packer；client 按 `clientBundle()`；状态所有权；web-only self-disable；README 发布状态；真实旧包 fixture；preset 拆分（可选） | 会影响组合/发布形态，必须单独裁决与验证 |

**输掉的方案**：
- **一次性全改**：跨证据面/结构/发布，无法逐片回退；用户明确要求“先挖透再改善”，分批才看得清每批的证据。
- **只修文档、不修证据面**：文档会再次与场景脱节；P0 的根因（五处复制 + 无 parse 测试）还在。
- **把 web-face 塞进 verify**：Chrome/耗时/key 成本高，且会重演“跳过即绿”；正确做法是独立车道 + 单一命令 + BLOCKED 语义。
- **为并行会话加一个 `落地中` 状态词**：违反 `_backlog/AGENTS.md:37` 的“不追做到哪”；用切片台账的开工锚点/提交锚点解决。
- **把 `insert` 全部改成 `append` 新 id**：会改变组合身份（`--dump-config` 的 row id），下游 patch 落空；应改成裸 `- id:` 整行覆盖。
- **给 coverage 设阈值**：没有“删了才对”的死代码实证；阈值只会逼出凑覆盖。

## 外部结果三要素

- **触发**：用户 review 七维报告后点名某一批；或证据面再次因同形改动打灭；或 DSH 约定偏离在真实安装/boot 上显形。
- **用户看到/得到**：证据面能用一条命令真跑真比对，失败有可读原因；文档与代码当前事实一致；client 组合根不再每次都被打开；
  `--dump-config` 不再有静默覆盖；发布字节与判据字节一致。
- **完成条件**：本卡 `## 验收标准` 全过；每批的机械地板（typecheck/test/verify + 受影响车道）有真跑读数；
  文档/合同与代码同 diff；证据进 `## 切片台账`。

## 验收标准

| # | 行为 | 类别 | 输入状态 | 通过信号 | 负例/恢复 | 证据 owner |
|---|---|---|---|---|---|---|
| 1 | 场景车道在 `lib/` 落后时不会假绿 | 确定性 | 改 `src/` 不 build，跑 `web-face-check` | 命令在 provisioning 前失败并提示 `pnpm build`（或自动 build） | lib fresh → 正常跑；缺失 build 不应被记成场景红 | `dev/probes/web/web-face-check.mjs` + 一条 compose/parse spec |
| 2 | 场景 boot 失败可读且可清理 | 编排 | 造一个非法 profile patch | `FAIL <scene>: <首行>` + stderr 日志路径 + home 清理；剩余场景继续 | `--keep` 保留现场；成功场景不受影响 | `probe-service` + `web-face-check` 的负例夹具 |
| 3 | 生成 profile patch 永远可解析 | 确定性 | 空 `[]` profile + 每个 seed/`productOff` | YAML parse 测试绿；五处共用同一 helper | 追加到 `[]` 的旧写法 → 红 | dev/probes/web/scene-home.mjs（新增，待建）+ `tests/tooling/` spec |
| 4 | 缺 Chrome/zstd/profile = BLOCKED | 环境 | `PATH` 无 Chrome / 无 zstd | `BLOCKED` + exit 2，不打印 passed | 有 Chrome → 正常 PASS/FAIL | `webui-shots` + `web-face-check` + `webui-loop-probe` |
| 5 | 未绑定 composer 真被禁 | 编排（client） | 真 `ctx.inject('conversation')` + onboarding | block writer 收到 session id；composer disabled/inert；dispose 后清除 | ready/404 → 不 block；dock 单独存在不算数 | `tests/composition/client-entry-lifecycle.spec.mjs`（扩）+ 探针 |
| 6 | `--refresh` 不会把坏状态录成基线 | 编排 | 错误页面 + wait token | 逐场景 `--refresh --reviewed`/`--force`，输出 diff；默认拒绝 | 健康页面 refresh 成功；reviewed 记录可审计 | `webui-expected` + `web-face-check` |
| 7 | 症状可 join 到会话/日志 | 编排 | 给定 session id/前缀 | 一条命令打印完整路径 + request/tool 时间线；id 格式统一 | 不存在 id → 明确 not-found，不猜 | `dev/lib/session-logs.mjs` + `package.json` script |
| 8 | 文档与当前事实一致 | 确定性 | 深审 §四 的 11 条 | `pnpm verify` 绿 + 逐条 claim→fact 复核 | 旧句保留 → 审计复现 | docs/README/scene README 同 diff |
| 9 | 组合根不再 god function | 结构 | 改任一 client surface | `clientFactory` ≤120 行；`mount*` 单测/入口 spec 不变；`entry.spec` 全绿 | 任何公开注册面变化 → `entry.spec` 红 | `src/client/index.ts` + `tests/client/entry.spec.ts` |
| 10 | `insert` 不再静默覆盖 | 约定 | `--dump-config` | 合并树无重复 row id；裸 `- id:` 覆盖带完整 `name` + `config` | 重复 id → 新门禁红 | `cordis.patch.yml` + `scripts/checks/gates/overrides.mjs`（扩） |
| 11 | judged 字节 = published 字节 | 约定 | `export-dist` / `publish-release` | 同一 packer；sha256/手册/registry 描述同一 manifest | 两个 packer → 负例 red | `scripts/release/*` + `install-parity` |
| 12 | client 状态有 owner | 约定 | 两次 materialization + HMR | 无 `globalThis.__…__` 单例；store 经 slot/handle；HMR 不重选 | 模块级单例 → 断言红 | `main-view`/`product-face` + composition spec |

人判：B4 的 client bundling 改法与发布渠道选择需要本人拍板；其余 agent 可自审。
（按 [`validation-design`](../methods/validation-design.md)；行为/类别/输入状态/判据/负例/证据 owner/人判）

## 切片台账

| 片 | 状态 | 证据 |
|---|---|---|
| B0 地板 | 已完成（并行会话 + 主线） | 当前：`pnpm typecheck` 绿；`pnpm verify` 56/56；`pnpm test` 160 文件 / 1,225 用例绿；`pnpm web-face-check --all` 10/10（`45a97abb` 后复跑；`bd966d87` 后再跑 blank 单场景 PASS）；`pnpm start` preflight 绿。基线 `7159653a` 的 1/1220 红是 load-sensitive build-freshness，已由 60s budget 治 |
| B1 反馈诚实性 | 基本完成 | `45a97abb`：`scene-home.mjs` 单一 patch writer + YAML parse spec；`web-face-check` 起手 `ensure-build`、Chrome 缺失 BLOCKED 2、provision 失败 BLOCKED 2；`probe-service` 头+尾 stderr + sibling log、child 退出即停、`withService` catch 不中断剩余场景；`product-first-screen` 断言 composer 真禁用 + placeholder；`webui-shots`/`webui-expected` 的 no-Chrome 2/1 区分；`build-freshness` 20s→60s（budget，不是 retry）。`dbcb4a8d`：comparator 比较 `unowned`。`a9dd7212`：真 Cordis + conversation blocks 的入口接线 spec（删除入口 `ctx.inject` 块即红）。`1d6d41bf`：`pnpm session <id|prefix>` 时间线（symptom→session join）；`--refresh` 必须显式 `--scenario`，拒绝 `--all` 批量重录；product scene 的 workspace 改 per-run parent（叶子仍叫 `product-workspace`，并发不互删） |
| B1 仍余 | 完成 | `a6650ae2`：四个非产品场景 README 加 posture 指针；`--scenario` 缺值 / 空 `--wait-text` 的 CLI 洞已关。B3/B4 之外没有 B1 开口（refresh review / session join / per-run workspace 已交付） |
| B2 文档漂移 | 基本完成 | `d477076f`：11 条漂移（轨迹页/安装器默认/两三个文件/400-500/`--all` 10 面/授权例外/A2/`discipline` 适配 10）+ `AGENTS.md:9` 默认路径 + `去向` 时机 + 收据生效日 + 收口卡样板 + 读法三篇 + note 同名互链/面数 + 产品失败模式行 + 场景 posture 中心说明 |
| B2 仍余 | 待做 | 常驻入口散文预算（触发已到，属纪律改动，需单独拍板） |
| B3 结构 | 进行中 | `0afdefea`：ui-mode HTTP transport 与 receipt archive paging 从入口搬回 owning module；两处新 spec（HTTP remote / receipt page）。`a4cc318d`：`mountCommands` 提取到 `chrome/commands.ts`，入口只传 room opener + activity 回调；新增 dispatch 单测。`797e330d`：`mountRoomTabs` 提取到 `rooms/mount-rooms.ts`（desk load + settle refresh + "+" guides + tab bodies）；`index.ts` 491→428 行、`clientFactory` 398→333 行。仍余：dashboard 的 `mount*` 提取、`projection-panel` 三态、rooms write 进 domain、agent dispatch、`tests/cli/` |
| B4 DSH 约定 | 进行中（D1/D3 已交付） | `bd966d87`：`session-query-sqlite`/`ui-chat`/`locale`/`tool-skill` 从 `insert` 改为裸 `- id:` 整行覆盖；`tool-skill` 显式 `disabled: false`；删掉与 web-app 重复的 `schedule`/`ui-schedule` insert；`--dump-config` 0 重复 row id、`tool-skill` enabled、ui-chat/locale config 在场；`preset-composition.spec` 的 strict patcher seed 了这四行；`pnpm start` preflight 绿 + blank 场景 PASS。台账/架构树同步。`eb331dbd`：D3 — `main-view` 去掉 `globalThis.__…__`，改按 Client root 键控的 WeakMap 恢复门（新页面根重新开始，HMR 靠记住的 chat 偏好），`discipline` 适配 10 同步 |
| B4 仍余 | 待做 | 一个 packer（`pnpm` vs `npm`，**需拍板**）；client bundling / 死 Remote 车道；D4 `product-face` 模块级 store + `useState` 镜像；web-only 行 self-disable；README 发布状态；真实旧包升级 fixture；preset 拆 `presets/*.patch.yml`（可选）；重复 id 的**机械门禁**（目前靠 `--dump-config` 手工/测试） |
| 收口 | 待做 | 决定 note、卡归档、research 归档、清单同步 |

## 仍未取

- **B4 的 client bundling 改法**：按 vendor `clientBundle()` 重写构建，还是先修 module-table request？后者能救 Remote，但需要先证明 `@deepseek-ai/dsh-client-store` 在干净安装里可解析；前者会动构建链，风险更大。
- **发布渠道**：`pnpm publish` 还是 `npm publish`；前者与 `export-dist` 同字节，后者需要把 `export-dist` 改成 npm 判据。
- **pnpm 10.6 下限**：本机无 Corepack 网络，BLOCKED；真实安装矩阵要另找环境。
- **并行会话占位**：切片台账的“开工锚点”是否作为常设纪律（不加状态词），待 B2 与用户一起定。

## 下一步

1. 完成 B1 余项：comparator `unowned`、逐场景 refresh review、client composition seam spec、`pnpm session` join、
   per-run product workspace、四个非产品场景 README 的逐条 posture。
2. B3/B4 等用户 review 后点名；B4 的 client bundling 改法与发布渠道是真人拍板项。
3. 收口时写 implemented note（只留决定与输掉的方案），卡归档，research 题归档，清单同步。
