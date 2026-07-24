## 1. Routes

- [x] 1.1 Add `planned-toc`, `emerging`, `centers` entries to `ResultFrameworkReportingRouting` in `routing-data.ts`, each loading `DashboardLabComponent` with `data.rfrView`
- [x] 1.2 Keep `home` / `dashboard-lab` as `rfrView: 'dashboard'`

## 2. Dashboard view filter

- [x] 2.1 In `dashboard-lab.component.ts`, read activated route `data.rfrView` into a signal/computed
- [x] 2.2 In `dashboard-lab.component.html`, wrap bento blocks so Dashboard shows all; section routes show only Planned / Emerging / Centers respectively

## 3. Sidebar

- [x] 3.1 In `reporting-nav-sidebar`, under expanded RFR, add muted label + four nested links (preserve `?sp=`)
- [x] 3.2 Point Science Program links at the current RFR section path + `sp`
- [x] 3.3 Style label subtly (lighter gray, no chevron, same indent as program group labels)
- [x] 3.4 Update collapsed RFR flyout with the four section links

## 4. Verification

- [ ] 4.1 Manual: expand RFR → label + 4 links; Dashboard = full layout; each section = only that card; switching SP keeps section
- [ ] 4.2 Manual: icon-collapsed flyout reaches the four links
