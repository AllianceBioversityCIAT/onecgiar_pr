# Proposal — Progress Tracker Indicator Mapping and Read Proxy (child 1 of 2)

## 1. Document Control

| Field | Value |
|---|---|
| **Spec path** | `docs/specs/changes/progress-tracker-pull-bridge/progress-tracker-indicator-mapping` |
| **Slug** | `progress-tracker-indicator-mapping` |
| **Parent Spec** | `docs/specs/changes/progress-tracker-pull-bridge` (manifest: `family.md`, child #1) |
| **Type** | Change |
| **Approval Mode** | gated (default) |
| **Date** | 2026-09-22 |
| **Requester** | Juan Carlos Cadavid (PRMS) |
| **Depends on** | none |
| **Parallel-safe** | yes — carries every migration in the family; sibling child 2 carries none |
| **Modules** | server `src/api/progress-tracker/` (new) · server `api/results-framework-reporting` (create path, provenance) · one PRMS-owned migration · `serverless.yaml` |
| **Primary requirement source** | Jose Berenguer, *"PRMS ⇄ Progress Tracker — the pull bridge"*, v1.0 draft, 15 Sep 2026 — `../source/PRMS-ProgressTracker-Pull-Bridge-Guide-2026-09-15.docx` / `.txt`. Cited as **Guide §N** |
| **Parent evidence** | Claims `P1`–`P12` are established and cited in `../proposal.md` §3; this child cites them by id rather than re-deriving them |
| **Baseline docs** | `docs/trd/trd.md` §5 W9 (the pattern mirrored), §7 (Integration Points), §8 (Security) · `docs/infrastructure.md` §6 · `.cursorrules` |

---

## 2. Intent

Build the **server half** of the pull bridge: a read-only proxy module to the Progress Tracker Interoperability API, the two environment keys it reads, the PRMS-owned table that maps a PRMS ToC indicator to the Progress Tracker's `indicator_id`, and the storage that makes a pulled result's provenance queryable.

After this child, `GET /api/progress-tracker/indicators/:tocIndicatorId/results` answers correctly for a mapped KPI and degrades cleanly for an unmapped one — with no client work yet. Sibling child 2 consumes that contract.

---

## 3. Problem / Current Behavior

| # | Claim | Evidence |
|---|---|---|
| C1 | No `progress-tracker` route exists. | Parent `P5` — `grep -c "progress-tracker" onecgiar-pr-server/src/api/modules.routes.ts` → `0` |
| C2 | The proxy idiom to mirror exists and is hardened: env-read base URL, per-call timeout, and a `SourceFailure` contract made only of primitives so no upstream host, URL or body reaches a response or a log line. | Parent `P4` — `cgspace-discovery.service.ts:48-60`, `:98`, `:366`; `repositories.config.ts:52,70,92,113` |
| C3 | 🛑 The ToC indicator catalogue is **not** a PRMS table — it is read cross-schema from `env.DB_TOC`, and `docs/trd/trd.md` §7 states PRMS attaches results to ToC but never authors it. A migration cannot add a column there. | Parent `P8` — `aow-bilateral.repository.ts:777-788` |
| C4 | PRMS already resolves the ToC node id server-side: the create command takes the Integration primary key `indicator_id`, looks the row up, and stores `indicatorRow.related_node_id`. | Parent `P9` — `framework-result-toc-indicators.service.ts:52-81` |
| C5 | 🛑 **`serverless.yaml` declares no `timeout:`, and that is drift against the deployed function.** The deployed staging Lambda `prstaging-dev-main` has a **30 s** timeout (1024 MB, LastModified 2026-02-06); API Gateway REST `dev-prtesting` (`dlhmzxl1zc`) resource `/{any+}` has **`timeoutInMillis = 29000`**, so **29 s is the effective ceiling**. A deploy from the repo as it stands would fall back to the Serverless default of 6 s and break the feature. | Parent `P10` (full file read) + **measured 2026-09-22**, AWS profile `IBD-DEV`, account `569113802249`, user `Prms-test` — `family.md` §5.1 |
| C6 | Staging is measured; **production is not.** No PROD Lambda exists in that account (`prstaging-prod-main` / `prtesting-prod-main` missing), and which runtime is primary in production is still an open item in our own infrastructure baseline. | Parent `P11` — `docs/infrastructure.md:14,28,82`; `family.md` §5 "PROD request budget" row. **PROD budget UNVERIFIED** |
| C7 | The create path stores no provenance of any kind for an externally sourced result. | Parent `P6`/`P7` — `create-results-framework.dto.ts:145-150` carries only `toc_progressive_narrative`; `create-result.dto.ts:3-45` has no provenance or description field |
| C8 | The upstream API is live on dev and staging, flag-off in production; `/resolve` returns `exact` / `fuzzy` / `none` with a candidate list, and ≈16 PORB rows collide on the five hashed fields so a locally computed MD5 can point at the wrong sibling. | Guide §3, §4.2, §5. `/resolve` **confirmed on dev 2026-09-22**: 200 in 1.3 s, `match=fuzzy` → correct id |
| C9 | **The Guide's latency figures are confirmed on staging**, with two corrections: a cache hit is **1.1 s** (not 0.21 s) and `mode=template` is **1.4 s** (not instant). Cold `mode=auto` is **20.2 s**, `refresh=true` **16.5 s**, `ready-counts` **0.9 s**. | Measured 2026-09-22 against `https://seyxtu7vha.execute-api.eu-central-1.amazonaws.com/staging`, KPI `8006329bfd49` — `family.md` §5.1 |
| C10 | 🛑 **DEV has drifted from the published contract.** For that same KPI, `…/dev` now returns **422** on both `mode=template` and `refresh=true` ("Saved on-ramp groups…"); staging still matches the Guide. | Measured 2026-09-22 — `family.md` §5.1. Independently confirms locked decision OQ-3 (PRMS TEST → PT staging) |

---

## 4. Proposed Outcome

- A PRMS route answers "what can the Progress Tracker propose for this PRMS indicator?" without the browser ever learning a Progress Tracker id, a base URL or an API key.
- A PRMS-owned table records, per ToC indicator and reporting phase, the Progress Tracker `indicator_id` together with the match quality that produced it — so a wrong or stale mapping is visible and auditable rather than silent.
- An unmapped or unknown KPI answers `not_found`, never an error: the client can always fall back to manual entry.
- A result created from a proposal can carry `result_key` and `evidence_fingerprint` in a form that a duplicate rule can query.

---

## 5. Scope

| # | Deliverable | Notes |
|---|---|---|
| M1 | **Server module `src/api/progress-tracker/`** — module, controller, service, whitelisted query DTOs; registered in `modules.routes.ts` and `app.module.ts`; `HttpModule` only; inherits the JWT middleware and throttler like every `/api` route | Guide §7 item 1 |
| M2 | **`GET /api/progress-tracker/indicators/:tocIndicatorId/results`** — path parameter is the **PRMS/Integration** indicator id (C4). Whitelisted query: `max_results` (1..10), `refresh`, `mode`. Classified status `ok` / `not_found` / `unavailable` | Guide §4.1 |
| M3 | **`GET /api/progress-tracker/programs/:programId/ready-counts`** — proxy only; no badge is built in this family | Guide §4.3; parent S-out-2 |
| M4 | **Env keys `PT_INTEROP_BASE_URL`, `PT_INTEROP_API_KEY`** — server-only, added to `serverless.yaml` beside `CGSPACE_DISCOVERY_URL` / `MELSPACE_DISCOVERY_URL` / `WORLDFISH_DISCOVERY_URL`, and to the container env. `X-API-Key` sent only when the key is set. `PT_INTEROP_BASE_URL` points at **PT staging**, not dev (C10) | Guide §7 items 2–3 |
| **M4b** | **Declare `timeout: 30` in `serverless.yaml`** — closes the drift in C5 so a deploy cannot silently fall back to 6 s. Required, not contingent. The API Gateway 29 s still binds first; the server-side HTTP call timeout is set strictly under it (see §11.4) | C5; `family.md` §5.1 |
| M5 | **PRMS-owned mapping table** — one migration. Per ToC indicator + reporting phase: PT `indicator_id`, `match` (`exact` / `fuzzy` / `none`), `score`, `resolved_at`. Exact key and table name are a `/akili-specify` design decision; the constraint is that it lives in the PRMS schema, never in `env.DB_TOC` (C3) | Guide §5, rewritten for C3 |
| M6 | **`/resolve` fill routine** — server-side, one call per indicator row per reporting year, sending the PORB texts PRMS already holds (program, AoW as `AOW0N: <name>`, Center label, HLO title, description). `match: none` is recorded as unmapped, **never** auto-accepted as a guess | Guide §4.2, §5; parent R4 |
| M7 | **Provenance storage (S9a)** — the create path accepts and stores `result_key`, `evidence_fingerprint`, PT environment, model and generation timestamp for a result created from a proposal. Queryable, not parsed out of narrative text | Guide §7 item 11; parent S9 |
| M8 | **Leak-free failure contract** — the `KPM-R-8` `SourceFailure` shape adopted verbatim: primitives only, the caught error never leaves the catch block | C2; `.cursorrules` |
| M9 | **Server Jest** — status classification, leak-free failures, timeout behavior, DTO whitelist rejection, fill-routine mapping and `none` handling. Gates per root `CLAUDE.md` (branches 5% / functions 20% / lines 35% / statements 40%) and `npm run migration:check:ci` clean | — |

### Out of scope for this child

| Out | Where it lives |
|---|---|
| Every client artifact — API service methods, `pt-results-browse`, `lab-report-form` hunks, payload util | Sibling child 2 |
| The ready-counts **badge** | Parent S-out-2, follow-up |
| Greying out already-used proposals | Parent S-out-3 — needs M7 landed plus real TEST data |
| Turning on the PT production flag; issuing the `X-API-Key` | Jose (Guide §8.2 P1, P2) |
| Any change to ToC Integration data | Forbidden by `docs/trd/trd.md` §7 — the reason M5 exists |

---

## 6. Non-Goals

Inherited from the parent `N1`–`N8` and not restated: no push/ingestion work, no bilaterals or Centers, no PT production flag, no API-key issuance, no hosted PRMS copy, no MQAP/KP entity change, no duplicate engine, no ToC authoring.

---

## 7. Affected Users, Systems, And Specs

| Actor / system | Effect |
|---|---|
| **End users** | **None visible.** This child ships no UI; the route exists but nothing calls it until child 2 |
| **PRMS server** | One new module; one new outbound integration (`docs/trd/trd.md` §7 gains a row; §5 gains a W11 sibling to W9) |
| **PRMS database** | One migration: the mapping table and the provenance storage. Both PRMS-owned |
| **Deployment** | `serverless.yaml` gains two env keys, and — once OQ-8 lands — an explicit `timeout:` |
| **ToC Integration DB** | Read-only, unchanged |
| **Related specs** | `docs/specs/archive/2026-08-27-changes--kp-cgspace-browse` and `.../2026-09-14-changes--kp-multi-repository-browse` — source of the proxy idiom and of `KPM-R-8` |

---

## 8. Visual Reference

- **Source:** None — this child is server-only.
- **Location:** n/a.
- **Notes:** The parent proposal §8 records the prototype figures (Guide §6, Figures 4–8); they belong to child 2. Nothing in this child renders.

---

## 9. Requirement Delta Preview

### ADDED

- **A1** — A read-only proxy to the Progress Tracker Interoperability API, addressed by the PRMS indicator id.
- **A2** — A PRMS-owned mapping from ToC indicator + reporting phase → PT `indicator_id`, with match quality and resolution timestamp.
- **A3** — A server-side `/resolve` fill routine, re-runnable per reporting year.
- **A4** — `not_found` as a first-class answer for an unmapped or unknown KPI — never a 5xx.
- **A5** — Queryable provenance on a result created from a proposal.
- **A6** — Two server-only environment keys, absent from the client build and from every log line.

### MODIFIED

- **M-1** — The framework create path accepts optional provenance fields. Every existing caller keeps working unchanged; only the Progress Tracker path sets them (contract-first for child 2).
- **M-2** — `serverless.yaml` gains two env keys, and an explicit `timeout:` once OQ-8 resolves.
- **M-3** — `docs/trd/trd.md` §5 and §7 gain the new workflow and integration rows (at `/akili-archive`).

### REMOVED

- None.

---

## 10. Approach Options

### Option A — One module, mapping resolved on demand per request

Call `/resolve` inside the results request whenever the mapping is missing.

| | |
|---|---|
| **Pros** | No fill routine, no scheduling question |
| **Cons** | Adds an upstream round trip to the request already at risk on the 20 s budget (OQ-8); re-resolves the same row forever; no audit trail of match quality; a `fuzzy` match gets silently re-decided on every call |
| **Verdict** | Reject as the primary path — acceptable only as a lazy backfill behind the stored mapping |

### Option B — Stored mapping filled by an explicit routine ✅

Fill once per reporting year, store `indicator_id` + `match` + `score` + `resolved_at`, serve requests from the table.

| | |
|---|---|
| **Pros** | The results request costs exactly one upstream call; `fuzzy` decisions are recorded once and reviewable; re-resolution after a PORB refresh is an auditable job; `none` stays unmapped instead of becoming a guess (parent R4) |
| **Cons** | One migration, and a named owner/trigger for re-resolution (Guide §8.2 P3 — still open) |
| **Verdict** | **Recommended.** Matches the parent's locked OQ-1 |

### Option C — Compute the id locally with MD5

`md5("{program}\|{aow}\|{center}\|{hlo_title}\|{description}")[:12]`, no upstream call.

| | |
|---|---|
| **Pros** | Deterministic, free, no table |
| **Cons** | ≈16 PORB rows collide on those five fields and the Progress Tracker re-keys those siblings through a disambiguation table PRMS cannot see — a local hash can point at the **wrong KPI** (Guide §5). Silently wrong is the worst failure mode available here |
| **Verdict** | Reject — this is exactly what Guide §5 recommends against |

---

## 11. Recommended Approach

**Option B**, implementing the parent's locked decisions:

1. **Mirror `cgspace-discovery` file for file**, including the `SourceFailure` contract (C2, M8). New upstream, same hardening — no new security reasoning to review.
2. **The PRMS indicator id is the only id the client ever sees** (C4). The mapping table is read inside the service. This is what keeps child 2 parallel-safe and what keeps the upstream key space server-side.
3. **`match: none` means unmapped, not a guess** (M6). The route answers `not_found`; the user gets manual entry. A wrong mapping is worse than no mapping.
4. **The request budget is now measured, so pin it** (C5, C9). The ceiling is **29 s** (API Gateway) inside a **30 s** Lambda, and a cold draft measured **20.2 s** — **≈9 s of headroom**, so the call is viable synchronously on staging. Three consequences: **(a)** `serverless.yaml` declares `timeout: 30` (M4b) — without it a deploy reverts to 6 s and the feature dies silently; **(b)** the server-side HTTP call timeout is pinned **strictly below the 29 s ceiling** with room for PRMS's own overhead, so PRMS returns a classified `unavailable` rather than letting API Gateway cut the connection; **(c)** template-first retrieval still earns its place for UX, but it is **not free — 1.4 s measured, and a cache hit is 1.1 s, not 0.21 s** (C9). Design the loading experience around ~1.4 s, not around zero.
5. **Classify `422` as a failure, never a crash** (C10). DEV already returns 422 for calls the Guide documents as valid. The route must answer `unavailable` and the user must keep manual entry. This is also why `PT_INTEROP_BASE_URL` targets staging.
6. **Provenance is queryable from day one** (M7). Parsing `result_key` back out of narrative prose is not a foundation the duplicate rule can stand on.

---

## 12. Risks, Dependencies, And Open Questions

| # | Risk | Severity | Mitigation |
|---|---|---|---|
| R1 | **`serverless.yaml` timeout drift** — the repo declares none while the deployed function has 30 s. A deploy from the repo as it stands reverts to the Serverless default of 6 s and the feature dies silently on the exact KPIs it is most useful for (C5) | **High** | `timeout: 30` declared as a required deliverable (M4b); server call timeout pinned under the 29 s API Gateway ceiling. **The budget itself is no longer a risk — it is measured with ≈9 s headroom** |
| R1b | **PROD budget unverified** — no PROD Lambda exists in the measured account, and the primary production runtime is still an open baseline item (C6) | Medium | PROD is out of scope for this family (parent N3). Do not carry the staging numbers into a PROD claim; re-measure before any PROD switch |
| R1c | **Upstream contract drift between environments** — DEV returns 422 on calls the Guide documents as valid (C10) | Medium | `PT_INTEROP_BASE_URL` targets staging; 422 classified as `unavailable`, never an unhandled error; a contract test pins the staging response shape |
| R2 | **Secret leakage** — an upstream URL, key or error body reaching a response or CloudWatch | **High** | `KPM-R-8` `SourceFailure` adopted verbatim (M8); unit tests assert the leak-free shape; `.cursorrules` |
| R3 | **Mapping drift** — PORB texts refresh, the Progress Tracker re-seeds, ids change, the table silently points at nothing | Medium | `resolved_at` + `match` + `score` stored; `404` → `not_found`, never an error; re-resolution owner still open (Guide §8.2 P3) |
| R4 | **Fuzzy resolution picks the wrong sibling** (C8) | Medium | Never auto-accept `none`; store the score; a low-confidence row resolves to unmapped |
| R5 | **Migration ordering** — this child owns every migration in the family | Low | Child 2 carries none (`family.md` §6); `npm run migration:check:ci` in the gate |
| R6 | **Cold-path cost of a cache miss** — 20.2 s is comfortable but not cheap, and every fresh draft costs one model call upstream | Low | The upstream caches per evidence fingerprint; `refresh` stays server-rate-limited (Guide §8.2 P7, parent OQ-6) |

**Dependencies:** **D1 (egress from the PRMS TEST VPC/Lambda to the PT staging host in `eu-central-1` — still OPEN**; the 2026-09-22 measurements were taken from a laptop, outside the VPC) · D2 (`X-API-Key`, Jose — endpoints open today) · P3 (re-resolution ownership, Jose — open). Full table in `family.md` §5.

**Open questions:** **OQ-8 is CLOSED for staging** (`family.md` §5.1 — APIGW 29 s / Lambda 30 s, cold draft 20.2 s, ≈9 s headroom). What remains open and belongs to this child's neighbourhood is the **PROD budget** (C6) and **D1 egress** — neither blocks design or build. OQ-1, OQ-2, OQ-3, OQ-4, OQ-5 and OQ-9 are **locked** in `family.md` §4 and are cited, not re-opened. Two smaller questions belong to `/akili-specify`: the exact mapping-table key (Integration `id` vs `related_node_id`, plus phase) and whether provenance is a side table or columns on an existing one.

---

## 13. Success Criteria

| # | Criterion | How it is proven |
|---|---|---|
| SC-1 | `GET /api/progress-tracker/indicators/:tocIndicatorId/results` returns the Progress Tracker's proposals for a mapped KPI on TEST | Manual call against TEST once D1 is confirmed |
| SC-2 | An unmapped or unknown KPI answers `not_found`; an unreachable, unconfigured or **422-returning** upstream answers `unavailable`. None of them is a 5xx | Server Jest per state, including a 422 case (C10) |
| SC-2b | `serverless.yaml` declares `timeout: 30`, and the server-side call timeout is strictly below the 29 s API Gateway ceiling | File diff + a unit test asserting the configured call timeout |
| SC-3 | **No base URL, host, API key or upstream error body** appears in any response or log line | Code review against the `KPM-R-8` contract + unit tests asserting the leak-free shape |
| SC-4 | The fill routine resolves one representative program's KPIs, recording `match` and `score`; `none` rows are stored unmapped | Fill-routine test + one run against staging |
| SC-5 | The create path stores `result_key` and `evidence_fingerprint` and they are queryable by indicator | Server Jest on the create path |
| SC-6 | Existing create behavior is unchanged for every caller that sends no provenance | Existing `results-framework-reporting` suite green, unchanged |
| SC-7 | Gates hold: server Jest ≥ 5/20/35/40, `npm run migration:check:ci` clean, `npx eslint "{src,apps,libs,test}/**/*.ts" --quiet` clean | Root `CLAUDE.md` verification commands |

Parent `SC-1` (the TEST walkthrough) and parent `SC-3` (no direct browser call) are **family-level** and belong to child 2 — see `family.md` §2.

---

## 14. Next Step

```
/akili-specify docs/specs/changes/progress-tracker-pull-bridge/progress-tracker-indicator-mapping
```

🛑 Held at the requester's instruction until both child proposals have been reviewed together with the OQ-8 validation results.

---

## Provenance

Derived from `../proposal.md` (approved 2026-09-22, Option B) and the family manifest `../family.md`. The primary requirement source is Jose Berenguer's guide of 15 Sep 2026 in `../source/`; its §4 API contract is adopted unchanged, and its §5 storage recommendation is deliberately replaced — with the code evidence in C3 — because `toc_results_indicators` lives in the ToC Integration database, which PRMS reads and never authors.
