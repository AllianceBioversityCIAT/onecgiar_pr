# Tasks — Decouple Lead Center From The External-Partner Toggle

Linked spec: `docs/specs/changes/lead-center-decouple/requirements.md` + `design.md`.

## 1. Scope of this task list

- **Module / feature:** `results` → Contributors and Partners (P25) → `lead-center-decouple`
- **Linked spec:** `docs/specs/changes/lead-center-decouple/requirements.md` + `design.md`
- **Sprint / target phase (if any):** none stated
- **Owner / driver:** Santiago Sánchez
- **Status:** not-started

---

## 2. Pre-flight checklist

- [x] `requirements.md` is approved.
- [x] `design.md` is approved.
- [x] Open questions in `requirements.md` and `design.md` are all resolved (no backfill; copy stays
      as-is — confirmed by requester 2026-08-31).
- [ ] CLARISA dependencies confirmed — N/A, no catalog/endpoint change in this spec.
- [ ] No conflicting in-flight spec touching the same fields — `LC-DD-*`
      (`docs/specs/bugfix/lead-center-full-catalog`) and `TOC-C-DD-*`
      (`docs/specs/archive/2026-08-29-changes--toc-center-guard/`) are already landed on this
      branch (commits `64d072490`, `6f44a53af`), not in-flight; this spec builds on top, not in
      parallel with them.
- [ ] Migration name/reversibility — N/A, no migration in this spec.

---

## 3. Task list

### [x] `LCD-T-1` — Verify the server accepts a combined lead-center + lead-partner payload

- **Type:** `tests`
- **Description:** Before touching frontend code, confirm the `PATCH` endpoint backing this
  section's save does not reject a payload where a `contributing_center` row and an
  `institutions`/`mqap_institutions` row both carry `is_leading_result: true` in the same request.
  Locate the server DTO/validator for this payload (`onecgiar-pr-server/src/api/...` — the
  Contributors and Partners save endpoint) and read its `class-validator` rules; if nothing
  enforces mutual exclusivity server-side, this is a pass-through confirmation, not a code change.
  This closes the "Open Gaps" item in `design.md` §13.
