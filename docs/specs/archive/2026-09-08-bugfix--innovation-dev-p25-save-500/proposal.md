# Proposal — Innovation Development (P25) section fails to save with HTTP 500 from phase 2026 on

## 1. Document Control

| Field | Value |
|---|---|
| Slug | `innovation-dev-p25-save-500` — derived from free-text bug report (core intent: Innovation Development save fails with a 500) |
| Spec Path | `docs/specs/bugfix/innovation-dev-p25-save-500/` |
| Type | **Bug** |
| Approval Mode | `gated` (default) |
| Ticket(s) | none provided |
| Status | draft — root cause confirmed via live repro (browser console) and code read |

---

## 2. Intent

Saving the "Innovation Development" result-detail section (P25 portfolio) must succeed for results in every reporting phase, not just phases before 2026.

---

## 3. Problem / Current Behavior

Reported symptom: saving "Innovation Dev info" on a result fails; the client shows the alert *"This section was not saved — Your evidence was stored, but the rest of the section could not be saved"* and the browser console shows repeated `500 Internal Server Error` responses from the save endpoint.

## 3.1 Bug Diagnosis

### Observed Symptom
Clicking Save on the Innovation Development section (P25) reliably fails. DevTools shows:
- `PATCH …/v2/api/innovation-development/innovation-dev/create/result/{resultId}` → `500 Internal Server Error`
- Client console: `[innovation-dev-info] saving the section failed`, `HttpErrorResponse`, at `innovation-dev-info.component.ts:254`
- UI modal: "This section was not saved."

### Reproduction Steps
1. Open a result whose current reporting phase is **2026 or later** (verified live against a `phase=36` result, id 9029/11497), on the P25 portfolio.
2. Navigate to Result Detail → **Innovation Development** section.
3. Make any edit and click **Save** (or just re-save the section as-is).
4. Observe: the "Your evidence was stored, but the rest of the section could not be saved" dialog appears, and DevTools shows the `.../innovation-dev/create/result/{id}` call returning 500.

A phase ≤2025 result on the same section does not exhibit this — confirmed by the pre-existing documentation trap described below.

### Root Cause (confirmed)

`onecgiar-pr-server/src/api/results-framework-reporting/innovation_dev/innovation_dev.service.ts`, method `saveInnovationDev()`, reads two nested question groups from the incoming DTO without guarding the nested key itself:

```ts
// lines ~137-164 — responsible_innovation_and_scaling.q4
await this.saveOptionsAndSubOptions(
  resultId, user.id,
  createInnovationDevDto?.responsible_innovation_and_scaling.q4.radioButtonValue, // ← .q4. is not optional
  createInnovationDevDto?.responsible_innovation_and_scaling.q4.options,
);

// lines ~188-194 — intellectual_property_rights.q4 (same pattern)
await this.saveOptionsAndSubOptions(
  resultId, user.id,
  createInnovationDevDto?.intellectual_property_rights.q4.radioButtonValue,
  createInnovationDevDto?.intellectual_property_rights.q4.options,
);
```

The `?.` only protects the parent object (`responsible_innovation_and_scaling` / `intellectual_property_rights`); it does not protect `.q4` itself. **From the 2026 reporting phase on, the frontend's questionnaire payload for `responsible_innovation_and_scaling` has no `q4` key at all** — this is an already-documented, pre-existing trap in `onecgiar-pr-client/.../innovation-dev-info/CLAUDE.md`:

> "🛑 From 2026 the `q4` KEY DOES NOT EXIST in the payload, and an unmatched stage question comes back `undefined`."

The frontend already had to add guards for this exact shape on its own read/render path (`innovation-dev-info-utils.service.ts` early-returns on an empty slot; `stage-assessment.component.html` wraps in `@if (question)`), but this **backend save path was never updated to match**. When `q4` is `undefined`:
- `.radioButtonValue` throws `TypeError: Cannot read properties of undefined (reading 'radioButtonValue')`.
- Even if that were guarded, `.options` would be `undefined`, and `saveOptionsAndSubOptions()` (line ~460) does `for (const optionData of options)` — which throws `TypeError: options is not iterable` on `undefined`.

