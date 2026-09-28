# Spec Family — Progress Tracker Pull Bridge

## 1. Document Control

| Field | Value |
|---|---|
| **Parent spec path** | `docs/specs/changes/progress-tracker-pull-bridge/` |
| **Date created** | 2026-09-22 |
| **Last updated** | 2026-09-22 |
| **Spec-family status** | open |
| **Source proposal** | `docs/specs/changes/progress-tracker-pull-bridge/proposal.md` (Type: Change, Approval Mode: gated) |
| **Primary requirement source** | Jose Berenguer (Technical Lead – AI, CGIAR System Organization), *"PRMS ⇄ Progress Tracker — the pull bridge"*, v1.0 draft, 15 Sep 2026 — `source/PRMS-ProgressTracker-Pull-Bridge-Guide-2026-09-15.docx` / `.txt`. Cited as **Guide §N** |
| **Approved approach** | **Option B** — mirror `cgspace-discovery`, PRMS-owned mapping table, `lab-report-form` only, description in the ToC narrative, queryable provenance |
| **Base branch** | `origin/performance-refactor` (worktree branch `JuankCadavid/progress-tracker-pull-bridge`) |

## 2. Child specs (closed set)

| # | Spec Path | Depends on | Parallel-safe | Status |
|---|---|---|---|---|
| 1 | `changes/progress-tracker-pull-bridge/progress-tracker-indicator-mapping` | none | yes | **active** — specify approved 2026-09-22 (depth Full); **`/akili-execute` in progress** |
| 2 | `changes/progress-tracker-pull-bridge/progress-tracker-results-browse` | none | yes | **active** — **specify approved 2026-09-22** (depth Full); execute **held** until child 1's PR1 (schema + config) is green |

**Why both read `Depends on: none`.** Child 2 is written against the **PRMS/Integration indicator id**, never the Progress Tracker's own `indicator_id` — the mapping is resolved entirely server-side (parent proposal P9, recommendation 2). That fixes the client-facing contract in child 1's route signature before either child starts, so the two build and unit-test concurrently in separate worktrees.

⚠️ **The one thing that is not parallel:** end-to-end verification. Parent `SC-1` (the TEST walkthrough) and `SC-3` (no direct browser call to the Progress Tracker upstream host — narrowed 2026-09-22 from "an `execute-api` host") live in **child 2** and cannot be run until child 1 is `done` and deployed to TEST. Child 2 may reach `done` on its own unit + CT gates; the HITL walkthrough is a family-level gate recorded here, not a child-level one.

## 3. Child scope boundaries

The seam is **server + schema** vs **client**, not the S-numbering of the parent proposal §5. One deviation from the parent's §6 sketch is recorded in §5 below.

### Child 1 — `progress-tracker-indicator-mapping` (server + schema)

| Parent item | Deliverable |
|---|---|
| S1 | Server module `src/api/progress-tracker/` mirroring `cgspace-discovery`; registered in `modules.routes.ts` + `app.module.ts` |
| S2 | `GET /api/progress-tracker/indicators/:tocIndicatorId/results` and `GET /api/progress-tracker/programs/:programId/ready-counts`, addressed by the **PRMS** indicator id |
| S3 | `PT_INTEROP_BASE_URL`, `PT_INTEROP_API_KEY` — server-only, in `serverless.yaml` beside the three discovery URLs and in the container env |
| S4 | PRMS-owned mapping table (ToC indicator + reporting phase → PT `indicator_id`, `match`, `score`, `resolved_at`) + the `/resolve` fill routine |
| **S9a** | Provenance **schema and server persistence**: the create path accepts and stores `result_key`, `evidence_fingerprint`, PT environment, model and generation timestamp |
| S10a | Server Jest: status classification, leak-free failure contract, timeout, DTO whitelist, fill routine |

Carries **all** migrations in this family.

### Child 2 — `progress-tracker-results-browse` (client only)

| Parent item | Deliverable |
|---|---|
| S5 | `GET_progressTrackerResults`, `GET_progressTrackerReadyCounts` in `results-api.service.ts` |
| S6 | Standalone `pt-results-browse`, sibling to `kp-cgspace-browse`; six states |
| S7 | `lab-report-form` hunks — source switcher lifted out of `currentResultIsKnowledgeProduct()`, third tab for KP indicators, `onPtResultSelected` mapping |
| S8 | `create-result-payload.util.ts` stops hardcoding `toc_progressive_narrative: ''` |
| **S9b** | The client sends the provenance fields child 1 made storable |
| S10b | Client Jest (six states + mapping) and one Cypress CT for the tab layout in the aside |

