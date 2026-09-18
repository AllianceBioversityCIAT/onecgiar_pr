# Execution — QA AI verdict drawer (W3/Bilateral)

## 1. Document Control

| Field | Value |
|---|---|
| Spec | `docs/specs/bilateral/qa-ai-verdict-drawer/` · module code **`BIL-QAD`** |
| Approval Mode | **gated** — owner elected a straight run for `T-1 → T-3` at the 2026-09-18 start gate; `T-4` (browser pass) resumes the gate |
| Spec approval | `requirements.md` + `design.md` flipped `draft → approved` 2026-09-18 on the owner's verbal approval at `/akili-execute`. `BIL-QAD-OQ-1` (ticket placement) deliberately left open — it blocks the commit, not the code |
| Branch | `JuanGuzman-io/feature-p2-3150-bilateral` (worktree `hermit`) · default branch pin `master` |
| Budget (`design.md` §14) | 5 tasks · ~400 LOC · 1–2 review rounds |
| Leader | T1 · Claude Opus 5 (1M) |
| Implementer | T2 via `.claude/agents/akili-implementer.md` |
| Reviewer | T3 via `.claude/agents/akili-reviewer.md` — `author ≠ auditor` enforced by wrapper binding |
| Started | 2026-09-18 |

### Pre-flight evidence (2026-09-18)

- Working tree clean apart from the untracked spec folder.
- `onecgiar-pr-client/src/environments/environment.ts` and `node_modules` present in this worktree — the client Jest suite can actually run (a missing `environment.ts` produces a false `Tests: 0`).
- No conflicting in-flight spec on this component folder (`docs/specs/bilateral/` re-checked).
- No migration, no CLARISA dependency, no bilateral change-log row — all N/A by `design.md` §3/§4.

---

## 2. Task Execution History

### `BIL-QAD-T-1` — Drawer shell: scrim, panel, focus, lock, geometry

**Status:** in progress · **Date:** 2026-09-18 · **Attempts so far:** 1

#### Attempt 1 — Implementer

- **Files changed:** `bilateral-quality-assessment-dialog.component.{ts,html,scss}` (238 insertions / 38 deletions).
  - `.ts` — dropped the `PrDialogComponent` import; added drawer geometry constants (760 / 520–900 / `100vw` <640px, mirroring `bilateral-create-drawer` per `DD-2`), a `#panel` `viewChild`, a `manageOpenState` effect capturing `document.activeElement` + `document.body.style.overflow` on open and restoring both on close/destroy (`DD-3`), `requestClose()` as the single guarded exit, a Tab-key focus trap, and mouse-drag resize.
  - `.html` — scrim `<div>` + `<aside role="dialog" aria-modal="true">` wrapping the **unmodified** header/body/footer; ✕ rendered only when `!running() && !submitting()`; `shrink-0` / `flex-1 min-h-0 overflow-y-auto overscroll-contain` three-row contract; resize strip.
  - `.scss` — all four `::ng-deep app-pr-dialog` overrides deleted; `:host { display: contents }`; new horizontal-transform keyframes collapsed under `prefers-reduced-motion: reduce`; the footer padding rule converted from a dead `::ng-deep` selector to a plain scoped one.
- **Verification:** `npx jest --silent --reporters=summary --no-coverage --testPathPattern="bilateral-quality-assessment"` → **2 suites / 32 tests passed**. `npx ng lint --quiet` → **clean**. The Implementer additionally ran `npx ng build --configuration development` (beyond the brief) and it caught a real type error jest and lint both missed — Angular types `$event` as `Event`, not `KeyboardEvent`, for dotted key filters — fixed by casting inside `onTabKey`; gates re-run green afterwards.
- **Both pre-existing `.pr-dialog-footer` assertions still pass** — no re-layout happened, so `T-3`'s retarget is still owed but nothing broke early.

#### Attempt 1 — Reviewer verdict: **FAIL** (1 issue)

> **1. Discovered Issue:** The new ✕ control is a **24×24 px** hit target at every viewport, including phone width. The class is `size-8`, and this codebase pins `html, body { font-size: 12px }` (`onecgiar-pr-client/src/styles/fonts.scss:14`) with no `--spacing` override in the `@theme` block of `src/styles.scss`. Tailwind's `size-8` is `2rem`, which resolves to **24px here, not 32px**. There is no phone-width bump in the template or in the `@media (max-width: 560px)` SCSS block. This is the exact trap the client guide calls "the biggest trap in this codebase" (rem-based `size-*` on a 12px root).
>
> **2. Violated Rule:** `design.md` §6.7 *Accessibility* — "Touch targets ≥ 44px | Footer actions and **✕** at phone width (`R-7`)". Reinforced by `docs/ux-ui/design.md` §10 (WCAG 2.1 AA) and the rem-utility rule in `onecgiar-pr-client/CLAUDE.md` §5. The ✕ is introduced by this task, so it is in scope here and not deferrable to `BIL-QAD-T-4`, which only *verifies*.
>
> **3. Remediation Suggestion:** Express the box in explicit px and give it the mandated phone-width size, e.g. replace `size-8` with `size-[32px] max-[639px]:size-[44px]` (or `size-[44px]` unconditionally) at `bilateral-quality-assessment-dialog.component.html:45`. Keep `text-[20px]` on the icon. Sanity-check the other rem-based shell utilities copied from the exemplar — `w-2` on the resize strip is **6px**, not 8, and `-left-1` is **-3px**.

#### What the Reviewer verified independently (not taken on the Implementer's word)

- **`DD-3` lifecycle claim is true.** `bilateral-result-creator.component.html:43-44` mounts the component under `@if (!isCreating())`, not `visible()` — so close is a signal transition, the effect is the primary lock/release path, `ngOnDestroy` is a genuine safety net, and the `locked` guard makes the double-call a no-op. The spec's own failing input (pre-set `hidden` → still `hidden` after teardown) passes, and the first effect run at `visible()===false` correctly does **not** blank `document.body.style.overflow`.
- **Every reachable exit is guarded, including those bypassing `requestClose()`** — footer *Make adjustments* emits `dismissed` directly but is structurally absent while `running()` and `[disabled]` while `submitting()` (a disabled native button dispatches no click). No other emitter reaches `dismissed`.
- **Focus handling survives the running state** — zero focusables, so `focusPanel()` falls through to the `tabindex="-1"` `<aside>` and Escape still lands on an element carrying the binding. `keydown.tab` does **not** match Shift+Tab in Angular, so the third binding is not redundant.
- **Geometry matches `R-7`/`R-9` constant-for-constant** against `bilateral-create-drawer.component.ts:14-29`.
- **`AC-9` already clean** — no `::ng-deep` and no `app-pr-dialog` selector survives; only prose comments mention the name.

