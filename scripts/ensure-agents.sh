#!/usr/bin/env bash
set -euo pipefail

repo="${1:-.}"
repo="$(cd "$repo" && pwd)"

existing="$(grep -n "<!-- BEGIN GENERATED AGENT GUIDANCE -->" "$repo/AGENTS.md" 2>/dev/null || true)"
if [[ -n "$existing" ]]; then
	echo "AGENTS.md already has generated guidance; refreshing"
fi

"$(dirname "$0")/generate-agents.sh" "$repo"
