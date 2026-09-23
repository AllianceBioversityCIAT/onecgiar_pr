/**
 * P2-3785 (4b) — copy of the W3/bilateral Innovation Use actors block, set up as in pooled reporting.
 * Wording mirrors the W1/W2 form (`shared/components/innovation-use-form/innovation-use-form.component.html`)
 * so the two routes read the same to a reporter who uses both.
 */
export const BILATERAL_INNOVATION_USE_ACTORS_COPY = {
  womenYouthWarning: 'Remember that the value of Youth cannot be greater than total of Women',
  menYouthWarning: 'Remember that the value of Youth cannot be greater than total of Men',
  youthSplitNote:
    'Youth and Non-youth were split 50/50 by the system because age disaggregation is not available. Change Women or Men and the split is recalculated.',
  // Night sweep 2026-09-23, BIL-1 — shown on an actor row that holds figures but no actor type. The
  // server cannot store such a row (it is skipped as blank), so the section waits for the type.
  actorTypeMissing: 'Select the actor type for this row. Changes in this section are not saved until every actor with figures has a type.',
  // Night sweep 2026-09-23, BIL-1b — the organization twin (skipped as blank server-side the same way).
  organizationTypeMissing:
    'Select the institution type for this organization. Changes in this section are not saved until every organization with figures has a type.'
};
