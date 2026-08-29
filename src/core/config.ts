// Loading + validation for assessor definitions (spec 020) and profiles
// (spec 030). All user-supplied yaml goes through zod so failures are
// actionable before any agent spends a token.

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';
import { z } from 'zod';
import { MODEL_TIERS, type AssessorDef, type ModelTier, type Profile } from './types.js';

const CATEGORY = z.enum(['docs', 'process', 'enforcement', 'legibility', 'operations']);
const TIER = z.enum(['scan', 'judge', 'synthesize', 'fix', 'review']);

const assessorYamlSchema = z.object({
  id: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'assessor id must be kebab-case'),
  title: z.string().min(1),
  category: CATEGORY,
  summary: z.string().min(1),
  practice: z.string().min(1),
  tiers: z.array(TIER).min(1),
  needsExecution: z.boolean().default(false),
  appliesTo: z.string().default('always'),
  canReview: z.boolean().default(false),
  reviewsCategories: z.array(CATEGORY).default([]),
  defaultConfig: z.record(z.string(), z.unknown()).default({}),
});

const profileAssessorSchema = z.object({
  id: z.string(),
  enabled: z.boolean().default(true),
  weight: z.number().positive().default(1),
  config: z.record(z.string(), z.unknown()).default({}),
});

const profileYamlSchema = z.object({
  name: z.string().min(1),
  extends: z.string().optional(),
  models: z.partialRecord(TIER, z.string()).default({}),
  concurrency: z.number().int().positive().max(16).optional(),
  budgets: z
    .object({
      maxTurnsPerTask: z.number().int().positive().optional(),
      maxUsd: z.number().positive().nullable().optional(),
    })
    .default({}),
  assessorDirs: z.array(z.string()).default([]),
  conventions: z.array(z.string()).default([]),
  assessors: z.array(profileAssessorSchema).default([]),
});

/** Root of the installed shipshape package (where shipped assessors/ and profiles/ live). */
export function packageRoot(): string {
  // dist/core/config.js -> package root is two levels up.
  return resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
}

export function loadAssessorDir(dir: string): AssessorDef {
  const yamlPath = join(dir, 'assessor.yaml');
  const raw = parseYaml(readFileSync(yamlPath, 'utf8')) as unknown;
  const parsed = assessorYamlSchema.parse(raw);
  const assessPath = join(dir, 'assess.md');
  if (!existsSync(assessPath)) {
    throw new Error(`assessor ${parsed.id}: missing required ${assessPath}`);
  }
  return { ...parsed, dir, hasFix: existsSync(join(dir, 'fix.md')) };
}

/** Load every assessor found in the given directories (each child dir with assessor.yaml). */
export function loadAssessorLibrary(dirs: string[]): Map<string, AssessorDef> {
  const lib = new Map<string, AssessorDef>();
  for (const dir of dirs) {
    if (!existsSync(dir)) continue;
    for (const entry of readdirSync(dir)) {
      const child = join(dir, entry);
      if (!statSync(child).isDirectory()) continue;
      if (!existsSync(join(child, 'assessor.yaml'))) continue;
      const def = loadAssessorDir(child);
      if (lib.has(def.id)) {
        throw new Error(`duplicate assessor id '${def.id}' (${child} vs ${lib.get(def.id)?.dir})`);
      }
      lib.set(def.id, def);
    }
  }
  return lib;
}

function resolveProfilePath(ref: string, fromDir: string): string {
  // A bare name resolves to a shipped profile; anything path-like resolves
  // relative to the referring file.
  if (/^[a-z0-9-]+$/i.test(ref)) {
    const shipped = join(packageRoot(), 'profiles', `${ref}.yaml`);
    if (existsSync(shipped)) return shipped;
  }
  return isAbsolute(ref) ? ref : resolve(fromDir, ref);
}

interface RawProfile extends z.infer<typeof profileYamlSchema> {
  path: string;
}

