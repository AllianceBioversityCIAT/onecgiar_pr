# Module Spec — `design.md`

Linked: `docs/specs/bugfix/kp-bare-handle-format/requirements.md`.

## 1. Summary

Extend the one canonical Knowledge Product handle regex (`KP_HANDLE_REGEX`) to accept the bare `{10568|20.500.11766|20.500.12348}/<digits>` handle form, add a pure `normalizeKpHandle()` helper that rewrites an accepted bare handle into the already-proven-working canonical URL before any network call, and patch the three Sync handlers that currently duplicate the old `https://`-only regex — one (`report-result-form.component.ts`, the reported flow) by switching to the shared validator it already half-imports, the other two by patching their existing local copies in place. Client-only change; the server is a confirmed pure passthrough with nothing to fix.

## 2. Architecture Overview

### 2.1 Where this lives in the system

- **Client modules touched:**
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/shared/report-result/kp-handle.validator.ts` — canonical regex + new `normalizeKpHandle()`.
  - `onecgiar-pr-client/src/app/pages/results/pages/result-creator/components/report-result-form/report-result-form.component.ts` — `GET_mqapValidation()` (reported flow).
  - `onecgiar-pr-client/src/app/pages/results/pages/result-creator/result-creator.component.ts` — `GET_mqapValidation()` (legacy screen).
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/entity-aow/pages/entity-aow-aow/components/aow-hlo-table/components/aow-hlo-table-create-modal/aow-hlo-create-modal.component.ts` — `GET_mqapValidation()` (AoW/HLO modal).
- **Server modules touched:** none. `results-knowledge-products/mqap` → `findOnCGSpace` → `MQAPBodyDto.fromHandle` does no normalization today and needs none — the client sends an already-canonical URL.
- **External integrations touched:** none new. `GET_mqapValidation` still calls the same `results-knowledge-products/mqap` endpoint; only the string it sends changes (URL instead of sometimes-bare).

### 2.2 Sequence / interaction diagram

```
[Manual entry field] "10568/183891"
  └── user clicks Sync
        └── GET_mqapValidation() (component)
              ├── validateKpHandle(raw)              // KP_HANDLE_REGEX now matches the bare form
              │     └── { status: false, message: '' }
              ├── normalizeKpHandle(raw)              // "10568/183891" → "https://cgspace.cgiar.org/handle/10568/183891"
              ├── resultBody.handler = normalized
              └── api.resultsSE.GET_mqapValidation(normalized)
                    └── GET results-knowledge-products/mqap?handle=<normalized>   (server: unchanged, verbatim passthrough)
                          └── MQAP external API resolves the item (same shape it already resolves today for the full-URL path)
```

Unsupported input (e.g. `99999/1`) short-circuits at `validateKpHandle` exactly as today — no request is sent.

## 3. Data Model Changes

None. No entity, DTO, or migration change — `handler` stays a `string` column/field; only its *content* is now always a canonical URL instead of sometimes-bare.

## 4. API Surface

No new or changed endpoint. `GET_mqapValidation(handle)` (`results-api.service.ts`) keeps its existing signature and URL (`results-knowledge-products/mqap?handle=${handle}`); the caller now always passes a normalized value.

### 4.2 Bilateral / platform-report impact

None — this field is not part of the bilateral or platform-report payload contract.

## 5. Frontend Plan

### 5.1 `kp-handle.validator.ts` — canonical fix

- Extend `KP_HANDLE_REGEX` with a bare-handle alternative for the same three prefixes already accepted in URL form:

  ```
  ^(?:
      https://(?:...existing URL alternatives unchanged...)
    | (?:10568|20\.500\.11766|20\.500\.12348)/\d+
  )$
  ```

