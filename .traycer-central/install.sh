#!/usr/bin/env bash
set -euo pipefail

# Installer: idempotent backup + copy of .traycer-central into a target workspace
# Usage: install.sh [--target /path/to/workspace] [--dry-run]
# Defaults: target = current directory

DRY_RUN=false
TARGET_DIR="$(pwd)"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --target) TARGET_DIR="$2"; shift 2;;
    --dry-run) DRY_RUN=true; shift;;
    --help) echo "Usage: install.sh [--target /path] [--dry-run]"; exit 0;;
    *) echo "Unknown arg: $1"; exit 1;;
  esac
done

SRC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Installer source: $SRC_DIR"
echo "Target workspace: $TARGET_DIR"

actions=("workflows/execution-workflow.md" "bin/execute-task.sh")

for rel in "${actions[@]}"; do
  src="$SRC_DIR/$rel"
  dest="$TARGET_DIR/.traycer/$rel"
  dest_dir="$(dirname "$dest")"

  if [[ ! -f "$src" ]]; then
    echo "Skipping missing source: $src"
    continue
  fi

  echo "\nProcessing $rel"
  echo " - src: $src"
  echo " - dest: $dest"

  if [[ -f "$dest" ]]; then
    # compare files; if identical, skip
    if cmp -s "$src" "$dest"; then
      echo " - dest exists and is identical; skipping"
      continue
    fi

    # backup existing dest
    backup_dir="$TARGET_DIR/.traycer-backups/$(date -u +%Y%m%dT%H%M%SZ)"
    mkdir -p "$backup_dir"
    echo " - dest exists and differs; backing up to $backup_dir"
    if [[ "$DRY_RUN" == "false" ]]; then
      cp -a "$dest" "$backup_dir/"
    fi
  else
    echo " - dest does not exist; will install"
    mkdir -p "$dest_dir"
  fi

  # copy
  if [[ "$DRY_RUN" == "true" ]]; then
    echo " - dry-run: would copy $src -> $dest"
  else
    cp -a "$src" "$dest"
    echo " - copied $src -> $dest"
    # preserve executable bit
    if [[ -x "$src" ]]; then
      chmod +x "$dest" || true
    fi
  fi
done

# Post-install message
if [[ "$DRY_RUN" == "true" ]]; then
  echo "\nDry-run complete. No files were modified."
else
  echo "\nInstall complete. Backups (if any) are under $TARGET_DIR/.traycer-backups"
fi
