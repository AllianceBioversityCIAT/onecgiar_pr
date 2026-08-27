# Module Spec — `requirements.md`

**Depth: Lite.** Copy-only, additive UI change to an already-implemented row. Sections kept to what a Lite spec needs; boilerplate skipped per `docs/specs/general-setup/requirements.md`.

## 1. Module / Feature

- **Module:** `results`
- **Sub-feature:** `intermediate-outcome-aow-visibility/target-tooltip`
- **Owner:** santiago.sanchez@cgiar.org
- **Status:** draft
- **Ticket(s):** none (chat-originated; see `proposal.md`)

## 2. Context

The Reporting tab (`entity-details/:program?tocView=aows`) renders Intermediate Outcomes as one program-level card (`reporting-aow-table.component.html`, `dashboard-lab.component.ts` `reportingGroups()` — a deliberate design decision, not a bug: IOs are cross-cutting and are never scoped to a single AoW). Each row's Target figure gives no hint of that. Confirmed against `docs/prd.md` — no AoW-specific story exists there; this is a clarity fix, not new capability, so it maps loosely to **G2 (data quality / clarity)**. No `docs/ux-ui/design.md` screen documents this card yet (it postdates that doc); `docs/ux-ui/design.md` §10 (Accessibility) still applies to the new tooltip trigger.

## 3. In Scope / Out of Scope

**In scope:**
- a tooltip on the Target figure of each row inside the `intermediate` bucket card, in the `grouped` view of `reporting-aow-table` (original scope, shipped 2026-08-26).
- **Added 2026-08-26 (scope amendment, user-driven, screenshot-confirmed):** the same tooltip on the Target figure of a row inside an `aow` bucket card's **Outcomes band** (`__tier === 'outcome'`), but **only** when that row's indicator is a cross-cutting Intermediate Outcome that also appears in the `intermediate` bucket card (i.e. the same underlying indicator is shown transversally in both places). HLO/output-tier rows inside an `aow` card are unaffected.

**Out of scope:** the `flat` ("All indicators") table's Target column; non-repeated (AoW-exclusive) Outcomes-band rows inside `aow` cards; 2030 Outcomes rows; the legacy `entity-aow-aow`/`aow-hlo-table` flow (already has its own, differently-scoped "Not exclusive to this AoW" chip); the AoW selector at result creation (sibling spec `aow-selector`).

## 4. Personas Affected

| Persona | What changes for them |
|---|---|
| Result submitter | Sees a tooltip clarifying the Target figure is program-wide when browsing Intermediate outcomes. |
| PMU lead | Same, when reviewing Reporting progress. |

## 5. User Stories

- **`RES-US-1`** — As a result submitter, I want the Target value on an Intermediate Outcome row to explain that it isn't scoped to one Area of Work, so that I don't misread it as this AoW's target while browsing the Reporting tab.

## 6. Functional Requirements

### Required (MUST)

- **`RES-R-1`** The system MUST show a tooltip on the Target figure of every row rendered inside the `intermediate` bucket card (`group.kind === 'intermediate'`) in `reporting-aow-table`'s grouped view, with the text: *"This target is not exclusive to that AoW."*
- **`RES-R-2`** The system MUST NOT show this tooltip on Target figures in an `aow` card's **HLO/output-tier** rows, nor in `2030-outcomes` bucket cards.
- **`RES-R-3`** *(added 2026-08-26, mechanism verified against live data same day)* Within an `aow` bucket card's **Outcomes band** (`__tier === 'outcome'`), the system MUST show the same tooltip on a row **if and only if** that row's underlying ToC outcome node is cross-cutting (not scoped to this specific AoW). A genuinely AoW-exclusive Outcomes-band row MUST NOT show it.
  - **Identification mechanism (VERIFIED, not an assumption):** the backend already computes and returns this per outcome group. `GET_TocResultsByAowId` (`.../api/results-framework-reporting/toc-results?program=...&areaOfWork=...`) joins each `tocResultsOutcomes` group's `is_aow: boolean` field via `(wp.toc_id IS NOT NULL)` — and the repository's own SQL comment states the rule directly: *"ToC nodes without a work package / area of work must appear under every AOW of the science program"* (`onecgiar-pr-server/src/api/results/results-toc-results/repositories/aow-bilateral.repository.ts`, `buildTocQuery`, the `WHERE ... AND (wp.toc_id IS NOT NULL OR tr.wp_id IS NULL)` branch). A cross-cutting outcome group therefore always carries `is_aow: false` on every AoW's response — this is the exact same population `findIntermediateOutcomes` selects via `WHERE tr.wp_id IS NULL`. Verified live 2026-08-26 via `curl` against `https://prtest-back.ciat.cgiar.org` (program `SP02`, AoWs `SP02-AOW01`..`04`, and `SP01`/`SP01-AOW01`): every outcome group returned in every AoW queried had `is_aow: false`, and its indicator set matched the Intermediate Outcomes bucket 1:1 (no AoW in the sampled test data currently has a genuinely AoW-exclusive outcome — the rule still holds for when one exists). **No `indicator_id` cross-referencing against a second endpoint is needed** — `is_aow` is present in the same payload the AoW card already fetches, at the group level (each `tocResultsOutcomes[i]`, not per-indicator).

