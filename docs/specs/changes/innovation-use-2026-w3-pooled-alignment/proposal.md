# Proposal — Innovation Use 2026: align the W3/Bilateral screen with the pooled (W1/W2) form

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/innovation-use-2026-w3-pooled-alignment` |
| Slug | `innovation-use-2026-w3-pooled-alignment` — given by the user in the brief |
| Type | Change |
| Deliverable | software |
| Approval Mode | gated — **approved by Santiago Sánchez 2026-11-26** while OQ-1 is pending with Nicoleta ("puedo aprobar la propuesta mientras ella responde"). C-1 (Farmers copy) is fenced: specified as a blocked task, not built until OQ-1 is answered |
| Ticket | Freshservice **SR/INC-169264** "Adjustments to Innov use data fields & flow" — Nicoleta Trifa's PRTest feedback of **2026-11-26 14:01** ("Pls align pooled and non-pooled on this") |
| Requirement source | Ticket print `Inno Use Data fields.pdf` p.4–5 (3 annotated screenshots of the W3/Bilateral form) |
| Visual source | Nicoleta's annotated screenshots (ticket p.5); the target is the existing W1/W2 form — no new mockup needed (see §8) |
| Related specs | `changes/innovation-use-2026-total-and-new-users` (IU26, open: T-8/T-9 pending acceptance) · archive `2026-11-03-changes--innovation-use-farmer-count-nature` (P2-4048, Farmers copy) · archive `2026-11-23-changes--innovation-use-nature-all-actors` (INA) |
| Depends on | `changes/innovation-use-2026-total-and-new-users` (builds on its W3 totals and CUU block; same branch `qa-development-2026-ss`) |
| Parallel-safe | no — same W3 component as IU26 |
| HITL owners | Nicoleta Trifa (product: OQ-1, OQ-2) · Santiago Sánchez (scope, release) |
| Author / date | Claude (T1) with Santiago Sánchez · 2026-11-26 |

## 2. Intent

A centre reporting a W3/Bilateral Innovation Use result in 2026 sees **the same categories, fields, labels and help text** as a pooled (W1/W2) result, except the "Of which NEW" field, which stays W1/W2-only (agreed in IU26).

## 3. Problem / Current Behavior

| # | Nicoleta's finding (ticket p.5) | Today in code |
|---|---|---|
| C-1 | Farmers follow-up: "climate advisories" and "actively used a digital tool or service" struck through — "not listed for pooled results" | Both forms read the **same constant** `FARMER_FOLLOW_UP_COPY` (`onecgiar-pr-client/src/app/shared/components/innovation-use-form/farmer-follow-up.ts:46,52`), rendered by W1/W2 at `innovation-use-form.component.html:995-1007` and by W3 at `type-innovation-use.component.html:410-431`. The text is identical on `origin/master`, `origin/staging` and `origin/performance-refactor` (`git show <branch>:…/farmer-follow-up.ts`, run 2026-11-26). No other copy exists in client or server (`git grep "Advisories delivered"`). **The two screens cannot differ in this text** — so the request is most likely "remove these words", not "align" (OQ-1) |
| C-2 | "Addressing demands" box appears for W3, "not sure why" | W3 actor and organization cards render it (`type-innovation-use.component.html:525,594`). The W1/W2 current-use form has no such field (`grep addressing_demands shared/components/innovation-use-form/*.ts *.html` → no hit). The value is part of the bilateral API contract (`onecgiar-pr-server/src/api/bilateral/bilateral.service.ts:2716-2801, 2968, 3000`) |
| C-3 | "I don't see Organizations as category for W3/bilat" | Organizations exist in W3 but only inside the optional **full metadata** toggle `@if (showAllFields())` (`type-innovation-use.component.html:210-227`, default `signal(false)` at `.ts:196`). The main block goes Actors → "Add another actor" (`:136`) → Other quantitative measures (`:145`). W1/W2 shows Actors → Organizations → Other measures (`innovation-use-form.component.html:336,340,440,498`). The W3 totals **already** add organizations (`type-innovation-use.component.ts:337-340` → `totalsByCategory(actors, organization, measures)`), so the tile can show a figure the user cannot see unless the toggle is open |
| C-4 | "Add another actor" and "Add other" buttons underlined | W3 labels: "Add another actor" (`:136`), "Add another organization" (`:226`), "Add other" (`:179`). W1/W2 labels: "Add actor" (`:336`), "Add organization" (`:440`), "Add other" (`:498`). The underline most likely marks **where Organizations is missing** (between the two buttons) — the label wording is a secondary difference |

## 4. Proposed Outcome

On a **2026** W3/Bilateral Innovation Use result (result-detail and the bilateral centre page):

1. The Farmers follow-up descriptions read the text Nicoleta confirms (OQ-1) — one constant, so W1/W2, W3 and the QA catalog change together.
2. "Addressing demands" is no longer shown on current-use actor and organization cards. Stored values are kept and the bilateral API still accepts and returns them.
3. Organizations appear in the main block, between Actors and Other quantitative measures, outside the full-metadata toggle — optional, as in W1/W2.
4. Add buttons read "Add actor", "Add organization", "Add other".
5. 2025 W3 results look exactly as today.

## 5. Scope

| In | Out |
|---|---|
| W3 component `pages/bilateral/components/section-type-specific/type-innovation-use/` (template, small TS gates, specs, folder `CLAUDE.md`) | The 2030 Use Projection block (hidden for W3 since IWH) |
| Shared `farmer-follow-up.ts` copy (only if OQ-1 says remove) + the QA catalog label source if it holds the description | `/api/bilateral/*` contract and the bulk uploader — payload unchanged |
| Phase gate: 2026+ only (same gate as IU26 `currentUseTotalLabels`) | "Of which NEW" on W3 (stays out, IU26 decision) |
| | PDF, QA drawer, IPSR (no change requested) |

## 6. Non-Goals

- No schema or migration change; no data deletion (`addressing_demands` stays stored).
- No new MDS requirement: Organizations stays optional in the W3 screen MDS and the server submit gate.
- No restyling of the W3 page beyond moving the Organizations section.

## 7. Affected Users, Systems, And Specs

| Who / what | Effect |
|---|---|
| Centres reporting W3/Bilateral results (screen) | See Organizations without opening full metadata; fewer fields |
| Centres using the bilateral API / bulk upload | None — contract unchanged (to be stated in the PR, AGENTS.md §6) |
| W1/W2 users | Only if OQ-1 removes words from the shared copy |
| QA catalog | Label text if OQ-1 changes it (`onecgiar-pr-server/src/api/qa-catalog/values/label-sources.ts:403` holds the label; description source to confirm at specify) |
| IU26 spec | Its T-9 PRTest acceptance continues once this ships to PRTest |

## 8. Visual Reference

- Source: None new — Nicoleta's annotated screenshots (ticket print p.5) + the existing W1/W2 form as the target layout.
- Location: `C:\Users\User\Downloads\Inno Use Data fields.pdf` (p.5); W1/W2 reference `onecgiar-pr-client/src/app/shared/components/innovation-use-form/innovation-use-form.component.html:220-500`.
- Notes: the change moves an existing section and hides one field; a mockup adds no information. If Nicoleta wants to see it before PRTest, a screenshot from local will do.

## 9. Requirement Delta Preview

### MODIFIED Requirements

- **W3 2026 current-use layout:** Actors → Organizations → Other quantitative measures, all in the main block; Organizations no longer behind "Complete full metadata".
- **W3 add-button labels:** "Add actor" / "Add organization" / "Add other".
- **Farmers follow-up descriptions** (shared): per OQ-1.

### REMOVED Requirements

- **"Addressing demands" input on W3 2026 current-use actor and organization cards** (hidden; value preserved and still served by the API).

## 10. Approach Options

| Option | What | Pros | Cons |
|---|---|---|---|
| **A. Gate by phase in the W3 template** | Move the Organizations block above the toggle for 2026+; `@if (!is2026)` around Addressing demands; rename labels for all years; copy change in the shared constant | Smallest diff, one component; 2025 untouched; reuses IU26's phase gate | W3 template keeps two layouts (2025 vs 2026) |
| B. Render the shared `innovation-use-form` for W3 | Replace the W3 cards with the W1/W2 component | One form forever | Large refactor: W3 has its own autosave, MDS tracker, bilateral payload; high regression risk days before the release |
| C. Copy-only fix now, layout later | Do only C-1 and C-4 | Tiny | Leaves the main complaint (Organizations) open |

## 11. Recommended Approach

**Option A.** It closes all four findings in the W3 component alone, keeps the bilateral payload and 2025 screens unchanged, and fits before the IU26 production release. Organizations stays optional, so the screen MDS, the server submit gate and the API MDS do not change.

## 12. Risks, Dependencies, And Open Questions

| # | Item | Proposed answer / mitigation |
|---|---|---|
| OQ-1 | The Farmers text is already identical in both screens. Does Nicoleta want "climate advisories" and "actively used a digital tool or service" **removed from both**, or was she comparing against another screen? | Ask with a screenshot of the W1/W2 text on PRTest (result 6433). Until answered, C-1 is not built. If removed: change the shared constant + specs + QA catalog in one commit |
| OQ-2 | Organizations in W3: optional (like W1/W2) or required? | **Optional** (recommended) — required would break the API MDS for centres already submitting |
| R-1 | Hiding "Addressing demands" while centres still send it via API → data exists that the screen does not show | Accepted; stated in the PR and the W3 `CLAUDE.md`. Same pattern as IU26 removed fields ("only hidden; data kept") |
| R-2 | Moving Organizations out of the toggle may change the "Complete full metadata" counter / expandable state | Check at specify which fields the toggle counts; cover with a spec |
| R-3 | Label rename applies to 2025 too | Labels only; recommend all years for consistency (2025 must "look exactly as before" per IU26 test step 3 → **gate the rename to 2026** if Nicoleta prefers strict 2025 parity) |
| D-1 | Depends on IU26 being on the same branch | Build on `qa-development-2026-ss`; deploy to PRTest together |

## 13. Success Criteria

- On PRTest, W3 result 8427 (2026): Organizations visible between Actors and Other measures without opening full metadata; no "Addressing demands"; buttons "Add actor / Add organization / Add other"; tiles show the Organizations total.
- W3 2025 result unchanged; W1/W2 result 6433 unchanged (except the copy, if OQ-1 says so).
- `/api/bilateral/*` responses byte-identical for a sample result before/after.
- Nicoleta confirms "aligned" on the ticket.

## 14. Next Step

```text
/akili-specify changes/innovation-use-2026-w3-pooled-alignment
```

(Lite depth — UI-only change in one component, plus the shared copy once OQ-1 is answered.)
