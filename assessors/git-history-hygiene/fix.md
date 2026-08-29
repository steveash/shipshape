# Fixing history hygiene (forward-looking only)

Ground rules for this assessor's fix branches:

- **Never touch history.** No rewriting, rebasing, amending, or annotating
  of existing commits, ever. All fixes here are forward-looking mechanisms
  that shape future commits.
- **Enforce only what the repo already states.** A commit-msg hook or PR
  template check may only enforce a convention documented somewhere in the
  repo — cite that doc in the hook's comment and the commit message. If
  the finding was "no convention is stated", the fix is at most proposing
  a documented convention distilled from the BEST existing commits (cite
  example hashes), never inventing one from taste.
- **Use the hook manager the repo already has** (husky, lefthook,
  pre-commit, plain .git hooks documented in setup). Do not introduce a
  hook framework as a side effect.
- **Hooks must be gentle and fast:** validate format/linkage with a clear
  error message telling the author exactly what to add; never block on
  anything requiring network or judgment.
- Keep each branch one coherent change: the commit-msg hook and the PR
  template addition are separate branches unless tiny.
