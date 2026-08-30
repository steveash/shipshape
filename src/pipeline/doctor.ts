// Doctor mode (spec 060): fix-plan -> fix -> review -> [revise -> re-review]
// -> doctor-report. Branches are staged locally in the target repos via
// dedicated worktrees under the run directory; nothing is ever pushed.

import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';
import { AgentRunner } from '../core/agent.js';
import { providerEnv, type ResolvedProfile } from '../core/config.js';
import { TaskGraph, graphFilePath, type NewTask } from '../core/graph.js';
import {
  addWorktree,
  addWorktreeExisting,
  branchExists,
  commitsOn,
  assessedBase,
  diffAgainst,
  diffStat,
  isClean,
  removeWorktree,
} from '../core/gitops.js';
import { log } from '../core/log.js';
import { parseReview, validateAssessorReport } from '../core/reportio.js';
import type { AssessorDef, FixRecord, RunManifest, TargetSet, TaskNode } from '../core/types.js';
import {
  conventionsBlock,
  fixInstructions,
  joinBlocks,
  reconBlock,
  targetsBlock,
} from './prompts.js';

export interface DoctorRunOptions {
  runDir: string;
  targetSet: TargetSet;
  resolved: ResolvedProfile;
  only: string[];
  maxBranches: number | null;
}

const FIX_TOOLS = ['Read', 'Glob', 'Grep', 'Write', 'Edit', 'Bash'];
const REVIEW_TOOLS = ['Read', 'Glob', 'Grep', 'Write', 'Bash'];

const fixPlanSchema = z.object({
  fixes: z.array(
    z.object({
      slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
      targetPath: z.string(),
      findings: z.array(z.number().int()),
      planSummary: z.string().min(1),
      impact: z.enum(['high', 'medium', 'low']),
      effort: z.enum(['small', 'medium', 'large']),
      dependsOn: z.array(z.string()).default([]),
    }),
  ),
});

