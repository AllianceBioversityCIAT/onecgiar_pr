## Context

Evidence-section copy lives in three Angular files: `evidence-item.component` (used by `rd-evidences`), `user-evidence.component` (used by `innovation-dev-info`), and `rd-evidences.component.ts` (`alertStatus()` intro notes). The public-file label, the visibility info note, and `getEvidenceRelatedTitle()` are duplicated in both evidence components. Key facts confirmed by reading the code (and second opinions from Gemini/DeepSeek/Codex):

- `user-evidence.component.html` does NOT currently render the checkbox-group title nor any checkboxes; its `getEvidenceRelatedTitle()` is unused. To reach parity we must ADD that markup.
- The public branch of `dynamicAlertStatusBasedOnVisibility()` has a third bullet in `evidence-item` ("You agree to the link...") but only two bullets in `user-evidence`.
- `rd-evidences.component.ts` `alertStatus()` has a separate `isKnowledgeProduct` branch that must be preserved.
- The frontend model `EvidencesCreateInterface` only declares `innovation_use_related` and `innovation_readiness_related` among typology fields.

Backend persistence of new typology columns is a separate ticket (Juanda).

## Goals / Non-Goals

**Goals:**
- Update all Evidence copy (public-file label, public info note third bullet, dynamic title, intro notes).
- Show a per-typology informational checkbox for every typology; send it in the payload so it persists once the backend columns exist.
- Bring `user-evidence` to parity (title + checkboxes).
- Preserve all existing behavior (validations, green checks, KP intro branch, KP special-casing).

**Non-Goals:**
- No backend changes, migrations, or new DB columns (Juanda's ticket).
- No new validation rules (checkboxes are informational).
- No work on P2-2935 (accordion / upload date / padlock / reorder).

## Decisions

- **Show new checkboxes now, persist later.** Add the new `*_related` fields to `EvidencesCreateInterface`, render the typology checkbox bound to them, and include them in the POST payload. Rationale: when Juanda adds the columns + save mapping, persistence activates with zero frontend changes; the extra fields are ignored harmlessly by the server until then. Trade-off: until the backend lands, a checked box for the new typologies is not saved — accepted by the team (Yeck, 2026-06-02).
- **Typology→label mapping in the frontend.** Resolve the label from `result_type_id` (via `dataControlSE`/result object, same source the components already use). Interpolate into the title and use as the checkbox label. Alternative (server label) rejected — static copy, no round-trip needed.
- **`user-evidence` reaches parity by adding markup.** Add `<app-pr-field-header [label]="getEvidenceRelatedTitle()">` and the checkbox block to `user-evidence.component.html` (mirroring `evidence-item`). Rationale: team wants the same UI in Innovation Dev info.
- **Public info-note third bullet replacement (per Ángel 2026-06-02).** In `evidence-item` replace the third public-branch bullet; in `user-evidence` (no third bullet) append the new bullet. The "NOT public" branch is untouched. Rationale: matches the updated User Story and removes the earlier awkward "Yes under No" wording.
- **Preserve the KP intro branch.** Edit only the non-KP path of `alertStatus()`.

## Risks / Trade-offs

- **Unsaved checkbox before backend lands** → Mitigation: fields are already sent; coordinate so Juanda's column work follows soon; informational only (no validation impact).
- **Copy drift across the two components** → Mitigation: edit both in the same change; spec scenarios assert wording.
- **Breaking the KP intro branch** → Mitigation: change only the non-KP branch; covered by `rd-evidences.component.spec.ts`.
- **Label casing inconsistency** → Mitigation: single typology→label map; follow client wording (KP, Other Output, etc.).

## Migration Plan

Frontend only — no DB migration, no backfill. Rollback = revert the component edits.

## Open Questions

- Exact display casing per typology in the title/checkbox (e.g. "KP" vs "Knowledge Product") — follow the client email / Figma wording; confirm any ambiguous label with Ángel.
- Field names for the new typologies must match the columns Juanda will create (`policy_change_related`, `capacity_sharing_related`, `other_output_related`, `other_outcome_related`, `knowledge_product_metadata_related`) — align names with the backend ticket before merge.
