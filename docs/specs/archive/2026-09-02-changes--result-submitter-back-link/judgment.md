# Judgment Day — `changes/result-submitter-back-link`

## Document Control

| Field | Value |
|---|---|
| Target | `proposal.md` + `requirements.md` + `design.md` (immutable at review) |
| Mode | judgment_day |
| Round | 0 (first judgment; no fix) |
| Date | 2026-09-02 |
| Author model | session (design author) |
| Judge A | `claude-sonnet-5-thinking-high` |
| Judge B | `gpt-5.6-sol-medium` |
| Skill | `judgment-day` v1.7 — author ≠ auditor |

## Verdicts

| Judge | Verdict |
|---|---|
| A | FAIL |
| B | PASS |

**Parent merge:** no SEVERE finding confirmed by both judges. Verdicts contradict. **Escalate — no auto-fix.**

## Confirmed severe (both judges)

none

## Suspect (one judge only — do not auto-fix)

| ID | Source | Claim |
|---|---|---|
| C-1 | Judge A SEVERE | Same AC IDs (AC-1 / AC-2 / AC-5) use `SP09` / `Scaling for Impact` in `requirements.md` GWT, but `design.md` §6.2 / §10 binds those ACs to the live fixture `SP04` / `Multifunctional Landscapes`. Implementer cannot tell which fixture satisfies the AC. Proposal cites both (SP04 = existing spec fixture; SP09 = legacy screenshot). |

## Shared warnings (info)

| ID | Judges | Claim |
|---|---|---|
| W-depth | A W-1, B C-1 | Depth locked **Standard** in proposal + requirements; design §14 recommends **Lite** (or `/akili-quick`). Safe default: Standard until the owner re-scopes. |
| W-query | B C-2 | Proposal Document Control still says “optional query on create navigations”; requirements + design forbid return/query. Treat the proposal row as stale. |

## Suggestions (info)

- A S-1: proposal Problem says Origin is Coming soon; Non-Goals list three ⓘ rows.
- A S-2: R-8 / R-9 unused (R-7 → R-10).
- A S-3: RSBL-R-6 tab order hedged (“after Back to results or in strip order”).
- B C-3: Jest plan does not explicitly name whitespace-only / same-tab / keyboard cases (decided in requirements).

## Counts checked

Both judges: 7 MUST + 1 SHOULD; 7 ACs; 4 OQs addressed; budget 2 / ~80 / 1 internally consistent. Only quantity conflict: **SP09 vs SP04** (Judge A).

## Correction work units

Owner chose **Fix only** (2026-09-02). No scoped re-judgment.

| ID | Action |
|---|---|
| C-1 | Applied. Requirements GWT + AC-1/AC-2/AC-3 now use `SP04` / `Multifunctional Landscapes`. `SP09` remains only as the legacy screenshot label. |
| W-query | Applied. Proposal Parallel-safe no longer mentions a create-navigation query. |
| W-depth | Kept **Standard**. Design §14 no longer recommends Lite. |
| A S-3 | Applied. Tab order committed: Back to results → title-row actions → Submitter. |
| B C-3 | Applied in design §10: whitespace-only, `target="_blank"` absence, Tab after Back to results. |

## Terminal (this round)

`JUDGMENT: ESCALATED ⚠️` (judges disagreed). Owner applied Fix only; **no re-judge**. Ledger closed for specify; proceed to tasks if the owner Continues.
