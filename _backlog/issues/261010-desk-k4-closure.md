---
status: 推敲中
opened: 2026-10-10
---

# 推敲：章鱼管家 K4 收口——处理流判断、端到端探针与 K1/K2 限制补证

> 立卡：2026-10-10 ｜ 状态：推敲中 ｜ 可关闭：否

**问题与期望结果：** 桌面运营入口（[规格卡](../../notes/proposed/2026-10-06-desk-operating-entry.md)）阶段性停在这里：K3 技术链与首屏已过本人判断，但 K4 只走了第一页——处理流（交代→处理→读回→返回）的实走判断、话术/确认负担判断、浏览器端到端探针、K1/K2 八项 live 限制补证都还开着。本卡是回头再看的判断材料清单；权威现状由规格卡拥有，本卡不复制。

**停点快照（2026-10-10，commit 区间 `cedce04`..`397a5e9`）：**
- 账本 owner：单 Host writer（独立 `assistant-operating` dataDir、惰性跨进程锁、原子持久）＋纯核归约，V1–V3（身份/可信更新/四时间与提案通道）全部红绿。
- 模型面：`assistant_operating` 工具（11 动作权限分界）＋ `assistant:operating-brief` 提示词段；组合五台阶、release-smoke 过。
- 读回链：投影从真实账本即时渲染 v2（回执带来源会话、待认领、提案、提醒占位）；客户端双信封解析；处理路径判定器负例矩阵全绿；面板接线（retain-by-mainView 导航、四路订阅、返回仍选原事项）。
- 模型行为：三 eval 任务 **PASS**（真实模型回合，key 由本人授权取自凭证服务）；会话后的真实账本状态即行为证据——entrust 提交、口头推迟进 pending 提案、无归属片段待认领，三条权限通道全出现。
- 本人判断：重设计后的桌面首屏「不错，有改善，我觉得挺好的」——首屏视觉/层级通过（`74bb9e2`/`7481fc1`）。
- 品牌与命名：本人三轮口味收敛定为「章鱼管家」（`1812c30`），preset 显示名/网页标题/章鱼剪影已换装，两 web-face 场景重录。

