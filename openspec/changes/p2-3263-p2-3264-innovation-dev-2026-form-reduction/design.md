## Context

Verified on `performance-refactor`, head `640c1e4b4`.

`innovation-dev-info.component.html` renders nine blocks. Four of them already carry a gate; the two this change targets do not:

| Block | Line | Gate today | Data source |
|---|---|---|---|
| `app-anticipated-innovation-user` (P2-3263) | 43 | **none** | Innovation Development summary (`body.innovatonUse.*`) |
| `app-megatrends` (P2-3264) | 60 | **none** | questionnaire (question 125, `result_questions` / `result_answers`) |
| `app-assumptions-examination`, `app-partners-policies-safeguards` | 68-69 | `isP25()` | questionnaire |
| the evidence block | 45 | `isP25()` | evidences |

The two targets draw from **different** sources, which is why one ticket says "section" and the other says "question" — but the front-end job is identical: stop rendering from 2026 on, keep rendering before.

**The completion check is not in the screen.** `results-validation-module.repository.ts:53` calls `validate_sections_mapped_batch`, which resolves `validation_<section>_<portfolio>` in the database. `validation_innovation_dev_P22` exists (`migrations/1761849861521-createValidtionP22.ts:479`) and carries the megatrends condition on `parent_question_id = 52`; **no `validation_innovation_dev_P25` exists anywhere in `src/migrations`**.

## Goals / Non-Goals

**Goals:**
- Both blocks gone from the 2026 form, both intact on earlier phases with their stored answers.
- One gate, named for what it is, reusable by the rest of this epic.
- Nothing deleted: no component, no question, no answer.

**Non-Goals:**
- The green check. It is a database routine; see Open Questions.
- Deleting the components or the questionnaire rows.
- The other blocks in this form — separate tickets in the same epic.
- Whether the 2026 read path should stop returning the megatrends question at all (a backend design choice; this gate is correct either way).

## Decisions

**D1 — Gate on the reporting phase year, through `ReportingDesignYear`.**
The pre-plan on both tickets suggested `isP25()`. Rejected: `isP25()` is the **portfolio**, and prtest holds 2025-phase results inside the P25 portfolio — a portfolio gate would remove the section from a 2025 result and break the epic's governing rule. `ReportingDesignYear` is the mechanism this codebase already uses for exactly this (four 2026 thresholds live there), and its comment block is where the reasoning stays readable. Alternative rejected: an inline `phase_year >= 2026` in the template — that is the scattering the enum exists to prevent.

**D2 — One threshold and one computed for both tickets, not two.**
They are the same rule (this form sheds blocks in 2026) applied to two blocks, shipping together. Two identical thresholds would be a distinction with no difference, and the next reader would have to check whether they can drift. If a future ticket reinstates one of the two independently, splitting then is a one-line change. The threshold's comment names both tickets so the link is not lost.

**D3 — Keep the components and their specs.**
`anticipated-innovation-user` and `megatrends` still render for every previous phase. Deleting them (or their specs) would silently drop the only coverage of behaviour 2025 results still depend on.

**D4 — Do not attempt the green check from the client.**
It would mean reimplementing in TypeScript a rule the database owns, and the two would drift on the first divergence. Both tickets are therefore **partially** delivered, said plainly on each, and the backend half is handed over rather than faked.

**D5 — Complete the `innovation-dev-info` spec's mocks rather than avoid rendering.**
The suite mocked `FieldsManagerService` with only `isP25`, so it never rendered the real template — which is exactly why an un-gated block could sit there unnoticed. Adding `fields()`, `isMegatrendsComplete()` and declaring `PrCheckboxComponent` lets the suite assert on real DOM. Alternative rejected: assert on the component's flags only — that tests the gate, not the template, and the template is where the defect would live.

## Risks / Trade-offs

- **A 2026 result that already answered these blocks keeps hidden stored data** → intended and explicitly required by both tickets ("data may be retained in the database but should not be displayed").
- **The green check may now report the 2026 section as incomplete because of a hidden requirement** → real, and the reason the backend half is not optional. Called out on both tickets; not masked from the client.
- **The PDF/Excel exports may still print these blocks for 2026** → not verifiable from client code; flagged for verification rather than assumed either way.
- **`isP25()` remains in the same template for other blocks** → two gates with different meanings side by side. Mitigated by the comment at each new gate and by the threshold's own doc block.

## Migration Plan

No data migration, no feature flag. Template, enum and service only; rollback is reverting the commit.

## Open Questions

**Backend, blocking the tickets' completion (not this change):**
1. Should the 2026 read path stop returning the megatrends question altogether, or keep returning it with the client gating it? Both work with this gate; it changes only whether the payload carries dead weight.
2. `validation_innovation_dev_P25` does not exist in `src/migrations`. When it is written, neither the megatrends question nor the "Demand of anticipated innovation user" fields may count toward it — and `validation_innovation_dev_P22` must not be touched.
