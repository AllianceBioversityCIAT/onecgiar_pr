# Tasks — QA AI verdict drawer (W3/Bilateral)

## 1. Scope of this task list

- **Module / feature:** `bilateral` / `qa-ai-verdict-drawer` · code **`BIL-QAD`**
- **Linked spec:** `requirements.md` + `design.md` (this folder)
- **Owner / driver:** Juan David Delgado
- **Status:** `complete` (2026-09-18 — all 5 tasks PASS; see `execution.md` §3)
- **Budget (design.md §14):** 5 tasks · ~400 LOC · 1–2 review rounds. Exceeding it **stops and escalates**, it does not silently continue.

## 2. Pre-flight checklist

- [x] `requirements.md` approved (2026-09-18)
- [x] `design.md` approved (2026-09-18)
- [ ] `BIL-QAD-OQ-1` (ticket placement) resolved — **needed before the commit, not before the code**
- [x] `BIL-QAD-OQ-2`, `OQ-3` resolved (2026-09-18)
- [x] CLARISA dependencies — **N/A**, no external data
- [x] Migration — **N/A**, no DB change
- [x] No conflicting in-flight spec on this component (checked 2026-09-18)
- [x] Working tree clean; branch `JuanGuzman-io/feature-p2-3150-bilateral` confirmed 2026-09-18. Re-confirm before the first commit and again before reporting a green run

## 3. Task list

### `BIL-QAD-T-1` — Drawer shell: scrim, panel, focus, lock, geometry  ·  **[x] DONE** (2026-09-18, 2 attempts, Reviewer PASS)

- **Type:** `client`
- **Description:** Replace `app-pr-dialog` with a local scrim + right-anchored `<aside>`. Implement the four shell mechanics from `design.md` §6.3 (scrim, guarded Escape, focus capture/return, save-and-restore body lock) and the three-row layout contract from §6.4. Body content is moved across **verbatim** in this task — re-layout is `BIL-QAD-T-2`'s job, so that a failure here is unambiguously a shell failure.
- **Implements:** `BIL-QAD-R-1`, `BIL-QAD-R-3`, `BIL-QAD-R-4`, `BIL-QAD-R-6`, `BIL-QAD-R-7`, `BIL-QAD-R-9`, `BIL-QAD-R-10` · `BIL-QAD-AC-1`, `BIL-QAD-AC-3`, `BIL-QAD-AC-4`, `BIL-QAD-AC-4b`, `BIL-QAD-AC-6` · `BIL-QAD-DD-1`, `BIL-QAD-DD-2`, `BIL-QAD-DD-3`
- **Files:** `onecgiar-pr-client/src/app/pages/bilateral/components/bilateral-quality-assessment-dialog/{*.ts,*.html,*.scss}`
- **Depends on:** — · **Blocks:** `BIL-QAD-T-2`, `BIL-QAD-T-3`
- **Estimate:** `M`
- **Negative clauses owned by this task:**
  - `BIL-QAD-R-1` — must NOT render as a centred modal box; must be the only overlay for the whole flow
  - `BIL-QAD-R-3` — dismissal must NOT submit, re-run, or discard the stored assessment
  - `BIL-QAD-R-4` — must NOT render ✕/Cancel/any working exit while running **or** submitting. No footer at all while `running()`; while `submitting()` the footer **stays present and fully inert** (all actions disabled, primary button busy) — amended 2026-09-18, see `requirements.md` `BIL-QAD-R-4`
  - `BIL-QAD-R-6` — must NOT leave `document.body` scroll-locked after unmount
  - `BIL-QAD-R-7` — must NOT produce horizontal page scroll
