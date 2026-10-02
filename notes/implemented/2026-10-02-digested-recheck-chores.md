# 消化稿复查清账：digest 摆位、行号钉抽验、seam 措辞

日期：2026-10-02 · 状态：**implemented**

来源：对 `/Users/bowhead/deepseek-harness/_digested/`（基线 `639ed015` = 本仓 pin）的反省轮——
三路子代理消化（插件货架/编排阶梯/0.2.0 变更）+ 主线亲读，产出三件与"机制冻结"不冲突的修正。
方向拍板：用户 2026-10-02 选"先清账再真用"。

## 问题（反省轮点名的欠账）

1. **digest 段摆位是抄出来的，不是按纪律定的**：`DIGEST_SECTION_ORDER = 400` 坐在模式段（500–900）
   与全部工具段（1000–2900）**前面**，而 digest 文本随每次记忆写入变化——按 DSH 的 KV 前缀纪律
   （`_digested/tools-prompt-llm/01-section顺序与前缀.md`：易变内容刻意放 10000+ 之后，插前面会让
   本可共享的前缀提前分叉），一次 `save` 就把后面所有段的缓存作废。stock 先例佐证：persona 后缀
   （逐用户）在 10200 殿后；time-context 干脆不走 systemPrompt.section，走 message snapshot 注入。
2. **升 pin 不抽验行号钉**：消化稿 `_change_log/0010` 实证 `path:line` 钉落在文件长度内但指错行时
   机械 ref-sweep 全放行（约 60 处漂移全靠人工重锚）；本仓 notes 里大量承重钉（如节拍器卡引
   `runtime-types.ts:285`），`sync-dsh` 收尾清单没有这一步。
3. **architecture.md 的参与阶梯有"把 seam 当升级方向"的措辞倾向**：`assistantMemory` 是单 Provider、
   多 Consumer 的主干 service；seam 的成色读数是第二个真实 Provider 出现而 Consumer 一行不改
   （`_digested/plugin-inventory/05-taxonomy-and-design.md` 的反味信号：只剩单一调用者的公开方法
   该是私有闭包）——措辞不改会误导未来决策者的直觉。

## 决定

1. `DIGEST_SECTION_ORDER` 400 → **10150**（环境事实 10000/10100 之后、persona 后缀 10200 之前）；
   soul 100 / manual 300 留前带（稳定内容）。组合测试加带位断言（>10000 且 <10200）钉住回归。
2. `scripts/sync-dsh.mjs` 收尾清单插第 2 步：**人工抽验承重行号钉**（抽当前决定真正倚靠的钉，
   不是每颗钉）；同句登记进 `docs/discipline.md` 复查环。
3. `docs/architecture.md` 服务三角色段补三句：主干 service ≠ 竞聘 seam、seam 的成色读数、
   L2 行是落点判据不是成熟度升级方向。

## 输掉的方案

- **维持 400 不动、等真用轮日志实测再定**：stock 先例（persona 后缀殿后 + time-context 走
  message 注入）已定方向，实测只能确认收益大小、不能反转方向；且真用轮前改完，真用日志就是
  新形状的读数，避免真用中途再动模型可见面。
- **digest 改走 time-context 式的 message snapshot 注入**：改动半径大（段落是"桌面"的常驻面，
  语义就是 system 里的有界状态视图），且 message 注入形态改变模型看到它的方式——超出本切片
  "摆位修正"的范围；若真用轮证明尾部带仍不够，再立卡推敲。
- **把 soul/manual 一并移到尾部带**：它们随文件编辑变化、频率极低，留前带紧贴身份是叙事需要
  （你是谁 → 怎么用），没有 KV 代价。

## 验证（真跑过的命令）

1. `pnpm build` ＋ `pnpm typecheck`——绿。
2. `pnpm test`——39 个测试文件 301 个测试全绿（含真组合装载 `preset-composition.spec.ts`，
   新带位断言在场）。
3. `pnpm verify`——31 项门禁全过。
4. live probe（digest 尾部带 + schedule 工具进请求的端到端证据）与 release-smoke 随同日的
   schedule 默认带切片（`2026-10-02-schedule-default-adoption.md`，彼卡回链本文）一起跑——
   两切片共享一次探针，那里的日志同时证明本片的摆位落到了真实请求里。
