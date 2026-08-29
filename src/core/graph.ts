// The file-backed task graph runner (spec 040). Deliberately small: a JSON
// DAG persisted in the run directory, an in-process scheduler with a
// concurrency limit, dynamic expansion for plan-style tasks, and resume by
// reloading the file. No priorities, no daemon, no cross-run state.

import { readFileSync, writeFileSync, renameSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import type { TaskGraphFile, TaskNode, TaskStatus } from './types.js';
import { log } from './log.js';

export interface HandlerResult {
  /** New tasks to add to the graph (validated: unique ids, no cycles). */
  newTasks?: NewTask[];
  /** Optional human-readable note stored on the task. */
  note?: string;
}

export interface NewTask {
  id: string;
  type: string;
  deps: string[];
  params: Record<string, unknown>;
}

export type TaskHandler = (task: TaskNode) => Promise<HandlerResult | void>;

export interface RunSummary {
  done: number;
  failed: number;
  skipped: number;
}

const MAX_ATTEMPTS = 2;

export class TaskGraph {
  private tasks = new Map<string, TaskNode>();
  private handlers = new Map<string, TaskHandler>();
  private stopNewWork = false;

  constructor(
    private readonly file: string,
    private readonly concurrency: number,
  ) {}

  static load(file: string, concurrency: number): TaskGraph {
    const g = new TaskGraph(file, concurrency);
    if (existsSync(file)) {
      const parsed = JSON.parse(readFileSync(file, 'utf8')) as TaskGraphFile;
      for (const t of parsed.tasks) {
        // Crash recovery: anything mid-flight when the process died re-runs.
        if (t.status === 'running') t.status = 'pending';
        g.tasks.set(t.id, t);
      }
    }
    return g;
  }

  on(type: string, handler: TaskHandler): void {
    this.handlers.set(type, handler);
  }

  has(id: string): boolean {
    return this.tasks.has(id);
  }

  get(id: string): TaskNode | undefined {
    return this.tasks.get(id);
  }

  all(): TaskNode[] {
    return [...this.tasks.values()];
  }

  /** Stop scheduling new tasks (budget ceiling crossed); in-flight tasks finish. */
  stop(): void {
    this.stopNewWork = true;
  }

  add(newTask: NewTask, status: TaskStatus = 'pending'): void {
    if (this.tasks.has(newTask.id)) {
      return; // idempotent for resume: planners re-emitting existing tasks is fine
    }
    for (const dep of newTask.deps) {
      if (!this.tasks.has(dep)) throw new Error(`task ${newTask.id}: unknown dep '${dep}'`);
    }
    this.tasks.set(newTask.id, {
      ...newTask,
      status,
      attempts: 0,
      error: null,
      note: null,
      startedAt: null,
      endedAt: null,
    });
    this.assertAcyclic();
    this.persist();
  }

  markSkipped(id: string, note: string): void {
    const t = this.tasks.get(id);
    if (!t) return;
    t.status = 'skipped';
    t.note = note;
    t.endedAt = new Date().toISOString();
    this.persist();
    this.cascadeSkip(t.id, `dependency ${t.id} skipped`);
  }

  private assertAcyclic(): void {
    const state = new Map<string, number>(); // 0 visiting, 1 done
    const visit = (id: string, stack: string[]): void => {
      const s = state.get(id);
      if (s === 1) return;
      if (s === 0) throw new Error(`task graph cycle: ${[...stack, id].join(' -> ')}`);
      state.set(id, 0);
      for (const dep of this.tasks.get(id)?.deps ?? []) visit(dep, [...stack, id]);
      state.set(id, 1);
    };
    for (const id of this.tasks.keys()) visit(id, []);
  }

  private persist(): void {
    const data: TaskGraphFile = { version: 1, tasks: [...this.tasks.values()] };
    mkdirSync(dirname(this.file), { recursive: true });
    const tmp = `${this.file}.tmp`;
    writeFileSync(tmp, JSON.stringify(data, null, 2));
    renameSync(tmp, this.file);
  }

  private ready(): TaskNode[] {
    if (this.stopNewWork) return [];
    return [...this.tasks.values()].filter(
      (t) => t.status === 'pending' && t.deps.every((d) => this.tasks.get(d)?.status === 'done'),
    );
  }

  private cascadeSkip(failedId: string, reason: string): void {
    // Any pending task depending (transitively) on a failed/skipped task is skipped.
    let changed = true;
    while (changed) {
      changed = false;
      for (const t of this.tasks.values()) {
        if (t.status !== 'pending') continue;
        const dead = t.deps.some((d) => {
          const dep = this.tasks.get(d);
          return dep?.status === 'failed' || dep?.status === 'skipped';
        });
        if (dead) {
          t.status = 'skipped';
          t.note = reason;
          t.endedAt = new Date().toISOString();
          changed = true;
        }
      }
    }
    this.persist();
  }

  /** Run until no task is runnable. Returns counts. */
  async run(): Promise<RunSummary> {
    const inFlight = new Map<string, Promise<void>>();

    const launch = (task: TaskNode): void => {
      task.status = 'running';
      task.attempts += 1;
      task.startedAt = task.startedAt ?? new Date().toISOString();
      this.persist();
      log.info(`▶ ${task.id} (attempt ${task.attempts})`);
      const handler = this.handlers.get(task.type);
      const p = (async () => {
        if (!handler) throw new Error(`no handler for task type '${task.type}'`);
        const result = await handler(task);
        for (const nt of result?.newTasks ?? []) this.add(nt);
        if (result?.note) task.note = result.note;
      })()
        .then(() => {
          task.status = 'done';
          task.endedAt = new Date().toISOString();
          task.error = null;
          log.info(`✓ ${task.id}`);
        })
        .catch((err: unknown) => {
          const msg = err instanceof Error ? err.message : String(err);
          task.error = msg;
          if (task.attempts < MAX_ATTEMPTS) {
            task.status = 'pending';
            log.warn(`↻ ${task.id} failed, will retry: ${msg}`);
          } else {
            task.status = 'failed';
            task.endedAt = new Date().toISOString();
            log.error(`✗ ${task.id} failed permanently: ${msg}`);
            this.cascadeSkip(task.id, `dependency ${task.id} failed`);
          }
        })
        .finally(() => {
          this.persist();
          inFlight.delete(task.id);
        });
      inFlight.set(task.id, p);
    };

    for (;;) {
      for (const task of this.ready()) {
        if (inFlight.size >= this.concurrency) break;
        if (inFlight.has(task.id)) continue;
        launch(task);
      }
      if (inFlight.size === 0) break;
      await Promise.race(inFlight.values());
    }

    const all = this.all();
    return {
      done: all.filter((t) => t.status === 'done').length,
      failed: all.filter((t) => t.status === 'failed').length,
      skipped: all.filter((t) => t.status === 'skipped').length,
    };
  }
}

export function graphFilePath(runDir: string): string {
  return join(runDir, 'graph', 'graph.json');
}
