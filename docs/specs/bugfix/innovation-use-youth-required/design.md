# Design — Innovation Use: Youth required, no silent Non-youth

> **Answer first:** three small, separate fixes.
> 1. **Client:** for in-scope results, the grid shows Non-youth empty while Youth is empty, with a hint asking for Youth (0 if none).
> 2. **Server:** `getInnovationUse` returns `null` Non-youth when the total or Youth is null.
> 3. **DB:** `validation_innovation_use_P25` gets one extra `IF EXISTS … RETURN FALSE` inside each of its two existing 2026 W1/W2 gates, so a row with a total above 0 and an empty Youth is incomplete.
>
> There is no schema change, no new endpoint and no new primitive.

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `bugfix/innovation-use-youth-required` |
| Depth | Lite (Bug Mode) |
| Requirements | `requirements.md` (approved by Santiago, 2026-11-11) |
| Status | approved — the user asked on 2026-11-11 to run specify end to end without menus ("haz todo esto tú, no me preguntes con qué sigues"). Gate logged as `auto-approved (user instruction 2026-11-11)`; escalations still stop |
| Verified at | `e76b88603` (`qa-development-2026-ss`) |
| Skills | `angular-developer`, `nestjs-expert`, `tdd` |

## 2. Executive Summary

| Layer | Today | After |
|---|---|---|
| Client grid (in-scope) | Non-youth = total − null = total, 1.1 s after typing | Non-youth stays `null` while Youth is empty. A hint shows under that gender's inputs |
| Server read | `men − men_youth` → 5000 when Youth is null | `null` when either side is null, otherwise the difference |
| DB completeness | women/men present is enough | In-scope rows also need Youth whenever that gender's total is > 0 |

## 3. Architecture Overview

No new flow. The reporter types in the shared `innovation-use-form`. The host saves through the existing Innovation Use endpoint. The green check reads `validation_innovation_use_P25`. The form reloads through `summary.service.getInnovationUse`. Each of the three fixes sits on one of these existing hops.

## 4. Extended Directory Structure

| Path | Change |
|---|---|
| `onecgiar-pr-client/src/app/shared/components/innovation-use-form/innovation-use-form.component.{ts,html,spec.ts}` | Derivation gate, hint, tests |
| `onecgiar-pr-client/src/app/shared/components/innovation-use-form/farmer-follow-up.ts` (or a sibling copy constant in the same folder) | Hint copy string |
| `onecgiar-pr-client/src/app/shared/components/innovation-use-form/CLAUDE.md` | Folder-doc update and re-stamp (client CLAUDE.md §10) |
| `onecgiar-pr-server/src/api/results/summary/summary.service.{ts,spec.ts}` | Null-safe derivation and regression test |
| `docs/specs/bugfix/innovation-use-youth-required/sql/` | `validation_innovation_use_P25.before.sql` (live snapshot), `.after.sql`, `.after.body-only.sql` (DBeaver), `checks.sql` |

## 5. Data Model

No change. `result_actors.women_youth` and `men_youth` already exist (`bigint`, nullable). Non-youth stays unstored.

## 6. API Design

`GET` Innovation Use (summary): `actors[].women_non_youth` and `men_non_youth` may now be `null`. The key names and the type (`number | null`) are unchanged, and the client model already accepts `any`.

This endpoint is not `/api/bilateral/*` or `/api/platform-report/*`, so no payload changelog entry is needed.

## 7. Backend Module Design

- **DD-1 — null-safe derivation in `getInnovationUse`.** Non-youth is `null` when the total or Youth is `null`/`undefined`; otherwise it is the total minus Youth.
  - The change applies to every phase and source, as IUY-R-3 accepts (display only).
  - Backend route: lead `nestjs-expert`, tests `tdd` (test-first), stack per the Skill Map.
- **DD-2 — DB rule inside the existing gates.**
  - Section 1 (current use, after the IFC-R-6 Farmers check at after.sql `:237-253`) and section 2 (2030, the gate at `:425`) each get one `IF EXISTS` that returns `FALSE`.
  - It matches an active row of that section with:
    - `sex_and_age_disaggregation = 0`
    - and either `women > 0 AND women_youth IS NULL` or `men > 0 AND men_youth IS NULL`.
  - Why `IF EXISTS` and not a new branch inside the CASE: it reuses the gate the P2-4048 rule already uses, so 2025, W3 and `source IS NULL` behave exactly as that rule does. The CASE stays byte-for-byte, which keeps the diff small.
  - Not affected:
    - Households rows store `sex_and_age_disaggregation = 1` (`innovation-use-form.component.ts:571-574` resets it to `false` when leaving Households), so the `= 0` guard excludes them.
    - Age-fallback rows have Youth filled by the split (`:346-347`), so they never match.
    - "To be determined" blocks return before the actor block.
  - IPSR packages do not use this function.

## 8. Frontend / UX Component Architecture

- **DD-3 — gated derivation.** In `validateYouth`'s 1.1 s timer, Non-youth becomes `null` when Youth is empty (`null`, `undefined` or `''`) **and** `isFarmerFollowUpResult()` is true. Otherwise the current `total − Youth` stays, so IPSR step 1, 2025 and W3 keep today's typing behavior.
  - Design route: lead `angular-developer`, Spartan not needed (an existing `explanation_message` div), ENV n/a (no new surface).
