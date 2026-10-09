# Reporting Tool DEV CI: AWS and GitHub setup guide

**Status: AWS and GitHub validated read-only on 2026-10-09. Nothing has been created or changed.** Every
change below needs the owner's explicit authorization.

**Phase 1 (AWS IAM): COMPLETED on 2026-10-09** (§14). The role `reporting-tool-dev-github-ci` was created by
`user/cristian.gamboa` in the expected account with **option 2** of §5.4 (owner decision): six trust
conditions, **no `job_workflow_ref`**, and the approved inline policy only. No other AWS resource changed.
**Phase 2 (GitHub): COMPLETED on 2026-10-09** (§15): Environment `reporting-tool-dev-ci` created with its
branch rule and six variables. Next: the first controlled commit and push (not authorized yet).

| Tag | Meaning |
|---|---|
| **VERIFIED** | Checked with a read-only query on 2026-10-09 (AWS account of the Jenkins DEV job, `us-east-1`; GitHub REST API) |
| **CODE** | Confirmed in this repository (`.github/workflows/reporting-tool-dev-cicd.yml`, `.github/scripts/`) or in the Jenkins DEV job provided by the owner |
| **PENDING** | Not yet verifiable without a workflow run, a role assumption or an authorized action |
| **RECOMMENDED** | Technical recommendation; the owner may choose otherwise |
| **AUTHORIZATION REQUIRED** | A change to AWS or GitHub |

Placeholders (`<AWS_ACCOUNT_ID>`, `<FRONTEND_CONFIG_SECRET_NAME>`, `<FRONTEND_CONFIG_SECRET_ARN>`) keep account
and secret identifiers out of this public repository. The owner holds the verified values in a local file
outside the repository; the GitHub repository and owner ids are public values (VERIFIED below).

---

## 1. CI architecture (CODE)

| Trigger | Jobs | Result |
|---|---|---|
| Push to `feature/reporting-dev-github-actions-cicd` | `backend-checks`, `frontend-checks`, `deploy-script-checks` (mandatory), `frontend-spec-typecheck` (visible, non-blocking) → `publish-images` | Both images in ECR by digest. **No deploy request** |
| `workflow_dispatch`, `request-deploy: false` (default) | Same | Same |
| `workflow_dispatch`, `request-deploy: true` | Same, then `deploy-request` (Environment `reporting-tool-dev`) | One deploy request (CD, later phase, §13) |

`publish-images` needs all three mandatory check jobs and builds both images before pushing either. No other
workflow of this repository triggers on a push to the feature branch (VERIFIED in `.github/workflows/`).

| Job | AWS access |
|---|---|
| `backend-checks`, `deploy-script-checks` | None |
| `frontend-checks`, `frontend-spec-typecheck` | OIDC → build role: frontend configuration read only |
| `publish-images` | OIDC → build role: frontend configuration read, then ECR push |

## 2. Prerequisites

| # | Prerequisite | State |
|---|---|---|
| P1 | GitHub OIDC provider `token.actions.githubusercontent.com`, audience `sts.amazonaws.com` | **VERIFIED**: the only OIDC provider of the account; **created and owned by the platform stack `cicd-poc-dev`** (logical id `GitHubOidcProvider`, created 2026-10-07, tag `Project=ONECGIAR-CICD-Platform`). See risk R3 |
| P2 | ECR repositories `prms-reportingtool-server-dev`, `prms-reportingtool-client-dev` in `us-east-1` | **VERIFIED** (§8) |
| P3 | Frontend configuration secret | **VERIFIED** (§7) |
| P4 | Repository and owner ids | **VERIFIED**: `repository_id` = `520556977`, `repository_owner_id` = `73232739` (public, GitHub REST API) |
| P5 | OIDC subject template of the repository | **VERIFIED**: `use_default: true`, `use_immutable_subject: false`, prefix `repo:AllianceBioversityCIAT/onecgiar_pr` |
| P6 | Repository Actions policy | **VERIFIED** (2026-10-09): Actions enabled, `allowed_actions: all` |
| P7 | Role name `reporting-tool-dev-github-ci` free | **VERIFIED** (`NoSuchEntity`) |
| P8 | ECR retention shared with Jenkins | **ACCEPTED RISK** (owner decision 2026-10-09, §8.2): policies unchanged |

## 3. GitHub variables (CODE: names verified against the YAML)

> **Updated 2026-10-09 (M1):** `RT_BUILD_ROLE_ARN` and `RT_FRONTEND_CONFIG_SECRET_ID` are now **Environment
> secrets** (same names and values; read as `secrets.` in the workflow) so that GitHub masks them in the public
> logs. The Environment has **four variables and two secrets** (§16). The table below keeps the original inventory.

