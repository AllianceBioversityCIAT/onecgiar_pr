# Module Spec — `requirements.md`

## 1. Module / Feature

- **Module:** `results` (Knowledge Product handle entry — Manual entry, and its two duplicated Sync handlers)
- **Sub-feature:** `kp-bare-handle-format` (bugfix)
- **Owner:** M.Giraldo@cgiar.org
- **Status:** approved
- **Depth:** Lite (Bug Mode)
- **Ticket(s):** none yet — reported via QA on `prtest.ciat.cgiar.org` (UI v15, v1.3.4, Reporting 2026 — P25)

## 2. Context

Reporting a Knowledge Product's Manual entry "Repository link/handle" field only accepts a fully-qualified `https://…` URL. Confirmed root cause (see `proposal.md` → Bug Diagnosis): `KP_HANDLE_REGEX` (`onecgiar-pr-client/.../shared/report-result/kp-handle.validator.ts:16`) has no alternative for the bare `<prefix>/<digits>` form (`10568/183891`) — the exact way CGSpace, MELSpace, and other DSpace/OAI repositories display and share handles by default — even though that same prefix set (`10568`, `20.500.11766`, `20.500.12348`) is already whitelisted once wrapped in a URL. The identical `https://`-only regex is duplicated in three Sync handlers: `report-result-form.component.ts:515` (the reported "Report emerging result" → Manual entry flow), `result-creator.component.ts:439`, and `aow-hlo-create-modal.component.ts:414`. `report-result-form.component.ts` already imports the shared `validateKpHandle()` for its "Browse repositories" path but keeps a second, hand-copied regex for Manual entry's Sync — a latent drift risk independent of the format gap.

Traced end-to-end: the server does zero normalization (`MQAPBodyDto.fromHandle` assigns `link = handle` verbatim, pure passthrough to the external MQAP API) — the defect and the fix are entirely client-side.

Touches `docs/trd/trd.md` MQAP integration (`api/m-qap/`) conceptually; no server/API/data-model change.

## 3. In Scope / Out of Scope

### In scope

- Extend the canonical `KP_HANDLE_REGEX` (and the new normalization helper) in `kp-handle.validator.ts` to accept a bare handle for the three already-whitelisted prefixes (`10568`, `20.500.11766`, `20.500.12348`).
- Normalize an accepted bare handle to its already-proven-working canonical URL form before it is ever sent to `GET_mqapValidation` (server does no normalization of its own — confirmed in `proposal.md`).
- `report-result-form.component.ts`'s `GET_mqapValidation()` (the reported flow): replace its duplicated inline regex/message with the shared `validateKpHandle()` + the new normalization helper, closing the drift between its two validators.
- Apply the identical regex extension + normalization step to the two other duplicated Sync handlers (`result-creator.component.ts`, `aow-hlo-create-modal.component.ts`) so the same bug does not persist in those surfaces — as inline patches to their existing local copies, not a de-duplication refactor (see `KPH-DD-1` in `design.md` for why they keep their local copies).

### Out of scope

