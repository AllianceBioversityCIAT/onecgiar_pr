# Requirements — Progress Tracker Indicator Mapping and Read Proxy

## 1. Module / Feature

- **Module:** `progress-tracker` (new server module) · touches `results-framework-reporting`
- **Sub-feature:** indicator mapping + read proxy (child 1 of the `progress-tracker-pull-bridge` family)
- **Owner:** Juan Carlos Cadavid (PRMS)
- **Status:** `approved` (specify approved 2026-09-22; ready for `/akili-execute`, not yet started)
- **Depth:** **Full** — escalated from Standard at the Phase 2 gate on 2026-09-22 per `design.md` §13 (two migrations + external integration + secret-bearing config surface + create-path change). Label correction only; no document was rewritten.
- **Type:** Change · **Approval Mode:** gated
- **Parent spec:** `docs/specs/changes/progress-tracker-pull-bridge` (`family.md`, child #1, status `active`)
- **Proposal:** `./proposal.md` (approved 2026-09-22)
- **Module code:** `PTM`
- **Ticket(s):** none assigned

---

## 2. Context

The 15 September 2026 agreement between the PRMS team and the CGIAR System Organization defined a two-way MVP; this family delivers the **pull** half — when a user reports on a pooled W1/W2 KPI, PRMS asks the Progress Tracker Interoperability API what results it can propose (primary source: Jose Berenguer, *"PRMS ⇄ Progress Tracker — the pull bridge"*, v1.0, 15 Sep 2026, in `../source/`; cited as **Guide §N**).

This child is the **server half**: the read-only proxy, the PRMS-owned table that maps a PRMS ToC indicator to the Progress Tracker's `indicator_id`, and the provenance storage a created result needs. It ships **no UI** — the client half is sibling child 2 (`progress-tracker-results-browse`).

**Baseline anchors.** `docs/prd.md` — refines `US-S1` (create a typed result with its required fields) and `US-A4` (admin-triggered external sync); bound by `AC-3` (authorization), `AC-5` (phase scoping), `AC-8` (observability) and `AC-9` (secrets). `docs/trd/trd.md` — this is a **W9-shaped** workflow (§5 W9, multi-repository DSpace discovery: an external read proxy that degrades gracefully per source) and adds a row to §7 Integration Points; §8 governs its auth posture. `docs/ux-ui/design.md` — **not touched**; this child renders nothing.

---

## 3. In Scope / Out of Scope

### In scope

- A `progress-tracker` server module proxying two read-only upstream GETs, registered on the standard `/api` surface.
- Two PRMS routes addressed by the **PRMS/Integration** indicator id — never the Progress Tracker's own id.
- `PT_INTEROP_BASE_URL` and `PT_INTEROP_API_KEY`, server-side only.
- An explicit `timeout:` declaration in `serverless.yaml`.
- A PRMS-owned mapping table (ToC indicator + reporting phase → PT `indicator_id`, match quality, score, resolved-at) and the routine that fills it through the upstream `/resolve` endpoint.
- Provenance storage for a result created from a Progress Tracker proposal, and the server-side acceptance of those fields on the existing create path.

### Out of scope

- Every client artifact — API service methods, the browse component, report-form changes, payload changes (**sibling child 2**).
- The "N results ready" badge (parent `S-out-2`).
- Greying out already-used proposals (parent `S-out-3`).
- Turning on the upstream production flag or issuing the API key (Jose — Guide §8.2 P1/P2).
- Any write to the ToC Integration database (**forbidden**, see `PTM-R-12`).
- The visible "Description of Result" box (locked deferred — `family.md` §4 OQ-2).

---

## 4. Personas Affected

| Persona | What changes for them |
|---|---|
| Result submitter | **Nothing visible in this child.** The route exists; nothing calls it until child 2 |
| Platform admin | Gains a fill routine to run per reporting year, and the match-quality record it writes (refines `US-A4`) |
| QA reviewer | No change in this child |
| Bilateral / platform-report consumer | **No change** — no bilateral or platform-report payload is touched |

---

## 5. User Stories

- **`PTM-US-1`** — As a **result submitter**, I want PRMS to know which Progress Tracker KPI corresponds to the indicator I am reporting, so that the proposals I am shown are for *my* KPI and not a near-match. *(Refines `US-S1`.)*
- **`PTM-US-2`** — As a **platform admin**, I want the Progress Tracker id resolved once per reporting year and recorded with its match quality, so that a wrong or stale mapping is visible rather than silent. *(Refines `US-A4`.)*
- **`PTM-US-3`** — As a **result submitter**, I want PRMS to stay usable when the Progress Tracker is slow, unknown to my KPI, or down, so that the external source never blocks manual reporting. *(Refines `US-S5`.)*
- **`PTM-US-4`** — As a **platform admin**, I want the upstream base URL and API key to exist only on the server and never in a response or a log, so that the integration cannot leak credentials. *(Bound by `AC-9`.)*

---

## 6. Functional Requirements

### Required (MUST)

- **`PTM-R-1`** The system MUST expose `GET /api/progress-tracker/indicators/:tocIndicatorId/results`, where `:tocIndicatorId` is the **PRMS/Integration** ToC indicator identifier, returning the proposals the Progress Tracker offers for the mapped KPI.
- **`PTM-R-2`** The system MUST expose `GET /api/progress-tracker/programs/:programId/ready-counts`, proxying the upstream per-program counts.
- **`PTM-R-3a`** The upstream **base URL** and the **API key** MUST NOT appear in any response body, response header, or log line.
- **`PTM-R-3b`** Client-facing routes MUST accept and require **PRMS/Integration identifiers only**. No route accepts a Progress Tracker `indicator_id` from the client; the mapping is resolved **server-side**.
- **`PTM-R-3c`** The Progress Tracker `indicator_id` MAY appear inside **opaque provenance values** (`result_key`, which is `<indicator_id>:<n>` by construction) and **display-only deep links** (`source.pt_url`). *(Amended 2026-09-22 — the original single `PTM-R-3` forbade the id outright, which `PTM-R-13` and `PTM-AC-12` make unsatisfiable: they require `result_key` to be persisted and queryable. See the Pivot Record in `execution.md`.)*
- **`PTM-R-4`** The system MUST classify every upstream outcome into exactly one of `ok`, `not_found`, or `unavailable`, and MUST return a success-shaped envelope carrying that status rather than propagating an upstream error status.
  - `not_found` — the indicator is unmapped in PRMS, or the upstream answers `404`.
  - `unavailable` — timeout, network failure, `5xx`, **`422`**, or the module is unconfigured.
- **`PTM-R-5`** The system MUST read `PT_INTEROP_BASE_URL` and `PT_INTEROP_API_KEY` from the server environment at call time, and MUST send the `X-API-Key` header **only** when the key is non-empty.
- **`PTM-R-6`** The system MUST whitelist upstream query parameters. `max_results` MUST be constrained to `1..10`; `refresh` and `mode` MUST be constrained to their documented values (Guide §4.1). A parameter outside the whitelist MUST NOT reach the upstream.
- **`PTM-R-7`** The HTTP client timeout for an upstream call MUST be **strictly below the 29 s API Gateway ceiling**, so that PRMS returns a classified `unavailable` rather than letting the gateway cut the connection.
- **`PTM-R-8`** `serverless.yaml` MUST declare an explicit function `timeout:` matching the deployed configuration, so that a deploy from the repository cannot silently fall back to the framework default.
- **`PTM-R-9`** The system MUST persist, in a **PRMS-owned** table, the mapping from a ToC indicator and reporting phase to a Progress Tracker `indicator_id`, together with the match quality (`exact` / `fuzzy` / `none`), the match score, and the resolution timestamp.
- **`PTM-R-10`** The system MUST provide a routine that fills that mapping by calling the upstream `/resolve` endpoint with the PORB texts PRMS already holds, once per indicator row per reporting phase.
- **`PTM-R-11`** When `/resolve` answers `match: none`, the system MUST record the row as **unmapped** and MUST NOT store a candidate id as though it were resolved.
- **`PTM-R-12`** The system MUST NOT execute any `INSERT`, `UPDATE`, `DELETE`, or DDL statement against the ToC Integration schema (`env.DB_TOC`), including `toc_results_indicators`. That schema is read-only to PRMS.
- **`PTM-R-13`** The system MUST accept and persist, on the existing framework create path, the provenance of a result created from a Progress Tracker proposal: `result_key`, `evidence_fingerprint`, the upstream environment, the drafting model, and the generation timestamp. The stored form MUST be queryable by indicator without parsing free text.
- **`PTM-R-14`** The provenance fields MUST be optional. A create request that omits them MUST behave exactly as it does today.

### Should (SHOULD)

- **`PTM-R-20`** The module SHOULD mirror the structure of `cgspace-discovery` (env-read base URL, per-call timeout, primitives-only failure contract) so the security posture is reviewable by comparison rather than from first principles.
- **`PTM-R-21`** The fill routine SHOULD be re-runnable without duplicating rows, so a PORB refresh is handled by re-running it.
- **`PTM-R-22`** The system SHOULD record enough of each upstream failure to diagnose it (classified status, duration, numeric upstream status) without recording the upstream host, URL, body, or key.

### Could (MAY)

- **`PTM-R-30`** The mapping fill MAY be exposed as an admin-triggered endpoint in addition to, or instead of, a scheduled job; the trigger mechanism is a design decision.

---

## 7. Non-Functional Requirements

| Dimension | Target |
|---|---|
| **Performance** | A cached or template upstream answer MUST return within 5 s p95 end-to-end (measured upstream baseline: 1.1 s cached, 1.4 s template — `family.md` §5.1). A cold AI draft MUST complete inside the configured client timeout (`PTM-R-7`); measured upstream baseline 20.2 s. |
| **Availability** | An upstream outage MUST NOT produce a 5xx from PRMS (`PTM-R-4`) and MUST NOT affect any other `/api` route. |
| **Security** | Routes MUST be JWT-gated like every `/api` route (`AC-3`). No upstream base URL, key, or error body in any response or log (`AC-9`, `.cursorrules`, `PTM-R-3a`). The client addresses PRMS ids only (`PTM-R-3b`). |
| **Privacy** | No PRMS user identity is sent upstream — `X-Actor-Email` is **not** sent (`family.md` §4 OQ-5). |
| **Backwards compatibility** | The create path change MUST be additive and optional (`PTM-R-14`). No bilateral or platform-report payload is touched, so `AC-4` does not apply. |
| **Phase correctness** | The mapping MUST be scoped to a reporting phase (`AC-5`); a mapping resolved for one phase MUST NOT be read as valid for another. |
| **Observability** | The fill routine MUST log structured start/finish and per-row outcome counts (`AC-8`) with no secret content (`AC-9`). |
| **Accessibility / i18n** | Not applicable — this child renders no UI. |

---

## 8. Acceptance Criteria

| ID | Given | When | Then |
|---|---|---|---|
| `PTM-AC-1` | A ToC indicator mapped to a Progress Tracker `indicator_id` | `GET /api/progress-tracker/indicators/:tocIndicatorId/results` is called | The response carries status `ok` and the upstream proposals, **and it must NOT** contain the upstream **base URL**, host, or **API key** anywhere in the body or headers. The PT `indicator_id` inside `result_key` and `source.pt_url` is **permitted** (`PTM-R-3c`) |
| `PTM-AC-2` | A ToC indicator with **no** mapping row | The same route is called | The response carries status `not_found`, HTTP 200, **and it must NOT** call the upstream at all |
| `PTM-AC-3` | A mapped indicator whose upstream answers `404` | The same route is called | The response carries status `not_found` and **it must NOT** be a 4xx or 5xx from PRMS |
| `PTM-AC-4` | A mapped indicator whose upstream answers **`422`** (the on-ramp drift observed on PT DEV) | The same route is called | The response carries status `unavailable`, **and IT MUST** be handled as a classified failure, never an unhandled exception |
| `PTM-AC-5` | A mapped indicator whose upstream times out or returns `5xx` | The same route is called | The response carries status `unavailable`, **and it must NOT** include the caught error's message, `config.url`, or response body |
| `PTM-AC-6` | `PT_INTEROP_BASE_URL` is unset | The same route is called | The response carries status `unavailable` and **it must NOT** throw, and **it must NOT** name the missing variable in the response |
| `PTM-AC-7` | `PT_INTEROP_API_KEY` is empty | Any upstream call is made | The `X-API-Key` header **is not sent**; when the key is non-empty it **is** sent, **and IT MUST** never be logged |
| `PTM-AC-8` | A request carrying `max_results=20` | The route validates the query | The request is rejected by validation **and it must NOT** reach the upstream |
| `PTM-AC-9` | The fill routine runs against a program whose `/resolve` answers `match: exact` | The routine completes | A mapping row exists with the returned `indicator_id`, `match='exact'`, its score, and a resolution timestamp, scoped to the reporting phase |
| `PTM-AC-10` | The fill routine runs against a row whose `/resolve` answers `match: none` | The routine completes | The row is recorded **unmapped**, **and it must NOT** store any entry from `candidates[]` as the resolved id |
| `PTM-AC-11` | The fill routine is run twice for the same phase with unchanged upstream answers | The second run completes | No duplicate mapping row exists for that indicator and phase |
| `PTM-AC-12` | A framework create request carrying provenance fields | The result is created | The provenance is persisted and is retrievable by indicator through a query, **and IT MUST** be readable without parsing narrative free text |
| `PTM-AC-13` | A framework create request carrying **no** provenance fields | The result is created | The behavior is byte-identical to today, **and it must NOT** fail validation |
| `PTM-AC-14` | The repository at any commit on this spec's branch | The codebase is searched for writes to the ToC Integration schema | No `INSERT`/`UPDATE`/`DELETE`/DDL statement targets `env.DB_TOC` or `toc_results_indicators` |
| `PTM-AC-15` | `serverless.yaml` as committed | The file is read | An explicit function `timeout:` is declared, and the module's configured HTTP timeout is strictly below the 29 s API Gateway ceiling |

Cross-cutting project ACs that apply without restatement: `AC-3` (authorization), `AC-5` (phase correctness), `AC-8` (observability), `AC-9` (security and secrets).

---

## 9. Defect Classes and Their Gates

The classes of defect this spec can actually produce, and the command that catches each. A class with no automated check is named as such with its substitute — an unacknowledged blind spot is what burns rework.

| # | Defect class | Gate | Automated? |
|---|---|---|---|
| D-1 | Upstream host, URL, key, or error body leaks into a response or log | Server Jest asserting the primitives-only failure shape (`PTM-AC-1`, `PTM-AC-5`, `PTM-AC-7`) + review against the `cgspace-discovery` contract | ✅ |
| D-2 | Upstream status misclassified (`404`/`422`/`5xx`/timeout → wrong client state) | Server Jest, one case per status (`PTM-AC-3`–`PTM-AC-6`) | ✅ |
| D-3 | Query whitelist bypassed | Server Jest on DTO validation (`PTM-AC-8`) | ✅ |
| D-4 | Timeout misconfiguration — repo drift reverts a deploy to the framework default | Assertion on the committed `serverless.yaml` + a unit assertion on the configured HTTP timeout (`PTM-AC-15`) | ✅ |
| D-5 | A write reaches the ToC Integration schema | Repository-wide grep gate for write statements against `DB_TOC` / `toc_results_indicators` (`PTM-AC-14`) | ✅ |
| D-6 | Mapping row duplicated or not phase-scoped | Fill-routine Jest, double-run case (`PTM-AC-11`) | ✅ |
| D-7 | `match: none` stored as a resolved id | Fill-routine Jest (`PTM-AC-10`) | ✅ |
| D-8 | Provenance unqueryable, or create regressed for existing callers | Server Jest on the create path (`PTM-AC-12`, `PTM-AC-13`) + the existing `results-framework-reporting` suite green **unchanged** | ✅ |
| D-9 | Migration irreversible, or pending-migration drift | `npm run migration:check:ci` + a local `up`/`down` round trip | ✅ |
| **D-10** | **A `fuzzy` mapping resolves to the wrong sibling KPI** — the row is well-formed, the score is plausible, and the id is simply wrong | ❌ **No automated check exists.** A test can assert that a score was stored; it cannot assert that the KPI is the right one. **Substitute:** a human spot-check of N resolved rows against the Progress Tracker UI at the HITL pause, before the fill is trusted for a phase. Recorded, not waved | ❌ substituted |
| **D-13** | **A write to `toc_results_indicators` using a hardcoded schema name** rather than the `${env.DB_TOC}` qualifier | ❌ **Not covered by the `D-5` guard**, which anchors only on `${env.DB_TOC}`. `PTM-AC-14` names both targets, but `PTM-T-9`'s task text prescribed mirroring `P-2`'s pattern, which names one — **documentation drift between the AC and the task text, not a failing gate**. The Reviewer ran the table-name-only variant: **0 real hits**, and all 115 existing references use the qualifier. A cross-schema write realistically must carry it. **Accepted and recorded** per the requester's 2026-09-22 decision | ❌ accepted risk |
| **D-14** | **The clamped timeout is never wired onto the axios request config** — `getProgressTrackerTimeoutMs()` is computed but not passed, so every upstream call runs with no timeout | ⚠️ **Gate-blind today.** The clamp itself is covered by `progress-tracker.config.spec.ts`, but **no assertion pins the clamped value onto the request config** — deleting the `timeout` line from the `httpService.get` options would leave the whole suite green. By this spec's own "name the input that would make the check fail" rule, there is currently no such input. **Closing it is one line:** an assertion on `httpService.get.mock.calls[0][1].timeout`. **Recorded as a named gap rather than folded into a closed task** (`PTM-T-3` PASSed; *Advisory Never Becomes A Task*). Recommend closing it in the first task that next touches the service | ⚠️ named gap |
| **D-15** | **A `versionId` whose `phase_year` is NULL produces a 500 instead of `not_found`** | ⚠️ **Introduced by `PTM-T-5` attempt 2.** `reportingYear = Number(version.phase_year ?? NaN)` binds `NaN`, which the mysql driver escapes as the bare token `NaN` → MySQL **1054**, thrown from the *unguarded* `findPorbRowsForPhase` call and surfacing as a 500. **Asymmetric** with the sibling `phaseUuid` guard, which returns `not_found`. `Version.phase_year` is `nullable: true` (`version.entity.ts:56-61`). One line closes it: `if (!Number.isFinite(reportingYear)) return …'not_found'`. **Recorded, not actioned** — `PTM-T-5` PASSed and *Advisory Never Becomes A Task* | ⚠️ named gap |
| **D-16** | **A test asserts less than its title claims** — `pt-porb.repository.spec.ts:110-118` is titled "ahead of `tr.phase = ?` in bound-param order" but asserts only that `wp.year = ?` exists and that `params` equals `[2026, 'phase-uuid']`. **Both survive moving the predicate below `tr.phase = ?`** — precisely the silent swap the title guards against | ⚠️ One line closes it: `expect(sql.indexOf('wp.year = ?')).toBeLessThan(sql.indexOf('tr.phase = ?'))`. **Sixth instance in this run of a gate asserting less than it claims** | ⚠️ named gap |
| **D-12** | **A write to `env.DB_TOC` split across a multi-line template literal** — the keyword and the `${env.DB_TOC}` reference on different lines | ❌ **Not detectable by the `D-5` guard.** The guard matches per line, because the baseline `grep` in `design.md` `P-2` does too — so this limitation is **inherited from the premise, not introduced by the guard**. No such statement exists today and every current `DB_TOC` access is single-line. **Recorded as an accepted risk** per `PTM-T-9`'s Disqualifier, which required a named gap rather than a muted check | ❌ accepted risk |
| **D-11** | **Egress from the PRMS TEST VPC to the upstream host is blocked** — everything passes locally and in CI, and the route returns `unavailable` in the deployed environment for an infrastructure reason | ❌ **Not reachable from CI or a laptop.** The 2026-09-22 measurements were taken outside the VPC (`family.md` §5, gate D1). **Substitute:** a deployed smoke call on PRMS TEST once D1 is confirmed. Until then, recorded as an **accepted risk** | ❌ accepted risk |

---

## 10. Dependencies & Assumptions

### Upstream dependencies

- **Progress Tracker Interoperability API** (FastAPI on AWS Lambda, `eu-central-1`) — `GET /api/prms/indicators/{indicator_id}/results`, `GET /api/prms/indicators/resolve`, `GET /api/prms/programs/{program_id}/ready-counts` (Guide §4).
- **ToC Integration database** (`env.DB_TOC`) — **read-only**; source of the PORB texts the fill routine sends to `/resolve`.
- PRMS `results-framework-reporting` create path — extended additively for provenance.

### Downstream consumers

- **Sibling child 2** (`progress-tracker-results-browse`) consumes `PTM-R-1`/`PTM-R-2` and writes the provenance `PTM-R-13` stores. The route signature is the contract that lets both children build in parallel (`family.md` §2).

### Assumptions

- The upstream contract of Guide §4 is stable on **staging**. PT **DEV has already drifted** (422 on documented calls — `family.md` §5.1), which is why `PT_INTEROP_BASE_URL` targets staging for PRMS TEST.
- The upstream `/resolve` response shape (`match`, `score`, `candidates[]`) is as documented in Guide §4.2 — confirmed live on dev 2026-09-22 (1.3 s, `match=fuzzy`, correct id).

---

## 11. Open Questions

- **`PTM-OQ-1`** — What exactly keys a mapping row: the Integration primary key `toc_results_indicators.id`, the `related_node_id` string, or both, plus which phase identifier? **Resolved in `design.md`**, not here; it is a storage decision, not a behavior decision.
- **`PTM-OQ-2`** — Is the fill routine a scheduled job, an admin-triggered endpoint, or both (`PTM-R-30`)? **Resolved in `design.md`.**
- **`PTM-OQ-3`** — Who triggers re-resolution when PORB texts are refreshed upstream? **Open, owned outside this spec** — Jose with the PRMS team (Guide §8.2 P3, `family.md` §5). It does not block this child: the routine is re-runnable (`PTM-R-21`); only the *convention for when* is open.

Gates tracked at family level and **not** restated as blockers here: PROD request budget, D1 egress, D2 API key, D4 QA programs, D5 operating-model sign-off (`family.md` §5).

---

## 12. Requirement ID Index

| ID | Summary | Covered by AC |
|---|---|---|
| `PTM-R-1` | Results proxy route, PRMS-id addressed | `PTM-AC-1`, `PTM-AC-2` |
| `PTM-R-2` | Ready-counts proxy route | — (shape mirrors `PTM-R-1`) |
| `PTM-R-3a` | No base URL / API key in any response or log | `PTM-AC-1` |
| `PTM-R-3b` | Client addresses PRMS ids only | `PTM-AC-1`, `PTM-AC-2` |
| `PTM-R-3c` | PT id permitted in opaque provenance + display links | `PTM-AC-1`, `PTM-AC-12` |
| `PTM-R-4` | Three-way status classification | `PTM-AC-2`–`PTM-AC-6` |
| `PTM-R-5` | Env-read config, conditional API key | `PTM-AC-6`, `PTM-AC-7` |
| `PTM-R-6` | Query whitelist | `PTM-AC-8` |
| `PTM-R-7` | HTTP timeout under the gateway ceiling | `PTM-AC-15` |
| `PTM-R-8` | Explicit `serverless.yaml` timeout | `PTM-AC-15` |
| `PTM-R-9` | PRMS-owned phase-scoped mapping table | `PTM-AC-9`, `PTM-AC-11` |
| `PTM-R-10` | `/resolve` fill routine | `PTM-AC-9` |
| `PTM-R-11` | `match: none` is unmapped, never a guess | `PTM-AC-10` |
| `PTM-R-12` | No write to the ToC Integration schema | `PTM-AC-14` |
| `PTM-R-13` | Queryable provenance | `PTM-AC-12` |
| `PTM-R-14` | Provenance optional, create unregressed | `PTM-AC-13` |
| `PTM-R-20` | Mirror `cgspace-discovery` | `PTM-AC-1`, `PTM-AC-5` |
| `PTM-R-21` | Fill is idempotent | `PTM-AC-11` |
| `PTM-R-22` | Diagnosable, secret-free failure records | `PTM-AC-5` |
| `PTM-R-30` | Fill trigger mechanism (MAY) | — (design decision) |

---

## Required cross-references

- `docs/prd.md` — `US-S1`, `US-S5`, `US-A4`; `AC-3`, `AC-5`, `AC-8`, `AC-9`
- `docs/trd/trd.md` — §5 W9 (the pattern mirrored), §7 (Integration Points), §8 (Security & Authorization)
- `docs/ux-ui/design.md` — not touched (no UI in this child)
- `docs/infrastructure.md` — §6 (local environment), and the Lambda/API Gateway facts recorded in `../family.md` §5.1
- `../proposal.md` · `../family.md` · `../source/PRMS-ProgressTracker-Pull-Bridge-Guide-2026-09-15.docx`
- `.cursorrules` — no secrets in logs
