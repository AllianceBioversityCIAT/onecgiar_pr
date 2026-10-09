#!/usr/bin/env bash
# Removes the frontend DEV configuration written by write-frontend-config.sh and the build caches that may
# hold transformed copies of it (Jest's transform cache, Angular's build cache). Runs as an `if: always()`
# step, so it also runs when a previous step failed. Never fails the job.
set -uo pipefail
client="onecgiar-pr-client"
rm -f "$client/src/environments/environment.ts" "$client/src/environments/environment.prod.ts"
rm -rf "$client/.jest-cache" "$client/.angular"
echo "frontend configuration and caches removed"
