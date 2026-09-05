# Tooltip Unification & Keyboard Accessibility — `execution.md`

## 1. Document Control

- **Spec:** `docs/specs/changes/tooltip-keyboard-accessibility/`
- **Approval mode:** gated (no `pre-approved` marker found in requirements.md/design.md Document Control — treat each PASS/HALT gate as a stop-and-report point)
- **Leader:** Claude Code session, 2026-09-04

---

## 2. Task Execution History

### `TIP-T-1` — Rewrite `PrTooltipDirective` for unified click-pin, keyboard, ARIA, and viewport behavior

**Status:** IN PROGRESS (attempt 1 FAIL, attempt 2 pending)

#### Attempt 1 — 2026-09-04

- **Skills assigned:** `angular-developer`
- **Effort:** `high`
- **Files changed:** `onecgiar-pr-client/src/app/shared/directives/pr-tooltip.directive.ts` (only file, in scope)
- **Implementer verification:**
  - `npx ng lint --quiet` → clean.
  - `npm run build` → fails only on 6 pre-existing `[prTooltipPinnable]="true"` bindings in the 5 template files reserved for `TIP-T-2` (not touched this task) — no error originates from the directive file.
  - `npx tsc --noEmit` → clean except `pr-tooltip.directive.spec.ts` (reserved for `TIP-T-3`).
  - **Not Done:** manual smoke check and idle-listener-leak check in a live `npm start` session — no dev server available in the Implementer's environment. Idle-listener claim was code-review-only (teardown array).
