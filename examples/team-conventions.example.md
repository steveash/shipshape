# Example team conventions file

Pass a file like this with `--conventions` (or list it in your profile) to
steer every assessor with your team's context. Top-level prose reaches all
agents; `## assessor:<id>` sections reach only that assessor.

We are the Payments Platform team. Our repos follow the org-wide
"golden-path" conventions:

- Specs live in Notion, not the repo. Do not penalize missing in-repo design
  docs; DO check that `docs/notion-index.md` exists and links are current.
- Our blessed gate command is `make check` in every repo; anything else is
  drift.
- We deliberately run trunk-based development without PR review for
  docs-only changes; history showing direct doc commits to main is expected.

## assessor:architecture-linters

Cross-module dependency rules are enforced org-wide via `import-linter`
configs generated from `arch.toml`. Treat a repo missing `arch.toml` as L2
regardless of other tooling.

## assessor:security-reviewer

Our threat context lives in `SECURITY-NOTES.md` (not THREAT_MODEL.md).
Payment-token handling paths (`**/tokens/**`) are the crown jewels; any fix
branch touching them should be flagged for mandatory human security review.
