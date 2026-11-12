#!/usr/bin/env bash
# render.sh — baseline/after renders for spec changes/bilateral-pdf-mds-only (BPM-TEST-1)
#
# Usage:   bash render.sh <set-name> [base-url]
#            <set-name>  output dir under ./out/ (use "before" pre-change, "after" post-change)
#            [base-url]  default http://localhost:3000 (a `next start` of the pdf-viewer must be up; see "Starting the server")
# Env:     VIEWER=<path to alliance-ibd-pdf-viewer>  (default D:/PRMS/alliance-ibd-pdf-viewer)
#
# What it does: for each (template, payload) pair it copies the payload over
# <template>/template.demo.json, GETs /<template>?demo=true, masks run/build tokens (see "Masks"),
# writes out/<set-name>/<file>.html and restores the demo file with `git checkout`
# (also on error/exit, via trap; warns loudly if the viewer's template dir is not clean at the end).
# Never edits anything else in the viewer.
#
# Output naming (out/<set-name>/):
#   results_p25-demo.html                  results_p25 x its own demo
#   results_p25-<fixture>.html             results_p25 x every fixture   (e.g. results_p25-bil-innovation-use.html)
#   ipsr_p25-demo.html                     ipsr_p25 x its own demo
#   results_bilaterals_p25-demo.html       bilaterals x its own demo
#   results_bilaterals_p25-<fixture>.html  bilaterals x every fixture
#   <fixture>.html                         convenience copy of the bilaterals render (e.g. bil-innovation-use.html)
# <fixture> = file name of fixtures/*.json without extension.
#
# Starting the server (P-8, Windows). Two findings:
#  (a) app/[template]/page.tsx's path.relative() import path has backslashes on Windows -> 404. A preload
#      that rewrites ONLY that call fixes it (no repo edit; not needed on Linux/CI): fixtures/posix-relative.cjs.
#  (b) `next dev` (Turbopack) WEDGES ("Compiling /[template]" never ends) as soon as template.demo.json is
#      swapped, so dev cannot be used with this harness. Fallback that works (P-8 fallback):
#        cd <viewer> && node node_modules/next/dist/bin/next build      # rebuild after every code change (T-2/T-3)
#        NODE_OPTIONS="--require <abs>/fixtures/posix-relative.cjs" node node_modules/next/dist/bin/next start -p 3000
#      The demo json is read from disk per request, so swaps need no rebuild; code edits DO.
# Stop the server (kill its PID, `taskkill //F //T //PID <pid>`) when done.
#
# Masks (mask() below). ONLY non-content tokens that change per run/build are masked; labels, values and
# structure are never touched, so a real template change still shows in `diff -r out/before out/after`:
#  1. footer timestamp: the footer prints "... (PRMS) on <weekday>, <Month> <Nth>, <YYYY>, at HH:MM <TZ>."
#     (formatDateCET), once in the HTML and once in the RSC payload <script>. The date string -> <GENERATION-TIMESTAMP>.
#  2. Next build ID (new on every `next build`; the viewer's next.config has no generateBuildId):
#     the RSC payload value in  \"b\":\"<id>\"  -> <BUILD-ID>; also any literal occurrence of <viewer>/.next/BUILD_ID.
#  3. hashed static asset names (content hashes, change whenever code changes): everything after /_next/static/
#     up to the next quote/backslash/space/angle bracket (chunks/<hash>.js|.css, chunks/turbopack-<hash>.js,
#     media/...) -> /_next/static/<ASSET>.
#  4. numeric client-module ids in RSC rows, `N:I[39756,[...`  -> `N:I[<MODULE-ID>,[...` (Turbopack numbering).
#  NOT masked (ambiguous, T-2 must judge a diff there): RSC row ids (`2:`, `4:`, ...), the number/order of the
#  script/preload tags, everything else.
# Cross-build stability proof (BPM-T-1): two separate `next build`s with no code change, the full render set
#  after each, `diff -r out/<a> out/<b>` must be empty.
# A render is rejected (script exits non-zero) on non-200, empty body, or an error banner
# ("Data not available", "No demo data", "Application error", "Internal Server Error").
set -euo pipefail

