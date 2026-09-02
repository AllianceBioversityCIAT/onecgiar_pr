# Proposal — Stop the site footer from covering Result Detail actions

**Decision:** on Result Detail, retire the leftover floating CGIAR footer. That page already has its own floor (`section-bottom-bar`). The two layers share the viewport bottom; on a narrow window the footer wins and covers Back / Next / Sync / Save draft.

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/result-detail-footer-overlap` |
| Slug | `result-detail-footer-overlap` — user argument (bare kebab-case → `changes/<name>`) |
| Type | **Bug** |
| Approval Mode | `gated` |
| Date | 2026-09-02 |
| Depends on | none |
| Parallel-safe | **yes** — Result Detail chrome + `app-footer` route flag only; no API, no shared contracts |
| Source | QA screenshots (no Jira ticket provided) |
| Related | `quick/tawk-to-widget-mobile` (same bottom edge); `result-detail/CLAUDE.md` layout contract |
| Baseline | `US-S1`, `US-S5` (`docs/prd.md`); tablet-usable (`docs/ux-ui/design.md` §9); keyboard reachability (`docs/ux-ui/design.md` §10); `W1` result lifecycle (`docs/trd/trd.md`) |

## 2. Intent

A result submitter on a tablet or a narrowed laptop must keep **Back**, **Next**, **Sync**, and **Save draft** fully visible and clickable — the same strip they already see on a wide screen.

## 3. Problem / Current Behavior

| Viewport | What the user sees |
|---|---|
| Wide laptop (`lg` 1280+) | White action strip: Back · Next · Section N of M · status · Sync · Save draft. Site footer is mostly off-screen. |
| Narrow / tablet (`md` 900 and below, or a narrowed desktop window) | The dark CGIAR footer (logo + Contact Us / Terms / License / Glossary) sits on top of that strip. Sync may peek; Save draft and the nav pair are covered. |

This blocks **US-S5** (explicit save) and section-to-section navigation inside **US-S1**. `docs/ux-ui/design.md` §9 requires every screen to stay usable on tablet; §10 requires every action to stay reachable by pointer and keyboard.

## 4. Proposed Outcome

On every Result Detail section, at tablet width and up:

- The white action strip matches the wide-screen arrangement: nothing from the site footer, the 400px hover trap, or the chat bubble covers those controls.
- Hovering near the bottom-right does **not** slide a second bar over Save draft.
- Contact Us / legal links remain available from pages that still show the site footer (Results list, home, etc.).

## 5. Scope

| Area | What changes |
|---|---|
| `shared/components/footer/footer.component.ts` | `/result/result-detail/` must stop using `floating: true` (and stop mounting the footer on that route). |
| `shared/components/footer/footer.component.scss` | Only if a leftover overlay still paints over the strip after the route change. |
| `section-bottom-bar` | Only a stacking/wrap guard if specify proves the bar still collides after the footer is gone. |
| Tests | Footer route-list spec + a Result Detail regression that the action testids stay unobstructed at `md`. |

## 6. Non-Goals

- No redesign of the action strip (new labels, new buttons, new tokens).
- No change to footer behavior on Results list, IPSR, Type-One Report, QA, admin, or login.
- No Tawk product change beyond what `quick/tawk-to-widget-mobile` already shipped (`yOffset: 130`).
- No phone (`xs` / `sm`) layout — Result Detail stays a heavy editor; `design.md` §9 allows a “use a larger screen” stance below `sm`.
- No API, auth, or payload change.

## 7. Affected Users, Systems, And Specs

| Who / what | Impact |
|---|---|
| Result submitters | Can save and move sections on tablet / narrowed laptop. |
| QA reviewers opening Result Detail | Same chrome. |
| `FooterComponent` | One route drops out of `routes`. |
| `SectionBottomBarComponent` | Stays the floor of Result Detail; IPSR / result creator still use their own save chrome and are out of scope. |
| Tawk bubble | Stays bottom-right; must not become the new cover. |

## 8. Visual Reference

- Source: QA screenshots (user-provided, 2026-09-02)
- Location: `docs/specs/changes/result-detail-footer-overlap/visual/`
  - `narrow-footer-overlap.png` — broken: Geographic location, dark CGIAR footer fully visible over the action area; only Sync remains readable
  - `wide-action-bar-correct.jpg` — target: General information, full white strip (Back, Next, Section 1 of 5, Section complete, Sync, Save draft)
- Notes: no Figma. The wide screenshot **is** the visual target — restore that strip on narrow viewports, do not invent a new pattern. No generated mockup unless specify needs a wrap-state sketch.

## 9. Bug Diagnosis

### Observed Symptom

Inside a result, on a small/narrow screen, the site footer paints over the section action buttons. On a large screen the same buttons are a single unobstructed white strip.

### Reproduction Steps

1. Sign in and open any Result Detail section (e.g. General information or Geographic location) on `/result/result-detail/:id`.
2. Set the viewport to tablet / narrowed desktop (at or below `md` 900, or a ~1100px window with the 260px sidebar open).
3. Scroll the form so the action strip is at the bottom of the viewport.
4. Move the pointer through the bottom-right (Sync / Save draft / chat bubble).
5. **Actual:** the dark CGIAR footer slides to `bottom: 0` and covers the strip. **Expected:** the strip from `wide-action-bar-correct.jpg` stays fully visible and clickable.

### Root Cause (confirmed)

This is a leftover overlay, not a missing media query.

Result Detail is a viewport-locked page (`:host { position: absolute; inset: 0; overflow: hidden }`). The document does not scroll, so an in-flow footer cannot sit under the form. Historically the site footer was therefore mounted as a **hover-to-reveal overlay** on this route:

```14:22:onecgiar-pr-client/src/app/shared/components/footer/footer.component.ts
    { path: '/result/results-outlet/results-list' },
    { path: '/result/result-detail/', floating: true },
    { path: '/type-one-report', floating: true },
