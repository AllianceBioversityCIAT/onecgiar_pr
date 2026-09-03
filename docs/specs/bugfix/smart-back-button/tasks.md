# Module Spec: `bugfix/smart-back-button` — Tasks

Lite · Bug Mode. [`requirements.md`](./requirements.md) · [`design.md`](./design.md)  
Baseline: `US-S1` (`docs/prd.md`); `docs/ux-ui/design.md` §2; `W1` (`docs/trd/trd.md`).

## 1. Scope of this task list

- **Module / feature:** Result Framework Reporting — program-shell Smart Back
- **Linked spec:** `docs/specs/bugfix/smart-back-button/requirements.md` + `design.md`
- **Owner / driver:** Implementer (T2) then Reviewer (T3, different model)
- **Status:** `in-progress`
- **Budget:** 2 tasks · ~40–80 LOC · 1 review round (`design.md` Step 2.4)

## 2. Pre-flight checklist

- [x] `requirements.md` approved
- [x] `design.md` approved
- [x] Open questions resolved (`SBB-A-1` accepted)
- [x] No migration / CLARISA / API work
- [x] No other in-flight spec owns `smart-navigation.service.ts`

## 3. Task list

### SBB-T-1 — Add failing regression for sibling-SP Back

- **Type:** `tests`
- **Status:** `[x] done`
- **Size:** `S`
- **Description:** Add Jest cases that reproduce today’s resolver on current code. Do **not** change `smart-navigation.service.ts`. The run MUST fail (red). That failure is the evidence the bug exists; a green run on this task is a FAIL.
- **Implements:**
  - SBB-R-1 sidebar hop: THEN catalog label + home URL; **BUT** not `{ label: 'Back' }` and not any `/entity-details/` destination
  - SBB-R-1 AND IT MUST Portfolio / Results list when that catalog was the entry (assert existing cases still present; do not delete them)
  - SBB-R-1 direct land: already in file (`provides fallback when direct landing…`); keep it
  - SBB-R-2 second click: after `back()`, next `getBackTarget` **BUT** must NOT be SP01
  - SBB-R-3 Center → SP: label **Back to Bilateral results**, destination Center/Centers URL; **BUT** not generic **Back** and not forced home
- **Design:** SBB-DD-1, SBB-DD-2; test strategy §10
- **Skills:** `angular-developer`, `tdd`
- **Files:** `onecgiar-pr-client/src/app/shared/services/smart-navigation.service.spec.ts`
- **Depends on:** `—`
- **Blocks:** `SBB-T-2`
- **Estimate:** `S`

**Clause ownership**

| Clause | How this task owns it |
|---|---|
| SBB-R-1 GIVEN home → SP08 → SP01/overview | Seed history with those three URLs; `mockRouter.url` = SP01/overview |
| SBB-R-1 THEN / AND / BUT | Expect `{ label: 'Back to Science programs', url: '/result-framework-reporting/home' }`; fail if label is `Back` or url includes `/entity-details/` |
| SBB-R-1 AND IT MUST other catalogs | Do not edit the existing Portfolio / Results list examples |
| SBB-R-1 direct land | Leave the existing fallback spec in place |
| SBB-R-2 WHEN `back()` then resolve | Call `back()`, set `mockRouter.url` to the navigated catalog, then `getBackTarget` again |
| SBB-R-2 BUT not SP01 | Expect url does not contain `/entity-details/SP01` |
| SBB-R-3 Center → SP | History = Center URL then SP01 shell; expect bilateral label + Center url |
| SBB-R-2 / SBB-R-3 drill-down + same-program tabs | Existing By-AOW / tab specs stay; T-1 must not weaken them |

**Definition of done**

- [x] New sibling-hop spec exists and **fails** on unmodified service code
- [x] New `back()` ping-pong spec exists and **fails** on unmodified service code (or fails for the same reason: destination is SP08 / SP01)
- [x] New Center → SP spec exists (may already pass — if it passes, record that; do not skip adding it)
- [x] No production `.ts` files changed

**Verification**

```bash
cd onecgiar-pr-client && npm run test -- --testPathPattern="smart-navigation.service.spec"
```

- **Pass for this task:** the new sibling-hop (and ping-pong) examples fail; existing catalog / drill-down examples still pass.
- **Disqualifier:** a green full-file run. That means the regression never built the sibling history (`requirements.md` §8).
- **Input that would FAIL this check:** run the same command after deleting the new sibling-hop `it(...)` — if the command still looks “done”, the gate was presence-only. The required fail input is: current service + new hop history → expect home, get `{ label: 'Back', url: …/SP08… }`.
- **Presence is not enough:** a comment or `it.skip` is not a red test.

