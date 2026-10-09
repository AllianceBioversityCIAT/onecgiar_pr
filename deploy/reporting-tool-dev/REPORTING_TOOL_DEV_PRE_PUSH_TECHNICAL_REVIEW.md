# Reporting Tool DEV CI: pre-push technical review

| Field | Value |
|---|---|
| Date | 2026-10-09 |
| Branch / HEAD | `feature/reporting-dev-github-actions-cicd` / `1753260f1` (= `staging`, no commit of its own) |
| Method | **Static review only** of the files, plus read-only queries (GitHub API; AWS attempted, see §10). No build, lint, test, Docker, workflow run, commit or push. Nothing was modified except this file |
| Platform reference | `AllianceBioversityCIAT/onecgiar-cicd-platform`, reusable workflow at `3893a882ed8c687b78d4b509252ef55352a87c07` |

Identifiers that must not be published (account id, secret name) appear as placeholders:
`<AWS_ACCOUNT_ID>`, `<FRONTEND_CONFIG_SECRET_NAME>`.

## 1. Executive summary

**Conclusion: READY WITH CONDITIONS.** No CRITICAL finding: a push can neither deploy nor reach the server,
no credential is stored, and the frontend configuration never reaches Git, outputs, artifacts or caches.
No HIGH finding in the code. Four conditions before the first push (§17): re-run the AWS read-back with the
expected identity (it could not be done now: the workstation's active AWS identity changed to another
account), decide on the public-log disclosure of two identifiers (M1), commit exactly the ten files with the
deploy script as `100755`, and accept that every run will show the known spec-typecheck failure (M3).

## 2. Scope

| Area | Files or resources |
|---|---|
| Workflow | `.github/workflows/reporting-tool-dev-cicd.yml` |
| Helper scripts | `.github/scripts/without-oidc.sh`, `write-frontend-config.sh`, `remove-frontend-config.sh`, `push-image.sh` |
| Images | `onecgiar-pr-server/Dockerfile.cicd-dev`, `onecgiar-pr-client/Dockerfile`, `onecgiar-pr-client/.dockerignore` (server has none) |
| Deploy contract | `deploy/reporting-tool-dev/deploy-reporting-tool-dev.sh`, `reporting-tool-dev.conf.example`, `README.md` |
| Application config | Both `package.json` (scripts, Jest), `onecgiar-pr-client/.gitignore`, ESLint configs |
| Platform | Reusable workflow at `3893a88` (inputs, jobs, permissions, guard) |
| Infrastructure | GitHub Environment `reporting-tool-dev-ci` (read back); AWS role and ECR (attempted, §10) |

## 3. Git state (VERIFIED)

| Check | Result |
|---|---|
| Tracked files modified / staged | 0 / 0 |
| Untracked (would be committed) | 10 files (§4) |
| Ignored files of interest | `onecgiar-pr-client/src/environments/environment.ts` and `environment.prod.ts`: **ignored** (local copies, never committed) |
| `.env`, keys, tokens, temp files in the new paths | None |
| Local IAM policy files and verified values | Outside the repository (session scratchpad), not in the working tree |
| Line endings | LF. The initial check reported CRLF in the working tree; that was a **false positive** of the measurement (`grep -c $'\r'` in Git Bash). Verified later: removing `\r` does not change any file size, and every staged blob is LF (blob size = LF size, blob hash = hash of the LF content). See M7 |
| File mode | `core.filemode=false`: new files would be committed as `100644` (see L1) |
| Remote branch | Does not exist yet (first push creates it); no ruleset; only `master` is protected |

## 4. Files in the first commit

| File | Purpose |
|---|---|
| `.github/workflows/reporting-tool-dev-cicd.yml` | CI + manual CD request |
| `.github/scripts/without-oidc.sh` | Runs repository/dependency code without AWS or OIDC variables |
| `.github/scripts/write-frontend-config.sh` | Frontend configuration from Secrets Manager |
| `.github/scripts/remove-frontend-config.sh` | Cleanup (`if: always()`) |
| `.github/scripts/push-image.sh` | ECR push and digest capture |
| `onecgiar-pr-server/Dockerfile.cicd-dev` | Backend DEV image (Jenkins `--target development` equivalent) |
| `deploy/reporting-tool-dev/deploy-reporting-tool-dev.sh` | Target-side deploy script (CD) |
| `deploy/reporting-tool-dev/reporting-tool-dev.conf.example` | Its configuration template (placeholders only) |
| `deploy/reporting-tool-dev/README.md` | Design and differences from Jenkins |
| `deploy/reporting-tool-dev/REPORTING_TOOL_DEV_CI_AWS_GITHUB_SETUP.md` | Setup guide (placeholders for account and secret) |
| *(this report)* | Optional: commit it or keep it local |

No existing file of the application is modified.

## 5. Workflow evaluation

