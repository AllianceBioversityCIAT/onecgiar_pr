## Context

The 2026 Contributors & Partners redesign (P2-3063) added a read-only **Indicator Tipology** field beneath the KPI selector, meant to mirror the **Type** column of the ToC. It was wired to the backend alias `indicator_typology`, which is a copy of the ToC's internal sentinel `type_value` — not the human-readable type name. Result: custom KPIs display the literal word `custom`.

### Data flow — ToC levels endpoint (Contributors & Partners, section 2)

```
MySQL  toc_results_indicators
   ├── tri.type_value    "custom" | "Innovation Use" | ""   (sentinel)
   └── tri.type_name     "# partners supporting…"           (display text)
            │
            ▼
toc-results.repository.ts:934-935     SELECT tri.type_value, tri.type_name
            │
            ▼
toc-results.service.ts:398-399        maps BOTH onto the indicator object
            │
            ▼
toc-results.service.ts:607-618        enrichIndicatorCatalogItem()
                                      { ...indicator, indicator_typology: type_value }
            │  payload per indicator: { type_value, type_name, indicator_typology, … }
            ▼
multiple-wps.component.ts:102/125/148 GET_tocLevelsByconfig → outputList/outcomeList/eoiList
            │
            ▼
multiple-wps-content.component.ts:293-301   updateSelectedIndicatorData()
                                            selectedIndicatorData.set(selectedIndicator)
            │
            ▼
multiple-wps-content.component.ts:115-118   indicatorTypologyValue()
                                            ind?.indicator_typology ?? ind?.type_value ?? ''
            │                               ▲ both operands are the SAME value
            ▼
multiple-wps-content.component.html:96-103  @if (isCP2026() && indicatorTypologyValue())
                                            <app-pr-field-header label="Indicator Tipology" …>
```

Two faults in the last two hops:
- The `??` chain never reaches `type_name`, so the sentinel is what renders.
- `@if (… && indicatorTypologyValue())` couples **visibility** to the sentinel, so an empty `type_value` hides the field even when `type_name` is populated.

### Data flow — contribution review panel (notifications, P2-3085)

```
results-toc-results.repository.ts:469-470
        tri.type_name  AS statement            ◀── correct text, already delivered
        tri.type_value AS indicator_typology   ◀── sentinel
            │
            ▼
notification-item.component.ts:12-24   interface TocContributionReview
                                       declares indicator_typology, NOT statement
            │
            ▼
notification-item.component.html:87    {{ review.indicator_typology || '—' }}
```

Same defect, different screen. The correct text already arrives and is silently dropped.

### Field census — prtest, SP01–SP07, 59 KPIs

| Pattern | Count | `type_value` | `type_name` | Today | After |
|---|---|---|---|---|---|
| Catalogue type | 43 | `Innovation Use` | `Innovation Use` | correct | unchanged |
| Custom KPI | 7 | `custom` | real name | shows `custom` | `custom — <real name>` |
| Empty sentinel | 6 | `""` | real name | **field hidden** | shows the real name alone |
| No type at all | 3 | `""` | `""` / null | field hidden | `Not specified` |
| Dirty sentinel | 1 | `_n_Realized genetic…` | `Realized genetic…` | shows `_n_…` | both, joined |

### Constraints

- **Branch origin is forced.** The field exists only in `P2-2928-TOC-Improvements` (and in `dev`, which must never be a source). `staging` and `master` do not have it; PR #719 is still OPEN. The working branch is cut from the epic.
- **2026 only.** Everything here is behind `isCP2026()`; the 2025 phase never renders this field.
- **The AI must not change server code for this change.** None is needed.

## Goals / Non-Goals

**Goals:**
- Show the ToC marker together with the real KPI type name wherever PRMS labels something "Indicator Typology", without repeating a value that appears in both fields.
- Stop the field from vanishing when the ToC sentinel is empty but a type name exists.
- Make the resolution explicit and readable, replacing a `??` chain whose two operands are identical.
- Keep the two screens (section 2 and the contribution review panel) consistent with each other and with the Results Framework table.

**Non-Goals:**
- **No backend change.** Both payloads already carry the text.
- **No sanitising of dirty ToC values.** The `_n_` prefix lives in `type_value`; `type_name` is already clean. A sanitiser is unrequested logic that would break on the next malformed value.
- **No change to `checkAlert()` in `target-indicator.component.ts:65`.** That code reads `type_value !== 'custom'` as a *functional* sentinel to decide an alert. It is correct as-is and must stay untouched — this change only affects *presentation*.
- **No rename of the backend `statement` alias.** Confusing, but renaming is a server change with its own blast radius. Logged as a follow-up for the backend owner.
- No change to saving, validation, or section completeness.

## Decisions

### D1 — Render both values, sentinel first, joined only when they differ

```
both present and different  →  "<type_value> — <type_name>"     e.g. "custom — # partners supporting…"
both present and identical  →  the value once                   e.g. "Innovation Use"
only one present            →  that one
neither                     →  "Not specified"
```

**Why:** requested by Yecksin on 2026-07-28. Keeping the ToC marker in view preserves the information reporters use to tell a custom KPI apart from a catalogue one, while the descriptive name — the text they read in the ToC "Type" column — is no longer lost.

