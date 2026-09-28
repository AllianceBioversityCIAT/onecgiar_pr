// @akili-spec bilateral/manual-create-drawer (BIL-MCD-T-3, T-4, T-5)
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  OnDestroy,
  OnInit,
  output,
  signal,
  viewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  catchError,
  debounceTime,
  filter,
  map,
  merge,
  of,
  Subject,
  switchMap,
  takeUntil
} from 'rxjs';
import { BilateralResultLevelSelectorComponent } from '../bilateral-result-level-selector/bilateral-result-level-selector.component';
import { WordCounterService } from '../../../../shared/services/word-counter.service';
import { ApiService } from '../../../../shared/services/api/api.service';
import { PhasesService } from '../../../../shared/services/global/phases.service';
import { RESULT_TYPES_BY_LEVEL } from '../../shared/result-types-by-level';
import { resolveLegacyTypeForDepthSearch } from '../../shared/bilateral-title-legacy-type';
import {
  CgspaceItemDto,
  KpCgspaceBrowseComponent
} from '../../../result-framework-reporting/pages/entity-aow/pages/entity-aow-aow/components/aow-hlo-table/components/aow-hlo-table-create-modal/components/kp-cgspace-browse/kp-cgspace-browse.component';
import {
  validateKpHandle,
  KP_HANDLE_NO_ERROR,
  KpHandleError
} from '../../../result-framework-reporting/shared/report-result/kp-handle.validator';
import {
  KpRepository,
  kpRepositoryLabel
} from '../../../result-framework-reporting/pages/entity-aow/pages/entity-aow-aow/components/aow-hlo-table/components/aow-hlo-table-create-modal/components/kp-cgspace-browse/kp-repositories.constants';
import { BILATERAL_MANUAL_CREATE_COPY } from '../../../../internationalization/bilateral-manual-create.copy';

export type KpEntryMode = 'browse' | 'manual';

export interface BilateralManualCreatePayload {
  levelId: number;
  typeId: number;
  title: string;
  handle?: string;
}

type TitleSearchEvent =
  | {
      kind: 'gate';
      exactTitleFound: boolean;
      blockingExactTitleFound: boolean;
      titleCheckFailed: boolean;
    }
  | { kind: 'similar'; depthSearchList: any[] };

