# Design — Decouple Lead Center From The External-Partner Toggle

Implements `docs/specs/changes/lead-center-decouple/requirements.md` (`LCD-R-*`, `LCD-AC-*`).

## 1. Summary

- Frontend-only change to `rd-contributors-and-partners` (P25). Lead Center becomes an
  always-rendered, always-required field relocated under Contributing CGIAR Centers; Lead Partner
  keeps its current position/toggle. Every place the two fields currently gate/clear/zero each
  other loses that coupling.
- Shape: template reorder + `[required]` flip, one save-method rewrite, one service-method
  simplification, two auto-assign guards removed, one message split.
- Biggest trade-off accepted: no backend/DTO change and no data migration — existing results saved
  under the old exclusive model will read as "missing Lead Center" until next edit, by design
  (confirmed with requester, no backfill in scope).

---

## 2. Architecture Overview

### 2.1 Where this lives in the system

- **Server modules touched:** none.
- **Client modules touched:**
  - `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-contributors-and-partners/rd-contributors-and-partners.component.html`
  - `.../rd-contributors-and-partners.component.ts`
  - `.../rd-contributors-and-partners.service.ts`
- **External integrations touched:** none. `possibleLeadCenters`/`possibleLeadPartners` sourcing
  (CLARISA centers/institutions catalogs) is unchanged.

### 2.2 Interaction (unchanged transport, changed coupling)

```
[Contributors and Partners form]
  ├── Lead Center <app-pr-select> (relocated, always rendered, required)
  │     (ngModel) leadCenterCode ──> onLeadCenterSelected(code)   [unchanged mechanics, LC-DD-5]
  │
  ├── "Led by external partner?" <app-pr-yes-or-not>
  │     (selectOptionEvent) ──> onLeadByPartnerChange(isPartnerLed)
  │                                 ├── BEFORE: clears leadCenterCode when isPartnerLed=true
  │                                 └── AFTER:  clears nothing — is_lead_by_partner only
  │                                             gates the Lead Partner dropdown itself
  │
  └── Lead Partner <app-pr-select> (unchanged position, *ngIf="is_lead_by_partner")
        (ngModel) leadPartnerId

onSaveSection()
  BEFORE: if (is_lead_by_partner) { stamp partners, zero all centers }
          else                    { stamp centers,  zero all partners/mqap }
  AFTER:  stamp centers from leadCenterCode — unconditionally
          stamp partners/mqap from leadPartnerId — only when is_lead_by_partner, else zero
          (the two blocks no longer share a branch)
```

---

## 3. Data Model Changes

N/A — no entity, column, or migration change. `contributing_center[].is_leading_result` and
`institutions[]`/`mqap_institutions[].is_leading_result` are existing fields; this design changes
which combinations the frontend is willing to send, not the shape.

---

## 4. API Surface

N/A — no endpoint or DTO change. **Assumption to verify before implementation** (carried from
`requirements.md` §9): the server-side `PATCH` DTO validation for this section must not itself
reject a payload where a center row and a partner row both carry `is_leading_result: true` — a
quick grep of the corresponding server DTO/validator (not a design decision, a verification step)
belongs in Task 1 below. If the server does reject it, that is a scope-changing discovery and the
Leader escalates rather than working around it silently.

---

## 5. Server Workflow / Business Rules

N/A — no server workflow touched.

---

## 6. Frontend Plan

### 6.1 Routes / modules

No route change. Same module: `pages/results/pages/result-detail/pages/rd-contributors-and-partners/`.

### 6.2 Components & services

**Template (`rd-contributors-and-partners.component.html`):**

- Move the Lead Center `app-pr-select` block (currently inside `<ng-template #selectLeadCenter>`,
  `:452-467`) to immediately after `<!-- Contributing Centers end -->` (`:421`), before the
  P2-3171 external-partners note (`:423-426`).
