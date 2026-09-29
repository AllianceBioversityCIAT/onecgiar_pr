# Proposal — External Partners section shows/saves duplicate partners and can fail to save

## Document Control

| Field | Value |
|---|---|
| Spec path | `bugfix/external-partners-duplication` |
| Slug | `external-partners-duplication` — derived from free-text argument |
| Type | Bug |
| Depth | Standard (spans client rendering + a server data-integrity path; root cause of the duplicate DB rows is not yet fully confirmed — see Bug Diagnosis) |
| Approval Mode | gated |
| Status | approved (santiago.sanchez@cgiar.org, 2026-09-28) |
| Parent Spec | — |
| Depends on | none |
| Parallel-safe | yes (touches `rd-contributors-and-partners` / `normal-selector` client component and `results_by_institutions` server module; no other open spec touches these files) |
| Module | `results` / `ipsr` — Contributors & Partners (shared between W1/W2 and IPSR) |
| Owner | santiago.sanchez@cgiar.org |
| Ticket | none yet — found via manual use on prtest, IPSR result 9657, phase 37 |

## Intent

Stop the "External Partners" step (shared by W1/W2 Contributors & Partners and IPSR Contributors) from ever displaying or saving the same partner twice, and stop a duplicate/mismatched partner payload from crashing the save with a raw SQL error instead of a clear message.

## Problem / Current Behavior

On IPSR result 9657 (phase 37), the External Partners section showed **"Partner(s) selected (12)"** while only 6 distinct institutions existed: each of the 6 appeared once in the main (ToC-derived) chip list and again, identically, under the second "External partners:" / "Other(s) External Partners" dropdown section.

Saving the section (`PATCH` → `ContributorsPartnersService.updateContributorsAndPartners`) failed with:

```
ToC mapping (P25) created/updated successfully | Column 'result_institution_id' cannot be null
```

The ToC half of the save succeeded; the Partners half failed inside `ResultsByInstitutionsService.savePartnersInstitutionsByResultV2` → `handleInstitutions()`, which caught the DB error and returned it as a `message` string instead of surfacing a clean validation error — so the user saw a raw MySQL column-constraint message.

Manually deleting the 6 duplicate rows under "External partners" allowed the save to succeed, confirming the duplicated partners are the trigger.

## Proposed Outcome

| Situation | After the fix |
|---|---|
| A partner is already present (ToC-derived or previously saved as "Other") | It can never be re-added to the sibling bucket; it renders in exactly one list |
| The client nonetheless sends a duplicate/mismatched partner in the `institutions` payload (defense in depth) | The server de-duplicates or rejects with a clear validation message — never a raw SQL error |
| A partner save genuinely fails | The user sees an actionable message, not a DB column name |

## Scope

- `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-contributors-and-partners/rd-contributors-and-partners.service.ts` — `applyTocMappingOnLoad()` (~L599-613), the from_toc split that buckets `partnersBody.institutions` into "ToC" vs `otherPartnersSelected`, and every write path that can add to `otherPartnersSelected` (`onOtherPartnerSelect`, `onPartnerSelect`, and the save-time payload assembly in both `rd-contributors-and-partners.component.ts` and `ipsr-contributors.component.ts:606-633`).
- `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-contributors-and-partners/components/multiple-wps/components/normal-selector/normal-selector.component.ts` / `.html` (shared by W1/W2 and IPSR via `variant="ipsr"`, used at `ipsr-contributors.component.html:284`).
- `onecgiar-pr-server/src/api/results/results_by_institutions/results_by_institutions.service.ts` — `savePartnersInstitutionsByResultV2`, `handleInstitutions`, `_upsertAddedPartnerInstitutions`, `_appendPartnerInstitutionBudget` (the code path that inserts `result_institutions_budget` rows and where the NOT NULL failure surfaced).
- `onecgiar-pr-server/src/api/results-framework-reporting/contributors-partners/contributors-partners.service.ts` — `updateContributorsAndPartners`'s error handling (the `try/catch` that turns a raw DB error into a user-facing `message` string, and the `" | "`-joined ToC+Partners message that confused the diagnosis).
- Regression tests: client spec(s) proving a partner already in one bucket cannot enter the other; server spec(s) proving a duplicated/mismatched `institutions` payload does not reach a raw SQL error.

## Non-Goals

- No change to the ToC mapping save path (`applyTocMappingSectionUpdate` / `createTocMappingV2`) — it already succeeds and is not implicated.
- No redesign of the "ToC partners" vs "Other(s) External Partners" split UX (P2-3066) — the two-bucket design itself is fine; only the bucketing/dedup logic is in scope.
- No broad rewrite of `handleInstitutions`'s reactivate/create logic beyond what is needed to make it duplicate-safe and to stop a NOT NULL constraint from reaching the user as raw SQL text.
- No data-cleanup migration for result 9657 or any other already-affected result unless `/akili-specify` confirms live duplicate rows remain in the DB after the user's manual fix (out of scope to assume without verifying).

