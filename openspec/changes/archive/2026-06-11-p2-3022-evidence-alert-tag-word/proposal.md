## Why

P2-3022 (QA bug, child of P2-3005). The Evidence section alert for an Impact Area score of 2 dropped the trailing word **"tag"** after the Impact Area name. QA expects `...recorded for Nutrition, health and food security tag. Please...` but the app shows `...recorded for Nutrition, health and food security. Please...`. This was introduced in P2-3005 when the internal tag labels were replaced with the official Impact Area names, which do not end in "tag".

**Frontend-only.** No backend change required.

## What Changes

- In `rd-evidences.component.ts` → `validateCheckBoxes()`, update the alert template so the word `tag` follows the Impact Area name:
  - From: `A principal contribution score (2) has been recorded for ${tag}. Please provide evidence to support this claim.`
  - To: `A principal contribution score (2) has been recorded for ${tag} tag. Please provide evidence to support this claim.`
- Update the related unit test assertion in `rd-evidences.component.spec.ts` to expect the `tag` word.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
<!-- No spec-level behavior change. This is a copy/wording fix to an existing alert; the evidence-required behavior for IA score 2 is unchanged. No module spec under openspec/specs/ owns this string. -->

## Impact

- `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-evidences/rd-evidences.component.ts`
- `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-evidences/rd-evidences.component.spec.ts`
- Jira: P2-3022 (parent P2-3005). SDD baseline: UI copy only, no change to `docs/prd.md` or `docs/detailed-design/`.
