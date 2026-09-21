# Kaizen Entry — changes/user-guide-pdf

## Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/user-guide-pdf` |
| Date | 2026-09-16 |
| Branch | qa-development-2026-mc (spec branch — every shared-file write below is recorded as pending) |
| Archive Run | 1 |
| Approval Mode | gated on paper; run pre-approved by explicit user direction (2026-09-15) |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 19 (16 planned + `UG-T-17`–`19` added mid-run for `UG-R-21`) | tasks.md |
| Reviewer FAIL rework attempts | 3 tasks, 4 FAIL verdicts (`UG-T-11` ×1, `UG-T-3`+`UG-T-7` ×1 joint, `UG-T-9` ×2 — the second a single sentence, fixed inline by the Leader) | execution.md — `UG-T-11`, `UG-T-3`/`UG-T-7`, `UG-T-9` |
| HALTs / FATAL_FAILs | 0 | execution.md |
| Pivots | 0 formal (`UG-DD-6` target change and `UG-R-21` amendment recorded as in-place spec edits, not Pivot Records) | execution.md §3, §3c |
| Review rounds | 9 (Reviewer spawns incl. retroactive audit and polish re-review) vs 2 budgeted | execution.md |
| Budget tripwire | fired 2026-09-16: ~2,000 LOC vs 650–850; user chose to continue | execution.md §3c |
| Retroactive audit | 3 tasks (`UG-T-4/5/6`) had landed in `b885c5f18` with no execution entry, no review, a committed throwaway and a stray client lockfile change | execution.md §3a |
| Runtime failures | 4 workers killed by HTTP 429 (sonnet session ×2, opus weekly ×2); rotations recorded | execution.md §3b, §3c |
| Leader-caught rendered defects | 3 that text-only Reviewers had passed or could not see: 4/6 captures unusable (720 px / 186,000 px frames), nested-comment template corruption, orphaned caption + glossary terms | execution.md — `UG-T-3`/`UG-T-7` attempt 1, `UG-T-11` attempt 1, polish round |
| PRODUCT_BUGs | n/a (no `/akili-test` — tooling spec, absence accepted) | archive-summary.md §5 |
| Validation FAIL / WARN | n/a (no `/akili-validate`; per-task Reviewer verdicts + user HITL sign-off) | archive-summary.md §6 |
| Drift attributable to this spec | none recorded (`docs/specs/audits/` holds no report) | — |

## Lessons

