# Proposal: Decouple Lead Center From The "Led By An External Partner?" Toggle

## 1. Document Control

| Field | Value |
|---|---|
| Slug | `lead-center-decouple` — derived from free-text argument (Spanish request about splitting the Lead Center / Lead Partner questions) |
| Spec Path | `docs/specs/changes/lead-center-decouple/` |
| Type | Change |
| Approval Mode | gated |
| Scope | P25 only — component is already P25-exclusive (see §5) |
| Source screen | `rd-contributors-and-partners` — `/result/result-detail/:id/contributor-partners?phase=<id>` |
| Requested by | Santiago Sánchez, 2026-08-31 |

## 2. Intent

Today "Is this result being led by an external partner?" (Yes/No) is the single gate that decides
whether the user sees **Lead partner** (Yes) or **Lead center** (No) — the two are mutually
exclusive and only one can ever be captured. The request is to split them into two **independent**
questions: **Lead Center becomes always-visible and always-required**, moved to sit directly under
"Contributing CGIAR Centers"; **Lead Partner keeps its current position and its Yes/No gate**
unchanged (Yes → partner dropdown required; No → dropdown hidden).

## 3. Problem / Current Behavior

`rd-contributors-and-partners.component.html:430-467` renders one Yes/No toggle
(`is_lead_by_partner`) that swaps between two mutually exclusive branches:

- **Yes** → `Lead partner` dropdown (`rdPartnersSE.leadPartnerId`, options = `possibleLeadPartners`).
- **No** (`else selectLeadCenter`) → `Lead center` dropdown (`rdPartnersSE.leadCenterCode`, options
  = `possibleLeadCenters`, full CLARISA catalog since `LC-DD-1`).

Save-time mutual exclusivity is enforced in `onSaveSection()` (`component.ts:502-520`): when
`is_lead_by_partner` is `true`, every center's `is_leading_result` is forced `false`; when it is
`false`, every partner/mqap's `is_leading_result` is forced `false`. A result can never have both a
lead center and a lead partner recorded today — that is the behavior being removed.

This means a Lead Center can currently go **unrecorded entirely** whenever the user answers "Yes"
to the external-partner question, even though every result should always have a CG Center of
record leading it.

## 4. Proposed Outcome

- **Lead Center** is extracted into its own always-visible, always-required field, positioned
  immediately below the "Contributing CGIAR Centers" question/chips block (end of that block is
  `rd-contributors-and-partners.component.html:421`, before the P2-3171 external-partners note at
  `:423-426`). It renders unconditionally — not gated by `is_lead_by_partner`.
- **Lead Partner** keeps its current position (`:430-451`) and its existing Yes/No gate exactly as
  is: "Yes" shows the required `Lead partner` dropdown, "No" hides it.
- A result can now have **both** a Lead Center (always) and, optionally, a Lead Partner (when led
  by an external partner) recorded simultaneously.
- `onSaveSection()`'s mutual-exclusivity branch (`:502-520`) is replaced with independent
  assignment: centers' `is_leading_result` is always driven by `leadCenterCode`; partners'/mqap's
  `is_leading_result` is driven by `leadPartnerId` only when `is_lead_by_partner` is `true` (else
  forced `false`, as today).
- `getMessageLead()` (`:610-613`) splits into two independent alert messages — one per field —
  since the entity is no longer conditional on a single toggle. The Lead Center message should also
  drop the stale "Only CG Centers already added in this section can be selected" claim, which
  `LC-DD-1` already made false (the dropdown is the full CLARISA catalog, not a filtered one).

## 5. Scope

- `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-contributors-and-partners/`
  — template (`.component.html`), component (`.component.ts`), and service
  (`rd-contributors-and-partners.service.ts`) only.
- **P25 only, confirmed with no gap to close:** this component (`rd-contributors-and-partners`) is
  already portfolio-exclusive to P25 by routing — the P22 equivalent question lives in the sibling
  `rd-partners/` component (`portfolioAcronym: 'P22'`), which this change does **not** touch. No
  `isCP2026()`/`isP22()` gating is needed for the P25 scoping itself (that trap only applies to
  sub-behaviors *within* this already-P25 component, e.g. the ToC-mapped vs. flat split for
  Contributing Centers) — confirmed via `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-contributors-and-partners/CLAUDE.md`.
- Required-field scan / save-contract E2E updates: `cypress/e2e/result-detail/save-contract.cy.ts`
  reads `data-testid="cp-field-<payload-path>"` hooks to assert PATCH body shape — the relocated
  Lead Center control keeps its existing hook; if a new hook is needed it must follow the same
  convention.

