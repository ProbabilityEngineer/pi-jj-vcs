---
id: pjga-2no2
status: closed
deps: []
links: []
created: 2026-05-28T18:22:25Z
type: bug
priority: 1
assignee: ProbabilityEngineer
---
# Make jj/git status reads non-mutating

Ensure status widget/tool uses safe non-mutating jj/git reads, especially jj --ignore-working-copy, so signing/passphrase prompts cannot poison Pi sessions.