export async function runDoctor(opts: DoctorRunOptions): Promise<{ failed: number }> {
  const { runDir, targetSet, resolved } = opts;
  const { profile } = resolved;
  const doctorDir = join(runDir, 'doctor');
  mkdirSync(join(doctorDir, 'plans'), { recursive: true });
  mkdirSync(join(doctorDir, 'reviews'), { recursive: true });
  mkdirSync(join(doctorDir, 'worktrees'), { recursive: true });

  const graph = TaskGraph.load(graphFilePath(join(runDir, 'doctor')), profile.concurrency);
  const runner = new AgentRunner({
    runDir,
    models: profile.models,
    maxTurnsDefault: profile.budgets.maxTurnsPerTask,
    maxUsd: profile.budgets.maxUsd,
    extraEnv: providerEnv(profile.provider),
    onBudgetExceeded: () => graph.stop(),
  });

  const byId = new Map(resolved.assessors.map((a) => [a.id, a]));
  const fixesFile = join(doctorDir, 'fixes.json');
  const records = new Map<string, FixRecord>(
    existsSync(fixesFile)
      ? (JSON.parse(readFileSync(fixesFile, 'utf8')) as FixRecord[]).map((r) => [r.slug, r])
      : [],
  );
  const persistRecords = (): void => {
    writeFileSync(fixesFile, JSON.stringify([...records.values()], null, 2));
  };

  // Which assessors have fixable reports?
  const fixableAssessors = resolved.assessors.filter((a) => {
    if (opts.only.length > 0 && !opts.only.includes(a.id)) return false;
    if (!a.hasFix) return false;
    const v = validateAssessorReport(join(runDir, 'assessors', a.id, 'report.md'), a.id);
    return v.ok && v.report !== undefined && v.report.frontmatter.fixable;
  });
  if (fixableAssessors.length === 0) {
    throw new Error('no assessor reports with fixable findings found in this run directory');
  }
  log.info(`doctor: ${fixableAssessors.length} assessors have fixable findings`);

  const worktreeFor = (slug: string): string => join(doctorDir, 'worktrees', slug);

  // The user's working trees must stay untouched through all of doctor mode:
  // fixes happen only in dedicated worktrees. Verify after every task that
  // runs an agent outside a worktree.
  const cleanAtStart = new Map<string, boolean>(
    targetSet.targets.filter((t) => t.isGitRepo).map((t) => [t.path, isClean(t.path)]),
  );
  // Fix branches accepted under --max-branches (resume counts prior work).
  let acceptedFixCount = [...records.values()].filter(
    (r) => r.status !== 'planned' && r.status !== 'dropped',
  ).length;

  const verifyWorkingTreesUntouched = (taskId: string): void => {
    for (const [path, wasClean] of cleanAtStart) {
      if (wasClean && !isClean(path)) {
        throw new Error(
          `${taskId} modified the working tree of ${path}; doctor agents may only write inside their worktrees. Inspect and clean the repo, then resume.`,
        );
      }
    }
  };

  graph.on('fix-plan', async (task) => {
    const assessorId = task.params.assessorId as string;
    const def = byId.get(assessorId);
    if (!def) throw new Error(`unknown assessor ${assessorId}`);
    const reportDir = join(runDir, 'assessors', assessorId);
    const planPath = join(doctorDir, 'plans', `${assessorId}.json`);
    const prompt = joinBlocks(
      `# Fix planning for assessor: ${def.title} (${def.id})`,
      fixInstructions(def),
      `## Your job: plan fix branches

Re-read YOUR OWN prior assessment report at ${join(reportDir, 'report.md')} and its resources under ${join(reportDir, 'resources')}. Then check the current state of the target repositories — the repo may have moved since the report; silently drop findings that no longer apply and note dropped ones in your summary.

Turn the findings marked "**Fix:**" into a plan of git branches. Each branch is one coherent, independently-reviewable change (group related findings; split unrelated ones). For each: a kebab-case slug (short, descriptive), the absolute targetPath of the repo it changes, the finding numbers addressed, a 2-4 sentence planSummary of exactly what will change, impact (high/medium/low = how much it raises this practice's maturity), effort (small/medium/large = human review effort), and dependsOn (slugs from THIS plan that must merge first, e.g. a doc that a later branch references).

Only plan safe, reviewable changes. A finding too large or risky to stage should be listed in your reply as deliberately not staged, with the reason — it will be reported to humans rather than silently lost.

Write your plan to ${join(doctorDir, 'plans', assessorId, 'plan.json')} — this exact absolute path; write nothing anywhere else, and never into the target repositories:
{ "fixes": [ { "slug", "targetPath", "findings": [n], "planSummary", "impact", "effort", "dependsOn": [] } ] }

Then reply with a summary including any dropped or not-staged findings.`,
      targetsBlock(targetSet),
      reconBlock(runDir),
      conventionsBlock(profile.conventions, def.id),
      retryContext(task),
    );
    const planWorkDir = join(doctorDir, 'plans', assessorId);
    mkdirSync(planWorkDir, { recursive: true });
    const result = await runner.run({
      taskId: task.id,
      tier: 'judge',
      prompt,
      systemPrompt: `You are the '${def.id}' assessor of shipshape in fix-planning mode. You plan precise, minimal, reviewable changes. You never plan changes outside the findings you previously reported.`,
      cwd: planWorkDir,
      tools: ['Read', 'Glob', 'Grep', 'Write'],
      maxTurns: 30,
    });
    if (!result.ok) throw new Error(result.error ?? 'fix-plan agent failed');
    const rawPlanPath = join(planWorkDir, 'plan.json');
    // Prefer the file; fall back to JSON embedded in the reply.
    let rawPlan: unknown;
    if (existsSync(rawPlanPath)) {
      rawPlan = JSON.parse(readFileSync(rawPlanPath, 'utf8'));
    } else {
      const m = /\{[\s\S]*"fixes"[\s\S]*\}/.exec(result.text);
      if (!m) throw new Error(`fix-plan agent wrote neither ${rawPlanPath} nor inline JSON`);
      rawPlan = JSON.parse(m[0]);
      writeFileSync(rawPlanPath, JSON.stringify(rawPlan, null, 2));
    }
    const parsed = fixPlanSchema.safeParse(rawPlan);
    if (!parsed.success) throw new Error(`plan.json invalid: ${parsed.error.message}`);
    verifyWorkingTreesUntouched(task.id);
    writeFileSync(planPath, JSON.stringify(parsed.data, null, 2));
    if (result.text.trim().length > 0) {
      writeFileSync(join(doctorDir, 'plans', `${assessorId}-notes.md`), result.text);
    }

    const newTasks: NewTask[] = [];
    for (const fix of parsed.data.fixes) {
      const slug = `${assessorId}--${fix.slug}`;
      const target = targetSet.targets.find((t) => t.path === fix.targetPath);
      if (!target || !target.isGitRepo) {
        log.warn(`fix ${slug}: targetPath ${fix.targetPath} is not a known git target; dropping`);
        continue;
      }
      if (!records.has(slug)) {
        records.set(slug, {
          slug,
          assessorId,
          branch: `shipshape/${assessorId}/${fix.slug}`,
          baseBranch: assessedBase(fix.targetPath),
          status: 'planned',
          findings: fix.findings,
          planSummary: fix.planSummary,
          impact: fix.impact,
          effort: fix.effort,
          dependsOn: fix.dependsOn.map((d) => `${assessorId}--${d}`),
          verdict: null,
          blocking: [],
          advisory: [],
          targetPath: fix.targetPath,
        });
      }
      const deps = [task.id, ...fix.dependsOn.map((d) => `fix:${assessorId}--${d}`)];
      newTasks.push({ id: `fix:${slug}`, type: 'fix', deps, params: { slug } });
      newTasks.push({
        id: `review:${slug}`,
        type: 'review',
        deps: [`fix:${slug}`],
        params: { slug, round: 0 },
      });
    }
    persistRecords();
    return { newTasks };
  });

  graph.on('fix', async (task) => {
    const slug = task.params.slug as string;
    const record = records.get(slug);
    if (!record) throw new Error(`no fix record for ${slug}`);
    const def = byId.get(record.assessorId);
    if (!def) throw new Error(`unknown assessor ${record.assessorId}`);
    if (opts.maxBranches !== null && record.status === 'planned') {
      // Claim a slot synchronously before any await so concurrent fix tasks
      // cannot all pass the check at once.
      if (acceptedFixCount >= opts.maxBranches) {
        records.set(slug, { ...record, status: 'dropped' });
        persistRecords();
        return { note: `dropped: --max-branches ${opts.maxBranches} reached` };
      }
      acceptedFixCount += 1;
    }

    const wt = worktreeFor(slug);
    // Base on a dependency's branch when declared so the diff stacks cleanly.
    const lastDep = record.dependsOn[record.dependsOn.length - 1];
    const base = lastDep ? (records.get(lastDep)?.branch ?? record.baseBranch) : record.baseBranch;
    if (!existsSync(wt)) {
      if (branchExists(record.targetPath, record.branch)) {
        addWorktreeExisting(record.targetPath, wt, record.branch);
      } else {
        addWorktree(record.targetPath, wt, record.branch, base);
      }
    }

    const reportDir = join(runDir, 'assessors', record.assessorId);
    const prompt = joinBlocks(
      `# Implement fix branch: ${record.branch}`,
      `## The plan for this branch

${record.planSummary}

Findings addressed: ${record.findings.join(', ')} — re-read them in your assessment report at ${join(reportDir, 'report.md')} (resources under ${join(reportDir, 'resources')}).`,
      fixInstructions(def),
      `## Working rules

- Your current working directory is a dedicated git worktree already on branch ${record.branch}. Work ONLY here.
- Implement exactly this branch's plan — no opportunistic extra changes, no fixes for findings assigned to other branches.
- Make small, logically-separate commits with clear conventional messages explaining WHY.
- If the repository documents a quality gate or test command, run it (Bash) and make it pass for your changes; report the honest result in your final commit message body. If you cannot run it, say so in the commit body.
- Update any documentation the repo's own conventions require updating alongside such a change, in the same commit.
- Commit ALL your work before finishing; a dirty worktree fails this task.
- Never push, never touch other branches.`,
      conventionsBlock(profile.conventions, def.id),
      retryContext(task),
    );
    const result = await runner.run({
      taskId: task.id,
      tier: 'fix',
      prompt,
      systemPrompt: `You are the '${def.id}' assessor of shipshape in fix mode: a careful engineer staging a reviewable improvement branch. You keep diffs minimal and honest; you never claim a check passed that you did not run.`,
      cwd: wt,
      tools: FIX_TOOLS,
    });
    if (!result.ok) {
      records.set(slug, { ...record, status: 'failed' });
      persistRecords();
      throw new Error(result.error ?? 'fix agent failed');
    }
    if (!isClean(wt)) {
      records.set(slug, { ...record, status: 'failed' });
      persistRecords();
      throw new Error('fix agent left uncommitted changes in its worktree');
    }
    const commits = commitsOn(record.targetPath, base, record.branch);
    if (commits.length === 0) {
      records.set(slug, { ...record, status: 'failed' });
      persistRecords();
      throw new Error('fix branch has no commits');
    }
    records.set(slug, { ...record, status: 'implemented' });
    persistRecords();
  });

  graph.on('review', async (task) => {
    const slug = task.params.slug as string;
    const round = (task.params.round as number) ?? 0;
    const record = records.get(slug);
    if (!record) throw new Error(`no fix record for ${slug}`);
    if (record.status === 'dropped') return { note: 'fix was dropped; nothing to review' };
    const def = byId.get(record.assessorId);
    if (!def) throw new Error(`unknown assessor ${record.assessorId}`);

    const lastDep = record.dependsOn[record.dependsOn.length - 1];
    const base = lastDep ? (records.get(lastDep)?.branch ?? record.baseBranch) : record.baseBranch;
    const diff = diffAgainst(record.targetPath, base, record.branch);
    const stat = diffStat(record.targetPath, base, record.branch);
    const diffPath = join(doctorDir, 'reviews', `${slug}.diff`);
    writeFileSync(diffPath, diff);

    const reviewers = selectReviewers(resolved.assessors, def, diff);
    const verdicts: {
      reviewer: string;
      verdict: string;
      blocking: string[];
      advisory: string[];
    }[] = [];
    for (const reviewer of reviewers) {
      const suffix = reviewer.id === reviewers[0]?.id ? '' : `.${reviewer.id}`;
      const reviewPath = join(doctorDir, 'reviews', `${slug}${suffix}.md`);
      const wt = worktreeFor(slug);
      const prompt = joinBlocks(
        `# Adversarial review of fix branch: ${record.branch}`,
        `You are reviewing as the '${reviewer.id}' assessor (${reviewer.title}). The fix was produced by the '${record.assessorId}' assessor to address these findings from its report (${join(runDir, 'assessors', record.assessorId, 'report.md')}): ${record.findings.join(', ')}.

Plan the fix claimed to implement:
${record.planSummary}

Diff stat:
${stat}

The full diff is at ${diffPath}. The branch is checked out at ${existsSync(wt) ? wt : record.targetPath} for deeper inspection (read-only for you; run the repo's checks with Bash if useful, but make no commits).`,
        `## Review rules

- Do NOT assume the fix works because it says so. Verify claims against the diff and the repository. Run documented checks when feasible.
- Check the change is consistent with the best practices the whole assessor library promotes — a fix must not lower another practice's maturity (e.g. bloating AGENTS.md to document something, adding an unenforced rule where a hook belongs).
- Check scope: only the named findings, no unrelated changes smuggled in.
- Do not rubber-stamp; do not nitpick style the repo's own linters would catch.
- Blocking items are things a human should not have to discover; advisory items are worth noting but mergeable.

Write your review to ${reviewPath} with YAML frontmatter:

---
verdict: approve | revise | reject
blocking: ["..."]   # required non-empty for revise/reject
advisory: ["..."]
---

followed by your reasoning with citations into the diff.`,
        conventionsBlock(profile.conventions, reviewer.id),
      );
      const result = await runner.run({
        taskId: `${task.id}#${reviewer.id}`,
        tier: 'review',
        prompt,
        systemPrompt: `You are the '${reviewer.id}' assessor of shipshape acting as an adversarial reviewer. You verify rather than trust, and you never approve weak work to be agreeable.`,
        cwd: doctorDir,
        tools: REVIEW_TOOLS,
        maxTurns: 30,
      });
      if (!result.ok) throw new Error(`reviewer ${reviewer.id}: ${result.error ?? 'failed'}`);
      const parsed = parseReview(reviewPath);
      if (!parsed.ok || !parsed.review) {
        throw new Error(
          `reviewer ${reviewer.id} wrote invalid review: ${parsed.errors.join('; ')}`,
        );
      }
      verdicts.push({ reviewer: reviewer.id, ...parsed.review });
    }

    verifyWorkingTreesUntouched(task.id);
    const worst = worstVerdict(verdicts.map((v) => v.verdict));
    const blocking = verdicts.flatMap((v) => v.blocking.map((b) => `[${v.reviewer}] ${b}`));
    const advisory = verdicts.flatMap((v) => v.advisory.map((a) => `[${v.reviewer}] ${a}`));

    if (worst === 'approve') {
      records.set(slug, { ...record, status: 'approved', verdict: 'approve', blocking, advisory });
      persistRecords();
      return;
    }
    if (worst === 'reject' || round >= 1) {
      records.set(slug, {
        ...record,
        status: 'rejected',
        verdict: worst === 'reject' ? 'reject' : 'revise',
        blocking,
        advisory,
      });
      persistRecords();
      return {
        note: round >= 1 ? 'still not approved after revision; rejected' : 'rejected by review',
      };
    }
    // revise, round 0: one bounded revision cycle.
    records.set(slug, { ...record, status: 'revised', verdict: 'revise', blocking, advisory });
    persistRecords();
    return {
      newTasks: [
        { id: `revise:${slug}`, type: 'revise', deps: [task.id], params: { slug } },
        {
          id: `review2:${slug}`,
          type: 'review',
          deps: [`revise:${slug}`],
          params: { slug, round: 1 },
        },
      ],
    };
  });

  graph.on('revise', async (task) => {
    const slug = task.params.slug as string;
    const record = records.get(slug);
    if (!record) throw new Error(`no fix record for ${slug}`);
    const def = byId.get(record.assessorId);
    if (!def) throw new Error(`unknown assessor ${record.assessorId}`);
    const wt = worktreeFor(slug);
    if (!existsSync(wt)) addWorktreeExisting(record.targetPath, wt, record.branch);
    const prompt = joinBlocks(
      `# Revise fix branch: ${record.branch}`,
      `An adversarial review found blocking problems with this branch. Address every blocking item (or, if one is genuinely wrong, leave the code as-is and explain why in a commit message body — the re-review will judge).

Blocking items:
${record.blocking.map((b) => `- ${b}`).join('\n')}

Advisory (fix if cheap):
${record.advisory.map((a) => `- ${a}`).join('\n')}`,
      `## Working rules

Same as the original fix: work only in this worktree on this branch, commit everything, keep scope to this branch's findings, run documented checks when feasible and report honestly.`,
      conventionsBlock(profile.conventions, def.id),
      retryContext(task),
    );
    const result = await runner.run({
      taskId: task.id,
      tier: 'fix',
      prompt,
      systemPrompt: `You are the '${def.id}' assessor of shipshape revising a fix branch after adversarial review. You address feedback honestly rather than arguing with it, but you do not make changes you believe are wrong.`,
      cwd: wt,
      tools: FIX_TOOLS,
    });
    if (!result.ok) throw new Error(result.error ?? 'revise agent failed');
    if (!isClean(wt)) throw new Error('revise agent left uncommitted changes');
  });

  graph.on('doctor-report', async (task) => {
    persistRecords();
    const summary = [...records.values()].map((r) => ({
      slug: r.slug,
      branch: r.branch,
      assessor: r.assessorId,
      status: r.status,
      impact: r.impact,
      effort: r.effort,
      dependsOn: r.dependsOn,
      targetPath: r.targetPath,
      planSummary: r.planSummary,
      blocking: r.blocking,
      advisory: r.advisory,
    }));
    const prompt = joinBlocks(
      `# Write the review plan

All fix branches are staged and reviewed. Their structured state:

${JSON.stringify(summary, null, 2)}

Reviews (with reasoning) are under ${join(doctorDir, 'reviews')}; per-assessor fix plans and not-staged notes under ${join(doctorDir, 'plans')}; the original overall report is at ${join(runDir, 'report.md')}. Inspect branch diffs with Bash: git -C <targetPath> diff <base>...<branch> (base is the record's baseBranch unless it dependsOn another branch).`,
      `Write ${join(doctorDir, 'review-plan.md')} for the humans who will review these branches:

## How to use this plan
One paragraph: branches are local only; how to inspect (git diff main...<branch>), merge, or discard; that dependencies mean "merge after".

## Review order
A numbered table over APPROVED branches: # | branch | assessor | what it changes | maturity impact | review effort | depends on. Order by dependency edges first, then impact-per-review-minute — a reader who stops at #3 should still capture the most value. Note explicitly which branches stack on others.

## Per-branch detail
Per approved branch: findings addressed, what the diff does (verify against the actual diff, do not trust planSummary blindly), the review verdict with advisory notes, and 2-3 things a human should double-check by hand.

## Not staged
Rejected branches (branch name kept, with blocking reasons), dropped fixes, and findings the fix planners deliberately did not stage (see the plans/*-notes.md files) — with enough context that a human can still act on them manually.`,
      retryContext(task),
    );
    const result = await runner.run({
      taskId: task.id,
      tier: 'synthesize',
      prompt,
      systemPrompt:
        'You are the doctor-report agent of shipshape. You help humans review staged fix branches in the highest-value order. You verify claims against actual diffs and never oversell a change.',
      cwd: doctorDir,
      tools: ['Read', 'Glob', 'Grep', 'Write', 'Bash'],
    });
    if (!result.ok) throw new Error(result.error ?? 'doctor-report failed');
    if (!existsSync(join(doctorDir, 'review-plan.md'))) {
      throw new Error('doctor-report did not write review-plan.md');
    }
    verifyWorkingTreesUntouched(task.id);
  });

  // Seed graph: one fix-plan per fixable assessor, then the report.
  for (const a of fixableAssessors) {
    const id = `fix-plan:${a.id}`;
    if (!graph.has(id)) graph.add({ id, type: 'fix-plan', deps: [], params: { assessorId: a.id } });
  }
  // doctor-report depends on everything; add it lazily after the run of all
  // other tasks by running the graph twice: first fixes+reviews, then report.
  const summary = await graph.run();
  const reportId = 'doctor-report';
  if (!graph.has(reportId)) {
    graph.add({
      id: reportId,
      type: 'doctor-report',
      deps: graph
        .all()
        .filter((t) => t.type === 'review' && t.status === 'done')
        .map((t) => t.id),
      params: {},
    });
  }
  const summary2 = await graph.run();

  // Clean up worktrees (branches remain). The creator cleans up.
  for (const r of records.values()) {
    const wt = worktreeFor(r.slug);
    if (existsSync(wt)) {
      try {
        removeWorktree(r.targetPath, wt);
        rmSync(wt, { recursive: true, force: true });
      } catch (err) {
        log.warn(`could not remove worktree ${wt}: ${err instanceof Error ? err.message : err}`);
      }
    }
  }
  persistRecords();

  const failed = summary.failed + summary2.failed;
  const approved = [...records.values()].filter((r) => r.status === 'approved').length;
  log.info(
    `doctor complete: ${records.size} branches planned, ${approved} approved; see ${join(doctorDir, 'review-plan.md')}`,
  );
  return { failed };
}

