# Execution Log — Overview W1/W2 Contributor Badge

## 1. Document Control

- Spec path: `docs/specs/changes/overview-w1w2-contributor-badge`
- Started: 2026-09-29

## 2. Task Execution History

### `BOV2-T-1` — Add center-wide W1/W2 contributor count and badge

**Attempt 1 — FAIL (2026-09-29)**

- Files changed:
  - `onecgiar-pr-client/src/app/pages/bilateral/pages/bilateral-overview/bilateral-overview.aggregate.ts`
  - `onecgiar-pr-client/src/app/pages/bilateral/pages/bilateral-overview/bilateral-overview.aggregate.spec.ts`
  - `onecgiar-pr-client/src/app/pages/bilateral/pages/bilateral-overview/bilateral-overview.component.html`
  - `onecgiar-pr-client/src/app/pages/bilateral/pages/bilateral-overview/bilateral-overview.component.spec.ts`
  - `onecgiar-pr-client/src/app/pages/bilateral/pages/bilateral-overview/CLAUDE.md`
- Implementer verification: `npx jest --testPathPattern="bilateral-overview.aggregate.spec|bilateral-overview.component.spec" --silent --reporters=summary --no-coverage` → 2 suites passed, 73 tests passed. `npx ng lint --quiet` → clean.
- Reviewer verdict: **FAIL** (code conforms; docs-only blocker)
  - **Discovered Issue:** `bilateral-overview/CLAUDE.md` is 128 lines — over the hard 120-line cap (`Verified:` stamp on line 128). The new `BOV2` invariant bullet (~11 lines) pushed it over, and part of it is history narrative ("BOV-T-1's attempt 1 failed review... don't repeat that regression") rather than context, plus it repeats wording the adjacent `BOV-T-1` bullet already states (single loop, no second iteration, copied pill tokens). Leader confirmed via `wc -l`: 128 lines.
  - **Violated Rule:** `onecgiar-pr-client/docs/COMPONENT-DOCS.md` §4 — hard 120-line cap; history belongs in the ticket, not the file.
  - **Remediation Suggestion:** trim the new `BOV2` bullet to ~3-4 lines (keep: filter definition, same-loop computation, icon + conditional token, label source pointer; drop the attempt-1 narrative). Tighten the `BOV-T-1` bullet too if needed to land at/under 120 lines, `Verified:` stamp last.
  - All 4 functional requirements (`BOV2-R-1..4`) confirmed conformant — this is purely a doc-length fix, no code/test change needed.
- Decision: rework loop continues. Effort bumped medium → high. Attempt 2 dispatched, docs-only scope.

**Attempt 2 — FAIL (2026-09-29)**

- Files changed: `bilateral-overview/CLAUDE.md` only (docs-only fix, trimmed to exactly 120 lines).
- Implementer verification: line count 120 (≤120 cap, confirmed independently by Leader via `wc -l`). Jest unaffected: 2 suites passed, 73 tests passed.
- Reviewer verdict: **FAIL** (line cap now met; a new correctness/completeness problem introduced by the trim)
  - **Discovered Issue:** the replacement sentence for the old BOV-T-1 bullet's span-vs-button rationale reads "badge markup/tokens (`BOV-DD-4`, copied verbatim from `bilateral-projects-panel.component.html:265-299`) follow the next bullet's pattern." This is wrong on 3 counts: (1) it contradicts `BOV-DD-4` in `docs/specs/changes/overview-replicated-new-badges/design.md:126-131`, which says only the *tokens* were copied — the Reporting tab's badges are `<button>`s, these are non-interactive `<span>`s, because the whole card is already one `<a>` (nesting a button in an anchor is invalid HTML/an a11y hazard); "copied verbatim" claims markup identity that doesn't exist. (2) the span-not-button rule itself — the actual trap this doc exists to warn about — is now nowhere in the file; only the bare ID `BOV-DD-4` survives, attached to the wrong claim. (3) "follow the next bullet's pattern" points the wrong direction — the newer W1/W2 bullet copies the older replicated/new badges' pattern, not the reverse, and the next bullet doesn't restate the span rule either.
  - **Violated Rule:** `onecgiar-pr-client/docs/COMPONENT-DOCS.md` §3 (invariants/known traps/decisions with their reason) and `docs/specs/changes/overview-replicated-new-badges/design.md` `BOV-DD-4`, which the doc now contradicts.
  - **Remediation Suggestion:** replace the offending line with a 2-line sentence restoring the span-not-button rule and the tokens-only-copied fact, e.g.: "Badges are non-interactive `<span>`s, not the Reporting tab's `<button>`s — the whole card is one `<a>` (`BOV-DD-4`); only tokens are copied from `bilateral-projects-panel.component.html:265-299`, all counts in one loop (`BOV-DD-2`)." Must still land at/under 120 lines — trim redundant wording elsewhere in the new BOV2 bullet if needed (e.g. "no second iteration" duplicates "SAME ... loop"), never cut the span rule.
  - `BOV2-R-1..4` unaffected (attempt-1-passed code, not touched this attempt).
