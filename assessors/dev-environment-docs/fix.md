# Fixing development environment docs

Ground rules for this assessor's fix branches:

- **Every command you write must be evidenced in-repo.** An install step
  you add must come from somewhere real — a CI workflow, a Dockerfile,
  a lockfile's ecosystem conventions, another doc — and the commit
  message must cite that source. Never invent a setup procedure.
- **Reconcile toward reality.** When docs contradict each other, the
  version that matches the repo's actual scripts/config wins. Mark it
  canonical, convert the others to pointers, and cite the config
  evidence (e.g. the package.json script) in the commit message.
- **Matrices come from manifests.** A per-package command matrix must be
  built from each package's own manifest/scripts, with every entry
  verified to exist. Packages with no distinct commands need no row —
  do not pad the matrix.
- **Stay in the docs lane.** Fix documentation only: do not create gate
  scripts, modify CI, or change package scripts. If a finding needs
  those, leave it for the enforcement-category assessors.
- **Paths and commands you write must resolve** against the repo's
  config; state in the commit body how each was verified (this assessor
  does not execute).
- Keep each branch one coherent change: "add install step" and
  "reconcile test-command docs" are separate branches unless tiny.
