import { Component, OnInit, DoCheck, Output, EventEmitter, Input, signal, computed, OnDestroy, NgZone, inject } from '@angular/core';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { ResultLevelService } from '../../services/result-level.service';
import { Router } from '@angular/router';
import { ResultBody } from '../../../../../../shared/interfaces/result.interface';
import { PhasesService } from '../../../../../../shared/services/global/phases.service';
import { TerminologyService } from '../../../../../../internationalization/terminology.service';
import { EntityAowService } from '../../../../../result-framework-reporting/pages/entity-aow/services/entity-aow.service';
import { Subject, catchError, debounceTime, distinctUntilChanged, filter, map, merge, of, switchMap, takeUntil } from 'rxjs';
import {
  filterOutAvisaFromGroupedInitiativeOptions,
  filterOutAvisaInitiatives
} from '../../../../../../shared/utils/avisa-initiative.util';
import {
  INNOVATION_LINK_QUESTION,
  QaInnovationDevelopmentResultsService,
  innovationLinkAnswerIsComplete,
  showsInnovationLinkQuestion
} from '../../../../../../shared/services/global/qa-innovation-development-results.service';
import { validateKpHandle } from '../../../../../result-framework-reporting/shared/report-result/kp-handle.validator';
import { CgspaceItemDto } from '../../../../../result-framework-reporting/pages/entity-aow/pages/entity-aow-aow/components/aow-hlo-table/components/aow-hlo-table-create-modal/components/kp-cgspace-browse/kp-cgspace-browse.component';

export type KpEntryMode = 'browse' | 'manual';

type TitleSearchEvent =
  | {
      kind: 'gate';
      exactTitleFound: boolean;
      blockingExactTitleFound: boolean;
      titleCheckFailed: boolean;
    }
  | { kind: 'similar'; depthSearchList: any[] };

@Component({
  selector: 'app-report-result-form',
  templateUrl: './report-result-form.component.html',
  styleUrls: ['./report-result-form.component.scss'],
  standalone: false
})
export class ReportResultFormComponent implements OnInit, DoCheck, OnDestroy {
  depthSearchList: any[] = [];
  exactTitleFound = signal(false);
  blockingExactTitleFound = signal(false);
  titleCheckFailed = signal(false);
  loadingDepthSearch = signal(false);
  private readonly titleSearch$ = new Subject<string>();
  private readonly destroy$ = new Subject<void>();
  private readonly titleSearchDebounceMs = 500;
  mqapJson: {};
  validating = false;
  readonly kpEntryMode = signal<KpEntryMode>('browse');

  readonly phaseYear = computed(() => {
    this.api.dataControlSE.reportingPhaseVersion?.();
    return Number(this.api.dataControlSE.reportingCurrentPhase?.phaseYear ?? new Date().getFullYear());
  });

  readonly isAdmin = computed(() => !!this.api.rolesSE?.isAdmin);

  // ---- P2-3421: link to a QA'd Innovation Development result -------------------------------
  /** Shared catalogue — one request, one filter, shared with the ToC-linked creation surfaces. */
  readonly qaInnovationsSE = inject(QaInnovationDevelopmentResultsService);
  readonly innovationLinkQuestion = INNOVATION_LINK_QUESTION;
  /** Default is NO, per the story. `null` would leave the mandatory field unanswered. */
  hasInnovationLink: boolean = false;
  linkedResultId: number | null = null;
  /**
   * Years used by the knowledge-product guidance. `reportingCurrentPhase` / `previousReportingPhase` are PLAIN
   * objects, so the computed depends on `reportingPhaseVersion()` — bumped by `getCurrentPhases()` — to re-render
   * once the phases land. The calendar-year fallback keeps the sentence from ever painting "null" on first frame.
   */
  readonly kpGuidanceYears = computed(() => {
    this.api.dataControlSE.reportingPhaseVersion?.();
    const current = Number(this.api.dataControlSE.reportingCurrentPhase?.phaseYear ?? new Date().getFullYear());
    const previous = Number(this.api.dataControlSE.previousReportingPhase?.phaseYear ?? current - 1);
    return { current, previous, next: current + 1 };
  });

