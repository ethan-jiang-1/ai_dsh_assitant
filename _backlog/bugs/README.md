# bugs/ · 这次不修的缺陷

当场修掉的不建卡（同类清扫写进该轮交付记录或提交说明）。建卡表示发现时决定这次不修。

提交只改这个目录：新建 `BUG-<NNN>-<slug>.md`，并在下面的表加一行。号在本文件取，不和 [`../issues/`](../issues/README.md) 的推敲卡混。

**下一个缺陷号**：已分配到 BUG-012，Next BUG ID = 13。本目录、[`../_archive/fixed_bugs/`](../_archive/fixed_bugs/README.md) 和 [`../_archive/suspended_bugs/`](../_archive/suspended_bugs/README.md) 一起算，取最大号加一。

## 修复通道与授权

- **修复就绪自带修复授权**：根因有证据确认、修复路径已选、`## 修好定义` 已写——翻到 `修复就绪` 那一刻，卡既是车票也是授权，不必再请示。
- **例外（severity 的消费方）**：P0，或修复触及 根 [`AGENTS.md`](../../AGENTS.md) 常设指令 / [`docs/`](../../docs/AGENTS.md) 合同 / 包的公开行为 / 已记录决定（notes）→ 不自授权，翻 `等人拍板` 走本人，或并进问题卡。P1/P2 修复型自授权。
- **根因纪律**：「根因（假设）」到确认要有证据——一个 bundle、一段 git 历史、一次对照；被证伪的假设留在卡上，不擦掉。
- **riding 依赖**：验证若随另一件工作走（如沿用某张卡的判据），在 `## 修好定义` 里点名那件工作，不写即兴句子。

## 状态怎么翻

frontmatter `status` 是当前阶段的唯一家；状态行镜像它（`状态：` 记号）并拥有历史。守卫到位才翻，翻的人与记录如下：

| From | 守卫 | To | 谁 |
|---|---|---|---|
| （开卡） | 分诊后——确认是缺陷、决定这次不修 | 排查中 | agent |
| 排查中 | 根因有证据确认 + 修复路径已选 + `## 修好定义` 已写；P1/P2 修复型 | 修复就绪 | agent（翻转即票即授权） |
| 排查中 | 同样就绪，但 P0 或触及上面例外清单 | 等人拍板 | agent（把通道问题写清楚） |
| 排查中 | 查明但决定不修/延后 | 待修（归档） | agent |
| 修复就绪 | 修复落进树 | 修复落地 | agent |
| 修复就绪 / 修复落地 | 根因或路径被证伪——验收失败或新证据 | 排查中（向后翻，撤回留在卡上） | agent |
| 修复落地 | `## 修好定义` 满足、证据已记 | 已修（归档） | agent |
| 任意活跃值 | 下一步是本人的选择 | 等人拍板 | agent（🔒 仅本人可判时） |
| 任意活跃值 | 本人叫停、无结论 | 待修（归档） | 仅本人 |
| 等人拍板 | 本人明确答复 | 回等待前状态，或出口 | 仅本人 |
| 已修 | 永不重开——回归/复发＝引用旧卡开新卡 | — | — |

**沉默不翻转；出口值只在归档的那次改动里翻。** 共享翻转法在[入口 README](../README.md#卡的生命周期)。

修完就 `git mv` 到 [`../_archive/fixed_bugs/`](../_archive/fixed_bugs/README.md)，文件名不变，frontmatter 的 `status` 改成 `已修`，状态行补修复结论。查明了、还没修的，进 [`../_archive/suspended_bugs/`](../_archive/suspended_bugs/README.md)，`status` 改 `待修`——挂起不是修好。

## 活跃清单

| Bug | 标题 | 严重级 | 发现 |
|---|---|---|---|
| [BUG-012](BUG-012-eval-session-reads-outside-workspace.md) | `pnpm eval` 会话能读到隔离工作区之外的真实数据，行为判据被污染 | P1 | 2026-10-15 |

## frontmatter

新卡照这个写。文件第一行是 `---`，字段顺序固定，第一项是 `status`。

```yaml
---
status: 排查中
severity: P1
opened: YYYY-MM-DD
---
```

| 字段 | 写什么 |
|---|---|
| `status` | 活跃四值：`排查中` / `修复就绪` / `修复落地` / `等人拍板`，何时翻见上面的表 |
| `severity` | `P0` 阻断，`P1` 重要，`P2` 次要——它是修复通道的分岔口（P0 走本人）。此 P 编号是**缺陷严重级**，与 [`README.md`](../../README.md) 的 P1–P3 产品判据无关 |
| `opened` | `YYYY-MM-DD`，与正文发现日相同 |

离开本目录时只改 `status`。修好了改成 `已修`，卡进 [`fixed_bugs/`](../_archive/fixed_bugs/README.md)。查明了、还没修，改成 `待修`，卡进 [`suspended_bugs/`](../_archive/suspended_bugs/README.md)。`severity` 和 `opened` 不动。正文里的状态句留着，不抄进 frontmatter。

## 模板

```markdown
---
status: 排查中
severity: P1
opened: YYYY-MM-DD
---

# BUG-<NNN>：<一句话标题>

> 严重级别：P0（阻断）/ P1（重要）/ P2（次要）｜发现：YYYY-MM-DD｜状态：排查中

## 症状

## 根因（假设）

## 复现

## 修复关联

## 修好定义
```
