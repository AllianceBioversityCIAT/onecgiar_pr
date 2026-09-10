# Proposal — Return from Result Detail to the reported AOW / indicator

Submitter already takes you to the Science Program home. Add a second identity-strip control that opens the **By AOW** list you actually reported from (AOW + HLO / KPI), using the result’s ToC mapping — not a return URL.

## Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/result-indicator-back-link` |
| Slug | `result-indicator-back-link` — derived from free-text (“devolvernos directamente al indicador”) |
| Type | Change |
| Approval Mode | gated |
| Depth (if specified) | Standard |
| Ticket | none (not provided) |
| Depends on | `docs/specs/archive/2026-09-02-changes--result-submitter-back-link/` (Submitter shipped; this slice must not replace it) |
| Parallel-safe | no — same `app-result-header` files |
| Parent Spec | — |
| Baseline | `US-S1` (`docs/prd.md`); Result Detail + Reporting (`docs/ux-ui/design.md` §4–§5, §7, §9–§10); `W1` (`docs/trd/trd.md`) |
| Related specs | Archived Submitter spec (Option C deferred); `KZ-changes--kp-report-modal-auto-create-1` (live surface = header after Result Detail navigation, not the Report aside) |

## Intent

After Report (or when reopening the result), the submitter must be able to jump back to the **Area of Work / indicator list they were working in**, not only to the program catalogue. Submitter stays the way back to the Science Program.

## Problem / Current Behavior

1. Result Detail (`visual/result-detail-with-submitter.jpg`) shows **Submitter: SP04 - Multifunctional Landscapes**. Click opens `/result-framework-reporting/entity-details/SP04?tocView=aows` — the AOW catalogue (`visual/submitter-lands-on-sp-home.jpg`).
2. The user reported from **inside AOW01**, By AOW, under HLO **OP 1.2.6** (`visual/by-aow-aow01-indicators.jpg`, `visual/result-toc-hlo-aow01.jpg`). That context is one more click (and lost filters / scroll) away.
3. Create still navigates with `?phase=` only (`LabReportFormComponent`). The header cannot infer “last By AOW” from the URL.
4. Reporting already has a **Copy link** contract for this destination: `entity-details/{code}?tocView=byAow&tocAow={AOW}&kpi={id}` (`dashboard-lab` `kpiLink`). The header does not use it.

Submitter solved “which program?” It did not solve “which AOW / indicator?” That was Option C, deferred until HITL showed program home was not enough. This is that follow-up.

## Proposed Outcome

Keep **Submitter** and **Back to results**.

Add a second identity-strip item (after Submitter, before status) that shows the **owning Area of Work** from the result’s ToC mapping (e.g. `AOW01` or `AOW01 - {short name}`). The value is a same-tab link to the existing By AOW route:

`/result-framework-reporting/entity-details/{official_code}?tocView=byAow&tocAow={aowCode}`

When a single contributing KPI id is known, append `&kpi={id}` so the list can highlight / scroll the row the same way Copy link already does.

Hide the control when there is no official code **or** no resolvable AOW (unmapped / emerging / whitespace). Do not invent an AOW. Do not change Submitter’s destination.

Refresh and a shared Result Detail URL still show the same AOW link — it is derived from the loaded result, not from `history` or a `returnUrl`.

## Scope

- Result Detail header (`result-header.component.{html,ts,spec.ts}`).
- Read AOW (and KPI if already on the loaded result / ToC payload the header can see without a new create-path query).
- Link shape = existing `tocView=byAow` + `tocAow` (+ optional `kpi`). No new route table.
- Hide when AOW cannot be resolved. Keep Submitter and **Back to results**.
- Keyboard / wrap at `md` (900px) — the strip grows one more item.

## Non-Goals

- Replacing, relabeling, or retargeting **Submitter**.
- Replacing **Back to results**.
- `history.back()` or a `returnUrl` / `from` query on every Report navigate (`LabReportFormComponent`, create modal, guided creation).
- Restoring search / type / status / center filters, or exact pixel scroll if `kpi=` is absent.
- Program-level buckets that Copy link already refuses (`intermediate-outcomes`, `2030` outcomes).
- Changing create APIs, server contracts, or the Contributors ToC editor UX.
- Center-as-submitter. i18n for a new English label if the header still hardcodes “Submitter”.

## Affected Users, Systems, And Specs

| Who / what | Effect |
|---|---|
| Result submitter | Second click target: back into the AOW they reported under |
| QA reviewer | Same chrome when they open Result Detail |
| `app-result-header` | One more strip item + getters |
| `dashboard-lab` By AOW | Consume existing query (`tocView`, `tocAow`, `kpi`) — no new browse mode |
| `LabReportFormComponent` | No change in the recommended option |
| Archived Submitter spec | Destination of Submitter stays program home |

