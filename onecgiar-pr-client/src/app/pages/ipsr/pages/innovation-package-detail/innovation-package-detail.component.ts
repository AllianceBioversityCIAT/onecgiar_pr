/* eslint-disable camelcase */
import { Component, DoCheck, OnInit, inject, NgZone } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { IpsrDataControlService } from '../../services/ipsr-data-control.service';
import { ApiService } from '../../../../shared/services/api/api.service';
import { SaveButtonService } from '../../../../custom-fields/save-button/save-button.service';
import { IpsrCompletenessStatusService } from '../../services/ipsr-completeness-status.service';
import { DataControlService } from '../../../../shared/services/data-control.service';
import { MessageService } from 'primeng/api';
import { FieldsManagerService } from '../../../../shared/services/fields-manager.service';

@Component({
  selector: 'app-innovation-package-detail',
  templateUrl: './innovation-package-detail.component.html',
  styleUrls: ['./innovation-package-detail.component.scss'],
  providers: [MessageService],
  standalone: false
})
export class InnovationPackageDetailComponent implements OnInit, DoCheck {
  fieldsManagerSE = inject(FieldsManagerService);
  private readonly ngZone = inject(NgZone);

  constructor(
    private readonly activatedRoute: ActivatedRoute,
    private readonly messageSE: MessageService,
    public ipsrDataControlSE: IpsrDataControlService,
    public api: ApiService,
    public saveButtonSE: SaveButtonService,
    private readonly ipsrCompletenessStatusSE: IpsrCompletenessStatusService,
    public dataControlSE: DataControlService,
    private readonly router: Router
  ) {}
  ngOnInit(): void {
    this.ipsrDataControlSE.resultInnovationId = null;
    this.ipsrDataControlSE.resultInnovationCode = this.activatedRoute.snapshot.paramMap.get('id');
    this.ipsrDataControlSE.resultInnovationPhase = this.activatedRoute.snapshot.queryParams['phase'];
    this.GET_resultIdToCode(() => {
      this.api.GETInnovationPackageDetail(() => this.ipsrCompletenessStatusSE.updateGreenChecks());
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

  /** Throttle for the mandatory-field DOM scan (was a self-sustaining setTimeout per CD cycle). */
  private static readonly SCAN_THROTTLE_MS = 150;
  private lastScanAt = 0;
  private scanScheduled = false;
  private trailingScanId: any = null;

  ngDoCheck(): void {
    // Same fix as Result Detail (P2-2967/P2-2972): throttle (leading + trailing edge) the DOM scan,
    // coalesce into one rAF run OUTSIDE Angular's zone (no self-sustaining CD loop), tick only on change.
    if (this.scanScheduled) return;
    const elapsed = Date.now() - this.lastScanAt;
    if (elapsed >= InnovationPackageDetailComponent.SCAN_THROTTLE_MS) {
      this.runFeedbackScan();
    } else if (this.trailingScanId === null) {
      this.ngZone.runOutsideAngular(() => {
        this.trailingScanId = setTimeout(() => {
          this.trailingScanId = null;
          this.runFeedbackScan();
        }, InnovationPackageDetailComponent.SCAN_THROTTLE_MS - elapsed);
      });
    }
  }

  private runFeedbackScan(): void {
    if (this.trailingScanId !== null) {
      clearTimeout(this.trailingScanId);
      this.trailingScanId = null;
    }
    this.lastScanAt = Date.now();
    this.scanScheduled = true;
    this.ngZone.runOutsideAngular(() => {
      requestAnimationFrame(() => {
        this.scanScheduled = false;
        const before = this.dataControlSE.fieldFeedbackList();
        this.dataControlSE.someMandatoryFieldIncompleteResultDetail('.section_container');
        if (this.dataControlSE.fieldFeedbackList() !== before) {
          this.ngZone.run(() => {});
        }
      });
    });
  }
}
