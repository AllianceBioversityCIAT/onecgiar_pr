# bilateral-result-creator

**What this owns:** the W3/Bilateral creation wizard and multi-section result editor;
`isCreating()` picks which of the two renders.

## Invariants
- Route `/bilateral/:centerAcronym/result/:id?phase=<versionId>`. 🛑 `:id` is a `result_code`, NOT
  `result.id`, when `phase` is present — the backend resolves by `result_code`+`version_id` with a
  phase, by `id` without one (`results.service.ts:3378-3388`). prtest: 5804/9667 results have
  `id !== result_code`.
- `BilateralCreationService` owns result state; `currentResultId()` is `null` until the detail GET
  resolves. Local `resultId` mirrors it and gates section mounting + `autoSaveService.setResultId`.
- Save coordinator + MDS tracker are provided per-component, so every visit starts clean; edits live
  in memory until Save draft or navigation (Next/Back/rail) flushes the section being left — only
  destroying the editor WITHOUT navigating (closing the tab) skips this.
- Wizard (`isCreating()`) keeps the banded header + centered 1100px column; the editor draws its own
  wide frame: 240px rail (checks + Submit for review, gated by `canSubmitFromRail()`), scrolling
  column, and a stripe-less floating footer (`.bcr-editor-footer`, P2-3736) whose two capsules wrap
  with `flex-wrap` only when they don't fit (not a fixed px threshold — 2026-10-08). The frame
  anchors via `position:absolute; inset:0`, not a `height:100%` chain (which resolves to content
  height on a long form and pushes the footer off-screen).
- **Save draft tells the truth.** The alert names the section's empty MDS fields
  (`missingFieldsFor`) and, on failure, the server's own reason. `triggerManualSave()` scopes its
  post-flush failure check to `pendingStatusKeysFor(activeSection)` (captured before `flush()`) via
  `hasErrorForFields`/`lastErrorMessageForFields` — NOT the section-wide `hasErrorFor`, which also
  counts a different, already-settled field's stale `'error'` as if it belonged to this save
  (BSF-T-2). `selectSection()`/`handleGiFieldSaveRequested()` still use the section-wide pair.
- **`savedTick` clears EVERY mounted field-card's "Unsaved changes" pill, page-wide** — every
  section stays mounted under `[hidden]`. All three save-reaching call sites
  (`triggerManualSave()`, `selectSection()`, `handleGiFieldSaveRequested()`) gate their bump through
  one shared `maybeBumpSavedTick(section, hadRealChange)`: bumps iff a real change was dispatched,
  `section !== 'evidence'`, and `autoSaveService.hasAnyUnsavedAnywhere()` is false — a direct,
  page-wide scan of `fieldStatus()` (BSP-T-1, `design.md` P-6 refuted / `BSP-DD-1`). **This REPLACES
  the old single-section `safeToBumpSavedTick` guard** (shipped 2026-09-29) — see Gotchas.
- **AI quality semaphore (P2-3698).** `BilateralQualityAssessmentUiService` owns
  `assessing → deciding → submitting`; Submit for review calls `qualityAssessment.run()`, never
  submits directly (`isSubmitting()` is `isBusy()` — check AND submit; `isRunning()` alone reopens
  the button mid-PATCH). Feedback stays visible per-field while stale — freshness is only checked at
  submit, never used to hide guidance. Check again = `submitResult()` (`BIL-QTS-DD-4`), reusing the
  rail's guard chain and the AI check itself, never the real submit PATCH.
- **GI drawer save (`handleGiFieldSaveRequested`, BIL-QTS-T-5).** Never a direct PATCH: writes
  `creationService` first, stages via `updateField`, then `flush('general-info')` — in that order,
  or the next Save draft on General information overwrites the just-saved value with whatever was
  still staged. On success: `qualityAssessment.markStale()` once, fire-and-forget field-revision
  record. Closing the drawer re-runs `submitResult()` once if the assessment went stale since open
  AND the form is still editable (`giSavedSinceOpen`, cleared on every close — BIL-QTS-T-9).
- **Read-only has THREE independent gates**, all required: (1) `isFormReadOnly()` =
  `!isEditableByCenterUser()`, read by the 5 sections + Submit + the quality dialog's `[readOnly]`
  (QSG-T-2); (2) `autoSaveService.setReadOnly()`, the actual write-blocker — disabling controls alone
  doesn't stop a stray write reaching the server (P2-3520); (3) the GLOBAL `RolesService.readOnly`,
  which every `custom-fields` control hides behind and which only a W1/W2 initiative path lowers —
  bilateral answers it via `isCenterUserOfLeadCenter()` + status *Editing*, restored in
  `ngOnDestroy` since the flag is global and outlives navigation.

## Where it's used
- `bilateral-routing.module.ts` (`create`/`result/:id`); `bilateral-results-list.component.ts:430` (`openResult`) navigates with `result_code`+`phase`.

## Gotchas (⚠️ = already broke something)
- ⚠️ **The savedTick guard is page-wide, not per-section (BSP-T-1, second rework of this guard).**
  The ORIGINAL 2026-09-29 guard assumed "navigating away always flushes the section being left
  first" — false: `selectSection()` skips its flush entirely while `isSubmitting()` (the AI
  quality-assessment drawer's `'refreshing'` window, `bilateral-quality-assessment-ui.service.ts:54`
  — the rail's buttons aren't disabled during it). `hasAnyUnsavedAnywhere()` reads the ACTUAL state
  of every field instead of inferring safety from navigation order — correct regardless of whether
  any call site's own flush-before-switch assumption holds. A stuck `'error'` field anywhere now
  blocks every later bump page-wide until it's retried and succeeds — an accepted trade-off, not a
  new bug (it does not self-clear).
