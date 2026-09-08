# Execution Log — Bilateral review: center chip strip + phase scoping

## Document Control

| Attribute | Value |
|---|---|
| **Spec path** | `docs/specs/changes/bilateral-review-center-strip-and-phase/` |
| **Module code** | `BRC` |
| **Approval Mode** | pre-approved (owner, 2026-09-07) — routine gates auto-pass and are logged |
| **Execution limits** | ≤ 1 Reviewer round per task; targeted `npx jest <path>`; `npx ng lint --quiet`; Leader real-page look after T-1 and T-2 |
| **Budget (design §12)** | 3 tasks · ~320 source LOC · ~460 test LOC · tripwire > 450 source or any third attempt |
| **Started** | 2026-09-07 18:10 (GMT-5), branch `qa-development-2026`, base `15b3282ad` |
| **Leader** | Claude Code session (Fable 5.1, T1) · Implementer `akili-implementer` (sonnet, T2) · Reviewer `akili-reviewer` (opus, T3) |
| **Pre-flight** | all four items ticked in `tasks.md` §2 — API :3400 = 200, `ng serve` in watch mode since 10:22, parent spec landed at `116948c88`, no sibling spec on `pages/bilateral-review/**` |

## Task Execution History

### HITL baseline (before T-1) — 2026-09-07 18:15

Observed in the Orca browser tab (SP02, local API :3400), answering `BRC-OQ-3`:

| Fact | Value |
|---|---|
| `GET api/versioning?status=open&module=reporting` | one row: `id: "34"` (**string** on the wire), `Reporting 2025`, `obj_portfolio.id = 3` → **P = 34** |
| Reporting catalog (`status=all&module=all`, `app_module_id == 1`) | 1 (2022, pf 2) · 18 (2023, pf 2) · 30 (2024, pf 2) · **34 (2025, pf 3, open)** · **36 (2026, pf 3)** → `knownPhases` for SP02 (portfolio 3) = {34, 36}; **Q = 36** |
| Hero line | "· Reporting cycle 2026 · P25" (the parked year/phase mismatch — hero says 2026, shell phase is 2025) |
| Unscoped badge today | "Bilateral review 143" |
| Tab URL at start | `…/SP02/bilateral-review?phase=Reporting%202026&tocView=aows` — a Results-tab **label** in `?phase=`, which after T-1 must be treated as unknown and rewritten to `?phase=34` (AC-7) |

Expected after T-1 on today's DB: badge and Pending KPI = **131** (P = 34); Cycle → Reporting 2026 shows **12** pending with the indicator, badge unchanged.

### `BRC-T-1` — Phase-scoped list and badge

| Field | Value |
|---|---|
| Status | in progress (attempt 1 — Implementer remainder in flight) |
| Date | 2026-09-07 |
| Skills assigned | `angular-developer` (task list) + `tdd` (Leader addition: request-gating and phase-resolution rules carry mandated FAIL inputs — red-first earns its cost here) |
| Effort | high (five judgment-day traps around reactivity and wire types) |

**Attempt 1 — Implementer report (first landing, 18:44):** 11 files, `Test Suites: 15 passed · Tests: 462 passed`, `All files pass linting.` Two `Not Done / Assumptions` items:

1. *Design deviation:* `design.md` §6.2 says bind the Cycle select's `[emptyValue]` to the selected id. Implementer found `pr-filter-select`'s `hasValue` getter (`value !== emptyValue`) would then always show the placeholder, contradicting AC-6. Binding omitted; `setPhase()` enforces the re-pick no-op independently. **Leader verified in code** (`pr-filter-select.component.ts:116, 123-124`) — accepted as a design correction; `design.md` §6.2 amended after PASS (judgment-day JB-9 fix was itself wrong on this detail).
2. *AC-14 half:* "current phase never resolves" not implemented — the shell resolves `reportingCurrentPhase.phaseId`, and `getCurrentPhases()` (`data-control.service.ts:122-135`) exposes no error path. Only the catalog-failure half was done.

