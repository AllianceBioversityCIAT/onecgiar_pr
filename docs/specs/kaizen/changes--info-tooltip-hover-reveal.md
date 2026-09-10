# Kaizen Entry — changes/info-tooltip-hover-reveal

## Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/info-tooltip-hover-reveal` |
| Date | 2026-09-10 |
| Branch | qa-development-2026-ss (spec branch — default is `master`) |
| Archive Run | 1 |
| Approval Mode | gated |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 15 (`ITR-T-1`–`ITR-T-3`, `ITR-T-5`–`ITR-T-15`) | tasks.md |
| Reviewer FAIL rework attempts | 5 tasks needed rework (`ITR-T-1` ×1, `ITR-T-5` ×2, `ITR-T-6` ×1, `ITR-T-7` ×1, `ITR-T-9` ×1) | execution.md |
| HALTs / FATAL_FAILs | 0 | execution.md |
| Pivot Records | 7 (all user-design-feedback driven, not spec-error pivots) | execution.md — `## Pivot Record` blocks |
| PRODUCT_BUGs | 0 (no standalone `/akili-test` run — testing embedded in execute triad) | n/a |
| Validation FAIL / WARN | 0 / 0 (no standalone `/akili-validate` run — validation was continuous live-user review) | n/a |

## Lessons

- **KZ-changes--info-tooltip-hover-reveal-1 — `app-pr-field-header`'s `[tooltip]` (and its whole label row) is entirely gated by `[label]` truthiness; migrating `[description]`→`[tooltip]` on a call site with a conditional/nullable label silently drops the guidance content, not just its visual style.** (Product, Medium)
  - Root cause: `pr-field-header.component.html` wraps BOTH the label div and the tooltip trigger button inside a single `*ngIf="this.label"` guard. The legacy `[description]` div sits outside that guard. So a component whose `[label]` binding evaluates to `null`/`''` in some code path (e.g. a module-conditional label like `geoscope-management`'s `this.internalModule.name === 'reporting' ? null : '...'`) rendered its `[description]` note fine before migration, but after switching to `[tooltip]` the entire header — label, asterisk, and tooltip trigger — vanishes in that code path, not just the note text.
  - Evidence: `execution.md` — `ITR-T-9` attempt 1 FAIL (Reviewer: "the regions note is now rendered nowhere... `[label]` is `null` for `module="reporting"`"), only caught because the Reviewer read `pr-field-header.component.html`'s actual guard rather than trusting attribute presence in the diff.
  - Standardization: → P1

- **KZ-changes--info-tooltip-hover-reveal-2 — A UI spec whose proposal declares "no visual mockup needed" because it "is a state-toggle on an existing component" can still require many rounds of live-screenshot design iteration once real usage patterns surface.** (Product + Methodology, Low)
  - Root cause: the approved proposal (`requirements.md` §4 Out of scope) reasonably judged that a collapsed/expanded toggle needed no upfront mockup. That held for the *mechanism* (click-to-expand vs. hover) but not for the *visual result* across ~150+ real call sites with varying DOM contexts (section-intro vs. field-level vs. banner notes, inline-with-title vs. below-field placement) — those distinctions only became visible once the user saw the shipped component live in each context, driving 7 separate Pivot Records across 9 feedback rounds.
  - Evidence: `execution.md` — 7 `## Pivot Record` blocks, none triggered by a broken requirement or a Reviewer FAIL, all triggered by a live user screenshot after the "no mockup needed" scope was already approved and executed.
  - Target split: **Product** — none of these pivots were avoidable defects, so no local process edit is proposed beyond the note in P2 below. **Methodology** — worth upstreaming as a general observation: a proposal's "no visual mockup needed" judgment should distinguish "the interaction mechanism needs no mockup" from "the visual result across every real call site needs no live review," since the two are not the same claim. Recorded for upstreaming only, no local edit proposed (per the dual-lesson rule: this observation is not project-specific).

## Noted, not a lesson

- `ITR-T-6`'s Reviewer FAIL (attempt 1) resolved to a diff-framing artifact, not a real code defect — the Reviewer was shown a cumulative `git diff` against pre-spec `HEAD` without clear per-task attribution, and flagged a line that actually belonged to an already-PASSed earlier task. Below the lesson bar since the Leader's own briefing practice (always noting "(unchanged from ITR-T-N)" annotations) already mitigates this, and the one miss was caught and resolved within the same task without consuming a genuine rework attempt on real code. Worth watching for recurrence across future multi-round specs with uncommitted cumulative diffs.
- `ITR-T-7`'s 4 site-classification defects (1 over-collapse, 3 missed sites) were all caught by the Reviewer reading full surrounding template context per site rather than pattern-matching on the `<app-alert-status>` tag alone — exactly the discipline the task's own Disqualifier demanded. No process gap; the process worked as designed.

## Pending Items

### P1

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `onecgiar-pr-client/src/app/custom-fields/pr-field-header/CLAUDE.md` (new file — none exists today) or, if a folder doc is judged disproportionate for this component, a note in `onecgiar-pr-client/src/CLAUDE.md` §14 (`custom-fields/` conventions) |
| Edit | Add: "`app-pr-field-header`'s `[tooltip]` (and its entire label row) only renders when `[label]` is truthy — a component with a conditional/nullable `[label]` binding will silently drop its tooltip trigger in the null-label branch, not just lose styling. Verify `[label]` is non-null in every reachable code path before binding `[tooltip]` on a call site." |
| Severity | Medium |
| Status | pending |

### P2

| Field | Value |
|---|---|
| Kind | standardization (Methodology — upstream recommendation, no local edit) |
| Target | AKILI methodology repository (proposal/`/akili-propose` guidance on the "Visual Reference: none needed" judgment) |
| Edit | Suggest the proposal template's Visual Reference guidance distinguish "the interaction mechanism needs no mockup" from "the visual result across every real call site needs no live review" — a shared-component spec touching many call sites may still benefit from budgeting explicit live-iteration rounds even when no upfront mockup is warranted. |
| Severity | Low |
| Status | pending |
