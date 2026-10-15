# Judgment Day — design.md (remove-rankings-status-copy)

| Field | Value |
|---|---|
| Target | `design.md` (draft, 2026-10-14) against `requirements.md` |
| Mode | judgment_day: 2 blind read-only judges (Sonnet; author was Opus) |
| Round | 1 (pre-fix) |
| Counts | 2 confirmed severe (contested severity) · 9 confirmed warning/suggestion · 1 suspect · 0 contradictions |
| State | **approved** — round-1 fix applied (user: "sí ve con las recomendaciones"); scoped re-judgment: 0 critical |

## Confirmed — severe (both judges report it; one judge rates it CRITICAL)

| ID | Finding | Evidence | Judges |
|---|---|---|---|
| JD-1 | Slice A does not list `services/portfolio-overview.service.spec.ts`. It references `programRankingRows` at `:114`, at `:254-289` (describe) and at `:420/:427` (perf test, `length 13`), so it would fail to compile. The file also carries uncommitted edits from family #2. | service.spec.ts lines cited | A:CRIT · B:WARN |
| JD-2 | The §8.1 spec instructions are wrong. Line 240 is not a section-order assertion. The real breakage is: `charts.length` 3→2 plus the titles array (`:268-285`), the old title/subtitle asserts (`:208-213`, `:277`), the analysis-mode/ranking tests (`:287-318`), `onRankingChartClick` (`:664-666`) and the caption at `charts.spec:171`. | component.spec.ts, charts.spec.ts | A:WARN · B:CRIT |

## Confirmed — warning / suggestion (info unless the user opts in)

| ID | Finding |
|---|---|
| JD-3 | §2 claim is false: A and C share 5 files (html, component.ts/spec, charts.ts/spec), not only the html. Order A → C. |
| JD-4 | Dead code that PRC-N1 says must go: `rankRows` (centers charts `:119`); the `seriesId` branch of `statusIdFromChartEvent` and spec `:91-92`; stale "ranking" comments (centers html `:3`, component `:57`, charts `:14`). |
| JD-5 | `PROGRAM_AXIS_LABEL_MAX_CHARS`: the `horizontal`/`vertical`/`heatmap` keys go dead; keep `matrix` and point the spec at `:38` to `matrix`. Keep `truncatedProgramAxisLabelConfig`. |
| JD-6 | `hlmTooltip`: the Jest `BrnTooltip` mock declares no inputs, so the host-directive input aliases risk NG0311/NG0303 (`tests/mocks/spartanBrainMock.ts:141`). There is a precedent stub in `pop-up-notification-item.component.spec.ts:21-24`. Use `[tooltipDisabled]="!hint"`. The design also needs to import `HlmTooltip` and register `lucideExternalLink` in `provideIcons`. |
| JD-7 | i18n: the new strings are hardcoded (template plus a component map), against client CLAUDE.md §5/§10. A copy file is needed, or an explicit waiver. |
| JD-8 | Orphans. PRC-4 does not specify the link text, its placement, or how the "URL set" spec works (a module `const` cannot be flipped, so expose a component field and type it as `string`). PRC-3 has no spec asserting that the donut total equals the KPI total. |
| JD-9 | Budget understated: the real figure is about −900…−1000 / +50, not −450. |
| JD-10 | Ordering contradiction. The design says to run after #2 is committed, but `family.md` says #2 depends on #1. #2's uncommitted edits also touch `component.html/ts/spec` and `spartanBrainMock.ts`. "C1"/"T2" are undefined ids. |
| JD-11 | PRC-2 "highlight in Progress by Center" only holds for the table view; the chart view (`buildShareOption`) ignores `selectedStatus`. Say which behaviour satisfies the clause. |

## Suspect (one judge only — not auto-fixed)

| ID | Finding | Judge |
|---|---|---|
| JD-S1 | The detail-chart spec must call `detailMode.set('chart')` first (the default is `table`). | B |

## Verified true by both judges

- `rankingTable`/`rankingHeight` feed the Progress by Center chart.
- The height formula equals the horizontal default.
- The ranking copy keys are used only by the ranking card.
- `statusIdFromChartEvent` is still used by the donut.
- The five `programRanking*` computeds exist.
- The matrix rows link to Results Center.
- The caption is at `charts.ts:219`.
- `clarisa-links.constants.ts` and `spartan/tooltip` exist.
- No Cypress references.

## Round 1 fix + scoped re-judgment

| Item | Result |
|---|---|
| Fix | `design.md` rev 2 (JD-1..JD-11, JD-S1); `requirements.md` PRC-N3; `family.md` reordered (kpi-breakdown #1) |
| Re-judge A / B | JD-1..8, 10, 11, S1 RESOLVED by both · JD-9 PARTIAL by both (the +90 LOC estimate was low) · 0 critical |
| New from re-judgment (both) | NEW-1: the caption builder signature was not named |
| New (one judge) | NEW-2: the pop-up spec stubs the tooltip; NEW-3: two viz charts in the block; PRC-2 wording; unused spec imports; requirements status |
| Applied (rev 2.1) | Budget +170 / tripwire 220; `portfolioStatusDonutTable(segments, caption)`; the detail-chart selector; pop-up claim corrected; PRC-2 scoped to the table view; spec import cleanup; requirements status set to approved |

JUDGMENT: APPROVED ✅
