# vendor/dsh 的簿记（钉住的 DSH 源码）

> 纪律抄自 `antfu/skills` 的 `GENERATION.md`：**submodule 钉 tag，精确 SHA 记在这里，
> 升级走脚本（`pnpm sync-dsh`），不裸漂。**
> 改这一行的唯一正确方式：跑 `pnpm sync-dsh -- --tag <new-tag>`，它会同步 submodule、
> 更新本文件、跑 typecheck、并往 `packages/dsh-smart-assistant/package.json` 的
> `dsh.compatibility.dshReleases` 加一列。

| 项 | 值 |
|---|---|
| 上游 | `https://github.com/deepseek-ai/deepseek-harness.git` |
| 钉住的 tag | `dsh-v0.2.1-rc.2` |
| 精确 SHA | `687f282e8625c6b8d11ff58211a90524be2e4317` |
| tag 提交时间 | 2026-10-17 |
| 本地形状 | **shallow**（`--depth 1`，只含该 tag 的树；升级要重新 fetch 目标 tag） |

## 为什么钉这个 tag（不是 `ethan` 分支）

本插件的机制依赖逐条核实过在该 tag 里存在：
`dsh-skill-filesystem` 的 `customSkillDirs` 与目录监听、preset 组合里的 `baseUrl` 惯用法、
`!!js ctx.<service>` 配置插值、`dsh.bundle.patch` 装载契约、`resolveDshHome()`。
（核实命令形如 `git -C vendor/dsh grep -c customSkillDirs dsh-v0.1.5-rc.2 -- packages/skill/skill-filesystem/src/index.ts`。）

## 跟随上游开发分支

要跟着 `ethan` 这类在飞的开发分支走（例如要用还没发版的新 seam），**临时**切过去即可，
但不要把结果当基线提交：

```sh
git -C vendor/dsh remote set-url origin git@github.com:ethan-jiang-1/deepseek-harness.git
git -C vendor/dsh fetch --depth 1 origin ethan && git -C vendor/dsh checkout ethan
# 结论写进 notes/，基线仍以本文件的 tag 为准
```

## 重审触发表（升 pin 时按路径查该重校哪里的断言）

| 上游路径 | 受影响的本仓断言 |
|---|---|
| `packages/core/system-prompt/**` | `docs/home.md` §三 桌面段落顺序、`src/home-preamble`、`src/memory-digest`、`src/agent/operating-brief` 的 section 契约（含同步 `text` 契约——prewarm 修复依赖它） |
| `packages/core/agent-loop/**`、`packages/preset/agent-presets/**` | `docs/architecture.md` §二 平面表、包根 `cordis.patch.yml` 的 `preset-assistant` 行、roster/standing mount 相关 tests |
| `packages/skill/skill-filesystem/**`、`packages/skill/skill/**` | `docs/home.md` 技能行、`src/skills/*`、`skill-shadow`/`skill-retirement` findings 与 tests |
| `packages/tool/**`、`vendor/dsh/docs/cookbook/adding-a-tool.md` | `src/tool-support`、自有工具的 presenter/卡片断言 |
| `packages/core/compaction/**` | 包根 `cordis.patch.yml` 的 realm 分组与 `toolResultPruner` 配置 |
| `vendor/dsh/docs/architecture.md`、`vendor/dsh/docs/capability-seams.md` | `AGENTS.md` 探索路由、`docs/architecture.md` 全文 |

**每轮升级的固定记录字段**（落 `notes/implemented/` 一条，不写进本文件——本文件只写**当前** pin）：
日期 / 新基线 tag+SHA / 动因 / 真跑过的命令与计数 / 复核后未改动的部分 / 遗留阻断（**阻断不得写成绿色**）。

## 不要做的事

- **不改 `vendor/dsh/` 里的任何文件。** 它不是我们的代码；改了下一次同步就丢，且会污染"钉住"的含义。
- **不在未跑 `pnpm typecheck` 的情况下升级 tag。** API 漂移要在编译期暴露，不是运行期。
- **不把 `workspace:*` 依赖写成本插件的 `dependencies`。** 见 `docs/identity.md` 与
  `packages/dsh-smart-assistant/package.json`：DSH 侧一律 **peerDependencies**。