- Delete the `*ngIf="is_lead_by_partner"; else selectLeadCenter"` wrapper and the now-unused
  `#selectLeadCenter` template — both fields render unconditionally in their own place.
- Lead Center `[required]` changes from `"!this.rdPartnersSE.partnersBody.is_lead_by_partner"` to
  a literal `"true"`.
- Two separate `app-alert-status` calls replace the single shared one: one above Lead Center
  bound to a new `getMessageLeadCenter()`, one above Lead Partner bound to a new
  `getMessageLeadPartner()` (kept where the current combined alert sits, `:439`).
- **`data-testid` hooks — corrected 2026-08-31.** The original text here claimed
  "`data-testid="cp-field-…"` hooks on both selects are preserved as-is (same payload paths,
  `save-contract.cy.ts` keeps working unmodified)". **That was false:** neither lead select has ever
  carried a `data-testid` (the nearest, `cp-field-is_lead_by_partner`, is on the
  `app-pr-yes-or-not` toggle). Nothing is preserved because nothing was there.
  Because `save-contract.cy.ts` **discovers** fields by DOM prefix (`discover($body, 'cp-field-')`
  at `:554`, `[data-testid^=…]` at `:107`) and **skips** whatever it cannot find (`:421`, `:468`),
  a hookless control yields no failure *and no coverage* — `LCD-AC-2`'s Cypress assertion would
  pass while never seeing Lead Center. So the hooks must be **added**, not preserved:

  | Select | Hook to add | Why the `~` suffix |
  |---|---|---|
  | Lead Center | `data-testid="cp-field-contributing_center~lead"` | `contributing_center` is already claimed by `cp-field-contributing_center` (`:105`) and `cp-field-contributing_center~flat` (`:129`); a bare re-use collides |
  | Lead Partner | `data-testid="cp-field-institutions~lead"` | same payload key as the existing partner controls |

  The `~` convention for "two controls feeding the SAME payload key" is documented in this folder's
  `CLAUDE.md` (`:250-253`). Adding these is assigned to **`LCD-T-4`** (scope widened by user
  decision, 2026-08-31 — see `execution.md` → "Spec Inaccuracy 2" and "Scope Widening 1"), not to
  `LCD-T-2`, which had already landed when this was discovered.

**Component (`rd-contributors-and-partners.component.ts`):**

- `getMessageLead()` (`:610-613`) is replaced by two methods:
  - `getMessageLeadCenter()` → static text, no longer built from a ternary — see `LCD-DD-4`.
  - `getMessageLeadPartner()` → same text/shape as today's partner branch.
- `onSaveSection()` (`:496-520`) rewritten per `LCD-DD-3` below.

**Service (`rd-contributors-and-partners.service.ts`):**