- **DD-4 — hint.**
  - A new method `showYouthRequiredHint(actorItem, gender)` returns true when all of these hold:
    - `isFarmerFollowUpResult()`
    - the row has `!sex_and_age_disaggregation` and `!age_disaggregation_not_available`
    - `Number(total) > 0`
    - Youth is empty
  - The template adds one `<div class="explanation_message">` under that gender's Non-youth input, in both grids: current use `.html` about 180-188 / 214-222, and 2030 about 577-585 / 610-618.
  - Copy (IUY-NFR-2), as a constant: **"Enter the number of youth (0 if none) to calculate Non-youth."** OQ-1 in the proposal: confirming with Angel is optional and does not block.
- **Zoneless:** the hint is a method read from the template, and every write path already calls `markForCheck()`, so no new signal is needed.

## 9. Shared Contracts or Package Extensions

None. `isFarmerFollowUpResult()` is reused as is.

## 10. Design Decisions

| DD | Decision | Rejected alternative |
|---|---|---|
| DD-1 | Null-safe server read for all results | Gate the server by phase/source. Rejected: a null Youth never means "0 youth" in any phase |
| DD-2 | `IF EXISTS` inside the existing 2026 W1/W2 gates | A new CASE branch. Rejected: it is harder to keep 2025 byte-identical |
| DD-3 | Client derivation gated by `isFarmerFollowUpResult()` | Ungated. Rejected: it changes IPSR step 1 and 2025 typing, which are out of scope |
| DD-4 | Hint per gender under Non-youth | A single hint per row. Rejected: it cannot say which side is missing |

**Reversion challenge (Step 2.3):** DD-1 and DD-3 replace "Youth null → Non-youth = total" with null. Q: what does removing it break?
- A: the existing specs assert `non_youth` only with a numeric Youth (`summary.service.spec.ts:661-681`; form spec `:142-202`, `:702-748`, `:1255-1317`).
- No consumer sums the derived Non-youth: the review drawer recomputes its own (`innovation-use-content.component.ts:113-116`), and `innovation-use.service.ts:941` derives its own value.
- No breakage found.

## 11. Premise Ledger

Count: 8 premises — 7 verified, 1 `UNVERIFIED` (High: 1).
Blast-radius triggers fired: `live-path` (names a user action), `shared-state` (the template is shared with IPSR step 1), `consumer` (the response field `*_non_youth` changes).

| # | Claim | Class | Citation (as run) | Verified at | If false | Settled by |
|---|---|---|---|---|---|---|
| P-1 | The client derives Non-youth as total − Youth with no null guard, so an empty Youth gives the total | existence | `innovation-use-form.component.ts:693`; `node -e "100-null"` → `100` | e76b88603 | DD-3 not needed (Low) | — |
| P-2 | The server read derives the same way, so Youth null gives the total | existence | `summary.service.ts:394-395`; `node -e` `{men:5000,men_youth:null}` → `5000` | e76b88603 | T-1 not needed (Low) | — |
| P-3 | The typing user action reaches `validateYouth` in both grids | live-path | `innovation-use-info.component.html` → `<app-innovation-use-form>`; `.html:168,178,202,212` (current use) and `:565,574,599,608` (2030) `(ngModelChange)="validateYouth(...)"` → `.ts:658-697` | e76b88603 | DD-3 changes the wrong place (High) | — |
| P-4 | The form is shared with IPSR step 1 (`isIpsr=true`); `isFarmerFollowUpResult()` returns false there, for phase year < 2026 and for W3 | shared-state | `.ts:532-536`; folder `CLAUDE.md` "Where it is used" (step-n1 `.html:26`). Other readers of `*_non_youth`: IPSR step-n1 / step-n3 components, bilateral drawer, anticipated-innovation-user. Each derives its own value and none calls this component's `validateYouth` (grep below) | e76b88603 | DD-3 leaks into IPSR (High) | — |
| P-5 | Readers of `*_non_youth` from `getInnovationUse`: only the shared form via `innovation-use-info` | consumer | `grep -rn non_youth --include=*.ts --include=*.html onecgiar-pr-client/src/app` (excluding specs): step-n1, step-n3, review drawer, IPSR models and this form. The first three read IPSR or bilateral endpoints, not summary | e76b88603 | A screen shows "null" (Low) | — |
| P-6 | Test files pinning `*_non_youth` or `validateYouth` | consumer | `grep -rln 'validateYouth\|women_non_youth\|men_non_youth' --include=*.spec.ts --include=*.cy.ts onecgiar-pr-client onecgiar-pr-server/src` → 9 files (form spec + zoneless, step-n1 ×2, step-n3 ×2, drawer, anticipated-innovation-user, `summary.service.spec.ts`). None asserts a total with a null Youth | e76b88603 | Existing tests turn red (Low) | — |
| P-7 | Households rows store `sex_and_age_disaggregation = 1`; the fallback fills Youth | data-env | `.ts:571-574` (leaving Households resets it to `false`); `.ts:346-347` | e76b88603 | DD-2 blocks Households or fallback rows (High) | — |
| P-8 | The live TEST and PROD `validation_innovation_use_P25` equals the archived P2-4048 after.sql | data-env | `UNVERIFIED — confirm at source before relying on it` | — | DD-2's after.sql would overwrite a newer body (High) | T-0 (Santiago, `SHOW CREATE FUNCTION` on TEST + PROD, diff against `archive/2026-11-03-changes--innovation-use-farmer-count-nature/sql/validation_innovation_use_P25.after.sql`) |

## 12. Budget (Step 2.4)

| Item | Estimate | Tripwire |
|---|---|---|
| Tasks | 5 (T-0 manual, T-1, T-2, T-3, T-4 manual) | 7 |
| LOC | about 160 (prod about 40: client 25, server 4, SQL 2×12; tests about 120) | 300 |
| Review rounds | 1 per code task | 3 on any task |

Lite fits: three independent tasks, each under a day.
