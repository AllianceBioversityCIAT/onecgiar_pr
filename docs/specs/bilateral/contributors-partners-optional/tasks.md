# Tasks — Bilateral External partners: optional, in Full metadata

## Document Control

| Field | Value |
|---|---|
| Module | `bilateral` |
| Sub-feature | `contributors-partners-optional` |
| Depth | **Lite** |
| Requirements | `./requirements.md` · Design: `./design.md` |
| Branch | new branch from `origin/performance-refactor` (`db1317995`); never merge to `staging` without asking |
| Ticket | P2-3821 |
| Status | approved (2026-09-29) |

## Order

`BCP-T-1` (component logic + unit spec) → `BCP-T-2` (template + real-template spec + docs). There is no parallelism: T-2 binds the template to the computed that T-1 adds.

## Coverage (scenario / clause → task)

| Clause | Owner |
|---|---|
| BIL-AC-1: read-only, no answer → complete; **BUT** does not list External partners | T-1 (tracker publishes no item in any state, read-only included) |
| BIL-AC-2: Submit enabled; **AND IT MUST** register no `external-partners` item | T-1 |
| BIL-AC-3: collapsed → not rendered; expanded → rendered for every type | T-1 (`showFullMetadata` value) + T-2 (real template bound to it) |
| BIL-AC-4: types 2/7 → partners render; **BUT** the linked question does not | T-1 (gate values) + T-2 (real template) |
| BIL-AC-5: hydrated → three keys; ticking → `institutions: []` | T-1 (existing payload specs kept green, unchanged) |
| BIL-AC-6: not hydrated → none of the three keys | T-1 (existing specs kept green, unchanged) |
| BIL-AC-7: note counts 1 / 0 (not hydrated or no answer) / 2 (both) | T-1 |
| BIL-AC-8: centres banner visible while collapsed | T-2 |
| BIL-AC-9: no required marker, no red hint | T-2 |
| BIL-R-6: linked question keeps its type rule | T-1 (gate) + T-2 (template) |
| BIL-R-10: comments / docs cite P2-3821 | T-1 (`.ts` comments) + T-2 (`.html` comments, `CLAUDE.md`) |

---

### [x] `BCP-T-1` — Drop the tracker item; add the Full metadata gate; count partners in the hidden-fields note

- **Type:** `client`
- **Status:** pending · **Size:** S
- **Implements:** BIL-R-2, BIL-R-3, BIL-R-4, BIL-R-6, BIL-R-10 (`.ts`) · BIL-AC-1, 2, 3, 4, 5, 6, 7
- **Design refs:** §3.2, BIL-DD-1, BIL-DD-2; Premise Ledger P-3, P-4, P-5, P-7, P-8
- **Depends on:** — · **Blocks:** T-2
- **Files (expected):**
  - `onecgiar-pr-client/src/app/pages/bilateral/components/section-contributors/section-contributors.component.ts`
  - `onecgiar-pr-client/src/app/pages/bilateral/components/section-contributors/section-contributors.component.spec.ts`
- **Steps:**
  0. Branch from `origin/performance-refactor`. The worktree's `src/environments/` is **empty** (gitignored). Copy it from `/Users/jguzman/GitHub/CGIAR/onecgiar_pr/onecgiar-pr-client/src/environments/` before running any client suite; otherwise every suite dies with `Cannot find module` / `Tests: 0`.
  1. **Red first.** In the spec:
     - rewrite the tracker assertions (:1035, :1047, :1146-1170, :1329-1350) to expect no `external-partners` key in any state (hydrated / not, box ticked / not, load failed);
     - add `showFullMetadata` cases for type 1, 2 and 7 with `showAllFields` false/true, and assert `showLinkedResultQuestion` stays false for 2/7;
     - add hidden-count cases: partners-only → 1, box ticked → 1, partners not hydrated → 0, type 2 with partners → 1, type 1 with partners + linked answer → 2.
  2. **Implement.**
     - Drop the `external-partners` entry from `updateContributorsMds()`.
     - Add the named computed `showFullMetadata`.
     - Restructure `hiddenFieldsWithValues` as linked count + partner count (`partnersHydrated() && externalPartnersSatisfied()`), so the type-2/7 early return no longer zeroes the partner count.
     - Rewrite the comments that call the field mandatory (`:270`, `:296`, `:720-734`, `:837`, the P2-3368 AC5/AC7 notes) to cite P2-3821.
  3. **Leave untouched:** `buildContributorsPayload`, hydration, `onNoExternalPartnersChange`, `removePartner`, `externalPartnersSatisfied`.
- **Tests:** the `section-contributors.component.spec.ts` updates above.
- **Verification:**
  - `cd onecgiar-pr-client && npx jest --silent --reporters=summary --no-coverage src/app/pages/bilateral/components/section-contributors src/app/pages/bilateral/pages/bilateral-result-creator`
  - `npx tsc -p onecgiar-pr-client/tsconfig.app.json --noEmit`
  - `npx ng lint --quiet` (client)
  - **Falsifier:** restore the `external-partners` item in `updateContributorsMds()`, and the tracker specs go red on the key list. Separately, set `showFullMetadata` to `showLinkedResultQuestion()`, and the type-2/7 cases go red. Both are executed against the post-change code and then reverted.
  - **Red run:** step 1's new assertions fail on the pre-change code **on the key-list / count assertion itself**:
    - key list: `toEqual(['lead-center'])` receives `['lead-center','external-partners']`;
    - count: `toBe(1)` for type 2 receives `0`;
    - gate: `showFullMetadata` is `undefined`, a TypeError, which counts as a red only for that case.

    A red from setup or a missing provider is not a red.
  - **Disqualifier:** if the `Tests:` line reads 0 suites/tests, or the run dies on `Cannot find module …environment`, the result is not evidence (step 0 was skipped). If a pre-existing payload spec (BIL-AC-5/6) had to be edited to go green, stop: the payload changed, which violates BIL-R-3.
  - **Consumers:**
    - `section-contributors.component.spec.ts` (:1035, :1047, :1072-1139, :1146-1170, :1260, :1304-1350, :1546-1767);
    - `bilateral-result-creator.component.spec.ts:383-387` (a generic footer fixture that uses the key only as sample data: leave it, and confirm it stays green);
    - `section-contributors.readonly.spec.ts` (owned by T-2).
