# 上游 issue 递交草案（6 条）——喂 261001-first-open-ux

> 立档：2026-10-05｜服务对象：[261001-upstream-candidates.md](261001-upstream-candidates.md)
> （行号映射见下表）与 [首开 UX 卡](../../_done/_closed_plans/261001-first-open-ux.md)。
> 状态：**已递交（2026-10-06 gh 认证恢复后经 gh api GraphQL 代发，6/6 成功，链接见下表）**——
> 渠道 = `github.com/deepseek-ai/deepseek-harness` 的 **Discussions · Ideas** 分类
> （CONTRIBUTING 明文外部反馈走 Discussions；issue 面留维护者）。两条执行路径：
> ① 用户 `gh auth login -h github.com` 重认证（现 token invalid）→ agent 经 gh api 代发 6 帖；
> ② 用户手贴——每帖 = 下表标题 + 对应草案正文块（即贴即用）。
> 原稿锚点版本记为 dsh v0.2.0-rc.2 / c1857a8；当前源码 pin 见 [vendor 簿记](../../../vendor/UPSTREAM.md) 与 [技术审计](../tech-exploration/261005-turnaround-evidence-audit.md)，递交前核对旧行号/构建是否仍适用，不把原稿 SHA 当当前。
> 证据出处：安装界面的 delegated naive-CEO 角色读数与 agent 取证，不是真实非开发者用户测试。外发文字中的 naive-user/non-developer 已如实说明是代理模拟（正文原样带「not human usability sessions」限定）。锚点 pin 本会话 verify 的 submodule 检查全程绿（v0.2.0-rc.2 未动），递交前核对成立。

