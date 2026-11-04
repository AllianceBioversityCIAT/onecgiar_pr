# Judgment Day — `bilateral/ai-draft-spotlight` design

## Transaction

| Field | Value |
|---|---|
| Target | `design.md` (draft, Phase 2) against `requirements.md` and `proposal.md`, code at `edcf190f0` |
| Mode | judgment_day, blind dual review |
| Judges | Judge A and Judge B: `sonnet` (the design was authored on `opus`, so author ≠ auditor), read-only, identical prompt and scope |
| Rounds | 1 (full), 2 (scoped re-judgment after fix 1), 3 (final scoped re-judgment after fix 2) |
| State | **approved** |

## Premise Ledger attack (merged)

| Row | Judge A | Judge B | Merged |
|---|---|---|---|
| P-1, P-2, P-4, P-5, P-6, P-7, P-8 | confirmed | confirmed | confirmed |
| P-3 | confirmed; counted verified while holding an UNVERIFIED clause | confirmed; consequence mis-rated | confirmed. Wording and count are fixed with JD-1 |
| P-9 | confirmed; the Tab trap includes the card's focusables | confirmed | confirmed, with a caveat (JD-9) |
| P-10 | confirmed; in-view check uses the window only | confirmed; claim imprecise | confirmed, row reworded (JD-12) |
| P-11 | incomplete (description and button also use `innerHTML`) | incomplete (same) | incomplete, row reworded (JD-11) |
| P-12 | **refuted as Low**: default `'ignore'`, same-URL `navigate()` resolves `false` | settled: default `'ignore'`; Low rating wrong | **settled, High** → JD-1 |
| P-13 | settled, confirmed (`driver.css` pointer-events rules) | settled, confirmed | **settled, confirmed** |
| `src/styles.scss:695-700` | — | contradicted: `pr-guide` starts at `:702`, import at `:699` | citation fix (JD-10) |
| Missing rows | same-URL `false`; container scroll; `onDestroyed` timing; focus restore | container scroll; toast host outside the route (confirmed) | rows to add (JD-1, JD-2, JD-4) |

## Findings ledger

| ID | Severity | Judge A | Judge B | Status | Finding |
|---|---|---|---|---|---|
| JD-1 | **severe** | F-1 severe | F-1 severe | **confirmed** | DD-6 consumes the request when `router.navigate` resolves `false`. A same-URL navigation resolves `false` under the default `onSameUrlNavigation: 'ignore'` (`app-routing.module.ts:8`, router `NavigationSkipped` → `resolve(false)`). So the same-job re-click (ADS-AC-1c), and the toast after a drawer visit, kill their own spotlight |
| JD-2 | **severe** | F-2 severe | F-3 severe | **confirmed** | driver.js re-measures only on window `scroll` and `resize`. The page scrolls inside a nested container (C-6), so wheel or keyboard scroll over the lit card, or a list reload that changes row heights, detaches the cut-out and popover (ADS-AC-2b, AC-2c, AC-7b). No premise row |
| JD-3 | severe / warning | F-5 warning | F-2 severe | **split severity, finding agreed** | Scroll ownership race: the spotlight effect and the existing `?job=` effect both scroll and both write `highlightClearTimer`. The `queryParamMap` emission resets `highlightApplied` after the spotlight measured, causing a late second scroll and an offset cut-out. The leaked timer is not cleared on destroy |
| JD-4 | severe | F-3 severe | — | **suspect → settled by the architect's re-run: confirmed** | `highlight()` sets `__activeElement` and `__activeStep` only in the post-animation transition callback, and `destroy` calls `onDestroyed` only when both are set (`driver.js.mjs` `function h(e=!0){…if(n&&r){…s&&s(…)}i&&i.focus()}`, as run 2026-10-27). A close inside the animation window gives no `onDestroyed`, so focus is not returned (ADS-AC-3a, NFR-2) |
| JD-5 | warning | F-4 | F-4 | confirmed (info) | `onClosed` focuses the card on every close path, stealing focus from the Review panel or dialog that has just opened (ADS-AC-6b). Focus should return only on Got it, Esc or overlay click |
| JD-6 | warning | F-7 | — | suspect (info) | The TTL is not reactive (`Date.now()`). With no timer, "wait until TTL" never wakes up |
| JD-7 | warning | F-5 (part) | F-7 | confirmed (info) | Deferred `afterNextRender` and settle timer before `show` are not cancelled on a newer nonce, center change or destroy. `show` while active has no stated behavior |
| JD-8 | warning | — | F-6 | suspect (info) | The effect does not gate on `request.centerAcronym === ctx.centerAcronym()`, so during a cross-center switch it evaluates the old center's list |
| JD-9 | warning | F-8 | — | suspect (info) | §10 says Tab stays in the popover. driver's trap also includes the card's focusables |
| JD-10 | warning | — | F-8 | suspect (info) | Citation `src/styles.scss:695-700` should be `:699-702` |
| JD-11 | suggestion | F-9 | F-9 | confirmed (info) | P-11 should cite title, description and button `innerHTML` |
| JD-12 | suggestion | — | F-11 | suspect (info) | DD-3's "driver finds nothing to scroll" is not guaranteed for cards not fully in the window |
| JD-13 | warning | — | F-5 | suspect (info) | The bilateral tour is not a signal, so "wait while the tour is open" becomes silent expiry |
| JD-14 | suggestion | F-10 | — | suspect (info) | Reverse guard: the tour can start while the spotlight is open |
| JD-15 | suggestion | — | F-10 | suspect (info) | `clearFilters()` does not cancel the pending search debounce, which can re-hide the group |

