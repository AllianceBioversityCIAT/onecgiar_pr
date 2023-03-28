import { Route } from '@angular/router';

export interface PrRoute extends Route {
  prName?: string;
  prHide?: boolean | number;
  underConstruction?: boolean | number;
  onlytest?: boolean;
  backButton?: boolean;
}

export const IPSRRouting: PrRoute[] = [
  { prName: '', path: 'creator', loadChildren: () => import('../innovation-package-creator/innovation-package-creator.module').then(m => m.InnovationPackageCreatorModule) },
  { prName: '', path: 'list', loadChildren: () => import('../innovation-package-list/innovation-package-list.module').then(m => m.InnovationPackageListModule) },
  { prName: '', path: 'detail/:id', loadChildren: () => import('../innovation-package-detail/innovation-package-detail.module').then(m => m.InnovationPackageDetailModule) },
  { prName: '', path: '**', pathMatch: 'full', redirectTo: 'list' }
];

export const IPSRDetailRouting: PrRoute[] = [
  { prName: 'General information', underConstruction: false, path: 'general-information', loadChildren: () => import('../innovation-package-detail/pages/ipsr-general-information/ipsr-general-information.module').then(m => m.IpsrGeneralInformationModule) },
  { prName: 'Contributors', underConstruction: true, path: 'contributors', loadChildren: () => import('../innovation-package-detail/pages/ipsr-contributors/ipsr-contributors.module').then(m => m.IpsrContributorsModule) },
  { prName: 'IPSR Innovation use pathway', underConstruction: true, path: 'ipsr-innovation-use-pathway', loadChildren: () => import('../innovation-package-detail/pages/ipsr-innovation-use-pathway/ipsr-innovation-use-pathway.module').then(m => m.IpsrInnovationUsePathwayModule) },
  { prName: 'Link to results', underConstruction: true, path: 'link-to-results', loadChildren: () => import('../innovation-package-detail/pages/ipsr-link-to-results/ipsr-link-to-results.module').then(m => m.IpsrLinkToResultsModule) },
  { prName: '', path: '**', pathMatch: 'full', redirectTo: 'general-information' }
];

export const ipsrInnovationUsePathwayRouting: PrRoute[] = [
  { prName: '', underConstruction: true, path: 'step-1', loadChildren: () => import('../innovation-package-detail/pages/ipsr-innovation-use-pathway/pages/step-n1/step-n1.module').then(m => m.StepN1Module) },
  { prName: '', underConstruction: true, path: 'step-2', loadChildren: () => import('../innovation-package-detail/pages/ipsr-innovation-use-pathway/pages/step-n2/step-n2.module').then(m => m.StepN2Module) },
  { prName: '', underConstruction: true, path: 'step-3', loadChildren: () => import('../innovation-package-detail/pages/ipsr-innovation-use-pathway/pages/step-n3/step-n3.module').then(m => m.StepN3Module) },
  { prName: '', underConstruction: true, path: 'step-4', loadChildren: () => import('../innovation-package-detail/pages/ipsr-innovation-use-pathway/pages/step-n4/step-n4.module').then(m => m.StepN4Module) },
  { prName: '', path: '**', pathMatch: 'full', redirectTo: 'general-information' }
];
