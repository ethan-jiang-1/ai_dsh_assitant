# 知识房间 curate 检查（阶段 2 切片 2c）

日期：2026-09-24 · 状态：**implemented**
依据：三线合流提案阶段 2；R3 §7.2-4 + D7 已定参数（断链三档）。

## 决定

1. **独立纯函数 `src/knowledge/health.ts`**（`curateKnowledge`）：home/health 不吞知识图逻辑
   ——同判据（纯函数、只报不改）、不同域（图 vs 文件）；服务在 `curate()` 里合并
   （与写后审计同一合并点，`compareFindings` 统一排序）。
2. **断链三档（D7=A，OKF 语义）**：目标不存在=**info**（`page-link-unwritten`——"未写成的
   知识"不算病）；指向 deprecated 页=**warn**（`page-link-deprecated`——过期知识被当现行
   引用）；title 多命中歧义=**error**（`page-link-ambiguous`——检索静默失效）；烂文件=
   **error**（`page-unreadable`——页静默离开房间与图）。
3. **severity 联合扩三档**（error/warn/info）：原模型只有 warn/info——D7 的 error 档逼出
   这个升级（"检索静默失效"比"正在丢信号"更重）。排序器 `compareFindings` 改查表
   （error→warn→info），curateHome 内联排序改用之。
4. **孤页**（info）：stable 页无入链无出链（draft 不是孤页候选——它还没进图）。
5. **stale_after 到期**（info）+ **draft 老化**（info，锚 `generated.at`，阈值复用
   `staleResearchDays`——与 research 房间同判据）。
6. **无源 stable**（warn，`page-unproven`）："无 sources 不进 stable"的机器面。
7. **counts 加 `knowledgePages`**：headline 行可见房间规模。
8. index.md 漂移 finding **不存在**：index 不落盘（2b 决定，现场合成）——无物可漂移。

## 输掉的方案

| 输掉的 | 为什么输 |
|---|---|
| 断链全部 warn | D7 已否：淹没"未写成"的成长信号 |
| 知识检查并入 home/health.ts | 纯函数域分离——home 检查文件、knowledge 检查图；合并点在服务层 |
| 烂文件复用 unreadable-file（warn） | D7 把"frontmatter 烂"定为 error——知识页静默离开图比记忆文件更隐蔽 |

## 证据

`tests/host/knowledge-curation.spec.ts`（4 测试：三档分档与 refs / 孤页+stale+draft 老化+无源
齐发且 draft 不算孤页 / 烂文件 error / 服务级读房间合并进简报与 counts）。
**122/122 全绿**；typecheck/build/verify 16/16。