| # | Check | Result | Evidence |
|---|---|---|---|
| 1 | Automatic trigger only for the feature branch | OK | L49–50: `push.branches: [feature/reporting-dev-github-actions-cicd]` (exact name, no wildcard) |
| 2 | No trigger to other branches | OK | Only `push` (that branch) and `workflow_dispatch` (L48–56); no `pull_request`, `pull_request_target`, `workflow_run`, `schedule`. The other workflows of the repository list other branches |
| 3 | A push cannot deploy | OK | L312: `deploy-request` runs only if `github.event_name == 'workflow_dispatch' && inputs.request-deploy` |
| 4 | Manual CD explicit | OK | Input `request-deploy`, `boolean`, default `false` (L53–56) |
| 5 | CI uses `reporting-tool-dev-ci` | OK | L96, L173, L228; CD passes `reporting-tool-dev` to the reusable workflow (L319) |
| 6 | Minimal GitHub permissions | OK | L58 `permissions: {}`; `contents: read` per job; `id-token: write` only on the three CI jobs that need AWS and on `deploy-request` |
| 7 | OIDC used correctly | OK | `configure-aws-credentials` pinned (v6.3.0) with `output-env-credentials: false` (L123, L200, L253, L282); credentials reach only the secret-read and push steps through their `env:`; the action registers them as secrets before outputting them (action source `src/helpers.ts` L80–88) |
| 8 | No static AWS credentials | OK | No `secrets.` reference; no access keys anywhere |
| 9 | Mandatory checks before publishing | OK | L225 `needs: [backend-checks, frontend-checks, deploy-script-checks]` |
| 10 | Any mandatory failure blocks both images | OK | `publish-images` has no `if:` (default `success()`); both builds (L263–270) run before any push (L284–305) |
| 11 | Job dependencies | OK | `deploy-request` needs `publish-images` (L311) |
| 12 | No `if` that skips checks | OK | Only `if:` are `always()` on cleanup steps and the CD condition |
| 13 | No publishing from an unauthorized context | OK | Three layers: bound-ref step (L101–106, L236–241), Environment branch rule (feature branch only, admin bypass off), IAM trust (`ref`, `environment`, repository ids) |
| 14 | `workflow_dispatch` input safe | OK | Boolean, never interpolated into a shell |
| 15 | Consistency | OK | The six `vars.*` names equal the six Environment variables (read back) |

Risks of running feature-branch code with OIDC access: see M2, L3 and the accepted residual risk R10
(no `job_workflow_ref`).

## 6. Security and secrets

| Check | Result | Evidence |
|---|---|---|
| Only the frontend secret is read | OK | `write-frontend-config.sh` L21 reads `SECRET_ID` = Environment variable `RT_FRONTEND_CONFIG_SECRET_ID` (`<FRONTEND_CONFIG_SECRET_NAME>`) |
| Read through OIDC | OK | Step-scoped credentials from the OIDC step |
| Content never printed | OK | L21–22: CLI output straight to the file, stderr discarded; no `cat`/`echo`/`set -x`; masks registered for quoted values ≥ 8 characters (L38–45, defense in depth, not the protection) |
| Restrictive permissions | OK | L20 `umask 077` → files `0600`; `cp` keeps the umask |
| Cleanup on failure | OK | `remove-frontend-config.sh` in an `if: always()` step after every write (L145–147, L216–218, L271–273); removes the two files and `.jest-cache`, `.angular` |
| Not in Git / artifacts / caches | OK | Refuses to write unless both files are git-ignored (L17–18); no `upload-artifact`; `setup-node` caches `~/.npm` only |
| Backend runtime secret not read | OK | No step reads it; the role cannot (Phase 1 simulation) |
| No credentials in arguments or errors | OK | Credentials only via `env:`; CLI errors suppressed; `push-image.sh` masks the account before using the registry name (L14) |
| Test output | OK with residual | Jest `--silent`; coverage reporters `text-summary`, `cobertura` (no file content). `--silent` is not the protection: no test prints the configuration by design, and masks cover string values |
| Compiler errors | Residual (LOW) | A compiler or bundler error located inside the configuration file could quote a line; masks cover string literals ≥ 8 characters |
| Public logs | **M1** | The repository is public, so are its Actions logs (see §11) |

## 7. Docker and ECR

