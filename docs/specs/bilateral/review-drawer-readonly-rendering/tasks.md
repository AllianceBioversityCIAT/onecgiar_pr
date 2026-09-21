# Tasks — `bilateral/review-drawer-readonly-rendering`

## 1. Scope of this task list

- **Module / feature:** bilateral Review drawer — read-only rendering for Center-reported fields
- **Linked spec:** `./requirements.md` + `./design.md`
- **Depth:** Lite · **Approval Mode:** `pre-approved` (Phase 2 gate **auto-approved (pre-approved mode)**)
- **Status:** `done` (implementation + both gates) · HITL §4 **pending**
- **Execution limits** (per `feedback-pragmatic-akili-execution`): max **1** Reviewer round per task; a
  second FAIL escalates, never loops. Targeted `npx jest <path>` only — never the full client suite.
- **Budget tripwire:** 2 tasks · ~145 LOC · 1 review round. Exceeding any of these stops execution.

## 2. Pre-flight checklist

| Gate | State |
|---|---|
| `requirements.md` approved | ✔ |
| `design.md` approved | ✔ |
| Open questions resolved | ✔ none |
| No conflicting in-flight spec on `result-review-drawer/` | ✔ only prior owner is `archive/2026-09-08-changes--sp-bilateral-review-tab`, archived |
| CLARISA dependencies | n/a — no catalog or endpoint touched |
| Migration | n/a — client-only |

## 3. Task list

### `RDR-T-1` ✅ done — Add `[readOnly]` to the 21 locked controls + static completeness gate

- **Type:** `client`
- **Description:** Add a `[readOnly]` binding beside the existing lock-driven `[disabled]` on every
  `app-pr-input`, `app-pr-textarea` and `app-pr-select` listed in `design.md` §8.2. Additive only —
  no `[disabled]` is removed, no `.ts` file is touched. Then add a Jest test that reads the five
  real template files from disk and asserts the invariant holds, so a future edit cannot
  reintroduce a bare `[disabled]`.
- **Implements:** `RDR-R-1` (`BUT` card 1 untouched, `AND IT MUST` badges stay), `RDR-R-2`
  (`AND IT MUST` no gate modified), `RDR-R-3` (all clauses), `RDR-NFR-1`, `RDR-NFR-3`
- **Files (expected):**
  - `…/result-review-drawer/result-review-drawer.component.html` (2 sites: 313, 525)
  - `…/components/policy-change-content/policy-change-content.component.html` (2: 10, 23)
  - `…/components/cap-sharing-content/cap-sharing-content.component.html` (4: 11, 20, 29, 38)
  - `…/components/inno-dev-content/inno-dev-content.component.html` (2: 12, 23)
  - `…/components/innovation-use-content/innovation-use-content.component.html` (11: 13, 27, 49, 57, 77, 85, 121, 149, 158, 197, 241)
  - **new** `…/result-review-drawer/result-review-drawer.readonly-bindings.spec.ts`
- **Depends on:** `—` · **Blocks:** `RDR-T-2`
- **Estimate:** `S`
- **Review:** `checklist` — a mechanical sweep, but the exclusion list is the part a Reviewer must
  audit; over-reach into card 1 is the failure mode, and it is invisible in a green test run.
- **Verification:**
  - **Command:** `npx jest src/app/pages/result-framework-reporting/pages/bilateral-review --silent --reporters=summary` · `npx tsc --noEmit -p tsconfig.app.json` · `npx ng lint --quiet`
  - **Falsifier:** delete the `[readOnly]` from `cap-sharing-content.component.html:11` (the "Women"
    `pr-input`) and re-run the new spec → it must go **red** naming that file and that control. A
    gate that stays green under this mutation asserts nothing and the task is not done. The fixture
    is the **real shipped template file**, not a fragment authored in the test, so the mutation is
    expressible by construction.
  - **Red run:** `npx jest …/result-review-drawer.readonly-bindings.spec.ts` — must fail on the
    *assertion* (a named file + control still carrying a bare `[disabled]`) **before** the template
    edits and pass after. A red from a missing file, a bad path or a parse error is **not** a red;
    re-run until the failure is the behavioral assertion.
  - **Counts are run before written.** The spec's expected in-scope count is derived by running the
    tag/binding scan against `ecff181aa` first (`design.md` §8.2 = 21 sites) — never asserted from
    the intent. If the scan disagrees with 21, stop and reconcile `design.md` §8.2 before coding.
  - **Disqualifier:** if making a site read-only requires touching any `.ts` file, a `pr-*`
    component, or a role predicate, **stop and re-specify** — that is outside a Lite additive sweep
    and outside the user's "policy unchanged" constraint. Likewise if `git diff --stat` shows any
    file outside the six listed above.
  - **Presence-assertion disclosure:** this gate proves the **binding exists**, not that it renders
    read-only. `RDR-T-2` proves the rendering. This task is not evidence for `RDR-R-1`'s rendered
    outcome and must not be reported as such.
  - **Environment path that could pass for the wrong reason:** the spec must read the template files
    by path from the repo, not import a compiled component — a stale build output would let it pass
    while the shipped `.html` is unchanged. Assert each file was read and is non-empty before
    scanning it.
  - **Consumers:** `none (no shared symbol changed)` — the four `*-content` components have exactly
    one mount each, the drawer's `@switch` at `result-review-drawer.component.html:598-614`
    (`design.md` P-5). No exported symbol, input signature or output is modified. Test files that
    name `disabled` in this module are logic-only and render no template (`design.md` P-7).
