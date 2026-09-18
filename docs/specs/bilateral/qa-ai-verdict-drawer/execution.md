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

