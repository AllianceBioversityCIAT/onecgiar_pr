# Execution Log — Decouple Lead Center From The External-Partner Toggle

## 1. Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/changes/lead-center-decouple/` |
| Linked spec | `requirements.md` + `design.md` + `tasks.md` |
| Approval Mode | `gated` (from `proposal.md` §1) — every task gate returns to the user |
| Branch | `qa-development-2026-ss` |
| Budget (`design.md` §12) | ~4 tasks, ~90–140 LOC, 1 expected review round |
| Execution started | 2026-08-31 |
| Leader model | T1 (`opus`) · Implementer T2 (`sonnet`) · Reviewer T3 (`opus`) — author ≠ auditor held |

### Standing note — rollback hazard on this checkout

The working tree carried **uncommitted, unrelated** changes when this run began: the
`docs/specs/archive/2026-08-29-*` spec moves and the `docs/specs/kaizen/*` entries from previously
archived specs. `/akili-execute` Step 4's Automatic Rollback (`git restore . && git clean -fd`)
would **destroy** them. Any rollback in this run MUST therefore be scoped to the specific files the
failing task touched — never a blanket restore/clean. Recorded here so a later session inherits the
constraint rather than rediscovering it.

---

## 2. Task Execution History

### `LCD-T-1` — Verify the server accepts a combined lead-center + lead-partner payload

| Field | Value |
|---|---|
| **Final status** | **PASS** |
| Date | 2026-08-31 |
| Implementer attempts | 1 |
| Task type | `tests` (read-only verification — no code change, no git diff) |
| Requirements covered | `LCD-R-6` (precondition), `design.md` §4 / §13 assumption |
| Skills assigned | `nestjs-expert` |
| Effort | `medium` |

#### Skill/effort deviation from the task's defaults

`tasks.md` lists no skills for this task. Leader assigned `nestjs-expert` only; deliberately did
**not** assign `api-design-principles` (that skill is for *designing* an API surface — this task
only reads an existing one) and did not assign `tdd` (nothing is written, so red→green has no
subject).

#### Attempt 1

- **Files changed:** none — read-only investigation by construction. No git diff produced, so the
  Reviewer was briefed to audit the *finding's correctness and evidential adequacy* instead of a
  diff, using its own `Read`/`Grep` to reproduce every load-bearing claim at source.
- **Verification:** no build/test command applies to a read-only investigation. The evidence is
  file:line citation, independently reproduced by the Reviewer.

**Implementer finding:** `NO SERVER-SIDE EXCLUSIVITY CONSTRAINT FOUND`

- **Endpoint:** `PATCH /v2/api/contributors-partners/:resultId` —
  `onecgiar-pr-server/src/api/results-framework-reporting/contributors-partners/contributors-partners.controller.ts:47-59`
  (`@Version('2') @Patch(':resultId')`), mounted via `src/api/modules.routes.ts:99-101`.
- **DTO chain:** `update-contributors-partners.dto.ts:1-62` — `institutions` (`:30`),
  `mqap_institutions` (`:36`), `contributing_center` (`:42`), `is_lead_by_partner` (`:17`); every
  field carries `@ApiPropertyOptional` only, zero `class-validator` decorators in that file.
  `ResultsByInstitution` entity `:71-72` and `ResultsCenterDto` `:62-66` expose `is_leading_result`
  as a plain column/property with no validator.
- **No `ValidationPipe` on this route:** `main.ts` is the only bootstrap and contains no
  `useGlobalPipes`; the seven `ValidationPipe` sites in the server are all per-route on *other*
  controllers (`user`, `results-knowledge-products`, `bilateral`, `bilateral-webhook`).
- **Write path is pass-through:** `applyPartnersSectionUpdate` (`contributors-partners.service.ts:363-394`)
  → `updatePartnersV2` (`:166-176`) → `savePartnersInstitutionsByResultV2`
  (`results_by_institutions.service.ts:349-522`). `handleContributingCenters` (`:677-742`) copies
  `center.is_leading_result` verbatim (`:709`, `:714`); the partner side does the same at `:959`,
  `:1079`, `:1094`, `:1111`, `:1153`. `is_lead_by_partner` is persisted onto the `Result` row only
  (`:413-416`) and never read back to gate those writes.

**Leader-closed gap (inline).** The Implementer's report carried a `NOT DONE` item — it had not
grepped `src/migrations/**` for DB-level `CHECK`/`TRIGGER` DDL. Per Step 2.3.0 a task with an
outstanding gap cannot reach `[x]`, so the Leader closed it inline (a single puntual grep, below the
delegation threshold):

- `is_leading_result` appears in migrations only as the plain column adds
  (`1726237747587-addingLeadPartnerOrCenter.ts:10,13` — `tinyint NULL`, no constraint) and as
  **reads** inside validation stored functions.
- Repo-wide migration grep for `CREATE TRIGGER` / `ADD CONSTRAINT` / `CHECK (` yields exactly one
  relevant hit — `1769300000000-BilateralResultCodeAutoIncrement.ts:27`, an unrelated
  `result_auto_code` trigger. **No exclusivity constraint at the storage layer.**

**Reviewer verdict:** `STATUS: PASS`

> The finding is correct and adequately evidenced. Every load-bearing claim reproduced at source —
> the endpoint chain, the undecorated DTO, the absence of any global or per-route ValidationPipe
> (main.ts is the sole bootstrap; the seven ValidationPipe sites in the server are all on other
> controllers), the pass-through write path, and the absence of CHECK/TRIGGER DDL. A combined
> leading-center + leading-partner payload survives to the database with both flags true, and
> restores independently on reload. The spec's frontend-only scope for LCD-T-2/LCD-T-3 stands; no
> escalation is warranted.

The Reviewer additionally confirmed the **round-trip**, which neither the task nor the Implementer
had covered: `rd-contributors-and-partners.service.ts:716-732` (`setLeadPartnerOnLoad`) and
`:741-752` (`setLeadCenterOnLoad`) resolve their leads from independent arrays with no mutual
exclusion, so both leads restore on reload. This materially strengthens `LCD-R-6`.

#### Decisions made

1. **`LCD-T-1`'s escalation branch is NOT triggered.** The task's Definition of Done required a STOP
   + user escalation if a server-side constraint was found. None was found, by two independent
   passes. `LCD-T-2` and `LCD-T-3` are authorized to proceed on the frontend-only premise.
2. **`design.md` §13's "Server DTO verification" open gap is closed** by this entry.
3. **No spec document was edited by this task.** The advisories below identify one genuine factual
   inaccuracy in `design.md`; per the command's *Advisory Never Becomes A Task* rule the Leader did
   not mint work from it, and per the Pivot Protocol a spec correction needs user approval. It is
   escalated to the user at this gate instead, and will be carried verbatim into the `LCD-T-3`
   brief regardless of whether the document is amended.

#### `ADVISORY` findings (4R lenses — recorded, never gating, never a new task)

- **RISK — the finding rests on an *absence*, which is a fragile invariant.**
  `UpdateContributorsPartnersDto` extends `CreateResultsTocResultV2Dto`, which *does* carry
  `class-validator` decorators, and `onecgiar-pr-server/CLAUDE.md` §6/§11 states
  `ValidationPipe({ whitelist: true, transform: true })` as this package's standing convention.
  Anyone later "fixing" this route to follow the documented convention would **strip**
  `institutions` / `mqap_institutions` / `contributing_center` outright — silent data loss, not a
  validation error. The route works today because the convention is *not* applied here.
