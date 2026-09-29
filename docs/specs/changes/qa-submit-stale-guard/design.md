# Design — `changes/qa-submit-stale-guard`

| Field | Value |
|---|---|
| Depth | Lite · client only |
| Requirements | [`requirements.md`](./requirements.md) `QSG-R-1`..`R-5` |
| Branch base | `performance-refactor` @ `9be3db51e` — every citation below read at this SHA |

## 1. Premise Ledger

**Count:** 9 rows. 8 verified, 1 `UNVERIFIED`, which carries `Low` Impact.
**Blast-radius triggers:** all three fire, and each has its row below.
- `live-path`: the design names a user action (`P-2`).
- `shared-state`: it changes the `assessment` signal of a root service that several places read (`P-6`).
- `consumer`: `QSG-R-5` adds an input to the dialog component and changes its footer DOM (`P-9`).

`openStored()` and `submit()` keep their signatures.

| # | Claim | Class | Citation (as run) | Verified at | If false | Settled by |
|---|---|---|---|---|---|---|
| `P-1` | The drawer already hides Submit and shows the "run it again" line when `is_current === false` | `existence` | `bilateral-quality-assessment-dialog.component.ts:93` (`stale = … is_current === false`); `.html:74-75` (message), `:169` (`@if (!stale())` around Submit) | `9be3db51e` | A new stale UI must be built. **High** | verified |
| `P-2` | "View AI assessment" reaches `openStored()`, which reopens the in-memory row without asking the server | `live-path` | `bilateral-result-creator.component.ts:888-890` `openQualityAssessment()` → `this.qualityAssessment.openStored()` → `bilateral-quality-assessment-ui.service.ts:167-169` (`if (this.assessment() && !this.isBusy()) this.state.set('deciding')`) → dialog input `[assessment]="qualityAssessment.assessment()"` (`creator.html:46`) | `9be3db51e` | Reopening would not be the path, and `QSG-R-1` has no live path. **High** | verified |
| `P-3` | A rejected Submit returns to `deciding` with the same row, so Submit is offered again | `existence` | `ui.service.ts:193` (`error: () => this.state.set('deciding')`); `assessment` is not touched in `submit()` (`:177-199`) | `9be3db51e` | `QSG-R-2` is already met. **High** | verified |
| `P-4` | The client can already re-read the latest row with `is_current` | `existence` | `ui.service.ts:97-101` private `readLatest()` → `GET_bilateralQualityAssessmentLatest`; the server fills `is_current` from a fresh hash (`bilateral-quality-assessment.service.ts:163`, `contentHash(payload) === latest.content_hash`) | `9be3db51e` | A new endpoint would be needed. **High** | verified |
| `P-5` | `content_hash` is deterministic for an unchanged result. If it were not, every row would read stale and this design would hide Submit forever | `data-env` | `UNVERIFIED — confirm at source before relying on it`. `contentHash` sorts object keys but not arrays (`bilateral-quality-rules.ts:122-131`) | `—` | The root cause is server side and a Pivot is owed; the client change still stands. **Low** | The DB check below, run by the user at the HITL pause: two checks on an unchanged result give the same `content_hash` |
| `P-6` | Readers of the service's `assessment` signal, all of which will see the refreshed row | `shared-state` | `grep -rn "\.assessment()" src/app/pages/bilateral --include='*.ts' --include='*.html' \| grep -v spec` → dialog input (`creator.html:46`); rail card (`creator.html:139`); `flagForSection` (`ui.service.ts:157`); `submit` (`ui.service.ts:178`); `ui.service.ts:119` | `9be3db51e` | A reader would keep showing the old row. **Low** | verified |
| `P-7` | The server guard rejects a non-current or non-latest row and stays untouched | `location` | `bilateral-center.service.ts:2297-2306` | `9be3db51e` | `QSG-R-4` would need a server task. **Low** | verified |

| `P-8` | The creator already knows whether the result is editable, and the dialog does not | `location` | `bilateral-result-creator.component.ts:478` `isFormReadOnly = computed(() => !this.creationService.isEditableByCenterUser())`; the dialog inputs are only `assessment`, `visible`, `running`, `submitting` (`dialog.component.ts:78-83`); binding at `creator.html:44-51` | `9be3db51e` | A status source must be added. **Low** | verified |
| `P-9` | Readers of the dialog component and of its footer text | `consumer` | `grep -rln "app-bilateral-quality-assessment-dialog\|BilateralQualityAssessmentDialogComponent" src cypress` → `creator.html`, `creator.component.ts`, `dialog.component.spec.ts`; `grep -rn "Make adjustments" src cypress --include='*.ts'` → `dialog.component.spec.ts:123,155,336-340`, `ui.service.spec.ts:253` (comment) | `9be3db51e` | A pinned footer assertion breaks unnoticed. **Low** | verified |

The DB check for `P-5`:

```sql
SELECT id, status, content_hash, created_date
FROM bilateral_quality_assessments
WHERE result_id = <id> ORDER BY id DESC LIMIT 5;
```

## 2. Design decisions

- **`QSG-DD-1`: reopening re-reads first.** `openStored()` asks for the latest row, replaces `assessment` with it, then opens the drawer (`QSG-R-1`, `P-2`, `P-4`).
  - While the request is in flight, a short `refreshing` state marks the service busy, so the rail buttons stay disabled. The drawer does not open until the read lands.
  - This is chosen over opening immediately with a pending flag. That alternative needs a new dialog input and new copy for a ~1 s wait.
  - `openStored()` keeps its `void` signature, so no consumer changes (`P-6`).
- **`QSG-DD-2`: a rejected Submit re-reads before returning to the verdict.** On a Submit error, the service reads the latest row, replaces `assessment`, and returns to `deciding` (`QSG-R-2`, `P-3`).
  - If the latest row is newer and current, Submit shows for **that** row, which the server will accept.
  - If it is not current, `stale()` hides Submit through the existing template (`P-1`).
  - It does not match on the error message text: any 4xx on Submit triggers the re-read, so the client never depends on the server's wording.
- **`QSG-DD-3`: fail closed.** If the re-read errors, or returns `latest: null`, the service keeps the held row and marks a local copy `is_current: false` (`QSG-R-3`). The user then re-runs the check from the rail Submit button, which already calls `run()`.
- **`QSG-DD-4`: no server change** (`QSG-R-4`, `P-7`). `P-5` is checked at the HITL pause rather than fixed here. If it proves false, a server change is needed, and that goes through the Pivot Protocol.
- **`QSG-DD-5`: a read-only drawer.** The dialog gains a boolean `readOnly` input, bound from the creator's `isFormReadOnly()` (`P-8`). When it is true:
  - the footer is not rendered;
  - the stale line is not rendered;
  - ✕ / Escape / scrim still close (`QSG-R-5`).

  The existing footer tests stay valid for the editable case (`P-9`). Deriving the status inside the dialog was rejected: the creator already owns that rule, and a second copy could drift.
- **No new copy.** The stale message already exists (`P-1`). No i18n change.

**Reversion challenge (Step 2.3):** not triggered. No DD removes or disables delivered behaviour, and the "a failed Submit returns to the verdict" behaviour is kept.

## 3. Budget

| Tasks | LOC | Review rounds |
|---|---|---|
| 2 | ~150 (≈40 production, ≈110 test) | 1 per task |

This matches Lite.
