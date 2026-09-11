# Judgment Day — `changes/reporting-entry-hub` (spec review)

| Field | Value |
|---|---|
| Target | `requirements.md` + `design.md` + `tasks.md` (immutable snapshot 2026-08-28, pre-fix) |
| Mode | judgment_day, **one round, fix-only** (owner mandate — no scoped re-judgment) |
| Judges | A, B — `opus` (author was `claude-fable-5`; author ≠ auditor), read-only, identical scope |
| Round | 1 of 1 |
| Result | **JUDGMENT: APPROVED ✅ (after fix round 1; re-judgment waived by owner)** |

## Counts

| | Judge A | Judge B | Confirmed by both (severe) | Suspect (one judge, severe) | INFO (warning/suggestion) |
|---|---|---|---|---|---|
| SEVERE | 6 | 7 | **3** (+1 overlapping class) | 4 | — |
| WARNING | 9 | 14 | — | — | 23 (9 shared) |
| SUGGESTION | 4 | 5 | — | — | 9 |

## Frozen ledger

### Confirmed severe (both judges) → fixed

| ID | A | B | Finding | Fix applied |
|---|---|---|---|---|
| C-1 | A-01 | JB-01 | `dashboard-lab.component.spec.ts:412-423` asserts the old `onOpenAow` URL; design claimed no spec references it | REH-DD-3 corrected; `dashboard-lab.component.spec.ts` added to REH-T-4 files + DoD (update the assertion). |
| C-2 | A-03 (+A-04) | JB-04 | `fragment:` navigation has no infrastructure; table renders no ids; `aows` top-level cards start collapsed | REH-R-2.3 / REH-AC-2 / design §2.3 §6.2 / REH-T-4(e): program-level Report navigates to `?tocView=aows` only; scroll/expand clause dropped and recorded as accepted gap (design §13). |
| C-3 | A-05 | JB-06 | `allocation` is `decimal(5,2)` → `string \| null`; lexical sort wrong | DTO: `allocation` = `Number(mapping.allocation)`; REH-TEST-1(c) fixture uses string allocations where lexical ≠ numeric (`'100'`, `'40'`, `'9'`). |
| C-4 | A-02 | JB-05 | Same class: `onOpenAow` has other callers (xcut rows emit `'xcut'`/outcome codes; ToC map click; the AoW row click itself) — fixing it re-routes them | `onOpenAow(code)` routes by code: AoW code present in `aows()` → `byAow`+`tocAow`; anything else → `tocView=aows`. Test case added. REH-R-8 reworded: the button emits the same `openAow` output as the row (no "row stays as is" claim). |

### Suspect severe (one judge) → verified by the orchestrator and fixed (cheap, factual)

| ID | Judge | Finding | Fix applied |
|---|---|---|---|
| S-1 | JB-02 | `ResultsApiService.apiBaseUrl` member already ends in `api/results/` | Design §6.2 names `environment.apiBaseUrl` + `api/results-framework-reporting/...` like the sibling calls. |
| S-2 | JB-03 | `npx eslint <path>` fails on the client (flat-config missing) | Client lint gate → `npx ng lint --quiet` (root CLAUDE.md pin) in T-3/T-4/T-5. |
| S-3 | A-06 (+JB-13) | No `phase` query param exists on the Overview URL; `onOpenAow` has no `queryParamsHandling` | Phase-preservation clauses removed from REH-R-2.2 / REH-AC-2 / REH-T-4; no `merge` added. |
| S-4 | JB-07 | `RolesService.getMyCenters()` is not reactive; skipping the request on empty can lock `no-centers` on cold load | Always issue the request; `no-centers` derives from `centers: []`. REH-T-4(c) rewritten. |

### INFO applied in the same pass (one-line edits that would otherwise mislead the Implementer)

A-07/JB-12 module wiring (`ClarisaInitiative`, `YearRepository` already provided) · A-08/JB-08 real computeds `overviewAowProgress()` / `overviewXcutProgress()` + duplicate `AowProgressRow` warning · A-09/JB-09 xcut rows filtered on `total > 0` → REH-R-2.1 conditional + code→kind mapping · A-10 filter named identically (`role_level_name === 'Center'`) · A-11/JB-20 legacy-fallback shape → service test case · A-12/JB-14 icons: hub declares its own `provideIcons`, jest mock note · A-13/JB-18 trim explicitly harmless (creator renders fullName/shortName/leadCenter) · A-14/JB-16 T-5 depends on T-4 · A-15/JB-23 `shortName` is the code · A-18/JB-21 no `center.code` fallback (route to center home when acronym missing) · JB-10 `error?: boolean` in DTO · JB-11 `activeYear` from server `YearRepository` only · JB-15 T-5(b) single-emission assertion only · JB-17 mockup header `2 centers` · JB-19 counter = matches / total matching · JB-22 query param `programId` (sibling convention) · JB-24 400 owned by the service · A-16 one budget number (700 gates only the SHOULD task, stated) · A-17 payload budget 200 KB · A-19 icon-family deviation recorded in requirements NFR · JB-25 heading renamed · JB-26 sample center code `CENTER-03`.

### Not applied (recorded)

- A-04 alone (expand groups on `aows`): resolved by C-2's decision (no expansion promised).
- Template heading drift noted by A (§4.1 / §2.2 titles): cosmetic, kept.

## Correction work units

1 fix pass (orchestrator, inline) over `requirements.md`, `design.md`, `tasks.md`, `mockup/Main.dc.html`. Forward/backward sweep: `fragment`, `phase query`, `aowProgress()`, `ClarisaInitiativesEntity`, `programCode` query, `eslint src/app`, `center.code` fallback, `3 centers`.

## Terminal state

Scoped re-judgment: **waived by owner** ("pasalo por el judgment day una sola vez y haces el fix sin re judgment"). Independent final verification: orchestrator grep sweep (see above) — zero residual hits.

**JUDGMENT: APPROVED ✅**
