# product-onboarding —— 无工作区绑定的产品首启态（web 面期望比对场景）

> 场景契约（`snapshots/AGENTS.md`：录制命令、profile、判据与 fixture 同 diff）。
> harness：[`dev/probes/web/webui-expected.mjs`](../../../dev/probes/web/webui-expected.mjs)；预置脚本：本目录 [`seed.mjs`](seed.mjs)。

## 场景是什么

隔离 home 里**没有** `assistant-product.workspaceDir`（没有 profile Config）。产品行在 boot 时是 `not-configured`；客户端首屏必须出现产品开始页：

- 标题 `选一个项目目录`；
- 说明“助手会在这个项目里工作……”；
- `选择项目目录` 按钮与 `稍后` 出口；
- 原有的一页纸/登录态作为背景，不是空白聊天。

这是 [`src/client/product/product-gate.ts`](../../../packages/dsh-smart-assistant/src/client/product/product-gate.ts) 的首启回归面：`not-configured` 不再透明退回普通 dashboard；`onboarding: false` 的部署仍可保持旧行为（client spec 覆盖）。

## 怎么跑

```sh
node snapshots/web-face/product-onboarding/seed.mjs patch "$ASSISTANT_DSH_HOME"
pnpm dsh --profile dev --port 0 --no-open
# 另一个终端：
pnpm webui-expected '<URL>' --scenario snapshots/web-face/product-onboarding --wait-text '选择项目目录'
# 渲染漂移复核后重录：
pnpm webui-expected '<URL>' --scenario snapshots/web-face/product-onboarding --wait-text '选择项目目录' --refresh
```

`web-face-check --scenario product-onboarding` 会自动串起准备、seed、boot、比对与收尾。

## 判据边界

- 证明：`not-configured` → 客户端首启页真渲染（标题/说明/选择按钮/稍后）；原有页面仍在。
- 不证明：目录选择器的点击/取消（native/browse 后端与 OS 对话，需真机；`pnpm web-face-check` 不点它）、目录选择后的 POST/登记（`product-smoke` 与 client spec 分工）、模型行为。
