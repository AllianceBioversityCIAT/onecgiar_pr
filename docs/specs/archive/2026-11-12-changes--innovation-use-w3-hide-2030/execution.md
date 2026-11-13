# Execution — Hide the 2030 Use Projection on W3/Bilateral Innovation Use (`IWH`)

## Document Control

| Field | Value |
|---|---|
| Spec | `changes/innovation-use-w3-hide-2030` |
| Branch | `qa-development-2026-ss` |
| Started | 2026-11-11 |
| Leader | Claude Code (opus) · Implementer `akili-implementer` (sonnet) · Reviewer `akili-reviewer` (opus) |
| Approval mode | gated (no proposal Document Control); continue prompts suppressed per user standing rule |
| Persona drift | `akili doctor --agents`: leader `primary-instructions` OUTDATED (matched 2.36.0); implementer/reviewer current — reported to user, not fixed in this run |

## Task Execution History

### IWH-T-1 — Shared form hides the 2030 block for W3 (not IPSR)

- **Final status:** PASS · 2026-11-11 · attempts: 1
- **Attempt 1**
  - files changed: `onecgiar-pr-client/src/app/shared/components/innovation-use-form/innovation-use-form.component.ts` (getter `hides2030Projection`), `…/innovation-use-form.component.html` (`@if (!hides2030Projection)` opens `:449` before the `2030-to-be-determined` radio, closes `:796` before `<!-- Estimates CGIAR Component -->`), `…/innovation-use-form.component.spec.ts` (+`describe('InnovationUseFormComponent — IWH — 2030 block by source')`), `…/innovation-use-form/CLAUDE.md` (W3 gate trap line + re-stamp)
  - red run (test 1, before getter + `@if`), verbatim:
    ```
    × 1. W3/Bilaterals hides the whole 2030 block (block, question, to-be-determined radio) (269 ms)
      expect(received).toBeNull()
      Received: {"nativeNode": <div data-block="2030"><app-pr-field-header label="Actors" /> ... <app-add-button name="Add other" /><!--container--></div>}
      > 1904 |     expect(block2030()).toBeNull();
    ```
  - falsifier mutations (observed, reverted): `return false` → test 1 red · `return true` → tests 2, 3, 4 red · drop `!this.isIpsr` → test 3 red
  - Implementer verification: `npx jest --findRelatedTests <ts> <html> --maxWorkers=2 --silent --reporters=summary --no-coverage` → `Test Suites: 24 passed, 24 total` / `Tests: 1069 passed, 1069 total`; `ESLINT_USE_FLAT_CONFIG=false npx eslint <ts> <spec.ts> --quiet` → clean
  - evidence re-run (Leader-inline): same jest command → 24/24 suites, 1069/1069 tests; eslint exit 0 → **VERIFIED**
  - Reviewer: **PASS** (checklist, medium) — getter matches DD-1; `@if` boundaries exact, braces balanced; fail-toward-show covered by test 4; payload untouched (DD-3, test 5); IPSR test adaptation acceptable
  - runtime events: none
- **spawns:** implementer 28 calls, 160904 tokens, ended complete; reviewer 9 calls, 101140 tokens, ended complete
- **ADVISORY:** readability — record the test-3 deviation (below).
- **Requirements covered:** IWH-R-1 (W3 scenario, W1/W2 scenario, IPSR scenario, BUT clause, AND IT MUST clause), IWH-N-2
- **Decisions made:**
  - Test 3 (IPSR) asserts `hides2030Projection === false` at getter level, not DOM "present": the whole 2030 block already sits inside `@if (isP25() && !isIpsr)` (`.html:379`), so IPSR step 1 renders none of it today. IWH-R-1's IPSR scenario ("rendered exactly as today") holds trivially; the getter guard still protects a future relaxation of the outer `!isIpsr` (P2-3426). Not a spec change — tasks.md test 3 wording ("→ present") is unreachable in the DOM.
  - Lint command: client has `.eslintrc.json` only, so `ESLINT_USE_FLAT_CONFIG=false` is required.
  - Wrapped template lines not re-indented (minimal diff).
- **Issues encountered:** none blocking. Test 5 checks payload immutability only; it does not catch getter mutations (by design).
- **Running totals vs budget:** tasks 1/3 · LOC ~121 (≈11 code + ≈108 spec + 2 doc) vs ~120 total · review rounds 1 vs 1 per code task — within budget.
- **Final verification:** VERIFIED + Reviewer PASS.

### IWH-T-2 — Bilateral form drops the 2030 block

