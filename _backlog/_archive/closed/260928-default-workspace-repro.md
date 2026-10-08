# 推敲：默认工作区复现（第一公里 P1-C 遗留）

> 立卡：2026-09-28 ｜ 状态：推敲中｜毕业门判断 = 待触发｜下一步 = 真实安装出现「选择工作区」阻塞，或第一次给外人用 ｜ **关闭：2026-09-29 用户拍板批量清理：触发未到；复现配方住第一公里走查 note；去向 = _archive/closed 归档**

## 背景 / 触发
机制已查清（空注册表时平台建 `<Documents>/deepseek-harness/default-workspace`）、一次真机端到端见过，
但按需复现失败——配方与第一步（CDP Network 域抓 `workspace/initializeDefault`）在
[第一公里走查 §4b](../../../notes/archived/2026-09-26-first-mile-landing.md)。
第一公里 P0–P3 本体已交付（[卡](../../../notes/archived/2026-09-26-first-mile-landing.md)）。

## 毕业门
触发成立 → 按走查配方复现一次，把「外人第一次打开」做成可重复验证；小修可直接开工。
