# Tasks — Overview Replicated/New Badges

Links: `requirements.md` · `design.md` (same folder) · `docs/prd.md` (`US-P1`) · `docs/trd/trd.md` (bilateral module, no surface changed).

## 1. Scope of this task list

- **Module / feature:** `bilateral` — center Overview tab, "Total results" KPI hero
- **Linked spec:** `docs/specs/changes/overview-replicated-new-badges/requirements.md` + `design.md`
- **Sprint / target phase:** none
- **Owner / driver:** santiago.sanchez@cgiar.org
- **Status:** implemented — pending manual browser verification and commit/PR

---

## 2. Pre-flight checklist

- [x] `requirements.md` approved (user selected Continue at the Phase 1 gate).
- [x] `design.md` approved (user selected Continue at the Phase 2 gate).
- [x] Open questions resolved — `BOV-OQ-1` closed via `BOV-DD-1` (unconditional `newCount`), not challenged at either approval gate.
- [ ] CLARISA dependencies — n/a, no CLARISA surface touched.
- [ ] No conflicting in-flight spec — no other spec under `docs/specs/` currently touches `bilateral-overview/` or `bilateral-projects-panel/` (checked at proposal time; re-check at execution start if time has passed).
- [ ] Migration — n/a, no schema change.

---

## 3. Task list

### `BOV-T-1` — Add center-wide replicated/new counts and badges to the Overview "Total results" card [x]

- **Type:** `client`
- **Description:** Extend `buildTotalResultsKpi` in `bilateral-overview.aggregate.ts` to compute `replicatedCount` and `newCount` (normalized via `Number(row.is_replicated) === 1`, unconditional partition per `BOV-DD-1`) in the same existing loop that already computes `w3Count`/`leadCount`. Add both fields to the `OverviewTotalResultsKpi` interface. Render them as two badge pills on the "Total results" hero card in `bilateral-overview.component.html`, copying the pill markup/tokens from `bilateral-projects-panel.component.html:265-299` (amber `pi-sync` "replicated", emerald `pi-plus-circle` "new"), as non-interactive `<span>`s per `BOV-DD-4`. Update the card's `aria-label` to include both new figures. Update `bilateral-overview/CLAUDE.md` in the same commit (touched-folder convention) documenting the divergence from the Reporting tab's status-gated "new for review" (`BOV-DD-1`).
- **Implements:** `BOV-R-1`, `BOV-R-2`, `BOV-R-2.1`, `BOV-R-3`, `BOV-R-4`, `BOV-R-5`, `BOV-R-10`, `BOV-AC-1`, `BOV-AC-2`, `BOV-AC-3`, `BOV-AC-4`
- **Files (expected):**
  - `onecgiar-pr-client/src/app/pages/bilateral/pages/bilateral-overview/bilateral-overview.aggregate.ts`
  - `onecgiar-pr-client/src/app/pages/bilateral/pages/bilateral-overview/bilateral-overview.aggregate.spec.ts`
  - `onecgiar-pr-client/src/app/pages/bilateral/pages/bilateral-overview/bilateral-overview.component.html`
  - `onecgiar-pr-client/src/app/pages/bilateral/pages/bilateral-overview/bilateral-overview.component.spec.ts`
  - `onecgiar-pr-client/src/app/pages/bilateral/pages/bilateral-overview/CLAUDE.md`
- **Depends on:** `—`
- **Blocks:** `—`
- **Estimate:** `S`
- **Review:** `checklist`
- **Verification:**
  - **Falsifier:** given a fixture of 8 rows where 5 have `is_replicated` truthy (`1`, `'1'`, `true` — mixed shapes) and 3 falsy (`0`, `undefined`), `buildTotalResultsKpi(rows).replicatedCount === 5` AND `.newCount === 3` AND `replicatedCount + newCount === count`. If any of these three checks fails, or if a row with `is_replicated: true` (boolean, not `1`) is NOT counted as replicated, the task is wrong.
  - **Red run:** `npx jest --testPathPattern="bilateral-overview.aggregate.spec|bilateral-overview.component.spec" --silent --reporters=summary --no-coverage` — the new assertions in `bilateral-overview.aggregate.spec.ts` (mixed-shape fixture, sum invariant) and `bilateral-overview.component.spec.ts` (rendered badge counts + `aria-label` content) must fail before the change (fields/markup don't exist yet) and pass after.
  - **Disqualifier:** if implementing this reveals `is_replicated` is NOT actually present on the rows the Overview tab's `overviewService.entry(...)` returns (contradicting `BOV-P-1` in `design.md`'s Premise Ledger) — e.g. because the Overview tab's fetch path strips it or uses a different DTO than the Reporting tab's — stop and re-specify; do not patch around a missing field with a client-side guess.
  - **Consumers:** `OverviewTotalResultsKpi` is consumed only by `bilateral-overview.component.ts`'s `model()` signal and its own spec file — no other component imports this interface (confirmed via the aggregate file's exports and the folder's existing test map in `CLAUDE.md`). Adding two required fields is additive and does not break any existing consumer, but re-grep `OverviewTotalResultsKpi` at implementation time to confirm no new consumer was added since this spec was written.
