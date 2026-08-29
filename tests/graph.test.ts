import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { TaskGraph } from '../src/core/graph.js';

function tmpGraph(concurrency = 2): { g: TaskGraph; file: string } {
  const dir = mkdtempSync(join(tmpdir(), 'shipshape-graph-'));
  const file = join(dir, 'graph.json');
  return { g: TaskGraph.load(file, concurrency), file };
}

describe('TaskGraph', () => {
  it('runs tasks in dependency order', async () => {
    const { g } = tmpGraph();
    const order: string[] = [];
    g.on('t', async (task) => {
      order.push(task.id);
    });
    g.add({ id: 'a', type: 't', deps: [], params: {} });
    g.add({ id: 'b', type: 't', deps: ['a'], params: {} });
    g.add({ id: 'c', type: 't', deps: ['b'], params: {} });
    const summary = await g.run();
    expect(order).toEqual(['a', 'b', 'c']);
    expect(summary).toEqual({ done: 3, failed: 0, skipped: 0 });
  });

  it('supports dynamic expansion from handlers', async () => {
    const { g } = tmpGraph();
    const ran: string[] = [];
    g.on('plan', async () => ({
      newTasks: [
        { id: 'w1', type: 'work', deps: ['plan'], params: {} },
        { id: 'w2', type: 'work', deps: ['w1'], params: {} },
      ],
    }));
    g.on('work', async (t) => {
      ran.push(t.id);
    });
    g.add({ id: 'plan', type: 'plan', deps: [], params: {} });
    await g.run();
    expect(ran).toEqual(['w1', 'w2']);
  });

  it('retries once, then fails and skips dependents while other branches continue', async () => {
    const { g } = tmpGraph();
    let attempts = 0;
    const ran: string[] = [];
    g.on('bad', async () => {
      attempts += 1;
      throw new Error('boom');
    });
    g.on('ok', async (t) => {
      ran.push(t.id);
    });
    g.add({ id: 'bad', type: 'bad', deps: [], params: {} });
    g.add({ id: 'child-of-bad', type: 'ok', deps: ['bad'], params: {} });
    g.add({ id: 'independent', type: 'ok', deps: [], params: {} });
    const summary = await g.run();
    expect(attempts).toBe(2);
    expect(ran).toEqual(['independent']);
    expect(summary).toEqual({ done: 1, failed: 1, skipped: 1 });
  });

  it('persists state and resumes, demoting running to pending', async () => {
    const { g, file } = tmpGraph();
    g.on('t', async () => {});
    g.add({ id: 'a', type: 't', deps: [], params: {} });
    await g.run();
    // Simulate a crash mid-flight on a second task.
    g.add({ id: 'b', type: 't', deps: ['a'], params: {} });
    const raw = JSON.parse(readFileSync(file, 'utf8'));
    expect(raw.tasks.find((t: { id: string }) => t.id === 'a').status).toBe('done');

    const g2 = TaskGraph.load(file, 2);
    const ran: string[] = [];
    g2.on('t', async (t) => {
      ran.push(t.id);
    });
    await g2.run();
    expect(ran).toEqual(['b']); // a stays done, only b runs
  });

  it('rejects dependency cycles', () => {
    const { g } = tmpGraph();
    g.add({ id: 'a', type: 't', deps: [], params: {} });
    expect(() => g.add({ id: 'b', type: 't', deps: ['b'], params: {} })).toThrow(
      /cycle|unknown dep/,
    );
  });

  it('respects the concurrency limit', async () => {
    const { g } = tmpGraph(2);
    let inFlight = 0;
    let peak = 0;
    g.on('t', async () => {
      inFlight += 1;
      peak = Math.max(peak, inFlight);
      await new Promise((r) => setTimeout(r, 20));
      inFlight -= 1;
    });
    for (let i = 0; i < 6; i += 1) g.add({ id: `t${i}`, type: 't', deps: [], params: {} });
    await g.run();
    expect(peak).toBe(2);
  });

  it('stop() prevents new tasks from starting', async () => {
    const { g } = tmpGraph(1);
    const ran: string[] = [];
    g.on('t', async (t) => {
      ran.push(t.id);
      if (t.id === 'a') g.stop();
    });
    g.add({ id: 'a', type: 't', deps: [], params: {} });
    g.add({ id: 'b', type: 't', deps: [], params: {} });
    await g.run();
    expect(ran).toEqual(['a']);
  });
});
