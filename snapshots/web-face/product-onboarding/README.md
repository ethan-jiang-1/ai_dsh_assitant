# product-onboarding —— 无工作区绑定的产品首启态（web 面期望比对场景）

> 场景契约（`snapshots/AGENTS.md`：录制命令、profile、判据与 fixture 同 diff）。
> harness：[`dev/probes/web/webui-expected.mjs`](../../../dev/probes/web/webui-expected.mjs)；预置脚本：本目录 [`seed.mjs`](seed.mjs)。

## 场景是什么

隔离 home 里**没有** `assistant-product.workspaceDir`（没有 profile Config）。产品行在 boot 时是 `not-configured`；客户端首屏必须出现产品开始页：

- 标题 `选一个项目目录`；
- 说明“助手会在这个项目里工作……”；
- `选择项目目录` 按钮（没有「稍后」出口：它会解锁桌面第二条输入车道）；
- 原有的一页纸/登录态作为背景，不是空白聊天；
- 会话侧：每个 Session 的 composer 被 `ctx.conversation.blocks` 禁用，`conversation.input.dock` 给出同一原因与选择按钮。

这是 [`src/client/product/product-gate.ts`](../../../packages/dsh-smart-assistant/src/client/product/product-gate.ts) 的首启回归面：`not-configured` 不再透明退回普通 dashboard；`onboarding: false` 的部署仍可保持旧行为（client spec 覆盖）。

## 怎么跑

```sh
# 推荐：自动串起准备、seed、boot、比对与收尾（vendor CLI，不注入 dev overlay）。
pnpm web-face-check --scenario product-onboarding
# 渲染漂移逐场景复核后：加 --refresh；一轮 review 只重录确认过的那一面。
```

手工复跑时注意：`pnpm dsh --profile dev` 会注入 `dev/profiles/profile-patch-dev.yml` 的
`assistant-product.onboarding:false`（dev 开发面刻意不挂产品门），所以它渲染的是透明脸，不是本场景。
本场景必须用不注入 dev overlay 的 vendor CLI（`web-face-check` 内部就是这么做的），或在另一个 home 里跑。

## 判据边界

- 证明：`not-configured` → 客户端首启页真渲染（标题/说明/选择按钮，无「稍后」）；原有页面仍在；会话 composer 被 block。
- 不证明：目录选择器的点击/取消（native/browse 后端与 OS 对话，需真机；`pnpm web-face-check` 不点它）、目录选择后的 POST/登记（`product-smoke` 与 client spec 分工）、模型行为。
