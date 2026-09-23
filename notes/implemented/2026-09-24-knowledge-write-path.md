# 2026-09-24 · 知识写入路径与桥（阶段 2 切片 2e）（已实现）

依据：三线合流提案阶段 2；R3 §7.2-5 + D8 已定参数（两条显式操作 promote/pin，不自动同步
不双写）。

## 决定

1. **`assistant_reflect action=save_page`（staged draft 写入）**：写页**必带 sources**
   （memory:<id> / research:<id> / URL / repo 路径——无源的蒸馏连草稿都不该是），
   自动盖章 `status: draft` + `generated: {by: 'process:assistant-reflect', at}`；
   id 复用 newThreadId 的日期-slug-后缀文法。**draft→stable 的翻转是一次手改文件**——
   那次编辑就是评审（dsh-learn-wiki "staged 永不参与召回" + Gemini inbox 同构；没有
   agent 自己批准自己的动作）。凭据审计复用于页（写入面即攻击面，与技能同判）。
2. **research promote 目标类型扩展**：`promotedTo` 现在可以是记忆 id、学到技能名、
   **知识页 id**（目标必须已存在——先 save_page（sources 引用线索）再 promote，
   与既有"目的地先在"合同一致）。
3. **memory↔knowledge 桥 = 两条 provenance 惯例（D8 的落法，登记解释）**：
   - **pin**：`assistant_memory save` 带 `source: knowledge:<page-id>`——现有动词，
     指针即链接；
   - **promote**：`save_page` 的 sources 引用 `memory:<id>`。
   D8 原文说"两条显式操作"——落成惯例而非新动词的理由：两个房间**已有**各自的写动词，
     平行加动词=重复 save 面；桥的本质要求（不自动同步、不双写、幂等键含源 id）由
     provenance 指针满足——重复 pin 会撞近似重复检查（既有护栏）。零新动词面。
4. **reflect 输出面**：`page_id`/`page_path` 字段 + render 明说 staged 语义
   （"stays out of search and the digest until status is flipped to stable by hand —
   that edit is the review"）。

## 输掉的方案

| 输掉的 | 为什么输 |
|---|---|
| `review_page` 动作（agent 翻 stable） | agent 提案 agent 批准 = 没有门；手改文件就是人审的物理形态 |
| 桥做成独立动词（knowledge_promote/knowledge_pin 工具动作） | 两个房间已有写动词，平行动词=重复面；provenance 指针已满足桥的全部要求（见决定 3） |
| draft 允许无 sources | 无源蒸馏是噪音；连暂存都不该收 |
| 自动 memory→knowledge 双写 | D8 明文否决：不自动同步不双写 |

## 证据

`tests/knowledge-write.spec.ts`（5 测试：draft 盖章+sources 保留+搜索与 digest 不可见
+手改翻转后进搜索与 digest 树（红绿）/ 三缺一拒绝（body/type/sources）/ 凭据审计命中 /
promote 接受页目标且拒绝未知目标 / pin 惯例 save+recall 闭环）。
**131/131 全绿**；typecheck/build/verify 16/16。工具面 live 并入阶段 2 收尾会话。
