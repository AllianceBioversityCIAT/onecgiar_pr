# Proposal — Visual separation between partner typology and role selector

## Document Control

| Field | Value |
|---|---|
| Slug | `partner-role-separator` — derived from free-text argument (UX requirement: separator between partner typology and role options) |
| Spec path | `docs/specs/changes/partner-role-separator/` |
| Type | Change (UI/UX) |
| Approval Mode | gated |
| Depends on | none |
| Parallel-safe | yes (template + styles of one feature area; no shared modules/migrations/API) |
| Status | approved (user, 2026-08-27) — scope corrected by implementation discovery, see OQ-1 |
| Date | 2026-08-27 |
| Baseline | `docs/ux-ui/design.md` §7 tokens, §8 components, §10 a11y, §12 (Tailwind-only styling rule — this module still uses legacy SCSS; see Risks) |

## Intent

In *Result detail → Contributors & Partners → External Partners* (`/result/result-detail/:id/contributor-partners`), make it visually unmistakable that each selected partner row carries **two independent data points**: the **system-assigned typology** (CLARISA, read-only) and the **user-selected role** in delivering the result (Scaling / Demand / Innovation / Other).

## Problem / Current Behavior

Each selected partner renders as one flat row (`pr_chip_selected`): name + "**Institution type:** …" on the left and the four role pills floating on the right, with no boundary or label between them (`normal-selector.component.html:76-122` and the duplicated "Other(s)" block at `:144-190`). The pills read as part of the typology classification. Users don't realize the pills are an *input* they must set — which is also the row's completeness criterion (`appFeedbackValidation [isComplete]="!!option?.delivery?.length"`), so the confusion directly causes incomplete submissions.

## Proposed Outcome

Within each selected-partner row:

1. **Typology zone** (left): partner name + `Institution type:` value, styled as read-only metadata (muted), optionally with a small "from CLARISA" hint.
2. **Separator**: a visible divider between the two zones — vertical hairline on wide layouts, horizontal rule when the row wraps/stacks on narrow widths.
3. **Role zone** (right): a small field label — **"Partner role in delivering the result:"** — above/beside the four pills, so they read as a selectable input group, with the existing tooltips, active state and delete icon unchanged.

Behavior (selection logic, validation, payload) unchanged — this is presentation only.

## Scope

- `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-contributors-and-partners/components/multiple-wps/components/normal-selector/` — template (both duplicated blocks: ToC partners and Other(s) External Partners) + component styles.
- A11y: role pills group gets `role="group"` + `aria-label="Partner role in delivering the result"`; pills get `aria-pressed`.
- Unit tests for the new structure (label present per row, separator element per row, non-regression of selection handlers).

## Non-Goals

- No change to the role model, payload, or validation rules.
- No refactor of the duplicated ToC/Other(s) blocks into one component (worthwhile, but a separate cleanup).
- Sibling selectors: **verified already compliant** (2026-08-27) — `rd-partners/normal-selector` renders a `Partner role` field header and the two `knowledge-product-selector`s render a `Partner role:` label before the pills. They become the pattern exemplar, not scope.
- The knowledge-product variant of this page.

## Affected Users, Systems, And Specs

| Area | Impact |
|---|---|
| Users | Result submitters filling Contributors & Partners; QA reviewers reading it in read-only mode (pills already collapse to selected-only there — layout must respect that state). |
| Client | `rd-contributors-and-partners` module only. |
| Server / API | None. |
| Specs | None active on this area (`results/intermediate-outcome-aow-visibility` archived). |

## Visual Reference

- Source: User-provided screenshots (current state + annotated red arrow)
- Location: `docs/specs/changes/partner-role-separator/mockup/current-state.png`, `mockup/current-state-annotated.png`
- Notes: cover the exact row to change; target design derives from `docs/ux-ui/design.md` tokens (muted metadata text, hairline `--pr-color-accents-2` divider, field-label typography). No Figma; a target mockup can be generated on request during specify.

## Requirement Delta Preview

### ADDED
- A labelled, visually separated role group per selected partner row ("Partner role in delivering the result:"), in both the ToC and Other(s) blocks.
- A divider between typology and role zones (vertical on desktop, horizontal when stacked).
- Read-only styling cue on the typology line.
- Group/pressed a11y semantics on the pills.

### MODIFIED
- Row layout of `pr_chip_selected` (flex structure + spacing). Read-only (QA) mode keeps showing only the selected roles, now under the same label.

### REMOVED
- None.

## Approach Options

| # | Option | Pros | Cons |
|---|---|---|---|
| A | **Label + divider inside the existing row (recommended)** | Smallest diff; keeps density; fixes the misreading directly at the arrow point | Row gets slightly taller if the label sits above the pills |
| B | Two-line card per partner (typology line, then role line full-width) | Very explicit; room for future fields | Doubles row height; heavy for lists of many partners |
| C | Move roles to a per-partner dropdown/popover | Compact | Hides a required input — worsens the completeness problem |

## Recommended Approach

**Option A.** One structural tweak per block: wrap the pills in a `role_group` with a small label and a left border (`border-left: 1px solid var(--pr-color-accents-2)`) that becomes a top border when the container wraps; typology line turns muted. ~30–50 LOC template+SCSS per block ×2 blocks + tests.

## Risks, Dependencies, And Open Questions

| Kind | Item |
|---|---|
| Risk | This module is legacy SCSS (pre-Tailwind); ux-ui §12 mandates Tailwind for *new* styling. Following the surrounding file's convention keeps the diff minimal — record the deviation, as done for `KPB-DD-8`. |
| Risk | Read-only (QA) mode renders only selected pills — the label must not appear orphaned when zero roles are shown in read-only. |
| OQ-1 | **Resolved (user approved including siblings; code check showed they already have the label/separation).** Actual scope: only `rd-contributors-and-partners/multiple-wps/normal-selector` (both blocks). |
| OQ-2 | **Resolved: label "Partner role"** — matches the existing siblings for cross-page consistency; the requirement's full phrase stays as the pills' tooltip context. |

## Success Criteria

- In the row, typology and roles are visibly two fields (divider + label present for every selected partner, both blocks, edit and read-only modes).
- No change in emitted payloads or validation outcomes (existing specs stay green).
- Scoped Jest for `rd-contributors-and-partners` green; scoped lint clean. Visual check vs screenshots at HITL.

## Next Step

```text
/akili-specify changes/partner-role-separator
```
(Lite depth is enough: presentation-only, no data/API change.)
