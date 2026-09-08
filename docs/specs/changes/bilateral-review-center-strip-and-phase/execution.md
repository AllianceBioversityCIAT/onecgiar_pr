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

### `BRC-T-2` — Center chip strip

| Field | Value |
|---|---|
| Status | in progress (attempt 1 — Implementer spawned 19:32, fresh worker) |
| Date | 2026-09-07 |
| Gate before start | auto-approved (pre-approved mode) after T-1 PASS; budget tripwire and second review round raised to the owner at 19:10 with "continue unless you object" — no objection at 19:32 |
| Skills assigned | `angular-developer`, `frontend-design` (task list) + `tdd` (Leader addition: count/order/pressed logic with mandated FAIL-input fixture) |
| Effort | medium (well-specified, additive) |

**Attempt 1 — Implementer report (19:42):** new `components/bilateral-review-center-strip/` (ts/html/spec), page `centerStrip` computed + `onCenterChipSelect`, mount under the status chips, copy block. `Test Suites: 14 passed · Tests: 374 passed`; lint clean. LOC: source +199 · tests +259. No `Not Done`. **Deviation:** output renamed `select` → `selectCenter` because `@angular-eslint/no-output-native` (enforced) forbids outputs named after native DOM events — Leader accepts; design §6.2 and tasks T-2 amended after PASS. Reviewer (opus, lens checklist, high) spawned 19:44 on the 7-file explicit-path diff (540 lines, `t2.diff`).

**Leader HITL look #3 (19:45, Orca tab, SP02, P = 34, while the Reviewer audited):**

| Check | Result |
|---|---|
| Strip at 1787 CSS px | `role="group"` "Contributing centers"; one line; chips `All centers 131 · IITA 99 · IWMI 20 · CIP 9 · IRRI 2 · Bioversity (Alliance) 1 · AfricaRice 0 · ILRI 0` — pending desc then acronym asc ✅; **All centers 131 = KPI Pending 131** ✅ (R-1, R-4, AC-1) |
| Accessible names | `aria-label="IITA, 99 pending"`, `aria-pressed` on every chip, All pressed by default ✅ |
| Class parity with status chips | pressed and unpressed class strings **identical** to the status chips (`bg-[var(--pr-color-primary-50)] border-[var(--pr-color-primary-300)] … text-[var(--pr-color-primary-700)]` / `bg-[var(--pr-surface-card)] border-[var(--pr-border)] … text-[var(--pr-text-secondary)]`); height 28 px, 12.5 px font on both ✅ |
| Click IITA | URL `?tocView=aows&center=CENTER-11`, IITA pressed, All unpressed, rows collapse to IITA only, Pending KPI stays 131, chip counts unchanged ✅ (R-2, R-3, scenario clauses THEN / AND / BUT) |
| Click IITA again | URL `?tocView=aows` (key removed), All pressed, full rows back ✅ (AND IT MUST clear with one click) |
| 840 CSS px (viewport 700 × 900, root zoom ×1.2 → `innerWidth` 840, `clientWidth` 822) | strip wraps to **2 lines**, no clipped chip, `body.scrollWidth (822) <= clientWidth (822)` ✅ (R-20, AC-11 preview) |
| Contrast (oklch → canvas → WCAG) | chip label: pressed `rgb(51,34,122)` on `rgb(245,243,255)` = **11.6**, unpressed `rgb(93,88,114)` on white = **6.76** ✅. Count numeral (`text-[var(--pr-text-subtle)]`, `rgb(150,145,168)`): **2.77** pressed / **3.04** unpressed ❌ — but **identical on the existing status chips** (same class, same ratios measured): an inherited gap, the parent spec's recorded HITL-only contrast item, not a T-2 defect. Follow-up candidate: one token swap on both chip rows' numerals (`--pr-text-subtle` → `--pr-text-secondary`) via `/akili-quick` |

Viewport restored to 1500 × 960 after the look.

**Attempt 1 — Reviewer verdict (19:50): `STATUS: FAIL`**, 1 issue. Conformance sweep otherwise clean: counts over `searchFiltered` with loose `== 5`, 0-pending centers kept, sort order, acronym fallback, `allPending` bound to `chipCounts().pending` (= KPI by construction), R-2 pressed rules exact, chip classes byte-identical to the status chips, all `var(--pr-*)`, `flex-wrap`, copy in `copy.ts`, `role="group"` + `aria-label`, no `[disabled]`, tests assert rendered text with all-distinct counts incl. 0 and blank, clicks on the chip button, 14 → 12 + "+2 more"; files exactly the task list; T-1 untouched.

