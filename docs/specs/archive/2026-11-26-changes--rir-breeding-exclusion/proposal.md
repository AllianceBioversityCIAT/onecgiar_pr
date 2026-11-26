# Proposal — RIR breeding exclusion, innovation packages and copy v3

## Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/rir-breeding-exclusion` |
| Slug | `rir-breeding-exclusion`, derived from the free-text argument |
| Type | Change |
| Deliverable | software |
| Approval Mode | gated |
| Ticket | SR-167303 (follow-up of INC-165323) |
| Requirement source | Nicoleta Trifa's reply on SR-167303, 25-Nov-2026 (points 1–5), and the workbook `SP01-breeding results excluded from Center update.xlsx`, sheet "Results excluded from notification" (Ruth Mawia, 25-Nov-2026) |
| Extends | `archive/2026-10-26-changes--replicated-innovation-reminders` (RIR), `archive/2026-11-23-changes--rir-center-focal-routing` (RCF), `archive/2026-11-23-changes--admin-reminders-page` (ARP) |
| Branch / worktree | `spec/rir-breeding-exclusion` from `origin/qa-development-2026-ss`, worktree `D:\PRMS\onecgiar_pr-rir` |
| Deadline | Nicoleta wants to release the notifications on **Fri 27-Nov-2026**, so the change must reach master before then |
| Depends on | none (RIR, RCF and ARP are in `origin/master`, checked with `git merge-base --is-ancestor`) |
| Parallel-safe | yes. It touches only `api/replicated-innovation-reminders/` and one new migration |
| Date | 2026-11-25 |

## Intent

Before the 2026 innovation-update reminders go out, three things must change:

- **Exclude SP01 breeding lines and varieties.** Breeding for Tomorrow (B4T) will update these results itself.
- **Add innovation packages** to the reminders.
- **Ship Nicoleta's revised email copy.**

## Problem / Current Behavior

- **Breeding results are still listed.** The reminder universe is every replicated result of type 2 or 7, in Editing, in the bound Reporting phase. No list of excluded results exists (`pending-innovation.repository.ts:89-93`). As a result, SP01 breeding varieties and lines would be listed to developers, the P/A MELIA and the Center MEL. B4T will update those results itself.
- **The size of the problem, PROD read-only, 25-Nov:**
  - 113 of Ruth's 114 codes are in today's universe: 66 W1/W2 and 47 W3. Code 28595 has already left Editing.
  - The universe goes from **1,918 → 1,805**. Only SP01 changes: W1/W2 207 → 141, W3 91 → 44.
  - No Center is left with nothing:

    | Center | Before | After |
    |---|---|---|
    | CENTER-06 | 58 | 22 |
    | CENTER-07 | 8 | 3 |
    | CENTER-05 | 13 | 10 |
    | CENTER-11 | 44 | 42 |
    | CENTER-01 | 21 | 20 |

- **Innovation packages are never listed.**
  - Packages are type 10 and live in the **IPSR** phase (`app_module_id = 2`), not the Reporting phase (`versioning.service.ts:1424-1448`). `findPending` filters on the bound Reporting `version_id` and types `(2, 7)` (`pending-innovation.repository.ts:89-90`), so it never sees them.
  - PROD read-only, 25-Nov: IPSR 2026 (`version_id 9`, open) holds 60 replicated packages. 58 are in Editing, 1 in QA and 1 Submitted. All 60 are W1/W2 and all have an SP owner.
- **Package links would point to the wrong place.** Every result link is built as `${RESULTS_URL}<code>/general-information?phase=<v>` (`reminder-dispatcher.service.ts:433`), which is the result-detail route. Packages open at `ipsr/detail/<code>/…` (`innovation-package-creator.component.ts:173`). `RESULT_TYPE_NAMES` only knows types 2 and 7 (`reminder-dispatcher.service.ts:68-71`).
- **The copy is outdated.** The template bodies are v2 (`1791700000000-RIR-RecipientModelV2.ts:292-374`) plus the Result ID hyperlink (`1791900000000-RIR-ResultIdHyperlink.ts`):
  - There is no breeding paragraph.
  - The Center email says "bilateral innovation(s), reported in previous years".
  - The MELIA summary intro says that "no innovation developer … can be reached". That is not true for Innovation Use and packages, which have no developer field.

