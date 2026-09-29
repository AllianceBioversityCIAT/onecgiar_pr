# bilateral-annual-updating

**Verified:** 2026-09-29 · branch qa-development-2026-ss (`BIL-RAU-T-8` rework, attempt 3 —
`waitForSave()` missed the `hasErrorFor` loop exit, so a real 400 waited the full 15s timeout; see
"Reviewer rework" point 2); prior: attempts 1–2 (new wrapper; all 6 first-round FAIL issues fixed).

## What it is

`app-bilateral-annual-updating` — the bilateral Section 1 wrapper around the shared
`app-rd-annual-updating` block (`shared/components/annual-updating/`). Loads the reasons catalogue
+ stored answer, drives the shared component via `context`/`generalInfoBody`, and owns the save
flow: Yes autosaves, No requires an explicit confirm (R-11, DD-3).

## Contract

- **Mount**: `section-general-info.component.html`, `@if (isReplicatedInnovation())`, first child of
  `.sgi-fields` — above Title. `isReplicatedInnovation = isReplicated() && resultTypeId ∈ {7, 2}`.
- **Load** (`ngOnInit`): `api.resultsSE.GET_investmentDiscontinuedOptions(resultTypeId, reportingYear)`,
  merged with `creationService.storedDiscontinuedOptions()` the same way
  `rd-general-information.component.ts:convertChecklistToDiscontinuedOptions` does. `loaded =
  signal<boolean|null>(null)` (P2-3556 pattern): `null` in flight, `true` settled, `false` failed —
  a failed load shows `app-alert-status status="error"` **instead of** the shared component, so no
  interaction (and no write) is possible. `onAnswerChange()` also guards on `loaded() === true`
  defensively.
- **`context`**: a `computed()`, never a getter or inline literal — every signal is read into a
  local unconditionally, before any `&&`/`||` (a short-circuited read drops out of the computed's
  tracked dependencies and can freeze `editable` stale; see the Traps section).
  `editable = isEditableByCenterUser() || (isAdmin && resultStatusId === 4)`.
- **Yes** (`is_discontinued` becomes `false`, from the radio or admin Reopen): stages
  `{ is_discontinued: false, discontinued_options: [], merge_split_targets: [] }` via
  `autoSaveService.updateFieldsBatch` and flushes **immediately** — there is no periodic autosave
  timer in `BilateralAutoSaveService` (it only flushes from Save draft / Next / Back), so
  "autosaves" here means stage-then-flush right away. Judgment call under R-11; flag to the Leader
  if a different flush cadence was intended.
- **No** (`is_discontinued` stays `true`): nothing is staged; only derived UI state (warning,
  confirm button, MDS) recomputes. **Mark as discontinued** — a real `hlmBtn variant="outline"`
  (Issue 4: no hand-rolled SCSS button any more) — is rendered **only while `context().editable`**
  (Issue 5), and enables once `canConfirmDiscontinuation()` is true (also gated on `editable`: ≥1
  reason ticked, its description when `requires_description`, and ≥1 target per ticked merge/split
  reason). Clicking it opens `BilateralMarkDiscontinuedDialogComponent` (Spartan `hlm-dialog`,
  pattern of `toc-linkage-switch-dialog/` — chosen over `bilateral-change-result-type-dialog`'s
  `app-pr-dialog` because the latter has no focus trap, per `src/CLAUDE.md` §21.7). Confirm stages
  all three keys in **one** `updateFieldsBatch` call, flushes, then **waits for the request to
  settle** (`waitForSave()`, Issue 2) before reading the result.
- **S-11.3 (owner decision 2026-09-29)**: `showsNoReasonWarning()` shows the literal text "Please
  provide a reason." whenever No has zero reasons ticked, and disables confirm through the same
  `canConfirmDiscontinuation()` check. A server 400 on confirm ("Please provide a reason.", from the
  T-6 guard) is read via `autoSaveService.hasErrorFor('general-info')` /
  `lastErrorMessageFor('general-info')` into `saveError()`, rendered as a `<p role="alert">` — only
  after `waitForSave()` settles (see Reviewer Issue 2 below).
- **Status after save**: `constructor()` effect reads
  `autoSaveService.lastGeneralInfoResponse()?.['status_id']` and calls
  `creationService.setResultStatus(...)`. See the save-response hook below.
- **MDS**: `mdsTracker.setSectionFields('general-info', items, 'annual-updating')` — a separate
  group from `section-general-info`'s OWN items, which publish under `'core'` (Reviewer Issue 1,
  below — never ungrouped). Items: `annual-update` (answered, either way); when No:
  `annual-update-reasons`; `annual-update-targets` only when a merge/split reason is ticked.
  `section-general-info`'s `effect` sets this group to `[]` when `isReplicatedInnovation()` is
  false; this component's `ngOnDestroy` also clears it, belt-and-suspenders.

