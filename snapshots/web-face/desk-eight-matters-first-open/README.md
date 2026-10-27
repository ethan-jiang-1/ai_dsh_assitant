# desk-eight-matters-first-open —— 种子经营账本的首开桌面（web 面期望比对第三场景）

> 场景契约（snapshots/AGENTS.md：录制命令、profile、判据与 fixture 同 diff）。
> harness：[`dev/probes/web/webui-expected.mjs`](../../../dev/probes/web/webui-expected.mjs)（`--scenario` +
> `--wait-text`）；预置脚本：本目录 [`seed.mjs`](seed.mjs)。
> 前两场景与成本台账：[`../blank-first-open/README.md`](../blank-first-open/README.md)、
> [`../first-open-draft-banner/README.md`](../first-open-draft-banner/README.md)。

## 场景是什么

**隔离 home 的经营账本位置种着 eight-matters 固定夹具时，第一次打开 web UI 的默认主区**：一页纸显示夹具的
第一件事（回款 A…）、「全部（8）」与「还有 7 件」；输入行与「看依据」在场；输入下方是「让它替你盯 · 3 条」
建议条（2026-10-25 起，2026-10-24 决定「这些动作归 home」的落地）；夹具说明「模拟资料，仅供验证界面。」。
看板 / 流水 / 筛选不在默认面；八张卡片在「全部」的人读列表里，由单元测试与「完整看板」守护，
不在本场景的默认捕获里。

**为什么是它**（六维审计 261020 丙批 #16.5：带 eight-matters 夹具的第三个 web-face 场景）：blank 钉
空桌面的裸首开、banner 钉会话里的审批横幅，桌面**有数据时**的卡片列表渲染（S4 重构后的
projection panel）没有机器会红的回归面；`projection-panel`/`projection-selection` 探针断言过
文本与点选，但每次都要人起服务——本场景把它变成仓内可重放的期望，是 client 面种子数据态的
自动车道。

## 怎么跑

```sh
export ASSISTANT_DSH_HOME="$PWD/.tmp/dsh-expected-desk-home"

# ① 隔离 home（幂等；vendor 产物在位时 setup ≈6s）
bash dev/env/prepare.sh && bash dev/env/setup.sh

# ② boot 前预置：workspace-controller 行 + 内测声明预确认 + 凭据 refs（幂等，各查各的 marker）
node snapshots/web-face/desk-eight-matters-first-open/seed.mjs patch "$ASSISTANT_DSH_HOME"

# ③ boot 前种账本：eight-matters 夹具 → <home>/assistant-operating/desk-projection.json（移走任何 ledger.json）
node snapshots/web-face/desk-eight-matters-first-open/seed.mjs desk "$ASSISTANT_DSH_HOME"

# ④ 起服务（后台；URL 带 token）。投影夹具默认不服务（生产防伪装），本场景必须显式打开
pnpm dsh --profile dev --patch dev/probes/web/projection-fixture.patch.yml --port 0 --no-open

# ⑤ shots 触发首个 UI 连接（默认工作区在首连时创建——把这次副作用结算在录制拍之外）
pnpm shots '<url>' --dom --size 1600x1000

# ⑥ 重录期望（--refresh，肉眼过 PNG）或直接比对（漂移即 exit 1）
pnpm web-expected '<url>' --scenario snapshots/web-face/desk-eight-matters-first-open --wait-text '还有 7 件'
# 只有观察到有意渲染变化且过目 DOM 差异，才在上条命令追加 --refresh。
```

**`--wait-text '还有 7 件'` 是本场景的合同件**：它在投影下载并推导出「还有 N 件」之后才在场；
录制与比对都不可能把 loading/missing 态写进期望。BUG-021 起 webui-expected 把它翻译成
`--require-eval 'ready: …'`，等不到就非零退出、不拍。

## 比对什么（判据）

与两前场景同比对面（DOM 证据 JSON，忽略清单与 token 规则是 core 的被审常量，本场景零新增）：
`visibleText` 必须含「今天」「全部（8）」「还有 7 件」、第一件事标题与摘要、输入占位与「看依据」、
「让它替你盯 · 3 条」及三条建议名（输入下方的建议条，可收起）；不得含「看板」「流水」「筛选」；
`controls` 不再含八张卡片（它们在「全部」里）；`consoleErrors`/`networkFailures` 必须空。

