# Proposal: Persistent “Report emerging result” CTA that opens the Reporting aside

**One line:** put a **Report emerging result** button in the Science Program band on every tab, and make every emerging entry (band + Where to report hub) open the same aside used by Reporting — not the legacy centered dialog.

## 1. Document Control

| Field | Value |
|---|---|
| **Spec Path** | `changes/emerging-result-cta-placement` |
| **Proposal File** | `docs/specs/changes/emerging-result-cta-placement/proposal.md` |
| **Type** | Change |
| **Approval Mode** | gated |
| **Slug** | `emerging-result-cta-placement` — derived from free-text argument (band CTA + Reporting-aside surface for emerging results) |
| **Author** | Cursor Grok 4.6 with Juan Carlos Cadavid |
| **Date** | 2026-09-05 |
| **Requirement source** | Chat request + 4 screenshots (hub CTA, program-band action cluster, legacy emerging dialog, Reporting aside). No Jira ticket yet. |
| **Target routes** | `/result-framework-reporting/entity-details/:code/overview` · `…/:code` (Reporting) · `…/:code/results` · `…/:code/my-work` |
| **Depends on** | none (builds on shipped `reporting-entry-hub`, `mass-reporting-flow`, `my-work-board`, `sp-shell-app-viewport`) |
| **Parallel-safe** | no vs. any spec editing `reporting-program-band.component.*` or `dashboard-lab` emerging/hub handlers |

Constitution cited: `docs/prd.md` persona *Result submitter*, `G1` (`M1.2`), `US-S1`, `AC-1` · `docs/ux-ui/design.md` §1 (structure beats freedom), §7 tokens, §10 a11y, client UI-RULES “one brand button / drawer not stacked modal” · `docs/trd/trd.md` `W1` · `result-framework-reporting` module.

---

## 2. Intent

A submitter who already knows they have an **emerging** result (not planned in the ToC) should start that report from **any Science Program tab**, without opening *Where to report* first, and should land in the **same creation aside** they already use when they click **Report** on a Reporting row.

---

## 3. Problem / Current Behavior

Two entry points, two surfaces, one dead output:

| Surface today | What the user sees | What the click does |
|---|---|---|
| *Where to report* hub card **Report emerging result** (Image 1) | Dedicated emerging option inside the hub modal | `onHubReportEmerging()` closes the hub and opens the **legacy** `app-pr-dialog` + `app-report-result-form` (Image 3) |
| Program band top-right cluster (Image 2) | **Tour** + **Where to report** only | `onWhereToReportClick()` emits **both** `whereToReport` and `reportEmerging` — the second output has **no dedicated button**. Overview/Reporting bind both to `openWhereToReportModal()`. Results / My results only bind `whereToReport` and hop to `?whereToReport=true&returnTab=…` |
| Reporting table **Report** | Row action on a planned KPI | Opens the **aside** (`indicator-drawer` + `lab-report-form`) (Image 4) |

Observed pain (screenshots + code):

1. **Emerging is hidden one click deeper.** The only honest emerging CTA lives inside *Where to report*. On Results and My results the user must leave the tab, open the hub, then pick emerging.
2. **Same intent, worse surface.** Hub → emerging opens the old centered dialog. Reporting → Report opens the aside (sticky header/footer, dirty-close confirm, two-column form, CGSpace browse). Users treat them as “two different products.”
3. **The band already has a `reportEmerging` output** (`reporting-program-band.component.ts`) but it is wired as an alias of *Where to report*, not as its own control.
4. **`lab-report-form` already speaks emerging** (`emergingCategory`, `isEmerging`, `needsCategoryChoice` when no type is preselected). The live host (`indicator-drawer`) never passes that mode — it still requires a ToC indicator.

AVISA (`SGP-02`) stays view-only: `canReportEmerging()` already hides the create path on dashboard-lab. That gate must survive.

---

## 4. Proposed Outcome

1. **A second band action** — **Report emerging result** — sits in the same top-right cluster as Tour / Where to report, on **Overview, Reporting, Results, and My results**, in both the expanded identity block and the collapsed 48px bar.
2. **One creation surface.** Band CTA and hub **Report emerging result** both open the **Reporting aside** in *emerging mode* (no ToC indicator; user picks Output/Outcome + category). The legacy centered dialog is **no longer opened** from these two entries.
3. **Where to report stays.** The hub remains the wayfinding tool for W1/W2 AoWs and W3/bilateral. Emerging stays *also* inside the hub (Image 1) and *also* on the band (Image 2).

Behaviour-level commitments:

- Phase-aware: uses the shell’s existing phase (`DD-7`); no second picker.
- Permission-aware: hidden when `canReportEmerging()` is false (AVISA / no programme).
- After create: same post-create navigation the aside already uses (result detail). If the user started from Results or My results, the result-detail **Smart Back** origin stays that tab (existing `rememberResultDetailOrigin` pattern).
- No new API. Create payload stays the emerging shape (`toc` / indicator null) already built by `lab-report-form` + `create-result-payload.util`.

