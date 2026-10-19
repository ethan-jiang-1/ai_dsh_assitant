# first-open-draft-banner —— 有草稿待批时的首开态（web 面期望比对第二场景）

> 场景契约（snapshots/AGENTS.md：录制命令、profile、判据与 fixture 同 diff）。
> harness：[`dev/probes/web/webui-expected.mjs`](../../../dev/probes/web/webui-expected.mjs)（`--scenario` +
> `--wait-text`）；预置脚本：本目录 [`seed.mjs`](seed.mjs)。
> 试点场景与成本台账：[`../blank-first-open/README.md`](../blank-first-open/README.md)。

## 场景是什么

**隔离 home 的默认工作区里有 3 页知识草稿待审批时，从默认桌面点击「有问题」进入 Conversation 的第一屏**：hero、首开引导条之外，
composer 上方必须出现审批横幅——「⚠ 3 页知识草稿在等你审批——批准后才会成为它的判断依据」+
「点这里去审批」按钮。这是[首开 UX](../../../_backlog/_archive/settled_issues/261001-first-open-ux.md) 第 17 轮
交付的 `assistant-approval-banner`（composer dock 第二注册）的耐久回归面：那一轮的
before/出现/贯通/退场三态真机证据当时的落点易失（仓外临时目录），本场景把它变成仓内可重放的期望。

**为什么选它当第二场景**（而非试点 README 点名的提示词组装面）：横幅是首开 UX 最近一次 UI
交付，其行为断言（client-first-mile 5 案）已钉注册与计数逻辑，缺的是**渲染进真组合**的那半
——正是本 harness 的定位；提示词组装面属 session 回放车道，等它自己的升级触发。

## 怎么跑

```sh
export ASSISTANT_DSH_HOME="$PWD/.tmp/dsh-expected-banner-home"

# ① 隔离 home（幂等；vendor 产物在位时 ≈13s）
bash dev/env/prepare.sh && bash dev/env/setup.sh

# ② boot 前预置：workspace-controller 行（P1-C）+ 内测声明预确认（幂等，各查各的 marker）
node snapshots/web-face/first-open-draft-banner/seed.mjs patch "$ASSISTANT_DSH_HOME"

# ③ 起服务（后台；URL 带 token）
pnpm dsh --profile dev --port 0 --no-open

# ④ 用 shots 触发首个 UI 连接（不录不存在横幅的期望）。
pnpm shots '<url>' --dom --size 1600x1000

# ⑤ 种桌面文件（3 草稿 + 2 已确认；内部轮询工作区 ≤30s，固定时间戳）
node snapshots/web-face/first-open-draft-banner/seed.mjs desk "$ASSISTANT_DSH_HOME"

# ⑥ 重录期望（--refresh，肉眼过 PNG）或直接比对（漂移即 exit 1）
pnpm web-expected '<url>' --scenario snapshots/web-face/first-open-draft-banner \
  --eval "(() => { const buttons = [...document.querySelectorAll('button')]; buttons.find(b => b.textContent.trim() === '稍后配置')?.click(); const ask = buttons.find(b => b.textContent.includes('有问题')); if (!ask) throw new Error('default desk missing'); ask.click(); return 'Conversation opened'; })()" \
  --wait-text '在等你审批'
# 只有观察到有意渲染变化且过目 DOM 差异，才在上条命令追加 --refresh。
```

**`--wait-text` 是本场景的合同件**：settle 是固定时钟，而横幅数据走桌面 walk view 的异步读，
实测会在 ~2/10 的拍摄里越窗（2026-10-05，十连拍两红）——就该读的**就绪条件**轮询，不是加长
猜测。片段编译在纯核 `buildWaitSnippet`（夹具 `webui-expected-core.spec.mjs`），片段本身仍
resolve `timeout: ...`；但 `webui-expected` 自 2026-10-19（BUG-021）把它翻译成
`--require-eval 'ready: <token>'`——等不到就非零退出、不再照拍，"没有横幅"的反面探针因此更早红。

