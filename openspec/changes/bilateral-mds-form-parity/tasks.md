> **Verification standard for every task below.** Jest for logic, Cypress for anything that renders,
> and a mutation check before the result is trusted: break the code deliberately and require the spec
> to go red. Browser mutations need a canary spec first, confirming `ng serve` has rebuilt — otherwise
> the mutation is never exercised. Node for this repo is nvm **v22.21.1**, not the Homebrew v25.

## 1. P2-3352 — Result header and edit rules

- [ ] 1.1 Extend `bilateral-page-header` with result code, result type, a `W3/Bilateral` funding tag
      and a status badge. Today it renders only the centre breadcrumb, title, acronym and a CTA.
- [ ] 1.2 Expose a read-only signal derived from `status_id`: editable only in Editing. The value is
      already in the contract (`status_id` 1–7 / `status_name`) and consumed by
      `bilateral-results-list.component.ts:41-42`, so nothing is needed from the backend.
- [ ] 1.3 Thread it through the five sections. ⚠️ `section-geography.component.html:138` and `:272`
      pass literal `[readOnly]="false"` — those are the two places that will silently ignore the new
      state if missed.
- [ ] 1.4 Section 1 wording per the story: the "W3/Bilateral project details" sub-heading, its
      description, and Lead Center as display-only.
- [ ] 1.5 Tests: badge and identity strip per status; every section read-only outside Editing;
      mutation check on the read-only derivation.
- [ ] 1.6 Spec collision to raise, not resolve: P2-3352 says Primary contributing science program
      reflects the user's choice and is editable with more than one programme; P2-3368 says it is
      read-only and auto-assigned from the centre. Same field, same epic. Note on both tickets.

## 2. P2-3370 — Geographic Location parity

- [ ] 2.1 Read `section-geography.component.html` in full (555 lines) before editing anything.
- [ ] 2.2 Compare field by field against the story's scope table (Global 1, Regional 2, Country 3,
      Sub-national 5, To-be-determined 50) and the per-scope region/country rules.
- [ ] 2.3 Extra-geographic-scope question present for every scope except Global and To-be-determined.
- [ ] 2.4 Confirm the MDS checklist this section publishes still matches what it renders.
- [ ] 2.5 Tests per scope option, including the two that must NOT show the extra question.
- [ ] 2.6 Do **not** replace it with `app-geoscope-management`. Record the divergence on the ticket.

## 3. P2-3375 — Evidence parity

- [ ] 3.1 Read `section-evidence.component.html` in full (430 lines) and its own model first.
- [ ] 3.2 Walk the story's rule list: six-item cap · Link and Upload file · public/private ·
      CGSpace permanent-link replacement · SharePoint/OneDrive/Drive/Dropbox blocked · impact-area and
      result-type checkboxes per item · 50-word description · Principal-without-evidence warning ·
      newest-first ordering.
- [ ] 3.3 Tests for the cap, the cloud-storage block and the ordering at minimum — those three are
      rules a user hits immediately.
- [ ] 3.4 Do **not** replace it with `rd-evidences` / `evidence-item`. Record the divergence.
- [ ] 3.5 Related and NOT fixed here: a result promoted from an AI draft arrives with Evidence empty
      even though this section has a mandatory MDS item (`bilateral-ai.service.ts:250-263` computes
      `formalEvidence` only to validate it and never writes). Belongs to P2-3418.

## 4. Close-out

- [ ] 4.1 Each ticket: technical detail in its `[FRONT] Pre-plan / Context` subtask, a plain-language
      comment on the activity, assign to María Camila Giraldo, transition to To Be Reviewed.
- [ ] 4.2 Every unspecified behaviour met on the way gets a note on its ticket naming what is missing
      and what answer would unblock it — never code invented to fill the gap.
- [ ] 4.3 Do not mark anything Ready For UAT until the change is confirmed on the test environment.
      Pushing is not deploying; the build number next to PRMS in the sidebar is the discriminator.
