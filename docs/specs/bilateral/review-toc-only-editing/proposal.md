# Proposal — Bilateral review: Science Program may edit only ToC (P2-3794)

## Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/bilateral/review-toc-only-editing/` |
| Slug | `review-toc-only-editing` — derived from the conversation (no argument was passed to `/akili-propose`). Placed under `bilateral/` per the domain-module taxonomy. |
| Type | **Change** — it includes one security correction on the server (see *Problem* §2) |
| Approval Mode | **gated** (default) |
| Status | **approved** — owner ran `/akili-specify` on 2026-09-22 |
| Owner | Juan David Delgado |
| Date | 2026-09-22 |
| Branch | `JuanGuzman-io/loach` (contains `performance-refactor` at `d2ac12f9e`) |
| Ticket(s) | [P2-3794](https://cgiarmel.atlassian.net/browse/P2-3794) *Restrict bilateral result editing during Science Program review* (Enhancement, Open) under epic [P2-3478](https://cgiarmel.atlassian.net/browse/P2-3478) *Bilateral module for CG Centers – Manual Entry*. Reporter: Cami; requested by Ángel. |
| Baseline | `docs/prd.md` — US-Q1/US-Q3 (review drawer, advance/reject), **AC-3** (backend enforces roles), **AC-6** (ToC alignment), **AC-7** (soft delete) · `docs/trd/trd.md` — **§8 Authorization** ("frontend role gates are UX only — backend MUST enforce"), **W7** (soft delete = `is_active=false`) · `docs/ux-ui/design.md` §6 drawers, §10 a11y |
| Related specs | `archive/2026-09-08-changes--sp-bilateral-review-tab` (P2-3154 — built the drawer gates `canEditInDrawer` / `canEditDataStandards`) · `archive/2026-09-21-bilateral--review-drawer-readonly-rendering` (made locked fields *look* read-only) · `archive/2026-09-18-bilateral--toc-default-linkage` (ToC Yes/No save path on the Center side) |
| Depends on | none |
| Parallel-safe | **no** — touches `results.service.ts`, `results-toc-results.service.ts` and `bilateral-center.service.ts`, which other bilateral specs also edit |

**Model checkpoint:** T1 phase; the session model (Opus 5.5) is at or above the registry's `opus` entry → pass.

## Intent

When a bilateral result is **Pending Review** (`status_id = 5`), a Science Program user who opens it may change **only the Theory of Change** section. Nothing else, and the server must refuse it too. For **P25 onward**, answering **No** to the ToC question shows no further fields and removes the ToC detail that was there before (logical delete).

### Decisions already taken (owner, 2026-09-22)

| # | Decision |
|---|---|
| D-1 | **Platform Admin is unchanged.** Admins keep editing every section, in every status. |
| D-2 | The restriction applies to **every program-level role** of the result's Science Program while the result is Pending Review. They edit only ToC; Approve/Reject keeps working. |
| D-3 | The "No shows nothing" rule applies **from P25 onward**, not to earlier phases. |
| D-4 | On **No**, the previous ToC detail (level, HLO, indicators, contribution) is **removed**, so reports do not show it as active. **Logical delete preferred** (`is_active = 0`), consistent with AC-7 / W7. |
| D-5 | A result with no answer yet (`planned_result = null`) keeps showing as **No**, so after this change nothing appears below the question. |

## Problem / Current Behavior

### 1. The drawer already locks most things on screen

This part was delivered by P2-3154 and `review-drawer-readonly-rendering`:

| Area | Today, non-admin SP reviewer at status 5 |
|---|---|
| ToC section + ToC Save | Editable (`canEditInDrawer`, `result-review-drawer.component.ts:253-259`) |
| Title, description, geography, contributors, evidence, type-specific fields | Read-only (`canEditDataStandards = canEditInDrawer && isAdmin`, `:277`) |
| "Save data standards" | Only rendered for admins (`.html:635`) |
| Approve / Reject | Shown when `canEditInDrawer() && status_id == 5` (`.html:739`) |

**One leak:** the two Yes/No questions in geography ("any regions…", "any countries…", `geoscope-management.component.html:17-31`, `:49-60`) ignore the drawer's read-only state. The reviewer can click them. Nothing gets saved, but the drawer then reports unsaved changes, which **disables Approve** (`result-review-drawer.component.ts:460`) and breaks criterion 7. Needs a browser check.

### 2. The server does not enforce it (criterion 3 fails)

Confirmed by reading the code. Every write below is reachable by a non-admin at status 5:

| Endpoint | Guard today | Problem |
|---|---|---|
| `PATCH /api/results/bilateral/:id/title` (`results.controller.ts:1041`) | `_validateBilateralResultForUpdate` | Any logged-in non-admin can rename a result in review |
| `PATCH /api/results/bilateral/general-info/:id` (`:1070`) | same validator | Any non-admin can change title/description/DAC in review |
| `PATCH /api/bilateral/center/planned-result`, `toc-mapping`, `contributors` (`bilateral-center.service.ts:1075, 1127, 1332`) | **none** | No status or role check at all |
| Geographic PATCH (v2) | to verify | — |
| `PATCH …/review-update/toc-metadata/:id` (`:965`) | same validator | No check that the user belongs to the result's Science Program |
| `PATCH …/bilateral/:id/review-decision` (`:994`) | status must be 5 | No Science Program membership check |
| `PATCH …/review-update/data-standard/:id` (`:936`) | admin only | ✅ already closed |

**The shared validator is inverted for Center writes.** `_validateBilateralResultForUpdate` (`results.service.ts:4312-4346`) lets admins through and otherwise **rejects anything that is not status 5**. It was written for the review screen, but `general-info` (used by the Center autosave, `bilateral-auto-save.service.ts:488`) also calls it. Read literally, that means:

- a Center user at status 1/8 (Editing/Draft) gets a **409** on `general-info`, and
- a reviewer at status 5 is **allowed**.

The first half must be checked in prtest before we change it. Either autosave works around it, or it is a live bug the Center has not reported yet.

### 3. ToC "No" still shows fields in the drawer

- On **No**, the drawer still renders `app-cp-multiple-wps` with `[isUnplanned]="true"`, so the Level select and the HLO field appear (`result-review-drawer.component.html:258-275`; `multiple-wps-content.component.html:3, 20`).
- The phase rule that would hide them (`isCP2026`, `multiple-wps.component.html:4`) never fires. The drawer builds its result context with a hard-coded `portfolio: 'P25'` and no phase year (`result-review-drawer.component.ts:1183-1194`), although the detail payload carries `commonFields.reporting_year`.
- The helper text (`.html:241`) and `getTocAlertDescription` (`.ts:487`) tell the user to pick an HLO when they answer No.
- The Center editor (`section-toc`) already behaves correctly: nothing shows after No.

### 4. What "No" does to the data today

- The unplanned save path already soft-deletes: `_handleUnplannedResult` → `_deactivateAllActiveRecords` sets `is_active = false` on every active `results_toc_result` row of the result (`results-toc-results.service.ts:2528-2570`).
- It then **re-inserts** whatever the client sends. Because the drawer still sends level/HLO on No, the "removed" detail comes straight back as active rows.
- Only when the list is empty does it take `_handleUnplannedSpecialCase` (`:2674`), which leaves one row with null level and result.

## Proposed Outcome

| # | Behavior |
|---|---|
| O-1 | A non-admin program user on a status-5 bilateral result sees everything read-only except ToC, including the geography Yes/No questions. |
| O-2 | The server rejects, with **403**, any write outside ToC from a non-admin while the result is status 5. The same request from an admin still succeeds. |
| O-3 | `toc-metadata` and `review-decision` accept only an admin or a member of the result's Science Program. |
| O-4 | Center writes in Editing/Draft keep working for Center users. The inverted validator is fixed, not reused. |
| O-5 | For P25+ results, answering No hides everything below the question, in the drawer and in the Center editor. |
| O-6 | Saving No on a P25+ result leaves **no active** level/HLO/indicator/contribution rows for that Science Program. The old rows remain with `is_active = 0`. |
| O-7 | Approve/Reject works whenever ToC is complete. No leftover "unsaved changes" state blocks it. |

## Scope

- **Server:** one status-aware guard for bilateral writes, applied to `title`, `general-info`, the three `bilateral/center/*` endpoints and the geographic PATCH. A membership check on `toc-metadata` and `review-decision`.
- **Server:** the P25+ No save sends/stores no ToC detail and makes sure dependent rows (indicators, targets) are not left active.
- **Client (drawer):** hide the ToC detail on No for P25+, read the phase from the result instead of the hard-coded `'P25'`, lock the geography Yes/No, update the two No copy strings.
- **Client (drawer):** stop sending level/HLO in the No payload.
- **Docs:** `result-review-drawer/AGENTS.md` §3b/§11, and `bilateral-result-summaries.en.md` change log **only if** the `/api/bilateral/*` payload changes.
- **Tests:** server specs for each guard (admin allowed / reviewer 403 / Center in Editing allowed); client specs for the P25 No rendering and payload.

## Non-Goals

- Changing what admins can edit (D-1).
- Changing the Center editor's read-only behavior outside Editing/Draft (already locked by `isEditableByCenterUser`).
- The Center editor's own read-only gaps (`section-contributors` does not pass `[readOnly]` to `section-toc`). That is a separate screen.
- Pre-P25 phases (D-3).
- A hard delete, or migrating historic ToC rows of results already answered No.
- The Swagger text mismatch on `title` ("must be in EDITING"). It gets corrected as a side effect of the new guard, not as its own item.

## Affected Users, Systems, And Specs

| Who / what | Effect |
|---|---|
| Science Program users (any program role) | Lose the ability to change non-ToC data at status 5 (UI already mostly, server newly) |
| Platform Admin | No change |
| Center users | **Must see no change**. Watch the `general-info` validator fix (O-4). |
| Reports / consumers of ToC rows | No longer see stale level/HLO after a No |
| Code | `results.service.ts`, `results.controller.ts`, `results-toc-results.service.ts`, `bilateral-center.service.ts`, `result-review-drawer.component.{ts,html}`, `geoscope-management.component.html`, `multiple-wps*`, `section-toc` |
| Specs | Extends P2-3154's permission model; amends `toc-default-linkage`'s No save path on the drawer side |

## Visual Reference

- **Source:** None.
- **Notes:** No new UI. The change hides existing fields and locks existing controls, using the read-only rendering `review-drawer-readonly-rendering` already delivered. No mockup needed.

## Requirement Delta Preview

### ADDED Requirements

- The server rejects non-ToC writes on a status-5 bilateral result from any non-admin (403).
- The server requires admin or Science Program membership for `toc-metadata` and `review-decision`.
- For P25+, saving No logically deletes the prior ToC detail and inserts none.

### MODIFIED Requirements

- The drawer's ToC No state for P25+ shows only the question (today it shows Level + HLO).
- The drawer derives the phase from the result's `reporting_year`/portfolio instead of a constant.
- `_validateBilateralResultForUpdate` stops being the gate for Center writes. Its "review-only" meaning is kept where it belongs.
- The No copy in the drawer no longer asks for an HLO.

### REMOVED Requirements

- The drawer no longer sends level/HLO in a P25+ No payload.

## Approach Options

| Option | What | Pros | Cons |
|---|---|---|---|
| **A. One guard + targeted client fixes** | A small reusable server check (`assertBilateralWriteAllowed(result, user, scope: 'center' \| 'toc' \| 'decision')`) called from each write service. The drawer fixes on top. | Covers every endpoint the same way. Easy to test as a table. Fixes the inverted validator in one place. | Touches several services |
| B. NestJS guard on the controllers | A `@UseGuards(BilateralReviewGuard)` reading the result per request | Declarative | The `bilateral/center/*` endpoints sit outside the JWT middleware (`/api/bilateral/*` is excluded, TRD §8), so the guard has no user there. It would also load the result twice. |
| C. Client only | Finish hiding/locking in the drawer | Smallest diff | Fails criterion 3 and violates TRD §8 / AC-3 |

## Recommended Approach

**Option A.** It is the smallest option that meets criterion 3 and TRD §8. The client part is small, because the drawer is already mostly correct.

Suggested order, so the risky part lands first and can be verified alone:

1. **Verify in prtest:** does a Center user at status 1/8 get a 409 from `general-info` today? This decides whether O-4 is a fix or a no-op.
2. Server guard + tests (O-2, O-3, O-4).
3. P25+ No save: payload + dependent rows (O-6).
4. Drawer: phase source, No rendering, copy, geography lock (O-1, O-5, O-7).

## Risks, Dependencies, And Open Questions

| # | Item | Handling |
|---|---|---|
| R-1 | **Fixing the inverted validator changes Center behavior.** If Center autosave relies on today's shape, we could break Editing. | Step 1 above; test "Center user, status 1 and 8 → allowed" explicitly. |
| R-2 | **`_deactivateAllActiveRecords` wipes every Science Program's ToC rows for the result**, not only the reviewer's. A No from one SP could remove another contributor's alignment. | Confirm during `/akili-specify`. If true, scope the delete to the reviewing SP's `initiative_id`. |
| R-3 | Dependent rows (`results_toc_result_indicators`, target indicators) may stay `is_active = 1` under a deactivated parent. Reports that don't join through the parent would still see them. | Check which report queries read them. Deactivate them explicitly if needed. |
| R-4 | The `bilateral/center/*` endpoints have no JWT user (excluded from the middleware). | Confirm how they identify the caller today before adding a role check. The status check alone may be the only option there. |
| OQ-1 | **How to decide "P25 onward"**: by portfolio acronym (`P25`, and later ones) or by `phase_year >= 2025`? | Recommend portfolio, since that's what "P25" names. Confirm with Cami. |
| OQ-2 | Does "every program role" include read-only program roles? | Assumed **yes**, reusing `isProgramMember`. |
| OQ-3 | Does the delete happen on **save** of No, or on toggle? | Assumed **on save**. Toggling in the UI does not touch the database until ToC Save. |

Kaizen: no `docs/specs/kaizen-log.md` Active Lessons apply.

## Success Criteria

- Each of the 7 acceptance criteria of P2-3794 maps to at least one passing test or a HITL step.
- Server spec table green: {admin, SP reviewer, non-member, Center user} × {status 1, 5, 8} × {title, general-info, center/*, toc-metadata, review-decision}.
- On prtest, a P25 result in review, answered No and saved, shows no active ToC detail rows in the DB, and the old rows still exist with `is_active = 0`.
- Approve stays enabled after the reviewer clicks around the read-only sections.

## Next Step

```text
/akili-specify bilateral/review-toc-only-editing
```