## Affected Users, Systems, And Specs

| Affected | Detail |
|---|---|
| Users | Any reporter filling External Partners in W1/W2 Contributors & Partners **or** IPSR Contributors on a 2026-phase (CP2026) result — both consume the shared `normal-selector` component |
| Code | `rd-contributors-and-partners.service.ts`, `normal-selector.component.ts/.html`, `results_by_institutions.service.ts`, `contributors-partners.service.ts` |
| Server data | `results_by_institution`, `result_institutions_budget` tables |
| Specs | `docs/specs/results/*` and `docs/specs/ipsr/*` families that touch Contributors & Partners — none currently open on these exact files per a scan of `docs/specs/` at proposal time |

## Visual Reference

- Source: None
- Location: —
- Notes: No new UI. Screenshots from the user's report (IPSR Contributors, External Partners section, result 9657) show the duplicated "Partner(s) selected (12)" state and the resulting save error dialog; both are bug evidence, not a design reference.

## Bug Diagnosis

### Observed Symptom

- IPSR Contributors → External Partners showed 12 selected partners where only 6 are distinct — each institution rendered twice: once in the main chip list, once under "External partners:" / "Other(s) External Partners".
- Clicking Save failed with a dialog reading `There was an error saving the section` / `ToC mapping (P25) created/updated successfully | Column 'result_institution_id' cannot be null`.
- Deleting the 6 duplicate rows under "External partners" made Save succeed.

### Reproduction Steps

1. Open an IPSR (or W1/W2) result on a 2026-phase, in Contributors & Partners / IPSR Contributors, where the External Partners section already has ToC-derived partners **and** the same institutions are also present with `from_toc: false` (this is the pre-condition believed to already exist on result 9657 — see Root Cause below).
2. Load the section — the same institution appears in both the primary chip list and the "Other(s) External Partners" list.
3. Click Save.
4. **Expected:** section saves. **Actual:** `Column 'result_institution_id' cannot be null` surfaces to the user.

### Root Cause (confirmed, partially)

**Confirmed — the rendering mechanism:** `RdContributorsAndPartnersService.applyTocMappingOnLoad()` (`rd-contributors-and-partners.service.ts:599-613`) splits `partnersBody.institutions` on load by each row's `from_toc` flag: rows with `from_toc: true` (or, when null/undefined, matching `tocReferencePartnerInstitutionIds()`) stay in `partnersBody.institutions`; everything else moves into `otherPartnersSelected` and renders under "Other(s) External Partners". This split runs unconditionally — it does not check whether an institution already classified as "ToC" is *also* present as a second row with `from_toc: false`. **If the GET response already contains two `results_by_institution` rows for the same institution** (one `from_toc: true`, one `from_toc: false`), this code faithfully — and correctly, given that input — renders both, which matches the exact "12 selected, 6 distinct, mirrored into the Other(s) bucket" shape observed.

**Not yet confirmed — how the duplicate DB rows were created in the first place.** The leading hypothesis, not yet verified against the actual database rows for result 9657, is a race in `ResultsByInstitutionsService.handleInstitutions()` / `_upsertAddedPartnerInstitutions()` (`results_by_institutions.service.ts`): `ChangeTracker.trackChangesForObjects(oldInstitutions, incomingInstitutions, 'id')` keys "added vs. existing" purely on each incoming row's `id` field. If a save payload ever contained two entries for the same `institutions_id` — one carrying the existing row's `id` (`from_toc: true`, from the ToC bucket) and one without an `id` (`from_toc: false`, from `otherPartnersSelected`) — the `id`-less duplicate is classified as genuinely "added" even though `_upsertAddedPartnerInstitutions`'s own existing-row lookup (by `institutions_id` + role) would normally reactivate it instead of creating a second row. Exactly how that reactivate-vs-create branch (and the paired `result_institutions_budget` insert in the same function, `L1140-1150`) can end up leaving `result_institution_id` null on a bulk `.save()` has **not** been reproduced against a real DB — this requires either a debugger session against a duplicated payload or reading the actual rows for result 9657 (`results_by_institution` / `result_institutions_budget`, filtered by `result_id = 9657`).

