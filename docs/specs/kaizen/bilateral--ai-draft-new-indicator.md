# Kaizen Entry — bilateral/ai-draft-new-indicator

## Document Control

| Field | Value |
|---|---|
| Spec Path | `bilateral/ai-draft-new-indicator` |
| Date | 2026-10-27 |
| Branch | qa-development-2026-mc-2 (spec branch — not apply-capable; apply on `staging`) |
| Archive Run | 1 |
| Approval Mode | gated |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 2 | tasks.md |
| Reviewer FAIL rework attempts | 0 | execution.md |
| HALTs / FATAL_FAILs | 0 | execution.md |
| Pivots | 0 | execution.md |
| PRODUCT_BUGs | 0 | test-report.md |
| Judgment-day severe findings | 1 (JD-1 CRITICAL, fixed in round 1) | judgment.md |
| Validation FAIL / WARN | 0 / 2 (both fixed at validate) | validation-report.md |
| Tasks closed under `REVIEW_WAIVED` (by flag) | 0 | execution.md |
| Tasks closed under `REVIEW_SKIPPED` (by task) | 0 | execution.md |
| Escaped defects (§3) | 0 | test-report.md / validation-report.md |
| Budget | 2/2 tasks · 2/3 review rounds · **LOC ≈480 vs ~290 (tripwire fired, user accepted)**; production ≈92 vs ~80, tests ≈364 vs ~190 | execution.md — Budget Tripwire: ADN-T-2 |

## Lessons

- **KZ-bilateral--ai-draft-new-indicator-1 — A visual change to an existing element was designed without inventorying that element's current styles and their cascade layer.** (Product, Medium)
  - Root cause: revision 1 of `design.md` (`ADN-DD-4`) put a violet left accent on the session card. It did not check that every own-job card already carries `.mdr-session-card--me` (a green 4px `border-left`) in **unlayered** component SCSS, which beats Tailwind's `@layer utilities` (`styles.scss:5`). So the accent could never render. Nothing in the client guides names this cascade trap, and the Premise Ledger had no row for the target element's existing styling.
  - Evidence: judgment.md — JD-1 (CRITICAL, both judges), fixed by the new P-9 and the badge-only DD-4; design.md §1A P-9 "refuted the revision-1 accent".
  - Standardization: → P1

## Noted, not a lesson

- Round-1 judge premise JD-7 ("`xl` fires near 960 px with a 12 px root") was itself wrong. Media-query `rem` uses the 16 px initial value, so `xl` = 1280 px (P-14, RB-3). A judge's suspect finding needs the same at-source check as an author premise. First occurrence; watch for a second.
- The author's no-write test (service test 11) filtered only `POST_`/`DELETE_`; `/akili-test` replaced it with an any-verb Proxy. A mutation probe showed the narrow filter missed a `PATCH_` injection. Below the lesson bar; it feeds recurrence for "negative gates should enumerate the full surface".
- The accessible name depended on flex blockification for a word separator ("New" + `sr-only` suffix). The Reviewer flagged it as advisory, and validation fixed it with an explicit leading space. Low friction.

## Pending Items

### P1

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `onecgiar-pr-client/src/CLAUDE.md` (styling / Tailwind section) |
| Edit | Trap: component SCSS is **unlayered** and beats every Tailwind utility (`styles.scss` declares `@layer theme, base, components, utilities`). Before a spec styles an existing element with utilities, its Premise Ledger must list that element's current SCSS rules (e.g. `.mdr-session-card--me` border-left). |
| Severity | Medium |
| Status | pending |

### P2

| Field | Value |
|---|---|
| Kind | digest-update |
| Target | `KZ-REH-1` (LOC budgets under-count) |
| Edit | Add source spec `bilateral/ai-draft-new-indicator`. Production ≈92 LOC was on estimate (~80); tests ≈364 vs ~190 (≈1.9×) for 11 + 8 scenarios, each needing a multi-poll or multi-center harness, plus a 1b defect case. Same shape as COT / RDR: size test LOC from the scenario count × harness setup, not from production LOC. Keep severity as recorded (recurrence noted). |
| Severity | Medium |
| Status | pending |

### P3

| Field | Value |
|---|---|
| Kind | guide-sync |
| Target | `onecgiar-pr-client/src/app/pages/bilateral/pages/my-draft-results/CLAUDE.md` |
| Edit | Restore 1 line dropped by the ADN-T-2 cap trim (file is 119/120): "Submit for review is the only path toward P/A review; `BilateralAiService` refetches `draftList()` per center switch (why filters must not cache it)." |
| Severity | Low |
| Status | pending |

### P4

| Field | Value |
|---|---|
| Kind | factual-sweep |
| Target | `onecgiar-pr-client/CLAUDE.md` rule 21 |
| Edit | Stale: "Icons from `@ng-icons/lucide` only". Replace with: "New icons: `@ng-icons/lucide` for Spartan/Helm surfaces; existing `material-icons-round` pages (DD-12, `docs/ux-ui/design.md` §7) keep `material-icons-round`." Confirm the intended rule with the design owner before applying. |
| Severity | Low |
| Status | pending |
