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
      }
    ]
  },
  {
    path: 'login',
    loadComponent: () =>
      import('../pages/login/login.component').then(c => c.LoginComponent)
  }
];
