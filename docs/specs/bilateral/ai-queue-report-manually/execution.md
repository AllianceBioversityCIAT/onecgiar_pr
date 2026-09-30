# Execution Log — "Report manually" Opens the Normal Create Drawer

## Document Control

| Field | Value |
|---|---|
| **Spec Path** | `docs/specs/bilateral/ai-queue-report-manually/` |
| **Approval Mode** | gated (continue/pause gate after every task) |
| **Branch** | `JuanGuzman-io/p2-3853-jira-understanding` |
| **Base commit** | `e7ca42ce6` |
| **Started** | 2026-09-30 |
| **Leader** | Claude Opus 5.5 (T1) |
| **Budget (design §10)** | 4 tasks · ~220 LOC · 1–2 review rounds per code task |
| **Pre-flight** | branch confirmed · `onecgiar-pr-client/src/environments/environment.ts` present · `.codegraph/` present |
| **Unattributed tree state at start** | `package-lock.json` (root) modified before this run — not touched, not committed by this run |

## Task Execution History

### ARM-T-1 — Flow service: `beginFromJob`, `externalEntry`, close on path change — PASS (attempt 2)

- **Skills:** `angular-developer`, `tdd` (as listed) · **Effort:** attempt 1 `high` (async race guard + router side effect; one level above the T2 default)

#### Attempt 1 — FAIL

- **Files changed:** `onecgiar-pr-client/src/app/pages/bilateral/services/bilateral-manual-create-flow.service.ts`, `…/bilateral-manual-create-flow.service.spec.ts`, `onecgiar-pr-client/src/app/internationalization/bilateral-manual-create.copy.ts` (+338 / −10)
- **Implementer verification:** red run with stubs → 12 assertion-level reds. Falsifiers observed red: seg-3 check (spec:297), token (spec:367), open-before-fetch (spec:348), full-URL compare (spec:448). Flow jest 34 passed. `tsc -p tsconfig.app.json` clean. `tsc -p tsconfig.spec.json` has pre-existing errors in other files, none in the touched files. Lint passes. Consumer suites (drawer host, creator, panel) green.
- **Evidence re-run (Leader, inline):** `VERIFIED`. Scoped jest (flow + drawer host + creator): 176/176. App tsc clean. Spec tsc: no errors in the touched files. Lint passes.
- **Reviewer:** `FAIL`. Issue 1, verbatim summary: close on path change works only for drawers opened by `beginFromJob`. `openPathAtEntry` is written only in `beginFromJob` and never cleared. The `NavigationEnd` listener is wired lazily on the first `beginFromJob`. As a result:
  - (a) a drawer opened by `beginFromProject` or `openDrawerForManual` with no prior job never closes on a path change;
  - (b) after a job open, a later manual open on another path closes on any `NavigationEnd`, including a query-only one.
  - Violates `design.md` §7.1, `ARM-DD-6` and the tasks.md T-1 text ("path recorded at open").
  - Remediation: record the path on every open, clear it in `closeDrawer()`, wire the listener on every open, and add tests for non-job opens.
- **Advisory (attempt 1):**
  - (reliability) A navigation while the catalogue is in flight still opens the drawer on the new page. Bump the token, or compare the current path before `beginFromProject`.
  - (reliability) The not-found and error branches close a drawer opened some other way while the fetch was pending. Acceptable under R-4 B.
  - (readability) `Number(p.id) === projectId` coerces only one side.
  - (readability) A comment justifies production wiring by the test-mock shape.
- **runtime events:** none
- **Leader adjudication:** the FAIL is in scope. T-2 depends on T-1 for DD-6. Fixing it means wiring `router.events` for every open, and the Router mocks in `bilateral-result-creator.component.spec.ts` and `bilateral-projects-panel.component.spec.ts` lack `events`. **User decision, 2026-09-30:** attempt 2 may add `events` to those two mocks, as a fixture-only change with no assertion changes. This is a recorded deviation from T-1's Consumers wording, "keep passing unchanged".
- **Budget note:** T-1 attempt 1 alone is +338 LOC against the spec-wide ~220 estimate. To be escalated at the T-1 gate.