## 确定性账（每处时间源如实清点）

- **夹具零时刻**：eight-matters 是 v1 信封，matters 不带 `times`/`proposals`/`receipts`；v1 归一化
  （`operating-projection.ts`）填 `times: {}`、`proposals: []`、`receipts: []`、`unclaimed: []` ——
  桌面上唯一日期渲染器 `humanTime`（绝对格式 `YYYY-MM-DD HH:mm`，`chrome/format.ts`）**一次都不会
  运行**：visibleText 里连绝对日期也没有（录制后机器复核：`\d+ 天|小时|分钟|YYYY-MM-DD|HH:mm|N月N日`
  全部零命中）。
- **相对时间渲染器全部不可达**（候选判定时的核心论据）：「到期 N 天」（`daysOverdue`，随当日漂移）
  需要一条 active 事项有已过期的 `nextCheckpoint`/`promisedDeadline`——夹具没有任何时刻；
  「上次迟了 N 小时/分钟」（`lateNote`）需要 schedule catalog 里有一条迟到投递——全新隔离 home 没有
  排程，行 3 的 fetching/空 entries/unavailable 三态都只改 `data-proactive-catalog` 属性（DOM 证据
  字段不采集属性）。行 1/2 同样不导出（无到期时刻；0 待确认 + 0 待认领 + 0 待答问题）。
- **主机路由按字节原样回传夹具**：`ledger.json` 不在场时 `/api/assistant/desk-projection` 直接回
  `desk-projection.json` 的字节；`new Date().toISOString()` 重戳只发生在 live ledger 渲染路径上。
  账本 writer boot 无副作用（writer.lock 首次变更操作才拿），本场景无模型回合 → 无操作 → 无 ledger。
- **建议块不在默认面**（它在完整看板里）；一页纸不读它。
- **会话列表为空**（全新 home）→ 侧栏无相对时间戳（blank/banner 同账）。
- **两个引导弹窗各归其主**：内测声明由 `welcomeNoticeVersion` 配置预确认、API Key 引导靠 dev home
  凭据 `refs` 合并（banner 场景姿势，结构只增不改、0600）——弹窗在场的裸首开归 blank 场景钉，
  本场景让卡片不被遮挡。
- 「全部（8）」「还有 7 件」从夹具字节推导（8 件事，首件占一页），无钟。

## 种子文件契约

`seed.mjs` 两条命令，各管各的、幂等：

- `patch <home>`：写 `<home>/profiles/dev/cordis.patch.yml` 两行（workspace-controller 的
  `documentsDirectory` 指到本 home 内、`ui-settings-general` 的 `welcomeNoticeVersion` 预确认），
  并把 dev home 的凭据 `refs` 合并进 `<home>/.credentials.yaml`——与 banner 场景同款姿势。
- `desk <home>`：账本落点 **`<home>/assistant-operating/desk-projection.json`**（desk-projection
  host 服务未配 `dataDir` 时解析 `<dshHome>/assistant-operating`，`host/desk-projection/index.ts`），
  字节来自仓内 `dev/fixtures/desk-projection/eight-matters.json` 原样拷贝；同时 `rm` 任何
  `ledger.json`（live ledger 永远赢过夹具——`download.ts` 的读取顺序）。路径形状与
  `dev/probes/web/projection-live-mechanics.mjs` 的夹具态种子相同。

## 成本台账（2026-10-21 实测，录制链全程真跑）

| 项 | 实测 |
|---|---|
| 隔离 home 准备（prepare+setup） | ~5.7s（prepare 幂等跳过 0.06s + setup 5.7s；vendor 产物在位） |
| 服务启动到 URL | ~8s |
| shots 首连（含默认工作区创建） | ~14s |
| web-expected 录制（--refresh，带 wait-text） | ~9s（`eval → ready: 还有 7 件`） |
| 单次比对（带 wait-text） | ~9s（就绪即过） |
| 稳定性 | 基线 + 复跑两连拍全绿（`PASS — matches` ×2，exit 0） |
| 胶水成本 | seed.mjs + snapshot.yml + 本 README（比 banner 少一个 rooms 往返：账本种子 boot 前一次落位） |
