# AGENTS.md — `result-review-drawer/`

> **Scope:** the 1,666-LOC component that loads a single bilateral result, normalizes the polymorphic payload, gates editing, runs dirty tracking, dispatches type-specific sub-content, and mutates approve / reject / save endpoints.
> **Parent guide:** [`../../../../AGENTS.md`](../../../../AGENTS.md) (bilateral-results page).
> **Root guide:** [`../../../../../../AGENTS.md`](../../../../../../AGENTS.md) (module-level replication guide).

This is the **single largest replication risk in the module**. Read this entire file before touching `result-review-drawer.component.ts`.

---

## 1. Files in this folder

```
result-review-drawer/
├── result-review-drawer.component.ts        (~1,666 LOC — the engine)
├── result-review-drawer.component.html      (drawer template + 3 modals)
├── result-review-drawer.component.scss      (shared by all 6 sub-content components)
├── result-review-drawer.component.spec.ts
├── result-review-drawer.interfaces.ts       (ResultToReview, GroupedResult, BilateralResultDetail + ~15 sub-interfaces)
└── components/
    ├── kp-content/                          (Knowledge Product — type 6, read-only display)
    ├── inno-dev-content/                    (Innovation Development — type 7)
    ├── cap-sharing-content/                 (Capacity Sharing — type 5)
    ├── policy-change-content/               (Policy Change — type 1)
    ├── innovation-use-content/              (Innovation Use — type 2; the only type whose PATCH shape is an array)
    └── save-changes-justification-dialog/   (reusable justification modal for TOC + Data Standards saves)
```

---

## 2. Lifecycle state machine

The drawer's life is governed by a state machine with **seven stable states and three error substates**. Transitions are driven by signals (writes to `signal<T>`) and effect reactions.

```
[CLOSED]
   │
   │ visible() = true
   ▼
[OPENING]  ←─ constructor effect fires → loadResultDetail(id)
   │
   │ loadResultDetail() starts
   ▼
[LOADING]  ←─ isLoading(true), isLoadingInformation(true), fetchAndProcessResultDetail()
   │
   │─── error branch ───→ [ERROR_LOAD]  ←─ isLoading(false), isLoadingInformation(false)
   │                                          │
   │                                          │ user closes drawer → [CLOSED]
   │                                          │ (no automatic retry)
   │                                          ▼
   │                                       [CLOSED]
   │
   │ fetch + normalize succeeds
   ▼
[READY]    ←─ isLoadingInformation(false), resultDetail() populated, snapshot captured
   │
   │ user edits any field (TOC toggle, multiselect, geo, text)
   ▼
[EDITING]  ←─ isTocDirty(true) OR hasDataStandardUnsavedChanges()=true
   │
   │ user clicks Save TOC / Save Data Standards
   ▼
[SAVING]   ←─ isSaving(true), justification dialog opens, PATCH dispatched
   │
   ├── success ──→ loadResultDetail() re-fetches → [READY] (new snapshot)
   │
   └── error ────→ [ERROR_SAVE]  ←─ isSaving(false), dialog stays, console.error
                       │
                       │ user dismisses → [EDITING] (changes preserved in memory)
                       ▼
                    [EDITING]

   From [READY] or [EDITING], if status_id == 5 and canEditInDrawer():
       user clicks Approve / Reject → confirmation dialog → PATCH /review-decision
       ├── success ──→ decisionMade emitted → drawer closes → [CLOSED]
       └── error ────→ [ERROR_DECISION] ←─ isSaving(false), dialog stays

   From any state:
       visible() = false → [CLOSING]
                              │
                              │ effect restores RolesService.readOnly
                              │ ngOnDestroy unlocks body scroll, destroys effect
                              ▼
                           [CLOSED]
```

**Signals that drive transitions:**
- `visible` — `model<boolean>` (two-way bound `p-drawer` visibility).
- `resultToReview` — `model<ResultToReview|null>` (the row selected from the table).
- `isLoadingInformation` — toggled true at fetch start, false at fetch end.
- `isLoading` — toggled true at `loadResultDetail` start, false at end.
- `isTocDirty` — set by `markTocAsDirty()` on any TOC interaction.
- `isSaving` — gates spinners during PATCH.
- `resultDetail` — `signal<BilateralResultDetail|null>` (the payload; `null` = not loaded).
- `originalDataStandardSnapshot` — JSON string captured after load/save, compared on every dirty check.

