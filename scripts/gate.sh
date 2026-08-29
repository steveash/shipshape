#!/usr/bin/env bash
# The single source of truth for the quality gate, run BOTH locally and in CI
# so the two can never drift. Dev mode auto-fixes what tools can fix; --check
# only verifies (CI uses --check). If this passes locally, CI passes.
# Shipped assessor/profile data is validated inside the test suite
# (tests/data-validation.test.ts) so it cannot rot without failing this gate.
set -euo pipefail
cd "$(dirname "$0")/.."

if [[ "${1:-}" == "--check" ]]; then
  echo "== prettier check =="; npx prettier --check src tests
  echo "== eslint ==";         npx eslint src tests
else
  echo "== prettier (auto) =="; npx prettier --write src tests
  echo "== eslint (--fix) ==";  npx eslint --fix src tests
fi
echo "== typecheck =="; npx tsc -p tsconfig.json --noEmit
echo "== vitest ==";    npx vitest run
echo "gate: OK"
