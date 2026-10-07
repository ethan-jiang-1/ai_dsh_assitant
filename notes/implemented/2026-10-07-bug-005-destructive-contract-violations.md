# BUG-005 修复：两处破坏性契约违背——retireSkill 删附属文件 + 重导入抹审批

日期：2026-10-07 · 状态：**implemented**

> 承接 [BUG-005 卡](../../_backlog/_done/_fixed_bugs/BUG-005-destructive-contract-violations.md)；证据底稿 =
> [语义扫描报告](../../_backlog/_done/_reference/tech-exploration/261007-semantic-sweep-src.md) F4/F10。
> 两处同根：为某个消费者写的形状（单文件技能假设、import 的 draft 语义）泄漏进通用服务面，通用面按
> 泄漏假设做了破坏性动作；且**旧 spec 把缺陷钉成了预期**（retirement spec 断言源目录消失；import spec
> 从不在 stable 页上重导）——本轮同 diff 修测试的钉错。

## 决定

1. **F4 retireSkill 整目录归档**：bundle 形不再「只归档 SKILL.md + `rm -rf` 整目录」——改 `rename(bundleDir,
   archive/<name>)` 原子搬整个 bundle（references/ 等附属文件随之存活），落章戳写在归档内（失败也只是
   未落戳，bundle 仍可读）。「nothing is deleted — moving the bundle back restores it」的承诺对多文件
   bundle 第一次为真。红：新用例手造带 `references/cheatsheet.md` 的 bundle（writeSkill 只写 SKILL.md，
   多文件是 audit 自认的合法形状），先败（附属文件被删）后绿（归档内存活 + 源目录消失 + 章戳在场）。
2. **F10 重导入不抹审批**：writePage 在页已存在时**保留现有 status**（治理状态是人的行为——手翻或
   promote），全新页仍一律 draft；内容/来源/生成者照常刷新（重导入的本意）。红：新用例导入 → 手翻
   stable → 重导（先败：整文件被 `status: draft` 重写、审批被机械回滚；后绿：status 保持 stable、
   正文更新）。

**交付收口**——外部结果：触发 = 巡检立卡；用户看到 = 多文件技能退休后搬回即恢复（附属文件不再静默
丢失）、已批准的知识页不会被一次机械重导入打回草稿；完成条件 = 两红两绿 + 全量绿。**签收** = 两个新
spec 先红后绿 + 全量 test 50spec **406**tests + typecheck 0 + verify 35 绿。**未跑项**：无。

## 输掉的方案

1. **retireSkill 复制后删源（copy 而非 rename）**——输给原子性：copy 有「两份都在/都不在」之外的中间
   窗口，rename 一步到位且失败模式是未动（原地可读）。
2. **重导入给 import 专用动词/独立路径**——输给最小面：泄漏的只是 status 一个字段的语义；保留字段的
   一行修复即可，新动词是面扩张（import 的消费者只有一个）。
3. **重导入时警告而非保留**——输给「幂等重导入」是 ingest 的明文设计目标：第二次导入同一个文档应该
   无噪声地更新内容。

## 范围与后果

现在为真：bundle 退休 = 整目录原子搬迁；`writePage` 的 status 在页存在时保留现状。两个旧 spec 的钉错
预期已随 diff 修正方向（retirement 的源目录消失断言现在测的是搬迁后；import spec 增补 stable 用例）。
