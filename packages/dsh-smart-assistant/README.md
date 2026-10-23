# dsh-smart-assistant

一个 DSH 插件：给 agent 一个**自己的 working folder**（跨会话的工作目录），并让它始终"有用的多、没用的少"。

- **四个房间**：`memory/`（已确立的事实/偏好/决定）、`research/`（未决线索，backlog 语义）、
  `skills/`（学到的本事）、`knowledge/`（领域知识页，`[[互链]]`）。
- **自有工具**：`assistant_memory`、`assistant_recall`、`assistant_research`、`assistant_reflect`、`assistant_knowledge`、`assistant_operating`
  （动词清单以生成物 catalog 为准）。
- **一个机器能跑的养护检查**：`assistant_memory action=curate`。
- **一个 agent preset**：`assistant`（挂上它，这个会话就是"有 working folder 的助手"）。
- **一个只读部署自检 CLI**：`ov-doctor`（`bin/ov-doctor.mjs`；装好可选 OpenViking 层后在 profile 内运行，见安装手册的 OV 自检节）。

## 它是什么形状

**当前声明了什么，以生成物为准**：[`docs/package-catalog.md`](../../docs/package-catalog.md)
（由 `scripts/generate/gen-catalog.mjs` 从 exports、组合行、工具源码与技能目录抽取；`pnpm verify` 守 freshness）。
这里只留一句形状概括，不再手维护清单（手维护的清单必然漂移）：

- plugin 子路径按 host / agent / client 三平面分布（host 含知识批准服务，agent 含自有工具、常驻段落、
  learn、遮蔽盾与 dev 的 `./preset-runner`），另有非 plugin 导出（`./package.json`）。**计数与逐行清单以
  [生成物 catalog](../../docs/package-catalog.md) 为准——本句不携带数字。**

装法、身份名、working folder 的契约分别在仓库的 `README.md`、`docs/identity.md`、`docs/home.md`。

Web 客户端贡献独立全局桌面（唯一「桌面」，账本投影）与右栏可按需添加的四个房间 tab（记忆 / 知识 / Viki / 技能）。默认主面板选择只在页面初始化时尝试，不随重挂覆盖用户导航；导航与数据读取的当前合同在 [浏览器动作链](../../docs/architecture.md#浏览器动作链一次点击--可见的桌面变化)。客户端不拥有经营权威数据。

Host 的 `./desk-projection` 是固定只读投影下载：有权威 `ledger.json` 时活渲染 v2 投影，无账本时回退固定 fixture；不是经营 writer 或通用文件读取。Config `dataDir` 与 agent working folder 独立；缺失、损坏和 I/O 错误分别返回错误，且 fiber 卸载撤销路由。目录/状态码/限额合同由上面的浏览器动作链拥有；此入口不向模型添加工具或提示词。

Client 内部下载对象处理连接代际、手动重读、陈旧缓存与迟到结果拒绝，使用平台 snapshot publisher；apply 承担 effect disposal，并通过 Slot inject hooks 供全局主区消费。它使用经营 v1/v2 双信封解析器验证身份、修订、事项状态及证据定位；解析失败保留最后有效内容。主面板显示完整集合和缺失/空/错误/陈旧状态；事项选择显示摘要、状态、证据 quote 与 Session/event 定位，宽区双栏、窄区单 pane 保留选择与列表位置；事项选择、处理路径与自动回桌已提供，业务写入仍由模型经账本动作完成（客户端不直接写经营账本）；`ready` 不等于业务成功。对象无持久缓存，组件不自行订阅或发起下载。

## 依赖姿态

Host 运行期 `@deepseek-ai/*` 使用 **peerDependencies**；仅类型关系（例如 Connection 下载声明）使用开发依赖：DSH 的公开 API 仍是 pre-stable，
精确钉死会让每次上游同步都变成一次发版。验证过的 release 记在 `dsh.compatibility.dshReleases`。
`yaml` 是唯一的运行时 dependency。

## 自包含

发布产物（`lib/`、`bin/`、`presets/`、`cordis.patch.yml`）不引用 repo 内任何其他目录，也不引用 `vendor/`；
`pnpm verify` 机械检查这一点。真实安装形状（`pnpm pack` → 干净 home → `dsh plugin add`）
由 `pnpm release-smoke` 验证；`bin/ov-doctor.mjs` 随包安装，另一人不需要仓库。
