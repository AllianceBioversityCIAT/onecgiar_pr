# Proposal — Programme Results tab can land on a phantom "Reporting 2026" default with 0 results, hiding real data that sits in an earlier phase

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `bugfix/phase-filter-missing-phases-prod` |
| Slug | `phase-filter-missing-phases-prod` — user-supplied (bare kebab-case), routed to `bugfix/` per Bug Track taxonomy instead of the default `changes/` |
| Type | **Bug** |
| Approval Mode | `gated` (default — no pre-approval mandate given) |
| Ticket | None (user-reported via `/akili-quick`, escalated after failing the Triviality Gate) |
| Screens affected | `result-framework-reporting/entity-details/:entityId/results` (Programme Results tab) |
| Date | 2026-09-14 |

## 2. Intent

When a user opens a programme's Results tab and that programme has not yet reported anything in the newest (currently open) reporting cycle, the tab should land on a phase that actually has data — not silently show "0 results" while implying the programme has no reportable history.

## 3. Problem / Current Behavior

User report (screenshots, prod `SP08` "Food Frontiers and Security"): the Phase filter dropdown on `/result-framework-reporting/entity-details/SP08/results` only offers **one** phase, "Reporting 2025 - P25", when the user expected several (as seen on a test/localhost session for a different programme, `SP03`, which offered 2026/2025/2024).

### Investigation (confirmed live against prod, 2026-09-14)

