# product-workspace-gate —— 产品工作区绑定后的首开态（web 面期望比对场景）

> 场景契约（`snapshots/AGENTS.md`：录制命令、profile、判据与 fixture 同 diff）。
> harness：[`dev/probes/web/webui-expected.mjs`](../../../dev/probes/web/webui-expected.mjs)；预置脚本：本目录 [`seed.mjs`](seed.mjs)。

## 场景是什么

隔离 home 里有一份产品设置（`<home>/assistant-product/settings.json`）指向一个 **home 外**的项目目录时，产品行在 boot 时登记该 workspace；从「今天」打开的首屏必须出现：

- 侧栏工作区 `product-workspace`；
- 首页顶部的门条 `工作区 · product-workspace` 与 `开始一件事` 按钮；
- 原有的一页纸（不是空白聊天）。

这是 [`src/client/product/product-gate.ts`](../../../packages/dsh-smart-assistant/src/client/product/product-gate.ts) 的耐久回归面：没有产品设置时门必须透明（dev/standalone 的既有场景不变）；有设置且 ready 时才出现门条。场景第二步点“开始一件事”，确认它真的在该工作区开出一个 Session（composer 出现；不跑模型回合）。

## 怎么跑

```sh
node snapshots/web-face/product-workspace-gate/seed.mjs patch "$ASSISTANT_DSH_HOME"
node snapshots/web-face/product-workspace-gate/seed.mjs bind "$ASSISTANT_DSH_HOME"
pnpm dsh --profile dev --port 0 --no-open
# 另一个终端：
pnpm webui-expected '<URL>' --scenario snapshots/web-face/product-workspace-gate --wait-text '开始一件事'
# 渲染漂移复核后重录：
pnpm webui-expected '<URL>' --scenario snapshots/web-face/product-workspace-gate --wait-text '开始一件事' --refresh
```

`web-face-check --scenario product-workspace-gate` 会自动串起准备、seed、boot、比对与收尾。

## 判据边界

- 证明：产品设置 → 产品行登记 → 客户端门条/按钮渲染、原有页面仍在；CTA 点击 → 会话打开（composer 在场）。
- 不证明：按钮点击后的 Session 创建（client spec 与真机 `product-smoke` 的分工）、模型行为、恢复面文案（缺失/非法绑定由 client spec 覆盖）。
