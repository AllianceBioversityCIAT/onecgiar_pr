# PRMS Shell — CURRENT design reference

**This is the authoritative visual reference.** Delivered by the designer on **2026-08-03**, and it
supersedes [`../legacy-prms-reporting-tool-mockup/`](../legacy-prms-reporting-tool-mockup/) — which is
kept only for history. When the two disagree, **this folder wins**.

- **Origin:** Claude Design project "PRMS Reporting Tool interface", exported as *Project archive*.
- **Related work:** [`../../../onecgiar-pr-client/docs/reporting-redesign/`](../../../onecgiar-pr-client/docs/reporting-redesign/) — UI-RULES, SIDEBAR-SPEC, PROGRAM-SHELL-SPEC, MIGRATION-CONTEXT, AUDIT-FINDINGS.

---

## What is in here

| File | What it is |
|---|---|
| `PRMS-Shell.dc.html` | **3 574 lines** (the legacy export had 3 200). All styling inline, so every value is readable from the markup. |
| `support.js` | 1 911 lines — the Claude Design runtime plus the mock data model. **Not for porting**: the app's data comes from its own API. Useful only for understanding structure and thresholds. |
| `uploads/pasted-1785766366426-0.png` | ⭐ **The rendered Reporting tab.** The single most useful file here — it settles questions the markup leaves ambiguous. |
| `uploads/pasted-1785716279276-0.png`, `…774165129-0.png`, `…773813131-0.png` | Additional rendered references. |

## ⚠️ It does not render in a browser

Same as the legacy export: it is Claude Design's template format (`<x-dc>`, `<sc-if>`, `<sc-for>`,
`{{ }}`), and `support.js` does not resolve those standalone. Read the markup; use the PNGs for the
visual truth.

## What this export adds over the legacy one

The legacy folder covered the sidebar and the Reporting table. This one also carries the **shell and
the Overview tab**:

- `Report emerging result` (lines 322, 390) — the band's primary action
- **`Reporting pace`** (785), **`Needs attention`** (818), **`Impact so far`** (842) — the Overview
  blocks that were previously only visible in screenshots

---

## Facts the rendered PNG settles

These were open questions or outright wrong in the first implementation pass. Read from
`uploads/pasted-1785766366426-0.png`:

1. **The AoW counter reads `8 KPIs`, not a bare number.** It counts the AoW's KPIs — not the sum of
   indicators across every HLO. (Our first pass showed `30`, which was the flat total.)
2. **`3 of 8` counts KPIs with something REPORTED**, not KPIs that reached 100%. `38% ≈ 3/8`
   confirms the denominator is the KPI count. Our first pass counted `progress >= 100`, which gave
   `0 of 30 · 0%` on real data.
3. **Only the FIRST AoW is expanded**; every other card is collapsed. Inside the open AoW, only the
   **first HLO** is expanded. Our first pass expanded everything.
4. **The toolbar is:** a `Search indicators…` field, then three dropdowns — `AoW`, `Indicator`,
   `Status` — and a right-aligned segmented control **`Indicators by AoW | All indicators`**.
5. **Every AoW name and every sub-group carries a ⓘ**, and the HLO row's ⓘ sits at the END of the
   row, before the KPI count.
6. **`INTERMEDIATE OUTCOMES` and `2030 OUTCOMES` are sub-groups too**, with their own diamond marker
   (◇ hollow / ◆ filled) and their own `2 KPIs` counter — the same level as an HLO, not a separate page.
7. **A third meta line exists on a row**: `Edited 3 weeks ago`. ⚠️ The app has no per-indicator
   `updatedAt`, so this is NEEDS-BACKEND (recorded in AUDIT-FINDINGS / the mapping).
8. **The chevron points UP when open, DOWN when closed** (`▲` / `▼`), for both levels.

---

## Anchors inside `PRMS-Shell.dc.html`

| What | Where |
|---|---|
| `Report emerging result` (band primary action) | `:322`, `:390` |
| Reporting pace (Overview) | `:785` |
| Needs attention (Overview) | `:818` |
| Impact so far (Overview) | `:842` |