## Save-response hook (design.md §6.2)

`BilateralAutoSaveService.lastGeneralInfoResponse` — `signal<Record<string, unknown> | null>(null)`,
set inside `sendEndpointRequest`'s `next` handler **only** for `endpointKey === 'generalInfo'`, to
that response's `.response` body. `status_id` is present only when a discontinuation save actually
wrote one (`updateBilateralGeneralInfo`'s `response: { id, ...updates }`) — a no-op for every other
`generalInfo` field's save. No other file in `bilateral-auto-save.service.ts` was touched, other
than `reset()` clearing it (Reviewer Issue 3, below).

## Disqualifier check (P-2)

Dialog + wrapper import only Spartan, the shared `annual-updating` component, and bilateral
services/tracker — nothing from `pages/results/`.

## Cannot prove in jsdom (owned by T-9)

Placement, rendered wording in a REAL browser, the NG0103 merge/split loop, the confirm dialog's
focus trap. The literal warning text, `[disabled]` binding and `app-alert-status` ARE proven here
(Issue 6 (b)/(g)) against the real template.

## Reviewer rework (attempts 2–3, all FAIL issues fixed)

1. **MDS group collision**: `section-general-info`'s `updateGeneralInfoMdsFields()` called
   `setSectionFields('general-info', [...core])` with **no group**, replacing the WHOLE section and
   wiping `'annual-updating'` on every Title/Description/Lead-contact edit. Fixed: core fields now
   publish under their own group, `'core'` (same isolation `section-contributors` uses for
   `'partners'`). Proved with the REAL `BilateralMdsTrackerService` (never mocked).
2. **`hasErrorFor` read before the PATCH settled**: `flush()` only dispatches. `confirmDiscontinuation()`
   now awaits `waitForSave()` first; `confirming()` stays `true` until then. **Attempt 3**:
   `waitForSave()` initially polled `hasPendingFor` alone, which counts an `'error'` field status as
   pending too (`bilateral-auto-save.service.ts`) — so a real 400 waited the full 15s timeout. Added
   the same `&& !hasErrorFor('general-info')` exit `waitForSectionSave()` already carries. The
   attempt-2 test had put the mocks in a state the real service can't reach (`hasPendingFor` false,
   `hasErrorFor` true); replaced with a mock driven off one field-status value, plus a success case.
3. **Stale response, different result**: `lastGeneralInfoResponse` is creator-scoped, not
   per-result. `reset()` now clears it, and the effect checks `response.id === currentResultId()`
   before `setResultStatus`. Advisory: the same effect now syncs `storedIsDiscontinued` too.
4. **Hand-rolled SCSS** → `hlmBtn variant="outline"` + Tailwind; SCSS is now only `:host { display: block; }`.
5. **Editable-blind confirm**: button, `canConfirmDiscontinuation()`, `openMarkDiscontinuedDialog()`
   all gate on `context().editable`.
6. **Unfalsifiable falsifiers**: (c) fixture gained a second, never-ticked reason; (b)/(g) gained a
   real-template describe block; (a)/(e) proved with the real tracker (point 1).

⚠️ **Real-template testing gotcha.** Mutating `generalInfoBody` directly + calling
`onAnswerChange()` does not mark the view for check here (only a zone-dispatched DOM event does) —
call `fixture.componentRef.changeDetectorRef.markForCheck()` before `detectChanges()`
(`detectAfterMutation()` in the spec). Separately: nest `@if` blocks as **siblings**, never inside
an `@else if` branch — that shape left the inner conditional stuck forever, independent of the fix
above.

## Traps (⚠️ = found while building this)

- ⚠️ **A signal read inside a `&&`/`||` short-circuit can silently drop out of a `computed()`'s
  tracked dependencies** — see the `context` bullet above; same shape
  `bilateral-result-creator.component.ts`'s exemption `effect` guards against for `rolesSE.isAdmin`.
- Merge/split catalogue LOADING stays inside the shared component (`loadMergeSplitCatalogue`/
  `searchMergeSplitCatalogue`, keyed off `context.resultId`) — this wrapper only supplies the
  discontinued-options catalogue and the stored answer/targets.
- `MERGE_REASON_TEXT`/`SPLIT_REASON_TEXT` are duplicated from the shared component's own private
  constants (text, never id) — not exported; promote only if a third caller needs the same match.