- **Implementer self-flagged judgment calls:** (1) `dynamic-panel-menu`'s host is a `<div [routerLink]>` not an `<a>` as design.md states — gets upgraded, Enter/Space now opens tooltip but does not navigate. (2) added a `type="button"|"submit"|"reset"` heuristic beyond the literal tasks.md list to avoid double-firing on `result-framework-reporting-recent-item`. (3) added defensive `hostOwnsAriaExpanded`/`hostOwnsAriaControls` guards for `reporting-entry-hub` even though no current template collides.
- **Reviewer verdict:** `STATUS: FAIL` (4 issues)
  1. **`dynamic-panel-menu` regression** — host is not skipped by the upgrade check despite `tasks.md` TIP-T-1 item 2 and `design.md` DD-3 explicitly naming it. Becomes a `role="button"` tab stop where `Enter` opens the tooltip but does NOT navigate (RouterLink only fires on real `click`, not synthesized). Violates `tasks.md` TIP-T-1 item 2 and `TIP-DD-3`. Remediation: detect via `inject(RouterLink, {optional:true, self:true})` and treat non-null as already-interactive, OR dispatch a real click on activation for router-link hosts (explicit recorded decision either way) — carry a detection test into `TIP-T-3`.
  2. **Dead focus-stops on disabled/empty tooltips** — `ngOnInit` upgrade is one-shot and does not account for `[prTooltipDisabled]` or empty/conditional `[prTooltip]` text, both of which flip at runtime. Confirmed live sites: `rd-partners.component.html:20-24` (+ twins `rd-contributors-and-partners.component.html:148`, `ipsr-contributors.component.html:64`), and 7 more sites binding `''` in a ternary branch (`dynamic-panel-menu.component.html:14`, `results-list.component.html:235`, `results-notifications.component.html:57`, `aow-hlo-table.component.html:129`, `reporting-aow-table.component.html:879`, `program-overview.component.html:835`, `user-roles-info-modal.component.html:2`). Violates `requirements.md` §7 NFR-Accessibility (name/role/value) and `design.md` §2.3 (upgrade scoped to "the trigger" — no-content hosts are not triggers). Remediation: gate upgrade on `!prTooltipDisabled && !!text`, extract `syncHostAffordance()`, call from `ngOnInit` + `ngOnChanges`, track directive-added attributes with a `didUpgradeHost` flag so template-declared attributes are never stripped.
  3. **Focus-steal on outside-click** — `hide()` unconditionally restores focus to `previouslyFocusedEl` on every close path including outside-click, which steals focus from whatever the user just clicked (bubble-phase document click fires after the browser already focused the new target). Concrete regression on `pr-field-header`/`field-card` (adjacent to nearly every Result Detail input): click ⓘ → click into adjacent input → `hide()` fires → focus yanked back to ⓘ. Violates `requirements.md` §8 `TIP-AC-2` (outside click's only specified consequence is "closes") + WCAG 2.4.3. Remediation: gate `restoreTo.focus()` on `focusIsInWidget` (tooltip or host still contains `document.activeElement`) at close time.
  4. **Raw HTML announced to screen readers** — `LiveAnnouncer.announce(this.text)` announces the raw HTML string (tooltip content is set via `innerHTML`), so anchors (CGIAR 2030 Strategy, Impact Area scoring doc links) are spoken as literal markup. Violates `requirements.md` §6 `TIP-R-20` ("announce the tooltip's content"). SHOULD-level — `tasks.md` item 8's deferral clause is an alternative. Remediation: announce `tooltipEl.textContent?.trim()` instead, or remove the call and record the deferral explicitly.
  - **Judgment-call adjudication (Leader, ratifying Reviewer's read):** (1) in scope for `TIP-T-1`, not deferrable to `TIP-T-6` — `tasks.md` names the skip explicitly. (2) `type="button"` heuristic accepted as spec-serving, low false-positive risk — pin it in `TIP-T-3`'s tests. (3) `hostOwnsAriaControls`/`hostOwnsAriaExpanded` guards are inert today and don't break `TIP-DD-2` (`aria-describedby` set unconditionally) — no fix needed for those two, but see ADVISORY below for `aria-describedby` itself.
  - **ADVISORY (4R lens, non-gating):**
    - RELIABILITY: no `hostOwnsAriaDescribedby` guard — a host with its own template `aria-describedby` (help text/error association) loses it permanently after first open/close. Mirror the existing guard pattern.
    - RESILIENCE: `FocusTrapFactory.create()` runs even for plain-text tooltips with no tabbable content; CDK still inserts two tabbable anchor elements around the body-appended tooltip. Consider gating trap creation on `tooltipEl.querySelector('a,button,[tabindex]')`.
    - RISK: `onWindowScrollOrResize` runs `position()` synchronously per scroll event (2 rect reads + 2 style writes) — only while pinned, so the NFR idle-listener target is met, but `requestAnimationFrame` coalescing would remove the layout-thrash pattern at ~4 lines.
    - READABILITY: `tasks.md` item 3 places `aria-controls`/`aria-describedby` wiring in `show()`; diff places it in `pin()`. Practical delta is hover-only tooltips carry no association — near-moot since pin-on-open — but note the deviation.
    - RISK (carry to `TIP-T-6`, not this task): blanket upgrade puts `role="button"`+`tabindex="0"` on a `<span>` nested inside a native `<button>` at `reporting-entry-hub.component.html:331` — interactive-content-inside-button is invalid HTML/nested focus stop. Faithful consequence of `design.md` §2.3's rule, not an implementation defect — flag for the 39-file sweep to decide whether truncation-tooltip hosts inside buttons should be upgraded at all.
  - **Verification-evidence note:** `npm run build` failing only on the 5 reserved `[prTooltipPinnable]` template bindings is structurally expected given the task split (`TIP-T-1` removes the input; `TIP-T-2` removes the bindings) — branch is not mergeable/buildable in isolation until `TIP-T-2` lands. Idle-listener DoD item closed by code review (teardown array + `ngOnDestroy` call `hide()` on every path). Manual smoke-check DoD item remains open and is exactly where Issue 3 lives — validates the "test the assumption" principle in hindsight.

#### Attempt 2 — 2026-09-04

- **Skills assigned:** `angular-developer`
- **Effort:** `xhigh` (bumped one level after attempt 1 FAIL, per rework-loop rule)
- **Files changed:** `onecgiar-pr-client/src/app/shared/directives/pr-tooltip.directive.ts` (same single file, revised in place — not a rewrite from scratch)
- **Fixes applied (all 4 Reviewer issues + both optional advisories):**
  1. `dynamic-panel-menu` regression → `inject(RouterLink, {optional:true, self:true})` folded into `hostIsNativelyInteractive`; a `[routerLink]` host is now permanently skipped by the upgrade (matches Reviewer's suggested remediation exactly).
  2. Dead focus-stops → added `OnChanges` + `syncHostAffordance()` (called from `ngOnInit` and on `text`/`prTooltipDisabled` changes), gated on `!hostIsNativelyInteractive && !prTooltipDisabled && !!text`, tracked via `didUpgradeHost` so only directive-added attributes are ever touched. Closes a pinned tooltip via `hide()` before stripping attributes if it becomes ineligible at runtime. Keydown handlers early-return before `preventDefault()` when disabled/empty.
  3. Focus-steal on outside-click → `hide()` snapshots `document.activeElement` and computes `focusIsInWidget` before any teardown; restores focus only when true.
  4. Raw HTML to `LiveAnnouncer` → now announces `tooltipEl.textContent?.trim()` instead of raw `this.text`.
  - Advisory (both implemented): `hostOwnsAriaDescribedby` guard added; `FocusTrapFactory.create()` gated on the tooltip containing tabbable content.
- **Implementer verification:** `npx ng lint --quiet` clean; `npx tsc --noEmit` clean for this file (only the known out-of-scope `prTooltipPinnable` errors in the spec file and 6 template bindings remain — reserved for `TIP-T-2`/`TIP-T-3`, one extra site found beyond design.md's named 5: `program-overview.component.html`, noted for `TIP-T-2`). Manual smoke check still not performed (same environment constraint).
- **Reviewer verdict:** `STATUS: PASS`. All 4 issues independently re-verified against the actual template/code (not taken on the Implementer's claim) — `dynamic-panel-menu`'s real markup confirmed as `<div [routerLink]>` at line 9-15; the hide-before-strip ordering in `syncHostAffordance`'s de-upgrade branch confirmed correct (reversing it would reintroduce the stale-attribute bug); focus-steal fix confirmed correct given bubble-phase document click timing; LiveAnnouncer fix confirmed (`innerHTML` set before `textContent` read). Both advisory fixes confirmed present and wired correctly (mirrored guard pattern; querySelector gate).
  - **Evidence-gap note (Reviewer, non-blocking):** fixes 1, 3, and 4 land in defect classes `requirements.md` §7.1 already marks as not jsdom-observable (focus movement, screen-reader announcement) — passing the code is not certifying the behavior in a browser. `TIP-T-3` must add a detection test for the RouterLink skip; `TIP-T-4` (Cypress) must carry focus-restore-on-outside-click; `TIP-T-6`'s manual pass must carry the LiveAnnouncer text-content check. Do not let those later tasks close on presence assertions alone for these three.
  - **ADVISORY (4R lens, non-gating):**
    - RELIABILITY: "close when ineligible" only applies inside the `didUpgradeHost` branch — a native `<button prTooltip>` whose `prTooltipDisabled` flips true while pinned stays open indefinitely. Suggested one-line fix: hoist the `if (pinned && !shouldUpgrade) hide()` check above both branches. Not applied this task — carry to `TIP-T-6` sweep or a future pass if it surfaces.
    - RELIABILITY: `hide()` invoked from `syncHostAffordance` (programmatic, not user gesture) with the host focused refocuses the host right before its `tabindex` is stripped — browsers tolerate this today (no visible break) but it's fragile. Suggested fix: skip focus-restore on the programmatic close path.
    - RELIABILITY: `hide()` runs full ARIA teardown even when nothing was ever pinned (e.g. plain `mouseleave`) — every `[prTooltip]` host, including deliberately non-upgraded ones, acquires `aria-expanded="false"` on first mouse-out, an `aria-allowed-attr` violation on a role-less host. Suggested fix: gate the three ARIA lines on `wasPinned`.
    - RESILIENCE: focus-trap gate `querySelector('a,button,[tabindex]')` misses `input`/`select`/`textarea`/`[contenteditable]` and matches `tabindex="-1"`. No current tooltip body has a form control, so not exercised today — latent gap if one is added later.
    - READABILITY: `hostIsNativelyInteractive` now conflates 4 distinct skip reasons (native tag, RouterLink, author role/tabindex, `type=` heuristic) — well-documented in the docblock, but `TIP-T-3` should assert each independently so a future edit can't silently widen the upgrade.
  - None of the above ADVISORY items block PASS or consume a rework attempt, per the Advisory-Never-Gates rule. Not applied in this task; carried forward as recorded findings for `TIP-T-3`/`TIP-T-4`/`TIP-T-6` to pick up, or a future spec if the team wants them addressed sooner.

**Requirements covered:** `TIP-R-1` through `TIP-R-10` (mechanism), `TIP-R-20` (best-effort, implemented not deferred), `TIP-AC-1` through `TIP-AC-8` (implementation half).

**Decisions made:** RouterLink detection via `inject(RouterLink, {optional:true,self:true})` rather than synthesizing a click for router-link hosts (matches spec's literal "skip" instruction). LiveAnnouncer kept (not deferred) since the textContent fix fully resolved the raw-HTML issue without needing the SHOULD's deferral escape hatch.

**Issues encountered:** attempt 1 FAILed on 4 issues (see above); attempt 2 fixed all 4 plus 2 advisories, confirmed by independent Reviewer re-verification against the actual templates and code, not the Implementer's claims alone.

**Final verification result:** `npx ng lint --quiet` clean; `npx tsc --noEmit` clean for the directive file. Full `npm run build` remains red until `TIP-T-2` removes the 6 template `[prTooltipPinnable]` bindings — this is the expected, structural state of the task split, not a defect of this task.

**Final status: PASS (attempt 2/3).**

---

**Next eligible tasks (all depend only on `TIP-T-1`, now `[x]`):** `TIP-T-2` (5-file — now 6-file, see note above — cleanup), `TIP-T-3` (Jest retarget), `TIP-T-4` (Cypress focus/clamp/reposition), `TIP-T-5` (Cypress compound-click sites). All four are parallel-friendly (no shared files) per the dependency graph in `tasks.md` §4.

---

### `TIP-T-2` — Remove the now-redundant `[prTooltipPinnable]="true"` attribute from its call sites

**Status:** DONE

#### Attempt 1 — 2026-09-04

- **Skills assigned:** `angular-developer`
- **Effort:** `low`
- **Files changed** (attribute removal only, one line each):
  1. `onecgiar-pr-client/src/app/custom-fields/pr-field-header/pr-field-header.component.html`
  2. `onecgiar-pr-client/src/app/custom-fields/field-card/field-card.component.html`
  3. `onecgiar-pr-client/src/app/pages/bilateral/components/section-general-info/section-general-info.component.html`
  4. `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-general-information/rd-general-information.component.html`
  5. `onecgiar-pr-client/src/app/pages/results/pages/result-detail/result-detail.component.html`
  6. `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/program-overview/program-overview.component.html` (6th site, found by `TIP-T-1`'s Implementer during their own grep, not in `tasks.md`'s original 5 — same cleanup, same reasoning)
- **Diff summary:** each site had exactly `[prTooltipPinnable]="true"` removed from the `[prTooltip]`-bearing element (no other attribute, structure, or logic touched).
- **Verification:**
  - `grep -rn "prTooltipPinnable" onecgiar-pr-client/src --include=*.html` → one residual hit: `program-overview.component.html:777`, inside an HTML **comment** (a docblock explaining the P2-3201 rationale, not a live binding) — left untouched as out of the attribute-removal scope; flagged for a future doc pass rather than edited silently.
  - `npm run build` (production) → **succeeds** ("Application bundle generation complete"). Only pre-existing, unrelated warnings remain (bundle-budget, unused `DecimalPipe`/`@let`, CommonJS deps for `web-llm`/`pdfjs-dist`). This was the last thing blocking the build after `TIP-T-1`.
  - `npx ng lint --quiet` → "All files pass linting."
  - Grepped for other `prTooltipPinnable` references: three `.spec.ts` files access it as a real TypeScript property on the directive instance (`directive.prTooltipPinnable`, `fresh.prTooltipPinnable`) — genuine compile-breaking references, not incidental strings: `pr-tooltip.directive.spec.ts` (get/set), `pr-field-header.component.spec.ts`, `field-card.component.spec.ts` (both `expect(...injector.get(PrTooltipDirective).prTooltipPinnable).toBe(true)`). Confirmed but **not fixed** — reserved for `TIP-T-3`.

**Requirements covered:** completes the `TIP-T-1`/`TIP-T-2` split — directive input removed (`TIP-T-1`) and all template call sites cleaned up (`TIP-T-2`); pinning is now unconditional, zero behavior change.

**Decisions made:** left the stale `prTooltipPinnable` mention in `program-overview.component.html`'s comment (line 777) untouched — it's prose describing rationale, not the attribute itself, and the task scope was explicitly "just remove the attribute... do not touch anything else."

**Issues encountered:** none — all 6 sites matched the expected pattern on first read; no build/lint fallout beyond the already-known `TIP-T-3` spec-file items.

**Implementer's self-reported verification result:** `npm run build` green, `npx ng lint --quiet` clean. *(Note: the Implementer's report characterized this as "Final status: PASS" — corrected here. Per `/akili-execute` Step 2.3, PASS is a Reviewer verdict, not an Implementer self-assessment; the independent audit had not run yet when that line was written.)*

**Reviewer verdict:** `STATUS: PASS`. Independently re-verified (not trusting the Implementer's grep claim): all 6 sites confirmed to have lost exactly `[prTooltipPinnable]="true"` and nothing else (`[prTooltip]`/`prTooltipPosition`/`prTooltipStyleClass`/`aria-label` all intact); the one residual `prTooltipPinnable` hit in `program-overview.component.html:777` confirmed to sit inside an HTML comment, not a live binding; the 6th file (beyond `tasks.md`'s hand-enumerated 5) confirmed as legitimate in-scope cleanup, not scope creep — `TIP-AC-9`/`TIP-T-6` already mandate the full 39-file sweep this residue belongs to.

**Reviewer must-carry findings (not gating this task, corrected into `tasks.md` by the Leader):**
1. **Client Jest is currently red** — the Implementer's DoD check silently narrowed `tasks.md`'s original unqualified `grep -rn "prTooltipPinnable" onecgiar-pr-client/src` to `--include=*.html`, which hid 4 live TypeScript compile errors: `field-card.component.spec.ts:79`, `pr-field-header.component.spec.ts:69`, and `pr-tooltip.directive.spec.ts:60,209` all reference the `@Input() prTooltipPinnable` that `TIP-T-1` removed. `npm run build`/`ng lint` don't see `*.spec.ts`, so neither green check could have caught this. Per `design.md` TIP-DD-5 Consequences, this is `TIP-T-3`'s ownership ("any test referencing `prTooltipPinnable` must be updated…, not after") — `tasks.md`'s `TIP-T-3` **Files (expected)** list named only the directive spec, an incomplete list now corrected to include both `custom-fields` specs, and its DoD now requires running them, not just the directive spec pattern.
2. **`tasks.md` TIP-T-2's DoD grep corrected** from unqualified to `--include=*.html`, matching DD-5's actual ownership split — the original wording was unsatisfiable until `TIP-T-3` lands.
3. (Leader's call, deferred as noise-level for a one-line attribute removal) `program-overview.component.html`'s comment at line 777 now describes an attribute that no longer exists, and that folder's own `CLAUDE.md` `Verified:` stamp convention technically applies — not addressed in this task, left for a future doc pass or `TIP-T-6`'s sweep.

**`tasks.md` corrected in place** (Leader, same-day): `TIP-T-2` DoD grep qualified to `--include=*.html`; `TIP-T-3` **Files (expected)** and DoD updated to include `pr-field-header.component.spec.ts` and `field-card.component.spec.ts`.