- **Implements:** `LCD-R-6` (precondition), `design.md` §4/§13 assumption
- **Files (expected):** read-only — `onecgiar-pr-server/src/api/results/...` (locate via grep for
  the controller/service handling this section's save; no server file is expected to change)
- **Depends on:** `—`
- **Blocks:** `LCD-T-3`
- **Estimate:** `S`
- **Definition of done:**
  - [x] The relevant DTO/validator is identified and read.
        (`update-contributors-partners.dto.ts:1-62` — no `class-validator` decorators; and no
        `ValidationPipe` on the route: `main.ts` has no `useGlobalPipes` and
        `ContributorsPartnersController` has no per-route pipe.)
  - [x] Finding recorded: **"no server-side exclusivity constraint found"** — at any layer (route
        pipe, DTO validator, service write path, or storage DDL). Verified twice independently
        (Implementer + Reviewer). Proceed with `LCD-T-2`/`LCD-T-3` as designed. Full evidence with
        file:line citations in `execution.md` → `LCD-T-1`; carry into the PR description at rollout.
  - [x] No secret or token leaked in logs or messages (`.cursorrules`).

### [x] `LCD-T-2` — Relocate Lead Center in the template; make it always-required; split the alert messages

- **Type:** `client`
- **Description:** Move the Lead Center `app-pr-select` block out of the
  `*ngIf="is_lead_by_partner"; else selectLeadCenter"` pair and place it directly after
  `<!-- Contributing Centers end -->`, before the P2-3171 external-partners note. Set its
  `[required]` to a literal `true`. Delete the now-unused `#selectLeadCenter` template wrapper.
  Replace the single `getMessageLead()` call with two independent `app-alert-status` bindings —
  `getMessageLeadCenter()` above the relocated Lead Center field, `getMessageLeadPartner()` above
  the (unmoved) Lead Partner field. In the component, replace `getMessageLead()` (`:610-613`) with
  the two new methods per `design.md` `LCD-DD-4` — `getMessageLeadCenter()` drops the stale
  "already added in this section" claim.
- **Implements:** `LCD-R-1`, `LCD-R-2`, `LCD-R-3` (position/visibility half), `LCD-R-7`,
  `LCD-AC-1`, `LCD-AC-5`
- **Files (expected):**
  `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-contributors-and-partners/rd-contributors-and-partners.component.html`,
  `.../rd-contributors-and-partners.component.ts`
- **Depends on:** `—`
- **Blocks:** `LCD-T-4`
- **Estimate:** `S`
- **Definition of done:**
  - [~] Code staged, **not committed** — standing project rule: no commit without the user's
        explicit go-ahead. Commit message to use the project convention at rollout.
  - [x] Lint + format clean (`npx ng lint --quiet` → *All files pass linting*).
  - [x] Lead Center renders unconditionally in its new position, `required` regardless of
        `is_lead_by_partner`. Verified by the Reviewer down to `pr-select.component.html:13-14`'s
        `.pr-field.mandatory` emission, so `LCD-AC-3` holds behaviorally, not just visually.
        Browser check still owed by `LCD-T-5`; Jest assertions still owed by `LCD-T-4`.
  - [x] Lead Partner's position and Yes/No-gated visibility unchanged — same `*ngIf`, same
        `[required]`, same location; only the `; else selectLeadCenter` coupling removed.
  - [~] **VOID AS WRITTEN — see `execution.md` → "Spec Inaccuracy 2".** Neither lead select ever
        carried a `data-testid`; the nearest hook (`cp-field-is_lead_by_partner`) is on the
        yes/no toggle. Nothing was renamed or removed and the file's hook set is unchanged, so
        this is a spec documentation error, not an implementation defect. **Consequence:**
        `save-contract.cy.ts` discovers fields by `cp-field-` prefix and silently skips what it
        cannot find, so `LCD-T-4`'s `LCD-AC-2` assertion would pass while never seeing Lead
        Center. Needs a user decision before `LCD-T-4` is briefed.
  - [x] No hardcoded English beyond the existing plain-string precedent; no new `TermKey`
        (matches `design.md` §6.3).

### [x] `LCD-T-3` — Decouple save-time and toggle-time logic (component + service)

- **Type:** `client`
- **Description:** In `onSaveSection()` (`component.ts:496-520`), replace the single
  `if (is_lead_by_partner) {...stamp partner, zero centers...} else {...stamp centers, zero
  partners...}` with two independent statements: centers' `is_leading_result` always set from
  `leadCenterCode`; partners'/mqap's `is_leading_result` set from `leadPartnerId` only when
  `is_lead_by_partner` is `true`, forced `false` otherwise (unchanged semantics for the partner
  side, just no longer sharing a branch with the center side) — per `design.md` `LCD-DD-3`. In
  `rd-contributors-and-partners.service.ts`: remove the `leadCenterCode = null` line from
  `onLeadByPartnerChange`'s `isPartnerLed` branch (keep `leadPartnerId = null` in the `else`
  branch, unchanged); remove `tryAutoAssignLeadCenter`'s `if (is_lead_by_partner) return;` guard —
  per `design.md` `LCD-DD-2`. Do not touch `onLeadCenterSelected`, `getContributingCentersUnion`,
  `isUnmappedOrFlat`, `setLeadCenterOnLoad`, `setLeadPartnerOnLoad`, or `tryAutoAssignLeadPartner`
  (all unchanged per `design.md` §6.2 — `LC-DD-5` mechanics stay intact).
- **Implements:** `LCD-R-4`, `LCD-R-5`, `LCD-R-6`, `LCD-R-10`, `LCD-AC-2`, `LCD-AC-4`, `LCD-AC-6`
- **Files (expected):**
  `.../rd-contributors-and-partners.component.ts`, `.../rd-contributors-and-partners.service.ts`
