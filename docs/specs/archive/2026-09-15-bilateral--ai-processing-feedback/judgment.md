# Judgment Day — `bilateral/ai-processing-feedback` (design review)

## Transaction

| Field | Value |
|---|---|
| Target | `requirements.md` + `design.md` + `mockup/ai-processing-panel.html` + `proposal.md` (immutable snapshot, 2026-09-15, tree at `2c818e451` + uncommitted spec files) |
| Mode | judgment_day (blind dual review; replaces 4R for this target) |
| Judges | A = opus (18 findings) · B = sonnet (5 findings) — author = session model (Fable 5.1); author ≠ auditor |
| Round | 1 — both verdicts received 2026-09-15 14:41 UTC; ledger frozen |
| Counts | CRITICAL 6 (JA-1, JA-2, JA-3, JA-4, JA-5, JB-1) · WARNING 13 · SUGGESTION 4 · contradictions between judges 0 · both-judge confirmations 0 (disjoint finding sets) |
| Leader corroboration | JA-4 and JB-1 verified against the code by the Leader (`colors.scss` has no `--pr-status-rejected-*`, only `--pr-danger*`; every notification read path `innerJoin`s `obj_result`). JA-1/2/3/5 are design-logic defects the Leader confirms by reading the cited lines. |
| Status | **approved (fix-only, no re-judgment)** |

## Findings ledger (frozen)

