# AGENTS.md —— `snapshots/` 子树常设指令

> 根 [`AGENTS.md`](../AGENTS.md) 管全仓规则；本文件拥有**行为回归证据面**的常设指令。
> 进了这个目录再读本文件——DSH 原生指令装载器按目录链加载。

## 只收什么（边界现在就立，不等树满）

本树只收 **session 回放 fixture**：输入 JSONL + 期望投影（一场景一目录 + 自己的 `snapshot.yml` 声明
profile 与录制）。单元 / CLI / generator / 几何 / 其他期望输出**跟 owning 层走**
（`packages/dsh-smart-assistant/tests/`、各自脚本旁）——集中目录只收真正同类的证据。

## 现在还没建 harness（诚实状态）

升级触发条件（够用再升级，别提前造）、当前用什么顶、以及为什么：
owner 是 [`README.md`](README.md)——本文件不复制它。

## 加 fixture 时

录制命令、profile、期望投影的判据必须与 fixture 同 diff 写进该场景目录（否则一年后没人知道怎么复现）。