The whole `saveInnovationDev()` body runs inside a single `try { … } catch (error) { return this._handlersError.returnErrorRes({ error, debug: true }); }` (line ~282), so the thrown `TypeError` is caught and converted into a formatted **HTTP 500** response — matching the exact failure observed.

Confirmed live: the frontend's `PATCH_innovationDevP25()` (`results-api.service.ts:599-602`) posts to exactly this endpoint (`baseApiBaseUrlV2` + `innovation-development/innovation-dev/create/result/{id}`), and `innovation-dev-info.component.ts`'s `onSaveSection()` (line ~248) is the caller whose `error` handler at line 254 is the one logging in the screenshot.

### Impact & Scope
- Affects **every** Innovation Development (P25) result-detail save where the current reporting phase is 2026 or later — i.e. this is a hard blocker for all Innovation Development reporting from phase 2026 onward, not an edge case.
- Both the `responsible_innovation_and_scaling.q4` and `intellectual_property_rights.q4` reads share the same unguarded pattern. Only the former is confirmed (by existing docs and this repro) to actually go missing in the 2026 payload; the latter should be hardened defensively in the same fix even though no confirmed case of it going missing in 2026 was found.
- No data corruption risk — the failure happens before any DB write for that request completes as a unit inside the try/catch; the evidence sub-save (a separate call, `POST_createEvidenceDemandP25`) already succeeded before this call runs, which is why the dialog says "your evidence was stored."
- Purely a backend read-guard defect — no schema, DTO shape, or migration change needed.

### Fix Strategy
Not cosmetic — a logic/null-safety correction in a save path that iterates and writes to the DB → routes to `/akili-specify` (Lite) in **Bug Mode**, with a mandatory regression test (red before fix, green after) that:
- Posts a 2026-phase-shaped payload where `responsible_innovation_and_scaling.q4` is absent, and asserts the save succeeds (no 500) and correctly skips saving q4's non-existent options.
- Does the same for a payload missing `intellectual_property_rights.q4`, as a defensive regression guard.
- Asserts unaffected phases (payload with all four `q1..q4` present) still save identically to today (no behavior change for the still-working case).

Smallest safe correction: guard each `.qN` access at the point of use — read `radioButtonValue` via `?.qN?.radioButtonValue` and default `options` to `[]` via `?.qN?.options ?? []` — mirroring the same "guard the leaf, not just the parent" pattern the frontend already uses for this exact payload shape.

---

## 4. Proposed Outcome

Saving the Innovation Development (P25) section succeeds for results in any reporting phase, including 2026+ results whose questionnaire payload omits `responsible_innovation_and_scaling.q4` (and, defensively, `intellectual_property_rights.q4`). No behavior change for phases/payloads where all four sub-questions are present.

---

## 5. Scope

### In scope
- Guard the `.q4` (and, for consistency, `.q1`/`.q2`/`.q3`) leaf access on `responsible_innovation_and_scaling` and `intellectual_property_rights` inside `saveInnovationDev()` so a missing slot degrades to "nothing to save for that slot" instead of throwing.
- Regression test(s) in `innovation_dev.service.spec.ts` covering: (a) 2026-shaped payload missing `responsible_innovation_and_scaling.q4`, (b) payload missing `intellectual_property_rights.q4`, (c) unaffected full payload still behaves as before.

### Out of scope
- Any frontend change — the client-side guards for this exact "q4 missing in 2026" shape already exist and are correct; only the backend save path is defective.
- Redesigning `saveOptionsAndSubOptions()` beyond what's needed to tolerate an already-empty/undefined `options` array from the caller.
- The `innovation_team_diversity` / `megatrends` groups — these are single-question groups (no `q1..q4` sub-keys) and are not implicated by this defect.
- Any change to which questions exist per phase (`resolveScalingSlotsForPhase` / the P25 question catalog) — that logic is correct today; this bug is purely about the save path not tolerating its (correct) output.

---

## 6. Non-Goals

- No migration or entity change — `result_questions` / `result_answers` schema and phase-based question catalog are unaffected.
- No change to the evidence save call (`POST_createEvidenceDemandP25`) or its error handling — it already works and is not implicated.

---

## 7. Affected Users, Systems, And Specs