---

## 3. Data load sequence — step-by-step

This is the canonical trace from `visible` becoming `true` to `isLoadingInformation` becoming `false`. Numbers are sequence; the `setTimeout` delays are real and intentional.

```
Step  Action                                                                    Timing       Why
────  ──────                                                                    ──────       ───
 1    Constructor effect fires: visible() && resultToReview() both truthy        0ms         Signal reaction
 2    loadResultDetail(resultId) invoked
 3    loadContributingLists() → GET /clarisa/projects/get/all                    0ms         Fetch project options
 4    ensureInstitutionsLoaded() — resolves immediately if institutions
      catalog is loaded; otherwise subscribes to InstitutionsService
      .loadedInstitutions and waits with a 3000ms fallback                       up to 3s    Without timeout, would block forever
 5    isLoadingInformation.set(true)                                             0ms
 6    fetchAndProcessResultDetail(resultId) begins
 7    GET /api/results/bilateral/<resultId>                                      0ms
 8    On 200: detail = res.response
 9    api.dataControlSE.currentResult = currentResultData                        0ms         Shared widgets (geoscope, TOC tree) expect this
10    api.dataControlSE.currentResultSignal.set(currentResultData)
11    GET /clarisa/initiatives/get/all/without/result/<id>/<portfolio>           0ms         Populate contributingInitiativesList
12    Normalize contributingCenters → array of code strings                      0ms
13    Normalize contributingProjects → array of project_id strings;
      capture leadProjectIds separately (for cannotRemoveOptionValues)           0ms
14    Normalize contributingInitiatives — branch on array vs object shape        0ms         See §6.1 of the root AGENTS.md
15    Normalize contributingInstitutions → array of institution IDs              0ms
16    Normalize resultTypeResponse — for type 2 (Innovation Use) ensure
      actors/organizations/measures/investment_partners/investment_projects
      arrays exist; for types 1/5/6/7, map implementing_organization → institutions  0ms
17    Normalize tocMetadata → build tocInitiative with result_toc_results        0ms
18    setTimeout(100ms) — tocConsumed.set(true) + markForCheck                   100ms       Force app-cp-multiple-wps to detect input changes
19    isLoading.set(false)                                                       0ms
20    setTimeout(300ms) — captureDataStandardSnapshot() + markForCheck           300ms       Wait for p-multiselect/p-select initial values to settle
21    isLoadingInformation.set(false)                                            0ms
22    [READY] state entered
```

**Why each `setTimeout` exists** (verified against source — there are exactly 10 `setTimeout` calls in the drawer):

| Line(s) | Delay | Purpose | Risk if removed |
|---|---|---|---|
| 425 | 100ms | `tocConsumed.set(true)` after Yes/No flip — forces TOC tree remount | Tree would not re-render with new `planned_result` |
| 914 | 0ms | Re-set `resultDetail` inside `untracked` when contributingInitiatives are all numeric | Effect infinite loop |
| 953 | 0ms | Re-set `resultDetail` inside `untracked` when contributingInitiatives need remapping | Effect infinite loop |
| 1007 | 3000ms | Fallback timeout in `ensureInstitutionsLoaded` | Would hang forever if InstitutionsService load Subject never fires |
| 1045 | 50ms | `markForCheck` after `setInitiativeIdIfNeeded` | TOC tree may render with stale initiativeId |
| 1295 | 0ms | `markForCheck` after TOC normalize (with tocMetadata branch) | Stale TOC render |
| 1305 | 100ms | `tocConsumed.set(true)` after tocMetadata-present normalize | Tree may not consume |
| 1343 | 100ms | `tocConsumed.set(true)` for fallback branch (planned_result null treated as false) | Same |
| 1383 | 100ms | `tocConsumed.set(true)` for else branch (no tocMetadata at all) | Same |
| 1404 | 300ms | `captureDataStandardSnapshot()` + `markForCheck` | Snapshot taken before async normalize completes → false dirty positive |

The `setTimeout` cascade is the single most fragile pattern in the drawer. See §10 of this file for the refactor recommendation.

---

