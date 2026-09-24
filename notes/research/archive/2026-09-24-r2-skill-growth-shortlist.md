# R2 · 能力增长/技能插件初筛（研究阶段，无定论）

日期：2026-09-24 · 状态：**已收卷（2026-09-24）——结论在 [r2 survey §9](2026-09-24-r2-skill-growth-survey.md)：借规范借组件（否直接采用、否全自研），缺口清单被 tri-line 三阶段全部落地（治理环/知识房间/触发演进）；剩余借鉴线均有 ⏳ 归宿（全自动蒸馏=garvel 安全闸形态、license 字段=Agent Skills 标准）。生态插件逐一深评不再单独立项，等真实使用触发**
数据基线：`dsh-plugin-shop-catalog` v2026.923.1（2026-09-23 快照；技能/成长类约 259 个）+ npm registry 直查（2026-09-24）
**硬约束（用户拍板，2026-09-24）：纯本地使用，不用云**——本线候选基本全是本地插件，占优。
深评进行中：后台代理 → 落 `2026-09-24-r2-skill-growth-survey.md`

## 我们已有的基线（对照物，2026-09-24 live 验证完毕）

`assistant_reflect`（brief→save_skill）+ 家的 `skills/` 房间（SKILL.md + provenance 盖章）
+ 学到技能即刻可见（双 provider）+ 已知缺口：**同名遮蔽静默**（学到版被策展版遮蔽只报
logger warn）、curate 被动执行、自动复盘延后（触发条件=真实使用数据）。

## 过滤结果

### A. 值得深评（按与基线缺口的对应度排）

| 候选 | 版本/更新 | 一句话 | 初筛判断 |
|---|---|---|---|
| `dsh-run2skill` | v0.4.0 / 09-06 | 把 DSH 会话经验转成**可评审的原生 Skills**（自标 human-in-the-loop） | 与我们 reflect→save_skill 最直接对位；差异点在"评审流"——深评它的评审门怎么设计 |
| `@dsh-enhanced/assistant-evolution` | v0.1.40 / 09-23 | **审批门控**的行为自我演化 | 正中我们的自主度谱系问题（全自动↔人审）；审批门的机制值得拆 |
| `@bryan-cmf/dsh-skill-trail` | 08-23 [ui] | 每轮回复的技能足迹徽章——**从会话日志折叠，不信模型自报** | 直接治我们"遮蔽静默"缺口的兄弟问题（技能使用可见性）；日志为真相的哲学与我们一致 |
| `@bryan-cmf/dsh-skill-gate` | 08-23 [ui] | 技能触发选择门：模型触发技能时用户从候选里选，10s 不选回落系统默认 | 技能加载的人控面；与渐进披露互补还是冲突待深评 |
| `@michengai/dsh-skills-manager` | v1.1.0 / 09-22 | 统一加载并安全管理本机 Agent Skills | 治理面（加载/安全）；与我们双 provider 结构的叠加关系待评 |
| `@wumihaze/dsh-mind` | v0.2.2 / 09-12 | 持久记忆 + **自策展技能** | 一体两面（跨 R1/R2）；"自策展"正是我们 I14 的观察点 |

### B. 存在但未入商店目录（registry 可见，catalog 未索引）[observed]

- `@lmzhen/dsh-evolution-core`（npm v?）——名字相关，深评代理拉取
- `@dsh-enhanced/preference-learning` v0.1.40（"bounded, typed preference learning"）——偏好学习，记忆与成长的交界

### C. 初筛淘汰

- 各类"技能市场/目录/导览"UI 插件（`@dachengge/dsh-skill-catalog` 等）——是浏览面不是增长机制
- `@bryan-cmf/dsh-skill-gate` 若评审后判定与我们 persona 驱动的按需加载冲突则降级（先留观察）

## 未决问题（深评要回答的）

1. `dsh-run2skill` 的技能格式是否就是 DSH 原生 SKILL.md（若是=零格式迁移成本）
2. `@dsh-enhanced/assistant-evolution` 的"行为演化"落点是什么（指令?技能?配置?）——决定它和我们哪层重叠
3. 遮蔽可见性：有没有插件让"你写的技能没生效"在工具返回里可见（我们的已知缺口）
