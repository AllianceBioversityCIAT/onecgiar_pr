# Proposal — Progress Tracker Pull Bridge (external result source in the Reporting Tool)

## 1. Document Control

| Field | Value |
|---|---|
| **Spec path** | `docs/specs/changes/progress-tracker-pull-bridge` |
| **Slug** | `progress-tracker-pull-bridge` — given verbatim as a kebab-case argument; no derivation needed |
| **Type** | Change |
| **Approval Mode** | gated (default) — the requester asked to stop at the proposal for review |
| **Date** | 2026-09-21 |
| **Requester** | Juan Carlos Cadavid (PRMS), on the 15 Sep 2026 agreement with the CGIAR System Organization |
| **Primary requirement source** | **Jose Berenguer (Technical Lead – AI, CGIAR System Organization), _"PRMS ⇄ Progress Tracker — the pull bridge: how it works, getting started, what remains"_, v1.0 draft, 15 September 2026.** Held in this spec at `source/PRMS-ProgressTracker-Pull-Bridge-Guide-2026-09-15.docx` (figures) and `source/PRMS-ProgressTracker-Pull-Bridge-Guide-2026-09-15.txt` (text extract). Cited below as **Guide §N**. |
| **Secondary source** | Call of 15 Sep 2026 "Re: W1/W2 results to PRMS through API" (31 min, recorded/transcribed by Ángel Jarrín; Héctor Tobón, Juan Carlos Cadavid, Juan David Delgado, Ángel Jarrín, Jose Berenguer) — Guide §1 |
| **Base branch** | `origin/performance-refactor` (worktree branch `JuankCadavid/progress-tracker-pull-bridge`) |
| **Depends on** | none |
| **Parallel-safe** | yes (no shared module with any spec currently in flight) |
| **Modules** | server `api/progress-tracker` (new) · client `result-framework-reporting/dashboard-lab/lab-report-form` · client `shared/report-result` · one PRMS-owned migration |
| **Baseline docs** | `docs/prd.md` §5 (In scope — result authoring) · `docs/trd/trd.md` §5 W1 (result lifecycle), §5 W9 (multi-repository discovery — the pattern this mirrors), §7 (Integration Points), §8 (Security) · `.cursorrules` (no secrets in logs) |

---

## 2. Intent

Give PRMS users a second **external result source** inside the Reporting Tool — the CGIAR **Progress Tracker** — using the exact product pattern that already exists for Knowledge Products ("Browse repositories" → CGSpace / MELSpace / WorldFish → create a result in PRMS).

When a user is about to report on a pooled W1/W2 KPI, PRMS asks the Progress Tracker Interoperability API what results it can **propose** for that KPI, shows them, and — on "Use this result" — pre-fills the PRMS create form. **Nothing is persisted until the user presses PRMS's own "Create and continue."** The Progress Tracker is read-only to PRMS and never writes into it (Guide §2).

This is item **(b)** of the two-way MVP agreed on 15 September. Item (a) — adapting the bilateral ingestion API to accept W1/W2 so the Progress Tracker's existing "send" button works — is **not** in this proposal (Guide §1).

---

## 3. Problem / Current Behavior

Every claim below is cited as run against this worktree (base `origin/performance-refactor`) on 2026-09-21, or marked `UNVERIFIED`.

