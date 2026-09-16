# Kaizen Entry — bilateral/ai-processing-feedback

## Document Control

| Field | Value |
|---|---|
| Spec Path | `bilateral/ai-processing-feedback` |
| Date | 2026-09-15 |
| Branch | qa-development-2026 |
| Archive Run | 1 |
| Approval Mode | pre-approved |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 10 | tasks.md |
| Reviewer FAIL rework attempts | 3 (T-3 attempt 1, T-6 attempt 1, T-8 attempt 1) | execution.md |
| HALTs / FATAL_FAILs | 0 | execution.md |
| Pivots | 1 (APF-T-9 Option A resolution) | execution.md |
| PRODUCT_BUGs | 0 | execution.md |
| Judgment-day severe findings | 0 | judgment.md |
| Validation FAIL / WARN | 0 / 0 | archive-summary.md |
| Provider quota interrupts | 1 (Sonnet session quota at 11:53) | execution.md |

## Lessons

### L1 — Pre-existing component responsive properties must bound test gates
- **Root Cause:** The spec gate in D7 initially required `nav.scrollWidth <= clientWidth` at 375px for the header tab strip when the chip was mounted. In reality, the pre-existing tab strip was designed as a swipeable `overflow-x-auto` container and already had `scrollWidth = 468px > 375px` without the chip. Asserting zero overflow on the container blocked T-9 until Pivot Option A introduced dual-slot placement.
- **Evidence:** `execution.md` Pivot Record `APF-T-9`, `bilateral-page-header.component.html`, `bilateral-page-header.cy.ts`.
- **Classification:** Methodology.
- **Action:** Before authoring layout test gates that assert zero horizontal container overflow (`scrollWidth <= clientWidth`), measure the baseline scroll width of the pre-existing container. If the container is inherently a swipe strip, gate on element visibility in the viewport or decouple placement.

### L2 — Base Tailwind classes preserve legacy unit test selectors
- **Root Cause:** In Angular / Tailwind projects, legacy unit tests frequently assert on exact utility class substrings (e.g. `fixture.nativeElement.querySelector('.h-\\[64px\\]')`). When making containers responsive with `min-[640px]:` or `max-[639px]:`, replacing `.h-[64px]` breaks existing tests even if the visual behavior is identical.
- **Evidence:** `bilateral-page-header.component.spec.ts:115` and `bilateral-page-header.component.html:48`.
- **Classification:** Product.
- **Action:** Retain the base un-prefixed utility class alongside responsive breakpoint variants (e.g. `class="relative flex h-[64px] min-[640px]:h-[64px] max-[639px]:h-auto ..."`).

## Noted, not a lesson

- Dual-slot placement (Option A) provides a clean mobile UX: the "AI job running" chip sits comfortably in the identity row beneath the center acronym on mobile screens, and moves to the tab strip end slot on viewports >= 640px.
- The TypeORM cron sweeper effectively decouples terminal failure detection from the client, preventing the client from falsely declaring server-side mining jobs as failed.

## Pending Items

### P1

| Field | Value |
|---|---|
| Kind | guide-sync |
| Target | `onecgiar-pr-client/src/app/pages/bilateral/CLAUDE.md` |
| Edit | Add entry for `<app-ai-processing-panel>` in component catalog citing its input-driven and single-surface invariants. |
| Severity | Low |
| Status | pending |

### P2

| Field | Value |
|---|---|
| Kind | trd-adr |
| Target | `docs/trd/trd.md` |
| Edit | Record async TypeORM sweeper cron pattern with optimistic conditional updates (`WHERE status IN (...)`) and dual attempt/stall timeout windows. |
| Severity | Medium |
| Status | pending |
