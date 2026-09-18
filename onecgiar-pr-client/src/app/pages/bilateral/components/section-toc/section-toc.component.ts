import { Component, inject, signal, computed, OnInit, effect, input } from '@angular/core';

const PA_TOC_DEFER_STORAGE_PREFIX = 'prms.bilateralPaTocDefer:';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CustomFieldsModule } from '../../../../custom-fields/custom-fields.module';
import { BilateralCreationService } from '../../services/bilateral-creation.service';
import { BilateralAutoSaveService } from '../../services/bilateral-auto-save.service';
import { BilateralMdsTrackerService, MdsFieldItem } from '../../services/bilateral-mds-tracker.service';
import { ApiService } from '../../../../shared/services/api/api.service';
import { FormSkeletonComponent } from '../form-skeleton/form-skeleton.component';
import {
  SectionTocDefaultComponent,
  ProjectDefault,
} from '../section-toc-default/section-toc-default.component';
import { TocLinkageSwitchDialogService } from '../toc-linkage-switch-dialog/toc-linkage-switch-dialog.service';

const RESULT_TYPE_TO_LABEL: Record<number, string> = {
  1: 'Policy Change', 2: 'Innovation Use', 4: 'Other Outcome',
  5: 'Capacity Sharing for Development', 6: 'Knowledge Product',
  7: 'Innovation Development', 8: 'Other Output', 9: 'Impact Contribution',
  10: 'Innovation Use (IPSR)', 11: 'Complementary Innovation',
};

const INDICATOR_TYPE_TO_RESULT_NAME: Record<string, string> = {
  '%Number of innovations%': 'Innovation Development',
  '%Number of people trained%': 'Capacity Sharing for Development',
  '%Number of knowledge products%': 'Knowledge Product',
  '%Number of Policy%': 'Policy Change',
  '%Innovation Use%': 'Innovation Use / Innovation Use (IPSR)',
};

@Component({
  selector: 'app-section-toc',
  imports: [CommonModule, FormsModule, FormSkeletonComponent, CustomFieldsModule, SectionTocDefaultComponent],
  templateUrl: './section-toc.component.html',
  styleUrl: './section-toc.component.scss',
})
export class SectionTocComponent implements OnInit {
  readonly creationService = inject(BilateralCreationService);
  readonly mdsTracker = inject(BilateralMdsTrackerService);
  readonly autoSave = inject(BilateralAutoSaveService);
  readonly api = inject(ApiService);
  private readonly tocLinkageSwitchDialog = inject(TocLinkageSwitchDialogService);

  resultLevelId = input<number | null>(null);
  readOnly = input<boolean>(false);

  linkageMode = signal<'project_default' | 'custom' | null>(null);
  projectDefault = signal<ProjectDefault | null>(null);

  readonly hasProjectDefault = computed(() => {
    if (this.isPlanned() === false && !this.linkageMode()) {
      return false;
    }
    const pd = this.projectDefault();
    return !!pd && (pd.nodes?.length ?? 0) > 0;
  });

  readonly showDetailForm = computed(() => {
    if (this.hasProjectDefault()) {
      return this.linkageMode() === 'custom';
    }
    return this.isPlanned() === true;
  });

  isPlanned = signal<boolean | null>(null);
  /** When true, the reporter defers ToC mapping to the Program/Accelerator team (W3 bilateral only). */
  paWillCompleteTocMapping = signal(false);
  readonly showPlannedQuestion = computed(() => !this.paWillCompleteTocMapping());
  tocLevels = signal<any[]>([]);
  outputList = signal<any[]>([]);
  outcomeList = signal<any[]>([]);
  eoiList = signal<any[]>([]);
  selectedLevelId = signal<number | null>(null);
  selectedTocResultId = signal<number | string | null>(null);
  selectedIndicatorId = signal<number | string | null>(null);
  contributionValue = signal<number | null>(null);
  narrative = signal<string>('');
  whyReported = signal<string>('');
  isLoading = signal(false);

