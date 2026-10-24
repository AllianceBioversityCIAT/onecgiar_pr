# Proposal — Phase Management redesign

## Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/phase-management-redesign` |
| Slug | `phase-management-redesign` — derived from free-text argument ("¿Puedes rediseñar el módulo de phase management?" + HTML mockup) |
| Type | Change (UI-only redesign) |
| Approval Mode | gated |
| Author | Santiago Sanchez (requester) · drafted by Claude |
| Date | 2026-10-23 |
| Branch at proposal | `qa-development-2026-ss` |
| Depends on | none |
| Parallel-safe | yes — client-only; no shared migrations or API contracts. Touches the same folder as `changes/replicated-innovation-reminders` (reminders component markup), so do not run both at once |

## 1. Intent

Bring **Admin module → Phase management** (`/admin-module/phase-management/{reporting|innovation-package}`) onto the 2026 brand design line, following the pasted mockup: a page header, segmented module tabs, a card-based phases table, operation cards, and a restyled reminders card. **Only the module content changes. The sidebar, top bar and app shell stay exactly as they are** (user constraint).

## 2. Problem / Current Behavior

| Area | Today | File |
|---|---|---|
| Shell | Legacy SCSS tabs (`.tabs`/`.tab`, `animate__shakeX`), no page title or description | `phase-management.component.html/.scss` |
| Phases table | `app-pr-table` (PrimeNG) with SCSS `.action_button`, `.tag_container`; "Phases" title as `.setting_title`; "Add new phase" button **below** the table | `shared/components/phase-management-table/*` |
| Operations | `other-functionalities` renders a full-width banner (text + Execute button) per operation, stacked; title "Other functionalities" | `other-functionalities/*` |
| Replication confirm | `app-pr-dialog` with legacy SCSS (`lateral-bar`, `<br>` spacing, inline styles) | `massive-phase-shift/*` |
| Reminders | Already Spartan (`hlmTable`, `hlmBtn`) but 4 separate metric columns (Sent / Skipped / Failed / Unreachable) | `components/replicated-innovation-reminders/*` |

The result is visually inconsistent with the Portfolio overview / Results Center revamp: there's no page hierarchy, open and closed phases look alike, and the operations read like warnings, not actions.

## 3. Proposed Outcome

One page, top to bottom (per mockup):

1. **Page header** — breadcrumb `Admin module › Phase management`, H1 "Reporting Phases", one-line description. **Segmented tabs** on the right: Results module / IPSR module (same routes, `routerLinkActive`).
2. **Phases card** — header row: "Configured phases" + chips **`N total`** and **`1 open`** (computed from `phaseList`), with **"Add new phase"** as the header CTA (same `getFeedback()` disabling and tooltip). Table: same columns and inline edit/create behavior as today; **open phase row highlighted** with a green "Open" pill, closed phases get a neutral pill; portfolio as a chip; dates in tabular/mono figures; edit/delete as icon buttons with the existing tooltips.
3. **Phase operations** — section title + "Target phase: *Reporting 2026 (Open)*"; each replication operation becomes a **card in a 2-column grid** (icon, title, description, target, Execute button with the running state). IPSR tab shows its single card.
4. **Replication confirm dialog** — restyled (from phase → to phase, Cancel / Confirm) with the same `accept()` flow.
5. **Replicated innovation reminders card** — same data and actions; header gets the pending / unreachable summary; the 4 metric columns collapse into one **"Delivery"** cell of chips (Sent · Skipped · Failed · Unreachable).

## 4. Scope

- `phase-management.component.*` (header + segmented tabs)
- `reporting.component.html`, `innovation-package.component.html` (section composition)
- `shared/components/phase-management-table/*` (markup/styling only; **logic untouched**)
- `other-functionalities/*` and `massive-phase-shift/*` (card + dialog markup)
- `replicated-innovation-reminders.component.html` (header summary + delivery chips; no logic changes)
- New copy in `src/app/internationalization/` (DD-9)
- Spec updates for changed selectors/copy (Jest + the `phase-management-table.edit-action-tooltip.cy.ts` CT)

## 5. Non-Goals

- Sidebar, top bar, environment banner, global search, user menu (shell) — **no changes**.
- Mockup footer ("© 2026 CGIAR PRMS System…") — no app-wide footer convention exists; not added.
- Phase detail page (`reporting/:phaseId`) — separate surface; can be a follow-up.
- Any server/API change, new endpoints, new fields, or new phase rules.
- Changing reminders behavior. The mockup shows Edit date / Cancel / Send now on **Sent** rows. Those buttons stay governed by today's per-status logic (revision 2 of INC-165323).
- Table sorting/pagination behavior, Excel export, search.

## 6. Affected Users, Systems, And Specs

| Item | Impact |
|---|---|
| Platform admins / PMU (persona: Platform admin) | Visual + layout only; same capabilities |
| `PhaseManagementTableComponent` (shared) | Only consumed by the two phase-management tabs (verified via grep), so restyling it is safe |
| `changes/replicated-innovation-reminders` (active, uncommitted edits on server) | Same folder on the client; coordinate — redesign lands after its T-15 smoke or rebases onto it |
| `docs/ux-ui/design.md` §7 / DD-12 | Followed, not changed |

## 7. Visual Reference

