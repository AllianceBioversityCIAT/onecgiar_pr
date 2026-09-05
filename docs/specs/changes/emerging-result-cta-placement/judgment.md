# Judgment Day — `changes/emerging-result-cta-placement`

| Field | Value |
|---|---|
| Mode | `judgment_day` |
| Target | `requirements.md` + `design.md` (`proposal.md` as intent only) |
| Started | 2026-09-05 |
| Author model | Cursor Grok 4.6 (design) |
| Judge A | claude-opus-5-thinking-high |
| Judge B | gpt-5.6-sol-medium |
| Round | 1 — fixed; **re-judge skipped by owner** |
| Status | `owner-accepted-without-rejudge` |
| Terminal | not emitted (`JUDGMENT: APPROVED` requires scoped re-judgment; owner chose fix-only) |

Skill: `judgment-day` 1.7. Fix only **severe findings confirmed by both**. WARNING / SUGGESTION stay `info`. One-judge severe = `suspect` (no auto-fix).

---

## Round 1 verdicts

| Judge | Verdict |
|---|---|
| A | FAIL (6 severe, 5 warning, 3 suggestion) |
| B | FAIL (5 severe, 1 warning, 0 suggestion) |

---

## Confirmed severe (both judges) — eligible for round-one fix

### C1 — Emerging aside cannot offer Output/Outcome + category (`ERC-R-3` / `ERC-DD-7`)

| | |
|---|---|
| Judge IDs | J1-S1, J1-S2, J2-S1 |
| Claim | Passing `emergingCategory=null` does **not** put `lab-report-form` into emerging mode and does **not** show a level + category chooser. |
| Evidence | `ERC-R-3` scenario: “user chooses Output/Outcome + category in the form.” `ERC-DD-7`: “pass `emergingCategory=null` so `needsCategoryChoice` is true.” Form contract: `isEmerging = !!emergingCategory()`; arming effect returns if `!indicator && !emerging`; `resultLevelId` is never user-chosen; `categoryUnavailable` is true when level is null. Design §6.2 also says “No new fields.” |
| Why severe | MUST path is not implementable as written. Switching hub/band to the aside as designed **removes** the Output/Outcome choice the legacy dialog ships — unnamed reversion. Innovation-link (`P2-3421` / `ERC-DD-5`) also depends on a resolved type via that picker. |

**Fix direction (if owner approves):** decide how emerging mode is armed without a preselected type — either a new explicit `emergingMode` / sentinel input that still leaves category unset, **or** add an Output/Outcome chooser to `lab-report-form` (contradicts “No new fields”; that line must then be withdrawn). `ERC-DD-7` and §6.2 must name the contract change.

### C2 — Hop loses Smart Back origin (`ERC-R-4`)

| | |
|---|---|
| Judge IDs | J1-S3, J2-S2 |
| Claim | After Results / My results hop, create Smart Back is the dashboard-lab URL, not the start tab + its query params. |
| Evidence | `ERC-R-4`: “Smart Back origin equal to the tab they started from … including that tab’s query params.” Design §2.2: “Smart Back = current URL.” §6.1 hop carries only `reportEmerging` + `returnTab`. §10: “create does not need that hop (result detail).” No `rememberResultDetailOrigin` step. |
| Why severe | MUST clause contradicted by the chosen hop; contradiction unnamed. Design §1 still claims it accomplishes `ERC-R-1`…`R-7`. |

**Fix direction:** hop helper must persist the **origin** URL (path + query) before navigate; after create, `rememberResultDetailOrigin` uses that stored origin, not the dashboard-lab host. Cancel already has `returnTab` — create must not rely on “current URL.”

### C3 — `canReportEmerging` is fail-open (`ERC-R-5`)

| | |
|---|---|
| Judge IDs | J1-S5, J2-S4 |
| Claim | New create-chrome gate defaults `true`, contradicting the sibling `canReport` fail-closed rule. |
| Evidence | Design §6.2 / `ERC-DD-3`: default `true`. §7: form `canReport` “default false if a host forgets — keep that.” Results / My results already hardcode `[canReport]="true"` for *Where to report*. |
| Why severe | Forgotten host binding exposes emerging create on AVISA / `SGP-02`. |

**Fix direction:** default `canReportEmerging` to **`false`**. Hosts that may create bind the shared AVISA helper. Jest: missing binding ⇒ button absent.

### C4 — Reversion-challenge count is false; dual-emit split unchallenged

| | |
|---|---|
| Judge IDs | J1-S4, J2-S5 |
| Claim | Summary says three reversions challenged in `ERC-DD-2`, `ERC-DD-4`, `ERC-DD-5`. `ERC-DD-2` is N/A; cited §2.3 does not exist; `ERC-DD-3` (split `onWhereToReportClick`) has no challenge despite live alias consumers. |
| Evidence | Design §1 vs `ERC-DD-2` “Reversion challenge: N/A.” Live `(reportEmerging)="openWhereToReportModal()"` on both dashboard-lab bands. |
| Why severe | Named shipped behavior (dual emit) sits outside the declared challenge set; quantity disagrees with the design’s own prose. |

**Fix direction:** add §2.3 (or drop the pointer). Challenge `ERC-DD-3` (hub tests + alias bindings). Recount: modal unhook (DD-4), P2-3569 lock (DD-5), dual-emit split (DD-3). Hop stays N/A or is reframed as Smart Back risk (C2), not a third of the old set.