- **RELIABILITY — UI gate and server green-check will disagree for exactly the case this spec
  creates.** The winning definition of MySQL function `validation_contributor_partner_P25`
  (`src/migrations/1762866499786-updatepartnersContributors.ts:147-160`, superseding
  `1762528725798`) is first-match-wins and reads:
  ```sql
  WHEN institutions_count_leading <> 1 AND lead_by_partner = 1 THEN FALSE
  WHEN center_count_leading  <= 0 AND lead_by_partner = 0 THEN FALSE
  ```
  With `lead_by_partner = 1` the function **never** requires `center_count_leading > 0`. Once this
  spec makes Lead Center always-required in the UI, the server's own completeness check will still
  pass a partner-led result that has no leading center. Not a blocker (the function is a permissive
  predicate with no power to reject or mutate a write), and closing it is a **server** change —
  outside this spec's declared frontend-only scope. Recorded as a follow-up candidate.
- **READABILITY — a factual inaccuracy in `design.md` §12 `LCD-DD-3` "Consequences" that the
  `LCD-T-3` implementer would trip on.** That sentence asserts the `isCP2026` payload block at
  `component.ts:539-558` "already computes `is_leading_result` per-row from
  `leadCenterCode`/`leadPartnerId` directly, not from the removed branch". True for institutions
  (`:554`, `:558`) and for `otherCenters` (`:546`) — but **not** for `tocCenters` (`:540-542`),
  which is a plain `{ ...c, from_toc: true }` spread and therefore inherits whatever the `:509`/`:512`
  branch already stamped, **including the force-zero at `:509`**. Consequence: removing the
  `if/else` per `LCD-DD-3` is **load-bearing for ToC-origin centers**, not a no-op there. This must
  be carried into the `LCD-T-3` brief or that task will under-implement `LCD-R-4` for ToC-origin
  centers specifically.

#### Issues encountered

- The Implementer's `NOT DONE` field correctly self-reported the migration-grep gap rather than
  claiming full coverage — the gap was closed inline before the Reviewer was spawned.
- One documentation contradiction surfaced and was resolved by the Reviewer: `onecgiar-pr-server/CLAUDE.md`
  §6 claims a global `ValidationPipe` convention that `main.ts` does not implement. The guide
  describes an aspiration, not this route's reality. No guide edit made — shared-file write
  discipline applies on a spec branch, and `tasks.md` does not name that guide as a deliverable.

#### Final verification result

**PASS.** No server-side exclusivity constraint exists at any layer — route pipe, DTO validator,
service write path, or storage DDL. `LCD-R-6` is satisfiable without a backend change.

#### Approval gate

Approval Mode is `gated`, so this gate does **not** auto-pass. Execution stopped here for user
review before `LCD-T-2`. Next eligible task: `LCD-T-2` (dependencies: none). `LCD-T-3` is now
unblocked by this PASS but shares `component.ts` with `LCD-T-2`, so the two must run serially, not
in parallel.

**Gate outcome:** user reviewed and approved continuation (2026-08-31), with an explicit
instruction to apply the `design.md` §12 correction first — recorded as *Spec Correction 1* below.

---

## Spec Correction 1 — `design.md` §12 `LCD-DD-3` "Consequences"

**Date:** 2026-08-31 · **Authorized by:** user, at the `LCD-T-1` approval gate ·
**Applies to:** `docs/specs/changes/lead-center-decouple/design.md` §12 `LCD-DD-3`

### Classification: documented spec amendment, NOT a Pivot

The Pivot Protocol governs a design that is **wrong or technically unviable**. That is not this
case, and the distinction was made deliberately rather than by default:

- The **decision** `LCD-DD-3` ("split `onSaveSection()`'s stamping into two independent blocks") is
  unchanged, and the correction **reinforces** it — removing the `if/else` turns out to matter
  *more* than the design claimed, not less.
- No requirement, acceptance criterion, task, dependency, or budget line changes.
- Only a **supporting factual sentence** inside the decision's "Consequences" note was wrong.

Recorded here as a numbered amendment with a two-direction sweep (below) so the audit trail carries
the same closure discipline a Pivot would demand, without falsely claiming the design direction
changed.

### What was wrong

The original text asserted that the `isCP2026` payload block at `component.ts:539-558`:

> "already computes `is_leading_result` per-row from `leadCenterCode`/`leadPartnerId` directly, not
> from the removed branch"

Verified at source (Leader, reading `component.ts:496-565`): true for **three** of the four arrays,
false for the fourth.

| Payload array | Line | Computes its own flag? |
|---|---|---|
| `tocCenters` | `:540-542` | **No** — bare `{ ...c, from_toc: true }` spread |
| `otherCenters` | `:543-547` | Yes (`:546`) |
| `tocPartners` | `:552-554` | Yes (`:554`) |
| `otherPartners` | `:555-559` | Yes (`:558`) |

`tocCenters` inherits its `is_leading_result` from the `:502-520` branch — **including the
force-zero at `:509`**. So removing that branch is load-bearing for ToC-origin centers, which is
the opposite of the "unaffected by this design" the sentence claimed.

### Why it mattered enough to fix before `LCD-T-3`

An implementer reading the original sentence would reasonably conclude the `isCP2026` path needed
no attention and that `:509`'s removal was cosmetic there. The concrete failure mode that invites:
`LCD-AC-2`'s test written against an `otherCenters` row only — which **would have passed before
this change too**, and would therefore have certified `LCD-R-4` for ToC-mapped P25 results without
testing them at all. A green suite over the wrong row is worse than no test, because it closes the
question.

### Correction applied

`design.md` §12 `LCD-DD-3` "Consequences" replaced with a per-array table, an explicit statement
that `tocCenters` is the one array whose flag comes from the rewritten branch, and a **verification
consequence**: `LCD-AC-2`'s test MUST cover a ToC-origin center, not only an `otherCenters` row.
The original claim is quoted in an inline dated note so the superseded text stays legible rather
than silently vanishing.

### Correction closure — two-direction sweep

Per `/akili-specify` → *Correction Closure*, amending only the cited site is what fails in the
field, so both directions were swept across the whole spec folder:

- **Forward** (does the superseded value survive elsewhere?) — grepped
  `539-558` / `already computes` / `per-row` / `tocCenters` / `from_toc` / `isCP2026` across
  `docs/specs/changes/lead-center-decouple/`. The false claim existed at **exactly one site**
  (`design.md:251-253`, now corrected). `proposal.md:189` mentions the per-row payload assumption
  but does not restate the claim. **No residual sites.**
- **Backward** (does anything citing the corrected section now assert a falsehood?) — grepped
  `LCD-DD-3` / `§12`. Two inbound references:
  - `design.md:110` — "`onSaveSection()` (`:496-520`) rewritten per `LCD-DD-3` below" → still
    accurate, no edit needed.
  - `tasks.md:102` — `LCD-T-3`'s description, "per `design.md` `LCD-DD-3`" → its instruction
    (replace the single `if/else` with two independent statements) remains **correct and
    sufficient** as written. Deliberately left unedited: rewriting an approved task's scope text is
    not licensed by a Consequences-note correction, and the nuance is carried into the `LCD-T-3`
    Implementer brief instead, which is where it changes behavior.
  - `tasks.md:239`/`:250` and `requirements.md:181` matched `§12` but refer to
    `docs/ux-ui/design.md` §12 and `proposal.md` §12 — different documents, not inbound references.