- **Definition of done:**
  - [ ] Code merged via the project commit convention (`✨ feat(bilateral-overview): ...` — new capability, no ticket). — pending: no commit made yet (standing rule: never commit without explicit user go-ahead).
  - [x] Lint clean: `npx ng lint --quiet` (client).
  - [x] Unit tests added/updated per Verification above; client coverage stays ≥ 50/60/60/60 (scoped run: 70/70 passing).
  - [x] Migration — n/a.
  - [x] No secret or token leaked in logs/messages (`.cursorrules`) — n/a, no logging touched.
  - [x] UX changed: no new `TermKey` per `BOV-DD-5` (plain English, matching the Reporting tab's own precedent) — confirmed at implementation time, `bilateral-projects-panel.component.html` still hardcodes English with no `term` pipe.
  - [x] Bilateral/platform-report payload — n/a, no server payload touched, no change-log entry needed.
  - [x] `bilateral-overview/CLAUDE.md` updated and its `**Verified:**` line re-stamped in the same commit (`docs/COMPONENT-DOCS.md` convention), documenting the `BOV-DD-1` divergence from the Reporting tab's "new for review" definition.
  - [ ] **Not done — accepted risk (see `execution.md` attempt 2):** manually verified in a real browser. Requires an injected JWT (`onecgiar-pr-client/CLAUDE.md` §9); none was available to the Leader this session. Recommended before merge.
  - [ ] **Not done — accepted risk (per `requirements.md`'s defect-class table, no automated gate exists):** visual side-by-side check against `bilateral-projects-panel`'s badge styling.

---

## 4. Dependency graph

```
BOV-T-1  (single task — no dependencies, nothing blocks it)
```

---

## 5. Test plan

| Test ID | Type | Covers | Location |
|---|---|---|---|
| `BOV-TEST-1` | unit (client) | `BOV-R-1`, `BOV-R-2`, `BOV-AC-1` | `onecgiar-pr-client/src/app/pages/bilateral/pages/bilateral-overview/bilateral-overview.aggregate.spec.ts` |
| `BOV-TEST-2` | unit (client) | `BOV-R-3`, `BOV-R-4`, `BOV-AC-2`, `BOV-AC-3` | `onecgiar-pr-client/src/app/pages/bilateral/pages/bilateral-overview/bilateral-overview.component.spec.ts` |
| `BOV-TEST-3` | manual browser check | `BOV-AC-4`, visual parity (accepted risk, no automated gate) | Real browser, per `onecgiar-pr-client/CLAUDE.md` §9 |

Client coverage MUST stay above 50/60/60/60 (unaffected by this change's size, but re-run `npm run test:changed` to confirm no regression in the touched folder).

---

## 6. Rollout & verification

- [ ] PR opened with the commit message convention (`✨ feat(bilateral-overview) [ticket]: <description>` — no apostrophes/`$`/quotes in the subject, per the Jenkins gotcha memory).
- [ ] CI green (lint, tests, build — no migration check needed, no SonarCloud-relevant server change).
- [ ] Manual QA on a real running client per `requirements.md`'s acceptance criteria (`BOV-AC-1..4`).
- [ ] Bilateral/platform-report — n/a, no downstream payload touched.
- [ ] No admin/role/phase change — n/a.
- [ ] Telemetry — n/a, nothing new logged.

---

## 7. Cleanup & follow-ups

- [ ] Move spec status to `shipped` once merged.
- [ ] If a future i18n pass touches "replicated"/"new" copy, do it in both `bilateral-overview` and `bilateral-projects-panel` together (`BOV-DD-5`, `design.md` §13).
- [ ] If a third pill/metric is proposed later for either screen, revisit `BOV-DD-2`/`BOV-DD-3` (dedicated function / shared component) before adding it inline again.
- [ ] `docs/prd.md` Open Questions — none of `OQ-1`/`OQ-2` are touched by this spec; no update needed.

---

## 8. Roll-back plan

1. Revert the single PR for `BOV-T-1`.
2. No migration to revert — client-only change.
3. No feature flag introduced — nothing to disable.
4. No bilateral/platform-report payload touched — nothing to compare back.
5. No downstream consumers to notify — this is a UI-only, no-API-contract change.
