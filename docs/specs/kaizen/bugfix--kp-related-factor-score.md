# Kaizen Entry — bugfix/kp-related-factor-score

## Document Control

| Field | Value |
|---|---|
| Spec Path | `bugfix/kp-related-factor-score` |
| Date | 2026-10-23 |
| Branch | qa-development-2026-ss (spec branch; default is `master`) |
| Archive Run | 1 |
| Approval Mode | gated |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 2 | tasks.md |
| Reviewer FAIL rework attempts | 0 (attempt 2 was Pivot scope, not a FAIL) | execution.md — KFS-T-1 |
| HALTs / FATAL_FAILs | 0 | execution.md |
| Pivots | 2 (DD-5 center alignment; stemming-residual criterion) | execution.md — ## Pivot Record: KFS-T-1, KFS-T-1 (2) |
| PRODUCT_BUGs | — (no test-report) | — |
| Validation FAIL / WARN | — (no validation-report; Reviewer PASS ×2, user acceptance) | execution.md |
| Budget | 2/2 tasks; ~289 LOC vs ~240 (incl. Pivot); 2 review rounds (budget 1–2) | design.md §11, execution.md — KFS-T-1 Final |
| Drift attributable | none recorded | docs/specs/audits/ |

## Lessons

- **KZ-bugfix--kp-related-factor-score-1 — The predecessor's acceptance passed on projects that happened to work, so a ranking bug shipped.** (Product + Methodology, Medium)
  - Root cause: KRS-T-4 checked ordering on P-1486 and iSPARK. Both already had a Strong in Solr's top 10, so the client's per-page sort looked correct. Nobody checked a project where the server ranking was known to fail: a long title with many keywords, and the position of the first Strong across pages. The user found T-PJ-003161 on PRTest after archive, with the first Strong at position 90.
  - Evidence: proposal.md §3 ("the projects chosen for acceptance testing hid this case"); archive `2026-10-23-changes--kp-related-strongest-first/execution.md` — KRS-T-4 rows 2 and 7.
  - Standardization: → P1

- **KZ-bugfix--kp-related-factor-score-2 — A strict Fails-if was written without the residuals the extended specs had already accepted.** (Product + Methodology, Medium)
  - Root cause: tasks.md T-1 required "non-increasing factor count on every host". The spec `Extends` KRR/KRS, which had already accepted that Solr stems subjects while the label folds only plurals (KRR §8, KRS design §10). Specify never checked the new invariant against those inherited residuals. The real probe failed 7 of 9 rows on exactly that residual, which forced Pivot 2.
  - Evidence: execution.md — Attempt 2 (Implementer) and ## Pivot Record: KFS-T-1 (2); archive KRS design.md:112.
  - Standardization: → P2

## Noted, not a lesson

- Pivot 1 (design §7 "label and order agree by construction" was false) has the same root cause as **KZ-changes--kp-related-relevance-ranking-2**: one fact computed in two places with different semantics. Recorded as a recurrence → P3.
- The placeholder smoke (invented inputs, labeled NOT EVIDENCE) is what exposed Pivot 1 early. Running the probe before the real inputs arrived paid off. Not a lesson, but worth keeping.
- LOC ~1.2× estimate, again driven by tests (ref. KZ-notifications--bell-read-state-1). Within tolerance, so no recurrence item.
- The Leader read "que sigue? puedes probar en local?" as approval of the Pivot 1 spec. The user did not object, but the approval was implicit. A gated spec should ask with a yes/no.

## Pending Items

### P1

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `docs/specs/general-setup/tasks.md` (acceptance / verification section) |
| Edit | "An ordering or ranking acceptance check includes at least one counter-example case, where the old behavior is known to fail. It measures the position of the best item across pages, not only the order within a page. Cases that already worked are regression checks, never the acceptance on their own." |
| Severity | Medium |
| Status | pending |
| Upstream | Recommend to the AKILI methodology repo (generic, nothing project-specific) |

### P2

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `docs/specs/general-setup/tasks.md` (Fails-if guidance) |
| Edit | "When a spec `Extends` earlier specs, every strict Fails-if invariant lists the accepted residuals inherited from them that could violate it, and states how the check treats them." |
| Severity | Medium |
| Status | pending |
| Upstream | Recommend to the AKILI methodology repo |

### P3

| Field | Value |
|---|---|
| Kind | digest-update |
| Target | `KZ-changes--kp-related-relevance-ranking-2` |
| Edit | Add source `bugfix/kp-related-factor-score` as a recurrence, and raise severity to High (it caused a Pivot). The tier label (`evaluateProjectMatch`) and the Solr score each decided "does the Center match" with different semantics (name equality vs a phrase match on a tokenized field), and design §7 asserted they agree "by construction". Generalize the lesson: when two components compute the same fact, either share one implementation or add a test or probe that ties them together. |
| Severity | High |
| Status | pending |