---

## Suspect (one judge only) — do not auto-fix

| ID | Judge | Claim | Disposition |
|---|---|---|---|
| J1-S6 | A | `ERC-DD-4` keeps the leftover `app-report-result-form` tag; `ERC-DD-5` says retarget the lock; §10 conditions rewrite on dropping the host — implementer can leave a green test on a dead host. | Recorded. Related to P2-3569; owner may fold into DD-5 wording if fixing C1/C5 cluster. |
| J2-S3 | B | Design assumes server refuses AVISA create; `createOwnerResultV2` treats `SGP-02` as Bilateral and continues. Requirements §7 “server create gate unchanged.” | Recorded. Client hide remains the UX gate (`ERC-R-5`). Server change is **out of this spec** unless owner expands scope. Do not silently add a server task. |

---

## INFO — warnings / suggestions (not auto-fixed)

| ID | Class | Claim |
|---|---|---|
| J1-W1 | WARNING | `ERC-R-7` phase clause has no design/test pin (incidental via `reportingCurrentPhase`). |
| J1-W2 | WARNING | Emerging drawer chrome still reads `indicator()` (Target: 0, chips) outside hidden tabs. |
| J1-W3 | WARNING | Docs budget ~20 understates `indicator-drawer` / `lab-report-form` folder `CLAUDE.md` stamps. |
| J1-W4 | WARNING | `ERC-OQ-3` locked as hop in design; requirements/proposal still say in-place preferred; mandated sweep not done. |
| J1-W5 | WARNING | Document control cites hop fallback as `ERC-R-4`; hop allowance is `ERC-R-10`. |
| J2-W1 | WARNING | New `add_circle` in `material-icons-round` vs client UI-RULE 21 (Lucide for new icons). |
| J1-G1 | SUGGESTION | `report-emerging-dialog` is a `styleClass`, not a component. |
| J1-G2 | SUGGESTION | Design writes `min-[480px]`; shipped band uses `hidden sm:inline`. |
| J1-G3 | SUGGESTION | Four hosts, **five** band instances (two on dashboard-lab). |

---

## Counts checked (merged)

| Assertion | Result |
|---|---|
| Budget 360 + 200 + 20 = 580; 5 tasks; 1 Reviewer round/task | match internally |
| Requirement index `R-1`…`R-7`, `R-10`…`R-12`, `R-20`, `AC-1`…`AC-9` | match |
| Four SP tabs / two chrome states / two hop keys | match |
| **Three** reversion challenges in §1 vs DD bodies | **mismatch** → C4 |
| In-place vs hop (+180 / +1 task) | internally consistent if C2 is solved |

---

## Correction work units (if owner approves round-one fix)

1. Rewrite `ERC-DD-7` + §6.2 `lab-report-form` row so emerging mode is armed and the user can choose level + category (C1).
2. Add persist-origin + `rememberResultDetailOrigin` to the hop / create path (C2); stop claiming “Smart Back = current URL.”
3. Flip `canReportEmerging` default to `false`; name host bindings (C3).
4. Add §2.3 + `ERC-DD-3` reversion challenge; fix the count pointer (C4).
5. Optional owner extras (not required by dual confirm): J1-S6 lock wording; J1-W4 OQ sweep; J1-W2 chrome; J2-W1 Lucide.

Do **not** expand into a server AVISA refuse (J2-S3) unless the owner says so.

---

## Owner gate (round 1)

Owner chose **Fix the 4 confirmed severe findings only — skip re-judge**. Suspects (J1-S6, J2-S3) and INFO rows were not changed.

---

## Round-1 fix delta (2026-09-05)

Applied in `design.md` only.

| Confirmed | What changed |
|---|---|
| C1 | `ERC-DD-7` rewritten: `emergingMode` + Output/Outcome chooser + `chosenResultLevelId`. “No new fields” withdrawn. §6.2 `lab-report-form` is a contract change, not pass-through. Drawer passes `emergingMode=true` and `emergingCategory=null`. Jest form row added. Budget 580 → ~700 (chooser + arming). |
| C2 | Hop helper `rememberResultDetailOrigin(start URL)` **before** navigate. Create MUST NOT overwrite with dashboard-lab URL. §2.2 / §6.1 / `ERC-DD-2` / Jest close path updated. `returnTab` remains cancel-only. |
| C3 | `canReportEmerging` **default false**. Hosts bind the shared helper. Jest: unset input ⇒ button absent. `ERC-DD-3` records rejected default-true. |
| C4 | New §2.3 table. Summary pointer is `ERC-DD-3`, `ERC-DD-4`, `ERC-DD-5`. Dual-emit challenge lives on `ERC-DD-3`. Hop stays N/A (not counted). |

Budget table and §1 summary row match (~700 = 440 + 240 + 20; 5 tasks). In-place overrule in §13 now reads ~880 / 6.

---

## Protocol note

`judgment-day` 1.7 would next run a scoped re-judgment on this ledger + delta. The owner skipped that step. This file is **not** `JUDGMENT: APPROVED` and **not** `JUDGMENT: ESCALATED`. Specify may continue to `tasks.md` on owner request.