#### Attempt 2 — PASS

- **Effort:** `xhigh` (bumped one level for the rework). Resumed the same Implementer context. Reviewer resumed in its own context.
- **Files changed (cumulative):**
  - `bilateral-manual-create-flow.service.ts` (+137)
  - `bilateral-manual-create-flow.service.spec.ts` (+264)
  - `bilateral-manual-create.copy.ts` (+6)
  - `bilateral-home/components/bilateral-projects-panel/bilateral-projects-panel.component.spec.ts`: fixture-only, adds `events: new Subject()` and `url` to `mockRouter`. This is the user-approved deviation.
  - Total: +406 / −13.
- **Change:**
  - `recordOpenPath()` is called by `beginFromProject` and `openDrawerForManual`.
  - `closeDrawer()` clears the recorded path.
  - The `NavigationEnd` subscription is wired unconditionally in the constructor.
  - The success branch re-checks `pathAtClick` before opening (advisory-grade item 1).
  - The comment tied to the test-mock shape is removed (advisory-grade item 2).
  - Two new tests: a `beginFromProject` open followed by a path change closes; a job open, close, manual open on another path, then a query-only change stays open.
- **Implementer verification:**
  - Falsifiers 1–4 re-confirmed red.
  - Falsifier 5 (path recorded only in `beginFromJob`) turns the new `beginFromProject` test red.
  - Flow jest: 36 passed.
  - App tsc clean. Lint passes.
  - Consumer suites (drawer host, creator, panel): 192 passed.
- **Evidence re-run (Leader, inline):** `VERIFIED`.
  - `npx jest` over the flow service, drawer host, creator and bilateral-home: 228/228.
  - `tsc -p tsconfig.app.json` exits 0.
  - `tsc -p tsconfig.spec.json` still errors in the panel spec (:64, :75, :86, `as BilateralCenterResult` casts, present at HEAD) and in the drawer-host spec (:18, an untouched file). No errors in the new code.
  - `ng lint --quiet` passes.
- **Reviewer:** `PASS`.
  - Issue 1 (a) and (b) are resolved.
  - No regression against §7.1–7.3, §8, DD-2, DD-4, DD-6 or R-4 A (deferred `Subject` kept).
  - R-3 B entries are intact.
  - The deviation stayed fixture-only.
- **ADVISORY (final verdict):**
  - (risk, **forward pointer to ARM-T-3**) `ai-processes-drawer-host.component.spec.ts:53` provides `Router` as `{ navigate: navigateSpy }` with no `events`. Once T-3 injects the flow service into that host, the service's constructor throws unless the spec mocks the flow service or adds `events` to the Router mock.
  - (reliability) The `error` branch of `resolveJobProject` lacks the `pathAtClick` re-check, so the toast can show on a page the user navigated to.
  - (readability) The comments at flow.service.ts:414-418 and :421-425 cite "Reviewer FAIL, attempt 1". Review history belongs here, not in code.
- **runtime events:** none
- **Requirements covered:**
  - `ARM-R-1` A/B (state half)
  - `ARM-R-2` A, B, C, D (routing half)
  - `ARM-R-4` A, B, C
  - `ARM-NFR-2`, `ARM-NFR-3`
  - `design.md` §7.1–7.3, DD-2, DD-4 (rule), DD-6
- **Decisions made:**
  - The user approved the fixture-only Router mock change in consumer specs (see attempt 1 adjudication).
  - `tdd` was kept as listed.
- **Issues encountered:**
  - Review rounds: 2, which is within the 1–2 budget.
  - LOC: +406 for T-1 alone, against the spec-wide ~220 estimate. Specs account for ≈276 of these lines. **Budget tripwire fired; escalated at the T-1 gate.**
- **Final verification:** `VERIFIED` + Reviewer `PASS`.

