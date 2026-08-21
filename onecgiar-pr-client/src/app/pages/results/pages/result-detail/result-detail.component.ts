import { Component, DoCheck, OnInit, OnDestroy, effect, inject, NgZone } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../../../shared/services/api/api.service';
import { DataControlService } from '../../../../shared/services/data-control.service';
import { SaveButtonService } from '../../../../custom-fields/save-button/save-button.service';
import { GreenChecksService } from '../../../../shared/services/global/green-checks.service';
import { ShareRequestModalService } from './components/share-request-modal/share-request-modal.service';
import { CurrentResultService } from '../../../../shared/services/current-result.service';
import { environment } from '../../../../../environments/environment';
import { PdfExportService } from '../../../../shared/services/pdf-export.service';

@Component({
  selector: 'app-result-detail',
  templateUrl: './result-detail.component.html',
  styleUrls: ['./result-detail.component.scss'],
  standalone: false
})
export class ResultDetailComponent implements OnInit, DoCheck, OnDestroy {
  private readonly pdfSE = inject(PdfExportService);
  private readonly ngZone = inject(NgZone);

  constructor(
    public currentResultSE: CurrentResultService,
    private readonly shareRequestModalSE: ShareRequestModalService,
    private readonly activatedRoute: ActivatedRoute,
    public api: ApiService,
    public saveButtonSE: SaveButtonService,
    public dataControlSE: DataControlService,
    private readonly greenChecksSE: GreenChecksService
  ) {
    effect(() => {
      const portfolio = this.dataControlSE.currentResultSignal()?.portfolio;
      if (portfolio !== undefined && this.api.resultsSE.currentResultId) {
        this.greenChecksSE.getGreenChecks();
      }
    });
  }
  closeInfo = false;

  ngOnInit(): void {
    this.getData();
  }

  ngOnDestroy(): void {
    this.pdfSE.disable();
  }

  private getPdfLink(): string {
    return `${environment.frontBaseUrl}reports/result-details/${this.api.resultsSE.currentResultCode}?phase=${this.api.resultsSE.currentResultPhase}`;
  }

  async getData() {
    this.dataControlSE.currentResult = null;
    this.dataControlSE.currentResultSignal.set({});
    this.api.resultsSE.currentResultId = null;
    this.api.resultsSE.currentResultCode = null;
    this.api.resultsSE.currentResultPhase = null;
    this.api.updateUserData(() => {});
    this.api.resultsSE.currentResultCode = this.activatedRoute.snapshot.paramMap.get('id');
    this.api.resultsSE.currentResultPhase = this.activatedRoute.snapshot.queryParamMap.get('phase');
    this.pdfSE.link.set(this.getPdfLink());
    this.pdfSE.enabled.set(true);
    await this.GET_resultIdToCode();

    this.currentResultSE.GET_resultById();
    this.greenChecksSE.getGreenChecks();
    this.GET_versioningResult();

    this.shareRequestModalSE.inNotifications = false;
  }

  GET_resultIdToCode() {
    this.currentResultSE.resultIdIsconverted = false;
    return new Promise((resolve, reject) => {
      this.api.resultsSE.GET_resultIdToCode(this.api.resultsSE.currentResultCode, this.api.resultsSE.currentResultPhase).subscribe({
        next: ({ response }) => {
          this.api.resultsSE.currentResultId = response;
          this.currentResultSE.resultIdIsconverted = true;
          resolve(null);
        },
        error: () => {
          resolve(null);
        }
      });
    });
  }
  GET_versioningResult() {
    this.api.resultsSE.GET_versioningResult().subscribe(({ response }) => {
      this.api.dataControlSE.resultPhaseList = response;
    });
  }

  /** Throttle for the mandatory-field DOM scan (was running ~2000×/s via a self-sustaining setTimeout). */
  private static readonly SCAN_THROTTLE_MS = 150;
  private lastScanAt = 0;
  private scanScheduled = false;
  private trailingScanId: any = null;

  ngDoCheck(): void {
    // The mandatory-field feedback scan reads the DOM (forces reflow). Running it on every
    // change-detection cycle — and via setTimeout, which itself re-triggered CD — produced a
    // self-sustaining loop scanning the DOM thousands of times per second. (P2-2967/P2-2969)
    // Now: throttled (leading + trailing edge), coalesced into a single rAF, run OUTSIDE Angular's
    // zone so it never re-triggers CD. A single CD tick is requested only when the result changed.
    if (this.scanScheduled) return;
    const elapsed = Date.now() - this.lastScanAt;
    if (elapsed >= ResultDetailComponent.SCAN_THROTTLE_MS) {
      this.runFeedbackScan();
    } else if (this.trailingScanId === null) {
      // Trailing edge: guarantees the final state is scanned even if no further CD fires.
      this.ngZone.runOutsideAngular(() => {
        this.trailingScanId = setTimeout(() => {
          this.trailingScanId = null;
          this.runFeedbackScan();
        }, ResultDetailComponent.SCAN_THROTTLE_MS - elapsed);
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
        const before = this.api.dataControlSE.fieldFeedbackList();
        this.api.dataControlSE.someMandatoryFieldIncompleteResultDetail('.section_container');
        if (this.api.dataControlSE.fieldFeedbackList() !== before) {
          // Feedback list changed → re-enter the zone for one tick so the "X alerts" box repaints.
          this.ngZone.run(() => {});
        }
      });
    });
  }
}
