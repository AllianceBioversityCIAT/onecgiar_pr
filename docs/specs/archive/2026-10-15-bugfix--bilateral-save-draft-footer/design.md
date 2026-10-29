# Module Spec — `bilateral-save-draft-footer` — `design.md`

---

## 1. Summary

Two independent client-only fixes, no server/API changes:

1. **CSS:** give the footer's right-hand capsule (`.bcr-editor-footer__group--end`) its own ability to not overflow its container — a `min-width: 0` + either an internal wrap or shrink rule — so its content (state text + Save draft button) never gets clipped by the `overflow: hidden` ancestor chain.
2. **Service/state:** scope the save-failure determination (`waitForSectionSave` / `triggerManualSave`'s `hasErrorFor` check) to the fields actually included in the flush just dispatched, instead of scanning every field ever tracked for the section's endpoints — so a stale `'error'` from an earlier, unrelated, abandoned attempt can't misreport a later, independent, successful save as failed.

Links: `requirements.md` (same folder); `onecgiar-pr-client/src/app/pages/bilateral/pages/bilateral-result-creator/CLAUDE.md` (already documents the 2026-10-08 cross-capsule wrap fix and the existing `hasErrorFor` short-circuit rationale this design must preserve).

---

## 1A. Premise Ledger

**Count:** 7 rows — 7 verified, 0 `UNVERIFIED`.
**Blast-radius triggers:** `consumer` fires (the error-status scoping change is read by existing tests, some of which mock the exact methods being changed). `live-path` fires (Save draft click is the user action driving both bugs). `shared-state` does not fire — `fieldStatus`/`_pendingFields` are owned by one service instance per editor session (`providers:` on the component, per the folder's own `CLAUDE.md`: "se proveen por componente... así que cada visita arranca limpia"), not shared across sibling components.

| # | Claim | Class | Citation (as run) | Verified at | If false |
|---|---|---|---|---|---|
| P-1 | The footer's Save draft button is `data-testid="bilateral-footer-save"`, the only "Save"-labelled control in this flow | `location` | `bilateral-result-creator.component.html:409-417`, confirmed by scout read | `52d4b1ad5` | `BSF-R-1`'s target control is wrong |
| P-2 | `.bcr-editor-footer` wraps its two capsules via `flex-wrap: wrap` (fixed 2026-10-08), but `.bcr-editor-footer__group` (either capsule) has no `flex-wrap`, no `min-width: 0`, no `max-width` of its own | `location` | `bilateral-result-creator.component.scss:249-273`, quoted by scout; confirmed against the folder's own `CLAUDE.md` note on the 2026-10-08 `quick/footer-capsules-align` fix | `52d4b1ad5` | `BSF-DD-1`'s fix site is wrong |
| P-3 | The clipping ancestor chain is `:host.bcr-host--editor { overflow: hidden }` and `.bcr-layout { overflow: hidden }` | `location` | `bilateral-result-creator.component.scss:19-25, 27-34`, quoted by scout | `52d4b1ad5` | The button isn't actually being clipped by overflow; re-diagnose the display defect |
| P-4 | `triggerManualSave()` calls `flush(getEndpointKeys(activeSection))`, then `waitForSectionSave(activeSection)`, then checks `hasErrorFor(activeSection)` — all **section-scoped**, not scoped to the specific fields just flushed | `location` | `bilateral-result-creator.component.ts:1233-1266, 1315-1324`, confirmed by direct read this session (not just the scout) | `52d4b1ad5` | `BSF-DD-2`'s target call sites are wrong |
| P-5 | `hasErrorFor(section)` scans every field whose mapped endpoint is in the section's endpoint-key set, with no distinction for "is this field part of the flush currently in flight" | `location` | `bilateral-auto-save.service.ts:302-326`, quoted by scout (`keys = new Set(this.getEndpointKeys(section)); ... status === 'error' && ... keys.has(endpoint)`) | `52d4b1ad5` | The false-failure mechanism is different; re-diagnose |
| P-6 | A field's `'error'` status is set on flush failure and is never reset to `'idle'` except by a later successful save of that exact field — `flush()` removes a field from `_pendingFields` on dispatch regardless of outcome, so a failed-and-not-re-edited field has no pending data left to retry and its `'error'` status persists indefinitely | `other` | `bilateral-auto-save.service.ts:243-282` (flush removes on dispatch), `:483-495` (sets `'error'` on failure), `:520-525` (`setFieldStatuses`, no auto-reset path), `:526-544` (`markFieldsSavedThenIdle` only reached on a subsequent success) — all quoted/confirmed by scout | `52d4b1ad5` | The staleness mechanism is different; the fix's "scope to current flush's fields" approach would need rethinking |
| P-7 (consumer) | `bilateral-auto-save.service.spec.ts:57-67` tests same-field retry-after-failure only; `bilateral-result-creator.component.spec.ts` mocks `hasErrorFor`/`lastErrorMessageFor` everywhere (confirmed call sites ~185-186, 926-930, 2062-2063), so no existing test exercises the real cross-field staleness this spec fixes | `consumer` | Quoted/confirmed by scout via direct file read of both spec files | `52d4b1ad5` | `BSF-R-2`'s regression test (per requirements §8a) would be redundant with existing coverage — it is not; proceed as planned |

**Assumed, not independently re-verified this session:** no other code path reads per-field `'error'` status besides `hasErrorFor`/`lastErrorMessageFor` (scout ran a repo-wide search and found none) — carried as the assumption in `requirements.md` §9, not restated as a ledger row since the dependence test is already satisfied by P-5/P-6's citations; a repeat grep at task time (per the Falsifiability block's negative-existence rule) is still required before the fix ships, named in `tasks.md`.

---

## 2. Architecture Overview

### 2.1 Where this lives in the system

- **Client modules touched:** `onecgiar-pr-client/src/app/pages/bilateral/pages/bilateral-result-creator/` (component + its scss), `onecgiar-pr-client/src/app/pages/bilateral/services/bilateral-auto-save.service.ts`.
- **Server modules touched:** none.

### 2.2 Sequence / interaction

No new interaction for the CSS fix. For the state fix: `triggerManualSave()` must capture which fields are actually part of the dispatched flush (read before `flush()` empties `_pendingFields`, mirroring the existing `hadChanges` capture at `component.ts:1239` — "Read before flushing: flush() empties the staged fields"), then use that captured set to scope the post-flush failure check instead of the section-wide `hasErrorFor(section)`.

---

## 2.3 Reversion Challenge (Step 2.3)

**Trigger:** `BSF-DD-2` changes the scope of an already-delivered correctness mechanism — the `hasErrorFor` short-circuit in `waitForSectionSave`, whose own code comment explains it exists specifically to avoid a 15-second hang on a real error (`component.ts:1309-1313`: *"without the `hasErrorFor` exit a 400 kept the button on 'Saving…' for the whole 15s timeout before the failure was reported"*). Narrowing its scope is a reversion of the *section-wide* version of that check.

**Challenge — "what does narrowing this break?"**

- The 15s-hang protection itself is preserved: a field that genuinely fails *as part of the current flush* is, by construction, included in the scoped field set this design checks — so the prompt-exit behavior for a real, current error is unaffected (`BSF-R-3`).
- What changes is only the case the protection was never meant to cover: a field with **no pending data** (already dispatched, long settled, failed or not) sitting outside the current flush. Re-checking it on every subsequent save was never a deliberate design choice recorded anywhere (no comment, no test, no `CLAUDE.md` note defends scanning old, unrelated fields) — it is the unexamined default of `hasErrorFor(section)` being section-wide rather than flush-wide.
- `BSF-OQ-1` (requirements.md) already names the one legitimate concern this narrowing raises — that a truly-abandoned failed field's badness becomes less visible after this fix, since it will no longer poison *every* later save with a "Save failed" banner. That's explicitly deferred as a follow-up (the field was already silently un-retried before this fix; this fix doesn't make that worse, it only stops it from being misreported as *today's* failure).

**Outcome:** no functional breakage identified beyond the already-flagged, already-deferred `BSF-OQ-1`. Proceed with `BSF-DD-2` as specified.

---

## 3-5. Data Model / API / Server Workflow

None. No entity, migration, endpoint, or DTO change.

---

## 6. Frontend Plan

### 6.2 Components & services

- **`bilateral-result-creator.component.scss`:** add a rule for `.bcr-editor-footer__group` (both capsules, or scoped to `--end` if the start capsule never has this content profile) establishing `min-width: 0` and either an internal `flex-wrap` or a `max-width`/`overflow` strategy so the state-text + button pairing shrinks or wraps internally rather than overflowing the capsule's own box. Must not reintroduce the pre-2026-10-08 fixed-threshold bug (no new hardcoded pixel breakpoint that forces a wrap when the content *would* actually fit) — reuse the same `@container` query already driving `.bcr-content`'s responsive behavior (per the folder's `CLAUDE.md`) rather than inventing a second one.
- **`bilateral-result-creator.component.ts`:** in `triggerManualSave()`, capture the set of fields actually included in this flush (read before `flush()` runs, same timing discipline as the existing `hadChanges` capture) and use that set — not the section-wide scan — when deciding whether to show "Save failed" and when exiting `waitForSectionSave`'s poll loop early.
- **`bilateral-auto-save.service.ts`:** expose whatever is needed for the component to read "the fields this flush covers" (e.g. the pending-field list for a section, read at the moment just before `flush()` drains it) and/or a field-scoped error check, alongside the existing section-scoped `hasErrorFor`/`lastErrorMessageFor` (which other call sites may still rely on — do not remove them, add the narrower alternative).

### 6.3 Design system usage

No new tokens or components. CSS fix reuses the existing `@container` responsive mechanism already in this file.

---

## 7-9. Security / Performance / Observability

None affected.

---

## 10. Testing Plan

- **CSS:** a rendered measurement (real browser / Cypress) at the documented clipping column width (~720px), asserting the Save draft button's bounding rect is fully contained within its clipping ancestor — not a class-presence check.
- **Service/state:** a Jest test against the real `BilateralAutoSaveService` (not mocked) reproducing: field A's flush fails → field B (different field, same section) is edited and flushed → assert B's flush is NOT reported as failed. Extend, don't replace, `bilateral-auto-save.service.spec.ts:57-67`'s same-field-retry test.
- Re-run `bilateral-result-creator.component.spec.ts`'s existing mocked tests to confirm the component-level call-site change doesn't break them (the mocks target the same methods being touched).

---

## 11. Backwards Compatibility

None affected — no API, no payload, no migration. The per-field status storage model is unchanged; only which subset of it gates the "Save failed" decision changes.

---

## 12. Design Decisions

### `BSF-DD-1` — Give the footer's end capsule its own min-width/wrap rule

- **Context:** the 2026-10-08 fix made the outer footer row wrap when its two capsules don't fit together, but left each capsule's own internal content free to overflow once the capsule itself is the thing that's too wide.
- **Decision:** add `min-width: 0` plus an internal wrap/shrink rule to `.bcr-editor-footer__group`, reusing the existing `@container` breakpoint already driving this file's responsive behavior.
- **Alternatives considered:** truncate the state text with an ellipsis instead of wrapping. Rejected — the state text ("N fields missing", listing which ones) is informational content the submitter needs to read in full; truncating it would trade one UX bug for another.
- **Consequences:** none beyond the visual fix.

### `BSF-DD-2` — Scope the save-failure check to the current flush's fields

- **Context:** see §2.3 Reversion Challenge above for the full reasoning.
- **Decision:** capture the fields actually included in a flush before dispatching it, and use that set (not the section-wide field-status scan) to decide whether `triggerManualSave` reports "Save failed" and whether `waitForSectionSave` exits its poll loop early.
- **Alternatives considered:** (1) reset a field's `'error'` status to `'idle'` immediately once it has no pending data left (i.e., right after `flush()` drains it on failure) — functionally similar but mutates stored historical state that some other, not-yet-identified consumer might read; rejected as more invasive than necessary for this specific bug. (2) Auto-retry a failed field's last-known value indefinitely until it succeeds — rejected, out of scope (`BSF-OQ-1`), and a bigger behavior change than this bug report asks for.
- **Consequences:** `BSF-OQ-1` (requirements.md) — a field that fails and is never re-edited no longer surfaces *at all* once the user saves other fields successfully. Deferred as an accepted, explicitly-flagged follow-up.

---

## Budget (Step 2.4)

- **Expected tasks:** 2 (one per root cause, matching the existing successful pattern from `bugfix/policy-change-usd-amount-layout`).
- **Expected LOC:** ~40-80 (a focused SCSS rule for BSF-T-1 + its test; a scoped-check addition plus call-site changes for BSF-T-2 + its test, which needs more care given the state/async nature).
- **Expected review rounds:** 2 per task (`full` for BSF-T-2 given it touches an existing correctness mechanism per the override table in `/akili-execute` Step 2.3 override (d) — reverts/narrows already-delivered behavior; `checklist` for BSF-T-1, pure CSS).

---

## Required cross-references

- `docs/specs/bugfix/bilateral-save-draft-footer/requirements.md` (same folder).
- `docs/prd.md`, `docs/ux-ui/design.md`, `docs/trd/trd.md`.
- `onecgiar-pr-client/src/app/pages/bilateral/pages/bilateral-result-creator/CLAUDE.md`.
