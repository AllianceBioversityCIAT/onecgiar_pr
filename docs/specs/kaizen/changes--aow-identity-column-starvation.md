# Kaizen Entry — changes/aow-identity-column-starvation

## Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/aow-identity-column-starvation` · Prefix `AIS` |
| Date | 2026-09-03 |
| Branch | `qa-development-2026` — **spec branch** (default pin `master`); every shared-file edit below is recorded pending, none applied |
| Archive Run | 1 |
| Approval Mode | `pre-approved` · Depth Standard, Bug Mode |
| Outcome | Complete — 5/5 `[x]`, CT gate red→green, real page 0 violations |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 5 | tasks.md |
| Reviewer FAIL rework attempts | **3** (T-1 ×1, T-5 docs ×2) | execution.md §2 |
| HALTs / FATAL_FAILs | 0 | execution.md |
| Pivots | 0 | execution.md |
| PRODUCT_BUGs | n/a — no `test-report.md` | — |
| Judgment-day severe findings | **3** (all single-judge, orchestrator-verified, fixed pre-execution) + 6 warnings | judgment.md |
| Validation FAIL / WARN | n/a — no `validation-report.md` | — |
| `/akili-quick` escalations | 0 | — |
| Drift attributable | none — `docs/specs/audits/` holds no report | — |
| Budget | ≈800 LOC vs ≈240 (**≈330%**); Reviewer rounds 1/1/1/1/3 vs ≤1 | execution.md §3, design.md §14 |
| Environment blocks | 2 — Claude-in-Chrome down all day (real-page pass deferred for hours although the Orca embedded browser held the session); CT Chromium without Google Fonts (icon ligature contaminated widths) | execution.md T-2 step 0, T-5 |
| Concurrency | a second AKILI session committed on the same checkout throughout | execution.md T-1 |

## Lessons

- **KZ-changes--aow-identity-column-starvation-1 — A Leader brief that softens or omits the task's governing text buys a rework round per omission.** (Product + Methodology, Medium)
  - Root cause: the T-1 brief offered "record `A_narrow` as not measurable, honestly" — a fallback `tasks.md` does not contain — and the Implementer took it; the T-5 brief never named `onecgiar-pr-client/docs/COMPONENT-DOCS.md` (120-line cap, freshness stamp), which the Reviewer then enforced. Three of the run's three rework rounds trace to brief content, not Implementer error. The brief is the only text the worker reads verbatim; anything it adds or drops is law to the worker.
  - Evidence: execution.md — `AIS-T-1` attempt 1 FAIL + "Leader adjudication"; `AIS-T-5` attempt 1 FAIL (issues 1–2) + adjudication.
  - Standardization: → P1 (local `.agents/leader.md`) · upstream to AKILI (`/akili-execute` §2.2 brief rules).

- **KZ-changes--aow-identity-column-starvation-2 — A rendered-measurement gate is only as true as the fonts its harness loads.** (Product, Medium)
  - Root cause: `cypress/support/component-index.html` lacked the `Material Icons Round` link that `src/index.html` has; the CT Chromium also has no network route to Google Fonts. The `arrow_forward` ligature rendered as ~100px of text, inflating the actions cell (`scrollWidth 148 vs 113`) and producing a 16px row overflow at every width — a false red that the design arithmetic could not explain until the font was self-hosted. Cold-vs-warm font timing also shifted the maxima between runs.
  - Evidence: execution.md — `AIS-T-1` attempt 2 overflow-locator; `AIS-T-2` step 0 (residual 1015→996 once the font loaded).
  - Standardization: → P2 (`docs/specs/general-setup/task.md` verification guidance).

## Noted, not a lesson

