Execution Workflow

This directory contains reusable workflow templates for execution-time enforcement.

execute-task.sh
- Location: .traycer/bin/execute-task.sh
- Purpose: wrapper that runs the mandated phases, appends an entry to CHANGELOG.md (append-only), and emits a JSON evidence file in .traycer/evidence.
- Usage example:

  .traycer/bin/execute-task.sh --summary "Fix loan calculation edge case" --type Fix --scope source/loan --commit HEAD

Notes:
- The script prefers git plumbing for deterministic info (branch, commit, diff).
- The changelog append is atomic via a lockfile and idempotent by entry identifier or commit.