  readonly kpAlertDescription = computed(() => {
    const { current, previous, next } = this.kpGuidanceYears();
    return `Please add the handle generated in <strong>CGSpace</strong>, <strong>MELSpace</strong>, or <strong>WorldFish DSpace</strong> to report your knowledge product. Only knowledge products entered into <strong>one of these repositories</strong> are accepted in the PRMS Reporting Tool.<br><br>
The PRMS Reporting Tool will automatically retrieve all metadata entered into <strong>one of these repositories</strong>. Partners and geographical scope metadata are editable, while the other metadata fields are not.<br><br>
The handle will be verified, and only knowledge products from <strong>${current}</strong> will be accepted. For journal articles, the PRMS Reporting Tool will check the online publication date added in CGSpace ("Date Online"). If the online publication date is missing, the issued date ("Date Issued") will be considered. Articles published online in <strong>${current}</strong> but issued in <strong>${next}</strong> will be accepted for the <strong>${current}</strong> reporting phase.<br><br>
Articles published online in <strong>${previous}</strong> but issued in <strong>${current}</strong> will not be accepted and will need to be reported in the correct reporting period. Handles already reported will also not be accepted.<br><br>
If you need support to modify any of the harvested metadata from <strong>CGSpace</strong>, <strong>MELSpace</strong>, or <strong>WorldFish DSpace</strong>, contact your Center's knowledge manager.`;
  });
  allInitiatives = [];
  availableInitiativesSig = signal<any[]>([]);
  allPhases = [];
  cgiarEntityTypes = [];
  currentResultType = '';
  mqapUrlError = {
    status: false,
    message: ''
  };

  @Output() resultCreated = new EventEmitter<any>();
  @Input() disableInitiativeSelect: boolean = false;
  /**
   * P2-3421 — SURFACE gate. The link-to-a-QA'd-innovation question belongs to the EMERGENT
   * (non-ToC) reporting pathway only, so the host that opens this form as the emergent modal opts
   * in. Defaults to false so the standalone legacy creator, which renders the very same component,
   * cannot inherit it by accident.
   */
  @Input() showInnovationLinkQuestion: boolean = false;
  private _selectedInitiativeId: number | string | null = null;
  @Input() set selectedInitiativeId(value: number | string | null | undefined) {
    this._selectedInitiativeId = value ?? null;
    this.tryApplySelectedInitiative();
  }

  constructor(
    public api: ApiService,
    public resultLevelSE: ResultLevelService,
    public terminologyService: TerminologyService,
    private router: Router,
    private phasesService: PhasesService,
    public entityAowService: EntityAowService
  ) {}

  ngOnInit(): void {
    this.setupTitleSearch();
    // Idempotent: the shared service fetches once and every surface reuses the cached list.
    if (this.showInnovationLinkQuestion) this.qaInnovationsSE.load();
    this.api.dataControlSE.getCurrentPhases().subscribe(() => {
      this.api.rolesSE.validateReadOnly().then(() => {
        this.GET_AllInitiatives();
      });
    });
    this.resultLevelSE.resultBody = new ResultBody();
    this.resultLevelSE.currentResultTypeList = [];
    this.resultLevelSE.resetSelection();
    this.resultLevelSE.cleanData();
    this.applyPendingResultTypeSelection();
    this.api.updateUserData(() => {
      if (!this.api.rolesSE.isAdmin) {
        const initiatives = this.selectableInitiatives;
        this.availableInitiativesSig.set(initiatives);
        if (this._selectedInitiativeId == null && initiatives.length === 1) {
          this._selectedInitiativeId = initiatives[0]?.initiative_id || initiatives[0]?.id;
        }
        this.tryApplySelectedInitiative();
      }
      if (this._selectedInitiativeId != null) {
        this.resultLevelSE.resultBody.initiative_id = this._selectedInitiativeId as any;
        this.tryApplySelectedInitiative();
      } else {
        const initiatives = this.selectableInitiatives;
        if (initiatives.length == 1) {
          this.resultLevelSE.resultBody.initiative_id = initiatives[0].id;
        }
      }
    });

    setTimeout(() => {
      this.getAllPhases();
    }, 600);
  }

