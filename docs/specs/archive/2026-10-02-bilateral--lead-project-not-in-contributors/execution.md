# Execution — Bilateral lead W3/bilateral project shown apart from contributors

## Document Control

| Field | Value |
|---|---|
| Spec | `bilateral/lead-project-not-in-contributors` |
| Depth | Lite |
| Approval Mode | gated |
| Branch | `qa-development-2026-ss` |
| Started | 2026-10-02 |
| Leader model | Opus 5.5 (T1) · Implementer `akili-implementer` (sonnet, T2) · Reviewer `akili-reviewer` (T3) |

## Task Execution History

### T1 — Lead project apart + lead-free contributors views

| Field | Value |
|---|---|
| Final status | Reviewer **PASS** (attempt 1) · task held at `[~]`: the manual HITL browser check is still owed (tasks.md "Done when" + disqualifier) |
| Date | 2026-10-02 |
| Attempts | 1 |
| Requirements | LPC-R-1, LPC-R-2, LPC-R-3, NFR-1, NFR-2 |
| Design | DD-1, DD-2, DD-3, DD-4 |
| Skills | `angular-developer`, `spartan` (per tasks.md; no deviation) · effort `high` (payload invariant) |
| Exemplar | commit `155f1c091` (P2-3864, lead Center) |

**Attempt 1 — Implementer**

Files changed (all under `onecgiar-pr-client/src/app/pages/bilateral/components/section-contributors/`):
- `section-contributors.component.ts` (+44): `leadProjectIdSig` (private; `creationService.selectedProject()` ∩ `availableProjects()`), `leadProjectLabel`, `contributingProjectOptions`, `contributingProjectDisabledOptions`, `displayedContributingProjectIds`.
- `section-contributors.component.html` (net +16): a read-only "Lead W3/bilateral project" block inside `@if (leadProjectLabel())`, placed above `.sc-block--projects`. The picker `[options]`/`[disableOptions]`/`[ngModel]` and the chip `@for` are rebound to the lead-free views, and `isLeadProject(id)` is gone from the chip markup.
- `section-contributors.component.spec.ts` (+136/−1): new `describe('LPC · lead W3/bilateral project shown apart')` with tests a–h. The only edit to an existing spec is the markup-contract `[options]` line (old ~L2303).
- `CLAUDE.md`: LPC trap note next to P2-3864, and the `Verified:` line re-stamped.