- ⚠️ **Evidence's own draft-item state is invisible to the page-wide check, by design, not by
  accident.** `section-evidence.component.ts`'s `showDraft()` (an open, not-yet-saved draft item)
  never reaches `BilateralAutoSaveService` until an actual save — `hasAnyUnsavedAnywhere()` can read
  completely clean while a draft sits open. `maybeBumpSavedTick` excludes `section === 'evidence'`
  outright so it never bumps while that invisible state might be live. Pre-existing, explicitly
  accepted gap — not solved by BSP-T-1, carried forward unchanged.
- ⚠️ **`section-toc.component.ts`'s narrative field has the SAME shape of gap as Evidence, newly
  exposed by BSP-T-1 (accepted carve-out, not fixed).** `onNarrativeInput()` (`:576-582`) debounces
  1500ms before `saveTocDebounced()` (`:435-453`) debounces ANOTHER 1000ms before actually staging
  into `fieldStatus()` — for up to ~2.5s after a keystroke the field-card shows "Unsaved changes"
  while `hasAnyUnsavedAnywhere()` reads clean (its `edited` signal flips on the first keystroke,
  independent of staging). A real sequence (type, pause ~3s so the first chunk stages, type more,
  Save draft within 1.5s) can clear that pill while the newest keystrokes are still unsaved.
  Recommended follow-up (not yet a ticket): a synchronous debounce-flush hook exposed from
  `section-toc.component.ts`, called by `triggerManualSave()`/`selectSection()` before reading
  staged state — would also close a pre-existing silent-data-loss window on Next/Back.
- ⚠️ **Never publish the route param as the write id.** Every form PATCH looks the row up by `id`
  (`results.service.ts:5006`); seeding `currentResultId` with the route param instead sent the first
  autosave to the WRONG row, with `lead_contact_person: null` read as "delete it".
- The constructor `effect` requires BOTH `currentResultId()` non-null AND `!isLoadingResult()` — drop
  the second and the previous result's data stays on screen during the window.
- Section-level constructor `effect`s run BEFORE their own hydration effects copy loaded data — any
  section that saves from an effect needs its own "already hydrated" lock
  (`section-general-info`'s pattern).
- No sections render while loading (`app-form-skeleton`); if the detail GET fails,
  `creationService.loadFailed()` + its own skeleton branch + `retryLoadResult()` keep the page from
  going blank and silent.
- `hasTypeSpecificSection` reads `creationService.resultTypeId()`, not the local signal (only the
  wizard writes the local one; the editor's is always `null`).
- ⚠️ **A form with zero controls is `RolesService.readOnly`, not "disabled."** Measured: 6
  `app-pr-input` hosts, 0 `<input>`s, for a Center User who owned the result. Test permission changes
  with a Center User's roles injected — an admin session can't see this failure.
- **BIL-RAU-T-7:** the admin status-4 escape is exactly 3 keys (`is_discontinued`,
  `discontinued_options`, `merge_split_targets`), gated by admin AND status 4 AND replicated AND
  type 7/2 together — never the whole editor.
- ⚠️ This shell is Bilateral's own — never import `pages/results/` components (different services,
  routes, green checks); reuse only shared primitives and tokens.
- ⚠️ The submit-lock `effect` must live OUTSIDE `submitResult()` — a result that loads already past
  *Editing* must be locked without anyone pressing Submit.

- ⚠️ **P2-3980 — a bilateral Knowledge Product never runs nor shows the AI quality check.** One predicate, `creationService.isKnowledgeProduct()`. `submitResult()` keeps its guards, then for a KP opens `KpSubmitConfirmDialogService`; only a confirm calls `qualityAssessment.submitKnowledgeProduct(rid)` (silent POST assessment, waits on a `running` row, PATCH `submitted_anyway`, one request on a double tap). Rail AI card, the submit note and `loadLatest` are skipped for a KP; `reloadAfterResultTypeChange()` resets the held assessment. Title/Description are read-only and optional for a KP in `section-general-info`.

## Wizard — manual-create drawer (BIL-MCD-T-6; single mount ARM-T-2, 2026-09-30)
- Level/type/title live in `app-bilateral-manual-create-form` inside
  `app-bilateral-manual-create-drawer-host`, mounted ONCE in `bilateral.component.html` (the shell),
  never by this page. `BilateralManualCreateFlowService` (root) owns `drawerOpen`,
  `beginFromProject()` (catalog home), `openDrawerForManual()` (wizard), `submitCreate()`.
- Wizard flow: project → SP → AI/Manual cards → Manual opens the drawer instantly; AI stays inline.
  Home flow: `bilateral-projects-panel`'s `+ Create result` → `beginFromProject()`, drawer in-place
  over the catalog. Copy: `internationalization/bilateral-manual-create.copy.ts`.

## Pending
- HITL responsive/axe pass on the drawer — see `execution.md` of spec `manual-create-drawer`.

**Verified:** 2026-10-16 · P2-3980 bilateral KP pool-funding parity