- **Review:** `checklist`. The change is small and single-component, but it touches the Submit gate, so it is not skip-eligible.
- **Skills:** `angular-developer`, `tdd`
- **Done criteria:**
  - [ ] The red run was observed on the behavioural assertions, then went green.
  - [ ] The falsifiers were executed and reverted.
  - [ ] The payload specs stayed green unchanged.
  - [ ] `tsc`, lint and jest are clean on the scoped paths.

### [x] `BCP-T-2` — Move the partner block into Full metadata in the template; real-template spec; docs

- **Type:** `client`
- **Status:** pending · **Size:** S
- **Implements:** BIL-R-1, BIL-R-2 (markers/hint), BIL-R-5, BIL-R-6 (template), BIL-R-10 (`.html`, `CLAUDE.md`) · BIL-AC-3, 4, 8, 9
- **Design refs:** §3.1, §3.3, BIL-DD-2, BIL-DD-3; Premise Ledger P-4, P-7, P-8
- **Depends on:** T-1
- **Files (expected):**
  - `onecgiar-pr-client/src/app/pages/bilateral/components/section-contributors/section-contributors.component.html`
  - `onecgiar-pr-client/src/app/pages/bilateral/components/section-contributors/section-contributors.readonly.spec.ts`
  - `onecgiar-pr-client/src/app/pages/bilateral/components/section-contributors/CLAUDE.md`
- **Steps:**
  1. **Red first** in `readonly.spec.ts` (real template):
     - with `showAllFields=false`, the "External partners" picker is absent for type 1 and type 2;
     - with `true`, it is present for both, and for type 2 "Is this result linked or bundled" is absent;
     - the multi-select host carries no required marker and the text "Add at least one external partner" is absent;
     - `centers-load-error` renders with `showAllFields=false`;
     - update the `PARTNER_PICKER_LABELS` read-only / editable cases to set `showAllFields=true` before looking up "External partners".
  2. **Implement.** Per design §3.1:
     - move `centers-load-error` into Block 1;
     - change the Full metadata container to `@if (showFullMetadata())` holding the intro line, then `sc-block--partners` (the partners-load banner, the checkbox, the multi-select with `[required]="false"`, the chips, and no hint), then the linked question under `@if (showLinkedResultQuestion())`;
     - update the P2-3368 comment on the block to cite P2-3821.
  3. Update `section-contributors/CLAUDE.md` lines 28-30, 93 and 117 so they no longer state that `external-partners` is published to the tracker. Record the P2-3821 decision there.
  4. **Manual visual check** (HITL): run the local client and open one Policy and one Innovation Use bilateral result, collapsed and expanded, in Editing and read-only.
- **Tests:** the `section-contributors.readonly.spec.ts` updates above.
- **Verification:**
  - `cd onecgiar-pr-client && npx jest --silent --reporters=summary --no-coverage src/app/pages/bilateral/components/section-contributors`
  - `npx ng lint --quiet` (client)
  - **Falsifier:**
    - put the partner block back inside `@if (showLinkedResultQuestion())`, and the type-2-expanded case goes red;
    - leave it in Block 1, and the collapsed-absent case goes red;
    - put the centres banner inside the Full metadata block, and the banner-while-collapsed case goes red.

    All three are executed against the post-change template and reverted.
  - **Red run:** on the pre-change template, "partner absent while collapsed" fails on the presence assertion (the picker renders in Block 1), and "no hint text" fails on the text assertion.
  - **Disqualifier:**
    - A red caused by `pickerFor` throwing "is not rendered at all" is a red only in the collapsed-absent case. In every other case it means the fixture forgot to expand, and that is not evidence.
    - A green reached through `overrideTemplate` is not evidence: this suite must keep the real template.
    - jsdom cannot check placement or spacing; that stays with step 4.
  - **Consumers:**
    - `section-contributors.readonly.spec.ts` (:45, :199-212, :236-261);
    - `section-contributors/CLAUDE.md`;
    - Cypress: none (P-8 grep over `onecgiar-pr-client/cypress` → 0 hits).
- **Review:** `checklist`. It is a template move with a real-template gate, plus a manual visual check.
- **Skills:** `angular-developer`, `tdd`
- **Done criteria:**
  - [ ] The red run was observed on the presence/text assertions, then went green.
  - [ ] The falsifiers were executed and reverted.
  - [ ] The visual check was confirmed by the user at the HITL pause.
  - [ ] `CLAUDE.md` was updated.
  - [ ] Lint and jest are clean.
  - [ ] Commit per convention, for example `🔧 fix(section-contributors) P2-3821: make External partners optional under Full metadata`.
