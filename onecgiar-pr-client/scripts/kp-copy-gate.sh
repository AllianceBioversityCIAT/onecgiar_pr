#!/usr/bin/env bash
# KPM-T-8 — grep gate: no CGSpace-only phrasing survives on the generalized KP-browse surfaces.
#
# Scope (KPM-R-11 / KPM-AC-14): the browse component (kp-cgspace-browse), the three hosts
# (lab-report-form, aow-hlo-create-modal, report-result-form), the two copy-only siblings
# (result-creator, change-result-type-modal) and the server's `findOnCGSpace` messages.
#
# Match is CASE-SENSITIVE on the literal brand name "CGSpace" (capital C, G, S). That alone
# excludes every identifier in this codebase, which spells it "Cgspace"/"cgspace"
# (KpCgspaceBrowseComponent, CgspaceItemDto, kp-cgspace-browse, cgspace-discovery,
# CGSPACE_DISCOVERY_URL, cgspace.cgiar.org, center.from_cgspace, onCgspaceItemSelected, ...) — so
# none of those need an explicit allow-list entry.
#
# What remains is scanned against an EXPLICIT allow-list of phrases (not a bare `/CGSpace/`
# pattern, which would make this gate incapable of ever failing):
#   - repository enumerations: a line that also names a sibling repository (MELSpace) on the same
#     line is an enumeration ("... CGSpace, MELSpace or WorldFish ..."), not CGSpace-only phrasing.
#   - the two `findOnCGSpace`/MQAP method names themselves (class/method-name allow-list bucket).
#
# Anything else containing "CGSpace" is a defect: literal CGSpace-only copy left in a surface this
# spec generalized.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLIENT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SERVER_FILE="$CLIENT_ROOT/../onecgiar-pr-server/src/api/results/results-knowledge-products/results-knowledge-products.service.ts"

BROWSE_DIR="$CLIENT_ROOT/src/app/pages/result-framework-reporting/pages/entity-aow/pages/entity-aow-aow/components/aow-hlo-table/components/aow-hlo-table-create-modal/components/kp-cgspace-browse"
AOW_DIR="$CLIENT_ROOT/src/app/pages/result-framework-reporting/pages/entity-aow/pages/entity-aow-aow/components/aow-hlo-table/components/aow-hlo-table-create-modal"
LAB_DIR="$CLIENT_ROOT/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/lab-report-form"
RRF_DIR="$CLIENT_ROOT/src/app/pages/results/pages/result-creator/components/report-result-form"

# Full-file scan: the browse component + the three hosts. These are the surfaces KPM-R-11 requires
# to read fully repository-neutral (module code names them explicitly).
FULL_SCAN_FILES=(
  "$BROWSE_DIR/kp-cgspace-browse.component.ts"
  "$BROWSE_DIR/kp-cgspace-browse.component.html"
  "$AOW_DIR/aow-hlo-create-modal.component.ts"
  "$AOW_DIR/aow-hlo-create-modal.component.html"
  "$LAB_DIR/lab-report-form.component.ts"
  "$LAB_DIR/lab-report-form.component.html"
  "$RRF_DIR/report-result-form.component.ts"
  "$RRF_DIR/report-result-form.component.html"
)

# Line-scoped check: the two copy-only siblings. KPM-R-11/design.md name ONE specific phrase in
# each ("Title retrieved from CGSpace" → "Title retrieved from the repository") — these files also
# carry older, out-of-scope CGSpace-specific copy (a "CGSpace link" field label, a Manual-entry-only
# "Fetching metadata from CGSpace" sync button) this task does not touch. Scanning those siblings
# in full would make the gate fail on copy this spec deliberately left alone.
SIBLING_CHECKS=(
  "$CLIENT_ROOT/src/app/pages/results/pages/result-creator/result-creator.component.html|Title retrieved from CGSpace"
  "$CLIENT_ROOT/src/app/pages/results/pages/result-detail/pages/rd-general-information/components/change-result-type-modal/change-result-type-modal.component.html|Title retrieved from CGSpace"
)

# Allow-list: a hit on a line that ALSO names MELSpace is a repository enumeration, not CGSpace-only
# phrasing; the two findOnCGSpace/MQAP method names are legitimate identifiers (class/method bucket).
ALLOW_PATTERN='MELSpace|async findOnCGSpace\(|getDataFromCGSpaceHandle'

fail=0
report=""

full_scan() {
  local file="$1"
  if [ ! -f "$file" ]; then
    echo "kp-copy-gate: MISSING FILE $file" >&2
    fail=1
    return
  fi
  local hits
  hits="$(grep -nF 'CGSpace' "$file" | grep -Ev "$ALLOW_PATTERN" || true)"
  if [ -n "$hits" ]; then
    fail=1
    report+=$'\n'"[surface] $file"$'\n'"$hits"$'\n'
  fi
}

sibling_check() {
  local file="$1" phrase="$2"
  if [ ! -f "$file" ]; then
    echo "kp-copy-gate: MISSING FILE $file" >&2
    fail=1
    return
  fi
  if grep -qF "$phrase" "$file"; then
    fail=1
    report+=$'\n'"[sibling] $file still contains: \"$phrase\""$'\n'
  fi
}

for f in "${FULL_SCAN_FILES[@]}"; do
  full_scan "$f"
done

for entry in "${SIBLING_CHECKS[@]}"; do
  file="${entry%%|*}"
  phrase="${entry#*|}"
  sibling_check "$file" "$phrase"
done

# Server: scope strictly to the `findOnCGSpace` method body (KPM-R-11/KPM-AC-14 name only "the
# user-facing sync messages in findOnCGSpace" — not the whole service file, which still carries
# unrelated, untouched CGSpace-specific copy in `create()` / `_yearOutsideReportingPhasesMessage`,
# a different, out-of-scope validation path).
if [ -f "$SERVER_FILE" ]; then
  fn_body="$(sed -n '/async findOnCGSpace(/,/^  }$/p' "$SERVER_FILE")"
  hits="$(printf '%s\n' "$fn_body" | grep -nF 'CGSpace' | grep -Ev "$ALLOW_PATTERN" || true)"
  if [ -n "$hits" ]; then
    fail=1
    report+=$'\n'"[server: findOnCGSpace] $SERVER_FILE"$'\n'"$hits"$'\n'
  fi
else
  echo "kp-copy-gate: MISSING FILE $SERVER_FILE" >&2
  fail=1
fi

if [ "$fail" -ne 0 ]; then
  echo "kp-copy-gate: CGSpace-only phrasing found (or a scanned file is missing):" >&2
  printf '%s\n' "$report" >&2
  exit 1
fi

echo "kp-copy-gate: clean — no CGSpace-only phrasing on the scanned surfaces."
exit 0