```

```61:91:onecgiar-pr-client/src/app/shared/components/footer/footer.component.scss
.floating {
  position: fixed;
  bottom: -100px;
  z-index: 10;
  &:hover { bottom: 0px; }
}
.footer-blocker {
  position: fixed;
  right: 0;
  bottom: 0;
  width: 400px;
  height: 20px;
  z-index: 11;
}
```

The page later grew a real floor: `section-bottom-bar` teleports into `.rd_bar_slot`, host `z-[6]`, `flex-wrap`, 40px side padding. That strip now occupies the same viewport edge the overlay was designed to peek through.

| Layer | Position | z-index | Role |
|---|---|---|---|
| Action strip | column floor = viewport bottom | 6 | Back / Next / Sync / Save draft |
| Floating footer | `fixed; bottom: -100px` → `0` on hover | 10 | CGIAR legal bar |
| Footer-blocker | `fixed; right:0; bottom:0; 400×20` | 11 | Hover trap so the footer can be reached |
| Tawk | bottom-right, `yOffset: 130` | widget | Chat |

The footer always paints above the buttons. On a wide screen the 400px trap is a corner, so Back / Next stay usable. On a narrow content column that trap covers most of the action row; hover (or the chat bubble sitting in the same corner) expands the footer to `bottom: 0`. The QA narrow screenshot shows the **expanded** footer (logo + all four links), which matches `bottom: 0`, not the 15px peek.

`flex-wrap` on the strip is an amplifier, not the cause: a two-row bar puts more controls into the trap. Removing wrap without removing the overlay would still leave Save draft under a `z-index: 10` bar.

### Impact & Scope

- **In scope:** every Result Detail section that mounts `app-section-bottom-bar` (General information, Contributors, Geography, type pages, Evidence, …).
- **Out of blast radius:** IPSR does not mount this bar; its footer route is not `floating`. Results list uses an in-flow footer. No data, API, or save-logic impact — display/stacking only.
- **A11y:** a covered control fails pointer **and** keyboard targeting (`design.md` §10).
- **Font scale (`--pr-font-scale` / `zoom`):** enlarges the same collision; fix the stacking, do not special-case zoom.

### Fix Strategy

Smallest safe correction: **stop showing the floating site footer on `/result/result-detail/`**. The hover overlay existed to compensate for a page that had no floor; the floor now exists. That is a route-list / mount change, not a cosmetic one-liner — it changes when a global component appears — so this stays **`/akili-specify` (Lite) in Bug Mode** with a mandatory regression test (red: footer still floats / covers the strip at `md`; green: strip testids remain unobstructed).

## 10. Approach Options

| Option | What it does | Trade-off |
|---|---|---|
| **A — Unmount the floating footer on Result Detail (recommended)** | Remove `{ path: '/result/result-detail/', floating: true }` (or otherwise skip the footer on that URL). The 400px blocker is `*ngIf="isFloating"` and dies with it. | Smallest. Legal / Contact Us leave this page; they stay on Results list and other routes. |
| B — Keep a tiny footer handle | Park the footer fully off-screen; replace the 400px trap with a small explicit tab; raise the action strip above it. | Preserves legal links on the page. More CSS, two-layer chrome, easy to regress. |
| C — Only restyle the action strip (`flex-nowrap`, less padding) | Makes the row thinner so wrap is less likely. | Does **not** fix `z-index: 10` over `z-[6]`. Symptom patch. |

## 11. Recommended Approach

**Option A.** The overlay is leftover from the old floating Save FAB. Result Detail now has a dedicated floor; a second fixed bar on the same edge is the bug. If product later requires legal links on this page, Option B can be a follow-up — it is not needed to restore the wide-screen strip.

Specify should still add a **guard assertion**: after the footer is gone, Back / Next / Sync / Save draft stay clickable at `md` and are not covered by Tawk. If wrap alone still hides a control, add a tight `flex-nowrap` / padding tweak in the same spec — do not open a second change.

## 12. Risks, Dependencies, And Open Questions

| Kind | Detail |
|---|---|
| Risk | Someone expects Contact Us / Terms on every Result Detail URL. Mitigation: those links stay on Results list and the Contact Us dialog remains in the app shell. |
| Risk | Tawk (`yOffset: 130`) still clips a corner of Save draft after the footer is gone. Guard in the regression; do not retune Tawk unless the guard fails. |
| Dependency | None beyond the existing footer route list and the Result Detail slot. |
| Open | No Jira id. Add one in specify if QA files a ticket. |
| Open | Confirm Option A (hide footer here) vs Option B (keep a handle) before specify locks requirements. **Default in this proposal: A.** |

## 13. Success Criteria

- At `md` (900px) and at a narrowed ~1100px desktop window, Result Detail shows the wide-screen action strip; the dark CGIAR footer does not cover it.
- Hovering the bottom-right does not slide a second bar over Sync / Save draft.
- `[data-testid="section-bottom-bar-back"]`, `-next`, `-save`, and the Sync slot remain enabled and clickable.
- Footer behavior on Results list, IPSR, Type-One Report, QA, admin, and login is unchanged.
- Regression test fails while the footer still floats on `/result/result-detail/`, and passes after the route is removed.

## 14. Next Step

```text
/akili-specify changes/result-detail-footer-overlap
```

Bug Mode — Lite. Convert the confirmed leftover-overlay cause into a fix plan and a mandatory regression test (red before the footer is unmounted on this route, green after).
