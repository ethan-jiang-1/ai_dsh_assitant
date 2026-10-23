---
status: 已结
opened: 2026-10-23
---

# 收口：fresh-agent 卫生与架构深化（8 段切片台账）

> 立卡：2026-10-23 ｜ 状态：已结 ｜ 类型：Task ｜ 可关闭：是
> 授权：用户 2026-10-23「规划一下执行的次序」「setup goal 我们依次推进落地」；plan 呈批见当轮对话，切片逐片提交。
> 裁决与延后 = 本卡 §裁决；C5 的既有决定 guard 已补进 [10-20 六维 note](../../../notes/implemented/2026-10-20-six-dimension-improvement.md)。

## 外部结果三要素

- **触发**：工作台/Viki 两轮之后，2026-10-23 架构深审（两路只读审计）确认 6 个深化候选 + 7 组已核对语义漂移；用户批准 8 段次序。
- **用户得到**：入口链先读到真话；工具输出契约不再有第二份手写类型；rooms 线格式有一个 owner；桌面 capture/活动流是纯函数 + 表驱动 spec；回到会话有一个可测的导航 seam；自回合宿主收窄到它真读的两个字段；两个放错层的 spec 回层，workbench 任务 tab 有了客户端覆盖。全量地板、release-smoke 与 desk web-face 绿。
- **完成条件**：8 段全部提交、地板全绿、release-smoke PASS、desk 场景 PASS、最终 fresh 复审收口——**2026-10-23 全部达成**。

## 结论

八段全部交付。收尾地板：`pnpm typecheck` 绿、`pnpm test` **115 文件 / 938 测试全绿**、`pnpm build` 绿、`pnpm verify` **44 项全绿**、`pnpm release-smoke` PASS、隔离 home `pnpm web-expected --scenario desk-eight-matters-first-open` **PASS**、`pnpm eval --only desk-followup-readback` 与 `--only desk-capture-note` **PASS**（模型可见面的行为地板）。全程只操作本 repo；隔离 home 在 `.tmp/`，服务已收、端口已释放，日用 `~/.dsh` 未碰。

## 切片台账

| 片 | 提交 | 证据 |
|---|---|---|
| 0a 真相对齐 | `769aa6e` | 7 组漂移 + owner map 缺口（rooms/desk/maintenance/viki/knowledge-ingest）+ layout.ts 六工具 + YAML 工具清单指针化 + A/B research 纠正 + 工作台两 tab 入 architecture；`pnpm verify` 43/43（build 门当场抓 `layout.ts` 注释改动，`pnpm build` 后复绿） |
| 0b 工具名门禁 | `6492eb7` | `gates/tool-comments.mjs` + `tests/tooling/tool-comments.spec.mjs` 4/4（含造红：注释名不在 catalog）；verify 44/44 |
| C1a eventId 修复 | `6e76b56` | 先红：`"value.materials[1].eventId" is not a declared property (additionalProperties: false)`；补 schema 后 test:agent 9/9。测试改用平台 `validateJsonSchemaValue`，不再从 `execute()` 侧绕过注册期的输出校验；`eval --only desk-followup-readback` / `desk-capture-note` 后续 PASS |
| C1b 输出类型推导 | `1689dc0`（+ `548e6ef` 测试收窄） | `OperatingOutput = InferValue<typeof OPERATING_OUTPUT_SCHEMA>`；暴露并收口两个 optional source（render 的 `sourceText`）；typecheck/build/test:agent/test:composition 全绿 |
| C1c 其余五工具 | `74a6cda` | memory/research/knowledge/learn/recall 的 output 类型全部由各自 `as const` schema 推导；typecheck + agent 57/57 + composition 51/51 |
| C2 rooms payload owner | `93096c1` | `domain/rooms/projection.ts`（RoomsPayload / projectRooms / parseRooms / countsOf）+ domain spec 5/5；host 155/155、client、composition 51/51；删死 skill-proposal 分支与两个 prompt 动作；补齐 Skills 面板已在读的 `source` 映射 |
| C3 桌面纯推导 | `e8f2110` | `desk-capture-view` 6/6 + `desk-activity-view` 4/4；panel 41/41 零改动；desk web-face 最终 PASS 证明 DOM 未变 |
| C4 导航 seam | `23fda71` | `chrome/navigation.ts` + `navigation.spec.ts` 4/4；entry 在注入期解析 sessionId，不再在点击期扫 args；顺手把两个错层 spec 搬回被测层 |
| C6 + D10 | `23fda71`（spec 搬迁）+ `c7c1940` | `tests/domain/desk-process.spec.ts` 60/60 进 domain 车道；`tests/client/desk-process-lifecycle.spec.ts` 2/2 进 client 车道；`tasks-view.spec.ts` 4/4（task 自己的 session 优先、本地时间、过滤/空态） |
| C5 宿主窄类型 | `2d36a78` | `SelfTurnHost`（两字段）+ `self-turns.spec.ts` 2/2（假宿主 + 真 Context，不 boot home）；构造器安装仍由 metronome spec 3/3 钉住 |

