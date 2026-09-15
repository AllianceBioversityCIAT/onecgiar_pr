# Requirements — Programme Results: default phase must not lock onto a data-free phase before rows load

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `bugfix/phase-filter-missing-phases-prod` |
| Type | Bug |
| Depth | **Lite** (single-component timing fix; root cause fully confirmed via code read + live prod repro, no design exploration needed) |
| Approval Mode | `gated` |
| Source | `proposal.md` (this folder) — root cause confirmed via code read + live prod fetch/repro, 2026-09-14 |

## 2. Executive Summary

`ProgrammeResultsComponent`'s `defaultPhase()` computes the Results tab's default phase filter by matching the globally active reporting phase against the programme's own `phaseOptions()` (derived from its loaded rows). On a cold load, `phaseOptions()` is still empty while the async `ProgrammeResultsService.load()` request is in flight, so `defaultPhase()` falls back to the *global* active phase name unconditionally. A same-tick effect writes that value into `selectedPhase` and mirrors it into the URL (`replaceUrl: true`). Once rows load and `phaseOptions()` correctly resolves to the programme's real phase(s), `defaultPhase()` recomputes correctly — but the "URL → filters" effect now reads the phase from the URL (no longer `null`) and the stale, data-free value wins over the corrected default forever, until the user manually clears filters or reselects. This spec makes the tab defer committing an auto-derived default until the programme's real phase data has settled, so a phase with zero rows for that programme can never get locked into the URL by default.

## 3. Glossary

| Term | Meaning |
|---|---|
| Global active phase | `DataControlService.reportingCurrentPhase` — the reporting cycle currently open platform-wide (e.g. "Reporting 2026") |
| `phaseOptions()` | `ProgrammeResultsService`'s derived list of phase labels that actually have rows for THIS programme (`programme-results.service.ts:356-363`) |
| Auto-derived default | A phase value `defaultPhase()` computes when no explicit `?phase=` URL param exists — as opposed to a user selection or deep link |
| Locked-in | The state where a wrong auto-derived value has already been mirrored into the URL and is now read back as an explicit param, permanently overriding any later, correct recomputation |

## 4. System Context & Scope

**In scope:**
- `onecgiar-pr-client/.../programme-results/programme-results.component.ts` — `defaultPhase()` (`:948-989`) and the "URL → filters" / "Filters → URL" effect pair (`:1072-1145`)

**Out of scope:** `phaseOptions()` derivation itself (confirmed correct — reflects real server data); `AllResultsByRoleUserAndInitiativeFiltered` / `result.repository.ts` (no server-side defect found for this bug, unlike the sibling `bugfix/portfolio-overview-partial-counts`); empty-state copy/UX improvements (proposal Option C, not pursued here).

## 5. Stakeholders / Personas

| Persona | Stake |
|---|---|
| Science Program lead/user | Opens their programme's Results tab and, whenever the programme hasn't yet reported in the newest open cycle, currently sees a misleading "0 results" instead of their real history — recoverable only by manually clearing filters, with no clue that's the fix |

## 6. Functional Requirements

### Requirement: An auto-derived default phase is only committed once the programme's real phase data has settled

The system SHALL NOT write an auto-derived (non-URL, non-deep-link) default phase value into `selectedPhase` / the URL while `ProgrammeResultsService`'s initial load for the programme is still in flight.

#### Scenario: Programme's real data lives in an older phase than the globally active one (the reported case)

- GIVEN a programme whose real historical rows exist only in a phase other than the currently active global phase (e.g. rows only in "Reporting 2025 - P25", global active phase is "Reporting 2026")
- AND the Results tab is opened with no `?phase=` query param
- WHEN the initial row load completes
- THEN the tab's phase filter settles on "Reporting 2025 - P25" and shows the programme's real rows
- BUT it must NOT show a "0 results" empty state as the resting state after load completes
- AND IT MUST NOT require the user to manually clear filters or reselect a phase to see their data

#### Scenario: An explicit `?phase=` URL param (deep link / Overview hand-off / back-navigation) is always respected immediately

