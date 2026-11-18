# Proposal — IPSR "No … provided" empty state shows over rows with real, unsaved data

## Document Control

| Field | Value |
|---|---|
| Spec path | `bugfix/ipsr-empty-state-active-check` |
| Slug | `ipsr-empty-state-active-check` — derived from free-text argument |
| Type | Bug |
| Depth | Lite |
| Approval Mode | gated |
| Status | approved (santiago.sanchez@cgiar.org, 2026-09-28) |
| Parent Spec | — |
| Depends on | none |
| Parallel-safe | yes (touches only `pages/ipsr/.../step-n1`, `.../step-n1/components/step-n1-experts`, `.../step-n3/components/step-n3-current-use` — disjoint from other open IPSR specs) |
| Module | `ipsr` (client) |
| Owner | santiago.sanchez@cgiar.org |
| Ticket | none yet — found via manual QA on 2026-09-28 |
| Reference implementation (correct pattern) | `innovation-use-form.component.ts:509` and `step-n1-innovaton-use.component.ts:109` — both use `item.is_active != false` |

## Intent

Make the "No … provided" empty-state check in IPSR Step 1 (Facilitators, Experts) and Step 3 Current Use (Actors, Organizations, Other measures) treat a freshly-added, not-yet-saved row the same way the rest of the codebase already does: as present, not as deleted.

## Problem / Current Behavior

`hasElementsWithId(list, attr)` gates the `app-no-data-text` empty state on each of these lists. In edit mode (`!api.rolesSE.readOnly`) it currently reads:

```ts
const finalList = this.api.rolesSE.readOnly ? list.filter(item => item[attr]) : list.filter(item => item.is_active);
```

`item.is_active` is a **strict truthy check**. The row models (`ExpertWorkshopOrganized`, `Expert`, `ActorN3`, `OrganizationN3`, `MeasureN3`) never initialize `is_active` — it starts `undefined` and only ever gets explicitly set to `false` on delete. So every row added by the user via "Add Lead/Co-Lead" / "Add expert" / "Add actor" / "Add organization" / "Add other" is excluded from `finalList` until the section is saved and the server returns it with an id — even while the user has typed real data into it (screenshot: First Name "Angel", Last Name "Jarrin", Email, Role all filled, "No facilitators provided" still shown underneath).

This is inconsistent with the identical helper elsewhere in the same codebase, which already fixed this exact case:

```ts
// innovation-use-form.component.ts:509 and step-n1-innovaton-use.component.ts:109
const finalList = this.api.rolesSE.readOnly ? list.filter(item => item && item[attr]) : list.filter(item => item && item.is_active != false);
```

`!= false` treats `undefined` as "still active" — only an explicit `false` (a deleted row) is excluded.

## Proposed Outcome

| Situation | After the fix |
|---|---|
| Section has 1+ rows, none deleted, none saved yet (`is_active` undefined) | Empty state hidden, rows shown |
| All rows deleted in this session (`is_active === false`) | Empty state shown |
| Section has 0 rows | Empty state shown |
| Read-only mode (viewing a submitted/locked phase) | Unchanged — still keyed on the presence of the saved id (`attr`), not touched by this fix |

## Scope

- `onecgiar-pr-client/src/app/pages/ipsr/pages/innovation-package-detail/pages/ipsr-innovation-use-pathway/pages/step-n1/step-n1.component.ts:61` — Facilitators (`result_ip_expert_workshop_organized`).
- `.../step-n1/components/step-n1-experts/step-n1-experts.component.ts:37` — Experts (`body.experts`).
- `.../step-n3/components/step-n3-current-use/step-n3-current-use.component.ts:40` — Actors / Organizations / Other measures (`body.innovatonUse.{actors,organization,measures}`).
- Each file's `hasElementsWithId` edit-mode branch: `item.is_active` → `item.is_active != false` (mirroring the already-correct helper, including its `item &&` null-guard and `Array.isArray` guard already present in the reference implementation).
- Regression tests in each component's `.spec.ts` (currently pin the buggy behavior — see R1).

## Non-Goals

- **No server/DTO/migration change.** This is a pure client-side display filter; the save payload and green-check logic are untouched.
- **Not touching `step-n4-bilateral-investment-table` / `step-n4-partner-co-investment-table`**, which have the same `item.is_active` pattern (`step-n4-bilateral-investment-table.component.ts:39`, `step-n4-partner-co-investment-table.component.ts:32`). Their "Add" flow goes through a modal that PATCHes immediately and reloads from the server, so a not-yet-saved row is not left sitting in the list the way it is in Step 1/3 — not reproduced, not reported by the user. Logged as OQ-1; a separate spec if confirmed.
- Not extracting a shared helper/pipe for `hasElementsWithId` across all 8 call sites — see Option C.
- No visual/copy change to `app-no-data-text` itself.

## Affected Users, Systems, And Specs

| Affected | Detail |
|---|---|
| Users | Reporters filling IPSR Innovation Package Step 1 (Facilitators, Experts) and Step 3 Current Use (Actors, Organizations, Other) |
| Code | `step-n1.component.ts`, `step-n1-experts.component.ts`, `step-n3-current-use.component.ts` (+ their `.spec.ts`) |
| Server | none |
| Specs | None open on these exact files |

## Visual Reference

- Source: None
- Location: —
- Notes: No new UI. Only the condition that hides the existing `app-no-data-text` empty state changes; screenshot from the user's report shows the current broken behavior.

