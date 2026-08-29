// Library surface for embedding shipshape programmatically.
export * from './core/types.js';
export {
  loadAssessorDir,
  loadAssessorLibrary,
  loadProfile,
  resolveProfile,
} from './core/config.js';
export { TaskGraph } from './core/graph.js';
export { validateAssessorReport, parseReview } from './core/reportio.js';
export { resolveTargets } from './core/targets.js';
export { runReport } from './pipeline/report.js';
export { runDoctor } from './pipeline/doctor.js';
