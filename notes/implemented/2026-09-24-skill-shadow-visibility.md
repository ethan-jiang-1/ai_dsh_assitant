# 遮蔽可见性（治理环切片 1b）

日期：2026-09-24 · 状态：**implemented**
依据：三线合流提案 `notes/implemented/2026-09-24-tri-line-synthesis.md` 阶段 1 切片 1b
（D3 已定参数：curate finding + brief 节，零新工具面）；R2 §9.3-2 与 §5.4——
"遮蔽可见性是全生态无人做的空白（普查 481 个技能/成长类条目逐一过目），
最低成本版本是 curate finding + brief 一节"。原始观察在战役 note 开跑补记：
save_skill 返回成功但被遮蔽技能静默不生效，落败方仅 logger warn。

## 问题

学到技能与策展技能同名时，DSH 注册表按 rank/layer/注册序裁决名字归属（实测：rank 并列
时注册序决定，策展 provider 先注册所以策展赢——`notes/implemented/2026-09-23-repo-structure.md`
验证项 8）。落败的学到技能：文件在家、`save_skill` 声称成功、但**永远不会出现在目录里**
——模型不可见，等于静默丢失。唯一痕迹是 provider 的 logger warn（人不看日志就不知道）。

## 决定

1. **问注册表，不复演规则**：遮蔽检测不自己实现 rank/layer/注册序（那是上游语义，抄了
   会漂移），而是在**agent 面工具上下文**里调 `ctx.skills.snapshot({cwd, scope: agent})`
   拿"每个名字归哪个 provider"，再与家 skills/ 房间扫描 join：学到名字的 winner 不是
   `assistant-learned` → 遮蔽。注册表只能从 agent 的层链里解析（省略 scope 只读全局层，
   学到/策展 provider 都在 preset 层），所以探针必须住在工具里，不进服务。
2. **curate finding（`skill-shadowed`，warn 级）**：家此刻就在丢信号（save_skill 说成功、
   实物在、永不加载）。消息点名赢家 provider 与出路（改名重写并退役被遮蔽 bundle，或让
   策展让位）。探针结果经 `service.curate(shadowedBy)` 传入纯函数；无注册表的调用方
   （测试、host 面维护）省略参数 → 无遮蔽 finding，不猜。
3. **brief 节**：`assistant_reflect brief` 增加 `shadowed_skills`——复盘前模型先知道
   "这些名字永远不会生效，改名再存"。这是入口侧的预防面（出口侧是 curate）。
4. **不完整读不判案**：`snapshot.complete === false`（注册表并发修订的竞态）→ 本次不报
   遮蔽，下次 curate 再试——竞态不是判决。
5. **目录缺席不是遮蔽**：名字不在注册表里（烂 bundle / 被禁用）走既有 scan finding 类
   （`skill-name-mismatch` 等），遮蔽检查只管"同名被别人赢走"这一种静默。

## DSH 接缝（亲验）

- `ctx.skills.snapshot(options: SkillViewOptions): Promise<SkillCatalogSnapshot>`——
  `SkillSummary.provider`（"Provider that owns this skill body"）、`complete`
  （"Incomplete observations are never cached… retry on next request boundary"）：
  `vendor/dsh/packages/skill/skill/src/index.ts`（list/snapshot/get 469-530、
  SkillSummary 57-73、Context augmentation 285-289）。
- `SkillViewOptions`：`scope` 选层链、`cwd` 选项目层、`signal` 取消——tool-skill 的
  同款调用形状（`scope: agent`、`cwd: agent.session.header.cwd`）。
- `ToolRunContext extends ToolExecution`：`exec.agent` + `exec.signal` 都在
  （`vendor/dsh/packages/core/tools/src/index.ts:397`）——curate/brief 的 execute 里
  可直接取。
- `@deepseek-ai/dsh-skill` 已在 tsconfig.base.json paths 与依赖里——Context augmentation
  经 `import type {} from '@deepseek-ai/dsh-skill'` 引入（同 index.ts 对
  dsh-host-webserver 的既有惯例），零门面变更。

## 输掉的方案

| 输掉的 | 为什么输 |
|---|---|
| 自己复演 rank/layer/注册序 | 上游语义，抄了必漂移；问注册表零漂移 |
| `save_skill` 返回即警告 | D3 已否：改工具返回形状（实时性好但侵入返回契约） |
| 仅日志行 | D3 已否：模型不可见等于没修（战役观察证明 logger warn 没人看） |
| host 面服务里探 | 注册表按 scope 分层，host 上下文省略 scope 只读全局层——看不到 preset 层的 provider |
| 每个名字单独 `get()` | 每次 get 都加载技能正文（重）；snapshot 一次拿全部元数据 |

## 证据

- 纯核 + 服务级：`tests/host/skill-shadow.spec.ts`（4 测试：join 只报他人赢走的名字 /
  不完整读不判案 / 目录缺席归 scan finding / 服务无探针不报、有探针报 warn）；
  `tests/domain/health.spec.ts` 扩 2 测试（skill-shadowed finding 的级别/refs/消息；
  被遮蔽名字从用量行排除）。**89/89 全绿**（`pnpm test`）。
- 机械门禁：`pnpm typecheck` && `pnpm build` && `pnpm verify` 16/16。
- **live 实证**（preset-runner one-shot，2026-09-24，会话
  `session-7dec0413-dd71-44a2-8dbc-8fbe58bcec37`，assistant preset，finding 文本 3 处在日志）：
  完整复现战役观察的原始场景——save_skill 写入与策展同名的 `home-curation`（返回
  "loadable now"，事后证明该消息在遮蔽场景下是误导）；curate **逐字**报出
  `warn: learned skill "home-curation" is shadowed by provider "filesystem", which owns that
  name in the catalog — the learned bundle will never load…`（赢家 provider 实名
  `filesystem`——策展 skill-filesystem 实例的默认 provider 名，本次一并确认）；
  brief 逐字报出 Shadowed skills 节；fs 清理目录后复跑 curate →
  `Home is clean: no findings.`（红-绿在案：finding 随 bundle 删除而消失——检测=房间扫描
  ×注册表 join，删文件必要且充分）。
- **live 抓到并修掉一个数据归因瑕疵**：会话里 persona 驱动加载了（策展的）home-curation，
  用量账本按名字记了 `home-curation×1`，join 把**赢家的加载归到了输家 bundle 头上**
  （live 助手主动指出）。修复：被遮蔽名字从 curate/brief 的用量行**排除**（计数是名下真值，
  遮蔽时不归学到 bundle；docs/home.md 同步）。修复是纯 join 变更，由 health.spec 新测试
  覆盖；live 探针管道未变（第一轮已实证），不再重复付费跑一轮，下次 live 顺带复验。