SET="${1:?usage: render.sh <set-name> [base-url]}"
BASE="${2:-http://localhost:3000}"
VIEWER="${VIEWER:-D:/PRMS/alliance-ibd-pdf-viewer}"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUT="$HERE/out/$SET"
TPL_DIR="app/templates/reportingtool"
mkdir -p "$OUT"

restore() {
  git -C "$VIEWER" checkout -- "$TPL_DIR/results_p25/template.demo.json" \
    "$TPL_DIR/ipsr_p25/template.demo.json" \
    "$TPL_DIR/results_bilaterals_p25/template.demo.json" \
    || echo "WARNING: git checkout of the demo files FAILED in $VIEWER" >&2
}
# loud check that the viewer's template dir is back to its committed state
verify_clean() {
  if ! git -C "$VIEWER" diff --quiet -- "$TPL_DIR"; then
    echo "WARNING: $VIEWER/$TPL_DIR is NOT clean after the run - restore the demo files manually:" >&2
    git -C "$VIEWER" status --short -- "$TPL_DIR" >&2
    return 1
  fi
}
trap restore EXIT

mask() {
  local bid=""
  if [ -f "$VIEWER/.next/BUILD_ID" ]; then bid="$(tr -d '\r\n' <"$VIEWER/.next/BUILD_ID")"; fi
  local lit=()
  if [ -n "$bid" ]; then lit=(-e "s#$bid#<BUILD-ID>#g"); fi
  sed -E \
    -e 's/[A-Za-z]+day, [A-Za-z]+ [0-9]+(st|nd|rd|th), [0-9]{4}, at [0-9]{2}:[0-9]{2} [A-Za-z0-9+]+/<GENERATION-TIMESTAMP>/g' \
    -e 's#(\\"b\\":\\")[A-Za-z0-9_-]+(\\")#\1<BUILD-ID>\2#g' \
    -e 's#/_next/static/[^"\\ <>]+#/_next/static/<ASSET>#g' \
    -e 's#:I\[[0-9]+,#:I[<MODULE-ID>,#g' \
    ${lit[@]+"${lit[@]}"}
}

# render <template> <dest-file-name> ; demo file must already be in place
render() {
  local tpl="$1" dest="$2" tmp code
  tmp="$(mktemp)"
  code="$(curl -sS --max-time 240 -o "$tmp" -w '%{http_code}' "$BASE/$tpl?demo=true")"
  if [ "$code" != "200" ] || [ ! -s "$tmp" ] || grep -qE 'Data not available|No demo data|Application error|Internal Server Error' "$tmp"; then
    echo "FAIL $tpl -> $dest (http $code, bytes $(wc -c <"$tmp"))" >&2
    rm -f "$tmp"; exit 1
  fi
  mask <"$tmp" >"$OUT/$dest"
  rm -f "$tmp"
  echo "ok   $dest ($(wc -c <"$OUT/$dest") bytes)"
}

# swap <template> <fixture-file>
swap() { cp "$2" "$VIEWER/$TPL_DIR/$1/template.demo.json"; }

# 1) each template with its own demo
for tpl in results_p25 ipsr_p25 results_bilaterals_p25; do
  restore
  render "$tpl" "$tpl-demo.html"
done

# 2) results_p25 and bilaterals x every fixture
for f in "$HERE"/*.json; do
  label="$(basename "$f" .json)"
  swap results_p25 "$f";            render results_p25 "results_p25-$label.html"
  restore
  swap results_bilaterals_p25 "$f"; render results_bilaterals_p25 "results_bilaterals_p25-$label.html"
  cp "$OUT/results_bilaterals_p25-$label.html" "$OUT/$label.html"
  restore
done
restore
verify_clean
echo "done: $OUT"
