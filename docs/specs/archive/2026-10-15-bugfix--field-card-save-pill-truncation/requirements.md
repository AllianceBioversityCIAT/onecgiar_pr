# Module Spec — `bilateral/field-card-save-pill-truncation` — `requirements.md`

## 1. Module / Feature

- **Module:** `bilateral`
- **Sub-feature:** `field-card-save-pill-truncation` (Policy Change type-specific grid)
- **Owner:** Bilateral QA (Ángel) via Maria Camila Giraldo
- **Status:** `draft`
- **Ticket(s):** `P2-3962`

## 2. Context

Follow-up to `bugfix/bilateral-save-draft-footer`. That spec's `BSF-T-1` set out to fix a reported "Save Changes button not fully displayed" in Bilateral. Two full Cypress-verified Implementer attempts found no clipping on the footer button at any width — the Premise Ledger had cited the wrong component. The user then supplied screenshots showing the *actual* symptom: on the Policy Change section's Policy type / USD amount / Status row, each field's `app-field-card` save-state pill renders as a bare icon dot with no "Unsaved changes" text, and Policy type's REQUIRED badge likewise loses its text — instead of the full pill/badge the same fields show elsewhere in the app.

Root cause (confirmed by direct read, not inference): this session's own `bugfix/policy-change-usd-amount-position` (`PCP-T-1`) grouped Policy type, USD amount, and Status into one CSS grid row (`type-policy-change.component.html:47`, `grid-cols-[repeat(auto-fit,minmax(190px,1fr))]`). `app-field-card`'s header (`field-card.scss:67-182`) already has a graceful-degradation mechanism for narrow columns — at `≤380px` it hides the save pill's text, at `≤240px` it also hides the REQUIRED badge's text (`field-card.scss:364-392`, dated 15-sep-2026, predates this session). `minmax(190px,1fr)` floors every column in this specific row below both thresholds, so the "last resort" degraded state is now the row's everyday appearance, not a rare edge case.

The user wants the grouping from `PCP-T-1` **kept** (not reverted) while the pill/badge stay legible.

Relates to `docs/ux-ui/design.md` (field-card chrome, §8 components) and `onecgiar-pr-client/src/app/pages/bilateral/components/section-type-specific/type-policy-change/CLAUDE.md`.

## 3. In Scope / Out of Scope

### In scope

- The Policy Change type-specific grid only (`type-policy-change.component.html:47`) — the grouping `PCP-T-1` introduced for Policy type / USD amount / Status.
- A minimum column width for that grid wide enough that neither of `app-field-card`'s existing narrow-container collapse rules ever fires, at ANY content width or resulting column count — not a value sampled at a couple of widths (see `FCT-R-1`'s amendment, Pivot + correction 2026-10-15). Column count varies naturally with content width as a consequence (1/2/3), rather than being capped.

### Out of scope

- The 14 other call sites in the app sharing the same `grid-cols-[repeat(auto-fit,minmax(190px,1fr))]` utility string (IPSR, rd-partners, knowledge-product-info, etc.) — unrelated grids, no evidence they exhibit this symptom, and changing them is a much larger blast radius than this ticket's report.
- Redesigning `app-field-card`'s shared header chrome (`field-card.scss`) — the existing 380px/240px collapse thresholds are a deliberate, working mechanism for genuinely narrow fields elsewhere; this spec does not change them.
- Reverting `PCP-T-1`'s field grouping — the user explicitly wants it kept.
- The separately-documented "Unsaved changes doesn't clear after save" gap (`triggerManualSave()` never bumps `SaveButtonService.savedTick`) — a distinct, already-documented architectural gap, not re-confirmed in scope here.

## 4. Personas Affected

| Persona | What changes for them |
|---|---|
| Result submitter (Bilateral) | Sees legible "Unsaved changes"/"Saved" text and a legible "REQUIRED" badge on Policy type, USD amount, and Status at normal viewport widths, instead of a bare icon dot. |

## 5. User Stories

- **`FCT-US-1`** — As a Bilateral result submitter, I want the save-state pill and REQUIRED badge on Policy type / USD amount / Status to show their text at the widths I normally view the form, so that I can tell whether my change was saved without having to guess from an icon alone.

## 6. Functional Requirements

### Required (MUST)

