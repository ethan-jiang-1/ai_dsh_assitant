日期：2026-10-20 · 状态：**implemented**

# OpenViking 云端例外：可出范围、四道闸与 ack

## 问题（可观察行为）

OpenViking 是可选的第二记忆层，它的记忆抽取与 embedding 默认可以走云端 provider（试点是硅基流动的
DeepSeek-V3.2 + bge-m3）。这与 README 的「严格本地」取向冲突；而插件的默认值（`captureToolResults`
对 DSH 为 `true`、`captureFilters` 为空）意味着**工具结果会原样进入云端**。用户 2026-10-20 接受云端
作为例外，但要求写清哪些内容可以出、哪些必须脱敏，并在部署时显式确认。

## 决定

- **云端是被接受的例外，不是默认**。本地 provider（Ollama/本地 OpenAI 兼容）不需要任何 ack；切回本地或
  关掉记忆层即退出例外。
- **出口范围**只覆盖 OpenViking 的记忆抽取与 embedding；不覆盖 DSH 主模型请求、其他插件和遥测。
- **可出**：对话文本、已抽取的记忆条目、结构化工具摘要（工具名/成败/截断输出）、用户显式提供或确认的材料。
- **永不出**：凭据（key/token/password/cookie/私钥/`.env`/`Authorization`）、原始文件与二进制、完整 shell
  输出与环境变量/进程表、个人敏感信息（默认掩码）、第三方机密（默认掩码）、模型与系统提示词。
- **闸门按先后**：① `captureFilters` 在插件 capture 阶段替换/丢弃；② `captureToolResults` 在云端显式
  `false`（或只出过滤后的摘要）；③ doctor 从 active profile 读规则并自测（规则为空即红，不报绿）并给出
  脱敏后的命中示例；④ 0.5.1.1 的 privacy fields 作第二道。**没有发送前的运行时拦截点**——插件自己发
  HTTP，DSH 侧没有缝；运行时只能依赖第 ①道。
- **ack 唯一载体 = 环境变量 `OPENVIKING_CLOUD_ACK=1`**，不新增配置文件口、不改上游 schema。云端 provider
  且无 ack：doctor fail；`pnpm start` 只打 warning，不阻断 DSH。
- **有源才显示**：provider/模型名、`/health`、`/stats/memories`、`/tasks` 最近状态、token 用量（走
  `token-meter`）。运行时脱敏计数与「最近一次发送时间」没有数据源，不造。

## 输掉的方案

- **保持插件默认（工具结果全出）**：当前泄露面，云端例外下不可接受；不选。
- **相信 provider 侧脱敏**：把边界交给外部服务；我们无法审计也不可回退；不选。
- **新增配置文件口或改上游 config schema**：为一个部署开关改第三方契约，升级即碎；不选。
- **把 `captureFilters` 当运行时阻断**：规则只能作用于 capture 内容，不能拦发送；写成运行时防线会误导
  后来的人以为有拦截点；不选。
- **为「experiences 未来可能有用」保留工具结果**：拿当前泄露面换未证实的未来能力；确认消费面之前按
  `false` 处理。
