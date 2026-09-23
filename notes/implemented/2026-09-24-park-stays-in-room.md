# 2026-09-24 · park 把线索归档了（三档出口的合同级 bug，已修复）

日期：2026-09-24 · 状态：**implemented（本切片，红绿在案）**

## 发现（会话 C 实况）

战役步骤 C 的生命周期测试暴露：**`park` 把线索文件挪进了 `research/archive/`**——而合同
（I11 + research-backlog 技能）是"parked 留在 research/，只是离开摘要"。发现与初诊都来自
preset 会话里的助手本人（读了我们的源码，引用到行号；按仓库纪律只报告未动手），它顺手把
bug 存成了记忆。连锁伤害：parked 不进 list/curate 的计数、无法再 update/un-park、后续 drop
被当成"已关闭"拒绝。

## 根因

`setThreadStatus` 对**所有**状态变更无条件 `archive()`——**摘要可见性（渲染层关注点）与
房间位置（存储层关注点）被混为一谈**。`tests/` 里没有 parkThread 用例，所以纯核测试没拦住
（教训：合同级语义要测到"位置"这一层，不只测状态字段）。

## 修复（红绿）

1. **先写测试**：`tests/park-contract.spec.ts`（真 cordis 构造服务）：park 后线索仍在活跃
   房间且 status=parked、archive 为空、digest 计 parked 不列 open、parked 仍可 drop 带理由
   ——跑：**红**（`expected [] to include '20260923-park-roundtrip-contract-l5se'`）。
2. 修复：`setThreadStatus` 只在 `CLOSED_THREAD_STATUSES`（promoted/dropped）命中时归档，
   注释记原因与回归指针。
3. 再跑：**绿**（73/73；typecheck ×2 / build / verify 16/16）。
4. **live 复验**（preset-runner 两轮）：park 后文件在 `research/` 不在 archive、digest 只计
   数不占位、parked 可正常 drop；promote/drop 两档同步复验通过；stale 夹具（I13）被 curate
   报出后经 drop 带理由退役，counts 前后对照在案。

## 附带的一手证据（产品的自我养护闭环）

修复复验轮里，助手发现自家记忆中"park 是破坏性的"已与现状矛盾，**自主走 supersede 链**
（新记录取代旧记录、旧记录入 archive 历史可读）并退役了重复记录，最终 curate clean——
I8 的完整外部行为（"agent 据此合并/退役"）第一次真实闭环。

## 教训

- "错了多久能发现"的答案在这里是**从未点亮 = 永远发现不了**：park 合同从 day 0 就是错的，
  三轮纯核测试全绿也没碰过位置语义。live 验证是唯一暴露面。
- 服务层把两个正交关注点（可见性/位置）耦在一个动作里，是这类 bug 的温床；修复按"谁关注
  谁负责"拆开（渲染归 digest，位置归 lifecycle）。