- Add `export function normalizeKpHandle(handle: string): string` — pure function, no side effects:
  - If `handle` matches the bare-handle pattern, rewrite it: prefix `10568` → `https://cgspace.cgiar.org/handle/<prefix>/<digits>` (mirrors the existing accepted `cgspace.cgiar.org/handle/` URL form); prefixes `20.500.11766` / `20.500.12348` → `https://hdl.handle.net/<prefix>/<digits>` (mirrors the existing accepted `hdl.handle.net/` URL form — MELSpace/WorldFish have no `cgspace.cgiar.org/handle/`-equivalent accepted host).
  - Otherwise (already a URL, or invalid — caller is expected to have validated first) return `handle` unchanged.
- `validateKpHandle()`'s signature and return shape (`{ status, message }`) are unchanged — callers validate first, then call `normalizeKpHandle()` on success. Keeps the change additive and non-breaking for `lab-report-form`, the only current consumer of `validateKpHandle` that doesn't need this spec's changes.

### 5.2 `report-result-form.component.ts` — close the drift (`KPH-R-3`)

`GET_mqapValidation()` currently re-implements the regex + message inline (lines ~505-526) instead of using the `validateKpHandle` it already imports (line 20, used at line 262 for the Browse path). Replace the inline block:

- Call `validateKpHandle(this.resultLevelSE.resultBody.handler)`; on `status: true`, set `this.mqapUrlError` from the returned error and return — same early-exit shape as today, just sourced from the shared function.
- On success, call `normalizeKpHandle(...)`, assign the result back onto `resultLevelSE.resultBody.handler`, then proceed to `api.resultsSE.GET_mqapValidation(normalized)` exactly as today.
- Net effect: the file's Manual-entry Sync path and its Browse-selection path (`selectKpItem`, line 259-275) now share one validator, closing the two-validators-in-one-file drift noted in `proposal.md`.

### 5.3 `result-creator.component.ts` / `aow-hlo-create-modal.component.ts` — patch in place (`KPH-R-4`)

Both keep their own local `const regex = /.../ ` literal (see `KPH-DD-1` for why). Patch scope, identical in both files:

- Replace the local regex literal with the same extended pattern from §5.1 (copy, not import — matches the existing duplication pattern these files already use).
- Import only the new pure `normalizeKpHandle` from `kp-handle.validator.ts` (no prior duplication of this function exists to drift — safe to share) and call it on the validated value before assigning `handler` / calling their respective `GET_mqapValidation`.
- Everything else in both handlers (empty check, error message, signal vs. field assignment) is untouched.

### 5.4 Design system / a11y / i18n

No UI surface changes — same field, same placeholder, same error message shown for genuinely unsupported input. `RFUX-R-5` (persistent inline helper copy) is unaffected; the existing helper text ("Paste a handle from CGSpace, MELSpace, or WorldFish DSpace…") already describes the *repositories*, not the *format*, so it stays accurate without a copy change.

## 7. Security & Authorization

No auth/role change. Normalization only rewrites an already-validated bare handle into a URL built from the existing accepted-host allowlist (`cgspace.cgiar.org`, `hdl.handle.net`) — no new host, scheme, or unvalidated input reaches `GET_mqapValidation`.

## 8. Performance & Capacity

Negligible — one additional regex test and a small string rewrite on a user-initiated click, no new network calls.

## 9. Observability

No new logging. Existing `mqapUrlError` / alert-on-failure behavior is unchanged.

## 10. Testing Plan (forward-looking)

- **Unit (validator):** `KP_HANDLE_REGEX` / `normalizeKpHandle` for all three prefixes, bare and URL forms; a non-matching prefix and a malformed string must still fail. Red before the fix (bare handle currently fails), green after.
- **Unit (component, report-result-form):** `GET_mqapValidation()` with a bare handle passes validation and calls `api.resultsSE.GET_mqapValidation` with the normalized URL; existing "empty handler" and "invalid format" spec cases (`report-result-form.component.spec.ts:563-599`) keep passing unchanged.
- **Unit (component, result-creator & aow-hlo-create-modal):** same bare-handle-now-passes assertion, scoped to each file's existing spec conventions (`signal` vs. plain field).
- No Cypress/E2E needed — this is synchronous validation logic with no layout or async timing surface; Jest is sufficient per the defect-class → gate mapping in `requirements.md`.