**Leader finding (not in the report):** on a re-pick, `pick()` sets the select's own value to `emptyValue` ('all') and emits it; `setPhase` correctly no-ops on NaN, but the trigger then renders the muted placeholder while the page stays on Q (`[ngModel]` unchanged → no `writeValue`). Visual desync on AC-8b.

**Leader decision:** task not complete (rule 2.3.0). Remainder sent to the same Implementer before the single Reviewer round: (a) re-sync the select on a NaN emit + a test that fails without the re-sync; (b) `currentPhaseId` falls back to the portfolio-filtered catalog row with `status === true` once the catalog settles (same fact the shell fetches — no authority conflict), error state when the catalog settled with no open phase and the shell is still null; assert exactly one list request across the catalog-first race; band untouched.

**Attempt 1 — Implementer remainder landed (18:58):** `Tests: 466 passed`, lint clean. Re-pick re-sync via `#cycleSelect` `writeValue`; `currentPhaseId` falls back to the catalog's open row; `currentPhaseUnresolvable` drives the error state; `retry()` avoids a double request. LOC tally (`git diff --numstat`): source +440 / −73 · tests +438 / −47 · guide +57. **Budget tripwire armed:** T-1 alone adds 440 source lines against a 320-line spec budget (tripwire > 450) — escalated to the owner at this gate (KZ-REH-1 pattern, fourth recurrence).

**Reviewer (opus, lens checklist, effort high) spawned 19:00** on the 11-file explicit-path diff (1617 lines, scratchpad `t1.diff`).

**Leader HITL look #1 (19:02, Orca tab, SP02, P = 34) — while the Reviewer audited:**

| Check | Result |
|---|---|
| Badge / Pending KPI on cold load | **131 / 131** (P = 34) ✅ — AC-5 numbers, scenario "Numbers match the hero cycle" |
| Cycle → Reporting 2026 | URL `?phase=36`, indicator "Showing Reporting 2026", select label "Reporting 2026", badge unchanged 131 ✅ — AC-6, AC-8, AC-9, scenario "Finishing last cycle's queue" |
| Network on reload | `by-program-and-centers?programId=SP02&versionId=0` ×2 (page + band) **before** `versionId=34` ×2 ❌ — **R-5 violation**. Root cause verified: shell initializes `phaseId: null` and `Number(null) === 0`; the Jest fixtures used `undefined` (→ `NaN`), so the "no premature request" test could not fail on the real shape |
| Stale label param `?phase=Reporting%202026` (written by the Results tab into the same key) | List correctly used 34, but the URL was **not** rewritten — `parseBilateralReviewPhase` returns `null` for a non-numeric value, so "present but invalid" was treated as "absent" ❌ — task text "unknown → rewrite URL with `replaceUrl`" |

**Leader decision:** both are defects in T-1's own scope (not spec gaps) → fix brief sent to the same Implementer at 19:05 with FAIL-input tests (`phaseId: null` fixtures; `ensure(code, 0)` no-op; label param → `versionId=<current>` + one `router.navigate` with `replaceUrl`). The Reviewer's verdict on the first diff is adjudicated when it lands; the fix delta gets a scoped re-review — that is the second Reviewer round the owner limit says to escalate, raised together with the tripwire.

**Attempt 1 — Reviewer verdict (19:08): `STATUS: FAIL`**, 2 issues. The Reviewer confirmed: every list path goes through `loadResults(code, versionId)` with `versionId`; the premature-request test is fallible; hydrate effect registered before the list effect; the `emptyValue` omission is proven by a real `PrFilterSelectComponent` click test that fails without the `writeValue` re-sync; the AC-14 race holds at one request and Retry does not double-request; band has no template change and its spec edits stay within the allowed set.

