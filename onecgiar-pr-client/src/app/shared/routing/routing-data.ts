import { Route } from '@angular/router';
import { CheckLoginGuard } from '../guards/check-login.guard';
import { CheckAdminGuard } from '../guards/check-admin.guard';

export const routingApp: PrRoute[] = [
  {
    prName: 'Results',
    underConstruction: false,
    canActivate: [CheckLoginGuard],
    path: 'result',
    loadChildren: () => import('../../pages/results/results.module').then(m => m.ResultsModule)
  },
  {
    prName: 'Type 1 report elements',
    prHide: false,
    underConstruction: false,
    onlytest: false,
    path: 'type-one-report',
    loadChildren: () => import('../../pages/type-one-report/type-one-report.module').then(m => m.TypeOneReportModule)
  },
  {
    prName: 'Innovation Packages',
    underConstruction: false,
    onlytest: false,
    canActivate: [CheckLoginGuard],
    path: 'ipsr',
    loadChildren: () => import('../../pages/ipsr/ipsr.module').then(m => m.IpsrModule)
  },
  { prName: 'login', prHide: true, path: 'login', loadChildren: () => import('../../pages/login/login.module').then(m => m.LoginModule) },
  {
    prName: 'Quality Assurance',
    onlytest: false,
    underConstruction: false,
    canActivate: [CheckLoginGuard],
    path: 'quality-assurance',
    loadChildren: () => import('../../pages/quality-assurance/quality-assurance.module').then(m => m.QualityAssuranceModule)
  },
  {
    prName: 'INIT Admin Module',
    onlytest: false,
    prHide: false,
    path: 'init-admin-module',
    loadChildren: () => import('../../pages/init-admin-section/init-admin-section.module').then(m => m.InitAdminSectionModule)
  },
  {
    prName: 'reports',
    prHide: true,
    path: 'reports/result-details/:id',
    loadChildren: () => import('../../pages/pdf-reports/pdf-reports.module').then(m => m.PdfReportsModule)
  },
  {
    prName: 'ipsr',
    prHide: true,
    path: 'reports/ipsr-details/:id',
    loadChildren: () => import('../../pages/pdf-reports/pdf-reports.module').then(m => m.PdfReportsModule)
  },
  { prName: '', path: '**', pathMatch: 'full', redirectTo: 'result', prHide: true }
];

export const extraRoutingApp: PrRoute[] = [
  {
    prName: 'Admin module',
    onlytest: false,
    canActivate: [CheckAdminGuard],
    prHide: false,
    path: 'admin-module',
    loadChildren: () => import('../../pages/admin-section/admin-section.module').then(m => m.AdminSectionModule)
  }
];

export const resultRouting: PrRoute[] = [
  {
    prName: 'Result Creator',
    path: 'result-creator',
    loadChildren: () => import('../../pages/results/pages/result-creator/result-creator.module').then(m => m.ResultCreatorModule)
  },
  {
    prName: 'Result detail',
    path: 'result-detail/:id',
    loadChildren: () => import('../../pages/results/pages/result-detail/result-detail.module').then(m => m.ResultDetailModule)
  },
  {
    prName: '',
    path: 'results-outlet',
    loadChildren: () => import('../../pages/results/pages/results-outlet/results-outlet.module').then(m => m.ResultsOutletModule)
  },
  { prName: '', path: '**', pathMatch: 'full', redirectTo: 'results-outlet' }
];

export const adminModuleRouting: PrRoute[] = [
  {
    prName: 'Completeness status',
    path: 'completeness-status',
    loadChildren: () => import('../../pages/admin-section/pages/completeness-status/completeness-status.module').then(m => m.CompletenessStatusModule)
  },
  {
    prName: 'User report',
    path: 'user-report',
    loadChildren: () => import('../../pages/admin-section/pages/user-report/user-report.module').then(m => m.UserReportModule)
  },
  {
    prName: 'Phase management',
    path: 'phase-management',
    loadChildren: () => import('../../pages/admin-section/pages/phase-management/phase-management.module').then(m => m.PhaseManagementModule)
  },
  {
    prName: 'Knowledge Products',
    path: 'knowledge-products',
    loadChildren: () => import('../../pages/admin-section/pages/knowledge-products/knowledge-products.module').then(m => m.KnowledgeProductsModule)
  },
  { prName: '', path: '**', pathMatch: 'full', redirectTo: 'completeness-status' }
];

