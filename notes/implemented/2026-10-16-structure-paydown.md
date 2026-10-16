# 结构还清：主包尾部拆分与 dev 共享库归位

日期：2026-10-16 · 状态：**implemented**

## 问题（可观察行为）

2026-10-16 的全仓结构评估（`src`/`scripts`/`tests`/`dev` 逐文件深读 + 分层依赖机械验证）结论：结构与分层是强项（76/76 文件头注、依赖方向零违规、测试树镜像源码、`261007-bigfile-split` 已拆 host 1178→288 与 client 2950→13 模块），阻力只剩尾部两处"改得动但不好找"：主包 633 行组合根里内嵌四臂编排、708 行账本归约器里的单函数 if 链与逐字重复的拒绝样板；dev 面缺一个共享库抽屉——名为报告的 `dev/reports/usage-report.mjs` 实际被 5 个文件跨目录 import 当日志库用，接续判据核被浏览器探针反向 import。

本人得到（已交付）：改桌面交互、账本归约或工具输出时定位进单一职责文件；dev 探针改动不再翻 561 行三合一文件；会话日志判据与接续判据各有唯一家。全程行为零变化。

## 交付（片 1–7）

| 片 | 现在的结构（唯一家） | 零变化的证明形态 |
|---|---|---|
| 1 | `packages/dsh-smart-assistant/src/agent/tool-operating/schema.ts` 拥有输出契约（`output.schema` 160 行）；工具定义、DESCRIPTION、parameters 与伴生类型留 `index.ts`（586 → 428） | 搬家块逐字 diff（158 行 0 差异，去缩进后）+ `test:composition` 兜注册期 `assertSupportedJsonSchema` |
| 2 | `src/domain/operating/types.ts` 拥有词汇（13 个类型）；`ledger.ts` 原位 re-export，自身只剩归约器（708 → 519 + 196）：`applyOperation` 24 行判别标签分发 + 8 个窄 handler，闭集以 `assertNever` 收口 | 词汇 203 行逐字 diff；结构等价核对（18 原写点 ↔ 10 `recordOperation` + 8 `rejectWith`）；三条特征测试（两个零覆盖的拒绝原因 + `reject` 分支负例）先造红 |
| 3 | `src/client/format.ts` 拥有时间渲染族（5 个输出各异的格式 + 唯一 `pad2`）；`src/client/desk-process-messages.ts` 拥有四臂种子文案；六个共享门收成 `sharedGateReasons`（515 → 425） | 文案 84 行逐字；格式族去缩进后 0 差异；两场景 web-face 无漂移 |
| 4 | `src/client/room-data-actions.ts` 拥有 8 个动作文案；`src/client/room-data-io.ts` 拥有读取路径与 prompt 形状（`panelPromptRequest`）（462 → 394 + 132） | 包装 120 行只差 1 行（私有 `deskRemote` → 导出的 `getDeskRemote()`，编译器报出）；两场景无漂移 |
| 5a | `src/client/approve-mount.ts` 拥有 approve 直调挂载（零 ctx） | 两段各自 0 差异；三处 `console` 级别逐字（空控制台契约） |
| 5b | `src/client/desk-arms.ts` 拥有四臂（`createDeskArms(deps)` 工厂，10 项 deps，逐项保留可选性）；入口 594 → 339 只剩接线 | 前置特征 spec **跨搬迁零改动通过**；旧块 27 个字面量无一丢失 |
| 6a | `dev/probes/web/dialogue.mjs` 拥有按文案找/点按钮（`buttonByText`/`clickByText`，默认精确匹配）；`dev/env/home.mjs` 拥有 home 解析（`devHome`） | 生成的表达式在假 DOM 上 9 案全过；6 个消费方真跑 |
| 6b | `dev/probes/web/desk-process-e2e.mjs` 是 dispatcher（222 行）+ 三个场景模块（191/100/69） | 三段正文 321 行逐字；三场景各真跑 exit 0，判决 JSON 形状不变 |
| 7 | `dev/lib/session-logs.mjs` 与 `dev/lib/continuity-core.mjs` 是跨目录共享库（报告/评测/探针同用一份判据） | session-logs 101 行逐字；核单跑 `--self-check` 红绿对照绿 |
| 8 | `scripts/checks/verify.mjs` 只拥有语料/退出码/逐条报告；8 个内联检查体（159 行逻辑）进 `gates/` 的族核（resolution 扩 4 件 + 新增 self-containment / home-doc-contract / commit-safety，queue 并入 `backlog.mjs`），helper `projectReferenceMatches` 进 `gates/shared.mjs` | 逐族同名负例夹具（13 案）先造红；**夹具咬出一条死门**：`GRADUATED_STATUS` 是行锚定模式，旧内联体却喂给它捕到的单词，于是"毕业提案仍在架上"从来没报过——已修（改测状态行） |

收尾：主包片累积改过 `lib/` 产物后 `pnpm release-smoke` 通过（pack → 干净 home → `dsh plugin add` → 组合读回）。P2 只动 `dev/`，不进发布物。