| # | Claim about today | Evidence |
|---|---|---|
| P1 | **PRMS has exactly one external result source, and it serves only Knowledge Products.** The entry-mode switcher in the live W1/W2 report form is wrapped in `@if (currentResultIsKnowledgeProduct())`, so a non-KP indicator has no source choice at all — it is manual entry or nothing. | `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/lab-report-form/lab-report-form.component.html:84-108` |
| P2 | **That switcher is live, not gated** (`kpBrowseEnabled = true`, no feature flag) and searches CGSpace + MELSpace + WorldFish. | `lab-report-form/CLAUDE.md` → "Pendiente / Coming soon"; spec `docs/specs/archive/2026-09-14-changes--kp-multi-repository-browse` |
| P3 | **There are three create surfaces carrying the same pattern**, not one: the aside form (live 2026 entry), the AoW/HLO modal, and the legacy result-creator form. | `lab-report-form.component.html:95` · `aow-hlo-create-modal.component.html:69` · `results/pages/result-creator/components/report-result-form/report-result-form.component.html:61` |
| P4 | **The server-side proxy pattern this change must mirror already exists and is hardened.** `cgspace-discovery` reads its base URLs from `process.env` at call time, applies a per-call timeout, and classifies failures into leak-free primitives so no upstream host, URL or body can reach a response or a log line (`KPM-R-8`, `.cursorrules`). | `onecgiar-pr-server/src/api/results/results-knowledge-products/cgspace-discovery/cgspace-discovery.service.ts:48-60` (SourceFailure contract), `:98` (`SEARCH_TIMEOUT_MS = 8000`), `:366` · `repositories.config.ts:52,70,92,113` (`baseUrlEnv`) |
| P5 | **No `progress-tracker` route is registered today.** | `grep -c "progress-tracker" onecgiar-pr-server/src/api/modules.routes.ts` → `0` |
| P6 | **The create endpoint already accepts a progressive narrative; the client hardcodes it empty.** The server DTO declares `toc_progressive_narrative?: string` and persists it on the ToC link. The client payload builder sends `''` with a comment saying neither surface has a narrative field. | `onecgiar-pr-server/src/api/results-framework-reporting/dto/create-results-framework.dto.ts:145-150` · `onecgiar-pr-client/src/app/pages/result-framework-reporting/shared/report-result/create-result-payload.util.ts:236-238` |
| P7 | **The create payload has no field for the visible "Description of Result".** `CreateResultDto` carries `initiative_id`, `result_type_id`, `result_level_id`, `result_name`, `handler`, `has_innovation_link`, `linked_results` — and nothing else. | `onecgiar-pr-server/src/api/results/dto/create-result.dto.ts:3-45` |
| P8 | 🛑 **The ToC indicator catalogue is NOT a PRMS table.** It is read cross-schema from the ToC Integration database via `env.DB_TOC`. PRMS migrations cannot add a column to it. | `onecgiar-pr-server/src/api/results/results-toc-results/repositories/aow-bilateral.repository.ts:777-788` (`FROM ${env.DB_TOC}.toc_results_indicators tri`) · `docs/trd/trd.md` §7 ("Theory of Change services — PRMS reads … PRMS attaches results to ToC, never authors ToC") |
| P9 | **PRMS resolves the ToC node identifier server-side already.** The create command takes the Integration primary key `indicator_id`, looks the row up, and stores `indicatorRow.related_node_id` into `results_toc_result_indicators.toc_results_indicator_id`. The client never needs to carry the node id itself. | `onecgiar-pr-server/src/api/results-framework-reporting/application/commands/create-result-from-framework/framework-result-toc-indicators.service.ts:52-81` |
| P10 | 🛑 **The Lambda deployment path declares no function timeout.** `serverless.yaml` has no `timeout:` at provider or function level, so the Serverless Framework default applies. The same file is where the three DSpace discovery URLs are injected — the precedent for `PT_INTEROP_*`. | `onecgiar-pr-server/serverless.yaml` (full file read; `functions.main` has `handler` + `events` only) — **RESOLVED 2026-09-22** (`family.md` §5.1): the deployed staging Lambda `prstaging-dev-main` has a **30 s** timeout and API Gateway `/{any+}` caps at **29 s**, so the budget holds; but the repo's silence is **drift**, and a deploy as it stands would revert to the Serverless default of 6 s. Declaring `timeout: 30` is now a required deliverable of child 1. |
| P11 | Which runtime is primary in production (Lambda vs container) is an **open item in our own infrastructure baseline**. | `docs/infrastructure.md:14,28,82` |
| P12 | The Progress Tracker Interoperability API is live on dev and staging, flag-off in production; a fresh draft on a 13-item KPI measured **19.9–22 s**, a cached one **0.21 s**, and template mode is instant. | Guide §3 (environment table), §4.1, §4.4 — **CONFIRMED on staging 2026-09-22** (`family.md` §5.1): cold 20.2 s, refresh 16.5 s. Two corrections: a cache hit is **1.1 s**, not 0.21 s, and `mode=template` is **1.4 s**, not instant. Separately, **PT DEV has drifted** — 422 on `mode=template` and `refresh=true` for this same KPI — which independently confirms OQ-3 (PRMS TEST → PT staging). |

**What this adds up to.** The product pattern, the server proxy idiom, the create endpoint and the narrative slot all already exist. The three things that do *not* exist, and that make this more than a copy-paste port, are: **(1)** a place PRMS owns to store the Progress Tracker's `indicator_id` — the guide's suggested "column on the ToC indicator row" is not available to us (P8); **(2)** a source switcher for **non-KP** indicators, which the current template structurally does not have (P1); and **(3)** a request budget that survives a 20-second upstream call on our own Lambda (P10, P12).

