# Execution — Bilateral extra geography as optional metadata

## Document Control

- **Spec:** `docs/specs/bugfix/bilateral-geography-extra-metadata`
- **Mode:** gated
- **Started:** 2026-09-24
- **Branch:** `performance-refactor`
- **Baseline:** tracked tree clean; spec documents were already untracked before execution.
- **Commit:** not authorized by the user; no commit will be made in this run.

## Task Execution History

### BIL-GEO-T-1 — Make bilateral extra geography optional, preservable metadata

- **Status:** complete (`[x]`); direct completion authorized by the user, bypassing the remaining AKILI execution/review steps.
- **Attempts:** 0 (implementer not yet dispatched).
- **Skills selected:** `angular-developer`, `spartan`, `ui-ux-pro-max`, `tdd`. Spartan MCP tools are not available in this session; the task reuses existing custom `pr-*` controls and does not add a Spartan primitive.
- **Decision:** no server/API/schema/migration edits; preserve client-side MDS scope, optional metadata, and W1/W2 boundaries per approved spec.

#### Attempt 1 — Implementer PASS report, independent verification, Reviewer FAIL

- **Implementer:** reported editor/drawer changes; files changed: bilateral Geography component/template/styles/spec/Cypress; bilateral review drawer component/template/spec; drawer geography lock Cypress; new editor and drawer template harnesses.
- **Implementer-reported verification:** pre-fix editor Jest had 5 behavioral assertion failures (not setup errors); post-fix focused editor/drawer Jest 289/289, W1/W2 client consumers 232/232, server geographic/IPSR consumers 17/17, client lint and build passed.
- **Leader evidence re-run:** client `npx jest --runInBand --no-coverage src/app/pages/bilateral/components/section-geography/section-geography.component.spec.ts src/app/pages/bilateral/components/section-geography/section-geography.template.spec.ts src/app/pages/result-framework-reporting/pages/bilateral-review/components/result-review-drawer/result-review-drawer.component.spec.ts src/app/pages/result-framework-reporting/pages/bilateral-review/components/result-review-drawer/result-review-drawer.geography-template.spec.ts src/app/shared/services/fields-manager.service.spec.ts src/app/pages/results/pages/result-detail/pages/rd-geographic-location/rd-geographic-location.component.spec.ts` — PASS, 6 suites / 527 tests. Existing Angular component-ID collision warning appeared in drawer suite.
- **Leader evidence re-run:** server `npx jest --runInBand --forceExit src/api/results-framework-reporting/geographic-location/geographic-location.service.spec.ts src/api/ipsr/innovation-pathway/innovation-pathway-step-four.service.spec.ts` — PASS, 2 suites / 17 tests.
- **Leader evidence re-run:** client `npx ng lint --quiet` — PASS. `npm run build` — PASS; existing Sass/CommonJS/bundle-budget warnings remain.
- **Cypress environment:** local contract requires Node 20; `node -v` returned `v22.23.2`. `localhost:4200` was unavailable (`curl` connection failure). Cypress was not run under this environment.
- **Reviewer:** `STATUS: FAIL`.

> STATUS: FAIL
>
> ISSUES:
>
> 1. **A late geography response can overwrite the active result.** In `section-geography.component.ts:218–250`, the GET callback does not verify that its captured `resultId` remains current before updating either body, the tracker, or `loadedResultId`. Reproduction: request A, switch to B, resolve B, then resolve A. A overwrites B’s geography, and `loadedResultId = A` hides B’s Full Metadata. A subsequent main-geography save can serialize A’s optional metadata for B.
>    - **Violated rule:** `design.md` §6.2 requires disclosure “only after the current result’s geography load completes,” preventing stale values during switches; §4 and R-2/AC-4 require preserving the result’s existing metadata.
>    - **Remediation:** Reject obsolete responses before any state mutation, or cancel superseded requests. Add a deferred-response regression covering both completion orders and verifying B’s saved metadata and disclosure state.
>
> 2. **Required rendering and submission evidence remains incomplete.** Both new template suites replace component imports with `CommonModule` and `NO_ERRORS_SCHEMA`. They exercise the shipped conditional markup, but the controls are inert unknown elements. Counting their tags does not establish that saved `false` displays “No,” optional controls lack required indicators, values render correctly, or the drawer actually locks editing. Neither rendering matrix includes saved `true`, countries, or sub-national values. The changed Cypress lock now covers only the remaining main geoscope component, leaving its replacement extra controls without equivalent coverage. No added test exercises the production Submit for Review gate.
>    - **Violated rule:** `requirements.md` §11; `design.md` §10; `tasks.md` BIL-GEO-T-1 verification and definition of done explicitly require saved false/true and child-only rendering, required-state/read-only behavior, and submission-path coverage.
>    - **Remediation:** Retain the useful conditional-markup tests, but add real-control behavioral coverage for the missing scenarios. For drawer permission tests, lower global `RolesService.readOnly` and verify both non-admin locking and an editable admin falsifier. Add a production tracker-to-submission-gate regression. Environment-dependent browser execution may remain explicitly pending under the task’s stated exception.
>
> SUMMARY: The diff correctly removes extra fields from bilateral completeness/tracking, leaves main-geography checks intact, and preserves nullable answers and loaded child data in both serializers. Role bindings remain present, and there are no API/server/schema/W1/W2 changes in the supplied patch.
>
> Validation evidence supplied by the Leader—527 client tests, 17 server tests, lint and build passing—is consistent with the reviewed changes, but does not close the gaps above. Cypress remains unrun because the required local environment is unavailable.
>
> ADVISORY: Readability — the section guide and legacy `requiresExtraScopeAnswer` helpers still describe mandatory behavior. Record their cleanup through the applicable documentation workflow.

