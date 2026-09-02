# Proposal — `Progress by AoW` covering W3/Bilateral

**One line:** give W3/Bilateral the same Area-of-Work visibility W1/W2 has — sharing the AoW **axis**, never the metric, because the two are not commensurable.

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/progress-by-aow-w3` |
| Type | **Change** |
| Approval Mode | `gated` |
| Date | 2026-09-02 |
| Depends on | none (but see the ordering note below) |
| Parallel-safe | **no** — shares `program-overview.component.html` with `changes/aow-row-gesture-split` |
| Source | Owner request 2026-09-02 (`docs/specs/changes/overview-aow-followups.md` §3), explicitly asking for analysis |
| Related | archived `overview-aow-cross-filter` (`OSF-R-3`), archived `overview-aow-progress-hero` |

## 2. Intent

W1/W2 has an AoW distribution on the Overview. W3/Bilateral does not. The owner asked whether it should — and whether both belong in one `Progress by AoW` section.

## 3. Problem / Current Behavior

| Lane | AoW visibility today |
|---|---|
| W1/W2 | Progress hero with a per-AoW row: planned KPIs, `reported / total`, %, QA/Prel, coverage. Plus a `By scope` breakdown |
| W3/Bilateral | Four cards that **filter** by scope, but no AoW distribution of their own |

## 4. Proposed Outcome

One `Progress by AoW` section where both lanes are read against **the same AoW rows, in the same order** — so a reader can see, per Area of Work, both the plan-relative progress and the bilateral volume, without either number pretending to be the other.

## 5. The analysis the owner asked for

### It is feasible client-side, with no server change

`OSF-R-3` already requires every W3 card to filter *"derived from the AoW acronym already present in the payload, **with no server change**"*. The acronym is there. An AoW distribution for W3 needs no new endpoint and no migration.

### But the two lanes are NOT commensurable — and this is the whole risk

| | W1/W2 | W3/Bilateral |
|---|---|---|
| What is measured | **planned KPIs** — `reported / total` | **result counts** |
| Denominator | the plan | none |
| "50%" means | half the planned KPIs reported | *nothing* — there is no plan to be half of |

Putting both under one heading called *"progress"*, in one table, with one bar, produces two numbers that mean different things and invite a comparison that is not valid. **That is the lying-figure failure the previous spec existed to prevent** — the same failure that produced the `Program-wide` pill and its explanatory sentence.

### What is actually valuable

The **shared axis**, not the shared number. Being able to read "AOW02 — Accelerated Breeding" once and see both its plan progress and its bilateral volume side by side is the insight. That requires common rows and common ordering; it does not require a common metric, and it is actively harmed by one.

## 6. Scope

- A `Progress by AoW` section with **one AoW axis and one row order**, shared by both lanes.
- Two **separately labelled** blocks, each stating its own metric and denominator explicitly.
- W3 block derived client-side from the AoW acronym already in the payload.
- The `UNTAGGED` / outcome buckets handled consistently with the scope breakdown — W3 rows with no acronym must not silently vanish (`OSF-R-3`'s own rule).

## 7. Non-Goals

- **No merged metric, no shared bar, no combined percentage.** Explicitly out of scope.
- No server change, no new endpoint.
- Not re-opening the W1/W2 hero's own metric definitions (`OAH-R-3` "honest at 1%" stands).

## 8. Affected Users, Systems, And Specs

Client only: `program-overview.component.*`, `dashboard-lab.component.ts` (W3 rows already live there as `bilateralRows`). Touches the same file as `changes/aow-row-gesture-split` — see ordering.

## 9. Visual Reference

- **Source:** Generated mockup — self-contained HTML (Stitch MCP not registered in this session; `claude-design` failed to connect with `FIRST_PARTY_AUTH_REJECTED` — recoverable with `/design-login` if a richer tool is wanted later).
- **Location:**
  - `docs/specs/changes/progress-by-aow-w3/mockup/progress-by-aow.html` — Option A, both lanes under one heading
  - `docs/specs/changes/progress-by-aow-w3/mockup/progress-by-aow-1280.png` — rendered at 1280px
- **Verified, not asserted:** rendered in-browser at 1600 / 1280 / 900 / 768. `scrollWidth === clientWidth` at every width, identity column 445px at 900 and 313px at 768, **zero truncated AoW names**. The mockup's own grid uses `minmax(0,1fr)` for the name and `minmax(120px,240px)` for the bar — `KZ-OAH-1`'s standardization applied up front rather than discovered later.
- **W1/W2 figures are real** (SP01: 1/18, 1/110, 0/93, 0/61, 0/70). **W3 counts are illustrative** — the real per-AoW bilateral distribution is not yet measured; that measurement is a specify-phase task.
- **Notes:** the mockup is the artifact the specify phase must name as a **gate** in at least one task DoD. The previous spec shipped a 3-column row where its approved mockup had 4 columns, and the Reviewer passed it correctly — because no DoD referenced the mockup. An approved mockup that no DoD cites cannot fail anything.

## 10. Requirement Delta Preview

### ADDED
- A W3/Bilateral AoW distribution.
- A `Progress by AoW` section owning both blocks and the shared axis.

### MODIFIED
- The W1/W2 hero's placement, **if** Option B is chosen (see below).

### REMOVED
- Nothing.

## 11. Approach Options

| Option | What it does | Trade-off |
|---|---|---|
| **A — Additive: keep the hero, add a W3 block beneath it under one heading** | The existing hero is untouched; a new W3 block shares its AoW rows and order. | Lowest risk, no rework of a surface two specs already shaped. The section is a wrapper, not a rewrite. Visual cohesion depends on the two blocks reading as siblings. |
| B — Restructure into one section with two lanes as peers | A purpose-built section; neither block inherits hero framing. | Better end state if the hero's framing fights the pairing. But it reworks a surface `overview-aow-progress-hero` and `overview-aow-cross-filter` both just touched, and it is what would force `changes/aow-row-gesture-split` to be redone. |
| C — One merged table | What the owner floated. | **Rejected on analysis** (§5): incommensurable metrics under one heading. |

## 12. Recommended Approach

**Option A**, unless the mockup shows the hero's framing actively fighting the pairing. It is additive, it does not rework a twice-touched surface, and it delivers the actual value — the shared axis — at a fraction of B's cost and risk.

**Ordering note:** if B is chosen, run this spec **before** `changes/aow-row-gesture-split`, since B would relocate the row that spec modifies. Under A the order does not matter, but the two still must not run concurrently.

## 13. Risks, Dependencies, And Open Questions

| Item | Note |
|---|---|
| **Incommensurable metrics** | The central risk. Any drift toward a shared bar or combined % re-introduces it. Requirements must forbid it explicitly, not merely omit it. |
| **`KZ-OAH-1`, third occurrence and counting** | Adding columns to an AoW row is exactly where a fixed px track starves the name column. This bit the same component three times in one spec. Every text column stays `minmax(0,1fr)`; every measurement is taken in the browser at all five widths. |
| **900px is the squeeze band** | Not 768. At 768 the sidebar is `hidden md:block`; at 900 the 64px rail renders, so 900 is more constrained. "If the narrowest passes, the rest pass" is invalid on this surface. |
| **Untagged W3 rows** | Rows with no acronym must land in a visible bucket, never be dropped. |
| **Open question** | Does the W3 block show counts only, or counts split by bilateral status (matching the four cards)? The mockup should show one and the specify phase should settle it. |
| **Open question** | Option A or B — the mockup decides. |
| **Open question, surfaced BY the mockup** | With real data the W1/W2 lane reads almost empty — progress is 0–6%, so its bars are 1–6px slivers. That is honest (`OAH-R-3` forbids rounding a tiny value up to a visible minimum) but it weakens the side-by-side comparison the section exists for. Does the plan lane need a different visual encoding at near-zero, or is a visibly empty plan the correct and useful message? |

## 14. Success Criteria

- Both lanes readable against the same AoW rows in the same order.
- Each block states its own metric and denominator; **no combined figure exists anywhere on screen**.
- W3 rows with no AoW acronym are visible in a labelled bucket.
- `OSF-AC-9` still green at 5 widths × 2 band states × 2 tabs; the AoW name column never starves.
- At least one task DoD names the mockup as its gate.

## 15. Next Step

```text
/akili-specify changes/progress-by-aow-w3
```
