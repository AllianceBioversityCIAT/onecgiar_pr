# Module Spec — Design: Innovation Geo Focus, "other geographic areas" question

## 1. Summary

Stop `RdGeographicLocationComponent.fillExtraGeographicLocationBody()` from coercing an unanswered server value (`null`) into `false` ("No"), and make the section's completeness check treat `null` the same as `undefined` (not yet answered). Pure client-side read-path fix — one method, one template expression. No new module, no data flow change, no backend touch.

Linked: `requirements.md` `GEO-R-1..3`, `GEO-AC-1..3` in this folder.

---

## 2. Architecture Overview

### 2.1 Where this lives in the system

- **Client module touched:** `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-geographic-location/` only.
- **No server module touched** — `geographic-location.service.ts` GET already returns the raw `result?.has_extra_geo_scope` (confirmed `null`-safe); `CreateGeographicLocationDto.has_extra_geo_scope` is already `boolean` + `nullable: true`.
- **No external integration touched.**

### 2.2 Sequence (unchanged shape, corrected mapping)

```
[GET /v2/api/geographic-location/get/geographic/:id]
  └── response.has_extra_geo_scope: true | false | null   (unchanged, already correct)
        └── fillExtraGeographicLocationBody(response)
              ├── BEFORE: Boolean(response.has_extra_geo_scope)   → null becomes false (BUG)
              └── AFTER:  response.has_extra_geo_scope as-is      → null stays null
                    └── template [isComplete] expression now also treats null as incomplete
```

---

## 3. Data Model Changes

None. `Result.has_extra_geo_scope` (server entity/column) and `ExtraGeographicLocationBody.has_extra_geo_scope: boolean` (client model class) are unchanged in shape — only the value assigned to the client model's field changes (it may now legitimately hold `null` at runtime, matching the DB's nullable column, even though the class currently types it as `boolean`).

### 3.1 Entities

| Entity | Path | Change |
|---|---|---|
| `Result` | `onecgiar-pr-server/src/api/results/entities/result.entity.ts` | No change. |
| `ExtraGeographicLocationBody` | `onecgiar-pr-client/.../rd-geographic-location/models/extraGeographicLocationBody.ts` | Type annotation widened: `has_extra_geo_scope: boolean` → `has_extra_geo_scope: boolean \| null` (reflects the value it can now legitimately hold; no migration, no server-side change). |

### 3.2 Migrations

None.

---

## 4. Extended Directory Structure

No new files.

```
onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-geographic-location/
├── rd-geographic-location.component.ts      # fillExtraGeographicLocationBody() — fix here
├── rd-geographic-location.component.html    # [isComplete] expression — fix here
├── rd-geographic-location.component.spec.ts # regression tests added here
└── models/
    └── extraGeographicLocationBody.ts       # type widened
```

---

## 5. API Design

No API change. `PATCH /v2/api/geographic-location/update/geographic/:id` payload construction in `onSaveSection()` (line ~213 of the component) already forwards `this.extraGeographicLocationBody.has_extra_geo_scope` as-is; sending `null` instead of a stale `false` is the correct behavior improvement and the DTO already accepts it (`nullable: true`).

---

## 6. Backend Module Design

Not touched.

---

## 7. Frontend / UX Component Architecture

**`RdGeographicLocationComponent`** (`rd-geographic-location.component.ts`):

- `fillExtraGeographicLocationBody(response)` — replace:
  ```
  this.extraGeographicLocationBody.has_extra_geo_scope = Boolean(response.has_extra_geo_scope);
  ```
  with a direct, non-coercing assignment that preserves `null` as `null` (and `true`/`false` unchanged).

**Template (`rd-geographic-location.component.html`)** — the `appFeedbackValidation [isComplete]` expression currently reads:
  ```
  [isComplete]="this.extraGeographicLocationBody.has_extra_geo_scope !== undefined"
  ```
  Widen the check so `null` is also treated as incomplete (e.g. `!= null`, which covers both `null` and `undefined` in one loose comparison — the established idiom already used implicitly by the rest of this file for nullable numeric ids). No change to `app-pr-radio-button`'s own `hasValue` getter (`custom-fields/pr-radio-button/pr-radio-button.component.ts:90-92`) — it already treats `null`/`undefined` as "no value" correctly; the component-level bug was entirely in how the *upstream* fill method mapped the server response before it ever reached the radio group's `ngModel`.

No new component, no new input/output, no template structural change beyond the one expression.

---

## 8. Shared Contracts or Package Extensions

None — `ExtraGeographicLocationBody`'s type widening is local to this folder; nothing outside `rd-geographic-location/` imports or constructs this class today besides this component itself.

---

## 9. Design Decisions

**`GEO-DD-1` — Fix at the read boundary, not with a shadow flag.**
*Issue:* how to distinguish "unanswered" from "answered No" on the client. *Decision:* remove the `Boolean()` coercion and let `null` flow through untouched, matching what the server already sends and what the DTO already types. *Alternatives considered:* a separate `has_extra_geo_scope_answered` tracking flag (Option B in `proposal.md`) — rejected, duplicates information the server already carries via `null` and adds a second field to keep in sync for no behavioral gain. *Implications:* `ExtraGeographicLocationBody.has_extra_geo_scope` becomes `boolean | null` in its type; any other reader of this field (checked: only `onSaveSection()`'s payload construction, which already forwards the raw value) must tolerate `null` — confirmed safe since the DTO already declares the field `nullable: true`.

This decision does not revert any already-delivered behavior (Step 2.3 not triggered) — it corrects a defect in a client-side mapping step that has behaved incorrectly since the field's introduction; no existing shipped behavior is being removed, disabled, or inverted.

### Budget (Step 2.4)

| Signal | Value |
|---|---|
| Expected tasks | 1 |
| Expected LOC | ~10–15 (2 line-level edits + 1 type annotation + regression test file) |
| Expected review rounds | 1 |

This matches **Lite** depth exactly — no downgrade or escalation needed.

---

## Required cross-references

- `requirements.md` (this folder) — `GEO-R-1..3`, `GEO-AC-1..3`.
- `docs/trd/trd.md` §2 — `results` module.
- `onecgiar-pr-client/CLAUDE.md` §9 — Jest/jsdom radio-check limitation (informs why `GEO-AC-1`'s visual confirmation is a manual check, not an automated one — see `requirements.md` §11).
