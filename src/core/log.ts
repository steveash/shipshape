// Minimal structured console logging. Shipshape is a long-running CLI; every
// line answers "what is it doing right now" for a human watching the run.

const start = Date.now();

function stamp(): string {
  const s = Math.round((Date.now() - start) / 1000);
  const mm = String(Math.floor(s / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

export const log = {
  info(msg: string): void {
    console.log(`[${stamp()}] ${msg}`);
  },
  warn(msg: string): void {
    console.warn(`[${stamp()}] WARN ${msg}`);
  },
  error(msg: string): void {
    console.error(`[${stamp()}] ERROR ${msg}`);
  },
};
