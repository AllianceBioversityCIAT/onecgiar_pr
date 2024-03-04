import { Component } from '@angular/core';
import { RolesService } from '../../../../../../../../shared/services/global/roles.service';
import { RdPartnersService } from '../../rd-partners.service';
import { InstitutionsService } from '../../../../../../../../shared/services/global/institutions.service';
import { GreenChecksService } from '../../../../../../../../shared/services/global/green-checks.service';
import { DataControlService } from '../../../../../../../../shared/services/data-control.service';
import { ApiService } from '../../../../../../../../shared/services/api/api.service';
import { CommonModule } from '@angular/common';
import { AlertStatusComponent } from '../../../../../../../../custom-fields/alert-status/alert-status.component';
import { FormsModule } from '@angular/forms';
import { PrMultiSelectComponent } from '../../../../../../../../custom-fields/pr-multi-select/pr-multi-select.component';
import { PrFieldHeaderComponent } from 'src/app/custom-fields/pr-field-header/pr-field-header.component';
import { CountInstitutionsTypesPipe } from '../../../rd-general-information/pipes/count-institutions-types.pipe';
import { FeedbackValidationDirective } from '../../../../../../../../shared/directives/feedback-validation.directive';

@Component({
  selector: 'app-normal-selector',
  standalone: true,
  templateUrl: './normal-selector.component.html',
  styleUrls: ['./normal-selector.component.scss'],
  imports: [
    CommonModule,
    FormsModule,
    AlertStatusComponent,
    PrMultiSelectComponent,
    PrFieldHeaderComponent,
    CountInstitutionsTypesPipe,
    FeedbackValidationDirective
  ]
})
export class NormalSelectorComponent {
  resultCode = this?.api?.dataControlSE?.currentResult?.result_code;
  versionId = this?.api?.dataControlSE?.currentResult?.version_id;

  alertStatusMessage: string = `Partner organizations you collaborated with or are currently collaborating with to generate this result. <li>Please note that CGIAR Centers are not listed here. They are directly linked to <a class="open_route" href="/result/result-detail/${this.resultCode}/theory-of-change?phase=${this.versionId}" target="_blank">Section 2, Theory of Change</a>.</li>`;
  disableOptions: any[] = null;

  partnerUniqueTypes = [];

  constructor(
    public api: ApiService,
    public rolesSE: RolesService,
    public rdPartnersSE: RdPartnersService,
    public institutionsSE: InstitutionsService,
    public greenChecksSE: GreenChecksService,
    public dataControlSE: DataControlService
  ) {}

  getDisableOptions() {
    this.disableOptions = [];

    if (this.rdPartnersSE?.partnersBody?.mqap_institutions) {
      this.disableOptions =
        this.rdPartnersSE.partnersBody.mqap_institutions.map(
          element => element?.user_matched_institution
        );
    }
  }

  getOnlyPartnerTypes() {
    const partnerTypes = this.rdPartnersSE.partnersBody.institutions.map(
      element => element?.institutions_type_name
    );
    this.partnerUniqueTypes = Array.from(new Set(partnerTypes));
  }
}