## 4. Read-only toggle mechanics (`RolesService.readOnly` global flip)

### 4.1 Why this exists

The shared widgets embedded inside the drawer (`app-cp-multiple-wps`, `geoscope-management`, `pr-multi-select`, `knowledge-product-selector`, `normal-selector`) read directly from the singleton `RolesService.readOnly` to decide their own disabled state. They do NOT accept a per-instance `[readOnly]` input. The drawer therefore **temporarily flips that global** to allow editing in this specific context, then restores it.

### 4.2 Exact mechanics (pseudocode mirrored from source)

```ts
private savedReadOnly: boolean | null = null;
private readonly drawerReadOnlyEffectRef = signal<EffectRef | undefined>(undefined);

constructor() {
  this.drawerReadOnlyEffectRef.set(effect(() => {
    const visible = this.visible();
    const canEdit = this.canEditInDrawer();
    if (visible && canEdit) {
      // Capture once per open session (?? = prevents overwrite on re-fires)
      this.savedReadOnly ??= this.rolesSE.readOnly;
      this.rolesSE.readOnly = false;
    }
    // Restore when drawer closes OR loses edit permission
    if (!(visible && canEdit) && this.savedReadOnly !== null) {
      this.rolesSE.readOnly = this.savedReadOnly;
      this.savedReadOnly = null;
    }
  }));
}

ngOnDestroy() {
  // Destroy effect to prevent stale callback
  this.drawerReadOnlyEffectRef()?.destroy();
  // Defensive restore: if effect destroyed while drawer still open
  if (this.savedReadOnly !== null) {
    this.rolesSE.readOnly = this.savedReadOnly;
    this.savedReadOnly = null;
  }
  document.body.style.overflow = 'auto';
}
```

### 4.3 Abnormal-unmount behavior

If `ngOnDestroy` does not run (browser crash, hot-reload, React strict-mode double-invocation in a future port), the global stays polluted. The double-restore in `ngOnDestroy` is the only safety net. Replicators on a non-Angular stack must wire an equivalent `beforeunload` / page-leave hook.

### 4.4 Nested-drawer scenario

