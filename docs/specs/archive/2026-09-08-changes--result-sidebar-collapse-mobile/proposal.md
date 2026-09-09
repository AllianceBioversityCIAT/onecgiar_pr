# Proposal: Auto-Collapse Nav Sidebar on Small Screens When Entering a Result

## 1. Document Control

| Field | Value |
|---|---|
| Slug | `result-sidebar-collapse-mobile` — derived from free-text argument |
| Spec Path | `docs/specs/changes/result-sidebar-collapse-mobile/` |
| Type | Change |
| Approval Mode | gated |
| Author input | Screenshot of `result-detail` page + free-text request (Spanish) |
| Date | 2026-09-08 |

## 2. Intent

When a user opens a result on a small screen, the global reporting nav sidebar (`ReportingNavSidebarComponent`) should start **collapsed**, freeing horizontal space for the result-detail editor. Additionally, evaluate folding a "you can expand/collapse this sidebar" step into the existing onboarding tour so users discover the control.

## 3. Problem / Current Behavior

- The nav sidebar's collapsed/expanded state lives centrally in `HlmSidebarService` (`onecgiar-pr-client/src/app/spartan/sidebar/src/lib/hlm-sidebar.service.ts`) as a `state()` signal (`'expanded' | 'collapsed'`), with a separate `_isMobile` signal driven by a `matchMedia`/resize listener.
- That service already **detects** small screens but does not act on the detection — it never forces `state()` to `'collapsed'` on route entry. The sidebar simply keeps whatever state it was last in (default `'expanded'`).
- On the result-detail route (`pages/results/pages/result-detail`), the sidebar's screen share leaves less room for the multi-section editor exactly where it matters most (screenshot: viewport ~1900px in the reference image but the pattern reproduces worse under the design system's own `md` (900px) breakpoint per `docs/ux-ui/design.md` §9).
- The recently shipped onboarding tour (`driver.js` via `ReportingGuideService`, `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/services/reporting-guide.service.ts`) is scoped to the **science-programs dashboard** (`dashboard-lab`), not to `result-detail`. No existing `data-guide` step targets the sidebar toggle button (`[lucidePanelLeft]` icon, `reporting-nav-sidebar.component.html` ~L61-64) anywhere in the app.

## 4. Proposed Outcome

1. On first entry to a result (`result-detail` route) while the viewport is at or below the design system's mobile/tablet breakpoint, the nav sidebar renders collapsed by default. A user who manually re-expands it keeps that choice for the remainder of the session on that result (no fighting the user).
2. Users discover the expand/collapse control through guided UI — either a new short step in an existing/adjacent tour, or a lightweight one-time coach-mark scoped to `result-detail`, whichever the design pass in `/akili-specify` determines fits the tour's architecture best (open question, see §12).

## 5. Scope

- `ReportingNavSidebarComponent` / `HlmSidebarService` interaction: add a "collapse on enter under breakpoint" behavior triggered from the `result-detail` route.
- Reuse the **existing** `_isMobile` detection in `HlmSidebarService` — do not duplicate breakpoint logic in the result-detail component.
- Add `data-guide="sidebar-toggle"` to the toggle button and one new tour step describing expand/collapse.
- Align the breakpoint used with `docs/ux-ui/design.md` §9 (`md` = 900px) rather than inventing a new one.

## 6. Non-Goals

- No redesign of the sidebar itself (icons, width, content).
- No change to the *other* nav-sidebar behaviors (pinned programs, group expand/collapse).
- Not extending auto-collapse to every route app-wide — scoped to `result-detail` for now; a broader "collapse by default on any route below `md`" policy is a separate, larger change and out of scope here.
- Not building a new tour engine or a full result-detail tour — only the smallest addition needed to teach the toggle.

## 7. Affected Users, Systems, And Specs

| Area | File(s) |
|---|---|
| Nav sidebar | `onecgiar-pr-client/src/app/shared/components/reporting-nav-sidebar/reporting-nav-sidebar.component.{ts,html,scss}` |
| Sidebar state service | `onecgiar-pr-client/src/app/spartan/sidebar/src/lib/hlm-sidebar.service.ts` |
| Result detail route/component | `onecgiar-pr-client/src/app/pages/results/pages/result-detail/**` |
| Onboarding tour | `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/services/reporting-guide.service.ts` |
| UX/UI baseline | `docs/ux-ui/design.md` §9 Responsive Behavior (breakpoints) |
| Affected users | Submitters/reviewers editing results on tablet or small laptop windows |

