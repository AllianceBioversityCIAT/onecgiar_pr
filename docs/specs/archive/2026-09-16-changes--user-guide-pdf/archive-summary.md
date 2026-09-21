# Archive Summary — End-User PDF Guide for the Reporting Tool

## 1. Document Control

| Field | Value |
|---|---|
| Original Spec Path | `docs/specs/changes/user-guide-pdf/` |
| Archive Path | `docs/specs/archive/2026-09-16-changes--user-guide-pdf/` |
| Archive Date | 2026-09-16 |
| Branch at archive | `qa-development-2026-mc` (spec branch — shared-file syncs recorded as pending items) |
| Approval Mode | gated on paper, run pre-approved by explicit user direction (2026-09-15) |
| Final Status | **Executed and signed off** — 19/19 tasks `[x]`, deliverable committed |

## 2. Outcome

One committed PDF, `tooling/dist/reporting-tool-user-guide.pdf` (19 pages, Letter, 2.6 MB), built from six production screenshots with 22 labelled orange callouts, an introduction, a clickable table of contents, six narrated sections and a 24-term glossary sourced from CLARISA (17 verbatim) or authored by PRMS (7, flagged). A re-runnable, dependency-light Playwright pipeline lives in `tooling/` and regenerates it with `npm run capture && npm run build-guide`.

## 3. Requirements Delivered

| Requirement | Status | Where |
|---|---|---|
| `UG-R-1` single PDF, cover/intro/TOC/6 sections/glossary, U.S. English | Delivered | `assemble.ts`, `verify-structure.ts`, `pdf.ts` |
| `UG-R-2` authenticated capture of the 6 routes from a running instance | Delivered (production, `UG-DD-6`) | `auth.ts`, `capture.ts`, `routes.config.json` |
| `UG-R-3` click-target marker on every screenshot | Delivered | `annotate.ts` |
| `UG-R-4` styling from live design tokens | Delivered | `tokens.ts`, `template/guide.css` (var-only) |
| `UG-R-5` glossary scoped to the flows, CLARISA-sourced with accessed-on | Delivered | `content/glossary.json` |
| `UG-R-6`/`UG-AC-4` Results Center explains updating current-year innovations | Delivered | `content/sections/04-results-center.md` |
| `UG-R-7` re-runnable without manual image editing | Delivered | `package.json` scripts |
| `UG-R-10` configurable base URL / route list | Delivered | `.env`, `routes.config.json` |
| `UG-R-11`/`UG-OQ-4` no environment or URL in the copy | Delivered | `content/NOTES.md` |
| `UG-R-12` non-empty `alt` on every screenshot | Delivered | `assemble.ts`, gate in `verify-structure.ts` |
| `UG-R-20` build date on the cover | Delivered (local date) | `assemble.ts` |
| `UG-R-21` 2–5 labelled feature callouts per screenshot (added 2026-09-16) | Delivered | `annotate.ts`, `routes.config.json` |
| `UG-AC-5` glossary traceability | Delivered (two independent Reviewer checks) | Reviewer verdicts in `execution.md` |
| `UG-AC-6` no credential logged/committed | Delivered (`UG-T-15` audit PASS) | `execution.md` |

## 4. Files Changed (from `execution.md`)

| Area | Files |
|---|---|
| Tooling source | `tooling/src/auth.ts`, `tokens.ts`, `annotate.ts`, `capture.ts`, `assemble.ts`, `verify-structure.ts`, `pdf.ts` |
| Config | `tooling/package.json`, `tsconfig.json`, `.env.example`, `.gitignore`, `routes.config.json` |
| Template | `tooling/template/guide.html`, `guide.css`, `README.md` (placeholder + `annotations[]` contract) |
| Content | `tooling/content/intro.md`, `sections/01…06-*.md`, `glossary.json`, `NOTES.md` |
| Deliverable | `tooling/dist/reporting-tool-user-guide.pdf` |
| Spec docs amended in execution | `design.md` (`UG-DD-6`, `UG-DD-7`, `UG-DD-3` note, `dist/` location), `requirements.md` (`UG-R-2`, `UG-R-21`), `tasks.md` (`UG-T-17`–`19`) |
| Outside the spec | none (one stray `onecgiar-pr-client/package-lock.json` churn from an unrecorded commit was reverted in `1373a0f5f`) |

