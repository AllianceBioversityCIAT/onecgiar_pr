# Design — IPSR empty-state check counts unsaved rows

## 1. Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/bugfix/ipsr-empty-state-active-check/` |
| Depth · Mode | Lite · Bug |
| Status | approved (santiago.sanchez@cgiar.org, 2026-09-28) |
| Implements | [`requirements.md`](./requirements.md) `IPSR-ESC-R-1` |
| Reference implementation | `innovation-use-form.component.ts:509`, `step-n1-innovaton-use.component.ts:109` — both already use `item.is_active != false` |

## 2. Executive Summary

Change the edit-mode filter inside `hasElementsWithId(list, attr)` in three files, from `item.is_active` to `item.is_active != false`, copying the pattern already proven correct in two sibling components. Read-only branch untouched. No new files, no template changes.

> **Pivot (2026-09-28):** `item.is_active != false` alone is insufficient for Facilitators, Actors, and Organizations — see `IPSR-ESC-R-2` and `execution.md` → Pivot Record 1. §8 below is revised to add an optional third parameter to `hasElementsWithId` and pass it at those 3 template call sites only.
>
> **Pivot 2 (2026-09-28):** the same gap exists in `shared/components/innovation-use-form/innovation-use-form.component.ts` — see `IPSR-ESC-R-3` and `execution.md` → Pivot Record 2. §8.3 below adds the same mechanism to that file's 3 "current use" call sites.

## 3. Architecture Overview

Unchanged. Each affected template calls `!hasElementsWithId(list, attr)` inside `*ngIf` on `<app-no-data-text>`. Only the boolean the helper returns for the edit-mode branch changes.

## 4. Extended Directory Structure

```text
onecgiar-pr-client/src/app/pages/ipsr/pages/innovation-package-detail/pages/ipsr-innovation-use-pathway/
├── pages/step-n1/
│   ├── step-n1.component.ts                                     # hasElementsWithId edit-mode filter
│   ├── step-n1.component.spec.ts                                # regression case
│   └── components/step-n1-experts/
│       ├── step-n1-experts.component.ts                          # hasElementsWithId edit-mode filter
│       └── step-n1-experts.component.spec.ts                      # regression case
└── pages/step-n3/components/step-n3-current-use/
    ├── step-n3-current-use.component.ts                          # hasElementsWithId edit-mode filter
    └── step-n3-current-use.component.spec.ts                      # regression case
```

## 5. Data Model

No change. `is_active` already exists (or is implicitly `undefined`) on every affected row model; nothing is added or defaulted.

## 6. API Design

No change. This is a display-only filter; nothing about the PATCH payload changes.

## 7. Backend Module Design

No change.

## 8. Frontend / UX Component Architecture

### 8.1 `hasElementsWithId` signature (revised, R-1 + R-2)

`hasElementsWithId(list, attr)` becomes `hasElementsWithId(list, attr, significantFields?: string[])`:

```ts
hasElementsWithId(list, attr, significantFields?: string[]) {
  const finalList = this.api.rolesSE.readOnly
    ? list.filter(item => item[attr])
    : list.filter(item => item.is_active != false && (!significantFields || significantFields.some(f => !!item[f])));
  return finalList.length;
}
```

When `significantFields` is omitted, behavior is byte-identical to the plain `is_active != false` rule (`IPSR-ESC-R-1`) — this is the case for Experts and Other quantitative measures, which keep their already-implemented, already-reviewed fix untouched. When passed, a row additionally needs at least one of the named fields truthy (`IPSR-ESC-R-2`) — a row that exists only because `getSectionInformation()` auto-pushed a blank placeholder has none of them set, so it does not count.

| Component method | Change |
|---|---|
| `step-n1.component.ts:61` | `hasElementsWithId(list, attr)` → `hasElementsWithId(list, attr, significantFields?)` (signature only; body per above) |
| `step-n1-experts.component.ts:37` | Unchanged from the already-reviewed T-2 fix (`item.is_active != false`, no third param — this list is never auto-populated) |
| `step-n3-current-use.component.ts:40` | `hasElementsWithId(list, attr)` → `hasElementsWithId(list, attr, significantFields?)` (signature only; body per above) |

### 8.2 Template call sites — where `significantFields` is passed

| File : call site | List | `significantFields` passed | Req |
|---|---|---|---|
| `step-n1.component.html:74` | Facilitators (`result_ip_expert_workshop_organized`) | `['first_name', 'last_name', 'email', 'workshop_role']` | R-2 |
| `step-n1-experts.component.html` | Experts | *(none — 2-arg call, unchanged)* | R-1 only |
| `step-n3-current-use.component.html:89` | Actors | `['actor_type_id']` | R-2 |
| `step-n3-current-use.component.html:143` | Organizations | `['institution_types_id']` | R-2 |
| `step-n3-current-use.component.html:173` | Other quantitative measures | *(none — 2-arg call, unchanged)* | R-1 only |

