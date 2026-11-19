# Tasks — Bilateral External partners back in the MDS

## 1. Scope

- **Module / feature:** `bilateral` · section 2 (Contributors & partners)
- **Linked spec:** `requirements.md` (BPX-R-1..R-10) + `design.md` (BPX-DD-1..DD-5)
- **Ticket:** TBD (commits use `[TBD]` until one exists)
- **Status:** in-progress (code complete, see `execution.md`)

## 2. Pre-flight

- [x] `requirements.md` approved (user, 2026-11-18)
- [x] `design.md` approved (user, 2026-11-18)
- [x] BPX-OQ-1 / OQ-2 carry defaults: no notice, no ingest rule
- [x] `alliance-ibd-pdf-viewer` checked out at `D:\Desarrollo Empresa\alliance-ibd-pdf-viewer` (main @ `b5e092d`)
- [x] No migration in this spec

## 3. Task list

### BPX-T-1 — Server: partner-answer check in `assertSubmittable`

- **Type:** server
- **Description:** Add the persisted partner-answer check to `assertSubmittable`, as `design.md` §5 describes. It runs after the owner/primary-SP block and before the Innovation Use MDS validator, and it is skipped for Knowledge Products. Existing specs that reach `assertSubmittable` get a mock default (one active partner row) so they keep testing what they tested.
- **Implements:** BPX-R-5 (both scenarios, including "BUT it must NOT write a review-history row"), BPX-R-4 (server half), BPX-R-10 (no change to `create`)
- **Design refs:** BPX-DD-4, BPX-DD-5, §5; P-7, P-8, P-9, P-11
- **Files:** `onecgiar-pr-server/src/api/bilateral/services/bilateral-center.service.ts`, `bilateral-center.service.spec.ts`
- **Backend route:** `nestjs-expert` · test-first
- **Skills:** `nestjs-expert`, `tdd`
- **Depends on:** — · **Blocks:** —
- **Estimate:** S
- **Review:** full — `assertSubmittable` is shared by three endpoints (P-8)
- **Verification:**
  - **Falsifier:** a non-KP result in Editing, `no_applicable_partner = false`, the partner `count` mock returning 0. `submitForReview` must reject with `BadRequestException` whose message contains "External partners", and the history-write mock must not be called. Mutation checks:
    - (a) drop the KP skip → the KP case goes red;
    - (b) count rows without `is_active: true` → the inactive-only case goes red;
    - (c) query role 2 only → the role-8 case goes red.
  - **Red run:** `npx jest src/api/bilateral/services/bilateral-center.service.spec.ts -t "partner answer"`. Expected red before the change: `Received promise resolved instead of rejected` on the no-answer case, because today's `assertSubmittable` (`:2685-2775`) has no partner check. Observe and quote it in `execution.md`.
  - **Disqualifier:** if the existing 19 `assertSubmittable` references need anything beyond a mock default (a change in what they assert), stop and report: the gate is in the wrong place. If the full suite runs show different pass counts across two runs, report the flake instead of PASS.
  - **Consumers:** `bilateral-center.service.spec.ts` (19 refs, P-11). Callers of `assertSubmittable`: `submitForReview` :2454, the QA assessment :2787, field revisions :2861.
- **Definition of done:**
  - [x] Cases pass: no answer → 400 · flag → pass · active role 2 → pass · active role 8 → pass · inactive only → 400 · KP with nothing → pass · the 400 fires before the IU validator
  - [x] The three mutations each turn a case red (quoted in `execution.md`)
  - [ ] `npx jest --silent --reporters=summary --forceExit` green; — **open:** spec file 253/253, tsc clean, scoped eslint clean; full server suite not run (memory; bilateral module 1665/1665, full eslint exit 0); `npx tsc --noEmit -p tsconfig.json` clean; `npx eslint "{src,apps,libs,test}/**/*.ts" --quiet` clean
  - [ ] Commit `🔧 fix(bilateral.service) [TBD]: …` with `[SPEC:changes/bilateral-partners-mds]`

### BPX-T-2 — Client: partners block in Block 1, required for editable non-KP

- **Type:** client
- **Description:** Implement `design.md` §6 in `section-contributors`:
  - move the partners block (checkbox, multi-select, chips, `partnersLoadFailed` banner) into Block 1;
  - add `isPartnerRequired`;
  - restore the `external-partners` tracker item with the hydration invariant, scoped to `isPartnerRequired()`;
  - add an effect that re-publishes the tracker on changes;
  - return `hiddenFieldsWithValues` to the linked question only;
  - add `hasFullMetadataFields`, which gates the toggle, the note and the container, and shortens the banner for types 2 and 7.

  Update the P2-3821 assertions in both specs to the new rule.