No related specs exist yet under `docs/specs/` for the sidebar or the tour (this is the first proposal touching either).

## 8. Visual Reference

- Source: None (screenshot provided is a bug/context reference, not a mockup)
- Location: user-provided screenshot of `localhost:4200/result/result-detail/9043/general-information` showing the expanded sidebar at result-entry
- Notes: no new visual design is needed — this is a default-state and discoverability change, not a new UI surface. `/akili-specify` can skip the mockup step unless a coach-mark visual is desired.

## 9. Requirement Delta Preview

### ADDED Requirements

- Nav sidebar defaults to collapsed on first entry to a result when viewport ≤ `md` (900px).
- A tour step (or equivalent coach-mark) explains the sidebar can be expanded/collapsed, surfaced at or near result entry.

### MODIFIED Requirements

- `HlmSidebarService` / `ReportingNavSidebarComponent` interaction gains a route-aware "collapse on enter" trigger it does not have today (currently state only changes on explicit user click).

### REMOVED Requirements

- None.

## 10. Approach Options

| Option | Description | Trade-off |
|---|---|---|
| **A. Result-detail-local check (recommended)** | On `result-detail` init, read `sidebarSE.isMobile()`; if true and this is the first load for the session/result, call `sidebarSE.toggleSidebar()` (or set `state.set('collapsed')`) once. | Smallest footprint, no shared-service API change, easy to scope/revert. Slight duplication risk if a second page later needs the same pattern. |
| **B. Service-level route policy** | Extend `HlmSidebarService` with a small "auto-collapse route list" it consults on `NavigationEnd`, `result-detail` being the first entry. | Scales cleanly to future pages without repeating the pattern; more invasive to a shared, well-tested service used app-wide. |
| **C. CSS-only breakpoint override** | Force `state` via a pure CSS/host-binding trick tied to viewport width, no TS logic. | Fights the existing signal-based architecture (`HlmSidebarService` already owns state in TS); brittle, not recommended. |

**Recommended: Option A.** It reuses the breakpoint detection that already exists in `HlmSidebarService`, touches only the one route that has the actual problem today, and keeps the shared sidebar service's surface area unchanged — the smallest safe path. If a second page needs the same behavior later, promoting the logic to Option B becomes a trivial, well-justified follow-up.

## 11. Risks, Dependencies, And Open Questions

- **Risk:** "First entry" must be defined precisely (per app load? per result id? per session?) so the auto-collapse doesn't fight a user who deliberately re-expands and then navigates between sections within the same result. Recommend: trigger once per `result-detail` route activation (i.e., on `resultId` change), not on every section-tab navigation within the same result.
- **Open question:** Should the tour step live in the existing `ReportingGuideService` (dashboard-scoped today) or does `result-detail` need its own minimal guide entry point? The dashboard tour and result-detail are different routes/components — a step added to the dashboard tour won't be seen by someone who deep-links straight into a result.
- **Open question:** Coach-mark vs. formal tour step — a full driver.js step may be heavier than needed for a single hint; a one-time dismissible tooltip on the toggle button (localStorage-flagged, similar to `pr.tour.sp.completed`) is a lighter alternative worth deciding in `/akili-specify`.
- **Dependency:** None on other in-flight specs.
- **Parallel-safe:** Not chunked — small enough to remain one proposal; the sidebar-default-state and tour-discoverability pieces share the same toggle button and are easiest to specify together.

## 12. Success Criteria

- On a viewport ≤ 900px, opening any result lands with the nav sidebar collapsed by default.
- Manually re-expanding the sidebar during that session/result is respected (not immediately re-collapsed by any other trigger).
- A user who has not seen the hint before is shown, once, that the sidebar can be toggled — via tour step or coach-mark, per the `/akili-specify` decision.
- No regression to sidebar behavior on desktop viewports (> 900px) or on other routes.

## 13. Next Step

```text
/akili-specify docs/specs/changes/result-sidebar-collapse-mobile
```
