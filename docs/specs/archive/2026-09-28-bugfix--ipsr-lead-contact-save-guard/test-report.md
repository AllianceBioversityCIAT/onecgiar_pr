# Test Report — IPSR Lead contact person save guard parity

**Overall: ✅ PASS.** Every scenario in R-1, R-2 and R-3 has an automated test. The scoped run is green: **107/107 tests in 2 suites**, and lint is clean. No product bugs were found. One coverage gap was closed in this run: Scenario 2.1's *"carrying that free-text name"* clause now has a test that checks the payload.

## 1. Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/bugfix/ipsr-lead-contact-save-guard/` |
| Date | 2026-09-28 |
| Branch | `qa-development-2026-ss` (fix committed in `bb8697f98`) |
| Depth · Mode | Lite · Bug |
| Leader / Tester | Claude Code session (Opus 5.5). Run **inline**, per the Deployment Rule for Lite depth with a single suite |

## 2. Summary

| Item | Value |
|---|---|
| Suites | 1 (frontend unit, Jest). No backend, integration or E2E suite applies (client-only, no contract change) |
| Testers spawned | 0 (inline) |
| Author TDD coverage | **Cited, not rewritten**: the `IPSR-LCG-T-1` cases (red→green, recorded in `execution.md`) |
| Added by this run | 2 cases (`it.each` P22/P25): Scenario 2.1 payload carries the accepted name |
| Product bugs | 0 |
| Skills / effort | `tdd` style, medium. No deviation |

## 3. Backend Unit Tests

Not applicable. No server change (design §5–7).

## 4. Frontend Unit Tests

| Command | Result |
|---|---|
| `npx jest --silent --reporters=summary --no-coverage --testPathPattern="(ipsr-general-information.component\|lead-contact-person-field.readonly).spec"` | **2 suites passed, 107/107 tests** (105 before this run + 2 new) |
| `npx ng lint --quiet` | All files pass linting |

**New test:** `ipsr-general-information.component.spec.ts`, inside `IPSR-LCG-R-2 Scenario 2.1`, *"%s: the real 'use this name anyway' puts the free-text name in the save payload"* (P22 and P25).
- It calls the field's real `LeadContactPersonFieldComponent.prototype.acceptTypedNameAnyway` against the section's own body, with a query that has padding (`'  External Consultant  '`), then calls `onSaveSection()`.
- It asserts `PATCHIpsrGeneralInfo` was called with `objectContaining({ lead_contact_person: 'External Consultant', lead_contact_person_data: null })`, `'mockInnovationId'` and the portfolio flag, and that `showContactError` stays `false`.
- Why it was added: the existing 2.1 cases stub `queryCameFromHydration: true` and check only that the call happened. So the flag the field sets and the flag the guard reads were never exercised together. The author's ADVISORY flagged the same gap (`execution.md` T-1).
- It would fail on the pre-fix code for P22, where the old guard ignored `queryCameFromHydration` and blocked the save. That conclusion comes from reading the code; this run did not execute a mutation.

## 5. Integration Tests

Not applicable. The field ↔ section wiring is covered at unit level by the new case above. No HTTP or contract boundary changed.

## 6. E2E Tests

No automated E2E test. The gap is accepted (§9). Its substitute is the manual check the user ran on a local build (`execution.md` T-2): reproductions **A** (P25, typed and not picked → blocked, contact kept after reload) and **B** ("use this name anyway" → saved). Both passed.

## 7. Coverage & Traceability

| Requirement | Scenario / clause | Test Type | Test | Result | Notes |
|---|---|---|---|---|---|
| `IPSR-LCG-R-1` | 1.1 P25 typed-unpicked → no request, "not found" shown | Unit | `IPSR-LCG-R-1 Scenario 1.1` | ✅ | Author TDD (inverted old `:483`) |
| `IPSR-LCG-R-1` | 1.1 `BUT must NOT send null / alter stored contact` | Unit + manual | 1.1 (PATCH not called, body `lead_contact_person` unchanged) + manual A | ✅ | — |
| `IPSR-LCG-R-1` | 1.2 P22 | Unit | `Scenario 1.2` | ✅ | Author TDD |
| `IPSR-LCG-DD-2` | Unresolved view child still blocks | Unit | `IPSR-LCG-DD-2` | ✅ | Author TDD |
| `IPSR-LCG-R-2` | 2.1 accepted name → request sent | Unit | `Scenario 2.1` P22 / P25 | ✅ | Author TDD |
| `IPSR-LCG-R-2` | 2.1 *carrying that free-text name* | Unit | **new** 2.1 payload case, P22 / P25 | ✅ | **Added in this run** |
| `IPSR-LCG-R-2` | 2.1 `AND IT MUST NOT show "not found"` | Unit | 2.1 cases (`showContactError === false`) | ✅ | — |
| `IPSR-LCG-R-2` | 2.2 loaded free-text name saves | Unit | `Scenario 2.2` P22 / P25 | ✅ | Same mechanism as 2.1 (`queryCameFromHydration`), by design |
| `IPSR-LCG-R-2` | 2.3 picked / blank saves | Unit | `Scenario 2.3` (P25) + existing picked and blank-query cases (P22 default mock) | ✅ | — |
| `IPSR-LCG-R-3` | 3.1 flag on → tooltip | Unit (DOM) | `Scenario 3.1` flag on | ✅ | Read off the `app-lead-contact-person-field` DebugElement |
| `IPSR-LCG-R-3` | 3.1 `BUT must NOT change when flag off` | Unit (DOM) | `Scenario 3.1` flag off | ✅ | — |
| NFR | Field component unchanged, read-only rendering intact | Unit | `lead-contact-person-field.readonly.spec` (7) | ✅ | Guards the comment-only template edit |

## 8. Remediation

None. No failures.

## 9. Accepted Gaps

| Gap | Reason | Substitute |
|---|---|---|
| No automated real-browser flow (live DOM field ↔ section, Save button, reload) | jsdom plus a mocked `UserSearchService` cannot prove the round trip after a reload. The spec states that no automated gate exists for this defect class (requirements "Defect Classes") | Manual reproductions A and B, verified by the user on 2026-09-28 |
| Cypress CT for `lead-contact-person-field` not run | The field component is unchanged; only a template comment moved | `lead-contact-person-field.readonly.spec` renders the real template and passes |
| 2.2 (loaded name) relies on a stubbed `queryCameFromHydration`, not the real `ngOnChanges` hydration | `ngOnChanges` hydration belongs to the field and is covered by the archived RES-DD-1 / P2-3260 specs. This spec did not change it | — |
