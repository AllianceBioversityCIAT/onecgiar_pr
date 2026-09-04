# Module Spec: `bugfix/smart-back-button` — Design

Lite · Bug Mode. Implements [`requirements.md`](./requirements.md). Intent: [`proposal.md`](./proposal.md).

## Document Control

| Field | Value |
|---|---|
| Spec Path | `bugfix/smart-back-button` |
| Type | Bug |
| Depth | Lite |
| Approval Mode | gated |
| Status | approved |
| Requirements | SBB-R-1, SBB-R-2, SBB-R-3 |
| Live surface | `app-reporting-program-band` (`KZ-changes--kp-report-modal-auto-create-1`) |
| Resolver | `SmartNavigationService` (also used by `bilateral-page-header`) |

## 1. Summary

Fix program-shell Back so it exits to the last catalog, not a sibling Science Program. Change only the shared resolver’s **Science Program shell** branch and how `back()` records history. No routes, APIs, or button chrome.

Trade-off: Back is no longer a “previous SP” control. The sidebar stays the way to switch programs.

## 2. Architecture Overview

### 2.1 Where this lives in the system

| Layer | Change |
|---|---|
| Server | None |
| Client | `onecgiar-pr-client/src/app/shared/services/smart-navigation.service.ts` (+ `.spec.ts`) |
| Band | No markup change. Label already reads `getBackTarget().label` |
| Bilateral header | No section 2–3 change (SBB-R-3) |
| External | None |

Cite `docs/trd/trd.md` `W1` (client navigation only). UI IA: `docs/ux-ui/design.md` §2.

### 2.2 Sequence / interaction diagram

```text
Sidebar click SP08 → SP01 → Overview tab
        │
        ▼
SmartNavigationService.history
  [ …, /home, /entity-details/SP08/…, /entity-details/SP01, /entity-details/SP01/overview ]
        │
        ▼
getBackTarget (shell branch)
  skip every /entity-details/* sibling
  take last catalog (home / portfolio / results-list)
  else home
        │
        ▼
Band shows “Back to Science programs”
Click → back() → navigateByUrl(catalog)
        │
        ▼
Do not leave a breadcrumb that retargets SP01
```

## 3. Data Model Changes

No entities, migrations, or CLARISA changes.

## 4. API Surface

No endpoints. No bilateral / platform-report payload change (`AC-4` N/A).

## 5. Server Workflow / Business Rules

None. Client-only. `W1` reporting flow is unchanged.

## 6. Frontend Plan

### 6.1 Routes / modules

No route table change. Sidebar `programLink` stays `/result-framework-reporting/entity-details/:code`.

### 6.2 Components & services

- **Resolver (only write):** `SmartNavigationService.getBackTarget` shell branch (today: skip same program only) and `back()`.
- **Band:** read-only consumer. Touch only if a test proves the label stays stale after the resolver is correct (not expected: leaving the shell unmounts the band).
- **Bilateral header:** do not widen sibling-skip into Center create/detail/shell branches.

### 6.3 Design system usage

No new tokens, components, or strings. `aria-label` stays bound to the resolved label (`docs/ux-ui/design.md` §10).

### 6.4 Real-time / notification UX

None.

## 7. Security & Authorization

No new auth surface. Do not log URLs that could carry tokens. `.cursorrules` / `AC-9` unchanged.

## 8. Performance & Capacity

History cap stays at 50 entries. No new subscriptions on the band.

## 9. Observability

None. Do not add navigation debug logs.

## 10. Testing Plan (forward-looking)

| Case | File | When |
|---|---|---|
| Sibling hop home → SP08 → SP01/overview → catalog, not `{ label: 'Back', url: SP08 }` | `smart-navigation.service.spec.ts` | **Red before the fix** (SBB-R-1) |
| After `back()`, next resolve is not SP01 | same | SBB-R-2 |
| Center → SP still “Back to Bilateral results” | same | SBB-R-3 |
| Existing home / portfolio / results-list / same-program tabs / By-AOW | same file, already present | must stay green |

Scoped Jest only (`--testPathPattern="smart-navigation.service.spec"`). jsdom cannot prove the painted band — accepted Lite risk in `requirements.md` §8.

## 11. Backwards Compatibility & Migration Plan

No migration. Compatible with current catalog and drill-down tests. Intentional break: generic **Back** to a sibling SP is removed (see SBB-DD-1 challenge).

## 12. Design Decisions (ADRs)

### SBB-DD-1 — Skip every `/entity-details/` URL on the program-shell branch

- **Context:** Shell Back only skipped the *same* program, so a sidebar hop became generic **Back** to the previous SP (SBB-R-1).
- **Decision:** In the shell branch only, treat any `/entity-details/` URL as a sibling and skip it. Then pick the last catalog, or home.
- **Alternatives:** Always home (drops Portfolio / Results list labels). `history.back()` (breaks refresh / deep link; rejected by archived Submitter / AOW back-link specs).
- **Consequences:** Back is not “previous program”. Sidebar remains that control.
- **Reversion challenge (Step 2.3):** *What does removing “Back → previous SP” break?* Users who used Back to compare two SPs lose that hop. They can still open the other SP from the sidebar. No existing test asserts the sibling destination. Accept the break — that hop is the defect.

### SBB-DD-2 — `back()` must not stack the page just left

- **Context:** `back()` navigates without popping; NavigationEnd appends the destination and inverts the pair (SBB-R-2).
- **Decision:** When `back()` runs, drop the current URL from history (or ignore the NavigationEnd that `back()` itself causes) so the next resolve cannot retarget the left shell.
- **Alternatives:** Rely on SBB-DD-1 alone (first click is enough if landing has no band; history still fills with SP URLs). Rejected as insufficient for SBB-R-2 if the catalog is missing and a later hop re-enters a shell.
- **Consequences:** One extra history rule, still in the same service. Must not break By-AOW drill-down (that branch is not the shell `back()` path).

### SBB-DD-3 — Do not change the band computed unless the resolver fix is not enough

- **Context:** `backLabel` does not track the history array. On a sidebar hop `programCode` changes, so the computed re-runs; the generic label came from the resolver, not staleness.
- **Decision:** Leave the band alone. Revisit only if a post-fix test shows a stale catalog label on the shell.
- **Lesson:** `KZ-changes--kp-report-modal-auto-create-1` — the live control is the band calling the service, not `entity-details.component`.

## 13. Open Gaps & Follow-ups

- Named labels for `/emerging`, `/planned-toc`, top-level `/overview` stay deferred; they fall through to home.
- Painted-band HITL is optional (requirements §8).
- Do not promote this DD into `docs/trd/trd.md` from a spec branch (shared-file discipline).

## Budget (Step 2.4)

| Signal | Estimate |
|---|---|
| Tasks | 2 (red regression, then resolver + `back()` fix) |
| LOC | ~40–80 (service + spec) |
| Review rounds | 1 |

Depth **Lite** matches: one service, no API, no visual redesign. `/akili-execute` trips if this grows past ~2 tasks or ~100 LOC without a user check.
