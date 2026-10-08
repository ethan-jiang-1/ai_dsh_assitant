# BUG-006：字节与预算的 CJK/计数缺陷——SOUL/手册快照码元截断 + digest 遗漏少报 + ingest 截断后全文算段（F5/F7/F12）

> 严重级别：P1（重要——F5 在中文用户面的每请求路径上：SOUL/AGENTS.md 是 owner 手编数据，byte-cap 契约对 CJK 失效最多 3× 超预算骑在 prompt 里）｜发现：2026-10-07（对抗性语义扫描，F5 已数值验证）｜状态：**fixed 2026-10-07**——F5 字节精确截断（`d1707f2`）+ F7 marker 重算与 memoryIds 剪枝 + F12 按携带文本分段，见 修复 note；三红三绿 + 全量 404 绿

## 症状

1. **F5（主）**：`src/host/curate-digest.ts:37-49` rootFileSnapshot 按 UTF-16 码元 `slice(0, cap)`——3000 汉字 SOUL.md（9000 字节）对 4096 cap 返回**全部 9000 字节**外加谎报的「truncated 4904 bytes」标记（实际一字未截）；emoji 面奇数切点劈开代理对。SOUL_BYTE_CAP=4096、MANUAL_BYTE_CAP=8192 同病。
2. **F7**：`src/domain/home/digest.ts:204-222` 遗漏标记按 reserved pass 计数、pop 循环再删行不重算——「+N omitted」可少报、`memoryIds` 可含未出现在文本的 id（「never lies by omission」自述轻微违反）。
3. **F12**：`src/domain/knowledge/ingest.ts:141-144` body 超 256KB 截断后 `segmentDocument` 仍用全文——concept pass 挖到页面上不存在的文本。

## 根因（假设）

仓里**存在字节精确的正确实现**（`ingest.ts:142` 截断、`digest.spec.ts:106` 的 CJK 字节测试）——恰证明团队知道这类坑，但 rootFileSnapshot 这条路径没被同标准覆盖：三处的共同盲区是「预算/计数的正确性从没被对着退化形态测过」（root-files.spec 无超限用例；digest.spec 不校验 marker 数字与实际一致；ingest spec 不对比 sections 与 body）。

## 复现

F5（node 数值验证已做过）：3000 汉字写入 SOUL.md → 观察 digest 组装的 persona 段字节 ≫ cap。F7/F12 见扫描报告。

## 修复关联

证据 = [语义扫描报告](../research/tech-exploration/261007-semantic-sweep-src.md) F5/F7/F12；修法方向：rootFileSnapshot 改字节精确截断（参照 ingest.ts:142 形态，截断标记按真实字节差）；F7 pop 后重算或 marker 保守化；F12 sections 从截断后文本算——三者同 diff 补退化形态 spec（超限 CJK / marker-预算互作用 / 截断后 sections）。
