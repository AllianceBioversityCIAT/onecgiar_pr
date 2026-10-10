# Reporting Tool DEV deploy (ONECGIAR CI/CD Platform)

**Status: DRAFT for review. Not installed on any server. No workflow run and no real deployment yet.**

Reporting Tool DEV moves from the Jenkins DEV job to GitHub Actions + the ONECGIAR CI/CD Platform. The
behavior of the Jenkins deploy is kept; the differences are deliberate and listed below.

| Step | Where | What |
|---|---|---|
| CI (every push to `feature/reporting-dev-github-actions-cicd`, and manual runs) | `.github/workflows/reporting-tool-dev-cicd.yml`; jobs needing AWS run in GitHub Environment `reporting-tool-dev-ci` | Checks: backend `npm ci`, ESLint without `--fix`, `npm run test:cov` (no secret, no AWS access); frontend `npm ci`, `npm run lint`, application typecheck, `npm run test:coverage` (with the DEV configuration from Secrets Manager through OIDC, as Jenkins); deploy script `bash -n`, ShellCheck. Then ONE publish job, started only when all of them passed: builds both images, then pushes both to their ECR repositories and records the digests |
| Deploy request (automatic after `publish-images`, owner decision D1; also `workflow_dispatch` with `request-deploy: true` once the file is on the default branch) | Platform reusable workflow, pinned by commit, from GitHub Environment `reporting-tool-dev` (no required reviewers, bound branch only), with this repository's own CI role | One `DEPLOY_REQUESTED` for target `reporting-tool-dev` with `artifacts: {backend, frontend}` (the digests published by the same run) |
| Deploy | Platform Executor, SSH with a pinned host key | Runs `deploy-reporting-tool-dev.sh --artifact backend=sha256:… --artifact frontend=sha256:…` on the target |

**A push sends one deploy request automatically, but a request is not a deploy**: the central Executor
authorizes the repository and the target, deduplicates, orders, locks and applies the target's deploy
window. While the target keeps `deployWindowPolicy: required` with no open window (Phase A), every request
ends `FAILED (DEPLOY_WINDOW_CLOSED)` before any lock, script or server access, and Jenkins keeps deploying
DEV. There is no pull request trigger (the frontend checks need the DEV configuration, which is never given
to pull request code).

### Secret handling in the workflow

| Rule | How |
|---|---|
| Temporary credentials only | `configure-aws-credentials` with OIDC; `output-env-credentials: false`, so only the secret-read and push steps receive them through their own `env:` |
| No credential or token in repository code | npm, lint, tests and docker builds run through `.github/scripts/without-oidc.sh` (no AWS variables, no OIDC request variables) |
| Only the needed secret | The frontend configuration. The backend needs no secret in CI: Jest loads no setup file, every spec that reads `process.env` sets the value itself (dummy values), no spec opens a database connection, and neither Dockerfile has an `ARG`, `ENV` or secret. Its runtime configuration is read on the server at deploy time only |
| Never in logs or outputs | Written by the AWS CLI straight to the git-ignored files (mode 0600, refused if not git-ignored); no `set -x`; CLI errors not printed; Jest `--silent`; only digests leave a job. Its string values are also registered as log masks (defense in depth). Residual risk: a compiler error located in the configuration file itself could quote a line; the masks cover it |
| Never stored | No artifact upload; `setup-node` caches `~/.npm` only; an `if: always()` step removes the files and the Jest and Angular caches that hold transformed copies; only the final nginx stage is pushed (the build stage that copies the files stays on the runner); the registry login uses a private Docker configuration removed at exit |

## The script

`deploy-reporting-tool-dev.sh` follows the platform's generic contract (architecture-change-03): standard
arguments, target mutex, exit codes, `CICD_RESULT`. Derived from the Jenkins stages "Deploy Backend" and
"Deploy Frontend".

