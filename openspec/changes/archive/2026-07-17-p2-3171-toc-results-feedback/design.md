## Context

P2-3171 collects Nicoleta Trifa's feedback on the Results & ToC reporting flow. Most items are copy/visibility tweaks, but AC6 is a genuine state-validation bug in a **heavily reused** component (`CPMultipleWPsComponent`), so it needs a deliberate technical decision to avoid regressions. A read-only recon (7 agents) mapped every AC to exact files/lines; this design records the non-obvious choices for the 4 in-scope ACs. AC3 and AC5 are excluded pending clarification (see Open Questions).

Current state (verified in code, branch `P2-2928-TOC-Improvements`):
- AC1 header is inline template text with a dynamic year interpolation (`entityAowService.reportingPhaseYear`), the only occurrence in the client.
- AC2 field is a two-way-bound optional textarea (`toc_progressive_narrative`) in the create-result modal, rendered unconditionally.
- AC4 note lives in the `tocQuestionInfoNote` computed, CP2026 branch only.
- AC6 `completnessStatusValidation(tab)` returns green based solely on `toc_result_id` / `toc_level_id`, never inspecting contribution-to-target.

## Goals / Non-Goals

**Goals:**
- Apply AC1, AC2, AC4 as minimal, isolated edits with no behavior change beyond the requested copy/visibility.
- Fix AC6 so a tab cannot be green while the mandatory contribution-to-target is empty, **only** where that field is actually required.
- Preserve the dynamic reporting-phase year (P2-3053) — no hardcoded "2026".
- Leave server contract untouched (`toc_progressive_narrative` still posted, empty).

**Non-Goals:**
- AC3 (ToC question rewrite / planned-unplanned logic removal) and AC5 (External Partners inheritance banner) — separate follow-up.
- Harmonizing the duplicate ToC-question copies in IPSR / share-request / bilateral drawer.
- Fixing the identical `completnessStatusValidation` gap in the P22 legacy ToC section (out of AC6's "Contributors and Partners" scope).

## Decisions

- **AC1 — keep the dynamic year token.** Change only the surrounding words; keep `{{ entityAowService.reportingPhaseYear }}`. Rationale: P2-3053 deliberately removed the hardcoded year so the label auto-updates each reporting phase. Hardcoding "2026" (the literal in the AC text) would regress that. → surface as a confirm-to-Santi note, but ship the safe default.
- **AC2 — remove the view block, not the model field.** Delete the field-header + info alert + textarea + preceding `separator` div from the pop-up template only. Do **not** touch the TS: `createResultBody` keeps `toc_progressive_narrative: ''` and the POST still sends it. Rationale: the field is `[required]="false"`; removing the model field or the payload key risks a backend 4xx, while leaving it empty is already a valid state. Alternative (strip from payload) rejected — needless contract risk.
- **AC2 — target the create-result pop-up, not the P25 detail page.** The identical label also exists in `multiple-wps-content` (result detail), but it is already hidden there via `@if (!hidden && !isCP2026())` (P2-3036 AC8). Only the create-result modal shows it live, so that is the instance to remove. (Confirm with Santi which pop-up he means — recorded in Open Questions.)
- **AC4 — remove only the redundant plural.** Delete `/indicators` from "…outside the 2026 TOC KPI/indicators" in the CP2026 branch; keep the two singular `indicator` references ("KPI and indicator", "indicator target") and do not touch the 2025 else-branch note. Rationale: AC4 scopes the removal to the word "indicators … implied within the term KPI".
- **AC6 — validate contribution-to-target, gated to where it is mandatory.** Add a boolean to `completnessStatusValidation` requiring `tab.indicators[0].targets[0].contributing_indicator` to be non-null/undefined/`''` (reusing the exact 3-way empty-check already in `multiple-wps-content.component.html`). AND it into the green result **only** when the field is shown/required — i.e. CP2026 **and** a KPI indicator is selected on the tab (`related_node_id` set). Rationale: `CPMultipleWPsComponent` is reused by IPSR, bilateral, 2025 and share-request where this field is not rendered; an ungated check would make those tabs never turn green.

## Risks / Trade-offs

- **[AC6 over-gating hides the bug in some path]** → Gate mirrors the exact template condition that makes the field mandatory (`isCP2026()` + indicator selected), so the check activates precisely where the field is visible. Manual verification on a CP2026 planned result with an empty target confirms red, filled confirms green.
- **[AC6 under-gating regresses reuse contexts]** → Scoped to CP2026 + indicator-selected; IPSR/bilateral/2025/share-request keep current green behavior.
- **[AC2 removed field but payload still expects it]** → Payload unchanged (empty string), `[required]="false"`; no contract risk.
- **[AC1 hardcoded-2026 expectation]** → Shipping dynamic year; flagged to Santi. Trivial to switch to literal if he insists.
- **[No Jest coverage on rd-contributors-and-partners]** → The folder is excluded from Jest coverage; rely on manual verification + existing gates for AC4/AC6. No new tests can meaningfully cover the excluded computed.

## Migration Plan

Pure frontend edits, no data/schema/deploy migration. Rollback = revert the commit. Verify locally with `npm start` (client points to prtest backend) before pushing.

## Open Questions

- **AC3 (blocked):** Does "removing the planned/unplanned logic" mean only the copy, or the full Yes/No branching (financial-resources radio, why-reported justification, isPlanned/isUnplanned ToC-levels fetch)? The latter touches the backend contract. And should the duplicate copies (IPSR, share-request, bilateral) change too? → Santi/Nicoleta.
- **AC5 (blocked):** Exact banner copy, and should it appear in IPSR (shared selector) or only in P25 Contributors & Partners? → Santi/Nicoleta.
- **AC2:** Confirm the intended pop-up is the "Report result" create modal (assumed).
- **AC1:** Confirm keeping the dynamic year vs. literal "2026" (shipping dynamic).