### Carried forward

The `LCD-T-3` brief MUST state the `tocCenters` inheritance explicitly, and the `LCD-T-4` brief
MUST require `LCD-AC-2` coverage on a ToC-origin center. Logged here as a forward pointer because
a pointer filed against a later task is carried by the brief or by nobody.

---

### `LCD-T-2` — Relocate Lead Center in the template; make it always-required; split the alert messages

| Field | Value |
|---|---|
| **Final status** | **PASS** |
| Date | 2026-08-31 |
| Implementer attempts | 1 |
| Task type | `client` |
| Requirements covered | `LCD-R-1`, `LCD-R-2`, `LCD-R-3` (position/visibility half), `LCD-R-7`, `LCD-AC-1`, `LCD-AC-5` |
| Skills assigned | `angular-developer` |
| Effort | `medium` → Reviewer ran single-pass lens-checklist mode (per the effort→mode table) |

#### Skill/effort deviation from the task's defaults

`tasks.md` lists no skills. Leader assigned `angular-developer` only. Deliberately **did not**
invoke the client guide's "mandatory Spartan MCP" rule: this task adds no Spartan component — it
relocates an existing `custom-fields` `app-pr-select` and edits two string methods — so the
governing contract is `app-pr-select`'s own API, which was pointed at directly instead. `tdd` not
assigned: a template relocation plus two literal-returning methods has no red→green subject, and
`LCD-T-4` owns the tests by design.

#### Attempt 1

- **Files changed:**
  - `.../rd-contributors-and-partners.component.html` — Lead Center block relocated to directly
    after `<!-- Contributing Centers end -->` and before the P2-3171 note; `*ngIf="…; else
    selectLeadCenter"` pair dissolved; `#selectLeadCenter` `ng-template` deleted; `[required]`
    changed from `!is_lead_by_partner` to literal `true`; single `getMessageLead()` alert split into
    two `app-alert-status` bindings.
  - `.../rd-contributors-and-partners.component.ts` — `getMessageLead()` replaced by
    `getMessageLeadCenter()` and `getMessageLeadPartner()`.
  - Diff size: **24 insertions / 21 deletions**, two files. Well inside the `design.md` §12 budget.
- **Verification:**
  - `npx ng lint --quiet` → *All files pass linting.*
  - `npx jest --silent --reporters=summary --no-coverage --testPathPattern="rd-contributors-and-partners"`
    → `Test Suites: 1 failed, 8 passed, 9 total` · `Tests: 2 failed, 185 passed, 187 total`
  - No `custom-fields/` file in the diff → `npm run test:ct` correctly not required.

**The two red tests are intended and were audited as such, not accepted on assertion.** Both are
`TypeError: component.getMessageLead is not a function`. The Reviewer located the source: a single
`describe('getMessageLead')` at `component.spec.ts:697-711` containing exactly two `it`s (`:700`,
`:707`), which are the only two references to the removed method anywhere in this package's specs.
Count matches the failure count exactly — no third failure hiding behind the "expected" label.
`design.md` §10 assigns the spec update to the test task, so this is deferred to `LCD-T-4` by
design, not by convenience. **The working tree is therefore intentionally red on 2 tests until
`LCD-T-4` lands.**

**Reviewer verdict:** `STATUS: PASS`

> The diff implements `LCD-R-1`, `LCD-R-2`, `LCD-R-3`, `LCD-R-7`, `LCD-AC-1` and `LCD-AC-5` exactly
> as `design.md` §6.2/§7 and `LCD-DD-1`/`LCD-DD-4` specify — Lead Center relocated verbatim and
> unconditionally required (verified down to `pr-select`'s `.pr-field.mandatory` emission, so
> `LCD-AC-3` holds behaviorally and not only in appearance), Lead Partner untouched beyond the
> expected `else` removal, `#selectLeadCenter` fully gone, and no scope leak into `onSaveSection()`
> or the service.

Audit highlights worth preserving:

- **`LCD-AC-3` verified behaviorally, not by presence.** The Reviewer did not trust `src/CLAUDE.md`
  §21.5's prose; it read `custom-fields/pr-select/pr-select.component.html:13-14` and confirmed the
  control renders `class="pr-field" [ngClass]="{ mandatory: required(), complete: … }"`. A literal
  `true` therefore emits a scannable `.pr-field.mandatory` that stays un-`complete` until a value
  resolves, so `someMandatoryFieldIncompleteResultDetail('.section_container')` now counts Lead
  Center regardless of the toggle. This was the criterion most likely to be satisfied only in
  appearance (a field-header asterisk); it is satisfied at the layer that actually blocks save.
- **No `<form>` in this template** (root is a bare `<div class="detail_container">`), so
  `[(ngModel)]` is a standalone control and the relocation cannot disturb `NgForm` registration —
  the main structural regression risk of moving an `ngModel` block, ruled out by inspection.
- **`.section_container`** lives in the parent wrapper and still encloses the moved block, so the
  field-count scan's reach is unchanged; only its content changes, by exactly the one field
  `LCD-R-2` intends.
- **`#selectLeadCenter` fully gone** from this folder. Remaining repo hits are unrelated components
  owning their own refs (`ipsr-contributors.component.html:232`, `rd-partners.component.html:61` —
  the P22 component explicitly out of scope per `requirements.md` §3).
- **`getMessageLeadPartner()` is character-identical** to what the old ternary produced for
  `entity = 'partner'`, `<b>` markup included — partner copy genuinely preserved.

#### Decisions made

1. **The `data-testid` Definition-of-Done item was NOT checked off as satisfied**, because it cannot
   be satisfied as written — see *Spec Inaccuracy 2* below. It is recorded as void-as-written with
   the reason, rather than ticked to make the task look clean. Nothing was renamed or dropped, so
   this is not an implementation defect and does not gate.
2. **The ungated alert is accepted as faithful preservation, not a defect.** The relocated
   `app-alert-status` sits outside the `@if (!updatingLeadData)` guard while the select sits inside
   it, so during a lead-data refresh the alert renders with no field beneath it. The Leader raised
   this to the Reviewer explicitly; the Reviewer confirmed the *old* combined alert was likewise
   ungated above the `*ngIf/else` pair, so the orphan-alert window is pre-existing on both branches
   and not introduced here. `LCD-DD-1` mandated a verbatim move, so gating it would have been an
   unrequested behavior change. Not rework; a one-line change if ever wanted.

#### `ADVISORY` findings

The Reviewer suppressed a formal `ADVISORY` block under the small-diff rule, judging no 4R finding
rose above the two items already adjudicated above. Recorded as: **none beyond the two decisions.**

#### Issues encountered

The `data-testid` DoD clause and its source bullet in `design.md` §6.2 both describe hooks that do
not exist — a spec inaccuracy with a real downstream consequence for `LCD-T-4`. Written up as
*Spec Inaccuracy 2* below rather than buried in this entry, because it changes another task's scope
and therefore needs a user decision.

#### Final verification result

**PASS.** Lint clean; 185/187 tests green with the 2 failures proven to be exactly the intended
`LCD-DD-4` rename casualties owned by `LCD-T-4`.

#### Approval gate

Approval Mode is `gated` — this gate does **not** auto-pass. Stopped for user review before
`LCD-T-3`. Next eligible task: `LCD-T-3` (deps `LCD-T-1` `[x]` — satisfied).

---

