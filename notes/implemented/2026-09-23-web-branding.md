# 2026-09-23 · Web 壳品牌注入：页标题 + 图标（已实现）

日期：2026-09-23 · 状态：**implemented（本切片）**

## 问题

dev Web UI 与日用 DSH Web UI 同屏时完全同貌（同 `<title>DSH Local Build</title>`、同 favicon），
用户分不清哪个是哪个；点名要求：合理位置写清"这是一个聪明助手 DSH Local Build"，图标能换更好。

## 决定

1. **通道 = host 侧 `webserver/index-inject` 结构化注入行**。先例：vendor 的 `ui-theme`
   （`bootThemeInjection`——同一事件、同一行式、同一 `JSON.stringify` 嵌值姿势）。我们的行是一段
   body 内联 script：改 `document.title` 文本、移除既有 icon link、追加 data-URI SVG favicon
   （白房子 + 青底圆角方——助手之家的概念），即贴即生效，不等 DOMContentLoaded。
2. **落点 = `src/web-branding.ts` 纯函数**（可单测）+ 服务构造器里 `ctx.on` 注册。headless 组合
   无 webserver，事件永不发射，监听空转——dev-task one-shot 冒烟不受影响（实测）。
3. **配置 = `webTitle`**（默认 `聪明助手 · DSH Local Build`，空串 = 不注入）：部署可变项走 Config
   （vendor 纪律：No hardcoded tunables in plugins）。
4. **皮肤面定性**：标题/图标不进模型上下文、不进会话日志、无机器引用名——`docs/identity.md` §二
   登记。这**不是** architecture §六延后的"专属 Web 卡片"（那是 client 插件/slot 面，触发条件
   "通用卡不够用"未到，判断不变）。

## 输掉的方案

| 输掉的 | 为什么输 |
|---|---|
| 改 vendor dist（`apps/web/index.html` / `favicon.svg`） | 违反本仓第一硬规则（vendor 永不改）；submodule 变脏，换 pin 即丢 |
| 客户端插件（`dsh.client` manifest + `./client` 出口） | 机制正确但重：为改一个标签页标题引入 client bundle 面、slot 纪律、i18n 词典；"专属 Web 卡片"延后判断继续成立 |
| 只注入静态 `<title>`/`<link>` 行，不动图标 | 用户点名要图标；且双 `<title>` 依赖浏览器取首个的未成文行为——script 改写 textContent 是确定性的 |
| 注入后等 `DOMContentLoaded` 再应用 | head 里的 title/icon 在 body script 运行前已解析完，等待只带来未品牌化的闪烁 |

## 验证（真跑过）

- `pnpm typecheck` / `pnpm test`（新增 `tests/web-branding.spec.ts` 6 例：行 shape、标题嵌入、
  图标 data-URI、即刻应用、`</script` 不可注入——恶意标题的 `<` 全量转义 `\u003c`，与 webserver
  `global` 行同款）/ `pnpm verify` 15/15。
- 盘上实证：重建 lib 并重启 dev web 后，curl 首页 HTML 含品牌注入行（证据见战役 note 开跑补记）。
