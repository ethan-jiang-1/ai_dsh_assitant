# dsh-smart-assistant

一个 DSH 插件：给 agent 一个**自己的 working folder**（跨会话的工作目录），并让它始终"有用的多、没用的少"。

- **四个房间**：`memory/`（已确立的事实/偏好/决定）、`research/`（未决线索，backlog 语义）、
  `skills/`（学到的本事）、`knowledge/`（领域知识页，`[[互链]]`）。
- **四个工具**：`assistant_memory`、`assistant_research`、`assistant_reflect`、`assistant_knowledge`。
- **一个机器能跑的养护检查**：`assistant_memory action=curate`。
- **一个 agent preset**：`assistant`（挂上它，这个会话就是"有 working folder 的助手"）。

## 它是什么形状

**当前声明了什么，以生成物为准**：[`docs/package-catalog.md`](../../docs/package-catalog.md)
（由 `scripts/generate/gen-catalog.mjs` 从 exports、组合行、工具源码与技能目录抽取；`pnpm verify` 守 freshness）。
这里只留一句形状概括，不再手维护清单——手维护的入口表在本仓漂移过两次：

- plugin 子路径按 host / agent / client 三平面分布（host 含知识批准服务，agent 含四工具、提示词段落、
  learn 与遮蔽盾），另有非 plugin 导出（`./preset-runner`、`./package.json`）。**计数与逐行清单以
  [生成物 catalog](../../docs/package-catalog.md) 为准——本句不携带数字，数字在这里烂过一次**（第五轮漂移审计 #1）。

装法、身份名、working folder 的契约分别在仓库的 `README.md`、`docs/identity.md`、`docs/home.md`。

Web 客户端贡献独立全局桌面、会话内桌面视图与右栏三室。默认主面板选择只在页面初始化时尝试，不随重挂覆盖用户导航；导航与数据读取的当前合同在 [浏览器动作链](../../docs/architecture.md#浏览器动作链一次点击--可见的桌面变化)。客户端不拥有经营权威数据。

Host 的 `./desk-projection` 是固定 JSON 文件下载，不是经营 writer 或通用文件读取。Config `dataDir` 与 agent working folder 独立；缺失、损坏和 I/O 错误分别返回错误，且 fiber 卸载撤销路由。目录/状态码/限额合同由上面的浏览器动作链拥有；此入口不向模型添加工具或提示词。

Client 内部下载对象处理连接代际、手动重读、陈旧缓存与迟到结果拒绝，使用平台 snapshot publisher；由未来 apply 消费方承担 effect disposal。它固定使用经营 v1 解析器验证身份、修订、事项状态及证据定位；解析失败保留最后有效内容。它未接入主面板；`ready` 不等于业务成功。对象无持久缓存，组件不自行订阅或发起下载。

## 依赖姿态

Host 运行期 `@deepseek-ai/*` 使用 **peerDependencies**；仅类型关系（例如 Connection 下载声明）使用开发依赖：DSH 的公开 API 仍是 pre-stable，
精确钉死会让每次上游同步都变成一次发版。验证过的 release 记在 `dsh.compatibility.dshReleases`。
`yaml` 是唯一的运行时 dependency。

## 自包含

发布产物（`lib/`、`presets/`、`cordis.patch.yml`）不引用 repo 内任何其他目录，也不引用 `vendor/`；
`pnpm verify` 机械检查这一点。真实安装形状（`npm pack` → 干净 home → `dsh plugin add`）
由 `pnpm release-smoke` 验证。
