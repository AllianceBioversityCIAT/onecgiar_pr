# Module Spec — `bilateral-save-draft-footer` — `requirements.md`

> QA follow-up on `P2-3962` (Bilateral results testing round). Depth: **Lite**. Mode: **Bug**.

---

## 1. Module / Feature

- **Module:** `bilateral` (result editor footer + autosave service)
- **Sub-feature:** `bilateral-save-draft-footer`
- **Owner:** — (not specified)
- **Status:** draft
- **Ticket(s):** `P2-3962`
- **Type:** Bug (Bug Mode)

---

## 2. Context

QA reported, while testing Bilateral results: *"The Save Changes button is not fully displayed in the Bilateral section. After clicking Save Changes, the system displays a message indicating that the changes have not been saved. This behavior creates confusion about whether the information was successfully saved."*

The control QA calls "Save Changes" is the editor footer's **"Save draft"** button (`data-testid="bilateral-footer-save"`, `bilateral-result-creator.component.html:409-417`) — there is no other "Save Changes"-labelled control in this flow.

Investigation (via scout + direct read, this session) found **two independent root causes** behind this one user-facing report:

1. **Button clipping (CSS).** The footer's right-hand capsule (`.bcr-editor-footer__group--end`, holding the "N fields missing"/"Draft up to date" state AND the Save draft button together) has no `flex-wrap`, no `min-width: 0`, and no `max-width` of its own — unlike the outer `.bcr-editor-footer` row, which already wraps (fixed 2026-10-08, `quick/footer-capsules-align`, per `bilateral-result-creator/CLAUDE.md`). When the combined content of that one capsule is wider than the available column width (documented to happen around 1024px window width / ~720px column), the capsule overflows past its container's right edge. The ancestor chain (`:host.bcr-host--editor`, `.bcr-layout`) is `overflow: hidden`, so the overflow is clipped — the Save draft button, being the last child, gets visually cut off. The 2026-10-08 fix solved cross-capsule wrapping but never added a per-group escape hatch for when one capsule alone is too wide.
2. **False "Save failed" message (state/async).** `BilateralAutoSaveService` marks a field `'error'` on a failed PATCH and never clears that marker except by a later *successful* save of that *exact same field* (`bilateral-auto-save.service.ts:520-525`, `:526-544`). `hasErrorFor(section)` (`:302-326`) scans *every field ever tracked* for the section's endpoints, not just the fields in the flush currently being waited on. `waitForSectionSave` (`bilateral-result-creator.component.ts:1315-1324`) exits its poll loop immediately — zero iterations — the instant `hasErrorFor` is already `true` *before the loop starts*, and `triggerManualSave` (`:1233-1266`) then shows "Save failed" right after. Net effect: if any field in a section ever failed once, and the user never happens to re-edit that exact field again, **every subsequent Save draft click for that section reports "Save failed"** — even while the fields the user *did* just change are mid-flight on their own request that will succeed moments later.

These are genuinely independent bugs (one CSS, one service-state) that happen to live behind the same button, which is why QA described them as one issue.

Relates to `docs/prd.md` **US-S5** ("autosave / explicit save with clear error messages so that I never lose entered work to a network error") and **AC-2** (submission workflow correctness). Touches `docs/ux-ui/design.md` §6 (layout patterns, sticky action bar) and §1 ("No surprises at submission").

---

## 3. In Scope / Out of Scope

### In scope

- Fix the footer's Save draft button so it remains fully visible at the column widths where the right-hand capsule's content is wide (~720px column and narrower, where it currently clips).
- Fix the save-failure determination so a field's *stale* `'error'` status (from an earlier, unrelated, now-abandoned flush) does not cause a later, independent, successful save to be misreported as "Save failed".
- Regression tests for both (Bug Mode mandatory): one proving the layout fix, one proving the false-failure fix.

### Out of scope

- The underlying fact that a once-failed field's data is never automatically retried unless the user re-edits it (a real limitation, but not what QA reported here — QA's report is about the *false negative on an unrelated, successful* save, not about the original failed field's data being lost). Flagged as an open question below.
- Any other footer control (Back/Next/"Section X of Y") — unaffected, not reported.
- Any change to the PATCH endpoints, DTOs, or server-side validation.

---

## 4. Personas Affected

| Persona | What changes for them |
|---|---|
| Result submitter (Bilateral) | Can always see and click the Save draft button, regardless of column width; gets an accurate "Save failed" only when the fields they just tried to save actually failed. |

---

## 5. User Stories

Refines `US-S5`.