## Spec Inaccuracy 2 — the `data-testid` clause describes hooks that never existed

**Surfaced by:** `LCD-T-2` Implementer (self-reported), independently verified by the `LCD-T-2`
Reviewer · **Status: recorded, NOT yet corrected — needs a user decision because it widens
`LCD-T-4`'s scope**

### The inaccuracy

Both `tasks.md` `LCD-T-2` DoD ("`data-testid="cp-field-*"` hooks on both selects preserved
verbatim") and `design.md` §6.2's bullet ("`data-testid` hooks on both selects are preserved as-is
… `save-contract.cy.ts` keeps working unmodified") presuppose hooks that **neither lead select has
ever carried**. The nearest hook, `cp-field-is_lead_by_partner`, is on the `app-pr-yes-or-not`
toggle, not on either select. The file's overall hook set is unchanged by the `LCD-T-2` diff, so
nothing was renamed or removed — this is a documentation error, not a regression.

### Why it is not cosmetic — it silently voids `LCD-T-4`'s planned `LCD-AC-2` assertion

`cypress/e2e/result-detail/save-contract.cy.ts` **discovers** fields by DOM prefix
(`discover($body, 'cp-field-')` at `:554`, then `[data-testid^=…]` at `:107`) and **skips** whatever
it does not find (`:421`, `:468`). A hookless control therefore yields **no failure and no
coverage** — the planned combined-lead PATCH assertion would pass while never seeing Lead Center at
all. That is the worst failure shape available here: a green test certifying nothing, on exactly the
criterion (`LCD-AC-2`) this spec exists to guarantee.

### Constraint on the fix (do not let `LCD-T-4` improvise this)

The payload key Lead Center feeds, `contributing_center`, is **already claimed** by two hooks —
`cp-field-contributing_center` (`:105`) and `cp-field-contributing_center~flat` (`:129`) — so a bare
re-use collides. This folder's own `CLAUDE.md` (`:250-253`) documents the `~` suffix as precisely
the mechanism for two controls feeding the same payload key. So the correct shape is a third
variant, e.g. `data-testid="cp-field-contributing_center~lead"`, with a counterpart on the Lead
Partner select once `LCD-T-3` settles its payload path.

### Decision required from the user (deliberately not taken by the Leader)

Adding those hooks is a **template edit**, which `LCD-T-4` ("Type: `tests`", files listed = spec and
`.cy.ts` files only) does not currently authorize. Per the command's *Advisory Never Becomes A Task*
rule the Leader may not widen an approved task's scope on its own. Options put to the user:

- **(a)** Widen `LCD-T-4`'s scope to permit adding the two `~`-suffixed hooks to
  `component.html`, and correct the two spec sentences. *(Leader's recommendation — smallest change
  that makes `LCD-AC-2` real.)*
- **(b)** Keep `LCD-T-4` test-only and accept that `LCD-AC-2` is covered by the Jest unit assertion
  on `onSaveSection()` alone, with the Cypress save-contract layer explicitly not covering Lead
  Center. Record as an accepted coverage gap.
- **(c)** Add a separate task for the hooks.

Until this is decided, the `LCD-T-4` brief MUST NOT be issued, or it will either under-deliver
`LCD-AC-2` or breach its own scope boundary.

### Resolution

**User chose option (a)** (2026-08-31). See *Scope Widening 1* immediately below. Block on
`LCD-T-4` is lifted.

---

## Scope Widening 1 — `LCD-T-4` may add two `data-testid` hooks to the template

**Date:** 2026-08-31 · **Authorized by:** user, explicitly, at the `LCD-T-2` gate (option (a) of the
three presented in *Spec Inaccuracy 2*) · **Not** a Leader decision — the command's *Advisory Never
Becomes A Task* rule forbids the Leader widening an approved task's scope on its own, which is why
this was escalated rather than absorbed.

### What was widened

`LCD-T-4` is typed `tests` and originally listed only `*.spec.ts` and `*.cy.ts` files. It may now
also edit `rd-contributors-and-partners.component.html` for **one bounded purpose**: adding

| Select | Hook |
|---|---|
| Lead Center | `data-testid="cp-field-contributing_center~lead"` |
| Lead Partner | `data-testid="cp-field-institutions~lead"` |

**No other template change is authorized.** The widening is deliberately narrow so the next
Reviewer can tell an authorized hook addition from scope creep at a glance.

### Rationale

Without the hooks, `LCD-AC-2`'s Cypress assertion is not merely weak — it is **actively
misleading**. `save-contract.cy.ts` discovers fields by `cp-field-` DOM prefix (`:554`, `:107`) and
skips whatever it cannot find (`:421`, `:468`), so the assertion would report green while never
observing Lead Center. A passing test that certifies nothing is worse than an absent one, because it
closes the question. Option (b) (accept the gap) and (c) (separate task) were both offered; (a) was
chosen as the smallest change that makes the criterion real.

### Spec sentences corrected alongside

Both sites that asserted the non-existent hooks are now fixed, keeping the superseded text visible
rather than silently replaced:

- `design.md` §6.2 — the "hooks on both selects are preserved as-is" bullet replaced with the
  corrected explanation, the discovery-and-skip mechanism, and the hook table above.
- `tasks.md` `LCD-T-2` DoD — the `data-testid` item marked `[~]` **void as written**, with the
  reason inline (done at `LCD-T-2` finalization, before this widening was authorized).
- `tasks.md` `LCD-T-4` — scope-widening paragraph added, `Files (expected)` extended with the
  template, and `LCD-AC-5` added to its `Implements` list (it now owns the retargeted message
  assertions that `LCD-T-2` left red).

### Correction closure — two-direction sweep

- **Forward:** grepped `data-testid` / `cp-field` / `preserved` across the spec folder. The false
  "preserved as-is" claim existed at exactly two sites (`design.md` §6.2 bullet, `tasks.md`
  `LCD-T-2` DoD) — both now corrected. `tasks.md` §5's test-plan table references
  `save-contract.cy.ts` for `LCD-TEST-5`/`LCD-AC-2` but makes no hook claim, so it needed no edit.
- **Backward:** nothing else cites `design.md` §6.2's hook bullet.

---

### `LCD-T-3` — Decouple save-time and toggle-time logic (component + service)

| Field | Value |
|---|---|
| **Final status** | **PASS** |
| Date | 2026-08-31 |
| Implementer attempts | 1 |
| Task type | `client` — **the correctness-critical task of this spec** (rewrites the PATCH payload's leadership stamping) |
| Requirements covered | `LCD-R-4`, `LCD-R-5`, `LCD-R-6`, `LCD-R-10`, `LCD-AC-2`, `LCD-AC-4`, `LCD-AC-6` |
| Skills assigned | `angular-developer` |
| Effort | `medium`, brief weighted toward payload semantics |

#### Review-mode judgment (recorded because it deviates from the default reading)

The effort→mode table routes `xhigh`/`max` **or** tasks touching data-loss surfaces to *parallel
lens reviewers*. A wrong `is_leading_result` is silent data corruption, so this task arguably
qualifies. **Single-Reviewer checklist mode was chosen deliberately:** the diff is 14 LOC across two
files, and the risk is concentrated in *one* question (does the flag survive end-to-end for a
ToC-origin center?) rather than spread across independent lenses. Splitting one narrow trace across
2–4 reviewers would have paid the context-establishment cost several times for the same answer. The
depth was bought instead by weighting the brief: the Reviewer was required to read `onSaveSection()`
**in full** including the `isCP2026` block and trace the value end-to-end, not audit the diff alone.
It did, and that trace is the entry's main evidence.

#### Attempt 1

- **Files changed:**
  - `.../rd-contributors-and-partners.component.ts` — `onSaveSection()`: center stamping lifted out
    of the `if/else` and made unconditional; partner/mqap branches left in place verbatim;
    `@akili-spec` traceability comment added.
  - `.../rd-contributors-and-partners.service.ts` — `onLeadByPartnerChange`: `leadCenterCode = null`
    removed, `if (isPartnerLed)/else` collapsed to `if (!isPartnerLed)`;
    `tryAutoAssignLeadCenter`: `if (is_lead_by_partner) return;` guard removed.
  - Diff: **14 LOC**, two files. Spec running total well inside the ~90–140 LOC budget.
- **Verification:**
  - `npx ng lint --quiet` → *All files pass linting.*
  - `npx jest … --testPathPattern="rd-contributors-and-partners"` →
    `Test Suites: 2 failed, 7 passed, 9 total` · `Tests: 4 failed, 183 passed, 187 total`

**Reviewer verdict:** `STATUS: PASS`

> The center-stamping block is now unconditional and the ToC-origin inheritance path (`tocCenters`,
> the bare `{...c, from_toc:true}` spread) verifiably carries `is_leading_result: true` into the
> PATCH body alongside the lead partner's `true`, satisfying `LCD-R-4`/`LCD-R-6`/`LCD-AC-2`; the
> partner side is a bit-for-bit refactor (`LCD-R-5`), the two service edits match `LCD-DD-2`
> exactly, and all four red tests are correctly classified as spec-mandated expectation changes or
> `LCD-T-2` carry-overs.

##### The `LCD-R-6` end-to-end trace (the evidence that matters most in this spec)

Inputs: `is_lead_by_partner = true`, `leadPartnerId = 10`, `leadCenterCode = 'C1'`,
`isCP2026() === true`, `contributing_center = [{code:'C1', …}]` (ToC-origin).

1. `:505-507` — the `C1` row gets `is_leading_result = true` (unconditional block).
2. `:510-515` — the `institutions_id: 10` row gets `true`.
3. `:543-545` — `tocCenters`' bare spread **carries the `true` from step 1**. This is precisely the
   inheritance path *Spec Correction 1* identified, and it is now inheriting a `true` where the old
   `:509` force-zero injected `false`.
4. `:551` — `contributingCenterPayload = [...tocCenters, ...otherCenters]`.
5. `:555-557` — `tocPartners` recomputes `isLeadByPartner && leadPartnerId === id` → `true`.
6. `:586-594` — `sendedData` overrides `contributing_center` / `institutions` with those arrays;
   `mqap_institutions` rides the spread with its step-2 flags.

**Result: the PATCH body leaves the method with a ToC-origin center AND the lead partner both at
`is_leading_result: true`.** The non-CP2026 path reaches the same conclusion more directly
(`:531-532`). This is the exact case an `otherCenters`-only test would not have proven — the reason
*Spec Correction 1* was worth making before this task ran.

##### Other audit findings preserved

- **`LCD-R-5` is a bit-for-bit refactor**, verified by truth table over both `(toggle, leadPartnerId)`
  branches, including `null` `leadPartnerId` (`null === id` → `false` in both old and new).
- **The `OTHER_CENTERS_CODE` sentinel row** now receives `is_leading_result = false` from the
  unconditional loop — but it is filtered out at `:544` in CP2026 and absent in the flat shape, and
  the old center-led branch wrote to it identically. No behavior change.
- **`LCD-AC-4`:** `if (!isPartnerLed)` is bit-for-bit the old `else` for the `false` case, so
  clear-on-switch-to-No is intact; the three trailing calls are byte-identical.
- **`LC-DD-5` intact:** all six forbidden methods unmodified. The `LC-T-4` describe and the
  `LC-DD-5`/`LC-DD-2`/`TOC-C-*`/`TOC-SP-*` paths pin `is_lead_by_partner` falsy, so the removed
  guard was never engaged there — they are confirmed among the 183 green, not silently red.
- **The subtlest risk was probed and did not materialize.** The Leader asked specifically whether a
  stale/invalid `leadCenterCode` could now survive into a recomputed options list, since it is no
  longer nulled before `setPossibleLeadCenters(true, false)`. It cannot: post-`LC-DD-1`
  `setPossibleLeadCenters` rebuilds the **full CLARISA catalog** with no dependence on
  `leadCenterCode`, and `tryAutoAssignLeadCenter` only overwrites when `union.length === 1` **and**
  `leadIsValid` is false — so a deliberate cross-selection (lead center X with a single different
  contributing center) is *not* overwritten. The one theoretical window (a not-yet-loaded
  `centersSE.centersList` making `possibleLeadCenters` empty) is pre-existing and unchanged; only
  its reachable toggle states widened.
- **Second intended new firing, worth recording:** `getSectionInformation` (`service.ts:374-376`) →
  `runAutoAssignLeads()` means a legacy partner-led result with exactly one Contributing Center now
  **prefills** its Lead Center on load. UI prefill only — nothing persists without a user-initiated
  save — and it is the desired direction given `LCD-R-2` makes the field mandatory. Sanctioned by
  `LCD-DD-2` ("auto-assign can now populate it regardless of the toggle's value").

#### Test failures — 4 total, all classified and each audited at source

The Reviewer read `service.spec.ts` and `component.spec.ts` directly rather than accepting the
Implementer's labels, and searched for a candidate fifth failure (found none — every remaining
toggle-sensitive assertion pins `is_lead_by_partner` falsy).

| # | Test | Class |
|---|---|---|
| 1–2 | `getMessageLead` ×2 (`component.spec.ts:697-711`) | `LCD-T-2` carry-over → `LCD-T-4` |
| 3 | `tryAutoAssignLeadCenter › should skip when led by partner` (`service.spec.ts:127-132`) | **Expected** — the `toBeNull()` assertion *is* the old exclusivity rule `LCD-DD-2` deletes; `design.md` §10 instructs the test task to assert the opposite |
| 4 | `onLeadByPartnerChange › …switching to partner-led…` (`service.spec.ts:177-187`) | **Expected** — `leadCenterCode` surviving the flip is literally `LCD-AC-4`; the `leadPartnerId` half at `:186` still passes |

**Tree is intentionally red on 4 tests until `LCD-T-4` lands.** All four are assertions of behavior
this spec removes by design; none is a regression.

#### `ADVISORY` findings (recorded, non-gating, not converted to work)

- **READABILITY —** the traceability comment's trailing clause "**and vice versa**"
  (`component.ts:504`) is **inaccurate**: partner/mqap flags *are* still force-zeroed when the
  toggle is `false` (`:517-522`), by design per `LCD-R-5`. Suggested replacement: *"…is no longer
  force-zeroed when a partner is lead; the partner side keeps its existing toggle gate."*
  **Leader note:** left unfixed rather than silently corrected — the Leader writes no production
  code, and an advisory may not be converted into work inside this spec. It is a wrong comment in
  correctness-critical code, so it is escalated in the run report as a recommended one-line
  follow-up rather than buried here.
- **RISK —** `requirements.md` §11 still owes the folder `CLAUDE.md` update + `Verified:` re-stamp
  (its `LC-DD-*` notes currently document the mutual exclusivity this task removed). Owned by
  `LCD-T-5`; flagged so it is not lost before the commit that lands this behavior.

#### Decisions made

1. Single-Reviewer mode chosen over parallel lens reviewers, with reasoning recorded above.
2. The inaccurate `@akili-spec` comment clause is **recorded, not fixed** in this task — Leader
   no-code rule plus the advisory-never-becomes-work rule. Escalated instead.

#### Final verification result

**PASS.** Lint clean; 183/187 green; the 4 red tests proven to be spec-mandated expectation changes.
`LCD-R-6` verified end-to-end through the ToC-origin path — the payload carries both leads.

---

### `LCD-T-4` — Test coverage for the decoupled behavior

| Field | Value |
|---|---|
| **Final status** | **PASS (attempt 2 of 3)** — the only task in this spec to require rework |
| Date | 2026-08-31 |
| Implementer attempts | 2 |
| Requirements covered | `LCD-AC-1`, `LCD-AC-2`, `LCD-AC-3`, `LCD-AC-4`, `LCD-AC-5`, `LCD-AC-6` |
| Skills assigned | `angular-developer`, `tdd` |
| Effort | attempt 1 `medium` → attempt 2 **`high`** (one-level bump per the retry rule) |

#### Skill deviation

`tdd` assigned **not** for red→green ordering — the production code already existed, so this task is
deliberately test-after — but for its **anti-pattern lens** (tautological, implementation-coupled,
horizontal-slicing tests). Recorded because that is a non-obvious use of the skill.

#### Environment blocker — probe-confirmed, not assumed

`LCD-T-4`'s DoD requires running three Cypress specs. **Probed before briefing** (per
`.agents/leader.md` → *Deferring a check*): `cypress.config.js` requires `baseUrl:
http://localhost:4200` **and** `./cypress.env.js` for credentials (`guestEmail`/`guestPassword`/
`userToken`); **`cypress.env.js` does not exist in this checkout** — the config logs
`⚠️ cypress.env.js not found. Using empty credentials.` An authenticated e2e run therefore cannot
succeed here. The assumption was tested rather than asserted, and the probe result is recorded next
to the deferral. Cypress specs are **written** (a real deliverable) but **not executed**; execution
is owed by CI or a credentialed local run.