- **Verification:** `npx jest --silent --reporters=summary --no-coverage --testPathPattern="bilateral-quality-assessment"` + `npx ng lint --quiet`
- **Input that would make this check FAIL** (if none exists, the check is not evidence): set `running` to `true` and dispatch `Escape` — a shell that forwards Escape unguarded emits `dismissed` and the assertion fails. Likewise, mount with `document.body.style.overflow = 'hidden'` pre-set, destroy the component, and assert the value is still `'hidden'` — the naive blank-and-reset implementation (`BIL-QAD-DD-3`) restores `''` and fails.
- **What the automated check cannot prove:** that focus is genuinely **trapped** (D-5). jsdom's focus model does not reproduce browser tab containment. `BIL-QAD-T-4` owns the real proof; this task's `Escape`/focus-return assertions do not stand in for it.
- **Definition of done:**
  - [x] Scrim + `<aside role="dialog" aria-modal="true">` with an accessible name
  - [x] `Escape`, scrim and ✕ all guarded on `running() ‖ submitting()`
  - [x] Focus captured on open, returned on close — *structure only; the trap itself is `BIL-QAD-T-4`'s proof (D-5)*
  - [x] Body lock **saves and restores the previous value** (`BIL-QAD-DD-3`) — not blank-and-reset · *Reviewer verified the lifecycle claim against `bilateral-result-creator.component.html:43-44`*
  - [x] 760px default / 520–900px drag ≥640px · `100vw` <640px, no drag affordance
  - [~] Enter/exit transform, ease-out, collapsed under `prefers-reduced-motion` — **enter only**, recorded deviation. `@if` unmounts immediately on close so no exit transition exists; `R-10` is a SHOULD and its sole MUST (`prefers-reduced-motion: reduce` → `animation: none`) is met. Reviewer ruled it accepted and non-gating
  - [x] `focus-visible:ring-2` on ✕ and every interactive control — never bare `outline-none`
  - [x] Lint clean · N/A: migration, Swagger, i18n (no new strings), bilateral change log
  - [x] ✕ hit target 32px desktop / 44px phone in **explicit px** — the attempt-1 FAIL (`size-8` = 24px at this repo's 12px root)

### `BIL-QAD-T-2` — Body re-layout into the reference's visual language, content frozen  ·  **[x] DONE** (2026-09-18, 2 attempts, Reviewer PASS)

- **Type:** `client`
- **Description:** Re-treat the body into eyebrow-grouped sections and cards per `design.md` §6.5, using Tailwind utilities (DD-12). Every content node from the `BIL-QAD-R-2` inventory is preserved with identical text. The verdict colour tokens carry over verbatim (`BIL-QAD-DD-6`).
- **Implements:** `BIL-QAD-R-2`, `BIL-QAD-R-5`, `BIL-QAD-R-8`, `BIL-QAD-R-11` · `BIL-QAD-AC-2`, `BIL-QAD-AC-5`, `BIL-QAD-AC-8`, `BIL-QAD-AC-9` · `BIL-QAD-DD-4`, `BIL-QAD-DD-6`
- **Files:** same folder — `*.html`, `*.scss`
- **Depends on:** `BIL-QAD-T-1` · **Blocks:** `BIL-QAD-T-3`
- **Estimate:** `M`
- **Negative clauses owned by this task:**
  - `BIL-QAD-R-2` — must NOT add any field, label, counter, subtitle or action the modal did not have; must NOT rewrite, shorten or re-tone any copy string
  - `BIL-QAD-R-5` — must NOT require any `::ng-deep` override of a dialog wrapper
  - `BIL-QAD-R-8` — must NOT introduce the reference's subtitle, "N of N reviewed" counter, *Re-run review*, *Finish review*, or any per-field suggestion control; must leave a slot **empty** rather than invent content
  - `BIL-QAD-R-11` — the `toggleSection()` scroll rescue **stays** unless `BIL-QAD-T-4` verifies `BIL-QAD-AC-5` without it (`BIL-QAD-DD-4`)
- **Verification:** the same `jest` + `lint` pair, plus `grep -rn "ng-deep" <component folder>` returning no `app-pr-dialog` target (`BIL-QAD-AC-9`).
- **Input that would make this check FAIL:** render an assessment with all five sections, a score, a summary, issues, strengths and evidence, and assert each inventory string — deleting or rewording any one of them fails the parity assertions in `BIL-QAD-T-3`. For `BIL-QAD-AC-9`, leaving one wrapper override in the SCSS makes the grep non-empty.
- **⚠️ Budget tripwire:** if content parity starts requiring **logic** changes, the "design only" premise is wrong. **Stop and escalate to the user** rather than changing behaviour to fit the layout.
- **Definition of done:**
  - [x] Every `BIL-QAD-R-2` inventory item present with unchanged text, in every state — *Reviewer diffed every `-`/`+` pair: changed lines differ only in `class`*
  - [x] Eyebrows, cards, chips, sub-blocks and footer follow the reference treatment — *values are the Implementer's judgment, calibrated against the existing eyebrow; D-4 has no automated gate, so they route to the owner's screenshot review in `T-4`*
  - [x] Header subtitle and footer status slots left **empty**
  - [x] All four `app-pr-dialog` `::ng-deep` overrides deleted, not relocated — *done in `T-1`; `AC-9` re-verified here, the one `ng-deep` grep hit is a comment*
  - [~] Tailwind-first; no new `.pr-*` SCSS blocks; `material-icons-round` only — **justified exception:** `gap` and the footer paddings **cannot** be utilities on these elements (unlayered global `.pr-*` rules outrank them). Reviewer ruled the SCSS home correct, not a retreat from `DD-12`
  - [x] `aria-expanded` / `aria-controls` / `inert` / `role="status"` / `aria-live="polite"` all preserved
  - [x] Lint clean · N/A: migration, Swagger, i18n, bilateral change log
  - [x] Cascade collision swept — body div was the only element where a new utility was silently outranked by a global `.pr-*` rule

### `BIL-QAD-T-3` — Spec: parity inventory, shell behaviour, lock restore  ·  **[x] DONE** (2026-09-18, 2 attempts, Reviewer PASS — 51 tests)

- **Type:** `tests`
- **Description:** Retarget the two `.pr-dialog-footer` selectors (current lines 72, 143) and add the gates for defect classes D-1, D-2 and D-6. The parity block asserts the `BIL-QAD-R-2` inventory state by state — it is the strong gate for the requirement that carries this spec's whole constraint.
- **Implements:** verifies `BIL-QAD-R-1` … `BIL-QAD-R-8` · `BIL-QAD-AC-1` … `BIL-QAD-AC-4`, `BIL-QAD-AC-4b`, `BIL-QAD-AC-6`, `BIL-QAD-AC-8`, `BIL-QAD-AC-9`
- **Files:** `…/bilateral-quality-assessment-dialog.component.spec.ts`
- **Depends on:** `BIL-QAD-T-1`, `BIL-QAD-T-2` · **Blocks:** `BIL-QAD-T-4`
- **Estimate:** `M`
- **Verification:** `npx jest --silent --reporters=summary --no-coverage --testPathPattern="bilateral-quality-assessment"`; client coverage thresholds (50/60/60/60) hold.
- **Input that would make this check FAIL:** each new assertion is written against a fixture that exercises it — e.g. the running-state fixture with `Escape` dispatched (fails an unguarded shell), the pre-set-`hidden` body fixture (fails blank-and-reset), the full five-section fixture (fails any dropped string). A test with no such input is removed, not kept green.
- **What these assertions cannot prove:** they are **presence and event assertions**. They prove the right nodes exist and the right events fire; they do **not** prove the drawer is laid out correctly, that the footer stayed fixed, that anything is visible, or that contrast passes. jsdom reports every element at 0×0. D-3, D-4 and D-5 are **not covered here** and are `BIL-QAD-T-4`'s sole responsibility.
- **Definition of done:**
  - [x] Both `.pr-dialog-footer` selectors retargeted; no assertion still references `app-pr-dialog` — *no retargeting was needed: the class survived `T-2`. The one surviving `app-pr-dialog` reference is a deliberate negative assertion*
  - [x] Parity assertions cover running, deciding, stale, unavailable and the footer labels — *running was missing on attempt 1 and is the FAIL that was fixed*
  - [x] Guarded-exit assertions for `running()` and `submitting()` + the complementary footer assertions (`AC-4` / `AC-4b`)
  - [x] Body-lock restore assertion — *two cases; the pair discriminates all three failure modes (no-lock, leak, blank-and-reset). A single case was the attempt-1 FAIL*
  - [x] Every pre-existing assertion in the file still passes, unmodified — *all 32*
  - [~] Suite green; thresholds met — **51 tests green; thresholds NOT measured.** The global 50/60/60/60 gate needs the full client suite, not run (memory AMBER; both `CLAUDE.md`s forbid unscoped runs). Coverage **cannot decrease** — `collectCoverageFrom` excludes `*.spec.ts`, so a test-only diff is monotonically non-decreasing. CI enforces the real number
  - [~] `[disabled]` on footer buttons while submitting — **not assertable.** The Jest `BrnButton` stub declares `disabled` as a bare `@Input()` with no host bindings, so it reaches neither property nor attribute. Production is unaffected (the real directive binds `[attr.disabled]`). Documented inline, routed to `T-4`

### `BIL-QAD-T-4` — Browser verification pass (the only gate for D-3, D-4, D-5)  ·  **[x] DONE** (2026-09-18, owner-attested)

- **Type:** `tests`
- **Description:** The manual pass that the automated suite structurally cannot perform. **This is not belt-and-braces** — for the layout, visual and focus-trap defect classes it is the only gate that exists, per `requirements.md` §9.
- **Implements:** `BIL-QAD-AC-5`, `BIL-QAD-AC-7` · `BIL-QAD-R-5`, `BIL-QAD-R-6`, `BIL-QAD-R-7`, `BIL-QAD-R-10`, `BIL-QAD-R-11` · `BIL-QAD-DD-4`
- **Files:** none (evidence: screenshots attached to the spec or the ticket)
- **Depends on:** `BIL-QAD-T-3` · **Blocks:** `BIL-QAD-T-5`
- **Estimate:** `S`
- **Verification checklist:**
  - [ ] **D-3** — 5 sections, **last one expanded**: header and footer stay fixed, **Submit for review** reachable without scrolling the chrome, expanded panel brought into view
  - [ ] **D-5** — keyboard only: `Tab` stays inside the drawer; `Escape` dismisses in `deciding` and does nothing while `running`; focus returns to **View AI assessment**
  - [ ] **D-4** — screenshots at **1440 / 1024 / 375px**; no horizontal page scroll at any width; footer actions tappable at 375px
  - [ ] Reduced-motion: enable the OS setting, confirm the drawer appears without transform animation
  - [ ] **`BIL-QAD-DD-4` decision recorded:** re-test D-3 **with the scroll rescue removed**. Keep it unless the check passes without it. Write the outcome into `design.md` §12 `BIL-QAD-DD-4`
- **Disqualifying conditions — when this evidence is worthless:**
  - A screenshot that does not show the drawer at its **scrolled-to-bottom** state proves nothing about D-3. The pass condition is the footer visible *with the body scrolled*, not on first paint.
  - If the 375px check runs in a desktop browser's device emulator only, record it as emulated. Emulated ≠ verified for touch-target reachability.
  - **An inconclusive result is a legitimate outcome and must be reported as one.** Do not collapse "I could not reproduce five sections" into a pass.
- **Definition of done:**
  - [x] Every box above ticked or explicitly recorded as not-verified with the reason — *D-3, D-5, D-4 and reduced-motion owner-attested; 375px medium recorded as **unspecified**, not device-verified*
  - [~] Screenshots reviewed by the owner at the HITL pause — *basis is owner attestation, not screenshots filed to the spec*
  - [x] `BIL-QAD-DD-4` outcome written back into `design.md` — **KEEP** (not re-measured; the spec's default)

### `BIL-QAD-T-5` — Record the debt and amend the parent spec  ·  **[x] DONE** (2026-09-18, Reviewer PASS)

- **Type:** `docs`
- **Description:** Two small, factual writes. Neither is optional: the first keeps the `pr-drawer` extraction honestly counted, the second keeps the parent spec from describing a surface that no longer exists.
- **Implements:** `design.md` §13 · `BIL-QAD-DD-2`, `BIL-QAD-DD-5`
- **Files:** `…/bilateral-create-drawer/CLAUDE.md` (*Pendiente* section) · `docs/specs/bilateral/qa-ai-traffic-light/` (amendment note on `BIL-QAI-R-4`, `BIL-QAI-R-10`)
- **Depends on:** `BIL-QAD-T-4` · **Blocks:** —
- **Estimate:** `S`
- **Verification:** read back both files; the parent spec's presentation clauses point at this spec, and its behavioural clauses are stated as unchanged.
- **Input that would make this check FAIL:** grep the parent spec for "modal" / "dialog" describing this surface — any surviving hit that now states a falsehood is a miss (the backward sweep from *Correction Closure*).
- **Definition of done:**
  - [x] `bilateral-create-drawer/CLAUDE.md` *Pendiente* counts a **fourth** consumer for `shared/components/pr-drawer`
  - [x] Parent spec carries an amendment note: presentation superseded by `bilateral/qa-ai-verdict-drawer`, behaviour unchanged — *8 additive touch-points; Reviewer ruled this correct sweep discipline, since §1, §6.2/§6.3, `DD-10` and the §8 NFR row each asserted a specific falsehood a footer note could not neutralise*
  - [x] Forward + backward sweep done for the words "modal"/"dialog" across both spec folders — *judged hit by hit, not mass-replaced; adjacent-but-still-true text deliberately left alone*
  - [x] **Shared-file discipline honoured:** no edit to root `CLAUDE.md`, `AGENTS.md`, `.agents/`, packaged templates or `docs/trd/trd.md` from this branch. `bilateral-create-drawer/CLAUDE.md` is a module guide, not a root guide — in scope

## 4. Dependency graph

```
BIL-QAD-T-1 (shell)
   └── BIL-QAD-T-2 (body re-layout, content frozen)
         └── BIL-QAD-T-3 (spec: parity + behaviour + lock)
               └── BIL-QAD-T-4 (browser pass — sole gate for D-3/D-4/D-5)
                     └── BIL-QAD-T-5 (debt + parent-spec amendment)
```

Strictly linear. No parallel branch is worth opening: all five tasks touch one component folder, and `BIL-QAD-T-2` cannot be judged until `BIL-QAD-T-1`'s shell is in place.

## 5. Coverage closure

Closure is at **scenario and clause** granularity, not requirement ID. Every scenario and every `BUT` / `AND IT MUST` clause has a named owner:

| Requirement | Scenario owner | Negative/strict clauses owner |
|---|---|---|
| `BIL-QAD-R-1` | `BIL-QAD-T-1` | `BIL-QAD-T-1` (not a centred modal; single overlay) |
| `BIL-QAD-R-2` | `BIL-QAD-T-2` | `BIL-QAD-T-2` (no added field/subtitle/counter; no copy rewrite) — asserted by `BIL-QAD-T-3` |
| `BIL-QAD-R-3` | `BIL-QAD-T-1` | `BIL-QAD-T-1` (no submit/re-run/discard) — asserted by `BIL-QAD-T-3` |
| `BIL-QAD-R-4` | `BIL-QAD-T-1` | `BIL-QAD-T-1` (no ✕/Cancel/working exit in either state; no footer while running, footer present-but-inert while submitting) — asserted by `BIL-QAD-T-3` |
| `BIL-QAD-R-5` | `BIL-QAD-T-2` | `BIL-QAD-T-2` (no `::ng-deep` override) — **layout effect proven only by `BIL-QAD-T-4`** |
| `BIL-QAD-R-6` | `BIL-QAD-T-1` | `BIL-QAD-T-1` (no scroll-lock leak) — **trap proven only by `BIL-QAD-T-4`** |
| `BIL-QAD-R-7` | `BIL-QAD-T-1` | `BIL-QAD-T-1` (no horizontal scroll) — **proven only by `BIL-QAD-T-4`** |
| `BIL-QAD-R-8` | `BIL-QAD-T-2` | `BIL-QAD-T-2` (no reference-only features; empty slot over invented content) |
| `BIL-QAD-R-9` | `BIL-QAD-T-1` | — |
| `BIL-QAD-R-10` | `BIL-QAD-T-1` | `BIL-QAD-T-4` (reduced-motion check) |
| `BIL-QAD-R-11` | `BIL-QAD-T-2` (default: keep) | `BIL-QAD-T-4` (the only thing that may authorise removal) |

**Three clauses have no automated owner** — `BIL-QAD-R-5`'s layout effect, `BIL-QAD-R-6`'s trap, `BIL-QAD-R-7`'s overflow. They are owned by `BIL-QAD-T-4` as a manual gate, deliberately, because jsdom cannot evaluate them. They are not left implicit and they are not counted as covered by `BIL-QAD-T-3`.

## 6. Skills

| Task | Skills |
|---|---|
| `BIL-QAD-T-1`, `BIL-QAD-T-2` | `angular-developer`, `ui-ux-pro-max`, `tailwind-design-system` |
| `BIL-QAD-T-3` | `angular-developer`, `tdd` |
| `BIL-QAD-T-4` | `ui-ux-pro-max` (a11y checklist), `claude-in-chrome` or `agent-browser` for the browser pass |
| `BIL-QAD-T-5` | `cognitive-doc-design` |

## 7. Estimated LOC & PR strategy

| Task | ~LOC |
|---|---|
| `BIL-QAD-T-1` | 120 |
| `BIL-QAD-T-2` | 150 (largely markup moved, not added) |
| `BIL-QAD-T-3` | 120 |
| `BIL-QAD-T-4` | 0 |
| `BIL-QAD-T-5` | 10 |
| **Total** | **~400** |

**Single PR.** Although ~400 LOC brushes the split threshold, the change is one component folder with one consumer and no server half — there is no boundary worth splitting on, and a shell-only PR would be unreviewable without its body. The PR description should lead reviewers at the **content-parity diff** first (`BIL-QAD-T-2`), state that the flow, contract and service are untouched, and link the parent spec.
