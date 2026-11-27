# Tasks — Confirm, don't block, removal of ToC-mapped contributors

## 1. Scope of this task list

| Field | Value |
|---|---|
| Module / feature | `results` → `rd-contributors-and-partners` (+ additive `pr-multi-select` input) |
| Linked spec | [`requirements.md`](./requirements.md) + [`design.md`](./design.md) (revision 4) |
| Owner / driver | Santiago Sanchez |
| Status | in-progress (T-1..T-4 done) |
| Approval Mode | gated |
| Budget (design §12) | 6 tasks (5 code + 1 manual) · ≈380 LOC · 6 review rounds — tripwire for `/akili-execute` |

## 2. Pre-flight checklist

- [x] `requirements.md` approved (Phase 1, 2026-11-27)
- [x] `design.md` reviewed: Judgment Day ESCALATED, user decided "apply the fix, go to tasks" (fixed, not re-judged: R-1, R2-1, N-1, N-2)
- [x] Open questions resolved (Centers in scope, generic copy, P2-3249 relaxed, panel deselect confirms, asterisks unchanged)
- [x] No migration, no CLARISA, no payload change
- [x] No conflicting in-flight spec on `rd-contributors-and-partners` (check `git status` and `docs/specs/changes/` at T-1 start)

Common rules for every task:
- Client commands run from `onecgiar-pr-client/`. Jest: `npx jest <path> --silent --reporters=summary --no-coverage`. Lint: `npx ng lint --quiet`.
- `npx tsc` does not type-check templates. Any `.html` change needs `npm run build` (or `npx ngc -p tsconfig.app.json --noEmit`).
- The folder `CLAUDE.md` of each touched folder is updated and re-stamped `Verified:` in the same commit.
- Commit subject: no apostrophes, `$` or quotes (Jenkins).

## 3. Task list

### TRC-T-1 [x] — Science Program: confirm instead of block