## 6. Non-Goals

- No change to the P22 `rd-partners` component/flow.
- No change to how `possibleLeadCenters` is sourced (still the full CLARISA catalog per `LC-DD-1`)
  or to the Contributing CGIAR Centers guard added by `toc-center-guard`/`TOC-C-DD-*`.
- No change to the "Is this result being led by an external partner?" question's own required-ness,
  wording, or its `no_applicable_partner`-driven `readOnly` behavior.
- No change to the auto-add-to-Contributing-Centers side effects on Lead Center selection
  (`onLeadCenterSelected`, `LC-DD-5`) — those still apply.

## 7. Affected Users, Systems, And Specs

- **Users:** any P25 result submitter/editor filling in Contributors and Partners.
- **Code:** `rd-contributors-and-partners.component.html/.ts`, `rd-contributors-and-partners.service.ts`.
- **Prior specs that touched this exact field and must stay compatible:**
  `docs/specs/bugfix/lead-center-full-catalog` (LC-DD-1..5 — full catalog + auto-add wiring),
  `docs/specs/changes/toc-center-guard` (archived under
  `docs/specs/archive/2026-08-29-changes--toc-center-guard/` — minimum-count guard on Contributing
  CGIAR Centers, unaffected by this change since it only touches the two arrays this proposal does
  not modify).
- **Backend:** none identified — `is_lead_by_partner`, `leadCenterCode`/`contributing_center[].is_leading_result`,
  and `leadPartnerId`/`institutions[].is_leading_result` are all existing payload fields; this
  change only stops one of them from being force-zeroed by the other at save time.

## 8. Visual Reference

- Source: None (user-provided screenshots of the current two mutually-exclusive states, not a
  target mockup).
- Location: n/a
- Notes: The two screenshots the user attached show today's behavior (Yes → Lead partner dropdown;
  No → Lead center dropdown with the info note). No new visual design was requested — the ask is a
  layout/logic split, not a restyle. `/akili-specify` can lay out the exact field order from this
  proposal without a mockup; flag if a mockup turns out to be wanted once requirements are drafted.

## 9. Requirement Delta Preview

### ADDED Requirements

- Lead Center renders unconditionally, directly below Contributing CGIAR Centers, and is always
  `required`.
- A result can carry both a Lead Center and a Lead Partner at the same time.

### MODIFIED Requirements

- `onSaveSection()` center/partner `is_leading_result` assignment: from "mutually exclusive,
  branch on `is_lead_by_partner`" to "independent — centers always from `leadCenterCode`, partners
  only from `leadPartnerId` when `is_lead_by_partner` is true."
- `getMessageLead()`: split into two field-specific messages instead of one toggle-conditional
  message; Lead Center's message text updated to drop the stale "already added in this section"
  claim.
- Lead Center's `required` binding: from `!is_lead_by_partner` (conditional) to `true` (always).

### REMOVED Requirements

- The `*ngIf="is_lead_by_partner"` / `#selectLeadCenter` else-template branching between the two
  fields (`:440-467`) — replaced by two independent, always-rendered blocks.

## 10. Approach Options

**Option A — Split into two sibling fields, reuse existing bindings (recommended).**
Move the existing `app-pr-select` for Lead Center to just under the Contributing CGIAR Centers
block, drop its `*ngIf`/`else` coupling to `is_lead_by_partner`, and hardcode `[required]="true"`.
Leave the Lead Partner Yes/No + dropdown exactly where it is. Update `onSaveSection()`'s
if/else into two independent statements. Smallest possible diff — no new component, no new state
shape, reuses `leadCenterCode`/`leadPartnerId`/`possibleLeadCenters`/`possibleLeadPartners` as-is.

**Option B — Extract a shared "lead entity" sub-component.**
Build a reusable `<app-lead-entity-field>` used twice (once for Center, once for Partner) to
DRY up the near-identical `app-pr-select` markup. More upfront work for a field pair that is not
reused anywhere else in the codebase (P22's `rd-partners` has its own independent, older
implementation) — premature abstraction for a two-instance case.

**Option C — Leave the toggle in place, add Lead Center as a *third* independent question.**
Keep today's Yes/No-gated Lead Center/Lead Partner pair unchanged, and bolt on a second, separate
"Lead Center" field elsewhere. Rejected — it does not match the request (which asks to *detach*
the existing Lead Center from the toggle, not duplicate it) and would leave two different
"Lead Center" concepts in the same form.

