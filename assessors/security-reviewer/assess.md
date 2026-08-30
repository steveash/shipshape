# Assessing the dedicated security reviewer

## Why this matters

Security review fails in a specific, measured way when bolted onto general
review: a reviewer prompt pulled in two directions — style and safety —
recalled only about 49% of known CVEs in evaluation. The fix is
separation: a **dedicated** security reviewer, plus a counterintuitive
division of labor backed by evidence. Prompt the discovery agent simply —
long prescriptive vulnerability checklists narrow its attention and reduce
novel-bug discovery — and put the durable, repo-specific knowledge in a
threat document (THREAT_MODEL.md or equivalent): this package's real attack
surfaces, known pitfalls, past incidents. The reviewer references the doc;
the doc persists across sessions and model upgrades. Around it: static
analysis (SAST/CodeQL) runs first and its findings anchor the AI reviewer;
secrets scanning is table stakes; and a blocking security gate is rolled
out shadow → PR-comment → blocking, because a gate that skips shadow mode
is calibrated to nothing.

## Evidence to gather (scan step)

1. **Hunt for the security review surface.** THREAT_MODEL.md, SECURITY.md,
   docs/security*, threat/risk sections in architecture docs;
   .claude/agents/ or .claude/commands/ security reviewer definitions; CI
   workflow jobs doing security review. Record path and role of each (up
   to `maxArtifactsToAnalyze` in depth) in
   `resources/security-surface.md`.
2. **Dedicated vs bolted-on.** Classify what you found: a dedicated
   security reviewer definition, or only a "check for security issues"
   line inside a general reviewer prompt (quote it, cite the path), or
   nothing. If a dedicated reviewer exists, check its prompt shape: simple
   discovery framing with durable context delegated to a referenced threat
   doc (good), versus a long embedded vulnerability checklist (the
   evidence says this reduces novel-bug discovery — a finding, cited
   gently).
3. **Threat context quality.** If a threat doc exists: is it
   repo-specific (names actual auth surfaces, parsers, secrets flows,
   trust boundaries found in this code) or generic OWASP boilerplate? Is
   it referenced from the reviewer definition? Does it carry maintenance
   metadata (last-reviewed, update triggers)? Spot-check two or three of
   its claims against the code and cite files.
4. **Mechanical layers.** SAST in CI (CodeQL, Semgrep, bandit, gosec…):
   present, on which triggers, and do its findings feed the AI reviewer as
   anchors or run in isolation? Secrets scanning (gitleaks,
   trufflehog, push protection config)? Cite workflow paths.
5. **Rollout discipline.** For any blocking security gate: is there
   evidence it went through shadow or comment-only mode first (workflow
   history, config comments, docs)? A gate born blocking with no
   calibration period is a finding, not a strength.
6. **Unwired configs.** Note SAST or scanner configs that exist but no
   workflow runs — configured-but-dead tooling is a cheap, high-value fix.

## Judging

- **L1** — nothing: no security review of any kind, no threat context, no
  scanning.
- **L2** — a generic "check for security issues" line in a general
  reviewer, or a boilerplate SECURITY.md, or a scanner config nothing
  runs; an agent asked to do security review here would be guessing.
- **L3** — a dedicated security reviewer definition exists AND written
  repo-specific threat context exists and is referenced from it; both
  discoverable by an arriving agent.
- **L4** — the layer is mechanical: SAST wired in CI, the security
  reviewer wired as a CI gate or hook on relevant paths, secrets scanning
  active; scanner findings reach the reviewer rather than dying in a tab.
- **L5** — the loop maintains itself: the threat model is updated on a
  cadence or per architectural change (visible in history or metadata),
  the pipeline separates finder from verifier (the verifier gets the
  finding without the finder's reasoning), and triage capacity is measured
  so the gate's signal-to-noise is known.

Judgment guidance:

- A dedicated reviewer with no threat doc, or a threat doc no reviewer
  references, is L2-L3 boundary — the pair is the practice; judge how much
  of the pair an agent can actually use.
- Do not reward checklist length. A short reviewer prompt referencing a
  rich threat doc outranks a 200-line embedded checklist.
- Repos with tiny attack surfaces (a pure-computation library) still
  benefit from a proportionate threat doc ("supply chain and malicious
  input are the concerns here"); judge proportionality, note it in
  confidence, and never demand ceremony the surface doesn't warrant.
- Cite paths for every claim, including quoted prompt lines.

## Fix marking

Mark as `**Fix:**`: creating a THREAT_MODEL.md skeleton populated ONLY with
concerns evidenced in the repo — auth surfaces, input parsing, secrets
handling actually found in the code, each with file citations; creating a
dedicated security reviewer agent definition (simple discovery prompt,
referencing the threat doc) in the harness format the repo already uses;
wiring an existing-but-unwired SAST config into CI following the repo's
workflow conventions; extracting the security line from a general reviewer
into the dedicated one. Do NOT mark: inventing threat claims not evidenced
in the code, adding a blocking gate directly (propose shadow-mode first),
or introducing SAST tooling where no config exists (opportunity, not fix).