## Bug Diagnosis

### Observed Symptom

Screenshot: after clicking "Add Lead/Co-Lead" and filling First Name "Angel", Last Name "Jarrin", Email, Role "lead" in IPSR Step 1's Facilitators block, the "No facilitators provided" empty state still renders directly below the filled row. User reports the same happens for Actors, Organizations, and "Other" (measures) elsewhere in IPSR.

### Reproduction Steps

1. Open an editable IPSR Innovation Package, go to Step 1.
2. Answer "Yes" to "Was an … expert workshop organized?", click "Add Lead/Co-Lead", fill in the new row's fields.
3. **Expected:** the row is visible and "No facilitators provided" is gone. **Actual:** the row shows, but "No facilitators provided" also shows underneath it.
4. Same steps reproduce on: Step 1 "Add expert" (Experts block); Step 3 Current Use "Add actor" / "Add organization" / "Add other" (measures).

### Root Cause (confirmed)

Verified in code:

1. `hasElementsWithId(list, attr)` in the three affected files filters on `item.is_active` (strict truthy) when NOT read-only.
2. The row models pushed by `addExpert()` / `addActor()` / `addOrganization()` / `addOther()` (`ExpertWorkshopOrganized`, `Expert`, `ActorN3`, `OrganizationN3`, `MeasureN3`) never set `is_active` on construction — it is `undefined` until an explicit delete sets it to `false`.
3. `undefined` fails a truthy check, so a brand-new, filled-in, undeleted row is treated as "not present" and the empty state renders alongside it.
4. The same helper already carries the correct fix elsewhere in this codebase — `innovation-use-form.component.ts:509` and `step-n1-innovaton-use.component.ts:109` both use `item.is_active != false` — so this is a known-fixed pattern that was never propagated to these three sibling call sites.

### Impact & Scope

- Purely a display bug: the row's data is still typed, bound, and will save correctly. No data loss.
- Confusing UX: reporters see a contradictory "empty" message next to data they just entered, which can make them think the row didn't register (worth noting since this is exactly what prompted the report).
- Contained to the 3 listed call sites. The 2 similar call sites in `step-n4` are out of scope per Non-Goals/OQ-1 pending confirmation they reproduce at all.
- No security or data-integrity implication.

### Fix Strategy

Route: **`/akili-specify` (Lite) in Bug Mode** — logic change to a conditional, so a regression test is mandatory (red before, green after). The smallest safe correction is a one-line change per file, copying the already-proven `!= false` pattern.

## Approach Options

| # | Approach | Trade-off |
|---|---|---|
| A | Fix only `step-n1.component.ts` (the exact screenshot) | Leaves the identical bug live in Experts and Step 3 Actors/Organizations/Other, which the user explicitly flagged as also affected |
| B | Fix all 3 confirmed call sites (`step-n1.component.ts`, `step-n1-experts.component.ts`, `step-n3-current-use.component.ts`) with the proven `!= false` pattern | Matches everything the user reported; smallest change per file; reuses a pattern already in production elsewhere |
| C | Extract a shared `hasElementsWithId` utility/pipe used by all 8 current call sites (3 buggy + 2 already-correct + 3 in `step-n4`) | Removes the duplication that let this drift happen, but touches files beyond what's reported/reproduced and widens this Lite bugfix's blast radius |

## Recommended Approach

**Option B.** It fixes exactly what was observed and reported, reuses a pattern already proven correct in this same codebase, and keeps the change mechanical and low-risk (3 one-line edits + tests). Option C is a reasonable follow-up kaizen item, not part of this bugfix.

## Risks, Dependencies, And Open Questions

| # | Item | Handling |
|---|---|---|
| R1 | Existing specs assert the buggy behavior directly, e.g. `step-n1-experts.component.spec.ts:56-63` (`{ id: 1, is_active: true }, { id: 2, is_active: true }, { id: 3, is_active: false }` → expects `2`) and the equivalent in `step-n1.component.spec.ts:376-390` / `step-n3-current-use.component.spec.ts:72-79`. These specific fixtures already set `is_active` explicitly, so they keep passing under `!= false` — but each spec file needs one **new** case with `is_active: undefined` (a freshly-added row) asserting it now counts, to actually pin the fix (red before, green after) | Add the new case in the same task that changes the source line; do not just re-run the old assertions |
| R2 | `step-n4` tables share the same buggy pattern but are out of scope (see Non-Goals/OQ-1) | If a follow-up report confirms it reproduces there too, file a separate bugfix spec — do not silently fold it into this one |
| OQ-1 | Does the Step 4 bilateral/partner co-investment table actually reproduce the same symptom, given its immediate-PATCH "Add" flow? | Confirm by reproducing before deciding whether to extend scope; not blocking this spec |

## Success Criteria

1. Adding a Facilitator / Expert / Actor / Organization / Other row and filling it in hides the corresponding "No … provided" empty state immediately, without saving.
2. Deleting all rows (or deleting back down to zero) still shows the empty state.
3. Read-only view behavior is unchanged (still keyed on the saved id).
4. New regression tests (one per affected file, `is_active: undefined` case) fail on current code and pass after the fix; existing tests in the same files stay green.
5. Affected specs run green via `--testPathPattern`; `ng lint --quiet` clean.

## Next Step

```text
/akili-specify bugfix/ipsr-empty-state-active-check
```

Bug Mode, Lite depth, with the three regression tests (undefined `is_active` case) written first (red), then the one-line guard change per file (green).