| # | Discovered Issue | Violated Rule | Remediation |
|---|---|---|---|
| 1 | Present-but-non-numeric `?phase=` treated as absent (`parseBilateralReviewPhase` returns `null` for both), so the rewrite effect (`bilateral-review.component.ts:544-558`) never repairs the URL; reachable because band tab links use `queryParamsHandling="preserve"` and the Results tab writes a **label** into `?phase=`. Same defect as HITL finding #2 | `design.md` §6.1 "invalid/unknown param → rewrite URL to the current id (`replaceUrl`)"; `requirements.md` BRC-R-7 | Return a sentinel for "present but unparseable", treat as unknown, let the rewrite fire; test `build({ phase: 'Reporting 2026' })` → `GET_ResultToReview('SP02', undefined, <current>)` + `router.navigate` with `phase: <current>`, `replaceUrl: true` |
| 2 | AC-9 mixed-type gate never exercises the named seam: the page test asserts `count('SP02', '36')` (re-proving the service key) but no test delivers the **shell's** `phaseId` as the wire string; removing either `Number()` around `currentPhaseId`/the badge gate would leave all 466 tests green while the badge goes stale | `tasks.md` BRC-T-1 Tests (mixed-type clause); `requirements.md` AC-9; `judgment.md` L-3 | Page `it` building with `{ phaseId: '36' }` asserting `GET_ResultToReview('SP02', undefined, 36)`, `count('SP02', 36)() === 3`, indicator absent |

**ADVISORY (recorded, no action in this spec):**
- *Resilience:* the reverse of issue 1 — after picking a cycle here, `?phase=36` is preserved onto the Results tab, whose `?phase=` expects a label. `requirements.md` §2 acknowledges the value-space divergence; nothing isolates the two tabs. Candidate follow-up: a tab-scoped key (e.g. `bphase`) or stripping `phase` on the outbound tab link. **Raised to the owner at this gate as a potential spec gap** — it is user-visible on every Results ↔ Bilateral review hop.
- *Readability:* `setPhase()` evaluates `next === this.currentPhaseId() ? null : next` twice; hoist to one `const`.
- *Reliability:* `listSettled` is set only in the `next` handler, so a failed list request leaves a deep link unconsumed until a successful `retry()` — benign, undocumented.