- **Implements:** BPX-R-1 (incl. "BUT must NOT render twice"), BPX-R-2 (all 3 scenarios, incl. the hydration "BUT"), BPX-R-3 (both scenarios), BPX-R-4 (client half), BPX-R-6, BPX-R-7
- **Design refs:** BPX-DD-1, DD-2, DD-3, §6; P-1..P-6, P-10, P-13
- **Files:** `onecgiar-pr-client/src/app/pages/bilateral/components/section-contributors/section-contributors.component.{ts,html}`, `.component.spec.ts`, `.readonly.spec.ts`
- **Design route:** existing components only (`pr-multi-select`, `pr-checkbox`, `app-alert-status`), no new tokens. The markup comes from `git show 9be3db51e^`. Page mode: form.
- **Skills:** `angular-developer`, `tdd`
- **Depends on:** — · **Blocks:** —
- **Estimate:** M
- **Review:** full — it changes the tracker key `external-partners`, which the rail reads, and the `showFullMetadata` gate
- **Verification:**
  - **Falsifier:** an editable non-KP result, hydrated, nothing selected, box unticked. `mdsTracker.setSectionFields('contributors', …)` must carry `{ key: 'external-partners', filled: false }`. Flip the status to Pending Review (5) → the next publish has no `external-partners`. Same for KP (type 6) while editable → no item. Mutation checks:
    - (a) drop the `!readOnly()` term → the read-only case goes red;
    - (b) report `filled` without `partnersHydrated()` → the unhydrated case goes red;
    - (c) remove the effect → the flip case goes red.
  - **Static read:** of the real `.html`, the partner block sits before the MDS banner, outside the Full metadata `@if`, and appears once.
  - **Red run:** `npx jest src/app/pages/bilateral/components/section-contributors --no-coverage`. Expected red before the change: `expect(received).toEqual(expected)` on the new "publishes external-partners for an editable non-KP result" case, because `updateContributorsMds` (`:997-1015`) publishes only `lead-center`/`lead-project`. Observe and quote it in `execution.md`.
  - **Disqualifier:** if the rail or `BilateralMdsTrackerService` needs a change to honour the item, stop. DD-2 assumed the existing group contract suffices. Layout and position are not provable in jsdom (requirements §8): they are covered by the manual check below, never by a class-presence assertion.
  - **Consumers:** `section-contributors.component.spec.ts` (~30 lines on `external-partners`, `showFullMetadata`, `hiddenFieldsWithValues`) and `.readonly.spec.ts:310` (P-10). No Cypress or E2E hits (P-10 grep).
- **Definition of done:**
  - [x] Cases pass: item present, editable non-KP · absent, KP · absent, read-only · filled only when hydrated and answered · re-published on the readOnly flip · `hiddenFieldsWithValues` ignores partners · `hasFullMetadataFields` false for 2 and 7 and true otherwise
  - [x] Mutations (a)–(c) each go red (quoted)
  - [ ] `npx jest --silent --reporters=summary --no-coverage` green; — **open:** folder 252/252, ng build clean; full suite 92 failures in 6 unrelated suites; `ng lint` clean (All files pass linting); `npx ng build` clean; `npx ng lint --quiet` clean
  - [ ] Manual check on prtest (HITL), the T6-class layout gap:
    - the block is visible with Full metadata collapsed, for a Policy and an Innovation Use result;
    - the hint and the asterisk show on an editable non-KP result;
    - there is no toggle on Innovation Use;
    - a Pending Review result shows no missing item
  - [ ] Commit `🔧 fix(section-contributors) [TBD]: …` with `[SPEC:changes/bilateral-partners-mds]`

### BPX-T-3 — PDF: print non-KP partners in the MDS-only bilateral PDF

- **Type:** client (other repo: `alliance-ibd-pdf-viewer`)
- **Description:** In `ContributorsSection` (`common-sections.tsx:164-172`), build the Partners rows from `non_kp_partner_data` followed by `kp_partner_data`. This restores the spread that commit `827f180` removed (P-12, verified). `hasPartners` and `hasAnything` read the combined list. Every other removal of `bilateral-pdf-mds-only` stays. Update the file-header spec note (`:1`) to cite this spec.
- **Implements:** BPX-R-8 (incl. "BUT must NOT print any other removed block")
- **Design refs:** §1 item 3; P-12
- **Files:** `D:\Desarrollo Empresa\alliance-ibd-pdf-viewer\app\templates\reportingtool\results_bilaterals_p25\components\common-sections.tsx` (branch from `main` @ `b5e092d`)
- **Skills:** none mapped (project conventions)
- **Depends on:** — · **Blocks:** —
- **Estimate:** S
- **Review:** checklist
- **Verification:**
  - **Falsifier:** render `docs/specs/changes/bilateral-pdf-mds-only/fixtures/bil-policy.json`, which has `non_kp_partner_data`. Before the change the HTML has no Partners heading; after, it has one, with every partner name. Diff the rest against the BPM "after" render → no other block reappears.
  - **Red run:** `n/a (no test gate)`. The repo has no test runner (`bilateral-pdf-mds-only/design.md:9`). Use the `fixtures/render.sh` before/after render, with the before output quoted.
  - **Disqualifier:** if the rendered fixture still shows no non-KP partners after the change (for example, because the DB function `platform-report.service.ts:112-117` no longer emits `non_kp_partner_data`), stop and re-specify this task.
  - **Consumers:** none (no other app renders these templates — `bilateral-pdf-mds-only/design.md:79`).
