# P3 测试资产分层：目录即被测 interface（六片迁移 + 层命令 + 分层合同）

日期：2026-10-05 · 状态：**implemented**

## 决定

按[提案](2026-10-05-repo-navigability.md) P3 套路（与用户 2026-10-05 对齐），43 个 spec + 1 个共享夹具
按**被测 interface × 真实依赖半径**迁入职责子目录——后缀 = 车道不变（`*.spec.{ts,mjs}` / `*harness.ts`），
目录 = interface 家；每个 spec 归最主要 interface，跨层依赖文件头注明。六片独立提交锚点，每片迁前后
Vitest 发现集合一一对应（43=43）：

| 片 | 提交 | 内容 |
|---|---|---|
| 1 试点 tooling/ | `ee54cfa` | 六件工具核（verify-gates/eval-checks/catalog/sync-bookkeeping/usage-report/webui-expected-core）——scripts/dev 相对路径深一级，14 处外部引用同片修；试点验证三件事：递归门禁咬合、发现集合对照法、路径雷区清单 |
| 2 client/ + support/ | `d3d2ef3` | 四件 client 合同 + `client-harness.ts` 迁 `support/`（豁免容器实证：发现集合零误收） |
| 3 domain/ | `b7087dd` | 十一件规则与存储基础 |
| 4 host/ | `04fe53d` | 十四件服务合同（真 cordis + 临时 home） |
| 5 agent/ | `aa1fb54` | 三件 agent 面合同（digest-prewarm/digest-budget/maintenance-metronome），头注跨层依赖（机制本体在 host 服务） |
| 6 composition/ + 层命令 + docs | `507266d` | 五件（export-shape/registry-lifecycle/ov-shield/preset-skill-root/preset-composition）；`test:composition` 指新路径，新增 `test:domain/host/agent/client/tooling` 五个层命令逐个点名入 dev.md；docs/testing.md 落「目录即被测 interface」分层表 |

**归属表**（一个 spec 一个家；判断依据 = 文件头 docstring 声明的被钉行为 + import 面）：

- `domain/`（11）：frontmatter、record、thread、recall、knowledge-page、knowledge-ingest、digest、health、
  skill-file、room、layout——规则/词汇/渲染/布局/Room 适配器，src 直读（部分带临时目录 IO，按依赖区分不按目录贴标签）。
- `host/`（14）：knowledge-curation/retrieval/write/import-write、skill-usage/shadow/audit/snapshot/proposals/retirement、
  service-shadow-access、park-contract、root-files、web-branding——经真 cordis Context + 临时 home 的服务合同。
- `agent/`（3）：digest-prewarm（段落就绪）、digest-budget（段落预算）、maintenance-metronome（养护回合占位）。
- `composition/`（5）：export-shape、registry-lifecycle、ov-shield、preset-skill-root、preset-composition——
  配置装载、注册与范围合同。
- `client/`（4）+ `support/`（1）：四件浏览器注册/交互状态合同 + 共享 harness。

## 证据（真跑过的命令）

- **发现集合一一对应**（第一验收）：迁移前 `vitest list --filesOnly` 存档 43 件；六片各自收尾 diff 归一化比对
  一一对应、零丢失零新增（`tests/<layer>/` 前缀剥离后与基线全等）；`support/client-harness.ts` 不在任何发现集。
- **六层命令全部实跑**：`pnpm test:domain`（11 件 97 断言）/ `test:host`（14 件 70）/ `test:agent`（3 件 10）/
  `test:client`（4 件 57）/ `test:tooling`（6 件 104）/ `test:composition`（先 build，1 件 6）。
- **段末全链**：`pnpm build` → `pnpm typecheck` → `pnpm test`（43 件 374 断言全绿零 skip）→ `pnpm verify` 34 全绿。
- **门禁真实咬合两次实证**：① links 门禁抓到首轮 grep 漏掉的三处消费者（snapshots README、implemented note、
  活跃 reference 台账的 anchor 链接）——修后复绿；② docs-commands 门禁抓到片6 初版 `pnpm test:<layer>` 写法
  （被解析为不存在的字面别名 + 五个新别名未点名文档）——改为逐个点名后复绿，amend 收口并如实记录。
- 迁移中抓到的路径雷区（已全修，留给 P4 参考）：带引号 import 之外的**模板字符串动态 import**（export-shape
  `sourceOf`）、**内联 `new URL('../src')` 读取**（client-panels 色彩契约）、**`packageRoot = tests/..` 计算**（×4）、
  `import.meta.dirname` join 深度（verify-gates env.sh）、源码注释里的测试路径（src/index.ts）。

## 输掉的方案

1. **unit/integration/e2e 标签或后缀分层**：同一标签下纯核与真 IO 失败含义不同，回答不了"要什么前置"
   （冻结卡已判为伪完成）——输给 interface × 依赖半径双轴 + 目录寻址。
2. **底稿的 pure/storage/runtime/client/tooling 五层命名**：按机制形态命名，与三平面（host/agent/client）
   词汇不合拍、P4 源码切分后不可镜像预测——输给与 src 职责树同词的六层。
3. **一次性全搬**：路径失效面叠加不可定位；试点片先验证方法再扩展（卡上明文要求），每片独立锚点可回退。
4. **为工具/provider 造空 agent 层或强拆跨层合同**：四工具是薄适配器，其合同今天由 host 服务 spec 与
   composition 注册/装载覆盖；agent/ 只收真有主要 interface 的三件（段落/回合），不为凑目标树发明住户。
5. **archived 台账链接不改**：链接门禁扫 archived——冻结的是论述不是死链，只修活指针（P2 同判例）。

## 范围与后果

P3 完成：测试树按被测 interface 分层，层命令与分层合同（能/不能证明）落 docs/testing.md 与 tests/AGENTS.md，
根命令面只增不破（`test`/`test:composition` 语义不变），vitest 单项目与后缀车道不动，web 场景/eval/replay
车道原样（提案第 4/5 条约定）。**未验项（如实）**：`pnpm release-smoke`/`export-dist` 未跑（P3 只动测试树布局，
不改包 files/exports/发行面——P4 出口必跑）；真模型行为（`pnpm eval`/`loop-probe`）未跑（无模型可见面改动）。
**发现的缺口（不搭车修）**：底稿建议的「组合缺 lib 显式红」在 `test:composition` 脚本层由先 build 保证，
裸跑 composition spec 仍是自失败提示（P1 已修门禁侧），fail-loud gate 属触发后再立。下一步：段间复核后
P4（源码职责切分——P2/P3 前置已满足），之后 P5 驾驭验收。
