// Report mode (spec 050): recon -> plan -> assess:<id> fan-out -> synthesize.
// Handlers compose prompts, run agents through the AgentRunner, and validate
// outputs; the task graph provides resume and failure isolation.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { z } from 'zod';
import { AgentRunner } from '../core/agent.js';
import { providerEnv, type ResolvedProfile } from '../core/config.js';
import { TaskGraph, graphFilePath, type NewTask } from '../core/graph.js';
import { log } from '../core/log.js';
import { validateAssessorReport } from '../core/reportio.js';
import type { AssessorDef, RunManifest, TargetSet, TaskNode } from '../core/types.js';
import {
  MATURITY_SCALE,
  assessorConfigBlock,
  assessorInstructions,
  conventionsBlock,
  joinBlocks,
  reconBlock,
  reportContract,
  targetsBlock,
} from './prompts.js';

export interface ReportRunOptions {
  runDir: string;
  targetSet: TargetSet;
  resolved: ResolvedProfile;
  /** Restrict to these assessor ids (CLI --assessor). Empty = all. */
  only: string[];
  shipshapeVersion: string;
}

const READ_WRITE_TOOLS = ['Read', 'Glob', 'Grep', 'Write', 'Edit'];

const planSchema = z.object({
  assessors: z.array(
    z.object({
      id: z.string(),
      run: z.boolean(),
      reason: z.string().default(''),
      focus: z.string().default(''),
    }),
  ),
});

