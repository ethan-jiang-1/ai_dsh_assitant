# _backlog

本地的议题板。GitHub 上是 Open 一张 Issue、讨论、Close；这里用文件夹做同一件事。还在想的停在外面，关掉的进 [`_archive/`](_archive/README.md)。决定要留下来、还要人点头的，跟进到 [`notes/`](../notes/README.md) 的 `proposed/`。没有点名，不要从这里开工。

## 三十秒读完

一条事情这样走：

1. **还没定**，在 [`issues/`](issues/README.md) 开一张。这就是 Open issue。文件名 `YYMMDD-<slug>.md`。
2. **是缺陷，而且这次不修**，在 [`bugs/`](bugs/README.md) 开一张。这就是 Open bug。文件名 `BUG-<NNN>-<slug>.md`。当场能修的不建卡。
3. **证据太长**，写在 [`research/`](research/README.md)，卡上只留链接。调研喂 issue，也喂 bug。
4. **四问有了答案**，关掉这张卡：`git mv` 进 `_archive/`，再把决定跟进到 note。做法在 [`issue-to-note`](methods/issue-to-note.md)。
5. **被人叫停，答案还没有**，也搬进 `_archive/` 里标明叫停的那一格。这不是有了结论。

[`methods/`](methods/README.md) 是问清需求和验收的习惯，一直放在原地。[`triggers.md`](triggers.md) 只记以后干活会自己撞上的条件。前面带 `_` 的目录默认跳过。

## 目录对照

| 路径 | 本地放什么 | 按 GitHub 的习惯读 |
|---|---|---|
| [`issues/`](issues/README.md) | 还在推敲的事 | Open issue。`Feature` / `Task` / `未定` 写在正文状态行，像标签。旧卡不回填。不另开 features、tasks 两个目录 |
| [`bugs/`](bugs/README.md) | 这次不修的缺陷 | Open bug。单独一个目录，是为了提交时只改这里。下一个号写在它的 README |
| [`research/`](research/README.md) | 喂这些卡的调研 | Issue 正文装不下的证据。结论留在卡上 |
| [`methods/`](methods/README.md) | 需求怎么问清、做完怎么算数 | 仓库里的做事习惯 |
| [`triggers.md`](triggers.md) | 以后会自己撞上的条件 | 关掉「以后再说」时留下的观察。延后不自动加一行 |
| [`_archive/`](_archive/README.md) | 已经离开活跃区 | Closed。去向写在子目录名上 |

新文件的 frontmatter 写在各自目录的 README 里，标题就是 `frontmatter`。推敲和缺陷第一项是 `status`，调研第一项是 `topic`。

## 关掉一张推敲，跟进到 note

走完下面四问，卡进 [`_archive/settled_issues/`](_archive/settled_issues/README.md)。文件名不变，正文不改，`status` 改成 `已结`，状态行补去向。

| 四问 | 关掉之后跟到哪 |
|---|---|
| 该做 | [`notes/proposed/`](../notes/README.md)。写成问题、方案、验收。点头才做 |
| 该做但不现在 | 触发条件写进拥有它的 note。条件到了再新开一张，链回这张旧卡 |
| 不做 | 理由进那篇 note 的「输掉的方案」。还要单独挡住再犯，写 [`notes/rejected/`](../notes/README.md) |
| 消化 | 结论已经在某篇 note 或合同里。卡上留下指向 |

被人叫停、四问还没有答案：进 [`_archive/suspended_issues/`](_archive/suspended_issues/README.md)，`status` 改成 `叫停`。回到 `issues/` 要一次新的、说得清的决定。

## 关掉一张缺陷

| 情况 | 去向 | `status` |
|---|---|---|
| 修好了 | [`_archive/fixed_bugs/`](_archive/fixed_bugs/README.md) | `已修` |
| 查明了，还没修 | [`_archive/suspended_bugs/`](_archive/suspended_bugs/README.md) | `待修` |

原料在最后一张活卡离开时，跟着搬到 [`_archive/research/`](_archive/research/README.md)。`topic` 和 `intent` 不动。

## 关掉之后长这样

```text
_archive/
├── settled_issues/      四问有了结论          status: 已结
├── suspended_issues/    被人叫停，还没有结论   status: 叫停
├── fixed_bugs/          修好了                status: 已修
├── suspended_bugs/      查明了，还没修         status: 待修
└── research/            原料随最后一张活卡离开  topic / intent 不动
```

## 一直成立

- 这里不排期。做什么由用户本轮请求决定。位置就是开着还是关掉。
- 卡记思考，note 记决定。下一个问题回这里新开一张。
- 状态行带 🔒 的卡，只有用户能判触发。规则在 [`issues/README.md`](issues/README.md)。
- 各 README 的名单和目录一致。`pnpm verify` 查这些目录在不在、frontmatter、每张卡有没有被名单点到。毕业门已经写「已过」还留在 `issues/` 的，也会被点名。