## 裁决与延后

1. **C1 不做 `defineWireRecord`**：spike 后确认 `defineTool` 已从 `as const` schema 推导输出类型；再加一个运行时 codec 是把同一事实放进第二个抽象。落地 = 删手写 interface + `InferValue`，并用注册期同一个 `validateJsonSchemaValue` 钉住 `eventId`。**触发重评**：schema 方言扩大到 `InferValue` 表达不了，或需要在运行时校验输出。
2. **C2 删掉面板技能提案分支**：route 从不发 `kind`，`docs/home.md` 的评审形状是手改提案文件；两个 `ask*Proposal` 只服务这个死分支。**若要做面板收件箱**（route 投影 proposals + 两个受控写），是新 feature 卡，不在卫生运动内。
3. **C3 只抽 capture 与 activity**：面板的 20 个 props、rows/filter 推导与 selection lookup 未动；它们风险低、改动面大。**触发**：下一次面板要加 lane/prop 时，先抽 `deriveDeskRows` 与一个 surface handle，再动测试。
4. **C5 只到 `SelfTurnHost`**：按房间拆 `MemoryWrites`/`CurationReads`/`SkillWrites` 会重启 10-20 明确否掉的"一实现两契约名"；guard 已写回 10-20 note。**触发**：某个 room 测试真的因为整包 boot 变慢或变脆，先只加 `Pick<HomeHost, …>` 的结构性窄类型，不新增公开契约名。
5. **Stage 6a 笔记归档 = 零移动**：抽查最老的 implemented（OV 准入、backlog 治理、架子命名、delegated 裁定）都仍在约束当前决定；10-20 战役已把纯历史篇归档。**清洁审计也是结果**。**触发**：某篇的决定被取代，或一次战役收口后出现只余交付史的篇。
6. **入口写作不做结构重写**：本轮只修事实、owner map 与死链；入口链的密度是刻意的路由层。**触发**：fresh 复审再次指出入口层级问题，或某个常驻文件超过 ~250 行。
7. **最终 fresh 复审**：见 §最终复审；本轮新引入的漂移只按 claim→fact 成对修，不做顺手改写。

## 最终复审

HEAD `2d36a78` 的 fresh 只读复审：9 对已核对（3 misleading / 6 cosmetic），0 blocker；全部在本片收口提交同 diff 修掉：

- composition 半径行按 7 个 spec 的实际形状重写（`export-shape` = source-plane；补 `client-entry-lifecycle`/`preset-skill-root`）；
- 包 README 工具表补 `assistant_recall`，并把 `./preset-runner` 归回 plugin 子路径；
- `_backlog/research/README.md` 的 A2 索引行改为「已裁决并挂载」；
- `docs/dev.md` 探针数 3→4；root README 的 `curate`「第六个工具」→「独立工具」；
- 纯核范围统一为 `src/domain/`（architecture + discipline）；YAML 的 A2 注释改 adopted；navigation 行 fallback→reveal 适配器；
- 两处代码注释（`desk-arms` 五臂含弃置、`client/index.ts` 的「桌面」名约束）与 identity 的「配快照」→「配快照或真实组合断言」。

复审另确认：无 live 文档引用已删的 client skill-proposal 分支或旧 spec 路径；工作台 tab、owner map、§二 trees 与六工具 / 13 动词计数全部对上。

## 下次从这里接着看

- 面板技能提案收件箱：新 feature 卡（先定 route 投影与写动作的白名单）。
- 桌面面板下一次加 lane/prop：先 `deriveDeskRows` + surface handle，再改 6 处测试构造。
- 第六个 desk 臂出现：把 5×bind + 5×judge 收成一张 ARMS 表 + `begin/judge` 两入口（本轮 Speculative，未做）。
- 任何工具输出字段变化：只改 schema `as const`，`InferValue` 会让 projector/render 编译期报错；跑 `test:agent` + `test:composition`。
- 任何 `cordis.patch.yml` 注释里的 `assistant_*` 名字：verify 的 tool-comments 门会对照 catalog。