| Item | Detail |
|---|---|
| Persona | Result submitter reporting an Innovation Development result in phase 2026+ (P25) |
| Backend service | `onecgiar-pr-server/src/api/results-framework-reporting/innovation_dev/innovation_dev.service.ts` — `saveInnovationDev()` (~lines 136-208), `saveOptionsAndSubOptions()` (~line 449) |
| Backend controller | `onecgiar-pr-server/src/api/results-framework-reporting/innovation_dev/innovation_dev.controller.ts` — `PATCH innovation-dev/create/result/:resultId` (`@Version('2')`) |
| Client caller (unchanged, for context) | `onecgiar-pr-client/src/app/shared/services/api/results-api.service.ts:599` (`PATCH_innovationDevP25`), `onecgiar-pr-client/.../innovation-dev-info/innovation-dev-info.component.ts:219-287` (`onSaveSection()`) |
| Related module doc | `onecgiar-pr-client/.../innovation-dev-info/CLAUDE.md` — already documents the "q4 key absent from 2026" payload shape on the frontend read side; this proposal closes the matching gap on the backend write side |
| Related specs | None found under `docs/specs/` for `innovation_dev` backend save path |

---

## 8. Visual Reference

- Source: User-provided screenshots (DevTools console + "This section was not saved" dialog)
- Location: Provided inline in the originating message; not persisted under this spec folder.
- Notes: No UI change is proposed — the dialog and error handling shown in the screenshots are already correct (per the prior P2-3218 fix that made save failures visible). The fix target is the backend 500 itself, not the client's error presentation.

---

## 9. Approach Options

| Option | Description | Trade-off |
|---|---|---|
| **A — Guard each `.qN` leaf at the read site (recommended)** | Change `dto?.group.qN.field` to `dto?.group?.qN?.field` (radioButtonValue) and `dto?.group?.qN?.options ?? []` (options) for both affected groups. | Smallest, most literal fix; matches confirmed root cause exactly; mirrors the frontend's existing guard pattern for the same shape; no behavior change when all slots are present. |
| B — Normalize the DTO once at the top of `saveInnovationDev()` (fill in missing `qN` with an empty default object) | Add a small normalization step so downstream code can assume all four slots exist. | Slightly more defensive against future missing slots, but introduces a shape the DTO/class doesn't actually declare (`CreateInnovationDevDtoV2`) and adds indirection for a fix that's otherwise a one-line-per-site change. |
| C — Make `saveOptionsAndSubOptions()` itself tolerate `undefined` options (default internally) | Change the method's own signature/body to treat `options` as optional. | Fixes the symptom at a lower layer but leaves the `.radioButtonValue` read on a possibly-undefined `.q4` unguarded — doesn't fully address the root cause on its own; would need to be paired with A anyway. |

**Recommended: Option A**, since it fixes both failure points (the `.radioButtonValue` throw and the `.options` non-iterable throw) at the exact two call sites that are broken, with minimal surface area.

---

## 10. Risks, Dependencies, And Open Questions

- No open questions — root cause is confirmed by both the pre-existing frontend documentation of this exact payload shape and a live repro against a phase-2026 result.
- Dependency: none — pure backend fix, no migration, no frontend change.
- Risk: low — the change only adds null-safety at two call sites and does not alter behavior for any payload where all four sub-questions are present (the pre-2026 case, and the only case exercised by existing tests today). Verify during `/akili-specify` whether `innovation_dev.service.spec.ts` already has fixtures assuming `q1..q4` are always present, so the new test can reuse the existing mock shape.

---

## 11. Success Criteria

- Saving the Innovation Development (P25) section on a phase-2026+ result (payload missing `responsible_innovation_and_scaling.q4`) succeeds with no 500.
- Saving with a payload missing `intellectual_property_rights.q4` also succeeds with no 500.
- Saving with a full payload (all `q1..q4` present, pre-2026 shape) behaves exactly as before — no regression.
- Regression test(s) added and passing (red before fix, green after).

---

## 12. Next Step

```text
/akili-specify bugfix/innovation-dev-p25-save-500
```

in **Bug Mode** — converts this confirmed root cause into a fix plan and a mandatory regression test.
