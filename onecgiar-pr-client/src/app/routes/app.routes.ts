import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'result',
    pathMatch: 'full'
  },
  {
    path: 'result',
    loadComponent: () =>
      import('../pages/results/results.component').then(
        c => c.ResultsComponent
      ),
    children: [
      {
        path: '',
        redirectTo: 'results-outlet',
        pathMatch: 'full'
      },
      {
        path: 'result-creator',
        loadComponent: () =>
          import(
            '../pages/results/pages/result-creator/result-creator.component'
          ).then(c => c.ResultCreatorComponent)
      },
      {
        path: 'result-detail/:id',
        loadComponent: () =>
          import(
            '../pages/results/pages/result-detail/result-detail.component'
          ).then(c => c.ResultDetailComponent),
        children: [
          {
            path: '',
            redirectTo: 'general-information',
            pathMatch: 'full'
          },
          {
            path: 'general-information',
            loadComponent: () =>
              import(
                '../pages/results/pages/result-detail/pages/rd-general-information/rd-general-information.component'
              ).then(c => c.RdGeneralInformationComponent)
          },
          {
            path: 'theory-of-change',
            loadComponent: () =>
              import(
                '../pages/results/pages/result-detail/pages/rd-theory-of-change/rd-theory-of-change.component'
              ).then(c => c.RdTheoryOfChangeComponent)
          },
          {
            path: 'partners',
            loadComponent: () =>
              import(
                '../pages/results/pages/result-detail/pages/rd-partners/rd-partners.component'
              ).then(c => c.RdPartnersComponent)
          },
          {
            path: 'geographic-location',
            loadComponent: () =>
              import(
                '../pages/results/pages/result-detail/pages/rd-geographic-location/rd-geographic-location.component'
              ).then(c => c.RdGeographicLocationComponent)
          },
          {
            path: 'links-to-results',
            loadComponent: () =>
              import(
                '../pages/results/pages/result-detail/pages/rd-links-to-results/rd-links-to-results.component'
              ).then(c => c.RdLinksToResultsComponent)
          },
          {
            path: 'evidences',
            loadComponent: () =>
              import(
                '../pages/results/pages/result-detail/pages/rd-evidences/rd-evidences.component'
              ).then(c => c.RdEvidencesComponent)
          },
          {
            path: 'cap-dev-info',
            loadComponent: () =>
              import(
                '../pages/results/pages/result-detail/pages/rd-result-types-pages/cap-dev-info/cap-dev-info.component'
              ).then(c => c.CapDevInfoComponent)
          },
          {
            path: 'innovation-dev-info',
            loadComponent: () =>
              import(
                '../pages/results/pages/result-detail/pages/rd-result-types-pages/innovation-dev-info/innovation-dev-info.component'
              ).then(c => c.InnovationDevInfoComponent)
          },
          {
            path: 'innovation-use-info',
            loadComponent: () =>
              import(
                '../pages/results/pages/result-detail/pages/rd-result-types-pages/innovation-use-info/innovation-use-info.component'
              ).then(c => c.InnovationUseInfoComponent)
          },
          {
            path: 'knowledge-product-info',
            loadComponent: () =>
              import(
                '../pages/results/pages/result-detail/pages/rd-result-types-pages/knowledge-product-info/knowledge-product-info.component'
              ).then(c => c.KnowledgeProductInfoComponent)
          },
          {
            path: 'policy-change-info',
            loadComponent: () =>
              import(
                '../pages/results/pages/result-detail/pages/rd-result-types-pages/policy-change-info/policy-change-info.component'
              ).then(c => c.PolicyChangeInfoComponent)
          },
          {
            path: '**',
            pathMatch: 'full',
            redirectTo: 'general-information'
          }
        ]
      },
      {
        path: 'results-outlet',
        loadComponent: () =>
          import(
            '../pages/results/pages/results-outlet/results-outlet.component'
          ).then(c => c.ResultsOutletComponent),
        children: [
          {
            path: '',
            redirectTo: 'results-list',
            pathMatch: 'full'
          },
          {
            path: 'results-notifications',
            loadComponent: () =>
              import(
                '../pages/results/pages/results-outlet/pages/results-notifications/results-notifications.component'
              ).then(c => c.ResultsNotificationsComponent)
          },
          {
            path: 'results-list',
            loadComponent: () =>
              import(
                '../pages/results/pages/results-outlet/pages/results-list/results-list.component'
              ).then(c => c.ResultsListComponent)
          }
        ]
      }
    ]
  },
  {
    path: 'type-one-report',
    loadComponent: () =>
      import('../pages/type-one-report/type-one-report.component').then(
        c => c.TypeOneReportComponent
      ),
    children: [
      {
        path: '',
        redirectTo: 'fact-sheet',
        pathMatch: 'full'
      },
      {
        path: 'fact-sheet',
        loadComponent: () =>
          import(
            '../pages/type-one-report/pages/tor-fact-sheet/tor-fact-sheet.component'
          ).then(c => c.TorFactSheetComponent)
      },
      {
        path: 'toc-diagrams',
        loadComponent: () =>
          import(
            '../pages/type-one-report/pages/tor-toc-diagrams/tor-toc-diagrams.component'
          ).then(c => c.TorTocDiagramsComponent)
      },
      {
        path: 'key-results',
        loadComponent: () =>
          import(
            '../pages/type-one-report/pages/tor-key-results/tor-key-results.component'
          ).then(c => c.TorKeyResultsComponent)
      },
      {
        path: 'partnerships',
        loadComponent: () =>
          import(
            '../pages/type-one-report/pages/tor-partnerships/tor-partnerships.component'
          ).then(c => c.TorPartnershipsComponent)
      },
      {
        path: 'portfolio-linkages',
        loadComponent: () =>
          import(
            '../pages/type-one-report/pages/tor-portfolio-linkages/tor-portfolio-linkages.component'
          ).then(c => c.TorPortfolioLinkagesComponent)
      },
      {
        path: 'key-result-story',
        loadComponent: () =>
          import(
            '../pages/type-one-report/pages/tor-key-result-story/tor-key-result-story.component'
          ).then(c => c.TorKeyResultStoryComponent)
      },
      {
        path: 'white',
        loadComponent: () =>
          import(
            '../pages/type-one-report/pages/white-page/white-page.component'
          ).then(c => c.WhitePageComponent)
      }
    ]
  },
  {
    path: 'ipsr',
    loadComponent: () =>
      import('../pages/ipsr/ipsr.component').then(c => c.IpsrComponent),
    children: [
      {
        path: '',
        redirectTo: 'list',
        pathMatch: 'full'
      },
      // {
      //   path: 'creator'
      // },
      {
        path: 'list',
        loadComponent: () =>
          import(
            '../pages/ipsr/pages/innovation-package-list-content/innovation-package-list-content.component'
          ).then(c => c.InnovationPackageListContentComponent),
        children: [
          {
            path: '',
            redirectTo: 'innovation-list',
            pathMatch: 'full'
          },
          {
            path: 'innovation-list',
            loadComponent: () =>
              import(
                '../pages/ipsr/pages/innovation-package-list-content/pages/innovation-package-list/innovation-package-list.component'
              ).then(c => c.InnovationPackageListComponent)
          },
          {
            path: 'notifications',
            loadComponent: () =>
              import(
                '../pages/ipsr/pages/innovation-package-list-content/pages/innovation-packages-notification/innovation-packages-notification.component'
              ).then(c => c.InnovationPackagesNotificationComponent)
          }
        ]
      },
      {
        path: 'detail/:id',
        loadComponent: () =>
          import(
            '../pages/ipsr/pages/innovation-package-detail/innovation-package-detail.component'
          ).then(c => c.InnovationPackageDetailComponent),
        children: [
          {
            path: '',
            pathMatch: 'full',
            redirectTo: 'general-information'
          },
          {
            path: 'general-information',
            loadComponent: () =>
              import(
                '../pages/ipsr/pages/innovation-package-detail/pages/ipsr-general-information/ipsr-general-information.component'
              ).then(c => c.IpsrGeneralInformationComponent)
          },
          {
            path: 'contributors',
            loadComponent: () =>
              import(
                '../pages/ipsr/pages/innovation-package-detail/pages/ipsr-contributors/ipsr-contributors.component'
              ).then(c => c.IpsrContributorsComponent)
          },
          {
            path: 'ipsr-innovation-use-pathway',
            loadComponent: () =>
              import(
                '../pages/ipsr/pages/innovation-package-detail/pages/ipsr-innovation-use-pathway/ipsr-innovation-use-pathway.component'
              ).then(c => c.IpsrInnovationUsePathwayComponent),
            children: [
              {
                path: '',
                pathMatch: 'full',
                redirectTo: 'step-1'
              },
              {
                path: 'step-1',
                loadComponent: () =>
                  import(
                    '../pages/ipsr/pages/innovation-package-detail/pages/ipsr-innovation-use-pathway/pages/step-n1/step-n1.component'
                  ).then(c => c.StepN1Component)
              },
              {
                path: 'step-2',
                loadComponent: () =>
                  import(
                    '../pages/ipsr/pages/innovation-package-detail/pages/ipsr-innovation-use-pathway/pages/step-n2/step-n2.component'
                  ).then(c => c.StepN2Component),
                children: [
                  {
                    path: '',
                    pathMatch: 'full',
                    redirectTo: 'complementary-innovation'
                  },
                  {
                    path: 'basic-info',
                    loadComponent: () =>
                      import(
                        '../pages/ipsr/pages/innovation-package-detail/pages/ipsr-innovation-use-pathway/pages/step-n2/pages/step-two-basic-info/step-two-basic-info.component'
                      ).then(c => c.StepTwoBasicInfoComponent)
                  },
                  {
                    path: 'complementary-innovation',
                    loadComponent: () =>
                      import(
                        '../pages/ipsr/pages/innovation-package-detail/pages/ipsr-innovation-use-pathway/pages/step-n2/pages/complementary-innovation/complementary-innovation.component'
                      ).then(c => c.ComplementaryInnovationComponent)
                  }
                ]
              },
              {
                path: 'step-3',
                loadComponent: () =>
                  import(
                    '../pages/ipsr/pages/innovation-package-detail/pages/ipsr-innovation-use-pathway/pages/step-n3/step-n3.component'
                  ).then(c => c.StepN3Component)
              },
              {
                path: 'step-4',
                loadComponent: () =>
                  import(
                    '../pages/ipsr/pages/innovation-package-detail/pages/ipsr-innovation-use-pathway/pages/step-n4/step-n4.component'
                  ).then(c => c.StepN4Component)
              }
            ]
          },
          {
            path: 'link-to-results',
            loadComponent: () =>
              import(
                '../pages/ipsr/pages/innovation-package-detail/pages/ipsr-link-to-results/ipsr-link-to-results.component'
              ).then(c => c.IpsrLinkToResultsComponent)
          }
        ]
      }
    ]
  },
  {
    path: 'login',
    loadComponent: () =>
      import('../pages/login/login.component').then(c => c.LoginComponent)
  },
  {
    path: 'quality-assurance',
    loadComponent: () =>
      import('../pages/quality-assurance/quality-assurance.component').then(
        c => c.QualityAssuranceComponent
      )
  },
  {
    path: 'init-admin-module',
    loadComponent: () =>
      import('../pages/init-admin-section/init-admin-section.component').then(
        c => c.InitAdminSectionComponent
      ),
    children: [
      {
        path: '',
        redirectTo: 'init-completeness-status',
        pathMatch: 'full'
      },
      {
        path: 'init-completeness-status',
        loadComponent: () =>
          import(
            '../pages/init-admin-section/pages/init-completeness-status/init-completeness-status.component'
          ).then(c => c.InitCompletenessStatusComponent)
      },
      {
        path: 'init-general-results-report',
        loadComponent: () =>
          import(
            '../pages/init-admin-section/pages/init-general-results-report/init-general-results-report.component'
          ).then(c => c.InitGeneralResultsReportComponent)
      }
    ]
  },
  {
    path: 'admin-module',
    loadComponent: () =>
      import('../pages/admin-section/admin-section.component').then(
        c => c.AdminSectionComponent
      ),
    children: [
      {
        path: '',
        redirectTo: 'completeness-status',
        pathMatch: 'full'
      },
      {
        path: 'completeness-status',
        loadComponent: () =>
          import(
            '../pages/admin-section/pages/completeness-status/completeness-status.component'
          ).then(c => c.CompletenessStatusComponent)
      },
      {
        path: 'user-report',
        loadComponent: () =>
          import(
            '../pages/admin-section/pages/user-report/user-report.component'
          ).then(c => c.UserReportComponent)
      },
      {
        path: 'phase-management',
        loadComponent: () =>
          import(
            '../pages/admin-section/pages/phase-management/phase-management.component'
          ).then(c => c.PhaseManagementComponent),
        children: [
          {
            path: '',
            redirectTo: 'reporting',
            pathMatch: 'full'
          },
          {
            path: 'reporting',
            loadComponent: () =>
              import(
                '../pages/admin-section/pages/phase-management/pages/reporting/reporting.component'
              ).then(c => c.ReportingComponent)
          },
          {
            path: 'innovation-package',
            loadComponent: () =>
              import(
                '../pages/admin-section/pages/phase-management/pages/innovation-package/innovation-package.component'
              ).then(c => c.InnovationPackageComponent)
          }
        ]
      }
    ]
  }
];
