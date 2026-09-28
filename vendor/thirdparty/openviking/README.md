# vendor/thirdparty/openviking · 钉存的 OpenViking 试点物

> 性质：**离线钉存的第三方上游包**（用户拍板 2026-09-28：先拉下来落盘，防断网；发布物是否
> 包含它 = 准入决定，试点过审后才定形状——见
> [_backlog/plans/260928-self-growth-base-research.md](../../../_backlog/plans/260928-self-growth-base-research.md)）。
> 这里只放**一手来源、哈希可验**的原始工件，不放改造物。

## dsh-memory-plugin-0.5.8.tgz

| 项 | 值 |
|---|---|
| 包名 / 版本 | `@openviking/dsh-memory-plugin` 0.5.8（latest） |
| 来源 | https://registry.npmjs.org/@openviking/dsh-memory-plugin/-/dsh-memory-plugin-0.5.8.tgz |
| 发布日 | 2026-09-25（GitHub Actions trusted publishing + SLSA provenance） |
| 完整性 | `sha512-S90WV24K4tdRm0rMa8UHmnvkqCzaqnWck7lGN5aGfg2M45kDv2/mPOgclfSepM9ZWuSxIl3ZrM2y26fMnK//Wg==`（= registry `dist.integrity`，本仓 2026-09-28 下载后独立重算一致） |
| license | Apache-2.0（bundle 位于上游仓 `examples/`，license 分表载明；上游主项目 OpenViking 为 AGPL-3.0——独立进程 + HTTP/MCP 消费不构成链接，fork server 才触发） |
| 上游源码 | https://github.com/volcengine/OpenViking （`examples/dsh-memory-plugin` 目录） |
| 兼容 | peer 范围 `>=0.1.0-rc.6 <0.2.0 \|\| ^0.1.5-rc.1 \|\| ^0.1.7-rc.2`——含本仓 pin `0.1.7-rc.2` [observed：npm registry] |
| 为什么钉存 | ① 试点隔离 profile 时离线可装（`dsh plugin add <本文件>`，经 pnpm tarball 装法，试点时验证）；② 周更上游（五周 17 版）下锁定试点对象，保证证据可复现；③ 包内 `shared/`、`skills/` 为 prepack 生成物，tarball 自含、无需上游 checkout |

## 服务器侧离线件（不入库，按需重拉）

OpenViking server 在 PyPI（`openviking` 0.4.22，AGPL-3.0，wheel 23–29 MB 平台件），不钉进 git；
断网前要囤的话用可重跑命令（macOS arm64 本仓机器示例）：

```sh
pip download openviking[local-embed]==0.4.22 --dest vendor/thirdparty/openviking/wheels/ --platform macosx_14_0_arm64 --only-binary=:all:
ollama pull <视觉模型，如 qwen2.5vl>   # VLM 位（服务端主力：抽取/L0/L1）
ollama pull <embedding 模型，如 bge-m3> # embedding 位（provider: ollama）
```

本地依赖面（2026-09-28 官方文档核读，详见调研卡与台账）：
**火山/云全程可不出现**——VLM 走 `openai` provider 指本地 Ollama（OpenAI 兼容端点）或 litellm 的
`ollama/` 路由；embedding 支持 `ollama` 与 `local`（GGUF）；vectordb/agfs 默认 `local`（内置
C++ 引擎，无外部数据库）；localhost 认证走 `dev` 模式免密；operation telemetry 为请求级
opt-in 调试摘要、非外发上报。官方跑分用云端 Doubao——**本地小模型质量未验证**，是试点第一问。

## .gitignore 的关系

仓库级 `*.tgz`（打包残留语义）经 `!vendor/thirdparty/openviking/*.tgz` 例外放行；
钉存物入 git 是刻意决定（完整性哈希 + 离线可装是它的存在理由）。
