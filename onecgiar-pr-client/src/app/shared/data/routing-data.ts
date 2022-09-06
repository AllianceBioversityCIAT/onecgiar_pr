import { Routes, Route } from '@angular/router';

export const routingApp: PrRoute[] = [
  { prName: 'Home', path: 'home', loadChildren: () => import('../../pages/home/home.module').then(m => m.HomeModule) },
  { prName: 'Result', path: 'result', loadChildren: () => import('../../pages/results/results.module').then(m => m.ResultsModule) },
  { prName: 'Type one report', path: 'type-one-report', loadChildren: () => import('../../pages/type-one-report/type-one-report.module').then(m => m.TypeOneReportModule) },
  { prName: '', path: '**', pathMatch: 'full', redirectTo: 'result' }
];

export const resultRouting: PrRoute[] = [
  { prName: 'Result Creator', path: 'result-creator', loadChildren: () => import('../../pages/results/pages/result-creator/result-creator.module').then(m => m.ResultCreatorModule) },
  { prName: 'Result detail', path: 'result-detail/:id', loadChildren: () => import('../../pages/results/pages/result-detail/result-detail.module').then(m => m.ResultDetailModule) },
  { prName: '', path: 'results-list', loadChildren: () => import('../../pages/results/pages//results-list/results-list.module').then(m => m.ResultsListModule) },
  { prName: '', path: '**', pathMatch: 'full', redirectTo: 'results-list' }
];

export const resultDetailRouting: PrRoute[] = [
  { prName: 'General information', path: 'general-information', loadChildren: () => import('../../pages/results/pages/result-detail/pages/general-information/general-information.module').then(m => m.GeneralInformationModule) },
  { prName: 'Theory of change', path: 'theory-of-change', loadChildren: () => import('../../pages/results/pages/result-detail/pages/theory-of-change/theory-of-change.module').then(m => m.TheoryOfChangeModule) },
  { prName: 'Policy info', path: 'theory-of-change', loadChildren: () => import('../../pages/results/pages/result-detail/pages/theory-of-change/theory-of-change.module').then(m => m.TheoryOfChangeModule) },
  { prName: 'Contributors', path: 'theory-of-change', loadChildren: () => import('../../pages/results/pages/result-detail/pages/theory-of-change/theory-of-change.module').then(m => m.TheoryOfChangeModule) },
  { prName: 'Partners', path: 'theory-of-change', loadChildren: () => import('../../pages/results/pages/result-detail/pages/theory-of-change/theory-of-change.module').then(m => m.TheoryOfChangeModule) },
  { prName: 'Geographic location', path: 'theory-of-change', loadChildren: () => import('../../pages/results/pages/result-detail/pages/theory-of-change/theory-of-change.module').then(m => m.TheoryOfChangeModule) },
  { prName: 'Evidences', path: 'theory-of-change', loadChildren: () => import('../../pages/results/pages/result-detail/pages/theory-of-change/theory-of-change.module').then(m => m.TheoryOfChangeModule) },
  { prName: 'Links to results', path: 'theory-of-change', loadChildren: () => import('../../pages/results/pages/result-detail/pages/theory-of-change/theory-of-change.module').then(m => m.TheoryOfChangeModule) }
];

export interface PrRoute extends Route {
  prName: string;
}
