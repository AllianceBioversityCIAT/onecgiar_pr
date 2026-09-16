# Proposal — AI-Assisted Creation: Processing Feedback, Job Lifecycle and Transparency

## 1. Document Control

| Field | Value |
|---|---|
| **Spec Path** | `bilateral/ai-processing-feedback` |
| **Slug** | `ai-processing-feedback` — derived from the free-text argument "User Experience AI-Assisted: flujo complejo de la creación…" (module `bilateral`, the flow lives in `pages/bilateral`) |
| **Type** | Change (UX + reliability). Two embedded defects are diagnosed in §9 and folded into scope rather than routed to `/akili-quick`: they need logic and tests |
| **Approval Mode** | gated (default). Say "pre-approved" if you want the cycle to run without routine pauses |
| **Author** | AKILI propose (T1 — Fable 5.1, session model newer than the registry's `opus`; registry refresh already pending) |
| **Date** | 2026-09-15 |
| **Owner** | Juan Carlos Cadavid |
| **Ticket** | none yet (`APF-OQ-1`) |
| **Depends on** | none (`bilateral/ai-drafts-redesign` and `bilateral/manual-create-drawer` are archived; this touches the upload step and the job service they left alone) |
| **Parallel-safe** | no — one spec; if chunked (§5.3) the server chunk precedes the client chunk (shared job-status contract) |
| **Baseline cited** | `docs/prd.md` US-P1 / AC-9 · `docs/ux-ui/design.md` §8 (hard rules 4, 5, 8, 21), §10 a11y · `docs/trd/trd.md` §6 frontend state, §8 async/RMQ · `onecgiar-pr-server/src/api/bilateral/CLAUDE.md` · archived `2026-07-31-bilateral-ai-workflow/bilateral-ai-integration-handoff.md` (PRMS ↔ text-mining contract) |
| **Kaizen lessons applied** | `KZ-changes--bilateral-review-center-strip-and-phase-1` (real payload shapes — job fields arrive as strings/ISO dates), `KZ-bilateral--center-overview-tab-3` (anchor widgets to live exemplars), `KZ-REH-1` (budget tests at 1.2–1.5× production) |

---

## 2. Intent

Make the AI-assisted creation flow **legible while it runs and honest when it fails**: the user always knows what stage the job is in, how long it has been running, whether they can leave, what to do when something goes wrong, and that the resulting drafts were produced by AI.

---

## 3. Problem / Current Behavior (from the code, 2026-09-15)

### 3.1 How the pipeline really works

| Layer | What happens | Where |
|---|---|---|
| Upload | `POST /api/bilateral/center/ai/jobs` (multipart: ≤ 6 sources, 25 MB each) → files to S3 → row in `bilateral_ai_jobs` (`PENDING`) → message on RMQ queue `BILATERAL_AI_PROCESSING_QUEUE` → HTTP 202 `{ jobId }` | `bilateral-ai.service.ts#createJob` |
| Consumer | Same API process, `@EventPattern`, **`prefetchCount: 1`** — one job at a time per instance. `processJob` flips `PROCESSING` (`attempts + 1`, `started_date`), calls the text-mining service **synchronously** (HTTP timeout `BILATERAL_AI_TEXT_MINING_TIMEOUT_MS`, default **10 min**), creates drafts, flips `COMPLETED` (+ email "results ready" only when `result_count > 0`). On a retryable error (5xx or network) it flips `FAILED`, rethrows, and the consumer `nack`s with requeue up to **3 attempts**; the job then flips back to `PROCESSING` on redelivery | `bilateral-ai.consumer.ts`, `bilateral-ai.service.ts#processJob` |
| Text mining | External synchronous service (`POST /prms/text-mining`): PyPDF2 (≤ 100 pages), Amazon Transcribe for audio (2 s polls, ≤ 300 s), LanceDB retrieval, one Claude call per source + a validation pass, OpenSearch entity mapping; "all or nothing" on extraction. Typical duration: minutes; audio pushes it toward the 5-min transcription ceiling | shared artifact (text-mining pipeline), handoff §5–§6 |
| Client | `BilateralAiService` (root) polls `GET …/ai/jobs/:id` every **5 s** for at most **30 min**, then declares `"Processing timed out. Please try again."` **on its own** — the server job may still be running or may complete later. State + `jobId` in `localStorage` (`prms.bilateral-ai.active-job`) so a reload or new tab resumes polling; an app-wide completion dialog fires wherever the user is; the Drafts tab badge counts new drafts | `bilateral-ai.service.ts` (`POLL_INTERVAL`, `MAX_POLL_DURATION`), `bilateral-ai-completion-dialog` |

### 3.2 What the user sees (screens in the argument)

1. **Set-up** (primary SP → AI-Assisted vs Manual) — fine; "Contributing Science Programs — coming soon" adds noise to a decision step.
2. **Upload** — clear; the CTA "Let AI Do Its Thing" is the only place the word AI carries tone.
3. **"Job Queued … This may take a few minutes"** with a spinner — the same screen for minutes. Nothing says *why* it waits, *how long* it has waited, *what* will happen next, or that a mail will arrive.
4. **"Processing Failed — Processing timed out"** twice at once: the inline panel **and** the global dialog, with a "Try Again" that re-uploads everything while the server may still be finishing the same job (a second job for the same sources).

### 3.3 Root causes (confirmed in code)

| # | Symptom | Cause |
|---|---|---|
| C1 | "Job Queued" for many minutes | `prefetchCount: 1` per API instance: while another user's job runs (up to 10 min per attempt), everyone else's job stays `PENDING`. The UI has no queue position, no elapsed time, no expectation |
| C2 | "Processing timed out" while the job is still alive | The 30-min ceiling is **client-side** (`MAX_POLL_DURATION`); the server never times a job out or sweeps stale ones. The client reports a failure the server did not have; if the job later completes, the user gets a "results ready" mail contradicting the screen |
| C3 | Retry storm invisible to the user | Retryable failures flip `FAILED → PROCESSING` up to 3× (each up to 10 min); the client shows "Analyzing Content" the whole time, and `attempts` is in the payload but never shown |
| C4 | Double error UI | Inline failed panel + global completion dialog both fire from the same `announce('failed')` when the uploader is still on the page |
| C5 | Silent no-mail cases | Mail is sent only for `COMPLETED` with drafts; `FAILED` and "no candidates" rely on the user still having a tab open |
| C6 | No AI provenance on the result itself | Drafts show an "AI Result" badge (`section-zero-dashboard`, Drafts cards); a **promoted** result carries `creation_method = 'AI'` / `is_ai_generated` but the editor and detail views show no "created with AI assistance — review before submitting" notice |
| C7 | No server-side stage | Status has four values; the text-mining call is one opaque HTTP request, so a real progress bar cannot be honest without either stage callbacks from the mining service or an elapsed-time model |

---

## 4. Proposed Outcome

- While a job runs, the user sees a **staged, time-aware status**: *Queued (position n, waiting for a free worker)* → *Uploading to the AI service* → *Reading documents / transcribing audio* → *Extracting results* → *Validating and mapping* → *Creating drafts*, with elapsed time, an expected range, the attempt number when > 1, and an explicit "**You can leave this page** — we will notify you here and by email" line.
- The client **never invents a failure**: at the polling ceiling it shows "still running — we'll email you" and keeps the job resumable; only the server declares `FAILED` or `TIMED_OUT`.
- The server **owns the lifecycle**: hard job timeout, stale-job sweeper, bounded retries visible in status, and a notification (in-app + mail) for every terminal state, not only success.
- Errors arrive **once**, in one place, with a cause the user can act on (source rejected, service unavailable, timed out, no candidates), and "Try again" never duplicates a job that is still alive.
- Every AI-produced artefact carries a **transparency notice**: on the drafts, on the promoted result's editor and detail views, and in the completion dialog ("Generated with AI from your sources — review and edit before submitting").

---

## 5. Scope

### 5.1 Server (`onecgiar-pr-server/src/api/bilateral-ai/`)

1. Job **stage** field (`stage: 'queued' | 'uploading' | 'reading' | 'extracting' | 'validating' | 'creating_drafts'`) + `stage_updated_date`, set by `processJob` at each step it controls; `queue_position` computed on `getJob` (count of older `PENDING` jobs).
2. **Hard timeout** per attempt (`BILATERAL_AI_ATTEMPT_TIMEOUT_MS`, default 15 min = mining timeout + margin; resolved at specify/JD-1 — `APF-OQ-6`) and a **stale sweeper** (interval) that flips `PROCESSING` jobs past the timeout to `FAILED/TIMED_OUT` and `PENDING` jobs never picked up (consumer down) to `FAILED/QUEUE_STALLED` after N min.
3. Retry semantics visible: keep `attempts`, add `max_attempts` to the payload; a retry keeps status `PROCESSING` with `retrying: true` instead of bouncing through `FAILED`.
4. Notifications for **every terminal state**: mail templates for failed / timed-out / no-candidates (today only results-ready), plus an in-app notification row so a user who closed the tab sees it in the bell.
5. Idempotent **"Try again"**: `POST …/ai/jobs/:id/retry` re-enqueues the same sources (no re-upload) and refuses while the job is still `PROCESSING`.

### 5.2 Client (`onecgiar-pr-client/src/app/pages/bilateral/`)

6. **Processing panel** redesign (`bilateral-ai-upload`): stage stepper + elapsed timer + expected range + queue position + attempt badge + "you can leave" line with the two notification channels named; reduced-motion safe; tokens only (`design.md` §7).
7. **Polling ceiling → "still running"** state (no client-side failure); resume record survives beyond 30 min while the server says the job is alive.
8. **Single error surface**: the global completion dialog is the one voice when the user is *off* the upload step; the inline panel when they are *on* it — never both. Error copy by `error_code`.
9. **Set-up step polish**: hide or collapse the "coming soon" contributing-SP block behind a disclosure; keep the two creation cards.
10. **AI transparency**: notice on the drafts list header, on each AI draft card (exists — align copy), on the promoted result editor (`section-general-info` / `bilateral-result-creator` header) and result detail, and in the completion dialog. Copy owned by the product team (`APF-OQ-2`).
11. Answer the user's question in the product: a persistent, dismissible **"AI job running" chip** in the bilateral header (next to the drafts badge) while a job is alive, linking back to the processing panel — so leaving the page is a supported path, not a hidden one.

### 5.3 Chunking recommendation (RICE order)

| Chunk | Content | Reach · Impact · Confidence · Effort | Order |
|---|---|---|---|
| A — `bilateral/ai-job-lifecycle` (server) | §5.1 items 1–5 | every AI user · high (kills C2/C3/C5) · high · M | 1 |
| B — `bilateral/ai-processing-feedback` (client) | §5.2 items 6–11 | every AI user · high (C1/C4/C6/C7) · medium (copy pending) · L | 2 (depends on A's status contract) |

Ship as **one spec with two phases** unless you want independent PRs; if split, `family.md` is written before any child folder and B declares `Depends on: A`, `Parallel-safe: no`.

---

## 6. Non-Goals

- Changing the text-mining service itself (owned by the mining team; its synchronous contract stays — stage granularity beyond what PRMS controls needs their callbacks, `APF-OQ-3`).
- Increasing `prefetchCount` or scaling consumers (an infra decision; the UI must be honest under today's serial worker first).
- Redesigning the drafts cards or the manual form (archived specs).
- Real-time WebSocket push (polling stays; interval may adapt by stage).

---

## 7. Affected Users, Systems, and Specs

| Who / what | Effect |
|---|---|
| Center staff using AI-Assisted creation | Clear waiting state, honest outcomes, can leave and come back |
| SP reviewers | Transparency notice on AI-originated results |
| Server `bilateral-ai` module, RMQ consumer, email templates, notification module | New fields, sweeper, retry endpoint, templates |
| Client `bilateral-ai.service.ts`, `bilateral-ai-upload`, `bilateral-ai-completion-dialog`, `bilateral-page-header`, drafts/editor views | Panel, chip, states, copy |
| `/api/bilateral/*` payload contract | `GET ai/jobs/:id` gains fields (additive) → `bilateral-result-summaries.en.md` change log **must** be updated (root rule) |
| Related specs | archived `bilateral-ai-workflow` (contract), `ai-drafts-redesign` (cards), `manual-create-drawer` (set-up drawer) |

---

## 8. Visual Reference

- Source: **Screenshots provided by the user** (6: set-up, upload empty, upload with file, queued ×2, failed with double dialog) + generated mockup **recommended, not yet produced**.
- Location: screenshots are in the conversation only — `/akili-specify` should save the processing-panel mockup under `docs/specs/bilateral/ai-processing-feedback/mockup/` (self-contained HTML, same approach as `center-overview-tab`).
- Notes: the mockup must show the stepper across the four live states (queued with position, processing with elapsed/attempt, still-running past ceiling, terminal) and the header chip.

---

## 9. Requirement Delta Preview

### Embedded defects (diagnosed, folded into scope — not separate bug specs)

| Defect | Reproduction | Root cause | Fix home |
|---|---|---|---|
| D-1 "Processing timed out" while the job is alive | Upload with a slow mining response > 30 min (or freeze the consumer) → client shows failed; server row still `PROCESSING`/later `COMPLETED` + mail | Client-side `MAX_POLL_DURATION` declares failure | §5.1-2 + §5.2-7 |
| D-2 Double error surfaces | Stay on the upload step until a failure → inline panel and dialog both open | `announce()` sets `completionNotice` regardless of where the user is | §5.2-8 |

### ADDED

- Job `stage`, `queue_position`, `max_attempts`, `retrying`, `TIMED_OUT` / `QUEUE_STALLED` error codes; server timeout + stale sweeper; retry endpoint; failure/no-candidates/timeout notifications (mail + in-app).
- Client processing stepper with elapsed time and expectation; "still running" state; header "AI job running" chip; transparency notices on drafts, editor, detail, dialog.

### MODIFIED

- Polling never ends in a client-declared failure; interval may lengthen after the first minutes.
- Completion dialog suppressed while the uploader is on the processing panel (inline panel shows the outcome instead).
- "Try again" re-enqueues the existing job's sources instead of re-uploading.
- Set-up step: "coming soon" block collapsed.

### REMOVED

- The client-side "Processing timed out. Please try again." message.

---

## 10. Approach Options

| Option | Description | Trade-offs |
|---|---|---|
| **1. Honest stages + server-owned lifecycle** (recommended) | Stages set by PRMS's own `processJob` steps (queued / uploading / reading-or-transcribing inferred from source types / extracting / validating / creating drafts), elapsed-time expectation computed from source mix; server timeout, sweeper, retry endpoint, all-state notifications; client redesign on top | Real progress is coarse (the mining call is one opaque step ≈ 60–80 % of the time) but every displayed word is true; no dependency on the mining team; the largest chunk is UI |
| 2. Fine-grained progress via mining callbacks | Ask the mining service to emit stage/progress webhooks (transcribing 40 %, extracting source 2/3…) and stream them to the client | Best UX, but blocked on another team's roadmap (`APF-OQ-3`); PRMS work still needs Option 1's lifecycle fixes first |
| 3. UI-only polish | Better copy/animation on the existing four states; keep the 30-min client timeout | Cheapest, but leaves C2/C3/C5 (false failures, invisible retries, silent failures) in place — the complaints in the argument recur |

## 11. Recommended Approach

**Option 1.** It fixes the two defects and the "why does it take so long" question with facts PRMS already has (`attempts`, `started_date`, `created_date`, source counts, queue depth), needs no change from the mining team, and leaves a clean seam for Option 2 later (a `stage` field the mining callbacks would simply refine). Smallest safe path: server first (stage + timeout + sweeper + notifications + retry), then the client panel/chip/transparency on the new contract.

---

## 12. Risks, Dependencies, and Open Questions

| Kind | Item |
|---|---|
| Risk | Elapsed-time "expected range" must be derived from real job history (median per source mix from `bilateral_ai_jobs`), not invented — otherwise it is a new lie. Requires a small read query on `started_date/completed_date`. |
| Risk | The stale sweeper must never flip a job the mining service is still legitimately processing; the per-attempt timeout must exceed the mining HTTP timeout (10 min) plus margin, and a stall is declared only when no worker activity is visible (JD-1 JA-1), and a completed job arriving after `TIMED_OUT` must still create drafts (idempotent completion). |
| Risk | Two notification channels (mail + in-app) can double-notify; define one rule (in-app always, mail for terminal states after ≥ 2 min of processing). |
| Dependency | Email templates live in the DB `template` table (`EmailTemplate.BILATERAL_AI_RESULTS_READY`); new templates need a data migration + the RMQ email microservice. |
| Dependency | `/api/bilateral/*` doc change log (`bilateral-result-summaries.en.md`) for the additive job fields. |
| `APF-OQ-1` | Jira ticket id. |
| `APF-OQ-2` | Transparency copy and placement (product/comms): wording in English, whether the notice persists after the result is edited by a human, and whether SP reviewers see it. |
| `APF-OQ-3` | Will the mining team expose stage callbacks or a progress endpoint (enables Option 2)? |
| `APF-OQ-4` | Is `prefetchCount: 1` intentional (cost control on Bedrock) or incidental? Decides whether "queue position" is a permanent UI element. |
| `APF-OQ-5` | Should a user be able to **cancel** a queued job (delete the RMQ message is not possible; a `CANCELLED` status the consumer honours before calling mining is)? |

---

## 13. Success Criteria

- A tester who leaves the page during processing can state, from the UI alone, where the job is, how long it has run, and how they will be told the outcome.
- No client-declared timeout exists; every `FAILED`/`TIMED_OUT` shown to a user matches a server row with an `error_code`, once, in one surface.
- A job that waits behind another shows "Queued · position n" within one poll; a job in its second attempt shows "Retrying (2 of 3)".
- Every terminal state produces exactly one in-app notification and, for jobs > 2 min, one mail; `FAILED` and no-candidates included.
- "Try again" on a failed job creates no new upload and is disabled while the job is alive.
- Every AI-originated draft, editor view, detail view and completion dialog carries the transparency notice (copy per `APF-OQ-2`).
- Regression tests: client service (ceiling → still-running; single surface), server (`processJob` stages, sweeper, retry endpoint, notification per terminal state), CT for the processing panel at 1280 / 900 / 375.

---

## 14. Next Step

```text
/akili-specify bilateral/ai-processing-feedback
```

Standard depth (server contract change + multi-component client work + notifications). If you prefer two PRs, say so and the specify run writes `family.md` with chunks A (server lifecycle) and B (client feedback) in that order.
