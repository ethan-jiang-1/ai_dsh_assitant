# 决策：`pnpm dsh` 启动器强制 dev home（dev/env/dsh.mjs）

日期：2026-09-23 · 状态：**implemented**

## 问题

DSH 的一切持久化（profile、凭据、会话日志、插件安装、家的 `dataDir`）都由 `DSH_HOME` 决定。
用户 shell 里常年导出着 `DSH_HOME=~/.dsh`（日用实例）—— 实测本 repo 的开发 shell 继承到的就是它。
原来的防线只有 `dev/env/env.sh` 兜底，也就是"记得 source"。任何人（尤其是 agent）忘了，
`pnpm dsh` 就会读写日用的 home：装插件进日用 profile、写日用会话日志、拿到日用凭据。

**错了赔得起吗？** 不可控 —— 污染的是用户的日用实例。
**错了多久能发现？** 可能很久。所以默认值必须安全，不能靠记性。

## 决策

- 新增 `dev/env/dsh.mjs` 作为 `pnpm dsh` 的唯一入口：**无条件**把 `DSH_HOME` 设为
  `<repo>/dev/harness-home`（覆盖继承值时在 stderr 打一行，让覆盖可见）。
- 唯一出口 `ASSISTANT_DSH_HOME`：显式指定另一个开发用 home（冒烟/实验用）；
  指向 `~/.dsh` 时放行但打显著警告 —— 本 repo 没有任何场景需要日用 home。
- 启动器同时负责"从钉住的源码启动"（`tsx` + 运行期解析门面 `tsconfig.tsx.json`，
  绝对路径传入），原先散在 package.json script 里的这半件事一并收拢。
- 不经过启动器的调用方（`release-smoke`、`dev/env/setup.sh`）维持自管 `DSH_HOME` 的现状。

## 验证（真跑过）

- 裸 shell（继承 `DSH_HOME=~/.dsh`）跑 `pnpm dsh --help`：打印覆盖警告 + dev home 生效，exit 0。
- `ASSISTANT_DSH_HOME=dev/tmp-alt-home pnpm dsh --help`：home 指向 alt，无警告，exit 0。
- `pnpm verify` 12/12。

## 被否决的方案

- **只在 `dev/env/env.sh` 里兜底（原状）**：靠人记得，已实证会忘。
- **`dsh` script 里内联 `DSH_HOME=... env` 前缀**：pnpm script 无条件覆盖后仍可被
  `DSH_HOME=xxx pnpm dsh` 覆盖 —— 恰恰放行最危险的继承路径；且无处打印说明、无法拒绝日用 home。
- **检测到 `~/.dsh` 就硬退出**：退出对 agent 不友好（要多一轮才明白）；覆盖 + 一行说明更可预期。