export async function runReport(opts: ReportRunOptions): Promise<{ failed: number }> {
  const { runDir, targetSet, resolved } = opts;
  const { profile } = resolved;
  const activeAssessors = resolved.assessors.filter(
    (a) => opts.only.length === 0 || opts.only.includes(a.id),
  );
  mkdirSync(runDir, { recursive: true });
  writeManifest(opts);

  const graph = TaskGraph.load(graphFilePath(runDir), profile.concurrency);
  const runner = new AgentRunner({
    runDir,
    models: profile.models,
    maxTurnsDefault: profile.budgets.maxTurnsPerTask,
    maxUsd: profile.budgets.maxUsd,
    extraEnv: providerEnv(profile.provider),
    onBudgetExceeded: () => graph.stop(),
  });

  const byId = new Map(activeAssessors.map((a) => [a.id, a]));

  graph.on('recon', async (task) => {
    const outDir = join(runDir, 'recon');
    mkdirSync(outDir, { recursive: true });
    const cleanBefore = targetCleanliness();
    const prompt = joinBlocks(
      targetsBlock(targetSet),
      reconPrompt(outDir),
      conventionsBlock(profile.conventions, null),
      retryContext(task),
    );
    const result = await runner.run({
      taskId: task.id,
      tier: 'scan',
      prompt,
      systemPrompt:
        'You are the reconnaissance agent of shipshape, a tool that assesses repositories against agentic engineering best practices. You map repositories precisely and honestly. You treat target repositories as read-only.',
      cwd: outDir,
      tools: [...READ_WRITE_TOOLS, 'Bash'],
    });
    if (!result.ok) throw new Error(result.error ?? 'recon agent failed');
    if (!existsSync(join(outDir, 'repo-map.md')))
      throw new Error('recon did not write repo-map.md');
    verifyTargetsStillClean(cleanBefore, task.id);
  });

  graph.on('plan', async (task) => {
    const roster = activeAssessors.map((a) => ({
      id: a.id,
      title: a.title,
      category: a.category,
      appliesTo: a.appliesTo,
      summary: a.summary,
    }));
    const planPath = join(runDir, 'graph', 'plan.json');
    const prompt = joinBlocks(
      targetsBlock(targetSet),
      reconBlock(runDir),
      planPrompt(roster, planPath),
      conventionsBlock(profile.conventions, null),
      retryContext(task),
    );
    const result = await runner.run({
      taskId: task.id,
      tier: 'synthesize',
      prompt,
      systemPrompt:
        'You are the planning agent of shipshape. You decide which assessors apply to this target set and what each should focus on. You only select from the provided roster; you never invent assessors.',
      cwd: join(runDir, 'graph'),
      tools: READ_WRITE_TOOLS,
      maxTurns: 20,
    });
    if (!result.ok) throw new Error(result.error ?? 'plan agent failed');
    // Prefer the file; fall back to a JSON object embedded in the reply so a
    // planner that answered inline instead of writing doesn't cost a retry.
    let rawPlan: unknown;
    if (existsSync(planPath)) {
      rawPlan = JSON.parse(readFileSync(planPath, 'utf8'));
    } else {
      const m = /\{[\s\S]*"assessors"[\s\S]*\}/.exec(result.text);
      if (!m) throw new Error(`plan agent wrote neither ${planPath} nor inline JSON`);
      rawPlan = JSON.parse(m[0]);
      writeFileSync(planPath, JSON.stringify(rawPlan, null, 2));
    }
    const parsed = planSchema.safeParse(rawPlan);
    if (!parsed.success) throw new Error(`plan.json invalid: ${parsed.error.message}`);

    const newTasks: NewTask[] = [];
    const planned = new Set<string>();
    for (const entry of parsed.data.assessors) {
      const def = byId.get(entry.id);
      if (!def) continue;
      planned.add(entry.id);
      const taskId = `assess:${entry.id}`;
      if (entry.run) {
        newTasks.push({
          id: taskId,
          type: 'assess',
          deps: ['recon'],
          params: { assessorId: entry.id, focus: entry.focus },
        });
      } else {
        // Recorded as an explicitly-skipped graph node so the overall report can list it.
        newTasks.push({
          id: taskId,
          type: 'assess',
          deps: ['recon'],
          params: { assessorId: entry.id, skipReason: entry.reason || 'not applicable' },
        });
      }
    }
    // Fail-open: anything the planner forgot still runs.
    for (const a of activeAssessors) {
      if (!planned.has(a.id)) {
        newTasks.push({
          id: `assess:${a.id}`,
          type: 'assess',
          deps: ['recon'],
          params: { assessorId: a.id, focus: '' },
        });
      }
    }
    newTasks.push({
      id: 'synthesize',
      type: 'synthesize',
      deps: newTasks.map((t) => t.id),
      params: {},
    });
    return { newTasks };
  });

  graph.on('assess', async (task) => {
    const assessorId = task.params.assessorId as string;
    const def = byId.get(assessorId);
    if (!def) throw new Error(`unknown assessor ${assessorId}`);
    const skipReason = task.params.skipReason as string | undefined;
    const outDir = join(runDir, 'assessors', assessorId);
    mkdirSync(join(outDir, 'resources'), { recursive: true });
    if (skipReason) {
      writeFileSync(join(outDir, 'SKIPPED'), skipReason);
      return { note: `skipped: ${skipReason}` };
    }
    await runAssessment(def, task, outDir);
  });

  graph.on('synthesize', async (task) => {
    await runSynthesis(task);
  });

  async function runAssessment(
    def: AssessorDef & { weight: number; config: Record<string, unknown> },
    task: TaskNode,
    outDir: string,
  ): Promise<void> {
    const focus = (task.params.focus as string) ?? '';
    const cleanBefore = targetCleanliness();
    const base = joinBlocks(
      `# Assessor: ${def.title} (${def.id})`,
      assessorInstructions(def),
      assessorConfigBlock(def),
      MATURITY_SCALE,
      targetsBlock(targetSet),
      focus ? `## Planner focus hint\n\n${focus}` : null,
      reconBlock(runDir),
      conventionsBlock(profile.conventions, def.id),
    );
    const tools = def.needsExecution ? [...READ_WRITE_TOOLS, 'Bash'] : READ_WRITE_TOOLS;
    const systemPrompt = `You are the '${def.id}' assessor of shipshape, a tool that assesses repositories against agentic engineering best practices. You gather evidence rigorously, cite paths, and never flatter. Target repositories are read-only evidence; you write only inside your output directory.${def.needsExecution ? ' You may execute commands, but only the read-only or scratch-copy commands your instructions authorize.' : ''}`;

    // Optional cheap scan step: gather evidence into resources/ first.
    if (def.tiers.includes('scan') && def.tiers.includes('judge')) {
      const scanResult = await runner.run({
        taskId: `${task.id}#scan`,
        tier: 'scan',
        prompt: joinBlocks(
          base,
          `## Current step: EVIDENCE SCAN\n\nDo NOT write report.md yet. Execute the evidence-gathering portion of your instructions and write your raw findings, inventories, and intermediate results as files under ${join(outDir, 'resources')}/ (absolute path; include a scan-notes.md index summarizing what you collected and where). A later judgment step will read them.\n\nBudget your turns: you have a hard turn limit, so save partial results to resources/ as you go — breadth of saved evidence beats depth on one thread. Sampling caps in your instructions are ceilings, not quotas.`,
          retryContext(task),
        ),
        systemPrompt,
        cwd: outDir,
        tools,
      });
      if (!scanResult.ok)
        log.warn(`${task.id}: scan step failed (${scanResult.error}); judging without it`);
    }

    const judgePrompt = joinBlocks(
      base,
      `## Current step: JUDGMENT AND REPORT\n\nEvidence collected so far (if any) is under ${join(outDir, 'resources')}/. Weigh the evidence, complete any missing verification yourself, then write the report.\n\nAnchor strictly on THIS assessor's rubric above — judge only what '${def.id}' measures, not general quality. Every finding must cite specific files in the target repositories; a generic report that could have been written without reading this repo is a failed report.\n\nBudget your turns: you have a hard turn limit, and a run that ends without the report written is a failed run. Write a complete draft of the report once you have enough evidence for a defensible verdict — well before the limit — then refine it with any remaining budget.`,
      reportContract(def.id, outDir),
      retryContext(task),
    );
    const judgeResult = await runner.run({
      taskId: `${task.id}#judge`,
      tier: 'judge',
      prompt: judgePrompt,
      systemPrompt,
      cwd: outDir,
      tools,
    });
    if (!judgeResult.ok) throw new Error(judgeResult.error ?? 'judge step failed');

    // Validate the report; bounce once with exact errors.
    let validation = validateAssessorReport(join(outDir, 'report.md'), def.id, def.title);
    if (!validation.ok) {
      log.warn(`${task.id}: report invalid, bouncing for repair: ${validation.errors.join('; ')}`);
      const reportMissing = !existsSync(join(outDir, 'report.md'));
      // A merely-invalid report gets a cheap contract-repair round; a missing
      // one (typically a judge that ran out of turns while exploring) gets
      // the full judgment prompt again, leaning on the saved evidence.
      const repair = await runner.run({
        taskId: `${task.id}#repair`,
        tier: 'judge',
        prompt: reportMissing
          ? joinBlocks(
              judgePrompt,
              `## Urgency\n\nA previous attempt ran out of turns before writing the report. Read the saved evidence under ${join(outDir, 'resources')}/ first, keep any further exploration minimal, and write the complete report EARLY in this run.`,
            )
          : joinBlocks(
              `Your report at ${join(outDir, 'report.md')} failed contract validation with these errors:\n\n${validation.errors.map((e) => `- ${e}`).join('\n')}`,
              reportContract(def.id, outDir),
              'Fix the report in place so it passes. Do not change your judgment, only the contract violations.',
            ),
        systemPrompt,
        cwd: outDir,
        tools,
        maxTurns: reportMissing ? undefined : 15,
      });
      if (!repair.ok) throw new Error(repair.error ?? 'report repair failed');
      validation = validateAssessorReport(join(outDir, 'report.md'), def.id, def.title);
      if (!validation.ok) throw new Error(`report still invalid: ${validation.errors.join('; ')}`);
    }
    verifyTargetsStillClean(cleanBefore, task.id);
  }

  async function runSynthesis(task: TaskNode): Promise<void> {
    const rows: string[] = [];
    for (const a of activeAssessors) {
      const dir = join(runDir, 'assessors', a.id);
      const reportPath = join(dir, 'report.md');
      const skippedPath = join(dir, 'SKIPPED');
      const assessTask = graph.get(`assess:${a.id}`);
      if (existsSync(reportPath)) {
        rows.push(`- ${a.id} (weight ${a.weight}): report at ${reportPath}`);
      } else if (existsSync(skippedPath)) {
        rows.push(`- ${a.id}: SKIPPED — ${readFileSync(skippedPath, 'utf8')}`);
      } else {
        rows.push(`- ${a.id}: FAILED — ${assessTask?.error ?? 'no report produced'}`);
      }
    }
    const prompt = joinBlocks(
      synthesisPrompt(runDir, rows),
      targetsBlock(targetSet),
      conventionsBlock(profile.conventions, null),
      retryContext(task),
    );
    const result = await runner.run({
      taskId: task.id,
      tier: 'synthesize',
      prompt,
      systemPrompt:
        'You are the synthesis agent of shipshape. You turn per-assessor reports into one overall report a team will actually read. You are specific, honest, and you never inflate scores or soften real gaps.',
      cwd: runDir,
      tools: READ_WRITE_TOOLS,
    });
    if (!result.ok) throw new Error(result.error ?? 'synthesis failed');
    if (!existsSync(join(runDir, 'report.md')))
      throw new Error('synthesis did not write report.md');
  }

  function targetCleanliness(): Map<string, boolean> {
    const m = new Map<string, boolean>();
    for (const t of targetSet.targets) {
      if (t.isGitRepo) m.set(t.path, gitIsClean(t.path));
    }
    return m;
  }

  function verifyTargetsStillClean(before: Map<string, boolean>, taskId: string): void {
    for (const [path, wasClean] of before) {
      if (wasClean && !gitIsClean(path)) {
        throw new Error(
          `${taskId} modified target repo ${path}; report-mode agents must be read-only. Inspect and clean the repo, then resume.`,
        );
      }
    }
  }

  // A target that starts dirty can't be covered by the read-only check —
  // say so loudly instead of silently losing the guarantee.
  for (const t of targetSet.targets) {
    if (t.isGitRepo && !gitIsClean(t.path)) {
      log.warn(
        `target ${t.path} has uncommitted changes; the read-only verification cannot distinguish agent writes there`,
      );
    }
  }

  // Seed the graph (idempotent on resume).
  if (!graph.has('recon')) graph.add({ id: 'recon', type: 'recon', deps: [], params: {} });
  if (!graph.has('plan')) graph.add({ id: 'plan', type: 'plan', deps: ['recon'], params: {} });

  const summary = await graph.run();
  log.info(
    `report run complete: ${summary.done} done, ${summary.failed} failed, ${summary.skipped} skipped; spend $${runner.spentUsd.toFixed(2)}`,
  );
  return { failed: summary.failed };
}

