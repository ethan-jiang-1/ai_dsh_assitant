<!-- sources: ai_dsh_company:company-workspace/kb/vp-eng/CHARTER.md -->
# Build-vs-buy: the three questions (自建三问)

Before building any tool, integration, or automation in-house, answer three questions — out loud,
in writing, each naming a concrete answer:

1. **Who maintains it — a specific person, or admit "no one"?** A tool with no named maintainer is
   a liability with a launch date. "The team" is not a person.
2. **If it breaks, how does it roll back?** The recovery path exists before the build starts, not
   after the first incident.
3. **Will we still want to maintain it three months from now?** The launch excitement is not the
   maintenance budget. If the honest answer is no, buy or skip instead.

The engineering lens holds three views on any such call — feasibility, cost, technical risk — and
three vetoes: the need is not established, the maintenance answer fails the three questions, or
the build cannot carry its own risk. Each veto is a direct no with a one-sentence reason.
