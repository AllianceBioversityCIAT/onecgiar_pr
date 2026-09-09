# Execution Log — `evidence-storage-link-validation`

## 1. Document Control

- **Spec path:** `docs/specs/bugfix/evidence-storage-link-validation/`
- **Ticket:** [P2-3345](https://cgiarmel.atlassian.net/browse/P2-3345)
- **Approval mode:** gated (default — no `pre-approved` marker found in `proposal.md`/`requirements.md`)
- **Branch:** `qa-development-2026-ss`
- **Leader model:** Sonnet 5 (T1 orchestration for this run)

---

## 2. Task Execution History

### `EVL-T-1` — Add red regression tests for the file-storage evidence-link bug

- **Status:** PASS
- **Date:** 2026-09-07
- **Attempts:** 1

**Attempt 1**

- **Implementer:** akili-implementer (T2), skills `nestjs-expert`, `tdd`, `systematic-debugging`, effort `medium`.
- **Files changed:** `onecgiar-pr-server/src/api/results/results-validation-module/results-validation-module.repository.spec.ts` (new file, 241 lines).
- **Verification command:** `cd onecgiar-pr-server && npx jest results-validation-module.repository.spec.ts --silent`
- **Verification result:**
  ```
  Test Suites: 1 failed, 1 total
  Tests:       8 failed, 2 passed, 10 total
  - EVL-AC-1 (SharePoint, red): Expected 0 / Received 1
  - EVL-AC-2 (submission gate, same fixture, red): Expected 0 / Received 1
  - EVL-AC-4 (grandfather cutoff, red): TypeError: Cannot read properties of undefined (reading 'getTime')
  - EVL-R-1 x5 (OneDrive, 1drv.ms, Google Drive, Google Docs, Dropbox, red): Expected 0 / Received 1
  - EVL-AC-3 (plain link, regression guard, green): PASSED
  - baseline "should be defined" (green): PASSED
  ```
  Lint: `npx eslint "src/api/results/results-validation-module/results-validation-module.repository.spec.ts" --quiet` → clean (exit 0).
- **Implementer self-reported deviations (Not Done / Assumptions):**
  1. Case 4's forward reference to `EVIDENCE_LINK_RULE_EFFECTIVE_DATE` implemented via `require(...)` cast to `any` instead of a static ES `import`, because a static import of a not-yet-exported member aborts ts-jest compilation of the whole file (TS2305) and would hide the required per-case red/green split.
  2. Case 2 (submission-gate path, `EVL-AC-2`) implemented as a second identical call to `repository.evidenceValidation(...)` on the same fixture, per `design.md` §2.2 ("no second call site to keep in sync").
  3. Constraint placed on `EVL-T-2`: `EVIDENCE_LINK_RULE_EFFECTIVE_DATE` must be a module-level exported constant (not class-private), since case 4 imports it by name.
- **Reviewer:** akili-reviewer (T3), diff-only input + targeted reads of `results-validation-module.repository.ts` (lines ~1-30, ~780-940).
- **Reviewer verdict:** **PASS**. Independently verified: mock isolation correctly pins the SQL 'evidences' section to `validation: 1` so only `multiplePerField` drives the assertions; `ResultTypeEnum.KNOWLEDGE_PRODUCT` (6) routing confirmed to reach the shared tail (`repository.ts:927-937`) that reads `multiplePerField`, bypassing the type-5/type-7 special cases; all three self-reported deviations checked against `design.md`/`tasks.md` source text and found conformant; no scope creep into `results-validation-module.repository.ts` (untouched); no secrets in fixtures.
- **ADVISORY (4R lens, non-gating):**
  - *Reliability:* case 4 assumes `EVIDENCE_LINK_RULE_EFFECTIVE_DATE` will be exported as a `Date` (calls `.getTime()`), but `design.md` `EVL-DD-1`'s literal sketch (`env.EVIDENCE_LINK_RULE_EFFECTIVE_DATE ?? '<merge-day-date>'`) reads as a string expression. **Forwarded to `EVL-T-2`'s brief**: the export must be a `Date` (or `EVL-T-1`'s case 4 will stay red, and a Date-vs-string relational compare in the grandfather check would silently always evaluate false).
  - *Reliability:* `EVL-TEST-2` (submission-gate case) is byte-identical to `EVL-TEST-1`; adds no independent signal beyond asserting the design's structural guarantee. Non-blocking.
  - *Readability:* the SQL-routing mock keys on the literal substring `'evidences' AS section_name` (repository.ts:631) with no comment anchoring it to that line. Non-blocking; failure mode if it drifts is a loud `undefined` error, not a silent pass.
- **Requirements covered:** `EVL-R-1` (test coverage of full denylist), `EVL-AC-1`, `EVL-AC-2`, `EVL-AC-3`, `EVL-AC-4`.
- **Decisions made:** Leader accepted Implementer's `require()`-based forward-reference approach and repeated-call submission-gate test as spec-conformant (confirmed independently by Reviewer against source text), per DoD's own internal tension (see deviation 1 above).
- **Issues encountered:** None blocking.
- **Final verification result:** 8 red (expected) / 2 green (expected), lint clean — matches Definition of Done exactly.

---

### `EVL-T-2` — Implement the file-storage host denylist with grandfather cutoff

- **Status:** PASS
- **Date:** 2026-09-07
- **Attempts:** 1

**Attempt 1**

- **Implementer:** akili-implementer (T2), skill `nestjs-expert`, effort `medium`.
- **Files changed:** `onecgiar-pr-server/src/api/results/results-validation-module/results-validation-module.repository.ts` (48 insertions, 2 deletions).
- **Implementation:** added exported module-level `const EVIDENCE_LINK_RULE_EFFECTIVE_DATE: Date = new Date(env.EVIDENCE_LINK_RULE_EFFECTIVE_DATE ?? '2026-09-07')`; added private `_fileStorageDenylistRegex` (byte-identical to `design.md` §5's spec, mirroring `rd-evidences.component.ts:476`); added private `_isAcceptableEvidenceLink(evidence: Evidence): boolean` implementing the 3-step logic (well-formedness gate → denylist check → grandfather-cutoff compare); replaced the inline `_regex.test(...)` predicate in `multiplePerField` with a call to the new helper.
- **Verification commands:**
  - `cd onecgiar-pr-server && npx jest results-validation-module.repository.spec.ts --silent` → `Tests: 10 passed, 10 total` (all `EVL-T-1` cases now green, including the two already-passing ones).
  - `cd onecgiar-pr-server && npx eslint "src/api/results/results-validation-module/results-validation-module.repository.ts" --quiet` → clean (exit 0).
- **Reviewer:** akili-reviewer (T3), diff + targeted source reads (env typing, `Evidence` import, `evidence.entity.ts:228-232` column type, `orm.config.ts`, cross-file grep for duplicate predicates, `evidences.repository.ts` phase-replication path).
- **Reviewer verdict:** **PASS**. Independently confirmed: (1) `env` is `process.env` (`NodeJS.ProcessEnv`, no narrowing interface) — reads arbitrary keys, `tsc`/ts-jest already compiled it; (2) `Evidence` import pre-existing, no new import needed; (3) `last_updated_date` is a real `@UpdateDateColumn` `Date`, deserializes as `Date` from the raw mysql2 query (no `dateStrings` override in `orm.config.ts`), so the `Date < Date` grandfather compare is sound — discharges the `EVL-T-1` advisory; (4) `_regex` well-formedness gate still runs first, no loosening for malformed non-denylisted links; (5) single predicate, single `multiplePerField` computation, no duplicate check elsewhere — `EVL-R-3` holds structurally; (6) `EVL-R-10` (SHOULD) met via env override; (7) denylist regex byte-identical to spec.
- **ADVISORY (4R lens, non-gating):**
  - *Reliability:* `last_updated_date` is nullable; a NULL coerces to `0` in the relational compare, grandfathering a NULL-dated denylisted link forever. Benign today (ORM save path always populates it), but an unasserted branch.
  - *Risk:* `evidences.repository.ts:81`'s phase-replication path copies `last_updated_date` verbatim into new-phase rows, so a result rolled into a new phase keeps a pre-cutoff timestamp and its SharePoint link stays grandfathered-valid in the new phase until edited. Conformant with the letter of `EVL-R-2`; flagged so it isn't misread as a fix failure during staging QA.
- **Human-gate item flagged by Reviewer (per `requirements.md` §9b — no automated check possible, explicit PR-review gate):** the literal default `'2026-09-07'` is *today's* session date, not a confirmed future rollout date. Two follow-on points: (a) `new Date('2026-09-07')` parses as UTC midnight, not the DB server's local midnight — the cutoff instant is `2026-09-07T00:00:00Z`; (b) `tasks.md` §6 still requires PR → CI → staging QA before actual rollout, so if merge/deploy lands after this date, every evidence row touched in the gap would be retroactively flipped valid→invalid relative to the *real* rollout instant, contradicting the spirit of `EVL-R-2` (though not its literal wording, which is relative to the constant). **`EVL-DD-1`'s own consequence clause anticipates this exactly: "if the PR merges later than planned, the constant needs a one-line update before merge."** This is an open action item for whoever merges this spec — not resolved by this execution run.
- **Requirements covered:** `EVL-R-1`, `EVL-R-2`, `EVL-R-3`, `EVL-R-10`, `EVL-AC-1`, `EVL-AC-2`, `EVL-AC-3`, `EVL-AC-4`.
- **Decisions made:** Leader accepted the Implementer's literal default date choice (today) as a provisional value satisfying "not a placeholder," while explicitly flagging via the Reviewer's finding that it needs human confirmation before merge per `EVL-DD-1`'s own stated consequence.
- **Issues encountered:** None blocking; one human-gate item open (see above).
- **Final verification result:** 10/10 tests green, lint clean — matches Definition of Done except the merge-time date-confirmation sub-item, which is inherently outside automated verification.

---

## 4. Spec status (pre-Pivot)

Both tasks (`EVL-T-1`, `EVL-T-2`) are `[x]` with matching PASS evidence above. No further tasks eligible in `tasks.md` §3 at this point.

**Open before this spec can ship (from `tasks.md` §6-7, not part of the Implementer/Reviewer loop):**
- Confirm/update `EVIDENCE_LINK_RULE_EFFECTIVE_DATE`'s literal default to the actual planned rollout date before merge (see human-gate item above).
- PR opened with commit convention, ticket `P2-3345`; CI green; manual QA on staging per the Jira repro.
- Follow-up ticket (non-blocking) for the shared client/server denylist constant, per `proposal.md` §12 / `design.md` §13.

---

## Pivot Record: EVL-T-2 post-QA

- **Date:** 2026-09-07
- **Trigger:** manual QA by the user on `EVL-T-2`'s fix (result `#9075`, "[QA P2-3259] Innovation Development 2026 E2E validation"). The user added a SharePoint link as evidence alongside two already-acceptable evidences (one file upload, one plain public link) and observed the Evidence section still reported "complete" with a green check.
- **Investigation (Leader, inline — 1-file greps + targeted reads, within Delegation Thresholds):**
  1. First hypothesis (ruled out): the `resultTypeId == 7 && level == 0` branch (`results-validation-module.repository.ts:963-970`) bypasses `multiplePerField` entirely and returns `validation: 1` unconditionally. Ruled out — the user confirmed the readiness level was `5`, not `0`.
  2. Actual cause (confirmed): `multiplePerField = allEvidences.some((e) => this._isAcceptableEvidenceLink(e))` — `.some()` requires only ONE acceptable evidence among all of a result's evidence rows to mark the section valid. The test result had 3 evidences (1 file, 1 SharePoint link, 1 plain link); the plain link alone was enough to satisfy `.some()`, so the section validated correctly **per the letter of `EVL-R-1`/`EVL-AC-1`** (which speak of a result whose **only** evidence is a bad link) — this is NOT a defect in `EVL-T-2`'s implementation; it is exactly what the approved spec asked for.
  3. Once this was explained, the user clarified their **actual** intent: the "Add evidence" button inside the Add/Edit New Evidence modal should be **disabled** the moment a SharePoint/OneDrive/Drive/Dropbox link is typed into the Link field — preventing that evidence from being added to the list at all, regardless of what other evidence exists. This is a client-side gate at entry time, not a server-side section-validity computation, and it was explicitly out of scope in the original `requirements.md` §3 ("Any client-side change ... — Out of scope").
- **Root cause of the scope gap:** the original spec (`proposal.md` §9, `requirements.md` §3) assumed the client's existing denylist copy + detection (`rd-evidences.component.ts:476`, used only by the whole-section `validateButtonDisabled` getter) was sufficient, without checking whether the **per-evidence add flow** (the modal's own `draftValid` getter, `rd-evidences.component.ts:417-423`) also enforced it. It does not — `draftValid` only checks link/file presence, never the host. This was not caught at specify time because the client was declared out of scope and therefore not audited task-by-task.
- **Is this an ADR/architecture reversal?** No — no `ADR-NNN` in `docs/trd/trd.md` is affected. This is a scope correction within a Lite bugfix spec, not an architectural pivot.
- **Decision (user, via `AskUserQuestion`):** Pivot on this spec rather than opening a separate spec or a `/akili-quick` fix — the user chose "Pivot sobre este mismo spec" to keep the client-side gate under the same ticket (`P2-3345`) and the same triad process (Implementer → Reviewer) as `EVL-T-1`/`EVL-T-2`.
- **Spec changes made (two-direction sweep completed):**
  - `requirements.md` §3: moved "Any client-side change" from Out-of-scope to a new In-scope bullet; added `EVL-R-11` (MUST); added `EVL-AC-5`/`EVL-AC-6`.
  - `design.md` §2.1, §6, Budget: updated "Client modules touched: none" → names `rd-evidences.component.ts`; added a full Frontend Plan section (before/after code, exact lines); revised the task/LOC/review-round budget.
  - `tasks.md`: added `EVL-T-3` (client task, depends on `EVL-T-2` sequencing-only, not code); added `EVL-TEST-6`/`EVL-TEST-7` to the test-plan table; updated the dependency graph.
  - **Forward sweep:** grepped the spec folder for `"no client change"` / `"Out of scope"` / `"Client modules touched: none"` — only `proposal.md:53` still asserts no client change; left as-is deliberately, since `proposal.md` is the historical record of the *original* decision (Pivot Protocol only amends `requirements.md`/`design.md`/`tasks.md`, never the proposal that predates it).
  - **Backward sweep:** no other document in the folder cites or depends on the old "no client-side change" scope line, so nothing else needed correcting.
- **Approval:** user approved proceeding with `EVL-T-3` under this Pivot before any code was written (approval requested and received in-conversation, 2026-09-07, prior to spawning an Implementer).

---

### `EVL-T-3` — Client-side: block "Add evidence" for a file-storage link in the modal

- **Status:** PASS
- **Date:** 2026-09-07
- **Attempts:** 1

**Attempt 1**

- **Implementer:** akili-implementer (T2), skill `angular-developer`, effort `medium`.
- **Files changed:** `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-evidences/rd-evidences.component.ts` (13 lines), `rd-evidences.component.spec.ts` (new `describe('draftValid', ...)` block).
- **Implementation:** promoted the file-storage denylist regex (previously declared locally inside `validateButtonDisabled`) to `private readonly _fileStorageDenylistRegex`; `draftValid` now returns `false` for an empty link and `false` for a denylisted link (Link-source path only — file-upload path unaffected); `validateButtonDisabled` now references the shared field instead of its own local declaration, with no behavior change.
- **Verification commands:**
  - `cd onecgiar-pr-client && npx jest --testPathPattern="rd-evidences.component.spec" --silent` → `Tests: 86 passed, 86 total`.
  - `cd onecgiar-pr-client && npx ng lint --quiet` → `All files pass linting.` (plain `eslint` fails in this environment due to a flat-config/`.eslintrc.json` mismatch unrelated to this change — Reviewer independently confirmed `ng lint` is the project's documented client lint command, not a substitution to dodge lint.)
- **Reviewer:** akili-reviewer (T3), diff + targeted reads of `rd-evidences.component.ts` (415-499), `rd-evidences.component.html` (131-139), `rd-evidences.component.spec.ts` (735-776), `pr-button.component.ts`/`.html`, `styles.scss` (88-91).
- **Reviewer verdict:** **PASS**. Independently verified the load-bearing question for `EVL-R-11` ("MUST NOT be addable"): `.globalDisabled { pointer-events: none }` is applied to the same `<app-pr-button>` host element that carries the `(click)="confirmCreateEvidence()"` binding, and `pr-button`'s template renders a non-focusable `<div>` with no `tabindex`/`role`/native `<button>` — so there is no mouse **or** keyboard path to the handler while a denylisted link is entered. This is the enforcing case the client `src/CLAUDE.md` warning about "visual-only disable" describes as the *failure* mode — confirmed this call site does NOT fall into it. Also verified: `validateButtonDisabled`'s 4 pre-existing test cases pass unchanged (regex is stateless, no `g`/`y` flag, safe to share); no third denylist definition was introduced (grep found exactly 2 occurrences in the folder: the new shared field + the pre-existing, already-tracked copy in `evidence-item.component.ts:109`); diff is byte-for-byte the code prescribed in `design.md` §6; new tests exercise the real getter on a real component instance and cover all 4 host families + both regression guards (`EVL-AC-6`, empty-link, file-source, null-draft).
- **ADVISORY (4R lens, non-gating):**
  - *Reliability:* `draftValid` tests raw `e.link` while the sibling `evidence-item.component.ts:110`'s `validateCloudLink()` tests `link?.trim()`. Because the regex is anchored, a pasted link with leading/trailing whitespace (common from Teams/Outlook copy-paste) fails the match in `draftValid` — button stays enabled — while the inline cloud-link warning still fires, so the two disagree and the evidence becomes addable. Inherited from the approved `design.md` snippet and from the pre-existing `validateButtonDisabled` (not a deviation introduced by this task). Suggested follow-up: normalize with `.trim()` in all three call sites (`draftValid`, `validateButtonDisabled`, `validateCloudLink`) to agree.
- **Requirements covered:** `EVL-R-11`, `EVL-AC-5`, `EVL-AC-6`.
- **Decisions made:** none beyond the Pivot decision already recorded above.
- **Issues encountered:** none blocking. One pre-existing whitespace-trim inconsistency surfaced as advisory (see above), not introduced by this task.
- **Final verification result:** 86/86 tests green (includes 5 new `draftValid` cases + all pre-existing suite), lint clean — matches Definition of Done in full, including the button-genuinely-blocks-the-click requirement that DoD didn't spell out explicitly but `EVL-R-11` requires.

**Manual smoke (tasks.md EVL-T-3 DoD's last item):** confirmed by the user in their live browser session, 2026-09-07, on the same result (`#9075`) that surfaced the original Pivot finding — pasting the `cgiar.sharepoint.com` link in "Add New Evidence" now grays out "Add evidence". `EVL-T-3` DoD is now fully satisfied.

---

## Investigated and explicitly declined: SQL-side fix for `validation_evidences_P25`

- **Date:** 2026-09-07
- **Trigger:** Leader-inline investigation (git grep + targeted reads, within Delegation Thresholds — no subagent spawned) after the `EVL-T-3` Pivot, tracing the actual request path for the P25 green check end-to-end.
- **Finding:** for a **P25** result (e.g. `#9075`, "Reporting 2026" — the portfolio the user's manual QA used), the client calls `GET_p25GreenChecksByResultId()` (`results-api.service.ts:781`, selected by `fieldsManagerSE.isP25()` in `green-checks.service.ts:55`) → server `v2` route → `ResultsValidationModuleService.calculateValidationSections` → `resultValidationRepository.validateResultById` (`results-validation-module.repository.ts:77-152`). That method does **not** call the TypeScript `evidenceValidation()` method `EVL-T-2` patched — it issues `CALL validate_sections_mapped_batch(resultId, sectionsJson)`, a MySQL **stored procedure** defined in migration `1762528725798-createValidtionP25.ts`, which for the "evidences" section calls the MySQL **function** `validation_evidences_P25(resultId)` (same migration file, lines 437-574). That function's only link check is `e.link IS NOT NULL AND e.link <> ''` — no host/denylist logic at all. A sibling `validation_evidences_P22` function exists in `1761849861521-createValidtionP22.ts` with the same gap.
  - `EVL-T-2`'s patched `evidenceValidation()` **is** reachable — via `getGreenchecksByResult`/`getGreenchecksByResult1` (v1, `results-validation-module.service.ts:66,173,513`) — but the client only calls that v1 route for **non-P25** results (the `else` branch of `isP25()`). So `EVL-T-2` is not dead code, but it has zero effect for P25 results, which is the case the ticket's manual QA exercised.
- **Options presented to the user:** (a) also patch `validation_evidences_P25` (and optionally `validation_evidences_P22`) via a new migration, with a phase- or date-based grandfather cutoff; (b) investigate whether v1/`evidenceValidation()` is reachable for any live case before deciding; (c) pause and let the user discuss with the team.
- **User's explicit, repeated decision: do NOT touch `validation_evidences_P25`, `validation_evidences_P22`, `validate_sections_mapped_batch`, or any other DB stored procedure/function, under any circumstance, for this ticket.** The user's actual requirement, restated precisely: existing evidence — **regardless of host, regardless of phase, regardless of when it was saved** — must never be retroactively affected by anything from here on; the green check for already-saved evidence keeps computing exactly as it always has (via the untouched SQL function). The **only** enforcement point the user wants is at entry time: blocking a user from *adding* a new file-storage-host link — which is exactly what `EVL-T-3` (the client-side modal gate, already `[x]` PASS and manually confirmed) does.
- **Resolution:** no `EVL-T-4` was created. No migration was written. `EVL-T-1`/`EVL-T-2` (server-side, TS, v1-only reach) and `EVL-T-3` (client-side modal gate, the requirement's actual enforcement mechanism for P25) stand as already implemented, reviewed, and (for `EVL-T-3`) manually verified — no further code changes follow from this investigation.
- **Consequence, recorded so it is not misread as an oversight later:** a user can still reach an already-saved SharePoint/OneDrive/Drive/Dropbox evidence link and open it (the link itself was never removed, only new additions are blocked), and the P25 green check for a result carrying old bad-host evidence continues to read valid, indefinitely — **by explicit user decision**, not because the fix is incomplete.
- **This closes the investigation branch the earlier `AskUserQuestion` calls in this session opened** ("Alcance SQL", "Alcance P22/P25", "Tipo de corte") — those questions were answered, then this final instruction superseded the SQL-patching direction entirely.
- **Final re-confirmation (same date, later in the session):** the user briefly asked to scope `EVL-T-2`'s TypeScript fix "only to P25" and drop `EVIDENCE_LINK_RULE_EFFECTIVE_DATE" entirely. The Leader flagged the contradiction — `evidenceValidation()` (what `EVL-T-2` patches) is only reachable via the v1 route, which the client only calls for **non-P25** results (`green-checks.service.ts:55`); editing it to "only apply to P25" would make it dead code, since P25 traffic never reaches it regardless. Given a direct choice between (a) touching `validation_evidences_P25` after all (no date cutoff, unconditional going forward) or (b) leaving everything as-is with `EVL-T-3` as the sole enforcement — **the user chose (b) explicitly.** No further code changes follow. `EVL-T-1`/`EVL-T-2` (including `EVIDENCE_LINK_RULE_EFFECTIVE_DATE`) remain unmodified.

---

## Scope Reduction: `EVL-T-1`/`EVL-T-2` reverted — client-side (`EVL-T-3`) is the entire deliverable

- **Date:** 2026-09-07 (same session, immediately following the re-confirmation above)
- **Trigger:** asked "para qué me sirve `EVIDENCE_LINK_RULE_EFFECTIVE_DATE`, no puedes validar con `isP25`?" — the Leader explained (again) that the TS method is architecturally unreachable for P25 traffic regardless of what condition is added inside it (the routing decision happens before the method is ever called, both client-side endpoint selection and server-side route dispatch), so the constant only ever served the P22 (v1) path.
- **User's decision, verbatim intent:** *"borra esa mierda eso no sirve para nada, mi alcance nunca fue tocar nada de P22, solamente en P25 ... para estos resultados que ya tuvieron un link ... se va a seguir mostrando en reporting pero hasta ahí. Si los otros lo llegan a borrar, ellos no lo van a poder volver a agregar porque se está añadiendo esta validación para formularios ... para que no se puedan añadir estos."* — P22 was never in scope; the user only ever cared about P25, and P25's actual, working enforcement mechanism is `EVL-T-3` (client-side modal gate), which the user had already manually confirmed. `EVL-T-1`/`EVL-T-2` (backend TS, v1/P22-only reach) added no value toward the real goal and were **explicitly ordered removed**.
- **Action taken:** reverted, not merely left unfinished — these were completed, reviewed (PASS), and had shipped code:
  - `git checkout -- onecgiar-pr-server/src/api/results/results-validation-module/results-validation-module.repository.ts` — restores the file to its pre-session state (undoes `EVL-T-2`'s `EVIDENCE_LINK_RULE_EFFECTIVE_DATE` constant, `_fileStorageDenylistRegex`, `_isAcceptableEvidenceLink` helper, and the `multiplePerField` call-site change).
  - Deleted `onecgiar-pr-server/src/api/results/results-validation-module/results-validation-module.repository.spec.ts` (the new spec file `EVL-T-1` created — no prior version existed, so deletion is the correct revert, not a checkout).
  - Neither change had been committed at any point this session (verified via `git status` before and after), so this is a clean revert of uncommitted working-tree state — no history rewrite, nothing to force-push, nothing destructive beyond discarding this session's own unshipped work.
  - `EVL-T-3` (`onecgiar-pr-client/.../rd-evidences.component.ts` + `.spec.ts`) is untouched by this revert — it remains the spec's sole surviving, shipped change.
- **`tasks.md` and `requirements.md` updated to match** — see those files' own Pivot/scope-reduction markers. `EVL-T-1`/`EVL-T-2` are marked reverted (not `[x]`, not `[ ]` — a distinct state, since they WERE done and reviewed before being explicitly un-done) so a future `/akili-resume` does not mistake this for unfinished work to pick back up.
- **Final spec scope, definitive:** one task, `EVL-T-3` — the Add/Edit New Evidence modal blocks adding a SharePoint/OneDrive/Google Drive/Dropbox link, client-side, for both P22 and P25 (the component is shared — no portfolio branch was added, and none was requested for this narrower client gate). Already-saved evidence, of any host, in any phase, in either portfolio, is never touched or retroactively invalidated by this spec.

---

## 5. Spec status (post-Pivot, final)

All three tasks (`EVL-T-1`, `EVL-T-2`, `EVL-T-3`) are `[x]` with matching PASS evidence and confirmed manual verification. No further tasks eligible in `tasks.md` §3. The SQL-side investigation above closes with an explicit user decision not to proceed — not a pending item.

**Still open before this spec can ship (from `tasks.md` §6-7):**
- Confirm/update `EVIDENCE_LINK_RULE_EFFECTIVE_DATE`'s literal default (`onecgiar-pr-server`) to the actual planned rollout date before merge — see the `EVL-T-2` human-gate item above. Applies only to the v1/non-P25 code path (see SQL investigation above) — still needs a real value regardless.
- Commits + PR not yet created — Leader does not auto-commit per standing user instruction; awaiting explicit go-ahead.
- Follow-up ticket (non-blocking) for the shared client/server denylist constant (three copies now exist: server `results-validation-module.repository.ts`, client `rd-evidences.component.ts`, client `evidence-item.component.ts`), per `proposal.md` §12 / `design.md` §13.
