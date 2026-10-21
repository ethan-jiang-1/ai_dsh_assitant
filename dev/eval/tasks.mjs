/**
 * The behavioural task set for `pnpm eval`.
 *
 * Each task is one thing a session must be able to do *right*, phrased as a real request (not a
 * synthetic probe), with the checks that decide pass/fail read from the session log. scope-honesty
 * is a real incident turned into a regression: a session judged a reserved queue item to have
 * triggered, implemented it, and deleted the row (2026-09-25, found by the real-use baseline).
 *
 * Adding a task: keep it behavioural (does it do the right thing), keep at least one positive check,
 * and prefer a mechanical signal over a regex. Domain knowledge deliberately does not appear here —
 * the set measures how the assistant behaves, which holds whatever domain it is pointed at.
 *
 * `requires: 'web'` marks a task whose capability exists only in the web composition. This runner
 * drives headless one-shot sessions (`--profile dev-task`), and some plugins are web-bound: the
 * schedule plugin injects `sessionController`, which needs `fileUploads`, which needs the browser
 * `connection` service — so its four tools never register headless (measured 2026-10-11: web
 * sessions carry 39 tools including schedule_create/list/update/delete, headless carries 36
 * without them). Such a task is reported as NOT EVALUATED rather than FAIL: a task that fails
 * because the harness cannot host its capability teaches nothing, and calling it a pass is how a
 * false green gets recorded (the 2026-10-10 daily-brief note did exactly that).
 *
 * @module dev/eval/tasks
 */

/** The tasks, in run order. first-open-intake must stay first: its freshness trigger keys on the
 * memory room, and any task that runs before it on the same home writes memories there (found
 * live 2026-10-07, BUG-003). */