If a second drawer opens while a first is already open, the second's `savedReadOnly ??= ...` will capture the current value (already `false` due to the first drawer's flip) and write `false` again (no-op). When the second closes, it restores `false` (because that's what it captured). The first drawer's effect still holds `readOnly = false`. When the first drawer closes, it restores the original captured value (the true pre-everything state). **This works by accident because both drawers write the same value.** If a future drawer ever needs to set `readOnly = true` while open, the stacking breaks.

### 4.5 Components that read `RolesService.readOnly` directly

A replicator who refactors to per-instance `[readOnly]` inputs must patch all of these:
- `shared/components/geoscope-management/`
- `pages/results/.../rd-contributors-and-partners/components/multiple-wps/components/knowledge-product-selector/`
- `pages/results/.../rd-contributors-and-partners/components/multiple-wps/components/normal-selector/`
- Several `custom-fields/pr-*` controls

This is **not a local refactor**. Budget multi-day cross-feature work.

---

## 5. Save flow trace

```
User clicks "Save TOC" OR "Save Data Standards"
    │
    ▼
saveChangesType set to 'toc' OR 'dataStandard'
showConfirmSaveChangesDialog.set(true)
    │
    ▼
SaveChangesJustificationDialogComponent opens (modal)
    │
    │ User types justification (required, button disabled while empty)
    │ User clicks Confirm → isSaving.set(true)
    │
    ▼
confirmSaveChanges(justification) dispatches by saveChangesType
    │
    ├── 'toc'           ├── 'dataStandard'
    │                   │
    ▼                   ▼
executeSaveTocChanges()   executeSaveDataStandardChanges()
- Build resultTocResults  - Build commonFields, geographicScope,
  array per tab            contributingCenters/Projects/Initiatives/Institutions,
- Build tocMetadata        evidence, resultTypeResponse by result_type_id
  with planned_result,    - Include updateExplanation
  initiative_id
- Include updateExplanation
    │                   │
    ▼                   ▼
PATCH /api/results/bilateral/review-update/toc-metadata/<id>
PATCH /api/results/bilateral/review-update/data-standard/<id>
    │
    ├── success ────────────────────┐
    │                               │
    ▼                               ▼
1. isSaving.set(false)
2. Close justification dialog
3. Re-fetch: loadResultDetail() pulls fresh server state
4. (TOC) isTocDirty reset to false on re-snapshot
   (DS)  originalDataStandardSnapshot recomputed
5. validateIsToCCompleted() re-runs
6. canApprove() may flip from false to true
    │
    ├── error ──────────────────────┐
    │                               │
    ▼                               ▼
1. console.error(...)
2. isSaving.set(false)
3. saveChangesJustification preserved (user can retry)
4. Dialog stays open
5. validateIsToCCompleted() still re-runs (defensive)
```

### Optimistic UI: none

The drawer does NOT apply local mutations before the PATCH succeeds. After a successful save, it always re-fetches via `loadResultDetail`. There is a brief flicker (~500ms) where the old data shows. This is intentional — the team chose simplicity over optimistic UI complexity.

---

## 6. Approve / Reject decision matrix

The footer (Approve + Reject buttons) is **conditionally rendered**:

```html
@if (canEditInDrawer() && resultToReview()?.status_id == 5 && !isLoadingInformation()) {
  <ng-template #footer>
    <p-button label="APPROVE" [disabled]="!canApprove()" ... [pTooltip]="getApproveButtonTooltip()" />
    <p-button label="REJECT" ...   <!-- NO [disabled] on Reject -->
  </ng-template>
}
```

| Condition | Footer rendered? | Approve enabled? | Reject enabled? | Tooltip on Approve |
|---|---|---|---|---|
| `status_id != 5` | **No (footer hidden)** | — | — | — |
| `!canEditInDrawer()` (non-admin, doesn't own initiative) | **No (footer hidden)** | — | — | — |
| `isLoadingInformation()` | **No (footer hidden)** | — | — | — |
| `isToCCompleted() === false` | Yes | Disabled | Enabled | "Please complete and save the TOC data before approving the result" |
| `hasTocUnsavedChanges() === true` | Yes | Disabled | Enabled | "Please save the TOC changes before approving the result" |
| `hasDataStandardUnsavedChanges() === true` | Yes | Disabled | Enabled | "Please save the Data Standards changes before approving the result" |
| All approve conditions met | Yes | Enabled | Enabled | (empty string) |

**Key code:**
```ts
canApprove(): boolean {
  return this.isToCCompleted()
    && !this.hasDataStandardUnsavedChanges()
    && !this.hasTocUnsavedChanges();
}
```

**Critical detail**: `canApprove` does **NOT** consult `resultToReview().status_id` or `canEditInDrawer()` itself — those gates are enforced by the **template-level conditional rendering of the footer**. If you bypass the template gate (e.g., by calling `confirmApprove()` programmatically), `canApprove()` returns `true` whenever the three guards pass, regardless of pending status or ownership. The backend MUST enforce the same gates.

**Reject is always enabled** while the footer is rendered. There is no `[disabled]` on the Reject button. Justification is required only at the confirmation dialog level.

---

## 7. Dirty tracking

### 7.1 TOC dirty

```ts
isTocDirty = signal<boolean>(false);
markTocAsDirty(): void { this.isTocDirty.set(true); }
hasTocUnsavedChanges(): boolean { return this.isTocDirty(); }
```

Triggered by:
- `(selectOptionEvent)` on the `app-pr-yes-or-not` Yes/No toggle for "planned result".
- `(change)` event on the wrapper `<div>` around `app-cp-multiple-wps` — **relies on standard DOM event bubbling** from nested `pr-select` / `input` elements inside the TOC tree.

Reset to `false` after a successful TOC save (re-fetch path).

### 7.2 Data Standards dirty (snapshot-based)

```ts
private originalDataStandardSnapshot: string | null = null;

captureDataStandardSnapshot() {
  this.originalDataStandardSnapshot = JSON.stringify(
    this.normalizeDataStandardForComparison(this.resultDetail())
  );
}

hasDataStandardUnsavedChanges(): boolean {
  if (this.originalDataStandardSnapshot == null) return false;
  const current = JSON.stringify(
    this.normalizeDataStandardForComparison(this.resultDetail())
  );
  return current !== this.originalDataStandardSnapshot;
}
```

### 7.3 `normalizeDataStandardForComparison` — exact projection

To make snapshot comparison byte-stable across array orderings, the normalization sorts collections:

```ts
{
  result_description: detail.commonFields?.result_description ?? null,
  result_type_id:     detail.commonFields?.result_type_id ?? null,
  contributingCenters:      sortAsc(detail.contributingCenters.map(c => str(c) ?? c.code)),
  contributingProjects:     sortAsc(detail.contributingProjects.map(p => str(p) ?? p.project_id ?? p.id)),
  contributingInitiatives:  sortNumericAsc(detail.contributingInitiatives.map(coerceToInitiativeId)),
  contributingInstitutions: sortNumericAsc(detail.contributingInstitutions.map(coerceToInstitutionId)),
  evidence: detail.evidence.map(ev => ({
    id: ev?.id ?? null,
    link: String(ev?.link ?? ev?.evidence_link ?? ''),
    is_sharepoint: ev?.is_sharepoint ?? 0
  })),                              // NOT sorted — user-visible order matters
  geographicScope: structuredClone(detail.geographicScope),
  resultTypeResponse: structuredClone(detail.resultTypeResponse?.[0])
}
```

Sorting rules:
- `contributingCenters` / `contributingProjects`: string-ascending (`localeCompare`).
- `contributingInitiatives` / `contributingInstitutions`: numeric-ascending after coercion.
- `evidence`: order preserved.
- Geo + resultTypeResponse: `structuredClone` (deep copy verbatim).

The serialized JSON of this object is the snapshot. Any deviation will produce false-positive dirty flags. **Replicators MUST mirror this projection exactly** or implement an equivalent structural deep-diff utility.

---

## 8. Type-specific sub-content interaction

For each `result_type_id`, the sub-content component receives `[resultDetail]` and mutates `resultTypeResponse[0]` in place. The drawer reads the mutated reference when building the save payload.

| `result_type_id` | Sub-component | Mutates (in place) | PATCH wrapper |
|---|---|---|---|
| 1 (Policy change) | `policy-change-content` | `policy_type_id`, `policy_stage_id`, `policy_stage_name`, `policy_type_name`, `implementing_organization[]` | object |
| 2 (Innovation use) | `innovation-use-content` | `actors[]`, `organizations[]`, `measures[]`, `investment_partners[]`, `investment_projects[]` (sync'd from `onContributingProjectsChange`) | **array of 1 object** |
| 5 (Capacity sharing) | `cap-sharing-content` | `male_using`, `female_using`, `non_binary_using`, `has_unkown_using` (typo!), `capdev_delivery_method_id`, `capdev_term_id` | object |
| 6 (Knowledge product) | `kp-content` | (read-only) `knowledge_product_type`, `licence`, `metadata[]`, `keywords[]` | object |
| 7 (Innovation development) | `inno-dev-content` | `innovation_nature_id`, `innovation_type_id`, `innovation_type_name`, `innovation_developers` **(textarea, NOT array)**, `innovation_readiness_level_id`, `readinness_level_id` (typo!), `level`, `name` | object |

> ⚠️ **Common confusion**: `innovation_developers` for type 7 is a **textarea string** (free-form contact info), not an array. Verified against `inno-dev-content.component.html:22`. Do not refactor to an array structure without backend coordination.

The sub-content components mutate `@Input() resultDetail` directly inside `set resultDetail(value)`. This is an anti-pattern (§10.1 below) but it's how the current code works — the drawer relies on the mutation.

---

## 9. Effects in the drawer (3 total)

All three are declared in the constructor:

### 9.1 Load effect (line 877)

```ts
effect(() => {
  const result = this.resultToReview();
  if (result && this.visible()) this.loadResultDetail(result.id);
});
```

Trigger: `resultToReview()` or `visible()` change. Side-effect: kicks off the data load.

### 9.2 ReadOnly toggle effect (line 885) — stored in `drawerReadOnlyEffectRef`

See §4.2. Stored in a signal so it can be explicitly destroyed in `ngOnDestroy`.

### 9.3 ContributingInitiatives reapply effect (line 899)

Triggered by `resultDetail()` or `contributingInitiativesList()` change. Re-maps polymorphic shapes (number / string / object) to a consistent numeric-ID array.

**The reapply key (verified line 910):**
```ts
const reapplyKey = `${detail.commonFields?.id ?? ''}-${initiativesList.length}-${detail.contributingInitiatives.length}`;
if (reapplyKey !== this._lastContributingInitiativesReapplyKey) {
  this._lastContributingInitiativesReapplyKey = reapplyKey;
  // ... do the remap inside untracked + setTimeout(0)
}
```

The guard is a coarse string hash. It prevents the effect from re-running when the same data arrives. **It does NOT prevent loops by signal dependency** — the loop prevention comes from the fact that the effect writes `resultDetail` (which is also its trigger) **inside `untracked(() => setTimeout(0, () => ...))`**. The combination breaks the synchronous dependency cycle:
- `untracked()` excludes the write from the effect's tracked reads.
- `setTimeout(0)` defers the write to the next tick, so it does not re-fire during the current effect execution.

Without this trick, the effect would loop infinitely on every signal write.

---

## 10. Anti-patterns flagged (with before / after samples)

### 10.1 Mutating `@Input()` inside setter

**Before** (current code in `inno-dev-content`, `cap-sharing-content`, etc.):
```ts
@Input() set resultDetail(value: any) {
  if (!value?.resultTypeResponse?.[0]) return;
  value.resultTypeResponse[0].actors ??= [];
  value.resultTypeResponse[0].measures ??= [];
  this._resultDetail = value;
}
```

**After**:
```ts
@Input() set resultDetail(value: any) {
  if (!value) { this._resultDetail = value; return; }
  const resultTypeResponse = Array.isArray(value.resultTypeResponse)
    ? value.resultTypeResponse.map((rt: any) => ({
        ...rt,
        actors: rt.actors ?? [],
        measures: rt.measures ?? []
      }))
    : value.resultTypeResponse;
  this._resultDetail = { ...value, resultTypeResponse };
}
```

### 10.2 Global `RolesService.readOnly` toggling

**Before** (lines 885-896, verbatim):
```ts
effect(() => {
  const visible = this.visible();
  const canEdit = this.canEditInDrawer();
  if (visible && canEdit) {
    this.savedReadOnly ??= this.rolesSE.readOnly;
    this.rolesSE.readOnly = false;
  }
  if (!(visible && canEdit) && this.savedReadOnly !== null) {
    this.rolesSE.readOnly = this.savedReadOnly;
    this.savedReadOnly = null;
  }
});
```

**After**:
```ts
readonly drawerReadOnly = computed(() => !this.canEditInDrawer());
// In template:
// <app-cp-multiple-wps [readOnly]="drawerReadOnly()" [editable]="canEditInDrawer()">
// <app-geoscope-management [readOnly]="drawerReadOnly()">
```
Caveat: requires refactoring every shared widget that currently reads `rolesSE.readOnly`. See §4.5.

### 10.3 `setTimeout` chains

**Before**:
```ts
setTimeout(() => { this.tocConsumed.set(true); this.cdr.markForCheck(); }, 100);
setTimeout(() => { this.captureDataStandardSnapshot(); this.cdr.markForCheck(); }, 300);
```

**After**:
```ts
queueMicrotask(() => {
  this.tocConsumed.set(true);
  this.captureDataStandardSnapshot();
  this.cdr.markForCheck();
});
```
Or, better: drive the snapshot from an `effect()` that listens to `isLoading()` going false.

### 10.4 Body scroll lock via `document.body.style.overflow`

**Before**:
```ts
ngOnInit() { document.body.style.overflow = 'hidden'; }
ngOnDestroy() { document.body.style.overflow = 'auto'; }
```

**After**:
```ts
ngOnInit() { this.overlayScrollLock.lock('result-review-drawer'); }
ngOnDestroy() { this.overlayScrollLock.unlock('result-review-drawer'); }
```
A ref-counted singleton service handles multiple overlapping overlays correctly.

### 10.5 `JSON.stringify` snapshot dirty tracking

**Before**:
```ts
this.originalDataStandardSnapshot = JSON.stringify(this.normalizeDataStandardForComparison(detail));
// later:
return JSON.stringify(this.normalizeDataStandardForComparison(this.resultDetail())) !== this.originalDataStandardSnapshot;
```

**After**:
```ts
private originalDataStandardState: object | null = null;
captureDataStandardSnapshot() { this.originalDataStandardState = this.normalizeDataStandardForComparison(this.resultDetail()); }
hasDataStandardUnsavedChanges(): boolean {
  return !!this.originalDataStandardState
    && !deepEqual(this.normalizeDataStandardForComparison(this.resultDetail()), this.originalDataStandardState);
}
```

### 10.6 Hardcoded `resultTypeResponse[0]`

**Before**:
```ts
const resultType = detail.resultTypeResponse[0];  // throws on empty array
```

**After**:
```ts
const resultType = Array.isArray(detail.resultTypeResponse)
  ? detail.resultTypeResponse[0] ?? null
  : detail.resultTypeResponse ?? null;
if (!resultType) return;  // defensive; backend always returns 1, but guard anyway
```

---

## 11. Security review

This drawer mutates server state via 4 distinct PATCH endpoints. The client-side gates are UX only; **the backend must enforce equivalent authorization on every endpoint**.

### 11.1 `auth` header trust model
- Token in `localStorage.token`. No CSRF token, no httpOnly cookie.
- **Threat**: any XSS in the frontend can exfiltrate the token.
- **Mitigation in code**: none beyond the custom header name (`auth`, not `Authorization`).
- **Recommendation**: short-lived access tokens in memory + refresh in httpOnly cookies, plus CSP and strict template sanitization. Never rely on a custom header name as security boundary.

### 11.2 `canEditInDrawer` ownership chain
```ts
canEditInDrawer = computed(() => {
  if (this.api.rolesSE?.isAdmin) return true;
  const statusId = this.resultToReview()?.status_id ?? this.resultDetail()?.commonFields?.status_id;
  if (statusId != 5) return false;
  const myInitiativesList = this.api.dataControlSE.myInitiativesList || [];
  const found = myInitiativesList.find(item => item.official_code === this.bilateralResultsService.entityId());
  return !!found;
});
```
- **Threat**: client-only guard. A user with devtools can call PATCH endpoints directly even if the UI hides the buttons.
- **Mitigation in code**: the UI consistently uses `canEditInDrawer()` for `[editable]`, `[disabled]`, and the footer conditional. Helps prevent accidents.
- **Recommendation**: enforce the same chain server-side on **every** bilateral PATCH endpoint. Treat the client check as UX only.

### 11.3 `RolesService.readOnly` global flip
- **Threat**: if the destroy path doesn't run (crash, hot-reload), the global stays polluted. Unrelated widgets see the wrong `readOnly` state.
- **Mitigation in code**: dual restore paths (effect branch + `ngOnDestroy` fallback), `??=` guard prevents double-overwrite.
- **Recommendation**: remove the global toggle entirely. Use per-instance `[readOnly]` props.

### 11.4 Fail-open `reportingEnabled`
`EntityAowService.checkReportingAccess()` defaults `reportingEnabled` to `true` on missing phaseId, missing initiativeId, OR HTTP error.
- **Threat**: a transient network failure during a closed reporting window silently unlocks reporting for initiative owners.
- **Mitigation in code**: ownership check still applies, narrowing exposure.
- **Recommendation**: fail closed. Initialize to `false`, keep it false on error, show a "reporting window unavailable" banner.

### 11.5 `status_id == 5` loose equality
- The drawer uses `==` (loose) because the backend has historically returned both number and string.
- **Edge case**: `"05" == 5` is `true` in JavaScript. So is `"5.0" == 5`. Malformed backend data may unlock review actions unintentionally.
- **Mitigation in code**: none.
- **Recommendation**: coerce at ingress with `Number(status_id)`, reject `NaN`, then use `===` everywhere downstream.

### 11.6 Inline title edit — no method guard
```ts
confirmEditingTitle(): void {
  if (this.editingTitleValue().trim() === '') { this.isEditingTitle.set(false); return; }
  if (this.editingTitleValue().trim() === this.resultDetail()?.commonFields?.result_title.trim()) { this.isEditingTitle.set(false); return; }
  this.api.resultsSE.PATCH_BilateralResultTitle(...).subscribe(...);
}
```
- The method does NOT call `canEditInDrawer()`. The pencil-icon visibility in the template is the only gate.
- **Threat**: a programmatic call to `confirmEditingTitle()` will dispatch the PATCH regardless of edit permissions.
- **Recommendation**: add `if (!this.canEditInDrawer()) return;` at the top of the method. And enforce ownership on `PATCH /title` server-side independently of `/review-decision`.

---

## 12. Testing footprint (recommended)

### 12.1 Unit tests — `normalizeDataStandardForComparison`
Pure function. Test byte-stability:
```ts
describe('normalizeDataStandardForComparison', () => {
  it('returns {} for null detail');
  it('returns {} for undefined detail');
  it('normalizes contributingCenters to sorted center codes regardless of object vs string inputs');
  it('normalizes contributingProjects to sorted string ids from project_id, id, or primitive values');
  it('normalizes contributingInitiatives to sorted numeric ids across numbers, strings, and objects with id');
  it('normalizes contributingInstitutions to sorted numeric ids across institutions_id, institution_id, and id shapes');
  it('preserves evidence order while normalizing link and is_sharepoint fields');
  it('produces byte-stable JSON snapshots for equivalent inputs with different array ordering');
});
```

### 12.2 Unit tests — `canApprove`
Truth table:
```ts
describe('canApprove', () => {
  it('returns true when isToCCompleted is true and both unsaved-change checks are false');
  it('returns false when isToCCompleted is false and both unsaved-change checks are false');
  it('returns false when isToCCompleted is true and hasTocUnsavedChanges is true');
  it('returns false when isToCCompleted is true and hasDataStandardUnsavedChanges is true');
  it('returns false when all three guards fail');
  it('does NOT consult resultToReview().status_id or canEditInDrawer()');  // contract lock
});
```

### 12.3 Integration tests — drawer happy paths
```ts
describe('ResultReviewDrawerComponent integration', () => {
  it('loads detail on visible() + resultToReview() and normalizes contributingCenters, contributingProjects, and tocMetadata');
  it('confirmApprove() calls PATCH_BilateralReviewDecision with decision APPROVE, emits decisionMade, closes drawer');
  it('confirmReject() requires rejectJustification, calls PATCH with decision REJECT and justification');
  it('confirmSaveChanges("toc") calls PATCH_BilateralTocMetadata and reloads result detail');
  it('confirmSaveChanges("dataStandard") calls PATCH_BilateralDataStandard and reloads result detail');
  it('does NOT emit decisionMade when canEditInDrawer() is false (template hides the footer)');
});
```

### 12.4 Cypress E2E (parent page level — see `bilateral-results/AGENTS.md`)
1. Admin reviews + approves.
2. Admin reviews + rejects with justification.
3. Edits TOC alignment + saves.
4. Edits Data Standards + saves.
5. Deep-link with `?center=` and verify pending count visibility.

---

## 13. Quick replication checklist

- [ ] State machine implemented with the 7 states + 3 error substates.
- [ ] Data load sequence preserves the 10 `setTimeout` semantics (or refactored to `effect()`-driven equivalents).
- [ ] `RolesService.readOnly` global toggle replicated OR refactored to per-instance `[readOnly]` inputs (with all 5+ shared widgets patched).
- [ ] `normalizeDataStandardForComparison` matches the projection in §7.3 byte-for-byte.
- [ ] `canApprove` is the 3-predicate combinator only; gating is in the template + backend.
- [ ] Reject button has NO `[disabled]`; footer conditionally renders.
- [ ] `setTimeout(0)` + `untracked()` pattern preserved in the contributingInitiatives reapply effect.
- [ ] Inline title edit guards itself (`if (!canEditInDrawer()) return;`).
- [ ] All 4 PATCH endpoints (title, toc-metadata, data-standard, review-decision) enforce ownership server-side.
- [ ] Body scroll lock is ref-counted (not per-drawer `document.body.style`).
- [ ] `tocConsumed` is documented as plumbing, not domain state.

---

## 14. See also

- [`../../../../AGENTS.md`](../../../../AGENTS.md) — bilateral-results page-level guide.
- [`../../../../../../AGENTS.md`](../../../../../../AGENTS.md) — module-level root replication guide (architecture, API contracts, glossary).
- [`./result-review-drawer.interfaces.ts`](./result-review-drawer.interfaces.ts) — the canonical TypeScript shapes.