  readonly resultId = this.creationService.currentResultId;
  readonly programCode = computed(() => this.creationService.selectedPrimarySp()?.programCode ?? '');
  readonly resultTypeId = computed(() => this.creationService.resultTypeId());
  readonly resultTypeLabel = computed(() => {
    const id = this.resultTypeId();
    return id ? RESULT_TYPE_TO_LABEL[id] ?? `Type ${id}` : '';
  });

  readonly initiativeId = signal<number | null>(null);

  readonly showWhyReported = computed(() => !this.paWillCompleteTocMapping() && this.isPlanned() === false);

  readonly showLevelSelector = computed(() => {
    const levelId = this.resultLevelId();
    const planned = this.isPlanned();
    if (planned === null) return false;
    if (levelId === 1 && planned === true) return false;
    return true;
  });

  readonly filteredLevels = computed(() => {
    const levelId = this.resultLevelId();
    const planned = this.isPlanned();
    const all = this.tocLevels();
    if (planned === null) return [];
    if (levelId === 1) return all.filter(l => l.toc_level_id === 1);
    if (levelId === 3) return all.filter(l => l.toc_level_id !== 1);
    if (levelId === 4) return all.filter(l => l.toc_level_id === 1);
    return all;
  });

  readonly selectedLevelName = computed(() => {
    return this.tocLevels().find(l => l.toc_level_id == this.selectedLevelId())?.name ?? '';
  });

  readonly activeList = computed(() => {
    const levelId = this.selectedLevelId();
    switch (Number(levelId)) {
      case 1: return this.outputList();
      case 2: return this.outcomeList();
      case 3: return this.eoiList();
      default: return [];
    }
  });

  readonly tocResultItems = computed(() => {
    return this.activeList().map((item: any) => {
      const indicators = item.indicators ?? [];
      const hasMatch = indicators.some((ind: any) => {
        const info = this.getIndicatorMatchInfo(ind);
        return info.cssClass === 'bp-toc-match--match';
      });
      const hasOther = indicators.some((ind: any) => {
        const info = this.getIndicatorMatchInfo(ind);
        return info.cssClass === 'bp-toc-match--other';
      });
      const code = this.escapeHtml(this.toPlainText(item.wp_short_name || item.extraInformation) || 'AOW');
      const title = this.escapeHtml(this.toPlainText(item.title || item.extraInformation));
      let select_badge = '';
      let select_badge_tone = 'neutral';
      if (hasMatch) {
        select_badge = `Match · ${this.resultTypeLabel()}`;
        select_badge_tone = 'match';
      } else if (hasOther) {
        select_badge = 'Review needed';
        select_badge_tone = 'review';
      }
      const select_label = title && code !== title ? `${code} — ${title}` : code;
      return { ...item, hasMatch, hasOther, select_label, select_badge, select_badge_tone };
    });
  });

  readonly indicatorsList = computed(() => {
    const resultId = this.selectedTocResultId();
    if (!resultId) return [];
    const result = this.activeList().find((r: any) => String(r.toc_result_id) === String(resultId));
    return (result?.indicators ?? [])
      .filter((ind: any) => {
        if (this.hasProjectDefault() && this.linkageMode() === 'custom') {
          const matchInfo = this.getIndicatorMatchInfo(ind);
          if (matchInfo.cssClass === 'bp-toc-match--other') return false;
        }
        return true;
      })
      .map((ind: any) => {
      const matchInfo = this.getIndicatorMatchInfo(ind);
      let badges = '';
      let select_badge = '';
      let select_badge_tone = 'neutral';
      if (matchInfo.cssClass === 'bp-toc-match--match') {
        select_badge = `Match · ${this.resultTypeLabel()}`;
        select_badge_tone = 'match';
        if (ind.unit_messurament) {
          badges += ` · ${this.escapeHtml(ind.unit_messurament)}`;
        }
        badges += ` · Target: ${this.escapeHtml(String(ind.targets?.[0]?.target_value ?? 'N/A'))}`;
      } else if (matchInfo.cssClass === 'bp-toc-match--other') {
        select_badge = 'Review needed';
        select_badge_tone = 'review';
      }
      return {
        ...ind,
        matchInfo,
        select_label: `${this.escapeHtml(this.toPlainText(ind.indicator_description) || 'Unnamed')}${badges}`,
        select_badge,
        select_badge_tone,
      };
    });
  });

