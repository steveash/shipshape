#!/usr/bin/env node
// The shipshape CLI. Commands: report (assess repos), doctor (stage fixes
// from a prior run), list-assessors, validate (profile sanity + trust
// surface). See docs/specs/000-overview.md.

import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { Command } from 'commander';
import { loadAssessorLibrary, packageRoot, resolveProfile } from './core/config.js';
import { log } from './core/log.js';
import { resolveTargets } from './core/targets.js';
import { loadManifest, runDoctor } from './pipeline/doctor.js';
import { runReport } from './pipeline/report.js';

function shipshapeVersion(): string {
  try {
    const pkg = JSON.parse(readFileSync(join(packageRoot(), 'package.json'), 'utf8')) as {
      version: string;
    };
    return pkg.version;
  } catch {
    return 'unknown';
  }
}

function profilePathFor(name: string): string {
  if (existsSync(name)) return resolve(name);
  const shipped = join(packageRoot(), 'profiles', `${name}.yaml`);
  if (existsSync(shipped)) return shipped;
  throw new Error(`profile not found: '${name}' (not a file, not a shipped profile)`);
}

/**
 * The provider trust surface, printed identically by --dry-run and validate:
 * full env values, not just keys — a traffic redirect (ANTHROPIC_BASE_URL,
 * baseUrl) hides in a value, and a pre-flight is the reviewer's one chance
 * to see it. Provider env is profile config, never secrets.
 */
function printProviderSurface(p: {
  type: string;
  region?: string;
  baseUrl?: string;
  env: Record<string, string>;
}): void {
  const parts = [p.type === 'bedrock' ? 'bedrock' : 'anthropic (default)'];
  if (p.region) parts.push(`region=${p.region}`);
  if (p.baseUrl) parts.push(`baseUrl=${p.baseUrl}`);
  console.log(`provider: ${parts.join(' ')}`);
  const entries = Object.entries(p.env);
  if (entries.length > 0) {
    console.log('sets runtime environment:');
    for (const [k, v] of entries) console.log(`  ${k}=${v}`);
  }
}

