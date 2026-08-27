## 1. Frontend — pre-flight

- [x] 1.1 Confirm both blocks render un-gated today: `innovation-dev-info.component.html:43` and `:60`, neither inside the `@if (isP25())` used four lines away.
- [x] 1.2 Establish the correct gate. `isP25()` is the **portfolio** (`fields-manager.service.ts:19`), not the phase. `ReportingDesignYear` already carries four 2026 thresholds gated on `phase_year`. Confirmed on prtest that 2025-phase results exist inside the P25 portfolio, which is the case a portfolio gate would break.

## 2. Frontend — the gate

- [x] 2.1 `shared/enum/reporting-design-year.enum.ts` — add `InnovationDevFormReduction: 2026` with the reasoning in its doc block.
- [x] 2.2 `shared/services/fields-manager.service.ts` — add `isInnovationDevFormReduced2026`, same shape as the four existing 2026 computeds, including the fallback to the open reporting phase.
- [x] 2.3 `innovation-dev-info.component.html:43` — wrap `app-anticipated-innovation-user` (P2-3263). Component kept.
- [x] 2.4 `innovation-dev-info.component.html:60` — wrap `app-megatrends` (P2-3264). Component kept.

## 3. Tests

- [x] 3.1 `fields-manager.service.spec.ts` — six cases on the new computed: 2026 true, 2025 false, **2025-inside-P25 false** (the case a portfolio gate would break), 2026-P22 true, fallback to the open phase, and no year at all.
- [x] 3.2 `innovation-dev-info.component.spec.ts` — three render cases: both blocks present pre-2026, neither present from 2026, and the rest of the form intact.
- [x] 3.3 Complete the suite's mocks so it renders the real template: `fields()` and `isInnovationDevFormReduced2026` on the FieldsManager mock, `isMegatrendsComplete()` / `mapBoolean()` on the utils mock, and `PrCheckboxComponent` declared (without it the pre-2026 render throws `NG01203`).
- [x] 3.4 Run and paste the real output.
      `npx jest .../fields-manager.service.spec.ts` → **117 passed, 117 total**.
      `npx jest .../innovation-dev-info` → **16 suites, 139 tests, all passed**.
      `npx ng build --configuration development` → build succeeds (template typecheck clean).

## 4. Verification in the app

- [x] 4.1 2026 result (code **8565**, phase 36): `app-anticipated-innovation-user` **absent**, `app-megatrends` **absent**, neither "Megatrend" nor "Demand of anticipated innovation user" anywhere in the page text. Innovation team diversity, GESI and IPR still present.
- [x] 4.2 2025 result (code **6069**, phase 34): live component reports `phase_year: 2025`, gate `false`, and **both blocks render** with their options and text.
      Screenshot: `.local-screenshots/p2-3263-p2-3264-2025-keeps-both-blocks.png`.
- [ ] 4.3 PDF and Excel exports for a 2026 result.
      ⚠️ **NOT verified.** Whether the exports build their own section list on the server cannot be settled from client code. If they still print either block for 2026, that is a backend finding to report with evidence, not a client fix.
- [ ] 4.4 Read-only view.
      ⚠️ **NOT verified.** Same limitation as P2-3291: no 2026 Innovation Development result reachable with this account opens read-only. Risk is low — the gate wraps the block regardless of edit rights.

## 5. Backend — NOT DELIVERED, handed over

- [ ] 5.1 Exclude the Megatrends question and the anticipated-user fields from the 2026 completion routine. `validation_innovation_dev_P25` does not exist in `src/migrations`; `validation_innovation_dev_P22` must not be touched.
- [ ] 5.2 Decide whether the 2026 read path stops returning the megatrends question. The client gate is correct either way.
      **Both tickets' green-check acceptance criteria are unmet until this lands. Stated plainly on each ticket; neither is moved to UAT.**

## 6. Documentation

- [x] 6.1 `innovation-dev-info/CLAUDE.md` — record the new gate and that `isP25()` is not the phase. Re-stamped.