## 比对什么（判据）

与试点同比对面（DOM 证据 JSON，忽略清单与 token 规则是 core 的被审常量，本场景零新增）：
`visibleText` 必须含横幅全文与按钮、`controls` 必须含「点这里去审批」、`consoleErrors`/
`networkFailures` 必须空。`visibleText` 在盘上是**整串**（含 \n），不是行数组——漂移消息
因此是整串预览式；`textOutline`/`controls` 是行数组，漂移带首差下标。

**确定性账**：种子桌面文件的 `generatedAt`/`updated` 全部固定，首屏不渲染桌面面板（横幅只读
walk view），DOM 无时钟；会话列表为空、无相对时间戳。两个弹窗各归其主：内测声明由
`ui-settings-general` 的 `welcomeNoticeVersion` 配置**预确认**（配置字段即已确认版本——
vendor `ui-settings-models/src/onboarding-copy.ts`，精确等值比较），API Key 引导靠把 dev home
的凭据 `refs` 合并进场景家（结构只增不改、0600）——blank 场景钉的恰是弹窗在场的裸首开态，
本场景把它们请出去以隔离横幅契约。

## 种子文件契约

`seed.mjs desk` 写 `<home>/workspaces/<owner>/default-workspace/.desk/state.json`——形状
照抄真实 desk-refresh 产物（契约 owner：`desk-refresh` 技能；键集以 trial home 实物为准）：
`knowledge[]` 3 行 `status: draft`（各带 `excerpt`，行计数与横幅数字可复现一致——第 17 轮
判据②）+ 2 行 stable、`counts.knowledgeDraft: 3` 仅作行缺席时的 fallback。`sources` 用
`seeds/…` 形状以同时钉住 friendlySource 渲染映射（第 9 轮）。

## prove-it-red 记录（2026-10-05，全链真机）

1. **场景真的依赖前置**（反面）：移走种子 state.json 重拍 → wait-text 诚实超时
   （`eval → timeout: 在等你审批`）→ 横幅缺席 → `FAIL — 5 drift`、exit 1 → 还原复绿。
2. **单字即红**：污染 expected 的横幅计数（3→4，串结构不动）→ FAIL、exit 1 → 重录复绿。
3. **竞态现行**（wait-text 的立项依据）：无 wait-text 十连拍两红，红拍大纲从侧栏直接跳到
   composer 占位符——桌面 walk-view 读取越过了 settle 窗，横幅整体缺席；带 wait-text 六连拍
   全绿且每拍 `eval → ready`。负例夹具三案在 `webui-expected-core.spec.mjs`（轮询/超时
   resolve/引号转义），纯核 14 测试绿。
4. **顺手抓到真回归**：首拍 console 有 `assistantKnowledge mount failed … no strict codec`
   ——approve-direct-call（已 rejected）切片留下的 console.error 诊断在**每次首开**都报错；
   blank 场景 10-04 上午录制、该切片 17:58 落地，其「console 必须空」的期望自那以后**静默
   过时**（无人重跑所以未红）。修复：降为 console.info（诊断仪器保留、严重级归位——这是
   rejected 车道的设计内降级态），blank 场景在第二个全新 home 上复绿验证。

## 成本台账（2026-10-05 实测）

| 项 | 实测 |
|---|---|
| 隔离 home 准备（prepare+setup） | ~13s（vendor 产物在位幂等跳过） |
| 服务启动到可拍 | ~10s |
| 默认工作区创建 | **首次 UI 连接**触发（非 boot 时）；即首拍本身 |
| 单次拍摄+比对（带 wait-text） | ~20s（就绪即过，未 observed 等满 15s） |
| 稳定性 | 无 wait-text 8/10 绿；带 wait-text 10/10 绿（六连拍+反面/污染往返后复拍） |
| 胶水成本 | seed.mjs + snapshot.yml + 本 README + core 的 buildWaitSnippet+三夹具 ≈ 一个轻切片 |
