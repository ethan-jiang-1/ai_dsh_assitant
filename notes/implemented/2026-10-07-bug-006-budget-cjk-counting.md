# BUG-006 修复：字节与预算的三处失真——CJK 快照截断、digest 遗漏少报、ingest 截断后全文算段

日期：2026-10-07 · 状态：**implemented**

> 承接 [BUG-006 卡](../../_backlog/_done/_fixed_bugs/BUG-006-budget-cjk-counting.md)；证据底稿 =
> [语义扫描报告](../../_backlog/reference/tech-exploration/261007-semantic-sweep-src.md) F5/F7/F12。
> 三处同根：预算/计数的正确性从未对着退化形态测过——红 spec 全部先造退化用例再修。

## 决定

1. **F5（`d1707f2`）rootFileSnapshot 字节精确截断**：`slice(0, cap)` 按 UTF-16 码元切——3000 汉字
   SOUL.md（9000B）对 4096 cap **全文返回**外加谎报「truncated 4904 bytes」（中文 owner 手编 persona 的
   byte-cap 契约静默失效，最多 3× 超预算骑每请求；emoji 还劈代理对）。改 `Buffer.subarray(0, cap)`
   字节切（ingest.ts 既有同款范式；切点落字符中至多损一个替换符）。红：新增 CJK 超限用例先败。
2. **F7 digest 遗漏标记重算**：marker 尺寸按 reserved pass 计数、pop 循环再删行不重算——探针实锤
   （spec fixture、预算 660/650/530/410/290-250）：marker 报 5 实际缺 6、`memoryIds` 含正文里没有的 id
   （自述「never lies by omission」轻微违反）。修法：pop 循环按行形态分类计数（知识行=尾部节在时弹出的
   `- ` 行、记忆行=`- [` 形态），pop 后重算 omitted 计数与 marker；循环的 marker 预算按**总量保守 sizing**
   （重算只会把计数推向总量，最坏情况预算保证收敛）；`memoryIds` 剪掉被弹出节的尾巴。红：14 个预算
   扫描的不变量断言（marker 数 = 实际缺数、memoryIds ⊆ 正文）先败后绿。
3. **F12 ingest 截断后按携带文本分段**：body 按字节截断但 `segmentDocument(document.text)` 用全文——
   description 挖到页面上不存在的散文。改对截断后（未加标记的）文本分段。红：构造「截断点后唯一的
   散文行」用例，旧实现 description 挖到 `PROSE-PAST-CUT`。

**交付收口**——外部结果：触发 = 巡检立卡；用户看到 = 中文 SOUL/手册的 prompt 预算契约真实生效、digest
的遗漏申报不再少报、导入页的描述不引用页面上不存在的内容；完成条件 = 三红三绿。**签收** = 新 spec
先红后绿各三件 + 全量 test 50spec **404**tests + typecheck 0 + verify 35 绿。**未跑项**：无。

## 输掉的方案

1. **rootFileSnapshot 按码点边界回退切**（避免替换符）——输给仓内既有范式（ingest 的 subarray）与
   一字符代价的权衡：为至多一个替换符引入边界回退逻辑不值，且与 ingest 形态一致更好维护。
2. **F7 marker 保守化（不报数字只报「有遗漏」）**——输给「digest 是 home 的地图」自述：少报数字仍是
   少报；重算才兑现 never-lies-by-omission。
3. **F7 重算后若不契合再 pop（定点迭代）**——输给保守 sizing：总量 sizing 一次到位、无需迭代收敛判断。

## 范围与后果

现在为真：三个字节/计数面（rootFileSnapshot、digest marker 阶段、ingest 分段）都对退化形态有钉死的
spec；digest marker 阶段的 `memoryIds/omittedMemories/omittedPages` 是 pop 后重算值。探针脚本（找触发
预算）的教训入档：**测试 fixture 与探针的 blurb 一字之差就能把触发预算挪走 10-20 字节**——造红先跑
探针、用 fixture 真值，不凭上一轮的参数。