function makeRunId(): string {
  const d = new Date();
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}-${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}`;
}

const program = new Command();
program
  .name('shipshape')
  .description('Assess repositories against agentic engineering best practices')
  .version(shipshapeVersion());

program
  .command('report')
  .description('Run a full assessment and generate reports (read-only on targets)')
  .argument('<paths...>', 'package/repo paths to assess as one system')
  .option('-p, --profile <nameOrPath>', 'profile to run', 'balanced')
  .option('-m, --meta <path>', 'target carrying shared agent instructions for the group')
  .option('-c, --conventions <file...>', 'team conventions md file(s) steering all agents')
  .option('-o, --out <dir>', 'output directory root', './shipshape-out')
  .option('-r, --resume <runDir>', 'resume a previous run directory')
  .option('-a, --assessor <id...>', 'run only these assessors')
  .option(
    '--bedrock',
    'run agents against Amazon Bedrock (shortcut for provider.type: bedrock; AWS credentials/region come from your environment)',
  )
  .option('--dry-run', 'print the resolved plan without running agents')
  .action(async (paths: string[], opts) => {
    const resolved = resolveProfile(profilePathFor(opts.profile as string));
    // On resume, the provider the run STARTED with wins over the profile
    // file, so an interrupted --bedrock run can't silently revert to the
    // Anthropic API mid-run. An explicit --bedrock flag still wins.
    if (opts.resume) {
      const manifestPath = join(resolve(opts.resume as string), 'run.json');
      if (existsSync(manifestPath)) {
        const prior = loadManifest(resolve(opts.resume as string));
        if (prior.provider) resolved.profile.provider = prior.provider;
      }
    }
    if (opts.bedrock) resolved.profile.provider.type = 'bedrock';
    for (const w of resolved.warnings) log.warn(w);
    for (const extra of (opts.conventions as string[] | undefined) ?? []) {
      const abs = resolve(extra);
      if (!existsSync(abs)) throw new Error(`conventions file not found: ${abs}`);
      resolved.profile.conventions.push(abs);
    }
    const targetSet = resolveTargets(paths, opts.meta as string | undefined);
    const only = (opts.assessor as string[] | undefined) ?? [];

    if (opts.dryRun) {
      console.log(`profile: ${resolved.profile.name} (${resolved.profile.path})`);
      printProviderSurface(resolved.profile.provider);
      console.log(`models: ${JSON.stringify(resolved.profile.models)}`);
      console.log(`targets:`);
      for (const t of targetSet.targets) {
        console.log(`  - ${t.path}${t.isMeta ? ' (meta)' : ''}${t.isGitRepo ? '' : ' (not git)'}`);
      }
      console.log(`assessors (${resolved.assessors.length}):`);
      for (const a of resolved.assessors) {
        if (only.length > 0 && !only.includes(a.id)) continue;
        console.log(
          `  - ${a.id} [${a.category}] tiers=${a.tiers.join(',')}${a.needsExecution ? ' EXEC' : ''}${a.hasFix ? ' fixable' : ''}`,
        );
      }
      return;
    }

    const runDir = opts.resume
      ? resolve(opts.resume as string)
      : resolve(opts.out as string, `${makeRunId()}-${resolved.profile.name}`);
    mkdirSync(runDir, { recursive: true });
    log.info(`run directory: ${runDir}`);
    const { failed } = await runReport({
      runDir,
      targetSet,
      resolved,
      only,
      shipshapeVersion: shipshapeVersion(),
    });
    log.info(`overall report: ${join(runDir, 'report.md')}`);
    process.exitCode = failed > 0 ? 2 : 0;
  });

program
  .command('doctor')
  .description('Stage reviewed fix branches from a previous report run (local branches only)')
  .argument('<runDir>', 'a completed shipshape report run directory')
  .option('-a, --assessor <id...>', 'only stage fixes for these assessors')
  .option('--bedrock', 'run agents against Amazon Bedrock (see report --bedrock)')
  .option('--max-branches <n>', 'cap the number of fix branches (default 20)', (v) =>
    parseInt(v, 10),
  )
  .action(async (runDirArg: string, opts) => {
    const runDir = resolve(runDirArg);
    const manifest = loadManifest(runDir);
    const resolved = resolveProfile(manifest.profilePath);
    // The provider the report run used carries into doctor (see report
    // --resume above); --bedrock still overrides explicitly.
    if (manifest.provider) resolved.profile.provider = manifest.provider;
    if (opts.bedrock) resolved.profile.provider.type = 'bedrock';
    const targetSet = resolveTargets(
      manifest.targets.map((t) => t.path),
      manifest.targets.find((t) => t.isMeta)?.path,
    );
    for (const t of targetSet.targets) {
      if (!t.isGitRepo)
        log.warn(`target ${t.path} is not a git repo; no fixes can be staged there`);
    }
    const { failed } = await runDoctor({
      runDir,
      targetSet,
      resolved,
      only: (opts.assessor as string[] | undefined) ?? [],
      // Bounded by default: an unbounded doctor run over many fixable
      // assessors is an unbounded spend (self-assessment finding).
      maxBranches: (opts.maxBranches as number | undefined) ?? 20,
    });
    log.info(`review plan: ${join(runDir, 'doctor', 'review-plan.md')}`);
    process.exitCode = failed > 0 ? 2 : 0;
  });

program
  .command('list-assessors')
  .description('List every assessor shipped with shipshape')
  .action(() => {
    const lib = loadAssessorLibrary([join(packageRoot(), 'assessors')]);
    for (const a of [...lib.values()].sort(
      (x, y) => x.category.localeCompare(y.category) || x.id.localeCompare(y.id),
    )) {
      console.log(`${a.id.padEnd(28)} [${a.category}] ${a.summary.trim().split('\n')[0]}`);
    }
  });

program
  .command('validate')
  .description('Validate a profile and print its trust surface (execution/write access)')
  .argument('<nameOrPath>', 'profile name or path')
  .action((nameOrPath: string) => {
    const resolved = resolveProfile(profilePathFor(nameOrPath));
    console.log(`profile '${resolved.profile.name}' is valid.`);
    printProviderSurface(resolved.profile.provider);
    console.log(`models: ${JSON.stringify(resolved.profile.models)}`);
    for (const w of resolved.warnings) console.log(`WARN: ${w}`);
    const exec = resolved.assessors.filter((a) => a.needsExecution);
    const fix = resolved.assessors.filter((a) => a.hasFix);
    console.log(`assessors: ${resolved.assessors.length}`);
    if (exec.length > 0) {
      console.log(`request command execution in report mode: ${exec.map((a) => a.id).join(', ')}`);
    }
    if (fix.length > 0) {
      console.log(`can write fix branches in doctor mode: ${fix.map((a) => a.id).join(', ')}`);
    }
    console.log(
      'Review third-party assessor prompts and conventions files like CI config before running them.',
    );
  });

program.parseAsync().catch((err: unknown) => {
  log.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