---

## 5. Scope

- Client — `reporting-program-band`: split `whereToReport` vs `reportEmerging` (today one click fires both); add the emerging button in expanded + collapsed chrome; responsive label collapse already used by *Where to report* (`hidden min-[480px]:inline`).
- Client — `dashboard-lab`: `openEmergingReport()` primes `EntityAowService` and opens the aside in emerging mode; `onHubReportEmerging()` calls that instead of `openReportModal()`; consume `?reportEmerging=true&returnTab=` the same way `?whereToReport=` works today.
- Client — `indicator-drawer` / `lab-report-form`: emerging mode (optional `emergingCategory` or “choose category”; hide indicator-only tabs `info` / `results`; keep dirty-close, Escape, `canReport` default-false).
- Client — `programme-results` and `my-work-board`: bind `(reportEmerging)` and either open the aside in place or hop to the dashboard-lab host with `?reportEmerging=true&returnTab=results|my-work` (decision in §11).
- Tests: band CTA presence/absence + output split; hub click no longer opens `showReportModal`; emerging aside opens without a ToC node; AVISA hides the CTA; Results / My results entry returns correctly.
- Docs: one row in `docs/ux-ui/design.md` §4 / SP chrome if the band action cluster becomes a reusable pattern.

---

## 6. Non-Goals

- Rewriting `app-report-result-form` or deleting the legacy dialog file in this spec (other dormant routes / tests may still import it). This spec only **stops calling it** from hub + band.
- Changing W1/W2 planned Report, W3/bilateral create, or *Where to report* lanes.
- A new result type, payload, or server endpoint (`AC-4` untouched).
- Redesigning the Reporting aside chrome (tokens, width, tabs for planned KPIs stay).
- Guided-creation full-screen (`openGuided('emerging')`) on the unused `/emerging` sidebar — out of scope unless it still has a live route we must not regress; do not expand it.
- Bilateral header “Report emerging result” (`bilateral-page-header`) — different product surface.

---

## 7. Affected Users, Systems, And Specs

| Area | Impact |
|---|---|
| Persona *Result submitter* | Primary: faster emerging start from any SP tab; one familiar form |
| `reporting-program-band` | New visible CTA; output contract change (`reportEmerging` no longer alias of `whereToReport`) |
| `dashboard-lab` | Hub handler + new open path; legacy `showReportModal` unused from these entries |
| `indicator-drawer` + `lab-report-form` | Emerging mode (already half-built on the form) |
| `programme-results`, `my-work-board` | Bind the new output; return-tab hop or in-place host |
| Related shipped specs | `reporting-entry-hub` (hub card stays), `mass-reporting-flow` (aside is the planned-report reference), `my-work-board` / `sp-shell-app-viewport` (band on all four tabs) |

Kaizen that applies: **KZ-REH-2** — do not reintroduce native `[disabled]` on the new CTA; use the hub’s aria-disabled + handler-guard if the action is gated. **KZ-MRF-2** — any new `var(--pr-*)` must already exist in `colors.scss` (or the token sweep fails).

---

## 8. Visual Reference

- **Source:** User screenshots (chat, 2026-09-05) — four frames. No Figma file.
- **Location:** not persisted in-repo (chat attachments). `/akili-specify` should copy them under `docs/specs/changes/emerging-result-cta-placement/mockup/` if the user re-attaches.
- **Notes:**

| Image | What it shows | Role in this change |
|---|---|---|
| 1 | **Report emerging result** inside *Where to report* | Keep this entry; change only the **destination** |
| 2 | Band action cluster (Tour + Where to report) | **Add** the emerging CTA here on all four tabs |
| 3 | Legacy centered “Report emerging result” dialog (`app-pr-dialog`) | **Stop** opening this from hub and band |
| 4 | Reporting aside (`indicator-drawer` + `lab-report-form`) | **Target** surface for every emerging start |

Existing tokens only (`--pr-color-primary-*`, `--pr-border`, `--pr-surface-card`, Manrope, `material-icons-round`). ui-ux-pro-max: outline/secondary for the new control (Tour’s treatment), not a second brand fill — client UI-RULES “one `brand` button per screen”; *Where to report* stays the filled primary. Band heights stay 32/36px to match current chrome (do not jump to 44px and break the 48px collapsed bar). Truncate / hide the label before the cluster overflows (`truncate`, `hidden min-[480px]:inline`). `cursor-pointer`, visible focus ring, `prefers-reduced-motion` already on the aside.

---

## 9. Requirement Delta Preview

### ADDED Requirements

