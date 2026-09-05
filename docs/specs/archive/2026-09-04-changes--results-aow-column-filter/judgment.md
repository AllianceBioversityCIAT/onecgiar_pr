# Judgment-day ledger — `changes/results-aow-column-filter`

| Field | Value |
|---|---|
| Target | `requirements.md`, `design.md`, `tasks.md`, `proposal.md` (frozen 2026-09-04) |
| Mode | judgment_day — **inline fallback** |
| Judges | requested: 2 × `Explore` on `sonnet` (blind, read-only); spawn 1 and 2 failed (`Failed to create teammate pane: Timed out waiting for the Orca runtime to respond`), retries failed identically. Per `/akili-specify` *Delegation During an Interactive Phase* rule 2 the review degraded to inline (author-read, single pass). Third spec in a row with this harness fault — recorded for kaizen |
| Rounds | 1 (fixes applied, no re-judge — standing feedback 2026-09-02) |

## Findings

| ID | Severity | Document §section | Finding | Evidence | Fix applied |
|---|---|---|---|---|---|
| JI-1 | SEVERE | requirements §7 `RAC-R-5`, §9 `RAC-AC-7`; design §5; tasks T-5 | Reconciliation compared two different populations: the Overview total joins `results_by_inititiative` with **no** `initiative_role_id` filter, the Results list is **owner-only** (`initiative_role_id = 1`). Contributor-only results would make the equality false by construction | `results-framework-reporting.service.ts:1080-1095`; `result.repository.ts:379-381`; `programme-results.service.ts:246-248` (`submitter_id`) | `RAC-R-5` scoped to the owner population under W1/W2; A-5 added; `RAC-DD-6` added; T-5 must list contributor-only ids as a delta (follow-up), not a FAIL |
| JI-2 | WARNING | tasks T-1 *Input that fails* | "must be rejected by the mapper test as a fixture error" — a mapper cannot reject input; the falsifying assertion was unstated | — | reworded: the test asserts `key === codes[0]`, so an inconsistent fixture fails it |
| JI-3 | WARNING | tasks T-4 *Depends on*, §4 graph, answer-first | T-4 declared parallel-safe with T-3, but it uses `PROGRAMME_RESULTS_QUERY_PARAM_MAP.section`, which T-3 introduces in `programme-results-query-params.ts` | design §6.1/§6.2 (T-3 owns the param; T-4's `onOverviewLink` maps through the same map) | T-4 depends on T-3; graph strictly serial |
| JI-4 | INFO | design §1 | line citations `service.ts:1027-1075` for the CTE | verified present | none |

Verified true during the pass: `MIN(UPPER(wp.acronym))` tie-break, `INTERMEDIATE` / `EOI_2030` derivation, W1/W2 source filter, `results_by_inititiative` total query; `ResultsFrameworkReportingModule` imports `ResultsModule` (`module.ts:15,51`) — the cycle claim behind `RAC-DD-1`; OSF-T-3 fixtures are grouped rows (`spec.ts:537-540`) so `RAC-DD-2`'s "fixture shape moves, values do not" is accurate; the Results list request is `submitter_id` + `limit` only (no version) so A-1's per-phase bucket fetch is required; `OVERVIEW_SCOPE_FIXED_LABEL` keys `INTERMEDIATE`/`EOI_2030`/`UNTAGGED` (`dashboard-lab.component.ts:171-175`) match the vocabulary of `RAC-DD-3`; `overviewScope` is the host signal (`dashboard-lab.component.html:1421`).

Not verifiable without live data (owned by T-5): the size of the contributor-only delta per program; `results-scope` latency.

Totals: SEVERE 1 · WARNING 2 · INFO 1. Contradictions between judges: n/a (single reader).

**JUDGMENT: APPROVED ✅** (inline fallback — see Mode)