#### Attempt 1 — Reviewer verdict `STATUS: FAIL`

Delivered: 4 red tests retargeted, 2 authorized `data-testid` hooks added, new Jest coverage for
`LCD-AC-1/2/3/6`, new Cypress `LCD-AC-2` assertion. Verification: `ng lint` clean; folder suite
195/195; **full client suite 484 suites / 7085 tests green**.

**The FAIL was not about redness** — the required 0-failure end state was met. It was about
**coverage integrity**:

> **Discovered Issue:** Adding `'contributing_center'` and `'institutions'` to the path-keyed
> `NEVER_EDIT` set in `save-contract.cy.ts` (`:72-79`) silently drops all edit/value/round-trip
> coverage for the two **pre-existing** hooks `cp-field-contributing_center` and
> `cp-field-contributing_center~flat` (both non-mandatory multiselects with no other assertion
> path), not just the two new `~lead` hooks the change was meant to protect.
>
> **Violated Rule:** `tasks.md` `LCD-T-4` scope-widening clause — the widening is authorized only to
> make `LCD-AC-2` assertable without a false negative, not to reduce existing coverage.
> `requirements.md` §8's defect-class table gates field coverage on this suite.
>
> **Remediation:** replace the two new entries with a testid-keyed set
> (`NEVER_EDIT_TESTID = new Set(['contributing_center~lead','institutions~lead'])`) and extend the
> `editAll` filter at `:435` with `!NEVER_EDIT_TESTID.has(hook.testid)`.