- **Definition of done:**
  - [ ] Before and after renders inspected at the HITL pause
  - [ ] A branch and PR in `alliance-ibd-pdf-viewer` (separate PR) — branch + commit `74fe0ed` done; PR pending (user: later)
- **Status:** [~] — code Reviewer PASS (execution.md); HITL render inspection and PR deferred by the user

### BPX-T-4 — Docs: record the supersession

- **Type:** docs
- **Description:** Add a "Superseded by `changes/bilateral-partners-mds` (2026-11-18)" note:
  - to `bilateral/contributors-partners-optional/requirements.md`, on BIL-R-1, BIL-R-2 and BIL-R-4;
  - to the P2-3368 AC5 row it references;
  - to `changes/bilateral-pdf-mds-only/requirements.md:45`.

  Update the module guide `onecgiar-pr-server/src/api/bilateral/CLAUDE.md` §4 with one line on the partners gate. Code comments are handled inside T-1 and T-2.
- **Implements:** BPX-R-9
- **Files:** the three spec files above, `onecgiar-pr-server/src/api/bilateral/CLAUDE.md`
- **Skills:** `cognitive-doc-design`
- **Depends on:** BPX-T-1, BPX-T-2 · **Blocks:** —
- **Estimate:** S
- **Review:** skip-eligible — text-only notes with no shared consumer. Claim to prove: `git diff --stat` shows only `.md` files
- **Verification:**
  - **Falsifier:** `grep -rn "optional" docs/specs/bilateral/contributors-partners-optional/requirements.md` hits BIL-R-2 without a superseded note on the same requirement → FAIL.
  - **Red run:** `n/a (no test gate)`
  - **Disqualifier:** the shared-file discipline in `AGENTS.md` (module `CLAUDE.md` edits only on the apply-capable branch). If the branch is not apply-capable, record the guide edit as pending instead.
  - **Consumers:** none (no shared symbol changed)
- **Definition of done:**
  - [x] All notes added; the forward sweep `grep -rn "P2-3821" onecgiar-pr-client/src onecgiar-pr-server/src docs/specs` has every hit either updated or knowingly kept
  - [ ] Commit `📝 docs(specs) [TBD]: …`

## 4. Dependency graph

```
BPX-T-1 (server)  ─┐
BPX-T-2 (client)  ─┼── BPX-T-4 (docs)
BPX-T-3 (PDF, other repo, parallel)
```

T-1, T-2 and T-3 are parallel-safe with each other. There are no shared files.

## 5. Test plan

| Test ID | Type | Covers | Location |
|---|---|---|---|
| BPX-TEST-1 | unit (server) | BPX-R-4, R-5 | `bilateral-center.service.spec.ts` · describe "partner answer" |
| BPX-TEST-2 | unit (client) | BPX-R-2, R-3, R-4, R-6, R-7 | `section-contributors.component.spec.ts` |
| BPX-TEST-3 | unit (client, read-only) | BPX-R-3 | `section-contributors.readonly.spec.ts` |
| BPX-TEST-4 | static template read | BPX-R-1 | `section-contributors.component.spec.ts` (reads the real `.html`) |
| BPX-TEST-5 | manual render | BPX-R-8 | `fixtures/render.sh` in `alliance-ibd-pdf-viewer` |
| BPX-TEST-6 | manual (prtest) | BPX-R-1 layout, R-2 affordance, R-3 | HITL |

BPX-R-10 (ingest unchanged) is covered by the absence of any edit to `bilateral.service.ts` / `create-bilateral.dto.ts`. The Reviewer checks this with `git diff --stat`.

## 6. Rollout & verification

- [ ] PR 1 (`onecgiar_pr`): T-1, T-2, T-4 → `staging`
- [ ] PR 2 (`alliance-ibd-pdf-viewer`): T-3
- [ ] Manual QA on prtest per BPX-TEST-6
- [ ] Reply to Nicoleta once it is in production

## 7. Roll-back

Revert PR 1 and/or PR 2. There is no data or migration to undo.