- GIVEN the Results tab is opened with an explicit `?phase=<value>` query param already present
- WHEN the component initializes, regardless of whether the programme's row load has completed yet
- THEN that explicit value is applied to `selectedPhase` immediately, with no added delay
- BUT it must NOT wait for `phaseOptions()` to settle before honoring an explicit URL/deep-link value — only the *auto-derived* path (no URL param) is deferred

#### Scenario: A programme with genuinely zero results in any phase is unaffected

- GIVEN a programme that has zero reported results in every phase
- WHEN the Results tab is opened with no `?phase=` query param and the initial load completes (empty)
- THEN the resolved default phase label is unchanged from today's behavior (the global active phase name, as a placeholder)
- AND the existing "nothing reported yet" empty state (`isNothingYet`) is shown, not a different or newly-broken message
- BUT it must NOT be confused with, or rendered identically to, the "filtered to an empty result" state from the first scenario

### Requirement: A previously-committed auto-derived default can never permanently out-rank a later, correct one

The system SHALL ensure that once `defaultPhase()` recomputes to a value grounded in the programme's real `phaseOptions()`, that value is what the user sees — an earlier, ungrounded auto-derived value must never have already been written where it would out-rank the correction.

#### Scenario: Repeated cold loads never regress into the lock

- GIVEN the exact timing conditions of the reported bug (row load resolves asynchronously, after the component's first reactive tick)
- WHEN the Results tab is loaded repeatedly (simulating real navigation, not just one test run)
- THEN the final settled `selectedPhase` / URL value always matches `defaultPhase()`'s value once `phaseOptions()` is populated
- BUT it must NOT depend on load timing (fast vs. slow network) to arrive at the correct value

## 7. Non-Functional Requirements

| Attribute | Requirement |
|---|---|
| No added latency for explicit navigation | Deep links / Overview hand-off / back-navigation with an explicit `?phase=` param must resolve exactly as fast as today — the deferral applies only to the auto-derived (no-param) path |
| No regression to the "nothing reported yet" state | The fix must not blur `isNothingYet` with the newly-fixed "real data in a different phase" case — they are different states with different correct outcomes |
| Testable under real async timing | The regression test must simulate the row-load response resolving *after* the component's first tick (not synchronously via `of(...)`, which is what every existing spec in this file uses today and is exactly why this race was never caught) |

## 8. Defect Classes And Verification Mapping

| Defect class | Catching mechanism |
|---|---|
| Auto-derived default (from empty `phaseOptions()`) gets written into `selectedPhase`/URL and locks out the later-correct value | Component test that delays the mocked row-load response (e.g. a `Subject`/deferred `Observable` flushed after the first `fixture.detectChanges()`), asserting the FINAL settled `selectedPhase()` matches the real `phaseOptions()`-derived default, not the phantom global-phase value (automated) |
| An explicit `?phase=` URL param is delayed or ignored by the new deferral logic | Component test asserting an explicit URL param is applied on the very first tick, before the deferred row-load response even resolves (automated) |
| Genuinely-empty programme's `isNothingYet` state regresses | Component test with an empty mocked response, asserting the existing empty-state view flag is unchanged (automated) |
| Real prod-scale confirmation that the fix resolves the originally observed symptom (SP08 landing on "Reporting 2026" with 0 results) | No automated check reaches real prod data. Accepted as a required manual verification step: re-open `result-framework-reporting/entity-details/SP08/results` in prod with no `?phase=` param after deploy and confirm it settles on "Reporting 2025 - P25" with 462 results — same method used to confirm the root cause in `proposal.md` |

## 9. Requirement ID Index

| ID | Requirement | Scenario(s) |
|---|---|---|
| REQ-1 | Auto-derived default only commits once phase data has settled | REQ-1-S1 (real case: older phase has the data), REQ-1-S2 (explicit URL param unaffected), REQ-1-S3 (genuinely-empty programme unaffected) |
| REQ-2 | A stale auto-derived default can never out-rank the later correct one | REQ-2-S1 (timing-independent correctness) |
