# Design — Clickable Submitter on the Result Detail identity strip

**How:** extend `app-result-header`’s identity strip with a labeled Submitter link built from `currentResult.initiative_official_code` and `initiative_name`. The link is a same-tab `routerLink` to program home. No new component, no API, no return-URL query.

Links: `requirements.md` (RSBL-R-1..R-7, R-10). Proposal Option A. Baseline: `docs/prd.md` `US-S1` · `docs/ux-ui/design.md` §4–§5, §7, §9–§10 · `docs/trd/trd.md` `W1` · `result-detail/CLAUDE.md` (header lives in `.rd_scroll`). Lesson: `KZ-changes--kp-report-modal-auto-create-1` — live surface is this header after Result Detail navigation, not the Report aside.

## 1. Summary

Result Detail already loads the primary Science Program on `dataControlSE.currentResult`. This design paints that program on the identity strip and makes the value the way back to `/result-framework-reporting/entity-details/{official_code}`. Trade-off: the click lands on program home, not the exact AOW/indicator the user left (Option C deferred). **Back to results** stays the Results Center exit.

## 2. Architecture Overview

### 2.1 Where this lives in the system

| Layer | Touched? |
|---|---|
| Server | No |
| Client | `pages/results/pages/result-detail/components/result-header/` only |
| External | None. Program home is an existing in-app route |

### 2.2 Sequence / interaction diagram

```
Result Detail loads GET result (already on the page)
  └── dataControlSE.currentResult
        ├── initiative_official_code empty → do not render Submitter
        └── official code present
              └── identity strip shows “Submitter” + “{code} - {name}” (or code alone)
                    └── user activates the value
                          └── router → /result-framework-reporting/entity-details/{code}
                                └── existing entity-details page (unchanged)
```

Report-from-indicator does not change: `LabReportFormComponent` still navigates to Result Detail with `?phase=` only. Submitter is derived after that load (`KZ-changes--kp-report-modal-auto-create-1`).

## 3. Data Model Changes

### 3.1 Entities

None.

### 3.2 Migrations

None.

### 3.3 CLARISA / external-data implications

None. Official code is already on the result payload the header reads.

## 4. API Surface

### 4.1 New / changed endpoints

None.

### 4.2 Bilateral / platform-report impact

None.

## 5. Server Workflow / Business Rules

None. Client chrome only. `W1` is the lifecycle the user stays in; this control only orients them.

Display rules (client):

| Input | Paint |
|---|---|
| Official code missing / whitespace | No Submitter node |
| Code present, name present | `{code} - {name}` |
| Code present, name missing | `{code}` only |
| Code spelling (`SGP-02` vs `SGP02`) | Use the stored string; do not normalize |

## 6. Frontend Plan

### 6.1 Routes / modules

No router-table change. Consume the existing `entity-details/:entityId` path. Do not add query params (`tocView`, `from`, `returnUrl`).

### 6.2 Components & services

| Piece | Change |
|---|---|
| `result-header.component.html` | One identity-strip item after funding, before the status chip: muted “Submitter” label + primary-colored `routerLink` on the value. Same divider pattern as category / level / funding. `@if` on a non-empty official code. |
| `result-header.component.ts` | Read-only getters from `dataControlSE.currentResult` (same pattern as `category` / `funding`). Commands for the program-home `routerLink`. Keep Default change detection — `currentResult` is still a plain field. |
| `result-header.component.spec.ts` | Cases for AC-1..AC-6 (see §10). Fixture already has `initiative_official_code: 'SP04'` and `initiative_name: 'Multifunctional Landscapes'`. |
| `LabReportFormComponent` / AOW create modal | No change. |
| ⓘ popover / metadata panel | No change. Do not fill Origin. |

State: none. No session, no referrer store. `RouterLink` is already imported.

### 6.3 Design system usage

- **Chrome:** inline strip item, not Image 2 outlined chips (RSBL-R-10, RSBL-OQ-4). Tailwind-only; no new SCSS, no new tokens (`docs/ux-ui/design.md` §7 Tailwind-first).
- **Color:** label `--pr-text-secondary` / muted (same as category). Value `--pr-color-primary-300` + hover opacity like **Back to results**.
- **Type:** 12px, matching the strip (`body-2` scale).
- **Focus:** visible ring on the link (`docs/ux-ui/design.md` §10). Tab order is document order: **Back to results**, then title-row actions (PDF / ⋮), then the identity-strip Submitter link.
- **Touch:** match **Back to results** (compact header link). Do not grow the strip to a 44px target — that would collide with the title row.
- **Responsive:** strip already `flex-wrap`. At `md` (900px) wrapping is allowed; the new item must not force horizontal overflow or overlap title / PDF / ⋮ (RSBL-R-7). No `xs`/`sm` redesign.
- **i18n:** header already hardcodes “Back to results”. Hardcode “Submitter” the same way. Do not open a second i18n path.
- **Cursor:** pointer on the value.

Accessible name: `aria-label` on the link = `Submitter: {value}` so RSBL-R-6 holds even if the visible label is a sibling `<span>`.

### 6.4 Real-time / notification UX

Not applicable.

## 7. Security & Authorization