- **Final status:** PASS · 2026-11-11 · attempts: 1
- **Attempt 1**
  - files changed (`onecgiar-pr-client/src/app/pages/bilateral/components/section-type-specific/type-innovation-use/`): `type-innovation-use.component.html` (P2-3428 wrapper `<div class="flex flex-col gap-3">` deleted — title radio, guidance alert, question, three `@if (showProjection2030Lists)` lists — replaced by the INC-168060 comment), `type-innovation-use.component.ts` (`hasActorMissingType` current-use only + doc comment; comment-only edit near `:907` in `updateMds`), `type-innovation-use.component.spec.ts` (tests 1-3; old "2030 actors block save" test replaced by its inverse; two old P2-3428 template tests replaced by an absence test), `CLAUDE.md` (P2-3428 entry marked removed by INC-168060)
  - red run (test 2 before edit), verbatim:
    ```
    ● ... › BIL-1 — an actor row with figures but no actor type › INC-168060 — a typeless actor in the 2030 projection no longer blocks the save (the block is gone from the form)
        expect(received).toBe(expected) // Object.is equality
        Expected: false
        Received: true
        > 1148 |       expect(component.hasActorMissingType).toBe(false);
    ```
  - falsifier mutations (observed, reverted): restore projection half in `hasActorMissingType` → test 2 red (`1 failed, 151 passed, 152 total`) · restore markup → test 1 red (`1 failed, 151 passed, 152 total`)
  - Implementer verification: `npx jest --findRelatedTests <ts> <html> --maxWorkers=2 --silent --reporters=summary --no-coverage` → `Test Suites: 23 passed, 23 total` / `Tests: 1096 passed, 1096 total` (run before the falsifier reverts); eslint clean
  - evidence re-run (Leader-inline, on final post-revert tree): same jest command → 23/23 suites, 1096/1096 tests; eslint exit 0 → **VERIFIED**
  - Reviewer: **PASS** (full conformance, checklist lens, medium) — deletion boundaries exact, no orphan wrapper; readiness explanation and P2-3424 block unchanged; `buildPayload` untouched (`:841`, `:844-847` send loaded values — R-2 BUT clause, DD-3); `:907` edit comment-only; test-2 fixture tbd `null` (disqualifier avoided); `updateMds` stays in step with the Save gate
  - runtime events: none
- **spawns:** implementer 13 calls, 95992 tokens, ended complete; reviewer 9 calls, 104914 tokens, ended complete
- **ADVISORY:**
  - readability — `readonly projection2030Copy` (`.ts:118`) no longer used by the template; kept (not in do-not-touch list, removal out of scope).
  - readability — folder `CLAUDE.md` `**Verified:**` line not re-stamped (client `CLAUDE.md` §10); add at commit time.
  - risk (low) — a typeless 2030 actor now travels to the server instead of being blocked client-side; server writer matches by `actor_type_id IsNull` (`innovation_dev.service.ts:205`, `:240-243`). Pre-existing behaviour; worth a one-line check that a section-2 typeless row cannot collide with a current-use typeless row.
- **Requirements covered:** IWH-R-2 (scenario, AND clause, BUT clause), IWH-N-1, IWH-N-2
- **Decisions made:** old spec test asserting 2030 actors block save replaced by its inverse (contradicts IWH-R-2). Reversion of P2-3428 accepted per IWH-DD-2 (Q-1 still open: notify the P2-3428 requester).
- **Issues encountered:** none.
- **Running totals vs budget:** tasks 2/3 · LOC T-1 ~121 + T-2 ~144 changed (28+/116−; mostly deleted markup) ≈ 265 changed lines vs ~120 expected — over on raw line count, driven by the deletion of ~86 lines of template the budget counted as ~0. Net added code+spec ≈ 150 lines, review rounds 2 vs 2 expected. Flagged to user at the gate; not treated as a tripwire stop since the overrun is deleted markup the spec itself mandated.
- **Final verification:** VERIFIED + Reviewer PASS.

### IWH-T-3 — Data fix for W3 rows left at NULL (user-run)

