# Quick Changes Log

One-line record of trivial, fast-tracked changes made with `/akili-quick`.

| Date | Change | Files | Verification | Commit |
|---|---|---|---|---|
| 2026-08-26 | quick/contributing-field-titles — Add 'Contributing' to field titles in lab-report-form | onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/lab-report-form/lab-report-form.component.html | `Jest pass (23/23 tests)` | [SPEC:quick/contributing-field-titles] |
| 2026-08-26 | quick/non-mandatory-toc-kpi — Remove mandatory asterisk from ToC KPI mapping question in 2026 | onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-contributors-and-partners/rd-contributors-and-partners.component.html | `ng lint` pass, Jest (50/50 tests) | [SPEC:quick/non-mandatory-toc-kpi] |
| 2026-08-26 | quick/program-overview-indicator-category-titles — Adjust indicator category titles to W1/W2 and W3/Bilateral | onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/program-overview/program-overview.component.{html,spec.ts} | `ng lint` pass, Jest (21/21 tests) | [SPEC:quick/program-overview-indicator-category-titles] |
| 2026-08-27 | quick/indicator-drawer-responsive — Report-result drawer: unsaved-changes overlay above sticky footer (z-60), width full-bleed <768px / 740px baseline / up to 1100px on wide screens (drag clamped to viewport), collapsible context header (collapsed by default on small screens) | onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/indicator-drawer/indicator-drawer.component.{ts,html,spec.ts} | scoped Jest indicator-drawer 14/14 + dashboard-lab 260/260, scoped eslint 0 errors | e7419445a |