#### Rulings on the Implementer's `Not Done / Assumptions`

1. **Enter-only animation — accepted, recorded as a gap.** `R-10` is a SHOULD and `design.md` §6.6 specifies only the entrance; its sole MUST (collapse under `prefers-reduced-motion`) is satisfied. The `T-1` DoD line "Enter/exit transform" **cannot be ticked as written** — the honest record is *enter only*. Not gating.
2. **`aria-label` bound from `title()` — accepted.** `R-6` requires an accessible name, not a new field; an attribute is not visible copy, so `R-2` and the frozen contract are untouched.
3. **Focus-trap proof deferred to `T-4` — correct**, per `tasks.md` §5. A real Tab handler plus a recorded gap, not a presence assertion dressed as proof.
4. **Scope respected** — `bilateral-result-creator.component.html:44` and the spec file untouched, confirmed by reading both.

#### Spec amendment — `BIL-QAD-R-4` / `AC-4` / `design.md` §6.4 (owner ruling, 2026-09-18)

The Reviewer surfaced a contradiction **inside the approved spec**, and routed it to the Leader rather than consuming a rework attempt on it — correctly, since no code change was warranted either way:

| Clause | Said |
|---|---|
| `R-4`, `AC-4`, `design.md` §6.4 | While `running()` **or `submitting()`** → "no dismissal path **and no footer**", "absent entirely" |
| `R-2` inventory | The footer MUST carry "the *Submitting…* busy label" |
| `design.md` §2.2 | `submitting` → "Verdict view, **footer busy**", exits none |

`git show HEAD` on the pre-change template settles the ground truth: the footer is wrapped in `@if (!running())`, so while submitting it renders with both buttons `[disabled]`, `[attr.aria-busy]`, and a spinner + *Submitting…*. The `Submitting…` label `R-2` demands **can only exist if the footer renders**. `R-4`/`AC-4`/§6.4 had over-generalised from the running state — collapsing "no *exit*" into "no *footer*", true for `running`, false for `submitting`.

**Owner ruling:** amend `R-4`/`AC-4`/§6.4 to match shipped behaviour. Parity is this spec's governing constraint, and the alternative (dropping the footer during submit) would have been a behaviour change that breached the presentation-only premise. `R-2` and §2.2 stand unchanged. **No code change resulted** — the Implementer had moved the block verbatim, as `T-1` required.

**Applied:**
- `requirements.md` `BIL-QAD-R-4` — restated; the running/submitting split made explicit; a second scenario (*The submitting state is sealed but still speaks*) added; the amendment recorded inline with its rationale.
- `requirements.md` §10 — `AC-4` narrowed to `running()`; new **`AC-4b`** covers `submitting()` (nothing closes, no ✕, footer present and fully disabled).
- `requirements.md` §14 index — `R-4` now maps to `AC-4, AC-4b`.
- `design.md` §6.4 — footer row restated with the two-state behaviour and a pointer to the amendment.

**Correction Closure — two-direction sweep run** (per `/akili-specify`):
- *Forward* (superseded wording surviving elsewhere): `requirements.md` D-2 (§9) and `AC-1` already scoped their "no footer" to the **running** state only — correct as written, left alone. `design.md` §2.2 was already correct.
- *Backward* (documents citing the corrected clause, now asserting a falsehood): **4 sites in `tasks.md` were stale and were patched** — `T-1` *Implements* (added `AC-4b`), `T-1` negative clause ("must behave identically while `submitting()`" → the explicit two-state rule), `T-3` *Implements* (added `AC-4b`), `T-3` Definition of Done (guarded-exit assertions now paired with the complementary footer assertions), and the §5 Coverage-closure row for `R-4`.

This is the amendment the Reviewer flagged as needing resolution **before `T-3` is written**. It is now closed.

#### Attempt 2 — Implementer (rework)

- **Files changed:** one line — `bilateral-quality-assessment-dialog.component.html:45`, the close button's `class`: `size-8` → `size-[32px] max-[639px]:size-[44px]`. Icon left at `text-[20px]`. No other file, no other line.
- **Resize strip ruled on, not silently kept:** `-left-1 w-2` (-3px / 6px) left unchanged, with reasoning — pointer-only grab-strip (`cursor-col-resize`, `mousedown`), rendered only `@if (!isMobile())`; `R-9` scopes resize to `≥640px`; §6.7's 44px rule names only "Footer actions and ✕ at phone width". A future widening should go through the geometry spec rather than be changed silently.
- **Verification:** jest → **2 suites / 32 tests passed**; `ng lint --quiet` → clean; `ng build --configuration development` → success, zero errors.
- **`Not Done / Assumptions`:** none.

#### Attempt 2 — Reviewer verdict: **PASS**

> The single FAIL issue is genuinely remediated — the ✕ is now 32px desktop / 44px phone in explicit px, using a variant confirmed to compile in this project rather than assumed from a green build. The resize-strip ruling is accepted on the merits, and the one factual slip in the supporting claims (a 1px media-query boundary at 639 vs 640) has no effect at any spec'd viewport.

Notable in the audit — the Reviewer refused to accept the green build as proof the fix works:

> "I did not take the build as proof that the new variant compiles. Tailwind silently drops a class it does not recognise, so `ng build` passing says nothing about whether `max-[639px]:` emits CSS — that is precisely a presence-vs-effect gap. Verified instead against established compiled usage in this codebase: `max-[899px]:`, `max-[1279px]:`, `max-[1100px]:`, `max-[620px]:` across `results-list.component.html:173` and `dashboard-lab.component.html`."

It also corrected the Implementer's supporting arithmetic (non-gating): `max-[Npx]` compiles to strictly-less-than, so the 44px target applies below **639px**, not 640px, leaving a 1px band (639 ≤ w < 640) where the panel is full-bleed mobile but the ✕ is 32px. No `AC-7` viewport (1440 / 1024 / 375) and no real phone lands in it.

And it corrected the Implementer's sweep as *phrased*: `-left-1` and `w-2` **are** rem spacing-scale utilities and were ruled on in a separate paragraph rather than counted in the sweep. Net result holds — no unruled rem-spacing utility remains in the shell.

#### Recorded deviations (accepted, not silently ticked)

