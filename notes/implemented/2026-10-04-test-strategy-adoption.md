# 测试策略采纳：DSH 测试宪法对表、四切片落地与政策成文

日期：2026-10-04 · 状态：**implemented**（用户拍板：测试策略立项为 ongoing goal、快照层**试点先行**、与「真用第一」主轴**并行低档**且冻结豁免开发证据面、本轮打磨主战场预期＝client/UX 面）

> 消化来源：`deepseek-harness/_digested/test-strategy/` 十篇（基线 `dsh-v0.2.0-rc.2`，DSH 55 行测试政策 +
> 33 篇测试决策笔记 + 4 篇 postmortem 的体系消化）。本 note 是**当前 rationale owner**：
> 为什么这样采纳、什么被击败、试点测得了什么。

## 问题（开工时的可观察行为）

1. 台阶一缺失：8 个自有行无导出形态守卫；本仓 `#digestCache` 事故（2026-09-23）与上游 postmortem
   0001（多余 `export default` 丢整个模块命名空间）同属"组合可见性"类——上游对此的制度化防线之一
   就是一行级导出守卫，我们只建了台阶四（真组合）。
2. 生命周期证明不全：仅 ov-shield 有 dispose 断言，其余注册面（工具×4、提示词段落×2）无"卸载即撤销"证明。
3. client/UX 面有证据无回归：`shots` 只拍摄不比对；ui-chat `transcriptView` 事故（vendor 预构建
   client lib 落后致首条消息后对话区冻结）是"只有真渲染才看得出"的 web 面回归，靠人工复现抓到——
   `snapshots/README.md` 立的升级触发条件已实际响过一次。
4. 测试政策无家：九条教义的采纳子集（禁 hand-built 组装证据、禁自报探测、mock 白名单、单跑才绿=spec
   缺陷、禁掩盖修法）无一处成文，下一个 agent 改测试没有对表物。

## 决定（已交付）

- **对表结论**：DSH 九条教义中 12 项已实证对齐（证据面清单见 [testing.md](../../docs/testing.md) 分层表）；
  按事故面补缺四项（切片 2/3/4 + 政策成文）；四项刻意不采纳带触发条件（session 回放快照、全量
  coverage 门、子进程 loader-smoke 中间层、CI 矩阵）。
- **切片 1（侦察）**：导出面当前全纯净（守卫=防退化）；dispose 缺口 6 面；eval 无 key 显式红
  （`exit 1`，DSH 缺 key 硬失败的等价物已在）；vendor `test-support` 七件套全在源码平面别名表
  （零胶水）；web 试点 v1 定隔离 home 真·首开态（共享 dev home 的时间戳漂移不可用）。
- **切片 2（web 面期望比对试点）**：`scripts/webui-expected.mjs` + 纯核比对器
  `webui-expected-core.mjs`（忽略清单与 `{{origin}}` token 化为**被审常量**，shots 新增输出以
  `unowned` 显式出现在 diff）；复用 shots 子进程采集（不复制 CDP 坑）；首场景
  `snapshots/web-face/blank-first-open/`（契约 README + snapshot.yml 同 diff）。prove-it-red：
  11 形态夹具 + 全链路污染期望→`FAIL exit 1`→还原复绿。
- **切片 3（导出形态守卫）**：`tests/export-shape.spec.mjs` 9 用例；复用 gen-catalog 的
  `parseRows`（一个解析器两个消费方）。**守卫首跑即抓真红**：dev patch 两处行 id
  `preset-runner` 与插件 name 导出 `assistant-preset-runner` 漂移——判定统一为 id=name 导出
  （shipped 面 8 行的既成约定；行 id 是 `--dump-config` 与组合的身份面，漂移即孤儿行风险），
  同 diff 修 `dev/preset-runner*.patch.yml` ×2 + `release-smoke.mjs` 断言 + `gen-catalog` 重生成。
  prove-it-red：造 default export → `exit 1` 精确指认模块。
- **切片 4（生命周期补缺）**：`tests/registry-lifecycle.spec.ts` 7 用例（工具×4 参数化 + 段落×2
  经真实 `assemble({scope})` 断言撤销 + dispose 后重挂）。两个实证发现入注释：① scoped 注册对
  全局视图不可见（`ScopedLayers` 按 scope 链合并），断言必须带与 `createScope` 同一引用的
  scope key；② `assemble({scope})` 免 agent 全家桶。机制注释写实证结论：贡献经 cordis effect
  绑定挂载 fiber，`scope.dispose()` 即撤销。
