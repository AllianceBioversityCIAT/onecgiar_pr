# Archive Summary — Bilateral ToC question: project default first, detail on demand

## 1. Document Control
- Spec: `BIL-TOC`
- Author of this summary: AKILI archive step
- Date: 2026-09-18

## 2. Original Spec Path
`docs/specs/bilateral/toc-default-linkage/`

## 3. Archive Date
2026-09-18

## 4. Final Status
Done. All tasks T-2..T-9 (T-1 dropped, no migration needed) marked `[x]` in `tasks.md`. No unresolved FAIL findings.

## 5. Requirements Delivered
- BIL-TOC-R-1, R-2, R-3, R-4, R-5, R-6, R-7, R-8, R-9, R-12 — server-side ToC linkage mode derivation (`project_default` vs `custom`), project-default linkage query, save-path YES/NO handling with typology guard, and client contract updates.
- Follow-on UX iterations after initial delivery: canonical PRMS level-name fix (`High Level Output` / `Intermediate Outcome` instead of ad hoc wording), Yes/No toggle layout moved onto the question line, and a hub redesign (summary stat cards + collapsible breakdown) adapted from a user-supplied mockup to the project's Spartan/`@ng-icons/lucide` stack.

## 6. Files Changed Summary
Per `execution.md`:
- `onecgiar-pr-server/src/api/results/results-toc-results/repositories/aow-bilateral.repository.ts` (+ spec)
- `onecgiar-pr-server/src/api/bilateral/services/bilateral-center.service.ts` (+ spec)
- `onecgiar-pr-server/src/api/results/results-toc-results/results-toc-results.service.ts` (+ spec)
- `onecgiar-pr-server/src/api/bilateral/dto/save-bilateral-toc-mapping.dto.ts`
- `onecgiar-pr-server/src/api/bilateral/bilateral.module.ts`
- `onecgiar-pr-client/src/app/pages/bilateral/services/bilateral-auto-save.service.ts` (+ spec)
- `onecgiar-pr-client/src/app/pages/bilateral/components/section-toc-default/` (new component)
- `onecgiar-pr-server/docs/bilateral-result-summaries.en.md` (payload contract change log)

## 7. Test Evidence Summary
- Server: 156/156 across `aow-bilateral.repository|bilateral-center.service|results-toc-results.service`, eslint clean.
- Client: `section-toc-default` 13/13, full `section-toc*` 115/115, `ng lint` clean, `ng build --configuration development` succeeds.
- Playwright E2E on live local stack (2026-09-18): verified YES/NO toggle, custom detail cascade, and the NO→YES confirmation dialog on `http://localhost:4200/bilateral/AfricaRice/result/9460`. Screenshots captured (`pw-1-editor-initial.png` … `pw-5-contributors-full.png`).

## 8. Validation Summary
No standalone `validation-report.md`; validation evidence is embedded in `execution.md` (regression tests, lint, build, and manual/E2E browser verification). No unresolved FAIL findings.

## 9. Accepted Warnings Or Follow-Ups
- Follow-ups noted in `design.md` §13, not yet scheduled: indicator-level reporting of YES results; stale node rows after project relinking; OQ-6.
- Post-flight checklist items not yet actioned (commit/PR, CI, deploy monitoring) — this spec's code changes remain uncommitted on `qa-development-2026-ss` as of archive time; commit/PR is left to the user's explicit go-ahead per `[[feedback_no_autocommit]]`.

## 10. Historical Notes
- OQ-1, OQ-2, OQ-4, OQ-7 resolved during pre-flight (see `tasks.md` §2) — OQ-1 verified against real data (project 194 / SP06), OQ-2/OQ-4 accepted as assumptions.
- A level-name bug (`TOC_CATEGORY_LEVEL_MAP` using non-canonical wording) was caught and fixed after initial delivery, with a regression test added.
- Two user-requested follow-on UX iterations (toggle layout, hub redesign) were folded into this same spec rather than opened as new ones, since they refined the same component before archive.
