# 第一公里走查：从打开到第一句话（真机渲染证据）

日期：2026-09-26 · 状态：**进行中**（P0-B 走查报告；证据面在本目录，工作项在[第一公里卡](../implemented/2026-09-26-first-mile-landing.md)）

## 1. 方法与环境（证据边界先说清）

**怎么拍的**：`node scripts/webui-shots.mjs '<url-with-token>' --dom --size 1600x1000`——headless Chrome
经 CDP 截图（PNG）+ 产出 DOM 证据（可见文本、带像素高度的文本大纲、交互件清单、boot 诊断、
console 错误、失败请求）。脚本、三个环境坑与修法见该脚本头注释。

**两个 home、三种首开态**（同一份 build，`dev` profile，2026-09-26 深夜）：

| 证据 | 场景 | 是什么 |
|---|---|---|
| [`ceo-first-open-with-default-workspace.png`](ceo-first-open-with-default-workspace.png) | 干净 home（`/tmp/ceo-home`，空注册表）+ 可写 Documents 根 | **真实 CEO 首开**：平台自动建好默认工作区之后的稳定态 |
| [`ceo-first-open-gates.png`](ceo-first-open-gates.png) | 同上，但 Documents 根不可写（agent 文件沙箱） | 门与空态；**工作区缺失这一段是环境假象**（见 §3） |
| [`dev-home-first-open.png`](dev-home-first-open.png) | dev home（`dev/harness-home`，已有工作区与会话） | 开发/自用视角的首开 |

DOM 证据同名 `.dom.json`（`visibleText` 是屏上文字，`textOutline` 是逐块高度，`controls` 是可交互件）。

**语言**：截图语言跟随 host 的 locale 偏好/navigator.language。干净 home 无偏好 → 英文界面
（`--lang` 与 `Emulation.setLocaleOverride` 都推不动 navigator.language）；dev home 的中文截图是
加 `navigator.language` 前置覆盖拍的。**同一份界面在中文下是"探索未至之境/描述你想要构建的内容"**。

## 2. 断点清单（用户原话 → 可观察事实）

用户原话（2026-09-26）："我打开你，我都不知道第一下干什么选什么目录问什么东西，你有什么功能，
全靠对话跟你沟通吗？"

| # | 断点 | 证据 |
|---|---|---|
| 1 | **首屏是 DSH 的，不是产品的**：hero＝DSH 鲸鱼 + "探索未至之境" + "预览版"；产品身份只在左侧栏一行品牌 | `ceo-first-open-with-default-workspace.png`（hero 区）；`dev-home-first-open.png` |
| 2 | **输入框说的是给工程师的话**："描述你想要构建的内容，/ 调用指令，@ 文件或对话"——CEO 的经营问题不在这个句式的射程内 | 同上 + `.dom.json` 的 `controls`（textarea placeholder） |
| 3 | **零功能发现**：三室只在侧栏（`我的桌面/知识室/记忆室`），首屏没有任何"你能干什么"的入口；平台现成的 `/` 命令菜单与 `+` 菜单里**没有一个我们的命令** | `ceo-first-open-with-default-workspace.dom.json`：controls 只有新建会话/插件/三室/搜索/视图/添加工作区/设置/工作区 chip/preset chip/附件/发送 |
| 4 | **首次使用是三道门**：`内测声明`（DSH 开发者通告）→ `添加一个 API Key 开始使用` → 才到界面 | `ceo-first-open-gates.png`；`ceo-first-open-gates.dom.json` |
| 5 | **我们的面板标签不跟 UI 语言**：英文界面下三室仍显示中文（`我的桌面/知识室/记忆室`） | `ceo-first-open-with-default-workspace.dom.json` 的 `visibleText`（`Plugins`/`Workspaces` 英文而三室中文） |
| 6 | **窄栏密度未验**：三室在 1600px 宽屏下的首屏密度可读；右栏窄幅态需要打开右栏 tab 才谈得上（S5 的原始命题） | 待 P2（本轮未拍右栏展开态） |

## 3. 平台事实（这轮查清的，都带证据）

1. **首次使用的默认工作区是真的会建的**：`workspaceRegistry.initializeDefault` 在"无工作区、无会话、
   无存档会话、无 stored headers"时创建 `<Documents>/deepseek-harness/default-workspace`，标题
   `default-workspace` 显示为本地化的"默认工作区"。**实测坐实**：干净 home + 可写 Documents 根时，
   `storages/workspace.json` 出现 `defaultWorkspaceId` 且目录真的建了出来，UI 工作区 chip 显示
   `Default workspace`（[`ceo-first-open-with-default-workspace.png`](ceo-first-open-with-default-workspace.png)）。
   → **P1-C 的结论修正**：发行组合**不需要**额外预置默认工作区；"选什么目录"不是干净安装的必经问题。
