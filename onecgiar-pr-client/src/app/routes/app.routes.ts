import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'result',
    loadComponent: () =>
      import('../pages/results/results.component').then(
        c => c.ResultsComponent
      ),
    children: [
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
            path: 'general-information',
            loadComponent: () =>
              import(
                '../pages/results/pages/result-detail/pages/rd-general-information/rd-general-information.component'
              ).then(c => c.RdGeneralInformationComponent)
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
