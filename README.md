# pi-jj

Pi extension for JJ setup and status.

## What it does
- Shows JJ status when `jj` is installed.
- Shows an install-needed message when `jj` is missing.
- Provides `/jj-init` to initialize JJ in the current repo.
- Provides `/jj-status` to toggle the statusline on/off.

## Install
```bash
pi install -l git:github.com/ProbabilityEngineer/pi-jj
```

## Use
- In Pi, run `/jj-init` in a repo to set up JJ.
- Run `/jj-status` to hide/show the JJ statusline.
- `scripts/ensure-jj.sh /path/to/repo` does the same from the shell.
