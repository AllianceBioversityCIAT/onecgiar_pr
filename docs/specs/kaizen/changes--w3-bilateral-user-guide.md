# Kaizen Entry — changes/w3-bilateral-user-guide

## Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/w3-bilateral-user-guide` |
| Date | 2026-09-22 |
| Branch | `feat/w3-bilateral-user-guide` (spec branch — every shared-file write below is recorded as pending) |
| Archive Run | 1 |
| Approval Mode | pre-approved (operator standing order, 2026-09-21) |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 13 / 13 `[x]` | tasks.md |
| Reviewer FAIL rework attempts | 0 open at close; every task closed on `PASS` | execution.md |
| Review rounds | **19 vs 17 budgeted** | execution.md; design.md §12 |
| LOC | **~1,405 vs 1,300–1,700 budgeted — inside the range** | design.md §12 |
| Budget tripwire | fired 2026-09-21 at `BG-T-9` on **rounds, not LOC**; operator chose to continue in full, all three pre-agreed cuts declined | execution.md — *Budget tripwire* |
| HALTs / FATAL_FAILs | 0 | execution.md |
| Pivots | 1 `## Pivot Record` (`BG-T-7`), carrying 2 operator-approved amendments; no attempt consumed | execution.md |
| Judgment Day | `APPROVED ✅`, 7 severe findings raised and addressed pre-execution | judgment.md |
| Runtime failures | 2 workers killed by HTTP 429 (sonnet session limit); recovered at ladder rung 4 after model rotation | execution.md — `BG-T-13` |
| Leader-caught rendered defects | 1 (TOC overflowing to a second page) — found only by viewing all 38 pages; `verify-structure` counted 17 entries and passed green | execution.md — `BG-T-13` HITL |
| Leader-caused content defects | 3 of the 7 in `BG-T-11` traced to the Leader's own brief | execution.md — `BG-T-11` |
| PRODUCT_BUGs | 0 | execution.md |
| Validation FAIL / WARN | n/a (no `/akili-test`, no `/akili-validate` — rendered-document spec; falsifiers + Leader HITL, absence accepted) | archive-summary.md |
| Drift attributable to this spec | none recorded | — |

## Lessons

- **KZ-changes--w3-bilateral-user-guide-1 — Size review rounds against the spec's *ungated* defect classes, not against its code risk. A task whose output is prose or pixels needs a human round per unit of content, because the gate that would otherwise catch the defect does not exist.** (Methodology, High)
  - Root cause: the budget modelled **LOC** well and **rounds** badly, and the two failed for opposite reasons. `requirements.md` correctly named D8 (screenshot contradicts narrative) and D9 (plausible-but-false prose) as having **no automated gate** — then `design.md` §12 sized rounds per task by *implementation* risk, as if the gate existed. Every round that overran went to content: seven defects in `BG-T-11`, three in `BG-T-10`, two more in `BG-T-13`'s HITL pass. None was a code defect; all were plausible, grammatical, false sentences that every green gate passed.
  - Evidence: requirements.md (defect-class table, D8/D9 marked ungated); design.md §12 (round budget); execution.md — `BG-T-10`, `BG-T-11`, `BG-T-13` HITL. Related, not duplicate: `KZ-changes--user-guide-pdf-1` concerns **who looks** at a rendered artifact; this concerns **how many rounds the plan budgets** for the classes only a human can see.
  - Standardization: → upstream only (`/akili-specify` Phase 1: when the defect-class table records a class as unmeasurable and human-substituted, the round budget must carry a round per content unit for that class).

- **KZ-changes--w3-bilateral-user-guide-2 — When a design names a list as load-bearing, every additional materialisation of it must be *derived* from one source or gated against it. A second copy is a latent defect; a fourth is a certainty.** (Product + Methodology, High)
  - Root cause: the section list was materialised **four** times with no derivation between them — `assemble.ts`'s `SECTIONS`, `verify-structure.ts`'s `EXPECTED_SECTIONS`, the TOC's `href`/label pairs, and the TOC numerals. Two shipped **stale W1/W2 values**, and the second was found only by `BG-T-12`'s Reviewer after the Leader had assigned just the first. The remaining two were **ungated entirely** until the final task: changing the TOC's first numeral from `02` to `99`, leaving `href` and label untouched, shipped green through `verify-structure`. The array's own comment called its order *LOAD-BEARING* — which named the risk without closing it.
  - Evidence: execution.md — `BG-T-13` (*A fourth stale mirror, closed*) and `BG-T-12` (Reviewer finding the second table); `tooling/src/verify-structure.ts`; `tooling/src/assemble.ts`; `tooling/template/guide.html`. The close is itself the pattern: the numeral gate checks each TOC number against the eyebrow of the section its own `href` resolves to — derived, so adding or renumbering a section updates the expectation automatically.
  - Standardization: → P1 (`docs/specs/general-setup/design.md` template, pending — shared file, spec branch).

