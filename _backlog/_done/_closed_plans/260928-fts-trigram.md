# 推敲：FTS / trigram 检索升级

> 立卡：2026-09-28 ｜ 状态：推敲中｜毕业门判断 = 待触发｜下一步 = grep 真实漏召回 ｜ **关闭：2026-09-29 用户拍板批量清理：grep 漏召回未发生；选型表住 R3 实测表；去向 = _closed_plans 归档**

## 背景 / 触发
知识检索已有关键词排序 + 反链；FTS/trigram 是纯本地索引升级，不引服务。
方法参照 [R3 实测表 §4.3/§7.2-3](../../../notes/archived/research/2026-09-24-r3-knowledge-layer-survey.md)。

## 毕业门
grep 漏召回案例到手 → 按实测表选型，毕业为 RFC。
