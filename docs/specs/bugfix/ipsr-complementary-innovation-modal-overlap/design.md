# Design — IPSR modals hidden behind the sidebar and header

> **Answer first:** one CSS rule in the IPSR host component, `ipsr.component.scss`. It sets `animation-fill-mode: backwards` on `.section_container` for every IPSR page. The fade-in looks identical, but once it ends the animation releases the page container. The container stops being a stacking context, and every `app-pr-dialog` mask (`z-index: 1100`) then competes at app level, above the sidebar (`z-10`) and the header (`z-30`). No change to `app-pr-dialog`, to the modal templates or to the global `transitions.scss`.

## Document Control

| Field | Value |
|---|---|
| Spec | `bugfix/ipsr-complementary-innovation-modal-overlap` |
| Requirements | `requirements.md` (same folder, approved 2026-10-01) |
| Depth / mode | Lite · Bug Mode |
| Status | approved 2026-10-01 |
| Verified at | `e094b6162` |

## 1. Summary

- **What:** stop the IPSR page containers from trapping modal masks under the shell chrome (`ICM-R-1..3`).
- **Shape:** client-only. One scoped style rule plus one real-browser regression test.
- **Trade-off accepted:** the fix lives at the IPSR boundary, not the global class. Result Detail and the other 28 templates that use `.section_container` / `.detail_container` keep the trap; that is a follow-up (§13).

Links: `docs/prd.md` `US-P3`, `US-S5` · `docs/ux-ui/design.md` §6, §10 · `docs/trd/trd.md` §6.

## 1A. Premise Ledger

**Count:** 11 rows · 10 verified · 1 `UNVERIFIED` (Impact `Low`: 1). P-10 and P-11 were added by the 2026-10-01 Pivot (`ICM-DD-2`).
**Blast-radius triggers:** `live-path` (the design names a user action: open the modal from Step 2.1) · `shared-state` (changes a condition, the stacking context of `.section_container`, that many in-page elements read) · `consumer` (the class `.section_container` is a DOM hook read by tests and services; this design does not rename it).