- `onLeadByPartnerChange(isPartnerLed)` (`:670-680`): remove the `if (isPartnerLed) { leadCenterCode = null }`
  branch entirely — see `LCD-DD-2`. Keep clearing `leadPartnerId` when switching to `false`
  (unchanged — Lead Partner is still gated by the toggle, so hiding it should still clear it, same
  as today's `else` branch).
- `tryAutoAssignLeadCenter()` (`:687-700`): remove the `if (this.partnersBody.is_lead_by_partner) return;`
  guard — auto-assign now runs regardless of the toggle, since Lead Center is independent.
- `tryAutoAssignLeadPartner()` (`:702-714`): unchanged — still gated on `is_lead_by_partner`,
  because the Lead Partner field itself is still toggle-gated.
- `setLeadCenterOnLoad` / `setLeadPartnerOnLoad` / `onLeadCenterSelected` / `getContributingCentersUnion` /
  `isUnmappedOrFlat`: **unchanged** — none of them read or branch on `is_lead_by_partner` today, so
  none of the `LC-DD-*` auto-add mechanics need touching (`LCD-R-10`).

### 6.3 Design system usage

No new component, no new token, no new copy pattern beyond the two split alert strings (plain
hardcoded English, matching this file's existing precedent — `noScienceProgramsNote`,
`contributingScienceInfoNote` — no new `TermKey` needed since none of the sibling lead-field
strings use one either). No responsive or a11y change — same `app-pr-select` control, same
`app-alert-status` shell, just relocated in the DOM.

### 6.4 Real-time / notification UX

N/A.

---

## 7. Security & Authorization

N/A — no auth/role change. Existing `[readOnly]="this.api.rolesSE.readOnly"` on the Lead Center
select is preserved verbatim at its new location.

---

## 8. Performance & Capacity

N/A — no new HTTP calls, no new catalog fetch. Same `centersSE.centersList` / `institutionsSE`
sources, same `possibleLeadCenters`/`possibleLeadPartners` computation.

---

## 9. Observability

N/A — no new logging/telemetry surface.

---

## 10. Testing Plan (forward-looking)

- **Jest — component:** extend `rd-contributors-and-partners.component.spec.ts`'s `LC-T-2` describe
  (renders full component with the real service) to assert Lead Center is present and `required`
  regardless of `is_lead_by_partner`, and add a new describe covering `LCD-AC-2`/`LCD-AC-3`
  (`onSaveSection` stamping both flags true in one call; required-field scan blocking save with no
  Lead Center).
- **Jest — service:** extend `rd-contributors-and-partners.service.spec.ts` around
  `onLeadByPartnerChange` and `tryAutoAssignLeadCenter` to assert `leadCenterCode` survives a
  toggle flip to `true` and that auto-assign still fires when `is_lead_by_partner` is `true`
  (`LCD-AC-4`, `LCD-R-10`/`LC-DD-5` regression guard).
- **Cypress E2E:** re-run `contributors-and-partners.cy.ts`, `save-validation.cy.ts`,
  `save-contract.cy.ts` unmodified as regression; add one new assertion in `save-contract.cy.ts`
  for the combined-lead PATCH shape (`LCD-AC-2`).
- **Coverage:** this folder is excluded from the Jest coverage threshold (project convention,
  `package.json`) — the above suites are the actual gate, not a coverage percentage.
- **Copy check (`LCD-AC-5`):** no automated check judges wording quality — verified by human read
  at this design's HITL pause and again at PR review, recorded as an accepted manual gate (see
  `requirements.md` §8 defect-class table).

---

## 11. Backwards Compatibility & Migration Plan

- API contract: unchanged, additive-only in effect (no new fields; a previously-impossible flag
  combination becomes reachable).
- Data backfill: **not required, out of scope** — confirmed with the requester (2026-08-31).
  Existing results saved under the old exclusive model will surface as "Lead Center missing" on
  next edit; this is the intended tightening of `AC-6`'s contributing-center-lead invariant, not a
  regression to fix here.
- Feature flag: none — this ships directly, matching the Lite depth and the narrow blast radius
  (one P25-only component).

---

## 12. Design Decisions (ADRs)

### `LCD-DD-1` — Relocate Lead Center out of the toggle branch, don't extract a shared component

- **Context:** Lead Center and Lead Partner currently render as one `*ngIf/else` pair sharing an
  `app-pr-select` shape (label, options, optionLabel/Value, placeholder).
- **Decision:** Move the existing Lead Center block verbatim to its new position; do not extract a
  shared `<app-lead-entity-field>` (proposal.md Option B, rejected — only two call sites exist and
  they diverge in `required`-ness rules and options catalogs going forward, so a shared component
  buys nothing but indirection).
- **Alternatives considered:** (1) shared sub-component — rejected, premature abstraction for a
  2-instance case; (2) leave Lead Center inside the toggle branch and add a *third*, separate
  "Lead Center" field — rejected in `proposal.md` Option C, would create two competing concepts.
- **Consequences:** two near-identical `app-pr-select` blocks stay textually similar in the
  template; acceptable at this size, revisit if a third lead-entity field ever appears.