- **Definition of done:**
  - All 21 sites carry `[readOnly]`, all 21 still carry `[disabled]`
  - Zero sites from `design.md` §8.2's exclusion table were modified
  - `git diff --stat` touches only the six files listed above
  - Falsifier executed against the post-change code and observed red, then reverted
  - `tsc --noEmit` clean · `ng lint --quiet` clean · module Jest green
  - Commit follows `<emoji> <type>(<scope>) [ticket]: <description>`
  - No secret or token in logs (`.cursorrules`)
- **Skills:** `angular-developer`, `ui-ux-pro-max`

---

### `RDR-T-2` ✅ done — Cypress CT proving the locked controls actually render as read-only

- **Type:** `tests`
- **Description:** Add a component test that mounts two real child components with `disabled = true`
  and asserts the rendered DOM contains **no operable control** and **does** contain the read-only
  text branch. This is the gate `RDR-T-1` structurally cannot be: both existing Jest specs in this
  module bootstrap with `overrideComponent({ set: { template: '' } })`, so jsdom never renders these
  templates (`design.md` DD-3).
- **Implements:** `RDR-R-1` scenario 1 (rendered outcome), scenario 2 (`field with no value`, and its
  `BUT` no empty editable control)
- **Files (expected):** **new** `…/result-review-drawer/result-review-drawer.readonly-render.cy.ts`
- **Depends on:** `RDR-T-1` · **Blocks:** `—`
- **Estimate:** `S`
- **Review:** `checklist` — test-only; the risk is a tautological assertion, which is what the
  Falsifier below pins.
- **Verification:**
  - **Command:** `CT_DEV_SERVER_PORT=<free port> npx cypress run --component --spec "src/app/pages/result-framework-reporting/pages/bilateral-review/**/*.cy.ts"` — the **whole module**, not just the new spec, per `project-client-verification-tsc-and-page-ct`.
  - **Cases:** (a) `PolicyChangeContentComponent` with `disabled = true` → zero `a.field` select
    triggers, and the read-only text div rendered; (b) `CapSharingContentComponent` with
    `disabled = true` → zero `<input>` nodes, values painted as text; (c) the same two components
    with `disabled = false` → operable controls **present**.
  - **Falsifier:** case (c) is the falsifier for (a) and (b) — a selector that matches nothing in
    both states proves nothing. Additionally: revert `RDR-T-1`'s edit on `cap-sharing-content:11`
    and case (b) must go **red**. Run both mutations and record the outcome.
  - **Red run:** the spec must be observed failing on cases (a) and (b) against pre-`RDR-T-1` code,
    on the **assertion** — not on a mount error, a missing provider or a timeout. If the mount
    throws, fix the harness first; a red from setup is not a red.
  - **Disqualifier:** if the components cannot be mounted in CT without stubbing the very template
    branch under test, this gate is tautological — **abandon it and escalate**, recording the
    rendered proof as an accepted gap verified only at the HITL check in §4. Do not weaken the
    assertion to make it pass.
  - **No geometry asserted.** This gate asserts node presence/absence only, so the
    rendered-measurement checklist does not apply — no size, overflow, visibility, position or
    containment claim is made. Do not add one; `be.visible` on these nodes would drag in font and
    clipping preconditions this spec has not budgeted.
  - **Consumers:** `none (no shared symbol changed)` — new file, no existing spec imports it.