| 草案 | 台账行 | 标题（英文贴用） | 状态 |
|---|---|---|---|
| [D1](https://github.com/deepseek-ai/deepseek-harness/discussions/8939) | #1 | zh hero placeholder speaks developer language and exposes `/`@` syntax | 已递（链接见行首） |
| [D2](https://github.com/deepseek-ai/deepseek-harness/discussions/8940) | #2 | zh hero headline 「探索未至之境」 is poetic, not informative | 已递（链接见行首） |
| [D3](https://github.com/deepseek-ai/deepseek-harness/discussions/8941) | #3+9 | developer telemetry (tok/s, cache %, context %) and untranslated thinking stream on the chat surface | 已递（链接见行首） |
| [D4](https://github.com/deepseek-ai/deepseek-harness/discussions/8942) | #5 | tool change-lists render machine-absolute paths, against the repo's own `dshHomeDisplay` rule | 已递（链接见行首） |
| [D5](https://github.com/deepseek-ai/deepseek-harness/discussions/8943) | #6 | document preview renders raw markdown incl. YAML frontmatter | 已递（链接见行首） |
| [D6](https://github.com/deepseek-ai/deepseek-harness/discussions/8944) | #7 | zh panel name 「轨迹」 (trajectory) is mechanism jargon for product users | 已递（链接见行首） |

---

## D1 — zh hero placeholder speaks developer language and exposes `/`@` syntax

**中文摘要**：中文占位词把用户当「构建者」，还把 `/`@` 语法怼在第一句里——非开发者首屏第一眼就是 IDE 口吻。

```markdown
**Where:** `packages/client/ui-conversation/src/client/locales.ts:23` (zh dictionary)

    'placeholder.hero': '描述你想要构建的内容, / 调用指令, @ 文件或对话'

**What:** The zh placeholder addresses the user as a *builder* (「构建」) and exposes the
`/` and `@` command syntaxes in the very first line of the composer. On a product surface
aimed at non-developer users, the composer reads like IDE copy before the user has typed
anything.

**Why it matters:** Two delegated-agent readings of a real install (2026-10-04,
simulating a non-developer business persona in the Chinese UI; not human usability sessions) flagged this line as the single most confusing
first-screen text: the page says "ask a business question", the composer says "build
something" — the two sentences contradict each other.

**Suggestion:** Product-voice copy (e.g. 「说说你现在要处理的事」), and let the `/`/`@`
affordances surface progressively (or as a secondary hint) instead of leading the sentence.
```

## D2 — zh hero headline 「探索未至之境」 is poetic, not informative

**中文摘要**：主标题文艺而信息量不足；同屏我们自己写的平实欢迎语在两轮读数里都被评为最好文案。

```markdown
**Where:** `packages/client/ui-conversation/src/client/locales.ts:77`

    'hero.headline': '探索未至之境'

**What:** The zh hero headline is poetic and abstract. In the same delegated-agent persona readings (not human usability sessions),
the plain, concrete welcome line on the page (「第一次来？直接说一句你手头的经营问题就行」)
was rated the best copy on screen — the headline is the only element that does not say
what the product does for the user.

**Suggestion:** A concrete headline naming the product's job (what it remembers, what it
answers), consistent with the welcome line's voice.
```

## D3 — developer telemetry and untranslated thinking stream on the chat surface

**中文摘要**：tok/s、缓存命中、上下文% 三轮读数反复被点「机器内脏上脸」；思考流英文原文直接可见。建议收进开发者开关。

```markdown
**Where:** `packages/client/ui-chat/src/client/locale.ts:78` (`stats.cacheHit`),
`:175-176` (`message.turnUsage.*`); thinking-stream rendering in the same package.

**What:** The conversation surface shows per-turn developer telemetry — tok/s, cache-hit
percentage, context-% — inline with the answer, and the thinking preview renders the
model's raw English stream with no label. Three successive delegated-agent persona readings (not human usability sessions)
(2026-10-04) independently flagged these as 「机器内脏上脸」: noise that competes with the
answer for a non-developer's attention.

**Suggestion:** Gate the telemetry behind a developer/details toggle (global or
per-message), default off for product users; label the thinking stream (or surface a
localized summary) instead of raw English text.
```

## D4 — tool change-lists render machine-absolute paths, against the repo's own `dshHomeDisplay` rule

**中文摘要**：write/edit 变更清单渲染 `…/workspaces/…/.desk/state.json` 全路径——违反 vendor 自家 `dshHomeDisplay` 的明文契约。

```markdown
**Where:** `packages/client/ui-chat` change-list rendering for `write`/`edit` tool calls.
Contrast with the repo's own rule: `packages/util/home-paths/src/index.ts:113-122` —
`dshHomeDisplay()` is documented as "Describe a resolved harness home symbolically for
user-facing display… It never returns an absolute machine path."

**What:** Tool cards render the full machine path of written files
(`…/workspaces/…/.desk/state.json`). This surfaced in a real session (2026-10-04): the
change list showed the harness home's absolute location to the user.

**Why it matters:** It leaks machine layout to the user, and the repo already owns a
discipline saying user-facing display never carries absolute machine paths — the client
surface is currently the exception to its own rule.

**Suggestion:** Render workspace-relative or display-name paths; keep the absolute path
in the copyable details layer only.
```

## D5 — document preview renders raw markdown incl. YAML frontmatter

**中文摘要**：侧栏文件预览直接开原始 md，YAML 头一字不落上脸；我方服务链已剥 frontmatter，唯独预览面露。

```markdown
**Where:** `packages/client/ui-sidebar-documentpreview` (file resource preview).

**What:** Previewing a markdown file renders it verbatim, including the YAML frontmatter
block (`---\nstatus: draft\n…`). The assistant product's own serving layer strips
frontmatter before excerpts reach panels, so the preview is the only surface where the
raw header meets the user — observed on a real install (2026-10-04).

**Suggestion:** Hide frontmatter in preview (or render selected fields as metadata chips
above the body), so the document reads as a document.
```

## D6 — zh panel name 「轨迹」 (trajectory) is mechanism jargon for product users

**中文摘要**：轨迹面板/工具栏整包机制词；我们自己的同类改词（线索→在跟的事）落地后读数良好，这是 vendor 面的同类项。

```markdown
**Where:** `packages/client/ui-trajectory/src/client/locales.ts:8-9,20,131`
（`view.trajectory`: '轨迹', 'toolbar.aria': '轨迹工具栏', 'toolbar.search': '搜索轨迹',
'history.loadingTrajectory': '正在加载轨迹…'）.

**What:** The trajectory panel's zh vocabulary is mechanism-speak. Delegated-agent persona readings (not human usability sessions)
(2026-10-04) flagged 「轨迹」 as jargon on a product surface aimed at non-developers.
For comparison: renaming the assistant product's 「线索」 to 「在跟的事」 (same campaign)
measurably improved the readings.

**Suggestion:** Product-voice naming for the panel and its toolbar strings (what the user
gets from it, not what the machine calls it).
```

---

## 递交清单（放行后执行）

1. ~~你指定渠道~~ 已定：deepseek-harness **Discussions · Ideas**（2026-10-05 查证，README/CONTRIBUTING 明文路由）。
2. 执行路径：① `gh auth login -h github.com` 重认证后 agent 经 gh api 代发 6 帖；或 ② 手贴（标题取下表、正文取对应块）。
3. 贴完在本档与台账逐条记「已递 + 链接」，台账行状态 稳定候选 → 已递交。
4. D3 若上游倾向拆分（遥测与思考流两事），拆两帖的文本我已备好口径。
