# Kaizen Entry — quality-assurance/qa-value-labels

## Document Control

| Field | Value |
|---|---|
| Spec Path | `quality-assurance/qa-value-labels` |
| Date | 2026-11-10 |
| Branch | `JuanGuzman-io/p2-3910-qa-value-labels` (spec branch; the apply-capable branch is `staging`) |
| Archive Run | 1 |
| Approval Mode | gated |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 7 | tasks.md |
| Reviewer FAIL rework attempts | 3 (T-1 ×2, T-6 ×1) | execution.md: T-1 task record; T-6 attempt 1 |
| HALTs / FATAL_FAILs | 0 (T-1 blocked at pre-flight on VPN, then parked `[~]` waiting for the owner's prod run) | execution.md: Leader notes T-1 |
| Pivots | 0 formal. 2 owner amendments: the latency NFR became a statement-count proxy, and the P-20 pick rule changed | execution.md: Owner decisions 2026-11-09 |
| PRODUCT_BUGs | n/a (no `test-report.md`; absence accepted) | — |
| Judgment-day severe findings | not recorded | — |
| Validation FAIL / WARN | n/a (no `validation-report.md`; absence accepted) | — |
| Tasks closed under `REVIEW_WAIVED` | 0 | execution.md |
| Tasks closed under `REVIEW_SKIPPED` | 0 | execution.md |
| Escaped defects (§3) | 0 | execution.md: T-7 |

## Lessons

- **KZ-quality-assurance--qa-value-labels-1 — A doc edit spliced in at the first match of a non-unique anchor, and the check that followed read only the first matching block.** (Product + Methodology, Medium)
  - **Root cause:** `qa-catalog.en.md` has two near-identical property tables, one for `GET /api/qa/results` and one for `details`.
    - The Implementer located the details table by searching from the top of the file. The search hit the GET table, so the splice copied about 75 lines and left a second `### POST /api/qa/results/details` heading, with the old example (no `labels`) still under it.
    - `walk.py` checked only the first JSON block, so its green was blind to the contradiction. The Reviewer caught it by reading.
  - **Evidence:** execution.md, QVL-T-6, attempt 1 (Reviewer FAIL) and attempt 2 (cause and fix).
  - **Standardization:** → P1 (local) · P2 (upstream)

## Noted, not a lesson

- **T-1, Reviewer FAIL ×2 on evidence labelling.** An inferred `dup_rows 0` was written as observed. `COUNT(*)` queries were recorded as "no rows". Prod query labels lived only in the scratchpad. The Reviewer caught all three. Feeds the recurrence check on "inferred vs observed" evidence wording.
- **T-6 scope.** It originally reached into another repository (`onecgiar_qa` fixture), and the owner removed that at execute time. A spec that writes into a consumer's repo creates a cross-repo ownership question; below the lesson bar.
- **T-4.** The Implementer truncated a spec file mid-edit and restored it itself. The Reviewer confirmed it was intact. One occurrence.
- **Recurrence of an existing lesson.** A live check or measurement assumed the environment held qualifying data. T-1's latency baseline and T-7's nine-type check both met a prtest that held 0, then 1, eligible 2026 result → P3.

## Pending Items

### P1

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `.agents/implementer.md` |
| Edit | Append: "Before splicing into a document by anchor text, assert the anchor matches exactly once in the file. A doc verification asserts each edited heading appears once and walks every code block under it, not the first." |
| Severity | Medium |
| Status | pending |

### P2

| Field | Value |
|---|---|
| Kind | upstream |
| Target | methodology |
| Edit | Implementer persona: anchor-based edits must assert anchor uniqueness first; doc-edit verifications must assert edited-heading uniqueness and cover every block under the heading. |
| Severity | Medium |
| Status | pending |

### P3

| Field | Value |
|---|---|
| Kind | digest-update |
| Target | KZ-changes--portfolio-overview-revamp--toc-kpi-no-target-disclosure-1 |
| Edit | Add source `quality-assurance/qa-value-labels`, and raise severity Low → Medium. Recurrence: T-1's latency baseline and T-7's per-type live check both assumed prtest held eligible 2026 results. It held 0, then 1. That forced an NFR amendment and a known gap. |
| Severity | Medium |
| Status | pending |

### P4

| Field | Value |
|---|---|
| Kind | guide-sync |
| Target | root `CLAUDE.md`, "Domain-specific reference docs" table |
| Edit | Add the row: `onecgiar-pr-server/docs/qa-catalog.en.md` · **Authoritative contract** for `/api/qa/*` (catalog, results feed, details `labels`, intake/release). Every payload change MUST update its change log. |
| Severity | Low |
| Status | pending |