function gitIsClean(dir: string): boolean {
  try {
    return (
      execFileSync('git', ['-C', dir, 'status', '--porcelain'], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      }).trim().length === 0
    );
  } catch {
    return true;
  }
}

function retryContext(task: TaskNode): string | null {
  if (task.attempts <= 1 || !task.error) return null;
  return `## Previous attempt failed\n\nYour previous attempt at this task failed with: ${task.error}\nAvoid repeating that failure.`;
}

function reconPrompt(outDir: string): string {
  return `## Your job: reconnaissance

Explore the target packages (read-only; use Bash only for read-only commands like git log/ls) and write two files into ${outDir} (absolute paths):

1. ${outDir}/repo-map.md — orientation for ~25 downstream assessor agents who will each judge one best practice. Cover:
   - What this system is and does (from its own docs), languages, rough size.
   - Package inventory: for a monorepo or multi-target set, every package with path, language, build tool.
   - Build/test/lint entry points as documented (do not run builds; record what the docs claim).
   - The agent-facing surface: AGENTS.md/CLAUDE.md files (and .gitignore treatment of them), .claude/ or similar harness config, agent/reviewer definitions, skills, hooks (.pre-commit-config, husky, .githooks), CI workflows (note any that run agents), linter/formatter/type-checker configs.
   - Docs/specs layout: where design docs, specs, ADRs, plans live; the apparent entry point and ordering.
   - Git shape: default branch, rough commit cadence, whether history suggests squash-merges/PRs (git log --oneline sampling).
   - Notable oddities downstream assessors should know (generated dirs, vendored code, submodules, meta-repo relationships).

2. ${outDir}/packages.json — machine-readable inventory:
   { "packages": [ { "name": str, "path": str, "language": str, "buildTool": str|null, "testCommand": str|null, "agentDocs": [str], "notes": str } ] }

Be precise with paths (absolute), be honest about uncertainty, and keep repo-map.md under ~300 lines — it is injected into every downstream agent's context.`;
}

