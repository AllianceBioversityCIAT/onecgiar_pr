# Module Spec — Design: Innovation Development (P25) save fails with HTTP 500 from phase 2026

## 1. Summary

Guard each `qN` slot access (`responsible_innovation_and_scaling.q1..q4`, `intellectual_property_rights.q1..q4`) at its read site inside `InnovationDevService.saveInnovationDev()`, so a slot the frontend legitimately omits from phase 2026+ onward degrades to "nothing to save for that slot" instead of throwing a `TypeError` that the method's own `catch` converts into an HTTP 500. Pure backend, single-method fix — one service, two groups, eight read sites (four `qN` × two groups). No new module, no data flow change, no DTO/entity/migration change.

Linked: `requirements.md` `IDEV-R-1..3`, `IDEV-AC-1..3` in this folder.

---

## 2. Architecture Overview

### 2.1 Where this lives in the system

- **Server module touched:** `onecgiar-pr-server/src/api/results-framework-reporting/innovation_dev/` only (`innovation_dev.service.ts`).
- **No client module touched** — the frontend's payload shape and its own read-side guards for the same "q4 absent" case are already correct (`innovation-dev-info/CLAUDE.md`).
- **No external integration touched.**

### 2.2 Sequence (unchanged shape, corrected read)

```
[Client] PATCH v2/api/innovation-development/innovation-dev/create/result/{id}
  body: CreateInnovationDevDtoV2
    responsible_innovation_and_scaling: { q1, q2, q3 }        ← q4 ABSENT from phase 2026+
    intellectual_property_rights:      { q1, q2, q3, q4 }
    ...
      └── InnovationDevController.saveInnovationDev()
            └── InnovationDevService.saveInnovationDev()
                  ├── persist ResultsInnovationsDev (unchanged, unaffected)
                  ├── for each group, for each of q1..q4:
                  │     BEFORE: dto?.group.qN.radioButtonValue   → throws TypeError when qN absent (BUG)
                  │              dto?.group.qN.options            → undefined, breaks for..of downstream (BUG)
                  │     AFTER:  dto?.group?.qN?.radioButtonValue  → undefined when qN absent (safe, no-op)
                  │              dto?.group?.qN?.options ?? []    → [] when qN absent (safe, no-op)
                  │     └── saveOptionsAndSubOptions(resultId, user, radioButtonValue, options)
                  │           radioButtonValue == null → answer_boolean = false for every option (existing, unaffected logic)
                  │           options = [] → for..of over empty array, no-op, no DB call (new: previously threw here)
                  ├── evidence / investment / scaling-study save steps (unaffected, unchanged, run only if the above didn't throw)
                  └── return { response, message, status: CREATED }   ← now reached for phase-2026+ payloads
```

---

## 3. Data Model Changes

None. No entity, column, or migration change. `CreateInnovationDevDtoV2` (DTO shape) is unchanged — the DTO already types `responsible_innovation_and_scaling` / `intellectual_property_rights` as objects whose `qN` members are optional in practice (the frontend already omits `q4` for 2026+); the defect is purely in how the *service* reads those optional members, not in the DTO's contract.

### 3.1 Entities

| Entity | Path | Change |
|---|---|---|
| `ResultsInnovationsDev` | `onecgiar-pr-server/src/api/results/summary/entities/results-innovations-dev.entity.ts` | No change. |
| `ResultAnswer` | `onecgiar-pr-server/src/api/results/result-questions/entities/result-answer.entity.ts` | No change — `saveOptionsAndSubOptions` already writes/updates this correctly; it just needs to receive a well-formed (possibly empty) `options` array instead of `undefined`. |

### 3.2 Migrations

None.

---

## 4. Extended Directory Structure

No new files.

```
onecgiar-pr-server/src/api/results-framework-reporting/innovation_dev/
├── innovation_dev.service.ts        # saveInnovationDev() — fix here (8 read sites across 2 groups)
├── innovation_dev.service.spec.ts   # regression tests added here
└── innovation_dev.controller.ts     # unchanged — no route/DTO/version change
```

---

## 5. API Design

No API change. `PATCH v2/api/innovation-development/innovation-dev/create/result/:resultId` (`@Version('2')`) keeps its route, method, DTO, and auth posture exactly as-is. Request/response shapes are unchanged — the fix only changes what the service does internally with a payload shape it can already legitimately receive.

### 5.1 Endpoint (unchanged, documented for context)