## Proposed Outcome

When a campaign dispatches, previews or counts:

1. A result whose `result_code` is on an **active exclusion list** never appears in any email.
2. Replicated **innovation packages** in Editing, from the IPSR phase of the **same year** as the campaign's Reporting phase, appear in the P/A MELIA summary. Each package is labelled "Innovation package", and its ID and title link to the IPSR detail page.
3. Every email uses **Nicoleta's v3 copy**:
   - **Developer / P/A MELIA variant:** adds the breeding paragraph, closes "end of January {{nextYear}}", and ends with "({{nextYear}}, {{nextNextYear}} and beyond)".
   - **Center MEL variant:** says "reported in {{previousYear}}", the SP column reads "Science Program / Accelerator who has approved the result in {{previousYear}}", adds the breeding paragraph, and closes "mid-February {{nextYear}}".
4. Admin > Reminders shows pending and unreachable totals that already reflect 1 and 2. Those totals come from the same `plan()` path, so they cannot drift.

## Scope

| In | Out |
|---|---|
| A new exclusion table, seeded with the 114 codes (`result_code`) and a reason | An admin UI to edit the exclusion list. The table can take more rows later by SQL or by a follow-up |
| `findPending`: the exclusion `NOT EXISTS` and type 10 from the same-year IPSR phase | Changing the routing rules in `digest-builder` (type 10 already falls into the non-type-7 → MELIA branch) |
| Dispatcher: the type name for 10, the IPSR link for packages, template variables `previousYear` and `nextNextYear` | Replicating packages (it already ran: 60 replicated in IPSR 2026) |
| One migration that rewrites the 4 RIR template bodies to v3. `down` restores v2 with the linked ID cell | The automatic close to "Inactive – not updated" (separate request, not built) |
| Updated unit specs (repository SQL seam, dispatcher link and type name, migration) | Enrico Bonaiuti's suggested public disclaimer on records modified by the P/A MELIA. It is a different surface (result records) and Nicoleta must decide on it |
| PRTest smoke: preview + Send now to the redirect address | Point 4 of Nicoleta's mail (she added the Center contacts herself, no code) |

## Non-Goals

- No change to who receives which email, apart from packages joining the MELIA summary.
- No change to the campaign lifecycle, the cron, the claim or idempotency, or the ARP page UI.
- No change to the subject line.

## Affected Users, Systems, And Specs

| Affected | How |
|---|---|
| Innovation developers, P/A MELIA FPs, Center MEL FPs | Shorter lists for SP01-related recipients, packages added for P/A MELIA, new copy |
| Nicoleta (admin) | Sees the new totals on Admin > Reminders before she schedules |
| `onecgiar-pr-server/src/api/replicated-innovation-reminders/` | `pending-innovation.repository.ts`, `reminder-dispatcher.service.ts` and their specs |
| `onecgiar-pr-server/src/migrations/` | One new migration, `1793600000000-RIR-BreedingExclusionCopyV3` (latest on every branch today: `1793500000000`) |
| `template` table | Rows `email_template_replicated_innovation_{q4_notice,final_reminder,melia_summary,center}` |
| Client | None |
| `/api/bilateral/*` contract | None. The W3 form, API and Fetcher rule does not apply because no bilateral payload changes |

## Visual Reference

- Source: None (email copy only).
- Location: Nicoleta's copy is in the SR-167303 reply of 25-Nov (screenshot in the session). `/akili-specify` will transcribe it into the design.
- Notes: keep the v2 shell (header, styles, redirect notice, linked Result ID). In her mail the breeding paragraph is in red. We read that as marking what is new, not as styling for the email. Confirm at specify.

## Requirement Delta Preview

### ADDED Requirements

- **Exclusion list.** Results whose `result_code` is active in `replicated_innovation_reminder_exclusion` MUST NOT be selected, whatever their phase, type, source or routing.
- **Packages.** Replicated type-10 results in Editing, from the IPSR phase (`app_module_id = 2`, active) whose `phase_year` equals the campaign Reporting phase's year, MUST be selected under the same owner-SP, active and status predicates.
- **Package presentation.** A package's type name MUST be "Innovation package", and its links MUST open `ipsr/detail/<code>/general-information?phase=<version>`.
- **New template variables.** The template data MUST expose `previousYear` and `nextNextYear`.

