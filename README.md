# pi-jj-vcs

Pi extension for agent-friendly Jujutsu (jj) version control system setup and status.
https://github.com/earendil-works/pi
https://github.com/jj-vcs/jj

## What it does

- Shows status of your Jujutsu repo above the text box when `jj` is installed, prioritizing the parent/previous parked change (`@-`) for context, followed by the current working-copy change (`@`) and dirty status.
- Shows an install-needed message when `jj` is missing.
- Provides `/jj-init` to initialize JJ in the current repo and install/refresh JJ guidance in `AGENTS.md`.
- Provides `/jj-status` to toggle the status widget on/off.
- Provides `/jj-agents` to install or refresh a minimal managed JJ guidance block in `AGENTS.md`.
- Provides `/jj-new` to create a new JJ change.
- Provides `/jj-describe` to update the current change description.
- Provides `/jj-diff` to show a short diff summary.
- Provides `/jj-bookmark <branch> [rev]` to create or move a JJ bookmark after confirmation. The default rev is `@-`.
- Provides `/jj-backup [branch]` to require a clean JJ working copy, align the branch bookmark to the parked change, attach Git HEAD to that branch, and run `git push origin <branch>` after confirmation.
- Works with colocated jj + git repos: use jj locally, and use git push/fetch for remote sync.
- Warns when the discovered Git branch/backup branch does not match the current or parked JJ bookmark, when dirty work was already present at session start, or when a clean-looking colocated repo is not publish-aligned (`main`, `main@git`, `main@origin`, Git HEAD, and `@-`).
- Polls active JJ repos every 5 seconds while the Pi UI is running, so changes made in another terminal are reflected automatically.
- Avoids prompt injection and other dynamic context.
- Keeps the package lightweight and non-invasive.

## Install

```bash
pi install -l github.com/ProbabilityEngineer/pi-jj-vcs
```

## Use

- In Pi, run `/jj-init` in a repo to set up JJ.
- Run `/jj-status` to hide/show the JJ status widget.
- After finishing work, run `/jj-describe <message>` and `/jj-new` so `@` is an empty working-copy change and `@-` is the completed change.
- Run `/jj-bookmark main` only when you intentionally want to point `main` at a specific revision; the default revision is `@-`.
- Run `/jj-backup main` to confirm bookmark alignment to `@-`, attach Git HEAD to `main`, and push `main` for off-machine backup.
- Desired final shape after backup: `@` is clean/empty, `@-` is the completed change, `main`, `main@git`, and `main@origin` point to `@-`, Git HEAD is attached to `main`, and `git status --short --branch` is clean.

## Workflow

- Prefer `jj` for local edits, status, and history operations.
- Avoid Git staged-index workflows (`git add`, `git commit`, `git diff --cached`) unless explicitly needed.
- Allow `git fetch` and `git push` for colocated remote sync.
- Before declaring work pushed or clean, completed work should usually be at `@-`, with the target bookmark moved to `@-`, exported to Git, pushed, imported back, and verified against `main@origin`.
- Avoid dynamic prompt injection; keep guidance static and cache-friendly.
- `scripts/ensure-jj.sh /path/to/repo` does the same from the shell.