  private escapeHtml(value: string): string {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /** ToC sources sometimes wrap the node text in display markup; selects must show plain text only. */
  private toPlainText(value: unknown): string {
    return String(value ?? '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  readonly selectedIndicatorData = computed(() => {
    const id = this.selectedIndicatorId();
    if (!id) return null;
    return this.indicatorsList().find((ind: any) => String(ind.related_node_id) === String(id)) ?? null;
  });

  readonly hasNoMatchingIndicator = computed(() => {
    const inds = this.indicatorsList();
    if (!inds.length) return false;
    return !inds.some((i: any) => i.matchInfo.cssClass === 'bp-toc-match--match');
  });

  private plannedSelectionLocked = false;
  private tocStateRequestId = 0;
  private loadedInitiativeId: number | null = null;

  constructor() {
    effect(() => {
      const iId = this.creationService.resultInitiativeId();
      if (iId) {
        this.initiativeId.set(iId);
      }
    });

    effect(() => {
      const resultId = this.resultId();
      if (!resultId) return;
      this.plannedSelectionLocked = false;
      this.loadedInitiativeId = null;
      this.paWillCompleteTocMapping.set(this.readPaDeferStorage(resultId));
    });

    effect(() => {
      const iId = this.initiativeId();
      if (!iId || this.loadedInitiativeId === iId) return;
      this.loadedInitiativeId = iId;
      this.loadTocLevels();
      void this.loadTocState();
    });

    effect(() => {
      this.publishTocMds();
    });
  }

  ngOnInit(): void {
    const iId = this.initiativeId();
    if (iId && this.loadedInitiativeId !== iId) {
      this.loadedInitiativeId = iId;
      this.loadTocLevels();
      void this.loadTocState();
    }
  }

  private async loadTocState(): Promise<void> {
    const requestId = ++this.tocStateRequestId;
    const state = await this.autoSave.loadTocState();
    if (requestId !== this.tocStateRequestId) return;

    this.projectDefault.set(state.project_default ?? null);

    if (state.toc_linkage_mode) {
      this.linkageMode.set(state.toc_linkage_mode);
      this.isPlanned.set(true);
      if (state.toc_linkage_mode === 'custom' && this.initiativeId()) {
        this.fetchLists();
      }
    } else if (state.project_default && (state.project_default.nodes?.length ?? 0) > 0) {
      if (state.planned_result === false) {
        this.linkageMode.set(null);
        this.isPlanned.set(false);
        this.whyReported.set(state.toc_progressive_narrative ?? '');
      } else if (
        state.toc_result_id !== null ||
        state.indicator_id !== null ||
        state.planned_result === true
      ) {
        this.linkageMode.set('custom');
        this.isPlanned.set(true);
        if (this.initiativeId()) {
          this.fetchLists();
        }
      } else {
        this.linkageMode.set(null);
      }
    }

    if (!this.plannedSelectionLocked && !this.linkageMode()) {
      if (state.planned_result !== null) {
        this.isPlanned.set(state.planned_result);
        this.paWillCompleteTocMapping.set(false);
        this.clearPaDeferStorage();
        if (state.planned_result === true && this.initiativeId()) {
          this.fetchLists();
        }
      } else if (this.readPaDeferStorage()) {
        this.paWillCompleteTocMapping.set(true);
        this.isPlanned.set(null);
      }
    }
    if (state.toc_level_id !== null) {
      this.selectedLevelId.set(state.toc_level_id);
    }
    if (state.toc_result_id !== null) {
      this.selectedTocResultId.set(state.toc_result_id);
    }
    if (state.indicator_id !== null) {
      this.selectedIndicatorId.set(state.indicator_id);
    }
    if (state.contributing_indicator !== null) {
      this.contributionValue.set(state.contributing_indicator);
    }
    if (state.toc_progressive_narrative !== null) {
      // One column backs both textareas, exactly as the non-bilateral form does
      // (rd-contributors-and-partners.component.html:80): the ToC pathway explanation when the
      // result is planned, the "why is this being reported" justification when it is not.
      if (state.planned_result === false) {
        this.whyReported.set(state.toc_progressive_narrative);
      } else {
        this.narrative.set(state.toc_progressive_narrative);
      }
    }
  }

  onModeChange(newMode: 'project_default' | 'custom'): void {
    if (this.linkageMode() === newMode) return;

    if (newMode === 'project_default') {
      const hasCustomDetails =
        this.selectedIndicatorId() != null ||
        this.contributionValue() != null ||
        !!this.narrative()?.trim() ||
        this.selectedTocResultId() != null;

      if (this.linkageMode() === 'custom' && hasCustomDetails) {
        this.tocLinkageSwitchDialog.openSwitchToDefault().subscribe((result) => {
          if (result === 'switch') {
            this.applyProjectDefaultMode();
          }
        });
        return;
      }

      this.applyProjectDefaultMode();
      return;
    }

    if (newMode === 'custom') {
      this.clearTocDebouncers();
      this.linkageMode.set('custom');
      this.isPlanned.set(true);
      this.clearTocSelection();
      if (this.resultLevelId() === 1) {
        this.selectedLevelId.set(1);
      }
      if (this.initiativeId()) {
        this.fetchLists();
      }
      return;
    }
  }

  private applyProjectDefaultMode(): void {
    this.clearTocDebouncers();
    this.linkageMode.set('project_default');
    this.isPlanned.set(true);
    this.clearTocSelection();
    this.autoSave.saveTocMapping({
      toc_linkage_mode: 'project_default',
      planned_result: true,
    });
  }

  private _tocSaveTimer: ReturnType<typeof setTimeout> | null = null;

  private clearTocDebouncers(): void {
    if (this._tocSaveTimer) {
      clearTimeout(this._tocSaveTimer);
      this._tocSaveTimer = null;
    }
    if (this._narrativeTimer) {
      clearTimeout(this._narrativeTimer);
      this._narrativeTimer = null;
    }
    if (this._whyReportedTimer) {
      clearTimeout(this._whyReportedTimer);
      this._whyReportedTimer = null;
    }
  }

  private readPaDeferStorage(resultId = this.resultId()): boolean {
    if (!resultId) return false;
    try {
      return sessionStorage.getItem(`${PA_TOC_DEFER_STORAGE_PREFIX}${resultId}`) === '1';
    } catch {
      return false;
    }
  }

  private persistPaDeferStorage(deferred: boolean): void {
    const resultId = this.resultId();
    if (!resultId) return;
    try {
      if (deferred) {
        sessionStorage.setItem(`${PA_TOC_DEFER_STORAGE_PREFIX}${resultId}`, '1');
      } else {
        sessionStorage.removeItem(`${PA_TOC_DEFER_STORAGE_PREFIX}${resultId}`);
      }
    } catch {
      // Private mode / quota — UI state still works for this session.
    }
  }

  private clearPaDeferStorage(): void {
    this.persistPaDeferStorage(false);
  }

  private clearTocSelection(): void {
    this.selectedTocResultId.set(null);
    this.selectedIndicatorId.set(null);
    this.contributionValue.set(null);
    this.narrative.set('');
    this.whyReported.set('');
    this.outputList.set([]);
    this.outcomeList.set([]);
    this.eoiList.set([]);
    this.selectedLevelId.set(null);
  }

  private saveTocDebounced(): void {
    if (this._tocSaveTimer) clearTimeout(this._tocSaveTimer);
    this._tocSaveTimer = setTimeout(() => {
      this.autoSave.saveTocMapping({
        toc_linkage_mode: this.hasProjectDefault() ? (this.linkageMode() ?? undefined) : undefined,
        planned_result: this.isPlanned() ?? undefined,
        toc_level_id: this.selectedLevelId() ?? undefined,
        toc_result_id: this.selectedTocResultId() ?? undefined,
        indicator_id: this.selectedIndicatorId() ?? undefined,
        contributing_indicator: this.contributionValue() ?? undefined,
        toc_progressive_narrative:
          (this.isPlanned() === false ? this.whyReported() : this.narrative()) || undefined,
      });
    }, 1000);
  }

  private loadTocLevels(): void {
    this.api.tocApiSE.GET_AllTocLevels(true).subscribe({
      next: ({ response }) => this.tocLevels.set(response ?? []),
    });
  }

  private fetchLists(): void {
    const iId = this.initiativeId();
    const rId = this.resultId();
    const planned = this.isPlanned();
    if (!iId || !rId || planned === null) return;

    this.api.tocApiSE.GET_tocLevelsByconfig(rId, iId, 1, true, planned, true).subscribe({
      next: ({ response }) => this.outputList.set(response ?? []),
      error: () => this.outputList.set([]),
    });
    this.api.tocApiSE.GET_tocLevelsByconfig(rId, iId, 2, true, planned, true).subscribe({
      next: ({ response }) => this.outcomeList.set(response ?? []),
      error: () => this.outcomeList.set([]),
    });
    this.api.tocApiSE.GET_tocLevelsByconfig(rId, iId, 3, true, planned, true).subscribe({
      next: ({ response }) => this.eoiList.set(response ?? []),
      error: () => this.eoiList.set([]),
    });
  }

  onPlannedChange(planned: boolean): void {
    this.clearTocDebouncers();
    this.plannedSelectionLocked = true;
    this.paWillCompleteTocMapping.set(false);
    this.clearPaDeferStorage();
    this.isPlanned.set(planned);
    this.clearTocSelection();

    if (this.resultLevelId() === 1 && planned) {
      this.selectedLevelId.set(1);
    }

    const programCode = this.creationService.selectedPrimarySp()?.programCode;
    this.autoSave.updateFieldsBatch({
      planned_result: planned,
      ...(programCode ? { programCode } : {}),
    });
    if (planned && this.initiativeId()) {
      this.fetchLists();
    }
  }

  onPaWillCompleteChange(deferred: boolean): void {
    this.clearTocDebouncers();
    this.plannedSelectionLocked = true;
    this.paWillCompleteTocMapping.set(deferred);
    this.persistPaDeferStorage(deferred);

    if (deferred) {
      this.isPlanned.set(null);
      this.clearTocSelection();
      return;
    }
  }

  onLevelChange(levelId: number): void {
    if (this.selectedLevelId() == levelId) return;
    this.selectedLevelId.set(levelId);
    this.selectedTocResultId.set(null);
    this.selectedIndicatorId.set(null);
    this.contributionValue.set(null);
    this.saveTocDebounced();
  }

  onTocResultSelect(tocResultId: number | string): void {
    if (this.selectedTocResultId() == tocResultId) return;
    this.selectedTocResultId.set(tocResultId);
    this.selectedIndicatorId.set(null);
    this.saveTocDebounced();
  }

  onIndicatorSelect(relatedNodeId: number | string): void {
    if (this.selectedIndicatorId() == relatedNodeId) return;
    this.selectedIndicatorId.set(relatedNodeId);
    this.contributionValue.set(null);
    this.saveTocDebounced();
  }

  getIndicatorMatchInfo(indicator: any): { label: string; cssClass: string } {
    const typeName = indicator.type_value;
    if (!typeName) return { label: 'Standard', cssClass: 'bp-toc-match--neutral' };
    const rtId = this.resultTypeId();
    if (rtId === 1 && typeName.includes('Policy')) return { label: 'Policy Change', cssClass: 'bp-toc-match--match' };
    if ((rtId === 2 || rtId === 10) && typeName.includes('Innovation Use')) return { label: 'Innovation Use', cssClass: 'bp-toc-match--match' };
    if (rtId === 5 && typeName.includes('people trained')) return { label: 'Capacity Sharing', cssClass: 'bp-toc-match--match' };
    if (rtId === 6 && typeName.includes('knowledge products')) return { label: 'Knowledge Product', cssClass: 'bp-toc-match--match' };
    if (rtId === 7 && typeName.includes('Number of innovations')) return { label: 'Innovation Development', cssClass: 'bp-toc-match--match' };
    const forType = INDICATOR_TYPE_TO_RESULT_NAME[typeName];
    if (forType) return { label: forType, cssClass: 'bp-toc-match--other' };
    return { label: indicator.type_name ?? 'Standard', cssClass: 'bp-toc-match--neutral' };
  }

  findIndicatorById(id: number | string): any {
    return this.indicatorsList().find((i: any) => String(i.related_node_id) === String(id)) ?? null;
  }

  setContributionValue(val: number | string | null): void {
    if (val === null || val === '' || val === undefined) { this.contributionValue.set(null); return; }
    let n = Math.round(Number(val));
    if (isNaN(n)) {
      this.contributionValue.set(null);
    } else {
      n = Math.max(0, n);
      this.contributionValue.set(n);
    }
    this.saveTocDebounced();
  }

  preventInvalidKeys(event: KeyboardEvent): void {
    if (['-', '+', '.', ',', 'e', 'E'].includes(event.key)) {
      event.preventDefault();
    }
  }

  private _narrativeTimer: ReturnType<typeof setTimeout> | null = null;

  onNarrativeInput(value: string): void {
    this.narrative.set(value);
    if (this._narrativeTimer) clearTimeout(this._narrativeTimer);
    this._narrativeTimer = setTimeout(() => this.saveTocDebounced(), 1500);
  }

  private _whyReportedTimer: ReturnType<typeof setTimeout> | null = null;

  onWhyReportedInput(value: string): void {
    this.whyReported.set(value);
    if (this._whyReportedTimer) clearTimeout(this._whyReportedTimer);
    this._whyReportedTimer = setTimeout(() => this.saveTocDebounced(), 1500);
  }

  getDisplayLabel(item: any): string {
    if (item.extraInformation) return item.extraInformation;
    if (item.wp_short_name && item.title) return `${item.wp_short_name} - ${item.title}`;
    return item.title || 'Unnamed';
  }

  /**
   * The ToC mapping checklist. Every item is `optional: true` (PO decision, Juan David Delgado,
   * 9-sep-2026): choosing the Primary Science Program is enough to send a bilateral result to
   * Pending Review, so nothing in this block may hold Submit back.
   *
   * ⚠️ The items are still PUBLISHED, on purpose — the reporter keeps seeing them on the checklist,
   * and the fields, their asterisks and their autosave are untouched. What changed is only the
   * completeness arithmetic (`BilateralMdsTrackerService.buildStatus` skips optional items), which is
   * what `canSubmitFromRail` reads. The server never required any of this: `submitForReview` asks
   * only for a lead centre the caller belongs to and an assigned Science Program.
   */
  private publishTocMds(): void {
    const planned = this.isPlanned();
    const items: MdsFieldItem[] = [
      {
        key: 'toc-planned',
        label: 'Mapped to planned ToC indicator',
        filled: this.paWillCompleteTocMapping() || planned !== null,
        optional: true,
      },
    ];

    if (planned === false) {
      items.push({
        key: 'toc-why-reported',
        label: 'Why is this result being reported',
        filled: !!this.whyReported()?.trim(),
        optional: true,
      });
    }

    if (planned === true) {
      if (this.showLevelSelector()) {
        items.push({
          key: 'toc-level',
          label: 'Level',
          filled: this.selectedLevelId() != null,
          optional: true,
        });
      }
      items.push({
        key: 'toc-node',
        label: this.selectedLevelName() || 'ToC result',
        filled: this.selectedTocResultId() != null,
        optional: true,
      });
      if (this.selectedTocResultId()) {
        items.push({
          key: 'toc-indicator',
          label: 'Indicator',
          filled: this.selectedIndicatorId() != null,
          optional: true,
        });
        if (this.selectedIndicatorId()) {
          items.push({
            key: 'toc-contribution',
            label: 'Contribution to indicator target',
            filled: this.contributionValue() != null,
            optional: true,
          });
        }
      }
    }

    this.mdsTracker.setSectionFields('contributors', items, 'toc');
  }
}
