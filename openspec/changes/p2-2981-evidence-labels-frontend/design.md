## Context

The Evidence section copy lives in three Angular files: `evidence-item.component` (used by `rd-evidences`), `user-evidence.component` (used by `innovation-dev-info`), and `rd-evidences.component.ts` (the `alertStatus()` intro notes). The public-file label and the "NOT public" info note are duplicated across the two evidence components. The checkbox-group title is produced by `getEvidenceRelatedTitle()` (duplicated in both `.ts` files). Backend persistence of per-typology checkboxes is owned by a separate ticket (Juanda) and is out of scope here.

## Goals / Non-Goals

**Goals:**
- Update all Evidence-section copy as specified (public-file label, info note, dynamic title, intro notes).
- Make the checkbox-group title resolve the typology label from `result_type_id`.
- Keep both evidence components (`evidence-item` and `user-evidence`) in sync.
- Preserve all existing behavior (validations, green checks, KP special-casing).

**Non-Goals:**
- No backend changes, no migrations, no new DB columns (Juanda's ticket).
- No persistence of new type checkboxes for typologies that lack a column.
- No new validation rules (new checkboxes are informational).
- No work on P2-2935 (accordion / upload date / padlock / reorder).

## Decisions

- **Typology→label mapping in the frontend.** Map `result_type_id` to its display label inside the component (or a small helper) and interpolate it into the title string. Rationale: the correct label is known from `ResultTypeEnum`; the title is pure text and needs no backend. Alternative considered: server-provided label — rejected, unnecessary round-trip for static copy.
- **Edit copy in place, duplicated across both components.** Update the same strings in `evidence-item` and `user-evidence`. Rationale: matches the current structure; extracting a shared component is a larger refactor out of scope for a copy change. Trade-off: two edit sites — mitigated by updating both in the same change and covering with specs.
- **Type checkbox stays bound to existing fields only.** Render the type checkbox using existing fields (`innovation_use_related`, `innovation_readiness_related`). For typologies without a column, defer rendering a persisting checkbox to Juanda's backend ticket. Rationale: no column = nowhere to save; avoids a broken control.
- **No validation changes.** New checkboxes are informational. Rationale: client asked only for the title text; second opinions (Gemini/DeepSeek/Codex) agreed on shipping frontend first; Innovation Use already exists as a checkbox with no validation (precedent).

## Risks / Trade-offs

- **Copy drift between the two components** → Mitigation: edit both in the same change; spec scenarios assert the wording.
- **Title label mismatch with backend typology names** → Mitigation: derive labels from the same `ResultTypeEnum` values used elsewhere; verify against the Figma mockup wording.
- **Reviewer confusion about the deferred checkbox** → Mitigation: documented explicitly here and in `proposal.md` as Juanda's separate backend ticket.

## Migration Plan

Not applicable — frontend copy only. No DB migration, no data backfill. Rollback = revert the component edits.

## Open Questions

- Final display label for each typology in the title (e.g. "KP" vs "Knowledge Product") — follow the client email / Figma mockup wording; confirm with Ángel if any label is ambiguous.
- Whether the type checkbox should be shown (disabled/hidden) for typologies pending the backend column — default: keep current behavior (only show where a field exists) until Juanda delivers.