**开放面（回头再看的清单，每项含没做的原因）：**
1. **K4 处理流实走判断**——真人步骤（交代→处理→读回→返回＋话术/确认负担），卡上只有判读材料；演示 home `/tmp/eval-desk-gTg2`（临时，消失后 live 证据降级，可重建；2026-10-10 晚服务已重启、preflight 绿、URL 已交本人）。
2. ~~浏览器端到端探针~~ **已闭合（2026-10-10）**：`dev/probes/web/desk-process-e2e.mjs` 自包含编排（种子账本恢复→直连 CLI bin 起服务→CDP 全链→拆服务），处理按钮→会话→读回→返回的确定性全链全绿；回放素材 = K3 eval 真实回合（`dev/fixtures/desk-process/`，llm-replay 派生），工具执行/账本/投影/判定/导航全真。**探针抓出并修复两处真缺口**：①`processMatter` 只 retain 不选会话——常见路径（已有 mainView 保留会话）下回合跑进旧会话、回执落在旧会话名下、自动返回必然卡死（修：`ctx.uiWorkspace.openSession` ＋ inject 声明 ＋ contracts 镜像）；②settle-follow 的触发源（list `updatedAt`）只在**用户消息**时 bump（vendor `api-session/activity`），回合结算后没有任何信号再触发投影刷新（修：绑定会话 running→false 边沿触发 `reader.refresh()`；另在 4s 防抖里补投影刷新作快回合层）。prove-it-red 双负例：关 openSession（会话错位红）与关结算刷新（带速回放下 `receipt-not-read-back` 红）；`paceMs: 25` 让回执落在 4s 静默窗口之后，探针对结算边沿层是诚实守卫（快回放会被静默层顺带覆盖——首轮负例实测教训）。
3. **K1/K2 八项已接受限制补证（2026-10-11 轮，逐项推进）**：① 精确 request URL 半边已直接取证（`projection-live-mechanics` 判决记录 `…/api/assistant/desk-projection` 完整地址）；子路径挂载半边维持已接受限制——vendor web 服务无挂载配置面，属平台部署关切，客户端承重事实是 reader 以 `document.baseURI` 相对解析＋同源守卫（源码持有）。② live 断连/恢复已实测（CDP 离线仿真：断连横幅→恢复在线→重连代际刷新、横幅消失、事项可见）。③ Session 审计已做（三次页面重载，磁盘会话数 25→25 不增殖）。④ 窄视口逐项已证（420x900 单 pane：点击进详情→返回导航→选择保留→无横向溢出；resize 回宽区面板与选择存活；「所选消失恢复」子项仍未单独取证）。⑤ 已修复并双向验证（`projection-selection` 重写上 cdp-driver：旧形的 shots `--eval` 断言实测无效——同步抛/异步 reject 都 exit 0；新形断言值回 Node 判定，绿跑＋readiness 超时红跑双验）。⑥ 浏览器入口注册路径已由 `desk-process-e2e` 全链覆盖（ProjectionPanel 从真实 ledger 渲染、选中、处理、返回），Node 入口维持组合生命周期套件——分叉两侧各有证据。⑦ 独立 review 进行中（code-review 双轴：Standards／Spec，范围 `cedce04..HEAD` client 面）。⑧ 已实现并实测（记录路径改挂真正滚动的桌面根 onScroll＋恢复路径＝根 ref 渲染后 DOM 效应；面板卸载重挂往返后 256→256 精确恢复）。载体：`dev/probes/web/projection-live-mechanics.mjs`（②③④⑧自包含编排，fixture 态共用探针 home，与 desk-process-e2e 的 ledger 态不冲突——ledger 优先）。
4. **V4/V5 提醒协调**——投影 reminders 恒空占位；提醒协调与恢复协议按归档卡 261008 承接。
5. **vendor 文案限制**——首屏 hero 标题「探索未至之境」无部署覆盖口（EmptyHero 直渲、locale Config 无字典覆盖口）；是否向上游提 headline 槽位/覆盖口，待推敲。

**本轮试出的经验（复走时少踩坑）：** key 在凭证服务 `~/.dsh/.credentials.yaml`（eval 以环境变量注入，勿回显）；eval 前目标 home 必须跑过 prepare/setup；`tsc -b` 会把 ESM 覆盖进 classic bundle 输出路径，typecheck 后必须重跑 build；web-face 重录必须在**对应契约的 home** 上（blank 场景曾在 eval home 误录真实业务数据，靠契约检查抓回）。探针轮新增（2026-10-10 晚）：**`pnpm build | tail` 管道吞退出码**——tsdown 失败后 tsc 的 ESM 覆盖留在 lib/client、classic bundle 消失，`&&` 照跑、探针全灭而 client 测试仍绿（源码级测试不走 lib）；链命令必须裸跑看 exit。**cordis 属性代理对未声明 inject 的服务直接抛**（不是返回 undefined）——`ctx.uiWorkspace` 未进 inject 清单时整个 async 体静默死，而 spec 的普通对象 mock 全绿：浏览器专属回归，只有真浏览器探针抓得住。**经启动器 SIGTERM 只杀启动器**——真服务成孤儿继续持有 writer.lock，下一轮 report/propose 全被「owned by another writer」拒；服务编排要直连 vendor CLI bin（先例＝release-smoke）。**CLI 旗标边界**：launcher 解析到第一个不认识的 token 为止，`--patch` 必须放在 `--port` 这类 app 旗标**之前**。**探针完成信号设计**：自动返回本身会把会话视图换走——等「终答文本可见」的探针和被测的返回在赛跑，标记必输；完成信号要用「桌面重新挂载」（蕴含整链）。llm-replay 的 title-llm 调用实测**不吃**脚本条目（对齐无虞）。

**重启条件与关闭条件：** 本人点名继续即复走；真实使用出新哏点、或 pin 升级影响相关 seam 时本卡提前回看。关闭条件：K4 判断收口＋开放面逐项补证或转正为产品决定，按 [backlog 条件](../README.md)交接/关闭；在此之前任何「K3–K4 完整通过」声明都不成立。
