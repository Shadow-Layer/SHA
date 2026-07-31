#!/usr/bin/env bash
set -euo pipefail

# package_installer.sh
# Creates a single-file self-extracting installer `traycer-installer.sh`
# Usage: ./package_installer.sh --out /path/to/traycer-installer.sh
# The generated installer accepts --target and --dry-run like install.sh

OUT="./traycer-installer.sh"
while [[ $# -gt 0 ]]; do
  case "$1" in
    --out) OUT="$2"; shift 2;;
    --help) echo "Usage: $0 [--out PATH]"; exit 0;;
    *) echo "Unknown arg: $1"; exit 1;;
  esac
done

SRC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TMPDIR="$(mktemp -d)"
ARCHIVE="$TMPDIR/traycer-central.tar.gz"

# Create tarball of the central directory contents (relative paths)
( cd "$SRC_DIR" && tar -czf "$ARCHIVE" --transform 's,^,traycer-central/,' . )

# Base64-encode the archive
B64="$TMPDIR/traycer-central.tar.gz.b64"
base64 "$ARCHIVE" > "$B64"

cat > "$OUT" <<'SH'
#!/usr/bin/env bash
set -euo pipefail

# Self-extracting Traycer installer
# Usage: traycer-installer.sh [--target /path/to/workspace] [--dry-run]

TARGET="$(pwd)"
DRY_RUN=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --target) TARGET="$2"; shift 2;;
    --dry-run) DRY_RUN=true; shift;;
    --help) echo "Usage: $0 [--target /path] [--dry-run]"; exit 0;;
    *) echo "Unknown arg: $1"; exit 1;;
  esac
done

TMPDIR="$(mktemp -d)"
PAYLOAD="$TMPDIR/payload.b64"
ARCHIVE="$TMPDIR/payload.tar.gz"

# Extract embedded base64 payload
sed -n '/^__PAYLOAD_BELOW__$/q;p' "${BASH_SOURCE[0]}" >/dev/null || true
# The payload starts after the marker; extract it
awk '/^__PAYLOAD_BELOW__/{flag=1;next} flag{print}' "${BASH_SOURCE[0]}" > "$PAYLOAD"
base64 -d "$PAYLOAD" > "$ARCHIVE"

# Extract archive
mkdir -p "$TMPDIR/extracted"
tar -xzf "$ARCHIVE" -C "$TMPDIR/extracted"

# The archive contains traycer-central/ directory
SRC_DIR="$TMPDIR/extracted/traycer-central"

# Run the bundled install.sh from the extracted payload
if [[ ! -x "$SRC_DIR/install.sh" ]]; then
  chmod +x "$SRC_DIR/install.sh" || true
fi

echo "Running bundled install into target: $TARGET (dry-run=${DRY_RUN})"
# Forward dry-run flag
if [[ "$DRY_RUN" == "true" ]]; then
  "$SRC_DIR/install.sh" --target "$TARGET" --dry-run
else
  "$SRC_DIR/install.sh" --target "$TARGET"
fi

# cleanup
rm -rf "$TMPDIR"

exit 0

__PAYLOAD_BELOW__
SH

# Append base64 payload
cat "$B64" >> "$OUT"
chmod +x "$OUT"

# report
echo "Packaged installer created at: $OUT"
echo "Run: $OUT --target /path/to/workspace [--dry-run]"

# cleanup
rm -rf "$TMPDIR"