| ID | Sev | Where | Finding (condensed) | Fix proposed |
|---|---|---|---|---|
| JA-1 | CRITICAL | design §5 sweeper, §2.2 | With `prefetchCount: 1`, a job legitimately waits with `started_date IS NULL` while jobs ahead run (up to 3 × 10 min each); a fixed 30-min stall window kills healthy queued jobs — the very case `APF-R-1` A describes | Gate the stall on "no job anywhere advanced within the window" (consumer liveness), or scale the window by `queue_position × per-attempt timeout` |
| JA-2 | CRITICAL | design §5 retry endpoint | `retryJob` keeps `created_date`, so a retried job is instantly older than the stall window and gets re-flipped on the next sweep; `queue_position` under-counts and the elapsed timer counts from the original upload | Queue-entry clock = `COALESCE(retried_date, created_date)` for sweeper, position and client timers; state it in §5, §6.2, §8 |
| JA-3 | CRITICAL | design DD-3 vs req `APF-R-2` A, mockup state 4 | Timeout unit contradicted: requirement sizes 35 min as whole-job; DD-3 says per attempt (worst case 105 min) and, since the mining client aborts at 10 min, a per-attempt 35-min `TIMED_OUT` is unreachable for a live job | Pick one: per-attempt ≈ mining timeout + margin (~15 min, catches a dead consumer) **or** whole-job with `first_started_date`; align `APF-OQ-6`, `APF-AC-3`, mockup |
| JA-4 | CRITICAL | design §6.3 outcomes / provenance | `--pr-status-rejected-fg/bg` do not exist (five fixed status pairs + `--pr-danger` family); every named gate (hex/`pi pi-`/`rgba`) is blind to a wrong `var()` name | Use `--pr-danger` / `--pr-danger-soft`; add a gate that greps new templates for `var(--pr-…)` names absent from `colors.scss` |
| JA-5 | CRITICAL | design §5 late completion, §13 | `createDraftFromCandidate` saves a `Result` row before the draft row; a unique key on `(job_id, candidate_index)` makes the second run throw (job → FAILED) and leaves orphan `Result` rows | Specify an upsert: look up the draft for `(job_id, candidate_index)` and reuse its `result_id` / skip; move out of §13 — it gates a MUST |
| JB-1 | CRITICAL | design §5 notifications, §6.4 | Every notification read path (`getAllNotifications`, pop-ups, recent activity) `innerJoin`s `obj_result` and requires `obj_result_by_initiatives.initiative_role_id = 1`; a job row has no result (FAILED) and AI results link via `results_by_projects` — the in-app row never renders, `APF-R-4` unmeetable as designed | Add a job-type branch to the read paths (or a dedicated read for `BILATERAL_AI_JOB_FINISHED` rows with `result_id NULL`) and state it in §5/§6.4 |
| JA-6 | WARNING | design §3.1, §2.2, §6.3 | Stage vocabulary left implicit; combined `reading+transcribing` is 20 chars in `varchar(20)`; "Uploading" copy missing | Enumerate the exact string set; `varchar(32)`; add the copy line |
| JA-7 | WARNING | design §4.1 | `GET …/ai/jobs/expectations` collides with `GET …/ai/jobs/:jobId` unless declared first | Move to `…/ai/expectations`; controller test |
| JA-8 | WARNING | design §5 vs req `APF-R-6` D | Mix classes: requirement 2 (documents / audio present), design 3 (documents / audio / mixed) | One count, restated in §4.1 enum, panel copy and `APF-AC-8` |
| JA-9 | WARNING | design DD-3 challenge | `processJob` clears `error_*` at attempt start (erases the "last error" the retry panel shows); nowhere resets `retrying` to 0 | Preserve `error_*` on attempt start; clear `retrying` in the same statement; list both in DD-3 |
| JA-10 | WARNING | design DD-6 challenge | "Dropped on 404" is new behaviour — today's poller swallows every error; removing the ceiling leaves polling with no terminating condition until it is written | State `pollJob` branches on HTTP status; service test "404 → record dropped, timer stopped" |
| JA-11 | WARNING | req `APF-R-22` vs design §6.4 | Orphan SHOULD: notification copy carries neither mix nor duration | Extend §6.4 strings or defer in §13 |
| JA-12 | WARNING | req `APF-R-6` A vs design | Orphan clause: "update position without flashing" has no design home / test | Panel is input-driven with no internal loading state; add assertion |
| JA-13 | WARNING | design §6.2 `errorCopy` | Eight codes mapped, server emits any `HTTP_<status>`; no default arm | Default arm + test one unmapped code |
| JA-14 | WARNING | req §9 D3 vs DD-7 | Gate described via the router; the design decides by `panelVisible` — a router-only test proves nothing | Restate D3 as `panelVisible` true/false |
| JA-15 | WARNING | req §9 D10 vs design §10 | `motion-reduce` class presence in jsdom evaluates no media query | Move to CT or record as unmeasured |
| JA-16 | WARNING | design §5 notifications | The reused emitter drops recipients equal to the emitter; an uploader-addressed row writes nothing while call-count mocks pass | Write the row directly (like `emitApplicationAnouncement`); assert the persisted row |
| JB-2 | WARNING | design §5 retry semantics | Consumer's hardcoded `maxRetries = 3` vs `BILATERAL_AI_MAX_ATTEMPTS` in `processJob` — a mismatch strands a `retrying=1` job | Both read the same config |
| JB-3 | WARNING | design §5 conditional transitions | No explicit early return when `processJob`'s opening conditional update affects 0 rows (sweeper won) — mining would be called for a terminated job | Explicit early return on the opening miss |
| JA-17 | SUGGESTION | design §6.2 vs mockup | Chip placement: design "left of the drafts badge", mockup right of it | Pick one (affects 375 px CT) |
| JA-18 | SUGGESTION | design §12 | Only two DDs cite a requirement id | Add the covered `APF-R-n` to each DD |
| JB-4 | SUGGESTION | design §14 vs req §2 | "6 stages" (UI steps) vs 7 server `stage` values | Say "6 UI steps"; enumerate server values (ties to JA-6) |
| JB-5 | SUGGESTION | req `APF-OQ-6` vs design §5 | 35-min default stated as settled without citing the open question | Cite `APF-OQ-6` (resolved by JA-3's decision) |

Judge A count-contrast pass: consistent — 10-min mining timeout, 3 attempts, 60-s sweeper, 30-min client ceiling, 5/15/30-s intervals vs 12/4/2 per-minute budget, 2-min mail rule, 5 samples, P25–P75, 90 days, 160-px blocks, 5 provenance surfaces, 10 tasks, 4,800 LOC (tests at 1.3× sum exactly). Failed — JA-1, JA-2, JA-3, JA-8.

## Correction rounds

### Round 1 — fix only (user decision 2026-09-15)

All 23 findings applied as recorded below. **No re-judgment** — project practice is one fix pass on a frozen ledger; the ledger above stays as judged. Files: `R` = `requirements.md`, `D` = `design.md`, `M` = `mockup/ai-processing-panel.html`.

| ID | Decision applied | Files |
|---|---|---|
| JA-1 | `QUEUE_STALLED` needs **both** an old oldest-`PENDING` job **and** no `started_date` / `stage_updated_date` anywhere in the window (worker liveness, not job age) | R `APF-R-2` B, `APF-AC-4` · D §2.2, §5 sweeper |
| JA-2 | `queue_entry_date = COALESCE(retried_date, created_date)` for the stall check, `queue_position`, the client elapsed timer and the 2-min mail rule | R §2 glossary, `APF-R-1` A, `APF-R-4`, `APF-R-5`, `APF-R-6` · D §2.2, §3.1, §5 (sweeper / retry / notifications), §6.2, §8 · M lead, chip note, state 5 |
| JA-3 · JB-5 · APF-OQ-6 | Timeout is **per attempt**: `BILATERAL_AI_ATTEMPT_TIMEOUT_MS`, default 15 min (10-min mining timeout + 5 min margin) from the attempt's `started_date`; whole-job worst case 45 min. `BILATERAL_AI_JOB_TIMEOUT_MS` renamed everywhere; `APF-OQ-6` resolved ("per attempt, 15 min, ops may tune") | R `APF-R-2` A, `APF-AC-3`, `APF-OQ-6` · D §2.2, §5, §8 context, DD-3, §13 · M states 4 and 5 |
| JA-4 | `--pr-status-rejected-fg/bg` → `--pr-danger` / `--pr-danger-soft` / `--pr-danger-bg`; new **token-existence gate** (every `var(--pr-…)` in new/changed templates must resolve in `colors.scss`), failing input named | R §7 Design system, `APF-AC-19`, §9 D8 · D §6.3 · M CSS variables + `.pill.bad` + `.disc.bad` |
| JA-5 | Late completion looks up the draft for `(job_id, candidate_index)` and reuses its `result_id` **before** creating a `Result`; the M1 unique index is a backstop, not the mechanism; "verify/add if absent" removed from §13 | R `APF-AC-3` · D §5 late completion, §10, §13 |
| JB-1 · JA-16 | `BILATERAL_AI_JOB_FINISHED` rows written **directly** (`result_id NULL`, `target_user = job.user_id`), not via `emitResultNotification`; read paths gain a branch — `LEFT JOIN` result, no `obj_result_by_initiatives` requirement; test asserts the persisted row read back through the endpoint | R `APF-R-4` AND-IT-MUST · D §2.1, §5 notifications, §6.4, §10 |
| JA-6 · JB-4 | 8 server `stage` values enumerated (`reading_transcribing` is the 20-char one), column `varchar(32)`, **6 UI steps / 8 server values**, "Uploading your sources to the AI service" copy added | R §2 glossary · D §3.1, §5 stage row, §6.3, §14 · M lead |
| JA-7 | Route moved to `GET /api/bilateral/center/ai/expectations?mix=…`; controller test asserts it does not shadow `jobs/:jobId` | R `APF-R-6` D, `APF-AC-8` · D §4.1, §6.2, §10 |
| JA-8 | Exactly two mix classes: `documents` (no audio) and `audio` (any audio present) | R `APF-R-6` D, `APF-AC-8` · D §4.1, §5 expectations · M meta lines (8–14 min for audio kept) |
| JA-9 · JB-2 · JB-3 | Attempt start preserves `error_code`/`error_message` and sets `retrying = 0`; 0 rows affected → `processJob` returns without calling mining; the consumer reads `BILATERAL_AI_MAX_ATTEMPTS` instead of a hardcoded 3 — all three added to DD-3's breakage list and to the server tests | D §2.2, §5 (new attempt-start row + retry semantics), §10, DD-3 |
| JA-10 | `pollJob` branches on HTTP status: 404/410 → drop the record and stop; 401 → stop silently; otherwise keep polling. Added to DD-6's breakage list | R `APF-R-7` AND-IT-MUST · D §6.2, §10, DD-6 |
| JA-11 | Notification copy carries mix + duration ("2 documents · 6 min") — satisfies `APF-R-22` | D §6.4 |
| JA-12 | Panel is input-driven with no internal loading state; a position/stage refresh re-renders in place | D §6.2 panel, §10 |
| JA-13 | `errorCopy` gains a default arm ("The AI service reported an error ({code}). Try again or contact support.") + a test with an unmapped code | D §6.2 model, §10 |
| JA-14 | D3 gate restated on `panelVisible`: true → inline outcome only; false → dialog only | R §9 D3 |
| JA-15 | Reduced motion moves to Cypress CT (stub `matchMedia` in `onBeforeLoad`, assert no animation class / `animation-name: none`); the jsdom row is deleted | R §9 D10 · D §10 CT |
| JA-17 | Chip sits **left of the drafts badge** (design wins); mockup tab row reordered | M header strip + note |
| JA-18 | "Covers: `APF-R-n…`" appended to every DD's Context line (DD-1 … DD-11) | D §12 |
| — | `requirements.md` Document Control: Depth → **Full**, Status → approved — JD round 1 applied. `design.md` §14: server production ~700 → **~850**, total ~4,800 → **~5,000** (read-path branch + lookup-first upsert ≈ 150 LOC); scope constants restated | R Document Control · D §14 |
