日期：2026-11-01 · 状态：**implemented**

# 产品 profile 对齐：dedicated profile、工作区 Config 与 bundle 自有启动

## 问题（可观察行为）

上一版把产品层放在启动器和 `<productHome>/assistant-product/settings.json`：启动器写工作区绑定，host 行 boot 时读文件；客户端门只在 ready 时显示门条，`not-configured` 时透明。结果是：

- 不用启动器、按 DSH 原生方式装进 `assistant` profile 时，产品行没有绑定、首屏是普通一页纸，交付包落到默认工作区；
- 生产用户看到的产品入口、工作区设置和首启都依赖一个 DSH 之外的启动器，和 named profile 的启动模型分叉；
- 安装说明把启动器写成推荐，并含有 `dsh plugin --profile desktop` 这类 DSH 明确拒绝的写法。

## 决定

1. **产品 = dedicated `assistant` profile 的组合**；插件包提供 bundle/patch/preset/client/可选安装器，不发布 profile 目录、不发布第二个可执行文件。运行入口是 `dsh --profile assistant`。
2. **工作区绑定是 `assistant-product` 的 Config**：`workspaceDir`（volatile；profile patch）与 `onboarding`（部署默认，默认 true）；`ASSISTANT_WORKSPACE` 只作一次性启动覆盖。成功登记后通过 `ctx.settings.update('assistant-product', { workspaceDir })` 写当前 profile patch；不再读写私有 `settings.json`。
3. **首启由 bundle 回答**：`not-configured` 且 onboarding 开时，客户端 `main` 槽显示“选一个项目目录”，用 DSH directoryPicker；可“稍后”；目录选择后 POST 产品路由 → 校验/登记/写 Config；恢复面可重选。不依赖 `welcome-notice`/`settings.onboarding`。
4. **安装器降为可选**：`bootstrap.mjs` 只做解析 home、确保 `assistant` profile 存在（不存在才从 web 模板建）、装 tarball、设自己的默认 preset、`--workspace` 设一次性 env、起 `dsh --profile assistant`；不写工作区绑定、不写 home patch、不重置已有 profile。native 路径是一等公民。
5. **安装路径按 DSH 合同**：GUI 默认 Plugins 页（当前 profile，不创建 profile）；CLI `--profile` 只作 web 自动化；Desktop 用 Desktop 的 Plugins 页，CLI 不碰 `desktop`。产品安装器是 shell/自托管路径，不是 DSH 的默认安装方式。
6. **大脑与产物**：大脑继续跟人走（1A，home 单例，不按 workspace 分区）；一次作业的 run bundle 继续写 `<workspace>/deliverables/<date>-<slug>/` + README 四段 + `present`；不复制会话日志、不把知识页当交付正文。
7. **版本门按 pin 实际合同**：本 pin 的安装门只读 `engines.dsh`/peer；不写本 pin 不读的 `dsh.compatibility.dshReleases`；升级到读取该字段的 DSH 时再评估。
8. **不做旧产品兼容**：旧 `<productHome>/assistant-product/settings.json` 不再读取；旧 home 需要重新在首启选目录或改 profile Config。

## 输掉的方案

- **启动器拥有产品层（上一版）**：一条命令、产品 home、私有设置文件能快速做出演示，但 native 路径退化、设置成第二真值、安装说明与 DSH 合同冲突。
- **只做 native 插件、把产品特殊性全放进客户端开始页**：能装进用户现有 profile，却丢掉 dedicated `assistant` profile、产品安装器与目标用户的一条命令；产品身份被稀释。
- **保留 `settings.json` 作为机器本地绑定**：换机/换 profile/团队 profile patch 都分叉；与 profile Config 形成两个家。
- **per-workspace 大脑（B/C）**：平台段落拿不到 session/workspace；与 1A 相反；另立决定。
- **全盘仿 deck-studio 的 workbench + `dataRoot` + 源只读**：与四房间/账本/一页纸/项目交付包冲突；是另一个产品面。
- **现在加机器 run manifest**：没有消费者；先用 README 四段，触发 = 产品 UI/自动化核对产物。
- **把 `dsh.compatibility.dshReleases` 写进本 pin**：37 的外部约定，本 pin 的 manifest reader 不读；写了是假声明。

## 后果

- 产品可以在 native `dsh --profile assistant` 下首启选目录、登记、开会话、写交付包；安装器只是可选包装。
- 工作区绑定只有一个家（profile patch）；首启/换项目/恢复面都在客户端；Settings 可改，不再有私有文件。
- 安装文档分成 A 安装器 / B 原生 / C Desktop；Plugins 页与 Desktop 的口径按 DSH 合同写。
- `product-smoke`（安装器）与 `product-native-smoke`（无安装器）共同证明产品自足；web-face 有 onboarding 与 ready 两个场景。
- 旧产品 home 的 `settings.json` 被忽略；旧用户需要重选工作区；这是明确的“不做兼容”代价。
- 未取：per-workspace 大脑、机器 run manifest、npm publish、Windows/Desktop 真机矩阵；触发见收口卡。

## 验收

工作台账、切片证据与开放项在收口卡：[产品 profile 对齐](../../_backlog/_archive/settled_issues/261101-product-profile-alignment.md)。

## 与旧决定的关系

[插件即产品](2026-11-01-plugin-as-product.md) 被**部分收窄**：1A 大脑、run bundle、headless 禁用仍有效；产品 home 由“产品前提”降为部署选项，工作区绑定由 `settings.json` 改为 profile Config，启动器由“产品入口”降为可选安装器。
