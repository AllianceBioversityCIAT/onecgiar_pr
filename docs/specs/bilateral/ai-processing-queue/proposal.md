# Proposal: Bilateral AI Processing Queue

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `docs/specs/bilateral/ai-processing-queue/` |
| Type | Change |
| Approval Mode | gated |
| Ticket | P2-3853 (INC-163067) — parent epic P2-2338 "Enhancements 2026" |
| Branch | `JuanGuzman-io/p2-3853-jira-understanding` (contains all of `performance-refactor`) |
| Date | 2026-09-29 |
| Author | Juan David Delgado (decisions) · Claude (draft) |
| Builds on | `docs/specs/archive/2026-09-15-bilateral--ai-processing-feedback/` (`APF-*`) |
| Depends on | none |
| Parent Spec | none |

## 2. Intent

A Center user can start AI text mining for several projects in a row without being blocked. Up to **two jobs from different users** run at the same time, the rest wait in a fair queue, and a dedicated **"AI processes" drawer** shows, in near real time, where each job is and that it will finish without the user having to do anything.

## 3. Problem / Current Behavior

| # | Current behavior | Evidence |
|---|---|---|
| P1 | The client tracks **one** job: a single `activeJob`, one `uploadState`, one polling timer and one localStorage key `prms.bilateral-ai.active-job`. | `onecgiar-pr-client/src/app/pages/bilateral/services/bilateral-ai.service.ts:41,69,91,94` |
| P2 | The upload form renders only when `uploadState().status` is `idle`/`uploading`; while a job is alive the processing panel replaces it, so no second job can be started — for any project — from that browser (all tabs share the localStorage key). This is the reported block. | `components/bilateral-ai-upload/bilateral-ai-upload.component.html:1,329-339` |
| P3 | The lock is **per browser, not global**: the server accepts any number of jobs (`POST center/ai/jobs` → `PENDING` + publish, 202). | `onecgiar-pr-server/src/api/bilateral-ai/services/bilateral-ai.service.ts:117-176` |
| P4 | The server already queues: RMQ consumer with `prefetchCount: 1`, so **exactly one job runs at a time across all users and Centers**. Two users submitting together wait on each other. | `onecgiar-pr-server/src/main.ts:82-93` |
| P5 | `queue_position` is computed at read time as the count of `PENDING`/`PROCESSING` jobs with an older `queue_entry_date` — global, strict FIFO. | `services/bilateral-ai.service.ts:186-208` |
| P6 | There is no dedicated UI for jobs: the inline panel (`app-ai-processing-panel`) and a header chip (`APF-R-10`, gated to the job's own Center) describe the single tracked job; completion elsewhere opens a global modal (`APF-R-8`). | `components/bilateral-page-header/bilateral-page-header.component.ts:52-66`; `services/bilateral-ai.service.ts:81-89,277-278` |
| P7 | Terminal in-app notification already exists (bell, `BILATERAL_AI_JOB_FINISHED`); outbound AI emails are suppressed by client mandate. | `onecgiar-pr-server/src/api/notification/enum/notification.enum.ts:29`; `services/bilateral-ai-notifications.service.ts:113` |
| P8 | Reading/extraction happens inside AI Assisted (one `POST /prms/text-mining`, 10 min timeout). Time is dominated by **in-service processing, which scales with the document** (~30 s vs ~110 s for two 1-PDF jobs); the Lambda cold start adds only **~7 s**. | `services/bilateral-ai-text-mining.service.ts:41-45`; spike §12.1 |
| P8b | Recent single-document jobs in `bilateral_ai_jobs` (test): queue wait ≈ 0 s, run 16–140 s; one doc+audio job 435 s. | Read-only query 2026-09-29, 15 latest `COMPLETED` rows |
| P9 | Number of API containers consuming the RMQ queue in prtest/prod. | `UNVERIFIED — confirm at source before relying on it` (owner: Juan David / Cris) |

## 4. Proposed Outcome

| Outcome | Behavior |
|---|---|
| **Never blocked** | After submitting, the upload form resets immediately; the user can pick another project and submit again. The job appears in the drawer at once ("Added to the queue"). |
| **Two lanes, one per user** | At most **2** jobs run globally, at most **1** per user. Waiting jobs start in `queue_entry_date` order, skipping only jobs whose owner already has one running. |
| **Honest, reassuring feedback** | Every job shows its stage, elapsed time and *why* it is waiting ("Waiting for your previous job" / "Waiting for a free lane · N ahead"). Copy states plainly that processing time depends on the evidence (from ~30 s to a few minutes, longer with audio) and that results land in Drafts. Running jobs show the existing per-mix expected range (`APF-R-6` D, `GET center/ai/expectations`); waiting jobs show position, never an ETA (§12.1: output and time are non-deterministic). |
| **Dedicated drawer** | A new "AI processes" drawer, opened from the header trigger (badge = active jobs), lists the user's jobs grouped **Running / Waiting / Finished**, with "View drafts" and "Try again" in place. |
| **Isolation** | Each job's drafts stay tied to its own `project_id` (already true per job; re-verified with two concurrent jobs). |

**Worked example** — submissions A1, A2, B1, C1 (letters = users):

| t | Running | Waiting | Why |
|---|---|---|---|
| 0 | A1, B1 | A2, C1 | 2 lanes used; A2 blocked by A1 |
| B1 done | A1, **C1** | A2 | C1 is the oldest eligible (A2's owner still running) |
| A1 done | C1, **A2** | — | A2 now eligible |

## 5. Scope

| In | Detail |
|---|---|
| Server — fair dispatch | DB-arbitrated claim: a job starts only if `running < BILATERAL_AI_MAX_CONCURRENT` (default 2) and its owner has `< BILATERAL_AI_MAX_PER_USER` (default 1) running. Ineligible messages are parked (ack, stay `PENDING`); every terminal transition (and the sweeper tick) re-dispatches the oldest eligible jobs. |
| Server — list endpoint | `GET center/ai/jobs` — the caller's active + recently finished jobs with per-job wait reason and position, plus a queue summary (lanes in use, jobs ahead). One poll for N jobs. |
| Server — sweeper | `QUEUE_STALLED` must not fire for a job that is only waiting on its owner's running job. |
| Client — multi-job service | `BilateralAiService` tracks a set of jobs (list in localStorage, resume on reload), one batched poll with the existing adaptive cadence (`APF-R-7`). |
| Client — drawer + trigger | New "AI processes" drawer; header chip becomes its trigger with active-count badge. Inline panel shrinks to a "Sent to the queue → View in AI processes" confirmation. |
| Client — completion | Per-job completion = toast + drawer badge + existing bell; the blocking global modal (`APF-R-8`) no longer fires once per job. |
| Copy | All strings via `src/app/internationalization/` (design.md DD-9). |
| Contract doc | New/changed `center/ai/*` responses recorded in `onecgiar-pr-server/docs/bilateral-result-summaries.en.md` change log (as `APF` D9 did). |

## 6. Non-Goals

- Making AI Assisted read faster (ticket AC6/AC7) — measured in §12.1: the time is in-service processing, not PRMS queueing nor Lambda cold start. Decided by product owner 2026-09-29.
- Raising the defaults beyond 2 / 1 — they are env-tunable, but changing them is an ops decision.
- Showing other users' jobs in any detail — others appear only as an anonymous count ("N ahead").
- Real-time push (sockets are off; "real time" = adaptive polling).
- Re-enabling AI emails.
- Cancelling a waiting job (see OQ-3).

## 7. Affected Users, Systems, And Specs

| Area | Impact |
|---|---|
| Center users (bilateral AI reporting) | Primary beneficiaries. |
| `onecgiar-pr-server/src/api/bilateral-ai/` | `bilateral-ai.service.ts` (`attemptStart`, `processJob`, `getJob`, new list), `bilateral-ai.consumer.ts`, `bilateral-ai-sweeper.cron.ts`, `bilateral-ai.config.ts`, controller. |
| `onecgiar-pr-server/src/main.ts` | `prefetchCount` for the AI queue ≥ max concurrency. |
| `onecgiar-pr-client/src/app/pages/bilateral/` | `services/bilateral-ai.service.ts`, `bilateral-ai-job.model.ts`, `components/bilateral-ai-upload`, `components/ai-processing-panel`, `components/bilateral-page-header`, `components/bilateral-ai-completion-dialog`, new drawer component, `shared/services/api/bilateral-api.service.ts`. |
| Archived spec `APF` | **Modifies** `APF-R-1` (position semantics), `APF-R-6` (panel role), `APF-R-8` (single-surface modal), `APF-R-10` (chip → drawer trigger). Keeps `APF-R-2/3/5/7/9`. |
| Migrations | Probably none (no new columns expected); confirm at `/akili-specify`. |

## 8. Visual Reference

- Source: Self-contained HTML mockup (Stitch / Claude Design MCP not available in the session).
- Location: `docs/specs/bilateral/ai-processing-queue/mockup/ai-processes-drawer.html` (open via `file://`; "Play queue" simulates the worked example).
- Covers: desktop drawer (Running / Waiting / Finished, lanes strip, footer expectation copy); submit confirmation with the form reset; toasts; header trigger states (idle / working / done); "taking longer" calm state; empty drawer; 375 px full-screen sheet. Status: draft, pending product-owner review.
- Notes: UI is the most sensitive part of this change (product owner: "must feel high-quality and modern"). Must follow design.md §7 brand line (violet accent gradient, `material-icons-round`, Tailwind-first, Spartan/`pr-*`), §6 drawers (full-screen sheet below `sm`), §10 a11y (`aria-live`, keyboard, focus, reduced motion).

## 9. Requirement Delta Preview

### ADDED

- Fair two-lane dispatch (global cap + per-user cap, env-tunable, enforced in DB regardless of container count).
- `GET center/ai/jobs` list with per-job `wait_reason` (`own_job_running` | `no_free_lane` | `starting`, the last added at `/akili-specify`), `jobs_ahead`, and a queue summary.
- "AI processes" drawer: Running (stage stepper from server stages, elapsed time), Waiting (reason + position, animated reorder), Finished (result count → View drafts; failed → Try again), empty state.
- Header trigger with active-job badge and subtle progress ring; available on every bilateral page.
- Expectation copy at submit and in the drawer (warm-up / long evidence / "you can leave, results go to Drafts"); a calm "still running, nothing to do" state instead of anything error-like.
- Multi-job persistence and resume after reload.

### MODIFIED

- Upload form is never replaced by a job; it resets after submit (was: replaced while a job is alive — P2).
- `queue_position` reflects fair order, not strict FIFO (was `APF-R-1`).
- Inline processing panel becomes a compact confirmation that links to the drawer (was the full job surface, `APF-R-6`).
- Completion surfaces: toast + badge + bell per job (was one global modal, `APF-R-8`).
- Header chip: trigger for all of the user's jobs, not only the one tracked job of this Center (was `APF-R-10`).
- Stall sweeper ignores jobs waiting only on their owner's running job.

### REMOVED

- Single-job localStorage record `prms.bilateral-ai.active-job` (migrated to the list format on first load).

## 10. Approach Options

| Option | How | Pros | Cons |
|---|---|---|---|
| **A. Client-only** | Multi-job client + drawer; keep `prefetchCount: 1`. | Smallest diff; no server risk. | Two users still wait on each other — misses the owner's lane decision. |
| **B. RMQ-only gating** | `prefetchCount: 2`; consumer checks the owner in memory and nacks/requeues busy owners. | Few lines. | Cap multiplies per container; nack-requeue spins and reorders the queue; in-memory check races across containers. |
| **C. DB-arbitrated claim + parking** ✅ | Message stays "run job X". Claim under a MySQL `GET_LOCK`: start only if lanes and owner allow; otherwise ack and leave `PENDING` (parked). Every terminal transition and each sweeper tick re-publishes the oldest eligible jobs. Duplicate messages are harmless (the claim is conditional, as today). | Correct with any number of containers; keeps today's retry/ack semantics (`APF-R-3`) for claimed jobs; order lives in the DB, which already drives `queue_position`. | More server logic; re-dispatch must be idempotent and tested with two consumers. |

## 11. Recommended Approach

**Option C + the new drawer.** It is the smallest option that meets the lane decision safely: the cap does not depend on how many containers consume the queue (P9 unknown), parked jobs never spin, and the retry path of claimed jobs is untouched. The client work (multi-job service + drawer) is the same in A and C, so C adds only the server dispatch.

## 12. Risks, Dependencies, And Open Questions

| # | Item | Mitigation / owner |
|---|---|---|
| R1 | A parked job is never re-published (crash between terminal write and publish). | Sweeper tick also re-dispatches; test the crash path. |
| R2 | Concurrent calls to AI Assisted degrade or fail. **Measured (§12.1):** 2 and 3 concurrent calls returned 200, no 429/5xx, no cross-document leakage; the short doc was unaffected by concurrency. For the long doc, time tracks the number of results rather than concurrency: 4 results ≈ 115 s alone; 5 ≈ 128 s and 6 ≈ 163–183 s under 2–3 concurrent calls. Any concurrency penalty is small next to that variance. | Cap 2 is supported by evidence; stays env-tunable (fallback `MAX_CONCURRENT=1` = today). Watch p95 run time after release. |
| R6 | Mining output is non-deterministic: the same document gave 4 / 4 / 6 results with differing titles across runs. | Any AC7 quality comparison needs several runs per document, not one. |
| R3 | Time comparisons across hosts (consumer vs sweeper). | Apply `ai-processing-feedback` kaizen **L3**: every timestamp write/compare in DB time (`bilateralAiDbNow`, `DATE_SUB(NOW(), …)`); HITL with consumer and sweeper on different `TZ`. |
| R4 | Header layout regressions at 375 px. | Apply kaizen **L1** (measure baseline overflow before gating) and **L2** (keep base utility classes). |
| R5 | Removing the global completion modal changes a shipped behavior (`APF-R-8`). | Confirmed in scope by product owner; record as MODIFIED. |
| OQ-1 | How many API containers consume the queue (P9)? | Juan David / Cris — affects test plan, not the design. |
| OQ-2 | How long do finished jobs stay in the drawer (e.g. last 24 h / last 10)? | Decide at `/akili-specify`. |
| OQ-3 | Allow cancelling a waiting job? Out of scope unless asked. | Product owner. |
| OQ-4 | AI Assisted reports `Priority: Low` on PRMS calls. Does a priority setting exist that PRMS could raise? | AI Assisted team. |

### 12.1 Pre-implementation spike (2026-09-29)

Direct calls to AI Assisted `POST /prms/text-mining` (Development environment, bypassing the PRMS API — no jobs or drafts created), with two real PDFs already in the test bucket: **A** = *Political economy of green input subsidies* (job `4549e36f`), **B** = *Climate Resilience Workshop Report* (job `534aa2d5`). "Service" = `Time taken` reported by AI Assisted in its Slack channel. Script: session scratchpad `spike/mining-spike.js`, not committed.

| Run | Doc | Measured by PRMS | Service | Overhead | Results |
|---|---|---|---|---|---|
| 1 — first call after ~6 h idle | A | 127.2 s | 116.0 s | 11.2 s | 4 |
| 2 — warm, sequential | A | 115.5 s | 111.0 s | 4.5 s | 4 |
| 3 — warm, sequential | B | 34.8 s | 30.5 s | 4.3 s | 2 |
| 4 — 2 concurrent | B | 32.4 s | 28.2 s | 4.2 s | 2 |
| 4 — 2 concurrent | A | 182.9 s | — | — | 6 |
| 5 — 3 concurrent | B | 34.2 s | — | — | 2 |
| 5 — 3 concurrent | A | 128.1 s | — | — | 5 |
| 5 — 3 concurrent | A (2nd copy) | 162.5 s | — | — | 6 |

**Conclusions**

1. **Cold start is not the problem:** ~7 s (11.2 s vs a steady ~4.3 s overhead). The wait users feel is in-service processing, driven by the document (~30 s vs ~110 s).
2. **Two lanes are safe:** 2 and 3 concurrent calls all returned 200 and stayed isolated per document; the short document is unaffected, and the long one's time appears to follow how many results it generates (4 → ~115 s, 5 → ~128 s, 6 → ~165–185 s) more than how many calls run at once. With 7 calls this is a correlation, not a proof.
3. **Speed (AC6/AC7) belongs to AI Assisted**, which confirms the Non-Goal with data. PRMS can only set honest expectations ("from ~30 s to 2–3 min depending on the document").

## 13. Success Criteria

- Two different users submitting at the same time both reach `PROCESSING` without waiting on each other; a third user's job waits and shows "Waiting for a free lane".
- A user can submit for Project A and then Project B without any block; A runs, B waits with "Waiting for your previous job", then runs automatically.
- No more than 2 jobs are ever `PROCESSING` at once, verified with two consumers running.
- The drawer reflects each state change within one polling interval, is fully keyboard-operable, announces changes via `aria-live`, and passes the 375 / 900 / 1280 px layout checks.
- Drafts from concurrent jobs are attached to their own projects only.
- Ticket AC1–AC5 satisfied; AC6/AC7 explicitly deferred (Non-Goals).

## 14. Next Step

```text
/akili-specify bilateral/ai-processing-queue
```
