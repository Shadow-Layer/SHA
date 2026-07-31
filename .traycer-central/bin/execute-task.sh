#!/usr/bin/env bash
# Central copy of execute-task.sh (kept in traycer-central for distribution)
set -euo pipefail

# This is the same script used in individual repos. It is recommended to keep this file
# in the central config repo and distribute it to target workspaces using the installer.

# For brevity, source the local repo's .traycer/bin/execute-task.sh if present
TARGET_SCRIPT=".traycer/bin/execute-task.sh"
if [[ -f "$TARGET_SCRIPT" ]]; then
  exec bash "$TARGET_SCRIPT" "$@"
else
  echo "Local execute-task.sh not found in target workspace (.traycer/bin/execute-task.sh)."
  echo "Please run the installer to copy the central scripts into the workspace."
  exit 2
fi