| # | Discovered Issue | Violated Rule | Remediation |
|---|---|---|---|
| 1 | The "Not specified" bucket has `code: ''`; `onCenterChipSelect` sets `centers = ['']`, the state→URL effect joins it to `''`, and the URL→state parser drops an empty value and resets the signal — the chip never stays pressed and any later merge-navigate reverts the filter. The suite cannot see it because `router.navigate` is a `jest.fn()` that never feeds `queryParamMapSubject` | `requirements.md` BRC-R-3 (same state persisted in `?center=` csv) with BRC-R-2 (exactly one chip pressed) for a chip BRC-R-1 mandates | Param-safe sentinel code for the bucket resolved to blank `lead_center` in the row filter; page test that clicks Not specified, re-emits the produced params through `queryParamMapSubject`, asserts `centers()` and `aria-pressed` survive |

**ADVISORY (recorded):**
- *Reliability:* strip mounts unconditionally (skeleton paints "All centers 0"). **Leader examined:** the status-chip row mounts unconditionally too (`bilateral-review.component.html:272`), so this is parity — no action.
- *Readability:* design §6.3 names a `material-icons-round` caret on "+N more"; none shipped. Correct under the client's lucide-only rule → **design.md §6.3 corrected** after PASS.
- *A11y:* "+N more" has no `aria-expanded`. **Leader added** to the fix round (one attribute; module guide lists `aria-expanded` among structural a11y checks).
- *Readability:* strip repeats the status row's `border-b`. **Leader examined:** each band ends in one divider, consistent stacking — no action; the live look showed no double line.

**Leader relay (19:52):** FAIL report passed verbatim to the same Implementer with attempt history; effort bumped to high. **Attempt 2** — this is the one Reviewer round the owner limit allows; a second FAIL escalates.

**Attempt 2 — Implementer landed (19:58):** bucket code = sentinel `UNASSIGNED_CENTER_CODE = '__unassigned__'`, mapped back to `''` in `selectedCenterAcronyms`; `aria-expanded` on "+N more"; named page test "BRC-R-3: the Not specified chip selection survives the ?center= round trip through the router" (RED verified by reverting the fix). `Tests: 375 passed`, lint clean. LOC: source +216 · tests +293. Live regression check: 8 chips, All centers 131 pressed, KPI 131, zero console errors.

**Attempt 2 — Reviewer verdict (20:02): `STATUS: PASS`.** "The sentinel closes the attempt-1 `?center=` round-trip defect (BRC-R-2/R-3) without collision, popover-option leakage or accessible-name leakage, `visibleRows` matches exactly the blank-`lead_center` rows the bucket counts, and the named test drives a real URL → state hydrate that fails under the old `''`." The Reviewer also traced: sentinel cannot collide with CLARISA codes; `centerFilterOptions` drops blanks so the bucket never becomes a popover option; accessible name uses the acronym.

**ADVISORY (attempt 2, recorded):**
- *Readability:* the strip's own spec fixture still uses `code: ''` for the bucket instead of the sentinel the page emits — align in a later pass.
- *A11y:* `aria-expanded` never reaches `"true"` because the "+N more" button unmounts on expand (`@if (showMore())`); the attribute is an accurate description of an inert disclosure. Not gated by §8; follow-up if disclosure state should be announced.
- *Readability:* with the bucket selected the popover trigger reads "1 centers" (pre-existing `triggerLabel` fallback); a "Not specified" popover option would make the two controls read identically — follow-up, out of scope.

**Final — `BRC-T-2` PASS on attempt 2 (2026-09-07 20:05)**

| Field | Value |
|---|---|
| Attempts | 2 |
| Files | new `components/bilateral-review-center-strip/bilateral-review-center-strip.component.{ts,html,spec.ts}`; `bilateral-review.component.{ts,html,spec.ts}`; `bilateral-review.copy.ts` |
| Verification | `npx jest src/app/pages/result-framework-reporting/pages/bilateral-review --silent --reporters=summary --no-coverage` → `Test Suites: 14 passed · Tests: 375 passed`; `npx ng lint --quiet` → `All files pass linting.` |
| Live evidence | HITL #3 above: counts = KPI, order, click round trip via `?center=CENTER-11`, clear, 2-line wrap at 840 CSS px with no body overflow, class parity, label contrast 11.6 / 6.76 |
| Requirements covered | BRC-R-1, R-2, R-3, R-4, R-9 (strip part), R-20, R-21; AC-1, 2, 3, 4, 12, 15; scenario "Review center by center" (all four clauses) |
| Decisions | (1) output `select` → `selectCenter` (`@angular-eslint/no-output-native`) — design §6.2 + tasks T-2 amended. (2) "Not specified" bucket carries the param-safe sentinel `__unassigned__` — design §6.1 amended. (3) No caret icon on "+N more" (client lucide-only rule beats design §6.3's `material-icons-round`) — design §6.3 amended. (4) `tdd` added to skills. |
| Issues | Count numerals inside chips measure 2.77 / 3.04 contrast — identical token and ratio on the pre-existing status chips (inherited gap, parent spec §11); follow-up `/akili-quick` on both rows. Budget: cumulative source ≈ +694 vs 320 (tripwire already escalated at T-1). |
| Gate | auto-approved (pre-approved mode) |

