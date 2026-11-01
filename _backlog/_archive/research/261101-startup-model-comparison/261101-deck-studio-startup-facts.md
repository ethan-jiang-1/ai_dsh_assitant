---
topic: deck-studio 的安装、启动、profile 配置、项目根、会话 cwd 与数据归属
intent: 把 deck-studio 的「三条命令启动」拆成可比较的机制事实，并记录本机临时 home 的实测，不把文档承诺当成已验证结论。
---

# deck-studio 的启动事实

## 一、安装与启动：三条命令，没有启动器

deck-studio 的 README 与安装文档给的是一条标准 DSH 路径：

```sh
dsh --profile deckline --from-default-profile web     # 建 profile
dsh plugin --profile deckline add dsh-plugin-deck-studio@0.2.4
dsh --profile deckline --port 13090                   # 起 Web
```

- 插件名 `dsh-plugin-deck-studio`；版本 `0.2.4`；`engines.dsh` 是 `>=0.1.7-0 <0.3.0`。
- 没有 `bootstrap`/launcher/`--workspace` 旗标；profile 由用户建，插件由用户装，应用由 `dsh --profile` 起。
- 安装文档还给了插件市场、git 子目录、本地 clone 三条等价安装路径；三条命令的形状不变。
- 安装文档不把「设置默认 preset」列为启动步骤；workbench 的 Chat 是 DSH 原生会话（客户端 `sessions.create`）。

**本机实验（临时 home，未碰日用 `~/.dsh`）**：用 pinned CLI 建 `deckline` profile，安装
`<deck-studio>/plugin/deck-studio` 本地目录，写 `documentsDirectory` 与内测声明确认的 profile patch，
复制 dev home 的 credentials，起服务。三条命令全部成功，页面进入 workbench 首屏：
`Deckline` 顶栏、`+ 新建 Deck`、Decks/Designs/资源库/Conversations/使用手册、示例 deck，
以及首次「先记个名字」弹窗。截图 = [deck-studio-workbench.png](deck-studio-workbench.png)。

## 二、配置在 profile patch，不在启动器

`plugin/deck-studio/cordis.example.yml` 把配置写在用户的 profile patch：

```yaml
- id: deck-studio
  name: 'dsh-plugin-deck-studio'
  config:
    displayName: 'Deckline'
    hideShellSidebar: true
    bootstrap: true
    projectsRoot: '/absolute/path/to/your/sharing'
    decks:
      - id: my-deck
        label: '我的 deck'
        sourceRoot: '/absolute/path/to/my-deck'
    render:
      mode: fake
      # 真图节点：endpoint + apiKeyEnv / apiKeyFile
```

- `projectsRoot`：**新建** deck 的落盘根；留空则用插件数据目录下的 `projects/<id>/source`。
- `decks[].sourceRoot`：**只读**引用的已有 deck 源；可配多个。
- `dataRoot`：插件数据根（工作副本、出图 revision、事件、风格样张）；默认
  `join(DSH_HOME || '~/.dsh', 'deckline')`（`lib/config.js` 的 `defaultDataRoot`）。
- `hideShellSidebar`：专门的产品 profile 里收起 DSH 外壳左侧栏；默认 false。
- `bootstrap: true`：首启登记示例 deck / 资源库 / 预设风格。
- 生图 key 只走 env/本机 key 文件；界面保存的 render settings 覆盖 profile 的 `config.render`。

**关键差别**：deck-studio 不把「用户项目」做成 DSH Workspace；它是**插件自己的项目根**（`projectsRoot` /
`decks[]`）加**插件自己的数据根**（`dataRoot`）。profile patch 是这些路径的唯一来源。

## 三、会话 cwd：客户端按 deck 的源目录建会话

`plugin/deck-studio/client.js` 的会话桥：

```js
// action=ensure：有 sessionId 就切过去；没有就 sessions.create({cwd}) 新建再切
sessionId = await sessions.create({ cwd: String(data.cwd ?? "") || undefined })
if (sessionId) uiWorkspace.openSession(sessionId)
```

- Chat 是 DSH 原生 Chat；workbench 只是壳与工具面板。
- 会话 cwd 来自 deck 的 `cwd`（源目录），不是 DSH Workspace 注册；客户端用的是 `sessions.create({ cwd })`，
  不是 `startSession(workspaceId)`。
- 源 deck 只读；编辑产物、版本、事件、风格样张在 `dataRoot`。README 把编辑产物概括为本地 `.deck/`；
  实际落点以 `dataRoot`/插件实现为准。
- 因此 deck-studio 的「项目」与「助手数据」是**分开的两个根**：源 deck 只读，数据根可写；没有
  `deliverables/` 进用户项目的契约。

## 四、首屏是 workbench，不是 DSH 一页纸

- 客户端在 `package.json` 的 `dsh.client` 声明 `platform: web`、`immediately: true`，注入
  `renderer`/`layout`/`sidebar`；workbench 占满主面，DSH 外壳侧栏可收起（顶栏 `≡ DSH` 临时展开）。
- 首屏是 Decks/Designs/资源库/Conversations 的目录页；点 deck 进入左中右三栏工作区。
- 首启有「先记个名字」的 welcome 弹窗；示例 deck 由 `bootstrap: true` 预置。
- 它**不经过**本产品的 `ProductGate`/`workspace` 门；也没有产品 home 的概念；数据根就在
  `DSH_HOME` 下（默认 `~/.dsh/deckline`）。

## 五、profile patch 的 `[]` 陷阱

`dsh --profile <name> --from-default-profile web` 生成的 `cordis.patch.yml` 开头是注释 + 一个 `[]`。
deck-studio 的安装文档写「追加到末尾」；对**新建** profile 直接追加会形成第二个 YAML document，
启动报 `YAMLException: end of the stream or a document separator is expected`（本机实验实际撞到）。
标准路径的文档必须写清：**替换 `[]`**，或先删掉它；已有 rows 的 profile 才可直接追加。

## 六、证据与边界

- 文档事实：deck-studio 的 README「5 分钟安装」、它的 docs/install.md §1/§2、`plugin/deck-studio/cordis.example.yml`、
  `plugin/deck-studio/lib/config.js`、`client.js`、`index.js`（对照仓，不在本仓）。
- 实验事实：临时 home 的 profile 创建/插件安装/启动/workbench 首屏；截图见本题目录。
- 未验证：真图出图、完整 deck 生产流程、DSH 版本矩阵、Windows/Desktop；这些不是本次启动比较的判据。
- 不复制 deck-studio 的代码；不把它作为依赖引入（根 `AGENTS.md` 硬规则 7）。
