## Context

QA bug P2-3022, follow-up to P2-3005. The Evidence section alert built in `RdEvidencesComponent.validateCheckBoxes()` concatenates the official Impact Area name into a fixed sentence. The official names (set in P2-3005) do not end in "tag", and the template did not append it, so the rendered alert reads `...recorded for Nutrition, health and food security.` instead of the expected `...recorded for Nutrition, health and food security tag.`.

This is a single-line wording fix in one frontend component plus its unit test. No architectural decision is needed; design is included only to unblock the tasks artifact.

## Goals / Non-Goals

**Goals:**
- Append the word `tag` after the Impact Area name in the score-2 evidence alert.
- Keep the official Impact Area names from P2-3005 intact (do not append `tag` to each array entry).

**Non-Goals:**
- No backend change.
- No change to the alert trigger logic (`level === '3' && !hasTagRelated(related)`).
- No change to the General Information section.

## Decisions

- **Append `tag` in the template string, not in the `tags` array entries.** One change point vs. five. The array entries stay as the clean official names (reused/consistent with P2-3005), and the sentence owns its own grammar. Alternative (append to each array string) rejected: more edits, easy to miss one, mixes display name with sentence grammar.

## Risks / Trade-offs

- [Other consumers of the `tags[].tag` value expect the bare name] → The `tag` value is only used to build this one sentence inside `validateCheckBoxes()`; appending in the template leaves the array untouched, so there is no spillover.