- Source: Self-contained HTML mockup (Tailwind CDN), supplied by the user in chat on 2026-10-23.
- Location: pasted in the `/akili-propose` message. **Pending:** save it as `docs/specs/changes/phase-management-redesign/mockup/phase-management.html` so `/akili-specify` can cite it.
- Covered: Results module tab: header, phases table (5 phases, 2026 open), 2 operation cards, reminders table (2 campaigns). The IPSR tab is not drawn and is inferred from the same pattern.
- **Token translation (mockup → PRMS brand line, normative):**

| Mockup | PRMS implementation |
|---|---|
| Tailwind `indigo-600` CTAs / active tab | Violet accent gradient `brand-300 → brand-400` (DD-12) |
| Inter font | Poppins (unchanged) |
| Heroicons inline SVG | `material-icons-round` |
| `emerald` Open pill | `--pr-color-green-500` family |
| `amber` unreachable chip | `--pr-color-yellow-300` family |
| `rose` delete hover | `--pr-color-red-300` |
| `slate` greys | `text-accent-*` / secondary-derived (not `text-neutral-*`, which is violet-tinted) |
| Table header `bg-slate-50` | Keep `app-pr-table` header chrome as the rest of the redesign uses (navy-carbon); confirm in specify |
| `animate-ping` / `animate-pulse` dots | Dropped or static (motion budget + `prefers-reduced-motion`) |

## 8. Requirement Delta Preview

### ADDED

- Page header: breadcrumb, title, description; segmented module tabs.
- Phases card header chips: total phases and open-phase count.
- Open-phase row highlight.
- Operations rendered as a card grid with a "Target phase" label.
- Reminders header summary line and grouped delivery chips.

### MODIFIED

- "Add new phase" moves from below the table to the card header (same enable/disable rules and feedback text).
- Status, portfolio, and actions cells restyled (pills, chips, icon buttons); edit/delete tooltips preserved.
- "Other functionalities" → "Phase operations". Replication confirm dialog restyled.
- Reminders: 4 metric columns → 1 delivery column (same numbers, same `data-testid`s preserved or remapped in specs).

### REMOVED

- Legacy SCSS for tabs/table/banners (`.tabs`, `.action_button`, `.tag_container`, `.option`, `lateral-bar`, `<br>` spacing), replaced by Tailwind utilities.

## 9. Approach Options

| Option | What | Pros | Cons |
|---|---|---|---|
| **A. Re-skin in place (recommended)** | Keep the component tree and all TS logic. Rewrite templates with Tailwind + Spartan (`hlmBtn`, `hlmBadge`, `hlmCard`-style section, `hlmTable` or `app-pr-table` restyled) | Smallest diff; zero behavior risk; existing Jest logic specs stay valid | Inline-edit cells still use `app-pr-select`/`app-pr-input` (fine, already redesigned fields) |
| B. Migrate phases table to Spartan `hlmTable` | Replace `app-pr-table` with a native `hlmTable` like the reminders card | Visual parity with reminders; no PrimeNG table | Loses built-in sort/paginator; re-implement or drop; larger test churn |
| C. Full rebuild (standalone + signals, new services) | New page component, signal state for phases | Modern code | Behavior-risky rewrite of create/edit/delete rules; out of proportion for a visual ask |

## 10. Recommended Approach

**Option A.** It is a visual change, so the TS logic stays as it is: create/edit/delete rules, `getFeedback()`, `can_be_deleted`, previous-phase constraints and replication calls. Only templates and styles change. Use Spartan primitives where they exist (memory: visual changes use Spartan) and Tailwind brand tokens for the rest. The header chips (`total`, `open`) are derived from the existing `phaseList`, so no new data is needed. Whether to keep `app-pr-table` or move to `hlmTable` is decided in specify (Option B is a fallback, not the default).

## 11. Risks, Dependencies, And Open Questions

| # | Item | Mitigation / question |
|---|---|---|
| R-1 | Renamed copy/selectors break Jest + Cypress CT specs (memory: a renamed key once broke 4 specs) | Keep `data-testid`s; run `--findRelatedTests` on touched files before push; CT in batch |
| R-2 | Conflict with in-flight `replicated-innovation-reminders` work in the same folder | Sequence after its smoke, or touch only the template's header/metrics block |
| R-3 | Mockup's indigo/Inter palette contradicts DD-12 | Token translation table above is normative |
| R-4 | Mockup shows reminder actions on Sent rows | Keep current status gating (Non-Goal) |
| R-5 | Browser checks hit shared prdb + prod mailer | Visual verification only; never click Execute / Send now / Save |
| OQ-1 | Table header: navy-carbon chrome (current redesign) or light slate (mockup)? | Default: navy-carbon, for consistency |
| OQ-2 | Should the phase detail page (`:phaseId`) be included now or as a follow-up? | Default: follow-up |
| OQ-3 | Mockup title "Reporting Phases" on the IPSR tab too, or "IPSR Phases"? | Default: title changes per tab |

## 12. Success Criteria

- Both tabs match the mockup's layout using PRMS brand tokens. No sidebar or top-bar diff.
- Every existing capability works unchanged: add/create, edit, delete (incl. disabled reasons), open-phase link, replications (incl. running state), and reminders preview / edit / cancel / send.
- Related Jest specs and the phase-table CT pass; ESLint is clean on touched files.
- No new SCSS class blocks for layout/color/typography (Tailwind-first rule).
- Keyboard focus visible on tabs/buttons; status is not conveyed by color alone (pill text).

## 13. Next Step

```text
/akili-specify changes/phase-management-redesign
```