**Mechanism (Leader-verified independently before the audit, then confirmed by the Reviewer):**
`discover()` derives `path` as `testid.slice(prefix.length).split('~')[0]` (`:131` — strips at `~`),
and `editAll` filters on `hook.path` (`:435`). All three testids collapse to one path, so a
path-keyed exclusion cannot distinguish them.

**Why the coverage loss was total, not partial** — the sharpest part of the audit: both pre-existing
hooks are `kind: 'multiselect'` and `[required]="false"`, so `hook.required` is false and they were
**never** covered by the mandatory-presence check (`assertPayloadCovers:373-385`). Their *only*
assertion path was the `edited.forEach` block (`:387-421`) driven by `editAll`, plus the reload
round-trip (`:492-496`). Excluding them from `editAll` dropped their coverage to **zero**. The
Implementer's claim that "mandatory-field coverage is unaffected" was true as stated but incomplete —
it was silent on the two multiselects that had no other safety net.

**And the justification was right but mis-scoped:** for `multiselect` kind, `assertPayloadCovers`
takes the array-length branch (`:401-407`) and never performs the scalar `String(sent) === onScreen`
comparison. The false-negative risk is real **only** for the new `~lead` hooks, which are `select`
kind and hit the scalar branch (`:421`) with a whole array as `sent`. So the premise was sound; only
the blast radius was wrong — which is why this is a remediation, not a rejected approach.

#### Reviewer runtime failure (recorded — an infrastructure event, not a work verdict)

The first Reviewer dispatch **died mid-audit** to an opus session rate limit (HTTP 429). Per
`/akili-execute`'s runtime-failure fallback table, a Reviewer is **never** run inline by the Leader —
that would break `author ≠ auditor`, and a runtime failure does not suspend a correctness
constraint. Degraded by role instead: re-dispatched on a **different model (`fable`)**, still not the
author (`sonnet`), so independence was preserved rather than waived. No user waiver was requested or
implied. The replacement audit is the FAIL recorded above.

#### `ADVISORY` findings from attempt 1 (recorded, non-gating, explicitly NOT actioned in rework)

- **RELIABILITY —** `LCD-AC-3 (contrast)` (`component.spec.ts:1316-1330`) drives the child
  `app-pr-select` via `writeValue()` directly, bypassing `[(ngModel)]`. It proves the child's own CVA
  rendering, not the parent→child integration its docstring implies. Low risk (that binding is
  pre-existing and unchanged by this spec) but the framing overstates coverage.
- **RELIABILITY —** `LCD-AC-3 (save-side half)` (`:716-723`) is near-tautological: production is
  `is_leading_result = (leadCenterCode === code)`, so with `leadCenterCode = null` it is always
  `false` regardless of correctness. Acceptable as documented belt-and-suspenders, not as the primary
  proof of `LCD-AC-3` — the render-level tests are.
- **RESILIENCE —** the new Cypress `LCD-AC-2` test's `this.skip()` guard requires an already
  partner-led record with a pre-selected Lead Partner on the shared backend — narrow, so it may
  rarely execute. Honest (pending, never a silent pass) and the deliberate consequence of never
  driving `is_lead_by_partner` (which once corrupted the shared test record). Flagged for whoever
  runs it locally.

Per the *Advisory Never Becomes A Task* rule these were **recorded and stopped there** — the attempt-2
brief explicitly instructs the Implementer not to touch them.

#### Attempt 2 — Reviewer verdict `STATUS: PASS`

Scope: **one file**, `save-contract.cy.ts` (98 → 106 lines). `component.spec.ts`, `service.spec.ts`
and `component.html` byte-identical to attempt 1; `component.ts`/`service.ts` untouched.

The fix, exactly as the FAIL's remediation prescribed:

