import { Route } from '@angular/router';

export interface PrRoute extends Route {
  prName?: string;
  prHide?: boolean | number;
  underConstruction?: boolean | number;
  onlytest?: boolean;
  backButton?: boolean;
}

export const IPSRRouting: PrRoute[] = [
  {
    prName: '',
    path: 'creator',
    loadChildren: () => import('../innovation-package-creator/innovation-package-creator.module').then(m => m.InnovationPackageCreatorModule)
  },
  {
    prName: '',
    path: 'list',
    loadChildren: () =>
      import('../innovation-package-list-content/innovation-package-list-content.module').then(m => m.InnovationPackageListContentModule)
  },
  {
    prName: '',
    path: 'detail/:id',
    loadChildren: () => import('../innovation-package-detail/innovation-package-detail.module').then(m => m.InnovationPackageDetailModule)
  },
  { prName: '', path: '**', pathMatch: 'full', redirectTo: 'list' }
];

export const IPSRDetailRouting: PrRoute[] = [
  {
    prName: 'General information',
    underConstruction: false,
    path: 'general-information',
    loadChildren: () =>
      import('../innovation-package-detail/pages/ipsr-general-information/ipsr-general-information.module').then(m => m.IpsrGeneralInformationModule)
  },
  {
    prName: 'Contributors',
    underConstruction: false,
    path: 'contributors',
    loadChildren: () => import('../innovation-package-detail/pages/ipsr-contributors/ipsr-contributors.module').then(m => m.IpsrContributorsModule)
  },
  {
    prName: 'IPSR Innovation use pathway',
    underConstruction: false,
    path: 'ipsr-innovation-use-pathway',
    loadChildren: () =>
      import('../innovation-package-detail/pages/ipsr-innovation-use-pathway/ipsr-innovation-use-pathway.module').then(
        m => m.IpsrInnovationUsePathwayModule
      )
  },
  {
    prName: 'Link to results',
    underConstruction: false,
    path: 'link-to-results',
    loadChildren: () =>
      import('../innovation-package-detail/pages/ipsr-link-to-results/ipsr-link-to-results.module').then(m => m.IpsrLinkToResultsModule)
  },
  { prName: '', path: '**', pathMatch: 'full', redirectTo: 'general-information' }
];

export const ipsrInnovationUsePathwayRouting: PrRoute[] = [
  {
    prName: '',
    underConstruction: false,
    path: 'step-1',
    loadChildren: () =>
      import('../innovation-package-detail/pages/ipsr-innovation-use-pathway/pages/step-n1/step-n1.module').then(m => m.StepN1Module)
  },
  {
    prName: '',
    underConstruction: false,
    path: 'step-2',
    loadChildren: () =>
      import('../innovation-package-detail/pages/ipsr-innovation-use-pathway/pages/step-n2/step-n2.module').then(m => m.StepN2Module)
  },
  {
    prName: '',
    underConstruction: false,
    path: 'step-3',
    loadChildren: () =>
      import('../innovation-package-detail/pages/ipsr-innovation-use-pathway/pages/step-n3/step-n3.module').then(m => m.StepN3Module)
  },
  {
    prName: '',
    underConstruction: false,
    path: 'step-4',
    loadChildren: () =>
      import('../innovation-package-detail/pages/ipsr-innovation-use-pathway/pages/step-n4/step-n4.module').then(m => m.StepN4Module)
  },
  { prName: '', path: '**', pathMatch: 'full', redirectTo: 'step-1' }
];

export const ipsrInnovationUsePathwayStep2Routing: PrRoute[] = [
  {
    prName: '',
    underConstruction: true,
    path: 'complementary-innovation',
    loadChildren: () =>
      import(
        '../innovation-package-detail/pages/ipsr-innovation-use-pathway/pages/step-n2/pages/complementary-innovation/complementary-innovation.module'
      ).then(m => m.ComplementaryInnovationModule)
  },
  {
    prName: 'Basic Info',
    underConstruction: true,
    path: 'basic-info',
    loadChildren: () =>
      import(
        '../innovation-package-detail/pages/ipsr-innovation-use-pathway/pages/step-n2/pages/step-two-basic-info/step-two-basic-info-routing.module'
      ).then(m => m.StepTwoBasicInfoRoutingModule)
  },
  { prName: '', path: '**', pathMatch: 'full', redirectTo: 'complementary-innovation' }
];

export const ipsrInnovationPackageListContent: PrRoute[] = [
  {
    prName: '',
    underConstruction: true,
    path: 'innovation-list',
    loadChildren: () =>
      import('../innovation-package-list-content/pages/innovation-package-list/innovation-package-list.module').then(
        m => m.InnovationPackageListModule
      )
  },
  {
    prName: 'Notifications',
    path: 'notifications',
    loadChildren: () =>
      import('../innovation-package-list-content/pages/innovation-packages-notification/innovation-packages-notification.module').then(
        m => m.InnovationPackagesNotificationModule
      )
  },
  { prName: '', path: '**', pathMatch: 'full', redirectTo: 'innovation-list' }
];