  onSelectInit() {
    const init = ((this.api.rolesSE.isAdmin ? this.allInitiatives : this.selectableInitiatives) || []).find(
      init => init.id == this.resultLevelSE.resultBody.initiative_id
    );
    if (!init) return;
    const resultType = this.cgiarEntityTypes.find(type => type.code == init.typeCode);
    this.currentResultType = resultType?.name;
  }

  getAllPhases() {
    const reportingPhases = this.phasesService?.phases?.reporting || [];
    const ipsrPhases = this.phasesService?.phases?.ipsr || [];
    this.allPhases = [...reportingPhases, ...ipsrPhases];
  }

  GET_cgiarEntityTypes(callback) {
    this.api.resultsSE.GET_cgiarEntityTypes().subscribe({
      next: ({ response }) => {
        response.forEach(element => {
          element.isLabel = true;
        });
        callback(response);
      },
      error: err => {
        callback?.();
      }
    });
  }

  GET_AllInitiatives(callback?) {
    if (!this.api.rolesSE.isAdmin) return;

    const activePortfolio = this.api.dataControlSE?.reportingCurrentPhase?.portfolioAcronym;

    this.api.resultsSE.GET_AllInitiatives(activePortfolio).subscribe({
      next: ({ response }) => {
        this.GET_cgiarEntityTypes(entityTypesResponse => {
          this.cgiarEntityTypes = entityTypesResponse;
          this.allInitiatives = response;

          this.allInitiatives.forEach(initiative => {
            const { code, name } = initiative?.obj_cgiar_entity_type || {};
            initiative.typeCode = code;
            initiative.typeName = name;
          });

          const groupList = entityTypesResponse;
          const resultList = [];
          groupList?.forEach(groupItem => {
            const initsGroup = filterOutAvisaInitiatives(this.allInitiatives.filter(item => item.typeCode == groupItem.code));
            if (initsGroup?.length) resultList.push(groupItem, ...initsGroup);
          });
          this.allInitiatives = filterOutAvisaFromGroupedInitiativeOptions(resultList);
          this.availableInitiativesSig.set(this.allInitiatives);
          this.tryApplySelectedInitiative();
        });
      },
      error: err => {
        console.error(err);
      },
      complete: () => {
        callback?.();
      }
    });
  }

  get isKnowledgeProduct() {
    return this.resultLevelSE.resultBody.result_type_id == 6;
  }

  onCgspaceItemSelected(item: CgspaceItemDto): void {
    const url = item.itemUrl || item.handleUrl || item.handle;
    this.validating = true;
    const error = validateKpHandle(url);
    this.mqapUrlError = error;
    if (error.status) {
      this.validating = false;
      this.api.alertsFe.show({
        id: 'reportResultError',
        title: 'Error!',
        description: error.message || 'Invalid CGSpace URL',
        status: 'error'
      });
      return;
    }

    this.resultLevelSE.resultBody.handler = url;
    this.resultLevelSE.resultBody.result_name = item.title ?? '';
    this.api.resultsSE.GET_mqapValidation(url).subscribe({
      next: resp => {
        this.mqapJson = resp.response;
        this.resultLevelSE.resultBody.result_name = resp.response?.title ?? '';
        this.validating = false;
      },
      error: err => {
        this.validating = false;
        this.resultLevelSE.resultBody.handler = '';
        this.resultLevelSE.resultBody.result_name = '';
        this.api.alertsFe.show({
          id: 'reportResultError',
          title: 'Error!',
          description: err?.error?.message || 'Could not retrieve metadata for this item',
          status: 'error'
        });
      }
    });
  }

  clearSelectedKpItem(): void {
    this.resultLevelSE.resultBody.handler = '';
    this.resultLevelSE.resultBody.result_name = '';
    this.mqapJson = {};
    this.mqapUrlError = { status: false, message: '' };
    this.validating = false;
  }

