// Uniform wrapper over the Claude Agent SDK (spec 010): every shipshape agent
// runs through runAgent(), which enforces model tiers, tool grants, turn
// caps, transcript capture, and the cost ledger. Handlers never call the SDK
// directly, so cost posture and guardrails stay in one place.

import { appendFileSync, mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { query } from '@anthropic-ai/claude-agent-sdk';
import type { AgentRunRequest, AgentRunResult, CostEntry, ModelTier } from './types.js';
import { log } from './log.js';

export interface AgentRunnerOptions {
  runDir: string;
  models: Record<ModelTier, string>;
  maxTurnsDefault: number;
  maxUsd: number | null;
  /** Called when the run-level budget ceiling is crossed. */
  onBudgetExceeded?: () => void;
}

export class AgentRunner {
  private totalUsd = 0;
  private budgetTripped = false;

  constructor(private readonly opts: AgentRunnerOptions) {
    const costsFile = join(opts.runDir, 'costs.json');
    if (existsSync(costsFile)) {
      // Resume: carry the prior spend into the budget ceiling.
      const entries = JSON.parse(readFileSync(costsFile, 'utf8')) as CostEntry[];
      this.totalUsd = entries.reduce((s, e) => s + e.costUsd, 0);
    }
  }

  get spentUsd(): number {
    return this.totalUsd;
  }

  private recordCost(entry: CostEntry): void {
    const costsFile = join(this.opts.runDir, 'costs.json');
    const entries = existsSync(costsFile)
      ? (JSON.parse(readFileSync(costsFile, 'utf8')) as CostEntry[])
      : [];
    entries.push(entry);
    writeFileSync(costsFile, JSON.stringify(entries, null, 2));
    this.totalUsd += entry.costUsd;
    if (this.opts.maxUsd !== null && this.totalUsd > this.opts.maxUsd && !this.budgetTripped) {
      this.budgetTripped = true;
      log.warn(
        `budget ceiling crossed ($${this.totalUsd.toFixed(2)} > $${this.opts.maxUsd}); no new tasks will start`,
      );
      this.opts.onBudgetExceeded?.();
    }
  }

  async run(req: AgentRunRequest): Promise<AgentRunResult> {
    const model = this.opts.models[req.tier];
    const transcriptDir = join(this.opts.runDir, 'graph', 'tasks', sanitize(req.taskId));
    mkdirSync(transcriptDir, { recursive: true });
    const transcript = join(transcriptDir, 'transcript.jsonl');
    const started = Date.now();

    const extraDirs = req.addDirs ?? [];
    const q = query({
      prompt: req.prompt,
      options: {
        cwd: req.cwd,
        model,
        systemPrompt: req.systemPrompt,
        tools: req.tools,
        allowedTools: req.tools,
        permissionMode: 'bypassPermissions',
        maxTurns: req.maxTurns ?? this.opts.maxTurnsDefault,
        // Do not load user/project Claude settings into shipshape's agents:
        // the target repo's CLAUDE.md must be evidence, not instructions.
        settingSources: [],
        ...(extraDirs.length > 0 ? { extraArgs: { 'add-dir': extraDirs.join(' ') } } : {}),
      },
    });

    let text = '';
    let costUsd = 0;
    let turns = 0;
    let errored: string | undefined;
    try {
      for await (const message of q) {
        appendTranscript(transcript, message);
        if (message.type === 'result') {
          costUsd = 'total_cost_usd' in message ? message.total_cost_usd : 0;
          turns = 'num_turns' in message ? message.num_turns : 0;
          if (message.subtype === 'success') {
            text = message.result;
            if (message.is_error) errored = `agent reported error: ${truncate(text, 500)}`;
          } else {
            errored = `agent ended without success (${message.subtype})`;
          }
        }
      }
    } catch (err) {
      errored = err instanceof Error ? err.message : String(err);
    }

    const durationMs = Date.now() - started;
    this.recordCost({
      taskId: req.taskId,
      tier: req.tier,
      model,
      costUsd,
      turns,
      durationMs,
      at: new Date().toISOString(),
    });
    if (errored) return { ok: false, text, costUsd, turns, durationMs, error: errored };
    return { ok: true, text, costUsd, turns, durationMs };
  }
}

function sanitize(id: string): string {
  return id.replace(/[^a-zA-Z0-9_.-]/g, '_');
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n)}…` : s;
}

function appendTranscript(file: string, message: unknown): void {
  // Keep transcripts compact: skip token-stream partials, keep everything else.
  const m = message as { type?: string };
  if (m.type === 'stream_event') return;
  try {
    mkdirSync(dirname(file), { recursive: true });
    appendFileSync(file, `${JSON.stringify(message)}\n`);
  } catch {
    // Transcript capture is best-effort; never fail a task over it.
  }
}
