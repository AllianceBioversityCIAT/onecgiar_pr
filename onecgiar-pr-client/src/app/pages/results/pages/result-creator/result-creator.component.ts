import { Component, DoCheck, OnDestroy, OnInit, NgZone, signal, computed } from '@angular/core';
import { Subject, Subscription, catchError, debounceTime, distinctUntilChanged, filter, map, merge, of, switchMap, takeUntil } from 'rxjs';
import { internationalizationData } from '../../../../shared/data/internationalization-data';
import { ApiService } from '../../../../shared/services/api/api.service';
import { ResultLevelService } from './services/result-level.service';
import { Router } from '@angular/router';
import { ResultBody } from '../../../../shared/interfaces/result.interface';
import { PhasesService } from '../../../../shared/services/global/phases.service';
import { CreateResultManagementService } from './services/create-result-management.service';
import { TerminologyService } from '../../../../internationalization/terminology.service';
import { filterOutAvisaFromGroupedInitiativeOptions, filterOutAvisaInitiatives } from '../../../../shared/utils/avisa-initiative.util';

/**
 * P2-3527 — the similar-results search and the uniqueness gate answer independently, so a slow
 * similarity search never holds back the gate that enables Save.
 */
type TitleSearchEvent =
  | { kind: 'gate'; exactTitleFound: boolean; titleCheckFailed: boolean }
  | { kind: 'similar'; depthSearchList: any[]; depthSearchFailed: boolean };

