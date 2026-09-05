# Kaizen Entry — changes/sp-shell-app-viewport

## Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/sp-shell-app-viewport` · Prefix `SAV` |
| Date | 2026-09-04 |
| Branch | `qa-development-2026` — **spec branch** (default pin `master`) |
| Archive Run | 1 |
| Approval Mode | `pre-approved` (spec said `gated`; standing feedback) · Depth Standard |
| Outcome | Complete — 6/6 tasks PASS; SP Overview/Reporting/Results viewport-locked at ≥ 900 CSS px; real-browser readings on all three pages; user visual sign-off |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 6 | tasks.md |
| Reviewer FAIL rework attempts | 4 (T-1 ×1 missing CT assertions; T-3 ×1 mirrored-fragment Jest without falsifier; T-4 ×1 `styleUrls`/inline `styles` cascade; T-6 ×1 facts dropped while condensing guides) | execution.md |
| HALTs / FATAL_FAILs | 0 | execution.md |
| Pivots | 0 (three spec-wording amendments applied at archive instead) | execution.md — Pending default-branch writes §2 |
| Budget tripwire | 1 (review rounds: ≤ 2 sized, 3rd user-approved, 4th docs-only on user direction) | execution.md — Budget tripwire |
| PRODUCT_BUGs | n/a (no `/akili-test` run) | — |
| Judgment-day severe findings | not recorded in the spec | — |
| Validation FAIL / WARN | n/a (T-5 real-browser probe = validation; 8 PASS, 1 INCONCLUSIVE on real data covered by CT) | execution.md T-5 |
| `/akili-quick` escalations | 0 | — |
| Drift attributable | none (`docs/specs/audits/` holds no report) | — |
| Budget LOC | ~280 estimated → ≈ 190 production + ≈ 460 test actual (CT harness 247 vs ~90) | execution.md |
| Concurrency | foreign session active in the same checkout (3 commits, uncommitted edits in the same folder and the same `CLAUDE.md`); **one sweep** — `ecf47d549` committed this spec's archive-time wording amendments under its own `[SPEC:]` tag (content intact, attribution only) | execution.md T-6 staging note; archive-summary §8 |
| Advisory findings recorded (never reworked) | 16 across 6 tasks; 3 adopted into rework briefs as Leader decisions | execution.md |

## Lessons

- **KZ-changes--sp-shell-app-viewport-1 — A spec-level review-round budget mis-sizes any spec whose gates are browser/CSS-shaped; size review rounds per task.** (Product + Methodology, Medium)
  - Root cause (5W1H): `design.md` §14 budgeted "≤ 2 review rounds" for six tasks. Three unrelated tasks each needed exactly one rework (missing CT assertions, a CSS cascade, a tautological Jest gate) — the per-task rate the user's own standing rule already assumes (≤ 1 round per task). The spec-level cap therefore tripped on ordinary progress, costing a HITL stop with nothing wrong, and a fourth round then ran outside the approved budget.
  - Evidence: `execution.md` — "Budget tripwire: SAV-T-3"; `design.md` §14; T-6 final status.
  - Standardization: → P1 (local design template budget row) · upstream to AKILI (`/akili-specify` Step 2.4 budget guidance: express review rounds per task, trip on the second round *of one task*).

- **KZ-changes--sp-shell-app-viewport-2 — Angular emits `styleUrls` before inline `styles`; a `:host` rule split across both loses its cascade order, and no jsdom gate can see it.** (Product, Medium)
  - Root cause: `programme-results` had `styles: [':host { display: block } …']` and gained `styleUrls` with the media-gated mixin (`display: flex`). Equal specificity → the later-emitted inline `display: block` won at ≥ 900px, leaving the Results work area unscrollable. Jest (188 green) and a standalone `npx sass` compile cannot observe emission order; the Reviewer grounded it in `@angular/compiler-cli` and the real-browser probe confirmed the fix.
  - Evidence: `execution.md` — SAV-T-4 attempt 1 Reviewer FAIL (Violated Rule: `design.md` §2.2, `SAV-R-1/2`); `programme-results.component.scss` comment.
  - Standardization: → P2 (client source-tree guide §21.7 gotcha, 2 lines).