export const managementPhasesRuting: PrRoute[] = [
  {
    prName: 'Reporting',
    path: 'reporting',
    loadChildren: () => import('../../pages/admin-section/pages/phase-management/pages/reporting/reporting.module').then(m => m.ReportingModule)
  },
  {
    prName: 'Innovation Package',
    path: 'innovation-package',
    loadChildren: () =>
      import('../../pages/admin-section/pages/phase-management/pages/innovation-package/innovation-package.module').then(
        m => m.InnovationPackageModule
      )
  },
  { prName: '', path: '**', pathMatch: 'full', redirectTo: 'reporting' }
];

export const initadminModuleRouting: PrRoute[] = [
  {
    prName: 'Completeness status',
    path: 'init-completeness-status',
    loadChildren: () =>
      import('../../pages/init-admin-section/pages/init-completeness-status/init-completeness-status.module').then(
        m => m.InitCompletenessStatusModule
      )
  },
  {
    prName: 'General results report',
    path: 'init-general-results-report',
    loadChildren: () =>
      import('../../pages/init-admin-section/pages/init-general-results-report/init-general-results-report.module').then(
        m => m.InitGeneralResultsReportModule
      )
  },
  { prName: '', path: '**', pathMatch: 'full', redirectTo: 'init-completeness-status' }
];

export const resultsOutletRouting: PrRoute[] = [
  {
    prName: 'Notifications',
    path: 'results-notifications',
    loadChildren: () =>
      import('../../pages/results/pages/results-outlet/pages/results-notifications/results-notifications.module').then(
        m => m.ResultsNotificationsModule
      )
  },
  {
    prName: '',
    path: 'results-list',
    loadChildren: () => import('../../pages/results/pages/results-outlet/pages/results-list/results-list.module').then(m => m.ResultsListModule)
  },
  { prName: '', path: '**', pathMatch: 'full', redirectTo: 'results-list' }
];
export const rdResultTypesPages: PrRoute[] = [
  {
    prName: 'CapSharing info',
    path: 'cap-dev-info',
    prHide: 5,
    underConstruction: false,
    loadChildren: () =>
      import('../../pages/results/pages/result-detail/pages/rd-result-types-pages/cap-dev-info/cap-dev-info.module').then(m => m.CapDevInfoModule)
  },
  {
    prName: 'Innovation Dev info',
    path: 'innovation-dev-info',
    prHide: 7,
    underConstruction: false,
    loadChildren: () =>
      import('../../pages/results/pages/result-detail/pages/rd-result-types-pages/innovation-dev-info/innovation-dev-info.module').then(
        m => m.InnovationDevInfoModule
      )
  },
  {
    prName: 'Innovation use info',
    path: 'innovation-use-info',
    prHide: 2,
    underConstruction: false,
    loadChildren: () =>
      import('../../pages/results/pages/result-detail/pages/rd-result-types-pages/innovation-use-info/innovation-use-info.module').then(
        m => m.InnovationUseInfoModule
      )
  },
  {
    prName: 'Knowledge product info',
    path: 'knowledge-product-info',
    prHide: 6,
    underConstruction: false,
    loadChildren: () =>
      import('../../pages/results/pages/result-detail/pages/rd-result-types-pages/knowledge-product-info/knowledge-product-info.module').then(
        m => m.KnowledgeProductInfoModule
      )
  },
  {
    prName: 'Policy change info',
    path: 'policy-change1-info',
    prHide: 1,
    underConstruction: false,
    loadChildren: () =>
      import('../../pages/results/pages/result-detail/pages/rd-result-types-pages/policy-change-info/policy-change-info.module').then(
        m => m.PolicyChangeInfoModule
      )
  }
];

