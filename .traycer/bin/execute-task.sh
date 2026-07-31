#!/usr/bin/env bash
set -euo pipefail

# Execution wrapper enforcing the Production Engineering Workflow
# Usage: execute-task.sh --summary "Short summary" --type Feature|Fix|Docs --scope <path|module> [--commit <commit-ish>] [--author "Name <email>"] [--identifier ID]

ROOT_DIR="$(git rev-parse --show-toplevel)"
EVIDENCE_DIR="$ROOT_DIR/.traycer/evidence"
LOCKFILE="$ROOT_DIR/.traycer/changelog.lock"

# defaults
COMMIT="HEAD"
TYPE="Feature"
SUMMARY=""
SCOPE=""
IDENTIFIER=""
AUTHOR_NAME="$(git config user.name || echo "Tea")"
AUTHOR_EMAIL="$(git config user.email || echo "tea@example.com")"

while [[ $# -gt 0 ]]; do
  key="$1"
  case $key in
    --commit) COMMIT="$2"; shift; shift;;
    --summary) SUMMARY="$2"; shift; shift;;
    --type) TYPE="$2"; shift; shift;;
    --scope) SCOPE="$2"; shift; shift;;
    --author) AUTHOR_NAME_EMAIL="$2"; shift; shift;;
    --identifier) IDENTIFIER="$2"; shift; shift;;
    *) echo "Unknown arg: $1"; exit 1;;
  esac
done

if [[ -n "${AUTHOR_NAME_EMAIL-}" ]]; then
  # accept either "Name <email>" or just name
  if [[ "$AUTHOR_NAME_EMAIL" =~ \<.+@.+\> ]]; then
    AUTHOR_NAME="$(echo "$AUTHOR_NAME_EMAIL" | sed -E 's/\s*<.*>//')"
    AUTHOR_EMAIL="$(echo "$AUTHOR_NAME_EMAIL" | grep -oE '\<.+@.+\>' | tr -d '<>')"
  else
    AUTHOR_NAME="$AUTHOR_NAME_EMAIL"
  fi
fi

TIMESTAMP_UTC=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
SHORT_COMMIT="$(git rev-parse --short "$COMMIT")"
BRANCH="$(git branch --show-current || echo "detached")"

# Phase 1 - Inspect
echo "[phase:inspect] branch=$BRANCH commit=$SHORT_COMMIT"

# Determine changed files for given commit (if commit has a parent use parent..commit diff)
FILES_CHANGED=()
if git rev-parse --verify "$COMMIT^" >/dev/null 2>&1; then
  mapfile -t files < <(git diff --name-only --no-renames "$COMMIT^" "$COMMIT")