1. **The dropdown's single option is correct, not a bug.** `phaseOptions` (`programme-results.service.ts:356-363`) is derived entirely from the rows actually returned by the server — never hardcoded or filtered client-side. Calling the exact endpoint the page calls (`GET /api/results/get/all/roles/filter/575?limit=2000&page=1&submitter_id=57`, SP08's real submitter id) from an authenticated prod session returned **462 of 462 rows, every one of them `phase_name: "Reporting 2025 - P25"` / `version_id: 6`.** SP08 genuinely has zero owned results in any other phase in production today. A dropdown cannot offer a phase with no rows behind it — offering one would be the actual bug.
2. **The real, reproduced bug is the tab's *default* landing phase.** Navigating to the Results tab with no `?phase=` query param redirected to `?phase=Reporting%202026` and rendered **"0 results — No results match these filters"** — even though the programme's entire 462-row history (in `Reporting 2025 - P25`) was sitting one filter-value away. Clicking "Clear all filters" (which recomputes the default *after* rows have loaded) immediately corrected the view to `Reporting 2025 - P25` with all 462 rows. The empty-state message gives no hint that a different phase holds the data.
3. **Root cause (confirmed by code read + live repro), a load-order race between two effects in `programme-results.component.ts`:**
   - `defaultPhase()` (`:948-989`) picks, in order: an Overview deep-link phase, then the programme's own `phaseOptions()` matched against the globally active reporting phase (`DataControlService.reportingCurrentPhase`, e.g. "Reporting 2026"), falling back to `available[0]` when the active phase isn't among the programme's own options. **This logic is correct once `phaseOptions()` is populated** — but on a cold load, `ProgrammeResultsService.load()` is async, so the very first time `defaultPhase()` evaluates, `phaseOptions()` is still `[]` (`available.length > 0` is false), so it skips straight to `return activePhaseName || ...` — the *global* active phase name, unconditionally, with no knowledge of what this programme has actually reported.
   - The "URL → filters" effect (`:1072-1104`) writes that premature value into `selectedPhase` (no URL param present yet, so `phase = defPhase`).
   - The "Filters → URL" effect (`:1112-1145`) immediately mirrors it into the URL (`?phase=Reporting 2026`, `replaceUrl: true`).
   - Once rows load and `phaseOptions()` becomes `["Reporting 2025 - P25"]`, `defaultPhase()` **recomputes correctly** to `"Reporting 2025 - P25"` — but the "URL → filters" effect now reads `urlPhase` from the query params (no longer `null`, it's the phantom `"Reporting 2026"` the mirror effect already wrote), and the guard `phase = urlPhase !== null ? toFilterValue(urlPhase) : defPhase` makes the **stale URL value win over the corrected default** every subsequent run. The wrong default "locks in" and only a manual `Clear all filters` / re-selection breaks the lock (confirmed live: exactly this recovered the 462 rows).
4. This is a **timing/race defect in reactive default-resolution**, not a data problem and not the dropdown-population code the user pointed at — a fully different mechanism from the already-fixed `bugfix/portfolio-overview-partial-counts` (unordered `LIMIT`), even though both surfaced from the same `AllResultsByRoleUserAndInitiativeFiltered`-family endpoint family and both were diagnosed via a live prod fetch.

## 4. Proposed Outcome

- On a cold load with no `?phase=` param, the Results tab's default phase selection is only computed (and only written to the URL) once the programme's own `phaseOptions()` have settled — so the tab never locks the URL onto a phase the programme has zero data in.
- A programme that genuinely has zero data in the active phase but real historical data in an older phase lands on that older phase by default, showing its real rows — not a "0 results" empty state.
- A programme that genuinely has **no results at all** (in any phase) still gets its existing "nothing reported yet" empty state (`isNothingYet`) unaffected — this fix must not blur that distinct, intentional state.

## 5. Scope

- `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/programme-results/programme-results.component.ts` — `defaultPhase()` (`:948-989`) and/or the "URL → filters" / "Filters → URL" effect pair (`:1072-1145`) that races against `ProgrammeResultsService.load()`.
- Possibly `services/programme-results.service.ts` — exposing a clean "have phaseOptions settled" signal (e.g. derived from `loading()`) if the fix is guarding on that rather than reshaping the effects.

## 6. Non-Goals

- Not touching `phaseOptions` derivation itself (`programme-results.service.ts:356-363`) — confirmed correct, reflects real data.
- Not touching `AllResultsByRoleUserAndInitiativeFiltered` / `result.repository.ts` — no server-side query defect found here (unlike the sibling `portfolio-overview-partial-counts` bug); SP08's data is genuinely single-phase in prod.
- Not deciding whether SP08 *should* have historical data in earlier/other phases — that is a product/data question, out of scope for this UI defect.

## 7. Affected Users, Systems, And Specs

- **Users:** Any Science Program lead/user opening the Results tab of a programme that hasn't yet reported in the newest open cycle (likely common right after a new reporting cycle opens — cf. `bugfix/portfolio-overview-partial-counts`, confirmed 2026-09-14 that "Reporting 2026" only just became the open cycle).
- **Systems:** `onecgiar-pr-client` only — `pages/result-framework-reporting/pages/programme-results/`.
- **Specs:** No existing AKILI spec for `programme-results`'s default-phase logic; only the folder `CLAUDE.md`. This will be the first formal spec touching `defaultPhase()`.

## 8. Visual Reference

- Source: None
- Location: n/a
- Notes: No new UI — reuses the existing empty states and filter chip; this is a data-timing/logic fix, not a visual change.

## 9. Bug Diagnosis

### Observed Symptom
- On prod, opening `result-framework-reporting/entity-details/SP08/results` with no phase param shows "0 results — No results match these filters," even though the programme has 462 real results.
- The Phase filter dropdown offers only "Reporting 2025 - P25" (correct — see Root Cause item 1 below), but nothing in the empty state tells the user that selecting it (or clearing filters) reveals their data.

### Reproduction Steps
1. As an authenticated user with access to SP08, navigate to `https://reporting.cgiar.org/result-framework-reporting/entity-details/SP08/results` (no `?phase=` query param).
2. Observe the URL redirects to `?phase=Reporting%202026` and the table shows "0 results."
3. Click "Clear all filters" (or manually select "Reporting 2025 - P25" from the Phase dropdown).
4. Observe the table now shows 462 results and the URL reads `?phase=Reporting%202025%20-%20P25`.

### Root Cause (confirmed)
Race between `ProgrammeResultsService.load()` (async) and `defaultPhase()`'s reactive computation in `programme-results.component.ts`, confirmed by:
- Live fetch of the raw server response (`get/all/roles/filter/575?submitter_id=57`) showing 100% of SP08's 462 rows are `version_id: 6` / `"Reporting 2025 - P25"` — no other-phase rows exist to explain a "missing phases" theory.
- Live reproduction of the cold-load default landing on `Reporting 2026` (0 rows) despite this, and self-correcting the instant `defaultPhase()` is re-evaluated after rows load (via "Clear all filters").
- Code read of `defaultPhase()` (`:948-989`, correctly falls back to `available[0]` once `phaseOptions()` is non-empty) and the URL⟷filter effect pair (`:1072-1145`, whose equality/URL-precedence guard lets an early, wrong value that already reached the URL out-rank a later, correct recomputation of `defaultPhase()`).

### Impact & Scope
- Any programme that has not yet reported in the currently-open phase will show a misleading "0 results" on first visit instead of its real historical data, until the user manually clears/reselects a filter. Likely to recur every time a new reporting cycle opens (same trigger condition as `bugfix/portfolio-overview-partial-counts`, independently confirmed open as of 2026-09-14).
- No data loss or corruption — purely a client-side default-selection and URL-sync timing defect.

### Fix Strategy
Not cosmetic — touches reactive signal/effect timing and default-resolution logic, so this is **not** `/akili-quick` material. Route to `/akili-specify bugfix/phase-filter-missing-phases-prod` in **Bug Mode**, which requires a regression test proving: (a) on cold load, when the active/global phase has zero rows for the programme but an older phase has rows, the tab lands on the phase with rows, not a 0-result empty state; (b) a programme with genuinely zero results in any phase still shows the intentional "nothing reported yet" empty state, unaffected.

## 10. Approach Options

| Option | Description | Trade-off |
|---|---|---|
| **A — Defer the first default-phase URL write until `phaseOptions()` has settled** | Guard the "URL → filters" effect (or `defaultPhase()` itself) so it does not commit a value derived from an empty `phaseOptions()` into `selectedPhase()`/the URL; wait for `ProgrammeResultsService.loading()` to resolve once, then compute the real default. | Smallest, most targeted change; directly closes the race without touching unrelated states. Recommended. |
| **B — Let a later-corrected `defaultPhase()` overwrite a stale URL value on load completion** | Keep the current eager default, but add a one-time reconciliation after load completes: if the URL's current phase isn't in the freshly-loaded `phaseOptions()` AND it was never explicitly chosen by the user, replace it with the corrected default. | Achieves the same visible result, but requires tracking "was this value user-chosen or auto-set," which is more state and more surface for a new bug than Option A. |
| **C — Improve the empty-state copy only** | Leave the timing race as-is; when `isFilteredEmpty` fires and the selected phase isn't the programme's default, add a hint/CTA ("This programme has results in Reporting 2025 - P25 — view them"). | Cheaper, but leaves the actual defect (URL locks onto a data-free phase on cold load) live — masks the symptom rather than fixing it. Could be a good complementary UX improvement, not a substitute. |

## 11. Recommended Approach

**Option A.** It fixes the actual race instead of papering over its symptom, is scoped to one component, and does not need new state to distinguish "auto-set" from "user-set" — it simply avoids ever committing an ungrounded default in the first place.

## 12. Risks, Dependencies, And Open Questions

- **Risk:** Deferring the effect must not delay the tab's *first* meaningful render for programmes with zero results in any phase — `isNothingYet` must still resolve promptly once `load()` completes empty, not hang on a phase that will never arrive.
- **Risk:** Confirm no other consumer relies on the current (buggy) fast/eager default being written to the URL immediately (e.g., a deep link that expects the phase param to appear before rows resolve). `/akili-specify` should grep for `defaultPhase(` and the two effects' consumers.
- **Open question:** Should SP08 (and similarly single-phase programmes) actually have historical rows in earlier phases? That's a data/product question for the Science Programs team, not something this fix should attempt to answer or paper over.
- **Dependency:** None — self-contained within `programme-results` (client).
- No Active Lesson in `docs/specs/kaizen-log.md` applies (file does not exist yet in this repo).

## 13. Success Criteria

- A regression test proves: cold-loading the Results tab for a programme whose active/global phase has 0 rows, but an older phase has rows, lands on the phase with rows (not a 0-result empty state), without requiring a manual "Clear all filters."
- A regression test proves the "nothing reported yet" empty state is unaffected for a programme with genuinely zero results in any phase.
- Verified live in prod (or prod-equivalent data) on SP08: opening the Results tab with no query param shows the 462 real results by default.

## 14. Next Step

```text
/akili-specify bugfix/phase-filter-missing-phases-prod
```
(Bug Mode — root cause confirmed via code read + live prod repro; no data investigation needed before scoping the fix.)
