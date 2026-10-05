# AGENTS.md —— `snapshots/` 子树常设指令

> 根 [`AGENTS.md`](../AGENTS.md) 管全仓规则；本文件拥有**行为回归证据面**的常设指令。
> 进了这个目录再读本文件——DSH 原生指令装载器按目录链加载。

## 只收什么（边界现在就立，不等树满）

本树收两类**行为回归证据**（"录一次、重放比对、每个 diff 人工过目"同一形态）：

1. **session 回放 fixture**：输入 JSONL + 期望投影（一场景一目录 + 自己的 `snapshot.yml` 声明
   profile 与录制）。
2. **web 渲染期望**：真渲染一次的 DOM 证据比对（一场景一目录 + `snapshot.yml` + 契约 README；
   harness = `dev/probes/web/webui-expected.mjs`，首场景 `web-face/blank-first-open/`）。

单元 / CLI / generator / 几何 / 其他纯函数期望输出**跟 owning 层走**
（`packages/dsh-smart-assistant/tests/`、各自脚本旁）——集中目录只收真正同类的证据。

## harness 状态（诚实）

- **web 渲染期望**：harness 已建（`dev/probes/web/webui-expected.mjs` + 纯核比对器，形态夹具在
  `tests/webui-expected-core.spec.mjs`）；场景契约 owner 是各场景目录的 `README.md`。
- **session 回放**：仍未建。升级触发条件（够用再升级，别提前造）、当前用什么顶、以及为什么：
  owner 是 [`README.md`](README.md)——本文件不复制它。

## 加 fixture 时

录制命令、profile、期望投影的判据必须与 fixture 同 diff 写进该场景目录（否则一年后没人知道怎么复现）。
