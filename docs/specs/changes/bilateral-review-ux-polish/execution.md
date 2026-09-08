# Execution Log — Bilateral review: UX/UI polish

## Document Control

| Attribute | Value |
|---|---|
| **Spec path** | `docs/specs/changes/bilateral-review-ux-polish/` |
| **Module code** | `BRP` |
| **Approval Mode** | pre-approved (owner, 2026-09-07 — "continua, dale con la ejecución cuando pasen los jueces") |
| **Execution limits** | ≤ 1 Reviewer round per task; targeted `npx jest <path>`; `npx ng lint --quiet`; CT on every task touching injections; Leader real-page look after every UI task |
| **Budget (design §12)** | 4 tasks · ~850 source LOC · ~900 test LOC · tripwire > 1200 source or any third attempt |
| **Started** | 2026-09-07 21:38 (GMT-5), branch `qa-development-2026`, base `bf48eeff9` |
| **Leader** | Claude Code session (Fable 5.1, T1) · Implementer `akili-implementer` (sonnet, T2) · Reviewer `akili-reviewer` (opus, T3; sonnet fallback if the opus session limit recurs) |
| **Pre-flight** | ticked in `tasks.md` §2; owner screenshot of the "before" state at 1787 CSS px kept in the scratchpad (`before-1787.png`) — Orca screenshots still fail while the tab is hidden |

## Task Execution History

### `BRP-T-1` — Filter band, Clear filters, stat bar

| Field | Value |
|---|---|
| Status | in progress (attempt 1 — Implementer spawned 21:40, fresh worker) |
| Date | 2026-09-07 |
| Gate before start | pre-flight ticked; judgment-day APPROVED after one fix pass (8 severe families); owner: "dale con la ejecución cuando pasen los jueces" |
| Skills assigned | `angular-developer`, `ui-ux-pro-max`, `frontend-design` (task list) |
| Effort | high (visual task judged by eye; owner emphasis on colors, hierarchy, responsive) |

**Attempt 1 — Implementer report (22:07):** 11 files; `Tests: 405 passed` · lint clean · CT `17 passing`. LOC (`git diff --numstat`): source +459 / −217 · tests +396 / −25. Judgment calls reported and **accepted by the Leader:** (1) `activeFilterCount` redefined in place → the popover badge also reads five dimensions (design §6.1 "recomputed"); (2) no `group` negative test until T-2 (**forward pointer → T-2**: add the `group ≠ project does not count` case); (3) one-line chevron-expand in the 9-center CT `beforeEach` so the pre-existing chip-click case survives the collapsed default (part of R-14 (c)). Stat bar padding tuned to `py-[8px]`/`leading-[18px]` to clear ≤ 44 px. Reviewer (opus, lens checklist, high) spawned 22:09 on the 11-file diff (1424 lines, `p1.diff`).

**Leader HITL look #1 (22:10–22:16, Orca tab, SP02, P = 34; owner "before" screenshot = `before-1787.png`):**