- **`FCT-R-1`** The Policy Change type-specific grid (Policy type, USD amount, Status) MUST render each field's column wide enough, **at every content width ≥390px and every resulting column count**, that `app-field-card`'s `≤380px` and `≤240px` narrow-container collapse rules never fire for any of the three fields. **Amended (Pivot, 2026-10-15; corrected twice after Reviewer FAILs):** a value picked by sampling only 2 widths (`360px`) left squeeze zones where a column still shrank to exactly the floor, below 380px; a bare `390px` floor fixed that but forced horizontal overflow below 390px (second FAIL). Final value: `minmax(min(390px,100%),1fr)` — collapse-free at every width ≥390px (CSS Grid's `auto-fit`/`minmax(F,1fr)` guarantees every column is `≥ F`), and never overflows below 390px (the `min(...,100%)` guard shrinks the floor to the container). Column count at ≥390px content varies naturally — 1 column from 390-799px, 2 from 800-1209px (Policy type + USD amount row 1, Status row 2), **3 from 1210px up** (the original `PCP-T-1` grouping, preserved at sufficiently wide content, not permanently given up).
- **`FCT-R-2`** Below 390px of content width, the grid MUST shrink its single column to fit (no horizontal overflow or clipping) and let `app-field-card`'s own 380px/240px collapse rules degrade the pill/badge text as the last resort, same as everywhere else in the app this component is used. This requirement is new (added after the second Reviewer FAIL, attempt 3) — the original framing ("wrap to fewer columns") did not anticipate that a bare fixed floor cannot itself shrink below its own minimum.
- **`FCT-R-3`** The fix MUST NOT change `app-field-card`'s shared SCSS (`field-card.scss`) or any other call site of the shared grid utility class string. Unchanged.

## 7. Non-Functional Requirements

| Dimension | Target |
|---|---|
| **Accessibility** | The REQUIRED badge's `sr-only` asterisk equivalent and the pill's icon `title` attribute (already present) continue to carry the same information when text is visible — no regression. |
| **Responsive** | Narrow-viewport behavior (phones, narrow sidebars) MUST still degrade gracefully — column count varies 1/2/3 with content width ≥390px (`FCT-R-1`), and below 390px the single column itself MUST shrink to fit (no overflow), per `FCT-R-2`. |

## 8. Acceptance Criteria

| ID | Given | When | Then |
|---|---|---|---|
| `FCT-AC-1` | The Policy Change section open at any of: a 1-column width (~600-760px), a 2-column width (~1150px), or a wide width (≥1210px, 3 columns) | The grid renders at its natural column count for that width | At every one of those widths, each visible field's save-state pill shows its text (not icon-only) and Policy type's REQUIRED badge shows its text — no squeeze zone collapses it. |
| `FCT-AC-2` | The section at a width below 390px (e.g. a phone viewport) | The row renders | The grid's single column shrinks to fit the container (no horizontal overflow/clipping); `app-field-card`'s own collapse rules may now legitimately degrade the pill/badge text, same as any other genuinely narrow field in the app. |
| `FCT-AC-3` | `field-card.scss` and the other 14 call sites of the shared grid utility | A diff review | No changes outside `type-policy-change.component.html`'s one grid line (and its test). |

Cross-cutting project ACs that already apply (not restated): `AC-3` Authorization (n/a — no auth surface touched).

## 9. Dependencies & Assumptions

### Upstream dependencies

- `app-field-card` (`src/app/custom-fields/`) and its shared `field-card.scss` — read-only dependency, not modified.
- `PCP-T-1`'s grouping (`docs/specs/archive/2026-10-15-bugfix--policy-change-usd-amount-position/`) — the behavior this spec preserves while fixing its side effect.

### Assumptions

- ~~The Bilateral form's content column at typical desktop/laptop widths is wide enough to fit three columns at a raised `minmax()` floor without forcing a cramped layout~~ — **refuted by measurement, then resolved** (Pivot 2026-10-15, corrected same day): a fixed 3-column row cannot clear 380px below ~1180px content width at any single sampled value, but a width-independent floor (`F > 380px`) restores 3 columns at ≥1210px while staying collapse-free at every other width too — see `FCT-R-1`.

## 10. Open Questions

- ~~`FCT-OQ-1`~~ — **Resolved** (Pivot 2026-10-15, corrected twice same day after two Reviewer FAILs): the final value is `minmax(min(390px,100%),1fr)` — any `F>380px` is collapse-free at every content width ≥390px by the `auto-fit` column-width guarantee (`design.md` P-6, no sampling needed), and the `min(...,100%)` guard prevents the bare-floor overflow a first correction (`minmax(390px,1fr)`) introduced below 390px.

## Required cross-references

- `docs/ux-ui/design.md` (field-card / component chrome, §8).
- `onecgiar-pr-client/src/app/pages/bilateral/components/section-type-specific/type-policy-change/CLAUDE.md`.
- `docs/specs/archive/2026-10-15-bugfix--policy-change-usd-amount-position/` (the spec this one follows up on).
