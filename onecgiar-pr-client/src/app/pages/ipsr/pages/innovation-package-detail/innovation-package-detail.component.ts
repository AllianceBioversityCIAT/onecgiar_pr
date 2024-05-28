/* eslint-disable camelcase */
import { Component, DoCheck, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { IpsrDataControlService } from '../../services/ipsr-data-control.service';
import { ApiService } from '../../../../shared/services/api/api.service';
import { SaveButtonService } from '../../../../custom-fields/save-button/save-button.service';
import { IpsrCompletenessStatusService } from '../../services/ipsr-completeness-status.service';
import { DataControlService } from '../../../../shared/services/data-control.service';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-innovation-package-detail',
  templateUrl: './innovation-package-detail.component.html',
  styleUrls: ['./innovation-package-detail.component.scss'],
  providers: [MessageService]
})
export class InnovationPackageDetailComponent implements OnInit, DoCheck {
  constructor(
    private activatedRoute: ActivatedRoute,
    private messageSE: MessageService,
    public ipsrDataControlSE: IpsrDataControlService,
    public api: ApiService,
    public saveButtonSE: SaveButtonService,
    private ipsrCompletenessStatusSE: IpsrCompletenessStatusService,
    private dataControlSE: DataControlService,
    private router: Router
  ) {}
  ngOnInit(): void {
    this.ipsrDataControlSE.resultInnovationId = null;
    this.ipsrDataControlSE.resultInnovationCode = this.activatedRoute.snapshot.paramMap.get('id');
    this.ipsrDataControlSE.resultInnovationPhase = this.activatedRoute.snapshot.queryParams['phase'];
    this.GET_resultIdToCode(() => {
      this.api.GETInnovationPackageDetail();
      this.ipsrCompletenessStatusSE.updateGreenChecks();
      this.getIPSRPhases();
    });
  }

  onCopy() {
    this.messageSE.add({ key: 'copyResultLinkPdf', severity: 'success', summary: 'PDF link copied' });
  }

  GET_resultIdToCode(callback) {
    this.api.resultsSE.GET_resultIdToCode(this.ipsrDataControlSE.resultInnovationCode, this.ipsrDataControlSE.resultInnovationPhase).subscribe({
      next: ({ response }) => {
        this.ipsrDataControlSE.resultInnovationId = response;
        callback?.();
      },
      error: err => {
        if (err.error.statusCode == 404) this.router.navigate([`/ipsr/list/innovation-list`]);
        this.api.alertsFe.show({ id: 'reportResultError', title: 'Error!', description: 'Result not found.', status: 'error' });
      }
    });
  }

  getIPSRPhases() {
    this.api.resultsSE.GET_versioningResult().subscribe(({ response }) => {
      this.ipsrDataControlSE.ipsrPhaseList = response;
    });
  }

  ngDoCheck(): void {
    this.api.dataControlSE.someMandatoryFieldIncompleteResultDetail('.section_container');
  }
}
