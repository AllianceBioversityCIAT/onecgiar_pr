## Context

RFR shell loads `DashboardLabComponent` at `/result-framework-reporting/home` (alias `dashboard-lab`). Planned / Emerging / Centers are inline `<article>` blocks in one template (`data-guide="planned|emerging|centers"`). Sidebar children today are Science Programs via `?sp=`.

User constraint: the new grouping must **not** be another collapsible — only a subtle gray label at the same visual level as existing nested group labels (e.g. “My programs”).

## Goals / Non-Goals

**Goals**

- Conceptual label + four action links under expanded RFR.
- Dashboard = full current bento.
- Three section routes/views = that section only (same data/actions as today).
- Preserve SP selection (`?sp=`) when switching section links.
- When changing SP, stay on the current section route if possible.

**Non-Goals**

- Extracting each section into large standalone feature modules (optional later).
- Changing guided-creation / AoW detail flows.
- Renaming or removing the top-level RFR collapsible parent.
- Backend work.

## Decisions

1. **View mode via route `data.rfrView`** on sibling paths that all lazy-load `DashboardLabComponent`:
   - `home` (and existing `dashboard-lab`) → `dashboard`
   - `planned-toc` → `planned`
   - `emerging` → `emerging`
   - `centers` → `centers`  
   **Why over `?view=`:** cleaner active-link matching; SP stays in query params only.  
   **Alternative considered:** query-only `view` — rejected because SP links already own the query string and would fight merge rules.

2. **No template extraction in v1** — `@if (rfrView() === 'dashboard' || rfrView() === 'planned')` around existing articles. Fast, low-risk; extract later if files grow.

3. **Subtle label** — static text (not a button), uppercase small tracking, `text-white/40` (or sidebar-foreground muted) matching dark premium sidebar; same padding as program group labels, **no chevron**.

4. **SP links** — navigate to the **current** RFR section path (or default `home`) with `{ sp: id }` so switching program does not bounce users back to Dashboard unexpectedly.

5. **Collapsed flyout** — list the four section links first; keep program lists below or secondary so icon-rail users can reach sections.

## Risks / Trade-offs

- [Duplicated route entries sharing one component] → Mitigation: single lazy import path; `data.rfrView` only.
- [Section-only layouts feel sparse without hero] → Accept for v1; user asked for “info de cada uno” as shown in the cards. Can add a thin SP chip later.
- [AoW deep view still uses same component] → `rfrView` only applies when not in AoW detail; ignore filter there.

## Migration Plan

- Ship with existing `home` as Dashboard (no redirect required).
- Old bookmarks to `/home?sp=` keep working as Dashboard.
- Rollback = remove four links + routes; component filter is inert if data missing.

## Open Questions

- None blocking; ticket id optional on this branch.