@Component({
  selector: 'app-bilateral-manual-create-form',
  imports: [CommonModule, FormsModule, BilateralResultLevelSelectorComponent, KpCgspaceBrowseComponent],
  templateUrl: './bilateral-manual-create-form.component.html',
  styleUrl: './bilateral-manual-create-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BilateralManualCreateFormComponent implements OnInit, OnDestroy {
  readonly copy = BILATERAL_MANUAL_CREATE_COPY;

  private readonly wordCounterSE = inject(WordCounterService);
  private readonly api = inject(ApiService);
  private readonly phasesSE = inject(PhasesService);
  private readonly titleSearch$ = new Subject<string>();
  private readonly destroy$ = new Subject<void>();
  private readonly titleSearchDebounceMs = 500;

  readonly creating = input(false);
  // @akili-spec changes/kp-project-match — KPPJ-R-9
  readonly projectCode = input<string>('');
  readonly projectTitle = input<string>('');
  readonly projectSummary = input<string>('');
  readonly projectDescription = input<string>('');
  readonly leadCenterAcronym = input<string>('');
  readonly programCode = input<string>('');
  readonly programName = input<string>('');
  readonly create = output<BilateralManualCreatePayload>();

  readonly resultLevelId = signal<number | null>(null);
  readonly resultTypeId = signal<number | null>(null);
  readonly title = signal('');
  readonly showTypeDropdown = signal(false);
  readonly showValidationErrors = signal(false);
  readonly showMissingList = signal(false);

  readonly depthSearchList = signal<any[]>([]);
  readonly exactTitleFound = signal(false);
  readonly blockingExactTitleFound = signal(false);
  readonly titleCheckFailed = signal(false);
  readonly loadingTitleCheck = signal(false);

  readonly kpEntryMode = signal<KpEntryMode>('browse');
  readonly kpHandle = signal('');
  readonly kpHandleSynced = signal(false);
  readonly validatingKpHandle = signal(false);
  readonly kpHandleError = signal<KpHandleError>({ ...KP_HANDLE_NO_ERROR });
  readonly selectedKpRepository = signal<KpRepository>('cgspace');

  readonly titleInput = viewChild<ElementRef<HTMLTextAreaElement>>('titleInput');

  readonly kpBrowseEnabled = true;

  readonly phaseYear = computed(
    () => Number(this.api.dataControlSE?.reportingCurrentPhase?.phaseYear ?? new Date().getFullYear())
  );
  readonly isAdmin = computed(() => !!this.api.rolesSE?.isAdmin);
  readonly repositoryLabel = computed(() => kpRepositoryLabel(this.selectedKpRepository()));

  readonly availableResultTypes = computed(() => {
    const level = this.resultLevelId();
    return level ? (RESULT_TYPES_BY_LEVEL[level] ?? []) : [];
  });

  readonly selectedTypeLabel = computed(() => {
    const typeId = this.resultTypeId();
    if (!typeId) return this.copy.form.selectResultType;
    return this.availableResultTypes().find(t => t.id === typeId)?.label ?? this.copy.form.selectResultType;
  });

  readonly titleWordCount = computed(() => this.wordCounterSE.counter(this.title()));

  readonly titleWordCountClass = computed(() => {
    const count = this.titleWordCount();
    if (count > 30) return 'text-[var(--pr-color-red-300)]';
    if (count >= 24) return 'text-[var(--pr-color-orange-500)]';
    return 'text-[var(--pr-text-subtle)]';
  });

  readonly isKnowledgeProductType = computed(() => this.resultTypeId() === 6);

  readonly titleReadOnly = computed(() => this.isKnowledgeProductType() && this.kpHandleSynced());

  readonly missingFields = computed<string[]>(() => {
    const labels = this.copy.missingFieldLabels;
    const missing: string[] = [];
    if (!this.resultLevelId()) missing.push(labels.resultLevel);
    if (this.resultLevelId() && !this.resultTypeId()) missing.push(labels.resultType);
    if (this.isKnowledgeProductType() && !this.kpHandleSynced()) {
      missing.push(labels.repositoryHandle);
    }
    if (this.resultTypeId()) {
      if (!this.title().trim()) missing.push(labels.resultTitle);
      else if (this.titleWordCount() > 30) missing.push(labels.titleTooLong);
      else if (this.titleCheckFailed()) missing.push(labels.titleCheckFailed);
      else if (this.blockingExactTitleFound()) missing.push(labels.titleExists);
    }
    return missing;
  });

  readonly fieldsLeftLabel = computed(() => {
    const count = this.missingFields().length;
    if (count === 1) return this.copy.form.fieldsLeftSingular;
    return this.copy.form.fieldsLeftPlural(count);
  });

  readonly canCreate = computed(
    () =>
      this.missingFields().length === 0 &&
      !this.creating() &&
      !this.loadingTitleCheck() &&
      !this.validatingKpHandle()
  );

  ngOnInit(): void {
    this.titleSearch$
      .pipe(
        filter(title => !!title?.trim()),
        debounceTime(this.titleSearchDebounceMs),
        // Night sweep 2026-09-23, C-1 — no distinctUntilChanged: every keystroke resets the gate
        // (loading flag on, exact-title flags off), so a title equal to the last one checked (a typo
        // fixed, or cleared and pasted again) must be checked again or the gate never re-opens.
        // switchMap still cancels the superseded request.
        switchMap(title => this.searchResultsWithTitleUniqueness(title)),
        takeUntil(this.destroy$)
      )
      .subscribe(event => this.applyTitleSearchEvent(event));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onLevelSelected(levelId: number): void {
    this.resultLevelId.set(levelId);
    this.resetTypeAndKpState();
  }

  toggleTypeDropdown(): void {
    this.showTypeDropdown.update(v => !v);
  }

  closeTypeDropdown(): void {
    this.showTypeDropdown.set(false);
  }

  onTypeSelected(typeId: number): void {
    this.resultTypeId.set(typeId);
    this.resetKpState();
    this.showTypeDropdown.set(false);
    this.showValidationErrors.set(false);
    if (typeId !== 6) {
      this.kpEntryMode.set('browse');
    }
  }

  onTitleInput(value: string): void {
    if (this.titleReadOnly()) return;
    this.title.set(value);
    this.queueTitleSearch(value);
  }

  onKpHandleInput(value: string): void {
    this.kpHandle.set(value);
    this.kpHandleSynced.set(false);
    this.kpHandleError.set({ ...KP_HANDLE_NO_ERROR });
  }

  onCgspaceItemSelected(item: CgspaceItemDto): void {
    // Prefer hdl.handle.net link for create-header; itemUrl remains valid but needs server-side
    // extractHandleIdentifier passthrough for DSpace `/items/<uuid>` URLs.
    const url = item.handleUrl || item.itemUrl || item.handle;
    this.validatingKpHandle.set(true);
    this.kpEntryMode.set('browse');
    this.selectedKpRepository.set(item.repository ?? 'cgspace');
    this.kpHandleError.set({ ...KP_HANDLE_NO_ERROR });

    const error = validateKpHandle(url);
    if (error.status) {
      this.surfaceKpHandleError(error.message);
      this.validatingKpHandle.set(false);
      return;
    }

    this.api.resultsSE.GET_mqapValidation(url).subscribe({
      next: (resp: any) => {
        const syncedTitle = resp?.response?.title ?? '';
        this.kpHandle.set(url);
        this.kpHandleSynced.set(true);
        this.title.set(syncedTitle);
        this.validatingKpHandle.set(false);
        this.kpHandleError.set({ ...KP_HANDLE_NO_ERROR });
        this.queueTitleSearch(syncedTitle);
      },
      error: (err: any) => {
        this.validatingKpHandle.set(false);
        this.surfaceKpHandleError(
          err?.error?.message || 'Could not retrieve metadata for this item'
        );
      }
    });
  }

  syncKpHandle(): void {
    const handle = this.kpHandle().trim();
    this.validatingKpHandle.set(true);
    this.kpHandleError.set({ ...KP_HANDLE_NO_ERROR });

    const error = validateKpHandle(handle);
    if (error.status) {
      this.surfaceKpHandleError(error.message);
      this.validatingKpHandle.set(false);
      return;
    }

    this.api.resultsSE.GET_mqapValidation(handle).subscribe({
      next: (resp: any) => {
        const syncedTitle = resp?.response?.title ?? '';
        this.kpHandle.set(handle);
        this.kpHandleSynced.set(true);
        this.title.set(syncedTitle);
        this.validatingKpHandle.set(false);
        this.kpHandleError.set({ ...KP_HANDLE_NO_ERROR });
        this.queueTitleSearch(syncedTitle);
      },
      error: (err: any) => {
        this.validatingKpHandle.set(false);
        this.surfaceKpHandleError(
          err?.error?.message || 'Unable to retrieve metadata for this handle.'
        );
      }
    });
  }

  private surfaceKpHandleError(message: string): void {
    this.kpHandleError.set({ status: true, message });
    this.api.alertsFe?.show({
      id: 'bilateralKpHandleError',
      title: 'Error!',
      description: message,
      status: 'error'
    });
  }

  clearSelectedKpItem(): void {
    this.kpHandle.set('');
    this.kpHandleSynced.set(false);
    this.title.set('');
    this.kpHandleError.set({ ...KP_HANDLE_NO_ERROR });
    this.resetTitleGate();
  }

  toggleMissingList(): void {
    this.showMissingList.update(v => !v);
  }

  focusFirstMissingField(): void {
    this.showValidationErrors.set(true);
    this.showMissingList.set(true);
    const missing = this.missingFields();
    if (missing.some(f => f.startsWith('Result title') || f.includes('Title check'))) {
      this.titleInput()?.nativeElement?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
      this.titleInput()?.nativeElement?.focus();
      return;
    }
    if (missing.includes('Repository link/handle')) {
      document.getElementById('bmcf-kp-section')?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (missing.includes('Result type')) {
      document.getElementById('bmcf-type-field')?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (missing.includes('Result level')) {
      document.getElementById('bmcf-level-section')?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
    }
  }

  onCreateClick(): void {
    if (!this.canCreate()) {
      this.showValidationErrors.set(true);
      this.showMissingList.set(true);
      this.focusFirstMissingField();
      return;
    }
    const levelId = this.resultLevelId();
    const typeId = this.resultTypeId();
    if (levelId == null || typeId == null) return;

    const payload: BilateralManualCreatePayload = {
      levelId,
      typeId,
      title: this.title().trim()
    };
    if (this.isKnowledgeProductType() && this.kpHandle().trim()) {
      payload.handle = this.kpHandle().trim();
    }
    this.create.emit(payload);
  }

  private resetTypeAndKpState(): void {
    this.resultTypeId.set(null);
    this.title.set('');
    this.resetKpState();
    this.showTypeDropdown.set(false);
    this.showValidationErrors.set(false);
  }

  private resetKpState(): void {
    this.kpHandle.set('');
    this.kpHandleSynced.set(false);
    this.kpHandleError.set({ ...KP_HANDLE_NO_ERROR });
    this.validatingKpHandle.set(false);
    this.kpEntryMode.set('browse');
    this.title.set('');
    this.resetTitleGate();
  }

  private resetTitleGate(): void {
    this.depthSearchList.set([]);
    this.exactTitleFound.set(false);
    this.blockingExactTitleFound.set(false);
    this.titleCheckFailed.set(false);
    this.loadingTitleCheck.set(false);
  }

  private queueTitleSearch(title: string): void {
    if (!title?.trim()) {
      this.resetTitleGate();
      return;
    }
    this.loadingTitleCheck.set(true);
    this.exactTitleFound.set(false);
    this.blockingExactTitleFound.set(false);
    this.titleCheckFailed.set(false);
    this.titleSearch$.next(title);
  }

  private applyTitleSearchEvent(event: TitleSearchEvent): void {
    if (event.kind === 'similar') {
      this.depthSearchList.set(event.depthSearchList);
      return;
    }
    this.exactTitleFound.set(event.exactTitleFound);
    this.blockingExactTitleFound.set(event.blockingExactTitleFound);
    this.titleCheckFailed.set(event.titleCheckFailed);
    this.loadingTitleCheck.set(false);
  }

  private searchResultsWithTitleUniqueness(title: string) {
    const legacyType = resolveLegacyTypeForDepthSearch(this.resultTypeId());

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
    const phases = this.phasesSE.phases?.reporting ?? [];
    return (response ?? []).map(result => ({
      ...result,
      phase: phases.find((phase: any) => phase.id === result?.version_id)
    }));
  }
}