| # | Claim | Class | Citation (as run) | Verified at | If false | Settled by |
|---|---|---|---|---|---|---|
| P-1 | An `opacity` animation retained by `animation-fill-mode: both` keeps its element a stacking context after it finishes; `backwards` releases it | `existence` | Headless Chrome 1000×800 repro mirroring the shell (`scratchpad/{a,b,c}.html`), all animations forced to finish via `animation.finish()`, `document.elementFromPoint`: `both` → sidebar point = `side`, header point = `hdr`, `×` = `side`; `backwards` → `panel`, `panel`, `x`; no animation → `panel`, `panel`, `x` | `e094b6162` | DD-1 fixes nothing; re-diagnose before any task (**High**) | — |
| P-2 | **Live path:** URL `/ipsr/detail/{code}/ipsr-innovation-use-pathway/step-2/complementary-innovation` → `IpsrComponent` (`ipsr-routing.module.ts:6`) → `innovation-package-detail` `.section_container` (`innovation-package-detail.component.html:40`, outlet `:72`) → `ipsr-innovation-use-pathway` (outlet `.html:4`) → `step-n2` `.local_container.section_container` (`step-n2.component.html:2`, outlet `:13`) → `complementary-innovation` → `new-complementary-innovation` → `<app-pr-dialog>` inline (`new-complementary-innovation.component.html:8`) | `live-path` | File:line per hop as listed | `e094b6162` | The rule in `IpsrComponent` does not reach the modal; T-2 targets the real ancestor (**High**) | — |
| P-3 | `app-pr-dialog` renders its mask inline (`@if (visible)`, `position: fixed; inset: 0; z-index: 1100`), with no portal | `location` | `shared/components/pr-dialog/pr-dialog.component.html:1-2`, `pr-dialog.component.scss:3-8` | `e094b6162` | A portal already exists; the trap is elsewhere (**High**) | — |
| P-4 | Shell chrome: sidebar `fixed z-10` (`spartan/sidebar/src/lib/hlm-sidebar.ts:81`), header `sticky z-30` (`app.component.scss:38-43`), both outside the router outlet (`app.component.html:12-49`) | `location` | File:line as listed | `e094b6162` | The mask's 1100 would already win, contradicting P-1 (**High**) | — |
| P-5 | `.section_container` is globally `@extend .fadeIn` (opacity 0→1, `fill-mode: both`), and no IPSR SCSS sets `animation*` on it | `existence` | `styles/transitions.scss:5-15`; `grep -rnE "animation" --include='*.scss' src/app/pages/ipsr` → 3 hits, all in `ipsr-contributors.component.scss:110,114,153` (chip animations, not `.section_container`) | `e094b6162` | A local rule already overrides it; specificity must be re-planned (**Low**) | — |
| P-6 | **Siblings — IPSR trap containers and the modals inside them.** `grep -rnE 'class="[^"]*\b(section_container\|detail_container\|fadeIn)\b' --include='*.html' src/app/pages/ipsr` → 6 hits. 4 are `.section_container`: creator `:1`, list-content `:1`, detail `:40`, step-n2 `:2`. 2 are inner `.fadeIn` grids (`ipsr-contributors-non-cgiar-partners.component.html:6`, `step-n1-institutions.component.html:9`) that contain no dialog. `grep -rln "<app-pr-dialog" --include='*.html' src/app/pages/ipsr` → 10 modals: creator; list `update-ipsr-result-modal`; detail `ipsr-unsubmit-modal`, `ipsr-submission-modal`; step-2 `new-complementary-innovation`; step-3 `ipsr-step3-evidence-list`; step-4 `step-n4-add-partner`, `step-n4-add-bilateral`, `step-n4-add-project`, `step-n4-edit-bilateral` | `shared-state` | Commands and counts as run | `e094b6162` | A modal sits under a trap the rule does not reach (**Low**: widen the selector) | — |
| P-7 | **Siblings — in-page elements whose z-order is read against the released context.** IPSR-owned: `grep -rnE "z-index\s*:\s*-?[0-9]+\|\bz-\[?-?[0-9]+\]?" --include='*.scss' --include='*.html' src/app/pages/ipsr` → 16 hits. ipsr-list-filters popover `z-10` (`.html:64`) and `z-index: 2` (`.scss:61`). innovation-package-custom-table `.pr-menu-panel` fixed `1100` (`.scss:207`). ipsr-contributors `.partnersindex` relative `10` (`.scss:14`), `.position_sticky` `11` (`.scss:18`), inline `1` (`.html:44,266`), `3` (`.html:131`). ipsr-contributors-toc label `-1` (`.html:87`, inside `.partnersindex`, which is its own stacking context, so unaffected). ipsr-submit-progress popover `z-30` (`.html:37`). non-cgiar-partners `1` (`.scss:42`), `3` (`.scss:225`). step-n3-current-use `2` (`.scss:26`). step-n1-innovaton-use `2` (`.scss:26`). step-n1-institutions `1` (`.scss:43`), `3` (`.scss:222`). Shared, rendered inside pages: `grep -rnoE "z-index\s*:\s*([3-9][0-9]\|[0-9]{3,})\|\bz-\[?([3-9][0-9]\|[0-9]{3,})\]?" custom-fields shared/components` (excl. spec, pr-dialog) → 23 hits. In-page ones: `custom-fields.scss:375` tooltip `100000`, sync-button `100`, lead-contact-person `1000/1001`, pr-multi-select `1000`, pr-select `10000` ×2, save-button pdf-dropdown `1000`, custom-spinner `10000`, result-metadata-window `1050`. The other 14 are shell chrome outside the outlet, so unaffected: shell-topbar `30` ×2, pr-toast `1200`, test-environment-label `1000`, ai-assistant-panel `1050` ×2, navigation-bar `200` ×2, header-panel `102/101/100/101`, reporting-nav-sidebar `220` | `shared-state` | Commands as run; the full list is above | `e094b6162` | An element ≤ 29 starts painting over the header, or an inner order flips (**Low**: scope the rule narrower) | — |
| P-8 | **Consumers of `.section_container` as a DOM hook** read it as a selector, not for its stacking: `grep -rlnE "section_container\|detail_container\|fadeIn\|animation-fill-mode\|animationFillMode" --include='*.spec.ts' --include='*.cy.ts' src cypress` → 7 files. `innovation-package-creator.component.spec.ts:290` (`'.section_container'` query), `cypress/e2e/result-detail/save-validation.cy.ts:19` (comment about the same query), plus 5 non-IPSR specs (`data-control.service`, `section-skeleton.directive`, `result-detail`, `cap-dev-info`, `rd-contributors-and-partners.zoneless`). No test asserts `animation-fill-mode` | `consumer` | Command as run | `e094b6162` | A test pins the computed animation; T-2 updates it (**Low**) | — |
| P-9 | A Cypress `userToken` is available, and IPSR result **9657, phase 37** opens Step 2.1 for that user on `http://localhost:4200`. Verified: `:4200` is served from **this worktree** (`lsof -iTCP:4200 -sTCP:LISTEN` → cwd `qa-development-2026-mc-2/onecgiar-pr-client`). Not verified: the user states the token is configured, but `cypress.env.js` is missing in both checkouts (`test -f`). The Orca browser was not reachable (`orca skills get orca-cli` → `Unable to determine Orca.app path from symlink: /usr/local/bin/orca`) | `data-env` | `UNVERIFIED — confirm at source before relying on it` | — | T-1 cannot run in Cypress; T-1 falls back to the DevTools probe in the user's authenticated browser (**Low**) | T-1 first step · owner: Maria Camila Giraldo (`user-stated`: token + result 9657/37) |
| P-10 | Of the 8 header-less IPSR modals, 6 have no close control and 2 have their own (`update-ipsr-result-modal.component.html:7`, `ipsr-step3-evidence-list.component.html:209-211`) | `shared-state` | `grep -rn 'showHeader\]="false"' --include='*.html' src/app/pages/ipsr` → 8; per-file read of the title rows | `e094b6162` | A modal gets a duplicate `×`, or one is missed (**Low**) | — |
| P-11 | `app-pr-dialog` has no floating close today: `×` only inside `@if (showHeader)`, and `hide()` is the only path that emits `onHide`. It has 45 consumers and no existing Jest spec of its own | `consumer` | `pr-dialog.component.html:9-17`, `pr-dialog.component.ts` `hide()`; `grep -rln "<app-pr-dialog" --include='*.html' src/app` → 45; `ls shared/components/pr-dialog` → no spec | `e094b6162` | The input already exists, or a consumer relies on header-less having no `×` (**Low**) | — |