  /**
   * P2-3421 — visible only on the emergent pathway, only for Innovation use, and only from the
   * 2026 phase onwards. The year gate is a PHASE gate on purpose: `isP25()` would switch the
   * question on for 2025-phase results, which the epic requires to render exactly as they do today.
   */
  get showsInnovationLink(): boolean {
    if (!this.showInnovationLinkQuestion) return false;
    return showsInnovationLinkQuestion(
      this.resultLevelSE.resultBody.result_type_id,
      this.api.dataControlSE?.reportingCurrentPhase?.phaseYear
    );
  }

  /** "Yes" without a chosen innovation is an incomplete answer, so it blocks "Save and continue". */
  get innovationLinkIncomplete(): boolean {
    if (!this.showsInnovationLink) return false;
    return !innovationLinkAnswerIsComplete(this.hasInnovationLink, this.linkedResultId);
  }

  /** Answering "No" drops the selection so the payload can never carry a stale link. */
  onInnovationLinkChange(): void {
    if (this.hasInnovationLink !== true) this.linkedResultId = null;
  }

  get selectableInitiatives() {
    return filterOutAvisaInitiatives(this.api.dataControlSE.myInitiativesListReportingByPortfolio);
  }

  get resultTypeNamePlaceholder(): string {
    const typeName = this.resultTypeName;
    return typeName ? typeName + ' title...' : 'Title...';
  }

  get resultTypeName(): string {
    if (!this.resultLevelSE.currentResultTypeList || !this.resultLevelSE.resultBody.result_type_id) return '';
    return this.resultLevelSE.currentResultTypeList.find(resultType => resultType.id == this.resultLevelSE.resultBody.result_type_id)?.name;
  }

  get resultLevelName(): string {
    return this.resultLevelSE.resultBody['result_level_name'] ?? '';
  }

  clean() {
    // P2-3421: the question only exists for Innovation use, so changing category drops the answer
    // instead of leaving a hidden "Yes" (and its link) travelling in the payload.
    this.hasInnovationLink = false;
    this.linkedResultId = null;
    this.kpEntryMode.set('browse');
    if (this.resultLevelSE.resultBody.result_type_id == 6) {
      this.clearSelectedKpItem();
    } else {
      this.resultLevelSE.resultBody.handler = '';
      this.mqapJson = {};
      this.mqapUrlError = { status: false, message: '' };
      this.onTitleChange(this.resultLevelSE.resultBody.result_name);
    }
  }

  private applyPendingResultTypeSelection() {
    const pendingSelection = this.resultLevelSE.consumePendingResultType?.();
    if (!pendingSelection) return;

    const checkAndApply = () => {
      const levelList = this.resultLevelSE.resultLevelListSig();
      if (levelList?.length > 0) {
        this.resultLevelSE.preselectResultType(pendingSelection.id, pendingSelection.name);
      } else {
        setTimeout(checkAndApply, 50);
      }
    };
    setTimeout(checkAndApply, 0);
  }

  onTitleChange(title: string) {
    if (!title?.trim()) {
      this.depthSearchList = [];
      this.exactTitleFound.set(false);
      this.blockingExactTitleFound.set(false);
      this.titleCheckFailed.set(false);
      this.loadingDepthSearch.set(false);
      return;
    }

    this.loadingDepthSearch.set(true);
    this.exactTitleFound.set(false);
    this.blockingExactTitleFound.set(false);
    this.titleCheckFailed.set(false);
    this.titleSearch$.next(title);
  }

  depthSearch(title: string) {
    this.loadingDepthSearch.set(true);
    this.searchResultsWithTitleUniqueness(title).subscribe(event => this.applyTitleSearchEvent(event));
  }

  getLegacyType(type: string, level: string): string {
    let legacyType = '';

    if (type == 'Innovation development') {
      legacyType = 'Innovation';
    } else if (type == 'Policy change') {
      legacyType = 'Policy';
    } else if (type == 'Capacity change' || type == 'Other outcome') {
      legacyType = 'OICR';
    } else if (level == 'Impact') {
      legacyType = 'OICR';
    }

    return legacyType;
  }

