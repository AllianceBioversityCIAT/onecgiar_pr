# Proposal — QA AI traffic light on "Submit for review" (W3/Bilateral)

## Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/bilateral/qa-ai-traffic-light/` |
| Slug | `qa-ai-traffic-light` — derived from a free-text argument ("Usa Jira para ver esta US P2-3150 y haz un entendimiento…" plus the Slack thread and the meeting notes pasted with it). Placed under `bilateral/` per the domain-module taxonomy (precedent: `bilateral/bulk-uploader-handoff`). |
| Type | **Change** |
| Approval Mode | **gated** (default) |
| Status | **approved** (owner, 2026-09-16) — converted by `/akili-specify` into requirements/design/tasks |
| Owner | Juan David Delgado (PRMS side: contract, orchestration, UI). AI service: Daniela Gómez. Product: Ángel Jarrín. |
| Date | 2026-09-15 · PO answers applied 2026-09-16 |
| Ticket(s) | **PRMS sub-task [P2-3698](https://cgiarmel.atlassian.net/browse/P2-3698)** (created 2026-09-16, assigned to Juan David Delgado) under [P2-3150](https://cgiarmel.atlassian.net/browse/P2-3150) *W3/Bilateral results - QA AI: Result Quality Assessment on Submission* — User Story, **Ready To Develop**, assignee Daniela Gómez, reporter Ángel Jarrín, updated 2026-09-15. Parent epic [P2-3482](https://cgiarmel.atlassian.net/browse/P2-3482) *Bilateral module for CG Centers - AI Assisted Prefill*. The only comment (Juan David, 2026-08-11) reports 0 % implemented against an **older** version of the ACs (per-field indicators); the ticket was rewritten since to section-level verdicts and that comment is stale. The "AI Review – Coming soon" placeholder it mentions is no longer in `section-zero-dashboard`. |
| Baseline | `docs/prd.md` — G2 (QA pass rate), US-S1/US-S4 (submitter iterates before submission), **AC-2** (every transition in `result-review-history`), **AC-4** (bilateral payload changes additive + change log), **AC-8** (submission notifications), **AC-9** (no secrets/PII in logs), OQ-5 (AI helpers as product goal) · `docs/ux-ui/design.md` — §6 *Drawers and modals* / *Empty-error-loading*, §7 tokens (green `--pr-color-green-500`, amber `--pr-color-yellow-300`, red `--pr-color-red-300`, greys `--pr-color-accents-*`), §8 component rules, §10 a11y, DD-12 brand line · `docs/trd/trd.md` — **W1** (server-side pre-submit validation), **W8** (AI helpers: auth-gated, audit-logged, stripped of secrets/PII before any third-party model), ADR-004, QAS-3 (p95 section save ≤ 2 s — the assessment must not sit on that path), QAS-9, QAS-10, QAS-12 (no new always-on compute) |
| Related specs | `bilateral/bulk-uploader-handoff` (external-contract discipline, vault-first contract) · `bilateral/webhook-external-platforms` · `changes/unsaved-changes-alert` (leave-page guard pattern the waiting window reuses) · kaizen `bilateral--ai-drafts-redesign` |
| Depends on | **External:** AI quality-assessment endpoint (Daniela) built against the contract this spec freezes · QA criteria document on SharePoint (AC8; not readable from here) · KP decision-tree criteria confirmed with Mariagiulia (meeting action, pending). **In-repo:** none. |
| Parallel-safe | **yes** with unrelated families. Internally, if chunked (see Scope Chunking), server child first; client child mocks the frozen contract. |
| Evidence | Vault: `CGIAR/W3/w3-bilateral-module/w3-p2-3150-ai-traffic-light-qa-on-submit.md` (understanding, contract draft v0.1, decisions) · `…/w3-mds-qa-vs-bilateral-form.md` (MDS vs QA criteria gap) · `…/w3-p2-3639-toc-no-gatea-submit.md` (what gates Submit today) · `…/w3-bilateral-ai-completion-feedback.md` (existing AI job UX and its holes) |

**Model checkpoint:** T1 phase; session model (Fable 5.1) is stronger than the registry's `opus` entry → pass. The registry (`.agents/model-routing.md`, updated 2026-08) predates the current generation and should be re-baselined; recorded, not applied (shared-file discipline).

## Intent

When a Centre user presses **Submit for review** on a bilateral result (`/bilateral/:center/result/:code`), PRMS assembles the *human-readable* content of the result exactly as the form shows it, sends it to the AI QA service, and shows a single consolidated **traffic-light window** (overall + one verdict per section) before anything changes status. The user then chooses **Submit anyway** or **Make adjustments**. The AI never blocks; a failed or slow check never blocks; the verdict, the user's decision and any "submitted without check" fact travel with the result for the Program reviewer.

## Problem / Current Behavior

- **Submit is a single, immediate transition.** Client `bilateral-result-creator.component.ts:397` (`submitResult`) checks read-only, unsaved sections and over-limit fields, then calls `PATCH /api/bilateral/center/submit-for-review/:resultId`. Server `bilateral-center.service.ts:1472` (`submitForReview`) checks source/status/centre permission/Science Program/Innovation-Use MDS and flips `status_id` to Pending Review (5) inside a transaction, writing a `result_review_history` row and firing the notification. There is no assessment step, no verdict, no place to store one.
- **Quality is only judged downstream.** The centre gets no signal on how the result "would hold up under QA"; the Program reviewer receives Pending Review results with no quality context (G2, US-S4 unmet on the bilateral path).
- **The Submit gate is completeness, not quality.** `BilateralMdsTrackerService.overallStatus() === 'complete'` (with ToC items `optional` since P2-3639) is what enables the button. Complete ≠ good. The MDS-vs-QA-criteria gap is documented in the vault note `w3-mds-qa-vs-bilateral-form.md`.
- **Existing AI plumbing is for a different job.** `api/bilateral-ai` (`center/ai/jobs` + `bilateral_ai_jobs`, text-mining over uploaded documents, async + polling, 30-min ceiling) and `api/ai` (pooled-result review sessions/DAC proposals) exist; neither assesses a saved bilateral result against QA criteria. The text-mining client (`bilateral-ai-text-mining.service.ts:36-48`) logs full request and response bodies — a pattern this spec must **not** copy (AC-9, W8).

## Proposed Outcome

1. Pressing **Submit for review** first runs the quality check, every time (AC1). While it runs, the user sees a working state with tips explaining each colour; the button cannot fire twice.
2. A single window shows the **overall verdict** and the verdict for **General information, Contributors & partners, Geographic location, Evidence, Type-specific details** (the five form sections, `bilateral-result-creator.component.ts:109-116`), each with plain-language comments, what to fix (amber/red) or what is done well (green). Evidence lines that could not be evaluated (private repository file, blocked URL) show **grey** and do not count toward the section colour (AC2, AC3, meeting decision).
3. Two exits only: **Submit anyway** (status → Pending Review, whatever the colour) or **Make adjustments** (nothing sent). X / Esc / click-outside = Make adjustments (AC4).
4. Editing and re-submitting re-runs the check on the saved content; the user never sees a stale verdict (AC5). If the tab was closed mid-run, reopening the result shows the last verdict **only if the saved content is unchanged** since it was produced, with the same two exits; otherwise Submit re-runs.
5. The wait is not capped by a hard business ceiling (PO, 2026-09-16); the client waits up to **60 s** (configurable) and only then, or on service failure, ends the wait with a clear "quality check unavailable, submit anyway?" choice; submitting then is recorded as *submitted without check* (AC6).
6. Verdict (overall, per section, comments), the user's decision, whether amber/red flags were outstanding, and the no-check fact are persisted with the result and exposed additively on the bilateral detail payload for the reviewer story (AC7). Displaying it on the reviewer side stays out of scope.
7. **Knowledge Products follow a deterministic decision tree in code, no AI call** (meeting decision): not MELIA and not Journal Article → green (auto-validated); Journal Article whose CGSpace and WoS metadata match (same year, ISI and peer-reviewed on both, same accessibility — the QA SQL Juan David pasted) → green; anything else → "not assessed — criteria pending" (grey overall, submit anyway allowed). Metadata columns exist (`results-knowledge-product-metadata.entity.ts`: `is_isi`, `is_peer_reviewed`, `accesibility`, `online_year`).

## Scope

| Layer | Work |
|---|---|
| **Contract (external, first deliverable)** | Freeze the request/response contract with Daniela before any code. **Request = definitions only:** every value is the label the form paints (dropdown text, checkbox/radio caption, chip text), never an id, code or control-list key. Grouped by the five sections. Evidence items carry `visibility: public \| private` and `source: url \| prms_repository`; **private repository files send description + tags + visibility, never the link or file** (they are graded grey by rule). **Response** = overall verdict + per-section `{verdict, score?, comments, issues[], strengths[]}` + per-evidence verdict incl. grey. `score` (0–100) is **optional**: PRMS stores it for traceability and threshold calibration and never paints from it; colours and the thresholds behind them stay on the AI side (PO, 2026-09-16). Draft v0.1 lives in the vault note; the repo copy goes to `docs/bilateral-module/integration-contracts.md` (OQ-1). |
| **Server — payload builder** | New `BilateralQualityPayloadBuilder` in `api/bilateral/services/`: reads the **persisted** result (not the client's in-memory form) and resolves labels through the same joins the bilateral detail enrichment already uses (`bilateral.service.ts` `enrichBilateralResultResponse`, `getTocState`, geography, partners, evidence + `evidence_sharepoint.is_public_file`, type-specific handlers). Unit-tested per type with fixtures that assert **no numeric ids / no `*_id` keys** leave the builder. |
| **Server — AI client** | `BilateralQualityAssessmentClient` on `HttpService`, `X-API-Key` from `MICROSERVICE_API_KEY` (existing), URL `BILATERAL_AI_QUALITY_URL`, timeout `BILATERAL_AI_QUALITY_TIMEOUT_MS` (default 60 000 — PO: no hard ceiling needed, one minute window at most). Logs **only** request id, result id, elapsed ms, HTTP status, verdict colours — never bodies. Maps timeout / 5xx / malformed body to one `unavailable` outcome. |
| **Server — deterministic rules** | Grey rule for evidence (private repository file, link the AI reports as blocked) applied in code after the response; KP decision tree applied **before** the call (skips it). Both pure functions, TDD. |
| **Server — persistence** | Entity + **generated** migration (`migration:generate`, prune to the one table) `bilateral_quality_assessments`: `id`, `result_id`, `version_id`, `content_hash`, `status` (`completed \| unavailable \| skipped_kp_rule`), `overall_verdict`, `overall_score` (nullable), `sections` (JSON, incl. optional per-section score), `evidence` (JSON), `criteria_version`, `elapsed_ms`, `created_by`, `created_at`, `decision` (`submitted_anyway \| adjusted \| submitted_without_check`, nullable), `decided_at`, `had_outstanding_flags`. |
| **Server — endpoints** (`bilateral-center.controller.ts`, JWT path) | `POST center/quality-assessment/:resultId` — validates the same preconditions `submitForReview` does, builds payload, calls AI (or KP rule), persists, returns the assessment. `GET center/quality-assessment/:resultId/latest` — last assessment + `is_current` (hash match against saved content). `PATCH center/submit-for-review/:resultId` gains an **optional** body `{ assessment_id, decision }`; when present it stamps the decision and adds the verdict summary to the `result_review_history` comment. Without a body it behaves as today (backward compatible for any caller). |
| **Server — reviewer payload (additive)** | `quality_assessment` block on the bilateral detail read used by the review drawer, documented in `bilateral-result-summaries.en.md` change log (AC-4). Rendering it is the separate reviewer story. |
| **Client — flow** | `submitResult()` keeps its three guards, then calls the assessment instead of submitting. New `BilateralQualityAssessmentService` (signals: `state: idle \| running \| ready \| unavailable`, `assessment`, `elapsed`). Submit happens only from the window's **Submit anyway**. |
| **Client — window** | New `app-bilateral-quality-review-dialog` (standalone, `pages/bilateral/components/`), `app-pr-dialog` with the `pr-dialog--promote` identity used by the AI completion dialog. Two phases in one component: **working** (progress, rotating tips: what green/amber/red/grey mean, "you decide, the AI never blocks") and **verdict** (overall badge, five section rows with colour + comments + issues, evidence sub-list with grey items, two CTAs). Tailwind-first, tokens from §7, `role="dialog"`, focus trap, Esc = Make adjustments. |
| **Client — leave guard** | While `running`, `beforeunload` warns; if the user leaves anyway the server still finishes and persists. On result load, `GET …/latest`; if `is_current`, the rail shows "Quality check available" and opens the verdict window on demand or on Submit without re-running. |
| **Docs** | Vault note (owner's decision, done in this proposal) · `docs/bilateral-module/integration-contracts.md` + `backend.md` + `frontend.md` sections · `bilateral-result-summaries.en.md` change-log row · `.env` keys listed in server `README.md` → Environment. |

### Scope Chunking (recommended, not yet applied)

The work spans an external contract, a migration, server orchestration and a new client flow. Recommended family (`family.md` written only on agreement):

| # | Child | Depends on | Parallel-safe | MoSCoW |
|---|---|---|---|---|
| 1 | `bilateral/qa-ai-traffic-light/server-assessment` — contract, payload builder, AI client, grey rule, persistence, endpoints, additive reviewer block | none | yes | Must |
| 2 | `bilateral/qa-ai-traffic-light/client-review-window` — service, dialog (working + verdict), leave guard, reopen flow | 1 (frozen contract; can start on mocks) | yes | Must |
| 3 | `bilateral/qa-ai-traffic-light/kp-decision-tree` — deterministic KP rules replacing the AI call, criteria confirmation with Mariagiulia | 1 | no (shares the assessment service) | Should |

If the user prefers one spec, children 1–3 become task groups in a single `tasks.md`.

## Non-Goals

- Program/Accelerator reviewer's view of the verdict (separate story, AC7 note).
- Per-field indicators, hover tooltips, annotating the form (explicitly removed in the ticket).
- Skipping evaluation for AI-prefilled fields (removed in the ticket).
- Blocking submission on any colour; changing what enables the Submit button (MDS completeness stays as is).
- Sending the check to the pooled-funding (W1/W2) flow or to `api/ai` sessions.
- Building the AI model or the criteria prompt (Daniela's service); PRMS owns the payload and the UX.
- KP results entering the AI service in this scope (meeting decision: excluded until criteria are confirmed).
- Fixing the pre-existing absence of guards on `bilateral-center.controller.ts` (vault note `w3-bilateral-superficie-http-y-autorizacion.md`) — inherited, own spec.

## Affected Users, Systems, And Specs

| Who / what | Effect |
|---|---|
| Centre users (`/bilateral/:center/result/:code`) | New step between pressing Submit and the status change; extra wait (typically seconds, up to 60 s) with a purpose. |
| Science Program reviewers | Receive a verdict block with Pending Review results (data only, UI later). |
| `api/bilateral` (center controller/service) | New endpoints + optional body on submit; one migration. |
| AI service (Daniela) | New endpoint to build against the frozen contract. |
| `bilateral-result-summaries.en.md` | Additive `quality_assessment` block + change-log row. |
| `pages/bilateral` client | New service + dialog; `submitResult()` rewired. |
| Notifications | Unchanged; still fire after the actual status change. |

## Visual Reference

- Source: **None yet** (no Figma). The AI completion dialog (`bilateral-ai-completion-dialog`) is the closest in-repo precedent for identity and CTA placement.
- Location: n/a
- Notes: a mockup of the two window phases (working + verdict) is worth generating in `/akili-specify` before the client child starts; the working phase is the part with the most UX latitude (tips per colour).

## Requirement Delta Preview

### ADDED Requirements

- Quality assessment runs on every Submit for review, before any status change (AC1).
- Section-level and overall traffic-light verdicts with plain-language comments, shown in one window for every colour (AC2, AC3).
- Grey evidence verdict for non-evaluable items; grey does not affect the section colour.
- Submit anyway / Make adjustments; dismissal = Make adjustments (AC4).
- Re-assessment on every new submission; stored verdict reused only while saved content is unchanged (AC5 + reopen requirement).
- Timeout/failure path with explicit "submit without check" and its traceability (AC6, AC7).
- Persistence of verdict + decision + outstanding-flags + no-check fact; additive block on the bilateral detail payload (AC7).
- KP deterministic decision tree replacing the AI call.
- External payload principle: definitions only, no ids; evidence visibility flag; private files never leave PRMS.

### MODIFIED Requirements

- `PATCH center/submit-for-review/:resultId` accepts an optional `{ assessment_id, decision }` body and enriches the review-history comment.
- Client `submitResult()` no longer submits directly; it opens the assessment flow.

### REMOVED Requirements

- None. The Submit guards (read-only, unsaved, invalid) stay.

## Approach Options

| Option | How | Pros | Cons |
|---|---|---|---|
| **A. Synchronous assess + persisted verdict + separate submit** (recommended) | `POST quality-assessment` blocks up to 60 s server-side, persists, returns; client shows the window; `PATCH submit-for-review` carries the decision. | Fits the ~30 s target agreed in the meeting and the 60 s window the PO allows; no polling infra; verdict survives a closed tab because the server persists regardless of the client; two calls map 1:1 to the two user moments. | Holds one HTTP request up to 60 s; needs the front proxy / gateway to allow ≥ 65 s (R-3). |
| B. Async job + polling (mirror `bilateral_ai_jobs`) | `POST` creates a job, worker calls the AI, client polls `GET jobs/:id`. | Robust to long runs and disconnects; pattern exists. | More moving parts (job table, states, poller, resume from `localStorage` — the completion-feedback note lists the holes that pattern already had); the meeting explicitly chose "no agents, ~30 s" so the long-run benefit is moot. |
| C. Client calls the AI service directly | Browser posts the form state to the AI endpoint. | No server work for the call. | Exposes the API key; grades unsaved state (breaks AC5 semantics); no traceability (AC7); violates W8 (auth-gated, audit-logged). Rejected. |

## Recommended Approach

**Option A.** It is the smallest path that satisfies all eight ACs: one new table, two small endpoints plus an optional body on an existing one, one client service and one dialog. The server builds the payload from persisted data, which is what the client already forces (Submit refuses with unsaved sections), so "verdict over the saved content" is guaranteed by construction and `content_hash` makes the reopen case honest. Grey and the KP tree are pure functions in front of and behind the AI call, so the AI service stays generic and PRMS owns every business rule the meeting assigned to code.

## Risks, Dependencies, And Open Questions

| ID | Risk / Question | Mitigation / default |
|---|---|---|
| R-1 | Contract drift with the AI service while both sides build. | Freeze v0.1 in the vault **this week**, hand it to Daniela, add a contract fixture test on the PRMS side; version the payload (`contract_version`). |
| R-2 | Logging bodies (as the text-mining client does) would leak result narratives and evidence descriptions to CloudWatch. | Client logs ids, elapsed and colours only. Review gate: grep for `JSON.stringify(` in the new client. |
| R-3 | 60 s synchronous call vs infrastructure timeouts. The PO needs no business ceiling, but a proxy that cuts the request at, say, 29 s would show the user a raw error instead of the AC6 "submit anyway" choice. Runtime is Docker (no Lambda handler per vault); the front proxy / ALB idle timeout must still be confirmed ≥ 65 s. | Verify in TEST before the client child; if the ceiling is lower, set the default just under it (configurable). |
| R-4 | Latency budget: payload assembly for a KP or Innovation Use result with many joins could eat seconds before the call. | Reuse the detail enrichment (already p95-bounded by QAS-3 for the drawer); measure per type in `/akili-test`. |
| R-5 | Users perceive the wait as friction. | Working phase with colour tips (owner's idea), elapsed indicator, and "the AI never blocks" copy; 60 s window. |
| R-6 | `bilateral-center.controller.ts` has no guard; the new endpoints inherit JWT-only protection. | Same `assertCenterPermission` as `submitForReview`; broader guard question stays with its own spec. |
| OQ-1 | Where does the repo copy of the contract live: `docs/bilateral-module/integration-contracts.md` (recommended) or a new `onecgiar-pr-server/docs/bilateral-quality-assessment.en.md`? | Default: integration-contracts.md + a pointer in `backend.md`. |
| OQ-2 | Should the request carry the visible `result_code` (it is shown in the URL and the UI) or only an opaque `request_id`? Owner's rule is "no ids". | Default: opaque `request_id` only; `result_code` out unless Daniela needs it for their logs. |
| OQ-3 | Overall-verdict derivation rule (AC8 says it is in the QA criteria document, unreadable from here). Does the AI return the overall, or does PRMS derive it from sections? | Default: AI returns it; PRMS stores it verbatim. Confirm with Ángel/Daniela. |
| OQ-9 | Does the review guide produce a numeric affinity score per section? PO wants it captured if it exists. | Contract carries optional `score` (0–100) per section and overall; stored verbatim, nullable, never used to paint. Daniela confirms availability. |
| ~~OQ-4~~ | **Resolved (PO, 2026-09-16):** KP results that fail the deterministic tree are shown **grey** ("criteria pending"), submit anyway allowed. | Recorded as `skipped_kp_rule`. |
| ~~OQ-5~~ | **Resolved (PO, 2026-09-16):** "media" in the meeting notes is **MELIA**. | — |
| OQ-6 | Private repository evidence: send nothing (default) or the description + tags only? | Default: description + tags + `visibility: private`, no link/file, graded grey by rule. |
| OQ-7 | Should "Quality check available" on reopen show automatically or only on Submit? | Default: rail chip + opens on Submit without re-running while `is_current`. |
| ~~OQ-8~~ | **Resolved:** PRMS sub-task [P2-3698](https://cgiarmel.atlassian.net/browse/P2-3698) created under P2-3150 on 2026-09-16, assigned to Juan David Delgado. | — |

## Success Criteria

- Every Submit for review on a bilateral result produces exactly one persisted assessment row before any status change; 0 direct transitions without one in `/akili-test` scenarios.
- The window opens for green, amber and red; dismissal never changes status (Cypress/Jest scenarios).
- Payload fixture tests: 0 keys ending in `_id`, 0 numeric identifiers, 0 private links across all six result types.
- Timeout path: with the AI URL pointed at a black hole, the user gets the unavailable choice within 60 s ± 2 s and the row is stored as `unavailable`.
- Reopen: assessment shown only when `content_hash` matches; any saved edit forces a re-run.
- Server logs for the new client contain no request/response bodies (grep gate, QAS-10).
- Server Jest, client Jest + lint green on the touched modules; `migration:check` green; change-log row present.

## Next Step

```text
/akili-specify bilateral/qa-ai-traffic-light
```

Change track, standard depth. If the family split is accepted, `/akili-specify` writes `family.md` first and then the three children in the order above. Before `/akili-execute`: freeze contract v0.1 with Daniela, and confirm the proxy allows the 60 s call in TEST (R-3).