The de-duplication is not cosmetic polish: the two fields are identical in 43 of the 59 KPIs surveyed, so joining unconditionally would render `Innovation Use — Innovation Use` in 73% of cases. Joining only on difference keeps the pairing meaningful exactly where it carries information.

**Alternatives considered:**
- *Show `type_name` only* — the original recommendation, implemented first and then superseded. It matches `aow-hlo-table.component.ts:102`, which renders `type_name` under the same label, but it drops the marker that distinguishes a custom KPI from a catalogue one.
- *Join unconditionally* — rejected. `Innovation Use — Innovation Use` in 43 of 59 records is noise.
- *Keep `type_value` and map `custom` to a friendlier word* — rejected. It would still hide the real KPI type, which is the actual information the user is asking for.

### D2 — Decouple visibility from the resolved value

The template guard drops to `@if (isCP2026())` (plus the existing selection guards already wrapping the block), and the empty case is expressed as a `Not specified` placeholder inside the field.

**Why:** a field that silently disappears is worse than one that says it has no value — the user cannot distinguish "no type" from "PRMS failed to load it". This also matches the sibling fields directly beneath it, which already render `'Not specified'` (`multiple-wps-content.component.html:108-109`).

**Alternative considered:** keep hiding the field when there is genuinely no type. Rejected for the reason above, and because the sibling fields set the precedent in the same block.

### D3 — Apply the same resolution in the contribution review panel

`notification-item.component.html:87` renders `tocTypologyOf(review)`, which applies the D1 rule to `statement` and `indicator_typology`, and `statement?: string` is added to `TocContributionReview`.

**Why:** the correct text is already in the payload; consuming it is a frontend-only change. Leaving this screen showing `custom` would reintroduce the same contradiction we are removing from section 2.

The existing `'—'` placeholder is kept here rather than `Not specified`, because `'—'` is the established convention across every row of that panel.

**Alternative considered:** ask the backend owner to rename `statement` → `indicator_typology_name` first. Rejected as a blocker — it is cosmetic, server-side, and would stall a frontend fix. Logged as a follow-up.

### D4 — Fix the `Indicator Tipology` label typo in the same change

Corrected to `Indicator Typology`, matching `aow-hlo-table.component.ts:102`.

**Why:** it is the same field, in the same block, in the same commit. Splitting a one-word typo into its own ticket costs more than it saves.

## Consumers of the same data (must keep working)

- `target-indicator.component.ts:65` — `checkAlert()` uses `type_value !== 'custom'` as a functional sentinel. **Untouched.** Confirms `type_value` must remain in the payload; this change only stops *displaying* it first.
- `aow-hlo-table.component.ts:102` — Results Framework table, already renders `type_name`. **Untouched**; it becomes the reference behaviour.
- `multiple-wps-content.component.html:106-111` — "Unit of measurement" and "Target" read from the same `selectedIndicatorData()` signal. **Untouched**; only the typology computed changes, so their rendering is unaffected.
- `notification-item.component.html:86` — `outcome_statement` comes from `tr.result_description`, a different column than the `statement` alias. **No collision.**

## Risks / Trade-offs

- **[Nicoleta may prefer the name alone]** → D1 is isolated in a single computed per screen; reverting to name-only is a few lines plus their tests. This is a display decision, not an architectural one.
- **[The dirty `_n_` record renders both halves of near-identical text]** → cosmetically poor in 1 of 59 records, but faithful to the ToC. Stripping the prefix would be unrequested sanitising that breaks on the next malformed value; the ToC record is the thing worth fixing upstream.
- **[`statement` is a confusing backend alias that a future refactor could rename or drop]** → the front reads `statement || indicator_typology`, so a rename degrades to the current behaviour instead of rendering blank. Follow-up logged for the backend owner.
- **[The field now appears where it used to be hidden, in 6 of 59 records]** → this is the intended fix, but it is a visible change beyond the reported bug. Called out explicitly in the QA steps so testers are not surprised.
- **[Branch cut from an epic with an open PR]** → the epic's PR #719 could merge to staging while this work is in flight. Mitigation: cut the branch from the epic and merge it back into the epic *before* #719 closes; if #719 merges first, rebase onto `staging`, where the field will then exist. Precedent: `P2-2928-TOC-Improvements-statement-fix` (P2-3202).
- **[No Jira ticket exists yet]** → implementation is blocked on the ticket id, since branch and commit conventions require it. Santiago was asked on Slack (2026-07-28) whether he creates it or we do.

## Migration Plan

1. Obtain the Jira ticket id (blocking).
2. Cut `P2-XXXX-toc-indicator-typology-real-name` from `origin/P2-2928-TOC-Improvements`.
3. Implement, unit-test, run lint + Jest with coverage thresholds green.
4. Merge into the epic; the epic ships to dev for QA and then to staging via PR #719.
5. **Rollback:** revert a single frontend commit. No data, schema, or contract is touched, so rollback is total and immediate.

## Open Questions

- ~~Option A (name only) or Option B (`custom — name`)?~~ **Resolved 2026-07-28: Option B**, chosen by Yecksin after seeing A implemented. Nicoleta may still weigh in.
- Should the backend `statement` alias be renamed to something self-describing? Out of scope here; for the backend owner (Juan David).
- The dirty `_n_` prefix in one SP01 record — is that a ToC data-entry issue worth reporting upstream? Not handled in code by design.
