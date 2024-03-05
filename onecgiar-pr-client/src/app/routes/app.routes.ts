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
      }
      // {

      //   path: 'white',
      //   loadComponent: () =>
      //     import(
      //       '../pages/type-one-report/pages/tor-white/tor-white.component'
      //     ).then(c => c.WhiteComponent)
      // },
    ]
  },
  {
    path: 'login',
    loadComponent: () =>
      import('../pages/login/login.component').then(c => c.LoginComponent)
  }
];