@Component({
  selector: 'app-result-creator',
  templateUrl: './result-creator.component.html',
  styleUrls: ['./result-creator.component.scss'],
  standalone: false
})
export class ResultCreatorComponent implements OnInit, DoCheck, OnDestroy {
  naratives = internationalizationData.reportNewResult;
  depthSearchList: any[] = [];
  exactTitleFound = false;
  titleCheckFailed = false;
  /**
   * P2-3526 — an empty similar-results list is not the same claim as "there are no similar results".
   * The ElasticSearch host behind the similarity search stopped resolving, and its error handler
   * emptied the list, which rendered as "no similarities" — the screen told the user the title was
   * free right before Save refused it. This flag keeps the two states apart.
   */
  depthSearchFailed = false;
  /** Title depth-search / uniqueness check in flight (mirrors ReportResultFormComponent). */
  loadingDepthSearch = signal(false);
  /** Initial 4-deep serial chain (phases → roles → initiatives) still running. */
  loadingInitialData = signal(true);
  private phasesSub: Subscription | null = null;
  private readonly titleSearch$ = new Subject<string>();
  private readonly destroy$ = new Subject<void>();
  /** Same window as ReportResultFormComponent: the search now hits our MySQL, not Elastic. */
  private static readonly TITLE_SEARCH_DEBOUNCE_MS = 500;
  mqapJson: {};
  validating = false;
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
    return `Please add the handle generated in your Center's institutional repository (e.g., CGSpace, MELSpace, WorldFish Repository) to report your knowledge product. Only knowledge products entered into these repositories are accepted in the PRMS Reporting Tool.<br><br>
  The PRMS Reporting Tool will automatically retrieve all metadata entered into the institutional repositories. Partners and geographical scope metadata are editable, while the other metadata fields are not.<br><br>
  The handle will be verified, and only knowledge products from ${current} onwards will be accepted. For journal articles, the PRMS Reporting Tool will check the online publication date added in the repository ("Date Online"). If the online publication date is missing, the issued date ("Date Issued") will be considered. Articles published online in ${current} but issued in ${next} will be accepted for the ${current} reporting phase.<br><br>
  Articles published online in ${previous} but issued in ${current} will not be accepted and will need to be reported in the correct reporting period. A new functionality will be implemented in the PRMS Reporting Tool to periodically allow the reporting of results from previous years. Handles already reported will also not be accepted.<br><br>
  If you need support to modify any of the harvested metadata from the institutional repositories, please contact your Center's knowledge manager.<br>`;
  });
  allInitiatives = [];
  allPhases = [];
  cgiarEntityTypes = [];
  currentResultType = '';
  mqapUrlError = {
    status: false,
    message: ''
  };

  constructor(
    public api: ApiService,
    public resultLevelSE: ResultLevelService,
    public createResultManagementService: CreateResultManagementService,
    public terminologyService: TerminologyService,
    private router: Router,
    private phasesService: PhasesService,
    private readonly ngZone: NgZone
  ) {
    // Wired here, not in ngOnInit: the title stream is pure RxJS plumbing and has to be listening
    // before the first keystroke reaches depthSearch().
    this.setupTitleSearch();
  }

  ngOnInit(): void {
    this.loadingInitialData.set(true);
    this.api.dataControlSE.getCurrentPhases().subscribe({
      next: () => {
        this.api.rolesSE.validateReadOnly().then(() => {
          this.GET_AllInitiatives(() => this.loadingInitialData.set(false));
          // Non-admins never hit GET_AllInitiatives (it early-returns): release the guard here.
          if (!this.api.rolesSE.isAdmin) this.loadingInitialData.set(false);
        });
        this.api.alertsFs.show({
          id: 'indoasd',
          status: 'success',
          title: '',
          description: this.naratives.alerts(
            this.terminologyService.t('term.entity.singular', this.api.dataControlSE?.reportingCurrentPhase?.portfolioAcronym)
          ),
          querySelector: '.report_container',
          position: 'beforebegin'
        });
      },
      error: () => this.loadingInitialData.set(false)
    });
    this.resultLevelSE.resultBody = new ResultBody();
    this.resultLevelSE.currentResultTypeList = [];
    this.resultLevelSE.resultLevelList?.forEach(reLevel => (reLevel.selected = false));
    this.resultLevelSE.cleanData();
    this.api.updateUserData(() => {
      const initiatives = this.selectableInitiatives;
      if (initiatives.length == 1) this.resultLevelSE.resultBody.initiative_id = initiatives[0].id;
    });

    this.loadAllPhases();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.phasesSub?.unsubscribe();
    this.phasesSub = null;
    if (this.trailingScanId !== null) {
      clearTimeout(this.trailingScanId);
      this.trailingScanId = null;
    }
  }

  /**
   * Chained off PhasesService instead of the old `setTimeout(..., 600)` guess: read the phases
   * straight away when they are already cached, otherwise wait for the fetch to emit.
   */
  private loadAllPhases(): void {
    const alreadyLoaded = !!this.phasesService?.phases?.reporting?.length || !!this.phasesService?.phases?.ipsr?.length;
    if (alreadyLoaded) {
      this.getAllPhases();
      return;
    }

    this.phasesSub = this.phasesService.getPhasesObservable().subscribe(() => this.getAllPhases());
  }

  onSelectInit() {
    const init = ((this.api.rolesSE.isAdmin ? this.allInitiatives : this.selectableInitiatives) || []).find(
      init => init.id == this.resultLevelSE.resultBody.initiative_id
    );
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
    if (this.resultLevelSE.resultBody.result_type_id == 6) this.resultLevelSE.resultBody.result_name = '';
    else this.depthSearch(this.resultLevelSE.resultBody.result_name);
  }

  depthSearch(title: string) {
    if (!title?.trim()) {
      this.depthSearchList = [];
      this.exactTitleFound = false;
      this.titleCheckFailed = false;
      this.depthSearchFailed = false;
      this.loadingDepthSearch.set(false);
      return;
    }

    // Both calls fire while the user types; surface that they are running (mirrors
    // ReportResultFormComponent.loadingDepthSearch) instead of leaving the user with a silent UI.
    this.loadingDepthSearch.set(true);
    this.titleSearch$.next(title);
  }

  private setupTitleSearch(): void {
    this.titleSearch$
      .pipe(
        filter(title => !!title?.trim()),
        debounceTime(ResultCreatorComponent.TITLE_SEARCH_DEBOUNCE_MS),
        distinctUntilChanged(),
        switchMap(title => this.searchSimilarResultsWithTitleUniqueness(title)),
        takeUntil(this.destroy$)
      )
      .subscribe(event => this.applyTitleSearchEvent(event));
  }

  /**
   * P2-3527 — both halves are ours now: `get/depth-search` returns the similar-results list (it used
   * to come from an Elastic host that no longer resolves) and `check-title-uniqueness` gates the
   * exact title. They are merged, not chained, so neither waits for the other.
   */
  private searchSimilarResultsWithTitleUniqueness(title: string) {
    const legacyType = this.getLegacyType(this.resultTypeName, this.resultLevelName);

    const similar$ = this.api.resultsSE.GET_depthSearch(title, legacyType).pipe(
      map(response => ({
        kind: 'similar' as const,
        depthSearchList: this.mapDepthSearchResults(response),
        depthSearchFailed: false
      })),
      catchError(() =>
        of({
          kind: 'similar' as const,
          depthSearchList: [] as any[],
          depthSearchFailed: true
        })
      )
    );

    const gate$ = this.api.resultsSE.GET_checkTitleUniqueness(title).pipe(
      map(resp => ({
        kind: 'gate' as const,
        exactTitleFound: resp?.response?.isUnique === false,
        titleCheckFailed: false
      })),
      catchError(() =>
        of({
          kind: 'gate' as const,
          exactTitleFound: false,
          titleCheckFailed: true
        })
      )
    );

    return merge(similar$, gate$);
  }

  private applyTitleSearchEvent(event: TitleSearchEvent): void {
    if (event.kind === 'similar') {
      this.depthSearchList = event.depthSearchList;
      this.depthSearchFailed = event.depthSearchFailed;
      return;
    }

    this.exactTitleFound = event.exactTitleFound;
    this.titleCheckFailed = event.titleCheckFailed;
    this.loadingDepthSearch.set(false);
  }

  private mapDepthSearchResults(response: any[]) {
    return (response ?? []).map(result => ({
      ...result,
      phase: this.allPhases.find(phase => phase.id === result?.version_id)
    }));
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

    if (this.resultLevelSE.resultBody.result_type_id != 6) {
      this.api.dataControlSE.validateBody(this.resultLevelSE.resultBody);
      this.api.resultsSE.POST_resultCreateHeader(this.resultLevelSE.resultBody).subscribe({
        next: (resp: any) => {
          this.router.navigate([`/result/result-detail/${resp?.response?.result_code}/general-information`], {
            queryParams: { phase: resp?.response?.version_id }
          });
          this.api.alertsFe.show({ id: 'reportResultSuccess', title: 'Result created', status: 'success', closeIn: 500 });
        },
        error: err => {
          this.api.alertsFe.show({ id: 'reportResultError', title: 'Error!', description: err?.error?.message, status: 'error' });
        }
      });
    } else {
      this.api.resultsSE.POST_createWithHandle({ ...this.mqapJson, result_data: this.resultLevelSE.resultBody }).subscribe({
        next: (resp: any) => {
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
  }

  /** Throttle for the mandatory-field DOM scan (was running synchronously on every CD cycle). */
  private static readonly SCAN_THROTTLE_MS = 150;
  private lastScanAt = 0;
  private scanScheduled = false;
  private trailingScanId: any = null;

  ngDoCheck(): void {
    // Same fix as Result Detail (P2-2967/P2-2971): throttle (leading + trailing edge) the DOM-scanning
    // mandatory-field check, coalesce into one rAF run OUTSIDE Angular's zone, tick only when it changed.
    if (this.scanScheduled) return;
    const elapsed = Date.now() - this.lastScanAt;
    if (elapsed >= ResultCreatorComponent.SCAN_THROTTLE_MS) {
      this.runFeedbackScan();
    } else if (this.trailingScanId === null) {
      this.ngZone.runOutsideAngular(() => {
        this.trailingScanId = setTimeout(() => {
          this.trailingScanId = null;
          this.runFeedbackScan();
        }, ResultCreatorComponent.SCAN_THROTTLE_MS - elapsed);
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
        this.api.dataControlSE.someMandatoryFieldIncompleteResultDetail('.local_container');
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
        message:
          'Please ensure that the handle is from the <a href="https://cgspace.cgiar.org/home" target="_blank" rel="noopener noreferrer">CGSpace repository</a> and not other CGIAR repositories.'
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
}