- **Single-judge SEVERE findings in Judgment Day were verified by the orchestrator and fixed** against the skill's "one judge → suspect, do not fix" rule. All three were checkable facts (two wrappers; 36px row chrome; host ≠ wrapper) and each would have shipped a design that overflows by construction. Recorded in `judgment.md` as a deviation; if it recurs, the skill's gate wants a "checkable-fact exception" — Methodology candidate, not yet a lesson.
- **Third Reviewer round on T-5 docs** taken instead of escalating, because both findings were fix-caused one-liners and the owner had said "termina". Deviation recorded in execution.md; not a lesson (the ≤1-round rule is the owner's preference, and it held everywhere else).
- **Orca embedded browser as the real-page harness**: `set viewport` must run **after** `goto`; the app's root `zoom` inflates `innerWidth`/`matchMedia`/container widths ×1.2. Now in the project memory; a `docs/infrastructure.md` §6 note would make it durable — sub-threshold, feeds recurrence.
- **Design consequence estimates were pessimistic**: the root zoom makes the shell roomier than the unzoomed arithmetic predicted (1280 lands in the full branch, not no-achievement). Harmless direction; the real-page table is the record.

## Pending Items

All await the default-branch apply phase; nothing below was written on this branch.

### P1

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `.agents/leader.md` → Delegation Discipline (append) |
| Edit | Add: "A brief may narrow a task but never widen it: it adds no fallback, option or 'honest alternative' the task text lacks, and it names every convention file that governs the target (folder-guide caps like `COMPONENT-DOCS.md`, payload contracts, style rules). Each omission is a Reviewer FAIL you paid for in advance." |
| Severity | Medium |
| Status | pending |
| Upstream | AKILI methodology — `/akili-execute` §2.2 pointer-brief rules |

### P2

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `docs/specs/general-setup/task.md` → verification guidance |
| Edit | Add: "A gate that reads rendered widths or heights MUST first assert that the production fonts (text **and icon** faces) are loaded in the harness — `document.fonts` status, not `check()` — and the harness MUST self-host any face the sandbox cannot fetch. A fallback glyph is a measurement contaminant, and it reports green as a false red or a false pass." |
| Severity | Medium |
| Status | pending |

### P3

| Field | Value |
|---|---|
| Kind | digest-update |
| Target | `KZ-OAH-1` |
| Edit | Recurrence #4 (this spec — `proposal.md` §4, fixed here by changing the mechanism). Raise to **High**. Amend its standardization #1 (`changes--overview-aow-progress-hero.md` P1): replace "any track feeding a column that holds text is `minmax(0,1fr)`" with "a text column carries a floor of its smallest readable width (chip + gap + ≥ 80px of name here), and a row whose width the shell decides keys its ladder on its **container** (`@container`, `@min-/@max-[N]:`), thresholds = Σ min tracks + gaps + row chrome — `minmax(0,…)` is explicit permission to collapse." Add this spec as source. |
| Severity | High |
| Status | pending |

### P4

| Field | Value |
|---|---|
| Kind | digest-update |
| Target | `KZ-REH-1` (LOC budgets under-count) |
| Edit | Recurrence: this spec ran ≈330% of budget (≈800 vs ≈240) — the under-counted items were a real-browser test harness (346 LOC), rewritten ladder comments (≈120) and a harness correction absent from the design. Add "measurement harnesses and comment blocks are LOC too" to the digest row; add this spec as source. |
| Severity | Medium |
| Status | pending |

### P5

| Field | Value |
|---|---|
| Kind | digest-update |
| Target | `KZ-changes--clear-filters-2` (browser-only gate needs a capability probe) |
| Edit | Recurrence one day later: `AIS-T-5`'s real-page pass was recorded "BLOCKED (environment)" after probing Claude-in-Chrome and Cypress auth, while the Orca embedded browser (`orca-cli` skill, `orca tab list`) already held a logged-in tab. Raise to **High**; extend the rule: "the probe enumerates every browser the host exposes (Claude-in-Chrome, Orca embedded browser, Playwright profile) before declaring the check blocked." Add this spec as source. |
| Severity | High |
| Status | pending |

### P6

| Field | Value |
|---|---|
| Kind | factual-sweep |
| Target | `.agents/model-routing.md` → `## Skill Map` evidence line + table |
| Edit | Replace "No React/Tailwind/shadcn in this repo — those skills are deliberately not mapped" with "No React/shadcn in this repo. **Tailwind 4 is the client's styling system** (`onecgiar-pr-client/CLAUDE.md` §5, Tailwind-first hard rule)" and add the row: `| tailwind-design-system | onecgiar-pr-client/ templates | Any layout, responsive or container-query work; v4 arbitrary variants |`. Falsified by `package.json` (`tailwindcss ^4.3.2`) and this spec's `AIS-T-2`. |
| Severity | Medium |
| Status | pending |

### P7

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `docs/ux-ui/design.md` → §9 Responsive Behavior → Patterns |
| Edit | Add: "- **Rows whose width the shell decides** (sidebar, rails, card padding) degrade by **container query**, not viewport: `@container` on the list wrapper, `@min-/@max-[N]:` on the row (`@max-[N]` is exclusive), thresholds = Σ(minimum tracks) + gaps + row chrome, and every text column carries a readable floor — never `minmax(0,1fr)`. Reference implementation: `program-overview` AoW row (`changes/aow-identity-column-starvation`, `AIS-DD-1..3`)." |
| Severity | Medium |
| Status | pending |

*(No `guide-sync` item: `program-overview/CLAUDE.md` was updated inside `AIS-T-5` as a spec deliverable. No `trd-adr` item: no TRD ADR overturned. CodeGraph re-index recommended — two new `.cy.ts` files and a reshaped template.)*
