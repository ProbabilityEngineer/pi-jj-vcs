#!/usr/bin/env bash
set -euo pipefail

repo="${1:-.}"
repo="$(cd "$repo" && pwd)"
out="$repo/AGENTS.md"

repo_specific=""
if [[ -f "$out" ]]; then
  repo_specific="$(awk '/<!-- BEGIN REPO SPECIFIC -->/{in_block=1; next} /<!-- END REPO SPECIFIC -->/{in_block=0; next} in_block {print}' "$out")"
fi

cat >"$out" <<'EOF'
<!-- BEGIN GENERATED AGENT GUIDANCE -->
# Agent Instructions

Prefer `lsp_navigation` for definitions, references, renames, code actions, hover, and call hierarchy; use `lsp_diagnostics` before builds.

Prefer `ast_grep_replace` for single-token/line structural replacements; use `edit` for complex multi-line changes.

Swift: empty/failed LSP results are inconclusive. Fall back to readmap, `ast-grep`, `ffgrep`/exact search, and Semble. When removing/renaming parameters, search tests and other targets before building. For Xcode projects, prefer `xcodebuild -quiet` with focused `-only-testing` selectors, do not chain `xcodebuild` with other commands, and summarize only the relevant failure lines instead of dumping full logs.

## Code Search

Use Semble for behavior/intent discovery: `semble search "<query>" .`. Use `fffind`/`ffgrep` for fast fuzzy/exact search. Prefer LSP or `ast_grep_search` for exact callsites, renames, references, and structural edits.

## Non-Interactive Shell Commands

Avoid hangs from aliased prompts. Use force/non-interactive flags for file and remote operations: `cp -f`, `mv -f`, `rm -f`, `rm -rf`, `cp -rf`, `scp -o BatchMode=yes`, `ssh -o BatchMode=yes`, `apt-get -y`; set `HOMEBREW_NO_AUTO_UPDATE=1` for `brew`.
EOF

if [[ -n "$repo_specific" ]]; then
  printf '\n<!-- END GENERATED AGENT GUIDANCE -->\n\n<!-- BEGIN REPO SPECIFIC -->\n%s\n<!-- END REPO SPECIFIC -->\n' "$repo_specific" >>"$out"
else
  cat >>"$out" <<'EOF'

<!-- END GENERATED AGENT GUIDANCE -->

<!-- BEGIN REPO SPECIFIC -->
<!--
Add project-specific notes here. This section is preserved by scripts/generate-agents.sh.

## Build & Test
## Architecture Overview
## Conventions & Patterns
-->
<!-- END REPO SPECIFIC -->
EOF
fi

echo "Wrote $out"
