#!/bin/bash
# AKILI guardrail: a task cannot flip to [x] without Reviewer PASS evidence
# in the same spec's execution.md (evidence before checkbox).
# Scaffolded by /akili-constitution Step 8F. PreToolUse hook — Claude Code, Codex, and
# (imported, or via a native entry) Cursor read the host-data table below for tool
# names and payload paths.
input=$(cat)
# A Cursor payload carries a top-level "cursor_version"
# key that Claude Code and Codex payloads never carry. allow() emits
# {"permission":"allow"} ONLY when that marker is present, so a native
# .cursor/hooks.json entry with failClosed: true (which reads empty
# stdout as a hook FAILURE, not an allow -- observed live 2026-10-01) sees
# a real allow response, while Claude Code and Codex keep getting empty
# stdout exactly as before.
is_cursor=$(printf '%s' "$input" | jq -r 'if has("cursor_version") then "1" else "" end')
allow() { [ -n "$is_cursor" ] && printf '%s' '{"permission":"allow"}'; exit 0; }
tool=$(printf '%s' "$input" | jq -r '.tool_name // empty')
cmd=$(printf '%s' "$input" | jq -r '.tool_input.command // empty')
fp=$(printf '%s' "$input" | jq -r '.tool_input.file_path // empty')
if [ "$tool" = "apply_patch" ] && [ -z "$fp" ]; then
  # Codex's apply_patch names no file_path field directly, and it is a
  # MULTI-FILE format: .tool_input.command can carry several
  # "*** Update/Add/Delete File: <path>" headers in one call, each on its
  # own line, possibly CRLF-terminated. Scan EVERY header — not just the
  # first — and strip a trailing \r before matching, so a later header
  # naming tasks.md is never hidden behind an earlier header naming
  # something else, and a CRLF line ending never defeats the glob below.
  if [ -z "$cmd" ]; then
    echo "BLOCKED (AKILI guardrail): apply_patch payload carried neither .tool_input.file_path nor .tool_input.command; the gate cannot determine whether this write targets a tasks.md file, so it is denied fail-closed (Codex host-data table, /akili-constitution Step 8F)." >&2
    exit 2
  fi
  headers=$(printf '%s' "$cmd" | sed -nE 's/^\*\*\* (Update|Add|Delete) File: (.*)$/\1 \2/p' | tr -d '\r')
  if [ -z "$headers" ]; then
    echo "BLOCKED (AKILI guardrail): apply_patch payload's command text carried no recognized \"*** Update File:\"/\"*** Add File:\"/\"*** Delete File:\" header; the gate cannot determine whether this write targets a tasks.md file, so it is denied fail-closed (Codex host-data table, /akili-constitution Step 8F)." >&2
    exit 2
  fi
  is_delete=""
  while IFS= read -r header_line; do
    [ -z "$header_line" ] && continue
    h_verb=${header_line%% *}
    h_path=${header_line#* }
    case "$h_path" in
      */docs/specs/*/tasks.md|docs/specs/*/tasks.md)
        fp="$h_path"
        [ "$h_verb" = "Delete" ] && is_delete=1
        ;;
    esac
  done <<HEADERS
$headers
HEADERS
  if [ -n "$is_delete" ]; then
    # Deleting a tasks.md file has no "new content" to extract at all —
    # an unsupported verb for this gate. Deny rather than let a deletion
    # (which trivially can't raise the [x] count) pass unexamined.
    echo "BLOCKED (AKILI guardrail): apply_patch payload deletes $fp — unsupported verb for this gate (no new content to check), so the write is denied fail-closed (Codex host-data table, /akili-constitution Step 8F)." >&2
    exit 2
  fi
  if [ -z "$fp" ]; then
    # No header in this patch names a tasks.md path at all: genuinely out
    # of scope, the same as any other non-tasks.md write.
    allow
  fi
fi
case "$fp" in
  */docs/specs/*/tasks.md) ;;
  docs/specs/*/tasks.md) ;;
  *) allow ;;
esac
case "$tool" in
  Edit)
    old=$(printf '%s' "$input" | jq -r '.tool_input.old_string // ""')
    new=$(printf '%s' "$input" | jq -r '.tool_input.new_string // ""')
    ;;
  Write)
    old=$(cat "$fp" 2>/dev/null || printf '')
    new=$(printf '%s' "$input" | jq -r '.tool_input.content // .tool_input.new_content // ""')
    if [ -z "$new" ]; then
      echo "BLOCKED (AKILI guardrail): write payload for $fp carried no readable new content (neither .tool_input.content nor .tool_input.new_content); the gate cannot check it, so the write is denied fail-closed (/akili-constitution Step 8F host-data table)." >&2
      exit 2
    fi
    ;;
  apply_patch)
    # Codex host: .tool_input.command carries the whole patch as one string,
    # not discrete old/new fields (host-data table below). A patch with no
    # readable command text is denied fail-closed, never passed through
    # (DD-6, §5.4 item 2 of the Codex install design) — this is the
    # terminal branch a tasks.md write lands in when the gate cannot
    # extract its new content at all.
    if [ -z "$cmd" ]; then
      echo "BLOCKED (AKILI guardrail): apply_patch payload for $fp carried no readable command text; the gate cannot extract the new content, so the write is denied fail-closed (Codex host-data table, /akili-constitution Step 8F)." >&2
      exit 2
    fi
    old=""
    # Every line starting with "+" is added content — apply_patch has no
    # unified-diff "+++ b/file" header to exclude, so do NOT add a
    # "not another +" guard here: a real added line "++ [x] ..." (a
    # Markdown "+" bullet reading "+ [x] ...") would be silently dropped
    # by such a guard, undercounting [x] and producing a false allow
    # (attempt-2 defect this closes). Over-matching here only produces a
    # false deny, the safe direction.
    new=$(printf '%s' "$cmd" | grep -E '^\+' || printf '')
    ;;
  *)
    # A matcher should only ever route Edit/Write/apply_patch here; an
    # unrecognized tool name reaching a tasks.md path is denied rather
    # than guessed at — another fail-closed terminal branch, never exit 0.
    echo "BLOCKED (AKILI guardrail): unrecognized tool \"$tool\" writing to $fp; the gate cannot extract the new content, so the write is denied fail-closed (Codex host-data table, /akili-constitution Step 8F)." >&2
    exit 2
    ;;
esac
count_x() { printf '%s' "$1" | grep -o '\[x\]' | wc -l | tr -d ' '; }
[ "$(count_x "$new")" -le "$(count_x "$old")" ] && allow
exec_md="$(dirname "$fp")/execution.md"
if [ ! -f "$exec_md" ]; then
  echo "BLOCKED (AKILI guardrail): flipping a task to [x] but $exec_md does not exist. Evidence first: append the execution.md entry with the Reviewer PASS before updating tasks.md (/akili-execute Step 3 order)." >&2
  exit 2
fi
if ! grep -q "PASS" "$exec_md"; then
  echo "BLOCKED (AKILI guardrail): $exec_md contains no PASS evidence. A task reaches [x] only after a Reviewer PASS is recorded (evidence before checkbox)." >&2
  exit 2
fi
[ -n "$is_cursor" ] && printf '%s' '{"permission":"allow"}'
exit 0
