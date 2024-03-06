import { Component, OnInit } from '@angular/core';
import { RolesService } from '../../../../../../shared/services/global/roles.service';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { ContributorsBody } from './model/contributorsBody';
import { RdTheoryOfChangesServicesService } from '../../../../../results/pages/result-detail/pages/rd-theory-of-change/rd-theory-of-changes-services.service';
import { SaveButtonComponent } from '../../../../../../custom-fields/save-button/save-button.component';
import { IpsrContributorsTocComponent } from './components/ipsr-contributors-toc/ipsr-contributors-toc.component';
import { IpsrNonPooledProjectsComponent } from './components/ipsr-non-pooled-projects/ipsr-non-pooled-projects.component';
import { IpsrContributorsNonCgiarPartnersComponent } from './components/ipsr-contributors-non-cgiar-partners/ipsr-contributors-non-cgiar-partners.component';
import { IpsrContributorsCentersComponent } from './components/ipsr-contributors-centers/ipsr-contributors-centers.component';

@Component({
  selector: 'app-ipsr-contributors',
  standalone: true,
  templateUrl: './ipsr-contributors.component.html',
  styleUrls: ['./ipsr-contributors.component.scss'],
  imports: [
    SaveButtonComponent,
    IpsrContributorsTocComponent,
    IpsrNonPooledProjectsComponent,
    IpsrContributorsNonCgiarPartnersComponent,
    IpsrContributorsCentersComponent
  ]
})
export class IpsrContributorsComponent implements OnInit {
  contributorsBody = new ContributorsBody();

  constructor(
    public api: ApiService,
    public rolesSE: RolesService,
    public theoryOfChangesServices: RdTheoryOfChangesServicesService
  ) {}

  ngOnInit(): void {
    this.getSectionInformation();
    this.requestEvent();
    this.api.dataControlSE.detailSectionTitle('Contributors');
    this.api.resultsSE.ipsrDataControlSE.inContributos = true;
  }

  getSectionInformation() {
    this.api.resultsSE
      .GETContributorsByIpsrResultId()
      .subscribe(({ response }) => {
        this.contributorsBody = response;
        this.contributorsBody.contributors_result_toc_result.forEach(
          item => (item.planned_result = Boolean(item.planned_result))
        );
        this.contributorsBody.institutions.forEach(
          item => (item.institutions_type_name = item.institutions_name)
        );

        this.theoryOfChangesServices.theoryOfChangeBody = this.contributorsBody;

        if (
          this.contributorsBody?.result_toc_result?.result_toc_results !== null
        ) {
          this.theoryOfChangesServices.result_toc_result =
            this.contributorsBody?.result_toc_result;
          this.theoryOfChangesServices.result_toc_result.planned_result =
            this.contributorsBody?.result_toc_result?.result_toc_results[0]
              .planned_result ?? null;
          this.theoryOfChangesServices.result_toc_result.showMultipleWPsContent =
            true;
        }

        if (this.contributorsBody?.contributors_result_toc_result !== null) {
          this.theoryOfChangesServices.contributors_result_toc_result =
            this.contributorsBody?.contributors_result_toc_result;
          this.theoryOfChangesServices.contributors_result_toc_result.forEach(
            (tab: any, index) => {
              tab.planned_result =
                tab.result_toc_results[0].planned_result ?? null;
              tab.index = index;
              tab.showMultipleWPsContent = true;
            }
          );
        }
      });
  }

  onSaveSection() {
    this.contributorsBody.result_toc_result =
      this.theoryOfChangesServices.theoryOfChangeBody.result_toc_result;

    this.contributorsBody.contributors_result_toc_result =
      this.theoryOfChangesServices.contributors_result_toc_result;

    this.api.resultsSE
      .PATCHContributorsByIpsrResultId(this.contributorsBody)
      .subscribe(({ response }) => {
        this.getSectionInformation();
      });
  }

  requestEvent() {
    this.api.dataControlSE.findClassTenSeconds('alert-event').then(() => {
      try {
        document.querySelector('.alert-event').addEventListener('click', () => {
          this.api.dataControlSE.showPartnersRequest = true;
        });
      } catch (error) {
        console.error('error', error);
      }
    });
    this.api.dataControlSE.findClassTenSeconds('alert-event-2').then(resp => {
      try {
        document
          .querySelector('.alert-event-2')
          .addEventListener('click', e => {
            this.api.dataControlSE.showPartnersRequest = true;
          });
      } catch (error) {
        console.error('error', error);
      }
    });
  }
}
