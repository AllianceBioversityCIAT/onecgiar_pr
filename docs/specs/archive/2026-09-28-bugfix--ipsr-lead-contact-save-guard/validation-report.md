# Validation Report — IPSR Lead contact person save guard parity

**Verdict: ✅ PASS. 0 FAIL. The 3 WARNs are resolved: 2 fixed, 1 accepted as a follow-up (§11). Ready to archive.** The implementation matches R-1..R-3 and DD-1..DD-3. The guard is textually identical to Results. Build, lint and the scoped tests are green. Every WARN is a documentation or bookkeeping issue; none affects behavior.

## 1. Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/bugfix/ipsr-lead-contact-save-guard/` |
| Date | 2026-09-28 |
| Branch · commit | `qa-development-2026-ss` · `bb8697f98` (+ the uncommitted test added by `/akili-test`) |
| Auditor | Claude Code session (Opus 5.5) |
| Author ≠ auditor | ⚠️ **Not independent.** The same model family implemented the work (execution.md Leader: Opus 5.5). The findings below rest on diffs and command output, not on the author's claims |
| Inputs | proposal · requirements · design · tasks · execution · test-report |

## 2. Summary

| Area | Result |
|---|---|
| Task completion | WARN (T-2 DoD boxes left unticked) |
| File existence | PASS |
| Build integrity | PASS |
| Requirement coverage | PASS |
| Code quality | PASS (advisories only) |
| Design conformance | PASS |
| Test evidence | PASS |
| Constitution impact | PASS |
| Documentation consistency | WARN ×2 (budget statement, open follow-up) |

## 3. Task Completion

| Task | Status | Evidence | Result |
|---|---|---|---|
| `IPSR-LCG-T-1` | `[x]` | execution.md: RED set 6/98 matches the tasks.md prediction; Reviewer PASS on attempt 1 | PASS |
| `IPSR-LCG-T-2` | `[x]` | execution.md: 105/105 green, lint clean, Reviewer PASS, manual A/B verified by the user | **WARN V-1**: the five DoD checkboxes in tasks.md §3 are still `[ ]`, although each one is met by recorded evidence. Stale bookkeeping only |

## 4. File Existence

All five files listed in design §4 were modified in `bb8697f98`: component `.ts`, `.html`, `.spec.ts`, the field's `.html` (comment only) and the field's `CLAUDE.md`. No unexpected production files were touched; the spec docs are the only other files in the commit. **PASS**

## 5. Build Integrity

| Command | Result |
|---|---|
| `npx ng build --configuration development` | ✅ built. Sass `@import` deprecation warnings only, all pre-existing. This proves the `[guidanceAsTooltip]` template binding type-checks, which Jest with `NO_ERRORS_SCHEMA` cannot |
| `npx ng lint --quiet` | ✅ All files pass linting |
| Scoped Jest `(ipsr-general-information.component\|lead-contact-person-field.readonly).spec` | ✅ 2 suites, 107/107 |

## 6. Requirement Coverage

Clause-level. Evidence comes from test-report.md §7, cross-checked against the code.

