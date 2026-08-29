#!/usr/bin/env node
// PreToolUse guard: blocks the commands AGENTS.md prohibits, so the
// prohibitions are enforced (exit 2 = block), not advisory. Enforcement
// hierarchy: this hook backs the prose rules in AGENTS.md.
import { readFileSync } from 'node:fs';

let input = '';
try {
  input = readFileSync(0, 'utf8');
} catch {
  process.exit(0);
}

let command = '';
try {
  command = JSON.parse(input)?.tool_input?.command ?? '';
} catch {
  process.exit(0);
}

const blocked = [
  { re: /git\s+push\s+.*(--force|-f)\b/, why: 'force-push is prohibited (AGENTS.md hard rules)' },
  { re: /rm\s+-rf\s+(\/|~)(\s|$)/, why: 'destructive rm at root/home is prohibited' },
  {
    re: /(^|\s)(>|>>)\s*(dist|node_modules)\//,
    why: 'dist/ and node_modules/ are generated; never write into them (AGENTS.md)',
  },
];

for (const { re, why } of blocked) {
  if (re.test(command)) {
    console.error(`blocked: ${why}`);
    process.exit(2);
  }
}
process.exit(0);