- **Definition of done:**
  - Cases (a), (b), (c) present and green
  - Both falsifier mutations executed and observed red, then reverted
  - Whole-module CT run green (no pre-existing spec regressed)
  - Commit follows the project convention

## 4. HITL verification — ⏳ PENDING, not yet performed — the only gate for defect class `D4`

`requirements.md` §8 records `D4` (read-only branch paints the **wrong value** — number formatting,
or a `pr-select` showing `Not provided` because its option catalog has not loaded) as having **no
automated gate**. Nothing in `RDR-T-1` or `RDR-T-2` can see it. It is verified here or not at all.

**Requires a Science Program reviewer session** — as a Platform Admin every card 2–4 field stays
editable by design (`RDR-R-2`), so the change is invisible. Per `result-review-drawer/AGENTS.md`
§3b, the P2-3154 verification of 2026-08-27 was done by forcing `isAdmin` false; do the same, or
sign in as an SP member for the entity.

Route: `/result-framework-reporting/entity-details/SP01/bilateral-review` → any row's `Review`.

| # | Check | Expected |
|---|---|---|
| 1 | Card 1 — Theory of Change Alignment | Yes/No toggle operable, ToC tree operable, `Save ToC changes` present |
| 2 | Card 2 — `Result Description` | Painted as text, **no `<textarea>`**, no resize handle |
| 3 | Card 2 / 3 — `🔒 Center-reported (Read-only)` badges | Still present |
| 4 | Card 4 — open one result of **each** type 1 / 2 / 5 / 7 | Selects and inputs painted as text |
| 5 | **D4a** — a `pr-select` with a stored value (e.g. Policy type) | Shows the **stored label**, never `Not provided` |
| 6 | **D4b** — a numeric field with a value (e.g. cap-sharing `Women`) | Shows the number, not blank and not `Not applicable` |
| 7 | An empty optional field | Shows `Not applicable`; an empty required one shows `Not provided` |
| 8 | Title pencil, `Save Data Standards` | Absent (unchanged from today) |
| 9 | Sign in as Platform Admin, same result | Everything in cards 2–4 editable again — `RDR-R-2` |

Check 5 is the one most likely to fail: if a stored value paints as `Not provided`, the option
catalog is loading after the read-only branch renders. That is a real defect, not a cosmetic one —
report it and re-specify rather than patching in place.

## 5. Coverage map

| Requirement / clause | Owning task |
|---|---|
| `RDR-R-1` sc.1 (rendered read-only) | `RDR-T-2` (a)(b) |
| `RDR-R-1` sc.1 `BUT` card 1 stays operable | `RDR-T-1` exclusion audit · HITL #1 |
| `RDR-R-1` sc.1 `AND IT MUST` badges stay | `RDR-T-1` diff scope · HITL #3 |
| `RDR-R-1` sc.2 absent-value text | `RDR-T-2` · HITL #7 |
| `RDR-R-1` sc.2 `BUT` no empty editable control | `RDR-T-2` (a)(b) |
| `RDR-R-2` admin unchanged | `RDR-T-1` (no `.ts` in diff) · HITL #9 |
| `RDR-R-2` `AND IT MUST` no gate modified | `RDR-T-1` Disqualifier |
| `RDR-R-3` sweep complete | `RDR-T-1` |
| `RDR-R-3` `BUT` no over-reach | `RDR-T-1` DoD |
| `RDR-R-3` `AND IT MUST` `[disabled]` retained | `RDR-T-1` DoD |
| `RDR-NFR-1` no network change | `RDR-T-1` diff scope |
| `RDR-NFR-2` no new token | `RDR-T-1` diff scope (no `.scss` touched) |
| `RDR-NFR-3` lint + tsc | `RDR-T-1` commands |
| `RDR-NFR-4` no suite regression | `RDR-T-1` Jest · `RDR-T-2` module CT |
| `D4` wrong value painted | **HITL §4 only** — accepted automated gap |

**`skip-eligible` tasks: none.** Both tasks get a Reviewer. `RDR-T-1` looks mechanical but its
exclusion list is the audit surface; `RDR-T-2` is where a tautological assertion would hide.

## 6. Dependency graph

```
RDR-T-1 ──► RDR-T-2 ──► HITL §4
```

No cycles.
