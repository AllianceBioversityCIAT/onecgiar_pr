# Design — Partner typology / role visual separation (Lite)

| Field | Value |
|---|---|
| Spec / Depth | `changes/partner-role-separator` · **Lite** · Status draft |
| Linked | requirements.md (PRS-R-1..3) · proposal.md · mockup/current-state*.png |
| Budget | **2 tasks · ~90 LOC incl. tests · 1 review round** |

## 1. Summary
Template + SCSS change confined to `multiple-wps/components/normal-selector` (`rd-contributors-and-partners`). Restructure each `pr_chip_selected` row into two zones with a labelled role group, mirroring the sibling selectors. No TS logic changes.

## 2. Structure (per row, applied to BOTH duplicated blocks)
```
.pr_chip_selected
├── .partner_info            ← name + "Institution type: …" (existing .name/.type, .type muted)
└── .role_group              ← NEW wrapper: border-left 1px var(--pr-color-accents-2); padding-left
    ├── label "Partner role"  ← small field-label style (mirror rd-partners' app-pr-field-header usage or a <span class="role_label">)
    └── .deliveries + delete  ← existing markup moved inside, untouched attributes/handlers
```
- Wrap behavior: `.pr_chip_selected { flex-wrap: wrap; }` — when `.role_group` wraps to its own line it swaps to `border-left: 0; border-top: 1px solid var(--pr-color-accents-2); padding-top` (media query ≤ 900px or container wrap via class).
- Read-only: existing `readOnly_deliveries` class kept; label always shows above whatever pills remain (requirement scenario 2).
- A11y: `role="group"`, `aria-label`, `[attr.aria-pressed]` bound to the same `validateDeliverySelectionPartners(...)` call already used for `active`.

## 3. Design decisions
- **`PRS-DD-1` Label copy "Partner role"** — consistency with the three sibling selectors beats the requirement's longer phrase; the full phrase lives in the group's `aria-label`. *(Consequence: one copy across all partner surfaces.)*
- **`PRS-DD-2` SCSS in-module, not Tailwind** — the file is legacy SCSS (pre ux-ui §12); a mixed-mode row would be harder to maintain. Deviation recorded, same rationale as `KPB-DD-8`. *(Consequence: follow-up migration stays possible in one place.)*
- **`PRS-DD-3` No component extraction** — the ToC/Other(s) duplication is edited twice rather than refactored; extraction is a separate cleanup (proposal Non-Goals). *(Consequence: the two blocks must be asserted independently in tests.)*

## 4. Testing plan
Extend `cpnormal-selector.component.spec.ts` (existing spec for this component): per block — label present, `role="group"` present, `aria-pressed` toggles with selection, click still delegates to `rdPartnersSE.onSelectDeliveryPartners`. Read-only: label present, only-active pills. DOM-level (this suite renders the real template).

## 5. Size check (Step 2.4)
2 tasks, ~90 LOC, 1 review round → Lite confirmed (below Standard threshold; not `/akili-quick` because it has structure + a11y + tests across two blocks).