### Should (SHOULD)

- **`RES-R-10`** ~~The tooltip SHOULD be reachable by keyboard focus (not hover-only)~~ — **superseded 2026-08-26 (Pivot Record, `execution.md`).** The premise that the existing `achievedTooltip` pattern is keyboard-reachable was checked against `pr-tooltip.directive.ts` and found false: `PrTooltipDirective` has no `focus`/`focusin`/`blur` handling, only `mouseenter`/`mouseleave`/`click`. This tooltip therefore ships hover-only, matching `achievedTooltip`'s actual (not assumed) behavior — no regression versus the existing pattern. Fixing keyboard reachability for `prTooltip` app-wide (~40 call sites) is tracked as a separate follow-up, not part of this spec.

## 7. Non-Functional Requirements

| Dimension | Target |
|---|---|
| **Accessibility** | Tooltip trigger MUST remain a focusable `<button>` (unchanged element) per `docs/ux-ui/design.md` §10; tooltip text exposed the same way `achievedTooltip` already is (existing `prTooltip` directive contract — no new a11y pattern introduced). |
| **Internationalization** | New string SHOULD go through `src/app/internationalization/` per client convention; MAY ship as a plain string in this Lite pass if no other string in this template is internationalized yet (see Open Question). |

## 8. Acceptance Criteria

| ID | Given | When | Then |
|---|---|---|---|
| `RES-AC-1` | The Reporting tab is open and the Intermediate outcomes card is expanded | The user hovers the Target figure on any row in that card | A tooltip reading "This target is not exclusive to that AoW." appears on hover. **Keyboard-focus reachability is NOT required** (superseded 2026-08-26 — see `RES-R-10`; the shared `prTooltip` directive is hover-only everywhere in this codebase today) |
| `RES-AC-2` | The Reporting tab is open and an AoW (HLO/Outcome) or 2030 Outcomes card is expanded | The user hovers the Target figure on any row | No such tooltip appears, BUT the existing `Achieved`-cell tooltip on the same row must be unaffected (regression guard against a copy-paste onto the wrong cell) |
| `RES-AC-3` *(added 2026-08-26)* | An AoW card is expanded and its Outcomes band contains a row whose indicator also appears in the Intermediate Outcomes card | The user hovers that row's Target figure | The same tooltip text appears |
| `RES-AC-4` *(added 2026-08-26)* | An AoW card is expanded and its Outcomes band contains a row whose indicator does NOT appear in the Intermediate Outcomes card (AoW-exclusive) | The user hovers that row's Target figure | No tooltip appears |

### Defect classes this spec can produce, and their gate

| Defect class | Caught by |
|---|---|
| Wrong/missing tooltip string | Jest: exact-string assertion on the `prTooltip` input (not a truthy check — see `tasks.md` disqualifier) |
| Tooltip leaks onto a non-Intermediate card (AoW/2030) | Jest (asserts `''` for non-`intermediate` bucket) + a manual browser check |
| Tooltip bound in code but not actually visible on hover in a real browser | **jsdom cannot evaluate this** — no automated check exists for it in this stack. Substituted with a mandatory manual browser check (hover only — `RES-R-10` superseded 2026-08-26, see `execution.md` Pivot Record) at task done-criteria, recorded as an accepted, explicitly substituted risk rather than an automated gate. |

## 9. Dependencies & Assumptions

- **Upstream:** none — reuses the already-loaded `group.kind` discriminator and the existing `prTooltip` directive.
- **Downstream:** none.
- **Assumption:** the `flat` table view is intentionally excluded per the user's explicit scoping answer ("solo para la parte de Intermediate Outcomes"); if a later request asks for parity there, that is a new task, not a gap in this one.

## 10. Open Questions

- `RES-OQ-1` — Should the tooltip copy go through `TerminologyService`/`internationalization/`, or is a plain string acceptable here? No other string in `reporting-aow-table.component.html` currently uses the `term` pipe (checked: no `| term` usage in this template), so this spec defaults to a **plain string**, consistent with the file's current convention, and flags promoting the whole file to i18n as separate, out-of-scope work.

## 11. Out-of-Band Notes

None.

## Required cross-references

- `docs/prd.md` — G2 (data quality / clarity); no AoW-specific story exists to cite more precisely.
- `docs/ux-ui/design.md` §10 (Accessibility).
- `docs/trd/trd.md` — not cited; no architecturally significant change.
- Sibling: `docs/specs/results/intermediate-outcome-aow-visibility/aow-selector/` (independent, no shared files).
