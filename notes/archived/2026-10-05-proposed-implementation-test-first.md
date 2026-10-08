# 提案实施纪律：proposed → implemented 走 test-first 证据环

日期：2026-10-05 · 状态：**implemented**
已归档：2026-10-08（决定已经在合同或代码里；下次改决定不用打开本篇。冻结，不再跟踪。）

## 决定

用户拍板（2026-10-05）：notes/ 从 proposed 推进到 implemented 的过程必须遵循 TDD 式手段——
先考虑怎么测，实现后看测试是否满足，反复做对；全程要证据，不随性发挥。规则落点 =
[notes/README.md](../README.md) §二之三（生命周期的唯一权威处），四条纪律：验收先行可执行 /
造红→实现→变绿循环 / implemented 只收真跑过的红绿证据 / 验收写不出 = 提案未成熟；
proposed 卡骨架（§二之二）同步要求「验收」节可执行。

分工不重写：红绿机制的政策 owner 仍是 [docs/testing.md](../../docs/testing.md)
（prove-it-red、禁掩盖修法）；改动面 → 最小可信证据的选择 owner 是
[pre-push-evidence 技能](../../.agents/skills/pre-push-evidence/SKILL.md)；[proposed 卡定位]
(2026-10-04-proposed-card-positioning.md) 拥有「批发生在 proposed→implemented 之间」的边界、
[测试策略决定](../implemented/2026-10-04-test-strategy-adoption.md) 拥有测试哲学——本决定只拥有**生命周期层的
执行纪律**，与三者互链不复制。

## 证据

- 本决定自身按新纪律执行：章程文本落入 notes/README.md 后 `pnpm verify` 34 项全绿
  （notes 形状、相对链接、backtick 路径门禁全部审过新增文本）。
- 决定前已按此形状工作的正例：[repo 可驾驭性](2026-10-05-repo-navigability.md) 的验证段
  记录两处真实造红（旧 runner id / 删 memory 行各使断言真红后恢复）；同一决定的红绿
  （目标树写成 backtick 路径被门禁抓红 → 改散文表述后绿）。

## 输掉的方案

1. **写完再补证据（事后自评）**：证据在实施后编造或挑选，无法区分"真绿"与"迁就"——
   被用户原话否决（"一定要需要证据，不要随性发挥"）。
2. **立即升为机械门禁（implemented 必带真跑命令）**：命令真伪与红形态无法机械判定，预铺
   只会逼出凑格式；升级触发已写进章程（随性发挥复发即建门禁 + 负例夹具，同
   scripts/AGENTS.md 门禁三纪律）。
3. **新建 TDD 技能承载**：执行细节已有 pre-push-evidence（证据面）与 testing.md（红绿机制），
   流程纪律的家在生命周期章程；第三个指南现在只会是重复建设——按「重复即建」常设规则，
   该流程第三次被重新推演时再升格为技能。

## 范围与后果

约束 notes/ 生命周期里 proposed → implemented 的**实施过程**；不改 proposed 卡骨架的门禁边界
（仍只推荐不门禁，只是验收节多了可执行性要求）；不移动 testing.md 的政策条款归属；存量
implemented note 祖父豁免（本决定起生效）。当前活跃的 repo 可驾驭性提案分段实施即刻适用——
每片以"会因它而红的检查"开工，implemented 时记录真跑命令与红绿形态。
