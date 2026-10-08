# 2026-09-24 · preset-runner：preset 挂载的 one-shot 驱动（验证自动化，已实现）

日期：2026-09-24 · 状态：**implemented（本切片，live 验证在案）**
已归档：2026-10-08（决定已经在合同或代码里；下次改决定不用打开本篇。冻结，不再跟踪。）

## 问题

战役步骤 B–D 需要"真实 preset 会话"（工具/persona/摘要），而 vendor 契约是 one-shot 建裸
agent、roster 只在"创建会话的一方"被消费——此前唯一载体是 Web UI 真人操作。用户拍板"你来做吧"
后，需要一条不依赖浏览器的驱动路径。

## 机制发现（vendor 源码实证）

- headless runner 与 ACP 建会话处各留同一句注释："a deployment that DOES configure one has to
  join it here first"，指向 agent-presets 的挂载 API。
- **API 又小又公开**（session-controller 全树唯一参考实现 `composeAgent`）：
  `agentPresets.resolve(id?)`（缺省取 roster 默认）→ agent `setup` 里 `presets.mount(agentCtx,
  resolvedId)`（把 agent 的 scope 挂到 preset 的 standing mount）。
- dev-task profile 已带 roster（default: assistant、roots 指 repo presets）与本插件——缺的只是
  一个用这套 API 的 runner。
- 行替换的坑（裸 agent 诊断跑实测）：loader 守卫**拒绝在行替换时改 `name`**（防 patch 劫持插件
  身份）——正确形状是"禁用旧行 + 新 id 插入"（--dump-config 验证无 warn）。

## 决定

1. **`src/preset-runner/index.ts`**：vendor headless runner 的精简翻版 + `presets.mount` 进
   setup + 会话头记录 `agentPreset`（与 web 会话同形）。删推理流（自动化不需要）；
   `loader`/`appExit` 经 `ctx.get` 的字符串重载（返回 any）取用，省掉两个类型依赖。
2. **`dev/probes/session/preset-runner.patch.yml`**：禁用 `headless-runner` 行 + 新 id `preset-runner` 插入；
   task 仍经 `!!js ctx.headlessStartup.task`（loader 侧求值，与原行同源）。
3. **验证语义不变**：不带 patch 的 one-shot 仍是裸 agent 冒烟（AGENTS.md 命令表）；带 patch
   才是 preset 驱动。产品面零影响——这是 dev 验证基础设施，不是产品行为。
4. 类型门面照契约扩展（6 个新 `@deepseek-ai/*` paths + 项目引用；运行时依赖入 peers：
   dsh-agent/dsh-brand/dsh-llm/dsh-session；全部入 devDeps 供测试工程声明解析）。

## 验证（真跑过）

- typecheck ×2 / test 72/72 / build / verify 16/16。
- **live 三跑全证据**：① 介绍自己 + `assistant_memory list`（会话 `b04a36b5`：`agentPreset:
  assistant` 头、persona 与 digest blurb 进 system prompt、工具真调用、turn completed）；
  ② 会话 B 第一段（save/list/recall/curate 四连，先按 persona 指引加载 memory-hygiene 技能）；
  ③ 会话 B 第二段（**新进程** recall 命中同一 id——I2 跨进程持久）。
- 附带证据：patch 未生效时的诊断跑本身 = 裸 agent 对照（无 assistant 工具，工具表在案）——
  I1 的"其他会话不受影响"半句也有了日志。

## 输掉的方案

| 输掉的 | 为什么输 |
|---|---|
| 改 vendor（headless/ACP runner 加 preset 口） | 第一硬规则 |
| Typert RPC 脚本化驱动 | 战役 note 已明确否决（一次性人工验证更快）；本轮需求是"组合级驱动"而非 RPC，preset-runner 更轻 |
| `agent/created` 事件里晚挂载 | 事件在 setup 之后发射，组合已定型；mount 属 setup 期（参考实现如此），不赌 scope 晚挂语义 |
| 我们插件给所有 agent 自动挂 preset | 产品行为越权：插件装进任何组合都会劫持会话组成；runner + 显式 patch 才是受控边界 |