### `LCD-DD-2` — Remove the toggle's clear-on-switch for `leadCenterCode`

- **Context:** `onLeadByPartnerChange` (`service.ts:670-680`) today clears `leadCenterCode` when
  the user answers "Yes" (partner-led), and gates `tryAutoAssignLeadCenter` to never run when
  `is_lead_by_partner` is `true`. Both existed to enforce the old mutual exclusivity.
- **Decision:** Remove the `leadCenterCode = null` line from the `isPartnerLed` branch, and remove
  `tryAutoAssignLeadCenter`'s `if (is_lead_by_partner) return;` guard. `leadPartnerId`'s own
  clear-on-switch-to-`false` (the `else` branch) is **kept** — Lead Partner is still hidden when
  the toggle is `false`, so clearing it on hide is still correct and independent of this decision.
- **Step 2.3 reversion challenge:** *"What does removing the clear-on-switch and the auto-assign
  guard break?"* — Answer: nothing found. Both guards exist for exactly one reason each (enforce
  the old exclusivity), and that reason is what this spec removes by design (`LCD-R-4`, `LCD-R-6`).
  No other code path reads `leadCenterCode` conditioned on `is_lead_by_partner` being `false`
  (confirmed via the grep in requirements §9 — no downstream consumer assumes exclusivity). The
  only observable effect is the intended one: a previously-selected Lead Center now survives a
  toggle flip instead of silently vanishing, and auto-assign can now populate it regardless of the
  toggle's value.
- **Alternatives considered:** keep the clear-on-switch and instead re-populate `leadCenterCode`
  from `setLeadCenterOnLoad` after every toggle flip — rejected, adds a redundant round-trip for a
  value that was never invalid in the first place; the field was only ever cleared to satisfy the
  exclusivity rule this spec removes.
- **Consequences:** none identified beyond the intended behavior change.

### `LCD-DD-3` — Split `onSaveSection()`'s stamping logic into two independent blocks

- **Context:** `onSaveSection()` (`component.ts:496-520`) currently branches once on
  `is_lead_by_partner`: the `if` branch stamps partner leadership and force-zeros every center's
  `is_leading_result`; the `else` branch does the reverse.
- **Decision:** Replace the single `if/else` with two independent statements — center stamping
  runs unconditionally from `leadCenterCode`; partner/mqap stamping keeps its existing
  `is_lead_by_partner` gate (stamp from `leadPartnerId` when `true`, force `false` otherwise —
  unchanged from today's two branches, just no longer sharing an `if/else` with the center logic).
- **Step 2.3 reversion challenge:** *"What does removing the force-zero-the-other-side lines
  break?"* — Answer: nothing found. The force-zero lines exist solely to enforce the old
  exclusivity (`LCD-R-4`); no test or downstream reader asserts "at most one of center/partner is
  ever leading" (that invariant is exactly what this spec is asked to remove). `AC-6`
  ("at least one contributing center with `is_lead=true`") is *strengthened*, not weakened, by
  this change — the center side can no longer be force-zeroed away.
- **Alternatives considered:** keep one combined branch but add a special case for "both true" —
  rejected, more complex than two independent statements for the same net effect.
- **Consequences:** the `isCP2026`-specific center/institution payload construction later in the
  same method (`:539-560`) needs **no edit of its own** — but it is *not* independent of the
  rewritten branch, and the distinction matters for `LCD-T-3`:

  | Payload array | Line | Computes `is_leading_result` itself? | Therefore |
  |---|---|---|---|
  | `tocCenters` | `:540-542` | **No** — bare `{ ...c, from_toc: true }` spread | **Inherits** whatever the `:502-520` branch stamped, including the force-zero at `:509` |
  | `otherCenters` | `:543-547` | Yes (`:546`, from `leadCenterCode`) | Independent already |
  | `tocPartners` | `:552-554` | Yes (`:554`, from `isLeadByPartner && leadPartnerId`) | Independent already |
  | `otherPartners` | `:555-559` | Yes (`:558`, same expression) | Independent already |

  So removing the force-zero at `:509` is **load-bearing for ToC-origin centers specifically**:
  `tocCenters` is the only one of the four that reads its flag from the branch this decision
  rewrites. Under the old code, a ToC-origin center's `is_leading_result` was force-zeroed at
  `:509` whenever `is_lead_by_partner` was `true`, and the spread at `:540-542` carried that zero
  straight into the payload. After this decision the unconditional center stamping at the top of
  the method is what `tocCenters` inherits, which is precisely what makes `LCD-R-4` hold for a
  ToC-mapped P25 result.

  **Verification consequence:** `LCD-AC-2`'s test must cover a **ToC-origin** center (a
  `contributing_center` row reaching the payload through `tocCenters`), not only an `otherCenters`
  row — an `otherCenters`-only test would have passed even before this change and therefore proves
  nothing about `LCD-DD-3`.

  *(Corrected 2026-08-31 during `/akili-execute` — the original text asserted all of `:539-558`
  "already computes `is_leading_result` per-row … not from the removed branch", which is true for
  three of the four arrays and false for `tocCenters`. Surfaced by the `LCD-T-1` Reviewer, verified
  at source by the Leader, and recorded in `execution.md` → "Spec Correction 1". The decision
  itself is unchanged and reinforced; only this Consequences note was wrong.)*