## 2. Architecture Overview

### 2.1 Where this lives

- **Client only:** `onecgiar-pr-client/src/app/pages/ipsr/ipsr.component.scss` (host of every IPSR route).
- **Server / API / payloads:** none.

### 2.2 Interaction

```
[click Add new complementary innovation]
  └── dialogStatus = true → <app-pr-dialog> renders mask (fixed, z 1100) inline
        BEFORE: inside .section_container ×2 (retained opacity animation → stacking context)
                → mask competes only inside the page → sidebar (z10) + header (z30) paint over it
        AFTER : fade animation released after 1s (fill-mode backwards) → no stacking context
                → mask competes at app level → above sidebar + header, viewport-centered
```

## 3–5. Data model · API · Server workflow

No change.

## 6. Frontend Plan

### 6.1 Routes / modules

`pages/ipsr` only. No route or guard change.

### 6.2 Components & services

- **`IpsrComponent` styles:** a host-scoped deep rule that sets `animation-fill-mode: backwards` on `.section_container` (`ICM-DD-1`). Specificity is host attribute + class, (0,2,0). That beats the global `.section_container` (0,1,0) from `@extend`, with no `!important`.
- No change to `app-pr-dialog`, the 10 modal components, `transitions.scss` or any template.

### 6.3 Design system usage

- SCSS is allowed here: this is projected and routed DOM, not layout/spacing/colour (`docs/ux-ui/design.md` §7 rule 1).
- Responsive: no breakpoint logic; the modal's own `70vw` / `95vw` rules stay.
- A11y: the `×` becomes reachable by pointer. No change to `role`, `aria-modal` or focus.
- i18n: none.

## 7. Security

No change.

## 8. Performance

None measurable: one declaration and no new animation. The fade still runs once per container mount.

## 9. Observability

None.

## 10. Testing Plan

- **Regression, red → green (mandatory):** a Cypress E2E that opens the real modal and reads `document.elementFromPoint` at three points (the `×` probe only where the modal has a header; `ICM-AC-6` amended 2026-10-01): inside the panel over the sidebar's area, in the panel's top row under the header's area, and at the `×` center. It runs with the sidebar expanded and collapsed (`[data-guide="sidebar-toggle"]`, state from `hlm-sidebar[data-state]`), at 1440×900 and 1100×700. It checks centering with the panel's bounding rect. It repeats the expanded check on a Step 4 sibling (`ICM-AC-6`) and the header check while scrolled (`ICM-AC-5`). Red on current code must come from the topmost-element assertion, not from a timeout. The modal must be asserted visible first.
- **Fallback (P-9 refuted):** the same three probes as a DevTools snippet in the authenticated browser at the HITL pause, recorded in `execution.md`.
- **Unchanged suites:** `pr-dialog`, `new-complementary-innovation`, `complementary-innovation*` Jest specs, plus the creator spec in P-8.
- **Not provable in Jest:** stacking and geometry (jsdom). No style-presence Jest test is added, because it would assert presence, not effect.

## 11. Backwards Compatibility & Rollback

CSS-only. Rollback = revert the commit.

## 12. Design Decisions

### `ICM-DD-1` — Release the retained fade at the IPSR boundary

