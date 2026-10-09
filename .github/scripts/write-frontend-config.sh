#!/usr/bin/env bash
# Writes the Reporting Tool DEV frontend configuration from Secrets Manager to the git-ignored files the
# build expects, as the Jenkins DEV job does (the same SecretString to environment.ts and environment.prod.ts).
#
# The value goes from the AWS CLI straight to the files: it is never echoed and never a step or job output;
# only its string literals are read back to register log masks. Files are mode 0600 and removed by the
# workflow's `if: always()` step (remove-frontend-config.sh).
# Inputs (environment): SECRET_ID, AWS_REGION and the step-scoped temporary credentials.
set -euo pipefail
: "${SECRET_ID:?}" "${AWS_REGION:?}"

dir="onecgiar-pr-client/src/environments"
dev="$dir/environment.ts"
prod="$dir/environment.prod.ts"

# Refuse to write anywhere git would track: the files must stay ignored.
git check-ignore -q "$dev" && git check-ignore -q "$prod" \
  || { echo "::error::the frontend environment files are not git-ignored (fail closed)"; exit 1; }

umask 077
if ! aws secretsmanager get-secret-value --region "$AWS_REGION" --secret-id "$SECRET_ID" \
       --query SecretString --output text > "$dev" 2> /dev/null; then
  rm -f "$dev"
  # The CLI error is not printed: it may quote request details. The id is a non-secret variable.
  echo "::error::could not read the frontend configuration secret (check the build role and the secret id)"
  exit 1
fi
if [ ! -s "$dev" ]; then
  rm -f "$dev"
  echo "::error::the frontend configuration secret is empty (fail closed)"
  exit 1
fi
cp "$dev" "$prod"

# Defense in depth only (the protection is that nothing prints the files): register every quoted string
# value of 8+ characters as a log mask, so an accidental echo in a later step of this job shows `***`.
# Workflow commands are consumed by the runner and never shown in the log.
masked=0
while IFS= read -r value; do
  value="${value%%[\'\"]}"; value="${value#[\'\"]}"
  value="${value//'%'/'%25'}"
  [ "${#value}" -ge 8 ] || continue
  echo "::add-mask::${value}"
  masked=$((masked + 1))
done < <(grep -oE "'[^'\\\\]{8,}'|\"[^\"\\\\]{8,}\"" "$dev" || true)

echo "frontend configuration written (2 files, mode 0600, ${masked} values masked)"
