# Tasks — Collapse Info/Help Panels By Default (`ITR`)

## 1. Scope of this task list

- **Module / feature:** `changes/info-tooltip-hover-reveal`
- **Linked spec:** `docs/specs/changes/info-tooltip-hover-reveal/requirements.md` + `design.md`
- **Ticket:** [P2-3635](https://cgiarmel.atlassian.net/browse/P2-3635)
- **Owner / driver:** Santiago Sanchez Correa
- **Status:** in-progress — all code/test tasks PASSed pending commit (`ITR-T-1`, `ITR-T-2`, `ITR-T-3`, `ITR-T-5`, `ITR-T-6`, `ITR-T-7`, `ITR-T-8`, `ITR-T-9`); `ITR-T-4` doc content approved but application deferred to `master` (non-default-branch rule); Jira comms note not yet posted. `ITR-T-5`–`ITR-T-9` added mid-execution after four rounds of live user design feedback post-`ITR-T-1` — see `execution.md` Pivot Records. Icon vertical-alignment concern remains open pending live-browser confirmation (no code defect found after two rounds of investigation).

## 2. Pre-flight checklist

- [x] `requirements.md` approved.
- [x] `design.md` approved.
- [x] Open questions resolved or explicitly deferred: `ITR-OQ-2` resolved in design §2.3/§13 (no test breaks); `ITR-OQ-1` deliberately deferred (`ITR-DD-3`, escape hatch shipped unused); `ITR-OQ-3` resolved (`ITR-DD-2`, "More info").
- [x] No CLARISA dependency (N/A, frontend-only presentational change).
- [x] No conflicting in-flight spec found touching `custom-fields/alert-status/` (checked `docs/specs/` at specify time).
- [x] No migration involved (N/A).

## 3. Task list

### `ITR-T-1` — Add collapsed/expanded disclosure to `AlertStatusComponent`

- **Type:** `client`
- **Description:** Implement the collapsed-by-default toggle for `status="info"` in `AlertStatusComponent`: `isCollapsible` computed, `expanded` signal seeded from a new optional `startExpanded` input, `toggle()` method, restructured template (header row with icon + "More info" label + `<button aria-expanded>` + chevron; content region via `[hidden]`), and SCSS for the new header row + chevron rotation (respecting `prefers-reduced-motion`). `warning`/`error`/`success` markup and behavior stay byte-for-byte unchanged.
- **Implements:** `ITR-R-1`, `ITR-R-2`, `ITR-R-3`, `ITR-R-4`, `ITR-R-5`, `ITR-R-6`, `ITR-R-10`, `ITR-R-11`, `ITR-R-20`
- **Files (expected):**
  - `onecgiar-pr-client/src/app/custom-fields/alert-status/alert-status.component.ts`
  - `onecgiar-pr-client/src/app/custom-fields/alert-status/alert-status.component.html`
  - `onecgiar-pr-client/src/app/custom-fields/alert-status/alert-status.component.scss`
- **Depends on:** —
- **Blocks:** `ITR-T-2`, `ITR-T-3`
- **Estimate:** `S`
- **Skills:** `angular-developer`, `frontend-design`, `tailwind-design-system`
- **Definition of done:**
  - [ ] Code merged via `<emoji> <type>(<scope>) [ticket]: <description>` (e.g. `✨ feat(alert-status) P2-3635: Collapse info panels by default with an accessible toggle`).
  - [x] `npx ng lint --quiet` clean.
  - [x] `warning`/`error`/`success` variants render with no `.alert_toggle` present (manually diffed against pre-change markup for those three statuses).
  - [x] Toggle button has visible focus ring using `--pr-color-primary-300` (`docs/ux-ui/design.md` §10).
  - [x] No new npm dependency added.
  - [x] **Disqualifier:** if `warning`/`error`/`success` markup differs from `master` in any way (a stray class, a removed element), this task is NOT done — re-diff against the pre-change component, don't rely on "tests still pass" alone (the existing tests don't assert markup shape for those three variants exhaustively).

### `ITR-T-2` — Update Jest unit tests

- **Type:** `tests`
- **Description:** Extend `alert-status.component.spec.ts` with cases for `isCollapsible()` (true only for `status: 'info'`), `expanded()` seeded from `startExpanded`, and `toggle()` flipping state.
- **Implements:** `ITR-R-1`, `ITR-R-2`, `ITR-R-3`, `ITR-R-5`, `ITR-R-20`
- **Files (expected):** `onecgiar-pr-client/src/app/custom-fields/alert-status/alert-status.component.spec.ts`
- **Depends on:** `ITR-T-1`
- **Blocks:** —
- **Estimate:** `S`
- **Skills:** `angular-developer`
- **Definition of done:**
  - [x] `npx jest --silent --reporters=summary --no-coverage --testPathPattern="alert-status"` green.
  - [x] New tests actually exercise `toggle()` and assert the signal value changes (not just "does not throw", matching the existing weak assertion style in the file — this task upgrades it).
  - [x] **Disqualifier:** a test that calls `toggle()` without reading `expanded()` afterward proves nothing — assert the resulting value, not just the absence of an exception.

### `ITR-T-3` — Add Cypress CT coverage for the disclosure interaction

- **Type:** `tests`
- **Description:** Add a `describe('collapsible info panel')` block to both `alert-status.cy.ts` and `alert-status.contract.cy.ts` asserting: (1) collapsed by default — `.alert_text` `not.be.visible`, button `aria-expanded="false"`; (2) click reveals — `.alert_text` `be.visible`, `aria-expanded="true"`; (3) a second click re-collapses; (4) keyboard activation (`.focus().type('{enter}')` and `.type(' ')`) reveals identically to a click; (5) `warning`/`error`/`success` mounts show no `.alert_toggle` element at all. Do **not** modify any existing test in either file (design §2.3/§13 audit found none need changing).
- **Implements:** `ITR-R-1`, `ITR-R-2`, `ITR-R-3`, `ITR-R-4`, `ITR-R-5`
- **Files (expected):**
  - `onecgiar-pr-client/src/app/custom-fields/alert-status/alert-status.cy.ts`
  - `onecgiar-pr-client/src/app/custom-fields/alert-status/alert-status.contract.cy.ts`