## Visual Reference

- Source: User screenshots (no Figma)
- Location: `docs/specs/changes/result-indicator-back-link/visual/`
- Notes:

| File | Role |
|---|---|
| `result-detail-with-submitter.jpg` | Today: Submitter works; no AOW / indicator return |
| `submitter-lands-on-sp-home.jpg` | Gap: click lands on SP04 catalogue (`tocView=aows`) |
| `by-aow-aow01-indicators.jpg` | Desired land: AOW01 By AOW / OP 1.2.6 indicator list |
| `result-toc-hlo-aow01.jpg` | Data already on the result: HLO AOW01 / OP 1.2.6 |

## Requirement Delta Preview

### ADDED Requirements

- When the result has a resolvable owning AOW, the identity strip shows that AOW and links to By AOW for that code (same tab).
- When a single KPI id is available, the href includes `kpi=` using the existing Copy-link contract.
- Accessible name includes a cue such as “Area of Work” (or the specify-locked label) plus the AOW code.
- No AOW → no node; no `tocAow=undefined`.

### MODIFIED Requirements

- Identity strip gains one item. Submitter and **Back to results** stay as specified in the archived Submitter spec.

### REMOVED Requirements

- None. This realizes the deferred Option C as an **additive** control, not a replacement.

## Approach Options

| | A — Second strip item from ToC (recommended) | B — Retarget Submitter to By AOW | C — Return URL on every Report navigate |
|---|---|---|---|
| What | New AOW link; Submitter still → program home | Submitter click opens `tocView=byAow&tocAow=` | Pass `from` / `aow` / `kpi` on create/open |
| Pros | Two jobs, two controls; works on refresh; reuses `kpiLink` | One control, no extra wrap | Lands exactly where they clicked Report, including filters if we copy them |
| Cons | Need a field the header can read (ToC payload — specify must name it); multi-HLO rule | Loses “go to the program”; user already liked Submitter → SP home | Touches every create/open path; stale when bookmarked; `KZ-changes--kp-report-modal-auto-create-1` class of risk |

## Recommended Approach

**Option A.** The user asked for an **option** to return to the indicator, and said Submitter is excellent. Do not overload Submitter (Option B). Do not thread a return URL through create (Option C) — the result already stores AOW01 / OP 1.2.6 on Contributors (`visual/result-toc-hlo-aow01.jpg`).

Specify must confirm **which payload field** the header may read (GET result vs contributors ToC vs a thin existing call). If `currentResult` has no AOW today, the smallest additive read wins — do not invent a new endpoint. Multi-HLO: use the **primary / first planned** mapping; do not pick a Center-contributor ToC over the submitter SP.

`kpi=` is best-effort: include it when exactly one contributing indicator id is present; otherwise land on By AOW for that AOW (Image #3 without a highlighted row). That is enough to leave the catalogue (Image #2).

## Risks, Dependencies, And Open Questions

| ID | Item |
|---|---|
| RIBL-OQ-1 | Label copy: **Area of Work** + `AOW01 - {name}` (mirrors Submitter) vs **Reported from** vs HLO title (`OP 1.2.6`). Proposal assumes **Area of Work** + code (+ short name if cheap). |
| RIBL-OQ-2 | Multi-HLO: first/primary planned mapping only (assumed). Confirm. |
| RIBL-OQ-3 | Jira ticket? None attached. |
| RIBL-OQ-4 | Must `kpi=` be required for this slice, or is By AOW of AOW01 enough for v1? Proposal: AOW required, `kpi` optional. |
| Risk | `currentResult` may not carry AOW/KPI today — specify must name the source or the control stays hidden on every result. |
| Risk | Strip wrap at 900px / ~1100px with sidebar — two links now. HITL like RSBL-R-7. |
| Risk | Hyphen / spelling of AOW codes — use stored string, same as `SGP-02`. |
| Lesson | `KZ-changes--kp-report-modal-auto-create-1`: implement on `app-result-header` after Result Detail navigation. Do not put this link in `LabReportFormComponent`. |

## Success Criteria

- Result mapped to AOW01: strip shows that AOW; click opens `entity-details/{SP}?tocView=byAow&tocAow=AOW01` in the same tab (plus `kpi=` when known).
- Submitter still opens program home (no `tocAow`).
- **Back to results** still goes to `/result/results-outlet/results-list`.
- No AOW mapping → no new node; rest of header unchanged.
- Refresh / shared Result Detail URL still shows the same AOW link.
- At 900px the new item is readable and does not cover title / PDF / ⋮.

## Next Step

```text
/akili-specify changes/result-indicator-back-link
```
