# Design — `bilateral/review-drawer-readonly-rendering`

## 1. Document Control

| Field | Value |
|---|---|
| Depth | **Lite** |
| Status | approved |
| Approval Mode | `pre-approved` — Phase 1 gate **auto-approved (pre-approved mode)** |
| Requirements | `./requirements.md` |
| Verified at | `ecff181aa` |
| Architecturally significant? | No — no new module, integration, persistence or topology change |

## 2. Executive Summary

Add a `[readOnly]` binding beside each lock-driven `[disabled]` on the `pr-input`, `pr-textarea`
and `pr-select` instances in cards 2–4 of the review drawer and its four result-type content
children. Nothing is removed; nothing in TypeScript changes.

`[disabled]` stays because it is the functional block. `[readOnly]` is what selects the controls'
existing read-only text branch. Additive-only means the change cannot unlock anything.

## 3. Architecture Overview

No architectural change. The work is confined to five Angular templates.

```
result-review-drawer.component.html          card 2 pr-textarea, card 3 pr-input
  └─ @switch result_type_id
       ├─ policy-change-content.component.html      2× pr-select
       ├─ innovation-use-content.component.html     1× pr-select, 10× pr-input
       ├─ cap-sharing-content.component.html        4× pr-input
       ├─ kp-content.component.html                 (already text-only — untouched)
       └─ inno-dev-content.component.html           1× pr-select, 1× pr-textarea
```

## 4. Extended Directory Structure

No new files except the two test artifacts named in `tasks.md`.

## 5. Data Model

Unchanged.

## 6. API Design

Unchanged. No request, response, or payload is touched — `RDR-NFR-1`.

## 7. Backend Module Design

Not applicable — client-only change.

## 8. Frontend / UX Component Architecture

### 8.1 The mechanism

Each `pr-*` control picks its rendering branch from its own `readOnly` input OR'd with the global
`RolesService.readOnly`. `disabled` is not part of that expression, which is why `[disabled]` alone
produces an inert control that still looks editable.

| Control | Read-only branch keyed on | Already correct? |
|---|---|---|
| `pr-textarea` | `(readOnly() \|\| rolesSE.readOnly) && !isStatic()` | ✗ in scope |
| `pr-input` | `(readOnly() \|\| rolesSE.readOnly) && !isStatic()` | ✗ in scope |
| `pr-select` | `editable() ? false : (readOnly() \|\| rolesSE.readOnly) && !isStatic()` | ✗ in scope |
| `pr-radio-button` | `(readOnly \|\| disabled \|\| rolesSE.readOnly) && !isStatic` → `.block-field` | ✓ already reads `disabled` |
| `pr-range-level` | `disabled` → `.prl--disabled`; has no `readOnly` input | ✓ nothing to add |
| `pr-multi-select` | already passed `[readOnly]` by the drawer | ✓ |
| `geoscope-management` | already passed `[readOnly]` by the drawer | ✓ |

### 8.2 Exact edit sites

All 21 sites, at `ecff181aa`. Predicate is `!canEditDataStandards()` in the drawer and `disabled`
in the children.

| File | Lines |
|---|---|
| `result-review-drawer.component.html` | 313 (`pr-textarea`), 525 (`pr-input` — see note) |
| `policy-change-content.component.html` | 10, 23 (`pr-select`) |
| `cap-sharing-content.component.html` | 11, 20, 29, 38 (`pr-input`) |
| `inno-dev-content.component.html` | 12 (`pr-select`), 23 (`pr-textarea`) |
| `innovation-use-content.component.html` | 13 (`pr-select`); 27, 49, 57, 77, 85, 121, 149, 158, 197, 241 (`pr-input`) |

> **Note on drawer `:525` — "Add Evidence Link".** This `pr-input` sits inside
> `@if (canEditDataStandards())` (opened at `:517`), so it is **not rendered at all** when the card
> is locked and its `[disabled]`/`[readOnly]` can only ever evaluate against a true
> `canEditDataStandards()`. The binding is therefore inert by construction. It is kept rather than
> reverted so the invariant `RDR-T-1` enforces stays mechanical — "every lock-driven `pr-*` carries
> `[readOnly]`" — with no per-site exception a future editor has to remember. Recorded here so a
> later reader does not mistake the dead binding for a bug. (Reviewer ADVISORY, RDR-T-1.)

**Deliberately excluded**, with reason:

