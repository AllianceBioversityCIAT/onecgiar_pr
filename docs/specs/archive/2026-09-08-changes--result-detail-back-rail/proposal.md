# Proposal — Relocate "Back to results" to the Result Sections Sidebar Rail

Relocate the **Back to results** navigation anchor from the top of the main content canvas (`app-result-header`) to the top of the secondary navigation rail (`app-result-sections-sidebar`). This reclaims ~32px of vertical canvas space, aligns the title with the top baseline, and provides persistent, non-scrolling exit navigation across all form sections.

## Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/result-detail-back-rail` |
| Slug | `result-detail-back-rail` |
| Type | Change |
| Approval Mode | gated |
| Depth | Lite / Standard |
| Owner | Results & UX/UI Core Team |
| Baseline | `US-S1` (`docs/prd.md`); Result Detail Layout (`docs/ux-ui/design.md` §4); `W1` (`docs/trd/trd.md`) |
| Related specs | `changes/result-submitter-back-link`, `bugfix/smart-back-button` |

---

## 1. Intent

Streamline the Result Detail ergonomics by moving the global "way back" navigation out of the scrolling form header and into the fixed secondary sidebar rail. This accomplishes two user-centered goals:
1. **Vertical Real Estate Gain:** Removes the standalone navigation line above the result title, bringing the result title, identity strip, and form cards ~32px closer to the top fold.
2. **Persistent Navigation (Fitts's Law):** Since the sidebar rail (`app-result-sections-sidebar`) has independent height (`h-full overflow-y-auto`) and does not scroll with the form canvas (`rd_scroll`), the back navigation remains permanently accessible regardless of scroll depth in long forms.

---

## 2. Problem / Current Behavior

1. **Canvas Space Fragmentation:** In `app-result-header`, `< Back to results` occupies its own row directly above `<h1>{{ title }}</h1>`. It consumes ~32px of vertical height while only taking ~120px horizontally, leaving hundreds of pixels of blank horizontal space.
2. **Loss of Navigation during Form Editing:** When editing long form sections (e.g. *Contributors & partners*, *Evidence*, or *Innovation Dev info*), scrolling through the form moves `Back to results` completely off-screen. Users must scroll all the way back to the top of the canvas to exit back to their board or catalog.
3. **Context Mixing:** `app-result-header` currently mixes global navigation (`Back to results`), entity title, metadata popover (`ⓘ`), document exports (`PDF`), and overflow menus (`⋮`). Moving the navigation anchor to the rail creates a cleaner separation of concerns:
   - **Sidebar Rail (Level 2 Context):** Navigation out to parent catalog + Result code/type/status + Section navigation + Progress & submission.
   - **Content Canvas (Level 3 Context):** Result title + Section form editing & actions.

---

## 3. Proposed Outcome

```text
BEFORE (Header Crowded):
┌─────────────────────────┬─────────────────────────────────────────────────────────────────┐
│ SIDEBAR (Riel 240px)    │ LIENZO DE CONTENIDO                                            │
│                         │                                                                 │
│ Result code #8959       │  < Back to results      (Ocupa ~32px alto con ~800px vacíos)   │
│ INNOVATION DEVELOPMENT  │                                                                 │
│ [EDITING]               │  TEST INNOVATION JC (i)                       [PDF v] [...]     │
│ ──────────────────────  │  Output | W1/W2 | Submitter SP02...                             │
└─────────────────────────┴─────────────────────────────────────────────────────────────────┘

AFTER (Clean & Ergonomic):
┌─────────────────────────┬─────────────────────────────────────────────────────────────────┐
│ SIDEBAR (Riel 240px)    │ LIENZO DE CONTENIDO (¡Gana ~32px de fold!)                      │
│                         │                                                                 │
│  ← Back to results      │  TEST INNOVATION JC (i)                       [PDF v] [...]     │
│ ──────────────────────  │  Output | W1/W2 | Submitter SP02...                             │
│ Result code #8959       │  Phases: [Reporting 2026 Open]                                  │
│ INNOVATION DEVELOPMENT  │                                                                 │
│ [EDITING]               │  ┌───────────────────────────────────────────────────────────┐  │
│ ──────────────────────  │  │ 1. General information (Formulario)                       │  │
└─────────────────────────┴──┴───────────────────────────────────────────────────────────┴──┘
```

1. **Top-of-Rail Anchor:** Place the back navigation link at the very top of `app-result-sections-sidebar`, styled as a comfortable ghost button (`px-2 py-1.5 -ml-2 rounded-lg text-[13px] font-medium text-[var(--pr-text-secondary)] hover:bg-[var(--pr-color-primary-50)] hover:text-[var(--pr-color-primary-400)] transition-colors`).
2. **Origin-Aware Smart Target:** Integrate `SmartNavigationService` in `ResultSectionsSidebarComponent` so `backLink`, `backQueryParams`, and `backTitle` correctly return users to their arrival origin (e.g. *My Results* board, *Programme Results* tab, or *Results Center* catalog).
3. **Elevated Content Baseline:** Remove the `<a data-testid="result-detail-back-link">` from `app-result-header`. The title `<h1>` and export actions will sit cleanly at the top of the content canvas.
4. **Divider Separation:** Add a clean horizontal separator between the Back navigation and the Result Code block in the sidebar to maintain crisp Information Architecture.

---

## 4. Scope

- **Client Components:**
  - `onecgiar-pr-client/src/app/pages/results/pages/result-detail/components/result-sections-sidebar/result-sections-sidebar.component.html`
  - `onecgiar-pr-client/src/app/pages/results/pages/result-detail/components/result-sections-sidebar/result-sections-sidebar.component.ts`
  - `onecgiar-pr-client/src/app/pages/results/pages/result-detail/components/result-header/result-header.component.html`
  - `onecgiar-pr-client/src/app/pages/results/pages/result-detail/components/result-header/result-header.component.ts`
- **Testing:**
  - `result-sections-sidebar.component.spec.ts`: Add test cases verifying `result-detail-back-link` presence, destination, origin-aware titles, and query parameters.
  - `result-header.component.spec.ts`: Update tests to verify header renders without the legacy back link and starts with the title/actions row.
- **Design System / Documentation:**
  - Update `docs/ux-ui/design.md` §4 (Result Detail Layout) to reflect the new navigation rail anchor pattern.

---

## 5. Non-Goals

- Changing the destination logic or URL resolving rules in `SmartNavigationService` (behavior is preserved 100%).
- Modifying the dark global application sidebar.
- Changing mobile breakpoint drawer behavior (the sidebar is already the secondary drawer host).
- Modifying backend APIs or database schemas.

---

## 6. Affected Users & Personas

| Persona | Impact |
|---|---|
| **Result Submitter** | Gains vertical space for form editing; can exit to results list/board at any time without scrolling to the top. |
| **QA Reviewer** | Faster review navigation; persistent exit anchor when inspecting multi-section submissions. |

---

## 7. Next Steps

Upon approval, run `/akili-specify changes/result-detail-back-rail` to generate:
- `requirements.md` (acceptance criteria `RDBR-AC-*`)
- `design.md` (exact token specs and layout geometry)
- `tasks.md` (atomic execution tasks)
