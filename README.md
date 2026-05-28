# pi-jj-git-align

Guarded jj+Git publish alignment for git-colocated Jujutsu repos in Pi.

Jujutsu/jj status and guarded GitHub publishing for colocated jj+Git repos in Pi. Shows repo state, warns about jj/Git misalignment, and provides `/jj-align-push` plus a model-visible `jj_vcs` tool to align the target branch/bookmark, Git HEAD, and origin with `@-` (the completed change) before declaring work pushed. Defaults to the current Git branch, then a bookmark on `@` or `@-`. Keeps prompt overhead low: it registers a compact tool and commands, but does not inject dynamic VCS status into model context.

Links: [Pi](https://github.com/earendil-works/pi) · [Jujutsu](https://github.com/jj-vcs/jj)

## What it does

- Shows status of your Jujutsu repo above the text box when `jj` is installed, prioritizing the parent/previous parked change (`@-`) for context, followed by the current working-copy change (`@`) and dirty status.
- Shows an install-needed message when `jj` is missing.
- Provides `/jj-init` to initialize JJ in the current repo and install/refresh JJ guidance in `AGENTS.md`.
- Provides `/jj-status` to toggle the status widget on/off.
- Provides `/jj-align-push [branch]` to require a clean JJ working copy, align the branch bookmark to the parked change, export/import Git, attach Git HEAD to that branch, and run `git push origin <branch>` after confirmation.
- Provides the agent-callable `jj_vcs` tool with `status` and `align_push` actions for model-visible alignment checks.
- Works with colocated jj + git repos: use jj locally, and use git push/fetch for remote sync.
- Warns when the resolved target branch does not match the current or parked JJ bookmark, when dirty work was already present at session start, or when a clean-looking colocated repo is not publish-aligned (`main`, `main@git`, `main@origin`, Git HEAD, and `@-`).
- Polls active JJ repos every 5 seconds while the Pi UI is running, using non-mutating `jj --ignore-working-copy` reads so status display does not snapshot/sign commits.
- Avoids prompt injection and other dynamic context; status UI is human-visible, and agents can request model-visible status explicitly with `jj_vcs`.
- Keeps the package lightweight and non-invasive.

## Install

From npm:

```bash
pi install npm:pi-jj-git-align
```

From GitHub:

```bash
pi install git:github.com/ProbabilityEngineer/pi-jj-git-align
```

For project-local install, add `-l`:

```bash
pi install -l git:github.com/ProbabilityEngineer/pi-jj-git-align
```

## Use

- In Pi, run `/jj-init` in a repo to set up JJ.
- Run `/jj-status` to hide/show the JJ status widget.
- After finishing work, use shell `jj describe -m "message"` and `jj new --no-edit` so `@` is an empty working-copy change and `@-` is the completed change.
- Run `/jj-align-push main` to confirm bookmark alignment to `@-`, export/import Git, attach Git HEAD to `main`, and push `main` for off-machine backup. If no branch is provided, it defaults to the current Git branch, then a bookmark on `@` or `@-`.
- Desired final shape after backup: `@` is clean/empty, `@-` is the completed change, `main`, `main@git`, and `main@origin` point to `@-`, Git HEAD is attached to `main`, and `git status --short --branch` is clean.

## Workflow

- Prefer `jj` for local edits, status, and history operations.
- Avoid Git staged-index workflows (`git add`, `git commit`, `git diff --cached`) unless explicitly needed.
- Allow `git fetch` and `git push` for colocated remote sync.
- Before declaring work pushed or clean, completed work should usually be at `@-`, with the target bookmark moved to `@-`, exported to Git, pushed, imported back, and verified against `main@origin`. Agents should call `jj_vcs` with `action: "status"` when unsure.
- Avoid dynamic prompt injection; keep guidance static and cache-friendly.
- `scripts/ensure-jj.sh /path/to/repo` does the same from the shell.
