#!/usr/bin/env bash
# Reporting Tool DEV deploy script for the ONECGIAR CI/CD Platform (architecture-change-03 contract).
#
# DRAFT FOR REVIEW. Derived from the "Deploy Backend" and "Deploy Frontend" stages of the Jenkins DEV
# job, with the deliberate differences listed in README.md (host key pinning is the Executor's job, no
# `aws configure set`, images by digest, nothing stopped before both images and the backend
# configuration are available, conditional migrations fail closed, restore of the previous containers).
#
# Installation (by the target administrator, never by the Executor): copy this file to the target
# record's `deployScript` path, mode 0755, owned by root and NOT writable by the deploy user. Its
# configuration lives in /etc/cicd/targets/<TARGET_LOCK_NAME>.conf (see reporting-tool-dev.conf.example),
# also owned by root; it is read as KEY=VALUE lines, never sourced.
#
# Invocation: the standard vector only (target record `scriptArguments: standard`):
#   --target-id <id> --execution-id <id> --fencing-token <n> --commit-sha <40-hex>
#   --artifact backend=sha256:<64-hex> --artifact frontend=sha256:<64-hex>
# Both artifacts are required: they are the image digests the caller workflow pushed. Anything else is a
# usage error (exit 2, no effect).
#
# Exit codes (AC-03 §3):
#   0  deployed, or both containers already run the requested digests (no migration, no swap)
#   10 failed before any change: configuration, registry login, pull, backend configuration, migration check,
#      or a side/migration container left by an earlier run (never overwritten: operator review)
#   20 the migration run failed; the running containers were not touched (the database MAY be partially
#      migrated: MySQL DDL is not transactional; operator review)
#   30 a container failed to start and the previous containers WERE restored (no migration applied in this run)
#   40 a health check failed and the previous containers WERE restored (no migration applied in this run)
#   50 target busy: the target mutex is held; nothing was done
#   70 unknown state: a restore failed, OR a switch or health check failed AFTER this run applied
#      migrations (the containers are restored but the database is NOT reverted). The Executor reports
#      it as UNKNOWN_TARGET_STATE for operator review.
#   2  usage error (no CICD_RESULT line)
#
# Result: last stdout line `CICD_RESULT {...}` on 0/10/20/30/40/50 with `deployedImages` (repository@digest
# of the running containers, so the Executor can verify the requested digests), `previousImages`,
# `migrations` (APPLIED|NONE|FAILED) and `healthy`. `deployedCommit` is never reported: the images carry no
# commit label, so the commit cannot be proven on the target (version check by digest instead).
#
# Requires bash >= 4.4, docker, aws (CLI v2), curl and flock on the target.

set -uo pipefail
trap '' HUP
PATH="${PATH:+${PATH}:}/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
export PATH
umask 077

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCRIPT_PATH="$SCRIPT_DIR/$(basename "${BASH_SOURCE[0]}")"

# ===== Fixed facts of the Reporting Tool DEV target (Jenkins parity) =============================
TARGET_LOCK_NAME="reporting-tool-dev"
BACKEND_CONTAINER="prms-reportingtool-server-dev"
BACKEND_PORTS="3900:3400"
FRONTEND_CONTAINER="prms-reportingtool-client-dev"
FRONTEND_PORTS="4600:80"
UNITS=(backend frontend)
# ================================================================================================

CONFIG_DIR="${CICD_TARGET_CONFIG_DIR:-/etc/cicd/targets}"

TARGET_ID=""
EXECUTION_ID=""
FENCING_TOKEN=""
REQUESTED_COMMIT=""
declare -A REQUESTED_ARTIFACT=()
declare -A CONFIG=()
declare -A IMAGE=()          # unit -> repository@digest requested
declare -A PREVIOUS_IMAGE=() # unit -> image reference of the container running before this run ("" if none)
declare -A SWAPPED=()        # unit -> new | stopped | moved: how far the switch of that unit went
MIGRATIONS="NONE"
HEALTHY=""
DEPLOYED_JSON=""

log() { printf '[deploy-reporting-tool-dev] %s\n' "$*" >&2; }
usage() { log "usage error: $*"; exit 2; }

