---
status: 排查中
severity: P2
opened: 2026-10-16
---

# BUG-014：走查的屏幕文本捕获在字节边界截断（同一走查两次跑还一空一有）

> 严重级别：P2（次要）｜发现：2026-10-16｜状态：排查中

## 症状

真机走查产出的屏幕文本文件不可靠，**这会污染所有依赖它做口味裁决的素材**：

- `.tmp/desk-walkthrough/2026-10-16T06-52-08/1-desk-first-screen.txt` 末字符是**半个多字节字符**（`…开发者相关的进阶功能可在配置中开启使用�`）——截图（`.png`）完整 ✓，只有文本 ✗；
- 同一次走查**更早那一跑**（`2026-10-16T06-47-49/1-desk-first-screen.txt`）该文件是**空**的 ✗，这一跑却是 859 字节 ✓核实——两次不一致。

## 根因（假设）

1. 截断：写盘那一步在**字节边界**切断（多字节字符被劈开 ⇒ 出现 U+FFFD）✗，而不是按字符/整行截断；
2. 空文件：疑与当时的机器饥饿有关（新 home 的默认 workspace 落地未完成时页面内容为空 ✗）——同日的 `diagnosing-bugs` 诊断已定性该环境敏感（`desk-daily-brief-live.mjs` 现在会自报 `verdict.health` ✓，走查尚未有同样保护 ✗）。

两条都要在动手时**先各造一次红**（字节截断可离线造；空文件按"走查也应报环境健康"的方向取证）。

## 复现

```sh
# 需要实例（先 prepare/setup + 起服务），然后：
node dev/probes/web/desk-flow-walk.mjs '<gui-url>' --home <dir> --matter 尾款
# 看输出目录里的 *.txt：末字符是否为 U+FFFD；以及是否曾出现空文件
```

## 修复关联

- 捕获与落盘：`dev/probes/web/desk-flow-walk.mjs`（屏幕文本写入处）
- 环境健康上报的先例：`dev/probes/web/desk-daily-brief-live.mjs` 的 `verdict.health`

## 修好定义

- 连跑两次走查：**5 个 `.txt` 全部非空**且**不含 U+FFFD** ✗；截断按字符或整行，不劈多字节；
- 走查在饥饿环境下**自报环境健康**（照 `desk-daily-brief-live` 的范式），失败不静默；
- `pnpm verify` 41 绿。