- **Outcome:** attempt 1 rejected; task remains `[~]`. Attempt 2 will address the stale-response race and add behavioral evidence for shipped controls, the drawer read-only gate, and the production submission gate. The advisory does not expand task scope.

#### Attempt 2 — Paused at budget tripwire

- **Status:** incomplete; no Reviewer verdict for attempt 2.
- **Changes made:** editor geography response now rejects obsolete result loads; editor spec adds deferred A→B/B→A coverage; editor shipped-template harness now uses real `CustomFieldsModule`/`GeoscopeManagementModule` controls; drawer shipped-template harness now uses real controls and has additional behavioral/role assertions; drawer template exposes labels for saved child selections.
- **Partial evidence:** pre-fix deferred A→B/B→A regression failed when A resolved after B (`loadedResultId`: expected 78, received 77). Post-fix deferred regression has not been rerun. Editor real-control shipped-template harness passed 5/5. Drawer conditional harness previously passed 3/3 before the latest added assertions; latest role/value matrix is unrun.
- **Not done:** production bilateral creator Submit for Review gate regression is absent. Attempt-2 consumer suites, focused full Jest suites, lint, build, and Cypress have not been rerun. Cypress environment remains unavailable (Node 22.23.2; local client not serving).
- **Budget tripwire:** approved design budget is 100–140 LOC. Before attempt 2, the implementation already contained at least 382 added code/test lines (216 tracked diff additions + 166 lines in the two new template specs), exceeding the upper estimate by at least 242 LOC; attempt 2 added further lines. Cause: actual shipped-template control harnesses, deferred result-switch regression, and submission-gate coverage require more test infrastructure than the design estimate allowed. Per AKILI Execute Step 2.4, work is paused for user direction; no further verification or implementation was run after the tripwire. Task remains `[~]`.
- **User direction:** 2026-09-24 — proceed faster and implement directly without the remaining AKILI gates. This supersedes the budget pause above for implementation/verification; it does not authorize a commit.

#### Direct completion and verification

- **Stale response race:** added a current-result guard before asynchronous geography responses can update the component, completeness tracker, or loaded-result state. Deferred A→B and B→A response-order regressions pass.
- **Editor and drawer rendering:** actual controls in shipped-template harnesses cover absent, false, true, and child-only metadata, country/sub-national values, optionality, and review permissions.
- **Submission gate:** added production tracker-to-submit-gate coverage: main geography alone satisfies the geography requirement; removing required main geography blocks submission.
- **Focused client Jest:** 7 suites / 625 tests passed, including bilateral creator, editor, drawer, W1/W2 field managers, and W1/W2 geography consumers.
- **Focused server Jest:** 2 suites / 17 tests passed for geographic location and IPSR consumers.
- **Client lint:** `npx ng lint --quiet` passed.
- **Client build:** `npm run build` passed. Existing Sass deprecation, CommonJS, and bundle-budget warnings remain.
- **Cypress:** not run; repository local contract requires Node 20, current runtime is Node 22.23.2, and no client was serving on `localhost:4200`.
- **Independent AKILI Reviewer:** not run for the direct-completion pass, per user direction to skip the remaining AKILI process. The prior reviewer FAIL findings were addressed with the regressions above; this is not reported as an independent review PASS.
- **Scope check:** no API, server, schema, migration, or secret changes. `git diff --check` passes.
- **Commit:** none.
