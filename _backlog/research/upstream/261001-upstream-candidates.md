# 上游（vendor 面）候选台账——喂 261001-first-open-ux

> 立档：2026-10-05（首开 UX 第 18 轮）｜服务对象：[261001-first-open-ux](../../_archive/settled_issues/261001-first-open-ux.md)
> ｜性质：调研材料（随卡毕业迁 `_archive/research/`）。
> 为什么立档：vendor 面候选散在卡面第 1/3/8/12/13/14/16 轮各处，散读变不成一叠可递交的 issue；
> 本档一处收敛，每条带首报轮次与 vendor 代码锚点。**纪律不变：vendor 源码永不改（硬规则 1），
> 本档只备料——递不递、何时递、怎么措辞，由用户拍板。**

## 稳定候选（多轮读数反复命中，或带代码锚可直接立 issue）

### D7（2026-10-06 新增，桌面主对象化切片产出，**已递交 [discussions/8961](https://github.com/deepseek-ai/deepseek-harness/discussions/8961)**）
- **默认视图/落地视图不可插件化**：`ui-conversation/view-selection.ts:5-7` 硬编码 `DEFAULT_VIEW_ID='chat'`，
  resolveActiveView 只回退 chat；空白相位（未说话）视图区渲染 null（DefaultConversationViews.tsx:49），
  EmptyHero+composer vendor 自持。插件可贡献 conversation.view 标签但不能设默认视图或占空白相位主区。
- **诉求**：默认视图可配置（或插件可贡献 landing view / 空白相位主区座位）——一把手定位的产品
  （打开=桌面，会话是动作）需要它。锚点以本仓 pin 为准；递交与否用户拍板。

> 递交草案：[261001-upstream-issue-drafts.md](261001-upstream-issue-drafts.md)（D1-D6 覆盖下行 #1/#2/#3+#9/#5/#6/#7；2026-10-05 文本放行，2026-10-06 已全部递交：D1→[discussions/8939](https://github.com/deepseek-ai/deepseek-harness/discussions/8939)、D2→[8940](https://github.com/deepseek-ai/deepseek-harness/discussions/8940)、D3→[8941](https://github.com/deepseek-ai/deepseek-harness/discussions/8941)、D4→[8942](https://github.com/deepseek-ai/deepseek-harness/discussions/8942)、D5→[8943](https://github.com/deepseek-ai/deepseek-harness/discussions/8943)、D6→[8944](https://github.com/deepseek-ai/deepseek-harness/discussions/8944)；后续状态以上游回复为准）。

| # | 候选 | 首报 | vendor 锚点 | 说明 / 建议动作 |
|---|---|---|---|---|
| 1 | hero 占位词「描述你想要**构建**的内容, / 调用指令, @ 文件或对话」——开发视角，`/`@` 咒语同串 | R1（R16 再命中） | `packages/client/ui-conversation/src/client/locales.ts:23` | 中文产品首屏第一句是开发者口吻；`/`@` 语法对不知情的 CEO 是咒语。同串一并改 |
| 2 | hero 主标题「探索未至之境」文艺过头 | R16 | `ui-conversation/src/client/locales.ts:77` | 我方欢迎语被判全站标杆（R13），vendor hero 与之落差明显 |
| 3 | 仪表读数上脸：tok/s、缓存命中、上下文 % | R12（13/14/16 反复） | `packages/client/ui-chat/src/client/locale.ts`（缓存读数串在案） | 建议归入开发者仪表开关或收进详情层 |
| 4 | 消息操作栏图标无文字 + 👎 提交无确认 | R16 | `ui-chat` 消息操作栏 | 👎 管线本身可靠（R5 端到端在案），缺的是「点了生效没有」的确认 |
| 5 | 工具行渲染机器绝对路径（write/edit 变更清单） | R14 | `ui-chat` 变更清单渲染 | 违反 vendor 自家纪律 `dshHomeDisplay`（永不返回机器绝对路径）——引其内部纪律即可立 |
| 6 | 文件预览打开原始 md，YAML frontmatter 上脸 | R14 | 侧边栏文件预览（`ui-sidebar-documentpreview`） | 我方链已剥 frontmatter（服务端 body + 面板 excerpt），仅 vendor 预览面露 |
| 7 | 「轨迹」黑话（面板名/工具栏词汇） | R13 | `packages/client/ui-trajectory/src/client/locales.ts` | 与 R15「线索→在跟的事」同类的机制词问题，vendor 面 |
| 8 | 重进不回原会话（刷新落欢迎页） | R13 | 会话恢复面（具体缝未定位） | R16 二读未再 flag，降级为观察项 |
| 9 | 思考预览英文 | R13 | 思考行渲染（`ui-chat`） | 模型思考流为英文，渲染面未标注语言差异 |

## 条件候选（触发明确，条件前不动）

| # | 候选 | 触发条件 | 依据 |
|---|---|---|---|
| 10 | transcriptView src/lib 同 tag 漂移 | 上游发布物确认是否带 `?? defaultMode` 兜底（我方预置行的退役条件） | R3 定罪；升 pin 本地重建后本地崩溃已关（2026-10-03 复验在卡） |
| 11 | 升级档位缺「只读域外」中间档 | 正常部署不受影响；沙箱后端不可用环境一回合 14 次 danger-full-access 升级 | R12 升级风暴观察（喂上游候选/摩擦报告） |
| 12 | 直调缝：bundle 插件 client 半面受控 remote 贡献聚合 / zod codec 可达性 | 本人拍板重提批准流直调时 | [261004-approve-direct-call](../../_archive/settled_issues/261004-approve-direct-call.md) §切片 1 三层实锤 |

## 已关闭不再追（第 18 轮定罪，处置详情在卡）

- **点标题预览不稳定**（R13 摩擦 2 残余）：我方面板标题从无可点击 affordance（8fbf7b8 与现状代码同证）；vendor 文件树/文档预览为唯一候选路径；修后二读未再现。
- **标题中英混排**（R13 摩擦 7 残余）：vendor 标题提示词本就语言感知（`session-title-llm/src/index.ts:199`「Use the language of the messages.」）；观测背景与测试会话残留一致（残留已清、现存会话标题全中文、二读未再现）。真用再现则升入稳定候选表。
