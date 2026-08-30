#!/usr/bin/env bash
# Wires the committed git hooks (pre-commit runs the gate in check mode).
# Run once after clone: ./scripts/install-hooks.sh (documented in README).
set -euo pipefail
cd "$(dirname "$0")/.."
git config core.hooksPath .githooks
echo "git hooks installed (core.hooksPath=.githooks)"