- Decision: rework loop continues — **final attempt (3 of 3)**. Effort bumped high → xhigh per the guardrail. Attempt 3 dispatched, docs-only scope, with explicit instruction to preserve the span-vs-button rule verbatim in substance while fitting the line budget.

**Attempt 3 — PASS (2026-09-29, FINAL attempt)**

- Files changed: `bilateral-overview/CLAUDE.md` only.
- Implementer verification: line count 120 (Leader independently confirmed via `wc -l`). Jest: 2 suites passed, 73 tests passed (docs-only, unaffected).
- Reviewer verdict: **PASS** — confirmed the span-not-button fact and its anchor-nesting rationale are correctly restated and attributed to `BOV-DD-4`; the single-loop fact correctly attributed to `BOV-DD-2`; the "verbatim markup" error from attempt 2 is gone (now correctly says only tokens are copied). Minor non-blocking note: "only tokens are copied" is technically sourced from `BOV-DD-3` rather than `BOV-DD-2`, but is consistent with both and not a misattribution to the wrong decision — no rework needed. Confirmed 120 lines satisfies the hard cap ("over it means...", so 120 itself is compliant). Cross-checked the new badge's filter/icon/tokens/label against the actual code (`bilateral-overview.aggregate.ts:159-164`, `bilateral-overview.component.html:140-143`) — all accurate.
- Requirements covered: `BOV2-R-1`, `BOV2-R-2`, `BOV2-R-3`, `BOV2-R-4` — all conformant (confirmed in attempt 1, unaffected by the docs-only rework in attempts 2-3).
- Not Done / Assumptions (same accepted-risk pattern as `overview-replicated-new-badges`):
  - Manual browser check — requires an injected JWT per `onecgiar-pr-client/CLAUDE.md` §9; not available to the Leader this session.
  - Visual side-by-side comparison against `bilateral-projects-panel`'s badges — no automated gate exists for this by design.
- Decision: **PASS**. Task finalized as `[x]` in `tasks.md`.

## 3. Summary

Task `BOV2-T-1` complete. `w1w2ContributorCount` added to `OverviewTotalResultsKpi` (center-wide count of W1/W2-and-contributing rows), rendered as a third badge (`pi-link` icon) on the Overview "Total results" card, matching the Reporting tab's third pill's token/conditional pattern. `aria-label` updated. `bilateral-overview/CLAUDE.md` updated to document the new invariant, exactly at the 120-line cap.

3 rework attempts total: attempt 1 FAILed on the folder doc exceeding its 120-line cap (code itself was conformant from the first pass); attempt 2 fixed the line count but introduced a factual error while trimming (wrongly claimed the badge markup was copied verbatim, silently dropping the span-vs-button/anchor-nesting rule); attempt 3 fixed both together and passed. This is the task's **last allowed attempt** — had it failed, the working tree would have been rolled back and the task HALTed.

Client Jest (73/73 passing, scoped) and lint clean throughout (no code changed after attempt 1). Outstanding: manual browser verification and visual side-by-side check, both pre-accepted risks per the sibling spec's established pattern — recommended before merge. No commit made (per standing rule — never commit without explicit user go-ahead).