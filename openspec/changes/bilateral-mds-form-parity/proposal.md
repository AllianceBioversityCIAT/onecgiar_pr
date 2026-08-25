## Why

The W3/Bilateral result form is being brought to the behaviour epic P2-3353 specifies, one section at
a time, for the 26-August reporting readiness push. Four sections are already done and in review
(P2-3366 General Information, P2-3382 Capacity Sharing, P2-3388 Policy Change, plus P2-3387 removing
the empty type-specific accordion for Other Output / Other Outcome). This change covers what is left
and can actually be built.

Two findings from the code audit shape it, and both were verified rather than assumed:

1. **Geographic Location and Evidence are parallel implementations, not reuse.** Their stories say
   "must use the same component with the same behaviour, without any modifications", but
   `section-geography.component.html` is 555 lines of its own template using `app-sub-geoscope`
   directly (the W1/W2 wrapper `app-geoscope-management` is never referenced), and
   `section-evidence.component.ts` imports only generic shared pieces plus its own model and its own
   430-line template — never `rd-evidences` or `evidence-item`. So behaviour may match today but it
   will drift: a rule change on either side does not reach the other.

2. **The bilateral editor has no state machine at all.** Grepping `pages/bilateral/` for role,
   read-only, phase or status handling returns four hits, two of which are literal
   `[readOnly]="false"`. A result in Pending Review or Approved is still fully editable. P2-3352 is
   the story that carries this, and the data is already there — `status_id` (1–7) and `status_name`
   are part of the bilateral contract and the results list already consumes them
   (`bilateral-results-list.component.ts:41-42`), so it is frontend-only.

**Scope:** frontend only. No endpoint is added or changed.

## What Changes

- **P2-3352 — Project Information + edit rules.** Add result code, result type, the `W3/Bilateral`
  funding tag and a status badge to the bilateral result header, which today shows only the centre
  breadcrumb and name. Derive a read-only state from `status_id` and thread it through the five
  sections: editable in Editing, read-only in Pending Review, Approved and Rejected.
- **P2-3370 — Geographic Location parity.** Bring the existing parallel section field-by-field to the
  story's tables (scope options 1/2/3/5/50, the conditional region and country selectors, and the
  extra-geographic-scope question for every scope except Global and To-be-determined).
- **P2-3375 — Evidence parity.** Same approach against the story's rule list: the six-item cap, Link
  and Upload file, public/private, CGSpace permanent-link replacement, the cloud-storage block, the
  per-item checkboxes, the 50-word description, the Principal-without-evidence warning, and
  newest-first ordering.

**Deliberately chosen: parity, not reuse.** Replacing two working sections with the W1/W2 components
is a refactor of ~1000 lines the week manual testing happens. Parity is what can be delivered without
risking sections that already work. The divergence stays, and removing it is separate, deliberate
work — recorded as such on both tickets rather than smuggled in here.

## Out of scope, and why

- **P2-3368 Contributors & Partners — blocked, not deferred.** `SaveBilateralContributorsDto` accepts
  exactly `contributing_center[]` and `contributing_bilateral_projects[]`. External partners and the
  "no external partners" flag have nowhere to be persisted. Backend item 1 of P2-3437, assigned to
  Juan David Delgado; frontend half tracked in P2-3443.
- **P2-3384 Knowledge Product (MELIA).** Largest of the per-type sections and reuse-heavy — the
  bilateral component already calls the same endpoint W1/W2 uses, so the data is there and the work is
  porting the MELIA block, the FAIR radials and the Sync button. Sized separately.
- **The missing error branch in three type components.** `type-policy-change`, `type-innovation-use`
  and `type-innovation-dev` subscribe without an error branch, so a failed fetch leaves the section at
  "0/0 fields" instead of incomplete — the gap P2-3355 fixed for Knowledge Product. **None of their
  stories specifies it**, so it is a note on each ticket and not code here.
- **Impact-area sub-score mandatoriness (P2-3366).** The story calls the sub-scores mandatory at Score
  1 and 2, but they sit behind the full-metadata toggle and are excluded from the MDS percentage and
  the Submit gate. Making them mandatory changes what "optional metadata" means — a product decision,
  noted on the ticket.

## Verification standard

Every item is verified in a real browser with Cypress, and **the check is proved to fail** before it
is trusted: the code is deliberately broken and the spec must go red. For browser checks this needs a
canary spec confirming the dev server has finished rebuilding — without it the mutation is never
exercised and the check silently passes. That is not hypothetical; it happened on P2-3387, where a
green suite hid a fix that did nothing on the editor path.