Approximate size: ~2,000 LOC of TypeScript/CSS (no tests), ~1,100 words of guide copy, 24 glossary entries. 24 commits on the branch tagged `[SPEC:changes/user-guide-pdf]`.

## 5. Test Evidence

No `test-report.md` — **absence accepted**. The spec is dev-only tooling with no application code; verification was executed per task instead: `tsc --noEmit`, live capture runs against production, negative-path runs of every loud-failure gate (ready selector, skeleton gate, callout selector count, structure verifier, missing screenshot, unloaded image), and the Leader's inspection of all 19 rendered pages.

## 6. Validation

No `validation-report.md` — **absence accepted**. Every task carried an independent Reviewer verdict (author ≠ auditor, models rotated on rate limits), the `UG-T-15` credential/read-only audit PASSed, and `UG-T-16` was signed off by the user on 2026-09-16 ("perfect") with the residual points below explicitly accepted.

## 7. Accepted Warnings and Follow-Ups

| Item | Disposition |
|---|---|
| Three callout chips touch neighbouring UI text (Reporting: "Where to report", "Search AoWs and KPIs"; Innovation Packages: "Open a package") | Accepted by the user; option recorded: per-callout `offset` in `CalloutSpec` |
| Chip labels print at ≈ 6–8 pt | Accepted; bump chip font in `annotate.ts` if the guide is printed |
| Production data visible in screenshots (real names in Notifications, result titles, admin session) | Accepted by the user for distribution |
| `tooling/.env` holds a live production JWT, protected only by `.gitignore` | **Delete it** once re-runs stop |
| Stale Poppins reference in `docs/ux-ui/design.md` §7 (live app uses Manrope + JetBrains Mono) | Pending item in the Kaizen entry (spec branch) |
| `tasks.md` `UG-T-9` points at a non-existent `design.md §"Section layout pattern"` | Historical; noted |
| Advisories recorded per task (OVERLAY_ATTR export done; ring style dedupe; `collisionFree` warn; markdown leak checks scoped to text; `YYYY-MM-DD` shape assert; snapshot of the CLARISA API for future diffing) | Not adopted; listed in `execution.md` |
| Budget tripwire: ~650–850 LOC / 2 rounds estimated vs ~2,000 LOC / 9 review rounds actual | Reported to the user 2026-09-16; user chose to continue |
| Two-pass page numbering (`UG-DD-5`) and in-app distribution (`UG-OQ-3`) | Out of scope; file a follow-up spec if requested |
| PR against `staging` with the repo's commit convention | Post-archive, user-driven |

## 8. Historical Notes

- The local dev database was unreachable, so the capture target was switched to production by explicit user decision (`UG-DD-6`), read-only, with a user-supplied admin token stored only in the gitignored `.env`.
- Playwright's bundled Chromium could not be downloaded from the CDN on this machine; the pipeline runs the system Chrome via `PLAYWRIGHT_CHANNEL=chrome`.
- Three tasks (`UG-T-4/5/6`) had landed in an earlier commit without execution entries or review; a retroactive Reviewer audit restored author ≠ auditor before they were marked complete.
- `fullPage` screenshots were a no-op on inner-scroll routes and produced a 186,000-px frame on the notifications virtual list; per-route viewports and a skeleton-free assertion replaced them. Headings were rejected as readiness selectors in favour of data-bearing nodes.
- The template's header comment contained nested `<!-- NN -->` markers that closed it early and rendered the contract as page text; the contract moved to `template/README.md`.
- Four worker deaths on provider rate limits (sonnet session ×2, opus weekly ×2); Implementers rotated to opus, Reviewers to fable, each rotation recorded.
- After the first HITL look the user asked for several labelled callouts per screenshot; recorded as `UG-R-21` / `UG-DD-7` and delivered as `UG-T-17`–`19` in the same run.
