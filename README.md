# pi-jj-vcs

Pi extension for agent-friendly Jujutsu (jj) version control system setup and status.
https://github.com/earendil-works/pi
https://github.com/jj-vcs/jj

## What it does

- Shows status of your Jujutsu repo when `jj` is installed.
- Shows an install-needed message when `jj` is missing.
- Provides `/jj-init` to initialize JJ in the current repo.
- Provides `/jj-status` to toggle the statusline on/off.
- Works with colocated jj + git repos: use jj locally, and use git push/fetch for remote sync.
- Avoids prompt injection and other dynamic context.
- Keeps the package lightweight and non-invasive.

## Install

```bash
pi install -l github.com/ProbabilityEngineer/pi-jj-vcs
```

## Use

- In Pi, run `/jj-init` in a repo to set up JJ.
- Run `/jj-status` to hide/show the JJ statusline.

## Workflow

- Prefer `jj` for local edits, status, and history operations.
- Allow `git fetch` and `git push` for colocated remote sync.
- Avoid dynamic prompt injection; keep guidance static and cache-friendly.
- `scripts/ensure-jj.sh /path/to/repo` does the same from the shell.