- Band shows **Report emerging result** on Overview, Reporting, Results, and My results when the user may create emerging results.
- That control is a distinct action from *Where to report* (separate output, separate handler).
- Hub **Report emerging result** and the band CTA open the Reporting aside in emerging mode (category chosen in-form when none is preselected).

### MODIFIED Requirements

- `onHubReportEmerging()` no longer opens `showReportModal` / `app-report-result-form`.
- `reporting-program-band.onWhereToReportClick()` no longer emits `reportEmerging`.

### REMOVED Requirements

- None at product level. The legacy dialog is **unhooked** from these entries, not deleted as a requirement of another surface.

---

## 10. Approach Options

| | Option | How it works | Trade-off |
|---|---|---|---|
| **A** | Band CTA + query-param hop | Results / My results navigate to dashboard-lab `?reportEmerging=true&returnTab=…` (same as *Where to report*). Overview/Reporting open the aside in place. | Smallest. Results/My results **change tab** for the duration of the form. |
| **B (recommended)** | Band CTA + aside in place on every tab | Extract or reuse `indicator-drawer` emerging mode on Results and My results (or a thin host that primes `EntityAowService` and mounts the same aside). No tab jump. | Slightly more wiring; four hosts stay consistent with “the button is here, the form is here.” |
| **C** | Replace *Where to report* with emerging as the only band CTA | One button, hub only via Tour/help. | Contradicts “también esté” — user asked to **add**, not replace. Rejected. |

---

## 11. Recommended Approach

**Option B**, with a cheap fallback: if mounting the aside on Results / My results blows the LOC budget in specify, specify may degrade those two tabs to Option A and record it as a design decision. Overview and Reporting **always** open in place — they already host the drawer.

Implementation sketch (not a task list):

1. Split band outputs; render outline **Report emerging result** next to *Where to report* (icon `add_circle` or `flare`; label collapses like the existing CTA).
2. `DashboardLabComponent.openEmergingReport()`: `primeEntityAowContext()` → set managed state with `indicator: null`, `emerging: true` → open drawer on `report` tab.
3. Extend `indicator-drawer` so `indicator` is optional when emerging; do not fetch existing contributors; hide `info` / `results` tabs; pass through to `lab-report-form` with `emergingCategory=null` so `needsCategoryChoice` is true (parity with today’s legacy modal, which does not call `setPendingResultType`).
4. Point hub + band + `?reportEmerging=` at that method. Leave `openReportModal()` unused from these paths.
5. Results / My results: bind `(reportEmerging)` and mount the same aside **or** hop (specify).

Why this is the smallest safe path: the form, payload, and aside chrome already exist. The work is **entry + mode**, not a new reporter.

---

## 12. Risks, Dependencies, And Open Questions

| Risk / question | Mitigation |
|---|---|
| Collapsed 48px bar overflows with three actions | Icon-only + `title`/`aria-label` below `sm`; existing `min-w-0` / `truncate` (OSF-T-10). Verify 375px. |
| Indicator-drawer assumes a required indicator (`CLAUDE.md`) | Emerging is an explicit mode; tests must cover null indicator + no contributor GET. |
| Two hosts (dashboard-lab vs Results) could drift | One open method / one drawer API; specify names the single owner. |
| Legacy dialog still reachable via `/emerging` or leftover bindings | Specify lists every caller of `openReportModal` / `showReportModal` and unhooks only the live ones. |
| **OQ-1** Jira ticket? | None provided. Paste a key if this should track as P2-xxxx. |
| **OQ-2** Exact label | Recommend **Report emerging result** (singular, matches hub + legacy title). Confirm if Image 1 copy must stay verbatim. |
| **OQ-3** Results / My results: in-place aside (B) vs hop (A)? | Recommend B. Confirm if a tab jump is acceptable to ship faster. |

---

## 13. Success Criteria

- On all four SP tabs, a user who can report sees **Report emerging result** in the band cluster without opening *Where to report*.
- Clicking it (and clicking the hub’s emerging card) opens the **Reporting aside**, not `report-emerging-dialog`.
- AVISA / `canReportEmerging() === false` shows neither band CTA nor a working hub emerging action.
- *Where to report* still opens the hub; W1/W2 and W3 actions unchanged.
- Planned Reporting **Report** still opens the aside against that KPI (no regression).
- Keyboard: Tab order Tour → Emerging → Where to report; visible focus; Escape on the aside keeps dirty confirm.
- Scoped Jest: band, hub handler, emerging drawer mode. No full client suite.

---

## 14. Next Step

```text
/akili-specify changes/emerging-result-cta-placement
```

After this proposal is approved. Specify will turn the delta into requirements, design (including the Results/My results host decision), and tasks. Optional: persist the four screenshots under `docs/specs/changes/emerging-result-cta-placement/mockup/` before specify.
