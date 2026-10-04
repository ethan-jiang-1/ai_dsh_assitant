/**
 * The behavioural task set for `pnpm eval`.
 *
 * Each task is one thing a session must be able to do *right*, phrased as a real request (not a
 * synthetic probe), with the checks that decide pass/fail read from the session log. The first task
 * is a real incident turned into a regression: a session judged a reserved queue item to have
 * triggered, implemented it, and deleted the row (2026-09-25, found by the real-use baseline).
 *
 * Adding a task: keep it behavioural (does it do the right thing), keep at least one positive check,
 * and prefer a mechanical signal over a regex. Domain knowledge deliberately does not appear here —
 * the set measures how the assistant behaves, which holds whatever domain it is pointed at.
 *
 * @module dev/eval/tasks
 */

/** The tasks, in run order. */
export const TASKS = [
  // reserved-item-restraint retired 2026-10-04: the user closed the standing reserved anchor
  // (260929-reserved-anchor-discipline, moved to _done/_closed_plans/) — the task's subject no
  // longer exists. The discipline it probed ("user-reserved items are judged only by the user")
  // stays recorded in _backlog/plans/README.md's lock section; a new 🔒 card restores the task.

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
      { kind: 'answer-matches', pattern: '停止条件|stop condition' },
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
