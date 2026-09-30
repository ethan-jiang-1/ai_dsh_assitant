# 推敲：首开 UX——CEO 打开的第一屏在用三种不属于它的语言说话

> 立卡：2026-10-01 ｜ 状态：推敲中｜毕业门判断 = 该做（用户 2026-10-01 拍板「UX 上好好想一想 变成 ongoing goal」，本卡=该 goal 的显式化）｜下一步 = 等本人打开试用 home 的第一读数（首轮三项已修完：全中文首开 + 工作区之问 + 三室黑话；剩余项全在用户拍板面或上游面）

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

**未决清单处置（2026-10-01 goal 第 1 轮，三项全部带真机前后对照）**：

1. ~~英文 hero「Into the Unknown」与输入框提示~~ **已修（locale 探针结论 + 修复）**：
   - 探针结论（vendor `client/locale` 源码引证）：① **同命名空间二次注册会抛错**
     （`register` 对重复 `ns+locale` 直接 throw）——用我方插件覆盖 vendor `conversation`
     字典的**路不存在**，记为负知识；② **zh 字典 vendor 全套自带**（hero=「探索未至之境」、
     `placeholder.hero`=「描述你想要构建的内容…」）——首屏英文不是缺翻译，是**语言选择**
     （无偏好时随浏览器协商，headless/英文浏览器落回 en）。
   - 修法＝正门：`locale` 行（`@deepseek-ai/dsh-client-locale`）的 `preference: zh` 写入
     home 层 patch（`dev/trial-home/cordis.patch.yml`，等同用户在 Settings→General 选中文的
     落点）。真机前后对照：hero/placeholder/状态条/内测声明全变中文（DOM 逐字在案）。
   - 残余：vendor zh 文案本身是开发视角（「描述你想要**构建**的内容」）——vendor 拥有，
     登记为**上游 issue 候选**，不硬闯。
2. ~~状态条三件套~~ **基本随 1 解决**：「Workspace Write」→「工作区内修改」；剩模型名
   「DeepSeek-V41-Flash / High」——产品名，接受。
3. ~~引导条「三室」黑话~~ **已修**：改为「它替你记下的东西，点右侧『+』随时能看」
   （`src/client` 皮肤 + `client-first-mile.spec.ts` 同 diff 改断言并加 `not.toContain('三室')`
   反夹具；43 client 测试绿；真机 DOM 复核逐字在场）。

**新增未决（第 1 轮发现）**：

- 侧栏品牌「DSH local assistant」仍是英文——**我方皮肤**（identity.md §二：零身份代价），
  但叫什么是产品命名/口味题（如「智能助手」），属用户拍板面，agent 不代拍。
- 发行组合要不要预置 `locale.preference`（中文市场产品默认中文）——随 item 5 的发行准入
  一起裁决。

仍然挂着的：

4. **内测声明弹窗**——**用户已拍板保留**（first-mile 判定记录 2：DSH 合规告知不是插件
   该藏的，归发行议题），不动（locale=zh 后它自动是中文，「继续」按钮同）。
5. **产品级「工作区之问」**：试用 home 的 patch 只治本机；发行组合要不要预置
   `documentsDirectory`（或产品形态上助手的工作区=其 dataDir 的替身）属发行/O5 面，随发行准入
   立项，不在本卡顺手做。

## 候选与取舍

- ~~修「三室」措辞~~ 已做（见上，皮肤改动 + 反夹具）。
- ~~英文 hero/placeholder~~ 已做（locale 正门：`preference: zh`；覆盖缝探针结论=不存在）。
- ~~状态条黑话~~ 随 locale 解决（残余=模型名，接受）。
- **vendor zh 文案改写（「构建」视角）**：字典覆盖缝不存在 + vendor 源码不可改 → 只剩
  **上游 issue** 一条路，登记候选，不在本仓动手。
- **侧栏品牌中文命名**：皮肤面零代价，但命名是口味题 → 用户拍板面，备好候选等裁决。

## 毕业门

- **该不该**：已过（用户点名 ongoing goal）。
- **何时/次序**：按刺眼程度 + 探针结论排；每片一个垂直切片（改动 + build + preflight +
  前后截图 + note），不顺手夹带。
- **放弃**：vendor 源码永不改（硬规则 1）；locale 无覆盖缝时 hero/placeholder 接受现状并登记
  上游候选，不造 fork。
- **完成判据**（goal 的完成口径）：用户本人判定「打开不困惑、知道怎么用它」。
