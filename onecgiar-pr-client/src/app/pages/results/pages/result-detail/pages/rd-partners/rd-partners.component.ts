import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { InstitutionsService } from '../../../../../../shared/services/global/institutions.service';
import { PartnersBody } from './models/partnersBody';
import { RolesService } from '../../../../../../shared/services/global/roles.service';
import { RdPartnersService } from './rd-partners.service';
import { CustomizedAlertsFeService } from '../../../../../../shared/services/customized-alerts-fe.service';
import { CommonModule } from '@angular/common';
import { DetailSectionTitleComponent } from '../../../../../../custom-fields/detail-section-title/detail-section-title.component';
import { AlertStatusComponent } from '../../../../../../custom-fields/alert-status/alert-status.component';
import { SaveButtonComponent } from '../../../../../../custom-fields/save-button/save-button.component';
import { SyncButtonComponent } from '../../../../../../custom-fields/sync-button/sync-button.component';
import { KnowledgeProductSelectorComponent } from './components/knowledge-product-selector/knowledge-product-selector.component';
import { NormalSelectorComponent } from './components/normal-selector/normal-selector.component';

@Component({
  selector: 'app-rd-partners',
  standalone: true,
  templateUrl: './rd-partners.component.html',
  styleUrls: ['./rd-partners.component.scss'],
  imports: [
    CommonModule,
    DetailSectionTitleComponent,
    AlertStatusComponent,
    SaveButtonComponent,
    SyncButtonComponent,
    KnowledgeProductSelectorComponent,
    NormalSelectorComponent
  ]
})
export class RdPartnersComponent implements OnInit {
  primaryText = ' - <strong>Primary</strong> ';

  resultCode = this?.api?.dataControlSE?.currentResult?.result_code;
  versionId = this?.api?.dataControlSE?.currentResult?.version_id;

  alertStatusMessage: string = `This section displays CGIAR Center partners as they appear in <a class="open_route" href="/result/result-detail/${this.resultCode}/theory-of-change?phase=${this.versionId}" target="_blank">Section 2, Theory of Change</a>.</li> Should you identify any inconsistencies, please update Section 2`;

  constructor(
    public api: ApiService,
    public institutionsSE: InstitutionsService,
    public rolesSE: RolesService,
    public rdPartnersSE: RdPartnersService,
    private customizedAlertsFeSE: CustomizedAlertsFeService
  ) {}

  ngOnInit(): void {
    this.rdPartnersSE.partnersBody = new PartnersBody();
    this.rdPartnersSE.getSectionInformation();
    this.rdPartnersSE.getCenterInformation();
    this.api.dataControlSE.findClassTenSeconds('alert-event').then(resp => {
      try {
        document.querySelectorAll('.alert-event').forEach(element => {
          element.addEventListener('click', e => {
            this.api.dataControlSE.showPartnersRequest = true;
          });
        });
      } catch (error) {}
    });
  }

  onSyncSection() {
    const confirmationMessage = `Sync result with CGSpace? <br/> Unsaved changes in the section will be lost. `;

    this.customizedAlertsFeSE.show(
      {
        id: 'delete-tab',
        title: 'Sync confirmation',
        description: confirmationMessage,
        status: 'warning',
        confirmText: 'Yes, sync information'
      },
      () => {
        this.api.resultsSE.PATCH_resyncKnowledgeProducts().subscribe(resp => {
          this.rdPartnersSE.getSectionInformation();
        });
      }
    );
  }

  onSaveSection() {
    if (this.rdPartnersSE.partnersBody.no_applicable_partner)
      this.rdPartnersSE.partnersBody.institutions = [];
    this.api.resultsSE
      .PATCH_partnersSection(this.rdPartnersSE.partnersBody)
      .subscribe(resp => {
        this.rdPartnersSE.getSectionInformation();
      });
  }
}