- **切片 5（政策成文）**：[docs/testing.md](../../docs/testing.md)（46 行）为测试面合同唯一家；
  `docs/AGENTS.md` tier 表加行；`discipline.md` 测试行 ⏳→✅ + 适配 6（冻结豁免）；
  `snapshots/` 的 AGENTS.md 与 README.md 边界收编 web 渲染期望为第二类同类证据并更新 harness 状态。
- **命名法补录（同日，用户点拨）**：上游"后缀即层"（文件名唯一决定层与车道，`expected` 不叫
  `golden`——命名即所有权）在消化时已识别但未单列入采纳项；用户指出"今后容易判断我在说什么"
  后补为 [testing.md](../../docs/testing.md) 的"命名法：后缀即层"节（现存 44 个测试文件全部
  符合该文法，无需改名；`e2e`/`snapshot`/`bench` 后缀为将来车道预留）。价值：层的指称从口头
  约定变成机械可读——说"跑 e2e""进 snapshot"即指向唯一命令与 regression 语义。
  **同日内化收尾**：`verify` 新增 `test assets:` 门（34 检查；`testAssetNamingProblems` 纯核——
  tests 树只收 `*.spec.*`/`*harness.*`，web-face 场景必须带 snapshot.yml + README 契约；负例夹具
  4 件）把"先入表再落文件"变成机器执行；`tests/AGENTS.md` 立测试树形态规则（目录链加载，写测试
  的那一刻在场）；`webui-expected.spec.mjs` 更名 `webui-expected-core.spec.mjs`（文件名与被测
  模块对齐，唯一一处改名）。

## 试点成本台账（切片 2 实测，2026-10-04）

| 项 | 实测 | 含义 |
|---|---|---|
| 隔离 home 准备（prepare+setup） | 5.7s（vendor 产物在位幂等跳过） | 可进日常流程 |
| 服务启动到可拍 | ~10s | |
| 单次拍摄+比对 | ~15s | 比全量单测还便宜 |
| 假红率 | 90s 间隔两拍零差异（隔离 home） | 忽略清单当前足够 |
| 残留风险 | "改 src→build→服务真红"未演练（build 动共享 `lib/` 与并行会话冲突） | 纯核红 + 期望污染红已夹住比对器；实现侧红留第一次真实回归自然验证 |
| 第二场景候选 | 提示词组装面录制回放；`dev/preset-runner-replay.patch.yml` 已给 keyless 回放半套基建 | 打磨移回提示词/摘要面时启动 |

## 取代检查

- **部分取代** `notes/implemented/2026-09-25-dsh-alignment-borrowables.md`：该卡第 12 条
  （"snapshots 只收什么"边界句）与快照相关.borrowables 卡的"负例控制""窄证据"等条目仍有效——
  本 note 只收编**快照边界句的演进**（day 0 → 两类证据）与测试面的系统性采纳；borrowables 卡
  保留其余批次的记录，双方互链。
- 与 `notes/implemented/2026-09-23-service-shadow-private-fields.md` 互链：`#digestCache` 事故
  是本采纳的问题 1 的本仓证据，preset-composition.spec 的动机注释已回指。

## 输掉的方案

1. **全量照搬 DSH 七层**（8 份 vitest 配置、coverage 门、快照 harness 全家、CI 矩阵）：我们是一个
   包的插件 repo 不是 316 包 monorepo，无 CI 无平台矩阵——会把门禁成本花在不存在的事故面上。被
   "按事故面采纳"击败（每项补缺都指得出它防的事故：0001 同构、transcriptView、组合可见性）。
2. **快照维持触发制、等第 3 次摩擦再建**（proposed 卡第一版方案）：被用户"铺垫期"框架击败——铺垫期
   的意义正是不等痛苦出现；且 web 面触发条件已实际响过一次。**直接铺开**同被否：真实成本无人测过，
   试点先行拿数据，台账不利时可降级（三岔出口记于卡 §二）。
3. **只补测试不立政策**：政策无家则台阶靠记忆维持，下一次扩展即复演；一页的边际成本防复演。
4. **把 eval/eval:domain/desk-loop 改造成 DSH 形状**：它们是本仓超额层（领域质量人判与摩擦观测，
   DSH 测机制不测"像不像专家"），不是缺口——保持独立，不往七层里硬塞。
5. **快照场景放 owner-local**（贴 DSH"UI-only 期望跟 owning 层走"口径）与**收编进 snapshots/**
   二选一：被收编击败——两类证据（session 回放、web 渲染期望）同为"录一次、重放比对、diff 人工
   过目"形态，与纯函数期望不同类；`snapshots/README.md` 的既有定位（行为回归证据面）容纳它，
   且第二场景（session 回放）落地时同树同构。
