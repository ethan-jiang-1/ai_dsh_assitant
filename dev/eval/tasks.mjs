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
 * @module dev/eval/tasks
 */

/** The tasks, in run order. first-open-intake must stay first: its freshness trigger keys on the
 * memory room, and any task that runs before it on the same home writes memories there (found
 * live 2026-10-07, BUG-003). */
export const TASKS = [
  // reserved-item-restraint retired 2026-10-04: the user closed the standing reserved anchor
  // (260929-reserved-anchor-discipline, moved to _archive/closed/) — the task's subject no
  // longer exists. The discipline it probed ("user-reserved items are judged only by the user")
  // stays recorded in _backlog/issues/README.md's lock section; a new 🔒 card restores the task.

  {
    id: 'first-open-intake',
    // Run condition: the intake trigger needs a FRESH working folder. Two consequences:
    //  1. Standalone: run with a throwaway home (`ASSISTANT_DSH_HOME=$(mktemp -d) pnpm eval --
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
    id: 'desk-refresh-loop',
    why: 'The cultivation surface\'s server half: the panel\'s own "刷新我的桌面" must load the desk-refresh skill and really rewrite .desk/state.json from tool-derived numbers — the panel renders whatever the file says, so a reported-but-not-written refresh is a lying desk.',
    prompt: '[桌面] 刷新我的桌面：加载 desk-refresh 技能，严格按它把桌面文件重写一遍。',
    checks: [
      { kind: 'skill-loaded', skill: 'desk-refresh' },
      { kind: 'wrote-path', path: '.desk/state.json' },
      // A rewrite is not enough: a file that parses but lacks the contract shape renders as a legitimately
      // empty desk, so the principal reads "nothing happened" (live reading: 13 of the 14 panel actions that
      // named the skill never loaded it and improvised). The shape is checked here, not in front of them.
      { kind: 'file-shape', path: '.desk/state.json', required: ['generatedAt'],
        anyOf: ['counts', 'decisions', 'actions', 'gaps', 'threads', 'recentActivity', 'memories', 'knowledge', 'skills'] },
      // The skill's own rule: report the desk refreshed and name the counts, so the principal
      // can check the panel against the sentence.
      { kind: 'answer-matches', pattern: '[0-9]' },
    ],
  },
]