### `LCD-DD-4` — Split `getMessageLead()` into two static-ish methods, drop the stale catalog claim

- **Context:** `getMessageLead()` (`component.ts:610-613`) picks "partner" or "CG Center" from
  `is_lead_by_partner` and always claims the dropdown is limited to entities "already added in this
  section" — false for centers since `LC-DD-1` made `possibleLeadCenters` the full CLARISA catalog.
- **Decision:** `getMessageLeadCenter()` returns a fixed string naming "CG Center" with no
  "already added" claim; `getMessageLeadPartner()` keeps today's partner wording (the partner
  dropdown's `possibleLeadPartners` sourcing is unchanged and out of scope — the "already added"
  claim stays accurate there).
- **Alternatives considered:** keep one method with a boolean param — rejected, no longer maps to
  one shared code path once the fields are visually and logically independent.
- **Consequences:** `LCD-AC-5` covers the copy assertion.

---

## 13. Open Gaps & Follow-ups

- **Server DTO verification (carried from `requirements.md` assumption):** confirm before/at
  implementation start that the PATCH validator does not reject a payload with both a leading
  center and a leading partner. If it does, this design's frontend-only scope is invalidated and
  the spec must be revised — flag to the user immediately rather than working around it.
- **No backfill** for results left without a Lead Center under the old model — accepted, confirmed
  out of scope.
- This folder's `CLAUDE.md` documents the mutual-exclusivity history (`LC-DD-*` notes describing
  `is_lead_by_partner`-gated behavior) — `tasks.md` must include re-stamping it, per
  `requirements.md` §11.

**Budget (Step 2.4):** ~4 tasks, ~90–140 LOC (template reorder + ~15 LOC component/save rewrite +
~10 LOC service simplification + test additions), 1 expected review round. This roughly matches
the **Lite** depth chosen in `/akili-propose`/`requirements.md` — no upgrade or downgrade needed.

---

## Required cross-references

- `docs/specs/changes/lead-center-decouple/requirements.md` (same folder).
- `docs/prd.md` AC-6.
- `docs/trd/trd.md` §6 Frontend Architecture & State Boundaries.
- `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-contributors-and-partners/CLAUDE.md`
  — documents the `LC-DD-*`/mutual-exclusivity history this design changes; must be updated in the
  same commit as implementation (project convention, `docs/COMPONENT-DOCS.md`).