1. **`R-10` — enter-only animation.** The `T-1` DoD line "Enter/exit transform, ease-out, collapsed under `prefers-reduced-motion`" is ticked **as enter-only**. `@if` unmounts the element immediately on close, so no exit transition exists. `R-10` is a SHOULD; `design.md` §6.6 specifies only the entrance; the sole MUST (collapse under `prefers-reduced-motion: reduce`) is satisfied by a `reduce` block setting `animation: none`. Reviewer ruled it accepted and non-gating. `T-4`'s reduced-motion check still applies.
2. **Focus-trap proof deferred.** A real Tab-key handler is implemented, but D-5 cannot be proven in jsdom. `tasks.md` §5 assigns that proof to `BIL-QAD-T-4`; it is **not** counted as covered here.

#### ADVISORY (4R lens findings — recorded, never gating, and explicitly NOT converted into tasks)

From attempt 1:
- *Readability:* `<div pr-dialog-footer …>` keeps the `pr-dialog-footer` **attribute**, which existed only as `app-pr-dialog`'s content-projection selector and is now dead. `T-2` may drop the attribute (keep the class — global `src/styles.scss:1008` supplies the flex/justify and two specs bind to it).
- *Readability:* `[class.bqa-panel--mobile]="isMobile()"` binds a class defined nowhere in the SCSS — inherited dead from the exemplar, whose `bcd-panel--mobile` is equally undefined.
- *Readability:* `T-2`'s own verification is `grep -rn "ng-deep" <folder>` returning no `app-pr-dialog` target — two surviving **comments** at `…component.scss:118-120` will make that grep non-empty. **Carry this into `T-2`'s brief** so it is not misread as a red.
- *Reliability:* `releaseOpen()` schedules `setTimeout(() => target.focus(), 0)` after nulling `previousActiveElement`; a close-then-reopen in the same tick lets the stale timeout steal focus from the freshly focused panel.
- *Reliability:* on the *Go to \<section\>* path the deferred focus restore can yank focus back to the opener after the destination has focused a field. `OQ-2` froze the navigation behaviour, not the focus behaviour — one look during the `T-4` keyboard pass.
- *Resilience:* `startResize()`'s `mousemove`/`mouseup` listeners are removed only on `mouseup`; teardown mid-drag leaks both. The exemplar shares the defect.
- *Resilience:* `design.md` §6.3 specifies Escape as a **host listener**; it is bound on the `<aside>`. With `:host { display: contents }` the two are near-equivalent, so not a conformance miss — but `@HostListener('document:keydown.escape')` would hold `R-3` even with focus drifted outside the panel.
- *Risk:* the shell reuses the exemplar's raw values (`bg-[rgba(15,23,42,0.35)]`, `shadow-[-18px_0_44px_…]`, `text-gray-400`) rather than `--pr-*` tokens, and hardcodes three a11y strings ("Close", "Resize panel", "Checking quality") where the exemplar centralises copy in `internationalization/`. Both are deliberate `DD-2` pattern parity and §8 keeps i18n closed — recorded so the debt is counted alongside the fourth-shell debt in `BIL-QAD-T-5`.
- *Risk (lateral, not this spec's work):* the 24px ✕ is inherited from `bilateral-create-drawer.component.html:35`, which ships the same `size-8` and is **in production with the same phone-width target problem**. Per the module-ownership convention this belongs on the ticket that surfaced it — not a new ticket minted from this spec.

From attempt 2:
- *Readability:* `max-[639px]:` reads as "below the mobile breakpoint" but compiles to `< 639px`; `max-[640px]:` would track `isMobile()` exactly.
- *Reliability:* the breakpoint now lives in three places that must agree — `MOBILE_BREAKPOINT = 640` (TS), the exemplar's `min-[640px]:` conventions, and this `max-[639px]:`. Only one is greppable by the constant name.

#### Task outcome

- **Requirements covered:** `BIL-QAD-R-1`, `R-3`, `R-4` (as amended), `R-6` (structure; trap proof deferred to `T-4`), `R-7`, `R-9`, `R-10` (enter-only) · `AC-1`, `AC-3`, `AC-4`, `AC-4b`, `AC-6` · `DD-1`, `DD-2`, `DD-3`.
- **Final verification:** jest 2 suites / 32 tests passed · `ng lint --quiet` clean · `ng build` clean.
- **Attempts:** 2 (1 FAIL, 1 PASS) — within the 1–2 review rounds budgeted in `design.md` §14.
- **LOC:** 239 insertions / 38 deletions against a 120-LOC estimate for this task. **Over the task line, not yet over the spec's ~400 total** — see the budget note below.
- **Status: PASS.**

> **Budget watch (not yet a tripwire).** `T-1` came in at ~239 added vs 120 estimated. `design.md` §14 budgets ~400 LOC total across five tasks; `T-2` (150) and `T-3` (120) would put the run near 470. The spec itself names `T-2` as the most likely overrun. If `T-2` also runs over, the Leader stops and escalates the delta rather than continuing.

---

### `BIL-QAD-T-2` — Body re-layout into the reference's visual language, content frozen

**Status:** in progress · **Date:** 2026-09-18 · **Attempts so far:** 1

> **Out-of-band, recorded here because it happened mid-task:** at the owner's request the work so far was committed (`736589e46`, no Jira ticket — `BIL-QAD-OQ-1` waived by the owner; traceability carried by the `[SPEC:bilateral/qa-ai-verdict-drawer]` reference) and `origin/performance-refactor` was merged into the branch (`e3ab84d78`, exit 0, zero conflicts). Verified the merge touched neither this component folder, nor `src/styles.scss`, nor `src/styles/fonts.scss`, nor `package.json`; scoped jest re-run **after** the merge stayed green at 2 suites / 32 tests. The branch is now 0 behind / 2 ahead of `origin/performance-refactor`.

#### Attempt 1 — Implementer

- **Files changed:** `.html` (~72 lines) and `.scss` (~76 lines). No `.ts` delta. Within the 150-LOC estimate.
- Eyebrow-styled `<h3>` group headings, larger card radius/padding, bigger status chips, tightened body rhythm — all as explicit `[Npx]` Tailwind arbitrary values (the rem trap that failed `T-1` was avoided). Removed the dead `pr-dialog-footer` content-projection attribute, kept the class. Widened the legend pill column 62px → 76px so the larger chip does not wrap.
- **Verification:** jest 2 suites / 32 tests passed · lint clean · build clean · `grep -rn "ng-deep"` → 1 hit, a comment at `.scss:125`, not a selector.

#### Attempt 1 — Reviewer verdict: **FAIL** (1 issue)

**Content parity — the requirement this spec exists to protect — was verified and HOLDS.** The Reviewer checked every `-`/`+` pair in the HTML rather than trusting the walkthrough: *"Every changed line differs only in its `class` attribute. No text node, interpolation, element, attribute or control was added, removed or reordered."* `R-8` negatives hold, nothing was added, both empty slots stayed empty, the `toggleSection()` scroll rescue is intact (`DD-4`/`R-11`), every a11y attribute survived, and `DD-6` holds — not one verdict colour re-picked. The FAIL is a different class of defect:

> **1. Discovered Issue:** `gap-[24px]` on the body element is **inert**. The intended 24px section rhythm does not render; the body lays out at **12px**, and it rendered at 20px before this task — **a visible regression, not merely an unapplied intent**. `T-2` deleted `gap: 20px` from `.bqa-dialog__body` and substituted a Tailwind utility on an element that also carries the globally-styled class `pr-dialog-body`. `src/styles.scss:906` declares `.pr-dialog-body { display: flex; flex-direction: column; gap: 12px; }` **unlayered** — the `@layer base` block at line 578 closes at line 590, so everything from 591 on is top-level — and it is emitted *after* the Tailwind utilities, which enter at `src/styles.scss:13`. At equal specificity (0,1,0) the later unlayered rule wins; if the utilities resolve into `@layer utilities`, unlayered wins outright. Either way `gap: 12px` beats `gap-[24px]`. It worked before only because the component rule carried Angular's `[_ngcontent]` attribute (0,2,0). **This is invisible to every gate that ran:** jsdom measures no layout, the build does not resolve the cascade, and a presence assertion on the class would pass while the effect is absent.
>
> **2. Violated Rule:** `design.md` §6.4 *Layout contract* and §6.5 *Visual language mapping*; `requirements.md` §9 **D-4** (visual regression, **no automated gate**, so an inert utility ships unnoticed) and §8 *Styling* / `docs/ux-ui/design.md` §7 rule 1, whose Tailwind-first mandate presumes the utility actually applies.
>
> **3. Remediation Suggestion:** Restore the declaration to the rule that already owns the body's box mechanics — `.bqa-dialog__body { display: grid; align-content: start; gap: 24px; min-height: 0; overflow-y: auto; overscroll-behavior: contain; }` — and drop `gap-[24px]` from the template; the encapsulated selector out-specifies the global. Alternative: remove the hostile `pr-dialog-body` class from the element (no spec assertion binds to it). Do **not** reach for `gap-[24px]!`. Then sweep the other re-treated elements for the same collision shape.

#### Rulings on the flagged claims

- **`pr-dialog-footer` attribute removed, class kept — verified correct.** The Reviewer found the *affirmative* reason the `.pr-dialog-footer` SCSS block must stay: the global rule also sets `padding-top: 4px`, so a Tailwind `pt-[16px]` would lose by exactly the mechanism in issue 1. Keeping those declarations encapsulated (0,2,0) is technically correct, not laziness — and it resolves the `T-2` DoD tension ("deleted, not relocated"): the `::ng-deep` **piercing** is genuinely gone (`AC-9` satisfied), and what remains is a justified exception to "no new `.pr-*` SCSS blocks".
- **Legend pill column 62px → 76px — inside remit, not scope creep.** The chip grew (`2px 9px`/11px → `px-[12px] py-[4px]`/12px), so the fixed 62px track would clip or wrap the widest label. A direct consequence of the §6.5-mandated chip re-treatment on an element wholly owned by this task. Accepted — but unverifiable in jsdom, so it rides on the owner's screenshot review with the rest of D-4.
- **Card radius/padding/chip padding as the Implementer's own judgment — accepted as the honest disposition.** §6.5 dictates the *treatment*, not the values; the values are calibrated against the existing `.bqa-dialog__eyebrow` rather than invented; routing them to the owner's screenshot review instead of self-certifying is correct given D-4 has no gate.
- **`T-3` has no hidden retargeting work** — verified directly: every `.bqa-dialog__*` hook is still on its element with the same class name; only SCSS declarations moved.

#### Attempt 2 — Implementer (rework)

- **Files changed:** `.html` 1 line (dropped the inert `gap-[24px]` plus three template utilities duplicating SCSS), `.scss` +15/−3 (restored `gap: 24px` into `.bqa-dialog__body`; expanded the comment to record *why* `gap` cannot be a utility; added a preemptive comment above `.pr-dialog-footer`).
- **Cascade outcome stated:** winner `.bqa-dialog__body[_ngcontent-<hash>]` at **(0,2,0)** declaring `gap: 24px`, beating `.pr-dialog-body { gap: 12px }` at **(0,1,0)**. Wins on specificity, independent of Tailwind layering or source order — so unlike the dead utility it cannot regress if the cascade shifts again.
- **Collision sweep:** `.pr-dialog-header` and `.pr-dialog-footer` carry `shrink-0`; neither global declares `flex-shrink` → uncontested. All other re-treated elements carry only component-scoped `bqa-dialog__*` classes. Body div confirmed the only occurrence.
- **Verification:** jest 2 suites / 32 tests · lint clean · build clean.
- **`Not Done / Assumptions`:** consolidating `min-h-0 overflow-y-auto overscroll-contain` from template into SCSS was its own judgment call under "pick one home per property" — not a live bug, but the same double-source-of-truth shape that caused the defect.

#### Attempt 2 — Reviewer verdict: **PASS**

> The inert `gap-[24px]` is gone and `gap: 24px` now lives in the encapsulated `.bqa-dialog__body` rule, which out-specifies the unlayered global `.pr-dialog-body { gap: 12px }` at (0,2,0) vs (0,1,0) — verified against both stylesheets, including that nothing wraps line 906 in a layer. The `≤560px` padding override and the `shrink-0` utilities are confirmed uncontested, and the consolidation is a justified deduplication rather than a retreat from Tailwind-first.

The Reviewer **re-derived the cascade rather than checking it against the claim**, and added a precision that matters for anyone reusing this reasoning:

> "It is 'specificity alone **given both rules are unlayered**', not specificity alone in general (cascade layers outrank specificity); what makes it safe here is that Angular guarantees the component side stays unlayered."

It also answered the media-query question the Implementer had not addressed: `@media (max-width: 560px) { .bqa-dialog__body { padding-left/right: 16px } }` is still `(0,2,0)` — media queries add no specificity — so below 560px it beats the surviving `px-[24px]` and above it does not match. Intended behaviour, **but** the "exactly one declaring rule per property" claim is overstated: padding-left/right has two homes, the base as a template utility and the ≤560px override in SCSS. Correct and deliberate, not a defect.

**Collision sweep independently confirmed, not accepted:** grepping `pr-dialog-*` across all SCSS returns only `src/styles.scss` and another component's encapsulated sheet (structurally unable to reach this DOM). No reachable global declares `flex-shrink`. The `.pr-dialog--promote/--discard/--delete` descendant rules that *do* set footer padding and body margin require a modifier class on an ancestor that this drawer never has.

**Ruling on the consolidation — within remit.** Three grounds: (1) those three declarations pre-date this spec — `T-1` added the template duplicates, so removing them deletes a duplicate rather than migrating anything off the Tailwind-first path, and `DD-12` governs *new* styling; (2) §7 rule 1's escape hatch is squarely engaged since Tailwind cannot express `gap` on this element at all, so the box is already a legitimate SCSS island; (3) leaving the duplicates would have preserved exactly the split-home shape that caused the bug, with no offsetting benefit.

#### ADVISORY (recorded, never gating, not converted into tasks)

- *Readability:* the new cascade comment is the most valuable thing in the diff — the only place the trap is written down. Two precisions would make it durable: it is specificity-alone *because both rules are unlayered*, and padding-left/right still has a second declaring rule in the `≤560px` media query at `.scss:141`.
- *Risk (carry into `T-4` and any future work on this component):* a Tailwind utility on an element that also carries a globally-styled `.pr-*` class can be silently outranked by unlayered CSS in `src/styles.scss`, and **neither jest, nor lint, nor the build will say a word**. The browser pass is the only place this class of bug surfaces — worth an explicit look at the body's section rhythm while checking D-3.

#### Task outcome

- **Requirements covered:** `BIL-QAD-R-2` (content parity — verified line-by-line, holds), `R-5`, `R-8`, `R-11` · `AC-2`, `AC-8`, `AC-9` · `DD-4`, `DD-6`. `AC-5` remains `T-4`'s gate.
- **Final verification:** jest 2 suites / 32 tests · lint clean · build clean · `grep -rn "ng-deep"` → 1 hit, a comment, not a selector.
- **Attempts:** 2 (1 FAIL, 1 PASS) — within the 1–2 review rounds budgeted.
- **Status: PASS.**

#### Budget reconciliation (correcting the `T-1` note above)

The `T-1` entry flagged "239 insertions vs a 120 estimate" as a possible overrun. **That comparison was wrong** — `design.md` §14 budgets ~400 LOC **net**, and the entry compared raw insertions against it. Actuals for `T-1`+`T-2` combined: **278 added / 59 deleted = 219 net**, against a combined estimate of 270. With `T-3` (120) and `T-5` (10) outstanding, the projected total is **~349 net vs the ~400 budgeted**. **The run is under budget; no tripwire fires and no escalation is owed.**

---

## Budget tripwire — fired 2026-09-18, owner ruled CONTINUE

`design.md` §14 budgets **~400 LOC net**. Measured after `T-3`:

| Task | Budgeted | Actual (net) |
|---|---|---|
| `BIL-QAD-T-1` shell | 120 | 165 |
| `BIL-QAD-T-2` re-layout | 150 | 54 |
| `BIL-QAD-T-3` spec file | 120 | **332** |
| **Total** | **390** | **551** |

**+41% over budget. The entire deviation is `T-3`.** Production code across `T-1`+`T-2` came in at **219 net, under its share**.

**Cause.** `T-1` and `T-2` shipped no tests — by design, that was `T-3`'s job. But `T-3`'s DoD requires covering shell presence, all **three** dismissal doors separately, the `submitting` footer (`AC-4b`), the `R-2` parity inventory **state by state**, and the body-lock restore. None of it had pre-existing coverage, and the five-section fixtures carrying issues, strengths, evidence, score and summary are inherently verbose. 120 lines was an optimistic estimate, not a scope overrun.

**Leader error, recorded.** The budget note appended to the `T-2` entry projected ~349 net and declared the run under budget. That projection used the *estimate* of 120 for `T-3` as if it were data. With data, the figure is 551. The earlier "under budget" statement was wrong and is superseded by this block.

**Owner ruling (2026-09-18): CONTINUE.** The overrun is test code covering a gate that did not previously exist; cutting it would lower protection on **D-1**, the defect class this spec exists to prevent and the only one of the important ones jsdom can actually see. Recorded as information, not failure, exactly as §14 intends.

## Coverage thresholds — owner ruled: accept INCONCLUSIVE

The client gate is a **global** 50/60/60/60. It was **not measured** for this run.

- The coverage command in `T-3`'s brief collects nothing: `collectCoverage` defaults to `false` in `package.json`, so omitting `--no-coverage` is insufficient — `--coverage` must be passed explicitly. (The brief was the Leader's; the error is the Leader's.)
- A scoped run over this component alone reported **68/48/74/71** (stmts/branches/fns/lines). The Implementer **correctly refused** to present that as a pass: it is a per-file number compared against a whole-app threshold.
- A true global reading needs the full client suite, which was not run — machine memory was AMBER, and both `CLAUDE.md` files steer agents away from unscoped runs (an unscoped `npx jest` has previously killed a session by OOM).

**Owner ruling: accept as inconclusive, do not claim a pass.** The change is test-file-only with zero production edits and adds branches nothing else covers (submitting-state footer, running-state Escape guard, body-lock restore), so it cannot plausibly *lower* global coverage — it can only hold or raise it. **Recorded as unmeasured, not as green.** CI's gate on the PR is the real check.

---

### `BIL-QAD-T-3` — Spec: parity inventory, shell behaviour, lock restore

**Status:** in progress · **Date:** 2026-09-18 · **Attempts so far:** 1

#### Attempt 1 — Implementer

- **Files changed:** `bilateral-quality-assessment-dialog.component.spec.ts` only (+332/−0). No production code.
- **Result:** 49 tests pass (32 pre-existing, unmodified + 17 new). Lint clean.
- 9 D-1 parity tests, 7 D-2 behaviour tests, 1 D-6 lock test. New `fullView()` five-section fixture.
- **`.pr-dialog-footer` selectors needed no retargeting** — the class survived `T-2`, both left untouched and green.
- **`Not Done`:** `.disabled` on footer buttons unobservable under the repo's Jest mock; coverage threshold inconclusive.

#### Attempt 1 — Reviewer verdict: **FAIL** (2 issues)

> **1. Discovered Issue:** The D-6 test **cannot observe the defect D-6 names.** It pre-sets `document.body.style.overflow = 'hidden'`, opens, closes, and expects `'hidden'`. That fixture distinguishes the correct implementation from *blank-and-reset* — but it passes identically for two broken implementations: one that **leaks** (sets `hidden`, never restores) and one where **the lock never engages at all**. In both cases the body still reads `'hidden'` because the test itself put it there and nothing overwrote it. So the most literal reading of the defect — "`document.body.style.overflow` **left set** after unmount" — has no assertion behind it, while §9 marks D-6 as ✅ gated.
> **2. Violated Rule:** `requirements.md` §9 defect class **D-6**. (The `T-3` DoD line "*Body-lock restore assertion (previous value, not `''`)*" **is** satisfied literally; the gap is against §9's defect, which the table claims this spec closes.)
> **3. Remediation:** Add one complementary case, ~8 lines, from a clean baseline: set `overflow = ''`, set `visible` true, assert `'hidden'` (proves the lock engages), then `visible` false and assert `''` (proves no leak). Together with the existing case the pair covers all three failure modes — no lock, leak, blank-and-reset — none of which is observable today.

> **1. Discovered Issue:** The parity block **skips the running state**, and two of its inventory items are asserted nowhere. `R-2`'s running row enumerates five items; the file covers the progress bar, the tip and the four legend *meanings*, but the **lead line `"Reading the result against the quality criteria. This usually takes under a minute."` has no assertion at all** — the string exists only in `…component.html:56` — and the four `VERDICT_LEGEND` **labels** (Green/Amber/Red/Grey) are likewise unasserted. The group heading *What the colours mean* appears only as a **negative** at line 139, which would still pass if the heading were deleted outright. A re-word of the lead line passes the strong gate silently — exactly the D-1 drift this spec exists to prevent.
> **2. Violated Rule:** `requirements.md` `R-2` inventory **Running** row and §9 **D-1**; `tasks.md` `T-3` DoD — "*Parity assertions cover **running**, deciding, stale, unavailable and the footer labels*".
> **3. Remediation:** Add one running-state parity test (~10 lines): the exact lead-line string, the `What the colours mean` heading **positively**, and the four labels.

#### What the Reviewer verified and accepted

- **Production untouched**, byte-for-byte the state passed in the `T-2` re-audit; `spartanBrainMock.ts` unedited.
- **No assertion oversteps the jsdom boundary** — nothing measures geometry, scroll, visibility or Tab containment; no focus-trap test, no `toBeVisible`. `tasks.md` §5's assignment of D-3/D-4/D-5 to `T-4` is respected.
- **Failing inputs spot-checked and real** — strip the `running() || submitting()` guard from `requestClose()` and both guard tests fail on `dismissedCount`. Parity strings come from the **approved inventory**, not scraped from the template.

#### Rulings on the three judgement calls — all three went the Implementer's way

1. **Removing the `disabled` sub-assertion: root cause confirmed at both ends, removal correct.** `hlm-button.ts:62` declares `hostDirectives: [{ directive: BrnButton, inputs: ['disabled'] }]`, so `[disabled]` is consumed by the BrnButton input and never reaches the native DOM property. In production the real brain directive binds `[attr.disabled]`/`[attr.data-disabled]`/`[attr.tabindex]`, so the button genuinely **is** disabled in a browser. The Jest stub at `tests/mocks/spartanBrainMock.ts:3-6` reproduces the input with **no host block at all**, so nothing is emitted and no DOM query can distinguish the states. The only alternative was editing a shared mock used across the suite — outside a one-file task. **The `AC-4b` guarantee is not weaker in production; only the harness is blind, and the inline comment says so accurately.**
2. **Coverage — and a stronger framing than "inconclusive".** Both refusals were correct, but the underlying question is **dispositive, not merely plausible**: coverage is computed over `collectCoverageFrom`, which enumerates source files and **does not include `*.spec.ts`**, so a test-only change cannot add to the denominator and can only hold or raise the numerator. **A test-only diff is monotonically non-decreasing on global coverage.** Honest record: *"cannot decrease; absolute value unchanged by this task and unverified locally; CI enforces it on every run"* — which supersedes the bare INCONCLUSIVE recorded above.
3. **The two `.pr-dialog-footer` selectors — confirmed, no retargeting needed.** The one surviving `app-pr-dialog` reference (line 380) is a deliberate **negative** assertion, which is the right kind.

#### On the budget escalation — the Reviewer was asked whether the 332 lines are padding

> "Essentially none. The `fullView()` fixture (~43 lines) is the `AC-2` five-section fixture the spec demands and serves four tests. The long comments document real constraints and the `BrnButton` one is the most valuable thing in the file for the next maintainer. The only avoidable bulk is the four-line `setInput` preamble repeated in all nine parity tests — a helper would have saved ~25 lines. **The overrun is genuine coverage, not inflation**; the 120-line estimate under-sized a task that had to cover seven render states, three dismissal doors, two guard states and a lock lifecycle."

This independently supports the owner's CONTINUE ruling above.

#### Attempt 2 — Implementer (rework) + a Leader spec correction

- **D-6 complementary case added** from a clean `''` baseline: assert `'hidden'` after open (proves the lock engages), `''` after close (proves no leak).
- **Running-state parity test added:** the full lead line, the *What the colours mean* heading **positively**, and the four `VERDICT_LEGEND` labels as an ordered `toEqual(['Green','Amber','Red','Grey'])`.
- **Finding reported, not silently codified.** The Implementer found `R-2`'s Running row quoted the lead line **truncated** — *"Reading the result against the quality criteria…"* — while the template carries *"Reading the result against the quality criteria. This usually takes under a minute."* It asserted only the inventory-backed substring and **reported the discrepancy instead of scraping the full value from the template**, which is exactly what the task's negative clause asks for.
- **Leader action:** amended `requirements.md:102` to quote the lead line in full, recorded inline with date and provenance, **then** had the Implementer extend the assertion — so the value is inventory-backed, not template-scraped. Swept the rest of the inventory table for the same shape: the only other `…` is the literal *"Submitting…"* UI label, not a truncation.
- **Advisories acted on:** nine parity tests folded onto an `open(assessment)` helper (−19 lines); the test named *"renders as a right-anchored panel over a scrim"* renamed to *"renders a scrim and a labelled modal dialog, not app-pr-dialog"* — the old name claimed anchoring jsdom cannot check.
- **Verification:** **51 tests pass** (2 suites) · lint clean. File 494 → 513 lines.

#### Attempt 2 — Reviewer verdict: **PASS**

> Both FAIL issues are genuinely closed — the D-6 pair now discriminates all three failure modes including the two the original fixture was blind to, and the running row of the `R-2` inventory is fully gated with the lead line, the heading and the four ordered legend labels. The `R-2` amendment is a sound correction of an incomplete quote rather than a spec bent to the code, and the refactor and rename are provably assertion-neutral.

**On the Leader's amendment — audited, not accepted.** The Reviewer was explicitly asked to check the Leader's own spec edit, and gave three grounds for it being a correction rather than bending the spec to the code:

> "The lead-line sentence predates this spec entirely (`T-1` moved the body verbatim, `T-2` touched only `class` attributes — both verified line by line in my earlier audits), so it was never authored to satisfy an assertion; `R-2` is a *parity* requirement whose normative content is 'every string the modal rendered survives unchanged', which makes the pre-change component the source of truth and the table a listing of it — completing a truncated quote makes the listing agree with the requirement it serves rather than picking a new value; and the change is **additive to the gate**, so it cannot retroactively excuse anything. The two alternatives were both worse: leaving the ellipsis keeps the second sentence formally ungated in a table that calls itself complete, and asserting only the first clause would have codified the truncation as the contract."

**Other verifications:** the D-6 discrimination table was re-derived rather than accepted — every cell accurate, including the two "No"s; the heading assertion reads the `<h3>` text node, not the `aria-label` on the `<section>`, so it cannot pass off the ARIA copy; the refactor was checked **pairwise against attempt 1** — every `open(...)` argument is the exact object the old preamble passed and all assertion bodies are byte-identical; the rename is cosmetic with the same four assertions.

> "Nothing in the file now claims more than it proves. No assertion touches layout, visibility, fixed chrome or a genuine focus trap; the D-3/D-4/D-5 boundary in `tasks.md` §5 is respected; the one deliberately weakened assertion (`[disabled]` through the `BrnButton` stub) is documented inline with its root cause and routed to `T-4` — and with `T-4` now attested, that pointer resolves rather than dangling."

#### ADVISORY (recorded, not actioned)

- *Readability:* the file now has two local `open()` helpers with different signatures — the parity block's takes an assessment, the D-2 block's takes state overrides. Both correctly scoped to their `describe`, no shadowing bug, and a comment flags the mirroring; renaming one `openWith(assessment)` would remove the ambiguity at zero cost. Not actioned — an advisory is recorded, not converted into work.

#### Task outcome

- **Requirements verified:** `BIL-QAD-R-1` … `R-8` · `AC-1` … `AC-4`, `AC-4b`, `AC-6`, `AC-8`, `AC-9`.
- **Final verification:** 51 tests / 2 suites green · lint clean. Coverage: **cannot decrease** (coverage is computed over `collectCoverageFrom`, which excludes `*.spec.ts`); absolute global value unverified locally, enforced by CI.
- **Attempts:** 2 (1 FAIL, 1 PASS).
- **Status: PASS.**

---

### `BIL-QAD-T-4` — Browser verification pass (sole gate for D-3, D-4, D-5)

**Status: PASS (owner-attested)** · **Date:** 2026-09-18 · **Performed by:** Juan David Delgado (spec owner)

This task has no automated gate by construction — `requirements.md` §9 records that jsdom has no layout engine and cannot evaluate D-3 (scroll/overflow), D-4 (visual) or D-5 (focus trap). The owner performed the browser pass and attested it as passing.

**Recorded conservatively, per `tasks.md`'s own disqualifying conditions:**

| Item | Record |
|---|---|
| **D-3** — fixed chrome at 5 sections, last expanded | Owner-attested pass |
| **D-5** — keyboard: Tab containment, Escape in `deciding` vs `running`, focus return | Owner-attested pass |
| **D-4** — 1440 / 1024 / 375px, no horizontal page scroll | Owner-attested pass. **Medium at 375px not specified** — `tasks.md` requires a desktop device-emulator run be recorded as *emulated*; since the medium was not stated, this is recorded as **unspecified**, not as device-verified |
| Reduced-motion | Owner-attested pass |
| **`BIL-QAD-DD-4`** — re-test D-3 **with the scroll rescue removed** | **Not re-measured. The rescue is KEPT** — the spec's default. `R-11` permits removal *only* on a verified pass without it; absent that measurement, keep stands |

**Evidence basis:** owner attestation, not screenshots filed to the spec. The owner is the named authority for this gate; recording the basis honestly is what keeps the distinction meaningful.

**Carried forward:** the `T-2` audit flagged that a Tailwind utility on an element also carrying a globally-styled `.pr-*` class can be silently outranked by unlayered CSS, invisible to jest, lint and build. The body's 24px section rhythm was the instance found and fixed; this class of defect surfaces only in a browser.

---

### `BIL-QAD-T-5` — Record the debt and amend the parent spec

**Status: PASS** · **Date:** 2026-09-18 · **Attempts:** 1 · Docs only, ~49 lines across four `.md` files.

#### Attempt 1 — Implementer

- **`bilateral-create-drawer/CLAUDE.md`** — *Pendiente* now counts **4 consumers** for the `shared/components/pr-drawer` extraction (`bilateral-create-drawer`, `result-review-drawer`, `indicator-drawer`, and since 2026-09-18 `bilateral-quality-assessment-dialog`), naming `DD-5` for the `…-dialog`-renders-a-drawer mismatch. Debt paragraph for the two `T-1` advisories (raw values vs `--pr-*` tokens; three hardcoded a11y strings vs centralised `internationalization/`), framed as debt with their reasons. ⚠️ in *Trampas* for the lateral finding.
- **Parent spec `qa-ai-traffic-light`** — amendment across 8 touch-points in `requirements.md` + `design.md`.
- **`qa-ai-verdict-drawer/design.md` §12** — the `DD-4` outcome.

#### Attempt 1 — Reviewer verdict: **PASS**

> All three writes do what the task asked and nothing beyond its file boundary — the lateral 24px ✕ is recorded in production terms without a fix or a ticket, the `DD-4` outcome is recorded conservatively enough to resist misreading, and the parent-spec amendment is correct sweep discipline: every one of the eight touch-points neutralises a now-false claim, each says behaviour is unchanged, adjacent-but-still-true text was deliberately left alone, and every edit is additive so the historical record survives.

**On the six-vs-two writes judgement call — ruled correct sweep discipline, not scope creep.** The Reviewer applied the standard to each touch-point and found each neutralised a specific, checkable falsehood: §1's *"The client renders it in one `app-pr-dialog`"* (the component no longer imports `PrDialogComponent` at all); §6.2/§6.3's `styleClass 'pr-dialog …'`, *"Dialog max width 720 px"* and *"focus trap **from `app-pr-dialog`**"* (the shipped drawer is 760/520–900 with its own `onTabKey` trap); `BIL-QAI-DD-10`, whose decision *was* the centred shell; and the §8 NFR row, false for the verdict window but **still true for the AI completion dialog** — the note splits exactly those two surfaces.

> "The discriminator that settles it: adjacent-but-still-true text was left alone. `requirements.md:382`, the §8 **Accessibility** row — *'Dialog: `role="dialog"`, labelled, focus trap, Esc closes as Make adjustments, live region for state changes'* — sits one line above an edited row and every clause of it is still true of the drawer. It was not touched. That is discrimination, not blanket annotation."
>
> "Stopping at 'two small writes' would have **failed** the task's own FAIL condition… 'Two small writes' was the estimate; the DoD plus the FAIL condition are the contract. And — the property that makes the extension safe — **all eight are additive annotations**: no original sentence was deleted or rewritten, so the historical record stays intact and auditable. Had it rewritten §6.3's bullets in place, I would have called that drift."

**`DD-4` outcome does not overstate.** Records KEEP, states the pass was performed *with the rescue in place*, that `AC-5` was **not re-measured without it**, and closes the loophole: *"This is not a finding that the rescue is necessary, only that removal was never attempted; do not read it as 'verified necessary.'"*

**Sweeps verified independently.** A repo-wide grep across all `.md` returns 12 files mentioning this component: 10 in the two spec folders, 1 is `T-5`'s own module guide, and 1 (`docs/bilateral-module/integration-contracts.md`) refers to the *program review drawer* — a different surface, already called a drawer. **No file outside the two spec folders describes this component as a centred modal.** The decision not to touch `docs/ux-ui/design.md` §6 was confirmed right: it is the generic pattern catalogue stating the rule this spec now *complies* with; editing it would have been the real scope violation. Shared-file discipline held — no root guide, `.agents/`, template or `docs/trd/trd.md` touched.

#### ADVISORY (recorded, not actioned)

- *Readability:* `bilateral-create-drawer/CLAUDE.md:3` still reads `**Verified:** 2026-09-14 · bilateral/manual-create-drawer (BIL-MCD-T-2, T-7)` while the file now carries two entries dated 2026-09-18 — the stamp is older than the content it vouches for. A bare re-stamp would **over-claim**: nobody re-verified that whole doc against its component's code, and no code in that folder changed, so the client guide's re-stamp trigger did not fire. The honest form keeps both facts, e.g. `**Verified:** 2026-09-14 · … · addenda 2026-09-18 (BIL-QAD-T-5 — findings recorded, code not re-verified)`. **Not actioned** — an advisory is recorded, not converted into work. Flagged to the owner at closure.

---

## 3. Summary — spec complete

**All five tasks closed. 2026-09-18.**

| Task | Status | Attempts | Gate |
|---|---|---|---|
| `BIL-QAD-T-1` shell | ✅ PASS | 2 | jest + lint + build |
| `BIL-QAD-T-2` body re-layout | ✅ PASS | 2 | jest + lint + build + `ng-deep` grep |
| `BIL-QAD-T-3` spec file | ✅ PASS | 2 | 51 tests, lint |
| `BIL-QAD-T-4` browser pass | ✅ PASS | 1 | **owner attestation** (no automated gate exists) |
| `BIL-QAD-T-5` docs + debt | ✅ PASS | 1 | read-back + two-direction sweep |

**Final verification:** 51 tests / 2 suites green · `ng lint --quiet` clean · `ng build` clean · no `::ng-deep` selector targets `app-pr-dialog`.

**Requirements closed:** `BIL-QAD-R-1` … `R-11` · `AC-1` … `AC-9` plus `AC-4b` · `DD-1` … `DD-6`.

### Deviations and limits carried out of this run — none of them silent

1. **`R-10` enter-only animation.** `@if` unmounts immediately on close, so no exit transition exists. `R-10` is a SHOULD; its sole MUST (collapse under `prefers-reduced-motion`) is met. Reviewer-accepted; the `T-1` DoD line is ticked `[~]`, not `[x]`.
2. **Coverage thresholds not measured.** Global 50/60/60/60 needs the full client suite, not run (memory AMBER; both `CLAUDE.md`s forbid unscoped runs). Coverage **cannot decrease** — `collectCoverageFrom` excludes `*.spec.ts`. CI enforces the real number on the PR.
3. **`[disabled]` on footer buttons while submitting is not assertable.** The Jest `BrnButton` stub declares `disabled` as a bare `@Input()` with no host bindings. Production is unaffected — the real directive binds `[attr.disabled]`. Documented inline.
4. **`T-4` evidence basis is owner attestation, not screenshots filed to the spec.** The 375px medium was not specified, so it is recorded as **unspecified**, not device-verified.
5. **`DD-4`: KEEP, not re-measured.** The spec's default stands; removal was never attempted.
6. **Budget: 551 net LOC vs ~400 budgeted (+41%).** Entirely `T-3`'s test code. Owner ruled CONTINUE; the Reviewer independently confirmed the lines are genuine coverage, not padding.
7. **`BIL-QAD-OQ-1` waived by the owner** — committed without a Jira ticket; traceability carried by the `[SPEC:bilateral/qa-ai-verdict-drawer]` reference.

### Spec amendments made during execution

1. **`R-4` / `AC-4` / `design.md` §6.4** — "no footer while submitting" contradicted `R-2`'s inventory and §2.2. Amended to match shipped behaviour; new `AC-4b` added. Backward sweep found and fixed **4 stale sites in `tasks.md`**, including `T-3`'s DoD.
2. **`R-2` Running row** — the lead line was quoted truncated with an ellipsis, leaving its second sentence ungated in a table declaring itself complete. Quoted in full; the assertion was extended only afterwards, so the value is inventory-backed rather than template-scraped.

### Lateral findings recorded, not fixed, no tickets minted

- `bilateral-create-drawer.component.html:35` ships the **same 24px ✕** this spec had to fix, **in production**. Belongs on the ticket that surfaced it.
- 8 remaining `progress_activity` icon uses render as raw text (pre-existing, `requirements.md` §13).

### For `/akili-archive`

- **Constitution Impact:** none. No module created, no boundary moved, no public surface changed — the component contract is frozen and the only consumer's bindings are untouched.
- **CodeGraph re-index:** pending (component internals changed substantially).
- **Kaizen candidate (the most reusable lesson here):** in this repo a Tailwind utility on an element that also carries a globally-styled `.pr-*` class can be **silently outranked** by unlayered CSS in `src/styles.scss` — and jest, lint and the build are all blind to it. Companion trap: the root font-size is pinned to 12px, so every rem-based utility resolves to 75% of its documented px value. Both cost a review round in this run.
