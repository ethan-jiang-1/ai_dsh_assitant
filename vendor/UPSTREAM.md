# vendor/dsh 的簿记（钉住的 DSH 源码）

> 纪律抄自 `antfu/skills` 的 `GENERATION.md`：**submodule 钉 tag，精确 SHA 记在这里，
> 升级走脚本（`pnpm sync-dsh`），不裸漂。**
> 改这一行的唯一正确方式：跑 `pnpm sync-dsh -- --tag <new-tag>`，它会同步 submodule、
> 更新本文件、跑 typecheck、并往 `packages/dsh-smart-assistant/package.json` 的
> `dsh.compatibility.dshReleases` 加一列。

| 项 | 值 |
|---|---|
| 上游 | `https://github.com/deepseek-ai/deepseek-harness.git` |
| 钉住的 tag | `dsh-v0.1.5-rc.2` |
| 精确 SHA | `fb2c4b9e698e30edb738bca4cf0618587db7d203` |
| tag 提交时间 | 2026-09-10 |
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

## 不要做的事

- **不改 `vendor/dsh/` 里的任何文件。** 它不是我们的代码；改了下一次同步就丢，且会污染"钉住"的含义。
- **不在未跑 `pnpm typecheck` 的情况下升级 tag。** API 漂移要在编译期暴露，不是运行期。
- **不把 `workspace:*` 依赖写成本插件的 `dependencies`。** 见 `docs/identity.md` 与
  `packages/dsh-smart-assistant/package.json`：DSH 侧一律 **peerDependencies**。