- **KZ-changes--sp-shell-app-viewport-3 — A Jest case that renders a fragment authored inside the spec proves plumbing, not that the real template opts in; pair it with a static source lock over the real file.** (Product + Methodology, Medium)
  - Root cause: `dashboard-lab.viewport.spec.ts` mirrored the band + `#workArea` markup in a `LOCKED_FRAME_FRAGMENT` (module precedent: `hub.spec.ts`'s `BANNER_FRAGMENT`). Deleting `[scrollHost]` from the real template left 210 tests green — the task's only wiring gate had no falsifier. Mounting the 2.2k-line template is infeasible in jsdom; the module's own `readFileSync` source-lock pattern (`design-tokens.spec.ts`) closed it in 15 lines.
  - Evidence: `execution.md` — SAV-T-3 attempt 1 Reviewer FAIL (Violated Rule: `design.md` §10 row 2 "the pages opt in exactly where required"); attempt 2 falsifier (removed `[scrollHost]` → red).
  - Standardization: → P3 (task template Disqualifiers guidance) · upstream to AKILI (`/akili-specify` task Disqualifiers: "presence/opt-in claims need a falsifier against the real artifact").

## Noted, not a lesson

- **Orca root zoom ×1.2 — second occurrence** (first: `changes--aow-identity-column-starvation.md` "Noted"). Here it made the literal 800×1100 and 1100-wide AC rows INCONCLUSIVE until a 700-wide diagnostic (840 CSS px) proved the sub-`md` branch. Rule of thumb: request `< 900 / 1.2 ≈ 750px`; write ACs as effective CSS width. Third occurrence promotes it to a lesson (`docs/infrastructure.md` §6 note).
- **Condensing a guide to a line cap drops facts.** T-6 attempt 1 "re-wrapped" four paragraphs and lost a trap's symptom + resolution (making the paragraph false) and three identifiers. COMPONENT-DOCS §4's remedy is moving a section down, never trimming gotchas — the rule existed; the Implementer chose speed. Below the lesson bar (one occurrence, rule already written).
- **Spec internal inconsistency** — `design.md` §6.1 said "lock keyed on `rfrView ∈ {overview, planned}`" AND "portfolio `/overview`, `/planned-toc` not locked", though those routes carry exactly those `rfrView` values. Judgment-day did not catch it; T-6's Reviewer did. Amended at archive; recurrence feed for a "route-data vs route-path predicates" check.
- **Reviewer reports truncated at ~4 KB in the harness delivery** — six of eleven verdicts needed one or two "re-send from X" round trips (Leader cost, not a spec defect). Friction only.
- **LOC budget under-count — recurrence of `KZ-REH-1`** (REH → AIS → KCR → RGS → RAC → **SAV**, sixth spec): tests 2.7× the estimate (CT harness 247 vs 90); production came in *under* (190 vs 280). → P4 `digest-update`.

## Pending Items

### P1

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `docs/specs/general-setup/design.md` (Budget / Step 2.4 sizing row) |
| Edit | Add: "Review rounds are budgeted **per task** (default ≤ 1 rework per task; trip on the *second* FAIL of one task), never as a spec-wide total — three healthy tasks needing one round each is normal progress, not an overrun." |
| Severity | Medium |
| Status | pending |

### P2

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `onecgiar-pr-client/src/CLAUDE.md` §21.7 (gotchas list) |
| Edit | Add: "⚠️ Angular emits `styleUrls` content **before** inline `styles`. Never split `:host` rules across both — an inline `:host { display: block }` silently beats a `styleUrls` media-query `display: flex` at equal specificity (caught on `programme-results`, `changes/sp-shell-app-viewport`). Keep every `:host` rule in the `.scss`." |
| Severity | Medium |
| Status | pending |

### P3

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `docs/specs/general-setup/task.md` (Disqualifiers guidance) |
| Edit | Add: "A presence/opt-in claim ('the page binds X', 'the host carries class Y') is only gated by an assertion against the **real artifact** — a fragment authored in the spec proves plumbing, not opt-in. Pair fragment tests with a static source lock (`readFileSync` on the real template) and name the falsifier (delete the binding → red)." |
| Severity | Medium |
| Status | pending |

### P4

| Field | Value |
|---|---|
| Kind | digest-update |
| Target | `KZ-REH-1` (LOC budgets under-count) |
| Edit | Add `changes/sp-shell-app-viewport` as a source (sixth recurrence); note the new mode: browser-harness test code (Cypress CT) runs ≈ 2.5–3× its estimate while production can come in under — size CT harnesses separately from Jest. |
| Severity | Medium (raised: six recurrences) |
| Status | pending |

### P5

| Field | Value |
|---|---|
| Kind | guide-sync |
| Target | `docs/ux-ui/design.md` §6 Layout Patterns → after "### Page shell" |
| Edit | Insert the "### Viewport-locked page" variant text recorded verbatim in the archived `execution.md` → "Pending default-branch writes" item 1 (mixin, outlet-slot contract, work-area utilities, no-`transform` rule, adopters, cascade trap). Also add a one-line pointer in §12 under DD-12 or as a new DD: "Viewport-locked pages use the `pr-viewport-page` mixin — see §6." |
| Severity | Medium |
| Status | pending |

### P6

| Field | Value |
|---|---|
| Kind | factual-sweep |
| Target | root `CLAUDE.md` / `AGENTS.md` |
| Edit | Sweep run at archive: no root-guide assertion falsified by this cycle was found (no module created, no command or stack change; the three client folder guides were updated on the spec branch in `2eb814d34`). Nothing to apply — recorded for completeness. |
| Severity | Low |
| Status | pending |

**Methodology lessons for upstreaming to the AKILI repo:** `KZ-changes--sp-shell-app-viewport-1` (per-task review-round budgets) and `KZ-changes--sp-shell-app-viewport-3` (opt-in claims need a real-artifact falsifier). Neither names anything PRMS-specific.
