// Target-set resolution (spec 010): CLI paths + --meta become a TargetSet.
// Monorepo subdivision happens later, agentically, in recon.

import { existsSync, statSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import type { Target, TargetSet } from './types.js';

export function resolveTargets(paths: string[], metaPath?: string): TargetSet {
  if (paths.length === 0) throw new Error('at least one target path is required');
  const seen = new Set<string>();
  const meta = metaPath ? resolve(metaPath) : null;
  const allPaths = [...paths.map((p) => resolve(p))];
  if (meta && !allPaths.includes(meta)) allPaths.push(meta);

  const targets: Target[] = allPaths.map((abs) => {
    if (!existsSync(abs) || !statSync(abs).isDirectory()) {
      throw new Error(`target is not a directory: ${abs}`);
    }
    if (seen.has(abs)) throw new Error(`duplicate target: ${abs}`);
    seen.add(abs);
    return {
      path: abs,
      name: basename(abs),
      isGitRepo: isGitWorkTree(abs),
      isMeta: abs === meta,
    };
  });

  return { targets, meta: targets.find((t) => t.isMeta) ?? null };
}

export function isGitWorkTree(dir: string): boolean {
  try {
    execFileSync('git', ['-C', dir, 'rev-parse', '--is-inside-work-tree'], {
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    return true;
  } catch {
    return false;
  }
}