Carries **no** migration and **no** server change.

## 4. Locked decisions (inherited by both children)

Settled at proposal approval, 2026-09-22. A child spec may not re-open these; it cites them.

| Ref | Question | Decision |
|---|---|---|
| **OQ-1** | How is the PT `indicator_id` obtained, and where does it live? | `GET /api/prms/indicators/resolve`, stored in a **PRMS-owned mapping table**. Not a locally computed MD5 (≈16 PORB rows collide — Guide §5); not a column on the ToC row (`toc_results_indicators` lives in `env.DB_TOC`, parent P8) |
| **OQ-2** | Where does the draft description land? | **ToC progressive narrative now**, with the provenance tail. The visible "Description of Result" box is **deferred** — it needs a `CreateResultDto` change shared by every create surface (parent P7) and a P&R decision (Guide A4 / J1) |
| **OQ-3** | Environment mapping | **PRMS TEST → PT staging; PRMS PROD → PT production.** Defaulted now; confirm with Jose (Guide A7) before PROD |
| **OQ-4** | Editing or pending review on import? | **Editing** — PRMS's own Create action owns the lifecycle (Guide §2, `docs/trd/trd.md` §5 W1). Not re-decided per child |
| **OQ-5** | Send `X-Actor-Email`? | **No** by default (Guide A8). Revisit only if the data-protection owner asks for attributable audit rows |
| **OQ-9** | Split the spec? | **Yes** — this family |

## 5. Open gates

| Gate | Owner | Blocks | State |
|---|---|---|---|
| **OQ-8 — request budget** | PRMS (measured 2026-09-22, AWS profile `IBD-DEV`, account `569113802249`, user `Prms-test`) | — | ✅ **CLOSED for staging.** See §5.1. **PROD remains open** (see the PROD row below) |
| **PROD request budget** | PRMS infra | A PROD switch, nothing before it | **OPEN.** No PROD Lambda was found in the account (`prstaging-prod-main` / `prtesting-prod-main` missing), so the PROD timeout is **UNVERIFIED** and the primary production runtime is still the open item at `docs/infrastructure.md:82` (parent P11). **Do not claim a PROD budget** |
| **D1 — egress** | PRMS infra | Child 1's TEST verification | **OPEN.** Egress from the PRMS TEST VPC/Lambda to the PT staging host in `eu-central-1` is not verifiable from a laptop curl — the 2026-09-22 measurements were taken from outside the VPC |
| **D2 — `X-API-Key`** | Jose (Guide §8.2 P1) | Nothing today (endpoints are open); PROD later | Not issued. Child 1 sends the header when the key is set |
| **D4 — QA programs** | PRMS team + Jose (Guide §8.1 A9) | Family-level `SC-1` | Two or three real programs with evidence on TEST — not scheduled |
| **D5 — operating-model sign-off** | Jose, Héctor, Ángel with Nicoleta Trifa and Julien Colomer (Guide §8.3 J1) | **PROD only, not TEST** | Open |
| **P3 — re-resolution ownership** | Jose with PRMS team (Guide §8.2 P3) | Child 1's fill routine needs a named trigger, not a convention | Open |

### 5.1 OQ-8 — measured request budget (staging, 2026-09-22)

Measured with AWS profile `IBD-DEV` (account `569113802249`, user `Prms-test`) and live curls against PT Interop. These figures are **verified**, not supplier-reported — they supersede the `UNVERIFIED` markers on parent `P10` and `P12` **for staging only**.

**PRMS side**

| Fact | Value |
|---|---|
| Lambda `prstaging-dev-main` timeout | **30 s** (memory 1024 MB, LastModified 2026-02-06) |
| API Gateway REST `dev-prtesting` (`dlhmzxl1zc`), resource `/{any+}` | **`timeoutInMillis = 29000`** |
| Effective ceiling for one PRMS request | **29 s** (API Gateway binds before the Lambda) |
| `serverless.yaml` | Still declares **no `timeout:`** — **drift against the deployed 30 s.** A deploy from the repo as it stands would fall back to the Serverless default (6 s) and break the feature |

