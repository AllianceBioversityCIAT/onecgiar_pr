# Kaizen Entry — changes/bilateral-review-ux-polish

## Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/bilateral-review-ux-polish` · Prefix `BRP` |
| Date | 2026-09-08 |
| Branch | `qa-development-2026` — **spec branch** (default pin `master`); every shared-file edit below is recorded pending, none applied |
| Archive Run | 1 |
| Approval Mode | `pre-approved` · Depth Standard (compact) |
| Outcome | Complete — 4/4 `[x]`; owed live looks delivered 2026-09-08 02:20; owner reviewed the "after" screenshot and asked for a follow-up spec |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 4 | tasks.md |
| Reviewer FAIL rework attempts | **4** (one per task) | execution.md |
| HALTs / FATAL_FAILs | 0 (one Implementer killed by a rate limit, respawned) | execution.md T-1 |
| Pivots | 0 (R-7 sticky header dropped at premise check; R-14 amended with (g)(h) in T-3) | requirements.md, execution.md T-3 |
| PRODUCT_BUGs | n/a | — |
| Judgment-day severe findings | **8 families** (5 dual-judge) + 12 warnings | judgment.md |
| Validation FAIL / WARN | n/a | — |
| `/akili-quick` escalations | 0 | — |
| Drift attributable | none | — |
| Budget | source **+1036 vs ~850 (+22 %)**; tests +1361 vs ~900 (+51 %); rounds 2/2/2/2 | execution.md Summary |
| Live-only defects | 0 new; two owed looks blocked ~3 h by Orca `runtime_unavailable` | execution.md |
| Leader false premises caught at execution | **3** (Clear filters "only in the popover"; Actions "unchanged (`border-l`)"; toolbar "all lucide") | execution.md T-1/T-2/T-4 |

## Lessons

- **KZ-changes--bilateral-review-ux-polish-1 — Every existence / absence / "unchanged" claim about current markup in a spec cites a `grep -n` result; judges must be told to grep those claims.** (Product + Methodology, Medium)
  - Root cause: three Leader-written premises survived two blind judges because they read as plausible and no one grepped: a toolbar Clear filters button already existed (`.html:216-224`), the Actions cell never had a `border-l`, and the page template already mixed lucide and material icons. Each cost a Reviewer FAIL round.
  - Evidence: execution.md — T-1 Reviewer issue (design §6.2 `emptyValue` precedent), T-2 issue 3, T-4 issue 1; judgment.md L-1 (the only one the judges caught).
  - Standardization: → P1 (`docs/specs/general-setup/requirements.md` premises table) · upstream to AKILI (`/akili-specify` Phase 1 premises + judgment-day judge prompt).

- **KZ-changes--bilateral-review-ux-polish-2 — A prescribed CSS class must be checked against the token's *type*: `--pr-focus-ring` is a box-shadow triple, so `ring-[var(--pr-focus-ring)]` paints nothing.** (Product, Medium)
  - Root cause: design §6.3 prescribed the broken string; 20 new controls shipped with no visible focus until the Reviewer cited the repo's own negative test (`program-overview.scope.spec.ts:279-283`). The design system doc never says the token is a shadow.
  - Evidence: execution.md — `BRP-T-1` Reviewer issue 1; `colors.scss:311`.
  - Standardization: → P2 (`docs/ux-ui/design.md` §7 token note).

## Noted, not a lesson

- Budget +22 % source / +51 % tests after a ×2 re-baseline — **recurrence of `KZ-REH-1`** (P3 `digest-update`; the re-baseline held on source).
- Reviewer FAIL on every task under an "≤ 1 round" limit → the scoped re-review protocol (FAIL → fix → scoped PASS) is now the de-facto one round; declared explicitly in `BRV`.
- Implementer yielded twice on background Jest runs → briefs now say "foreground, no run_in_background".
- `#workArea` is a template reference, not an id — first two strikes here (CT comment, T-3 probe); third strike and the lesson in `BRV`.
- Orca `eval` down for ~3 h with `status` reporting ready — the "Deferring a check" probe worked as designed; looks were delivered when it returned.

## Pending Items

### P1

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `docs/specs/general-setup/requirements.md` → Phase-1 premises table (append a column rule) |
| Edit | Add: "Every claim of the form 'X exists / does not exist / is unchanged / this region uses only Y' cites a `grep -n` hit (file:line) in the premises table; a claim without a citation is not a premise. Judgment-day judges grep these claims first." |
| Severity | Medium |
| Status | pending |

### P2

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `docs/ux-ui/design.md` §7 (append to the focus-ring / tokens notes) |
| Edit | Add: "`--pr-focus-ring` is a **box-shadow triple** (`0 0 0 3px rgb(107 70 229 / .28)`), not a color: use `focus-visible:outline-none focus-visible:shadow-[var(--pr-focus-ring)]`; `ring-[var(--pr-focus-ring)]` paints nothing (pinned by `program-overview.scope.spec.ts`)." |
| Severity | Medium |
| Status | pending |

### P3

| Field | Value |
|---|---|
| Kind | digest-update |
| Target | `KZ-REH-1` |
| Edit | Add `changes/bilateral-review-ux-polish` as a source (+22 % source, +51 % tests after a ×2 re-baseline); recurrence 6. |
| Severity | High |
| Status | pending |

### P4

| Field | Value |
|---|---|
| Kind | guide-sync |
| Target | `docs/ux-ui/design.md` §7 line 230 (icon rule) |
| Edit | Add after the `material-icons-round` rule: "Recorded deviation: `pages/bilateral-review/` mixes lucide (toolbar/band) and `material-icons-round` (table/cards) by region — see `onecgiar-pr-client/docs/DESIGN-DEVIATIONS.md` #15; new controls follow their nearest siblings." |
| Severity | Low |
| Status | pending |

### P5

| Field | Value |
|---|---|
| Kind | factual-sweep |
| Target | `onecgiar-pr-client/docs/COMPONENT-DOCS.md:31-32` (folder-guide cap) |
| Edit | Replace the hard 120-line cap sentence with: "≤ 120 lines by default; a spec may approve up to 150 for a page guide that owns a URL contract and a scroll contract (precedent: `pages/bilateral-review/CLAUDE.md`, 148 lines, `BRP`/`BRV`)." |
| Severity | Low |
| Status | pending |
