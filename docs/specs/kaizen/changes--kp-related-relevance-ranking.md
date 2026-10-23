# Kaizen Entry — changes/kp-related-relevance-ranking

## Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/kp-related-relevance-ranking` |
| Date | 2026-10-22 |
| Branch | qa-development-2026-ss (spec branch, since `Default Branch: master`. Every shared-file write below is recorded, not applied) |
| Archive Run | 1 |
| Approval Mode | gated |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 6 of 6 (5 planned + T-6 added after T-5) | tasks.md, execution.md |
| Reviewer FAIL rework attempts | 2 (T-2 attempts 1 and 2, same root cause) | execution.md KRR-T-2 |
| HALTs / FATAL_FAILs / Pivots | 0 / 0 / 0 (one budget tripwire on T-2, acknowledged by the user) | execution.md KRR-T-2 |
| Scope changes | 2 user-approved (T-4 Proxy tooltip; T-6 keyword quality) | execution.md "Scope change" blocks |
| PRODUCT_BUGs | n/a (no `/akili-test`; absence accepted) | — |
| Validation FAIL / WARN | n/a (no `/akili-validate`; absence accepted). PRTest acceptance passed twice | execution.md KRR-T-5 |
| Budget | 6 tasks vs 5; T-2 3 rounds vs 1–2; ~2,590 inserted lines vs ~650 planned (≈ 4×; prod ≈ 900) | tasks.md §1, git stats of 65ae4c2c4 / 00a86f0f4 / a20e06725 |
| Waste (MUDA) | A second deploy and PRTest round for T-6. Two T-2 rework rounds | execution.md |

## Lessons

- **KZ-changes--kp-related-relevance-ranking-1 — A heuristic over free-text catalog data was designed and tested on invented inputs; the first real record broke it.** (Product + Methodology, Medium)
  - Root cause: T-1 specified `extractRelevanceKeywords` (first 8 title + first 8 description words) with hand-written vectors only. Nobody pulled the INC's own project record (P-1486-GCDT) during specify. Its title embeds the project code (`1486`, `gcdt`) and its description opens with funding boilerplate, so the cap dropped `genebank` and `potato`. Found only on PRTest in T-5, which cost a new task (T-6), a second deploy and a second PRTest round.
  - Evidence: tasks.md KRR-T-1 Tests (invented vectors); execution.md KRR-T-5 "New finding (OI-5)"; tasks.md KRR-T-6 "Why".
  - Related: `KZ-changes--bilateral-review-center-strip-and-phase-1` (real wire values in fixtures) — that one is about FAIL fixtures; this one is about designing the heuristic itself.
  - Standardization: → P1 (local) + upstream recommendation (heuristics over real text need real samples at specify).

- **KZ-changes--kp-related-relevance-ranking-2 — A response flag describing what the server did was computed in a second place from the code that did it.** (Product + Methodology, Medium)
  - Root cause: design §5 / §7.2 asked for the `ranked` echo and the relevance block as two outputs. `resolveProjectScope` decided `ranked` with its own inputs, while `translateParams` decided per adapter whether the block fit. Two Reviewer rounds found two different disagreements (block dropped but `ranked: true`; hosts that fit sent boosted while `ranked: false`). Attempt 3 fixed it by making one gate drive both.
  - Evidence: execution.md KRR-T-2 attempts 1 and 2 (Reviewer FAIL verbatim), attempt 3 "One gate".
  - Standardization: → P2

## Noted, not a lesson

- **Live calibration worked well:** the T-2 weight sweep on 3 hosts (1 → 0.001) found that the design's starting weights (^0.3) were wrong, and that Solr rejects exponent-printed weights (< 0.0001). Keep "calibrate live, record the sweep" for any boost/score spec.
- **Recurrence:** `npm run test:local` again exited 1 silently on Windows (T-4). Already queued as a standardization in `kaizen/changes--kp-project-strict-filter.md`; third sighting — raise it when that item is applied.
- Free RAM under 4 GB during T-4; `--maxWorkers=1` worked (machine rule 1).
- A transient CGSpace timeout (8 s) showed "CGSpace unavailable" on the first PRTest load; retry recovered it.
- KRR-NFR-2 had to be adjudicated mid-task (KPSF prefix can exceed 2000 alone). An NFR that bounds a shared string should name which part it owns.

## Pending Items

### P1

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `docs/specs/general-setup/design.md` (testing / data section) |
| Edit | "A heuristic over free-text or catalog data (keyword extraction, matching, scoring) is designed against at least two real records pulled during specify (the ticket's own case first), quoted in design.md. Invented vectors are added on top, never instead." |
| Severity | Medium |
| Status | pending |
| Upstream | Recommend the same rule to the AKILI `general-setup/design.md` template |

### P2

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `docs/specs/general-setup/design.md` (API contract section) |
| Edit | "A response field that reports what the server did to the request (e.g. `ranked`, `truncated`, `filtered`) is returned by the same function that builds the request, never recomputed elsewhere. Add a test that ties the field to the emitted params." |
| Severity | Medium |
| Status | pending |
| Upstream | Generic rule; recommend for the AKILI design template |

### P3

| Field | Value |
|---|---|
| Kind | digest-update |
| Target | `KZ-results--program-full-names-labels-1` |
| Edit | Add source `changes/kp-related-relevance-ranking` as a recurrence. tasks.md KRR-T-4 again prescribed `npx eslint <touched files> --quiet` for the client, which has no flat config; the Implementer switched to `npx ng lint --quiet --lint-file-patterns <files>`. Merge with the other recurrences at apply time. |
| Severity | High |
| Status | pending |

### P4

| Field | Value |
|---|---|
| Kind | digest-update |
| Target | `KZ-notifications--bell-read-state-1` |
| Edit | Add source `changes/kp-related-relevance-ranking`. The tripwire fired for review rounds (T-2) but not for LOC: ~2,590 inserted lines against ~650 planned (≈ 4×, mostly tests and `repositories.config` worst-case matrices) were never flagged. |
| Severity | Medium |
| Status | pending |

No `guide-sync` item: `execution.md` has no Constitution Impact block, and `cgspace-discovery/` and `kp-cgspace-browse/` have no folder guide. No `factual-sweep` item: no root-guide claim was falsified. No `trd-adr` item: the non-filtering boost (KRR-DD-1) extends TRD W9 and overturns no recorded ADR.
