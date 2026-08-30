// Shared types for the shipshape engine. Contracts here mirror the specs:
// assessors (spec 020), profiles (spec 030), task graph (spec 040).

export type ModelTier = 'scan' | 'judge' | 'synthesize' | 'fix' | 'review';

export const MODEL_TIERS: ModelTier[] = ['scan', 'judge', 'synthesize', 'fix', 'review'];

export type AssessorCategory = 'docs' | 'process' | 'enforcement' | 'legibility' | 'operations';

export interface AssessorDef {
  id: string;
  title: string;
  category: AssessorCategory;
  summary: string;
  practice: string;
  tiers: ModelTier[];
  needsExecution: boolean;
  appliesTo: string;
  canReview: boolean;
  reviewsCategories: AssessorCategory[];
  defaultConfig: Record<string, unknown>;
  /** Directory holding assessor.yaml, assess.md, fix.md */
  dir: string;
  hasFix: boolean;
}

export interface ProfileAssessorEntry {
  id: string;
  enabled: boolean;
  weight: number;
  config: Record<string, unknown>;
}

export interface ProviderConfig {
  /** Which endpoint the Claude Code runtime should call. */
  type: 'anthropic' | 'bedrock';
  /** Bedrock: AWS region (-> AWS_REGION). Omit to use the ambient AWS config. */
  region?: string;
  /** Bedrock: custom endpoint/gateway URL (-> ANTHROPIC_BEDROCK_BASE_URL). */
  baseUrl?: string;
  /** Bedrock: preferred cross-region inference profile prefix (-> ANTHROPIC_BEDROCK_REGION_PREFIX). */
  regionPrefix?: string;
  /** Bedrock: service tier (-> ANTHROPIC_BEDROCK_SERVICE_TIER). */
  serviceTier?: 'default' | 'flex' | 'priority';
  /**
   * Extra environment for the agent runtime (e.g. AWS_PROFILE, model pins
   * like ANTHROPIC_DEFAULT_SONNET_MODEL). Keys are restricted to the
   * AWS_/ANTHROPIC_/CLAUDE_CODE_ prefixes; see config.ts.
   */
  env: Record<string, string>;
}

export interface Profile {
  name: string;
  provider: ProviderConfig;
  models: Record<ModelTier, string>;
  concurrency: number;
  budgets: { maxTurnsPerTask: number; maxUsd: number | null };
  assessorDirs: string[];
  conventions: string[];
  assessors: ProfileAssessorEntry[];
  /** Absolute path of the profile file this was loaded from. */
  path: string;
}

export interface Target {
  /** Absolute path to the package/repo root. */
  path: string;
  name: string;
  isGitRepo: boolean;
  isMeta: boolean;
}

export interface TargetSet {
  targets: Target[];
  meta: Target | null;
}

export type TaskStatus = 'pending' | 'running' | 'done' | 'failed' | 'skipped';

export interface TaskNode {
  id: string;
  type: string;
  deps: string[];
  params: Record<string, unknown>;
  status: TaskStatus;
  attempts: number;
  error: string | null;
  note: string | null;
  startedAt: string | null;
  endedAt: string | null;
}

export interface TaskGraphFile {
  version: 1;
  tasks: TaskNode[];
}

export interface RunManifest {
  runId: string;
  mode: 'report' | 'doctor';
  createdAt: string;
  targets: { path: string; name: string; isMeta: boolean }[];
  profileName: string;
  profilePath: string;
  /**
   * The provider the run actually used (including a --bedrock CLI flip).
   * Resume and doctor honor this over the profile file so an interrupted
   * Bedrock run can never silently revert to the Anthropic API. Absent on
   * manifests from older versions.
   */
  provider?: ProviderConfig;
  models: Record<ModelTier, string>;
  conventions: string[];
  assessorIds: string[];
  shipshapeVersion: string;
}

export interface CostEntry {
  taskId: string;
  tier: ModelTier;
  model: string;
  costUsd: number;
  turns: number;
  durationMs: number;
  at: string;
}

export interface AgentRunRequest {
  /** Task id, used for transcript + cost attribution. */
  taskId: string;
  tier: ModelTier;
  prompt: string;
  systemPrompt: string;
  cwd: string;
  /** Tool names granted (auto-allowed). */
  tools: string[];
  maxTurns?: number;
  /** Additional directories the agent may access beyond cwd. */
  addDirs?: string[];
}

export interface AgentRunResult {
  ok: boolean;
  /** Final assistant text (result string). */
  text: string;
  costUsd: number;
  turns: number;
  durationMs: number;
  error?: string;
}

export interface ReportFrontmatter {
  assessor: string;
  title: string;
  category: AssessorCategory;
  level: 1 | 2 | 3 | 4 | 5;
  confidence: 'high' | 'medium' | 'low';
  summary: string;
  strengths: number;
  opportunities: number;
  fixable: boolean;
  resources: { path: string; description: string }[];
}

export interface FixPlanEntry {
  slug: string;
  assessorId: string;
  findings: number[];
  planSummary: string;
  impact: 'high' | 'medium' | 'low';
  effort: 'small' | 'medium' | 'large';
  dependsOn: string[];
}

export type ReviewVerdict = 'approve' | 'revise' | 'reject';

export interface FixRecord {
  slug: string;
  assessorId: string;
  branch: string;
  baseBranch: string;
  status: 'planned' | 'implemented' | 'approved' | 'revised' | 'rejected' | 'failed' | 'dropped';
  findings: number[];
  planSummary: string;
  impact: 'high' | 'medium' | 'low';
  effort: 'small' | 'medium' | 'large';
  dependsOn: string[];
  verdict: ReviewVerdict | null;
  blocking: string[];
  advisory: string[];
  targetPath: string;
}
