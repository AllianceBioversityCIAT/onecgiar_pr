import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { IpsrContributorsRoutingModule } from './ipsr-contributors-routing.module';
import { CustomFieldsModule } from '../../../../../../custom-fields/custom-fields.module';
import { IpsrContributorsComponent } from './ipsr-contributors.component';
import { TocInitiativeOutModule } from '../../../../../results/pages/result-detail/pages/rd-theory-of-change/components/shared/toc-initiative-out/toc-initiative-out.module';
import { IpsrContributorsTocComponent } from './components/ipsr-contributors-toc/ipsr-contributors-toc.component';
import { IpsrNonPooledProjectsComponent } from './components/ipsr-non-pooled-projects/ipsr-non-pooled-projects.component';
import { IpsrContributorsNonCgiarPartnersComponent } from './components/ipsr-contributors-non-cgiar-partners/ipsr-contributors-non-cgiar-partners.component';
import { IpsrContributorsCentersComponent } from './components/ipsr-contributors-centers/ipsr-contributors-centers.component';
import { TermPipe } from '../../../../../../internationalization/term.pipe';
import { Tooltip } from 'primeng/tooltip';
import { RdContributorsAndPartnersModule } from '../../../../../results/pages/result-detail/pages/rd-contributors-and-partners/rd-contributors-and-partners.module';

@NgModule({
  declarations: [
    IpsrContributorsComponent,
    IpsrContributorsTocComponent,
    IpsrNonPooledProjectsComponent,
    IpsrContributorsNonCgiarPartnersComponent,
    IpsrContributorsCentersComponent
  ],
  imports: [
    CommonModule,
    IpsrContributorsRoutingModule,
    CustomFieldsModule,
    TocInitiativeOutModule,
    TermPipe,
    Tooltip,
    RdContributorsAndPartnersModule
  ]
})
export class IpsrContributorsModule {}