export const resultDetailRouting: PrRoute[] = [
  {
    prName: 'General information',
    path: 'general-information',
    underConstruction: false,
    loadChildren: () =>
      import('../../pages/results/pages/result-detail/pages/rd-general-information/rd-general-information.module').then(
        m => m.RdGeneralInformationModule
      )
  },
  {
    prName: 'Theory of change',
    path: 'theory-of-change',
    underConstruction: false,
    loadChildren: () =>
      import('../../pages/results/pages/result-detail/pages/rd-theory-of-change/rd-theory-of-change.module').then(m => m.RdTheoryOfChangeModule)
  },
  {
    prName: 'Partners & Contributors',
    path: 'partners',
    underConstruction: false,
    loadChildren: () => import('../../pages/results/pages/result-detail/pages/rd-partners/rd-partners.module').then(m => m.RdPartnersModule)
  },
  {
    prName: 'Geographic location',
    path: 'geographic-location',
    underConstruction: false,
    loadChildren: () =>
      import('../../pages/results/pages/result-detail/pages/rd-geographic-location/rd-geographic-location.module').then(
        m => m.RdGeographicLocationModule
      )
  },
  {
    prName: 'Links to results',
    path: 'links-to-results',
    underConstruction: false,
    loadChildren: () =>
      import('../../pages/results/pages/result-detail/pages/rd-links-to-results/rd-links-to-results.module').then(m => m.RdLinksToResultsModule)
  },
  {
    prName: 'Evidence',
    path: 'evidences',
    underConstruction: false,
    loadChildren: () => import('../../pages/results/pages/result-detail/pages/rd-evidences/rd-evidences.module').then(m => m.RdEvidencesModule)
  },
  ...rdResultTypesPages,
  { prName: '', path: '**', pathMatch: 'full', redirectTo: 'general-information' }
];

export const TypePneReportRouting: PrRoute[] = [
  {
    prName: 'Fact sheet',
    underConstruction: false,
    path: 'fact-sheet',
    loadChildren: () => import('../../pages/type-one-report/pages/tor-fact-sheet/tor-fact-sheet.module').then(m => m.TorFactSheetModule)
  },
  {
    prName: 'TOC Diagrams',
    underConstruction: false,
    path: 'toc-diagrams',
    loadChildren: () => import('../../pages/type-one-report/pages/tor-toc-diagrams/tor-toc-diagrams.module').then(m => m.TorTocDiagramsModule)
  },
  {
    prName: 'Key results',
    underConstruction: false,
    path: 'key-results',
    loadChildren: () => import('../../pages/type-one-report/pages/tor-key-results/tor-key-results.module').then(m => m.TorKeyResultsModule)
  },
  {
    prName: 'Partnerships',
    underConstruction: false,
    path: 'partnerships',
    loadChildren: () => import('../../pages/type-one-report/pages/tor-partnerships/tor-partnerships.module').then(m => m.TorPartnershipsModule)
  },
  {
    prName: 'Portfolio linkages',
    underConstruction: false,
    path: 'portfolio-linkages',
    loadChildren: () =>
      import('../../pages/type-one-report/pages/tor-portfolio-linkages/tor-portfolio-linkages.module').then(m => m.TorPortfolioLinkagesModule)
  },
  {
    prName: 'Key result story',
    underConstruction: false,
    path: 'key-result-story',
    loadChildren: () =>
      import('../../pages/type-one-report/pages/tor-key-result-story/tor-key-result-story.module').then(m => m.TorKeyResultStoryModule)
  },
  {
    prName: '',
    underConstruction: false,
    path: 'white',
    loadChildren: () => import('../../pages/type-one-report/pages/white-page/white-page.module').then(m => m.WhitePageModule)
  },
  { prName: '', path: '**', underConstruction: false, pathMatch: 'full', redirectTo: 'fact-sheet' }
];

export interface PrRoute extends Route {
  prName: string;
  prHide?: boolean | number;
  underConstruction?: boolean | number;
  onlytest?: boolean;
}
