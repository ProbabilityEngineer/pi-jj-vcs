# pi-jj-vcs

Pi extension for agent-friendly Jujutsu (jj) version control system setup and status.
https://github.com/earendil-works/pi
https://github.com/jj-vcs/jj

## What it does

- Shows status of your Jujutsu repo when `jj` is installed, prioritizing the current working-copy change (`@`) and parent/previous parked change (`@-`) after `jj new`.
- Shows an install-needed message when `jj` is missing.
- Provides `/jj-init` to initialize JJ in the current repo and install/refresh JJ guidance in `AGENTS.md`.
- Provides `/jj-status` to toggle the statusline on/off.
- Provides `/jj-agents` to install or refresh a minimal managed JJ guidance block in `AGENTS.md`.
- Provides `/jj-new` to create a new JJ change.
- Provides `/jj-describe` to update the current change description.
- Provides `/jj-diff` to show a short diff summary.
- Provides `/jj-bookmark <branch> [rev]` to create or move a JJ bookmark after confirmation. The default rev is `@-`.
- Provides `/jj-backup [branch]` to require a clean JJ working copy, align the branch bookmark to the parked change, attach Git HEAD to that branch, and run `git push origin <branch>` after confirmation.
- Works with colocated jj + git repos: use jj locally, and use git push/fetch for remote sync.
- Warns when the discovered Git branch/backup branch does not match the current or parked JJ bookmark, and when dirty work was already present at session start.
- Avoids prompt injection and other dynamic context.
- Keeps the package lightweight and non-invasive.

## Install

```bash
pi install -l github.com/ProbabilityEngineer/pi-jj-vcs
```

## Use

- In Pi, run `/jj-init` in a repo to set up JJ.
- Run `/jj-status` to hide/show the JJ statusline.
- Run `/jj-bookmark main` after `jj new` to point `main` at the parked change.
- Run `/jj-backup main` to confirm bookmark alignment, attach Git HEAD to `main`, and push `main` for off-machine backup.

## Workflow

- Prefer `jj` for local edits, status, and history operations.
- Allow `git fetch` and `git push` for colocated remote sync.
- Avoid dynamic prompt injection; keep guidance static and cache-friendly.
- `scripts/ensure-jj.sh /path/to/repo` does the same from the shell.