# ----- arguments -------------------------------------------------------------------------------
parse_args() {
  local name value
  while [[ $# -gt 0 ]]; do
    [[ $# -ge 2 ]] || usage "'$1' needs a value"
    case "$1" in
      --target-id) TARGET_ID="$2" ;;
      --execution-id) EXECUTION_ID="$2" ;;
      --fencing-token) FENCING_TOKEN="$2" ;;
      --commit-sha) REQUESTED_COMMIT="$2" ;;
      --artifact)
        name="${2%%=*}"; value="${2#*=}"
        [[ "$name" =~ ^[a-z0-9][a-z0-9-]{0,31}$ && "$value" =~ ^sha256:[0-9a-f]{64}$ ]] || usage "invalid --artifact"
        [[ -z "${REQUESTED_ARTIFACT[$name]+x}" ]] || usage "--artifact '$name' given twice"
        REQUESTED_ARTIFACT["$name"]="$value" ;;
      *) usage "unknown argument '$1'" ;;
    esac
    shift 2
  done
  [[ "$TARGET_ID" =~ ^[a-z0-9][a-z0-9-]{1,62}$ ]] || usage "invalid or missing --target-id"
  [[ "$TARGET_ID" == "$TARGET_LOCK_NAME" ]] || usage "--target-id '$TARGET_ID' is not this script's target"
  [[ "$EXECUTION_ID" =~ ^[A-Za-z0-9._-]{1,128}$ ]] || usage "invalid or missing --execution-id"
  [[ "$FENCING_TOKEN" =~ ^[0-9]{1,20}$ ]] || usage "invalid or missing --fencing-token"
  [[ "$REQUESTED_COMMIT" =~ ^[0-9a-f]{40}$ ]] || usage "invalid or missing --commit-sha"
  local unit
  for unit in "${UNITS[@]}"; do
    [[ -n "${REQUESTED_ARTIFACT[$unit]+x}" ]] || usage "missing --artifact $unit=sha256:<digest>"
  done
  [[ ${#REQUESTED_ARTIFACT[@]} -eq ${#UNITS[@]} ]] || usage "unexpected --artifact (only backend and frontend)"
}

# ----- configuration (KEY=VALUE, never sourced) ------------------------------------------------
load_config() {
  local file="$CONFIG_DIR/$TARGET_LOCK_NAME.conf" line key value
  [[ -f "$file" && ! -L "$file" ]] || usage "configuration $file is missing"
  while IFS= read -r line || [[ -n "$line" ]]; do
    line="${line%$'\r'}"
    [[ -z "$line" || "$line" == \#* ]] && continue
    [[ "$line" == *=* ]] || usage "malformed configuration line"
    key="${line%%=*}"; value="${line#*=}"
    case "$key" in
      aws-region|aws-credentials|backend.repository|frontend.repository|backend.runtime-secret|\
      backend.health-url|frontend.health-url|health-timeout-seconds|migration-timeout-seconds) ;;
      *) usage "unknown configuration key '$key'" ;;
    esac
    [[ -z "${CONFIG[$key]+x}" ]] || usage "configuration key '$key' given twice"
    CONFIG["$key"]="$value"
  done < "$file"
  for key in aws-region aws-credentials backend.repository frontend.repository backend.runtime-secret \
             backend.health-url frontend.health-url; do
    [[ -n "${CONFIG[$key]:-}" ]] || usage "configuration key '$key' is required"
  done
  [[ "${CONFIG[aws-region]}" =~ ^[a-z]{2}(-[a-z]+)+-[0-9]$ ]] || usage "invalid aws-region"
  # The administrator states the credential source explicitly. Reporting Tool DEV reuses the mechanism the
  # server already has (default-chain); nothing is configured or persisted by this script.
  [[ "${CONFIG[aws-credentials]}" == "default-chain" || "${CONFIG[aws-credentials]}" == "instance-profile" \
     || "${CONFIG[aws-credentials]}" =~ ^profile:[A-Za-z0-9_.-]{1,64}$ ]] \
    || usage "aws-credentials must be default-chain, instance-profile or profile:<name>"
  local unit
  for unit in "${UNITS[@]}"; do
    [[ "${CONFIG[$unit.repository]}" =~ ^[0-9]{12}\.dkr\.ecr\.[a-z0-9-]+\.amazonaws\.com/[a-z0-9][a-z0-9._/-]{0,255}$ ]] \
      || usage "invalid $unit.repository (registry/repository, no tag, no digest)"
    [[ "${CONFIG[$unit.health-url]}" =~ ^http://127\.0\.0\.1:[0-9]{1,5}(/[A-Za-z0-9._~/?=&%-]*)?$ ]] \
      || usage "invalid $unit.health-url (http://127.0.0.1:<port>/<path> only)"
    IMAGE["$unit"]="${CONFIG[$unit.repository]}@${REQUESTED_ARTIFACT[$unit]}"
  done
  # ERE repetition bounds stop at 255 on many systems, so the length is checked separately.
  [[ "${CONFIG[backend.runtime-secret]}" =~ ^[A-Za-z0-9/_+=.@:-]+$ && ${#CONFIG[backend.runtime-secret]} -le 2048 ]] \
    || usage "invalid backend.runtime-secret"
  CONFIG[health-timeout-seconds]="${CONFIG[health-timeout-seconds]:-300}"
  CONFIG[migration-timeout-seconds]="${CONFIG[migration-timeout-seconds]:-1800}"
  [[ "${CONFIG[health-timeout-seconds]}" =~ ^[0-9]{1,4}$ ]] || usage "invalid health-timeout-seconds"
  [[ "${CONFIG[migration-timeout-seconds]}" =~ ^[0-9]{1,5}$ ]] || usage "invalid migration-timeout-seconds"
}

# ----- helpers ---------------------------------------------------------------------------------
# AWS CLI with the credential source the administrator configured:
#   default-chain     the AWS CLI's own provider chain, untouched (the server's existing mechanism)
#   instance-profile  the instance role only; any shared credentials file is excluded explicitly
#   profile:<name>    a named profile of the deploy user
# The script never writes AWS configuration or credentials.
aws_cli() {
  local mode="${CONFIG[aws-credentials]}"
  if [[ "$mode" == "default-chain" ]]; then
    aws --region "${CONFIG[aws-region]}" "$@"
  elif [[ "$mode" == "instance-profile" ]]; then
    env -u AWS_PROFILE -u AWS_ACCESS_KEY_ID -u AWS_SECRET_ACCESS_KEY -u AWS_SESSION_TOKEN \
      AWS_SHARED_CREDENTIALS_FILE=/dev/null aws --region "${CONFIG[aws-region]}" "$@"
  else
    env -u AWS_ACCESS_KEY_ID -u AWS_SECRET_ACCESS_KEY -u AWS_SESSION_TOKEN \
      AWS_PROFILE="${mode#profile:}" aws --region "${CONFIG[aws-region]}" "$@"
  fi
}

# Docker CLI with a private client configuration: the registry login token lives only in RUN_DIR and is
# removed at exit (never persisted in ~/.docker/config.json).
docker_cli() { DOCKER_CONFIG="$RUN_DIR/docker" docker "$@"; }
# Same, bounded in time (timeout cannot run a shell function).
docker_timed() { local seconds="$1"; shift; timeout "$seconds" env DOCKER_CONFIG="$RUN_DIR/docker" docker "$@"; }

# Phase state survives a failing phase: every change is saved at once and reloaded after the phase,
# whatever its outcome (a restore must know exactly what was touched).
save_state() {
  declare -p MIGRATIONS HEALTHY PENDING ALREADY_DEPLOYED PREVIOUS_IMAGE SWAPPED | sed 's/^declare /declare -g /' > "$RUN_DIR/state"
}

container_exists() { docker_cli container inspect "$1" > /dev/null 2>&1; }
container_image() { docker_cli container inspect --format '{{.Config.Image}}' "$1" 2>/dev/null; }
container_running() { [[ "$(docker_cli container inspect --format '{{.State.Running}}' "$1" 2>/dev/null)" == "true" ]]; }

container_of() { if [[ "$1" == backend ]]; then printf '%s' "$BACKEND_CONTAINER"; else printf '%s' "$FRONTEND_CONTAINER"; fi; }
ports_of() { if [[ "$1" == backend ]]; then printf '%s' "$BACKEND_PORTS"; else printf '%s' "$FRONTEND_PORTS"; fi; }
previous_name() { printf '%s-cicd-previous' "$(container_of "$1")"; }
# Named so that a migration still running after a timeout is visible and blocks the next run.
MIGRATION_CONTAINER="${BACKEND_CONTAINER}-cicd-migration"

json_escape() { local s="$1"; s="${s//\\/\\\\}"; s="${s//\"/\\\"}"; printf '%s' "$s"; }

# ----- phases ----------------------------------------------------------------------------------
# Nothing in prepare changes the running service: images, configuration and the migration status are
# all obtained while the current containers keep serving.
phase_prepare() {
  local unit registry
  mkdir -p "$RUN_DIR/docker"
  # A side container left by an earlier run that ended in an unknown state may be the only good version:
  # never overwrite it automatically; an operator decides (runbook) and removes it.
  for unit in "${UNITS[@]}"; do
    if container_exists "$(previous_name "$unit")"; then
      log "$(previous_name "$unit") exists from an earlier run: operator review required before deploying"
      return 1
    fi
  done
  if container_exists "$MIGRATION_CONTAINER"; then
    log "$MIGRATION_CONTAINER exists (a migration may still be running): operator review required before deploying"
    return 1
  fi
  for unit in "${UNITS[@]}"; do
    PREVIOUS_IMAGE["$unit"]="$(container_image "$(container_of "$unit")" || true)"
  done
  save_state
  if [[ "${PREVIOUS_IMAGE[backend]}" == "${IMAGE[backend]}" && "${PREVIOUS_IMAGE[frontend]}" == "${IMAGE[frontend]}" ]] \
     && container_running "$BACKEND_CONTAINER" && container_running "$FRONTEND_CONTAINER"; then
    ALREADY_DEPLOYED=1; save_state
    return 0
  fi
  for unit in "${UNITS[@]}"; do
    registry="${CONFIG[$unit.repository]%%/*}"
    log "registry login and pull of $unit"
    aws_cli ecr get-login-password | docker_cli login --username AWS --password-stdin "$registry" > /dev/null
    docker_cli pull --quiet "${IMAGE[$unit]}" > /dev/null
  done
  log "backend runtime configuration"
  aws_cli secretsmanager get-secret-value --secret-id "${CONFIG[backend.runtime-secret]}" \
    --query SecretString --output text > "$RUN_DIR/backend.env"
  [[ -s "$RUN_DIR/backend.env" ]]
  log "migration check"
  local out rc=0
  out="$(docker_timed "${CONFIG[migration-timeout-seconds]}" run --rm --env-file "$RUN_DIR/backend.env" \
    "${IMAGE[backend]}" npm run migration:check:ci 2>&1)" || rc=$?
  PENDING="$(printf '%s\n' "$out" | grep -Eo '^PENDING_MIGRATIONS=[0-9]+' | tail -n 1 | cut -d= -f2 || true)"
  # Fail closed: the Jenkins job ran the migrations "for safety" when the check output was unreadable;
  # here an unreadable check (database unreachable, broken image) stops the run before any change.
  if [[ -z "$PENDING" ]]; then
    log "migration check gave no PENDING_MIGRATIONS line (exit $rc)"
    return 1
  fi
  save_state
  log "pending migrations: $PENDING"
}

phase_pre_switch() {
  [[ "$ALREADY_DEPLOYED" == 0 ]] || return 0
  [[ "$PENDING" != "0" ]] || return 0
  MIGRATIONS="FAILED"; save_state
  log "running $PENDING pending migration(s) with the new backend image (old containers keep serving)"
  # On a timeout only the docker client is stopped: the migration container keeps running (stopping a
  # migration halfway is worse) and its name blocks the next run until an operator reviews it.
  docker_timed "${CONFIG[migration-timeout-seconds]}" run --rm --name "$MIGRATION_CONTAINER" \
    --env-file "$RUN_DIR/backend.env" "${IMAGE[backend]}" npm run migration:run >&2
  MIGRATIONS="APPLIED"; save_state
}

start_unit() {
  local unit="$1" name ports
  name="$(container_of "$unit")"; ports="$(ports_of "$unit")"
  if [[ "$unit" == backend ]]; then
    docker_cli run --env-file "$RUN_DIR/backend.env" --restart=always -d -i -t --name "$name" -p "$ports" "${IMAGE[$unit]}" > /dev/null
  else
    docker_cli run --restart=always -d -i -t --name "$name" -p "$ports" "${IMAGE[$unit]}" > /dev/null
  fi
}

# Backend first, then frontend (Jenkins order). The previous container is stopped and kept under a
# side name until the run ends, so it can be restored with its own image and configuration.
phase_switch() {
  [[ "$ALREADY_DEPLOYED" == 0 ]] || return 0
  local unit name prev
  for unit in "${UNITS[@]}"; do
    name="$(container_of "$unit")"; prev="$(previous_name "$unit")"
    if container_exists "$name"; then
      SWAPPED["$unit"]=stopped; save_state
      docker_cli stop "$name" > /dev/null
      docker_cli rename "$name" "$prev"
      SWAPPED["$unit"]=moved; save_state
      docker_cli update --restart=no "$prev" > /dev/null
    else
      SWAPPED["$unit"]=new; save_state
    fi
    log "starting $unit"
    start_unit "$unit"
  done
}

http_ok() {
  local code
  code="$(curl -s -o /dev/null -m 5 -w '%{http_code}' "$1" || true)"
  [[ "$code" =~ ^[234][0-9][0-9]$ ]]
}

# Healthy = the container is running and its health URL answers with a non-5xx HTTP status.
phase_verify() {
  [[ "$ALREADY_DEPLOYED" == 0 ]] || { HEALTHY=true; save_state; return 0; }
  HEALTHY=false; save_state
  local timeout_s="${CONFIG[health-timeout-seconds]}" unit pending deadline
  deadline=$(( SECONDS + timeout_s ))
  while :; do
    pending=0
    for unit in "${UNITS[@]}"; do
      container_running "$(container_of "$unit")" || { log "$unit container is not running"; return 1; }
      http_ok "${CONFIG[$unit.health-url]}" || pending=1
    done
    [[ $pending -eq 1 ]] || break
    (( SECONDS < deadline )) || { log "health check timed out"; return 1; }
    sleep 5
  done
  HEALTHY=true; save_state
}

# Restores every unit this run touched: removes the new container and brings the previous one back.
phase_restore() {
  local unit name prev ok=0
  for unit in "${UNITS[@]}"; do
    name="$(container_of "$unit")"; prev="$(previous_name "$unit")"
    case "${SWAPPED[$unit]:-}" in
      "") ;;
      stopped)  # the previous container may be stopped but still has its own name
        docker_cli start "$name" > /dev/null || ok=1 ;;
      new)      # there was no previous container: only remove the new one
        if container_exists "$name"; then docker_cli rm -f "$name" > /dev/null || ok=1; fi ;;
      moved)
        if container_exists "$name"; then docker_cli rm -f "$name" > /dev/null || ok=1; fi
        if container_exists "$prev"; then
          docker_cli rename "$prev" "$name" || ok=1
          docker_cli update --restart=always "$name" > /dev/null || ok=1
          docker_cli start "$name" > /dev/null || ok=1
        else
          ok=1   # the previous container is gone: cannot restore
        fi ;;
    esac
  done
  return "$ok"
}

cleanup_previous() {
  local unit prev
  for unit in "${UNITS[@]}"; do
    prev="$(previous_name "$unit")"
    if container_exists "$prev"; then docker_cli rm -f "$prev" > /dev/null || log "could not remove $prev"; fi
  done
  # No image is removed (Jenkins parity): images may be shared with other applications on this host.
}

# ----- contract scaffold (from deploy-script-template.sh) ---------------------------------------
result_status() {
  case "$1" in
    0) printf 'SUCCESS' ;; 10) printf 'PREPARE_FAILED' ;; 20) printf 'PRE_SWITCH_FAILED' ;;
    30) printf 'SWITCH_FAILED_RESTORED' ;; 40) printf 'VERIFY_FAILED_RESTORED' ;;
  esac
}