### MODIFIED Requirements

- **RIR-R-1** (pending selection): adds the exclusion predicate and the IPSR branch for type 10.
- **RIR-R-11** copy (developer digest, MELIA summary, Center email): moves to v3. The MELIA intro becomes Nicoleta's generic "you have X innovation(s)…".

### REMOVED Requirements

- None.

## Approach Options

| Option | Summary | Pros | Cons |
|---|---|---|---|
| **A. Exclusion table + SQL predicate + template migration** | Seeded table, `NOT EXISTS` in `findPending`, type-10 branch, one REPLACE-body migration | Data-driven (more codes = a row, no deploy). One read path means preview, counts and send agree. Reversible `down` | A new table plus a migration with a 114-row seed |
| B. Hard-coded code list in TypeScript | A constant array, filtered after `findPending` | No schema change | Every list change needs a deploy. Easy to forget that counts and preview must filter too. The list lives in code |
| C. Reuse a result flag (for example a tag on `result`) | Mark the breeding results themselves | No new table | Touches shared result data that other modules read. A replicated result (new `id`) loses or duplicates the flag; `result_code` is the stable key |

## Recommended Approach

**Option A.** It is the smallest safe path: the filter sits in the one SQL that dispatch, preview and the Admin totals already share (`plan()` → `findPending`). The list is keyed on `result_code`, which survives replication. Adding codes later needs no deploy. Packages reuse the existing routing branch and need only a second phase predicate, a type name and a link helper.

## Risks, Dependencies, And Open Questions

| ID | Item | Default if unanswered |
|---|---|---|
| OQ-1 | **Packages routing**: to the P/A MELIA FPs, like Innovation Use (RIR-OQ-7)? Asked to Nicoleta 25-Nov | Yes, P/A MELIA summary. That is the current non-type-7 branch, so no routing code changes |
| OQ-2 | **January vs mid-February**: is the different close date on purpose? Asked | Keep her wording as written (developer/MELIA: end of January; Center: mid-February) |
| OQ-3 | **About 35 SP01 rows Ruth marked "Not an innovation"**: exclude them too? Asked | Not excluded. The seed is exactly the 114-row sheet. Adding more later is a table insert |
| OQ-4 | Is the red breeding paragraph meant to show in red? | Plain paragraph |
| R-1 | **Deadline:** the change must go qa-dev → perf → staging → master and be deployed by Fri 27-Nov. Cristian reviews staging → master | Tight. The scope is server-only and small, so the PRTest smoke is the gate |
| R-2 | **Kaizen KZ-changes--replicated-innovation-reminders-2:** validate seed or reference-row migrations with a read-only PROD query before release | Already done for the 114 codes (Q1/Q2/Q3 on 25-Nov). Re-run the counts after deploy |
| R-3 | **Kaizen estimation lesson** (RCF ran at 3.3× its estimate): count spec lines honestly at specify | Budget each falsifier spec |
| R-4 | **Center emails for opted-in Centers** (RCF) can carry W1/W2 results from years other than `previousYear`, while the copy says "reported in {{previousYear}}" | Accept Nicoleta's wording. Note it for her |
| R-5 | `RESULTS_URL` shape: the package link is derived by replacing `result/result-detail/` with `ipsr/detail/` | If the shape differs, fall back to the result-detail link. Verify on PRTest |
| R-6 | Changing the shared `findPending` SQL affects the counts, the preview and the send at once | Intended. Covered by the repository SQL-seam spec and the PRTest preview |

## Success Criteria

- On PRTest, the dry-run preview of an active-phase campaign contains none of the 114 codes and does contain replicated Editing packages, which link to `ipsr/detail/…`.
- The Admin > Reminders pending total equals PROD-like expectations (on PROD after deploy: about 1,805 + 58 packages).
- Every email renders the v3 copy with the right years, and the Result ID stays a link.
- Migration up, down and up on prdb leaves the 4 templates and the table in the expected state.
- Scoped server Jest and lint are green. `migration:check` passes.

## Next Step

```text
/akili-specify changes/rir-breeding-exclusion
```
