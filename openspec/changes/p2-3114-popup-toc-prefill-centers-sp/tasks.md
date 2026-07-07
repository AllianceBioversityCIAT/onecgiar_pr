# Tasks: P2-3114 — ToC prefill for Centers & SP in the Report-result popup

## 1. Investigation / data sources
- [x] 1.1 CONFIRMED: `targets_by_center.centers[] = { center_id, center_acronym, center_name }`. Join key is **`center_acronym` → `code`** (Centers dropdown uses `optionValue="code"`). (prtest GET `toc-results?program=SP01&areaOfWork=AOW01`)
- [x] 1.2 CONFIRMED GAP (resolved back): AoW `toc-results` + `2030-outcomes` now expose `contributing_synergy_program_initiative_ids` per node via `getTocSynergyProgramsByResultIds` (P2-3114 back, Juanda). Front SP preselect unblocked.

## 2. Centers — ToC preselect + Other split (not blocked)
- [x] 2.1 DONE (in component, not service): `preselectTocCenters()` in `ngOnInit` derives the ToC centers from `currentResultToReport().indicators[0].targets_by_center.centers` (by `center_acronym` → `CenterDto.acronym`) via `centersSE.getData()`, tags `from_toc:true`, and sets `createResultBody().contributing_center`.
- [x] 2.2 DONE: visual 2-dropdown split implemented (mirrors C&P) — dropdown 1 = ToC centers + "Other(s)" sentinel (`dropdown1Options`); `onContributingCenterSelect` opens dropdown 2 on sentinel; dropdown 2 = `otherCentersList` (non-ToC), `[(ngModel)]=otherCentersSelected`; both with chips; AC4 auto-opens dropdown 2 when ToC has no centers. Runtime: dropdown 1 (IRRI + "Other(s)") verified; dropdown 2 appearance covered by unit tests (overlay virtual-scroll not automated; logic identical to C&P in prod).
- [x] 2.3 DONE: `createResult()` maps `contributing_center` with `from_toc: c.from_toc ?? false` (ToC-preselected = true, manually-added = false).
- [x] 2.4 DONE: fixed "Center(s) selected (undefined)" — root cause was `contributing_center: null` default (pr-multi-select renders `(${value?.length})`); changed default to `[]`. NOTE: reverted an initial wrong attempt to drop `optionValue="code"` — the custom pr-multi-select needs it for `writeValue`/`onSelectOption` matching.

## 3. Science Programs — ToC preselect + Other split (gated on 1.2)
- [ ] 3.1 If the SP ToC source is confirmed: derive the SP ToC bucket on popup open and expose/reset it in the service.
- [ ] 3.2 Add the split UI (main SP dropdown preselected + "Other(s) Science Program(s)" dropdown) in the template.
- [ ] 3.3 Carry `from_toc` on the SP contribution list into the create payload.
- [ ] 3.4 If the source is NOT available, keep today's manual SP behavior and hand the backend dependency to Juanda; ship Centers (section 2) independently.

## 4. Tests
- [x] 4.1 Jest: preselect derives ToC centers tagged `from_toc:true`; empty node preselects none. (11/11 passing)
- [x] 4.3 Jest: create payload defaults `from_toc:false` for manually-added centers.
- [x] 4.2 Jest: sentinel opens dropdown 2 + drops sentinel; merge ToC(from_toc:true)+Other(from_toc:false); AC4 auto-open. (14/14 passing)
- [ ] 4.4 Jest (blocked): SP preselect — pending backend source (Juanda).

## 5. Verification
- [x] 5.1 DONE (runtime, local front vs prtest-back): opened the popup on indicator 7295 (SP01/AOW01, innovation development, ToC center IRRI) → **IRRI preselected** (chip + checkbox marked), chip count "(1)" not "(undefined)". Screenshot `p2-3114-centers-preselect-IRRI-local.png`.
- [x] 5.2 DONE (runtime e2e, result 8604/id 11072, then deleted): created from the popup with preselected IRRI + 1 bilateral → C&P GET `contributors-partners/11072` returned `contributing_center: [{code:"CENTER-13", acronym:"IRRI", from_toc:1}]` (ToC bucket) and `bilateral_projects: ["8"]`. Centers persist with `from_toc`; W3/bilateral (P2-3001) no regression.