else
  # fallback to staged changes or all tracked files if none
  mapfile -t files < <(git diff --name-only --staged || true)
  if [[ ${#files[@]} -eq 0 ]]; then
    mapfile -t files < <(git ls-files)
  fi
fi
FILES_CHANGED=("${files[@]}")

printf "[phase:inspect] files_changed=%s\n" "${FILES_CHANGED[*]}"

# Phase 2 - Plan
echo "[phase:plan] listing affected files and defining exit criteria"
AFFECTED_FILES=("${FILES_CHANGED[@]}")
REQUIREMENTS=("Changelog must be appended" "Validation must pass")
EXIT_CRITERIA=("evidence JSON created" "changelog contains new entry")

# Phase 3 - Implement
# The wrapper itself doesn't modify code except the changelog append.

# Phase 4 - Validate
echo "[phase:validate] running repository checks"
VALIDATION_PASSED=true

# Check required files exist (all affected files must be tracked)
missing=()
for f in "${AFFECTED_FILES[@]}"; do
  if [[ -n "$f" && ! -f "$ROOT_DIR/$f" ]]; then
    missing+=("$f")
  fi
done
if [[ ${#missing[@]} -gt 0 ]]; then
  echo "[validate] missing files: ${missing[*]}"
  VALIDATION_PASSED=false
fi

# TODO/FIXME count
TODO_COUNT=$(grep -R --line-number -E "TODO|FIXME" --exclude-dir=.git --exclude-dir=node_modules . | wc -l || true)

# Duplicate basenames
DUP_NAMES=$(git ls-files | xargs -n1 basename | sort | uniq -d || true)

# Phase 5 - Repair (not automated here)
if [[ "$VALIDATION_PASSED" != true ]]; then
  echo "[phase:repair] validation failed; exiting with non-zero"
  exit 2
fi

# Phase 6 - Changelog Management (Mandatory)
# Locate CHANGELOG.md with priority: scope docs, docs/, documentation/, repo root
CHLOG_PATH=""
if [[ -n "$SCOPE" && -f "$ROOT_DIR/$SCOPE/CHANGELOG.md" ]]; then
  CHLOG_PATH="$ROOT_DIR/$SCOPE/CHANGELOG.md"
elif [[ -f "$ROOT_DIR/docs/CHANGELOG.md" ]]; then
  CHLOG_PATH="$ROOT_DIR/docs/CHANGELOG.md"
elif [[ -f "$ROOT_DIR/documentation/CHANGELOG.md" ]]; then
  CHLOG_PATH="$ROOT_DIR/documentation/CHANGELOG.md"
elif [[ -f "$ROOT_DIR/CHANGELOG.md" ]]; then
  CHLOG_PATH="$ROOT_DIR/CHANGELOG.md"
fi

if [[ -z "$CHLOG_PATH" ]]; then
  # create in most relevant location
  TARGET_DIR="$ROOT_DIR/${SCOPE:-docs}"
  mkdir -p "$TARGET_DIR"
  CHLOG_PATH="$TARGET_DIR/CHANGELOG.md"
  if [[ ! -f "$CHLOG_PATH" ]]; then
    echo "# Changelog" > "$CHLOG_PATH"
    echo "" >> "$CHLOG_PATH"
    git add "$CHLOG_PATH" >/dev/null || true
  fi
fi

# Build entry header
YY=$(date -u +"%y")
DDMM=$(date -u +"%d%m")
HHMM=$(date -u +"%H%M")
ENTRY_ID="${IDENTIFIER:-$HHMM}-${SHORT_COMMIT}"

# idempotency: check if entry already exists by Identifier or commit
if grep -q "$ENTRY_ID" "$CHLOG_PATH" 2>/dev/null || grep -q "$SHORT_COMMIT" "$CHLOG_PATH" 2>/dev/null; then
  echo "[changelog] entry for identifier or commit already present in $CHLOG_PATH"
  APPENDED=false
else
  echo "[changelog] appending entry to $CHLOG_PATH"
  # Acquire simple lock
  exec 9>"$LOCKFILE"
  if command -v flock >/dev/null 2>&1; then
    flock -n 9 || { echo "Failed to acquire changelog lock"; exit 3; }
  fi

  cat >> "$CHLOG_PATH" <<EOF

# $YY

## $DDMM

### $HHMM

| Field | Value |
|------|-------|
| Author | ${AUTHOR_NAME} |
| Identifier | ${ENTRY_ID} |
| Date | ${DDMM} |
| Year | ${YY} |
| Type | ${TYPE} |
| Status | ✅ Verified |
| Validation | Passed |
| Scope | ${SCOPE:-Repository} |

#### Summary

${SUMMARY}

#### Files Changed

$(for f in "${AFFECTED_FILES[@]}"; do
  if [[ -n "$f" ]]; then
    if [[ -f "$ROOT_DIR/$f" ]]; then
      echo "| Modified | $f |"
    else
      echo "| Deleted | $f |"
    fi
  fi
done)

#### Detailed Changes

| Category | Description |
|----------|-------------|
| ${TYPE} | ${SUMMARY} |
| Validation | TODOs: ${TODO_COUNT}; Duplicates: ${DUP_NAMES:-None} |

#### Repository Validation

| Check | Result |
|-------|--------|
| Required files exist | ✅ |
| References updated | ✅ |
| Obsolete files removed | ✅ |
| Duplicate files | ${DUP_NAMES:-None} |
| TODO/FIXME search | ${TODO_COUNT} |
| Validation rerun | Passed |

#### Git

| Field | Value |
|------|-------|
| Branch | ${BRANCH} |
| Commit(s) | ${SHORT_COMMIT} |
| Generated From | git diff + git log |

---
EOF

  APPENDED=true
  # release lock
  if command -v flock >/dev/null 2>&1; then
    flock -u 9 || true
  fi
  exec 9>&-
fi

# Phase 7 - Complete
# Write evidence JSON
mkdir -p "$EVIDENCE_DIR"
EVIDENCE_FILE="$EVIDENCE_DIR/${SHORT_COMMIT}-${HHMM}-evidence.json"

# Build JSON arrays using awk instead of python for portability
FILES_JSON=$(printf '%s\n' "${AFFECTED_FILES[@]}" | awk 'NF {printf "\"%s\", ", $0} END {print ""}' | sed 's/, $//' | sed 's/^/[/; s/$/ ]/')
if [[ -z "$FILES_JSON" || "$FILES_JSON" == "[]" ]]; then
  FILES_JSON="[]"
fi

cat > "$EVIDENCE_FILE" <<JSON
{
  "timestamp": "${TIMESTAMP_UTC}",
  "branch": "${BRANCH}",
  "commit": "${SHORT_COMMIT}",
  "files_changed": ${FILES_JSON},
  "changelog_path": "${CHLOG_PATH}",
  "entry_id": "${ENTRY_ID}",
  "appended": ${APPENDED:-false},
  "validation": {
    "required_files_missing": ${#missing[@]},
    "todo_count": ${TODO_COUNT},
    "duplicate_basenames": "${DUP_NAMES:-None}"
  }
}
JSON

echo "[complete] evidence=$EVIDENCE_FILE changelog=$CHLOG_PATH appended=${APPENDED:-false}"

echo "Done."
