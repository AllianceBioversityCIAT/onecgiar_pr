# Judgment Day — `bilateral/manual-create-drawer` design review

## Transaction

| Field | Value |
|---|---|
| **Target** | `requirements.md` + `design.md` |
| **Mode** | judgment_day |
| **Round** | 1 |
| **Date** | 2026-09-14 |
| **Judges** | A (inline — subagent unavailable), B (inline — subagent unavailable) |
| **Author model** | session composer |
| **Terminal state** | **fixes applied (fix only — no re-judge)** |

> Subagent spawn failed (usage limit). Both judges executed inline by the orchestrator with identical criteria and independent finding IDs. Cross-check performed before merge.

---

## Finding ledger

| ID | Sev | Judge A | Judge B | Status | Title |
|---|---|---|---|---|---|
| **JD-001** | SEVERE | ✓ | ✓ | **confirmed** | `GET_depthSearch` legacy type needs labels; design only has numeric type IDs |
| **JD-002** | SEVERE | ✓ | ✓ | **confirmed** | `creationService.resultLevelId/resultTypeId` seeding not specified after wizard signals removed |
| **JD-003** | WARNING | ✓ | ✓ | confirmed | Budget (6 tasks / ~450 LOC) likely low for drawer + form + title gate + server |
| **JD-004** | WARNING | ✓ | ✓ | confirmed | Footer ownership split ambiguous (drawer shell vs form) |
| **JD-005** | WARNING | ✓ | — | suspect | Requirements cite Bulk coexistence; selector only exposes AI + Manual |
| **JD-006** | WARNING | — | ✓ | suspect | `missingFields()` must explicitly own duplicate-title + gate-failure labels (BIL-MCD-R-4 / R-7) |
| **JD-007** | WARNING | ✓ | ✓ | confirmed | No server-side title word-count enforcement (client-only) — accepted risk should be named in design |
| **JD-008** | SUGGESTION | ✓ | ✓ | info | Duplicate section numbering (`2.2` twice) in design.md |
| **JD-009** | SUGGESTION | ✓ | — | info | Add explicit `TemplateRef` / `#manualCta` for focus return (BIL-MCD-R-8) |

---

## Finding details

### JD-001 — SEVERE (confirmed both)

**Evidence:** `report-result-form.getLegacyType(type: string, level: string)` compares human labels (`'Policy change'`, `'Innovation development'`). Design §7.2 says copy this method but bilateral form only stores `result_type_id` / `result_level_id` from `RESULT_TYPES_BY_LEVEL` (numeric). `GET_depthSearch(title, legacyType)` will receive wrong/empty legacy type if implementer passes IDs.

**Recommendation:** Add §7.2 mapping table `result_type_id` + level label → legacy type string, or derive labels from `RESULT_TYPES_BY_LEVEL` before calling depth search.

---

### JD-002 — SEVERE (confirmed both)

**Evidence:** Today `onLevelSelected` / `onTypeSelected` write both local signals and `creationService.resultLevelId/resultTypeId`. Design §7.3 removes wizard signals and moves state into form but only says `create` emits `{ levelId, typeId, title, handle? }`. Post-create editor and `headerTitle` read `creationService.resultTypeId()`; `loadResult` does not backfill level/type into creationService from create response.

**Recommendation:** §7.3 must require creator handler to `creationService.resultLevelId.set` / `resultTypeId.set` from form payload **before** navigation, same as today.

---

### JD-003 — WARNING (confirmed both)

**Evidence:** Design adds 2 components (~150 + ~250 LOC), server DTO/service, creator integration, title uniqueness copy (~80 LOC), KP browse wiring, and rewrites creator spec (~100 LOC tests). Budget 6 tasks / 450 prod LOC is tight; comparable specs (shell-sp-alignment) used 4 tasks / 240 LOC for narrower scope.

**Recommendation:** Raise budget to **7 tasks · ~550 prod / ~650 test** or split PR2 (server+form) / PR1 (drawer shell).

---

### JD-004 — WARNING (confirmed both)

**Evidence:** §7.1 lists sticky footer slot on drawer; §7.2 lists `missingFields()` on form. `indicator-drawer` delegates footer to `lab-report-form` inside body scroll region. Unclear whether footer is projected from form into drawer or duplicated.

**Recommendation:** State explicitly: **footer lives inside `bilateral-manual-create-form`**; drawer only provides scroll container + projects nothing for footer (match lab-report-form pattern).

---

### JD-005 — WARNING (suspect — A only)

**Evidence:** `BIL-MCD-R-9` and requirements in-scope mention Bulk; `bilateral-reporting-way-selector` options array has only `ai` and `manual`. Creator types allow `'bulk'` but no UI emits it.

**Recommendation:** Clarify in design out-of-scope note: Bulk is type-level placeholder only; no drawer interaction in v1.

---

### JD-006 — WARNING (suspect — B only)

**Evidence:** BIL-MCD-R-4 requires duplicate blocks create; BIL-MCD-R-7 requires missing-fields chip. Design §7.2 lists signals but does not require `blockingExactTitleFound` / `titleCheckFailed` entries in `missingFields()` labels.

**Recommendation:** Add explicit missing-field strings: `"Result title already exists"`, `"Title check failed — retry"`.

---

### JD-007 — WARNING (confirmed both)

**Evidence:** Design §5 server `title` validation is `@IsNotEmpty` only; 30-word rule is client-only. Requirement BIL-MCD-R-3 is still satisfiable client-side; bypass possible via direct API.

**Recommendation:** Record as accepted risk in design §12 (same as other create flows) or add optional server max-length check.

---

## Counts

| Category | Count |
|---|---|
| Confirmed SEVERE | 2 |
| Suspect SEVERE | 0 |
| Confirmed WARNING | 4 |
| Suspect WARNING | 2 |
| INFO / SUGGESTION | 2 |
| Contradictions between judges | 0 |

---

## Round 1 verdict

**JUDGMENT: CONDITIONAL — 2 confirmed SEVERE findings block tasks.md until design patched or explicitly accepted**

## Fix round (user option 2 — fix only, 2026-09-14)

| ID | Applied to `design.md` |
|---|---|
| JD-001 | §7.2 legacy-type mapping table |
| JD-002 | §7.3 creationService signal seeding before navigation |
| JD-003 | Budget → 7 tasks / ~550 prod LOC |
| JD-004 | Footer ownership clarified (form, not shell) |
| JD-005 | §13 Bulk placeholder note |
| JD-006 | §7.2 missingFields label list |
| JD-007 | §13 accepted risk — server word-count |
| JD-008 | §2.3 renumber (duplicate 2.2) |
| JD-009 | §7.1 focus return via `#manualCta` |

---

## Recommended corrections (round 1)

1. **JD-001:** Add legacy-type mapping strategy to design §7.2.
2. **JD-002:** Add creationService signal seeding step to design §7.3.
3. **JD-003:** Update budget in design Document Control.
4. **JD-004:** Clarify footer ownership in §7.1 / §7.2.
5. **JD-006:** Add missingFields entries for title gate failures.