| Check | Result | Evidence |
|---|---|---|
| Backend context and file | OK | `--file onecgiar-pr-server/Dockerfile.cicd-dev … onecgiar-pr-server` (L266); copies only `package*.json`, `src`, `tsconfig*.json`, `nest-cli.json`, `eslint.config.mjs`, `scripts` |
| Backend equivalence with Jenkins | OK | Same as the `development` stage of `./Dockerfile` except `npm ci --ignore-scripts` instead of `npm install` (lockfile exact); `@types/node` already a devDependency |
| Frontend context and file | OK | `--file onecgiar-pr-client/Dockerfile … onecgiar-pr-client` (L270); default target = final `nginx:alpine` stage, which copies only `dist/onecgiar-pr-client/browser` |
| Secrets in images | OK | Backend: none in its context (no `.env` in a checkout). Frontend: the configuration is in the build stage only (as Jenkins) and compiled into the public bundle, as today |
| Base images | Pre-existing | `node:20.13.1-alpine` (pinned), `node:20-alpine` and `nginx:alpine` (floating tags, as Jenkins) |
| Architecture | OK | `ubuntu-24.04` runners build `linux/amd64`, as the Jenkins agents |
| Account / region / repositories | OK | Registry derived from the OIDC identity and `RT_AWS_REGION` (`push-image.sh` L12–15); repository names from the Environment, validated (L9); the role can push only to the two repositories (Phase 1) |
| Digest capture | OK | From `RepoDigests` of the pushed repository, validated `sha256:<64-hex>` (L26–31); same technique ran on a GitHub-hosted runner in the platform's L9 run |
| Digests used by CD | OK | `deploy-request` passes `{"backend": …, "frontend": …}` digests (L321–322); the reusable workflow re-validates them |
| Partial publication | LOW (L4) | Both images are built before pushing; a failure of the second push (network, registry) leaves the first image pushed |
| Jenkins compatibility | Accepted risk R1 | Tags `gha-<run>-<attempt>` never collide with Jenkins' integers; retention is shared (3 tagged images per repository) |

## 8. Helper scripts

| Script | Errors / exit codes | Inputs | Injection | Notes |
|---|---|---|---|---|
| `without-oidc.sh` | `set -euo pipefail`; `exec` keeps the exit code | Command as arguments | `"$@"`, no eval | Unsets the OIDC request variables, runner tokens and AWS variables |
| `write-frontend-config.sh` | `set -euo pipefail`; fail closed on CLI error or empty secret | `SECRET_ID`, `AWS_REGION` required (L10) | Values quoted; no eval | Fixed paths; git-ignore guard |
| `remove-frontend-config.sh` | `set -uo pipefail`; never fails the job | None | — | Fixed paths |
| `push-image.sh` | `set -euo pipefail`; fail closed on account, digest | Four required (L8); repository and tag validated (L9–10) | Quoted; no eval | Private `DOCKER_CONFIG` removed by `trap` |

All are invoked as `bash <script>`, so the executable bit is not needed on the runner. Ubuntu 24.04 runners
provide `bash`, `git`, `aws` (CLI v2), `docker` and `shellcheck`. ShellCheck has **not** been run (not
installed locally): M4.

## 9. AC-03 compatibility

**Reusable workflow at `3893a88`** (present on `origin/main`, public): inputs `targetId` (required),
`environment` (required), `units` (default `[]`), `artifacts` (default `{}`); no outputs, no secrets; jobs
`guard` (`permissions: {}`, event allowlist `push|workflow_dispatch`) and `push-and-send`
(`environment: ${{ inputs.environment }}`, `id-token: write`, `contents: read`, bound ref from the CD
Environment's `CICD_BOUND_REF`, OIDC with session name = repository id). The caller passes the two required
inputs, `units: "[]"` and the two digests, and grants exactly the permissions the called jobs request: **compatible**.

**Deploy script vs the Executor contract (static):**

| Item | Result |
|---|---|
| Vector | `--target-id --execution-id --fencing-token --commit-sha --artifact backend=… --artifact frontend=…`; target id must equal `reporting-tool-dev` (L51, L96); both artifacts required, no other (L101–105) |
| Exit codes | 0/10/20/30/40/50 as AC-03; 2 (usage) and 70 (restore failed, or migrations applied before a failed switch/verify) → `UNKNOWN_TARGET_STATE` |
| `CICD_RESULT` | Last line; `deployedImages` = running `repository@digest` → the Executor's version check gives `VERIFIED` by digest (cross-checked with the Executor's own code on 2026-10-09, before the later edits listed in M6) |
| Order | Pull both by digest, backend runtime configuration, migration check (prepare) → conditional `migration:run` (pre-switch) → backend then frontend switch → health → cleanup |
| Rollback | Previous containers kept aside and restored; never claims a restore after applied migrations (exit 70) |
| Backend secret | Read on the server (`default-chain`), file `0600` in a private directory removed at exit; never in an image |
| Ports | `3900:3400`, `4600:80` (L53, L55) |
| SSH safety | Target mutex (`flock`, L446); host key pinning is the Executor's |

None of this is executed by the first push: it is needed for CD only.

## 10. Infrastructure state