## 11. Backwards Compatibility & Migration Plan

Purely additive: every currently-accepted URL form keeps matching identically (existing regex alternatives untouched, only a new alternative added). No API contract, migration, or feature flag involved. Rollback is a plain revert of the three files.

## 12. Design Decisions (ADRs)

### `KPH-DD-1` — Patch the two non-`report-result-form` Sync handlers in place, do not de-duplicate them onto the shared validator

- **Context:** `result-creator.component.ts` and `aow-hlo-create-modal.component.ts` each carry their own full copy of the old regex + message, structurally identical to the one this bug is fixing in `report-result-form.component.ts`. The shared `report-result-form/CLAUDE.md` already documents that `aow-hlo-create-modal.component.ts` deliberately keeps its local copy "a propósito, hasta que el aside se verifique en producción."
- **Decision:** Fix the regex (and add normalization) in both files' existing local copies, without importing `validateKpHandle` into them. Only the pure, brand-new `normalizeKpHandle` helper is imported into both — it has no prior duplication history to drift from.
- **Alternatives considered:**
  1. De-duplicate all three onto `validateKpHandle` now. Rejected: overturns a deliberate, documented, pre-existing team decision to defer that migration for `aow-hlo-create-modal.component.ts`; would widen a scoped bugfix into an architecture change not requested by the report.
  2. Leave the two other files unpatched, fix only the reported flow. Rejected: `result-creator.component.ts` and `aow-hlo-create-modal.component.ts` create Knowledge Products through the identical Sync/regex path — leaving them broken means the same bug ships again the next time a submitter uses either surface, which is not "fixing the bug," only fixing one report of it.
- **Consequences:** Three copies of the bare-handle regex extension exist after this change (down from the pre-existing three copies of the old regex — no increase in duplication count). The de-duplication itself remains open, tracked in `requirements.md` §11 Out-of-Band Notes, not resolved here.

**Reversion challenge (Step 2.3):** not triggered — this spec only adds acceptance (bare handle) and fixes a drift (duplicate validator), it does not remove, disable, or invert any already-delivered behavior. Every currently-accepted URL form keeps working exactly as before.

## 13. Open Gaps & Follow-ups

- De-duplicating `result-creator.component.ts` and `aow-hlo-create-modal.component.ts` onto the shared `validateKpHandle()` — deferred per `KPH-DD-1`, not part of this bugfix.
- `KPH-OQ-1` (from `requirements.md`): live QA confirmation on a real MELSpace/WorldFish bare handle, not just CGSpace — recommended before shipping if a test item is available.

## Design Budget (Step 2.4)

| Signal | Estimate |
|---|---|
| Tasks | 3 (`KPH-T-1` validator, `KPH-T-2` report-result-form, `KPH-T-3` the two other Sync handlers) |
| LOC | ~90-120 across 4 source files + their specs (regex extension ~10 LOC, `normalizeKpHandle` ~15 LOC, report-result-form handler rewrite ~15 LOC net, ~10 LOC each in the other two files, remainder in test additions) |
| Review rounds | 1 — root cause and fix shape are already confirmed in `proposal.md`; no open architectural question remains |

Matches the **Lite** depth chosen in `/akili-propose` — no level change recommended.

---

## Required cross-references

- `docs/specs/bugfix/kp-bare-handle-format/requirements.md` (same folder).
- `docs/prd.md`, `docs/trd/trd.md` (MQAP integration, `api/m-qap/`).
- `onecgiar-pr-client/src/app/pages/result-framework-reporting/shared/report-result/CLAUDE.md` — source of the `KPH-DD-1` decision; **update after execution** to note the regex/normalization fix and that `aow-hlo-create-modal.component.ts` still deliberately holds its own copy (now current, not stale).