- **KZ-changes--user-guide-pdf-1 — When a task's DoD is rendered output, the Leader inspects the artifact (dimensions and an image view) before spawning the Reviewer and hands the observation over as evidence; presence checks on a broken render pass.** (Product + Methodology, Medium)
  - Root cause: the `akili-reviewer` wrapper has `Read`/`Grep`/`Glob` only, so visual DoD items ("6 annotated PNGs", "TOC anchors resolve", "image + caption on one page") were satisfied by presence checks that a corrupt DOM or a 720-px frame also satisfies. Three times in this spec the defect surfaced only when the Leader measured PNG dimensions or opened the PDF/PNG: `overview.png` at 1280×720 with skeleton rows and `notifications-received.png` at 1280×186177 after an exit-0 run; `guide.html`'s nested `<!-- 01 -->` markers rendering the contract as page text while the Implementer's "all anchors resolve" check passed on the strays; the orphaned figure caption in a 20-page PDF that two gates had passed.
  - Evidence: execution.md — `UG-T-3`/`UG-T-7` attempt 1 (Leader check before review); `UG-T-11` attempt 1 (Leader check before review); `UG-T-12`–`14` polish round (Leader HITL findings). Related, not duplicate: `KZ-changes--my-work-board-2` (user's first real-page look scheduled early) and `KZ-EVM-1` (one viewport is not proof) concern *when* and *how many* looks; this lesson concerns *who* looks before the text-only gate.
  - Standardization: → P1 (local, `.agents/leader.md`) + upstream recommendation (`/akili-execute` §2.3: Leader supplies rendered-artifact evidence to the Reviewer brief when the DoD is visual).

- **KZ-changes--user-guide-pdf-2 — A `[SPEC:…]` commit with no matching `execution.md` entry is invisible to the audit trail; the Leader commits a task only after its entry exists, and a resume that finds tagged commits without entries treats them as unreviewed work.** (Methodology, Medium)
  - Root cause: the `akili-tasks-gate.sh` hook guards `[x]` writes in `tasks.md`, but nothing ties a commit to an execution entry. A prior session committed `auth.ts`, `tokens.ts`, `annotate.ts` (3 tasks), a self-described throwaway `_scratch-verify.ts` and 26 lines of unrelated `onecgiar-pr-client/package-lock.json` churn under a commit message without the `[SPEC:…]` tag, leaving `execution.md` at "1 of 16". `/akili-resume` reported 1/16 while git held 4/16; the reconciliation cost a retroactive Reviewer round and a cleanup commit.
  - Evidence: execution.md §3a (Reconciliation note — commit `b885c5f18`); tasks.md `UG-T-4`–`UG-T-6` headings before/after. Related, not duplicate: the concurrency notes in `bugfix--kpi-count-reconciliation.md` and `changes--indicator-reported-results.md` are about *foreign* commits from another spec; this is the spec's *own* work landing unrecorded.
  - Standardization: → P2 (local, `.agents/leader.md`) + upstream recommendation (`/akili-execute` Step 3 item 3 and `/akili-resume` Step 1: flag tagged commits lacking an entry as drift).

## Noted, not a lesson

- **LOC and review-round budgets under-count again** (this is the fifth recurrence of `KZ-REH-1` and the second of `KZ-changes--sp-shell-app-viewport-1`): 650–850 LOC / 2 rounds estimated, ~2,000 LOC / 9 rounds delivered. Cause here: the estimate covered happy-path tooling only — verification/guard code (structure verifier, skeleton gate, token shape guard, font gate ≈ 40 % of LOC) and adaptation to an external production DOM (inner-scroll routes, per-route viewports, lazy widgets) were not in the model. Recorded as digest-updates P3 and P4 rather than a new lesson.
- **Provider rate limits killed 4 workers** (sonnet session limit twice, opus *weekly* limit twice — the weekly cap is new); rotation Implementer→opus / Reviewer→fable worked. Already noted in `changes--cognito-email-otp-login.md` and `bilateral--center-overview-tab.md`; recurrence feed only.
- **Playwright specifics** (bundled Chromium CDN unreachable → system Chrome channel; `fullPage` no-op on inner-scroll containers; headings are not readiness gates; HTML comments do not nest) — project tooling knowledge, kept in the archived `execution.md` and the operator's memory; no shared-file rule warranted.
- **Spec-branch scope growth handled cleanly**: the user's post-HITL request for labelled callouts was recorded as `UG-R-21`/`UG-DD-7`/`UG-T-17`–`19` before execution, with the budget tripwire reported in the same message — the amendment path worked as designed.
- **`tasks.md` `UG-T-9` cites a non-existent `design.md §"Section layout pattern"`** — a specify-time dangling pointer; below the lesson bar.
- **Judgment-day findings**: none recorded in `design.md`.

## Pending Items

### P1

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `.agents/leader.md` → *Deferring a check* (append) |
| Edit | When a task's DoD is rendered output (screenshots, PDFs, layout), inspect the artifact yourself — dimensions plus one image view — before spawning the Reviewer, and pass the observation in the brief as evidence; a text-only Reviewer cannot see a 720-px frame or an orphaned caption, and presence checks pass on a broken DOM. |
| Severity | Medium |
| Status | pending |
| Upstream | AKILI repo — `/akili-execute` §2.3 Reviewer brief: add "rendered-artifact evidence from the Leader when the DoD is visual" to the brief contents list. |

### P2

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `.agents/leader.md` → *Concurrency protocol* (append) |
| Edit | Commit a task's files only after its `execution.md` entry exists, always with the `[SPEC:<path>]` tag; on resume, a tagged (or spec-folder) commit with no matching entry is unreviewed work — record it, spawn a retroactive Reviewer, and never mark it `[x]` on the strength of the commit alone. |
| Severity | Medium |
| Status | pending |
| Upstream | AKILI repo — `/akili-resume` Step 1: compare `git log -- <spec-folder>` against `execution.md` task entries and report entries-less commits as drift; `/akili-execute` Step 3 item 3: order "entry → commit". |

### P3

| Field | Value |
|---|---|
| Kind | digest-update |
| Target | `KZ-REH-1` (LOC budgets under-count) |
| Edit | Add `changes/user-guide-pdf` as a source (fifth recurrence: REH → AIS → KCR → COV → UGP; 650–850 estimated / ~2,000 delivered, tooling spec with zero tests — the under-count is not only the tests share: verification/guard code and adaptation to an external DOM were unmodelled). Raise severity to **High**. |
| Severity | High |
| Status | pending |

### P4

| Field | Value |
|---|---|
| Kind | digest-update |
| Target | `KZ-changes--sp-shell-app-viewport-1` (size review rounds per task when gates are browser/CSS-shaped) |
| Edit | Add `changes/user-guide-pdf` as a source (2 rounds budgeted / 9 run; every FAIL was a rendered-output defect). |
| Severity | Medium |
| Status | pending |

### P5

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `docs/ux-ui/design.md` §7 (design tokens — typography) |
| Edit | Replace the Poppins reference with the live stacks read from the app on 2026-09-15: body `Manrope, Poppins, sans-serif` (`--font-manrope`), code `"JetBrains Mono", ui-monospace, monospace`; note that `fonts.scss` declares them literally, with no `--font-*` custom property. |
| Severity | Low |
| Status | pending |