## 还会约束以后的后果

- **`src/client` 是经典脚本**：tsdown 把整棵树内联进一个 `lib/client/index.js`，硬约束是"无裸运行时 import"（`verify` 的 `clientScriptSafetyProblems` 守）。面向 vendor 的依赖一律走参数——`desk-arms.ts` 的 deps 袋就是这个约束的产物，不是风格选择。
- **改过 `src/client` 后，跑 lib/ 消费型测试与 `verify` 之前必须 `pnpm build`**：`tsc -b` 会把 ESM 写进 `lib/client/index.js`、覆盖 tsdown 的 classic bundle；正确顺序 `typecheck → build → test → verify`（[docs/dev.md](../../docs/dev.md) §五）。
- **每 apply 一份，不落模块态**：臂的 launch 锁与绑定、desk store、settle 观察器都是**每次 materialization 一份**（`createDeskArms` / `createSettleRefreshObserver` 的工厂形态）——落模块级会被同页多实例共享。
- **纯搬迁的证据形态**（后续同类重构照此选）：逐字 diff（含浏览器侧字符串里的空白）、字面量多重集核对、特征 spec 跨搬迁零改动、生成表达式在假 DOM 上真跑；结构等价还要能"数得出来"（如 18 个写点 ↔ 10 + 8）。
- **测试与被测模块同名对齐**：搬走逻辑时同 diff 搬或拆对名 spec（`tests/tooling/session-logs.spec.mjs` 就是这么从 `usage-report.spec.mjs` 拆出来的）。
- **改导入/删导入按运行验，不按印象**：本战役三次同类自伤（`readdirSync`、场景模块的习语导入、以及片 7 漏改 `desk-continuity-live.mjs` 的**第二个** import 块——`node --check` 不解析 import、没有测试跑那个探针，于是"回归资产 import 就崩"一路绿灯，直到后来真跑才咬出）都是静态检查全过、真跑才暴露。**一个文件里有多处 import 时，逐处核对**；纯搬迁后对每个消费方至少做一次"真加载"。

## 输掉的方案

- **client/ 子目录分组**（projection-\* / desk-\* / room-data-\* 三族进子目录）：现在做是纯 churn——命名前缀已可导航、tsdown 内联后 import 面收益为零、23 文件连同 tests import 的改动面不成比例。触发条件：client/ 文件数 > 30 或出现第四族。
- **learn/index.ts 的 schema 抽离**：评估结论"大而合理"（一工具 8 动作、写 case 同构薄适配）。触发条件：超 ~550 行再拆。
- **webui-shots 与 cdp-driver 两份 CDP 客户端合并**：重叠 60-90 行属实，但能力矩阵真有差（域启用/超时语义/发现通道/进程清理），合并是设计工作非机械抽取。触发条件：出现第三份 CDP 客户端或两份行为分歧出 bug，届时单独立卡。
- **ledger 用 mixin/继承拆**：消费面与类型身份耦合，handler 表 + 辅助函数比继承层次可测（bigfile-split S1 输掉的同款理由）；本战役以判别标签 switch + 具名 handler 落地（映射式表在 `strict` 下需要一次函数型断言，参数逆变）。
- **单文件 tool-\*/ 目录扁平化**：每目录一 index.ts 统一可导航，扁平化零收益。
- **desk-process-e2e 只抽执行器不拆文件**：治样板不治导航；本战役拆三模块 + dispatcher 保命令面不变，两者兼得。
- **片 1 连伴生类型一起搬**：把 `OperatingOutput`/`DeskItem` 等与 schema 同迁看似"一份契约一个家"，但 schema 块自足（零引用本地标识符），类型留在同目录 `index.ts` 一样可导航；最小切分换来零风险与可逐字证明。
- **片 6b 的"六步参数化臂执行器"**：读过实际代码后确认不是三个平行骨架——claim/wake 是提前 return 的条件支路、flow 是主体，四臂入口在作用域（desk 根 vs 全局）、有无种子回合、投票选项、断言集与失败相位名上都不同。真正的样板是按文案找按钮（6a 下沉 10 处）与退出尾巴 ×3（抽成唯一 `finish()`）；再抽一个八参数执行器会把可 grep 的显式代码换成间接层。

## 收尾数字（片 8，同日追加）

P3 片 8 于同日经本人点名推进并落地（[收口卡已归档](../../_backlog/_archive/settled_issues/261016-verify-inline-check-cores.md)）：`verify.mjs`
**553 → 496** 行，runner 内**未委托核的检查体从 8 个（159 行）降到 0 个**——逻辑全部进 `gates/` 族核 + 同名负例夹具。
两处实测修正记在这里：内联体是 8–9 个（原估 5 个）、行数收敛到 496（原估 ~420，差在 runner 现在显式备语料，每处多几行）；
真正的验收指标是"内联逻辑归零"，不是总行数。附带收益：队列门从死代码变活。