Verification:
- `npx jest --silent --reporters=summary --no-coverage --testPathPattern=section-contributors`: Test Suites 2 passed, Tests 230 passed.
- `npx ng lint --quiet`: "All files pass linting." (Plain `npx eslint` has no flat config in client; `ng lint` is the package's lint.)

Not Done / Assumptions (verbatim from Implementer):
- Manual browser check (HITL) was NOT attempted, per instructions. It is left for the Leader/user, on one manual result with a lead (e.g. `R-A-2018-144`) and one API-reported result with no lead.
- Test d was verified against a constructed catalogue (IFPRI/CIP owners), following the existing P2-3859 test pattern, not against live data.

**Attempt 1 — Reviewer: STATUS: PASS**

> The diff meets LPC-R-1, LPC-R-2, LPC-R-3, NFR-1, NFR-2 and DD-1 to DD-4. The lead project is hidden only from the picker options, the picker model and the chip strip. `selectedProjectIds()` and `buildContributorsPayload()` are untouched, so every save still sends the lead with `is_lead: true`. Tests a–h are present and none of the disqualifiers apply.

The Reviewer checked the following. DD-1's rule is the same as `hydrateLeadAndSelection` and the `onProjectsChange` re-add guard. NFR-2 holds: the model is a subset of the options thanks to the P2-3859 union. The untouched-code list is intact. Test f's exact `[L]` payload is valid. The z-index ladder is unaffected, since the new block uses the base `.sc-block` value of 10.

ADVISORY (4R, non-gating):
- RISK (budget): about 60 production LOC against the ~35 in design.md §5. Most of the overrun is comments; the logic is the expected size.
- RELIABILITY: `leadProjectIdSig` updates immediately, but `readonlyLeadProjectId` only updates when hydration runs. If the result switches while the component stays mounted, with `isLoadingResult()` true and `contributorsHydrated` still true, a picker change could hide the new lead while the guard re-adds the old one. P2-3864 has the same exposure. Possible hardening: return null while `isLoadingResult()`.
- READABILITY: the folder `CLAUDE.md` `## Tests` still says "157 casos" and is stale.
- READABILITY: test e uses `arrayContaining`, so it would not catch an extra payload entry. Test f's exact assertion mitigates this.

Decisions:
- Leader deviation: the Reviewer got the diff as a frozen snapshot file in the session scratchpad (`lpc-t1.diff`) instead of inline. The diff was immutable and readable through `Read`, so this kept author ≠ auditor and saved roughly 290 lines of Leader output.
- Budget tripwire: production LOC is about 60 against a budget of about 35. This was escalated to the user at the T1 gate. Tasks (1) and review rounds (1) are within budget.

Issues: none blocking. Owed: manual browser check (HITL).

Final verification: Jest scoped 230/230 green · ng lint clean · manual check **pending**.

#### T1 — spec wording correction (2026-10-02, Leader, after the PASS)

The user asked whether API-ingested results also have a lead project. They do:
- `determineIsLead` (`bilateral.service.ts:4098`) makes a single sent project the lead.
- The client hydrates `selectedProject` from the `is_lead` row no matter how the result arrived (`bilateral-creation.service.ts:290`).
- On the user's DB query (2026-10-02), every active result with `external_platform_id IS NOT NULL` had `lead_rows = 1`; none had 0.

The behaviour did not need to change. Only the wording was wrong ("typical API import" for the no-lead case). Changes, all wording only:
- `requirements.md` LPC-R-1 "no lead" scenario heading.
- `tasks.md` test b label, and the manual check rewritten to use an API-ingested result **with** a lead (e.g. result code 8896).
- The component `.html` comment, and the test b `it()` name in `.spec.ts`. This renames a test the spec added itself; no pre-existing spec was edited.

Re-verified: scoped Jest 230/230 green.

Sweep: `grep -i API` across the spec folder. The remaining hits are correct: design §1 "API" contract, and the requirements Decisions/LPC-R-1 "applies to API-reported results too". The pre-existing code comment at `.ts:971` is out of scope.

#### T1 — budget tripwire resolved (2026-10-02)

The user accepted the overrun on 2026-10-02 ("acepto las 60 lineas"): about 60 production LOC against the ~35 budgeted. There is no comment trim.

Partial manual check (user screenshot, 2026-10-02, a manual result):
- "Lead W3/bilateral project" shows `B-A1723`, read-only, above the picker.
- The chips show only the two non-lead projects, with no ★ lead chip.

Still pending:
- The dropdown has no `B-A1723` option.
- Save and reload keeps the lead.
- Explain where the "Unsaved changes" badge on the projects block came from: user edit, or set at load.

#### T1 — manual HITL check confirmed · FINAL: PASS (2026-10-02)

The user confirmed on a manual result whose lead is `B-A1723`:
- The "Lead W3/bilateral project" field shows above the picker, read-only (screenshot).
- The chips show only non-lead projects (screenshot).
- `B-A1723` is not in the dropdown (user report).
- Save and reload keeps the lead (user report).

"Unsaved changes" badge: the user saw it on open. The Leader checked and it is **not caused by T1**. `app-field-card` sets `edited` only from DOM `input`/`change`/`click` events inside the card (`field-card.component.html:21-23`, `markEditedFromPointer`). Programmatic `ngModel`/`writeValue` updates never set it. The click on the picker during the check marks the card, which is pre-existing field-card behaviour ("a click counts as an edit", 14-sep-2026). Recorded only; no task created.

Done-when met: tests a–h pass, scoped suites are green (230/230), `ng lint` is clean, the manual check is confirmed, and the budget overrun was accepted by the user.

## Summary

| Task | Status | Attempts | Reviewer |
|---|---|---|---|
| T1 | PASS | 1 | PASS (+4 advisories, non-gating) |

The spec is complete. Not committed: per the user rule, a commit needs an explicit go-ahead. Next: `/akili-archive bilateral/lead-project-not-in-contributors`.
