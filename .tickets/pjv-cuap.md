---
id: pjv-cuap
status: closed
deps: []
links: []
created: 2026-05-27T21:43:03Z
type: feature
priority: 1
assignee: ProbabilityEngineer
---
# Add jj GitHub alignment warnings

Warn when colocated jj/Git repos look clean but are not publish-aligned: @ is not empty, main/main@origin do not point to @-, or Git HEAD is detached.

## Acceptance Criteria

Status output or statusline clearly flags misalignment; clean/pushed guidance includes final shape; TypeScript/checks pass.