| Site | Why excluded |
|---|---|
| drawer 241, 282 | Card 1 Theory of Change — must stay editable (`RDR-R-1` `BUT`) |
| drawer 631, 683, 736, 777, 778, 807, 808 | Buttons and dialog controls, not data fields |
| innovation-use 70, 98, 110 | Already carry `[readOnly]="true"` — permanently computed fields |
| innovation-use 42, 208, 252 · policy-change 38 | Already carry `[readOnly]="disabled"` |
| innovation-use 132, 171 | `app-add-button`, already hidden by `*ngIf="!disabled"` |
| cap-sharing 60, 74, 87 · drawer 341 | `pr-radio-button` — already read-only aware |
| inno-dev 41 | `pr-range-level` — already read-only aware, no `readOnly` input exists |

### 8.3 UX outcome

No new token — `RDR-NFR-2`. The read-only appearance is the one `app-field-card` and the `pr-*`
`.readOnly` class already ship and that the rest of PRMS uses for non-editable fields. The result
is that cards 2–4 read as a *record* while card 1 reads as a *form*, which is the distinction the
existing `🔒 Center-reported (Read-only)` badge already asserts but the fields contradict.

## 9. Shared Contracts or Package Extensions

None. No exported symbol, input signature, output, or service is modified.

## 10. Design Decisions

### DD-1 — Add `[readOnly]`, do not replace `[disabled]`

**Decision:** every edit is purely additive; `[disabled]` stays on all 21 sites.

**Why:** `[disabled]` is the functional block. Replacing it would make the lock depend entirely on
a rendering-branch input, and any future path that sets `readOnly` false would silently restore
editability. Keeping both means the worst case of a wrong `[readOnly]` is a cosmetic miss, never an
unlocked field.

**Rejected:** replacing `[disabled]` with `[readOnly]` (smaller diff, strictly worse failure mode).

**Reversion challenge (Step 2.3):** not triggered — this DD removes nothing. It only adds bindings.

### DD-2 — Do not touch `pr-radio-button` or `pr-range-level`

**Decision:** leave the 8 sites that already derive a read-only appearance from `disabled`.

**Why:** both already paint a distinct non-editable state (`.block-field`, `.prl--disabled`).
`pr-range-level` has no `readOnly` input at all, so adding one would be a shared-control change —
out of scope for a Lite spec and a different blast radius.

**Consequence accepted:** cards 2–4 will mix two read-only idioms — text for inputs/selects, a
greyed blocked control for radios and the range ladder. Confirmed acceptable for this spec; a
follow-up may unify them.

### DD-3 — The completeness gate is a static read of the real templates

**Decision:** `RDR-T-1` reads the five `.html` files from disk and asserts the invariant.

**Why:** both existing Jest specs call `overrideComponent({ set: { template: '' } })`, so **no Jest
test in this module renders these templates**. A rendered Jest assertion is impossible without
rewriting the specs' bootstrap. A static read of the shipped file is a real-artifact lock (it reads
what ships, not a fragment authored in the test) and is the correct shape for a sweep-completeness
gate.

**What it cannot prove:** that the binding produces a read-only rendering. `RDR-T-2` (Cypress CT,
real mount, geometry-free DOM assertion) proves that. Both are required; neither substitutes for
the other. `D4` in `requirements.md` §8 stays unproven by either and goes to the HITL check.

## 11. Premise Ledger

**Count:** 7 rows — 7 verified, 0 `UNVERIFIED` (0 High Impact, 0 Low).
**Blast-radius triggers:** `live-path` fires (the design names the `Review` row action and branches
on `result_type_id`); `shared-state` fires (`disabled` is read by many blocks inside each child);
`consumer` fires (the rendered DOM loses `<input>`/`<textarea>` nodes in cards 2–4).