- **Depends on:** `LCD-T-1`
- **Blocks:** `LCD-T-4`
- **Estimate:** `S`
- **Definition of done:**
  - [~] Code staged, **not committed** — standing rule: no commit without the user's explicit
        go-ahead.
  - [x] Lint + format clean (`npx ng lint --quiet` → *All files pass linting*).
  - [x] `onSaveSection()` produces a PATCH payload with both a leading center and a leading partner
        when both are set (`LCD-AC-2`). Verified by the Reviewer's **end-to-end trace** through the
        `isCP2026` block for a **ToC-origin** center (`tocCenters`' bare spread), documented in
        `execution.md` → `LCD-T-3`. Jest assertion still owed by `LCD-T-4`.
  - [x] Toggling "led by external partner?" to "Yes" no longer clears `leadCenterCode`
        (`LCD-AC-4`) — `if (!isPartnerLed)` retains the clear only for the `false` case. Jest
        assertion owed by `LCD-T-4` (the existing test asserting the OLD behavior is currently red
        by design — `service.spec.ts:177-187`).
  - [x] `tryAutoAssignLeadCenter` still auto-assigns a single Contributing Center as Lead Center
        when `is_lead_by_partner` is `true` — guard removed; confirmed reachable via both
        `onLeadByPartnerChange(true)` and `getSectionInformation` load. The existing test asserting
        the OLD skip behavior is currently red by design (`service.spec.ts:127-132`) — `LCD-T-4`
        must invert it.
  - [x] `LC-DD-5` auto-add-to-Contributing-Centers on `onLeadCenterSelected` unaffected —
        all six forbidden methods unmodified; `LC-T-4` and the `TOC-C-*`/`TOC-SP-*` describes
        confirmed among the 183 green (they pin `is_lead_by_partner` falsy, so the removed guard was
        never engaged there) — `LCD-R-10`/`LCD-AC-6`.

### [x] `LCD-T-4` — Test coverage for the decoupled behavior

- **Type:** `tests`
- **Description:** Extend the existing Jest suites and Cypress specs to cover the new independent
  behavior. Jest: extend `rd-contributors-and-partners.component.spec.ts`'s `LC-T-2` describe (or
  add a sibling describe `LCD-T-2/T-3`) to assert (a) Lead Center renders and is `required`
  regardless of `is_lead_by_partner`, (b) `onSaveSection()` stamps both a leading center and a
  leading partner in one call when both are selected, (c) the required-field scan blocks save with
  no Lead Center selected. Extend `rd-contributors-and-partners.service.spec.ts` to assert
  `onLeadByPartnerChange(true)` no longer nulls `leadCenterCode`, and `tryAutoAssignLeadCenter`
  still runs when `is_lead_by_partner` is `true`. Cypress: re-run `contributors-and-partners.cy.ts`,
  `save-validation.cy.ts`, `save-contract.cy.ts` as regression (no assertion should need to change
  for Lead Partner's unchanged behavior); add one new assertion in `save-contract.cy.ts` for the
  combined-lead PATCH shape.
  **Also fix the two `getMessageLead()` assertions** at `component.spec.ts:697-711` (the
  `describe('getMessageLead')` block, two `it`s), which `LCD-T-2` intentionally left red — retarget
  them at `getMessageLeadCenter()` / `getMessageLeadPartner()`, asserting `LCD-R-7`/`LCD-AC-5` (the
  center message must NOT contain "already added in this section"; the partner message must keep it).
  **SCOPE WIDENED (user decision, 2026-08-31 — see `execution.md` → "Scope Widening 1"):** this task
  MAY also edit `rd-contributors-and-partners.component.html` for the single, bounded purpose of
  **adding** two `data-testid` hooks — `cp-field-contributing_center~lead` on the Lead Center select
  and `cp-field-institutions~lead` on the Lead Partner select. Without them
  `save-contract.cy.ts` (which discovers fields by `cp-field-` prefix and silently skips what it
  cannot find) would pass `LCD-AC-2` while never seeing Lead Center. The `~` suffix is this folder's
  documented convention for two controls feeding one payload key (`CLAUDE.md:250-253`); a bare
  `cp-field-contributing_center` would collide with the two existing hooks. **No other template
  change is authorized by this widening** — nothing else in the HTML may be touched.
- **Implements:** `LCD-AC-1`, `LCD-AC-2`, `LCD-AC-3`, `LCD-AC-4`, `LCD-AC-5`, `LCD-AC-6`
- **Files (expected):**
  `.../rd-contributors-and-partners.component.spec.ts`,
  `.../rd-contributors-and-partners.service.spec.ts`,
  `.../rd-contributors-and-partners.component.html` (hooks only — see scope widening above),
  `onecgiar-pr-client/cypress/e2e/result-detail/contributors-and-partners.cy.ts`,
  `onecgiar-pr-client/cypress/e2e/result-detail/save-validation.cy.ts`,
  `onecgiar-pr-client/cypress/e2e/result-detail/save-contract.cy.ts`
- **Depends on:** `LCD-T-2`, `LCD-T-3`
- **Blocks:** `LCD-T-5`
- **Estimate:** `S`
- **Definition of done:**
  - [~] Code staged, **not committed** — standing rule: no commit without the user's explicit
        go-ahead.
  - [x] `npx jest --silent --reporters=summary --no-coverage` green: folder suite **195/195**;
        **full client suite 484 suites / 7085 tests green**. `npx ng lint --quiet` clean.
  - [x] `npm run test:ct` not required — confirmed no `custom-fields/` file appears in the diff.
  - [~] **NOT RUN — probe-confirmed environment blocker, not a deferral by assumption.**
        `cypress.config.js` requires `baseUrl: http://localhost:4200` **and** `./cypress.env.js`
        for credentials; **`cypress.env.js` does not exist in this checkout** (the config logs
        `⚠️ cypress.env.js not found. Using empty credentials.`), so an authenticated e2e run
        cannot succeed here. The specs are **written** and statically verified; **execution is owed
        by CI or a credentialed local run** before this spec ships. The no-pass/flake clause below
        still governs that run when it happens.
  - [x] No secret or token leaked; `cypress.env.js` was never printed nor created.

### [~] `LCD-T-5` — Update the folder's `CLAUDE.md` and verify in a real browser

- **Type:** `docs`
- **Description:** Update
  `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-contributors-and-partners/CLAUDE.md`
  to replace the mutual-exclusivity description in the "Lead fields (P2-2960)" note and the
  `LC-DD-*` history with a new trap entry describing the decoupled behavior (`LCD-DD-1..4`,
  pointer to this spec). Re-stamp the `Verified:` line with the landed commit hash, per
  `docs/COMPONENT-DOCS.md`. Then start `npm start` (or a fresh port per this client's browser
  §9 guidance — never reuse a server you didn't start) and manually exercise: open a P25 result's
  Contributors and Partners section, confirm Lead Center shows under Contributing CGIAR Centers and
  is required; toggle "led by external partner?" to Yes, confirm Lead Center stays visible/filled
  and Lead Partner appears; save with both set and reload to confirm both persisted.
- **Implements:** all `LCD-AC-*` (final human verification pass)
- **Files (expected):**
  `.../rd-contributors-and-partners/CLAUDE.md`
- **Depends on:** `LCD-T-4`
- **Blocks:** `—`
- **Estimate:** `S`
- **Definition of done:**
  - [x] `CLAUDE.md` updated — new `⚠️` trap block for `LCD-DD-1..4`, the two `data-testid` hooks,
        the Cypress `NEVER_EDIT_TESTID` trap, `LC-DD-5` unchanged, and the server-side known gap.
        Reviewer verified **every** citation against the working tree.
  - [~] `Verified:` line re-stamp **OWED AT COMMIT TIME** — impossible now by construction: the
        landing commit does not exist (standing no-commit-without-go-ahead rule). Line carries an
        explicit `<PENDING: re-stamp with the landing commit hash>` placeholder; **no hash was
        invented**, since a plausible-but-wrong hash silently misdirects future readers.
  - [~] Manual browser walkthrough **NOT PERFORMED — probe-confirmed blocker.**
        `src/environments/environment.ts:3` sets `apiBaseUrl: 'http://localhost:3400/'`, so it needs
        the full local stack (NestJS + MySQL), a valid auth token, and a real ToC-mapped P25 result;
        the token cannot be obtained without the user and handling one would cut against
        `.cursorrules`. **Owed as a human gate before ship.** Partially mitigated by `LCD-T-4`'s
        Jest tests, which mount the real component with the real service and assert
        `.pr-field.mandatory` for both toggle values (`LCD-AC-1`) and mandatory-but-incomplete with
        no Lead Center (`LCD-AC-3`).
  - [x] No secret or token leaked; `cypress.env.js` never printed nor created.

---

## 4. Dependency graph

```
LCD-T-1 (verify server accepts combined payload)
   └── LCD-T-3 (decouple save/toggle logic)
LCD-T-2 (template relocation + required + split messages)  ── parallel-safe with LCD-T-1
   └── LCD-T-4 (tests) ←── also depends on LCD-T-3
         └── LCD-T-5 (docs + browser verification)
```

`LCD-T-2` and `LCD-T-1` have no shared files and can run in parallel; `LCD-T-3` needs `LCD-T-1`'s
finding before landing (a rejected combined payload would change its shape); `LCD-T-4` needs both
`LCD-T-2` and `LCD-T-3` merged to test the finished behavior; `LCD-T-5` is last.

---

## 5. Test plan

| Test ID | Type | Covers | Location |
|---|---|---|---|
| `LCD-TEST-1` | unit (client) | `LCD-R-1`, `LCD-R-2`, `LCD-AC-1` | `rd-contributors-and-partners.component.spec.ts` |
| `LCD-TEST-2` | unit (client) | `LCD-R-4`, `LCD-R-5`, `LCD-R-6`, `LCD-AC-2` | `rd-contributors-and-partners.component.spec.ts` (`onSaveSection`) |
| `LCD-TEST-3` | unit (client) | `LCD-R-3`, `LCD-R-10`, `LCD-AC-4` | `rd-contributors-and-partners.service.spec.ts` (`onLeadByPartnerChange`, `tryAutoAssignLeadCenter`) |
| `LCD-TEST-4` | cypress (client) | `LCD-AC-3` | `cypress/e2e/result-detail/save-validation.cy.ts` |
| `LCD-TEST-5` | cypress (client) | `LCD-AC-2` | `cypress/e2e/result-detail/save-contract.cy.ts` |
| `LCD-TEST-6` | cypress (client) | `LCD-AC-4` (regression) | `cypress/e2e/result-detail/contributors-and-partners.cy.ts` |
| `LCD-TEST-7` | manual (browser) | `LCD-AC-5`, `LCD-AC-6` | `LCD-T-5` walkthrough |

`rd-contributors-and-partners/` is excluded from `collectCoverageFrom` — these suites are the gate,
not a coverage percentage (see `requirements.md` §7).

---

## 6. Rollout & verification

- [ ] PR opened with the commit message convention.
- [ ] CI green (lint, tests, build — no `migration:check:ci` impact, no migration in this spec).
- [ ] Manual QA on staging/test env: repeat the `LCD-T-5` walkthrough against a real P25 result.
- [ ] No bilateral/platform-report change — no downstream notification needed.
- [ ] No admin/role/phase change — no runbook update needed.
- [ ] Telemetry: N/A, no new logging surface.

---

## 7. Cleanup & follow-ups

- [ ] Move spec status to `shipped` once merged.
- [ ] No cross-cutting UX pattern to promote to `docs/ux-ui/design.md` §12 — this is a field
      reposition within an existing pattern, not a new one.
- [ ] File a follow-up if `LCD-T-1` finds a server-side constraint that blocks the combined
      payload (would need its own spec).
- [ ] No `docs/prd.md` Open Question resolved by this spec.

---

## 8. Roll-back plan

1. Revert the merged PR(s) for `LCD-T-1`..`LCD-T-5` (single PR expected given the small size —
   see `design.md` §12 budget of ~4 tasks / ~90–140 LOC).
2. No migration to revert — frontend-only change.
3. No feature flag introduced — nothing to disable.
4. No bilateral/platform-report payload change — nothing to verify against prior fixtures.
5. No downstream consumers to notify.

---

## Required cross-references

- `docs/specs/changes/lead-center-decouple/requirements.md`, `design.md` (same folder).
- `docs/prd.md` AC-6.
- `docs/trd/trd.md` §6 Frontend Architecture & State Boundaries.
- `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-contributors-and-partners/CLAUDE.md`.