- De-duplicating `result-creator.component.ts` and `aow-hlo-create-modal.component.ts` onto the shared `validateKpHandle()` import — the report-result-form/CLAUDE.md already documents this as a deliberate, deferred decision for the second file ("a propósito, hasta que el aside se verifique en producción"); folding it in here would widen a bugfix into an unrelated refactor.
- The MQAP resolution logic, the KP entity, the "already reported" check, and the reporting-year rule — confirmed already correct (the repro's second Sync attempt with the full URL succeeded).
- The Browse-repositories discovery flow (`kp-cgspace-browse`) — it already produces full URLs.
- Any backend change — confirmed pure passthrough, nothing to fix server-side.

## 4. Personas Affected

| Persona | What changes for them |
|---|---|
| Result submitter | Can paste a Knowledge Product handle exactly as CGSpace/MELSpace/WorldFish display it (bare `prefix/digits`), in any of the three creation surfaces, and have Sync resolve it. |

## 5. User Stories

- **`KPH-US-1`** — As a result submitter reporting a Knowledge Product, I want Manual entry's Sync to accept a bare repository handle (no `https://` prefix), so that I don't have to hand-construct a URL from a handle I copied verbatim from the repository.

Refines `US-S2` (type-specific section capture) in `docs/prd.md`.

## 6. Functional Requirements

### Required (MUST)

- **`KPH-R-1`** `KP_HANDLE_REGEX` MUST accept a bare handle of the form `{10568|20.500.11766|20.500.12348}/<digits>`, in addition to the URL forms it already accepts.
- **`KPH-R-2`** WHEN a value accepted only in bare form passes validation, the system MUST normalize it to its canonical URL (`https://cgspace.cgiar.org/handle/<prefix>/<digits>` for `10568`; `https://hdl.handle.net/<prefix>/<digits>` for `20.500.11766` / `20.500.12348`) before it is sent to `GET_mqapValidation` or persisted as `handler`.
- **`KPH-R-3`** `report-result-form.component.ts`'s `GET_mqapValidation()` MUST validate and normalize via the shared `kp-handle.validator.ts` functions, not a separately maintained regex/message.
- **`KPH-R-4`** `result-creator.component.ts` and `aow-hlo-create-modal.component.ts`'s Sync handlers MUST accept and normalize the same bare-handle forms as `KPH-R-1`/`KPH-R-2`.
- **`KPH-R-5`** An input that matches none of the accepted forms (bare or URL) MUST still be rejected with the existing unsupported-handle message — the fix MUST NOT widen acceptance beyond the three already-whitelisted prefixes/hosts.

### Defect classes this spec can produce → gate

| Defect class | Catching command / check |
|---|---|
| Bare handle still rejected (regression of the exact reported bug) | Jest unit test on `validateKpHandle()`/`KP_HANDLE_REGEX` — red before the fix, green after (Task `KPH-T-1`) |
| Normalization produces a URL form MQAP doesn't actually resolve | Cannot be verified from this repo (external MQAP service, no test double documents its tolerance) — **accepted risk**, mitigated by normalizing only to URL shapes already confirmed working in the bug report's own repro (`proposal.md` Risk R3) |
| Regex widened beyond the intended 3 prefixes (over-acceptance) | Jest unit test asserting a non-matching prefix (e.g. `99999/1`) and a malformed bare string still fail validation (Task `KPH-T-1`) |
| `report-result-form.component.ts` Sync path drifts from the shared validator again | Component spec test asserting `GET_mqapValidation()` calls `validateKpHandle`/`normalizeKpHandle` rather than a literal regex (Task `KPH-T-2`) |
| Same bug persists in the two other duplicated Sync handlers | Component spec tests on `result-creator.component.ts` and `aow-hlo-create-modal.component.ts` asserting a bare handle now passes (Task `KPH-T-3`) |

No class here is visual or layout-dependent — this is pure input-validation logic, directly assertable by Jest. The one unmeasurable class (external MQAP tolerance) is recorded as an accepted risk, not silently skipped.

#### Scenario: Bare CGSpace handle resolves (the reported case)

- GIVEN the Manual entry "Repository link/handle" field, empty
- WHEN the submitter types `10568/183891` and clicks **Sync**
- THEN the field passes client-side validation (no "not other CGIAR repositories" error)
- AND the value sent to `GET_mqapValidation` is `https://cgspace.cgiar.org/handle/10568/183891`
- BUT the value stored in `resultLevelSE.resultBody.handler` after Sync succeeds MUST be the normalized URL, not the bare string the user typed
- AND IT MUST behave identically whether the user typed the bare handle or pasted the full URL for the same item (same normalized value reaches `GET_mqapValidation`)

#### Scenario: Unsupported handle still rejected

- GIVEN the Manual entry field
- WHEN the submitter types a value that matches neither an accepted URL nor an accepted bare-handle prefix (e.g. `99999/1`, or a non-CGIAR URL)
- THEN Sync MUST reject it with the existing unsupported-handle message
- BUT it must NOT silently pass validation just because it contains a `/`

## 7. Non-Functional Requirements

| Dimension | Target |
|---|---|
| **Backwards compatibility** | Every currently-accepted URL form MUST keep validating identically across all three call sites — no regression (existing spec assertions in the three `*.component.spec.ts` files must stay green). |
| **Security** | No new external input reaches an endpoint unvalidated — normalization only rewrites an already-validated bare handle into a URL shape from the existing accepted-host allowlist; no new host or scheme is introduced. |

## 8. Acceptance Criteria

| ID | Given | When | Then |
|---|---|---|---|
| `KPH-AC-1` | Manual entry field, empty | Submitter types `10568/183891` and clicks Sync | No "not other CGIAR repositories" error; `GET_mqapValidation` is called with `https://cgspace.cgiar.org/handle/10568/183891`. |
| `KPH-AC-2` | Manual entry field, empty | Submitter types `20.500.11766/9021` (MELSpace-style bare handle) and clicks Sync | No error; `GET_mqapValidation` is called with `https://hdl.handle.net/20.500.11766/9021`. |
| `KPH-AC-3` | Any of the three Sync handlers, a value already accepted today (e.g. `https://cgspace.cgiar.org/items/<uuid>`) | Submitter clicks Sync | Behavior is unchanged (no regression). |
| `KPH-AC-4` | Any of the three Sync handlers | Submitter types an unsupported value (e.g. `99999/1`) | The existing unsupported-handle message still shows. |

## 9. Dependencies & Assumptions

### Upstream dependencies

- MQAP (`api/m-qap`) — external attribute-lookup service; receives whatever URL the client sends, unchanged by this spec.

### Downstream consumers

- None new — `handler` continues to flow into `POST_createWithHandle` exactly as today, just always in URL form now instead of sometimes-bare.

### Assumptions

- The bare-handle format is assumed to reproduce identically for the `20.500.11766` and `20.500.12348` prefixes by construction (same regex family, same MQAP passthrough) — not independently reproduced against a live MELSpace/WorldFish item (`KPH-OQ-1`).
- The external MQAP service resolves `https://cgspace.cgiar.org/handle/<prefix>/<digits>` and `https://hdl.handle.net/<prefix>/<digits>` correctly — already proven by the bug report's own second Sync attempt and by the pre-existing accepted regex forms.

## 10. Open Questions

- **`KPH-OQ-1`** Should this spec also get a live QA pass on a real MELSpace and/or WorldFish bare handle before shipping, given only the CGSpace case was independently reproduced? Recommendation: yes if a MELSpace/WorldFish test item is readily available on QA; otherwise ship on the strength of the shared regex/normalization logic and log a follow-up.

## 11. Out-of-Band Notes

De-duplicating `result-creator.component.ts` and `aow-hlo-create-modal.component.ts` onto the shared `kp-handle.validator.ts` remains a deferred architectural decision (see `KPH-DD-1` in `design.md`) — tracked as a follow-up, not part of this bugfix.

---

## Required cross-references

- `docs/prd.md` — `US-S2`.
- `docs/ux-ui/design.md` — §8 PRMS Form UX Pattern, `RFUX-R-5` (persistent inline helper copy; unchanged by this fix, cited for the unsupported-handle message's continued visibility).
- `docs/trd/trd.md` — MQAP integration (`api/m-qap/`), CGSpace dependency.
- `docs/specs/bugfix/kp-bare-handle-format/proposal.md` — Bug Diagnosis (confirmed root cause).
- `onecgiar-pr-client/src/app/pages/result-framework-reporting/shared/report-result/CLAUDE.md` — documents the deliberate non-migration of `aow-hlo-create-modal.component.ts` onto the shared validator (informs `KPH-DD-1`).
