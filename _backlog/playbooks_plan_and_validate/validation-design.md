---
name: validation-design
description: Turn confirmed requirements into observable acceptance criteria before implementation, using this repo's evidence owners and human judgment boundaries.
whenToUse: A confirmed plans card is heading for a doing-now/proposal judgment that needs executable acceptance; run before synthesis assesses slices or judges. Deferral, rejection and digestion exits need no matrix; not a test-plan tracker or implementation queue.
---

# Design acceptance before implementation

**Input:** a scoped plans card with confirmed behavior, constraints, alternatives, failure or recovery paths,
and explicit Out of Scope. Before proceeding, read [requirements-elicitation](requirements-elicitation.md)'s
confidence and skill-loading rules.

The purpose is to make the plan **clear to build and possible to accept**. Do not invent acceptance criteria
for an uncertain product choice: expose the uncertainty and ask the human. Technical evidence selection can be
agent-led when the behavior is already confirmed.

## 1. Partition the behavior

For every behavior that matters to the user, classify it as one or more of:

- **Deterministic logic:** parsing, state, business rules or other repeatable code behavior.
- **Model behavior:** extraction, generation, judgment, dialogue, or other model-dependent output.
- **Orchestration:** harness slots, triggers, registration, data flow or other assembly behavior.

Do not use one end-to-end demo as proof for all three. A plan may have no model behavior; do not create an eval
just because this is an agent product.

## 2. Add the acceptance matrix to the same plan

Use one row per load-bearing behavior. Keep it in a dedicated `## 验收矩阵` section of the same plan; the
`## 毕业门` section cites it as gate evidence rather than absorbing it. Do not create a second acceptance
store. Each row names:

| Field | What to record |
|---|---|
| Behavior | User-observable result and the requirement it traces to |
| Class | Deterministic logic, model behavior, or orchestration |
| Input/state | Preconditions, representative input and relevant complementary state |
| Pass/fail signal | Observable assertion, expected value source, and the failure signal |
| Negative/recovery | Failure, refusal, uncertainty, or recovery path; test the complement of conditional claims |
| Evidence owner | Existing repo owner, command or artifact path, and what it can/cannot prove |
| Human judgment | Only where taste, business value, risk, compliance or authority cannot be mechanically decided |

Use the repo's [testing evidence map](../../docs/testing.md) to choose the owner and command. Preserve source
links, versions, artifact commits and attribution for load-bearing evidence. A command finishing, a keyword being
present, one happy-path example, or a passing demo is not by itself a pass condition.

## 3. Keep the matrix executable and honest

- Deterministic behavior normally becomes a behavioral test at an existing seam. Borrow TDD's red-before-green,
  independent expected values and vertical slices; use this repo's established interface owners rather than
  turning every technical seam into a new human approval.
- Model behavior needs a bounded eval case and, for load-bearing claims, a real-model observation. Automatic
  eval is regression evidence, not a substitute for a human judgment about tone, taste, business value or risk.
- Orchestration needs the existing composition or web evidence. Use [snapshots](../../snapshots/README.md) only
  for its owned session/web replay shapes; do not prebuild a new harness in this playbook.
- For conditional claims, include both the triggering and complementary state. If proposing a new guard, prove
  its negative fixture before counting the guard as evidence.

**Done:** every load-bearing requirement has a behavior class, observable pass/fail signal, negative or
complementary case, evidence owner, and an explicitly named human judgment or an explicit “none”.
The matrix is written to travel. [plan-to-note](plan-to-note.md) rewrites its rows into a proposal's
`## 验收` when the graduation gate is doing-now. The matrix itself stays on the plan.
