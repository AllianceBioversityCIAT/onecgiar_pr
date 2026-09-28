# Design — IPSR Lead contact person save guard parity

## 1. Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/bugfix/ipsr-lead-contact-save-guard/` |
| Depth · Mode | Lite · Bug |
| Status | approved (santiago.sanchez@cgiar.org, 2026-09-28) |
| Implements | [`requirements.md`](./requirements.md) `IPSR-LCG-R-1..3` |
| Reference implementation | `rd-general-information.component.ts` `onSaveSection` + `@ViewChild(LeadContactPersonFieldComponent)` (`:34`, `:390-398`) |

## 2. Executive Summary

Copy the Results W1/W2 save guard into `IpsrGeneralInformationComponent.onSaveSection`: the guard runs on every portfolio and exempts names the field reports as loaded or accepted (`queryCameFromHydration`). Separately, bind the existing `guidanceAsTooltip` signal to the Lead contact person field. Client-only, one component, no contract change.

## 3. Architecture Overview

Unchanged. The save flow stays: `app-section-bottom-bar`/save button → `onSaveSection()` → guard → `PATCHIpsrGeneralInfo` → server. The guard reads two sources, as on Results:

| Source | Read | Meaning |
|---|---|---|
| `UserSearchService` (root) | `searchQuery`, `selectedUser` | Text in the input; directory record picked |
| `LeadContactPersonFieldComponent` (view child) | `queryCameFromHydration` | Text was loaded or accepted, not typed-unpicked |

## 4. Extended Directory Structure

```text
onecgiar-pr-client/src/app/
├── pages/ipsr/pages/innovation-package-detail/pages/ipsr-general-information/
│   ├── ipsr-general-information.component.ts        # guard + @ViewChild + doc comment fix
│   ├── ipsr-general-information.component.html      # [guidanceAsTooltip] on the field
│   └── ipsr-general-information.component.spec.ts   # regressions + invert :483
└── custom-fields/lead-contact-person-field/
    ├── lead-contact-person-field.component.html     # comment only (opt-in note now names IPSR)
    └── CLAUDE.md                                    # Traps: both consumers share one guard rule; re-stamp Verified
```

## 5. Data Model

No change.

## 6. API Design

No change. Both IPSR save endpoints (P22 `results-innovation-package/general-information/:id`, P25 `ipsr-framework/ipsr-general-information/general-information/:id`) keep their payload. The fix only changes **whether** the request is sent.

## 7. Backend Module Design

No change.

## 8. Frontend / UX Component Architecture

| Element | Before | After | Req |
|---|---|---|---|
| Guard condition in `onSaveSection` | `isP22() && searchQuery.trim() && !selectedUser` | `searchQuery.trim() && !selectedUser && !leadContactPersonField?.queryCameFromHydration` — same expression and same side effects as Results (`hasValidContact = false`, `showContactError = true`, return) | R-1, R-2 |
| View child | none | `@ViewChild(LeadContactPersonFieldComponent) leadContactPersonField?` — read-only use, mirrors Results `:34` | R-1, R-2 |
| Field binding | `[body]`, `[required]` | + `[guidanceAsTooltip]="guidanceAsTooltip()"` (signal already exists in the component, `:53`) | R-3 |
| Doc comment `:55-59` | Claims IPSR shares `validation_general_information_P25` | States the form gate only; points to proposal OQ-1 for the green-check divergence | — |

No new markup, copy or styles. The "not found" message and the "use this name anyway" button are rendered by the shared field and unchanged.

## 9. Shared Contracts or Package Extensions

- `LeadContactPersonFieldComponent.queryCameFromHydration` is already public for exactly this purpose (its docstring, `:30-39`). No change to the component.
- `IpsrGeneralInformationModule` already imports `CustomFieldsModule` (`ipsr-general-information.module.ts:12`, verified 2026-09-28), so the `@ViewChild` type import needs no module change.

## 10. Design Decisions

### `IPSR-LCG-DD-1` — Mirror the Results guard verbatim (proposal Option B)

- **Decision:** identical guard expression and side effects to Results.
- **Why:** one rule on both screens; already proven on Results with its rationale recorded (`rd-general-information.component.ts:376-389`).
- **Rejected:** A — only drop `isP22()` (extends the P22 false block to P25). C — shared helper across consumers (touches Results and a root service in a Lite bugfix; follow-up only).
- **Reversion challenge (Step 2.3)** — this removes the `isP22()` carve-out, so P25 starts blocking. *"What does removing it break?"*
  - Loaded P25 free-text names → exempted by `queryCameFromHydration` (set in `ngOnChanges`). Not broken.
  - "Use this name anyway" → sets `queryCameFromHydration = true`. Not broken.
  - Blank / whitespace query → `searchQuery.trim()` falsy → saves (existing test `:495` keeps passing). Not broken.
  - Stale `UserSearchService` state from a previously opened result before the package GET resolves → `ngOnChanges` on the initial empty body resets `searchQuery` to `''`; same exposure as Results. Not introduced by this change.
  - The one real breakage is the spec test `:483`, which asserts the old P25 behaviour. **Addressed:** inverted in `IPSR-LCG-T-1`, recorded in `execution.md`.
  - Outcome: no unaddressed breakage.

### `IPSR-LCG-DD-2` — Unresolved view child counts as "not loaded"

- **Decision:** optional chaining; if the field is not rendered, `queryCameFromHydration` reads `undefined` and a typed-unpicked query still blocks.
- **Why:** fail-safe towards not erasing data (R-1 over R-2). Same as Results.

### `IPSR-LCG-DD-3` — Opt IPSR into the 2026 tooltip guidance for this field

- **Decision:** pass `guidanceAsTooltip()`.
- **Reversion challenge:** the field's template comment says the flag is opt-in "so IPSR and Bilateral keep their current presentation" (P2-3201). That intent is superseded for IPSR: `ipsr/gi-impact-area-scores-parity` (archived 2026-09-28) already moved IPSR's Impact Area guidance to the ⓘ under this same signal, and explicitly left Lead contact out of scope. Without this binding the IPSR form mixes both presentations from 2026. Bilateral is unaffected. The comment is updated to say IPSR now opts in.
- **Outcome:** no breakage; before 2026 the flag is off and the inline box stays.

## 11. Budget (Step 2.4)

| Measure | Estimate |
|---|---|
| Tasks | 2 (regression RED → fix GREEN) |
| LOC | ~60 (≈15 production, ≈45 tests/docs) |
| Review rounds | 1 |

Matches Lite. Tripwire for `/akili-execute`: more than 2 tasks, more than ~120 LOC, or a second rework round → stop and escalate.