**Do not treat the "not yet confirmed" half as settled.** `/akili-specify` should open with a debugging task (real DB access to result 9657's rows, or a reproduction payload against a test result) before committing to a specific server-side fix — the client-side fix (never let the same institution enter both buckets) is independently correct and should ship regardless of what that investigation finds.

### Impact & Scope

- Confirmed to reproduce on IPSR (2026-phase). Because `normal-selector` is the same component W1/W2 Contributors & Partners uses (`rd-contributors-and-partners.component.html`), the identical failure is plausible there too, unconfirmed.
- Data integrity: if the server-side hypothesis is correct, this is not purely cosmetic — a result can end up with two `results_by_institution` rows for what should be one partner, which would also double-count that partner in any downstream summary/report reading `results_by_institution` (bilateral payloads, Type-One Report, etc.) until cleaned up. This needs verification, not assumption.
- Immediate user-facing impact: an unrecoverable-looking save error with no guidance, on a section that otherwise saved correctly (ToC half succeeded), and no indication that removing the visible duplicates would fix it.

### Fix Strategy

Route: **`/akili-specify` (Standard) in Bug Mode** — this is not a cosmetic one-liner: it spans a client rendering/dedup fix, a server data-integrity investigation, and an error-handling improvement, each of which needs its own regression test (red before, green after).

Minimum scope for `/akili-specify` to plan:
1. **Client dedup (independently correct, ship regardless of the server investigation's outcome):** in `applyTocMappingOnLoad()` and every `otherPartnersSelected` write path, exclude any institution whose `institutions_id` is already present in the ToC-bucket list (and vice versa) before rendering or before adding via the "Other(s)" dropdown.
2. **Server-side investigation (open until confirmed):** determine whether `handleInstitutions()`/`_upsertAddedPartnerInstitutions()` can create a second `results_by_institution` row for an institution that already has one, and whether the `result_institutions_budget` insert can reach a null `result_institution_id` from that state. If confirmed, harden the reactivate-vs-create branch and the budget insert to use `institutions_id` + role as the true uniqueness key, not the client-supplied `id`.
3. **Error surfacing:** `updateContributorsAndPartners`'s message-joining and the raw-DB-error passthrough in `savePartnersInstitutionsByResultV2`'s catch block should not let a column-constraint error reach the user verbatim; wrap known constraint failures into a clear validation message.

## Approach Options

| # | Approach | Trade-off |
|---|---|---|
| A | Client-only fix (dedup on load/select) | Fast, low-risk, fixes what the user can reproduce today. Leaves the server free to accept a duplicate/mismatched payload from any other caller (a stale tab, a future bug, a direct API call) and still fail with a raw SQL error — only masks the symptom at one entry point. |
| B | Server-only fix (harden `handleInstitutions` + wrap the SQL error) | Closes the crash for every caller, including ones not yet found. Leaves the confusing double-list UI in place if a duplicate DB row already exists for any result (including 9657, until/unless cleaned up), so users can still see and be confused by a "12 selected, 6 distinct" section. |
| **C (recommended)** | Both: client dedup on load/select **and** server-side hardening + clear error message | Closes the bug at its most likely origin (server race) and its visible symptom (client double-render), and turns any residual edge case into a readable message instead of a crash. Larger scope, but each half is independently small and independently testable — matches the "smallest safe path that actually closes the reported failure" bar. |

**Recommended: Option C.** The client half is cheap and correct on its own; the server half is the one with an unconfirmed root cause and needs its own investigation task, but skipping it would leave the actual data-integrity question (can this create real duplicate rows in production) unanswered.

## Risks, Dependencies, And Open Questions

- **OQ-1:** Does result 9657 (or any other result) currently hold duplicate `results_by_institution` rows for the same institution? Needs a DB read before `/akili-specify` can decide whether a cleanup migration is in scope (currently a Non-Goal, pending this answer).
- **OQ-2:** Does the identical duplication reproduce on the W1/W2 Contributors & Partners screen (non-IPSR), since it shares `normal-selector`? Not yet tested.
- **Risk:** `handleInstitutions()` also backs Knowledge Product "Additional partners" (`institutionRoleId = KNOWLEDGE_PRODUCT_ADDITIONAL_CONTRIBUTORS`) and non-innovation result types — any server-side fix must be verified against those paths too, not just the Innovation Package / IPSR case that reproduced.
- **Dependency:** none on other open specs (Parallel-safe: yes).

## Success Criteria

- An institution already selected as a ToC partner cannot be added again via the "Other(s) External Partners" dropdown, and vice versa — enforced by a client regression test.
- Loading a section whose saved data already contains the same institution under both `from_toc` values does not render it twice (defensive fix, covered by a client regression test using such a fixture).
- Submitting an `institutions` payload with a duplicated/mismatched `institutions_id` never reaches the user as a raw SQL error — covered by a server regression test.
- The original repro (IPSR result 9657 shape: 6 ToC partners mirrored as 6 "Other" duplicates) no longer occurs end-to-end.

## Next Step

```text
/akili-specify bugfix/external-partners-duplication
```
