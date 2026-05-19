# pi-jj

Pi extension for JJ.

## Behavior
- If `jj` is installed, show JJ status.
- If `jj` is missing, show an install-needed message.
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
