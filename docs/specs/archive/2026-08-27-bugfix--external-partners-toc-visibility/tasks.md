# Tasks — "Other(s) External Partners" shown by default

## 1. Scope of this task list

- **Module / feature:** `bugfix/external-partners-toc-visibility`
- **Linked spec:** `docs/specs/bugfix/external-partners-toc-visibility/requirements.md` + `design.md`
- **Sprint / target phase:** n/a
- **Owner / driver:** Current user (santiago.sanchez@cgiar.org)
- **Status:** not-started

## 2. Pre-flight checklist

- [x] `requirements.md` is approved.
- [x] `design.md` is approved.
- [x] Open questions in `requirements.md` (`EPT-OQ-1`) and `design.md` are resolved (`design.md` §13 — label = `"External partners"`).
- [x] No conflicting in-flight spec touching the same file (`other-fields-toc-visibility` touches Centers/Science in a different component, not `normal-selector`).
- [ ] N/A — no migration.

## 3. Task list

### `EPT-T-1` — Conditionally label the empty-ToC External Partners dropdown, with regression test `[x]`

- **Type:** `client`, `tests`
- **Description:** In `normal-selector.component.html`, change the static `label="Other(s) External Partners"` on the auto-activated `app-pr-multi-select` (line 136) and the static `appFeedbackValidation [labelText]="'Other(s) External Partners'"` wrapper (line 133) to conditional bindings: `hasReferencePartners() ? 'Other(s) External Partners' : 'External partners'`. Add `data-testid="toc-other-partners"` on the `app-pr-multi-select`. No `.ts` change (`hasReferencePartners()` and `showOtherPartners` already exist and are unchanged). Add a Jest regression test in `cpnormal-selector.component.spec.ts` proving the empty-ToC case no longer shows "Other(s) External Partners" and the opt-in case still does.
- **Implements:** `EPT-R-1`, `EPT-R-2`, `EPT-R-3`, `EPT-R-4`, `EPT-R-10`, `EPT-AC-1`, `EPT-AC-2`
- **Files (expected):**
  - `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-contributors-and-partners/components/multiple-wps/components/normal-selector/normal-selector.component.html`
  - `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-contributors-and-partners/components/multiple-wps/components/normal-selector/cpnormal-selector.component.spec.ts`