- **`BSF-US-1`** — As a Bilateral result submitter on a narrower screen/column, I want the Save draft button to always be fully visible, so I can reliably save my work.
- **`BSF-US-2`** — As a Bilateral result submitter, I want the "Save failed" message to only appear when my current edit actually failed, so an old, unrelated error doesn't make me think my current work wasn't saved.

---

## 6. Functional Requirements

### Required (MUST)

- **`BSF-R-1`** The footer's right-hand capsule (state text + Save draft button) MUST remain fully visible (not clipped) at any column width down to the narrowest width this component already supports (per the existing 2026-10-08 fix's documented breakpoint, ~720px column / 820px window).
- **`BSF-R-2`** When the submitter clicks Save draft, the system MUST report failure only when a field included in *that* flush actually failed; a stale `'error'` status on a field not part of the current flush MUST NOT cause the current save to be reported as failed.
- **`BSF-R-3`** The existing behavior that DOES need to stay correct MUST be preserved: a field that genuinely fails in the *current* flush still reports "Save failed" with the server's reason (`lastErrorMessageFor`), and `waitForSectionSave` still exits promptly (not the full 15s timeout) when that happens.

---

## 7. Non-Functional Requirements

| Dimension | Target |
|---|---|
| **Accessibility** | No regression to keyboard reachability of the Save draft button; CSS fix must not remove it from the tab order or hide it at any viewport. |
| **Backwards compatibility** | No API/DTO change. `BSF-R-2`'s fix changes only which status reads are consulted for the pass/fail determination — not the PATCH payloads or the per-field status storage model consumers outside this flow might read. |
| **Testability** | Each defect gets a regression test that fails before the fix and passes after (Bug Mode). |

---

## 8. Acceptance Criteria

| ID | Given | When | Then |
|---|---|---|---|
| `BSF-AC-1` | A Bilateral result editor at a column width where the right-hand footer capsule's content exceeds available space (~720px column) | The section renders | The Save draft button remains fully visible (not clipped by the `overflow: hidden` ancestor). |
| `BSF-AC-2` | A section where field A previously failed to save (status `'error'`) and was never re-edited | The submitter edits a different field B and clicks Save draft | The save succeeds and the UI reports success (or the appropriate "still missing" state) — NOT "Save failed" — because B's own flush succeeded and A was not part of it. |
| `BSF-AC-3` | A section where the field(s) in the *current* flush genuinely fail (e.g. a 400 from the server) | The submitter clicks Save draft | The UI reports "Save failed" with the server's reason, promptly (not after the 15s timeout). |

## 8a. Defect Classes & Verification Gates

| Defect class | Gate |
|---|---|
| **Layout/geometry** (button clipped) | A rendered measurement in a real browser/component-test harness (jsdom cannot measure clipping/overflow) per the rendered-measurement checklist — bounding-rect comparison against the clipping ancestor, not class presence. Where unavailable, a human check at a named column width. |
| **Stale-state/async** (false failure message) | Jest test exercising the real `BilateralAutoSaveService` (not mocked, per the existing test-coverage gap) across two sequential flushes — one that fails (field A), one that succeeds (field B) — asserting the second is NOT reported as failed. Automated, deterministic. |

No defect class in this spec is left as an unacknowledged blind spot.

---

## 9. Dependencies & Assumptions

### Upstream dependencies

None new — same `BilateralAutoSaveService`, same footer component, same `app-alert-fe` toast mechanism already in place.

### Downstream consumers

- `bilateral-auto-save.service.spec.ts:57-67` ("retains failed section state for a retry") — tests same-field retry; must keep passing, extended (not replaced) with the cross-field scenario.
- `bilateral-result-creator.component.spec.ts` — currently mocks `hasErrorFor`/`lastErrorMessageFor` everywhere (e.g. lines ~185-186, 926-930, 2062-2063); these existing mocked tests are unaffected by a service-internal scoping fix, but the new regression test for `BSF-R-2` must exercise the real service, not a mock of it (per the defect-class gate above).

### Assumptions

- No other code path reads a field's `'error'` status besides `hasErrorFor`/`lastErrorMessageFor` (confirmed by this session's scout — a repo-wide search found no other consumer). If false, the fix in `design.md` needs re-scoping — flagged as a Premise Ledger row, not assumed silently.

---

## 10. Open Questions

- **`BSF-OQ-1`** Should a field that failed and was never re-edited eventually surface to the user as "this field still isn't saved," somewhere other than falsely blocking an unrelated later save? Flagged for a possible follow-up ticket — not required to fix the two defects QA actually reported.

---

## Required cross-references

- `docs/prd.md` (`US-S5`, `AC-2`).
- `docs/ux-ui/design.md` (§1, §6).
- `onecgiar-pr-client/src/app/pages/bilateral/pages/bilateral-result-creator/CLAUDE.md`.