| # | Claim | Class | Citation (as run) | Verified at | If false | Settled by |
|---|---|---|---|---|---|---|
| P-1 | `canEditDataStandards()` is true only for a Platform Admin, so cards 2–4 are already functionally locked for an SP reviewer | `existence` | `result-review-drawer.component.ts:231` — `computed(() => this.canEditInDrawer() && !!this.api.rolesSE?.isAdmin)` | `ecff181aa` | If false, this spec is the wrong fix — the gap would be enforcement, not rendering, and the whole scope changes. **Impact: High** | — |
| P-2 | `pr-textarea`, `pr-input`, `pr-select` select their read-only branch from `readOnly`, never from `disabled` | `location` | `pr-textarea.component.html:14`, `pr-input.component.html:27`, `pr-select.component.html:19` — each `[ngSwitch]` reads `(readOnly() \|\| rolesSE.readOnly) && !isStatic()`; `disabled()` appears only on the native element inside the `false` branch | `ecff181aa` | If false, adding `[readOnly]` changes nothing and DD-1 collapses. **Impact: High** | — |
| P-3 | The drawer forces `rolesSE.readOnly = false` while open for any user passing `canEditInDrawer()`, so the global cannot supply the read-only branch | `shared-state` | `result-review-drawer.component.ts:1003` — `this.rolesSE.readOnly = false;` inside the visibility effect, restored at `:1006` and `:1781` | `ecff181aa` | If false, an SP reviewer would already get read-only rendering from the global and no edit would be needed. **Impact: High** | — |
| P-4 | `pr-select.editable` defaults to `false` and `isStatic` is unset on every in-scope site, so `[readOnly]` reaches the read-only branch unobstructed | `data-env` | `pr-select.component.ts:37` — `editable = input<boolean>(false)`; `:31` `isStatic = input<boolean>()`. `grep -n "editable\|isStatic"` over the 5 in-scope templates → **3 hits, all in the drawer, none on an in-scope site**: `:238` and `:248` are card 1 (`pr-yes-or-not`, `cp-multiple-wps`), `:474` is the contributors' `cp-multiple-wps`. The four child templates return 0 | `ecff181aa` | If false, `pr-select` sites keep rendering editable and `RDR-T-2` goes red. **Impact: Low** — the task adjusts per-site | — |
| P-5 | The four `*-content` components are mounted by exactly one consumer, the drawer, under `@switch (result_type_id)` cases 1/2/5/7 | `live-path` | Chain as run: route `…/entity-details/:id/bilateral-review` → `bilateral-review-table.component.ts:613` `openResult.emit(row)` → `bilateral-review.component.html:612` `(openResult)="onOpenResult($event)"` → `bilateral-review.component.ts:1210` `showReviewDrawer.set(true)` → `bilateral-review.component.html:623-626` mounts `app-result-review-drawer` → `result-review-drawer.component.html:598-614` `@switch` on `result_type_id`, cases 1 / 2 / 5 / 7 pass `[disabled]="!canEditDataStandards()"`; case 6 (`kp-content`) takes no `disabled`. Repo-wide grep for the four selectors over `--include=*.html --include=*.ts` returned only those four drawer lines | `ecff181aa` | If false, an unlisted mount would render un-swept controls. **Impact: Low** — the task adds the missed site | — |
| P-6 | Inside each child, `disabled` is read by many sibling blocks, all within that child's own template | `shared-state` | Per-file `grep -c disabled`: `policy-change` 3, `cap-sharing` 7, `inno-dev` 3, `innovation-use` 21. Readers enumerated in §8.2 (in-scope) and §8.2's exclusion table (out-of-scope), which together account for every hit | `ecff181aa` | If a reader is missed, that field stays editable-looking — exactly the defect class `RDR-T-1` gates. **Impact: Low** | — |
| P-7 | No existing test pins the `<input>` / `<textarea>` / `a.field` nodes that will disappear from cards 2–4 | `consumer` | `grep -rn -e canEditDataStandards -e readOnly -e disabled --include="*.spec.ts" --include="*.cy.ts"` over `pages/bilateral-review/` → **55 hits, none asserting a rendered control inside cards 2–4**. The three `[disabled]`-counting gates — `bilateral-review.cy.ts:555`, `bilateral-review.component.spec.ts:709`, `bilateral-review-center-strip.component.spec.ts:56` — are scoped to the page toolbar / chips / center strip, not the drawer, and this change only **reduces** native `disabled` nodes. The two hits that name `disabled` inside a child are logic-only: `policy-change-content.component.spec.ts:176` calls `ngOnChanges({ disabled })`, `innovation-use-content.component.spec.ts:199-206` sets `component.disabled` to exercise `hasElementsWithId`. Neither renders a template — both specs bootstrap with `overrideComponent({ set: { template: '' } })` | `ecff181aa` | If false, a pinned selector breaks and the suite goes red. **Impact: Low** — the task updates the pin | — |

## 12. Budget (Step 2.4 — tripwire for `/akili-execute`)

| Metric | Expected |
|---|---|
| Tasks | **2** |
| LOC | **~145** (≈21 template lines + ≈55 static-gate test + ≈70 CT spec) |
| Review rounds | **1** (max 1 per task; a second FAIL escalates) |

Estimate matches the declared **Lite** depth: one mechanical sweep plus its two gates. Per
`feedback-pragmatic-akili-execution`, tests are the majority of the LOC here and that is expected,
not scope creep. Exceeding any figure stops execution and escalates rather than continuing.