Environment **variables** of `reporting-tool-dev-ci` (no GitHub secret is read by the workflow):

| Variable | Value | State | Required | Used in (job → step) |
|---|---|---|---|---|
| `CICD_BOUND_REF` | `refs/heads/feature/reporting-dev-github-actions-cicd` | CODE | Yes, fail closed | `frontend-checks`, `frontend-spec-typecheck`, `publish-images` → "Enforce bound ref" |
| `RT_BUILD_ROLE_ARN` | `arn:aws:iam::<AWS_ACCOUNT_ID>:role/reporting-tool-dev-github-ci` | **VERIFIED** (created in Phase 1, §14) | Yes | the three jobs → "Assume the build role through OIDC…" (`publish-images` twice) |
| `RT_AWS_REGION` | `us-east-1` | **VERIFIED** (ECR and the secret) | Yes | OIDC, configuration and push steps |
| `RT_ECR_BACKEND_REPOSITORY` | `prms-reportingtool-server-dev` | **VERIFIED** | Yes | `publish-images` → "Push backend image…" |
| `RT_ECR_FRONTEND_REPOSITORY` | `prms-reportingtool-client-dev` | **VERIFIED** | Yes | `publish-images` → "Push frontend image…" |
| `RT_FRONTEND_CONFIG_SECRET_ID` | `<FRONTEND_CONFIG_SECRET_NAME>` (the secret of the Jenkins stage "Startup fronend") | **VERIFIED** (exists, §7) | Yes | the three jobs → "Frontend configuration from Secrets Manager" |

## 4. GitHub Environment `reporting-tool-dev-ci` (AUTHORIZATION REQUIRED)

| Setting | Value |
|---|---|
| Required reviewers / wait timer | None / 0 (a push must run CI without approval) |
| Deployment branches | Selected: `feature/reporting-dev-github-actions-cicd` only |
| Secrets | None |
| Variables | The six of §3 |
| Administrators bypass | RECOMMENDED: off |

Workflow permissions (CODE): top level `permissions: {}`; `contents: read` per job; `id-token: write` only for
`frontend-checks`, `frontend-spec-typecheck`, `publish-images` and the manual `deploy-request`.

## 5. IAM OIDC role: name and trust policy

Name (RECOMMENDED): `reporting-tool-dev-github-ci`; expected ARN
`arn:aws:iam::<AWS_ACCOUNT_ID>:role/reporting-tool-dev-github-ci`; maximum session 1 hour.

### 5.1 Conditions: what is deployed, compatible, proven and pending

Reference: the platform's CI role trust (stack `cicd-poc-dev`), read back on 2026-10-09.

| Condition | In the deployed platform trust | IAM compatibility confirmed | Restriction proven by a negative test | For this role |
|---|---|---|---|---|
| `aud` | Yes | Yes (AWS documentation; successful assumptions) | No | Use |
| `sub` | Yes (immutable form) | Yes | No | Use, classic form (§5.2) |
| `repository_id` | Yes | Yes (key present: a successful `StringEquals` match requires it) | No | Use |
| `repository_owner_id` | Yes | Yes (same) | No | Use |
| `environment` | Yes | Yes (same) | No | Use |
| `ref` | Yes | Yes (same) | No | Use |
| `job_workflow_ref` | Yes (reusable workflow at a SHA) | Yes (same) | No | Use; the value for a top-level workflow is PENDING observation (§5.2) |
| `sts:RoleSessionName` = `${…:repository_id}` | Yes | Yes | **Yes** (two wrong session names denied, platform P-R1) | Not used: no consumer of this role depends on the session name |

A successful assumption proves each key exists in the request and matched its value; it does **not** prove
that changing one value alone is denied. Per-condition negative tests remain PENDING (§11).

### 5.2 Values for this role

| Claim | Value | State |
|---|---|---|
| `sub` | `repo:AllianceBioversityCIAT/onecgiar_pr:environment:reporting-tool-dev-ci` | **VERIFIED** template (`use_immutable_subject: false`; the same API returns `true` and the exact deployed prefix for the platform repository, which assumes its role successfully) |
| `repository_id` | `520556977` | **VERIFIED** |
| `repository_owner_id` | `73232739` | **VERIFIED** (same owner as the platform repository) |
| `environment` | `reporting-tool-dev-ci` | CODE |
| `ref` | `refs/heads/feature/reporting-dev-github-actions-cicd` | CODE |
| `job_workflow_ref` | Expected `AllianceBioversityCIAT/onecgiar_pr/.github/workflows/reporting-tool-dev-cicd.yml@refs/heads/feature/reporting-dev-github-actions-cicd` | **PENDING, not certain**: the GitHub OIDC reference (checked 2026-10-09) defines the claim only "for jobs using a reusable workflow" and says nothing about its presence or value in a top-level workflow; the platform's evidence covers reusable workflows only. A wrong or absent value fails closed (`AccessDenied` at the OIDC step, before any secret read or push), but the role must then be changed. See §5.4 |

