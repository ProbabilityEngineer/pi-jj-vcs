# Agent Instructions

<!-- pi-jj-vcs:jjtips:start -->
## Jujutsu Version Control
- Use JJ for local work: `jj status`, `jj diff`, `jj log`, `jj describe -m "message"`, `jj new`, `jj op log`, and `jj undo`.
- Do not use Git staged-index workflows: no `git add`, `git commit`, `git diff --cached`, or `git pull --rebase`.
- After completing coherent agent-owned work, run `jj describe -m "message"` and `jj new` before starting unrelated work.
- If `jj status` is dirty before you start, treat it as pre-existing user work unless explicitly told to continue it.
- For off-machine backup, prefer `/jj-backup [branch]`; use `/jj-bookmark <branch> [rev]` only for intentional bookmark alignment.
<!-- pi-jj-vcs:jjtips:end -->