images_json() {
  local -n map="$1"
  local unit sep="" out="{"
  for unit in "${UNITS[@]}"; do
    [[ -n "${map[$unit]:-}" ]] || continue
    out+="${sep}\"${unit}\":\"$(json_escape "${map[$unit]}")\""; sep=","
  done
  printf '%s}' "$out"
}

finish() {
  local code="$1" line
  line="{\"status\":\"$(result_status "$code")\""
  [[ -z "$DEPLOYED_JSON" ]] || line+=",\"deployedImages\":$DEPLOYED_JSON"
  line+=",\"previousImages\":$(images_json PREVIOUS_IMAGE),\"migrations\":\"$MIGRATIONS\""
  [[ -z "$HEALTHY" ]] || line+=",\"healthy\":$HEALTHY"
  printf 'CICD_RESULT %s}\n' "$line"
  exit "$code"
}

# Runs one phase with `set -e` in a subshell and carries its state back. Must be called as a plain
# statement (never inside if/while/&&/||, which would disable `set -e`).
run_phase() {
  local phase="$1" rc
  ( set -e; shopt -s inherit_errexit; "$phase" )
  rc=$?
  if [[ -s "$RUN_DIR/state" ]]; then
    # shellcheck disable=SC1090
    source "$RUN_DIR/state"   # written by save_state only, inside this run's private 0700 directory
  fi
  return "$rc"
}