### 5.3 Trust policy as first proposed (with `job_workflow_ref`; NOT applied, see §14 for the applied one)

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ReportingToolDevCiFromGitHubOidc",
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::<AWS_ACCOUNT_ID>:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
          "token.actions.githubusercontent.com:sub": "repo:AllianceBioversityCIAT/onecgiar_pr:environment:reporting-tool-dev-ci",
          "token.actions.githubusercontent.com:repository_id": "520556977",
          "token.actions.githubusercontent.com:repository_owner_id": "73232739",
          "token.actions.githubusercontent.com:environment": "reporting-tool-dev-ci",
          "token.actions.githubusercontent.com:ref": "refs/heads/feature/reporting-dev-github-actions-cicd",
          "token.actions.githubusercontent.com:job_workflow_ref": "AllianceBioversityCIAT/onecgiar_pr/.github/workflows/reporting-tool-dev-cicd.yml@refs/heads/feature/reporting-dev-github-actions-cicd"
        }
      }
    }
  ]
}
```

| Condition | Blocks |
|---|---|
| `aud` | Tokens for another audience |
| `sub`, `repository_id`, `repository_owner_id` | Any other repository or owner (also a renamed or re-created repository) |
| `environment` | Jobs outside `reporting-tool-dev-ci`, including the CD Environment |
| `ref` | Any other branch, tag or pull request ref |
| `job_workflow_ref` | Any other workflow file of the repository (**not applied**: option 2, §14) |

### 5.4 Open decision: how to bind the role to the workflow file

| Option | Trust | Certainty | Trade-off |
|---|---|---|---|
| **1** Keep `job_workflow_ref` with the expected value | §5.3 as is | Not documented for top-level workflows | Strongest binding if right; if wrong, the first CI run fails at the OIDC step and the trust must be updated (new authorization) |
| **2** Drop `job_workflow_ref` | §5.3 without that line (`aud`, `sub`, `repository_id`, `repository_owner_id`, `environment`, `ref` remain) | All six are verified for this repository | Any workflow file on the feature branch that uses Environment `reporting-tool-dev-ci` could assume the role; only people who can push to that branch can add one, and the Environment's branch rule still applies |
| **3** Make the CI jobs a reusable workflow of this repository, called by a thin top-level workflow | `job_workflow_ref` = the reusable file at the branch ref (the documented case) | Documented form | Changes the workflow files (needs authorization); the claim form for a same-repository call at a branch ref is still to be observed on the first run |
| **4** Observe first | Run a token-claims probe (a workflow that prints only non-sensitive claims) on the branch before creating the role | Exact value observed | Needs a workflow commit and a run (authorization), as the platform did in its L5 step |

**Owner decision (2026-10-09): option 2.** Earlier recommendation, for the record: option 4 when certainty is required before creation, otherwise option 1 (the failure mode is
closed and visible at the first run).

## 6. IAM permissions policy (AUTHORIZATION REQUIRED)

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ReadFrontendDevConfigurationOnly",
      "Effect": "Allow",
      "Action": "secretsmanager:GetSecretValue",
      "Resource": "<FRONTEND_CONFIG_SECRET_ARN>"
    },
    {
      "Sid": "EcrRegistryToken",
      "Effect": "Allow",
      "Action": "ecr:GetAuthorizationToken",
      "Resource": "*"
    },
    {
      "Sid": "PushReportingToolDevImages",
      "Effect": "Allow",
      "Action": [
        "ecr:BatchCheckLayerAvailability",
        "ecr:InitiateLayerUpload",
        "ecr:UploadLayerPart",
        "ecr:CompleteLayerUpload",
        "ecr:PutImage"
      ],
      "Resource": [
        "arn:aws:ecr:us-east-1:<AWS_ACCOUNT_ID>:repository/prms-reportingtool-server-dev",
        "arn:aws:ecr:us-east-1:<AWS_ACCOUNT_ID>:repository/prms-reportingtool-client-dev"
      ]
    }
  ]
}
```

