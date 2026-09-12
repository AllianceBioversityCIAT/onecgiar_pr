#!/usr/bin/env bash
#
# OTP-T-1 phase 2 spike helper — Cognito EMAIL_OTP against the TEST pool.
#
# NOT EXECUTED in phase 1. This script is a skeleton, syntax-checked with
# `bash -n`, for the phase-2 spike run (real mailbox, real Cognito calls).
#
# Security discipline (non-negotiable):
#   - `set +x` always — never trace this script.
#   - The client secret, SECRET_HASH and Session value are NEVER echoed,
#     printed, or logged anywhere. They exist only in shell variables.
#   - Every captured Cognito response is redacted (Session/AccessToken/
#     IdToken/RefreshToken -> "<redacted>") before it touches disk.
#   - Reads the client secret at RUN TIME from Cognito itself (describe-user-
#     pool-client), never from a saved file, never printed.
#
# Usage:
#   ./spike-email-otp.sh start   <username>
#   ./spike-email-otp.sh verify  <username> <code> <session>
#   ./spike-email-otp.sh select-challenge <username> <session>   # SELECT_CHALLENGE variant
#
# Requires: aws cli (profile IBD-DEV), jq, openssl.

set +x
set -euo pipefail

AWS_PROFILE="${AWS_PROFILE:-IBD-DEV}"
AWS_REGION="${AWS_REGION:-us-east-1}"
USER_POOL_ID="${USER_POOL_ID:-us-east-1_o9y9Yq5pO}"
# Full client id from the phase-1 export (runbook/test-before.json .clients[] | select(.ClientName=="general-client").ClientId)
CLIENT_ID="${CLIENT_ID:-6ph57qfck44f8d4jgf47if0s11}"

FIXTURES_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/fixtures/cognito"
mkdir -p "$FIXTURES_DIR"

# --- secret handling: read at run time, never echoed, never saved ---
get_client_secret() {
  aws cognito-idp describe-user-pool-client \
    --user-pool-id "$USER_POOL_ID" \
    --client-id "$CLIENT_ID" \
    --region "$AWS_REGION" \
    --query 'UserPoolClient.ClientSecret' \
    --output text
}

# SECRET_HASH = base64(HMAC-SHA256(key=client_secret, msg=username+client_id))
compute_secret_hash() {
  local username="$1"
  local secret="$2"
  printf '%s' "${username}${CLIENT_ID}" \
    | openssl dgst -sha256 -hmac "$secret" -binary \
    | openssl enc -base64 -A
}