| Check | Result |
|---|---|
| Default rule (storage cleared, 7 centers) | Centers row **collapsed**, chevron "Show centers" `aria-expanded="false"`, one chip "All centers 131" pressed, storage stays `null` ✅ (R-3, AC-1) |
| Band / stat bar / first row at 1787 | band **87 px** (≤ 96 ✅), stat bar host **42 px** (≤ 44 ✅), first row top **422 px** from the viewport top (target < 420: **2 px over** — today's 494 → 422; the band's toolbar row is 50 and the rows-area padding 20; recorded, not blocking: AC-7's CT gate is `firstRow − workArea ≤ 210` = 221 measured here → **see Reviewer / T-4**) |
| Expand via chevron | 8 chips, `aria-expanded="true"`, storage `'1'` ✅ (AC-2) |
| Select IITA, collapse | one summary chip "IITA 99" (a `<span>` with the pressed look, a badge and a ✕ button `aria-label="Clear center"`), `?center=CENTER-11`, storage `'0'` — **note:** the summary is a `span`, not a `button[aria-pressed]`; AC-3 wording says "pressed" → left to the Reviewer |
| Clear filters | absent with no filters; "Clear filters · 1" with IITA selected; click → `?center=` removed, All centers pressed, control gone ✅ (AC-5). A second "Clear filters" node exists but is the popover header's (hidden, inside `.brt-filter-container`) — allowed by R-5 |
| Contrast (oklch → canvas) | status/strip labels pressed 11.6 / unpressed 6.76; badges pressed white on primary-700 **12.72**, unpressed primary-800 on primary-100 **12.69**; row labels "Status"/"Centers · 7" **5.17**; stat bar figures 16.72, separators 6.32 — all ≥ 4.5 ✅ (R-4, §8) |
| 840 CSS px (viewport 700 × 900) | band 113 (wraps), stat bar 64 (two lines, allowed below 900), first row top 585 (today 707), no body overflow ✅ |

**Attempt 1 — Reviewer verdict (22:22): `STATUS: FAIL`**, 2 issues. Everything else passed (R-5/L-1 one toolbar clear + five keys + no request + genuine round trip; R-3/L-6 all three collapsed states with a fallible 6-center fixture and the R-21 one-shot; R-2, R-4 badge matrix, R-6 six testids; R-14 (a)(b)(c) only; scope clean).

| # | Discovered Issue | Violated Rule | Remediation |
|---|---|---|---|
| 1 | 20 new focus rings use `ring-[var(--pr-focus-ring)]`; the token is a **box-shadow triple** (`colors.scss:311`), so the ring paints nothing while `outline-none` removes the native one — no visible focus on the new controls; regression on the replaced clear button (it had `ring-[var(--pr-color-primary-300)]`). **Root cause: design §6.3 prescribed the broken string** | `requirements.md` §8 Accessibility; client hard rule 4 | `focus-visible:shadow-[var(--pr-focus-ring)]` in all three templates; design §6.3 corrected; negative Jest assertion |
| 2 | Toolbar clear button and the chevron button carry `transition-colors` without `motion-reduce:transition-none`; no Jest test asserts the modifier anywhere | `design.md` §6.3; `requirements.md` §10 "Motion / reduced motion"; tasks T-1 Tests | Add the modifier at both sites + one Jest case per template |

**ADVISORY (recorded):** CT chevron click leaves `'1'` in `sessionStorage` for later cases (**Leader added** an `afterEach` clear to the fix round — it would falsify T-4's ≤ 140 gate); the "exactly one toolbar clear" Jest case counts the new `data-testid` and cannot fail on the named FAIL input (**Leader added** a text-based count); copy docstring claims a HITL measurement ahead of the look (harmless — the look has now measured it); stat bar `py-[8px]` and dropped 14 px icons deviate from §6.2 (accepted: both serve the ≤ 44 px gate; §6.2 "Icons kept" superseded).

**Leader relay (22:24):** FAIL report verbatim + two examined advisory items to the same Implementer; design §6.3 focus-ring string corrected by the Leader. **Attempt 2** — the one allowed Reviewer round; a second FAIL escalates.

**Attempt 2 — Implementer runtime failure (22:26):** the attempt-1 worker terminated before applying the fix — `API error: You've hit your session limit · resets 1:30am (America/Bogota) (rate_limit, HTTP 429, model claude-sonnet-5)`. Working tree verified unchanged since the FAIL (13 `ring-[var(--pr-focus-ring)]` occurrences still present, no `motion-reduce` assertions). Environment blocker, not a work FAIL; per the fallback table a fresh `akili-implementer` (sonnet) was spawned after the owner's "continue" once the limit reset, with the FAIL report verbatim + attempt history. Still attempt 2.

**Attempt 2 — Implementer landed (22:34, fresh worker):** ring → `shadow-[var(--pr-focus-ring)]` in 13 spots (grep of the broken token → 0/0/0); `motion-reduce:transition-none` on the toolbar clear and the chevron button; new Jest describe (box-shadow class present, broken token absent, `motion-reduce` on both controls); `toolbarClearButtons()` text-based count scoped to `[role="search"]` minus the popover panel; CT `afterEach` clears the storage key. `Tests: 407 passed` · lint clean · CT `17 passing`. LOC: source +459 / −217 · tests +443 / −25. Assumption accepted: the Leader's addition (b) as worded would double-count the popover header's own clear link, so the helper excludes the popover panel. Scoped re-review sent to the same Reviewer (22:36) with the full diff + a 106-line interdiff.

**Attempt 2 — Reviewer verdict (22:40): `STATUS: PASS`.** "Both FAIL issues are remediated at every cited site with fallible tests behind them (negative ring assertion that cannot pass vacuously, motion-reduce asserted on rendered classes), and both Leader additions land correctly — the label-scoped `toolbarClearButtons()` helper now genuinely catches the 'old button left in place' FAIL input, and the `sessionStorage` `afterEach` sits in the 9-center describe where the leak originated." Verified: no stray `ring-2` introduced (the only remaining one is the pre-existing Filter button with a real color); the popover's own clear link is excluded while the toolbar button is counted.

**Final — `BRP-T-1` PASS on attempt 2 (2026-09-07 22:42)**

| Field | Value |
|---|---|
| Attempts | 2 (attempt 1 FAIL on focus ring + motion-reduce; one Implementer runtime failure between them, respawned) |
| Files | `bilateral-review.component.{ts,html,spec.ts}`, `bilateral-review.copy.ts`, `bilateral-review.cy.ts` (R-14 (a)(b)(c) + fixtures + `afterEach`), `components/bilateral-review-center-strip/*.{ts,html,spec.ts}`, `components/bilateral-review-kpis/*.{ts,html,spec.ts}` |
| Verification | `npx jest src/app/pages/result-framework-reporting/pages/bilateral-review --silent --reporters=summary --no-coverage` → `Test Suites: 14 passed · Tests: 407 passed`; `npx ng lint --quiet` → `All files pass linting.`; `CT_DEV_SERVER_PORT=8090 npx cypress run --component --spec …/bilateral-review.cy.ts` → `All specs passed! 17` |
| Live evidence | HITL #1 above: band 87 px collapsed, stat bar 42 px, first row 494 → 422 px from the viewport top at 1787 (585 at 840), default rule + storage + R-21 behavior, Clear filters · 1 round trip, contrast matrix ≥ 5.17 on every new text |
| Requirements covered | BRP-R-1, R-2, R-3, R-4, R-5, R-6, R-14 (band part, (a)(b)(c)(e)), R-15 (no new scroller), R-20, R-21; AC-1, 2, 3, 3b, 4, 5, 6, 7 (HITL half), 14; scenarios "First screen shows the queue" (band clauses), "Reset in one click" |
| Decisions | (1) design §6.3 focus-ring string corrected (`shadow-[var(--pr-focus-ring)]`) — spec-caused defect. (2) Stat bar: `py-[8px]`/`leading-[18px]` and the four 14 px icons dropped to hold ≤ 44 px — **design §6.2 "Icons kept" superseded** (amended below). (3) `activeFilterCount` five-dimension formula also drives the popover badge (accepted). (4) Collapsed selected-center summary is a `span` with a ✕ `button`, not a pressed button — matches design §6.2 "summary chip"; AC-3 wording "pressed" read as the pressed *look*. **Forward pointer → T-2:** add the `group ≠ project does not count` negative case to `activeFilterCount`'s tests. |
| Issues | First-row HITL target < 420 px missed by 2 px (422) with the centers row collapsed — the remaining chrome is the toolbar (50) and the rows-area top padding (20); T-2's row density does not move this number. Recorded, not blocking: the CT gate (`firstRow − workArea ≤ 210`) is T-4's and today measures 221 → **T-4 must either trim the rows-area `pt` or restate the gate from measurement** (forward pointer → T-4). |
| Gate | auto-approved (pre-approved mode) |

### `BRP-T-2` — Table density, placeholders, group mode

| Field | Value |
|---|---|
| Status | in progress (attempt 1 — Implementer spawned 22:46, fresh worker) |
| Date | 2026-09-07 |
| Gate before start | auto-approved (pre-approved mode) after T-1 PASS |
| Skills assigned | `angular-developer`, `ui-ux-pro-max`, `tdd` (task list) |
| Effort | high |
| Forward pointers carried | T-1 → `group ≠ project` negative case for `activeFilterCount` |

**Attempt 1 — Implementer report (23:22):** 8 files; `Tests: 425 passed` · lint clean · CT `17 passing`. LOC: source +424 / −98 · tests +295 / −87. Judgment calls accepted: `untracked()` on the `expandedKeys` seed read (the effect read and wrote the same signal — infinite loop found and fixed mid-task); group-summary testid split into `-group-summary` + `-group-pending`; `setGroup` as a direct navigate (mirrors `setPhase`); `placeholderText()` keeps the server's literal string; no CT edits needed. The worker yielded twice on background Jest runs before finishing — nudged to foreground verification (kaizen: brief must say "foreground, no run_in_background" for verification). Reviewer (opus, lens checklist, high) spawned 23:25 on the 8-file diff (1341 lines, `p2.diff`).

**Leader HITL look #2 — BLOCKED (23:26):** probe per *Deferring a check*: `orca status` reports the runtime `ready`/`reachable` and `orca tab list` works, but every `orca eval` (even `"ping"`) returns `runtime_unavailable: The Orca runtime closed the connection before responding. Restart Orca and try again.` The owner is browsing the same tab (now on SP04). Deferred until the owner restarts Orca or pastes a screenshot; the table gates that matter here are also CT-measurable in T-4 (row height ≤ 64 / ≤ 44). Not a waiver: the look is owed before T-3's cards are judged.

**Attempt 1 — Reviewer verdict (23:33): `STATUS: FAIL`**, 3 issues. Verified green otherwise: L-4 honored (no nonce bump, `?group=` outside the state→URL effect, namespaced memory, `untracked` breaks only the self-read while a new `groups` reference still re-seeds); R-11 ordering; R-8 density with every `!` utility intact; R-9 dash triple; R-12 token badge; grouped-only gating; `shadow-[var(--pr-focus-ring)]`; `motion-reduce`; `colspan` 8; scope limited to the 8 files; CT unaffected.

| # | Discovered Issue | Violated Rule | Remediation |
|---|---|---|---|
| 1 | Center-mode arithmetic asserted only on `component.groups()`; zero rendered group-header assertions in the page spec although the real table is mounted | tasks T-2 Disqualifier "asserted on the computed instead of rendered headers"; §10 | Assert `[data-testid="bilateral-review-group-name"]` order, the "2 projects" caption and per-header `-group-pending` figures in the DOM |
| 2 | Group-mode control built from raw slate/white/`shadow-xs` cloning the legacy tablist instead of T-1's tokenized status control | design §6.3 tokens-only in new markup, no bespoke shadows; requirements §8 | Swap to the T-1 token set, drop `shadow-xs` |
| 3 | Sticky Actions cell has no left divider — design §6.2 said "unchanged (sticky right, `border-l`)" but the BRT cell never had one (**Leader's false premise**) | `BRP-R-10` (MUST, T-2) | `!border-l !border-[var(--pr-border-divider)]` on `td` + `th`, pinned in the chrome-parity Jest case; **design §6.2 corrected by the Leader** |

**ADVISORY (recorded):** `expandedKeys` never prunes keys of filtered-away groups (harmless; prune candidate for T-3); `setGroup` writes the signal before `router.navigate` (mirrors `setPhase` — precedent, noted); invalid-`?group=` effect re-hardcodes the value space; the table round-trip case is fallible for force-expand but not for namespacing (fixture keys never collide); the parent case "renders the Contributor badge and Not specified fallback from copy" was deleted though still green — **Leader added its restore to the fix round** (R-14 requires it).

**Leader relay (23:35):** FAIL report verbatim + attempt history + the restore item to the same Implementer; design §6.2 premise corrected. **Attempt 2** — the one allowed Reviewer round; a second FAIL escalates.

**Attempt 2 — Implementer landed (23:41):** rendered-DOM group-header assertions (order, "2 projects" caption, per-header pending), Group control retokenized to the T-1 status-control classes (no slate, no `shadow-xs`), Actions `td`/`th` gain `border-l border-[var(--pr-border-divider)]` pinned in the sticky-Actions Jest case, parent test restored. `Tests: 426 passed` · lint clean · CT `17 passing`. LOC: source +431 / −99 · tests +326 / −88. Scoped re-review sent to the same Reviewer (23:43) with the full diff + a 133-line interdiff. Orca `eval` still `runtime_unavailable` (probe repeated).

**Attempt 2 — Reviewer verdict (23:46): `STATUS: PASS`.** "All three FAIL issues and the Leader's restore are fixed at the exact seams named — arithmetic gate moved to fallible rendered headers, group control on T-1's token set with no raw palette left, and a real `border-l` on the sticky Actions `td`/`th` that needs no `!` because nothing in `pr-table.component.scss` or `table-custom-styles.scss` declares a left border." ADVISORY: the divider's painted effect is only observable live → owed in the HITL look.

**Final — `BRP-T-2` PASS on attempt 2 (2026-09-07 23:48)**

| Field | Value |
|---|---|
| Attempts | 2 |
| Files | `bilateral-review.query-params.ts`, `bilateral-review.copy.ts`, `bilateral-review.component.{ts,html,spec.ts}`, `components/bilateral-review-table/*.{ts,html,spec.ts}` |
| Verification | `npx jest …/bilateral-review --silent --reporters=summary --no-coverage` → `Test Suites: 14 passed · Tests: 426 passed`; `npx ng lint --quiet` → clean; CT → `17 passing` |
| Live evidence | **OWED** — Orca `eval` returned `runtime_unavailable` on every probe since 23:26 (status/tab-list fine); the "Done when" live look (row heights 44/64, placeholders, Actions divider, Group: Center headers, caption/badge contrast) is scheduled as the combined look after T-3, or on the owner's screenshot. Recorded, not waived. |
| Requirements covered | BRP-R-8, R-9, R-10, R-11, R-12, R-14 (f); AC-8, 9, 10 (Jest halves), 13; scenario "Distribute review work by center" (Jest) |
| Decisions | (1) design §6.2 "Actions cell unchanged (`border-l`)" was a false premise → corrected to "gains `!border-l`". (2) Group control uses T-1's token set (design §6.2 "same visual language as the existing tablist" satisfied without raw slate). (3) `untracked()` on the `expandedKeys` seed read (self-read loop found by the Implementer). (4) `setGroup` writes the signal before navigating (mirrors `setPhase`; precedent noted). (5) T-1 forward pointer (`group` negative count case) delivered. |
| Issues | Worker yielded twice on background Jest runs — brief template now says "foreground, no run_in_background" (kaizen). |
| Gate | auto-approved (pre-approved mode) |

### `BRP-T-3` — Cards below 900 px

| Field | Value |
|---|---|
| Status | in progress (attempt 1 — Implementer spawned 23:50, fresh worker) |
| Date | 2026-09-07 |
| Gate before start | auto-approved (pre-approved mode) after T-2 PASS; T-2 live look owed (Orca eval down) — combined look scheduled after T-3 |
| Skills assigned | `angular-developer`, `ui-ux-pro-max`, `frontend-design` (task list) |
| Effort | high |
| Forward pointers carried | T-2 advisory: optional `expandedKeys` prune against `filteredGroups` |

**Attempt 1 — Implementer report (00:07):** cards branch implemented (`narrow` input, `ul[role=list]`, group bars on the owned `expandedKeys`, flat order, no table/overflow in the branch); R-14 (d) rewritten (table scroll + sticky Actions at a new 1024 viewport, 840 = cards gate). `Tests: 433 passed` · lint clean · **CT `18 · Passing 8 · Failing 4`** — the four failures are outside the authorized (d) rewrite: (1)(2) the shared `assertEffectiveWidth` `beforeEach` and the 9-center describe fail at 840 because cards are taller than rows and trip the documented native-scrollbar quirk (JB-10's `cy.viewport(w, 1600)` fix was assigned to T-4); (3)(4) `BRT-T-7`'s two 840 FAIL-input probes inject CSS at `.pr-table-wrap` / `td:first-child`, which no longer exist under cards. The Implementer probed (viewport 1600 temporarily) → 14/3, proving (d) itself is correct, then reverted to the authorized diff. LOC: source +144 / −1 · tests +213 / −1. Not done: Contributor role badge omitted on cards (design §6.2 card spec does not list it — accepted, literal).

**Leader decision (00:10):** not a Pivot — R-14's own rule says the breaking task owns the rewrite. Spec amended: R-14 gains (g) narrow viewport 1600 for the shared `beforeEach` + 9-center describe (pulled forward from T-4) and (h) BRT-T-7's two FAIL-input probes retargeted to 1024; T-3's Files/Description updated. Remainder sent to the same Implementer before the single Reviewer round (rule 2.3.0 — a task with a red verification never reaches the Reviewer as complete).

**Attempt 1 — Implementer remainder landed (00:22):** `bilateral-review.cy.ts` only. (g) shared `beforeEach` → `cy.viewport(840, 1600)`; the 9-center describe needed **2400** (cards taller than rows; measured, documented inline). (h) BRT-T-7's two FAIL-input probes → `cy.viewport(1024, 900)`; the detector additionally needed `overflow-y: visible !important` on `.custom_scroll` in the injected style because `#workArea`'s `min-[900px]:overflow-y-auto` computes `overflow-x: auto` too at 1024 (CSS overflow spec) — verified with a reverted ancestor-trail probe. `Tests: 433 passed` · lint clean · **CT `18 · Passing 18 · Failing 0`**. LOC: source +144 / −1 · tests +252 / −9. Reviewer (opus, lens checklist, high) spawned 00:25 on the 6-file diff (539 lines, `p3.diff`). Orca `eval` still down (probe 00:15).

**Attempt 1 — Reviewer verdict (00:33): `STATUS: FAIL`**, 1 issue. Verified green otherwise: `@if (narrow())` first branch, `ul[role=list]`, one `li` per row, no `<table>`/overflow utilities in the branch; grouped cards read `expandedRowKeys()` and write through the owned `expandedKeys` (cross-branch persistence proven in Jest); flat order; card content per §6.2 incl. 44 px action target; 36 px bars with the token badge; table branch untouched with every `!` intact; page `[narrow]` wiring driven by the real `matchMedia` listener; Jest asserts the absence of `<table>` and card content; CT 840 = cards gate, 1024 = wrap-scroll + sticky Actions; scope = 6 files.

| # | Discovered Issue | Violated Rule | Remediation |
|---|---|---|---|
| 1 | Cards group-header `<button>` has no `focus-visible:*` (no global rule covers a bare button) — the only keyboard affordance for expand/collapse in the narrow branch; the T-2 table group toggle has the identical gap | design §6.3 "focus ring … on every new button"; requirements §8 | `focus-visible:outline-none focus-visible:shadow-[var(--pr-focus-ring)]` on both toggles + one Jest assertion each (Leader: fix both, same rule, same file) |

**ADVISORY (recorded):** (1) CT retarget comment at `cy.ts:203-210` contradicts `:780-791` — at ≥ 900 px both clips must be defeated, so the probe proves the body-overflow gate is fallible but not that a wrap-clip loss is reachable; **Leader added the comment fix**; **forward pointer → T-4:** a wrap-clip regression at ≥ 900 px is invisible to a `documentElement`-level gate (a `.pr-table-wrap` computed-`overflow-x` assertion is the honest gate). (2) **Ledger correction:** the Implementer's attempt-1 report said cards omit the Contributor badge — false, it renders at `table.html:139-144`; the accepted "deviation 3" is void. (3) R-14 (g)/AC-11 text reconciled to the 2400 viewport for the 9-card fixture (done above). (4) Narrow loading skeleton emits its own `ul[role=list]` — **Leader added a distinct `data-testid`**; its `animate-pulse` lacks `motion-reduce:animate-none`, matching the pre-existing table skeleton (no regression; follow-up).

**Leader relay (00:36):** FAIL report verbatim + attempt history + additions (a)(b) to the same Implementer. **Attempt 2** — the one allowed Reviewer round; a second FAIL escalates.

**Attempt 2 — Implementer landed (00:42):** shadow focus ring on both group toggles + two `className` assertions; skeleton `ul` → `data-testid="bilateral-review-cards-skeleton"`; CT comment corrected (both clips named). `Tests: 435 passed` · lint clean · CT `18 passing`. LOC: source +148 / −2 · tests +271 / −9. Scoped re-review sent to the same Reviewer (00:44) with the full diff + a 44-line interdiff.

**Attempt 2 — Reviewer verdict (00:48): `STATUS: PASS`.** "The single FAIL issue is closed on both toggles with the exact §6.3 shadow-ring string plus two behavior-relevant className assertions, and the two Leader additions (distinct skeleton testid, truthful CT probe comment) are correctly executed." Advisories carried: ledger deviation 3 already voided above; R-14 (g)/AC-11 already reconciled to 2400; **forward pointer → T-4:** a wrap-clip regression at ≥ 900 px is invisible to the `documentElement`-level gate — add a computed-`overflow-x` assertion on `.pr-table-wrap`.

**Final — `BRP-T-3` PASS on attempt 2 (2026-09-08 00:50)**

| Field | Value |
|---|---|
| Attempts | 2 (attempt 1 = cards + Leader remainder for the CT cases cards broke; attempt 2 = focus ring on both toggles) |
| Files | `components/bilateral-review-table/*.{ts,html,spec.ts}`, `bilateral-review.component.{html,spec.ts}`, `bilateral-review.cy.ts` (R-14 (d)(g)(h)) |
| Verification | `npx jest …/bilateral-review --silent --reporters=summary --no-coverage` → `Test Suites: 14 passed · Tests: 435 passed`; `npx ng lint --quiet` → clean; CT → `18 · Passing 18 · Failing 0` |
| Live evidence | **OWED** (Orca `eval` `runtime_unavailable` since 23:26; probes at 00:15, 00:25, 00:37, 00:44) — combined T-2/T-3 look scheduled when Orca is restarted or on the owner's screenshots (840 and 375 for the cards) |
| Requirements covered | BRP-R-13, R-14 (d)(g)(h), R-15 (branch has no scroller); AC-11, AC-12 (CT halves) |
| Decisions | (1) R-14 amended with (g)(h): the CT cases cards broke belong to T-3 (own rule), the JB-10 viewport fix pulled forward from T-4. (2) 9-card fixture at `cy.viewport(840, 2400)` (measured; spec text reconciled). (3) The 1024 detector injects `overflow-y: visible` on `.custom_scroll` too — the probe proves the body-overflow gate is fallible, not that a wrap-clip loss is reachable at ≥ 900 (T-4 gets the honest `.pr-table-wrap` gate). (4) Both group toggles got the focus ring (T-2's had the same gap). |
| Issues | Implementer's report claimed the cards omit the Contributor badge — false (they render it); ledger corrected. |
| Gate | auto-approved (pre-approved mode) |

