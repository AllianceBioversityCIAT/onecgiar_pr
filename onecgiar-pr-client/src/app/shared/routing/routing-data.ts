import { Route } from '@angular/router';
import { CheckLoginGuard } from '../guards/check-login.guard';
import { CheckAdminGuard } from '../guards/check-admin.guard';
export const routingApp: PrRoute[] = [
  {
    prName: 'Results Framework & Reporting',
    underConstruction: false,
    prHide: false,
    canActivate: [CheckLoginGuard],
    path: 'result-framework-reporting',
    loadChildren: () => import('../../pages/result-framework-reporting/result-framework-reporting.module').then(m => m.ResultFrameworkReportingModule)
  },
  {
    prName: 'Results Center',
    underConstruction: false,
    canActivate: [CheckLoginGuard],
    path: 'result',
    loadChildren: () => import('../../pages/results/results.module').then(m => m.ResultsModule)
  },
  {
    prName: 'Type 1 report elements',
    prHide: true,
    underConstruction: false,
    onlyTest: false,
    canActivate: [CheckLoginGuard],
    path: 'type-one-report',
    loadChildren: () => import('../../pages/type-one-report/type-one-report.module').then(m => m.TypeOneReportModule)
  },
  {
    prName: 'Innovation Packages',
    underConstruction: false,
    onlyTest: false,
    canActivate: [CheckLoginGuard],
    path: 'ipsr',
    loadChildren: () => import('../../pages/ipsr/ipsr.module').then(m => m.IpsrModule)
  },
  { prName: 'login', prHide: true, path: 'login', loadComponent: () => import('../../pages/login/login.component').then(m => m.LoginComponent) },
  {
    prName: 'Auth',
    path: 'auth',
    prHide: true,
    loadComponent: () => import('../../pages/auth-cognito/auth-cognito.component').then(m => m.AuthCognitoComponent)
  },
  {
    prName: 'Quality Assurance',
    onlyTest: false,
    underConstruction: false,
    canActivate: [CheckLoginGuard],
    path: 'quality-assurance',
    loadChildren: () => import('../../pages/quality-assurance/quality-assurance.module').then(m => m.QualityAssuranceModule)
  },
  {
    prName: 'My Admin',
    onlyTest: false,
    prHide: false,
    canActivate: [CheckLoginGuard],
    path: 'init-admin-module',
    loadChildren: () => import('../../pages/init-admin-section/init-admin-section.module').then(m => m.InitAdminSectionModule)
  },
  {
    prName: 'Outcome Indicator Module',
    onlyTest: false,
    prHide: true,
    underConstruction: false,
    canActivate: [CheckLoginGuard],
    path: 'outcome-indicator-module',
    loadChildren: () => import('../../pages/outcome-indicator/outcome-indicator.module').then(m => m.OutcomeIndicatorModule)
  },
  {
    prName: 'Whats new',
    onlyTest: false,
    prHide: true,
    underConstruction: false,
    canActivate: [CheckLoginGuard],
    path: 'whats-new',
    loadChildren: () => import('../../pages/whats-new/whats-new.module').then(m => m.WhatsNewModule)
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
  { prName: '', path: '**', pathMatch: 'full', redirectTo: 'result-framework-reporting', prHide: true }
];

export const extraRoutingApp: PrRoute[] = [
  {
    prName: 'Admin module',
    onlyTest: false,
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
    prName: 'Phase management',
    path: 'phase-management',
    loadChildren: () => import('../../pages/admin-section/pages/phase-management/phase-management.module').then(m => m.PhaseManagementModule)
  },
  {
    prName: 'Knowledge Products',
    path: 'knowledge-products',
    loadChildren: () => import('../../pages/admin-section/pages/knowledge-products/knowledge-products.module').then(m => m.KnowledgeProductsModule)
  },
  {
    prName: 'Tickets Dashboard',
    path: 'tickets-dashboard',
    loadComponent: () =>
      import('../../pages/admin-section/pages/tickets-dashboard/tickets-dashboard.component').then(m => m.TicketsDashboardComponent)
  },
  {
    prName: 'User management',
    path: 'user-management',
    loadComponent: () => import('../../pages/admin-section/pages/user-management/user-management.component')
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
  { prName: 'Notifications', path: 'results-notifications', redirectTo: 'results-notifications/requests', pathMatch: 'full' },
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

export const notificationsRouting: PrRoute[] = [
  {
    prName: 'Updates',
    path: 'updates',
    loadChildren: () =>
      import('../../pages/results/pages/results-outlet/pages/results-notifications/pages/updates/updates.module').then(m => m.UpdatesModule)
  },
  {
    prName: 'Requests',
    path: 'requests',
    loadChildren: () =>
      import('../../pages/results/pages/results-outlet/pages/results-notifications/pages/requests/requests.module').then(m => m.RequestsModule)
  },
  {
    prName: 'Settings',
    path: 'settings',
    loadChildren: () =>
      import('../../pages/results/pages/results-outlet/pages/results-notifications/pages/settings/settings.module').then(m => m.SettingsModule)
  }
];

export const requestsNotificationsRouting: PrRoute[] = [
  {
    prName: 'Received requests',
    path: 'received',
    loadChildren: () =>
      import(
        '../../pages/results/pages/results-outlet/pages/results-notifications/pages/requests/pages/received-requests/received-requests.module'
      ).then(m => m.ReceivedRequestsModule)
  },
  {
    prName: 'Sent requests',
    path: 'sent',
    loadChildren: () =>
      import('../../pages/results/pages/results-outlet/pages/results-notifications/pages/requests/pages/sent-requests/sent-requests.module').then(
        m => m.SentRequestsModule
      )
  },
  { prName: '', path: '**', pathMatch: 'full', redirectTo: 'received' }
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
    portfolioAcronym: 'P22',
    loadChildren: () =>
      import('../../pages/results/pages/result-detail/pages/rd-theory-of-change/rd-theory-of-change.module').then(m => m.RdTheoryOfChangeModule)
  },
  {
    prName: 'Partners & Contributors',
    path: 'partners',
    underConstruction: false,
    portfolioAcronym: 'P22',
    loadChildren: () => import('../../pages/results/pages/result-detail/pages/rd-partners/rd-partners.module').then(m => m.RdPartnersModule)
  },
  {
    prName: 'Contributors & partners',
    path: 'contributors-and-partners',
    portfolioAcronym: 'P25',
    underConstruction: false,
    loadChildren: () =>
      import('../../pages/results/pages/result-detail/pages/rd-contributors-and-partners/rd-contributors-and-partners.module').then(
        m => m.RdContributorsAndPartnersModule
      )
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
    portfolioAcronym: 'P22',
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
    prName: 'Progress towards End of Initiative Outcomes (EOI-O)',
    underConstruction: false,
    path: 'progress-eoio',
    loadChildren: () => import('../../pages/type-one-report/pages/tor-progress-eoio/tor-progress-eoio.module').then(m => m.TorProgressEoioModule)
  },
  {
    prName: 'Work Package progress',
    underConstruction: false,
    path: 'progress-wp',
    loadChildren: () => import('../../pages/type-one-report/pages/tor-progress-wps/tor-progress-wps.module').then(m => m.TorProgressWpsModule)
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
    loadComponent: () => import('../../pages/type-one-report/pages/tor-white/tor-white.component').then(m => m.TorWhiteComponent)
  },
  { prName: '', path: '**', underConstruction: false, pathMatch: 'full', redirectTo: 'fact-sheet' }
];

export const OutcomeIndicatorRouting: PrRoute[] = [
  { prName: 'Outcome Indicator Module', path: 'outcome-indicator-module', redirectTo: 'outcome-indicator-module/home', pathMatch: 'full' },
  {
    prName: 'Outcome indicators home',
    underConstruction: false,
    path: 'home',
    loadComponent: () =>
      import('../../pages/outcome-indicator/pages/outcome-indicator-home/outcome-indicator-home.component').then(m => m.OutcomeIndicatorHomeComponent)
  },
  {
    prName: 'Report progress on End-of-initiative outcome',
    underConstruction: false,
    path: 'eoi-outcome-home',
    loadComponent: () => import('../../pages/outcome-indicator/pages/eioi-home/eoio-home.component').then(m => m.EoioHomeComponent)
  },
  {
    prName: 'Report progress on Work Packages outcome',
    underConstruction: false,
    path: 'work-package-outcome-home',
    loadComponent: () => import('../../pages/outcome-indicator/pages/wp-home/wp-home.component').then(m => m.WpHomeComponent)
  },
  {
    prName: 'Indicator details',
    underConstruction: false,
    path: 'indicator-details',
    loadComponent: () =>
      import('../../pages/outcome-indicator/pages/indicator-details/indicator-details.component').then(m => m.IndicatorDetailsComponent)
  },
  { prName: '', path: '**', pathMatch: 'full', redirectTo: 'home' }
];

export const WhatsNewRouting: PrRoute[] = [
  { prName: 'Whats new', path: 'whats-new', redirectTo: 'whats-new/home', pathMatch: 'full' },
  {
    prName: 'Whats new',
    path: 'home',
    loadComponent: () => import('../../pages/whats-new/pages/whats-new-home/whats-new-home.component').then(m => m.WhatsNewHomeComponent)
  },
  {
    prName: 'Whats new - Page details',
    path: 'details/:id',
    loadComponent: () =>
      import('../../pages/whats-new/pages/whats-new-page-details/whats-new-page-details.component').then(m => m.WhatsNewPageDetailsComponent)
  },
  { prName: '', path: '**', pathMatch: 'full', redirectTo: 'home' }
];

export const ResultFrameworkReportingRouting: PrRoute[] = [
  {
    prName: 'Result Framework & Reporting',
    path: 'home',
    loadComponent: () =>
      import('../../pages/result-framework-reporting/pages/result-framework-reporting-home/result-framework-reporting-home.component').then(
        m => m.ResultFrameworkReportingHomeComponent
      )
  },
  {
    prName: 'Entity details',
    path: 'entity-details/:entityId',
    loadComponent: () =>
      import('../../pages/result-framework-reporting/pages/entity-details/entity-details.component').then(m => m.EntityDetailsComponent)
  },
  {
    prName: 'Entity AOW',
    path: 'entity-details/:entityId/aow',
    loadComponent: () => import('../../pages/result-framework-reporting/pages/entity-aow/entity-aow.component').then(m => m.EntityAowComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'all' },
      {
        path: 'all',
        loadComponent: () =>
          import('../../pages/result-framework-reporting/pages/entity-aow/pages/entity-aow-all/entity-aow-all.component').then(
            m => m.EntityAowAllComponent
          )
      },
      {
        path: 'unplanned',
        loadComponent: () =>
          import('../../pages/result-framework-reporting/pages/entity-aow/pages/entity-aow-unplanned/entity-aow-unplanned.component').then(
            m => m.EntityAowUnplannedComponent
          )
      },
      {
        path: '2030-outcomes',
        loadComponent: () =>
          import('../../pages/result-framework-reporting/pages/entity-aow/pages/entity-aow-2030/entity-aow-2030.component').then(
            m => m.EntityAow2030Component
          )
      },
      {
        path: ':aowId',
        loadComponent: () =>
          import('../../pages/result-framework-reporting/pages/entity-aow/pages/entity-aow-aow/entity-aow-aow.component').then(
            m => m.EntityAowAowComponent
          )
      }
    ]
  },
  { prName: '', path: '**', pathMatch: 'full', redirectTo: 'home' }
];

export interface PrRoute extends Route {
  prName: string;
  prHide?: boolean | number;
  underConstruction?: boolean | number;
  onlyTest?: boolean;
  portfolioAcronym?: string;
}
