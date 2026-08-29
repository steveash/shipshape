// Git helpers for doctor mode (spec 060). All writes to target repos flow
// through here: branch creation, diff inspection, and status — never pushes.

import { execFileSync } from 'node:child_process';

function git(repo: string, args: string[]): string {
  return execFileSync('git', ['-C', repo, ...args], {
    stdio: ['ignore', 'pipe', 'pipe'],
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
  }).trim();
}

export function currentBranch(repo: string): string {
  return git(repo, ['rev-parse', '--abbrev-ref', 'HEAD']);
}

export function defaultBranch(repo: string): string {
  // Prefer origin/HEAD; fall back to main/master/current.
  try {
    const ref = git(repo, ['symbolic-ref', 'refs/remotes/origin/HEAD']);
    return ref.replace('refs/remotes/origin/', '');
  } catch {
    for (const candidate of ['main', 'master']) {
      try {
        git(repo, ['rev-parse', '--verify', candidate]);
        return candidate;
      } catch {
        /* try next */
      }
    }
    return currentBranch(repo);
  }
}

export function branchExists(repo: string, branch: string): boolean {
  try {
    git(repo, ['rev-parse', '--verify', `refs/heads/${branch}`]);
    return true;
  } catch {
    return false;
  }
}

export function createBranchAt(repo: string, branch: string, startPoint: string): void {
  git(repo, ['branch', branch, startPoint]);
}

export function deleteBranch(repo: string, branch: string): void {
  git(repo, ['branch', '-D', branch]);
}

export function isClean(repo: string): boolean {
  return git(repo, ['status', '--porcelain']).length === 0;
}

export function diffAgainst(repo: string, base: string, branch: string): string {
  return git(repo, ['diff', `${base}...${branch}`]);
}

export function diffStat(repo: string, base: string, branch: string): string {
  return git(repo, ['diff', '--stat', `${base}...${branch}`]);
}

export function commitsOn(repo: string, base: string, branch: string): string[] {
  const out = git(repo, ['log', '--format=%H %s', `${base}..${branch}`]);
  return out.length === 0 ? [] : out.split('\n');
}

/**
 * Fixer agents never touch the user's working tree: each branch gets its own
 * git worktree under the run directory, and the worktree is removed by the
 * same code path that created it once the branch is reviewed.
 */
export function addWorktree(repo: string, dir: string, branch: string, startPoint: string): void {
  git(repo, ['worktree', 'add', '-b', branch, dir, startPoint]);
}

export function addWorktreeExisting(repo: string, dir: string, branch: string): void {
  git(repo, ['worktree', 'add', dir, branch]);
}

export function removeWorktree(repo: string, dir: string): void {
  try {
    git(repo, ['worktree', 'remove', '--force', dir]);
  } catch {
    git(repo, ['worktree', 'prune']);
  }
}