  onSaveSection() {
    if (!this.resultLevelSE.resultBody.initiative_id) {
      this.api.alertsFe.show({
        id: 'reportResultError',
        title: 'Error!',
        description: `Please select ${this.terminologyService.t('term.entity.singular', this.api.dataControlSE?.reportingCurrentPhase?.portfolioAcronym)}`,
        status: 'error'
      });
      return;
    }

    let request$;
    if (this.resultLevelSE.resultBody.result_type_id != 6) {
      this.api.dataControlSE.validateBody(this.resultLevelSE.resultBody);
      // P2-3421 — the answer travels INSIDE the create. Chaining the innovation-use PATCH here does
      // not work: it rejects a body without a valid `innovation_use_level_id`, which a result that
      // does not exist yet cannot have. The server persists it where Contributors and partners
      // already stores it, so the user finds the answer ticked there.
      const createBody: any = { ...this.resultLevelSE.resultBody };
      if (this.showsInnovationLink) {
        createBody.has_innovation_link = this.hasInnovationLink === true;
        createBody.linked_results = this.hasInnovationLink === true && this.linkedResultId != null ? [Number(this.linkedResultId)] : [];
      }
      request$ = this.api.resultsSE.POST_resultCreateHeader(createBody, true);
    } else {
      request$ = this.api.resultsSE.POST_createWithHandle({ ...this.mqapJson, result_data: this.resultLevelSE.resultBody });
    }

    request$.subscribe({
      next: (resp: any) => {
        this.resultCreated.emit(resp?.response);
        this.router.navigate([`/result/result-detail/${resp?.response?.result_code}/general-information`], {
          queryParams: { phase: resp?.response?.version_id }
        });
        this.api.alertsFe.show({ id: 'reportResultSuccess', title: 'Result created', status: 'success', closeIn: 500 });
      },
      error: err => {
        this.api.alertsFe.show({ id: 'reportResultError', title: 'Error!', description: err?.error?.message, status: 'error' });
      }
    });
  }

  /** Throttle for the mandatory-field DOM scan (was running synchronously on every CD cycle). */
  private static readonly SCAN_THROTTLE_MS = 150;
  private lastScanAt = 0;
  private scanScheduled = false;
  private trailingScanId: any = null;
  private readonly ngZone = inject(NgZone);

