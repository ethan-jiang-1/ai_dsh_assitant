# 推敲：首开 UX——CEO 打开的第一屏在用三种不属于它的语言说话

> 立卡：2026-10-01 ｜ 状态：推敲中｜毕业门判断 = 该做（用户 2026-10-01 拍板「UX 上好好想一想 变成 ongoing goal」，本卡=该 goal 的显式化）｜下一步 = 按「未决」清单逐项切片修复，每片带前后截图证据

## 背景 / 触发

用户 2026-10-01 原话：「DSH 插件一起来之后，你说我怎么操作嘛？看着到处都是困惑。本来想让你帮
我解决问题，结果你给我抛过来这么多问题，UX 上好好想一想 变成 ongoing goal」。
同日以 `pnpm shots`（1600×1000，DOM 证据）实测首屏，困惑点全部落实为可见文本。

## 已知与未决（诊断，全部带 DOM 证据）

**已修（2026-10-01，试用 home 前后对照）**：

- ✅ **侧栏机房日志**：连开发试车场时侧栏有 17 条 agent 自我养护会话（「运行 curate 并报告家现状」
  等）；换干净试用 home（`dev/trial-home`，expert-setup 装配管理岗身份 + 3 页知识种子）后侧栏为
  「No sessions yet」。
- ✅ **工作区之问**：干净 home 首开报 `Unable to create default workspace`，CEO 被要求「选一个文件夹」
  ——first-mile [P1-C 判定记录 3](../../notes/implemented/2026-09-26-first-mile-landing.md) 的触发条件
  （「真实安装出现选择工作区阻塞」）**于本日在干净 home 上稳定复现成立**。根因实测：macOS 上默认
  工作区解析到 `~/Documents`，进程无写权（`mkdir` → `Operation not permitted`）。修法 = P1-C 既定：
  profile patch 给 `workspace-controller` 行 config 指可写 `documentsDirectory`
  （试用 home 已落，重启后首开 chip 变「Default workspace」、不再问目录）。
  **产品级修复**（发行组合是否预置该行）另裁决，见下。

**未决（按对 CEO 的刺眼程度排序，逐项切片）**：

1. **hero「Into the Unknown / Preview」与输入框提示「Describe what you want to build, / commands,
   @ files or sessions」全英文**——vendor locale 拥有。first-mile 曾判「不碰 vendor 即不可改」，
   但**locale 字典层是否存在 home/profile 覆盖缝**（非 vendor 源码）待查证（探针：读 vendor
   `client-ui-locale` 的字典解析与覆盖优先级）。
2. **状态条三件套「Workspace Write / DeepSeek-V41-Flash / High」直出工程黑话**——vendor UI；
   有无配置/槽位能简化或中文化待查。
3. **引导条「右侧栏『+』随时开三室」**——**我方皮肤**（`src/client`），「三室」是治理概念泄漏，
   可直接改用户语言（如「点右上角 + 能看它替你记的东西」），无需探针。
4. **内测声明弹窗（英文）**——**用户已拍板保留**（first-mile 判定记录 2：DSH 合规告知不是插件
   该藏的，归发行议题），不动。
5. **产品级「工作区之问」**：试用 home 的 patch 只治本机；发行组合要不要预置
   `documentsDirectory`（或产品形态上助手的工作区=其 dataDir 的替身）属发行/O5 面，随发行准入
   立项，不在本卡顺手做。

## 候选与取舍

- 修「三室」措辞：纯我方皮肤改动（build + preflight + 截图前后对照即可），低风险先做。
- 英文 hero/placeholder：先探针（locale 覆盖缝是否存在），**不预设结论**；缝不存在则登记为
  上游 issue 候选 + 接受现状，不硬闯 vendor 源码（硬规则）。
- 状态条黑话：同上先探针（配置面/槽位面），有缝才动。

## 毕业门

- **该不该**：已过（用户点名 ongoing goal）。
- **何时/次序**：按刺眼程度 + 探针结论排；每片一个垂直切片（改动 + build + preflight +
  前后截图 + note），不顺手夹带。
- **放弃**：vendor 源码永不改（硬规则 1）；locale 无覆盖缝时 hero/placeholder 接受现状并登记
  上游候选，不造 fork。
- **完成判据**（goal 的完成口径）：用户本人判定「打开不困惑、知道怎么用它」。