| Requirement · clause | Owning task | Code evidence | Test evidence | Result |
|---|---|---|---|---|
| R-1 · 1.1 P25 typed-unpicked → no request, "not found" | T-1 → T-2 | guard has no portfolio check (`ipsr-general-information.component.ts` `onSaveSection`) | Scenario 1.1 | PASS |
| R-1 · 1.1 `BUT must NOT send null / alter stored contact` | T-1 | early `return` before `PATCHIpsrGeneralInfo` | 1.1 (not called, body untouched) + manual A (kept after reload) | PASS |
| R-1 · 1.2 P22 | T-1 | same | 1.2 | PASS |
| DD-2 unresolved child blocks | T-1 | `?.` → `undefined` → `!undefined` = true | DD-2 case | PASS |
| R-2 · 2.1 accepted saves, *carrying the name* | T-1 (+ /akili-test) | `acceptTypedNameAnyway` sets `queryCameFromHydration` + body; guard exempts it | 2.1 stub cases + real-method payload case (P22/P25) | PASS |
| R-2 · 2.1 `AND IT MUST NOT show "not found"` | T-1 | guard branch not entered | `showContactError === false` | PASS |
| R-2 · 2.2 loaded free-text saves | T-1 | exemption via `queryCameFromHydration` (set in the field's `ngOnChanges`) | 2.2 P22/P25 (stubbed flag; field hydration tested by the archived specs) | PASS |
| R-2 · 2.3 picked / blank saves | T-1 | `selectedUser` / `trim()` short-circuit | 2.3 + existing cases | PASS |
| R-3 · 3.1 tooltip when flag on | T-2 | `[guidanceAsTooltip]="guidanceAsTooltip()"` | 3.1 on (DebugElement property) + build | PASS |
| R-3 · 3.1 `BUT must NOT change when flag off` | T-2 | the signal passes the flag through | 3.1 off | PASS |
| NFR data integrity (`AC-1`) | — | as R-1 | as R-1 | PASS |
| NFR backwards compatibility | — | no server, contract or field-behavior change (diff) | readonly spec 7/7 | PASS |
| NFR regression safety | — | one test inverted (old `:483`), recorded in execution.md | 107/107 | PASS |

No `PRODUCT_BUG`, and no deferred or flaky entries.

## 7. Linting & Code Quality

Lint is clean (§5). Spec findings: none.

**4R advisory (non-gating):**

| Lens | Note |
|---|---|
| Risk | The guard rule is now duplicated in two consumers. It is kept in sync by convention: the field's `CLAUDE.md` Traps entry and the rationale comments in both files. Proposal Option C (a shared helper) remains the structural fix if a third consumer appears |
| Reliability | `UserSearchService` is a root singleton, so its state can carry over from one result or package to the next (proposal R3). This was already true before the change and affects Results as well; it is out of scope |
| Readability | An old test title (`should skip contact validation when searchQuery is empty even if isP22 is true`) still names `isP22`, which the rule no longer uses. The test itself stays valid |
| Carried from execution.md | T-1 ADVISORY "2.1 checks the call, not the payload": **resolved** by the `/akili-test` payload case. "2.1 and 2.2 bodies identical": still open, cosmetic |

## 8. Design Conformance

| Decision | Check | Result |
|---|---|---|
| DD-1 mirror Results verbatim | Diff of the guard vs `rd-general-information.component.ts:390-398`: same expression and side effects; `@ViewChild` matches `:34` | PASS |
| DD-2 optional chaining | `this.leadContactPersonField?.queryCameFromHydration` | PASS |
| DD-3 IPSR opts into the tooltip | Binding present; field comment updated to "IPSR opts in, Bilateral does not" | PASS |
| Proposal non-goals | No server, SQL, green-check, Results or Bilateral change; field change is comment-only | PASS |
| Proposal success criteria 1–6 | 1–4 via tests + manual A/B, 5 via 3.1 + build, 6 via the RED→GREEN record | PASS |

**Cross-document figure check:**
- The RED count (6 of 98), the green count (105, now 107) and the list of 5 files agree across tasks, execution and test-report.
- **WARN V-2:** execution.md *Budget tripwire* says "Actual **+196 / −10** … **within budget**" against a stated tripwire of ~120 LOC, and in the same section says "overrun accepted implicitly" and "Escalated to the user at the gate". The tripwire did fire. The text should say fired and accepted, not "within budget". This is the same LOC under-count pattern already tracked as `KZ-REH-1`.
- Minor: the proposal cites the doc comment at `:56-58`, while design and tasks cite `:55-59`. The same block is meant; harmless.

## 9. Test Evidence Summary

Taken from test-report.md (PASS): 1 frontend unit suite, run inline. The author's TDD cases are cited, and 2 cases were added to prove the payload. The accepted gap is that there is no automated real-browser flow; the user's manual reproductions A and B stand in for it. **The added test is not committed yet**: it is in the working tree of `ipsr-general-information.component.spec.ts`.

## 10. Agent Guide / Constitution Impact

execution.md has no `## Constitution Impact` block, and none is needed: no module, boundary or public surface changed. The field's `CLAUDE.md` was updated, with a Traps entry and its `Verified:` line re-stamped for this spec, in the same commit, as `docs/COMPONENT-DOCS.md` requires. **PASS**

**WARN V-3 (follow-up, out of scope by design):** proposal **OQ-1** is still open. The IPSR green check requires only a non-empty `lead_contact_person`, while Results P25 requires `lead_contact_person_id`. So "use this name anyway" turns IPSR green but may leave a 2026 Result grey. Resolving it needs a PO decision and possibly a separate SQL spec. Proposal **OQ-2** (Jira ticket) is also still open.

## 11. Remediation

| # | Finding | Fix | Effort |
|---|---|---|---|
| V-1 | tasks.md T-2 DoD boxes unticked | Tick the 5 boxes, each citing its execution.md evidence | 1 min |
| V-2 | execution.md budget line says "within budget" | Reword to "tripwire fired (+196 vs ~120), accepted by the user". Kaizen should record it against `KZ-REH-1` | 1 min |
| V-3 | OQ-1 green-check divergence (and OQ-2 ticket) open | Accept as follow-up: run `SHOW CREATE FUNCTION validation_general_information_P25;`, get a PO decision, open a separate spec if SQL changes | follow-up |
| — | `/akili-test` payload test uncommitted | Commit it with the spec docs (after your go-ahead) | — |

### Remediation outcome (2026-09-28, user chose "fix all")

| # | Outcome |
|---|---|
| V-1 | ✅ Fixed. The 5 T-2 DoD boxes in tasks.md are ticked, each citing its evidence |
| V-2 | ✅ Fixed. The execution.md budget line now says the tripwire fired and the user accepted it. Correction sweep: no other "within budget" claim remains in the spec folder |
| V-3 | ✅ **Accepted by the user as a follow-up** (OQ-1 green-check divergence, OQ-2 ticket). Not part of this spec |

## 12. Archive Readiness Recommendation

**Ready to archive.** V-1 and V-2 are fixed, and V-3 is accepted as a follow-up. No FAIL findings remain.

```text
/akili-archive bugfix/ipsr-lead-contact-save-guard
```