Field choice rationale: each is the row's primary/gating field in the template — the one field that is itself `[required]` before any other field becomes meaningful (Actor type gates Sub-type/Women/Men; Organization gates Sub-type/How many; a Facilitator has no single gating field, so any of its 4 columns filled in counts).

The `readOnly` branch (`list.filter(item => item[attr])`) is untouched in all three files — it is a separate ternary arm, not affected by this edit, in either R-1 or R-2.

No markup structure, copy, or style changes beyond the added template arguments; `<app-no-data-text>` itself is untouched.

### 8.3 `shared/components/innovation-use-form/innovation-use-form.component.ts` (R-3, Pivot 2)

Same mechanism, applied to a 4th file. This file's existing guards (`Array.isArray`, `item &&`) are preserved:

```ts
hasElementsWithId(list, attr, significantFields?: string[]) {
  if (!Array.isArray(list)) return 0;
  const finalList = this.api.rolesSE.readOnly
    ? list.filter(item => item && item[attr])
    : list.filter(item => item && item.is_active != false && (!significantFields || significantFields.some(f => !!item[f])));
  return finalList.length;
}
```

| Template call site | List | `significantFields` passed | Req |
|---|---|---|---|
| `innovation-use-form.component.html:249` | Actors (current use) | `['actor_type_id']` | R-3 |
| `innovation-use-form.component.html:333` | Organizations (current use) | `['institution_types_id']` | R-3 |
| `innovation-use-form.component.html:369` | Other quantitative measures (current use) | `['quantity']` — NOT `unit_of_measure` (see `execution.md` Pivot Record 2's "Extra wrinkle") | R-3 |
| `innovation-use-form.component.html:641` | Actors (2030 projection) | *(none — unaffected, `innovation_use_2030.*` is never auto-populated)* | — |
| `innovation-use-form.component.html:726` | Organizations (2030 projection) | *(none)* | — |
| `innovation-use-form.component.html:766` | Other quantitative measures (2030 projection) | *(none)* | — |

This component is also used from `pages/results/pages/result-detail/pages/rd-result-types-pages/innovation-use-info/` — confirmed that usage never auto-populates blank rows, so the opt-in parameter is a no-op risk there (behavior only changes where a significant field is genuinely empty, which is correct everywhere).

## 9. Shared Contracts or Package Extensions

None. Each `hasElementsWithId` is a private method local to its component; no interface or shared service changes.

## 10. Design Decisions

### `IPSR-ESC-DD-1` — Copy the proven `!= false` pattern verbatim, per file

- **Decision:** apply the exact same one-line change independently to all three files, rather than extracting a shared helper.
- **Why:** matches proposal Option B; smallest possible diff; reuses a pattern already in production (`innovation-use-form.component.ts`, `step-n1-innovaton-use.component.ts`) instead of inventing a new one.
- **Rejected:** Option A (fix only the screenshot's file) — leaves the identical bug live in Experts and Step 3, which the user explicitly reported. Option C (shared helper across all 8 call sites, including `step-n4`) — widens this Lite bugfix beyond the reported/reproduced scope.
- **Reversion challenge (Step 2.3):** not applicable — this change is strictly **additive** to what counts as "present" (`is_active: true` and `is_active: undefined` both now count; only `is_active: false` is excluded, same as before). It does not remove, disable, or invert any existing delivered behavior — every case that passed before (`true` counts, `false` doesn't) still passes.

## 11. Budget (Step 2.4, revised after Pivot 2 2026-09-28)

| Measure | Estimate |
|---|---|
| Tasks | 6 total (`T-1`–`T-4` already PASSed for `IPSR-ESC-R-1`/`R-2`; `T-5`/`T-6` added for `IPSR-ESC-R-3` — regression RED → fix GREEN) |
| LOC | ~75 (R-1 + R-2, already spent) + ~35 (R-3: signature change in 1 file, 3 template call-site edits, ~6 new test cases in 1 spec file) ≈ 110 total |
| Review rounds | 2 (R-1 + R-2, already spent) + 1 (R-3) = 3 |

Now clearly past Lite depth on accumulated scope, though each individual increment stayed small and reviewed. Recorded per Pivot, not a silent overrun. Tripwire for the remainder of `/akili-execute`: any further rework round beyond 1 on `T-5`/`T-6`, or discovery of a 4th affected file → stop and escalate to the user about whether this should become a standalone follow-up spec instead of continuing to grow inside this one.