| Resource | State | Basis |
|---|---|---|
| GitHub Environment `reporting-tool-dev-ci` | **VERIFIED now** | Branch rule `feature/reporting-dev-github-actions-cicd` only; `can_admins_bypass: false`; no reviewers, no wait timer (only rule: `branch_policy`); six variables with the expected names; 0 secrets |
| Other Environments | VERIFIED now | `copilot` unchanged; `reporting-tool-dev` (CD) does not exist |
| Repository Actions policy | VERIFIED (Phase 2) | Enabled, all actions allowed |
| IAM role, trust, policy | VERIFIED in Phase 1 (2026-10-09); **not re-verified now** | The workstation's active AWS identity has changed to a different user in a different account; the read-only queries ran against that account and found nothing. No profile or credential was changed. Re-run the read-back with the expected identity (§17) |
| ECR repositories and retention | VERIFIED in Phase 1; **not re-verified now** | Same reason |

## 11. Findings by severity

### CRITICAL

None.

### HIGH

None in the code or configuration.

### MEDIUM

| Id | Finding | Evidence | Impact | Recommendation | Blocks |
|---|---|---|---|---|---|
| M1 (new) | **Identifiers in public logs.** The repository is public, so its Actions logs are public. The role ARN (with the account id) appears in the OIDC step inputs, and the secret **name** appears in the `env:` of the configuration steps. `mask-aws-account-id: true` has no effect with `output-env-credentials: false` | Workflow L119/L131 and peers; action source `src/index.ts` L243/L285 (account masking only when exporting to env) | Disclosure of identifiers, not of credentials or the secret value (access is controlled by IAM); conflicts with the publication policy's intent for committed files | Owner decision before the first push: accept, or add a first step per AWS job that registers `::add-mask::` for the account id and the secret name derived from the variables (masks apply to later log lines, including step headers) | Owner decision for the first push |
| M2 (new) | **Dependency code runs while the configuration file exists.** `npm ci` (with install scripts) and tests run after the file is written | Workflow L125–144 | A malicious dependency could read the frontend configuration (whose values already end in the public bundle); it cannot obtain AWS credentials or a token (wrapper) | Accept (same as Jenkins) or move the write after `npm ci` (lint/tests still need it) | No |
| M3 (pre-existing, visible) | **Every run will be marked failed** by `frontend-spec-typecheck` (about 200 pre-existing spec errors) even when the images are published | Workflow L169–218 | Red runs become normal; real failures are easier to miss | Fix the specs later, then add the job to the barrier | No (accepted) |
| M4 (new) | **ShellCheck not run yet** | `deploy-script-checks` L163 | A warning fails the job and therefore blocks publishing on the first run (fails closed) | Watch the first run; fix the reported line | Possible first-run failure, no risk |
| M5 (unverified) | **Backend tests without the DEV runtime configuration** (Jenkins used it) and coverage thresholds not observed in CI | Workflow L89–90; static review: no Jest setup file, every spec sets its own `process.env` values, no database connection | A dependency on the real configuration would fail the job (blocks publishing) | Watch the first run | Possible first-run failure, no risk |
| M6 (new, CD) | **Deploy script edits after its last simulated run** (side/migration container guard, `default-chain`) were checked with `bash -n` only; the simulated tests were removed by decision | Deploy script L198–211, L132–163 | A defect would show at the first real deploy (the script fails closed before changes in those paths) | A controlled non-destructive validation on the target before the first CD | CD |
| M7 (withdrawn) | **False positive, not a problem.** The CRLF reported here came from the initial measurement (`grep -c $'\r'` in Git Bash), not from the files. Verified while staging (§21): the working-tree files contain no CR byte and all eleven staged blobs are LF | §21 | None | None | Neither |
| M8 (CD) | **`workflow_dispatch` needs the workflow on the default branch** (`master`); and if a dispatch with `request-deploy: true` ran before Environment `reporting-tool-dev` exists, GitHub would create it **without protections** (the platform's CI role trust would still deny the request today) | Platform runbook 03 note; GitHub behavior | No manual CD until the file is on `master`; unprotected CD Environment if created implicitly | Create `reporting-tool-dev` with reviewers before any dispatch | CD |

### LOW

| Id | Finding | Recommendation | Blocks |
|---|---|---|---|
| L1 | Scripts would be committed as `100644` (`core.filemode=false`); not needed by the workflow (`bash <script>`), but the deploy script is meant to be `0755` | `git add --chmod=+x deploy/reporting-tool-dev/deploy-reporting-tool-dev.sh` (and optionally the helpers) | No |
| L2 | `write-frontend-config.sh` hides the CLI error completely | Acceptable; on failure check CloudTrail or the role | No |
| L3 | Whether the runner keeps the configure step's output file on disk during later steps is not verified | Credentials last ≤ 1 h and are scoped to frontend secret read + push to two repositories | No |
| L4 | Partial publication if the second push fails | Acceptable; the orphan image only counts toward retention | No |
| L5 | `test:cov` lacks `--forceExit` (the plain `test` script has it); open handles could hang until the 30-minute timeout | Same as Jenkins; watch the first run | No |
| L6 | Node 20 is out of upstream support | Keep for compatibility (decision); plan an upgrade | No |

## 12. Pre-existing problems (not introduced by this migration)

About 200 TypeScript errors in 24 frontend spec files; frontend configuration (with credentials of an external
search service) compiled into the public bundle, source maps enabled in the DEV build; floating base image
tags (`node:20-alpine`, `nginx:alpine`); containers running as root (`development` stage); Node 20 support status.

## 13. Accepted risks

| Id | Risk |
|---|---|
| R1 | ECR retention shared with Jenkins (3 tagged images per repository): three CI pushes with no Jenkins build in between expire the image Jenkins runs (a re-pull of it would fail); CI images may expire before a manual deploy |
| R10 | No `job_workflow_ref` in the trust: any workflow on the feature branch that uses Environment `reporting-tool-dev-ci` could assume the role (read the frontend configuration, push to the two repositories) |

## 14. Blockers for the first push

None in the code. The first push is subject to the conditions of §17 (C1–C4).

## 15. CD-only pending items

Environment `reporting-tool-dev` with reviewers and its five variables (M8); the platform's CI role
parameters for this repository and `PinnedWorkflowSha = 3893a88…`; target record `reporting-tool-dev`;
Executor SSH credential; script and configuration installed on the server (root, 0755 / 0644), with
`aws-credentials=default-chain` working **for the SSH user the Executor uses**; backend health URL (blocker);
non-destructive validation of the script on the target (M6); Jenkins DEV trigger stopped during the deploy
window; the workflow on `master` for `workflow_dispatch`; a CI digest still retained in ECR at deploy time (R1).

## 16. Recommended corrections (none applied)

1. C1: re-run the read-only AWS read-back with the expected identity.
2. M1: decide; if masking, add one early masking step per AWS job.
3. L1: commit the deploy script with mode `100755`.
4. M2: optionally move the configuration write after `npm ci`.
5. After the first run: address any ShellCheck (M4) or backend test (M5) failure.

## 17. Checklist to authorize the first commit and push

- [ ] **C1** AWS read-back with the expected identity (account `<AWS_ACCOUNT_ID>`): role trust = 6 approved conditions, inline policy = approved, no managed policy, both ECR repositories present with the unchanged retention.
- [ ] **C2** Commit contains exactly the ten files of §4 (plus this report if wanted); `environment*.ts` not staged; deploy script as `100755`.
- [ ] **C3** Decision on M1 (accept, or add masking first).
- [ ] **C4** Acceptance that runs show the known spec-typecheck failure (M3) and that the first run may fail on M4/M5 without any effect outside CI.
- [ ] Confirmation that nobody will run `workflow_dispatch` with `request-deploy: true` (not possible before the file is on `master`; M8).
- [ ] After the push: one run starts (push event); no deploy job runs; two `gha-` digests in the summary; Jenkins images still present.

### What the first push does (static analysis)

| Order | Event |
|---|---|
| 1 | One run (event `push`) starts; `backend-checks`, `deploy-script-checks`, `frontend-checks`, `frontend-spec-typecheck` in parallel; `deploy-request` is skipped (event is not `workflow_dispatch`) |
| 2 | `frontend-checks` and `frontend-spec-typecheck`: bound ref check, checkout, Node, **OIDC token and role assumption** (first real test of the trust), **frontend secret read**, `npm ci`, checks, cleanup |
| 3 | If the three mandatory jobs pass, `publish-images`: bound ref, OIDC, secret read, **both images built**, cleanup, OIDC again, **backend pushed, then frontend pushed** (`gha-<run>-1`), digests in the job summary |
| 4 | Stops early on: missing or mismatched bound ref, OIDC denial, unreadable or empty secret, any mandatory check failure, a build failure, an invalid digest |
| 5 | ECR effect: one new tagged image per repository; within the next lifecycle evaluation each repository keeps its 3 most recent tagged images (R1) |
| 6 | No deploy, no SQS message, no SSH, no server change: the `deploy-request` job cannot run on `push` |

## 18. Conclusion

**READY WITH CONDITIONS** (C1–C4). There is no path from a push to a deploy, no static credential, and no
route for the frontend configuration into Git, outputs, artifacts or caches. The remaining items are a
verification to repeat with the right AWS identity, one owner decision about public-log identifiers, commit
hygiene, and first-run observations that fail closed.

---

## 19. Follow-up (2026-10-09, after the owner's review)

Diagnosis and read-only checks only. No AWS, GitHub, workflow, script or permission change. Identifiers of
the unexpected identity are deliberately not written in this public file.

### 19.1 AWS identity

| Item | Result |
|---|---|
| Identity seen in the audit (§10) | **Another IAM user in another AWS account** (not the Reporting Tool account) |
| Identity now | `arn:aws:iam::<AWS_ACCOUNT_ID>:user/cristian.gamboa`, the expected account, in both the Bash and the PowerShell sessions |
| Active credential source now | Static keys in **process-scope** environment variables (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` set; no `AWS_SESSION_TOKEN`, no `AWS_PROFILE`, no region variable). They are **not** defined in the Windows user or machine environment, nor in any shell or PowerShell profile: they are inherited from the process that launched the session |
| Fallback source | `~/.aws/credentials`, single profile `[default]`. **VERIFIED**: with the environment variables removed for one read-only call, the AWS CLI resolves exactly the identity seen in the audit |
| Cause | **Verified mechanism:** the AWS CLI uses the environment variables when present and otherwise the `[default]` profile, which belongs to the other account. **Hypothesis (not proven):** during the audit the Claude Code process had been started from a terminal without those variables (a session restart happened in between); it now runs from one that has them |
| Region | No default region configured anywhere; every command passes `--region us-east-1` explicitly |
| Profile for the Reporting Tool account | None (`aws configure list-profiles` → `default` only, which is the other account) |
| Recommendation (owner action, not done) | Create a named profile for the Reporting Tool account and use `--profile` explicitly, or keep launching from a terminal that sets the variables; every AWS step of this work asserts `Account == <AWS_ACCOUNT_ID>` before acting |

**C1: RESOLVED.** All checks below ran only after asserting the account.

### 19.2 IAM role (VERIFIED again)

| Check | Result |
|---|---|
| Role `reporting-tool-dev-github-ci` | Exists; created 2026-10-09T18:45:25Z; max session 3600 s; no permissions boundary |
| Trust policy | Identical to the approved file; condition keys exactly `aud`, `environment`, `ref`, `repository_id`, `repository_owner_id`, `sub` (no `job_workflow_ref`) |
| Inline policy | `reporting-tool-dev-ci-minimum` only, identical to the approved one |
| Managed policies / instance profiles | 0 / 0 |

### 19.3 ECR and Secrets Manager (VERIFIED again)

| Resource | Result |
|---|---|
| `prms-reportingtool-server-dev` | Exists; lifecycle unchanged (tagged `*`, keep 3); `MUTABLE`; Jenkins kept building (newest tags 2532, 2531, 2529) |
| `prms-reportingtool-client-dev` | Exists; lifecycle unchanged; `MUTABLE`; newest tags 2532, 2531, 2530 |
| Frontend secret | Exists, not deleted, AWS managed key, last changed 2026-09-11 (unchanged); value never read |

### 19.4 M1: identifiers in public logs (proposal, not applied)

Where they appear today (static analysis):

| Identifier | Where in the public log |
|---|---|
| Role ARN (contains the account id) | `with:` inputs of every `configure-aws-credentials` step (workflow L119, L196, L249, L278); possibly in an `AccessDenied` message |
| Account id alone | Any message that quotes an assumed-role ARN or a registry host; `push-image.sh` masks it only from its own L14 on |
| Secret name | `env:` header of the three "Frontend configuration from Secrets Manager" steps (L131, L208, L261) |

Why `::add-mask::` alone is not enough: a step's `env:` block and its script (with `${{ }}` expanded) are
printed **before** the step runs, so a masking step that receives the values from `vars.` would print them
itself. `mask-aws-account-id` does nothing with `output-env-credentials: false` (action source).

**Proposed minimal change (needs authorization: one GitHub change and one workflow change):**

1. Move `RT_BUILD_ROLE_ARN` and `RT_FRONTEND_CONFIG_SECRET_ID` from Environment **variables** to Environment
   **secrets** of `reporting-tool-dev-ci` (same names). They are not credentials; secrets are used only
   because GitHub masks secret values everywhere in the log, including `with:` inputs and `env:` headers.
2. In the workflow, read those two as `secrets.RT_BUILD_ROLE_ARN` / `secrets.RT_FRONTEND_CONFIG_SECRET_ID`
   (seven references) instead of `vars.`.
3. Add a first step to each AWS job (`frontend-checks`, `frontend-spec-typecheck`, `publish-images`):

   ```yaml
   - name: Mask the account id
     env:
       ROLE_ARN: ${{ secrets.RT_BUILD_ROLE_ARN }}   # shown as *** in the header
     run: |
       account="$(printf '%s' "$ROLE_ARN" | cut -d: -f5)"
       [[ "$account" =~ ^[0-9]{12}$ ]] || { echo "::error::invalid role ARN"; exit 1; }
       echo "::add-mask::$account"
   ```

| Must not break | Why it does not |
|---|---|
| OIDC | `role-to-assume` accepts a secret expression; the value is unchanged |
| Secrets Manager | `SECRET_ID` gets the same value from the secret |
| ECR push | `push-image.sh` derives the registry from STS, independent of the masks |
| Digests and job outputs | Outputs carry only `sha256:` digests, which contain neither the ARN, the secret name nor the account id (GitHub would drop an output containing a secret value) |

Alternative: accept M1 (identifiers, not credentials; access is controlled by the IAM trust). The first run's
logs are public and stay available, so the decision is needed **before** the first push.

### 19.5 M2: time the frontend configuration exists (recommendation, not applied)

| Question | Answer |
|---|---|
| Does `npm ci` need the file? | **No.** It installs dependencies from the lockfile and never reads `src/environments` |
| Do lint and typecheck need the real file? | Yes: the application imports it (60 files); a placeholder would be invented configuration (not allowed) |
| Do the unit tests need it? | Yes, for the same reason |
| When is it needed for the Angular build? | Inside the frontend image build only (`npm run build:dev`); the backend image build never reads it |
| Removal right after use | Already done after the last consumer in each job (`if: always()`) |
| Artifacts, caches, images | Unchanged versus Jenkins: no artifact, `~/.npm` cache only, only the final nginx stage is pushed |
| Effect on the build result | None for the reorder below |

**Recommendation (lowest impact):** in `frontend-checks` and `frontend-spec-typecheck`, run `npm ci` **before**
the OIDC and configuration steps (install scripts are the usual supply-chain entry point, and they would
then never see the file); in `publish-images`, build the backend image **before** writing the
configuration. Lint, typecheck, tests and the frontend build still read the real file. Residual: dependency
code that runs during lint and tests can still read it (as in Jenkins; its values end in the public bundle).

### 19.6 First commit (proposal; nothing staged)

State: branch `feature/reporting-dev-github-actions-cicd`, HEAD `1753260f1` (= `staging`), no tracked change,
no staged file; `environment.ts` and `environment.prod.ts` ignored; no `.env`, key, token or AWS result file in
the working tree (the IAM policy files and verified values are outside the repository).

| File | Git mode |
|---|---|
| `.github/workflows/reporting-tool-dev-cicd.yml` | 100644 |
| `.github/scripts/without-oidc.sh` | 100755 (recommended; invoked with `bash`, so not required) |
| `.github/scripts/write-frontend-config.sh` | 100755 (recommended) |
| `.github/scripts/remove-frontend-config.sh` | 100755 (recommended) |
| `.github/scripts/push-image.sh` | 100755 (recommended) |
| `onecgiar-pr-server/Dockerfile.cicd-dev` | 100644 |
| `deploy/reporting-tool-dev/deploy-reporting-tool-dev.sh` | **100755 (required for its installation)** |
| `deploy/reporting-tool-dev/reporting-tool-dev.conf.example` | 100644 |
| `deploy/reporting-tool-dev/README.md` | 100644 |
| `deploy/reporting-tool-dev/REPORTING_TOOL_DEV_CI_AWS_GITHUB_SETUP.md` | 100644 |
| `deploy/reporting-tool-dev/REPORTING_TOOL_DEV_PRE_PUSH_TECHNICAL_REVIEW.md` | 100644 (optional) |

Excluded: everything else, in particular `onecgiar-pr-client/src/environments/*.ts` (ignored) and any local
IAM or values file. Line endings: Git stores LF (`core.autocrlf=true`). With `core.filemode=false` the modes
must be set explicitly when staging (`git add --chmod=+x` or `git update-index --chmod=+x`), then confirmed
with `git ls-files -s` before committing.

### 19.7 First CI run: classification

| Item | Class |
|---|---|
| C1 AWS identity | **Resolved** (§19.1) |
| M1 decision (accept, or the change of §19.4) | **Blocker before push** (owner decision; public logs) |
| C2 exact files and modes | **Blocker before push** (commit hygiene) |
| First real OIDC assumption | Acceptable: a denial fails before any secret read or push |
| Spec typecheck failure (pre-existing) | Acceptable: visible, outside the barrier |
| ShellCheck findings | Acceptable: fail closed (blocks publishing only) |
| Backend tests without `.env` | Acceptable: fail closed |
| Timeouts (30/45/20/45 min) | Acceptable: fail closed |
| M2 reorder | Improvement; low effort, can go before the push if authorized |
| L1–L6 | Later improvements |
| M6, M8 and §15 | CD only (M7 withdrawn: false positive) |

A push can never request a deploy: `deploy-request` requires `workflow_dispatch` and `request-deploy: true`.

### 19.8 Recommendation

**READY WITH CONDITIONS:** C1 resolved; still needed before the first push: the M1 decision (and, if chosen,
its authorized change) and the commit with exactly the files and modes of §19.6. Optional before the push:
the M2 reorder.

---

## 20. Corrections applied (2026-10-09, authorized): M1 and M2

### 20.1 M1: identifiers in public logs (CORRECTED, statically verified)

| Change | Detail |
|---|---|
| GitHub | `RT_BUILD_ROLE_ARN` and `RT_FRONTEND_CONFIG_SECRET_ID` created as Environment secrets of `reporting-tool-dev-ci` with the values of the former variables (copied by pipe, never printed or written to disk; lengths matched); after the workflow was updated and both secrets were confirmed, the two variables were deleted |
| Workflow | Seven references changed from `vars.` to `secrets.` (four `role-to-assume`, three `SECRET_ID`); header comment updated; no other change |
| Compatibility | OIDC: `role-to-assume` takes the secret expression, same value. Secrets Manager: `SECRET_ID` same value. ECR: `push-image.sh` derives the registry from STS and masks the account id. Job outputs carry only `sha256:` digests (contain neither secret value). Secrets are used only in jobs bound to `reporting-tool-dev-ci`, the only place they exist |
| Log effect | The role ARN (with the account id) and the secret name appear as `***` in `with:` inputs and `env:` headers |
| Not applied | The extra "mask the account id" step of §19.4 (step 3): the authorization limited the workflow change to the references. Residual (LOW): an unexpected error message quoting the account id **alone** (for example an assumed-role ARN) would not be masked outside `push-image.sh` |

### 20.2 M2: exposure window of the frontend configuration (CORRECTED, statically verified)

| Job | New order |
|---|---|
| `frontend-checks` | bound ref → checkout → Node → **`npm ci`** → OIDC → configuration → lint → typecheck → tests → cleanup (`always()`) |
| `frontend-spec-typecheck` | bound ref → checkout → Node → **`npm ci`** → OIDC → configuration → spec typecheck → cleanup (`always()`) |
| `publish-images` | bound ref → checkout → **backend image build** → OIDC → configuration → frontend image build → cleanup (`always()`) → OIDC → pushes |

Real configuration, mode 0600, git-ignore guard, cleanup and the Angular build are unchanged. Residual:
dependency code that runs during lint, tests and the frontend build can still read the file (as in Jenkins).

### 20.3 Static verification after the corrections

| Check | Result |
|---|---|
| References to the migrated variables | None left |
| Variables / secrets read by the workflow | `CICD_BOUND_REF`, `RT_AWS_REGION`, `RT_ECR_BACKEND_REPOSITORY`, `RT_ECR_FRONTEND_REPOSITORY` / `RT_BUILD_ROLE_ARN`, `RT_FRONTEND_CONFIG_SECRET_ID`: exactly the Environment's content |
| `npm ci` before the configuration; backend build before it | Yes (all three jobs) |
| Cleanup | `if: always()` after the last consumer in every job that writes the file |
| Wrapper on dependency code in OIDC jobs | Yes |
| Triggers | `push` (feature branch) and `workflow_dispatch` only |
| Deploy | Unchanged: only `workflow_dispatch` with `request-deploy: true`; reusable workflow at `3893a88` with the same inputs (AC-03 compatible) |
| Quality barrier | Unchanged |
| Action pinning | All full SHAs |

### 20.4 Environment `reporting-tool-dev-ci` (read back)

No reviewers, no wait timer, deployment branch `feature/reporting-dev-github-actions-cicd` only,
`can_admins_bypass: false`, **4 variables, 2 secrets** (values not readable through the API, not recorded here).
Other Environments unchanged (`copilot`). AWS, Jenkins and ECR unchanged in this step.

### 20.5 First commit (unchanged proposal, §19.6)

The ten files of §19.6 (plus this report if wanted); deploy script `100755` (required), helper scripts
`100755` (recommended), all others `100644`; `environment*.ts` excluded (ignored).

### 20.6 Recommendation

**READY WITH CONDITIONS → only C2 remains:** stage exactly the files of §19.6 with the modes above, check
`git diff --cached --name-status` and `git ls-files -s`, then commit and push (authorization required).
The accepted first-run risks of §19.7 are unchanged.

---

## 21. Staging verification (2026-10-09)

| Check | Result |
|---|---|
| Staged files | The eleven files of §19.6, all `A` (added); no existing file changed |
| Modes | `100755`: the four `.github/scripts/*.sh` and `deploy-reporting-tool-dev.sh`; `100644`: the other six |
| Line endings | Every staged blob is LF: blob size equals the size of the content without `\r`, and the blob hash equals the hash of the LF content. The working-tree files contain no CR either. **M7 is withdrawn** (false positive of the initial `grep`-based check) |
| Sensitive content | None in the added lines (credentials, tokens, private keys, account ids, secret name, Jenkins data); no `environment*.ts`, `.env`, IAM or temporary file staged |
| Workflow (staged blob) | Reads the two Environment secrets and the four variables; triggers `push` (feature branch) and `workflow_dispatch`; `deploy-request` only with `workflow_dispatch` and `request-deploy: true` |
