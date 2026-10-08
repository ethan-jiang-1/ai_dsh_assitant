# BUG-005：破坏性操作违背自订契约——retireSkill 删附属文件 + 重导入抹审批（F4/F10）

> 严重级别：P1（重要——静默永久数据丢失 + 审批被机械动作无声回滚，均违背代码自订的显式契约）｜发现：2026-10-07（对抗性语义扫描）｜状态：**fixed 2026-10-07**——retireSkill 整目录原子归档（rename）+ writePage 存在页保留治理 status，见 修复 note；两红两绿 + 全量 406 绿，旧 spec 钉错预期同 diff 修正

## 症状

1. **F4**：`retireSkill` 对 bundle 形技能只归档 `SKILL.md`，随后 `rm(bundleDir, {recursive:true})` 永久删除 references/ 等附属文件（`src/host/skills-room.ts:236-248`）——而同仓 `audit.ts:102` 自认多文件 bundle 是合法状态、retireSkill 的 JSDoc 与 skill-retirement.spec 头注释都承诺「nothing is deleted — moving the bundle back restores it」。多文件技能一经退休，附属文件无声丢失，「搬回去即恢复」是假的。
2. **F10**：`writePage` 的 import 专用 `id` 参数 + 无条件写 `status:'draft'` 整文件替换（`src/host/knowledge-room.ts:29-39`）——幂等重导入（ingest 的明文设计目标）落在已批准页上会抹掉审批状态与手改 frontmatter。当前无产品级调用方（埋雷）。

## 根因（假设）

两处同根：**为某个消费者写的形状（import 的 id/draft 语义、单文件技能假设）泄漏进通用服务面**，通用面随后按泄漏假设做了破坏性动作。测试把两者都钉成了预期：skill-retirement.spec 用单文件技能且断言源目录消失；import spec 从不在 stable 页上重导。

## 复现

F4：手造带 `references/x.md` 的技能 → `assistant_reflect action=retire_skill` → references/ 永久丢失。F10：stable 页上重跑 `pnpm import-knowledge` 同源 → status 回 draft。

## 修复关联

证据 = [语义扫描报告](../research/tech-exploration/261007-semantic-sweep-src.md) F4/F10；修法方向：retire 改整目录搬迁（archive 收全 bundle）；writePage 的 import 路径显式化（不覆盖 status 或 import 专用动词）——同 diff 修测试的钉错预期（两处 spec 都把缺陷钉成了契约）。