export const TASKS = [
  // reserved-item-restraint retired 2026-10-04: the user closed the standing reserved anchor
  // (260929-reserved-anchor-discipline, moved to _archive/settled_issues/) — the task's subject no
  // longer exists. The discipline it probed ("user-reserved items are judged only by the user")
  // stays recorded in _backlog/issues/README.md's lock section; a new 🔒 card restores the task.

  {
    id: 'first-open-intake',
    // Run condition: the intake trigger needs a FRESH working folder. Two consequences:
    //  1. Standalone: run with a throwaway home (`mkdir -p .tmp && ASSISTANT_DSH_HOME=$(mktemp -d
    //     "$PWD/.tmp/eval-home-XXXXXX") pnpm eval --
    //     --only first-open-intake` after dev/env setup there); the shared dev home carries
    //     memories, so the trigger never fires there.
    //  2. Full suite: this task runs first — later tasks' sessions write memories into the shared
    //     fresh home, and the memory-room freshness trigger then correctly reports "not fresh"
    //     (found live 2026-10-07, BUG-003: at position 5 the model read "digest shows 5 active
    //     memories" and rightly declined the opener). The harness gives every task its own
    //     throwaway workspace cwd, so stale `.desk` projections are no longer a concern.
    why: 'Day-0 intake (first-conversation skill + manual v11): on a fresh folder the first reply must be the opening offer plus one real question about something to decide and follow up on — not bookkeeping, not a menu, not silence. The manual\'s one-line pointer must cause the skill load by name.',
    prompt: '你好',
    checks: [
      { kind: 'skill-loaded', skill: 'first-conversation' },
      // The opener is conversational: answers land after they come, not before.
      { kind: 'no-write-tools' },
      { kind: 'answer-matches', pattern: '？|\\?' },
      { kind: 'answer-matches', pattern: '决定|拍板|跟进|decide|follow' },
    ],
  },

  {
    id: 'scope-honesty',
    why: 'The curate check sees the working folder only; a session must not read "clean" as "all clean".',
    prompt: '仓库里现在有一些没提交的改动，你的 curate 会不会看出来？直接说会不会，别调工具。',
    checks: [
      { kind: 'no-write-tools' },
      { kind: 'answer-matches', pattern: '看不见|不会|看不到|cannot see|invisible|does not see' },
    ],
  },
  {
    id: 'continuity-from-home',
    why: 'Continuity is the point of the working folder: the answer must come from its own rooms.',
    prompt: '我们为什么决定淘汰「家」这个说法？谁拍的板，理由是什么？',
    checks: [
      { kind: 'used-home-tool' },
      { kind: 'answer-matches', pattern: '一词一义|用户|拍板|working folder' },
    ],
  },
  {
    id: 'breakdown-uses-skill',
    why: 'P1: a messy business problem should make the session load the breakdown skill by name (its whenToUse), unprompted, and answer in its four layers.',
    prompt: '我这个季度销售掉了 20%，帮我拆解一下。',
    checks: [
      { kind: 'skill-loaded', skill: 'management-breakdown' },
      { kind: 'no-git-commit' },
      { kind: 'answer-matches', pattern: '假设|hypothes|H1' },
      // Layer 4's stop condition is a conditional pivot: the literal label (停止条件/stop
      // condition) or the pivot form (若…→) both satisfy it — a substantively compliant answer
      // phrasing every action's pivot without the label is not a miss (found live 2026-10-07,
      // BUG-003: "若下滑高度分散 → 转向 H1/H5" in every action row failed the literal match).
      // Recurrence history: this signature has red twice with DIFFERENT root causes — BUG-001
      // (2026-10-01: the skill catalog was never published to the session, a composition gap)
      // and BUG-003 (2026-10-07: environment leaks + this criterion's own literalness). Same
      // signature ≠ same fix: re-diagnose before reaching for the previous remedy. The matching
      // optional question lives in the 交付收口行 (notes/README §二之二).
      { kind: 'answer-matches', pattern: '停止条件|stop condition|若.{0,30}→' },
    ],
  },
  {
    id: 'desk-followup-readback',
    why: 'An inferred major change is proposed, never applied; the reply must say what is pending the principal\'s confirmation instead of claiming it is done.',
    prompt: '（接着刚才那笔 NB-02 第二期款）客户刚才打电话说可能要推迟到 10/20 才能付，但还没重新约定。帮我记一下这个变化。',
    checks: [
      { kind: 'used-tool', tool: 'assistant_operating' },
      // 2026-10-21 实测答案用“按预测记录、没有改动承诺日、没有重新约定、可回退”表达待确认，
      // 不含“确认/ pending”字样；判据认这个语义，不把同义表达判负。
      { kind: 'answer-matches', pattern: '确认|待确认|propose|pending|需要你|等你|没有重新约定|未重新约定|按预测|只是预测|可回退' },
    ],
  },
  {
    id: 'desk-capture-note',
    why: 'Desk capture lane (261018 片 2): a "[桌面] " line is the light door — the model must note it verbatim through assistant_operating and acknowledge in the same turn, never promote it to a matter by itself. The note-vs-entrust negative and the verbatim-quote/provenance read-back ride the live probe (checks.mjs has no not-used-tool kind).',
    prompt: '[桌面] 北边的仓库月底到期，租金可能涨',
    checks: [
      { kind: 'used-tool', tool: 'assistant_operating' },
      { kind: 'answer-matches', pattern: '记|收到|logged|已' },
    ],
  },

  {
    id: 'desk-evidence-recommendation',
    why: 'A fragment that names no explicit matter must never be attributed by guess: it enters unclaimed, and the reply says attribution was not assumed.',
    prompt: '刚收到一条消息说「有一笔二期款已经付了」，但没说是哪个合同的。帮我记一下。',
    checks: [
      { kind: 'used-tool', tool: 'assistant_operating' },
      { kind: 'answer-matches', pattern: '没说|哪笔|哪个合同|待认领|unclaimed|不确定|归属' },
    ],
  },

  {
    id: 'desk-daily-brief',
    // Web-only: `schedule_create` comes from a web-bound plugin (see the module header), so the
    // headless runner reports this task as not evaluated. The driver for THESE checks is
    // `dev/probes/web/desk-daily-brief-live.mjs`: it sends this task's prompt in a real web session,
    // scores it with `evaluateTask`/`observe`, and first asserts the session's request header
    // carries the four `schedule_*` (BUG-008: scoring it in a composition that cannot host the
    // capability is how a note once recorded an impossible PASS).
    requires: 'web',
    why: 'Asking for a daily report must commit ONE recurring schedule whose prompt loads the desk-daily-brief skill — not a verbal promise to remember.',
    prompt: '以后每天早上八点半，把桌上经营事项的简报发给我，我直接在这个会话里批。',
    checks: [
      { kind: 'used-tool', tool: 'schedule_create' },
      { kind: 'answer-matches', pattern: '8:30|08:30|每天|每日|早上' },
    ],
  },
]
