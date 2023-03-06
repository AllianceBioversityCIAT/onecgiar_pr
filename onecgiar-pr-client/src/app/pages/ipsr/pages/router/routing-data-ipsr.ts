import { Route } from '@angular/router';

export interface PrRoute extends Route {
  prName?: string;
  prHide?: boolean | number;
  underConstruction?: boolean | number;
  onlytest?: boolean;
}

export const IPSRRouting: PrRoute[] = [
  { prName: '', path: 'creator', loadChildren: () => import('../innovation-package-creator/innovation-package-creator.component').then(m => m.InnovationPackageCreatorComponent) },
  { prName: '', path: 'detail/:id', loadChildren: () => import('../innovation-package-detail/innovation-package-detail.module').then(m => m.InnovationPackageDetailModule) },
  { prName: '', path: 'list', loadChildren: () => import('../innovation-package-list/innovation-package-list.module').then(m => m.InnovationPackageListModule) },
  { prName: '', path: '**', pathMatch: 'full', redirectTo: 'list' }
];