function selectReviewers(
  assessors: (AssessorDef & { weight: number; config: Record<string, unknown> })[],
  author: AssessorDef,
  diff: string,
): AssessorDef[] {
  const reviewers: AssessorDef[] = [];
  const categoryReviewer = assessors.find(
    (a) => a.canReview && a.id !== author.id && a.reviewsCategories.includes(author.category),
  );
  const anyReviewer = assessors.find((a) => a.canReview && a.id !== author.id);
  const primary = categoryReviewer ?? anyReviewer;
  if (primary) reviewers.push(primary);
  // Security review for anything touching executable config, hooks, or CI.
  const sensitive = /\.github\/|\.claude\/|hooks|settings\.json|Makefile|\.sh\b|pre-commit/i.test(
    diff,
  );
  const security = assessors.find((a) => a.id === 'security-reviewer');
  if (sensitive && security && security.id !== primary?.id && security.id !== author.id) {
    reviewers.push(security);
  }
  return reviewers.slice(0, 2);
}

function worstVerdict(verdicts: string[]): 'approve' | 'revise' | 'reject' {
  if (verdicts.includes('reject')) return 'reject';
  if (verdicts.includes('revise')) return 'revise';
  return 'approve';
}

function retryContext(task: TaskNode): string | null {
  if (task.attempts <= 1 || !task.error) return null;
  return `## Previous attempt failed\n\nYour previous attempt failed with: ${task.error}\nAvoid repeating that failure.`;
}

export function loadManifest(runDir: string): RunManifest {
  const p = join(runDir, 'run.json');
  if (!existsSync(p)) throw new Error(`not a shipshape run directory (no run.json): ${runDir}`);
  return JSON.parse(readFileSync(p, 'utf8')) as RunManifest;
}