- `NEVER_EDIT` (`:62-67`) **restored** to its original four path-keyed entries, original comment intact.
- New `NEVER_EDIT_TESTID` (`:85`) =
  `{'cp-field-contributing_center~lead', 'cp-field-institutions~lead'}`.
- Filter (`:441`): `!NEVER_EDIT.has(hook.path) && !NEVER_EDIT_TESTID.has(hook.testid) && hook.kind !== 'unknown' && !edited.has(hook.testid)` — the original three conditions preserved, the new one ANDed on.
- Justifying comment rewritten to state why `path`-keyed exclusion is too wide and why only
  `select`-kind hooks need excluding.

**The high-risk detail, called out in the brief and confirmed by both sides:** the set must use the
**full, unstripped `data-testid`** (prefix included). `discover()` assigns `testid` from the raw
attribute and strips only `path`, so a key of `'contributing_center~lead'` would have **silently
matched nothing** — the exclusion would be inert and the false negative would return, with no error
to reveal it. The Reviewer verified the strings character-for-character against `discover()` and the
template (`component.html:426`, `:459`).

| Hook | Kind | `editAll` outcome | Coverage state |
|---|---|---|---|
| `cp-field-contributing_center` | multiselect | **Included** | **Restored** |
| `cp-field-contributing_center~flat` | multiselect | **Included** | **Restored** |
| `cp-field-contributing_center~lead` | select | Excluded | Presence + dedicated `LCD-AC-2` test |
| `cp-field-institutions~lead` | select | Excluded | Presence + dedicated `LCD-AC-2` test |

> **Reviewer:** `NEVER_EDIT` is genuinely restored … the new `NEVER_EDIT_TESTID` set uses the exact
> raw `data-testid` strings … so the exclusion is live, not inert. … `cp-field-contributing_center`
> and `cp-field-contributing_center~flat` are re-included in `editAll`, restoring the coverage
> attempt 1 dropped; the two `~lead` hooks are excluded only from `editAll`/the edit-value
> assertions, while `assertPayloadCovers`'s mandatory-presence branch (`:379-391`) and
> `captureOnScreen` (`:349-356`) iterate the full, unfiltered `hooks` array, so Lead Center's
> `[required]="true"` presence coverage is unaffected. No new interaction problem with the
> `edited`/`expected` maps or round-trip loop.

**Verification:** `ng lint` clean; folder suite **195/195 green**, unchanged from attempt 1 — itself
evidence that no Jest-visible file drifted during a Cypress-only fix.

#### Final verification result

**PASS on attempt 2.** All 4 previously-red tests retargeted and green; new coverage for
`LCD-AC-1/2/3/4/5/6`; the two authorized hooks added; pre-existing `save-contract.cy.ts` coverage
intact. Cypress specs written but **not executed** (probe-confirmed environment blocker — see above);
their execution is owed by CI or a credentialed local run.

#### Why this task needed rework and the others did not

Worth recording for the Kaizen pass: the defect was **invisible to every green signal**. The full
client suite passed 7085/7085 both before and after the bad change, because the loss was *Cypress*
coverage that no Jest run exercises and no assertion asserts. Only a reviewer reading the discovery
mechanism could see it. This is the archetype of what `author ≠ auditor` exists to catch, and it is
the concrete justification for having refused to review inline when the first Reviewer dispatch died
to a rate limit.

#### Findings the audit positively confirmed (worth keeping)

- **The `LCD-AC-2` ToC-origin test is sound.** `otherCentersSelected = []` genuinely forces the ToC
  path; `from_toc: true` is set **only** by the `tocCenters` spread (`component.ts:545`) while
  `otherCenters` always sets `false` (`:548`), so `expect(leadingCenter.from_toc).toBe(true)` is
  real proof; and the `fieldsManagerSE` swap faithfully forces `isCP2026()` rather than stubbing past
  the code under test.
- **All 4 red tests were fixed by retargeting, not deletion or weakening.**
- **`LC-T-4` is byte-for-byte unmodified and green**; the new `LCD-AC-6` guard is a sibling describe.
- **`component.html` touched only for the two hooks**; no scope leak into `component.ts`/`service.ts`.
- The zoneless `fixture.changeDetectorRef.detectChanges()` technique still runs a real full CD pass;
  it skips only `ApplicationRef.tick()`'s dev-mode-only `checkNoChanges` diagnostic, which does not
  run in production builds. So `LCD-AC-1` does not pass in the harness for a reason that would fail
  in the app.

---

### `LCD-T-5` — Update the folder's `CLAUDE.md` and verify in a real browser

| Field | Value |
|---|---|
| **Final status** | **`[~]` PARTIAL — documentation half PASS; browser walkthrough outstanding** |
| Date | 2026-08-31 |
| Implementer attempts | 1 (documentation half) |
| Skills assigned | **none** — a markdown trap-list needs no stack skill; `angular-developer` was explicitly *not* assigned |

#### Why this task is `[~]` and not `[x]`

Two DoD items are **not satisfiable in this session**, and both were probed rather than assumed:

1. **Manual browser walkthrough — probe-confirmed blocker.** Assumption tested: *"this cannot run
   because there is no app to run it against."* Probe: `onecgiar-pr-client/src/environments/environment.ts:3`
   sets `apiBaseUrl: 'http://localhost:3400/'` — a **local backend**. The walkthrough therefore needs
   the full local stack (NestJS on 3400 + MySQL), a valid auth token, **and** a real ToC-mapped P25
   result. The token cannot be obtained without the user, and handling one would cut against
   `.cursorrules`. Probe result recorded next to the deferral, per `.agents/leader.md` →
   *Deferring a check*.
   **Mitigating coverage (why this is a confirmation gate, not the only gate):** the render-level
   behavior it would confirm is already covered by `LCD-T-4`'s Jest tests, which mount the **real
   component with the real service** and assert `.pr-field.mandatory` for **both** toggle values
   (`LCD-AC-1`) and mandatory-but-incomplete with no Lead Center (`LCD-AC-3`). The walkthrough adds
   integration/visual confirmation against real data — valuable, not redundant, but not the sole
   evidence.
2. **`Verified:` commit-hash re-stamp — impossible by construction.** `docs/COMPONENT-DOCS.md`
   requires the **landed commit hash**, and no commit exists: this repo's standing rule is that
   nothing is committed without the user's explicit go-ahead, so the whole spec is staged only. The
   Implementer was explicitly instructed **not** to fabricate a plausible hash — a wrong-but-credible
   hash silently points future readers at unrelated code, which is worse than an obvious gap. The
   line therefore reads:
   ```
   **Verified:** 2026-08-31 · branch qa-development-2026-ss · <PENDING: re-stamp with the landing commit hash> (LCD-T-2, LCD-T-3, LCD-T-4)
   ```

#### Documentation half — Reviewer verdict `STATUS: PASS`

A new `⚠️` trap block was added covering `LCD-DD-1..4`, the two `data-testid` hooks, the Cypress
`NEVER_EDIT_TESTID` trap, `LC-DD-5` unchanged, the server-side known gap, and an explicit
"not yet verified in a real browser" line.

> **Reviewer:** Every factual claim in the new `⚠️` block was independently verified against the
> working tree — HTML lines 421-438/459, service.ts 670-695/376, component.ts 505-523/543-562/613-619,
> `save-contract.cy.ts` 85/441, and the server migration 157-158 — and each matches the cited text
> exactly, including line numbers. The `tocCenters` trap correctly states that it inherits
> `is_leading_result` from the unconditional stamping loop while `otherCenters`/`tocPartners`/
> `otherPartners` each recompute their own, matching `design.md`'s `LCD-DD-3` per-array table
> verbatim.