- **KZ-changes--w3-bilateral-user-guide-3 — The Implementer brief points at the task text; it never paraphrases it. A paraphrase silently narrows scope, and the narrowing is invisible to every gate because the gate reads the brief's world, not the task's.** (Methodology, Medium)
  - Root cause: the Leader's brief restated the task instead of citing it, and **twice** dropped a clause. In `BG-T-1` the brief said "leave the scripts byte-identical" where the task required wiring the guard into `build-guide`. In `BG-T-13` the brief scoped the work to "fix the literal" while the task's Falsifier explicitly demanded `verify-structure` fail *"naming the missing section **and the unresolved TOC anchor**"* — an assertion that did not exist. Both were caught **only** because the Implementer flagged them in `Not Done / Assumptions` rather than choosing silently; that is the persona working as designed, and it is not a control the Leader should rely on.
  - Evidence: execution.md — `BG-T-1` (brief contradicted the task text), `BG-T-13` (*Not Done #3*, the TOC gate added over an under-scoped brief); tasks.md `BG-T-13` Falsifier. Related, not duplicate: `/akili-execute` §2.2 already prescribes a **pointer brief, not an anthology** — the rule existed and was not followed, so this is an adherence failure, not a missing rule.
  - Standardization: → upstream only (`/akili-execute` §2.2: state that a brief which restates a task clause in the Leader's own words is a scope change and must quote or cite instead).

## Noted, not a lesson

- **Two prior lessons were applied and held — recording the positive, since a digest that only accumulates failures cannot tell a working rule from an untested one.** `KZ-REH-1` (LOC budgets under-count, severity **High**, five prior recurrences) was explicitly modelled in `design.md` §12 with every guard as a named line item, and LOC landed **inside** the budgeted range for the first time in the chain. `KZ-changes--user-guide-pdf-1` (the Leader inspects rendered output before the text-only gate) was followed and is what found the TOC overflow. → `digest-update`, evidence only, no severity change.
- **Provider rate limits killed 2 workers** (sonnet session limit). Rotation Implementer→`opus` / Reviewer→`fable` worked again. Already recorded in `changes--user-guide-pdf.md`, `changes--cognito-email-otp-login.md` and `bilateral--center-overview-tab.md` — recurrence feed only, no new lesson.
- **A grep false negative nearly reported finished work as missing.** Probing the dead worker's partial diff for `routeCaptionKeys` returned 0 and looked like the fan-out was undone. It was done, and better than specified — a `figures[]` level per section, each figure carrying its own `alt`/`caption`. The probe matched on a name the implementation had improved past. Operator tooling knowledge; already in the operator's memory.
- **CLARISA's landing page 404s on deep links** — the same SPA pattern already diagnosed on `reporting.cgiar.org`; the API answers 200 with 81 terms. A first query using the wrong field name nearly reported the source dead twice. Project knowledge, kept in the archived `execution.md`.

## Pending Items

| # | Kind | Target | Item | Severity | Status |
|---|---|---|---|---|---|
| 1 | `factual-sweep` | `docs/ux-ui/design.md` §7 (lines 231, 243) | Reads "Typography — Poppins (unchanged)" and "Family: Poppins (loaded from Google Fonts)". `onecgiar-pr-client/src/styles/fonts.scss` loads **Manrope** (variable 200–800) and keeps Poppins only as a fallback alias so stray legacy declarations resolve to the same stack. Replace with Manrope, naming Poppins as fallback only. | High | pending |
| 2 | `standardization` | `docs/specs/general-setup/design.md` | Add: "When a design names a list or ordering as load-bearing, every additional materialisation of it MUST be derived from a single source or gated against it. Record each materialisation in the design; an ungated second copy is a defect the gates cannot see." | High | pending |
| 3 | `upstream` | `/akili-specify` Phase 1 | When the defect-class table records a class as unmeasurable and human-substituted, the review-round budget must carry a round per content unit for that class — not a round sized by implementation risk. | High | pending |
| 4 | `upstream` | `/akili-execute` §2.2 | State explicitly that restating a task clause in the Leader's own words is a scope change: the brief quotes or cites the task text, and a clause the brief omits is a narrowing no gate can detect. | Medium | pending |
| 5 | `digest-update` | `KZ-REH-1` | Add `changes/w3-bilateral-user-guide` as the first source where the lesson was **applied and held** (LOC inside budget after five recurrences). Keep severity High; note that rounds, not LOC, were the overrun here. | Low | pending |

**All five await the apply phase on `staging`** — the pinned Integration Branch. Nothing shared was written from this spec branch.
