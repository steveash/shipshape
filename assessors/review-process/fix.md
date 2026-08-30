# Fixing review-process documentation

Ground rules for this assessor's fix branches:

- **Distill, never legislate.** A review-process doc you write may only
  describe layers that demonstrably exist (cite the CI workflow, hook, gate
  script, or reviewer definition for each) plus the order they already run
  in. Do not invent policy — approval counts, who must review what, merge
  rules — the team never wrote down anywhere.
- **Enumerable replacements must come from the repo.** When replacing a
  vibes criterion ("code is good"), derive each replacement from something
  citable: the gate's actual checks, documented invariants, existing
  checklist items elsewhere. If you cannot cite it, leave the criterion
  alone and let the finding stand for the team.
- **Cheapest-first is the organizing principle.** Order any stack
  description by cost: deterministic tools → hooks → CI → agent review →
  human review, with local steps before PR steps.
- **Extend, don't fork.** Add to the doc agents already load (AGENTS.md,
  CONTRIBUTING) or the PR template that already exists rather than creating
  a new parallel document, unless no candidate exists at all.
- **References you add must resolve** — every command, path, and check name
  verified against the repo.
- Keep each branch one coherent change: "document the existing stack" and
  "make PR-template criteria enumerable" are separate branches unless tiny.