**PT Interop latency** — KPI `8006329bfd49` (13 evidence items, the Guide's own sample), staging base `https://seyxtu7vha.execute-api.eu-central-1.amazonaws.com/staging`

| Call | Wall time | Result |
|---|---|---|
| `mode=auto`, cold | **20.2 s** | 200 · `generated_by.mode=ai`, `duration_ms=13657`, 3 results, cache miss |
| `refresh=true` | **16.5 s** | 200 · AI, 3 results |
| cached | **1.1 s** | 200 · cache hit |
| `mode=template` | **1.4 s** | 200 · 1 placeholder |
| `resolve` (dev) | **1.3 s** | 200 · `match=fuzzy` → correct id |
| `ready-counts` (dev) | **0.9 s** | 200 · 95 indicators with evidence |

**What this settles**

1. **The budget works.** A ~20.2 s cold draft fits inside the 29 s ceiling with **≈9 s headroom**. The feature is viable synchronously on staging.
2. **`serverless.yaml` must declare the timeout explicitly** — `timeout: 30` to match the deployed function (the API Gateway 29 s still binds first). This is now a **required deliverable**, not a contingency.
3. **The Guide's latency figures are confirmed**, with two corrections worth designing against: a cache hit is **1.1 s, not 0.21 s**, and `mode=template` is **1.4 s, not instant**. Template-first is still the right UX, but it costs a real round trip — it is not free.
4. 🛑 **DEV has drifted from the contract.** For this KPI, `…/dev` now returns **422** on both `mode=template` and `refresh=true` ("Saved on-ramp groups…"); staging still matches the Guide. **PRMS TEST must target PT staging**, which independently confirms locked decision OQ-3. Child 1 must treat a `422` as a classified failure, not a crash.
5. **Infra name drift (informational).** The API Gateway integration URI still references `prtesting-dev-main`, a function that no longer exists; the live function is `prstaging-dev-main`. This does not change the 30 s budget, but it is worth handing to infra.

## 6. PRMS-specific ordering hints

- **Child 1 carries every migration in this family; child 2 carries none.** This is why both read `Parallel-safe: yes` without breaking the rule that two migration-bearing children are never parallel-safe — and it is why the provenance work was split **S9a (schema + server) into child 1 / S9b (client sends it) into child 2**, a deliberate deviation from the parent proposal §6 sketch, which had all of S9 in child 2. Recorded in §7.
- Neither child touches a `/api/bilateral/*` or `/api/platform-report/*` payload, so `onecgiar-pr-server/docs/bilateral-result-summaries.en.md` is untouched.
- Child 2 touches `lab-report-form`, whose `CLAUDE.md` records that **Card 2 and Card 3 share an asymmetric `@if` chain** — breaking it orphans the `@else` and deletes the create footer in emerging mode. That trap is a requirement of child 2, not a nicety (parent R2).
- Child 1 must adopt the `KPM-R-8` leak-free `SourceFailure` contract verbatim (`cgspace-discovery.service.ts:48-60`): primitives only, the caught error never leaves the catch block. No base URL, host, key or upstream body in any response or log line (`.cursorrules`, parent R5).
- Scope held at **one host** (`lab-report-form`). The AoW/HLO modal and the legacy result-creator form (parent P3) are follow-ups, not children of this family.

## 7. Change log

| Date | Change | Approved by |
|---|---|---|
| 2026-09-22 | Family created from `proposal.md`; Option B approved, split approved, OQ-1/2/3/4/5/9 locked in §4, OQ-8 left open in §5 | Juan Carlos Cadavid |
| 2026-09-22 | Provenance split **S9a → child 1 / S9b → child 2** (parent §6 had all of S9 in child 2) so that exactly one child carries migrations and both stay `Parallel-safe: yes` — see §6 | **CONFIRMED** — Juan Carlos Cadavid |
| 2026-09-22 | Both child proposals **approved**; child 1 moved to `active` for `/akili-specify`, child 2 held at `pending` (specify order locked: child 1 first, review, then child 2) | Juan Carlos Cadavid |
| 2026-09-22 | Child 2 **specify approved** (depth Full). Child 1 execute authorized and started; child 2 execute **held** until child 1 PR1 is green | Juan Carlos Cadavid |
| 2026-09-22 | Child 1 **specify approved** (requirements + design + tasks), depth escalated Standard → Full, premise `P-5` confirmed verified with its AWS citation; execute **not** authorized yet. Child 2 specify started | Juan Carlos Cadavid |
| 2026-09-22 | **OQ-8 closed for staging** with measured figures (§5.1): APIGW 29 s / Lambda 30 s, cold draft 20.2 s, ≈9 s headroom. `serverless.yaml` `timeout: 30` becomes a required deliverable of child 1. PROD budget and D1 egress stay open; DEV 422 drift recorded | Juan Carlos Cadavid |