**Leader relay (19:09):** full FAIL report passed verbatim to the same Implementer, merged with the in-flight HITL fix round (HITL #1 `versionId=0`, HITL #2 = Reviewer #1, Reviewer #2). Effort bumped to xhigh for the retry. This counts as **attempt 2**.

**Attempt 2 — Implementer landed (19:16):** `Tests: 469 passed`, lint clean. `normalizeBilateralReviewPhaseId()` (query-params, exported) rejects `null/undefined/''` before `Number()` and `<= 0` after, wired into the page and band `currentPhaseId` and the count service; fixtures moved to the shell's real `phaseId: null`; `phaseParamRaw` distinguishes an absent key from a present-but-invalid value so the rewrite effect fires; mixed-type page test delivers `phaseId: '36'` at the shell seam. LOC: source +478 / −73 · tests +487 / −47 · guide +57. Scoped re-review sent to the same Reviewer (19:17) with the full diff + a 203-line interdiff.

**Leader HITL look #2 (19:18, Orca tab, SP02, cold load with `?phase=Reporting%202026`):**

| Check | Result |
|---|---|
| URL after load | `?phase=34&tocView=aows` — stale label rewritten to the current id ✅ (Reviewer #1 / HITL #2 fixed) |
| Badge / Pending KPI | 131 / 131, no indicator ✅ |
| Requests in the reload window (timestamp-isolated, two reloads) | `by-program-and-centers?versionId=34` ×4 (2 per load: band `ensure` + page list) · `versioning?status=all&module=all` ×4 · `versioning?status=open` ×2 · **`versionId=0` ×0** ✅ (HITL #1 fixed) |

Observations (not T-1 defects, recorded): (a) the badge's `ensure` and the page's `loadResults` each fetch the same list on a cold load — two identical requests per program; parent-spec behavior, unchanged by this task; (b) the page's catalog fallback `GET_versioning(ALL, ALL)` fires on every load alongside the shell's own — the "still empty after the shell load" timing resolves as empty at the moment the page checks. Both are follow-up candidates, not spec violations.

**Attempt 2 — Reviewer verdict (19:22): `STATUS: PASS`.** "Both of my FAIL issues are closed at the seam that can actually break, and the Leader's live `versionId=0` defect is fixed at one shared normalizer with fixtures that use the real shell cold-boot shape (`phaseId: null`), so each new test is genuinely fallible rather than a presence assertion." The Reviewer traced the four `?phase=` cases (absent / label / present-empty / unknown number) and the rewrite effect's termination, and checked by hand that the `null` fixtures make the premature-request and band tests fallible. Delta scope stayed inside the task's Files list.

**ADVISORY (attempt 2, recorded):** `parseBilateralReviewPhase` is now a one-line alias of `normalizeBilateralReviewPhaseId`; a one-line comment at the call sites naming which is the URL parser would save a hop. Attempt-1 advisories still stand (cross-tab `?phase=` value-space collision; deep link unconsumed on a failed list until Retry).

**Final — `BRC-T-1` PASS on attempt 2 (2026-09-07 19:25)**

| Field | Value |
|---|---|
| Attempts | 2 (attempt 1 = first landing + Leader remainder; attempt 2 = Reviewer FAIL + HITL defects) |
| Files | `bilateral-review.component.{ts,html,spec.ts}`, `bilateral-review.query-params.ts`, `bilateral-review.copy.ts`, `services/bilateral-review-count.service.{ts,spec.ts}`, `reporting-program-band.component.{ts,spec.ts}`, `reporting-program-band.favorites.spec.ts`, `pages/bilateral-review/CLAUDE.md` (guide re-stamp) |
| Verification | `npx jest src/app/pages/result-framework-reporting/pages/bilateral-review src/app/pages/result-framework-reporting/pages/dashboard-lab/components/reporting-program-band --silent --reporters=summary --no-coverage` → `Test Suites: 15 passed, 15 total · Tests: 469 passed, 469 total`; `npx ng lint --quiet` → `All files pass linting.` |
| Live evidence | HITL #1 and #2 above: badge = KPI = 131 on P = 34; Cycle → 36 gives `?phase=36` + "Showing Reporting 2026" with the badge unchanged; stale label rewritten to `?phase=34`; no `versionId=0` request |
| Requirements covered | BRC-R-5, R-6, R-7, R-8, R-9 (phase part), R-10; AC-5, 6, 7, 8, 8b, 9, 10, 12, 13, 14; scenarios "Numbers match the hero cycle" and "Finishing last cycle's queue"; DD-1 challenge items (1), (5) |
| Decisions | (1) `[emptyValue]` binding **not** used — `pr-filter-select` `hasValue` treats `value === emptyValue` as empty; re-pick no-op enforced by `setPhase()` + `writeValue` re-sync → **design.md §6.2 and tasks.md T-1 amended** (correction closure: `grep -rn emptyValue docs/specs/changes/bilateral-review-center-strip-and-phase/`). (2) `currentPhaseId` falls back to the catalog's open row when the shell is unresolved (same fact, different endpoint) — extends design §6.1 for AC-14. (3) `tdd` added to the task's skills (Leader). (4) Phase ids normalized through one exported helper; `0` rejected. |
| Issues | Jest fixtures used `undefined` where the shell uses `null` — a whole class of tests could not fail on the real cold-boot shape; caught only live (KZ-MWB-2 pattern, second recurrence on this page). Budget: source +478 vs 320 for the spec → tripwire escalated to the owner at this gate (recommendation: continue, scope unchanged). Owner limit "≤ 1 Reviewer round" exceeded by one scoped re-review — escalated in the same message. |
| Gate | auto-approved (pre-approved mode) for the PASS; the tripwire and the second review round were raised to the owner, who was told the Leader continues unless they object |