- **Depends on:** —
- **Blocks:** —
- **Estimate:** `S`
- **Design ref:** `design.md` §6.2 (table), `EPT-DD-1`
- **Bug Mode — regression test (mandatory):**
  - `EPT-TEST-1a` (`EPT-R-1`/`EPT-AC-1`): render the component with an empty `referenceExternalPartners()` (ToC returns zero external partners) and `no_applicable_partner` falsy. Assert `[data-testid="toc-other-partners"]` is present in the DOM and its resolved label text (the `app-pr-multi-select`'s internal `.pr_label`, or an equivalent text query — **not** a `[label="…"]` attribute selector, since a bound `label` does not reflect as a DOM attribute) equals `"External partners"`, and does **not** equal or contain `"Other(s) External Partners"`.
  - `EPT-TEST-1b` (`EPT-R-4`/`EPT-AC-2`, regression guard): render the component with a non-empty `referenceExternalPartners()` and the "Other" sentinel selected (`otherSentinelSelected` true). Assert `[data-testid="toc-other-partners"]`'s resolved label text equals `"Other(s) External Partners"` — unchanged.
  - **Verification is RED→GREEN, not just GREEN:** run both assertions against the pre-fix checkout (static label) first and confirm they fail (`EPT-TEST-1a` would find the static "Other(s) External Partners" text; `EPT-TEST-1a`/`1b` may also fail purely because `data-testid="toc-other-partners"` doesn't exist yet — either failure mode is acceptable proof the test is live), then confirm both pass after the binding change lands. Record this in the PR description.
  - **What this does NOT prove (accepted gap, per `design.md` §10):** no Cypress spec exists for this component's External Partners block today; this task does not add one. DOM-level rendering in a real browser is not covered beyond Jest's jsdom render — acceptable for a Lite label-only fix per the design's stated gap, not silently assumed covered.
- **Definition of done:**
  - [x] Code merged via the project commit convention (`🔧 fix(normal-selector): <description>` per root `CLAUDE.md`).
  - [x] Lint (`npm run lint` in `onecgiar-pr-client/`) clean.
  - [x] `EPT-TEST-1a` and `EPT-TEST-1b` added, verified RED against the pre-fix checkout, GREEN after the fix.
  - [x] Full existing `cpnormal-selector.component.spec.ts` suite still passes (no regression to the P2-3335 or partner-role-group DOM tests).
  - [x] No secret or token leaked in logs or messages (`.cursorrules`) — n/a surface, confirmed by inspection.
  - [x] No API surface changed — no Swagger/DTO update needed.
  - [x] No i18n key needed — label stays an inline literal, matching the existing (non-i18n-wrapped) labels already used by this component (`requirements.md` NFR row).
  - [x] No bilateral / platform-report change — no change-log entry needed.
  - [ ] Manual/browser spot-check (per `onecgiar-pr-client/CLAUDE.md` §9 real-browser verification traps): open a 2026-phase result whose ToC has zero external partners, confirm the dropdown reads "External partners" not "Other(s) External Partners"; then a result whose ToC has 1+ external partners, select "Other", confirm the second dropdown still reads "Other(s) External Partners". **Deferred to `tasks.md` §6 Rollout & verification (human/staging QA step) — see `execution.md` `EPT-T-1` Leader disposition.**

## 4. Dependency graph

```
EPT-T-1  (single task — no dependencies)
```

## 5. Test plan

| Test ID | Type | Covers | Location |
|---|---|---|---|
| `EPT-TEST-1a` | unit (client, Jest) | `EPT-R-1`, `EPT-R-2`, `EPT-R-3`, `EPT-AC-1` | `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-contributors-and-partners/components/multiple-wps/components/normal-selector/cpnormal-selector.component.spec.ts` |
| `EPT-TEST-1b` | unit (client, Jest) | `EPT-R-4`, `EPT-AC-2` | same file |

`rd-contributors-and-partners` (parent folder) is excluded from Jest `collectCoverageFrom` (its own `CLAUDE.md`) — these tests must exist and pass, but won't move the coverage percentage. Don't rely on the global threshold to prove this is covered.

## 6. Rollout & verification

- [ ] PR opened with the commit message convention (`🔧 fix(normal-selector) [ticket]: <description>` — no ticket number linked; omit if none).
- [ ] CI green (lint, tests, build).
- [ ] Manual QA on staging/test env: both empty-ToC and opt-in External Partners states, per the DoD manual spot-check above.
- [ ] No bilateral / platform-report change — no downstream notification needed.
- [ ] No admin/role/phase change — no runbook update needed.
- [ ] Telemetry: n/a (no new logs).

## 7. Cleanup & follow-ups

- [ ] Move spec status to `shipped`.
- [ ] No new cross-cutting decision to promote — `EPT-DD-1` reuses the sibling spec's already-promoted mechanism (`OTV-DD-1`), no duplicate promotion needed.
- [ ] Follow-up noted in `design.md` §13: this component as a future fourth consumer of a shared "ToC-split + Other(s)" section component, if that consolidation is ever pursued — not filed as a separate ticket, just recorded.
- [ ] No `docs/prd.md` Open Questions resolved by this spec.

## 8. Roll-back plan

1. Revert the PR.
2. No migration to revert (client-only, no schema change).
3. No feature flag to disable.
4. No bilateral/platform-report payload affected — nothing to verify downstream.
5. No downstream consumer to notify.

## Required cross-references

- `docs/specs/bugfix/external-partners-toc-visibility/requirements.md` and `design.md` (same folder).
- `docs/prd.md`, `docs/ux-ui/design.md`, `docs/trd/trd.md`.
- `docs/specs/bugfix/other-fields-toc-visibility/` — structural precedent for the fix mechanism and its test-selector finding (`RB-S1`).
