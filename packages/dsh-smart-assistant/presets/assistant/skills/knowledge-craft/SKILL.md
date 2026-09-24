---
name: knowledge-craft
description: How to write good knowledge pages — what belongs in a page versus memory or a skill, how to title and interlink pages, and the review rhythm from draft to stable. Load before calling assistant_reflect save_page.
whenToUse: Before writing or updating a knowledge page; when unsure whether a piece of understanding is knowledge, memory, or a skill; when linking pages or deciding staleAfter.
---

# Knowledge craft

The knowledge room holds **reusable understanding of the domain** — concepts, entities, sources,
how things work — as interlinking pages. It is not a diary and not a junk drawer: a page earns its
place by being load-bearing for future work.

## Which room does this belong in?

- **Knowledge page**: understanding that stays roughly true and gets reused — "how the deploy
  pipeline works", "what OKF fields mean", "who owns which service". If future sessions would
  reason *from* it, it is a page.
- **Memory record**: a fact, preference, or decision **about you and your work** that may change —
  "we switched to pnpm", "the user prefers terse replies". If it can become stale, it is memory.
- **Skill**: a **procedure** — steps to accomplish something. If it answers "how do I do X", it is
  a skill, not a page.
- Rule of thumb: knowledge is *referenced*, memory is *recalled*, skills are *followed*.

## Writing a page

- **One page, one subject.** A page that covers two concepts will be linked wrongly forever.
- **The title is the link key.** Other pages resolve `[[links]]` by id first, title second —
  a vague title ("Notes on X", "Overview") breaks discoverability for every future session.
  Name pages what you would type when linking them.
- **Link as you write.** When a concept deserves its own page someday, link it now — an
  unwritten link is information ("this concept is expected to exist"), not an error. Do not
  pre-create empty stub pages; write the page when you have real content.
- **Sources are mandatory** (`save_page` enforces it): cite where the understanding came from —
  `memory:<id>`, `research:<id>`, a URL, or a repo path. Unsourced knowledge pretends to be
  established; curate reports it (`page-unproven`).
- **staleAfter only when it really expires** (an API contract that changes quarterly). Pages of
  durable understanding carry no expiry — a falsely fresh date is worse than none.

## The review rhythm

- `save_page` writes a **draft**: staged, out of search and out of the digest until a human flips
  `status` to `stable`. That flip is the review — nothing you write promotes itself, and you
  never flip it yourself.
- `deprecated` pages stay in place so old links keep resolving. Deprecate with a note on what
  replaced them, then update the pages that still cite the old one.
- Run `curate` after writing: it reports unwritten/deprecated/ambiguous links, orphans, aging
  drafts, and unproven stable pages — the machine check catches what you missed.

## Judgment

- Write the page **when the understanding has stabilized**, not at first encounter — first
  impressions belong in `research/` threads until they settle.
- Prefer updating an existing page over spawning a near-duplicate; links accumulate against the
  page that already exists.
