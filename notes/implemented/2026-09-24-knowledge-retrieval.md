# 知识检索面（阶段 2 切片 2d）

日期：2026-09-24 · 状态：**implemented**
依据：三线合流提案阶段 2；R3 §7.2-3 + D6 已定参数（最小只读工具 search/get 附 backlinks）。

## 决定

1. **`assistant_knowledge` 工具（只读，D6=A）**：两动作——`search`（关键词/标签排序，
   返回 why 命中理由）与 `get`（按 id 读页 + **反链现算**）。**deprecated 页可搜但带状态**
   （过期知识是相关上下文，模型自己判断）；**draft 可按 id 读但永不进搜索**（staged 不参
   与召回，dsh-learn-wiki 铁律）。工具明说自己是只读面，写入走 reflect/promote。
2. **纯核排序 `knowledge/search.ts`**：命中面（title > description > body > tag）计数
   降序、id 稳定排序；无 embedding（延后判据不变：真实漏召回）。
3. **digest 目录树（桌面 signposts）**：`## Knowledge (N pages)` 一行一页
   （`title — description (id)`，id 便于 get）；**只列 stable**（deprecated 可搜不占桌面、
   draft 不可见）；同一字节预算自限（页多了树被截，预算压力 finding 接管）。
   Letta MemFS "file tree as signposts" 形态。
4. **服务方法**：`searchKnowledge` / `readKnowledgePage`（反链 `backlinksOf` 全房间现算，
   无索引服务）。blurb 升四房间（"search them with assistant_knowledge"）。
5. **身份面**：`assistant-knowledge-tool` 行 id 与 `assistant_knowledge` wire 名进
   docs/identity.md（identity 门禁抓到后按规登记——门禁按设计工作）；package.json exports
   与 preset 行同步。

## 输掉的方案

| 输掉的 | 为什么输 |
|---|---|
| 写面进工具（D6 落选 C） | 与 staged draft 矛盾——写走 reflect/promote，工具只读 |
| draft 进搜索 | staged 不参与召回（污染召回面）；按 id 可读已够复盘自审 |
| deprecated 也进 digest 树 | 桌面是"此刻最该在眼前的"——过期知识占 signpost 是信噪税 |
| 反链缓存 | 量级几十页，现算零漂移；缓存是派生物要养护 |

## 证据

`tests/knowledge-retrieval.spec.ts`（5 测试：排序+deprecated 带状态+why 齐备 /
draft 出搜索、必选 tag 生效、空查询空结果 / 服务级搜索+反链+draft 按 id 可读+missing
undefined / digest 树 stable-only id 序、deprecated/draft 不上桌、预算内自限）。
**126/126 全绿**；typecheck/build/verify 16/16。工具面（thin adapter）live 验证并入
阶段 2 收尾会话（与 2e 同场）。
