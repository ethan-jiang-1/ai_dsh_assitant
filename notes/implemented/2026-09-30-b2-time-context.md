# B2 片：`time-context` 独立挂进 host 组合

日期：2026-09-30 · 状态：**implemented（replay 探针：请求里出现 "Time sampled … 2026-09-30T22:13:08+08:00[Asia/Shanghai]"；dump-config 0 warn；301 tests / verify 31 绿）**

采纳卡：[`notes/proposed/2026-09-30-stock-plugin-adoption.md`](../../notes/proposed/2026-09-30-stock-plugin-adoption.md)（B2 片）。

## 决定与证据

现货 `@deepseek-ai/dsh-time-context`（schedule-bundle 同款行）以 host 插入行独立挂载，Config 全默认
（进程时区 + 10 分钟注入间隔）。给模型"今天是几号/什么时区/过了多久"——`staleResearchDays` 的过期
判断、"下周提醒我"类表达、"上次会话"的时间定位都依赖它。
**证据**：探针会话的请求文本里出现注入段（`Time sampled while preparing turn 1, step 1:
2026-09-30T22:13:08+08:00[Asia/Shanghai]`；浏览器时区不可用时明确指示模型问人，不是静默猜）。

## 输掉的方案

- **等 C1（schedule-bundle）一起挂**：时间感知是 stale 判断的地基，不该被定时功能绑架；两行彼此独立，
  schedule 将来打开时该行已在（同 id 行不冲突）。
- **钉死 `timeZone` config**：写死时区对部署地是第二份事实；进程时区是默认语义，浏览器时区在场时
  插件自己取更准（多设备场景）。