# Redact session/token fields before writing any response to disk.
redact_and_save() {
  local out_file="$1"
  local raw; raw="$(cat)"
  # AWS CLI errors are plain text ("An error occurred (X) when calling ..."): wrap them as JSON so the fixture stays machine-readable.
  if ! printf '%s' "$raw" | jq -e . >/dev/null 2>&1; then
    raw="$(printf '%s' "$raw" | python3 -c 'import sys,json,re
t=sys.stdin.read().strip()
m=re.search(r"An error occurred \((\w+)\) when calling the (\w+) operation: (.*)", t, re.S)
print(json.dumps({"__type": m.group(1), "operation": m.group(2), "message": m.group(3).strip()} if m else {"__raw": t[:500]}))')"
  fi
  printf '%s' "$raw" | jq '
    (.Session // empty) |= "<redacted>"
    | (.AuthenticationResult.AccessToken // empty) |= "<redacted>"
    | (.AuthenticationResult.IdToken // empty) |= "<redacted>"
    | (.AuthenticationResult.RefreshToken // empty) |= "<redacted>"
  ' > "$FIXTURES_DIR/$out_file"
}

cmd_start() {
  local username="$1"
  local secret secret_hash response
  secret="$(get_client_secret)"
  secret_hash="$(compute_secret_hash "$username" "$secret")"

  response="$(aws cognito-idp initiate-auth \
    --client-id "$CLIENT_ID" \
    --auth-flow USER_AUTH \
    --auth-parameters USERNAME="$username",SECRET_HASH="$secret_hash",PREFERRED_CHALLENGE=EMAIL_OTP \
    --region "$AWS_REGION")"

  unset secret secret_hash

  # Hand the raw Session to the caller through a private file OUTSIDE the repo (never stdout, never fixtures).
  if [ -n "${SESSION_FILE:-}" ]; then
    umask 077
    repo_root="$(git rev-parse --show-toplevel 2>/dev/null || true)"
    if [ -n "$repo_root" ]; then
      case "$SESSION_FILE" in
        "$repo_root"/*)
          echo "Refusing: SESSION_FILE must not live under the repo root ($repo_root)" >&2
          exit 1
          ;;
        *)
          # SESSION_FILE is outside the repo root — the expected, allowed case.
          ;;
      esac
    fi
    rm -f "$SESSION_FILE"
    printf '%s' "$(echo "$response" | jq -r '.Session // empty')" > "$SESSION_FILE"
    echo "Session written to \$SESSION_FILE ($(wc -c < "$SESSION_FILE" | tr -d ' ') chars; ChallengeName=$(echo "$response" | jq -r '.ChallengeName // "none"'))"
  fi

  echo "$response" | redact_and_save "initiate-auth.email-otp.json"
  echo "Response saved (redacted) to $FIXTURES_DIR/initiate-auth.email-otp.json"
}

cmd_select_challenge() {
  # SELECT_CHALLENGE variant: answer the pool's challenge-selection prompt
  # with EMAIL_OTP, replaying the Session from InitiateAuth, and use the
  # NEW Session returned here on the follow-up verify call.
  local username="$1"
  local session="$2"
  local secret secret_hash response
  secret="$(get_client_secret)"
  secret_hash="$(compute_secret_hash "$username" "$secret")"

  response="$(aws cognito-idp respond-to-auth-challenge \
    --client-id "$CLIENT_ID" \
    --challenge-name SELECT_CHALLENGE \
    --session "$session" \
    --challenge-responses USERNAME="$username",ANSWER=EMAIL_OTP,SECRET_HASH="$secret_hash" \
    --region "$AWS_REGION")"

  unset secret secret_hash session

  echo "$response" | redact_and_save "respond-to-auth.select-challenge.json"
  echo "Response saved (redacted) to $FIXTURES_DIR/respond-to-auth.select-challenge.json"
}

cmd_verify() {
  local username="$1"
  local code="$2"
  local session="$3"
  local secret secret_hash response out_name

  secret="$(get_client_secret)"
  secret_hash="$(compute_secret_hash "$username" "$secret")"

  set +e
  response="$(aws cognito-idp respond-to-auth-challenge \
    --client-id "$CLIENT_ID" \
    --challenge-name EMAIL_OTP \
    --session "$session" \
    --challenge-responses USERNAME="$username",EMAIL_OTP_CODE="$code",SECRET_HASH="$secret_hash" \
    --region "$AWS_REGION" 2>&1)"
  set -e

  unset secret secret_hash session

  # Caller decides which fixture name this run maps to
  # (success / code-mismatch / expired) based on the observed outcome —
  # left as a manual step so the analyst labels the fixture correctly.
  out_name="${4:-respond-to-auth.manual-label.json}"
  echo "$response" | redact_and_save "$out_name"
  echo "Response saved (redacted) to $FIXTURES_DIR/$out_name"
}

main() {
  local action="${1:-}"
  case "$action" in
    start)
      cmd_start "${2:?username required}"
      ;;
    select-challenge)
      cmd_select_challenge "${2:?username required}" "${3:?session required}"
      ;;
    verify)
      cmd_verify "${2:?username required}" "${3:?code required}" "${4:?session required}" "${5:-}"
      ;;
    *)
      echo "Usage: $0 {start|select-challenge|verify} ..." >&2
      exit 1
      ;;
  esac
}

main "$@"
