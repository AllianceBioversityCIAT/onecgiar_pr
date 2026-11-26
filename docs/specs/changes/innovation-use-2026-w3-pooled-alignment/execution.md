# Execution Log — Innovation Use 2026: W3/Bilateral aligned with the pooled form

## 1. Document Control

| Field | Value |
|---|---|
| Spec path | `changes/innovation-use-2026-w3-pooled-alignment` |
| Approval Mode | gated |
| Branch | `qa-development-2026-ss` (base `990646d3e`) |
| Leader | Claude Opus 5.5 (T1) |
| Implementer | general-purpose subagent on `sonnet` (T2), loads `.agents/implementer.md` |
| Reviewer | general-purpose subagent on `opus` (T3), loads `.agents/reviewer.md`, read-only |
| Started | 2026-11-26 |

**Run notes**

- The project's Step 8E wrappers (`.claude/agents/akili-*.md`) were not loaded, because the session started in `C:\Users\User`, outside the repo. Each worker was spawned as a general-purpose subagent told to read its own persona file first, with the wrapper's model binding (Implementer `sonnet`, Reviewer `opus`). `author ≠ auditor` holds.
- `akili doctor --agents` (v2.44.0): `leader.md` → `primary-instructions` is **OUTDATED** (it matched 2.36.0), and `tester.md` → `context-alignment` is CUSTOM-EDITED. The implementer and reviewer personas are current. `--fix` was **not** run, because the shared-file write discipline forbids editing `.agents/` on this branch. This is pending for the apply-capable branch (`staging`).
- Pre-flight baseline: `npx jest --silent --reporters=summary --no-coverage <type-innovation-use> <innovation-use-form>` gave `Test Suites: 5 passed, 5 total · Tests: 470 passed, 470 total`.
- The working tree holds unrelated uncommitted `rir-breeding-exclusion` work. It was left untouched and is never staged with this spec.
- `docs/specs/kaizen-log.md` is absent, so no Active Lessons were applied.

## 2. Task Execution History

### IWA-T-1 — W3 2026 layout: Organizations in main block, no Addressing demands, pooled labels

| Field | Value |
|---|---|
| Final status | **PASS** |
| Date | 2026-11-26 |
| Attempts | 1 |
| Requirements covered | IWA-R-1 (2026 order, 2025 parity, TBD, not MDS, never twice), IWA-R-2 (hidden, value kept, 2025 shown), IWA-R-3, IWA-R-5 (client-only diff) |
| Skills / effort | `angular-developer`, `tdd` (as in task) · effort `medium` (default) |

**Attempt 1**

- **Files changed:** `onecgiar-pr-client/src/app/pages/bilateral/components/section-type-specific/type-innovation-use/type-innovation-use.component.html`, `…/type-innovation-use.component.spec.ts`, `…/type-innovation-use/CLAUDE.md`. The `.ts` needed no change. `git diff --stat`: 3 files, +180 / −32.
- **Implementation:** a single `ng-template #organizationsBlock`, with two outlets switched by `currentUseTotalLabels` / `!currentUseTotalLabels`. The main-block outlet sits inside the TBD `!== true` block and the `[inert]="readOnly()"` wrapper. "Addressing demands" is wrapped in `@if (!currentUseTotalLabels)` in `actorCard` and `organizationCard`. The add-button `[name]` is gated.
- **Red (Implementer, unchanged template, new real-template describe):** 3 failed / 4 passed.
  - Test 1: `expect(orgs).toBeGreaterThan(actors)` → `Expected: > 0  Received: -1`
  - Test 4: `Expected substring: not "Addressing demands"`
  - Test 6: `Expected: ArrayContaining ["Add actor", "Add organization", "Add other"]  Received: ["Add another actor", "Add other"]`
  - Tests 2, 3, 5 and 7 passed on the old code, as expected: they guard behaviour that already exists (2025 parity, TBD, payload preservation, MDS list).
- **Green (Implementer):** jest folder `Tests: 193 passed, 193 total` · `ng build --configuration development` completed.
- **Consumer grep:** `git grep -n "Add another actor\|Add another organization\|Addressing demands" -- '*.spec.ts' '*.cy.ts'` → only the new spec lines (2198–2228).
- **Evidence re-run (Leader, inline, non-author): VERIFIED**
  - `npx jest --silent --reporters=summary --no-coverage src/app/pages/bilateral/components/section-type-specific/type-innovation-use` → `Tests: 193 passed, 193 total`
  - `npx ng build --configuration development` → exit 0, `Output location: …\dist\onecgiar-pr-client`
- **Falsifier probes (Leader, temporary mutations, files restored from backup; diff stat identical afterwards):**
  - Organizations in both positions (full-metadata `@if (!currentUseTotalLabels)` → `@if (true)`) → test 1 fails `Expected: 1  Received: 2`.
  - `buildPayload` actors mapped to `addressing_demands: null` → test 5 fails `Expected: "x"  Received: null`.
- **Reviewer verdict:** `STATUS: PASS`. The diff satisfies IWA-R-1/R-2/R-3/R-5 and DD-1..DD-4, and all 7 tests meet the disqualifiers. `actorCard` has a single outlet (current use); the 2030 projection block was already removed (INC-168060), so hiding the field there does not reach the projection.
- **runtime events:** none.

**Not Done / Assumptions (Implementer, verbatim):**

