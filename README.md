# pi-jj-vcs

Pi extension for agent-friendly Jujutsu (jj) VCS setup and status.
https://github.com/jj-vcs/jj

## What it does

- Shows status of your Jujutsu repo when `jj` is installed.
- Shows an install-needed message when `jj` is missing.
- Provides `/jj-init` to initialize JJ in the current repo.
- Provides `/jj-status` to toggle the statusline on/off.

## Install

```bash
pi install -l github.com/ProbabilityEngineer/pi-jj-vcs
```

## Use

- In Pi, run `/jj-init` in a repo to set up JJ.
- Run `/jj-status` to hide/show the JJ statusline.
- `scripts/ensure-jj.sh /path/to/repo` does the same from the shell.
