# 插件即产品：产品 profile、工作区作业面与 run bundle 的归属

> 问题：这个包怎样从“装进用户既有 profile 的插件”变成“有自己的启动 profile、启动时绑定用户工作区、把作业产物留在工作区”的产品，同时不推翻助手大脑与既有数据边界。
> 历史消费者：[插件即产品收口卡](../../settled_issues/261101-plugin-as-product.md)（2026-11-01 已结）
> 产出的卡：—
> 归档：2026-11-01

## 材料

| 文件 | 作用 | 日期 |
|---|---|---|
| [261101-platform-and-repo-facts.md](261101-platform-and-repo-facts.md) | DSH 启动/profile/workspace/session/prompt/present 的事实与本仓冲突面、已对齐面、未验证项 | 2026-11-01 |
| [261101-ownership-and-run-bundle-options.md](261101-ownership-and-run-bundle-options.md) | 大脑跟人/跟项目/混合三个方案的布局、平台代价、备份矩阵与 run bundle 形态 | 2026-11-01 |
| [261101-change-surface-and-slices.md](261101-change-surface-and-slices.md) | 全仓改动面、切片顺序、证据设计、风险回退与先做的原型 | 2026-11-01 |
| [261101-feasibility-review.md](261101-feasibility-review.md) | 对抗性复核：初衷对齐、十处落地缺口、四件物的 authority 分家、还差哪些原型 | 2026-11-01 |
| [261101-technical-probes.md](261101-technical-probes.md) | 四条机制实证：headless pending、boot 登记 + 会话 cwd、缺 preset 失败码、产品行 GET/POST | 2026-11-01 |
| [261101-landing-blueprint.md](261101-landing-blueprint.md) | 切片 1–3 的文件/API/测试/证据级落地蓝图与已证/待证边界 | 2026-11-01 |

## 读法

1. 先读平台与仓内事实，分清哪些是 DSH 硬约束、哪些只是本仓现在这么写。
2. 再读归属选项，重点是方案 A 与 B 的代价差；这是问题卡的第一分叉。
3. 再读改动面与切片，判断这个方向是否值得做、先做哪一段。
4. 再读可行性复核，看哪些点还落不了地、哪些先拍板。
5. 最后读技术探针与落地蓝图：哪些机制已经跑通、落到哪个文件/API/测试。
6. 问题卡的「落地顺序」把以上结论串成 D0→S1→S2→S3→S4→S5。

## 边界

- 本轮没有改产品代码；在 `.tmp` 跑过四条机制原型（headless pending、boot 登记/会话 cwd、缺 preset、产品行 GET/POST）。运行时行为（客户端门渲染、启动器自身代码、模型行为）留到对应切片。
- 外部 FAQ 26（`deepseek-harness/_faq_on_digested/26_plugin-as-product`）只作判据来源，本仓不复写其正文；本目录只保留与本仓落点相关的差量。