| Field | Value |
|---|---|
| **Method + path** | `PATCH v2/api/innovation-development/innovation-dev/create/result/:resultId` |
| **Version** | `v2` |
| **Auth** | JWT required (`@UserToken()` decodes it) — unchanged. |
| **Request DTO** | `CreateInnovationDevDtoV2` — unchanged. |
| **Response** | `{ response: ResultsInnovationsDev, message: string, status: HttpStatus.CREATED }` on success — now reached for phase-2026+ payloads that previously always 500'd. |
| **Errors** | Genuinely unexpected errors still fall through to `_handlersError.returnErrorRes` (unchanged safety net) — this fix removes one specific, previously-guaranteed throw, not the catch itself. |

---

## 6. Backend Module Design

**`InnovationDevService.saveInnovationDev()`** (`innovation_dev.service.ts`, ~lines 136-208):

Replace each of the eight `saveOptionsAndSubOptions(...)` call sites for `responsible_innovation_and_scaling` (`q1..q4`) and `intellectual_property_rights` (`q1..q4`) so both arguments are read defensively:

- `radioButtonValue`: `createInnovationDevDto?.group?.qN?.radioButtonValue` (chain the optional operator through `qN`, not just the parent group).
- `options`: `createInnovationDevDto?.group?.qN?.options ?? []` (default to an empty array so `saveOptionsAndSubOptions`'s `for (const optionData of options)` never iterates `undefined`).

Apply the same pattern to `q1`, `q2`, `q3` as well as `q4` — per `IDEV-R-10`, guarding only `q4` would reintroduce the identical defect class the day a future phase drops a different slot. `innovation_team_diversity` and `megatrends` are single-question groups (no `qN` sub-keys) and already read `?.radioButtonValue` / `?.options` directly off the group — they are not affected and are not touched.

**`InnovationDevService.saveOptionsAndSubOptions()`** (~line 449): unchanged. It already handles `radioButtonValue == null` correctly (line ~484); it only ever broke because a caller could hand it `undefined` for `options`, which the fix above now prevents at the call site.

No change to the earlier `ResultsInnovationsDev` persistence block, nor to the evidence/investment/scaling-study-URL steps later in the same method — they run unconditionally after the guarded reads and are unaffected once the guarded reads stop throwing.

---

## 7. Frontend / UX Component Architecture

Not touched. No component, service, or template change on the client — its payload shape and its own guards for this exact "q4 absent in 2026" case are already correct and are the reason the root cause could be pinpointed precisely (see `innovation-dev-info/CLAUDE.md`).

---

## 8. Shared Contracts or Package Extensions

None. `CreateInnovationDevDtoV2` is unchanged; no shared type or package boundary is touched.

---

## 9. Design Decisions

**`IDEV-DD-1` — Guard every `qN` leaf uniformly, not just the confirmed-missing `q4`.**
*Issue:* the confirmed defect is `responsible_innovation_and_scaling.q4` specifically; a narrower fix could special-case only that one slot. *Decision:* guard all eight read sites (`q1..q4` × 2 groups) with the same `?.qN?.field` / `?.qN?.options ?? []` pattern. *Alternatives considered:* (a) fix only the confirmed-broken `q4` slot — rejected, leaves `intellectual_property_rights.q4` and any future phase's `q1..q3` drop exposed to the identical defect class for no extra cost to fix now; (b) normalize the whole DTO at the top of the method (fill in missing `qN` with a default empty object) — rejected as the proposal's Option B, it introduces a shape the DTO class doesn't declare and adds indirection versus a direct per-site fix. *Consequences:* eight small, mechanical edits instead of one — still well within Lite depth; no behavior change for any payload where all slots are present (today's only tested shape).

This decision does not revert any already-delivered behavior (Step 2.3 not triggered) — it adds null-safety to reads that have been unsafe since the code was written; no existing shipped behavior is being removed, disabled, or inverted.

### Budget (Step 2.4)

| Signal | Value |
|---|---|
| Expected tasks | 1 |
| Expected LOC | ~20–30 (8 guarded read-site edits + 2 new regression test cases) |
| Expected review rounds | 1 |

This matches **Lite** depth exactly — no downgrade or escalation needed.

---

## Required cross-references

- `requirements.md` (this folder) — `IDEV-R-1..3`, `IDEV-AC-1..3`.
- `docs/trd/trd.md` §2 — `results-framework-reporting` module.
- `onecgiar-pr-client/.../innovation-dev-info/CLAUDE.md` — documents the frontend's "q4 key absent from 2026" payload shape this design tolerates.
- `onecgiar-pr-server/src/api/results-framework-reporting/innovation_dev/innovation_dev.service.spec.ts` — existing `buildInnovationDevQuestions()` test helper this design's regression tests extend.