  ngDoCheck(): void {
    // Same fix as Result Detail (P2-2967/P2-2971): throttle (leading + trailing edge) the DOM scan,
    // coalesce into one rAF run OUTSIDE Angular's zone, tick only when it changed.
    if (this.scanScheduled) return;
    const elapsed = Date.now() - this.lastScanAt;
    if (elapsed >= ReportResultFormComponent.SCAN_THROTTLE_MS) {
      this.runFeedbackScan();
    } else if (this.trailingScanId === null) {
      this.ngZone.runOutsideAngular(() => {
        this.trailingScanId = setTimeout(() => {
          this.trailingScanId = null;
          this.runFeedbackScan();
        }, ReportResultFormComponent.SCAN_THROTTLE_MS - elapsed);
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
        this.api.dataControlSE.someMandatoryFieldIncompleteResultDetail('.report_container');
        if (this.api.dataControlSE.fieldFeedbackList() !== before) {
          this.ngZone.run(() => {});
        }
      });
    });
  }

  GET_mqapValidation() {
    this.validating = true;

    if (!this.resultLevelSE.resultBody.handler) {
      this.mqapUrlError = {
        status: true,
        message: 'Please enter a valid handle.'
      };
      this.validating = false;
      return;
    }

    const regex =
      /^https:\/\/(?:(?:cgspace\.cgiar\.org|repo\.mel\.cgiar\.org|digitalarchive\.worldfishcenter\.org)\/items\/[0-9a-fA-F-]{36}|hdl\.handle\.net\/(?:10568|20\.500\.11766|20\.500\.12348)\/\d+|cgspace\.cgiar\.org\/handle\/(?:10568|20\.500\.11766)\/\d+)$/;

    const isValid = regex.test(this.resultLevelSE.resultBody.handler);

    if (!isValid) {
      this.mqapUrlError = {
        status: true,
        message: 'Please ensure that the handle is from the CGSpace, MELSpace or WorldFish repository and not other CGIAR repositories.'
      };
      this.validating = false;
      return;
    }

    this.mqapUrlError = {
      status: false,
      message: ''
    };

    this.api.resultsSE.GET_mqapValidation(this.resultLevelSE.resultBody.handler).subscribe({
      next: resp => {
        this.mqapJson = resp.response;
        this.resultLevelSE.resultBody.result_name = resp.response.title;
        this.validating = false;
        this.api.alertsFe.show({
          id: 'reportResultSuccess',
          title: 'Metadata successfully retrieved',
          description: 'Title: ' + this.resultLevelSE.resultBody.result_name,
          status: 'success'
        });
      },
      error: err => {
        this.api.alertsFe.show({ id: 'reportResultError', title: 'Error!', description: err?.error?.message, status: 'error' });
        this.validating = false;
        this.resultLevelSE.resultBody.result_name = '';
      }
    });
  }

  private tryApplySelectedInitiative() {
    if (this._selectedInitiativeId == null) return;
    const list = this.availableInitiativesSig();
    if (!Array.isArray(list) || !list.length) return;

    const match = list.find(item => (item?.id ?? item?.initiative_id) == this._selectedInitiativeId);
    if (!match) return;

    const value = match?.id ?? match?.initiative_id ?? this._selectedInitiativeId;
    this.resultLevelSE.resultBody.initiative_id = value;
    this.onSelectInit();
  }

  private setupTitleSearch() {
    this.titleSearch$
      .pipe(
        filter(title => !!title?.trim()),
        debounceTime(this.titleSearchDebounceMs),
        distinctUntilChanged(),
        switchMap(title => this.searchResultsWithTitleUniqueness(title)),
        takeUntil(this.destroy$)
      )
      .subscribe(event => this.applyTitleSearchEvent(event));
  }

  private applyTitleSearchEvent(event: TitleSearchEvent): void {
    if (event.kind === 'similar') {
      this.depthSearchList = event.depthSearchList;
      return;
    }

    this.exactTitleFound.set(event.exactTitleFound);
    this.blockingExactTitleFound.set(event.blockingExactTitleFound);
    this.titleCheckFailed.set(event.titleCheckFailed);
    this.loadingDepthSearch.set(false);
  }

  /**
   * Both halves are ours: `get/depth-search` returns the similar-results suggestions and
   * `check-title-uniqueness` gates create. P2-3527 — the suggestions used to come from an Elastic
   * host that stopped resolving, and the failure was swallowed into an empty list.
   * Emits gate and similar-results events independently so a slow search does not block the
   * uniqueness gate or the save button.
   */
  private searchResultsWithTitleUniqueness(title: string) {
    const legacyType = this.getLegacyType(this.resultTypeName, this.resultLevelName);

    const gate$ = this.api.resultsSE.GET_checkTitleUniqueness(title).pipe(
      map(resp => {
        const isUnique = resp?.response?.isUnique !== false;
        return {
          kind: 'gate' as const,
          exactTitleFound: !isUnique,
          blockingExactTitleFound: !isUnique,
          titleCheckFailed: false
        };
      }),
      catchError(() =>
        of({
          kind: 'gate' as const,
          exactTitleFound: false,
          blockingExactTitleFound: true,
          titleCheckFailed: true
        })
      )
    );

    const similar$ = this.api.resultsSE.GET_depthSearch(title, legacyType).pipe(
      map(response => ({
        kind: 'similar' as const,
        depthSearchList: this.mapDepthSearchResults(response)
      })),
      catchError(() =>
        of({
          kind: 'similar' as const,
          depthSearchList: []
        })
      )
    );

    return merge(gate$, similar$);
  }

  private mapDepthSearchResults(response: any[]) {
    return (response ?? []).map(result => ({
      ...result,
      phase: this.allPhases.find(phase => phase.id === result?.version_id)
    }));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

}
