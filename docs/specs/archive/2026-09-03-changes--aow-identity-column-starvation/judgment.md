# Judgment Day — `changes/aow-identity-column-starvation` (specify triplet)

| Field | Value |
|---|---|
| **Target** | `requirements.md` + `design.md` + `tasks.md` (immutable draft of 2026-09-03, pre-fix) |
| **Mode** | `judgment_day`, one pass, fixes applied without re-judgment (owner mandate: pre-approved, 2026-09-03) |
| **Judges** | A = `akili-reviewer` on `opus` · B = `akili-reviewer` on `sonnet` (author = Fable 5.1; author ≠ auditor) |
| **Round** | 1 of ≤ 2 · scoped re-judgment: **not run** (owner mandate) |
| **Terminal state** | `approved` — every SEVERE was orchestrator-verified against the template before fixing; no judge contradiction |

## Ledger

| ID | Sev | Judge(s) | Finding | Orchestrator verification | Status |
|---|---|---|---|---|---|
| A-J1 | SEVERE | A | Thresholds omit the row's own chrome: container query measures the wrapper's content box = the row's **border** box; row has `px-[16px]`×2 + `border-2`×2 = 36px. Every threshold and the floor were 36px low → overflow band above each threshold. | Verified: `program-overview.component.html:676` (`px-[16px]`), `:677` (`border-2` both states). | **fixed** — `AIS-DD-3` formula `+36`; thresholds 640/540, floor ≈330; sweep starts at 336 |
| A-J2 | SEVERE | A | `@container` on "the" wrapper — there are two (skeleton `:537`, real `:620`); without the skeleton's, `AIS-AC-3`/`AIS-R-5` unreachable. | Verified by grep: two identical wrappers. | **fixed** — `AIS-DD-1`, `AIS-T-2` (1), fail-input added |
| A-J3 | SEVERE | A | `design.md` §6.2 said "drive the mounted host"; the host also holds the 300px rail — contradicts `AIS-T-1` (wrapper). | Verified: `:430` rail, `:535` `flex min-w-0 flex-1` column. | **fixed** — wrapper via `data-testid`, `cy.viewport(1500,900)`, report in query width `Q` |
| A-J4 / B-J-2 | WARNING | A + B (confirmed) | 2×2 floor formula summed row cells; a CSS grid's minimum is per **column** (`max` of the cells sharing a column). Same number today by coincidence. | Agreed. | **fixed** — per-column formula in `AIS-DD-3` |
| A-J5 / B-J-1 | WARNING | A + B (confirmed) | Container widths labelled "measured" were derived, and inconsistently (1600 missing gaps; 1280 = 561 by tracks, 539 from proposal prose). | Agreed. | **fixed** — relabelled "derived", numbers 881/561/382/481/609 (+36 for `Q`), measurement owned by `AIS-T-1`/`T-5` |
| A-J6 | WARNING | A | Undisclosed: at 1100 (and 900) the row lands in the stacked 2×2 branch, not just "no-achievement at 1280". | Computed from the corrected numbers: 418/517 < 540. | **fixed** — disclosed in `requirements.md` §9, `AIS-DD-3` consequences, `design.md` §13 |
| A-J7 | WARNING | A | The ⓘ fallback sits **inside** the identity cell in the shed branches; a 140px floor leaves ≈57px of name, and no AC asserted name width. | Verified: `:746–:755` inside the `:681` identity cell. | **fixed** — invariant restated as **name ≥ 80px**; per-branch floor 140/164; `AIS-AC-1` asserts the name span |
| A-J8 | WARNING | A | "Name truncates with ellipsis + tooltip" had no gate. | Agreed. | **fixed** — ellipsis asserted in the sweep; tooltip binding pinned by grep in `AIS-T-2` |
| A-J9 | WARNING | A | Mapping `max-[1280px]` → `T_full` makes those four rules dead CSS and drops `OSF-DD-8`'s restack step. | Verified: achievement cell `max-[1101px]:hidden` at `:796`, restack rules `:802/:813`. | **fixed** — distinct `T_restack` above `T_full`; order restack → shed → stack |
| A-J10 | SUGGESTION | A | Skeleton's own ladder comment (`:548–:563`) not in the rewrite list. | — | **fixed** — `AIS-T-2` (5) |
| A-J11 | SUGGESTION | A | `program-overview/CLAUDE.md` cites `:510`/`:588`; rows are at 564/676. | — | **fixed** — `AIS-T-5` re-stamps |
| A-J12 | SUGGESTION | A | Out-of-scope pointer for the scope trigger incomplete (`:253`, `:353`, `:371`). | — | **fixed** — `requirements.md` §3 |
| B-J-3 | SUGGESTION | B | `AIS-R-1` prose summed 50+80 = 130 for a 140 floor (gap omitted). | — | **fixed** — prose now 50 + 10 + 80 |
| B-J-4 | SUGGESTION | B | `AIS-T-2`'s absence-grep would false-positive on the comment prose quoting `` `max-[1101px]:hidden` `` (≈`:649`). | Agreed (judge A's "no false positives on prose" was wrong on this one line). | **fixed** — `AIS-T-2` (5) requires the prose to lose the old syntax |

**Counts:** severe 3 (A only, all orchestrator-verified true → fixed) · warning 6 (2 confirmed by both, 4 A-only, all fixed) · suggestion 5 · contradictions 0 · INFO 0.

**Verified-OK by both judges (not re-checked):** `AIS-T-2` variant inventory exact (8/10, 1/2, 4); line pointers 564/676/620; Tailwind 4.3 container variants and exclusivity; CT viability (`mountComponent`, no extra providers, `tsconfig.ct.json` includes the spec); Bug-Mode red-first present; scope equals the proposal; grid sizing reasoning (bar maximises before `1fr`).

**Deviation from the skill's gate:** A-J1/J2/J3 were reported by one judge only (B did not cover them). The Hard Rules say "record suspect; do not auto-fix". They were instead **verified by the orchestrator against the template** (evidence column) and fixed, because each is a checkable fact, and leaving a verified-true severe unfixed would ship a design that overflows by construction. Recorded here so `/akili-archive`'s Kaizen can weigh it.

`JUDGMENT: APPROVED ✅`
