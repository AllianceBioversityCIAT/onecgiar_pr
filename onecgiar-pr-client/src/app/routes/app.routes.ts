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
          // {
          //   path: '',
          //   redirectTo: 'general-information',
          //   pathMatch: 'full'
          // },
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
          // {
          //   path: 'knowledge-product-info'
          // },
          // {
          //   path: 'policy-change1-info'
          // },
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
    path: 'login',
    loadComponent: () =>
      import('../pages/login/login.component').then(c => c.LoginComponent)
  }
];