---

## 4. Proposed Outcome

A user reporting on a pooled W1/W2 KPI in the Reporting aside sees a **Progress Tracker** source beside Manual entry (a third tab beside "Browse repositories" when the KPI is a knowledge-product KPI). Opening it lists the drafts the Progress Tracker proposes for that exact KPI, each with its result type, confidence, cited evidence and a "what you still have to add in PRMS" list. "Use this result" pre-fills title, description and — only where the KPI leaves it open — the result type, plus the repository handle when the draft carries one.

The result comes into existence only when the user presses PRMS's own **Create and continue**, and lands exactly where a manually created result lands: **Editing**, W1/W2, owned by the Science Program (Guide §2). Because PRMS's own create action is what fires, the "Editing vs pending review" question raised on the call does not arise.

When the Progress Tracker is slow, unknown to this KPI, or down, the form stays fully usable by hand — the failure state is an inline notice with a "use Manual entry" escape, never a blocked form (Guide §7 item 9).

---

## 5. Scope

### In scope

| # | Deliverable | Notes |
|---|---|---|
| S1 | **Server module `src/api/progress-tracker/`** — module, controller, service, whitelisted query DTOs, unit tests; registered in `modules.routes.ts` and `app.module.ts`. Mirrors `cgspace-discovery` exactly: env-read base URL, per-call timeout, classified status (`ok` / `not_found` / `unavailable`), and the `KPM-R-8` leak-free failure contract. | Guide §7 item 1 |
| S2 | **Proxy routes** — `GET /api/progress-tracker/indicators/:tocIndicatorId/results` and `GET /api/progress-tracker/programs/:programId/ready-counts`. The path parameter is the **PRMS/Integration** indicator id; the Progress Tracker's `indicator_id` is resolved server-side and never reaches the browser (see A3 below). | Guide §4.1, §4.3 |
| S3 | **Environment keys** `PT_INTEROP_BASE_URL` and `PT_INTEROP_API_KEY`, server-side only, added to `serverless.yaml` alongside the three discovery URLs and to the container env. Never in the client build; never logged (`.cursorrules`). | Guide §7 item 2 |
| S4 | **PRMS-owned indicator mapping** — one migration creating a PRMS table that maps a ToC indicator (Integration id / `related_node_id`) + reporting phase → Progress Tracker `indicator_id`, plus a server-side fill routine that calls `GET /api/prms/indicators/resolve` once per row per reporting year and records `match` (`exact` / `fuzzy` / `none`) and score for audit. | Guide §5; **redesigned** because of P8 |
| S5 | **Client API methods** `GET_progressTrackerResults` and `GET_progressTrackerReadyCounts` in `shared/services/api/results-api.service.ts`, following the `HTTP_METHOD_descriptiveName` rule and the custom `auth` header. | Guide §7 item 4; `onecgiar-pr-client/CLAUDE.md` |
| S6 | **Standalone component `pt-results-browse`**, sibling to `kp-cgspace-browse`, handling six states: loading, results, empty, `not_found`, `unavailable`, and the post-pick banner. | Guide §7 items 5, 9 |
| S7 | **Host-form integration in `lab-report-form` only** — the source switcher lifted out of its `currentResultIsKnowledgeProduct()` gate so non-KP indicators get **Manual entry \| Progress Tracker**, and KP indicators get a third tab; the `onPtResultSelected` mapping (title truncated at PRMS's 30-word limit with a visible notice, description, type only when the KPI leaves it open, handle for KPs); reset on re-arm. | Guide §7 item 6; scope narrowed — see S-out-1 |
| S8 | **Payload hunk** — `create-result-payload.util.ts` stops hardcoding `toc_progressive_narrative: ''` and carries the pre-filled narrative plus the provenance tail. No server change needed (P6). | Guide §7 item 7 |
| S9 | **Provenance** — `result_key` and `cache.evidence_fingerprint` persisted with the created result in a **queryable** form, so the duplicate rule and the "already used" grey-out are possible rather than a string search through narrative text. | Guide §7 item 11; Ángel, 15 Sep |
| S10 | **Tests** — server unit tests for the proxy (status classification, leak-free failures, timeout, DTO whitelist), client Jest for the component's six states and the mapping, and one Cypress CT for the tab layout in the aside. Gates per root `CLAUDE.md`. | — |

### Explicitly deferred inside this change

| # | Deferred | Why |
|---|---|---|
| S-out-1 | Mounting `pt-results-browse` in `aow-hlo-create-modal` and the legacy `report-result-form` (P3) | The aside is the live 2026 W1/W2 reporting entry point. The component is standalone, so each extra host is a two-line mount once the pattern is QA'd on TEST. Doing all three at once triples the regression surface for no user-visible gain in the 2026 cycle. |
| S-out-2 | The "N results ready" badge on KPI rows (`ready-counts`) | Guide §7 item 10 marks it optional and it was not built in the prototype. The proxy route (S2) ships so the badge is a client-only follow-up. |
| S-out-3 | Greying out proposals already used | Needs S9 landed first and one extra query. Ship the provenance, add the grey-out once there is real data on TEST. |

---

## 6. Non-Goals

| # | Non-goal | Owner / where it lives instead |
|---|---|---|
| N1 | **Push / "send" from the Progress Tracker into PRMS** (item (a) of the MVP) | Separate change: adapt the bilateral ingestion API to accept W1/W2. Guide §1 |
| N2 | **Bilateral projects and Centers** | The Progress Tracker's reference data is PORB-only; pooled W1/W2 exists there and nothing else. Ángel + Jose, Guide §1, §2 |
| N3 | **Turning the Progress Tracker's production flag on** | Jose's side, step P2 (Guide §8.2), and only after PRMS TEST sign-off |
| N4 | **Issuing the `X-API-Key`** | Jose's side, step P1 (Guide §8.2). Our module sends the header when the key is set; the endpoints are open today |
| N5 | **Hosting Jose's cloud copy of PRMS** | Guide §9 — a demo convenience, not a PRMS deliverable |
| N6 | **Any MQAP or knowledge-product entity change** | For a KP draft we pre-fill the handle and hand over to the existing KP flow; the metadata sync is untouched |
| N7 | **The full metadata-based duplicate engine** | Ángel's roadmap. S9 feeds it a key; it does not build it |
| N8 | **Any change to ToC Integration data** | `docs/trd/trd.md` §7: PRMS reads ToC, never authors it. This is precisely why S4 lives in a PRMS-owned table |

### Scope chunking assessment

This is an **L/XL** change (new server module + migration + fill routine + new client component + host-form surgery + three test layers). It splits cleanly in two, and the split is worth taking because the two halves are blocked by different things:

| Order | Chunk | Contains | Blocked by | Parallel-safe |
|---|---|---|---|---|
| 1 | `progress-tracker-indicator-mapping` | S1, S2 (route shells), S3, S4 | the A3 decision + Jose's P3 (who re-resolves when PORB texts refresh) | yes |
| 2 | `progress-tracker-results-browse` | S5–S10 | nothing — the client contract is the **PRMS** indicator id, so the UI never depends on how the mapping is stored | yes |

Because S2 fixes the client-facing contract on the PRMS indicator id (P9), chunk 2 can be built and unit-tested against a stubbed mapping while chunk 1's schema decision is still open. **Recommendation: split.** Per `/akili-propose`, no `family.md` and no child folders have been created — that needs your agreement first. If you prefer one spec, `/akili-specify` can stage the same boundary as two task groups instead.

---

## 7. Affected Users, Systems, And Specs

| Actor / system | Effect |
|---|---|
| **Science Program result submitters (pooled W1/W2)** | Gain a second source on the report form; the manual path is unchanged and always available |
| **Centers, bilateral submitters** | No change — the source does not appear for them (N2) |
| **QA reviewers** | Receive results whose title/description were drafted from Progress Tracker evidence; the workflow, validation and QA are identical (`docs/trd/trd.md` §5 W1) |
| **PRMS server** | One new module; one new outbound integration (`docs/trd/trd.md` §7 gains a row); `serverless.yaml` gains two env keys |
| **PRMS database** | One new PRMS-owned table (S4) and the provenance storage (S9). **No change to ToC Integration** |
| **Progress Tracker Interoperability API** | Read-only consumer; no contract change requested of Jose beyond §8.2 items already on his list |
| **Related specs** | `docs/specs/archive/2026-08-27-changes--kp-cgspace-browse` and `docs/specs/archive/2026-09-14-changes--kp-multi-repository-browse` — the pattern, the `KPM-R-8` leak-free rule and the `kp-cgspace-browse` component to mirror |
| **Module guides to update at `/akili-archive`** | `lab-report-form/CLAUDE.md` (the switcher stops being KP-only), `onecgiar-pr-server/src/CLAUDE.md` (new module), `docs/trd/trd.md` §5 (a W11 sibling to W9) and §7 (integration row) |

---

## 8. Visual Reference

- **Source:** Prototype screenshots inside the primary source document — **not** a Figma file and not a generated mockup.
- **Location:** `docs/specs/changes/progress-tracker-pull-bridge/source/PRMS-ProgressTracker-Pull-Bridge-Guide-2026-09-15.docx` — Guide §6, Figures 4–8:
  - **Figure 4** — the Reporting tab with the Report button on every indicator row
  - **Figure 5** — left: today's KP-only "Browse repositories \| Manual entry"; right: the target "Manual entry \| Progress Tracker" on a non-KP KPI
  - **Figure 6** — the Progress Tracker panel (type chip, confidence, evidence list, "Use this result", "Open in Progress Tracker", the "nothing is saved until you press Create and continue" footer) and the expanded Details
  - **Figure 7** — left: the post-pick pre-filled state with its banner; right: the failure state with the form still usable by hand
  - **Figure 8** — the created result in Editing, W1/W2
- **Notes:** These come from an **adjusted local copy built from the public PRMS code with synthetic data**, on the current upstream look and feel (Guide §6). They are an accurate reference for *layout and states*, not a token-level design source. `/akili-specify` must reconcile every surface against `docs/ux-ui/design.md` §7 (design tokens) and §8 (components), and reuse `kp-cgspace-browse`'s existing visual language rather than the prototype's. No new design tokens are expected.

---

## 9. Requirement Delta Preview

### ADDED

- **A1** — A `Progress Tracker` source in the report form for **non-KP** W1/W2 indicators, presented as `Manual entry | Progress Tracker`.
- **A2** — A **third tab** beside `Browse repositories | Manual entry` for knowledge-product W1/W2 indicators.
- **A3** — Server-proxied retrieval of the Progress Tracker's proposals for one KPI, addressed by the **PRMS** indicator id; the browser never learns or sends a Progress Tracker id, a base URL or an API key.
- **A4** — Six rendered states: loading, results, empty, `not_found` ("this KPI is not known to the Progress Tracker"), `unavailable`, and the post-pick banner — each with the Manual-entry escape.
- **A5** — "Use this result" pre-fills title (truncated at 30 words, with a visible notice), description, result type *only when the KPI leaves it open*, and the repository handle for KP drafts. Pre-fill is not creation; the user may re-pick or abandon.
- **A6** — A PRMS-owned mapping from a ToC indicator + reporting phase to the Progress Tracker `indicator_id`, filled through `/resolve` and carrying the match quality for audit.
- **A7** — Provenance (`result_key`, `evidence_fingerprint`, Progress Tracker environment, model and generation timestamp) persisted with a result created from a proposal.
- **A8** — Two server-only environment keys, absent from the client build and from every log line.

### MODIFIED

- **M1** — `lab-report-form`'s entry-mode switcher stops being gated behind `currentResultIsKnowledgeProduct()` and becomes source-aware. ⚠️ `lab-report-form/CLAUDE.md` documents that Card 2 and Card 3 share an asymmetric `@if` chain and that breaking it orphans the `@else` and deletes the create footer — that trap governs this hunk.
- **M2** — `create-result-payload.util.ts` stops hardcoding `toc_progressive_narrative: ''` (P6). Every existing caller must keep sending `''`; only the Progress Tracker path sets a value.
- **M3** — `docs/trd/trd.md` gains a workflow section beside W9 and a row in §7 Integration Points.

### REMOVED

- None. No existing behavior is deprecated or deleted; the manual path is untouched.

---

## 10. Approach Options

### Option A — Port Jose's tagged diff as-is

Take the `// PT-BRIDGE` diff (Guide §7: 6 server files / 607 lines, 4 client files / 810 lines, ~276 lines of host-form hunks) and apply it to the real repository.

| | |
|---|---|
| **Pros** | Fastest to a running demo; Jose measured ~1 hour of build time; 17 unit tests come with it; it is a reading exercise, not a design one |
| **Cons** | Its indicator-id strategy reads `indicators[0].related_node_id` client-side and assumes PRMS can add a column to the ToC indicator row — **which P8 shows we cannot**. It targets a form whose prototype structure differs from ours. It leaves provenance as a narrative string, which cannot support the grey-out or Ángel's duplicate rule. It ignores our own Lambda request budget (P10) |
| **Verdict** | Use it as the **reference implementation and test corpus**, not as the change |

### Option B — Mirror `cgspace-discovery` in the PRMS idiom, with a PRMS-owned mapping ✅

Write the module the way `cgspace-discovery` is written, put the indicator mapping in a PRMS table, fix the client contract on the PRMS indicator id, land it on `lab-report-form` only, and keep the description in the ToC narrative for now.

| | |
|---|---|
| **Pros** | Every architectural constraint we actually have is respected: no write to ToC Integration (P8), no upstream host or key reachable from the browser (P4, `.cursorrules`), no server DTO change (P6), one host to regress (P3), provenance queryable from day one. The client contract does not move when A3/A4 are settled later |
| **Cons** | One migration and a fill routine that Option A does not have; the visible "Description of Result" stays a follow-up |
| **Cost** | One migration · one server module · one client component · one host-form hunk set · three test layers |

### Option C — Full parity now

Option B plus: all three create surfaces, the visible Description box (server `CreateResultDto` + persistence change, P7), the ready-counts badge, and the grey-out.

| | |
|---|---|
| **Pros** | Nothing left over |
| **Cons** | The Description decision (A4) is **not ours to take** — it needs Nicoleta/Julien (Guide §8.3 J1) and it changes a DTO every create surface shares. Three hosts triple the regression surface. The badge and grey-out are marked optional by the source itself |
| **Verdict** | Reject for this cycle; each piece is a clean follow-up |

---

## 11. Recommended Approach

**Option B**, with four decisions made explicitly rather than inherited from the prototype:

1. **The Progress Tracker id lives in a PRMS-owned mapping table, never on the ToC row (Guide A3).** The guide's recommendation — `/resolve` over a locally computed MD5 — is right and we adopt it, for the reason it gives: ~16 PORB rows collide on the five hashed fields and a local hash can point at the wrong sibling (Guide §5). But its *storage* recommendation cannot be followed: `toc_results_indicators` lives in `env.DB_TOC` (P8) and `docs/trd/trd.md` §7 forbids PRMS authoring ToC. So the mapping is a PRMS table, keyed by ToC indicator + reporting phase, recording `indicator_id`, `match`, `score` and `resolved_at`. Re-resolution on a PORB refresh becomes a PRMS-owned, auditable job instead of a silent drift.

2. **The client never sees a Progress Tracker id.** The route takes the PRMS/Integration indicator id and the server maps it — exactly as `framework-result-toc-indicators.service.ts:52-81` already resolves `related_node_id` server-side (P9). This keeps the upstream key space, the base URL and the API key entirely server-side, and it is what makes the two chunks parallel-safe.

3. **Budget the request, do not hope.** A cold draft is 20–22 s upstream (Guide §4.4) and our Lambda declares no timeout at all (P10). Three things together: (a) raise the function timeout explicitly in `serverless.yaml` and verify the deployed value — this must be confirmed **before** any code, because if the Lambda path caps below ~25 s the feature cannot work synchronously; (b) render `mode=template` first (instant, free, always available) and upgrade to the AI draft, so the user never faces a blank 20-second panel; (c) ask Jose for the warm-up he already lists as P8 (Guide §8.2), which turns the normal case into a 0.2 s cache hit. Server timeout stays strictly under the API Gateway ceiling and under our own function timeout.

4. **The draft description goes to the ToC narrative for now, with a provenance tail** — the guide's own prototype behavior (Guide §6) and a two-line client change (P6). The visible "Description of Result" box needs a `CreateResultDto` change shared by every create surface (P7) and a product decision that is not ours (Guide A4 / J1). Ship the narrative, raise the question, change it in one small follow-up if P&R prefers the box.

**Why this is the smallest safe path:** it changes nothing about how a result is created, validated, submitted or QA'd; it adds no client-visible secret; it touches one host form; it reuses a proxy pattern already hardened by two shipped specs; and the only new schema is a table PRMS fully owns.

---

## 12. Risks, Dependencies, And Open Questions

### Risks

| # | Risk | Severity | Mitigation |
|---|---|---|---|
| R1 | ~~**Request budget.**~~ **Retired 2026-09-22** — measured: 29 s ceiling, 30 s Lambda, 20.2 s cold draft, **≈9 s headroom**. What replaces it is narrower: the repo's missing `timeout:` is drift that would revert a deploy to 6 s, so declaring `timeout: 30` is a required deliverable (child 1, M4b) | Medium | `family.md` §5.1 |
| R2 | **Host-form regression.** `lab-report-form/CLAUDE.md` records that Card 2/Card 3 share an asymmetric `@if` chain and that touching it orphans the `@else` and removes the create footer in emerging mode | **High** | Treat the guide's trap list as a requirement; Cypress CT on the tab layout; regression test for emerging mode |
| R3 | **Mapping drift.** PORB texts refresh → the Progress Tracker re-seeds → its `indicator_id` values change → our mapping silently points at nothing | Medium | Store `match`/`score`/`resolved_at`; treat a `404` as `not_found` with the Manual-entry escape, never an error; ownership settled with Jose (P3) |
| R4 | **Fuzzy resolution picking the wrong sibling.** ~16 PORB rows collide on the five hashed fields (Guide §5) | Medium | Never auto-accept `match: none`; store the score; a low-confidence row resolves to unmapped rather than to a guess |
| R5 | **Secret leakage.** An upstream URL, key or error body reaching a response or a CloudWatch line violates `.cursorrules` | **High** | Adopt the `KPM-R-8` `SourceFailure` contract verbatim (P4): primitives only, the caught error never leaves the catch block |
| R6 | **AI-drafted text entering the system of record.** Titles and descriptions are model output | Medium | Pre-fill is not creation — a person reads, edits and presses Create (Guide §2). The banner states nothing is saved. `missing_info` is shown, not hidden |
| R7 | **Evidence coverage.** Jose reports two programs with 95 and 34 KPIs carrying evidence, and areas of work with none (Guide §8.2 P4) | Low | Empty and `not_found` are first-class states, not errors. Expectation-setting is P&R's, not the code's |
| R8 | ~~**Supplier-reported measurements taken on faith.**~~ **Retired 2026-09-22** — re-measured against staging; the Guide's figures hold, with the two corrections recorded in P12 | Low | `family.md` §5.1 |
| R9 | **PROD budget still unverified.** No PROD Lambda was found in the measured account, and which runtime is primary in production remains an open baseline item (P11) | Medium | PROD is out of scope for this family (N3). Re-measure before any PROD switch; do not carry the staging numbers forward |

### Dependencies

| # | Depends on | Owner | Status |
|---|---|---|---|
| D1 | Staging base URL reachable from PRMS TEST (egress allowed) | PRMS infra | **Unverified** |
| D2 | `X-API-Key` per PRMS environment, once auth is switched on (Guide §8.2 P1) | Jose | Not issued; endpoints open today |
| D3 | Production `PRMS_PULL_ENABLED` + production base URL (Guide §8.2 P2) | Jose | Off; after TEST sign-off |
| D4 | Two or three real programs with evidence, for QA on TEST (Guide §8.1 A9) | PRMS team + Jose | Not scheduled |
| D5 | Sign-off of the operating model with Nicoleta Trifa and Julien Colomer (Guide §8.3 J1) | Jose, Héctor, Ángel | Open — **gates PROD, not TEST** |

### Open questions — surfaced, not answered

| # | Question | Source | Our recommendation |
|---|---|---|---|
| **OQ-1** | Compute the id locally or call `/resolve`, and where does the id live? | Guide A3 | **`/resolve` + a PRMS-owned mapping table.** Local MD5 mis-keys ~16 colliding rows (Guide §5); a ToC column is not available to us (P8) |
| **OQ-2** | Does the draft description land in the ToC narrative or in the visible "Description of Result"? | Guide A4 | **Narrative now** (zero server change, P6), box later if P&R prefers — it needs a shared DTO change (P7) and is a product call |
| **OQ-3** | Which Progress Tracker environment does each PRMS environment talk to? | Guide A7 | **PRMS TEST → PT staging; PRMS PROD → PT production** (flag off today). Needs confirmation with Jose |
| **OQ-4** | Do pulled results land in Editing or pending review? | Nicoleta, via the 15 Sep call | **Editing** — mechanically, because PRMS's own Create action is what fires (Guide §2). Worth stating to Nicoleta rather than re-deciding |
| **OQ-5** | Do we send the user's e-mail as `X-Actor-Email` for attributable audit rows? | Guide A8 | **Default no.** A privacy call; one line to add if approved. Raise with the data-protection owner |
| **OQ-6** | Who may press Refresh, and how often? | Guide §8.2 P7 | Each refresh costs one model call (~US$0.01). Suggest: available, rate-limited server-side, not automatic |
| **OQ-7** | Who re-resolves the mapping when PORB texts refresh, and when? | Guide §8.2 P3 | PRMS runs the fill; Jose announces re-seeds. Needs a named trigger, not a convention |
| **OQ-8** | **Is the deployed Lambda timeout high enough?** | Ours (P10) | ✅ **ANSWERED 2026-09-22 — yes, for staging.** 29 s API Gateway ceiling inside a 30 s Lambda against a 20.2 s cold draft. Full figures in `family.md` §5.1. **PROD stays unverified** (R9) |
| **OQ-9** | Split into two specs, or one spec with two task groups? | §6 chunking assessment | **Split** — different blockers, and chunk 2 is parallel-safe behind the contract in recommendation 2 |

### Kaizen

`docs/specs/kaizen-log.md` does not exist in this worktree and `docs/specs/kaizen/` holds no active-lessons table, so no lesson ID is cited. Two lessons from the module guides govern this change anyway and are recorded as R2 (the `lab-report-form` `@if` trap) and R5 (the `KPM-R-8` leak-free failure contract).

---

## 13. Success Criteria

| # | Criterion | How it is proven |
|---|---|---|
| SC-1 | On PRMS **TEST**, from a real pooled W1/W2 KPI that has evidence in the Progress Tracker: Report → Progress Tracker → drafts listed → "Use this result" → form pre-filled → Create and continue → result in **Editing**, W1/W2, with provenance attached | HITL walkthrough on TEST with a real program (Guide "Success criteria"; D4) |
| SC-2 | **Fail-soft.** With `PT_INTEROP_BASE_URL` unset, the upstream unreachable, or the KPI unknown to the Progress Tracker, the form stays fully usable by hand and shows the right one of `unavailable` / `not_found` with the Manual-entry escape | Unit tests per state + a deliberate HITL failure run |
| SC-3 | **No direct browser call** to the Progress Tracker upstream host (the `PT_INTEROP_BASE_URL` origin) — *narrowed 2026-09-22 (requester-approved): originally "`synapsis-analytics.com` or any `execute-api` host", which PRMS's own pre-existing `reviewApiUrl` / `bulkUploaderUrl` already contact*; the network tab shows exactly one PRMS call per open and one `POST /api/results-framework-reporting/create` on create | Browser network inspection during SC-1 (mirrors Guide §6) |
| SC-4 | **No secret or upstream identity in any response or log** — no base URL, host, API key or upstream error body | Code review against the `KPM-R-8` contract + unit tests asserting the leak-free failure shape (`.cursorrules`) |
| SC-5 | **Manual entry and the KP browse tab are unchanged** for every existing indicator type, including emerging mode | Existing `lab-report-form` Jest suite green, unchanged; Cypress CT for the tab layout |
| SC-6 | **A non-KP indicator shows the source switcher; a KP indicator shows three tabs** | Cypress CT + Jest template assertions |
| SC-7 | The mapping fill resolves a representative program's KPIs and records `match`/`score`; `none` rows resolve to unmapped, never to a guess | Fill-routine test + a run against staging for one program |
| SC-8 | Test gates hold: server Jest ≥ 5/20/35/40, client Jest ≥ 50/60/60/60, `npm run migration:check:ci` clean, lint clean | Root `CLAUDE.md` verification commands |

---

## 14. Next Step

On approval:

```
/akili-specify docs/specs/changes/progress-tracker-pull-bridge
```

**Superseded 2026-09-22.** Option B and the split were approved; `family.md` and both child proposals exist, and OQ-8 is closed for staging. Work now proceeds per child:

```
/akili-specify docs/specs/changes/progress-tracker-pull-bridge/progress-tracker-indicator-mapping
/akili-specify docs/specs/changes/progress-tracker-pull-bridge/progress-tracker-results-browse
```

Both are held at the requester's instruction pending review of the two child proposals.

---

## Provenance

This proposal was written against **Jose Berenguer, _"PRMS ⇄ Progress Tracker — the pull bridge: how it works, getting started, what remains"_, v1.0 draft, 15 September 2026** (`source/` in this folder). Section references marked "Guide §N" point at it. Where the guide's recommendation and this repository disagree — the storage of the Progress Tracker `indicator_id` (§5 vs P8) and the client-side reading of `related_node_id` (§7 item 8 vs P9) — the divergence is stated explicitly with the code evidence, and the API contract in §4 of the guide is adopted unchanged.
