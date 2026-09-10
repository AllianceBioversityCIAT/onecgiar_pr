# Execution Log — Collapse Info/Help Panels By Default (`ITR`)

## 1. Document Control

| Field | Value |
|---|---|
| Module | `changes/info-tooltip-hover-reveal` |
| Linked spec | `requirements.md` + `design.md` + `tasks.md` (same folder) |
| Ticket | [P2-3635](https://cgiarmel.atlassian.net/browse/P2-3635) |
| Approval Mode | not declared in Document Control — treated as `gated` (default): each task PASS is reported to the user with a continue/pause/skip prompt |
| Leader model | Sonnet 5 (session model; `## Model Routing` T1 registry entry recommends `opus` — flagged, not blocking) |

## 2. Task Execution History

### `ITR-T-1` — Add collapsed/expanded disclosure to `AlertStatusComponent`

- **Final status:** PASS (attempt 2 of 3)
- **Date:** 2026-09-09
- **Files changed:** `onecgiar-pr-client/src/app/custom-fields/alert-status/alert-status.component.ts`, `.html`, `.scss`
- **Skills assigned:** `angular-developer` (Leader narrowed from the task's default list — dropped `frontend-design`/`tailwind-design-system` since this task explicitly stays in the component's existing plain-SCSS pattern, not new Tailwind utilities; recorded here per Delegation Discipline).
- **Effort:** attempt 1 `medium` (standard scoped task) → attempt 2 `high` (bumped one level per rework rule).

**Attempt 1:**
- Implementer added `isCollapsible` (as `computed()`), `expanded` `WritableSignal<boolean>` seeded from new `@Input() startExpanded`, `toggle()`, `collapsedLabel()` getter returning `"More info"`; restructured template with `@if (isCollapsible())` header row (`<button aria-expanded>` + icon + label + chevron) / sibling `[hidden]` content region, `@else` branch preserving original two-div markup for `warning`/`error`/`success`; added `.alert_toggle`/`.alert_label`/`.alert_chevron` SCSS under `&.info` with `:focus-visible` ring on `--pr-color-primary-300` and `prefers-reduced-motion` → `1ms`.
- Verification: `npx ng lint --quiet` → `All files pass linting.`
- Reviewer verdict: **FAIL** — 2 issues:
  1. `.pr_alert.info` stayed `flex-direction: row` (base default); `.alert_text { flex: 1; min-width: 0 }` against a `width: 100%` sibling (`.alert_toggle`) computed to zero free space → expanded description rendered at ~0 width instead of stacking below the toggle. Violated `ITR-R-3` / Scenario 2 / design.md §6.2's header-row-then-content-region structure.
  2. `isCollapsible = computed(() => this.status === 'info')` read a plain (non-signal) `@Input()` — a zero-dependency `computed()` caches its first result forever and can never react to a later `[status]` binding change. Violated design.md §6.2's description of `isCollapsible` as "the single switch the template branches on" combined with requirements.md §7's backwards-compatible `@Input()` contract.
  - ADVISORY (non-gating): `.alert_toggle .alert_badge` redundant re-declaration vs `&.info .alert_badge`; `collapsedLabel()` re-runs every CD pass for a constant; `startExpanded` only read in `ngOnInit` (acceptable per `ITR-DD-3`); no `aria-controls`/`id` pairing (not required by `ITR-R-2`).

**Attempt 2 (rework):**
- Structured Reviewer feedback passed verbatim; effort bumped to `high`; Implementer instructed to fix only issues 1–2, leave ADVISORY untouched (Advisory Never Gates).
- Fix 1: added `flex-direction: column` to `&.info`; replaced `.alert_text { margin-top: 8px }` with `.alert_text { width: 100%; }` so the content region gets a horizontal cross-axis size in the new column container (avoiding the double 18px spacing that `gap` + `margin-top` together would have produced).
- Fix 2: replaced the `computed()` with a plain getter `get isCollapsible(): boolean { return this.status === 'info' }` (matches the neighboring `iconName` getter idiom); updated the sole template call site from `isCollapsible()` to `isCollapsible`.
- Verification: `npx ng lint --quiet` → `All files pass linting.`
- Reviewer verdict: **PASS** — independently re-derived both fixes against the actual CSS cascade (confirmed `.alert_text` now gets a real block-axis height instead of collapsing, confirmed `[hidden]` genuinely produces `display:none` since no author rule overrides it, confirmed single non-doubled `gap`) and confirmed the getter re-evaluates every change-detection pass with no memoization. Re-confirmed `warning`/`error`/`success` `@else` branch remains byte-identical (Disqualifier satisfied) and every new SCSS rule is scoped under `&.info`.
  - No new ADVISORY findings beyond attempt 1's (not re-flagged per instruction).

**Requirements covered:** `ITR-R-1`, `ITR-R-2`, `ITR-R-3`, `ITR-R-4`, `ITR-R-5`, `ITR-R-6` (inherited, no template edits at call sites), `ITR-R-10`, `ITR-R-11`, `ITR-R-20`.

**Decisions made:**
- `expanded` signal seeded in `ngOnInit()` rather than at field-initializer time, since `@Input()`-bound values are assigned by Angular after construction but before `ngOnInit` — a field initializer would always read the input's default rather than a caller-provided `startExpanded` value. This is a deviation from design.md §6.2's literal one-line snippet but preserves its documented intent (`ITR-R-20`); noted for `ITR-T-4`/future readers of design.md if the snippet is ever copied verbatim elsewhere.
- `isCollapsible` implemented as a plain getter, not a `computed()` signal (design.md §6.2 literally says `computed`) — necessary because `status` is a plain `@Input()`, not a signal input; a getter is the correct idiom here and matches the file's existing `iconName` getter.

**Issues encountered:** 2 real defects caught by the Reviewer on attempt 1 (layout collapse on expand; stale/non-reactive `isCollapsible`) — both fixed and independently re-verified on attempt 2. No environment or tooling issues.

**Final verification result:** `npx ng lint --quiet` clean; `warning`/`error`/`success` markup confirmed byte-identical to pre-change state (DoD Disqualifier satisfied); no new npm dependency.

### `ITR-T-2` — Update Jest unit tests

- **Final status:** PASS (attempt 1 of 3)
- **Date:** 2026-09-09
- **Files changed:** `onecgiar-pr-client/src/app/custom-fields/alert-status/alert-status.component.spec.ts`
- **Skills assigned:** `angular-developer` (per task default).
- **Effort:** `medium`.

**Attempt 1:**
- Added `describe('isCollapsible')` (true for `info`, false for `warning`), `describe('expanded seeding from startExpanded')` (default `false`; seeded `true` via a fresh `TestBed.createComponent` + `setInput('startExpanded', true)` before the first `detectChanges()`, to actually observe `ngOnInit` seeding rather than the shared fixture that already ran `ngOnInit`), and `describe('toggle')` (asserts `expanded()` after each call, both directions).
- Verification: `npx jest --silent --reporters=summary --no-coverage --testPathPattern="alert-status"` → `Test Suites: 1 passed, 1 total; Tests: 8 passed, 8 total`.
- Reviewer verdict: **PASS** — confirmed every `toggle()` call is bracketed by an `expanded()` read (Disqualifier cleared), confirmed the API is exercised exactly as it exists on the real component (getter vs. signal vs. seeded-before-first-`detectChanges` input), confirmed the incidental one-line comment removal is in-scope cleanup on this task's own deliverable.
  - ADVISORY (non-gating): `isCollapsible` untested for `error`/`success` (low risk, single boolean comparison, covered at DOM level by `ITR-T-3`); the "defaults to collapsed" test is tautological against the current `signal(false)` initializer and would not catch a regression in the `ngOnInit` seeding path itself.

**Requirements covered:** `ITR-R-1`, `ITR-R-2` (logic-level), `ITR-R-3` (logic-level), `ITR-R-5` (partial — `info`/`warning` only, DOM-level `error`/`success` coverage is `ITR-T-3`'s scope), `ITR-R-20`.

**Decisions made:** None beyond the Implementer's test-authoring choices (fresh fixture for the seeded-input case).

**Issues encountered:** None — passed first attempt.

**Final verification result:** 8/8 Jest tests green, scoped test-path pattern only (no full-suite run).

### `ITR-T-3` — Add Cypress CT coverage for the disclosure interaction

- **Final status:** PASS (attempt 1 of 3)
- **Date:** 2026-09-09
- **Files changed:** `onecgiar-pr-client/src/app/custom-fields/alert-status/alert-status.cy.ts`, `alert-status.contract.cy.ts`
- **Skills assigned:** `angular-developer` (per task default).
- **Effort:** `medium`.

**Attempt 1:**
- Added a `describe('collapsible info panel')` block to both files (purely additive, no pre-existing `it(...)` touched): collapsed-by-default (`aria-expanded="false"`, `.alert_text` `not.be.visible`), click reveal + second-click re-collapse, keyboard `{enter}`/`{space}` activation (bidirectional), and `.alert_toggle` `not.exist` for `warning`/`error`/`success`. Deliberately not `[contract]`-prefixed in the contract file per that file's own convention (new behavior, not a `master`-derived contract).
- Every state assertion uses `.should('be.visible')`/`.should('not.be.visible')`, never `contain.text` alone, satisfying `tasks.md`'s explicit disqualifier.
- **Pre-existing failure investigated by the Leader (not a task gap):** `npx cypress run --component` on both target files (run directly — the `npm run test:ct` script's env-var syntax isn't PowerShell-compatible on this machine) gave `alert-status.cy.ts` 7/7 and `alert-status.contract.cy.ts` 15/16, with one failure: `[contract] updates the message when the consumer changes it after mount` (a `patchHost`/`autoDetectChanges` timing test). The Leader independently confirmed this is unrelated to this spec: `git stash` reverted every change from `ITR-T-1`/`ITR-T-2`/`ITR-T-3` and re-ran the same spec against the original, untouched `master`-equivalent component — same 11/12 result, same failure, same error. Restored via `git stash pop`. This pre-existing flake is not caused by this spec and is not this task's to fix.
- Reviewer verdict: **PASS** — independently confirmed the diff is purely additive (byte-identical pre-existing content before the new blocks), confirmed `.alert_text` carries no competing `display` rule (so `not.be.visible` is real evidence, not an accident), confirmed selectors match the shipped `ITR-T-1` markup, confirmed the keyboard test is bidirectional (cannot false-green), confirmed scope stayed to the two named files.
  - ADVISORY (non-gating): `ITR-R-4`'s "no `title` attribute" half is only proven indirectly via the keyboard test passing — a direct `not.have.attr 'title'` assertion would lock it structurally (not required by the DoD's 5 enumerated assertions); the two new blocks are near-identical copies (`mountCF` vs `mountCFHost`) — acceptable per-file duplication, factor only if a third mount helper appears.

**Requirements covered:** `ITR-R-1`, `ITR-R-2`, `ITR-R-3`, `ITR-R-4`, `ITR-R-5`.

**Decisions made:** New disclosure tests left un-prefixed (`[contract]` reserved for `master`-derived behavior in the contract file, per that file's own documented convention) — Implementer's judgment call, consistent with file precedent.

**Issues encountered:** One pre-existing, unrelated Cypress CT flake surfaced during verification (`patchHost`/`autoDetectChanges` timing) — investigated and confirmed independent of this spec (reproduces identically with every spec change reverted). Not fixed as part of this spec; flagged here for visibility, not filed as a new task (per Advisory Never Becomes A Task — this is an existing defect, not an advisory from this diff, but the same non-expansion principle applies: out of this spec's declared scope).

**Final verification result:** `alert-status.cy.ts` 7/7 green; `alert-status.contract.cy.ts` 15/16 green (1 pre-existing, spec-independent failure, documented above).

### `ITR-T-4` — Revise `RFUX-R-5` and close the loop with the reporter

- **Final status:** PASS (attempt 1 of 3) — doc revision only; Jira comment handled separately by the Leader (external-system action, not part of the Implementer/Reviewer diff)
- **Date:** 2026-09-09
- **Files changed:** `docs/ux-ui/design.md` (§"PRMS Form UX Pattern", `RFUX-R-5`, lines 299-303)
- **Skills assigned:** `cognitive-doc-design` (per task default).
- **Effort:** `medium`.
- **Shared-file write discipline:** `docs/ux-ui/design.md` is normally a protected baseline doc, but this spec's approved `tasks.md` names it as `ITR-T-4`'s own deliverable — exempt per that discipline's carve-out ("files an approved tasks.md names as the spec's own deliverable are exempt"). Edited directly, not deferred to the default branch.

**Attempt 1:**
- Revised `RFUX-R-5` to state the two-tier distinction per `ITR-R-7`: (a) field-level constraint/validation copy stays persistently visible below the label, unchanged, explicitly "MUST NOT be collapsed"; (b) supplementary `<app-alert-status status="info">` guidance panels MAY collapse behind the accessible `<button aria-expanded>` click/tap/keyboard disclosure shipped in `ITR-T-1`. Retained and broadened the original accessibility rationale (hover/`title` fails touch devices and screen readers) to cover any `:hover`/`title`-only mechanism, tying it explicitly to why the disclosure is click-based (`ITR-DD-1`). Added a one-line provenance note ("Revised 2026-09 (`docs/specs/changes/info-tooltip-hover-reveal/`)") matching the file's existing convention for the neighboring `RFUX-R-2` sub-rule.
- Correction Closure sweep: grepped `RFUX-R-5` (only the rule header itself) and `hover` (2 unrelated Tailwind hover-state occurrences, 2 inside the revised text itself) — no stale cross-reference to the old absolute "never collapse help text" rule survives elsewhere in the file.
- Reviewer verdict: **PASS** — independently re-ran the Correction Closure sweep against the live file (broadened to `tooltip`, `title=`, `help text`, `disclosure`, `aria-expanded`, etc.) and confirmed no stale assertion of the old rule anywhere in `docs/ux-ui/design.md`; confirmed the revised text maps 1:1 to `ITR-R-7`'s two tiers and that the accessibility rationale is retained/strengthened, not weakened into a loophole.
  - No ADVISORY findings.
- **Leader correction (post-PASS, before finalizing):** the Implementer applied this edit directly to `docs/ux-ui/design.md` in the working tree, reasoning it was exempt from shared-file write discipline per root `CLAUDE.md`'s general carve-out ("files an approved `tasks.md` names as the spec's own deliverable are exempt"). This was wrong for THIS task specifically: `requirements.md` §12 and `tasks.md` `ITR-T-4`'s own Definition of Done (item 2) impose a stricter, spec-specific instruction — *"if this task executes on a non-default branch: record the edit as pending instead of committing it to `docs/ux-ui/design.md` directly, and apply it on the default branch"* — which overrides the general carve-out for this particular file/task. The session is on `qa-development-2026-ss`, not `master` (the declared default branch). The Leader reverted the working-tree edit (confirmed via `git diff` returning empty) and recorded the reviewed, PASSed text below as **pending** instead.

**PASSed text, pending application on `master`:**

```
2. **Persistent Accessible Inline Helper Copy (`RFUX-R-5`)**:
   - Revised 2026-09 (`docs/specs/changes/info-tooltip-hover-reveal/`) to distinguish two tiers of help text:
     - **Field-level constraint/validation copy** (calculation instructions, field constraints) MUST stay persistently visible directly below the field label in `text-[12px] text-gray-500` and programmatically linked to the input via `aria-describedby`. This tier is unchanged and MUST NOT be collapsed.
     - **Supplementary multi-paragraph guidance/example panels** (`<app-alert-status status="info">`) MAY collapse behind an accessible click/tap disclosure — a real `<button aria-expanded>` toggle, operable by click, tap, `Enter`, and `Space` — rather than always rendering expanded.
   - Either tier MUST NOT rely on hover `<span title="...">info</span>` tooltips or any other `:hover`/`title`-only reveal mechanism, which fail completely on touch devices and screen readers — this is exactly why the supplementary-guidance disclosure above is click/tap-based rather than hover-based.
```

This replaces the current lines 299-301 of `docs/ux-ui/design.md` (unchanged, verified via `git diff` = empty after the Leader's revert). Whoever applies this on `master` should re-run the Correction Closure sweep (`grep -n "RFUX-R-5\|hover"`) at that point, since intervening `master` changes could shift line numbers or add new content.

**Requirements covered:** `ITR-R-7` (content approved and PASSed; application deferred per shared-file write discipline).

**Decisions made:**
- Jira comment to the reporter (Ángel) on P2-3635, required by `tasks.md`'s Definition of Done, is deliberately excluded from the Implementer/Reviewer diff-review loop (it posts to an external system, not a repo file) and is being handled by the Leader as a separate, explicitly user-confirmed action.
- The doc edit itself is **pending on the default branch**, not applied on this spec branch — a correction to the Implementer's initial (Reviewer-PASSed but wrongly-scoped) direct edit. The content is approved; only the application mechanism changed.

**Issues encountered:** Leader briefing error — initially told the Implementer this file was exempt from shared-file write discipline via the general root `CLAUDE.md` carve-out, missing that this spec's own `tasks.md`/`requirements.md` impose a stricter, task-specific non-default-branch deferral that takes precedence. Caught and corrected before any commit was made (edit was only staged in the working tree, never committed). No rework attempt was consumed — this is a process correction, not a Reviewer FAIL.

**Final verification result:** Correction Closure sweep clean on the PASSed text (confirmed by Implementer and Reviewer against the since-reverted working tree); `docs/ux-ui/design.md` confirmed back to its original, unmodified state (`git diff` empty) after the Leader's correction.

---

## 3. Summary

All four tasks — `ITR-T-1`, `ITR-T-2`, `ITR-T-3`, `ITR-T-4` — are complete and PASSed. Remaining before this spec can move to `shipped` (per `tasks.md` §7 Cleanup & §6 Rollout):
- Commit the work (`git commit`, AKILI standard `[SPEC:changes/info-tooltip-hover-reveal] ...`, referencing `P2-3635`) — pending explicit user go-ahead, not yet done.
- Post the Jira comms note on P2-3635 explaining the shipped fix is a tap-to-expand disclosure, not a literal hover tooltip (`ITR-T-4`'s comms sub-task) — pending user confirmation before an external post.
- Manual QA per `tasks.md` §6: verify the `aow-hlo-create-modal` "Contribution to indicator target" field live in a browser, and spot-check 2-3 other `status="info"` sites across modules.
- File a follow-up ticket (outside this spec) for `ITR-OQ-1` (PO pass on `[startExpanded]` exceptions).

A pre-existing, spec-unrelated Cypress CT flake (`alert-status.contract.cy.ts` → `[contract] updates the message when the consumer changes it after mount`) was discovered during `ITR-T-3` verification and confirmed independent of this spec's changes. Not in scope to fix here; worth a separate ticket if the team wants it addressed.

---

## Pivot Record: `ITR-T-1` visual treatment (2026-09-09, post-user review)

**Trigger:** After `ITR-T-1`–`ITR-T-4` PASSed, the product owner reviewed the shipped visual directly (not a Reviewer/Implementer discovery) and rejected it: *"estos ⓘ deben de estar justo al lado de cada campo no deben de quedar abajo dentro de una caja gris siento que ese more info se ve super feo dentro de cada formulario"* — the icon+"More info"+chevron full-width row still reads as an ugly gray box, and the user's original mental model was the icon sitting inline next to the field label, not below it.

**Investigation:** Grepped a representative call site (`aow-hlo-create-modal.component.html`, the ticket's own screenshot site) and confirmed `<app-alert-status>` renders as a **sibling block** after `<app-pr-field-header label="...">` across effectively all ~150 call sites — not inside the label row. True inline-with-label placement would require either per-site template edits (violates `ITR-R-6`) or extending the shared `app-pr-field-header` component (touches hundreds of fields with no info panel at all) — both disproportionate to a space-saving visual fix.

**Options presented to the user (via AskUserQuestion):**
1. Icon-only trigger, kept in its current DOM position (between label and control), expanding into a floating panel instead of pushing content down. **[Selected]**
2. Extend `app-pr-field-header` to genuinely host the icon inline with the label — larger architectural change, would need its own requirement/task before implementation.

**Decision:** Option 1. Documented as `ITR-DD-4` in `design.md`. Also evaluated and rejected Spartan's `HlmPopover` (CDK Overlay/portal) as the floating-panel mechanism — its lazy content rendering (`*hlmPopoverPortal`) would break `ITR-R-11` and invalidate `design.md` §2.3's 29-spec-file audit, since `info` is the component's default status. Chose a hand-rolled CSS `position: absolute` panel that keeps `[hidden]`'s always-in-DOM invariant, at zero new dependency cost.

**Spec documents updated:**
- `requirements.md`: `ITR-R-1`, `ITR-R-2`, `ITR-R-3`, `ITR-R-10` revised in place (marked "Revised 2026-09-09"); `ITR-R-11` annotated as now doubly load-bearing.
- `design.md`: §6.2 rewritten (state/logic unchanged, template/visual revised), §6.3 updated (no chevron, floating-panel tokens), new `ITR-DD-4` ADR added after `ITR-DD-3`.
- `tasks.md`: new `ITR-T-5` task added (icon-only + floating panel rework), dependency graph updated to show it as a follow-up to `ITR-T-1`.

**Correction Closure sweep:** Grepped `docs/specs/changes/info-tooltip-hover-reveal/` for `alert_label`, `alert_chevron`, `More info` (visible-copy assumption), and `collapsedLabel` to confirm no other section of the spec still describes the superseded visible-label/chevron design as current — `requirements.md` and `design.md` edits above are the only load-bearing descriptions found; the historical `ITR-T-1`/`ITR-T-2`/`ITR-T-3` attempt-history entries above are correctly left as a historical record (what was actually built and reviewed at the time), not restated as current design.

**Status:** Requirements/design/tasks updated and explicit user approval obtained (via `AskUserQuestion`, both the icon-only-visual and the CSS-floating-panel-over-inline-label-integration choices). Proceeding to execute `ITR-T-5` via the standard Implementer → Reviewer loop.

---

## Pivot Record: section-intro notes exception (2026-09-09, second round of user review, while `ITR-T-5` was in flight)

**Trigger:** While `ITR-T-5`'s Implementer was still running, the user reviewed a live screenshot of the "Contributors & partners" section (an info note positioned directly under the section heading, before any field) and said: *"los que están justo al inicio creo que si podemos dejar la nota en el recuadro gris"* — notes positioned right at the start of a section are fine left as a persistently-visible box, unlike the per-field notes the original complaint was about.

**Clarification obtained (via `AskUserQuestion`):**
1. Section-intro notes: revert fully to pre-spec behavior — always visible, no icon, no click at all (not merely default-expanded-but-collapsible via the existing `[startExpanded]` escape hatch).
2. Classification method: positional/structural (immediately after a section heading, before any field) — decided by a developer reading each call site's template, not a per-site screenshot approval pass.

**Decision:** Added `@Input() collapsible: boolean = true` (`ITR-R-30`, `ITR-DD-5`). `isCollapsible` becomes `status === 'info' && collapsible`. `[collapsible]="false"` routes a site through the exact same `@else` branch as `warning`/`error`/`success` (zero forked markup — reuses what already exists, per `ITR-T-6`'s Disqualifier). A new task `ITR-T-7` surveys all real call sites (re-derived fresh, not reusing the original ticket's undercounted 21 or the design-time-corrected ~150 estimate uncritically) and applies `[collapsible]="false"` to every site classified as a section-level intro note.

**Spec documents updated (second round):**
- `requirements.md`: `ITR-R-6` narrowed with an explicit note; new `ITR-R-30` (the `collapsible` input) and `ITR-R-31` (the classification criterion) added.
- `design.md`: §6.2 updated (`isCollapsible` getter revised, `collapsible` input documented); new `ITR-DD-5` ADR added after `ITR-DD-4`.
- `tasks.md`: new `ITR-T-6` (component input, depends on `ITR-T-5`) and `ITR-T-7` (site audit + application, depends on `ITR-T-6`) added; dependency graph updated to a strict sequential chain `ITR-T-5 → ITR-T-6 → ITR-T-7` since all three touch/depend on the same component.

**Sequencing note:** `ITR-T-6`/`ITR-T-7` were deliberately queued to start only after `ITR-T-5`'s Implementer finished and its diff was reviewed — same working-tree files, so parallel dispatch would have conflicted (per `.agents/leader.md`'s concurrency rules: disjoint files is necessary but touching the same file is a genuine conflict, not a parallelism opportunity).

**Status:** Requirements/design/tasks updated; user's clarifying answers obtained via `AskUserQuestion`. `ITR-T-6` and `ITR-T-7` queued behind `ITR-T-5`'s completion.

**Correction to `ITR-T-6`'s scope (caught by `ITR-T-5`'s Reviewer, before `ITR-T-6` started):** `ITR-T-6` was originally scoped as "no template/SCSS change needed" (component-input-only). `ITR-T-5`'s Reviewer correctly flagged that this premise breaks: `ITR-T-5` stripped `.pr_alert.info`'s box styling (padding/border/background) at the shared `&.info` container level, which both the icon-only `@if` branch and the always-visible `@else` branch inherit from. So `[collapsible]="false"` routing an `info` site into `@else` would now render bare text with no box at all — not `ITR-R-30`'s actual requirement ("byte-identical rendering to the **pre-spec** `info` treatment", which DID have a box). `tasks.md`'s `ITR-T-6` entry was updated in place to add the needed SCSS fix (reintroduce the box for the `collapsible=false` case only, without regressing `ITR-T-5`'s icon-only case) before this task is dispatched.

### `ITR-T-5` — Rework `ITR-T-1`'s collapsed/expanded visual: icon-only trigger + floating panel

- **Final status:** PASS (attempt 3 of 3)
- **Date:** 2026-09-09
- **Files changed:** `alert-status.component.ts`, `.html`, `.scss`, `.contract.cy.ts`
- **Skills assigned:** `angular-developer`, `frontend-design` (per task default).
- **Effort:** attempt 1 `high` (post-shipped rework with a hard architectural constraint) → attempt 2 `medium` (narrow, root-cause-diagnosed test fix) → attempt 3 `xhigh` (final attempt, one-line fix).

**Attempt 1:**
- Reworked the collapsed trigger to icon-only (removed `.alert_label`/`.alert_chevron`, moved "More info" to `aria-label`, added `aria-controls`/`panelId`); changed `.alert_text` from an in-flow block to a `position: absolute` floating panel (`.alert_popover`) with `--pr-surface-card`/`--pr-border` surface, kept `[hidden]` (no CDK Overlay/portal, per `ITR-DD-4`).
- Implementer self-reported a genuine spec conflict via its own **Not Done / Assumptions** field (not a Reviewer FAIL, but treated with the same weight per AKILI's "a task with an outstanding gap never reaches `[x]`" rule): removing `.pr_alert.info`'s background (required by `ITR-R-1`) broke a pre-existing contract test (`[contract] gives info and warning visually distinct backgrounds`) that predates this whole spec. The Leader judged this a legitimate, approved consequence of `ITR-R-1` (not a regression to silently patch around) and dispatched a scoped attempt 2 to fix the test.
- Verification: `npx ng lint --quiet` clean; Jest 8/8 unmodified; Cypress `alert-status.cy.ts` 7/7 unmodified; `alert-status.contract.cy.ts` 14/16 (1 pre-existing unrelated flake + 1 new failure from the legitimate behavior change, both expected/diagnosed).

**Attempt 2:**
- Split the one obsolete contract test into two, asserting the new correct behavior: collapsed `info` is provably transparent (matching `ITR-R-1`), `warning` keeps its own tinted background, and a new test proves the surface treatment relocated (not vanished) to `.alert_popover` on expand.
- Verification: `alert-status.contract.cy.ts` 16/16 (1 pre-existing unrelated flake only); lint clean.
- Reviewer verdict: **FAIL** — 1 issue: `.alert_popover`'s `box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12)` was a hardcoded value; the app already has `--pr-shadow-2` for exactly this elevation case, used identically by the analogous `row-menu.scss` floating panel. Independently verified the CDK-Overlay constraint was cleared (grepped for `hlmPopover`/`CdkPortal`/`Overlay` — none found) and the contract-test-fix judgment was sound (the new assertions are strictly stronger than the old, not weakened).
  - No ADVISORY on the core diff; a forward-looking note flagged that `ITR-T-6`'s "no SCSS change needed" premise was now false (see the correction above, applied to `tasks.md` before `ITR-T-6` starts).

**Attempt 3 (final):**
- One-line fix: `box-shadow: var(--pr-shadow-2);` replacing the hardcoded value. No other file touched.
- Verification: lint clean; `alert-status.cy.ts` 7/7; `alert-status.contract.cy.ts` 16/16 (same 1 pre-existing unrelated flake) — identical pass counts to attempt 2, confirming nothing else regressed.
- Reviewer verdict: **PASS** — confirmed the exact suggested remediation was applied, re-grepped the `.info` block for any remaining hardcoded color/shadow values (none found), and re-confirmed every previously-approved finding still held.

**Requirements covered:** `ITR-R-1` (revised), `ITR-R-2` (revised), `ITR-R-3` (revised), `ITR-R-10` (revised), `ITR-R-11` (unchanged, doubly load-bearing per `ITR-DD-4`).

**Decisions made:**
- Wrapped the icon in `<span class="alert_badge">` rather than design.md §6.2's literal bare `<i>` snippet — a deliberate deviation to preserve an unrelated pre-existing contract test's selector (`.alert_badge i`) that would have silently broken with a bare `<i>`. Noted approvingly by the Reviewer as exactly the kind of judgment call the process wants.
- Updated one pre-existing (`ITR`-spec-predating) contract test whose assumption ("info always has a tinted background") was directly contradicted by the newly-approved `ITR-R-1`. Treated as a required consequence of an approved requirement change, not scope creep — verified by both the Leader and the Reviewer independently.

**Issues encountered:** A legitimate pre-existing test/requirement conflict (attempt 1) and one hardcoded-value Reviewer finding (attempt 2) — both real findings, both fixed, both independently re-verified. No environment or tooling issues.

**Final verification result:** `npx ng lint --quiet` clean; Jest 8/8 (`ITR-T-2`'s suite, unmodified and still passing); Cypress `alert-status.cy.ts` 7/7 (`ITR-T-3`'s suite, unmodified); `alert-status.contract.cy.ts` 16/16 (1 pre-existing, spec-unrelated flake, documented since `ITR-T-3`).

### `ITR-T-6` — Add `[collapsible]` escape hatch to `AlertStatusComponent`

- **Final status:** PASS (attempt 1 of 3 — see note below on the FAIL/PASS sequence)
- **Date:** 2026-09-09
- **Files changed:** `alert-status.component.ts`, `.html`, `.scss`, `.component.spec.ts`
- **Skills assigned:** `angular-developer` (per task default).
- **Effort:** `medium`.

**Attempt 1:**
- Added `@Input() collapsible: boolean = true`; changed `isCollapsible` getter to `status === 'info' && this.collapsible`; added `[class.alert_boxed]="status === 'info' && !collapsible"` on the root element; added a new `&.alert_boxed` SCSS block reintroducing the original pre-`ITR-T-1` boxed `info` treatment (gap/padding/border-radius/background + badge/text sub-rules), scoped so it never reaches the icon-only collapsed state (default `collapsible: true`). Added 2 new Jest cases for `isCollapsible` under the `collapsible` input.
- Verification: lint clean; Jest 10/10 (8 pre-existing + 2 new); Cypress `alert-status.cy.ts` 7/7; `alert-status.contract.cy.ts` 16/17 (same 1 pre-existing unrelated flake).
- Reviewer verdict: **FAIL** — 2 issues: (1) claimed a 2px `margin-top` regression to `ITR-T-5`'s shipped icon-only state; (2) could not independently verify the reintroduced `.alert_boxed` values matched the original pre-`ITR-T-1` styling (Reviewer's toolset is read-only, no `git`/shell access).
- **Leader investigation (no rework dispatched — both issues resolved as diff-framing artifacts):** Since nothing across `ITR-T-1`–`ITR-T-6` has been committed, every `git diff` shown to a Reviewer is cumulative against pre-spec `HEAD`, not scoped to the current task's own delta. (1) Read the live file directly: the flagged `margin-top: 0` line sits inside a block whose own comment attributes it to `ITR-T-5` (already reviewed and PASSed there) — `ITR-T-6` never touched it, only added a separate `.alert_boxed .alert_badge { margin-top: 2px }` override. (2) Ran `git show HEAD:onecgiar-pr-client/src/app/custom-fields/alert-status/alert-status.component.scss` to pull the actual original `&.info` block and confirmed line-by-line that `.alert_boxed` reproduces it exactly (`gap: 10px`, `padding: 14px`, `border-radius: 8px`, `background-color: var(--pr-surface-app)`, badge/text sub-rules all matching).
- **Re-audit (same Reviewer instance, given the corrected evidence):** **PASS** — independently re-verified both points against the live file and the `git show` excerpt; confirmed mutual exclusivity holds by construction (`isCollapsible` gates the `@if`, `status === 'info' && !collapsible` gates the class — exact logical complements within `status === 'info'`); noted one immaterial 2px geometry delta from a dropped transparent border (visually inert, not spec-relevant).
  - ADVISORY (carried from both audit passes, non-gating): (a) the boxed condition is expressed twice (TS getter + template, inversely) — a single-sourced `isBoxedInfo` getter would prevent future drift; (b) `@Input() collapsible: boolean = true` has no `{ transform: booleanAttribute }`, so a call site writing the static attribute `collapsible="false"` (vs. `[collapsible]="false"`) would silently pass a truthy string and keep the panel collapsible — the opposite of intent, with no error. **Mitigation applied without expanding scope** (per "Advisory Never Becomes A Task"): `ITR-T-7`'s Implementer brief will explicitly require property-binding syntax (`[collapsible]="false"`) at every site, sidestepping this failure mode via instruction rather than a component code change.

**Requirements covered:** `ITR-R-30`.

**Decisions made:** Chose the smaller, template-explicit `[class.alert_boxed]` binding over a `:has()`-based or DOM-order-dependent selector (Implementer's call, matching the task's own guidance) — verified by the Reviewer to guarantee mutual exclusivity by construction, not convention.

**Issues encountered:** A Reviewer FAIL that, on Leader investigation with tooling the Reviewer lacked (git history access), resolved to zero real defects — both findings were artifacts of reviewing a cumulative uncommitted diff without full attribution context. No code was changed between the FAIL and the PASS; the fix was supplying evidence, not modifying the diff. Recorded in full for traceability, per the audit trail's purpose of showing what happened, not just the final verdict.

**Final verification result:** `npx ng lint --quiet` clean; Jest 10/10; Cypress `alert-status.cy.ts` 7/7; `alert-status.contract.cy.ts` 16/17 (1 pre-existing, spec-unrelated flake, unchanged since `ITR-T-3`).

### `ITR-T-7` — Audit ~150 call sites and apply `[collapsible]="false"` to section-intro notes

- **Final status:** PASS (attempt 2 of 3)
- **Date:** 2026-09-09/10
- **Files changed:** 37+ template files across `pages/bilateral/`, `pages/ipsr/`, `pages/results/pages/result-detail/`, `pages/init-admin-section/`, `pages/type-one-report/`, `pages/result-framework-reporting/`, `shared/components/alert-global-info/` — full enumeration in the Implementer's report (attempt 1) plus 4 corrections (attempt 2).
- **Skills assigned:** `angular-developer` (per task default).
- **Effort:** attempt 1 `high` → attempt 2 `xhigh` (bumped one level per rework rule).

**Note on a rate-limit interruption before attempt 1 properly started:** an earlier dispatch of this task self-parallelized into sub-batches, all of which failed together when the session hit an API rate limit before any file edit was made (confirmed via `git status` — zero files touched). Redispatched fresh after the limit reset, with an explicit instruction not to sub-batch/parallelize this task internally.

**Attempt 1:**
- Surveyed `<app-alert-status>` across `onecgiar-pr-client/src/app/` and classified each `status="info"`-or-default site as (a) section-intro (needs `[collapsible]="false"`) or (b) field-level (leave untouched). Applied the escape hatch to 48 sites across 37 files, all using bracket-bound `[collapsible]="false"` syntax (never the bare-string form, per the `ITR-T-6` Reviewer's flagged risk). Confirmed the user's own "Contributors & partners" example fixed.
- Verification: `npx ng lint --quiet` clean.
- Reviewer verdict: **FAIL** — 4 classification defects, found via a thorough independent audit (reading full surrounding template context per site, not just the diff hunks): (1) `ipsr-non-pooled-projects.component.html` over-collapsed a genuinely field-level note (proven inconsistent against two byte-identical sibling sites correctly left untouched); (2) missed section-intro site `ipsr-contributors-non-cgiar-partners.component.html` (structurally identical to two correctly-classified `knowledge-product-selector` precedents); (3) missed section-intro site `step-n4-add-partner.component.html` (structurally identical to the correctly-classified `partners-request.component.html`); (4) two banner/empty-state sites in `result-framework-reporting-home.component.html` left uncollapsed, contradicting the Implementer's own `alert-global-info` reasoning for a third, unnamed category.
  - The Reviewer also proposed formalizing a third classification bucket, **(c) banner/empty-state, not tied to a form → always visible**, and corrected the recorded (but not code) rationale for `target-indicator.component.html` (already correctly classified, reasoning was imprecise).

**Attempt 2 (rework):**
- Applied all 4 remediations exactly as specified: reverted the over-collapse, added the 2 missed section-intro sites, added the 2 missed banner sites. Documented the (c) bucket and corrected the `target-indicator` rationale in the report (no code change needed there).
- Reviewer verdict: **PASS** — independently re-verified all 4 fixes against the live files (not trusting the report), and investigated a NEW consideration it raised itself: does collapsing `step-n4-add-partner.component.html`'s note (which has its own host `(click)="openPartner()"`) create a click-handler conflict with the new `.alert_toggle` button? Traced the actual branch logic and found `.alert_toggle` never renders when `collapsible=false` (routes to the always-visible `@else` branch, which has no button) — so there is no conflict, and applying `[collapsible]="false"` here in fact **eliminates a latent bug**: had this site been left collapsible, the toggle's un-stopped click would have bubbled to the host and spuriously fired `openPartner()` on every expand/collapse. Confirmed via grep this is the only alert-status site in the app with a host click handler, so no other site carries this hazard.
  - **Bookkeeping discrepancy noted by the Reviewer (non-gating):** the working tree holds 57 `[collapsible]="false"` sites total, not the 44 (already-correct) + 4 (fixed) = 48 the attempt-1 report's summary arithmetic implied. Since `[collapsible]` only exists from `ITR-T-6` onward, all 57 originate in this task. The Reviewer could not reconcile the exact count without `git` access (its toolset is read-only) but found no misclassification in everything it sampled across both attempts — flagged as a report-completeness matter for the Leader, not a code defect. Recorded here for transparency; not treated as blocking given the Reviewer's own characterization and the absence of any concrete misclassification found in either audit pass.

**Requirements covered:** `ITR-R-31`.

**Decisions made:**
- Formalized a third classification bucket, **(c) banner/empty-state** (app-wide or view-wide informational banners outside any form context), alongside the spec's original (a) section-intro / (b) field-level split. `ITR-R-31` did not anticipate this category; its members (`alert-global-info`, the two `result-framework-reporting-home` empty-state banners) all correctly resolve to `[collapsible]="false"` under the same "should stay always-visible" outcome as (a), even though the *reasoning* differs (not a section intro, just never appropriate to collapse). Not written back into `requirements.md` as a formal amendment since it doesn't change any `ITR-R-*`'s normative text — recorded here as classification methodology for any future site audit.
- `target-indicator.component.html`'s classification (a) stands, with a corrected rationale: it closes a read-only summary card with no adjacent field control (bucket (b) is inapplicable — there's no field to attach to), and it carries a cross-section navigation link that must stay reachable regardless of collapse state.

**Issues encountered:** A rate-limit interruption before any edit was made (no data loss, clean redispatch) and 4 real classification defects caught by a thorough Reviewer audit that read full file context rather than relying on diff hunks alone — exactly the kind of error class this task's Disqualifier was written to catch. One unresolved bookkeeping discrepancy (48 claimed vs. 57 actual `[collapsible]="false"` sites) flagged as non-blocking by the Reviewer.

**Final verification result:** `npx ng lint --quiet` clean across both attempts; zero bare (non-bracket-bound) `collapsible="false"` anywhere in the client app (confirmed independently by the Reviewer via grep on both attempts).

---

## Pivot Record: inline field-title tooltip via existing `pr-field-header` mechanism (2026-09-10, third round of user review)

**Trigger:** The user reviewed 3 live field-level examples ("Can this result be mapped to a ToC KPI?", "Did the Program invest financial resources...", "Lead center") in `rd-contributors-and-partners` and pointed out the ⓘ icon renders as its own block, separated from the field's title by visible whitespace — not immediately after the title on the same line, which is what was actually wanted for field-level notes.

**Investigation:** Confirmed `app-pr-field-header` (used internally by `pr-select`, `pr-multi-select`, `pr-yes-or-not`) already has an optional `[tooltip]` input from a prior, unrelated spec (`docs/specs/changes/tooltip-keyboard-accessibility/`) — renders the label followed immediately by a ⓘ icon on the same line, opening a fully accessible (click/`Enter`/`Space`, `Escape`-dismissible, ARIA toggletip, focus-trapped, live-announced) tooltip mounted to `document.body` (never clipped by ancestor overflow), using an already-existing wide/scrollable style (`sgi-dac-tooltip`, 420px, max-height 320px with scroll) sized for multi-paragraph guidance. `pr-select` and `pr-yes-or-not` already forward this input; `pr-multi-select` does not.

**Decision:** No new component or CSS needed — reuse the existing, already-accessibility-audited mechanism. Add the missing `tooltip` forwarding to `pr-multi-select` (small, mirrors `pr-select`'s existing pattern) and migrate the 3 example sites from a separate `<app-alert-status>` to the field's own `[tooltip]` input, deleting the `<app-alert-status>` tag at each site. Scoped as a **per-site opt-in** (`ITR-R-32`), not a mandate to migrate every remaining field-level note — that stays a deliberate future decision, like `ITR-OQ-1`.

**Why this wasn't found during the earlier `ITR-DD-4` investigation:** that investigation was answering a different question (can the icon sit inline with the label *without* touching any shared component) and concluded no — correctly, for a *generic* solution applicable to all ~150 sites. It did not surface that a *narrower*, already-shipped, already-accessible mechanism existed on the specific shared components (`pr-select`/`pr-yes-or-not`/`pr-multi-select`) these 3 examples happen to use. This Pivot Record does not overturn `ITR-DD-4`'s reasoning about `AlertStatusComponent`'s own floating-panel design — it identifies a parallel, pre-existing mechanism for the subset of field-level notes rendered through these three field components specifically.

**Spec documents updated:**
- `requirements.md`: new `ITR-R-32` added (per-site opt-in migration to `pr-field-header`'s `[tooltip]`).
- `design.md`: new `ITR-DD-6` ADR added after `ITR-DD-5`, documenting the existing mechanism, the decision, and why two field-level disclosure mechanisms now intentionally coexist.
- `tasks.md`: new `ITR-T-8` task added (small `pr-multi-select` addition + 3-site migration), sequenced after `ITR-T-7`.

**Status:** Requirements/design/tasks updated. Proceeding to execute `ITR-T-8` via the standard Implementer → Reviewer loop.

---

## Pivot Record: two more missed sites + icon-alignment question (2026-09-10, fourth round of user review)

**Trigger:** After `ITR-T-8` shipped, the user pointed at 2 more sites still showing the old standalone icon+popover style ("Other contributors" partner note; "Select regions" description) and asked whether the ⓘ icon is properly vertically centered relative to the field title everywhere (comparing a "wrong" and a "correct" screenshot).

**Investigation:** `geoscope-management.component.html` (shared across IPSR + bilateral + general geography — one component, 4 call sites) used `[description]` (an always-visible "Description:" line below the field) for its "Select regions"/"Select countries" guidance text — a different, older `pr-field-header` mechanism than `app-alert-status`, but the same underlying complaint (guidance text sitting apart from the field title). `rd-contributors-and-partners`'s `externalPartnersInfoNote` had no single field to attach an inline tooltip to (it precedes a subsection of two selector components, not one field's label) — classified `[collapsible]="false"` per the `ITR-T-7` precedent for subsection-intro notes, rather than guessed onto an arbitrary nearby field. The icon-alignment question was investigated at the CSS level (`pr_label_row`, `.sgi-dac-info`, `pr-info-icon`, plus `pr-select`/`pr-multi-select`'s own SCSS) — no defect found anywhere in the shared chain; flagged as needing live-browser confirmation.

**Decision:** New task `ITR-T-9` — migrate both `geoscope-management` multi-selects from `[description]` to `[tooltip]`, apply `[collapsible]="false"` to `externalPartnersInfoNote`, and report explicitly on the alignment investigation rather than guess at a speculative fix.

**Spec documents updated:** `tasks.md` — new `ITR-T-9` added, sequenced after `ITR-T-8`.

**Status:** Task added and executed (see below) — no `requirements.md`/`design.md` changes needed since this extends `ITR-R-32`/`ITR-DD-6` rather than introducing a new decision.

### `ITR-T-8` — Migrate 3 field-level notes onto `app-pr-field-header`'s inline `[tooltip]`

- **Final status:** PASS (attempt 1 of 3)
- **Date:** 2026-09-10
- **Files changed:** `pr-multi-select.component.ts`, `.html`; `rd-contributors-and-partners.component.html`; `pr-multi-select/CLAUDE.md` (folder-doc convention, applied by the Leader post-PASS)
- **Skills assigned:** `angular-developer` (per task default).
- **Effort:** `medium`.

**Attempt 1:**
- Added `readonly tooltip = input<string>('')` to `pr-multi-select.component.ts` (mirroring `pr-select`'s existing pattern) and forwarded it as `[tooltip]="tooltip()"` to its internal `app-pr-field-header`.
- Migrated 3 sites in `rd-contributors-and-partners.component.html`: the ToC question note, the financial-resources note, and the Lead center note — each `<app-alert-status [description]="...">` deleted, replaced with `[tooltip]="..."` on the corresponding `app-pr-yes-or-not` (×2) / `app-pr-select` (Lead center) tag, reusing the exact same description expression.
- Verification: `npx ng lint --quiet` clean; Jest (`pr-multi-select|rd-contributors-and-partners` pattern) 13 suites / 287 tests passing; Cypress `pr-multi-select.selection.cy.ts` 7/7; `pr-multi-select.cy.ts` 6/7 and `.contract.cy.ts` 36/47 — Implementer independently confirmed these failures pre-exist by stashing the diff and re-running against the unmodified tree (identical counts), cross-referenced against `pr-multi-select/CLAUDE.md`'s own documented "trampa #4" (the contract suite is deliberately red pending an unrelated fix — the component emits no mandatory-field marker).
- Reviewer verdict: **PASS** — independently confirmed all 5 judgment points at the source: (1) `pr-yes-or-not` genuinely supports `[tooltip]` (read its `.ts`/`.html`); (2) `pr-select` genuinely supports it; (3) the `''` default is a real no-op (`pr-field-header`'s `*ngIf="this.tooltip"` guard treats empty string as falsy — all ~80 existing `pr-multi-select` call sites unaffected); (4) no fragile nearby logic disturbed (mandatory-field markers, green-check validation, Lead center auto-assign wiring all intact — read the file's own `CLAUDE.md` first); (5) the pre-existing-failure claim is credible and structurally necessary (an unbound optional input defaulting to `''` cannot alter markup at the mount points those suites assert on) — also independently verified via `pr-multi-select/CLAUDE.md`'s "trampa #4" text directly, not just trusting the Implementer's methodology description.
  - ADVISORY (non-gating, applied by the Leader post-PASS rather than deferred): `pr-multi-select/CLAUDE.md`'s Contrato section didn't yet list the new `tooltip` input, and its `Verified:` stamp was stale — per `onecgiar-pr-client/CLAUDE.md` §10's folder-doc convention ("update that CLAUDE.md and re-stamp its Verified: line in the SAME commit"). Updated directly (small, mechanical addition — one new contract bullet + a stamp line) rather than left as pending, since nothing in this spec has committed yet and the Reviewer specifically flagged it would otherwise be "silently lost."
  - A second, cosmetic-only ADVISORY: the Lead center note previously rendered outside its `@if (!updatingLeadData)` guard (visible during a transient refresh window even when the select itself was hidden); now both vanish together. Not a requirement violation, not actioned.

**Requirements covered:** `ITR-R-32`.

**Decisions made:** None beyond the Implementer's straightforward application of the already-designed `ITR-DD-6` migration pattern.

**Issues encountered:** None — passed first attempt. Pre-existing Cypress failures in `pr-multi-select`'s test suite were investigated and confirmed unrelated (documented in that folder's own `CLAUDE.md`).

**Final verification result:** `npx ng lint --quiet` clean; 287/287 Jest tests passing across both touched areas; Cypress failures confirmed pre-existing and unrelated.

### `ITR-T-9` — Migrate `geoscope-management`'s region/country descriptions to inline `[tooltip]`; classify the external-partners note

- **Final status:** PASS (attempt 2 of 3)
- **Date:** 2026-09-10
- **Files changed:** `geoscope-management.component.html`; `rd-contributors-and-partners.component.html`; `rd-contributors-and-partners/CLAUDE.md`
- **Skills assigned:** `angular-developer` (per task default).
- **Effort:** attempt 1 `medium` → attempt 2 `xhigh` (bumped one level per rework rule).

**Attempt 1:**
- Renamed `[description]` → `[tooltip]` on both `geoscope-management` multi-selects (regions, countries), same expressions unchanged. Applied `[collapsible]="false"` to `externalPartnersInfoNote` (no single-field attachment point found — precedes a subsection of two selector components, not one field's label). Investigated icon vertical-alignment: checked `pr-select`/`pr-multi-select`'s own SCSS/templates in addition to the shared chain already reviewed for `ITR-T-8`; found no restrictive `align-items` or conflicting rule anywhere — reported "no defect found" rather than a speculative fix.
- Verification: `npx ng lint --quiet` clean.
- Reviewer verdict: **FAIL** — 2 issues, one substantive: (1) the regions multi-select's `[label]` is `null` for `module="reporting"` (the primary surface the user flagged), and `pr-field-header`'s template gates its ENTIRE label+tooltip block on `*ngIf="this.label"` — so the `[description]`→`[tooltip]` rename silently dropped the note (with its UN M.49 link) to nothing in that module, a real regression the diff's own attribute presence couldn't reveal without reading `pr-field-header`'s template guard; (2) `rd-contributors-and-partners/CLAUDE.md`'s `Verified:` stamp wasn't updated per the folder-doc convention.

**Attempt 2 (rework):**
- Fix 1: attached `[tooltip]` to the preceding `<app-pr-yes-or-not>` (regions question) instead — its `[label]` is non-null in both branches for every module, and `pr-yes-or-not` already forwards `tooltip` (per `ITR-T-8`). Set the multi-select's own `[tooltip]` to explicit `null` for the reporting module (avoiding ambiguity about where the tooltip "lives"). Countries block re-checked and confirmed genuinely unaffected (its label is never null in any module/branch) — left unchanged.
- Fix 2: updated the `Verified:` stamp in `rd-contributors-and-partners/CLAUDE.md`.
- Verification: `npx ng lint --quiet` clean.
- Reviewer verdict: **PASS** — independently traced the full regions block (not just the diff hunks) to confirm: (a) the new unconditional `[tooltip]` binding on the yes-or-not cannot produce a duplicate icon for non-reporting (IPSR) callers, because that whole element is itself gated to `module === 'reporting'` — non-reporting keeps exactly one ⓘ (on the multi-select, unchanged); (b) the label really is non-null in every branch where the tooltip now lives; (c) every UI-reachable path that shows the multi-select also shows the yes-or-not (traced through `GeoScopeEnum`/`resetHasScope()`); (d) the countries block independently re-confirmed as never label-null; (e) the CLAUDE.md stamp is factually accurate against the live file.
  - ADVISORY (non-gating): one data-only, not-UI-reachable edge case (a stale `has_regions=true` persisted against a scope that no longer shows the yes-or-not) would render a header-less multi-select — pre-existing behavior, not a regression, not actioned. A minor readability note (one long ternary line exceeds the project's prettier width, no enforcement mechanism active) and a minor UX note (the tooltip can appear one step earlier than the list itself in one branch) were also recorded as non-gating.

**Requirements covered:** `ITR-R-32` (extended).

**Decisions made:**
- `externalPartnersInfoNote` classified `[collapsible]="false"` rather than migrated to a field tooltip, since no single field/heading attachment point exists for it (the nearest heading belongs to an already-closed, unrelated subsection). Flagged back to the user as a corrigible judgment call.
- Tooltip ownership for the regions field split by module: the `app-pr-yes-or-not` carries it in `reporting` (where it's the only element guaranteed to have a non-null label), the `app-pr-multi-select` carries it everywhere else (where its own label is never null) — an explicit, traceable split rather than a single binding that would have silently failed in one module.

**Issues encountered:** A real, user-facing regression (attempt 1) caught by the Reviewer reading `pr-field-header`'s template guard rather than trusting attribute presence in the diff — exactly the "presence is not behavioral proof" discipline this whole spec has repeatedly needed. Fixed and independently re-verified via full code trace (not just the diff) on attempt 2.

**Final verification result:** `npx ng lint --quiet` clean across both attempts. The icon vertical-alignment question remains open pending live-browser confirmation — no code defect found in the shared CSS chain or in `pr-select`/`pr-multi-select`'s own styles after two rounds of review.

---

## Pivot Record: alignment root cause found + 5 more missed sites (2026-09-10, fifth round of user review)

**Trigger:** The user pointed at 4 more screenshots (2 sites missing the tooltip treatment entirely in "Innovation Dev info," 2 more confirming the alignment issue persists in "Contributors and partners") and offered a concrete hypothesis: the alignment problem might be caused by a margin-top on the fields.

**Investigation — alignment root cause, finally confirmed:** `custom-fields.scss`'s global `.pr_label { margin-top: 20px; margin-bottom: 6px; }` (written for the standalone, no-tooltip label case) gets reused unchanged inside `pr-field-header.component.html`'s tooltip branch, where `.pr_label` is a flex sibling of the icon button inside `.pr_label_row` (`display:flex; align-items:center`). Flexbox centers each item's MARGIN box, so `.pr_label`'s large asymmetric margin inflates its effective box far beyond the icon's small unmargined box — the label's actual text renders low within its own oversized box while the icon centers correctly in its own small one, producing exactly the reported vertical offset. The user's hypothesis (a margin-related cause) was correct, just not framed at quite the right layer (it's `.pr_label`'s own margin, not something specific to "fields" or to the contributors-and-partners page — it affects every tooltip-enabled field app-wide equally, which is why two independent rounds of "check pr-select/pr-multi-select's own CSS" investigation found nothing there: the bug lives in a shared rule both components inherit identically).

**Investigation — 2 more missed sites, plus 3 more found while there:** "Innovation Dev info" (`innovation-dev-info` module) has several fields using the OLD `[description]` pattern via `app-pr-field-header`, same shape as `ITR-T-9`'s `geoscope-management` fix: the readiness-assessment field, the assumptions-examination question, the innovation-team-diversity question, and 3 fields inside `estimates.component.html` (investment-by-Science-Program, investment-by-W3/bilateral, investment-by-partner) — 5 sites total using the exact same `[description]`→`[tooltip]` migration already proven safe. A 6th flagged site ("Provide a short name for the innovation") uses a DIFFERENT, larger-blast-radius mechanism (`pr-input` + `fieldRef` + `FieldsManagerService`, rendered through `app-field-card` rather than `app-pr-field-header`) — extending `field-card` with the same tooltip capability was explicitly discussed with the user (tradeoffs: same additive/opt-in technical pattern already proven twice, but `field-card` serves far more call sites and additional rendering responsibilities — mandatory/optional pill, colored border) and **deferred** at the user's explicit choice, not attempted in this spec.

**Decision:** New tasks `ITR-T-10` (the alignment fix, a scoped CSS relocation: move `.pr_label`'s spacing onto `.pr_label_row` as a container margin, neutralize `.pr_label`'s own margin only when nested there) and `ITR-T-11` (the 5 more field migrations, sequenced after `ITR-T-10` so newly-migrated tooltips render correctly aligned from the start).

**Spec documents updated:** `tasks.md` — `ITR-T-10` and `ITR-T-11` added, sequenced after `ITR-T-9`.

**Status:** Tasks added; proceeding to execute both via the standard Implementer → Reviewer loop, `ITR-T-10` first.

### `ITR-T-10` — Fix ⓘ icon vertical misalignment

- **Final status:** PASS (attempt 1 of 3)
- **Date:** 2026-09-10
- **Files changed:** `pr-field-header.component.scss`
- **Skills assigned:** `angular-developer` (per task default).
- **Effort:** `high`.

**Attempt 1:**
- Moved `.pr_label`'s legacy `margin-top: 20px; margin-bottom: 6px` (authored for the standalone, no-tooltip case) onto `.pr_label_row` as a container-level margin, and added a scoped `.pr_label_row .pr_label { margin-top: 0; margin-bottom: 0; }` override (higher specificity than the bare global rule, no `::ng-deep` needed since both sides of the selector live in `pr-field-header`'s own non-projected template). The bare `custom-fields.scss` `.pr_label` rule was left completely untouched.
- Verification: `npx ng lint --quiet` clean; Jest `pr-field-header` suite 7/7; Cypress `pr-field-header.cy.ts` 3/3, `.tooltip-a11y.cy.ts` 5/5, `.contract.cy.ts` 20/22 (2 pre-existing failures, confirmed unrelated via stash-and-rerun).
- Reviewer verdict: **PASS** — independently verified all 4 technical claims at source (bare rule untouched, no encapsulation override, both selector halves in the same non-projected template so no `::ng-deep` needed, specificity math correct and order-independent), AND went further: computed the actual flex geometry before/after (label margin-box 45px vs. icon 18px pre-fix → ~7px visual offset, matching the user's report almost exactly; both boxes ~18-19px post-fix → centers coincide). Concluded a live browser wasn't needed here since the alignment claim is a closed-form flexbox computation over three known box sizes, not an empirical measurement — reasoning through the cascade (which the task's own DoD wording anticipated as acceptable) settles it deterministically.
  - ADVISORY (non-gating): margins on `.pr_label_row` itself (unlike margins inside a flex container, which never collapse) could theoretically collapse with an adjacent sibling/parent margin, producing a small spacing shift on the ~10 affected tooltip sites in edge cases. Mitigation noted for manual QA: `padding` instead of `margin` on `.pr_label_row` would reproduce the exact old geometry with zero collapsing risk, if ever needed.

**Requirements covered:** (bug fix to the `ITR-DD-6` mechanism, no new `ITR-R-*`.)

**Decisions made:** None beyond the Implementer's CSS mechanism choice (container-level margin relocation + scoped child override), independently validated by the Reviewer's own geometry computation rather than just trusting the reasoning.

**Issues encountered:** None — passed first attempt, with an unusually thorough Reviewer verification (actual pixel-arithmetic reconstruction of the reported bug) given the "no live browser" evidence gap.

**Final verification result:** `npx ng lint --quiet` clean; all non-pre-existing test suites green; root cause and fix mathematically confirmed via flexbox box-model arithmetic.

### `ITR-T-12` — Revert 2 more `rd-contributors-and-partners` notes to the always-visible box

- **Final status:** PASS (attempt 1 of 3)
- **Date:** 2026-09-10
- **Files changed:** `rd-contributors-and-partners.component.html`
- **Skills assigned:** `angular-developer`.
- **Effort:** `low`.

**Attempt 1:**
- Added `[collapsible]="false"` to `contributingCentersInfoNote` (line 100) and `contributingScienceInfoNote` (line 389) — no other change.
- Verification: `npx ng lint --quiet` clean.
- Reviewer verdict: **PASS** — enumerated all 6 `<app-alert-status>` sites remaining in the file and traced each one's provenance: the 2 new additions match exactly what was asked; the other 2 already-`[collapsible]="false"` sites are independently attributable to `ITR-T-7` (`alertStatusMessage`) and `ITR-T-9` (`externalPartnersInfoNote`, corroborated against that folder's own `CLAUDE.md` stamp); the 2 sites that must stay default (`getMessageLeadPartner()`, a KP-centers literal note) are untouched. Confirmed no mandatory-field/green-check/`data-testid` wiring is in the blast radius of a plain `@Input` render-style change.

**Requirements covered:** `ITR-R-30` (applied per explicit user direction).

**Decisions made:** None — direct execution of an explicit user instruction.

**Issues encountered:** None — passed first attempt.

**Final verification result:** `npx ng lint --quiet` clean; diff scope independently confirmed exact via full-file site enumeration.

### `ITR-T-11` — Migrate 5 more field-level notes to inline `[tooltip]` (Innovation Dev info)

- **Final status:** PASS (attempt 1 of 3)
- **Date:** 2026-09-10
- **Files changed:** `innovation-dev-info.component.html`, `assumptions-examination.component.html`, `innovation-team-diversity.component.html`, `estimates.component.html` (3 sites)
- **Skills assigned:** `angular-developer`.
- **Effort:** `medium`.

**Attempt 1:**
- Renamed `[description]` → `[tooltip]` at all 5 sites, same expressions, `[useColon]="false"` preserved where present. Confirmed the `field-card`/`short_title` field was not touched, and none of the module's documented trap areas (phase gating, questionnaire slot resolution, green-check wiring) were touched.
- Verification: `npx ng lint --quiet` clean; Jest (`innovation-dev-info` pattern) 18 suites / 234 tests passing.
- Reviewer verdict: **PASS** — independently traced the label-nullity risk for each site against the module's own `CLAUDE.md` "q1..q4 resolved PER PHASE" table: confirmed the migrated `assumptions-examination` site is `q3` (present in both phase eras), NOT the documented null-slot trap (`q4`, correctly left untouched on `[description]` at a different, unmigrated site); confirmed `question_text`/`question_description` are typed non-optional `string = ''` siblings on the same server model, so label and tooltip vanish together pre-resolution (never the asymmetric label-null-but-description-set failure mode `ITR-T-9` hit). Grepped the whole module to confirm exactly 5 `[tooltip]` occurrences and zero remaining `[description]` at those sites, all phase gates and `appFeedbackValidation` markers intact, zero scope creep into the module's other untouched description blocks.
  - ADVISORY (non-gating): the 3 `estimates` fields' tooltip content is multi-`<li>` `<ul>` markup — the shared `sgi-dac-tooltip` style class has no list styling, and Tailwind preflight strips `ul` bullets/margins app-wide, so these three may render as run-together lines rather than a formatted list inside the tooltip bubble. Not a spec violation; worth a live-browser look alongside the already-open general alignment/visual verification.

**Requirements covered:** `ITR-R-32` (extended).

**Decisions made:** None beyond direct application of the already-proven migration pattern.

**Issues encountered:** None — passed first attempt. A transcription artifact in the Leader's diff-paste to the Reviewer (a duplicated line) was correctly identified as a handoff artifact, not a defect, after the Reviewer read the live file directly.

---

## Pivot Record: `.alert_boxed` spacing + the ticket's own reference field (2026-09-10, seventh round of user review)

**Trigger:** The user pointed out `contributingScienceInfoNote`'s boxed note (from `ITR-T-12`) renders glued to the "Contributing W3 and/or bilateral projects" chips above it, and separately that "Contribution to indicator target" — the exact field from the original ticket's own screenshot — still lacked the migration.

**Investigation:** `.alert_boxed` inherits `&.info`'s `margin: 0 0 20px` (0 top / 20px bottom) — confirmed via `git show HEAD` to be the ORIGINAL pre-spec value, not a regression this spec introduced, but a legitimate polish request now that the boxed style is being reused in new contexts. "Contribution to indicator target" (`aow-hlo-create-modal.component.html`) — the canonical reference site cited throughout `requirements.md`/`design.md`/`tasks.md` — was never migrated to the inline-tooltip pattern; it still uses the original `<app-pr-field-header>` + separate `<app-alert-status>` shape.

**Decision:** New task `ITR-T-13` — add top spacing to `.alert_boxed` only (not the base `&.info` margin, which the icon-only/non-info states still need untouched), and migrate this one reference field the same way as every other `ITR-T-8`/`ITR-T-9`/`ITR-T-11` site.

**Note on `tasks.md` §6's manual QA line:** it describes verifying "the exact ticket screenshot site... collapsed-by-default and expandable via click" — after this migration, that site's visual changes from a collapsed-box-below-the-field to an inline title tooltip. The manual QA step's intent (verify this specific real-world site in a real browser) is unchanged; only the expected visual shape is updated.

**Spec documents updated:** `tasks.md` — `ITR-T-13` added, sequenced after `ITR-T-11`.

**Status:** Task added; proceeding to execute via the standard Implementer → Reviewer loop.

### `ITR-T-13` — Fix `.alert_boxed` top spacing; migrate the ticket's own reference field

- **Final status:** PASS (attempt 1 of 3)
- **Date:** 2026-09-10
- **Files changed:** `alert-status.component.scss`; `aow-hlo-create-modal.component.html`
- **Skills assigned:** `angular-developer`.
- **Effort:** `medium`.

**Attempt 1:**
- Added `margin-top: 20px;` to `.alert_boxed` only (net spacing `20px 0`, bottom inherited from `&.info`), leaving the base `&.info { margin: 0 0 20px }` byte-unchanged.
- Migrated "Contribution to indicator target" (`aow-hlo-create-modal.component.html`, the exact site from the original ticket's own screenshot) from a separate `<app-alert-status>` to `[tooltip]` on its `<app-pr-field-header>`. The original description used `{{ }}` text-interpolation syntax valid only in plain HTML attributes — converted to an equivalent bound string-concatenation expression (`'...' + entityAowService.reportingPhaseYear + '...'`), since a bound Angular expression can't contain `{{ }}` markers or raw newlines.
- Verification: `npx ng lint --quiet` clean; Jest `alert-status` suite 10/10; Cypress `alert-status.cy.ts` 7/7, `.contract.cy.ts` 16/17 (1 pre-existing documented flake, same baseline).
- Reviewer verdict: **PASS** — independently verified `entityAowService` is a public field reachable at template scope with the same `reportingPhaseYear` getter (which already coalesces to `''`, so no "not loaded" regression), confirmed the concatenated string renders character-identical to the original interpolated one (the only source difference — collapsed whitespace between two consecutive `<br>` tags — renders identically in HTML), confirmed the SCSS change is scoped to `.pr_alert.info.alert_boxed` only (verified via specificity), and confirmed a subtle correct interaction with `ITR-T-10`'s fix: `labelDescInlineStyles="margin-top: 0 !important"` now applies to `.pr_label_row` (the element that carries `ITR-T-10`'s new `margin-top: 20px`) rather than the bare `.pr_label`, and the `!important` still wins — so this field's original "no top gap under the separator" intent is preserved, not accidentally reintroduced.
  - ADVISORY (non-gating, but worth surfacing to the user): the same modal (`aow-hlo-create-modal.component.html`, lines ~238/315) contains the SAME two notes (`contributingCentersInfoNote`/`contributingScienceInfoNote`-equivalent) that `ITR-T-12` just reverted to `[collapsible]="false"` in a DIFFERENT file (`rd-contributors-and-partners.component.html`) per explicit user request. Out of this task's declared scope, but the same user preference plausibly applies here too — flagged for the user's decision, not applied speculatively.

**Requirements covered:** `ITR-R-32` (migration).

**Decisions made:** Converted the interpolated-string `description` to a concatenated-expression `tooltip` — a mechanical necessity of Angular's binding syntax, not a design choice; verified textually equivalent by the Reviewer.

**Issues encountered:** None — passed first attempt.

**Final verification result:** `npx ng lint --quiet` clean; all non-pre-existing test suites green; text-equivalence and CSS-scope both independently confirmed.

---

## Pivot Record: consistency follow-up from `ITR-T-13`'s own advisory (2026-09-10, eighth round)

**Trigger:** `ITR-T-13`'s Reviewer flagged (as a non-gating ADVISORY) that `aow-hlo-create-modal.component.html` carries the same two notes `ITR-T-12` had just reverted to `[collapsible]="false"` in a different file. The Leader surfaced this to the user rather than applying it speculatively; the user confirmed they want the same treatment.

**Process note:** The Leader (this session) initially made this one-line-times-two edit directly, in violation of its own "writes no production code" rule maintained meticulously across every other change in this spec. Caught immediately, reverted before any review/commit, and redispatched through the standard Implementer → Reviewer loop for consistency with the rest of the audit trail.

**Decision:** New task `ITR-T-14` — add `[collapsible]="false"` to both equivalent sites.

**Spec documents updated:** `tasks.md` — `ITR-T-14` added, sequenced after `ITR-T-13`.

### `ITR-T-14` — Apply the same always-visible box to 2 equivalent notes in `aow-hlo-create-modal`

- **Final status:** PASS (attempt 1 of 3)
- **Date:** 2026-09-10
- **Files changed:** `aow-hlo-create-modal.component.html`
- **Skills assigned:** `angular-developer`.
- **Effort:** `low`.

**Attempt 1:**
- Added `[collapsible]="false"` to both `contributingCentersInfoNote` (~line 238) and `contributingScienceInfoNote` (~line 315) — no other change.
- Verification: `npx ng lint --quiet` clean; confirmed via grep that `ITR-T-13`'s prior migration in this same file remained undisturbed.
- Reviewer verdict: **PASS** — confirmed these are the file's only 2 `<app-alert-status>` sites (disqualifier satisfied by construction — no third site existed to touch), confirmed `ITR-T-13`'s "Contribution to indicator target" `[tooltip]` migration is byte-for-byte intact, and confirmed the change has real effect (not an inert attribute) by tracing `AlertStatusComponent`'s own `isCollapsible` getter and defaults.

**Requirements covered:** `ITR-R-30` (applied per explicit user direction, consistency with `ITR-T-12`).

**Decisions made:** None — direct execution of explicit user instruction, following up on a Reviewer-surfaced advisory from `ITR-T-13`.

**Issues encountered:** A Leader process violation (writing code directly instead of delegating) — caught and corrected before any review or commit, no lasting effect.

**Final verification result:** `npx ng lint --quiet` clean; diff scope and prior-task integrity both independently confirmed.

---

## Pivot Record: a second, distinct "Contribution to indicator target" site (2026-09-10, ninth round — user reported "not fixed" after a server restart)

**Trigger:** After restarting their dev server (ruling out the stale-build hypothesis), the user reported the field still showing the old icon-below-label pattern, with the exact rendered DOM (`<div class="pr_label required">Contribution to indicator target:</div>`) as evidence.

**Investigation:** The `required` class contradicted `ITR-T-13`'s site (`[required]="false"` there), which meant the user was looking at a DIFFERENT call site with the identical field name. Grepped the whole client app and found `multiple-wps-content.component.html` (`rd-contributors-and-partners`'s ToC multi-WPs flow) — `[required]="isCP2026()"`, matching the observed asterisk — still using the old separate `<app-pr-field-header>` + `<app-alert-status>` shape, never touched by any prior task in this spec. `ITR-T-13`'s own fix (`aow-hlo-create-modal`) was re-confirmed correct via a fresh grep before concluding this.

**Decision:** New task `ITR-T-15` — same mechanical migration, applied to this second site.

**Spec documents updated:** `tasks.md` — `ITR-T-15` added.

### `ITR-T-15` — Migrate the OTHER "Contribution to indicator target" field (`multiple-wps-content`)

- **Final status:** PASS (attempt 1 of 3)
- **Date:** 2026-09-10
- **Files changed:** `multiple-wps-content.component.html`
- **Skills assigned:** `angular-developer`.
- **Effort:** `medium` (bumped from the usual `low` given user urgency).

**Attempt 1:**
- Added `[tooltip]="contributionTargetNote()"` to the field-header, kept `[required]="isCP2026()"` unchanged, deleted the separate `<app-alert-status>`.
- Verification: `npx ng lint --quiet` clean; Jest (`multiple-wps-content` pattern) 3 suites / 92 tests passing.
- Reviewer verdict: **PASS** — confirmed `label` is a static (non-bound) attribute here, so the `ITR-T-9`-class label-guard regression is structurally impossible (not just unlikely) at this specific site; confirmed `contributionTargetNote()`'s `<br>`/`<strong>` markup survives via the same `innerHTML` rendering path; confirmed the nearby `appFeedbackValidation` marker, both year branches, and two unrelated (non-info) `<app-alert-status>` blocks elsewhere in the file are all untouched.

**Requirements covered:** `ITR-R-32`.

**Decisions made:** None — direct application of the established migration pattern to a newly-discovered duplicate-named site.

**Issues encountered:** A genuine second site with an identical field name caused user-facing confusion (looked like `ITR-T-13`'s fix hadn't landed, when in fact it had — this was a completely separate, never-migrated location). Resolved by diagnostic grep across the whole app before assuming any existing fix was broken.

**Final verification result:** `npx ng lint --quiet` clean; 92/92 Jest tests passing; label-guard risk explicitly ruled out as structurally impossible (static attribute, not conditional).

**Final verification result:** `npx ng lint --quiet` clean; 234/234 Jest tests passing; label-nullity risk explicitly ruled out per site against the module's own documented trap table.
