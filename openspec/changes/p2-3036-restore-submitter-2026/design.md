## Context

The 2026 Contributors & Partners redesign (P2-3036, change `p2-3036-phase-year-gating`) gated every redesign delta behind `isCP2026()` (`FieldsManagerService.isContributorsPartners2026`). One of those deltas hid the **Submitter** field for 2026+:

```html
@if (!isCP2026()) {
  @if (this.rdPartnersSE.getConsumed()) {
    <app-pr-select label="Submitter" ... [(ngModel)]="...changePrimaryInit" ...>
    @if (single-initiative) { <div class="no-primary-list">…cannot change the submitter</div> }
  }
}
```

Business reversed that decision (Nicoleta via Ángel, Santi): the Submitter must stay in all phases. The field's model (`changePrimaryInit`) is still populated by `rd-contributors-and-partners.service.ts` regardless of the gate, so only visibility changes — save behavior is already correct.

## Goals / Non-Goals

**Goals:** make the Submitter render in every reporting phase (2025 and 2026+) by removing only its phase-year gate; keep 2025 identical; keep all other 2026 redesign deltas gated and unchanged.

**Non-Goals:** no backend; no change to `changePrimaryInit` logic or the single-initiative disable rule; no change to the question label, KPI Statement/description, info notes, Level/HLO visibility, or 50-word limit (those stay behind `isCP2026()`).

## Decisions

**D1 — Remove only the outer `@if (!isCP2026())` wrapper.** Unwrap the Submitter block so it falls back to its pre-redesign condition `@if (this.rdPartnersSE.getConsumed())`. This is the inverse of decision D5 (Submitter gate) from the phase-year-gating change; every other gate from that change is left intact.

**D2 — Keep the inner guard and the disable rule verbatim.** `getConsumed()`, the `[fieldDisabled]` single-initiative condition, and the "cannot change the submitter" note are unchanged — they predate the redesign and apply to all phases.

**D3 — Update the inline comment.** The current comment says the Submitter is "shown ONLY for phase 2025 and earlier". Replace it with one stating the Submitter renders in all phases (per P2-3036 business reversal), so the next reader doesn't re-introduce the gate.

## Risks / Trade-offs

- [`isCP2026()` becomes unused by the Submitter but still used by the other deltas] → No risk; the helper stays referenced by the question label, info notes, Level/HLO and word-limit gates.
- [No unit tests] → The component is excluded from coverage; verification is `npm run build:dev` + visual check on a 2026 result (Submitter now visible) and a 2025 result (unchanged).