function planPrompt(roster: object[], planPath: string): string {
  return `## Your job: select and focus assessors

Below is the assessor roster for this run. Decide for each whether it applies to this target set, and give applicable ones a focus hint (which packages/paths matter most, what the recon suggests deserves attention). Skip an assessor ONLY when its subject cannot exist here (e.g. a CI-agent-safety assessor on a repo with no agent workflows) — "the repo will probably score low" is a reason to run, never to skip. When in doubt, run it.

Roster:
${JSON.stringify(roster, null, 2)}

Write ${planPath} (absolute path):
{ "assessors": [ { "id": "<id>", "run": true|false, "reason": "<required when run=false>", "focus": "<hint when run=true>" } ] }

Include every roster id exactly once. Then reply with a one-paragraph summary of your plan.`;
}

function synthesisPrompt(runDir: string, rows: string[]): string {
  return `## Your job: the overall report

Read every assessor report listed below in full (and skim their resources where a claim needs checking), then write the overall report to ${join(runDir, 'report.md')}.

Assessor outcomes:
${rows.join('\n')}

The report must open with YAML frontmatter:

---
run: <run id from run.json>
generated: <ISO date>
targets: [<target names>]
profile: <profile name from run.json>
overall: <1-5, the weighted median of assessor levels, using the weights above>
confidence: <high|medium|low>
assessed: <n>
skipped: <n>
failed: <n>
---

Then exactly these sections:

## Scorecard
Overall maturity with one paragraph of interpretation, then a table: assessor | category | level | confidence | one-line summary. Link each assessor id to its report (relative path assessors/<id>/report.md). List skipped/failed assessors beneath the table with reasons.

## Maturity by category
Short narrative per category (docs, process, enforcement, legibility, operations): where the target sits and why.

## Top opportunities
The 5-10 cross-assessor changes that would raise maturity most, ordered by impact. Each: what to do, which assessor findings support it (cite assessor ids and finding numbers), and rough effort. This is the section a team reads first — make every entry actionable.

## What's already working
The practices the target genuinely nails, with specific citations. No filler praise.

## Detailed findings
Per category, per assessor: the verdict in 2-3 sentences and every opportunity finding in condensed form. A reader should not need the per-assessor files for the substance, only for the deep evidence.

## Run notes
Skipped/failed assessors, total run cost if costs.json exists, and how to run doctor mode on this run directory (shipshape doctor ${runDir}).

Honesty rules: the overall number is the weighted median, not the mean; explain spread rather than letting one number carry the story. Do not soften findings; do not invent findings not present in assessor reports.`;
}

function writeManifest(opts: ReportRunOptions): void {
  const manifest: RunManifest = {
    runId: opts.runDir.split('/').pop() ?? opts.runDir,
    mode: 'report',
    createdAt: new Date().toISOString(),
    targets: opts.targetSet.targets.map((t) => ({ path: t.path, name: t.name, isMeta: t.isMeta })),
    profileName: opts.resolved.profile.name,
    profilePath: opts.resolved.profile.path,
    provider: opts.resolved.profile.provider,
    models: opts.resolved.profile.models,
    conventions: opts.resolved.profile.conventions,
    assessorIds: opts.resolved.assessors.map((a) => a.id),
    shipshapeVersion: opts.shipshapeVersion,
  };
  writeFileSync(join(opts.runDir, 'run.json'), JSON.stringify(manifest, null, 2));
}
