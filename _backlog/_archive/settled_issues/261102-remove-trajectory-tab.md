---
status: 已结
opened: 2026-11-02
---

# 推敲：主 Tab 里的「运行轨迹」不要——从会话视图里拿掉 vendor 的 trajectory 页

> 立卡：2026-11-02 ｜ 状态：已结（2026-11-02 关闭）｜ 类型：Task ｜ 可关闭：是 ｜ 结论：`ui-trajectory` 裸 id 停用（bundle 层），组合、客户端清单与真页面三处都验证了「没有运行轨迹页」

**问题与期望结果：** 会话区主 Tab 上有 vendor 自带的「运行轨迹」（`@deepseek-ai/dsh-client-ui-trajectory`，
`conversation.view` 的一个页签）。目标用户是管理者，不看运行轨迹；它占一个页签位、每次都在，属于噪声。
期望结果：装本包后**会话视图里没有「运行轨迹」这一页**；vendor 的 `conversation.view` 只剩下与本产品相关的页。

**当前情况：** 该页由 web-app 层的 `ui-trajectory` 行引入（`vendor/dsh/packages/bundle/web-app/cordis.patch.yml:457-458`），
它只做一件事：往 `conversation.view` 注册一个页签（`packages/client/ui-trajectory/src/client/index.ts:79`，
中文标题「运行轨迹」，`locale/zh.json:3`）。本包已经用过同一种手法去掉右栏终端行
（`ui-sidebar-terminal` 裸 id + `disabled: true`），所以这里不发明新机制。

**未决问题：** 无（本人已点名去掉；如果将来要看轨迹，可以按会话开一个调试页，而不是常驻主 Tab）。

## 方案与取舍

- **选中**：bundle patch 里 `- id: ui-trajectory` + `disabled: true`（与 `ui-sidebar-terminal` 同形）。
  bundle 层在 web-app 之后，所以压得住；卸载后自动恢复。
- 放弃：改 vendor、或在本包客户端里把那个 tab 的 label 隐藏——前者不动 vendor 是硬规则，后者是跟 vendor 的形状打架。
- 放弃：保留但排到最后——本人诉求是"不需要"，不是"不显眼"。

## 验收标准

| # | 判据 | 证据 |
|---|---|---|
| 1 | 组合里 `ui-trajectory` 行为停用 | `dsh --profile <p> --dump-config` 里该行带 `disabled: true` |
| 2 | 客户端不再加载该 bundle、会话视图无该页签 | 起实例后 preflight 的插件清单里不再有 `@deepseek-ai/dsh-client-ui-trajectory` |
| 3 | 不误伤 | `pnpm verify` + `pnpm test` 绿；`conversation.view` 上本产品自己的页（房间/调试）仍在 |

## 落地记录（2026-11-02）

| 验收 | 证据 |
|---|---|
| 1 组合里停用 | `dsh --profile dev --dump-config` → `- id: ui-trajectory / name: '@deepseek-ai/dsh-client-ui-trajectory' / disabled: true`；boot 无 `entry not found` 警告 |
| 2 客户端不再加载 | 重启实例后 `webui-preflight` 的插件清单里 `ui-trajectory` **出现 0 次**（本包 `dsh-smart-assistant/client.js` 仍 1 次）；真页面 CDP 读数 `hasTrajectory: false` |
| 3 不误伤 | `pnpm verify` 53/53；`pnpm test` 1179 passed（155 文件，含组合 spec 新增的 seed 行）；preflight 绿 |
| 决定入档 | `docs/product.md` §十 override 台账新增一行（含复核/退役条件）；`docs/architecture.md` §二 组合树、包 README「What it contributes」同步 |

复现方式（想验证回归）：把 `packages/dsh-smart-assistant/cordis.patch.yml` 里 `ui-trajectory` 那段删掉 → 重启实例 →
preflight 清单里会重新出现 `@deepseek-ai/dsh-client-ui-trajectory`，主 Tab 又会有「运行轨迹」。

## 关闭条件

验收 1–3 有真跑证据；决定与理由进 `docs/product.md` 的 vendor override 台账；卡归档。
