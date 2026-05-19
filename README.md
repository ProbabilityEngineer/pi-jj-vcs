# pi-jj

Pi extension for JJ status and setup.

## Behavior
- If `jj` is installed, show JJ status.
- If `jj` is missing, show an install-needed message.
- `/jj-init` installs/initializes JJ for the current repo.
- `/jj-status` toggles the JJ statusline on/off.
- `scripts/ensure-agents.sh` adds `AGENTS.md` using the shared guidance generator when needed.
- `scripts/ensure-jj.sh` installs/initializes JJ and then ensures `AGENTS.md` exists.

## Install
```bash
pi install -l git:/Users/sam/git/agents/pi-jj
```

## Bootstrap
```bash
scripts/ensure-jj.sh /path/to/repo
```