- **Context:** P-1 to P-5. The mask is trapped by the retained `opacity` animation on two `.section_container` ancestors.
- **Decision:** in `ipsr.component.scss`, set `animation-fill-mode: backwards` on `.section_container` for all IPSR descendants. `backwards` keeps the 0-opacity start (no flash before the first frame) and drops the retained end state. That end state is `opacity: 1`, which equals the default, so nothing visual is lost.
- **Alternatives rejected:**
  - *Same change in global `transitions.scss`.* Fixes the app-wide trap (32 templates) but exceeds the approved IPSR scope and widens the blast radius to Result Detail. Follow-up §13.
  - *Portal `app-pr-dialog` to `<body>`.* Breaks the `::ng-deep app-pr-dialog .<class>` styling of all 45 consumers (`ICM-R-4`).
  - *Native `<dialog>` top layer.* App-root toasts (`pr-toast` z-1200) and page overlays would render under the top layer.
  - *Raise the dialog's z-index.* Has no effect inside the trap (P-1).
  - *Give `.section_container` a z-index above 30.* That would lift the whole page over the sticky header.
- **Consequences:** in-page overlays with z ≥ 30 (P-7, in-page list) may paint above the header while they overlap it, as on bilateral pages (`ICM-R-5`). For the first ~1s after a container mounts, the animation still runs and the trap still applies, which is accepted (§13).

#### Step 2.3 reversion challenge — "what does removing the retained `both` end state break?"

The DD reverts delivered behavior (the retained fill), so the challenge applies. It was run inline: Lite depth, and the evidence is already cited in P-1 and P-7.

- **Visual end state:** `opacity: 1` equals the default, so no breakage.
- **Stacking:** in-page z ≤ 29 elements still sit under the header (z-30). The only negative z-index (`-1` label) is inside `.partnersindex`, its own context. The `z-30` submit-progress popover now ties with the header, and DOM order lets the later element paint over. That is intended for an open popover (`ICM-R-5`). In-page z ≥ 30 overlays may now overlap the chrome, which is accepted.
- **Timing:** a modal opened during the first second still sits under the chrome. This is accepted because every IPSR modal opens on a user click after the page has rendered.

No unaddressed breakage was found. The HITL visual pass in T-2 covers Step 1, Step 3, contributors and the list filters.

### Budget (Step 2.4)

| Expected tasks | Expected LOC | Expected review rounds |
|---|---|---|
| 2 | ~100 (≈5 SCSS + ≈95 Cypress) → **re-baselined 2026-10-01: ~415** (≈5 SCSS + 252 Cypress + 155 DevTools probe, Plan B) | 1 |

Matches Lite. `/akili-execute` trips if it exceeds 3 tasks, 200 LOC or 2 rounds. **Tripwire fired at T-1 (407 LOC); the user accepted the new size on 2026-10-01. New tripwire: 3 tasks, 500 LOC, 2 rounds.** **Fired again at T-1 attempt 2 (542 LOC); the user accepted ~550 on 2026-10-01. New tripwire: 3 tasks, 600 LOC, 3 rounds.** **Pivot 2026-10-01 (T-3, `ICM-DD-2`) adds ~90 LOC → expected ~640; tripwire proposed at 3 tasks / 750 LOC / 5 review rounds (pending user approval).**

### `ICM-DD-2` — Opt-in floating `×` in `app-pr-dialog` (Pivot 2026-10-01, user request)

- **Context:** the user asked for a `×` on every IPSR modal that lacks one. A sweep over `grep -rn 'showHeader\]="false"' --include='*.html' src/app/pages/ipsr` found 8 modals: 6 have no close control at all, and 2 already have their own (`update-ipsr-result-modal.component.html:7` icon, `ipsr-step3-evidence-list.component.html:209-211` button).
- **Decision:** add an opt-in `floatingClose` input to the shared `app-pr-dialog`. It renders the existing `.pr-dialog__close` (calls `hide()` → `visibleChange` + `onHide`, the same path as Escape) in the panel's top-right when there is no header. Enable it on the 6 modals only.
- **Alternatives rejected:**
  - *`showHeader=true` on the 6:* adds an empty header row above each modal's own title, which changes their layout.
  - *A hand-made icon per modal (the `update-ipsr-result-modal` pattern):* six copies, and setting `visible=false` directly bypasses `onHide`, so the form-reset hooks would not run.
  - *Show the `×` whenever `closable && !showHeader`:* changes ~37 consumers outside IPSR and would duplicate the 2 existing close controls.
- **Consequences:** a shared-component edit, so it is opt-in with a default of `false`. Probe (c) and `ICM-AC-6` (c) apply to Step 4 after T-3. The budget grows by ~90 LOC (component ~15, spec ~50, templates 6, zoneless checks ~20).

## 13. Open Gaps & Follow-ups

- **Follow-up:** the same trap exists outside IPSR (Result Detail and the rest of the 32 `.section_container` / `.detail_container` templates). The candidate fix is the same declaration in `transitions.scss`, in its own spec.
- **Accepted risk:** the ~1s window during the fade (DD-1).
- **Accepted risk:** P-9. If no Cypress token is available, the regression evidence is the HITL DevTools probe, not CI.

## Required cross-references

- `requirements.md` (same folder) · `docs/prd.md` · `docs/ux-ui/design.md` · `docs/trd/trd.md`
