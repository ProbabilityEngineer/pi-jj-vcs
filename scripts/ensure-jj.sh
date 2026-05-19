#!/usr/bin/env bash
set -euo pipefail

repo="${1:-.}"
repo="$(cd "$repo" && pwd)"

if ! command -v jj >/dev/null 2>&1; then
  echo "jj is not installed. Install it first, then rerun this script." >&2
  exit 1
fi

if [[ -d "$repo/.git" && ! -d "$repo/.jj" ]]; then
  jj git init "$repo"
fi

/Users/sam/git/agents/pi-jj/scripts/ensure-agents.sh "$repo"