- **Type:** client
- **Description:** Replace `blockIfLastScience` with `shouldConfirmLastScience()` + `confirmRemoval('science', cb)`; extract `removeScienceItem(item)` (identity filter, early return if gone, Other(s) cascade, `cdr.markForCheck()`); `deleteScience` routes sentinel / non-last / non-ToC-planned to immediate removal. Copy and id per design §8. Update the stale `TOC-SP-*` comments.
- **Implements:** TRC-R-1 (S-1.1, S-1.2, S-1.3), TRC-NFR-2, TRC-NFR-3
- **Design refs:** TRC-DD-1, DD-2, DD-3, DD-6, DD-7; P-2, P-3, P-11
- **Files (expected):** `rd-contributors-and-partners.component.ts`, `.component.spec.ts` (`:328,388` SP describes), `.zoneless.spec.ts` (new describe), folder `CLAUDE.md`
- **Depends on:** —
- **Blocks:** TRC-T-2, TRC-T-4
- **Estimate:** S
- **Review:** `checklist` — scoped to one handler; the zoneless repaint is the risk and it has a dedicated red run
- **Skills:** `angular-developer`, `tdd`
- **Design route:** reuse existing pattern — `customizedAlertsFeSE` confirm (as `onSyncSection`); no new visual surface
- **Verification:**
  - **Falsifier:** (a) in the new zoneless describe, delete the `cdr.markForCheck()` call → the "chip gone after Yes, no `detectChanges`" assertion goes red; (b) make `removeScienceItem` run before `show()` → "arrays unchanged while dialog open" goes red; (c) call the confirm on the sentinel → the exemption test (dialog not shown) goes red. Fixture for (a): 1 ToC-origin SP, ToC-planned, `planned_result: true`, a non-empty `tocReferenceSynergyInitiativeIds` — the only state that reaches the dialog.
  - **Red run:** `predicted — greenfield artifact (observed in TRC-T-1)`: the updated `component.spec.ts` SP describe must fail on current code at its `confirmText` assertion (today's alert has none), and zoneless case (a) must fail with `markForCheck` removed. Quote both reds in `execution.md`.
  - **Disqualifier:** if the zoneless test cannot see the chip disappear even WITH `markForCheck` (e.g., the real alert service cannot mount in jsdom after appending `<app-root>`), stop and report — do not swap to a manual `detectChanges` in the test (that hides P-3).
  - **Consumers:** `toc-science-program-min` → `component.spec.ts:328,388` (replaced); `deleteScience` → `component.html:489` (unchanged call). Grep as run in design P-7.
- **Definition of done:**
  - [ ] Both reds quoted in `execution.md`, then green.
  - [ ] Exemptions covered: not-last, not ToC-planned, sentinel, `deleteOtherScience` (no dialog).
  - [ ] Cancel test: `scienceSelected` / `otherScienceSelected` identical before and after.
  - [ ] Zoneless setup appends `<app-root>` and removes `.custom_modal_container` after each test.
  - [ ] Jest (folder) green, lint clean.

### TRC-T-2 [x] — Center: confirm instead of block, lead side effects, auto-assign guard

- **Type:** client
- **Description:** Same shape for Centers (`shouldConfirmLastCenter`, `removeCenterItem(item, updateComponent)` with early return before any side effect). Move `this.rdPartnersSE.setPossibleLeadCenters(true)` from `component.html:185` into the end of `removeCenterItem` (before `markForCheck`). In the service, `tryAutoAssignLeadCenter` ignores `OTHER_CENTERS_CODE`. Update stale `TOC-C-*` comments.
- **Implements:** TRC-R-2 (S-2.1, S-2.2, S-2.3)
- **Design refs:** TRC-DD-1..4, DD-7, DD-8; P-1, P-8, P-12
- **Files (expected):** `rd-contributors-and-partners.component.{ts,html}`, `.service.ts`, `.component.spec.ts` (`:467,526,582`), `.service.spec.ts`, `.zoneless.spec.ts` (Center case + `:142` re-check), folder `CLAUDE.md`
- **Depends on:** TRC-T-1 (shared `confirmRemoval`)
- **Blocks:** TRC-T-4
- **Estimate:** S
- **Review:** `full` — changes a service method shared with IPSR (`tryAutoAssignLeadCenter`, P-12) and moves a template side effect
- **Skills:** `angular-developer`, `tdd`
- **Design route:** reuse existing pattern — same confirm dialog as TRC-T-1
- **Verification:**
  - **Falsifier:** (a) leave the second statement on `html:185` → Cancel test (fixture: lead null, union = exactly 1 real Center `[C1]`) sees `leadCenterCode` become `C1` → red; (b) revert the sentinel exclusion → service case `[sentinel]` with no Others asserts lead ≠ `'__OTHER_CENTERS__'` → red; (c) remove `setPossibleLeadCenters` from `removeCenterItem` → "lead options recomputed after confirmed removal" spy assertion → red.
  - **Red run:** `predicted — greenfield artifact (observed in TRC-T-2)`: (a) and (b) must fail on current code. Quote both in `execution.md`.
  - **Disqualifier:** if any IPSR spec (`ipsr-contributors.component.spec.ts`) goes red because of the auto-assign change, stop and escalate (P-12 claimed IPSR is unaffected).
  - **Consumers:** `toc-center-min` → `component.spec.ts:467,526,582`; `tryAutoAssignLeadCenter` → `service.ts:736-738,843,1007-1010`, IPSR via `runAutoAssignLeads` (`ipsr-contributors.component.spec.ts:1235-1242`); `deleteContributingCenter(0, true)` → `zoneless.spec.ts:146`.
- **Definition of done:**
  - [ ] Reds (a), (b) quoted, then green; `[C1, sentinel]` + null lead → C1 (accepted widening) has its own case.
  - [ ] Cancel test asserts `contributing_center`, `otherCentersSelected`, `leadCenterCode` unchanged and `setPossibleLeadCenters` not called.
  - [ ] `zoneless.spec.ts:142` still green.
  - [ ] IPSR contributors spec green (`npx jest ipsr-contributors`).
  - [ ] `npm run build` green (template edit).

### TRC-T-3 [x] — `pr-multi-select`: opt-in `deselectGuard` input

- **Type:** client (shared custom field)
- **Description:** Add `deselectGuard = input<((option: any) => boolean) | null>(null)`. In `onSelectOption(option, cb?)`, only when an **active** item is being removed (not `logicalDeletion` re-activation): if the guard returns `true`, set `option.selected = true`, set `cb.checked = true` when a ref was passed, and return without touching `value` or emitting. Checkbox paths pass `#cb` (flat `.html:58`, group `.html:40`); label paths pass nothing. Document the input (flat + group, select-all bypass) in the folder `CLAUDE.md`.
- **Implements:** TRC-R-1 S-1.4 and TRC-R-2 S-2.4 (component side), "BUT it must NOT change any other instance"
- **Design refs:** TRC-DD-9; P-9, P-10
- **Files (expected):** `custom-fields/pr-multi-select/pr-multi-select.component.{ts,html}`, `pr-multi-select.cy.ts` (or `.contract.cy.ts`), `pr-multi-select.component.spec.ts`, folder `CLAUDE.md`
- **Depends on:** —
- **Blocks:** TRC-T-4
- **Estimate:** S
- **Review:** `full` — shared component with ~80 instances
- **Skills:** `angular-developer`, `spartan` (custom-fields conventions), `tdd`
- **Design route:** reuse existing pattern — no visual change
- **Verification:**
  - **Falsifier:** (a) remove the `cb.checked = true` write → CT "hook returns true, checkbox click, flat" asserts DOM `input.checked === true` → red (P-10: model-side restores do not re-tick); (b) same in group mode; (c) call the guard before the active check → CT "logicalDeletion re-activation does not call the hook" → red; (d) hook unset → existing deselect CT cases stay green (no behavior change).
  - **Red run:** `predicted — greenfield artifact (observed in TRC-T-3)`: (a) observed red first by implementing the guard WITHOUT the native write. Quote it in `execution.md`.
  - **Disqualifier:** if writing `checked` leaves NgModel out of sync (a later real untick does not emit `ngModelChange`), stop and report — the design's P-10 reasoning is then wrong.
  - **Consumers:** `onSelectOption` → `pr-multi-select.component.html:40,42,58,60`; `repro-p2-3308.spec.ts:52`; `pr-multi-select.contract.cy.ts`, `pr-multi-select.cy.ts`. All other instances bind no `deselectGuard`.
- **Definition of done:**
  - [ ] Red (a) quoted, then green.
  - [ ] CT cases: unset (unchanged), `true` × {checkbox, label} × {flat, group} with DOM `input.checked`, `false` (removes), logicalDeletion re-activation.
  - [ ] `npm run test:ct` (the `custom-fields/` gate): no new reds beyond the 9 known in `pr-multi-select.contract.cy.ts`.
  - [ ] `npx jest pr-multi-select` and `repro-p2-3308` green; `npm run build` green.

### TRC-T-4 [x] — Wire the panel deselect guards

- **Type:** client
- **Description:** Add `scienceDeselectGuard` / `centerDeselectGuard` (arrow properties) to the component: sentinel or no-confirm-needed → `false`; otherwise match the model item by `id` / `code`, `confirmRemoval(kind, () => removeXItem(match))`, return `true`. Bind `[deselectGuard]` on the SP dropdown (`html:475`) and both `contributing_center` dropdowns (`html:122`, `:149`). Not on the Other(s) dropdowns.
- **Implements:** TRC-R-1 S-1.4, TRC-R-2 S-2.4
- **Design refs:** TRC-DD-9; P-1
- **Files (expected):** `rd-contributors-and-partners.component.{ts,html}`, `.component.spec.ts`, `.zoneless.spec.ts`, folder `CLAUDE.md`
- **Depends on:** TRC-T-1, TRC-T-2, TRC-T-3
- **Blocks:** —
- **Estimate:** S
- **Review:** `checklist`
- **Skills:** `angular-developer`, `tdd`
- **Design route:** reuse existing pattern
- **Verification:**
  - **Falsifier:** (a) drop `[deselectGuard]` from the SP dropdown → zoneless test that calls the real `pr-multi-select.onSelectOption` for the last ToC SP sees it removed with no dialog → red; (b) guard returns `true` for the sentinel → sentinel-untick test (dialog not shown, sentinel removed) → red; (c) guard bound on the Other(s) dropdown → "Other SP untick: no dialog" → red.
  - **Red run:** `predicted — greenfield artifact (observed in TRC-T-4)`: (a) on the code from T-1..T-3 before the binding is added. Quote it.
  - **Disqualifier:** if the matched item cannot be found by `id`/`code` because the panel clone differs from the model item in its key field, stop and report.
  - **Consumers:** `[deselectGuard]` new binding only; no existing consumer.
- **Definition of done:**
  - [ ] Red (a) quoted, then green; (b), (c) green.
  - [ ] Yes via the panel removes the chip and the option (zoneless, no `detectChanges`).
  - [ ] `npm run build` green.

### TRC-T-5 — Relax P2-3249: any Contributing Center counts

- **Type:** client
- **Description:** `contributingCentersComplete` = toc + other real Centers > 0; `contributingCentersValidationMessage` = `contributingCentersEmptyNote`; remove `requiresTocCenter` and `contributingCentersRequiredNote`; collapse the marker `@if` (`html:251-263`) into one marker labelled "Contributing CGIAR Centers". Update stale comments (`component.ts:530-561`, `:591-597`), `section-bottom-bar.component.ts:209-210` ("marker"), and the folder `CLAUDE.md` (P2-3249, P2-3738 `requiresTocCenter`, "dos marcadores" entries; supersede `TOC-SP-DD-*` / `TOC-C-DD-*` as well, if T-1/T-2 did not).
- **Implements:** TRC-R-3 (S-3.1, S-3.2)
- **Design refs:** TRC-DD-5; P-6, P-7
- **Files (expected):** `rd-contributors-and-partners.component.{ts,html}`, `.component.spec.ts` (`:1664-1779`), `.zoneless.spec.ts` (`:432-734`: `:444`, `:564`, `:572-573`, `:582`, `:587`, `:596`, `:601-619` + new sentinel-only case), `section-bottom-bar.component.ts` (comment), folder `CLAUDE.md`
- **Depends on:** — (sequence after T-2 to avoid conflicting edits in the same files)
- **Blocks:** —
- **Estimate:** S
- **Review:** `checklist`
- **Skills:** `angular-developer`, `tdd`
- **Design route:** reuse existing pattern (marker + inline message unchanged in look)
- **Verification:**
  - **Falsifier:** (a) keep `if (requiresTocCenter) return tocCount > 0` → zoneless "only Other(s) centres under ToC refs: scan lists no Centers gap, card `ok`" → red; (b) delete the single marker → zoneless "0 centres: scan lists `Contributing CGIAR Centers`" → red; (c) count the sentinel as a center → new "sentinel only, no Other → `todo`" → red.
  - **Red run:** `predicted — greenfield artifact (observed in TRC-T-5)`: the flipped `:587` and `:601-619` cases must fail on current code. Quote them.
  - **Disqualifier:** if any other screen reads `requiresTocCenter` or the removed note (grep shows only this folder today, P-7), stop and re-scope.
  - **Consumers:** per design P-7: `component.html:130,245,251,256,262`; `component.spec.ts:1664-1779`; `zoneless.spec.ts:444-640,719,863`; `section-bottom-bar.component.ts:210`; folder `CLAUDE.md`. `zoneless.spec.ts:654-662` (asterisks) must stay green unchanged.
- **Definition of done:**
  - [ ] Reds quoted, then green; asterisk tests untouched and green.
  - [ ] Grep `requiresTocCenter|at least one from the ToC|contributingCentersRequiredNote` over `onecgiar-pr-client/src` → 0 hits.
  - [ ] `npm run build` green.

### TRC-T-6 — Manual browser check (HITL)

- **Type:** rollout
- **Description:** On a real ToC-mapped 2026 result, own `ng serve` (inject `token` **and** `user`): remove the last ToC SP via chip and via panel → dialog; Yes removes (chip and tick); Cancel keeps (tick still visible); save + reload → still removed; repeat for a Center (lead cleared, not the sentinel); only Other(s) Centers → no red message.
- **Implements:** TRC-R-1, TRC-R-2, TRC-R-3 (end to end)
- **Depends on:** TRC-T-1..T-5
- **Estimate:** S
- **Review:** `skip-eligible` — evidence task, no code; the claim to prove is the screenshots/notes in `execution.md`
- **Verification:**
  - **Falsifier:** any step above behaving differently.
  - **Red run:** n/a (manual gate)
  - **Disqualifier:** a stale dev server (check `window.ng.getComponent(...)` matches disk before concluding).
  - **Consumers:** none (no shared symbol changed)
- **Definition of done:** [ ] Steps recorded in `execution.md` with result IDs.

## 4. Dependency graph

```
TRC-T-1 ──► TRC-T-2 ──► TRC-T-5 ──┐
   │            │                 │
   └────────────┴──► TRC-T-4 ─────┼──► TRC-T-6
TRC-T-3 ────────────►─┘           │
                                  ┘
```

Order of execution: T-1 → T-2 → (T-3 in parallel any time before T-4) → T-4 → T-5 → T-6.

TRC-T-3 is parallel-safe with T-1/T-2 (different folder). T-5 touches the same files as T-1/T-2, so it runs after T-2.

## 5. Test plan

| Test ID | Type | Covers | Location |
|---|---|---|---|
| TRC-TEST-1 | unit | S-1.1, S-1.2, S-1.3 | `rd-contributors-and-partners.component.spec.ts` |
| TRC-TEST-2 | zoneless DOM | S-1.1 "disappear", S-2.1, S-2.2 | `rd-contributors-and-partners.zoneless.spec.ts` |
| TRC-TEST-3 | unit (service) | S-2.1 sentinel lead, P-12 widening | `rd-contributors-and-partners.service.spec.ts` |
| TRC-TEST-4 | Cypress CT | S-1.4, S-2.4 (component), "no other instance changes" | `custom-fields/pr-multi-select/*.cy.ts` |
| TRC-TEST-5 | zoneless DOM | S-1.4, S-2.4 (wiring) | `rd-contributors-and-partners.zoneless.spec.ts` |
| TRC-TEST-6 | zoneless DOM + unit | S-3.1, S-3.2 | `*.zoneless.spec.ts` (`:432-734`), `*.component.spec.ts` (`:1664-1779`) |
| TRC-TEST-7 | manual | end to end | TRC-T-6 |

## 6. Clause coverage

| Clause | Task |
|---|---|
| S-1.1 THEN/AND (dialog copy, chip present while open, removal = ordinary, disappears, persisted) | T-1 (persisted: T-6) |
| S-1.2 THEN + BUT must NOT run the removal | T-1 |
| S-1.3 exemptions + BUT no dialog | T-1 |
| S-1.4 dialog + option stays ticked + BUT no other instance changes | T-3 (component), T-4 (wiring) |
| S-2.1 THEN + AND IT MUST NOT auto-assign the sentinel | T-2 |
| S-2.2 THEN + BUT no recompute or auto-assign | T-2 |
| S-2.3 exemptions | T-2 |
| S-2.4 | T-3, T-4 |
| S-3.1 (no error, no scan gap, card not incomplete) | T-5 |
| S-3.2 (message + label + BUT no ToC/Other(s) wording) | T-5 |
| NFR-1 no payload change | T-1, T-2 (PATCH body untouched; existing save-contract tests) |
| NFR-2 reuse the alert | T-1 |
| NFR-3 static copy | T-1, T-2 |
