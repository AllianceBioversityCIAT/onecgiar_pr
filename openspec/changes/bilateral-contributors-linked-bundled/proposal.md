## Why

The bilateral (W3) **Contributors & Partners** section shows the question *"Is this result linked or bundled with another CGIAR-reported result (such as innovation, KP, policy, etc.)?"* greyed out with a `Coming soon` tag, because neither `SaveBilateralContributorsDto` nor the bilateral detail payload has anywhere to put the answer. Santiago Sánchez reported it on 2026-09-23 while testing result **9600** in prtest (finding 6 of the bilateral notifications thread), and Ángel Jarrín asked for it to be verified and pointed at the parent story: the behaviour is already specified in **P2-3368 AC10–AC14**, which is `Released Into Live` with those criteria unbuilt.

The marker is honest — it never pretends the answer is saved — but the requirement exists, the storage exists, and the reporter has no way to record a link today.

## What Changes

**Full-stack** (client + server). No schema migration: `result.has_innovation_link` and the `linked_result` table already hold this exact answer for W1/W2.

- **Server** — `SaveBilateralContributorsDto` accepts `has_innovation_link` and `linked_results`; `BilateralCenterService.saveContributors` persists them under the **P2-3424 narrow protocol**; the bilateral detail GET returns them so the section can rehydrate. ⚠️ Backend work is required and is in scope here (simple DTO + service + mapping; no infrastructure, no migration, no green-check function).
- **Client** — the question and its results dropdown stop being disabled, hydrate from the detail GET, travel in the autosave payload, count towards the hidden-fields note (AC13) and render correctly read-only (AC14).
- **Scope exclusion (deliberate)** — result types **2 (Innovation Use)** and **7 (Innovation Development)** keep the question out of Contributors. Type 2 already asks it in its own type-specific section (`type-innovation-use.component.html:332`), so showing it twice over one stored answer is the defect P2-3199 removed; type 7 writes a mirror row (`results_innovations_dev.has_innovation_link`) that only the classic writer maintains and that the green-check functions read. For those two types the block is hidden, not disabled — nothing regresses, because today it cannot be answered at all.
- **Removals** — the `Coming soon` tag, the `globalDisabled` wrappers and the `data-testid="linked-result-coming-soon"` hook disappear for the types in scope. The `[isStatic]="true"` literal on the results multi-select becomes `!readOnly()` (the P2-3520 trap: a submitted result would otherwise render the picker as editable).

## Capabilities

### New Capabilities
- `bilateral-linked-bundled-result`: how the bilateral Contributors & Partners section asks, stores, rehydrates and displays the linked/bundled answer, and which result types it applies to.

### Modified Capabilities
<!-- none: no existing spec under openspec/specs/ states requirements for this section -->

## Impact

- **Server**: `api/bilateral/dto/save-bilateral-contributors.dto.ts`, `api/bilateral/services/bilateral-center.service.ts`, `api/results/results.service.ts` (`getBilateralResultById`), `api/results/result.repository.ts` (`getCommonFieldsBilateralResultById`). Reuses `ResultsInnovationsUseRepository` (already provided by `bilateral.module.ts:197`) — no new module import.
- **Client**: `pages/bilateral/components/section-contributors/*` (component, template, both spec suites, folder `CLAUDE.md`).
- **Shared data**: `linked_result` is written by other sections too; the narrow protocol is what keeps their rows alive.
- **Jira**: P2-3368 (AC10–AC14). Sibling precedent: P2-3443, which did the same for External partners.
- **SDD baseline**: `docs/prd.md` (bilateral reporting), `docs/trd/trd.md` (bilateral module, shared `linked_result` writers), `docs/ux-ui/design.md` (full-metadata block).
