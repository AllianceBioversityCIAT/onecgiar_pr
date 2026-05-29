## Context

P2-2960 asks to make three P25 lead fields mandatory. Investigation (see `onecgiar-pr-client/src/CLAUDE.md` and the spec) found:

- **Lead Contact Person** lives in `rd-general-information.component.html` (`<app-lead-contact-person-field [body]="generalInfoBody">`). It has **no** `[required]` marker and **no** `appFeedbackValidation`. Validity is tracked inside `lead-contact-person-field` via `userSearchService.hasValidContact` and `body.lead_contact_person`.
- **Lead Center / Lead Partner** live in `rd-contributors-and-partners.component.html` (P25). A yes/no toggle `is_lead_by_partner` switches between Lead Partner (`[required]="is_lead_by_partner"` ✅) and Lead Center (`[required]="false"` ❌ — the gap).
- The **section green check** is backend-computed (`green-checks.service.ts` → `GET_greenChecksByResultId` / `GET_p25GreenChecksByResultId`); the frontend only renders it.

## Goals / Non-Goals

**Goals:**
- Make the three lead fields mandatory in **P25** at the frontend layer (required markers + `appFeedbackValidation` feedback), reusing existing primitives.
- Keep P22 untouched (already enforced).
- Document the backend dependency for the green check so the user can route it to the server team.

**Non-Goals:**
- Any backend change (completeness query / green-check endpoints). Out of AI scope.
- Hard-blocking submission beyond what the existing required/feedback pattern does.
- P22 changes.

## Decisions

- **Reuse `appFeedbackValidation` + `[required]`, do not invent a new pattern.** Rationale: AC explicitly requires preserving existing UX; the directive already drives the mandatory/complete indicator used by the impact-area fields in the same General Information template.
- **Lead Center:** flip `[required]="false"` → `[required]="!is_lead_by_partner"` in `rd-contributors-and-partners`, mirroring P22's `rd-partners`. Minimal, consistent change. Alternative (custom validator) rejected — heavier, diverges from P22.
- **Lead Contact Person:** drive the incomplete/complete state from `body.lead_contact_person` + `userSearchService.hasValidContact`. Prefer exposing a small computed/getter rather than duplicating logic in the template.
- **Green check honesty:** the frontend feedback can show incomplete, but the section green check will only respect these fields once the backend includes them. We document this gap rather than fake it on the client.

## Risks / Trade-offs

- [Green check still turns green without these fields, because backend ignores them] → Document clearly; report to user with endpoint evidence. Frontend feedback (red marker) still guides the user.
- [`lead-contact-person-field` is in `custom-fields/`, excluded from coverage] → still ship a spec; verify the wiring in the consuming component's spec (`rd-general-information.component.spec.ts`) which IS covered.
- [Touching `is_lead_by_partner` toggle logic could regress the P25 partners flow] → change is limited to the `[required]` binding; no logic change to the toggle.

## Migration Plan

Pure frontend template/binding change — no data migration. Rollback = revert the commit. Verify on local + prtest.