- **Final status:** PASS (user-run, review skip-eligible) · closed 2026-11-12 — 2 PROD rows updated (32686 on 2026-11-11, 32740 on 2026-11-12); PRTest batch done
- **Observed (user, PRMSPROD, DBeaver screenshots):** result id 32686 (result_code 25962, phase_year 2026, status 1) now reads `innov_use_2030_to_be_determined = 1`, but `validation_innovation_use_P25 = 0`.
- **P-10 falsified for 32686:** NULL was not the only cause. Per-condition diagnosis against the live body (`docs/specs/archive/2026-11-03-changes--innovation-use-farmer-count-nature/sql/validation_innovation_use_P25.after.body-only.sql`): readiness_level NULL (explanation not required); current-use block has data, 0 bad actors/orgs/measures; **`bad_initiative_budget = 1`, `bad_institution_budget = 3`**, project budget 0.
- **Separate cause (Estimates, not IWH):** 4 budget rows with `kind_cash` NULL and `is_determined` NULL: initiative SP12 (budget_id 36857); institutions Wageningen University and Research Centre (26415), The World Vegetable Center (26416), One Acre Fund (26417). The user can fill them: the bilateral IU page renders `<app-estimates-cgiar>` (`type-innovation-use.component.html:167`). No data fix needed; it does not block T-1/T-2 (per T-3 done criteria).
- **Prod UI check (Leader, Claude in Chrome, read-only, 2026-11-11):** `reporting.cgiar.org/bilateral/Bioversity (Alliance)/result/25962?phase=8` → Type-specific details shows no "2030 Use Projection" block (no "2030" text on the page): P2-3428 is not deployed to prod, so the UPDATE has no visible UI effect there; its only effect is on `validation_innovation_use_P25`. INVESTMENT (USD) shows the same 4 empty rows the SQL found (SP12, Wageningen, WorldVeg, One Acre Fund); section reads "3 fields missing". IWH-T-2's visible effect is only on PRTest (where P2-3428 is live). User chose to update only 32686 for now; 32740 untouched.
- **Correction (same day):** P2-3428 IS on master/prod (`git merge-base --is-ancestor 467b735155 origin/master` → yes). The bilateral 2030 block sits behind the Type-specific **"Complete full metadata"** toggle (view-only `toggleShowAll()`), which is why the MDS view of 25962 showed no "2030". The earlier note "not deployed to prod" is wrong.
- **PRTest before/after (Leader, Claude in Chrome, view-only; user ran the UPDATE for id 12071 only):** result code 9603 (id 12071, version 36, Bioversity (Alliance)), Type-specific → Complete full metadata. Before: "2030 Use Projection" radio "This is yet to be determined" unchecked, guidance + projection question + empty Actors/Organizations lists visible, section nav orange dot, "Unsaved changes" footer (form self-dirtying on expand; not saved). After `innov_use_2030_to_be_determined = 1`: radio checked, header green, the three 2030 lists hidden, "Type-specific details" nav check green, footer "Section complete". Screenshots: `claude-chrome-screenshots-awPZ5e/screenshot-1794432451565-0.jpg` (before), `…-1794432789640-1.jpg` (after).
- **Execute-time spec edit (2026-11-11, user request):** `requirements.md` §1.1 *Decision Record* added (requester Nicoleta Trifa, ticket INC-168060 / SR-168060, email 2026-11-11 09:07, verbatim quote, P2-3428 reversal, data kept, green-check side effect). Documentation only; no requirement meaning changed.

- **2026-11-12 — remaining rows (user, DBeaver screenshots):**
  - Pre-check (READ, same `WHERE` as the UPDATE): PRMSPROD → 1 row (id 32740, result_code 28388, 2026, status 1, riu 1082, tbd NULL, `iu_section_ok = 0`). PRTest → 148 rows (149 minus 12071), all tbd NULL, all `iu_section_ok = 0`.
  - UPDATE run on both with the guarded `WHERE` (`source='API'`, `result_type_id=2`, active, `phase_year=2026`, riu active, tbd NULL; PROD also `r.id = 32740`) + active `COMMIT`. Affected = pre-check count (1 / 148), disqualifier not triggered.
  - Post-check (fresh tab): PROD 32740 → tbd `1`, `iu_section_ok = 0`. PRTest `still_null = 0`.
  - P-10 falsified for 32740 as well: NULL was not its only cause. Same pattern as 32686 is the prime suspect (Estimates budget rows with `kind_cash` and `is_determined` NULL); diagnosis query given in chat. Separate cause, does not block T-1/T-2 (T-3 done criteria).
  - 2025 Approved row 29318 left alone (Q-2 default).
  - **32740 cause found (user, PRMSPROD, 2026-11-12):** budget diagnosis returns 1 row: initiative **SP02**, `result_initiative_budget_id` 36911 (link `results_by_inititiative.id` 39921), `kind_cash` NULL, `is_determined` NULL. No project or institution budget gaps. The user can fill it in the bilateral INVESTMENT (USD) section; no data fix. Not an IWH cause.

## Pre-commit gate (2026-11-12)

- `npx jest --findRelatedTests` on the 6 touched code/spec files (both components, `.ts` + `.html` + `.spec.ts`), `--maxWorkers=2 --silent --reporters=summary --no-coverage` → `Test Suites: 27 passed, 27 total` / `Tests: 1420 passed, 1420 total`.
- `ESLINT_USE_FLAT_CONFIG=false npx eslint` on the 4 touched `.ts` → clean.
- `type-innovation-use/CLAUDE.md` `**Verified:**` line re-stamped (T-2 advisory closed).
- Committed with explicit paths only; unrelated working-tree changes (`bilateral-pdf-mds-only`, `bugfix/pdf-2026-type-section`) left out.