---

### SBB-T-2 — Fix shell resolver and `back()` history

- **Type:** `client`
- **Status:** `pending`
- **Size:** `S`
- **Description:** In the Science Program **shell** branch only, skip every `/entity-details/` sibling, then take the last catalog or home (SBB-DD-1). Make `back()` drop the current URL (or ignore its own NavigationEnd) so the next resolve cannot retarget the left shell (SBB-DD-2). Do not change band markup, bilateral section 2–3, or routes (SBB-DD-3).
- **Implements:** SBB-R-1, SBB-R-2, SBB-R-3 (all scenarios turn green); SBB-R-2 AND IT MUST drill-down unchanged; SBB-R-3 same-program tabs unchanged
- **Design:** SBB-DD-1, SBB-DD-2, SBB-DD-3
- **Skills:** `angular-developer`, `tdd`
- **Files:** `onecgiar-pr-client/src/app/shared/services/smart-navigation.service.ts` (and only the spec if an assertion needs a tighter URL after the history rule)
- **Depends on:** `SBB-T-1` (must have been red)
- **Blocks:** `—`
- **Estimate:** `S`

**Definition of done**

- [ ] Sibling hop resolves to Science programs home (or the real entry catalog)
- [ ] After `back()`, next resolve is not SP01
- [ ] Center → SP still **Back to Bilateral results**
- [ ] Existing catalog / tab / By-AOW specs still green
- [ ] Band / bilateral header files untouched unless a proven stale-label failure appears (then stop and escalate; do not expand silently)

**Verification**

```bash
cd onecgiar-pr-client && npm run test -- --testPathPattern="smart-navigation.service.spec"
```

- **Pass:** the T-1 regressions are green; the rest of the file is green.
- **Disqualifier:** green because T-1 examples were edited to match a weaker claim (e.g. expect `Back` or drop the hop). Re-read T-1 expectations; they must still demand home / not `/entity-details/`.
- **Input that would FAIL this check:** history `[home, SP08/overview, SP01, SP01/overview]` + current url SP01/overview → if `getBackTarget` still returns SP08, the command must fail.
- **Cannot prove:** painted band on Overview (jsdom). Accepted Lite risk; optional HITL after execute.

## 4. Dependency graph

```text
SBB-T-1 (red regression) ──► SBB-T-2 (resolver + back() fix)
```

No parallel branch. Do not start T-2 until T-1 is red on current code.

## 5. Clause coverage close

| Requirement | Scenario / clause | Owner |
|---|---|---|
| SBB-R-1 | Sidebar hop THEN / AND / **BUT** not Back / not `/entity-details/` | SBB-T-1 (red), SBB-T-2 (green) |
| SBB-R-1 | AND IT MUST Portfolio / Results list | SBB-T-1 keep existing; SBB-T-2 stay green |
| SBB-R-1 | Direct land / refresh | Existing spec; SBB-T-1 keep; SBB-T-2 stay green |
| SBB-R-2 | Second click THEN catalog | SBB-T-1 (red), SBB-T-2 (green) |
| SBB-R-2 | **BUT** not SP01 | SBB-T-1, SBB-T-2 |
| SBB-R-2 | AND IT MUST By-AOW unchanged | Existing specs; SBB-T-2 stay green |
| SBB-R-3 | Center → SP THEN / AND / **BUT** | SBB-T-1 add, SBB-T-2 stay green |
| SBB-R-3 | Same-program tabs | Existing specs; SBB-T-2 stay green |

A gap may not be cleared by citing a different requirement.

## 6. Test plan

| Test ID | Type | Covers | Location |
|---|---|---|---|
| SBB-TEST-1 | unit (red→green) | SBB-R-1 sibling hop | `smart-navigation.service.spec.ts` |
| SBB-TEST-2 | unit (red→green) | SBB-R-2 ping-pong | same |
| SBB-TEST-3 | unit | SBB-R-3 Center → SP | same |
| SBB-TEST-4 | unit (existing) | catalogs, tabs, By-AOW, direct land | same |

## 7. Rollout & verification

- Single PR. Commit format: `🔧 fix(smart-navigation) [SPEC:bugfix/smart-back-button]: …`
- No migration, no consumer notify.
- Optional HITL: Overview after sidebar hop shows **Back to Science programs**.

## 8. Cleanup & follow-ups

- Named labels for `/emerging` / `/planned-toc` stay deferred (`design.md` §13).
- Do not edit `docs/trd/trd.md` from this spec branch.

## 9. Roll-back plan

1. Revert the PR.
2. No migration to undo.
3. Confirm Back on Overview returns to pre-fix sibling behavior (known defect).