function loadRawProfile(path: string, seen: Set<string>): RawProfile[] {
  const abs = resolve(path);
  if (seen.has(abs)) throw new Error(`profile extends cycle at ${abs}`);
  seen.add(abs);
  const parsed = profileYamlSchema.parse(parseYaml(readFileSync(abs, 'utf8')));
  const chain: RawProfile[] = [];
  if (parsed.extends) {
    chain.push(...loadRawProfile(resolveProfilePath(parsed.extends, dirname(abs)), seen));
  }
  chain.push({ ...parsed, path: abs });
  return chain;
}

const DEFAULT_MODELS: Record<ModelTier, string> = {
  scan: 'haiku',
  judge: 'sonnet',
  synthesize: 'opus',
  fix: 'sonnet',
  review: 'opus',
};

/** Load a profile file, resolving single-inheritance extends; child wins, assessor entries merge by id. */
export function loadProfile(path: string): Profile {
  const chain = loadRawProfile(path, new Set());
  const models = { ...DEFAULT_MODELS };
  let concurrency = 4;
  let maxTurnsPerTask = 60;
  let maxUsd: number | null = null;
  const assessorDirs: string[] = [];
  const conventions: string[] = [];
  const assessors = new Map<
    string,
    { id: string; enabled: boolean; weight: number; config: Record<string, unknown> }
  >();

  for (const layer of chain) {
    const layerDir = dirname(layer.path);
    for (const t of MODEL_TIERS) {
      const m = layer.models[t];
      if (m) models[t] = m;
    }
    if (layer.concurrency !== undefined) concurrency = layer.concurrency;
    if (layer.budgets.maxTurnsPerTask !== undefined)
      maxTurnsPerTask = layer.budgets.maxTurnsPerTask;
    if (layer.budgets.maxUsd !== undefined) maxUsd = layer.budgets.maxUsd;
    for (const d of layer.assessorDirs) assessorDirs.push(resolve(layerDir, d));
    for (const c of layer.conventions) conventions.push(resolve(layerDir, c));
    for (const entry of layer.assessors) {
      const prev = assessors.get(entry.id);
      assessors.set(entry.id, {
        id: entry.id,
        enabled: entry.enabled,
        weight: entry.weight,
        config: { ...(prev?.config ?? {}), ...entry.config },
      });
    }
  }

  const last = chain[chain.length - 1];
  if (!last) throw new Error('empty profile chain');
  return {
    name: last.name,
    models,
    concurrency,
    budgets: { maxTurnsPerTask, maxUsd },
    assessorDirs,
    conventions,
    assessors: [...assessors.values()].filter((a) => a.enabled),
    path: last.path,
  };
}

export interface ResolvedProfile {
  profile: Profile;
  /** Enabled assessors resolved against the library, in profile order. */
  assessors: (AssessorDef & { weight: number; config: Record<string, unknown> })[];
  warnings: string[];
}

/** Resolve a profile's assessor entries against shipped + profile-declared assessor dirs. */
export function resolveProfile(profilePath: string): ResolvedProfile {
  const profile = loadProfile(profilePath);
  const library = loadAssessorLibrary([join(packageRoot(), 'assessors'), ...profile.assessorDirs]);
  const warnings: string[] = [];
  const assessors = profile.assessors.map((entry) => {
    const def = library.get(entry.id);
    if (!def) throw new Error(`profile ${profile.name}: unknown assessor '${entry.id}'`);
    for (const key of Object.keys(entry.config)) {
      if (!(key in def.defaultConfig)) {
        warnings.push(`assessor ${entry.id}: config key '${key}' not declared in defaultConfig`);
      }
    }
    return { ...def, weight: entry.weight, config: { ...def.defaultConfig, ...entry.config } };
  });
  for (const c of profile.conventions) {
    if (!existsSync(c))
      throw new Error(`profile ${profile.name}: conventions file not found: ${c}`);
  }
  return { profile, assessors, warnings };
}