# Records what is actually running (repository@digest as started), never what was requested.
# `running` is read through the nameref in images_json, which ShellCheck cannot follow; the directive
# covers this function only (its declaration and its element assignments).
# shellcheck disable=SC2034
record_deployed() {
  declare -A running=()
  local unit
  for unit in "${UNITS[@]}"; do running["$unit"]="$(container_image "$(container_of "$unit")" || true)"; done
  DEPLOYED_JSON="$(images_json running)"
}

restore_or_unknown() {
  local code="$1" rc
  run_phase phase_restore; rc=$?
  if [[ $rc -ne 0 ]]; then log "RESTORE FAILED: operator review required"; exit 70; fi
  if [[ "$MIGRATIONS" == "APPLIED" ]]; then
    log "previous containers restored, but this run APPLIED migrations that were NOT reverted: operator review required"
    exit 70
  fi
  finish "$code"
}

main_locked() {
  parse_args "$@"
  load_config
  RUN_DIR="$(mktemp -d)"
  trap 'rm -rf "$RUN_DIR"' EXIT
  : > "$RUN_DIR/state"
  PENDING=""; ALREADY_DEPLOYED=0
  {
    printf 'lockName=%s\nexecutionId=%s\nfencingToken=%s\ncommitSha=%s\npid=%s\n' \
      "$TARGET_LOCK_NAME" "$EXECUTION_ID" "$FENCING_TOKEN" "$REQUESTED_COMMIT" "$$"
  } > "$LOCK_FILE" 2>/dev/null || true
  local rc
  run_phase phase_prepare; rc=$?
  [[ $rc -eq 0 ]] || finish 10
  run_phase phase_pre_switch; rc=$?
  [[ $rc -eq 0 ]] || finish 20
  run_phase phase_switch; rc=$?
  [[ $rc -eq 0 ]] || restore_or_unknown 30
  run_phase phase_verify; rc=$?
  [[ $rc -eq 0 ]] || restore_or_unknown 40
  cleanup_previous
  record_deployed
  finish 0
}

if [[ "${1:-}" == "--internal-locked" ]]; then
  shift
  LOCK_FILE="$1"; shift
  main_locked "$@"
fi

parse_args "$@"
lock_dir="${CICD_LOCK_DIR:-/var/lock/cicd}"
LOCK_FILE="$lock_dir/${TARGET_LOCK_NAME}.lock"
mkdir -p "$lock_dir" 2>/dev/null || true
flock -n -E 50 "$LOCK_FILE" "$SCRIPT_PATH" --internal-locked "$LOCK_FILE" "$@"
rc=$?
if [[ $rc -eq 50 ]]; then
  printf 'CICD_RESULT {"status":"TARGET_BUSY"}\n'
fi
exit "$rc"