- **Depends on:** `ITR-T-1`
- **Blocks:** —
- **Estimate:** `S`
- **Skills:** `angular-developer`
- **Definition of done:**
  - [x] `npm run test:ct` → "All specs passed!" (per `onecgiar-pr-client/CLAUDE.md` §9 rule — run before considering this task done). *Ran as equivalent `npx cypress run --component` (the npm script's env-var syntax isn't PowerShell-compatible on this machine): `alert-status.cy.ts` 7/7, `alert-status.contract.cy.ts` 15/16 — the one failure is a pre-existing, spec-unrelated flake, independently reproduced against the unmodified component (see `execution.md`).*
  - [x] Every pre-existing test in both files still present, unmodified, and passing.
  - [x] **Disqualifier:** a Cypress assertion using `.should('contain.text', ...)` alone for the "collapsed" case is NOT sufficient evidence — `contain.text` reads `textContent` regardless of visibility (this is exactly why `[hidden]` doesn't break the old tests) and therefore CANNOT distinguish collapsed from expanded. The new tests MUST use `.should('be.visible')` / `.should('not.be.visible')` (or an equivalent computed-style/`offsetParent` check) to prove the disclosure actually toggles rendering, not just DOM presence.

### `ITR-T-4` — Revise `RFUX-R-5` and close the loop with the reporter

- **Type:** `docs`
- **Description:** Edit `docs/ux-ui/design.md` §"PRMS Form UX Pattern" `RFUX-R-5` to state the two-tier distinction: (a) field-level constraint/validation copy stays persistently visible below the label, unchanged; (b) supplementary multi-paragraph guidance/example panels (`app-alert-status status="info"`) MAY collapse behind the accessible click/tap disclosure shipped in `ITR-T-1`, and MUST NOT use CSS `:hover`/`title` as the reveal mechanism. Keep the existing accessibility rationale sentence (touch/screen-reader failure of hover-only tooltips) — it still applies and is *why* the disclosure is click-based, not hover-based.
- **Implements:** `ITR-R-7`
- **Files (expected):** `docs/ux-ui/design.md`
- **Depends on:** `ITR-T-1` (the doc should describe shipped behavior, not aspirational behavior)
- **Blocks:** —
- **Estimate:** `S`
- **Skills:** `cognitive-doc-design`
- **Definition of done:**
  - [x] `RFUX-R-5` text drafted, reviewed, and PASSed; no other section of `docs/ux-ui/design.md` left asserting the old absolute "never collapse help text" rule (Correction Closure sweep clean — see `execution.md`).
  - [x] This task executes on a non-default branch (`qa-development-2026-ss`, not `master`): per root `CLAUDE.md`'s shared-file write discipline and this task's own instruction, the edit is recorded as **pending** in `execution.md` (full text + application instructions) rather than committed to `docs/ux-ui/design.md` directly. Apply it on the default branch.
  - [ ] A one-line comms note is left for the ticket reporter (Ángel) / PO explaining that the shipped fix is a tap-to-expand disclosure, not a literal hover tooltip, and why (`ITR-DD-1`) — posted as a Jira comment on P2-3635, not just left in this repo.

### `ITR-T-5` — Rework `ITR-T-1`'s collapsed/expanded visual: icon-only trigger + floating panel (added 2026-09-09, post-user design feedback)

- **Type:** `client`
- **Description:** Following live review, the product owner rejected `ITR-T-1`'s shipped visual (icon + visible "More info" label + chevron in a full-width row; expanding pushed form content down in-flow). Per `requirements.md`'s revised `ITR-R-1`/`ITR-R-2`/`ITR-R-3`/`ITR-R-10` and `design.md`'s revised §6.2 + new `ITR-DD-4`: (1) collapse the trigger to **icon-only** — remove `.alert_label` and `.alert_chevron`, move the "More info" copy to the button's `aria-label`, add `aria-controls` + a stable `panelId` linking button to region (closes the earlier ADVISORY for free); (2) change `.alert_text`'s presentation from an in-flow block to a `position: absolute` floating panel anchored near the icon (CSS only — explicitly NOT a CDK Overlay/portal, per `ITR-DD-4`'s rejection of `HlmPopover`'s lazy-rendering `*hlmPopoverPortal`), with a surface/border/shadow treatment and a sane `max-width`. The signal/state logic (`expanded`, `toggle()`, `isCollapsible`, `startExpanded`) is UNCHANGED — this is a template/SCSS-only rework.
- **Implements:** `ITR-R-1` (revised), `ITR-R-2` (revised), `ITR-R-3` (revised), `ITR-R-10` (revised), `ITR-R-11` (unchanged, now doubly load-bearing per `ITR-DD-4`)
- **Files (expected):**
  - `onecgiar-pr-client/src/app/custom-fields/alert-status/alert-status.component.html`
  - `onecgiar-pr-client/src/app/custom-fields/alert-status/alert-status.component.scss`
  - `onecgiar-pr-client/src/app/custom-fields/alert-status/alert-status.component.ts` (only to add the `panelId` generation — signal/method logic otherwise unchanged)
- **Depends on:** `ITR-T-1` (reworks its shipped output; `ITR-T-2`/`ITR-T-3` already PASSed against the pre-rework markup and must be re-verified, not re-authored, against the new markup — see Definition of Done)
- **Blocks:** —
- **Estimate:** `S`
- **Skills:** `angular-developer`, `frontend-design`
- **Definition of done:**
  - [x] `npx ng lint --quiet` clean.
  - [x] Collapsed state renders no visible text and no background/box around the icon — only the icon itself is visually present (verified via computed-style Cypress assertion, not just DOM presence).
  - [x] Expanded panel does not push sibling form content (`position: absolute` removes it from normal flow — structural guarantee, confirmed by Reviewer).
  - [x] `.alert_text` remains in the DOM at all times (`[hidden]`, not removed/portal-rendered) — `ITR-T-2`'s Jest suite (8/8) and `ITR-T-3`'s Cypress CT suite (`alert-status.cy.ts` 7/7) still pass unmodified against the new markup. One pre-existing contract test in `alert-status.contract.cy.ts` (predating this spec) needed updating — its assumption was directly contradicted by the newly-approved `ITR-R-1`, not a broken existing contract; see `execution.md` for the Leader's and Reviewer's independent judgment on this.
  - [x] `warning`/`error`/`success` markup remains byte-for-byte unchanged (same disqualifier as `ITR-T-1`) — confirmed across all 3 rework attempts.
  - [x] No new npm dependency added; no CDK Overlay/portal introduced (independently re-grepped and confirmed by the Reviewer on the final attempt).
  - [x] **Disqualifier:** cleared — no CDK Overlay/portal at any point.

### `ITR-T-6` — Add `[collapsible]` escape hatch to `AlertStatusComponent` (added 2026-09-09, second round of user design feedback)

- **Type:** `client`
- **Description:** Per `requirements.md` `ITR-R-30` and `design.md` `ITR-DD-5`: add `@Input() collapsible: boolean = true`; change `isCollapsible` to `return this.status === 'info' && this.collapsible;`. The `@if (isCollapsible) { ... } @else { ... }` branch structure (from `ITR-T-1`/`ITR-T-5`) already routes `info` sites with `collapsible=false` into the same `@else` markup used by `warning`/`error`/`success` — do not duplicate or fork that branch. **Correction (flagged by `ITR-T-5`'s Reviewer, recorded here before this task starts):** the task was originally scoped as "no template/SCSS change needed", but that premise no longer holds. `ITR-T-5` correctly stripped `.pr_alert.info`'s box styling (`padding`, `border`, `background-color`) at the **container level** (`&.info`), which both `@if`/`@else` branches share — so today, an `info` site routed into `@else` via `[collapsible]="false"` would render always-visible text with **no box at all**, not the original pre-spec grey box (`ITR-R-30`'s own requirement: "render... exactly as the `warning`/`error`/`success` branch... byte-identical rendering to the pre-spec `info` treatment" — the pre-spec `info` treatment DID have a box). This task now also needs a small, scoped SCSS fix: reintroduce the box styling for the `collapsible=false` case only, without reintroducing it for the icon-only collapsed case. The cleanest mechanism (Implementer's call, subject to Reviewer scrutiny): a host/structural selector that distinguishes "info AND collapsible" (icon-only, no box) from "info AND NOT collapsible" (boxed, like `ITR-T-1`'s original `&.info` styling) — e.g. a class or attribute toggled alongside `collapsible`, not a fragile `:has()`/sibling-presence selector that breaks if the button's internal markup changes.
- **Implements:** `ITR-R-30`
- **Files (expected):** `onecgiar-pr-client/src/app/custom-fields/alert-status/alert-status.component.ts`, `.scss` (both now in scope — see correction above), and possibly `.html` if the chosen distinguishing mechanism needs a class binding change.
- **Depends on:** `ITR-T-5` (touches the same component; must land after `ITR-T-5`'s markup rework to avoid file conflicts and to have the icon-only branch in place first).
- **Blocks:** `ITR-T-7`
- **Estimate:** `S`
- **Skills:** `angular-developer`
- **Definition of done:**
  - [x] `npx ng lint --quiet` clean.
  - [x] `[collapsible]="false"` on a `status="info"` instance renders the ORIGINAL pre-spec `info` box treatment (padding, background, border-radius — verified byte-for-byte against `git show HEAD` by the Leader/Reviewer) — always visible, no `.alert_toggle`, no icon-only bare treatment.
  - [x] Default (`collapsible` omitted, icon-only + floating panel) behavior for every existing `info` call site is completely unchanged from `ITR-T-5`'s shipped output.
  - [x] New Jest cases in `alert-status.component.spec.ts` for `isCollapsible` under the `collapsible` input.
  - [x] **Disqualifier:** cleared — no forked `@else`, no regression to the icon-only case (confirmed by mutual-exclusivity analysis: `isCollapsible` and the `.alert_boxed` class binding are exact logical complements within `status === 'info'`).

### `ITR-T-7` — Audit ~150 call sites and apply `[collapsible]="false"` to section-intro notes (added 2026-09-09)

- **Type:** `client`
- **Description:** Per `requirements.md` `ITR-R-31`: survey the ~62 template files identified in `design.md` §2.3 (all `<app-alert-status>` render sites) and classify each `status="info"`-or-default instance as either (a) a **section-level intro note** — the first thing after a section/subsection heading, before any field label/control — or (b) a **field-level note** — positioned after or beside one specific field's own label. Add `[collapsible]="false"` to every site classified as (a). Leave every (b) site untouched (default `collapsible`, icon+popover). The user's own example (the "Contributors & partners" section intro note) is one confirmed (a)-site — locate and fix its actual template file as part of this task's verification, in addition to the systematic survey.
- **Implements:** `ITR-R-31`
- **Files (expected):** Any of the ~62 template files from `design.md` §2.3 that contain a section-intro-classified `<app-alert-status>` site — enumerate the actual list in your Implementer report, don't guess a count in advance.
- **Depends on:** `ITR-T-6` (the `[collapsible]` input must exist before any call site can use it).
- **Blocks:** —
- **Estimate:** `M` (breadth, not depth — many small, mechanical edits across many files, but each edit is a one-attribute addition)
- **Skills:** `angular-developer`
- **Definition of done:**
  - [x] A full list of every `<app-alert-status>` render site across the client app enumerated and classified (a)/(b)/(c — a third bucket, "banner/empty-state", was identified during review; see `execution.md`), with reasoning shown for non-obvious cases. Note: a minor bookkeeping discrepancy between the Implementer's summary count and the actual number of `[collapsible]="false"` sites in the tree was flagged by the Reviewer as non-blocking (no concrete misclassification found) — see `execution.md`.
  - [x] Every (a)-classified site has `[collapsible]="false"` added; every (b)-classified site is left untouched.
  - [x] The "Contributors & partners" section-intro site (the user's own screenshot example) is confirmed fixed.
  - [x] `npx ng lint --quiet` clean.
  - [x] No site is double-classified or missed — verified via a thorough Reviewer audit across 2 attempts (4 real classification defects found and fixed on attempt 1; attempt 2 independently re-verified, including a self-initiated check of a click-handler interaction the original task scope didn't anticipate).
  - [x] **Disqualifier:** cleared on attempt 2 — the 4 attempt-1 violations (1 over-collapse, 3 missed sites) were all fixed and independently re-verified.

### `ITR-T-8` — Migrate 3 field-level notes onto `app-pr-field-header`'s inline `[tooltip]` (added 2026-09-10, third round of user design feedback)

- **Type:** `client`
- **Description:** Per `requirements.md` `ITR-R-32` and `design.md` `ITR-DD-6`: (1) add `@Input() tooltip` (mirroring `pr-select`'s `readonly tooltip = input<string>('')`) to `pr-multi-select.component.ts` and forward it to its internal `app-pr-field-header` (`[tooltip]="tooltip()"`), matching the pattern `pr-select`/`pr-yes-or-not` already have; (2) migrate the 3 example sites in `rd-contributors-and-partners.component.html` from a separate `<app-alert-status>` to the field's own `[tooltip]` input: the `tocQuestionInfoNote()` note (currently a separate `<app-alert-status>` after the `app-pr-yes-or-not` at ~line 38-47 — wire `[tooltip]="tocQuestionInfoNote()"` onto the `app-pr-yes-or-not` itself and delete the separate `<app-alert-status>` line), the `financialResourcesInfoNote` note (~line 53-60, same pattern), and the `getMessageLeadCenter()` note (~line 240-245 — wire onto the "Lead center" `app-pr-select` and delete the separate `<app-alert-status>` at line 241).
- **Implements:** `ITR-R-32`
- **Files (expected):**
  - `onecgiar-pr-client/src/app/custom-fields/pr-multi-select/pr-multi-select.component.ts`
  - `onecgiar-pr-client/src/app/custom-fields/pr-multi-select/pr-multi-select.component.html`
  - `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-contributors-and-partners/rd-contributors-and-partners.component.html`
- **Depends on:** `ITR-T-7` (this migrates specific sites `ITR-T-7` already classified/touched — the "Lead center" `app-alert-status` was untouched by `ITR-T-7`'s (b) classification and stays that way in DOM position, just now via a different mechanism; the ToC-question and financial-resources notes were also (b)-classified and untouched by `ITR-T-7`).
- **Blocks:** —
- **Estimate:** `S`
- **Skills:** `angular-developer`
- **Definition of done:**
  - [x] `npx ng lint --quiet` clean.
  - [x] All 3 example sites render the ⓘ icon immediately after the field's title text, same line, using `app-pr-field-header`'s existing tooltip pattern.
  - [x] No separate `<app-alert-status>` remains at any of the 3 migrated sites.
  - [x] `pr-multi-select`'s new `tooltip` input defaults to `''` (confirmed a real no-op via `pr-field-header`'s `*ngIf` guard) — other ~80 call sites unaffected.
  - [x] `pr-multi-select`'s existing test suites still pass unmodified (287/287 Jest; Cypress failures confirmed pre-existing per that folder's own `CLAUDE.md`).
  - [x] **Disqualifier:** cleared — `<strong>` formatting confirmed to survive (`PrTooltipDirective` uses `innerHTML`), no mandatory-field/green-check/Lead-center wiring disturbed (independently verified by the Reviewer against the file's own `CLAUDE.md`).

### `ITR-T-9` — Migrate `geoscope-management`'s region/country descriptions to inline `[tooltip]`; classify the external-partners note (added 2026-09-10, fourth round of user design feedback)

- **Type:** `client`
- **Description:** Per `ITR-R-32`/`ITR-DD-6`, extend the inline-tooltip migration to two more sites the user flagged as missed:
  1. `onecgiar-pr-client/src/app/shared/components/geoscope-management/geoscope-management.component.ts`/`.html` — a shared component used across IPSR, bilateral, and general geography (4 template call sites, one shared component). Its "Select regions" `<app-pr-multi-select>` (~line 33-44) and "Select countries" `<app-pr-multi-select>` (~line 63-74) both currently use `[description]="this.thereAnyText(...)"`, which renders an always-visible "Description: ..." line below the field (via `app-pr-field-header`'s `description` input, a DIFFERENT, older mechanism than `app-alert-status`). Convert both to `[tooltip]="this.thereAnyText(...)"` instead — same text (a sentence with an embedded `<a>` link to the UN M.49 / ISO 3166 standard), same field, just moved from a persistent description line to the inline ⓘ tooltip next to the field's own title. Do NOT touch the two `appFeedbackValidation` markers directly below each multi-select (green-check wiring, unrelated).
  2. The "External Partners" note (`externalPartnersInfoNote`, `rd-contributors-and-partners.component.html` ~line 497-500, `<app-alert-status [description]="externalPartnersInfoNote">` inside `@if (isCP2026())`) has no single field to attach an inline tooltip to — it precedes a subsection (`<app-knowledge-product-selector>` + `<app-normal-selector>`, the external-partners list), not one field's label. Per `ITR-T-7`'s established (a)/(c) precedent for subsection-intro notes with no single-field attachment point, apply `[collapsible]="false"` here instead of migrating to `[tooltip]` — this is the Leader's judgment call, made explicit here rather than guessed silently; flag it back to the user in case a different placement (e.g. attached to the "Other contributors:" heading) was actually intended.
  3. **Icon vertical-alignment concern (user-reported, root cause not conclusively found by static code review):** the user reported the ⓘ icon appearing vertically misaligned with the field title text in some renderings. Code review of the shared chain (`pr-field-header.component.scss`'s `.pr_label_row { display:flex; align-items:center; gap:4px }`, `custom-fields.scss`'s `.sgi-dac-info { display:inline-flex; align-items:center; justify-content:center; width:18px; height:18px }`, `pr-info-icon.component.ts`'s host `{ display:inline-flex; align-items:center; line-height:0 }`) found no obvious defect — the mechanism is already used successfully elsewhere in the app. Since this cannot be conclusively diagnosed via static reading alone, the Implementer should: (a) re-verify the CSS chain is applied consistently to `pr-select`/`pr-multi-select`/`pr-yes-or-not`'s rendering paths (not just `pr-yes-or-not`, which the user's "correct" reference screenshot came from); (b) if no defect is found, report that explicitly rather than applying a speculative fix; (c) if a live dev server is available, do a manual visual check of the 5 migrated sites (3 from `ITR-T-8` + 2 from this task) and report what is actually seen.
- **Implements:** `ITR-R-32`
- **Files (expected):**
  - `onecgiar-pr-client/src/app/shared/components/geoscope-management/geoscope-management.component.html`
  - `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-contributors-and-partners/rd-contributors-and-partners.component.html`
- **Depends on:** `ITR-T-8` (same migration pattern, same shared mechanism).
- **Blocks:** —
- **Estimate:** `S`
- **Skills:** `angular-developer`
- **Definition of done:**
  - [x] `npx ng lint --quiet` clean.
  - [x] Both `geoscope-management` multi-selects render the ⓘ inline next to "Select regions"/"Select countries" — regions via the `app-pr-yes-or-not` in `reporting` (multi-select's own label is null there) and via the multi-select itself elsewhere; countries via the multi-select in every module. UN M.49 / ISO 3166 link intact (unmodified expression).
  - [x] No `[description]` remains on either multi-select.
  - [x] The `externalPartnersInfoNote` site has `[collapsible]="false"` applied — no single-field attachment point found; flagged to the user as corrigible.
  - [x] The 2 `appFeedbackValidation` markers near the migrated `geoscope-management` fields are untouched (independently re-verified by the Reviewer).
  - [x] Icon alignment: no defect found in the shared CSS chain or in `pr-select`/`pr-multi-select`'s own styles after investigation — needs live-browser confirmation, reported explicitly rather than left silent.
  - [x] **Disqualifier:** cleared on attempt 2 — attempt 1's silently-dropped note (a real regression in the `reporting` module) was fixed and independently re-verified via full code trace.

### `ITR-T-10` — Fix ⓘ icon vertical misalignment: `.pr_label`'s legacy margin breaks flex centering inside `.pr_label_row` (added 2026-09-10, fifth round of user feedback — root cause found)

- **Type:** `client`
- **Description:** Root cause of the user-reported vertical misalignment (open since `ITR-T-9`, previously unconfirmed): `custom-fields.scss`'s global `.pr_label { margin-top: 20px; margin-bottom: 6px; ... }` was authored for the STANDALONE label case (spacing before a field, no tooltip). `pr-field-header.component.html`'s tooltip branch reuses the same `.pr_label` class **inside** `.pr_label_row` (`display: flex; align-items: center; gap: 4px`) as a flex sibling of the `.sgi-dac-info` icon button. Flexbox `align-items: center` centers each item's MARGIN box, so `.pr_label`'s asymmetric 20px-top/6px-bottom margin inflates its effective box far taller than the icon's (18×18, no margin) — the row's cross-size is dictated by the label's margin-inflated box, and the label's actual text ends up rendered low within that oversized box while the icon centers in its own small box, producing the reported vertical offset between icon and text.
- **Fix:** Move the 20px-top/6px-bottom spacing from `.pr_label` itself onto `.pr_label_row` as a container-level margin (so the ROW as a whole keeps the same spacing from whatever precedes it), and neutralize `.pr_label`'s own margin specifically when nested inside `.pr_label_row` (a scoped selector, e.g. `.pr_label_row .pr_label { margin-top: 0; margin-bottom: 0; }` — do NOT change the bare, non-nested `.pr_label` rule, which is still correct for every label WITHOUT a tooltip and must keep its original spacing byte-for-byte).
- **Implements:** (no new `ITR-R-*` — this is a bug fix to the `ITR-DD-6` mechanism's own shared CSS, not a new requirement)
- **Files (expected):**
  - `onecgiar-pr-client/src/app/custom-fields/custom-fields.scss` (or `pr-field-header.component.scss`, Implementer's call for where the scoped override lives — prefer keeping the fix as close to `.pr_label_row` as possible, i.e. in `pr-field-header.component.scss`, to avoid widening `custom-fields.scss`'s already-broad global selector)
- **Depends on:** `ITR-T-8` (the `.pr_label_row`/tooltip mechanism this bug lives in).
- **Blocks:** —
- **Estimate:** `S`
- **Skills:** `angular-developer`
- **Definition of done:**
  - [x] `npx ng lint --quiet` clean.
  - [x] The bare (non-tooltip) `.pr_label` case keeps its exact original spacing — confirmed untouched in `custom-fields.scss` (independently re-verified by the Reviewer).
  - [x] The tooltip case (`.pr_label_row`) now centers the icon and label text on the same visual baseline — confirmed via closed-form flexbox box-model arithmetic (Reviewer computed the actual pre-fix ~7px offset and its elimination post-fix), matching the user's reported symptom almost exactly.
  - [x] **Disqualifier:** cleared — bare `.pr_label` rule confirmed byte-for-byte unchanged.

### `ITR-T-11` — Migrate 5 more field-level notes to inline `[tooltip]` (Innovation Dev info) (added 2026-09-10, fifth round of user feedback)

- **Type:** `client`
- **Description:** Per `ITR-R-32`/`ITR-DD-6`, migrate 5 more `app-pr-field-header` sites in the `innovation-dev-info` module from `[description]` to `[tooltip]` — same mechanical pattern as `ITR-T-9`, all already using the exact `<app-pr-field-header [label]="..." [description]="..." [useColon]="false">` shape (no `[collapsible]` complications, no null-label traps like `ITR-T-9` hit — verify this claim per-site before assuming it, per that task's own lesson):
  1. `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-result-types-pages/innovation-dev-info/innovation-dev-info.component.html` (~line 144-147) — "How would you assess the current readiness of this innovation?" (`readiness_of_this_innovation_description()`).
  2. `.../innovation-dev-info/components/assumptions-examination/assumptions-examination.component.html` (~line 1-4) — question `q3` (`options?.responsible_innovation_and_scaling?.q3?.question_description`).
  3. `.../innovation-dev-info/components/innovation-team-diversity/innovation-team-diversity.component.html` (~line 1-2) — `options?.innovation_team_diversity?.question_description`.
  4. `.../innovation-dev-info/components/estimates/estimates.component.html` (3 sites: ~line 2-9, ~58-61, ~133-136) — `headerDescriptions().n1`/`.n2`/`.n3`.
  This module (`innovation-dev-info`) is explicitly documented as fragile (`innovation-dev-info/CLAUDE.md` — many 🛑-flagged traps around phase-gating, questionnaire resolution, green-check wiring). None of the 5 sites touch any of the documented trap areas (they're pure label/description bindings on already-rendered `app-pr-field-header` elements, no phase logic, no `fieldRef`, no save/validation wiring) — but read that `CLAUDE.md` before starting anyway, and stay confined to exactly these 5 attribute renames.
- **Implements:** `ITR-R-32`
- **Files (expected):**
  - `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-result-types-pages/innovation-dev-info/innovation-dev-info.component.html`
  - `.../innovation-dev-info/components/assumptions-examination/assumptions-examination.component.html`
  - `.../innovation-dev-info/components/innovation-team-diversity/innovation-team-diversity.component.html`
  - `.../innovation-dev-info/components/estimates/estimates.component.html`
- **Depends on:** `ITR-T-10` (the alignment fix should land first so these newly-migrated tooltips render correctly aligned from the start, and so a reviewer can visually reason about them correctly).
- **Blocks:** —
- **Estimate:** `S`
- **Skills:** `angular-developer`
- **Definition of done:**
  - [x] `npx ng lint --quiet` clean.
  - [x] All 5 sites: `[description]` fully removed, `[tooltip]` carries the exact same expression, `[useColon]="false"` untouched.
  - [x] For each site, `[label]` confirmed non-null in every code path (independently traced by the Reviewer against the module's own phase-slot table — the migrated `q3` site is NOT the documented `q4` null-slot trap).
  - [x] `field-card`/`short_title` untouched — confirmed byte-identical.
  - [x] **Disqualifier:** cleared — no trap area touched (grep-verified).

### `ITR-T-12` — Revert 2 more `rd-contributors-and-partners` notes to the always-visible box (added 2026-09-10, sixth round of user feedback)

- **Type:** `client`
- **Description:** The user asked to keep `contributingCentersInfoNote` ("The CGIAR Centers listed below were identified in your 2026 ToC...") and `contributingScienceInfoNote` ("The Science Programs listed below were identified in your 2026 ToC...") as the always-visible boxed style, matching `externalPartnersInfoNote`'s treatment (`ITR-T-9`). Add `[collapsible]="false"` to both `<app-alert-status>` sites in `rd-contributors-and-partners.component.html` (~line 100 and ~line 389). These were left as default (b) field-level sites by `ITR-T-7`'s original audit; the user is now explicitly overriding that classification for these two specific notes.
- **Implements:** `ITR-R-30` (the escape hatch), applied per explicit user direction rather than the `ITR-R-31` structural criterion.
- **Files (expected):** `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-contributors-and-partners/rd-contributors-and-partners.component.html`
- **Depends on:** — (independent of `ITR-T-10`/`ITR-T-11`, different file)
- **Blocks:** —
- **Estimate:** `S`
- **Skills:** `angular-developer`
- **Definition of done:**
  - [x] `npx ng lint --quiet` clean.
  - [x] Both sites (`contributingCentersInfoNote`, `contributingScienceInfoNote`) have `[collapsible]="false"` added — no other attribute changed.
  - [x] Nothing else in the file touched (independently verified via full-file 6-site enumeration).
  - [x] **Disqualifier:** cleared.

### `ITR-T-13` — Fix `.alert_boxed` top spacing; migrate the ticket's own reference field ("Contribution to indicator target") (added 2026-09-10, seventh round of user feedback)

- **Type:** `client`
- **Description:** Two fixes:
  1. **Spacing:** `.alert_boxed` (the `[collapsible]="false"` always-visible box, `ITR-T-6`) inherits `&.info`'s `margin: 0 0 20px` (0 top / 20px bottom) — this is the ORIGINAL pre-spec value (confirmed via `git show HEAD`), not a regression introduced by this spec, but the user now wants it fixed: a boxed note with no top margin looks glued to whatever content precedes it (observed: `contributingScienceInfoNote`, sitting directly against the "Contributing W3 and/or bilateral projects" chips above it in `rd-contributors-and-partners`). Add a top margin to `.alert_boxed` specifically (do not change the base `&.info` margin, which the icon-only/popover states also inherit and must keep byte-identical per every prior task's Disqualifier). Reasonable value: match the existing 20px bottom margin symmetrically, i.e. `margin: 20px 0;` on `.alert_boxed` (overriding the inherited `margin: 0 0 20px` for this variant only) — Implementer's call on the exact value if a different one reads better against the surrounding spacing rhythm, but it must not be `0`.
  2. **Migration:** `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/entity-aow/pages/entity-aow-aow/components/aow-hlo-table/components/aow-hlo-table-create-modal/aow-hlo-create-modal.component.html` (~line 208-227) — this is **the exact site from the ticket's own original screenshot**, cited throughout this spec's `requirements.md`/`design.md`/`tasks.md` as the canonical reference/manual-QA site. It still uses the old, un-migrated pattern:
     ```html
     <app-pr-field-header label="Contribution to indicator target" [required]="false" [labelDescInlineStyles]="'margin-top: 0 !important'"></app-pr-field-header>
     <app-alert-status status="info" description="Indicate in this box the numerical value...<br><br><strong>Example:</strong>...<br><br>The values entered here will be aggregated..." inlineStyles="margin: 0; margin-bottom: 10px !important;"></app-alert-status>
     <input type="number" class="contribution-target-input" ...>
     ```
     Migrate: add `[tooltip]` to the `<app-pr-field-header>` carrying the exact same `description` expression (including the `{{ entityAowService.reportingPhaseYear }}` interpolations, `<br>`, and `<strong>` markup — this is long, multi-paragraph content; confirm `PrTooltipDirective`'s `innerHTML` rendering handles interpolated Angular expressions the same way `[description]` did, which it should since both are just template-string bindings evaluated before render), then delete the separate `<app-alert-status>` tag entirely.
- **Implements:** `ITR-R-32` (migration); no new requirement for the spacing fix (a visual polish to the already-shipped `ITR-T-6` mechanism).
- **Files (expected):**
  - `onecgiar-pr-client/src/app/custom-fields/alert-status/alert-status.component.scss`
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/entity-aow/pages/entity-aow-aow/components/aow-hlo-table/components/aow-hlo-table-create-modal/aow-hlo-create-modal.component.html`
- **Depends on:** `ITR-T-10` (touches the same general area of `alert-status`/`pr-field-header` CSS work, sequenced for a clean audit trail — but does not directly conflict, different files).
- **Blocks:** —
- **Estimate:** `S`
- **Skills:** `angular-developer`
- **Definition of done:**
  - [x] `npx ng lint --quiet` clean.
  - [x] `.alert_boxed` now has non-zero top spacing; base `&.info` margin confirmed byte-unchanged by the Reviewer.
  - [x] "Contribution to indicator target" renders the ⓘ inline next to its title; no separate `<app-alert-status>` remains; description text confirmed character-equivalent (Reviewer traced every interpolation point and markup tag).
  - [x] Manual-QA visual-change note recorded in `execution.md`.
  - [x] **Disqualifier:** cleared.

### `ITR-T-14` — Apply the same always-visible box to 2 equivalent notes in `aow-hlo-create-modal` (added 2026-09-10, eighth round of user feedback)

- **Type:** `client`
- **Description:** `ITR-T-13`'s Reviewer flagged that `aow-hlo-create-modal.component.html` (~line 238 and ~line 315) carries the SAME two notes (`contributingCentersInfoNote`, `contributingScienceInfoNote` — the file's own comment reads "identical wording to rd-contributors-and-partners") that `ITR-T-12` reverted to `[collapsible]="false"` in `rd-contributors-and-partners.component.html`. The user confirmed they want the same treatment here for consistency. Add `[collapsible]="false"` to both sites.
- **Implements:** `ITR-R-30`, applied per explicit user direction (consistency with `ITR-T-12`).
- **Files (expected):** `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/entity-aow/pages/entity-aow-aow/components/aow-hlo-table/components/aow-hlo-table-create-modal/aow-hlo-create-modal.component.html`
- **Depends on:** `ITR-T-13` (same file, sequenced after).
- **Blocks:** —
- **Estimate:** `S`
- **Skills:** `angular-developer`
- **Definition of done:**
  - [x] `npx ng lint --quiet` clean.
  - [x] Both sites (`contributingCentersInfoNote` ~line 238, `contributingScienceInfoNote` ~line 315) have `[collapsible]="false"` added — no other attribute changed.
  - [x] Nothing else in the file touched — `ITR-T-13`'s migration confirmed undisturbed.
  - [x] **Disqualifier:** cleared (satisfied by construction — only 2 `<app-alert-status>` sites exist in the file).

### `ITR-T-15` — Migrate the OTHER "Contribution to indicator target" field (`multiple-wps-content`) (added 2026-09-10, urgent — user-reported still-broken-looking site)

- **Type:** `client`
- **Description:** The user reported "Contribution to indicator target" still showing the old icon-below-label pattern after `ITR-T-13`. Investigation found this is a genuinely DIFFERENT call site with the identical field name — `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-contributors-and-partners/components/multiple-wps/components/multiple-wps-content/multiple-wps-content.component.html` (~line 125-126), inside the Contributors & Partners / ToC multi-WPs flow, NOT `aow-hlo-create-modal` (which `ITR-T-13` already correctly migrated and independently re-verified via grep — that fix is not broken). Current code:
  ```html
  <app-pr-field-header label="Contribution to indicator target" [required]="isCP2026()"></app-pr-field-header>
  <app-alert-status status="info" [description]="contributionTargetNote()" inlineStyles="margin: 0; margin-bottom: 10px !important;"></app-alert-status>
  ```
  Migrate: add `[tooltip]="contributionTargetNote()"` to the `<app-pr-field-header>` tag (keep `[required]="isCP2026()"` unchanged), delete the separate `<app-alert-status>` tag.
- **Implements:** `ITR-R-32`
- **Files (expected):** `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-contributors-and-partners/components/multiple-wps/components/multiple-wps-content/multiple-wps-content.component.html`
- **Depends on:** — (independent file, no shared-file conflict with `ITR-T-10`-`ITR-T-14`)
- **Blocks:** —
- **Estimate:** `S`
- **Skills:** `angular-developer`
- **Definition of done:**
  - [x] `npx ng lint --quiet` clean.
  - [x] `[tooltip]="contributionTargetNote()"` added to the field-header; no separate `<app-alert-status>` remains at this site.
  - [x] `[required]="isCP2026()"` and everything else on the field-header untouched.
  - [x] The nearby `appFeedbackValidation` marker untouched.
  - [x] **Disqualifier:** cleared.

## 4. Dependency graph

```
ITR-T-1 (component: logic + template + SCSS)
   ├── ITR-T-2 (Jest unit tests)
   ├── ITR-T-3 (Cypress CT tests)
   ├── ITR-T-4 (RFUX-R-5 doc revision + reporter comms)
   └── ITR-T-5 (visual rework: icon-only + floating panel, post-feedback)
         └── ITR-T-6 (add [collapsible] escape hatch)
               └── ITR-T-7 (audit + apply [collapsible]="false" to section-intro sites)
                     └── ITR-T-8 (migrate 3 field-level notes to inline pr-field-header tooltip)
                           └── ITR-T-9 (migrate geoscope-management regions/countries + classify external-partners note)
                                 └── ITR-T-10 (fix .pr_label vertical-alignment root cause)
                                       └── ITR-T-11 (migrate 5 more field-level notes, innovation-dev-info)
                                             └── ITR-T-13 (fix .alert_boxed spacing; migrate the ticket's own reference field)
                                                   └── ITR-T-14 (apply [collapsible]=false to 2 equivalent notes in aow-hlo-create-modal)
```

`ITR-T-12` (revert 2 more notes) is independent of `ITR-T-10`/`ITR-T-11`/`ITR-T-13` (different file, `rd-contributors-and-partners.component.html`, no shared CSS or component touched) and ran in parallel with `ITR-T-10`.

`ITR-T-2`, `ITR-T-3`, and `ITR-T-4` ran in parallel after `ITR-T-1` landed. `ITR-T-5` is a follow-up rework of `ITR-T-1`'s own output (added after user review) and must land before `ITR-T-2`/`ITR-T-3`'s suites are considered final — it re-verifies, but does not re-author, their assertions against the new markup. `ITR-T-6` and `ITR-T-7` are a second follow-up round (added after a second round of user review) and must run strictly sequentially after `ITR-T-5` and each other — they touch the same component file and then depend on that component change, respectively. `ITR-T-8` is a third follow-up round, touching a different shared component (`pr-multi-select`) and a specific call site — sequenced after `ITR-T-7` for a clean audit trail, though it does not share files with `ITR-T-7`'s own changes. `ITR-T-10` (a shared-CSS bug fix, root cause found on the fifth round of feedback) is sequenced before `ITR-T-11` (more field migrations) so the newly-migrated tooltips render correctly aligned from the start. A separate, larger follow-up (extending `app-field-card` with the same `[tooltip]` capability, for `pr-input`/`pr-textarea`/`fieldRef`-driven fields) was explicitly discussed with the user and deferred — not part of this spec's current task list.

## 5. Test plan

| Test ID | Type | Covers | Location |
|---|---|---|---|
| `ITR-TEST-1` | unit (client) | `ITR-R-1`, `ITR-R-2`, `ITR-R-3`, `ITR-R-5`, `ITR-R-20` | `onecgiar-pr-client/src/app/custom-fields/alert-status/alert-status.component.spec.ts` |
| `ITR-TEST-2` | cypress CT (client) | `ITR-R-1`, `ITR-R-2`, `ITR-R-3`, `ITR-R-4` | `onecgiar-pr-client/src/app/custom-fields/alert-status/alert-status.cy.ts` |
| `ITR-TEST-3` | cypress CT contract (client) | `ITR-R-5`, `ITR-R-6` | `onecgiar-pr-client/src/app/custom-fields/alert-status/alert-status.contract.cy.ts` |
| `ITR-TEST-4` (manual) | browser verification | `ITR-R-6` (the exact ticket screenshot site) | `aow-hlo-create-modal` "Contribution to indicator target" field, live in a real browser |

Client coverage: `custom-fields/` is excluded from the Jest coverage report (`package.json`), so `ITR-TEST-1` does not move the 50/60/60/60 numbers — it is still mandatory per `onecgiar-pr-client/CLAUDE.md` §9 ("ship spec files for safety" even when excluded).

## 6. Rollout & verification

- [ ] PR opened with the commit convention, ticket `P2-3635` in the message.
- [ ] CI green: `npx ng lint --quiet`, Jest (`--reporters=summary`), build.
- [ ] `npm run test:ct` run locally and green (not CI-wired, per `onecgiar-pr-client/CLAUDE.md` §9 — this is the self-verification step, mandatory before merge).
- [ ] Manual QA: the `aow-hlo-create-modal` "Contribution to indicator target" field (the exact ticket screenshot) verified collapsed-by-default and expandable via click and via keyboard, in a real browser with `token` + `user` injected per the two-traps note in `onecgiar-pr-client/CLAUDE.md` §9.
- [ ] Spot-check 2–3 other `status="info"` sites from different modules (e.g. one `pages/bilateral/**` section, one `rd-result-types-pages/**` section) to confirm the component-level fix actually reaches unrelated screens as designed (§2.3 of `design.md` claims ~150 sites inherit this for free — verify the claim, don't just trust the grep count).

## 7. Cleanup & follow-ups

- [ ] Move spec status to `shipped` once merged and verified in staging.
- [ ] `RFUX-R-5` revision (`ITR-T-4`) already promotes the cross-cutting decision into `docs/ux-ui/design.md` — no separate promotion step needed.
- [ ] File a follow-up (outside this spec) for `ITR-OQ-1`: a PO pass to flag any `status="info"` site that should ship with `[startExpanded]="true"`.
- [ ] No `docs/prd.md` Open Question resolved by this spec — skip that cleanup step.

## 8. Roll-back plan

1. Revert the PR containing `ITR-T-1`–`ITR-T-4` (single PR expected — see Task Count/PR strategy in the review handoff).
2. No migration to revert (N/A).
3. No feature flag to disable (N/A — plain component change).
4. Confirm `status="info"` panels render always-expanded again across the spot-checked sites from §6.
5. No downstream consumers to notify (frontend-only, no bilateral/platform-report payload touched).

## Required cross-references

- `docs/specs/changes/info-tooltip-hover-reveal/requirements.md`, `design.md` (same folder).
- `docs/prd.md` `US-S1`.
- `docs/ux-ui/design.md` §"PRMS Form UX Pattern" `RFUX-R-5`, §10 Accessibility Expectations.
- `onecgiar-pr-client/CLAUDE.md` §9 (Cypress CT rule, browser-verification traps).