**Recommended: Option A.** It is the smallest safe path that delivers exactly the requested
behavior, keeps the existing test hooks (`data-testid="cp-field-*"`) largely intact, and avoids
inventing structure the codebase doesn't otherwise need.

## 11. Recommended Approach

Option A. Concretely, at `/akili-specify` time:

1. Relocate the `Lead center` `app-pr-select` block (currently `:452-467`, inside `#selectLeadCenter`)
   to right after `<!-- Contributing Centers end -->` (`:421`) and before the P2-3171 external
   partners note (`:423`). Drop the `*ngIf="is_lead_by_partner"`/`ng-template #selectLeadCenter`
   wrapper; keep the existing `[readOnly]="this.api.rolesSE.readOnly"` and `[showClear]="true"`.
   Change `[required]` from `!this.rdPartnersSE.partnersBody.is_lead_by_partner` to `true`.
2. Leave the "Is this result being led by an external partner?" `app-pr-yes-or-not` and the
   `Lead partner` `app-pr-select` (`:430-451`) exactly where they are; only remove their coupling to
   the (now-relocated) Lead Center block.
3. Split `getMessageLead()` into `getMessageLeadCenter()` (always "CG Center", no toggle) and
   `getMessageLeadPartner()` (kept as-is for the partner branch), each with an updated
   `app-alert-status` above its own field.
4. Rewrite `onSaveSection()` lines `502-520` from an if/else into two independent blocks: centers'
   `is_leading_result` always set from `leadCenterCode`; partners'/mqap's `is_leading_result` set
   from `leadPartnerId` gated on `is_lead_by_partner` (unchanged from today's `if` branch), forced
   `false` when `is_lead_by_partner` is `false` (unchanged from today's `else` branch, minus the
   center-zeroing line).
5. Re-verify the `LC-DD-*` auto-add-to-Contributing-Centers side effects on `onLeadCenterSelected`
   still fire correctly now that the field renders unconditionally instead of only in the "No"
   branch.
6. Update/extend `rd-contributors-and-partners.component.spec.ts` (`LC-T-2`, `LC-T-4` describes)
   and `cypress/e2e/result-detail/save-contract.cy.ts` for the new independent save contract.
7. Re-stamp this folder's `CLAUDE.md` `Verified:` line with the landed commit hash (project
   convention, `COMPONENT-DOCS.md`).

## 12. Risks, Dependencies, And Open Questions

- **Risk — data model assumption.** The backend payload fields (`is_lead_by_partner`, per-row
  `is_leading_result` on both `contributing_center[]` and `institutions[]`) already support both
  being independently `true`; no server-side schema change identified, but this should be confirmed
  against the actual `PATCH` payload contract before implementation, not assumed.
- **Risk — existing data with no Lead Center.** Once Lead Center becomes always-required, any
  existing P25 result saved via the old "Yes, led by partner" path (which forces every center's
  `is_leading_result` to `false`) will now fail the new required-field validation on next edit
  until a Lead Center is picked. This is very likely the intended tightening (the request explicitly
  says "Lead Center sea siempre obligatorio"), but flag it so the user can confirm no backfill/
  migration is expected — this proposal assumes **new saves only**, no retroactive backfill.
- **Open question:** should the "Is this result being led by an external partner?" question's own
  copy/help text change now that it no longer implies "or a CG Center leads instead" (its Yes/No
  semantics are unchanged, but the surrounding context shifts)? Flagging for `/akili-specify` to
  resolve with the PO if it matters.
- **Dependency:** none blocking — `LC-DD-1..5` (full catalog + auto-add) and `TOC-C-DD-*` (min-count
  guard) are prerequisites already landed on this branch (see recent commits `64d072490`,
  `6f44a53af`) and this change builds on top of them without modifying their logic.

## 13. Success Criteria

- On the Contributors and Partners screen, Lead Center appears directly under Contributing CGIAR
  Centers, is always visible, and cannot be saved empty (required).
- The "Is this result being led by an external partner?" Yes/No toggle and its Lead Partner
  dropdown behave exactly as today, in their current position, independent of Lead Center.
- A result can be saved with both a Lead Center and a Lead Partner set.
- `npx jest --silent --reporters=summary --no-coverage` and the relevant Cypress specs
  (`save-contract.cy.ts`, `save-validation.cy.ts`, `contributors-and-partners.cy.ts`) pass.
- No change observed on the P22 `rd-partners` flow.

## 14. Next Step

```text
/akili-specify changes/lead-center-decouple
```