Counts: **2 confirmed severe** (JD-1, JD-2) · **1 split-severity** (JD-3) · **1 single-judge severe settled by re-run** (JD-4) · 0 contradictions · 11 info rows (JD-5..JD-15).

## Round-1 correction

The user chose **Fix and Re-judge** (2026-10-27). The fix set was JD-1 and JD-2 (confirmed severe) and JD-3 and JD-4 (split severity, and single-judge severe settled by re-run), included at the user's choice, plus the info rows JD-5..JD-15. The result was `design.md` revision 2.

## Round 2 (scoped re-judgment): CHANGES REQUIRED from both judges

| ID | Severity | A | B | Status | Finding |
|---|---|---|---|---|---|
| FC-1 | **severe** | yes | yes | confirmed | Re-arm wrote the same job id into `pendingHighlightJobId`. An equal signal value does not notify, so the `?job=` effect never re-ran, and the same-job re-click broke (ADS-AC-1c) |
| FC-2 | **severe** | yes | yes | confirmed | `highlight()` injects `showButtons: []` ahead of the step popover, so config-level buttons were ignored and no Got it button rendered |
| FC-3 | warning | yes | yes | confirmed | `highlightSettledJobId` was not reset on a `?job=` change or a center change |
| FC-4 | warning | yes | yes | confirmed | The ring could move ahead of the URL on a cancelled navigation |
| FC-5 | suggestion | yes | — | info | P-14 line citation |
| FC-6 | suggestion | yes | yes | info | Case-sensitive center compare |

The second (final) fix round addressed FC-1..FC-6, giving revision 3. It added P-17 and P-18, `highlightRearmSeq`, step-popover buttons, settled resets, the URL-landed gate, and a case-insensitive center compare.

## Round 3 (final scoped re-judgment): APPROVE from both judges

| ID | Severity | Judge | Disposition |
|---|---|---|---|
| FX-1 / FC-5 | warning / suggestion | A, B | P-14 snippet quoted the wrong minified handler name. Fixed post-approval (info) |
| FX-2 / R3-2 | suggestion | A, B | The center-change reset should also clear `highlightApplied`. Applied post-approval (info) |
| R3-3 | suggestion | B | Component LOC under-estimated. Budget re-estimated to ≈ 530 (info) |

No severe or fix-caused defect remains.

**JUDGMENT: APPROVED ✅**