| Phase | Steps | Failure |
|---|---|---|
| prepare | Refuse to start when a `*-cicd-previous` or `*-cicd-migration` container is left from an earlier run (operator review); read the running images; registry login in a private Docker config; pull both images **by digest**; fetch the backend runtime configuration from Secrets Manager into a 0600 file; `npm run migration:check:ci` with the new image | exit 10, nothing changed |
| pre-switch | `npm run migration:run` with the new image (container `prms-reportingtool-server-dev-cicd-migration`), only when migrations are pending, while the current containers keep serving. On a timeout the migration container is left running, never killed halfway | exit 20 (database may be partially migrated) |
| switch | Backend then frontend: stop the current container, keep it aside, start the new one (`3900:3400`, `4600:80`, `--restart=always`) | previous containers restored, exit 30 |
| verify | Containers running and health URLs answering below HTTP 500 | previous containers restored, exit 40 |
| success | Remove the kept-aside containers; report the running `repository@digest` of both | exit 0 |

When a switch or a health check fails **after this run applied migrations**, the containers are restored
but the database is not: the script exits 70 (the Executor reports `UNKNOWN_TARGET_STATE` for operator
review). A container rollback never reverts migrations.

AWS access on the target: `aws-credentials=default-chain` reuses the mechanism the server already has. The
script never writes AWS configuration or credentials.

### Deliberate differences from the Jenkins job

| Jenkins | Here | Why |
|---|---|---|
| `allowAnyHosts = true`, password SSH | The Executor pins the host key and uses a key from Secrets Manager | Host authenticity |
| `aws configure set` with the job's keys on the server | The server's existing credential mechanism, used as is | No credentials copied or persisted |
| Static AWS keys in the CI | GitHub OIDC with temporary credentials | No long-lived keys |
| Images by build-number tag | Images by immutable digest | The requested version is exactly what runs |
| Containers killed before the new image is pulled | Pull, configuration and migration check first; stop only at the switch | No downtime when the registry or the database is unavailable |
| Unreadable migration check → run migrations "for safety" | Unreadable check → stop before any change (exit 10) | Fail closed |
| No rollback | Previous containers kept aside and restored | Recovery when it is safe |
| `.env` written to the application directory | Private temporary file, removed at exit | No secret left on disk |
| Frontend `environment.ts` written on the server | Not done | The frontend configuration is compiled into the image; the server copy was unused |
| Registry login stored in `~/.docker` | Private `DOCKER_CONFIG` removed at exit | No registry token left on disk |
| Backend tests inside the image with the DEV runtime configuration | Tests on the runner without it | Application runtime secrets are never given to CI |

Not changed: container names, ports, `--restart=always -d -i -t`, migration commands, the frontend
configuration source, no image pruning (images may be shared with other applications on the host).

## Quality gates: enabled and pending

| Check | State |
|---|---|
| Backend ESLint, `test:cov`; frontend lint, application typecheck, `test:coverage`; script `bash -n` and ShellCheck | Enabled; common barrier: no image is built or pushed unless all of them pass; a push never sends a deploy request |
| Frontend spec typecheck (`tsconfig.spec.json`) | Runs on every trigger and fails visibly: about 200 **pre-existing** errors in 24 spec files on `staging` (2026-10-09). The images and the deploy request do not depend on it until the specs are fixed |
| Backend tests without the DEV runtime configuration | Not yet observed in CI (the specs are written to run without it); the first run confirms it |

## Before the first real deployment

| Item | State |
|---|---|
| **Backend health URL** | **Blocker.** No path is confirmed; the script refuses to run without `backend.health-url`. A path that answers 404 must not be used |
| Target record `reporting-tool-dev` | To be registered (platform runbook 09): `scriptArguments: standard`, `deployWindowPolicy: required`, source repository = this repository |
| GitHub Environments | `reporting-tool-dev-ci` (CI: no required reviewers, feature branch only) and `reporting-tool-dev` (CD: protections kept), with the variables listed in the workflow header |
| AWS: build role, platform CI role trust, ECR, secret access | See the platform's pending-change list (owner authorization) |
| Server | Install the script (root, 0755) and the configuration (root, 0644); bash ≥ 4.4, docker, aws CLI, curl, flock; Jenkins DEV deploys stopped during the deploy window |

## Security observation (pre-existing, out of scope)

The frontend environment files are git-ignored and come from Secrets Manager at build time (as in Jenkins).
The configuration includes credentials of an external search service, and Angular compiles it into the
public browser bundle. This already exists in the Jenkins deployment and is not changed by this migration;
it is recorded for a later review. The values are deliberately not reproduced here.