> - I did not run the other two falsifiers (the `[(ngModel)]` + `null` fallback, and rendering Organizations in both positions); only the revert-the-template falsifier was observed, as the red run above.
> - The jest output shows `NG0303: Can't bind to 'inert'` console noise. It comes from existing `[inert]` bindings in the template when it is rendered for real, and it does not fail any test.
> - In the 2025 label test I expand Full metadata before checking "Add another organization", since 2025 keeps Organizations there.

The Leader's falsifier probes above closed the only owed item (the two falsifiers that were not run). The other two items are assumptions, not owed work, so there was no continuation.

**ADVISORY (Reviewer, 4R — not gating):**

- READABILITY: `#organizationsBlock` sits under the comment "One actor card and one organization card, shared by current use and the 2030 Use Projection…" (`.html:361-363`). That comment now precedes the wrong template, and its 2030 part is stale.
- RELIABILITY: no assertion covers the Organizations tile (`data-testid="iu-totals"`) for the new main-block position. The wiring pre-exists (P-2), and T-3 covers it visually.
- RELIABILITY: test 3 (TBD) checks only the collapsed state.
- RISK: the NG0303 `inert` console noise in real-template specs.

**Decisions made:** none beyond the spec. No execute-time spec edits.

**Issues encountered:** none.

**spawns:** Implementer 21 calls, 110,347 tokens, ended partial (Not Done / Assumptions) · Reviewer 10 calls, 78,293 tokens, ended complete.

**Budget running totals:** tasks 1/3 · LOC +180/−32 (≈180 budget for the whole spec; T-1 alone reaches it) · review rounds 1/4.

**Final verification:** jest 193/193 green · build green · client-only diff.

**Continue gate (2026-11-26, Santiago):** LOC budget overrun accepted ("acepto el sobrecosto"); commit of T-1 approved (`63c79f70e`); continue with IWA-T-2.

### IWA-T-2 — Remove the two examples from the shared Farmers copy

| Field | Value |
|---|---|
| Final status | **PASS** |
| Date | 2026-11-26 |
| Attempts | 1 |
| Requirements covered | IWA-R-4 (phrases gone on both screens, rest word for word, one place only) |
| Skills / effort | `angular-developer` (as in task) · effort `low` (copy-only edit; deviation from the `medium` default because the task is mechanical) |

**Attempt 1**

- **Files changed:** `onecgiar-pr-client/src/app/shared/components/innovation-use-form/farmer-follow-up.ts`, `…/innovation-use-form.component.spec.ts`, `…/innovation-use-form/CLAUDE.md`. 3 files, +14 / −6.
- **Red (Implementer, new assertion added before the constant changed):** `Tests: 1 failed`. The failing test is `does not contain the removed examples (IWA-R-4)`, with `Expected substring: not "climate advisories; "` at `innovation-use-form.component.spec.ts:2041:33`.
- **Green (Implementer):** `Test Suites: 5 passed, 5 total · Tests: 478 passed, 478 total` (innovation-use-form and W3 type-innovation-use folders).
- **Grep (Implementer):** `git grep -n "climate advisories\|actively used a digital tool" -- onecgiar-pr-client onecgiar-pr-server` → 3 hits: `innovation-use-form/CLAUDE.md:73` (the amendment note) and `innovation-use-form.component.spec.ts:2041,2042` (the new `not.toContain` assertions). No hits in production code.
- **Evidence re-run (Leader, inline, non-author): VERIFIED**
  - jest on both folders → `Tests: 478 passed, 478 total`.
  - `git grep … ':!*.spec.ts' ':!*.md'` → 0 hits (exit 1).
- **Falsifier probes (Leader, temporary mutations, file restored from backup; diff stat identical afterwards):**
  - Drop `market information; ` → the exact-equality expectation fails.
  - Put `climate advisories; ` back → the new assertion fails with `Expected substring: not "climate advisories; "`.
- **Reviewer verdict:** `STATUS: PASS`. Both descriptions match the task's "Expected text after" character for character; labels and codes are untouched; the tests read the imported constant, so the Disqualifier does not apply.
- **runtime events:** none.

**Spec tension (Reviewer, carried to the continue gate):** the task's Verification line requires `git grep` over both packages to return 0 hits. The same task requires an assertion that neither phrase appears, and that assertion necessarily contains the phrases. Both cannot hold. The DoD reads "grep 0 hits **in code**", which production code meets (the grep excluding `*.spec.ts` and `*.md` returns 0 hits). A one-line amendment to the Verification line is proposed at the gate.

**ADVISORY (Reviewer, 4R — not gating):**

- RISK/traceability: record the grep scope and the reason for it (done above).
- READABILITY: the `CLAUDE.md:73` amendment quotes the removed phrases word for word, which adds an avoidable grep hit.

**Decisions made:** effort `low` instead of `medium` (copy-only). No execute-time spec edits.

**Issues encountered:** none.

**spawns:** Implementer 15 calls, 67,154 tokens, ended complete · Reviewer 7 calls, 63,958 tokens, ended complete.

**Budget running totals:** tasks 2/3 · LOC +194/−38 (budget ≈180; overrun accepted at the T-1 gate) · review rounds 2/4.

**Final verification:** jest 478/478 green · 0 phrase hits in production code.

**Continue gate (2026-11-26, Santiago: "sí a las dos"):** the spec-tension amendment is approved, and the commit of T-2 is approved. Execute-time spec edit: `tasks.md` → IWA-T-2 **Verification** grep is now scoped with `':!*.spec.ts' ':!*.md'`, with the reason inline. This does not change the meaning of IWA-R-4 or of the DoD ("0 hits in code"). IWA-T-3 is blocked until the merge to `performance-refactor` and the PRTest deploy; next steps are `/akili-test` and `/akili-validate`.
