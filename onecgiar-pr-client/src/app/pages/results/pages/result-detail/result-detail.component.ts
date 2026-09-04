import { Component, DoCheck, ElementRef, OnInit, OnDestroy, ViewChild, effect, inject, signal, NgZone } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../../../shared/services/api/api.service';
import { DataControlService } from '../../../../shared/services/data-control.service';
import { SaveButtonService } from '../../../../custom-fields/save-button/save-button.service';
import { GreenChecksService } from '../../../../shared/services/global/green-checks.service';
import { ShareRequestModalService } from './components/share-request-modal/share-request-modal.service';
import { CurrentResultService } from '../../../../shared/services/current-result.service';
import { environment } from '../../../../../environments/environment';
import { PdfExportService } from '../../../../shared/services/pdf-export.service';
import { SectionBottomBarSlotService } from './components/section-bottom-bar/section-bottom-bar-slot.service';
import { ResultSectionsService } from './components/result-sections-sidebar/result-sections.service';
import { PhasesService } from '../../../../shared/services/global/phases.service';
import { Phases } from '../../../../shared/interfaces/phasesList.interface';

@Component({
  selector: 'app-result-detail',
  templateUrl: './result-detail.component.html',
  styleUrls: ['./result-detail.component.scss'],
  standalone: false
})
export class ResultDetailComponent implements OnInit, DoCheck, OnDestroy {
  private readonly pdfSE = inject(PdfExportService);
  private readonly ngZone = inject(NgZone);
  private readonly bottomBarSlotSE = inject(SectionBottomBarSlotService);
  private readonly router = inject(Router);
  private readonly phasesSE = inject(PhasesService);

  /**
   * Phases this result code DOES have a version in, newest first. Only filled when the requested
   * code/phase pair came back 404: it is what turns "not found" into something the user can act
   * on. Also published to `dataControlSE.resultPhaseList`, which is the app's canonical holder.
   */
  readonly availablePhases = signal<Phases[]>([]);
  /** Público: el template lee de aquí el número y el nombre de la sección abierta. */
  readonly sectionsSE = inject(ResultSectionsService);

  /** Floor of the content column; each section's bottom bar teleports its host node in here. */
  @ViewChild('bottomBarSlot', { static: true }) bottomBarSlot!: ElementRef<HTMLElement>;

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
    // Published here, NOT in ngAfterViewInit: Angular runs a child's `ngAfterViewInit` before its
    // parent's, so a section mounting in the same pass would look for the slot and find nothing.
    // `static: true` on the query is what makes the element already available this early.
    this.bottomBarSlotSE.slot.set(this.bottomBarSlot.nativeElement);
    this.getData();
  }

  ngOnDestroy(): void {
    this.pdfSE.disable();
    // The slot dies with this view; leaving a detached node published would send the next
    // section's bar into a DOM fragment nobody renders.
    this.bottomBarSlotSE.slot.set(null);
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
    this.availablePhases.set([]);
    this.api.updateUserData(() => {});
    this.api.resultsSE.currentResultCode = this.activatedRoute.snapshot.paramMap.get('id');
    this.api.resultsSE.currentResultPhase = this.activatedRoute.snapshot.queryParamMap.get('phase');
    this.pdfSE.link.set(this.getPdfLink());
    this.pdfSE.enabled.set(true);
    this.shareRequestModalSE.inNotifications = false;
    await this.GET_resultIdToCode();

    // The conversion is the gate, not a formality: without an id `GET_resultById` would ask for
    // `results/get/null` (a 400 that reads like a broken backend) and the other two GETs would
    // spend a round trip each to answer nothing. The screen explains itself instead.
    if (this.currentResultSE.resultLoadFailure()) {
      if (this.currentResultSE.resultLoadFailure() === 'not-found') this.GET_phasesOfResultCode();
      return;
    }

    this.currentResultSE.GET_resultById();
    this.greenChecksSE.getGreenChecks();
    this.GET_versioningResult();
  }

  GET_resultIdToCode() {
    this.currentResultSE.resultIdIsconverted = false;
    this.currentResultSE.resultLoadFailure.set(null);
    return new Promise(resolve => {
      this.api.resultsSE.GET_resultIdToCode(this.api.resultsSE.currentResultCode, this.api.resultsSE.currentResultPhase).subscribe({
        next: ({ response }) => {
          this.api.resultsSE.currentResultId = response;
          this.currentResultSE.resultIdIsconverted = true;
          resolve(null);
        },
        error: err => {
          // A 404 here is the server answering correctly — this code has no row in this phase —
          // and it is the ONLY case that may be reported as "not reported in this year". Anything
          // else (500, network, gateway) is a failure and must not be dressed up as missing data.
          this.currentResultSE.resultLoadFailure.set(err?.status === 404 ? 'not-found' : 'error');
          resolve(null);
        }
      });
    });
  }

  /**
   * Fills `availablePhases` for the not-found screen. Keyed by CODE on purpose: there is no id in
   * this branch, which is exactly why `GET_versioningResult()` (id-based) cannot answer here.
   */
  private GET_phasesOfResultCode() {
    this.api.resultsSE.GET_versioningResultByCode(this.api.resultsSE.currentResultCode).subscribe({
      next: ({ response }) => {
        const phases: Phases[] = [...((response ?? []) as Phases[])].sort(
          (a, b) => Number(b?.phase_year ?? 0) - Number(a?.phase_year ?? 0)
        );
        this.api.dataControlSE.resultPhaseList = phases;
        this.availablePhases.set(phases);
      },
      error: () => {
        this.availablePhases.set([]);
      }
    });
  }

  /** Name of the phase the URL asked for, for the not-found copy. Empty when it cannot be named. */
  get requestedPhaseName(): string {
    const requested = this.api.resultsSE.currentResultPhase;
    const phase = this.phasesSE.phases.reporting.find(item => String(item.id) === String(requested));
    return phase?.phase_name ?? '';
  }

  /**
   * Same route, another phase. A plain href (full document load) and not `routerLink`: the reuse
   * strategy keeps this component alive when only `?phase=` changes, so an in-app navigation would
   * leave the old, already-failed state on screen.
   */
  phaseLink(phaseId: number | string): string {
    return `${this.router.url.split('?')[0]}?phase=${phaseId}`;
  }

  reload(): void {
    window.location.reload();
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