| Permission | Why | Scope |
|---|---|---|
| `secretsmanager:GetSecretValue` | `write-frontend-config.sh` | The one secret, by its full ARN (VERIFIED, with its 6-character suffix) |
| `kms:Decrypt` | **Not needed**: the secret has no customer managed key (`KmsKeyId` empty → AWS managed `aws/secretsmanager`, VERIFIED) | — |
| `ecr:GetAuthorizationToken` | Registry login in `push-image.sh` | AWS cannot scope it by resource; short-lived token only |
| Five push actions | `docker push` | The two repositories (VERIFIED: encryption `AES256`, so no KMS permission for ECR either) |

Not granted: the backend runtime secret, `ecr:BatchGetImage` or any pull, other repositories, EC2, DynamoDB,
SQS, IAM, CloudFormation, deploy. No resource-based policy blocks the grant (VERIFIED: the secret and both
repositories have none).

## 7. Secrets Manager (VERIFIED, metadata only; `get-secret-value` was never run)

| Item | Value |
|---|---|
| Secret | `<FRONTEND_CONFIG_SECRET_NAME>`, the one the Jenkins stage "Startup fronend" writes to `environment.prod.ts` and `environment.ts` |
| Region | `us-east-1` |
| ARN | `<FRONTEND_CONFIG_SECRET_ARN>` (owner's local values file) |
| KMS | AWS managed key (no `KmsKeyId`): no `kms:Decrypt` statement |
| State | Active (not scheduled for deletion), not replicated, rotation not configured; last accessed 2026-10-08 (Jenkins) |
| Resource policy | None |
| Written to (CODE) | `onecgiar-pr-client/src/environments/environment.ts` and `environment.prod.ts`, git-ignored; the script refuses to write if they are not ignored; mode 0600 |
| Not printed (CODE) | CLI output straight to the files, CLI errors discarded, no `set -x`/`cat`/`printenv`, values of 8+ characters registered as masks, Jest `--silent`, never a step or job output |
| Removed (CODE) | `remove-frontend-config.sh` in an `if: always()` step of each job that wrote it, with the Jest and Angular caches |

The backend runtime secret was not queried and is not part of CI.

## 8. ECR, retention and Jenkins compatibility

### 8.1 Repositories (VERIFIED)

| Repository | Created | Tag mutability | Scan on push | Encryption | Repository policy | Lifecycle |
|---|---|---|---|---|---|---|
| `prms-reportingtool-server-dev` | 2025-05-22 | MUTABLE | No (registry: BASIC, no rules) | AES256 | None | Keep 3 tagged (§8.2) |
| `prms-reportingtool-client-dev` | 2025-05-26 | MUTABLE | No | AES256 | None | Keep 3 tagged (§8.2) |

Current tags: Jenkins build numbers only (2523–2530 between 2026-10-07 and 2026-10-09, several pushes a
day); one old untagged image in the client repository.

CI behavior (CODE): tag `gha-<run_id>-<run_attempt>`; digest from `RepoDigests` (the same technique ran on a
GitHub-hosted runner in the platform's L9 run); one failed push fails the job and no deploy can follow.

### 8.2 Retention: ACCEPTED RISK (owner decision, 2026-10-09)

**Decision:** keep using only these two repositories with their current lifecycle policies unchanged (3 most
recent tagged images each); Jenkins and GitHub Actions share that retention. No repository is created, no
policy or tag mutability is changed, no image is removed. The analysis below stays as the record of the risk;
the options are not applied.

Both repositories have the same lifecycle policy (VERIFIED):

```json
{"rules":[{"rulePriority":1,"selection":{"tagStatus":"tagged","tagPatternList":["*"],"countType":"imageCountMoreThan","countNumber":3},"action":{"type":"expire"}}]}
```

It keeps the **3 most recent tagged images, whatever the tag**. `gha-` images would count in the same pool:

| Effect | Consequence |
|---|---|
| Three CI pushes with no Jenkins build in between | Every Jenkins image expires, including the one Jenkins runs now (the container keeps running from its local copy, but that tag can no longer be pulled again) |
| Jenkins builds several times a day | `gha-` images expire within hours, so a later manual deploy of a CI digest can fail at the pull (the script stops before any change, exit 10) |

Tags themselves do not conflict (`gha-…` vs integers); only the count does.

Options (all AUTHORIZATION REQUIRED; nothing has been changed):

| Option | Change | Effect on Jenkins |
|---|---|---|
| **A (RECOMMENDED)**: separate retention per origin in the same repositories | Rule 1: `tagPatternList ["gha-*"]`, keep the 10 most recent. Rule 2 (unchanged rule, lower priority): `["*"]`, keep 3 | None expected: per the ECR documentation an image selected by a higher-priority rule is not evaluated by a lower-priority rule, so `gha-` images neither count toward nor are expired by the Jenkins rule. **Confirm with a lifecycle policy preview before applying** (`start-lifecycle-policy-preview` + `get-lifecycle-policy-preview`; the preview deletes nothing but is a write API call, so it needs authorization) |
| B: dedicated repositories for CI images | New repositories (for example with a `-gha` suffix) with their own retention | None; requires revisiting approved decision 8 and the script configuration |
| C: no change, CI pushes rarely | — | Not safe: depends on push frequency |

Option A policy (proposal):

```json
{
  "rules": [
    {
      "rulePriority": 1,
      "description": "GitHub Actions images (gha-*): keep the 10 most recent",
      "selection": { "tagStatus": "tagged", "tagPatternList": ["gha-*"], "countType": "imageCountMoreThan", "countNumber": 10 },
      "action": { "type": "expire" }
    },
    {
      "rulePriority": 2,
      "description": "Jenkins images (all other tags): keep the 3 most recent (current rule)",
      "selection": { "tagStatus": "tagged", "tagPatternList": ["*"], "countType": "imageCountMoreThan", "countNumber": 3 },
      "action": { "type": "expire" }
    }
  ]
}
```

## 9. Read-only commands

Run on 2026-10-09 (results above): `sts get-caller-identity`; `ecr describe-repositories`,
`get-registry-scanning-configuration`, `get-lifecycle-policy`, `get-repository-policy`, `describe-images`;
`secretsmanager describe-secret` (metadata query), `get-resource-policy`; `iam list-open-id-connect-providers`,
`get-open-id-connect-provider`, `get-role` (platform CI role trust, and the proposed name); CloudFormation
`describe-stack-resources`, `describe-stacks`; GitHub `repos/{repo}` and `repos/{repo}/actions/oidc/customization/sub`.

Still to run:

```bash
# G3 Actions policy (authenticated repository admin)
gh api repos/AllianceBioversityCIAT/onecgiar_pr/actions/permissions
gh api repos/AllianceBioversityCIAT/onecgiar_pr/actions/permissions/selected-actions   # if allowed_actions = selected

# After the role exists (AUTHORIZATION for the creation; these reads are read-only)
aws iam get-role --role-name reporting-tool-dev-github-ci --query 'Role.AssumeRolePolicyDocument'
aws iam simulate-principal-policy \
  --policy-source-arn arn:aws:iam::<AWS_ACCOUNT_ID>:role/reporting-tool-dev-github-ci \
  --action-names secretsmanager:GetSecretValue \
  --resource-arns <BACKEND_RUNTIME_SECRET_ARN> <FRONTEND_CONFIG_SECRET_ARN> \
  --query 'EvaluationResults[].{resource: EvalResourceName, decision: EvalDecision}'
# expected: backend implicitDeny, frontend allowed

# After the Environment exists
gh api repos/AllianceBioversityCIAT/onecgiar_pr/environments/reporting-tool-dev-ci \
  --jq '{protection: .protection_rules, branch_policy: .deployment_branch_policy}'
gh api repos/AllianceBioversityCIAT/onecgiar_pr/environments/reporting-tool-dev-ci/variables --jq '.variables[].name'
```

Creation commands (AUTHORIZATION REQUIRED; policy files from §5.3 and §6 with the local values):

```bash
aws iam create-role --role-name reporting-tool-dev-github-ci \
  --assume-role-policy-document file://trust-policy.json --max-session-duration 3600 \
  --description "Reporting Tool DEV CI (GitHub OIDC): frontend configuration read and ECR push" \
  --tags Key=Project,Value=ONECGIAR-CICD-Platform Key=Application,Value=reporting-tool Key=Stage,Value=dev
aws iam put-role-policy --role-name reporting-tool-dev-github-ci \
  --policy-name reporting-tool-dev-ci-minimum --policy-document file://permissions-policy.json
# Retention option A, only after a preview (both repositories):
aws ecr start-lifecycle-policy-preview --region us-east-1 --repository-name prms-reportingtool-server-dev \
  --lifecycle-policy-text file://lifecycle-option-a.json
aws ecr get-lifecycle-policy-preview --region us-east-1 --repository-name prms-reportingtool-server-dev
aws ecr put-lifecycle-policy --region us-east-1 --repository-name prms-reportingtool-server-dev \
  --lifecycle-policy-text file://lifecycle-option-a.json
```

## 10. Order

| Step | Action | State |
|---|---|---|
| 1 | Retention: accepted as is (§8.2); nothing to do | Decided |
| 2 | Read the Actions policy (G3) | **Done**: all actions allowed |
| 3 | Create the role (option 2, §14) and read it back; simulate | **Done** (Phase 1, 2026-10-09) |
| 4 | Create `reporting-tool-dev-ci` (§4) with its six variables; read it back | **Done** (Phase 2, §15) |
| 5 | Commit (deploy script mode 100755) and push: first CI run | AUTHORIZATION REQUIRED |
| 6 | Check the run: mandatory jobs green, two digests in the summary, two `gha-` images, no deploy request, Jenkins images still present | Read-only |

## 11. Checklist before the first push

- [x] Retention: shared with Jenkins, accepted risk (§8.2). After each CI run, check that the image Jenkins runs is still present if it may need a re-pull.
- [ ] Actions policy allows the pinned actions and the platform's reusable workflow.
- [ ] Role created with exactly §5.3 and §6; simulation: backend secret denied, frontend secret allowed.
- [ ] `reporting-tool-dev-ci`: no reviewers, feature branch only, six variables, no secrets.
- [ ] `git status`: only the intended files; `environment*.ts` absent (git-ignored).
- [ ] After the first green run (recommended negative tests, one at a time): a run from another branch is
  stopped by the Environment rule; a job of another Environment cannot assume the role.

## 12. Risks and pending items

| # | Item | State |
|---|---|---|
| R1 | ECR retention counts `gha-` and Jenkins images together (3 per repository) | **ACCEPTED RISK** (§8.2): three CI pushes with no Jenkins build in between expire the Jenkins images; CI images can expire within hours, so a later manual deploy must use a digest still present |
| R10 | No restriction by workflow file (option 2): any workflow on the feature branch that uses Environment `reporting-tool-dev-ci` can assume the role | **ACCEPTED RESIDUAL RISK** (§14.4) |
| R11 | A `workflow_dispatch` run needs the workflow file on the default branch (`master`); until then only push-triggered CI runs exist, so the manual deploy path of this workflow is not usable yet | CD phase |
| R2 | `job_workflow_ref` value for a top-level workflow | PENDING observation; fails closed |
| R3 | The OIDC provider belongs to the platform stack `cicd-poc-dev`: deleting that stack deletes it and breaks this role and every other GitHub OIDC role of the account | RECOMMENDED: never delete the stack without first retaining or moving the provider |
| R4 | Per-condition negative tests | PENDING (§11) |
| R5 | Actions policy of the repository | **VERIFIED**: all actions allowed (no change needed) |
| R6 | ShellCheck never run (not installed locally); a warning blocks publishing | First run |
| R7 | Backend tests without the DEV runtime configuration | Static review says none needed; first run confirms |
| R8 | Node 20 runtime out of upstream support | Kept for compatibility |
| R9 | Source maps in the DEV frontend image expose the configuration as the bundle does | Pre-existing (Jenkins) |

## 13. CD configuration for a later phase (not part of the first push)

| Item | What is needed |
|---|---|
| GitHub Environment `reporting-tool-dev` | Required reviewers, branch rule, variables `CICD_BOUND_REF`, `CICD_ROLE_ARN`, `CICD_AWS_REGION`, `CICD_ECR_REPOSITORY`, `CICD_DEPLOY_QUEUE_NAME` |
| Platform CI role (stack `cicd-poc-dev`) | Today bound to the platform repository, Environment `cicd-poc-dev`, ref `refs/heads/b2-session-probe` and the reusable workflow at `7f148ce` (VERIFIED). For this repository: `GitHubRepositoryId=520556977`, `GitHubRepositoryOwnerId=73232739`, `GitHubEnvironment=reporting-tool-dev`, `GitHubOidcSub=repo:AllianceBioversityCIAT/onecgiar_pr:environment:reporting-tool-dev`, `GitHubBoundRef`, `PinnedWorkflowSha=3893a882ed8c687b78d4b509252ef55352a87c07`; the stack trusts one repository, so this replaces the probe binding |
| Target record `reporting-tool-dev` | Platform runbook 09: `scriptArguments: standard`, `deployWindowPolicy: required`, `sourceRepositoryId=520556977`, script path, host, user, pinned host key, `credentialRef` |
| Executor SSH credential | Secret under the platform prefix; public key for the deploy user on the server |
| Server | Script (root, 0755) and `/etc/cicd/targets/reporting-tool-dev.conf` (root, 0644, `aws-credentials=default-chain`); bash ≥ 4.4, docker, aws CLI, curl, flock |
| Backend health check | **Blocker**: no path confirmed |
| Jenkins | Disable the DEV deploy trigger during the deploy window |
| Retention | Option A keeps the last 10 CI images; a manual deploy must use a digest that is still retained |

## 14. Phase 1 result (AWS IAM, 2026-10-09)

Executed by `arn:aws:iam::<AWS_ACCOUNT_ID>:user/cristian.gamboa` in the expected account, region `us-east-1`.

### 14.1 Role

| Item | Value |
|---|---|
| ARN | `arn:aws:iam::<AWS_ACCOUNT_ID>:role/reporting-tool-dev-github-ci` (exact value in the owner's local values file) |
| Created | 2026-10-09T18:45:25Z |
| Path / maximum session | `/` / 3600 s |
| Tags | `Project=ONECGIAR-CICD-Platform`, `Application=reporting-tool`, `Stage=dev` |
| Inline policy | `reporting-tool-dev-ci-minimum` (only one) |
| Managed policies / instance profiles / permissions boundary | None / none / none |

### 14.2 Applied trust policy (read back, identical to the approved file)

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ReportingToolDevCiFromGitHubOidc",
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::<AWS_ACCOUNT_ID>:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
          "token.actions.githubusercontent.com:sub": "repo:AllianceBioversityCIAT/onecgiar_pr:environment:reporting-tool-dev-ci",
          "token.actions.githubusercontent.com:repository_id": "520556977",
          "token.actions.githubusercontent.com:repository_owner_id": "73232739",
          "token.actions.githubusercontent.com:environment": "reporting-tool-dev-ci",
          "token.actions.githubusercontent.com:ref": "refs/heads/feature/reporting-dev-github-actions-cicd"
        }
      }
    }
  ]
}
```

Pre-creation validation: IAM Access Analyzer `validate-policy` (role trust document): no error, no warning;
one generic suggestion about the `aud` claim (no set qualifier is used). Permissions policy: no finding.

### 14.3 Applied permissions policy

Exactly §6 (read back, identical): `secretsmanager:GetSecretValue` on the frontend DEV secret ARN only;
`ecr:GetAuthorizationToken`; the five push actions on the two repositories only. No `kms:Decrypt`.

### 14.4 Verification results

**Permissions (IAM policy simulation; 26 cases, all as expected):**

| Expected | Action and resource |
|---|---|
| allowed | `secretsmanager:GetSecretValue` frontend DEV secret; `ecr:GetAuthorizationToken`; `ecr:PutImage` on both repositories; `ecr:InitiateLayerUpload` (server); `ecr:CompleteLayerUpload` (client) |
| implicitDeny | `GetSecretValue` on the backend runtime secret and on another secret; `PutSecretValue` on the frontend secret; `ListSecrets`; `kms:Decrypt`; `ecr:PutImage` on another repository; `BatchGetImage` (pull); `BatchDeleteImage`; `PutLifecyclePolicy`; `PutImageTagMutability`; `CreateRepository`; `DeleteRepository`; `sqs:SendMessage` (deploy queue); `dynamodb:PutItem` (registry); `ec2:RunInstances`; `ssm:SendCommand`; `iam:CreateRole`; `iam:PassRole`; `sts:AssumeRole`; `cloudformation:UpdateStack` |

The simulation validates the permissions only. **It does not validate the OIDC authentication**: no
`AssumeRoleWithWebIdentity` was executed and no workflow ran.

**OIDC conditions still to be proven by real runs:**

| Condition | State |
|---|---|
| All six | Values VERIFIED (§5.2); the role has not been assumed yet: the first CI run is the first positive test |
| Per-condition negatives | PENDING (§11): another branch, another Environment, a job without Environment must be denied |
| Workflow file binding | **Not included** (option 2). Residual risk R10: any workflow file on the feature branch that uses Environment `reporting-tool-dev-ci` could assume the role and then read the frontend configuration and push to the two repositories. Mitigations in place: only people who can push to that branch can add such a workflow; the Environment admits that branch only; the role cannot read other secrets, pull, delete or deploy. RECOMMENDED: when CI leaves the feature branch, reconsider adding `job_workflow_ref` after observing the claim in a run |

**Unchanged (read back after the creation):** OIDC provider (audience `sts.amazonaws.com`); both ECR
repositories (lifecycle keep-3, `MUTABLE`, same image count); frontend secret (same last-changed date); the
platform's CI role trust; Jenkins; GitHub.

### 14.5 Next (Phase 2, not authorized)

Create the GitHub Environment `reporting-tool-dev-ci` (§4) with the six variables of §3
(`RT_BUILD_ROLE_ARN` = the role above), read it back, then commit and push for the first CI run.

## 15. Phase 2 result (GitHub, 2026-10-09)

Executed with GitHub CLI as `Cristian45` (repository `admin: true`; token scopes `repo`, `workflow`, `read:org`, `gist`).

### 15.1 Pre-checks

| Check | Result |
|---|---|
| Authentication | Active account `Cristian45` (keyring) |
| Admin permission on `AllianceBioversityCIAT/onecgiar_pr` | `true` |
| `reporting-tool-dev-ci` before the change | Did not exist (HTTP 404); only Environment `copilot` existed |
| Variable names | The workflow reads exactly the six variables below |
| IAM role | `arn:aws:iam::<AWS_ACCOUNT_ID>:role/reporting-tool-dev-github-ci` exists (Phase 1) |

### 15.2 Applied configuration

| Setting | Value |
|---|---|
| Environment | `reporting-tool-dev-ci` |
| Required reviewers | None |
| Wait timer | None |
| Deployment branches | Custom policies only (`protected_branches: false`), one rule: branch `feature/reporting-dev-github-actions-cicd` |
| Administrators bypass | Disabled (`can_admins_bypass: false`) |
| Environment secrets | None (0) |
| Variables | `CICD_BOUND_REF` = `refs/heads/feature/reporting-dev-github-actions-cicd`; `RT_BUILD_ROLE_ARN` = the role of §14; `RT_AWS_REGION` = `us-east-1`; `RT_ECR_BACKEND_REPOSITORY` = `prms-reportingtool-server-dev`; `RT_ECR_FRONTEND_REPOSITORY` = `prms-reportingtool-client-dev`; `RT_FRONTEND_CONFIG_SECRET_ID` = `<FRONTEND_CONFIG_SECRET_NAME>` (identifier only, never the value) |

### 15.3 Verification (GitHub API, read back)

| Check | Result |
|---|---|
| Environment exists | Yes |
| Exactly six variables with the approved values | Yes (exact match) |
| Variable names equal the names the workflow reads | Yes |
| Branch rule | One policy: `feature/reporting-dev-github-actions-cicd` (type `branch`) |
| Reviewers / wait timer | None / none (the only protection rule is `branch_policy`) |
| Environment secrets | 0 |
| Other Environments | `copilot` unchanged (last update 2025-07-03); the CD Environment `reporting-tool-dev` does not exist yet and was not created |
| Repository Actions policy | Enabled, all actions allowed |
| Repository-level secrets | 16 pre-existing (Jenkins trigger, security scan, …), untouched; this workflow reads no `secrets.` |

Static (unchanged workflow): a push to the feature branch runs the CI jobs and `publish-images`; `deploy-request`
runs only for `workflow_dispatch` with `request-deploy: true`, so a push never requests a deploy.

### 15.4 Before the first push (not authorized yet)

- [ ] Commit the CI files on `feature/reporting-dev-github-actions-cicd` (deploy script with mode 100755; `environment*.ts` stay git-ignored) and push.
- [ ] Watch the first run: OIDC assumption (first positive test of the six trust conditions), mandatory jobs, ShellCheck, backend tests without runtime configuration, two `gha-` digests, no deploy request.
- [ ] After the run: the Jenkins images are still present in both repositories (shared retention, §8.2).
- [ ] Then the per-condition negative tests (§11).

## 16. Change after the pre-push review (2026-10-09): M1 and M2

| Item | Change | Verified |
|---|---|---|
| M1 | `RT_BUILD_ROLE_ARN` and `RT_FRONTEND_CONFIG_SECRET_ID` moved from Environment variables to **Environment secrets** of `reporting-tool-dev-ci` (values copied by pipe from the variables, never printed; lengths matched); workflow references changed from `vars.` to `secrets.` (7); the two variables deleted only after the secrets and the workflow were confirmed | Environment read back: variables `CICD_BOUND_REF`, `RT_AWS_REGION`, `RT_ECR_BACKEND_REPOSITORY`, `RT_ECR_FRONTEND_REPOSITORY`; secrets `RT_BUILD_ROLE_ARN`, `RT_FRONTEND_CONFIG_SECRET_ID` (values cannot be read back through the API, by design); branch rule and `can_admins_bypass: false` unchanged; no other Environment touched |
| M2 | `npm ci` now runs **before** the OIDC and configuration steps in `frontend-checks` and `frontend-spec-typecheck`; the backend image is built **before** the configuration is written in `publish-images` | Static check of the step order; cleanup still `if: always()` after the last consumer |

Final Environment `reporting-tool-dev-ci`: no reviewers, no wait timer, deployment branch
`feature/reporting-dev-github-actions-cicd` only, administrators bypass disabled, **4 variables, 2 secrets**.
The IAM role and its permissions were not changed.