- Same-tab in-app `routerLink` only. Official code is a route parameter, not interpolated into HTML as a raw href string the user can script.
- No new auth. Entity-details keeps its existing guards.
- Do not log tokens while debugging (`AC-9`).

## 8. Performance & Capacity

No extra HTTP. One more node in a strip that already re-renders with `currentResult`. Negligible bundle impact (`RouterLink` already imported).

## 9. Observability

None. Do not add analytics or logs for this chrome.

## 10. Testing Plan (forward-looking)

| Class | Harness | What it proves |
|---|---|---|
| Submitter text (RSBL-R-1, AC-1) | Jest `result-header.component.spec` | Fixture SP04 + name visible; `data-testid="result-header-submitter"` present |
| Link target + same tab (RSBL-R-2, AC-2) | Same | `routerLink` / `href` is `/result-framework-reporting/entity-details/SP04`; no `target="_blank"` |
| No code (RSBL-R-3, AC-3) | Same | Missing, empty, **and** whitespace-only official code → testid absent; no `entity-details/undefined` |
| Back to results (RSBL-R-4, AC-4) | Existing back-link assertion | Still `/result/results-outlet/results-list` |
| Not referrer-only (RSBL-R-5, AC-5) | Same happy-path case | Render uses `currentResult` only; no history mock |
| Accessible name + Tab (RSBL-R-6, AC-6) | Same | `aria-label` contains `Submitter` and `SP04`; link is in the tab order after **Back to results** |
| Wrap / overlap (RSBL-R-7, AC-7) | **HITL**, not Jest | jsdom cannot measure. 900px and ~1100px vs `visual/current-header-no-submitter.jpg` |

A green Jest run is **not** evidence for RSBL-R-7.

**Input that would fail the Jest gate:** official code `SP04` on the fixture and no Submitter node — current HEAD must fail the new cases until the strip is wired.

## 11. Backwards Compatibility & Migration Plan

- Additive chrome only.
- No flag, migration, or payload change.
- Deep links and PDF/copy-link behavior unchanged.
- Users who bookmarked Result Detail gain a Submitter; they do not lose **Back to results**.

## 12. Design Decisions (ADRs)

### RSBL-DD-1 — Identity-strip link to program home (not a new back control)

- **Context:** Users who Report from an indicator lose SP context. The payload already has the program. Two back affordances would fight.
- **Decision:** Add Submitter to the identity strip; keep **Back to results**. Click → program home. Derive from `currentResult`, not referrer (RSBL-R-1, R-2, R-4, R-5).
- **Alternatives considered:**
  1. Replace **Back to results** with “Back to {SP}” — rejected: list users lose Results Center.
  2. Return URL / AOW query on every Report navigate — rejected this slice (`KZ-changes--kp-report-modal-auto-create-1`: must trace every click; stale when bookmarked).
  3. `history.back()` — rejected: breaks refresh and shared links.
- **Consequences:** Click does not restore the exact AOW list. Accepted (RSBL-OQ-1). Follow-up spec if HITL says program home is not enough.

### RSBL-DD-2 — Inline labeled link, not legacy chips

- **Context:** Image 2 is the data/copy target; Image 1 is the live chrome.
- **Decision:** Muted “Submitter” + primary link value, same dividers as the rest of the strip. Place after funding, before the status chip (RSBL-R-10).
- **Alternatives considered:** Restore outlined chips — rejected: second visual language on a strip the redesign just flattened. Put Submitter in ⓘ — rejected: R-1 requires it without opening ⓘ.
- **Consequences:** Long names wrap in the strip. HITL owns overlap (RSBL-R-7).

### RSBL-DD-3 — Jest owns text/href; HITL owns wrap

- **Context:** Dominant functional defects are missing text and wrong href. Dominant visual defect is wrap/overlap. jsdom cannot see the latter.
- **Decision:** Scoped Jest on `result-header.component.spec` for R-1..R-6. R-7 is HITL at 900px and ~1100px.
- **Alternatives considered:** Cypress layout assert — rejected: no CI Cypress gate for this chrome. Pixel CI — none in repo.
- **Consequences:** Execute must not close R-7 without a HITL note.

## 13. Open Gaps & Follow-ups

- Exact AOW restore (proposal Option C): deferred.
- Center-as-submitter for W3/Bilateral: deferred (RSBL-OQ-2 locked to primary SP).
- i18n for “Submitter” if the header later moves off hardcoded English.
- Focus-ring paint is HITL; Jest only checks `aria-label` presence.

## 14. Budget (Step 2.4)

| Signal | Estimate |
|---|---|
| Expected tasks | **2** — (1) red Jest cases on current header, (2) strip + getters + green Jest + HITL wrap |
| Expected LOC | **~80** (template item + 2–3 getters + ~40–50 spec lines) |
| Expected review rounds | **1** |

Owner kept **Standard** (proposal + requirements). The work is still one component / no API / ~80 LOC. Tripwire for `/akili-execute`: more than 2 tasks, ~160 LOC, or a second review round → stop and ask. Do not switch to `/akili-quick`: this adds a real navigation.

## 15. Reversion challenge (Step 2.3)

No shipped behavior is removed. **Back to results**, ⓘ rows, and create navigation stay. Adding Submitter is an addition. Challenge skipped.
