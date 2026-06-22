## 1. Fix the Center column fallback

- [x] 1.1 In `onecgiar-pr-client/src/app/pages/results/pages/results-outlet/pages/results-list/results-list.component.html` (line ~124), change the `lead_center` fallback from `|| 'Undefined'` to `|| ''` so an empty cell is rendered when there is no lead center.
- [x] 1.2 Add a `TODO (P2-3049)` HTML comment next to the binding documenting that the empty cell is intentional and that a future change should display the lead partner when no lead center exists.

## 2. Verify

- [ ] 2.1 Verify a result with a lead center still shows the center name.
- [ ] 2.2 Verify a result led by an external partner (no lead center) shows a blank cell, not `"Undefined"`.
