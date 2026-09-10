# Archive Summary — `changes/partner-role-separator`

| Field | Value |
|---|---|
| Original path | `docs/specs/changes/partner-role-separator/` → `docs/specs/archive/2026-08-27-changes--partner-role-separator/` |
| Final status | **Shipped** — 2/2 tasks PASS attempt 1; Reviewer (opus) PASS; HITL user-approved |
| Delivered | PRS-R-1..3: labelled "Partner role" group + divider in both partner blocks of `rd-contributors-and-partners/multiple-wps/normal-selector`; typology muted; aria group/pressed; +6 DOM tests (5 mutation-proven). Follow-up polish recorded as `quick/partner-role-pills-polish` (overline label, pill hover/check, reserved check slot for stable alignment). |
| Scope discovery | Siblings (`rd-partners/normal-selector`, both KP selectors) were already compliant → became exemplars, not scope. |
| Evidence | Scoped Jest rd-contributors-and-partners 8 suites / 128 tests · scoped lint 0 · judgment: single Reviewer pass (Lite, no judgment-day) |
| Advisories (recorded, not shipped) | `aria-pressed` on generic div not ARIA-allowed → follow-up spec should make pills `role="button"` + keyboard (fixes pre-existing mouse-only pills); 3 tautological test assertions; `.role_label` hardcodes font vs `fonts.pr-typography`. |
| Commits | 80ace471a · 0111e45ac · c4abb2b85 · c509de46b |