2. **为什么此前看起来"没建"**：agent 文件沙箱下 host 无法写 `~/Documents`（`mkdir` 被拒）→
   `initializeDefault` 抛错 → 客户端回落"选择工作区"占位。这是**环境假象**，不是产品行为；
   在沙箱里要复现首开保真度，需把 `documentsDirectory` 指到可写路径（P1-C 的开发环境小交付）。
3. **可用的注入面**（读 vendor 源码核实，均不需改 vendor）：hero 品牌位
   `conversation.hero.brand.mark`；输入框上下 `conversation.input.dock` / `conversation.composer.dock`；
   命令面 `ctx.commandUi`（`/` 菜单与 `+` 菜单的 Commands 区，`ActionSpec` 纯客户端直达）；
   目录流 `conversation.hero.workspace.directoryFlow`。
4. **首次使用的门是配置**：`内测声明` 来自 dev profile 的 `ui-settings-general.welcomeNoticeVersion`；
   API Key 门来自 `session.initializeDefaultModel`（有 provider key 即跳过）。发行组合该不该带、带什么，
   是产品决定（P3 收尾时列给用户）。

## 4. 采集管线的环境坑（血泪清单，别再踩）

拍这一轮证据本身花了很久，四个坑都有明确修法，已固化进脚本：

1. **`--screenshot` 一次性截图在 SSE 长连接下永远等不到 load** → 改 CDP 自控时机。
2. **Chrome 自有 sandbox 与外层文件沙箱冲突 + Crashpad 写 `~/Library` 被拒** → `--no-sandbox` +
   `--crash-dumps-dir`。**不要用覆盖 `HOME` 的办法**：Chrome 153.0.8010.54 下覆盖 HOME 会让它
   **完全不出任何输出**（这轮最贵的弯路）。
3. **CDP 发起的导航（about:blank + `Page.navigate`）在新版 Chrome 下不可靠** → 直接用目标 URL 启动。
4. **CDP 调用会挂死，`--screenshot` 却能出图**（页面主线程被占死时：协议调用要主线程，合成器帧不用）
   → 脚本带看门狗 + 浏览器日志诊断，并保留 `--plain` 兜底模式。
5. **SIGTERM 杀不干净 Chrome**（helper 进程存活，曾累积 26 个）→ 进程组 `SIGKILL`。
6. **agent 沙箱**：`ps` 不可用（用 `pgrep`/`lsof`）；`~/Documents` 不可写（影响首次使用保真度）。

## 4b. P1-C 的复现配方（未决，接手从这里开始）

平台机制与一次成功的端到端观察见 §3.1。**但清空注册表后无法按需复现**（2026-09-26 深夜实测四次）：

1. 起干净 home（`ASSISTANT_DSH_HOME=<dir>` + `--profile dev`），给一个假 provider key 跳过 API Key 门；
2. 把 `workspace-controller` 的 `documentsDirectory` 指到可写路径（`--patch` 或 profile patch 均可）；
3. 删 `<home>/storages/workspace.json` 后重开页面。

结果：客户端停在"选择工作区"、注册表保持 `workspaceIds: []`、目标目录没建、console 无错、host 无警告；
字面量路径与 `!!js` 路径表现相同；`location.reload()` 再触发一次启动恢复也无效。**待查的第一件事**：
客户端是否真的发出了 `workspace/initializeDefault`（用 CDP 的 Network 域抓该 RPC）——发了而失败是
host 侧问题，没发就是客户端启动恢复的分支没走到。

两个顺带确认的环境事实：`!!js` 表达式**不能加引号**（引号让标签文本漏进表达式，被当正则解析，
报 `Invalid regular expression flags`）；用 `!!js process.env.DSH_HOME` 有风险（求值不到则整行 entry
不激活），不值得为未验证的收益承担。

## 5. 未决 / 下一步

- **P1 的输入**：断点 1/2/3/5 直接对应 P1-A（命令面）、P1-B（首屏身份 + composer dock 引导）；
  断点 4 与平台事实 4 是**用户拍板项**（发行组合带什么门），不代拍。
- **未验**：右栏窄幅密度（S5，P2 拍）；命令菜单展开态的截图（需交互，P1-A 用 `--eval` 点开后再拍）。
- **弱证据提醒**：本报告的场景是 dev profile + 两个 home，不是真实 CEO 部署；结论按"可观察行为"读，
  不推广为普遍行为（继承 UX 评审的方法纪律）。