Also positively confirmed by the audit:

- **Leaving this folder's existing `LC-DD-*` / `TOC-C-DD-*` / `TOC-SP-DD-*` entries untouched was
  correct** — the Reviewer read them and confirmed **none** asserts toggle-based mutual exclusivity;
  they describe the dropdown catalog, a save-persistence gap, and unrelated min-count guards. So
  there was no superseded history in this file to mark.
- **The doc does not overclaim** — it states plainly that the browser walkthrough was not performed.
- **Scope respected** — only this `CLAUDE.md` was touched.

#### Constitution Impact / pending shared-file item (do NOT apply on this branch)

The audit confirmed the genuinely stale narrative lives in the **parent guide**
`onecgiar-pr-client/src/CLAUDE.md` **§21.5**, whose "Lead fields (P2-2960)" row still says the
toggle *"switches Lead partner … vs Lead center"* — **now stale for P25**, though **still accurate
for P22** (`rd-partners`, explicitly out of scope per `requirements.md` §3).

It was **correctly left unedited**: shared-file write discipline forbids lifecycle side-effect edits
to parent guides on a spec branch, and `tasks.md` does not name `src/CLAUDE.md` as a deliverable of
any task. Recorded here as a **pending item to apply on the default branch**:

> **PENDING (default branch):** update `onecgiar-pr-client/src/CLAUDE.md` §21.5's "Lead fields
> (P2-2960)" row to state that for **P25** Lead Center is always rendered and required and is
> independent of `is_lead_by_partner` (which now gates only Lead Partner), while **P22**
> (`rd-partners`) keeps the original either/or behavior. Pointer: `docs/specs/changes/lead-center-decouple/`.

#### Final verification result

**Documentation deliverable: PASS.** Task remains `[~]` pending the browser walkthrough and the
commit-hash re-stamp, both owed at/after the landing commit.

---

## Approval-gate change (recorded for audit honesty)

`proposal.md` §1 sets `Approval Mode: gated`, and gates were honored individually after `LCD-T-1`
and `LCD-T-2`. At the `LCD-T-2` gate the user **explicitly instructed** continuing through the
remaining tasks without a check-in after every single PASS, while still stopping for any HALT,
Pivot, budget tripwire, or decision only they can make.

Recorded rather than silently applied, because the effective mode for `LCD-T-3` onward no longer
matches the mode written in `proposal.md`. The exception carve-outs of `gated` remain fully in
force — this relaxes only the routine per-PASS pause, exactly as the command's Approval Mode rule
describes for `pre-approved`. `proposal.md` itself is left unedited (the user relaxed the gate for
this run; they did not re-classify the spec).

---

## 3. Run Summary

**Execution complete — 4 of 5 tasks `[x]`, 1 `[~]` with two named outstanding gates.**

| Task | Status | Attempts | Notes |
|---|---|---|---|
| `LCD-T-1` | `[x]` PASS | 1 | Server-side scope gate cleared — no exclusivity constraint at any layer |
| `LCD-T-2` | `[x]` PASS | 1 | Template relocation, always-required, split messages |
| `LCD-T-3` | `[x]` PASS | 1 | Payload decoupling — `LCD-R-6` verified end-to-end through the ToC-origin path |
| `LCD-T-4` | `[x]` PASS | **2** | Reworked: a coverage regression invisible to every green signal |
| `LCD-T-5` | `[~]` PARTIAL | 1 | Doc half PASS; browser walkthrough + hash re-stamp owed |

**Budget (`design.md` §12: ~4 tasks, ~90–140 LOC, 1 expected review round):**
5 tasks, **359 insertions / 48 deletions** across 6 client files, **1 rework round**. Production-code
change is small (~32/31 LOC in `component.ts`/`service.ts`/`component.html`); the bulk is test code,
which the budget's LOC figure did not separately anticipate. **No tripwire raised** — the review-round
estimate was met exactly and the production footprint landed inside the range.

### Verification state at hand-off

- `npx ng lint --quiet` — clean.
- `npx jest` folder suite — **195/195 green**.
- `npx jest` full client suite — **484 suites / 7085 tests green**.
- **Cypress — written, NOT executed.** Probe-confirmed blocker (`cypress.env.js` absent). **Owed.**
- **Browser walkthrough — NOT performed.** Probe-confirmed blocker (local backend + token). **Owed.**

### Outstanding items (nothing here is silently closed)

1. **Cypress e2e run** — three specs incl. the new `LCD-AC-2` combined-lead assertion. Needs
   credentials + a running stack. The new test's `this.skip()` guard is narrow (requires an
   already-partner-led record), so whoever runs it should confirm it actually **ran** rather than
   skipped — a pending test is not a passing one.
2. **Manual browser walkthrough** (`LCD-T-5`) — the final human gate.
3. **`Verified:` hash re-stamp** in the folder `CLAUDE.md` — at commit time.
4. **PENDING on default branch:** update `onecgiar-pr-client/src/CLAUDE.md` §21.5's "Lead fields
   (P2-2960)" row (stale for P25, still correct for P22). Not applied here per shared-file write
   discipline.
5. **Recommended one-line follow-up:** `component.ts:504`'s `@akili-spec` comment ends "and vice
   versa", which is inaccurate — partner/mqap flags *are* still force-zeroed when the toggle is
   `false`, by design (`LCD-R-5`). Suggested: *"…is no longer force-zeroed when a partner is lead;
   the partner side keeps its existing toggle gate."* Recorded as an `ADVISORY` at `LCD-T-3` and
   deliberately **not** self-fixed (Leader writes no production code; advisories never become work).
6. **Follow-up spec candidate (server):** `validation_contributor_partner_P25`
   (`migrations/1762866499786:157-158`) never requires a leading center while `lead_by_partner = 1`,
   so the UI now hard-requires a Lead Center the server's completeness check does not. Out of this
   spec's frontend-only scope.
7. **Latent hazard worth recording:** the `PATCH /v2/api/contributors-partners/:resultId` route works
   only because `onecgiar-pr-server/CLAUDE.md` §6's documented `ValidationPipe({whitelist:true})`
   convention is **not** applied to it. Applying that convention later would silently strip
   `institutions` / `mqap_institutions` / `contributing_center` — data loss, not a validation error.

### Git state

**Everything is staged and NOT committed**, per this repo's standing rule that no commit happens
without the user's explicit go-ahead. The pre-existing unrelated archive/kaizen changes in the
working tree were left untouched throughout, and the standing rollback-scope constraint at the top of
this document was never triggered (no HALT occurred).

### Note for the Kaizen pass (`/akili-archive`)

The single most transferable lesson from this run: **`LCD-T-4`'s defect was invisible to every green
signal.** The full client suite passed 7085/7085 both before and after the bad change, because what
was lost was *Cypress* coverage that no Jest run exercises and no assertion asserts. It was found
only by a reviewer reading the discovery mechanism in `save-contract.cy.ts`. Two process rules
earned their keep and should be reinforced: (1) `author ≠ auditor` is not an efficiency cost — it was
the only thing standing between this and a silent coverage hole; and (2) when the first Reviewer
dispatch died to a rate limit, degrading to a **different non-author model** rather than reviewing
inline is what preserved that guarantee.

---
