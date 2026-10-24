日期：2026-10-20 · 状态：**implemented**

# OpenViking 记忆旋钮：为什么不是上游默认

## 问题（可观察行为）

OpenViking 的上游默认值适合它的 coding preset，不适合一个「一把手助手」：`commitTokenThreshold`
默认 20000 意味着短会话永远不进抽取；`profileTokenBudget` 默认 10000 会把桌面段落翻三倍；
`recallLimit` 10、`recallPreferAbstract` true 让召回块给目录摘要而不是叶子；`peerId` 跟着 git
origin 走，换工作目录/克隆就会分叉。更危险的是这些调参一度只活在本机 gitignored 的探针 patch 里：
从另一台机器无法复现，而 tracked 的安装器模板已经和 live 漂移。

## 决定

运行态采用下面这组值，落点是 tracked 的安装器模板与 OV 专用 patch 层；dev 组合只在 **OV 插件真在场**
时追加该 patch，fresh home 无插件时不出现 inactive entry。

| 旋钮 | 值 | 为什么 |
|---|---|---|
| `peerId` | `assistant` | 记忆跟助手走，不随工作目录分叉；旧 peer 仍在 `recallPeerScope: all` 下可召回 |
| `commitTokenThreshold` | 3000 | 短会话也必须进抽取；20000 会让个人助手永远「不记得刚才」 |
| `profileTokenBudget` | 3000 | 桌面段落是常驻成本，默认值会把桌面翻三倍 |
| `recallContextTimeoutMs` | 3000 | 强制 find 路径，叶子内容进召回块，而不是只给指针 |
| `recallPreferAbstract` | false | 降级路径要叶子内容，不要目录摘要 |
| `recallMaxContentChars` | 2000 | 单条内容上限，配合叶子召回 |
| `recallLimit` | 6 | 显式配额，默认 10 超出桌面预算 |
| `recallMaxTokens` | 2400 | server 侧组装预算 |
| `recallQueryExpansion` | off | 实测命中不变，省延迟 |
| `skillCatalog` | false | server 当前没有技能，避免广告加载不了的目录 |
| `skipSubagentSessions` | true | 子代理噪声不进记忆；团队记忆另议 |
| `captureToolResults` | false | 云端例外下先收口，见云端出口决定 |

**调参的家是 tracked 文件**（安装器模板 + OV patch 层），不是任何本机 live profile；读 live 只作
观察，不作模板。

## 输掉的方案

- **照抄上游默认（20000 / 10000 / abstract / limit 10）**：短会话不抽取、桌面膨胀、召回只给目录；
  不选。
- **把 live dev-ov 当模板**：gitignored、不可从他机复现，且已与 installer 漂移；不选。
- **把 OV 行无条件写进 tracked `profile-patch.yml`**：fresh home 无插件时每次启动都多一条
  inactive 警告，可选层变常态噪声；不选。
- **升级时顺手迁移/合并旧 peer 记忆**：会丢掉 provenance（哪些记忆来自哪个 peer 的哪次 commit）；
  旧记忆靠 peer scope 继续可召回，迁移需要单独评审。
- **打开 query expansion**：实测命中不变，只增加延迟与不可控的调用。
