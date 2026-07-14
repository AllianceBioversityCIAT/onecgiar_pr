import { Component, inject, signal, computed, OnInit, effect, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import { BilateralCreationService } from '../../services/bilateral-creation.service';
import { BilateralAutoSaveService } from '../../services/bilateral-auto-save.service';
import { BilateralMdsTrackerService } from '../../services/bilateral-mds-tracker.service';
import { ApiService } from '../../../../shared/services/api/api.service';
import { FormSkeletonComponent } from '../form-skeleton/form-skeleton.component';

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
  imports: [CommonModule, FormsModule, FormSkeletonComponent, SelectModule],
  templateUrl: './section-toc.component.html',
  styleUrl: './section-toc.component.scss',
})
export class SectionTocComponent implements OnInit {
  readonly creationService = inject(BilateralCreationService);
  readonly mdsTracker = inject(BilateralMdsTrackerService);
  readonly autoSave = inject(BilateralAutoSaveService);
  readonly api = inject(ApiService);

  resultLevelId = input<number | null>(null);

  isPlanned = signal<boolean | null>(null);
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

  readonly showWhyReported = computed(() => this.isPlanned() === false);

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

  readonly indicatorsList = computed(() => {
    const resultId = this.selectedTocResultId();
    if (!resultId) return [];
    const result = this.activeList().find((r: any) => r.toc_result_id == resultId);
    return (result?.indicators ?? []).map((ind: any) => ({
      ...ind,
      matchInfo: this.getIndicatorMatchInfo(ind),
    }));
  });

  readonly selectedIndicatorData = computed(() => {
    const id = this.selectedIndicatorId();
    if (!id) return null;
    return this.indicatorsList().find((ind: any) => ind.related_node_id == id) ?? null;
  });

  readonly hasNoMatchingIndicator = computed(() => {
    const inds = this.indicatorsList();
    if (!inds.length) return false;
    return !inds.some((i: any) => i.matchInfo.cssClass === 'bp-toc-match--match');
  });

  constructor() {
    this.mdsTracker.updateSection('contributors', 1);

    effect(() => {
      const iId = this.creationService.resultInitiativeId();
      if (iId) {
        this.initiativeId.set(iId);
      }
    });

    effect(() => {
      const iId = this.initiativeId();
      if (!iId) return;
      this.loadTocLevels();
      this.fetchLists();
    });
  }

  ngOnInit(): void {
    if (this.initiativeId()) {
      this.loadTocLevels();
      this.fetchLists();
    }
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
    this.isPlanned.set(planned);
    this.selectedTocResultId.set(null);
    this.selectedIndicatorId.set(null);
    this.contributionValue.set(null);
    this.narrative.set('');
    this.whyReported.set('');
    this.outputList.set([]);
    this.outcomeList.set([]);
    this.eoiList.set([]);

    if (this.resultLevelId() === 1 && planned) {
      this.selectedLevelId.set(1);
    } else {
      this.selectedLevelId.set(null);
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

  onLevelChange(levelId: number): void {
    this.selectedLevelId.set(levelId);
    this.selectedTocResultId.set(null);
    this.selectedIndicatorId.set(null);
    this.contributionValue.set(null);
  }

  onTocResultSelect(tocResultId: number | string): void {
    this.selectedTocResultId.set(
      this.selectedTocResultId() == tocResultId ? null : tocResultId
    );
    this.selectedIndicatorId.set(null);
  }

  onIndicatorSelect(relatedNodeId: number | string): void {
    this.selectedIndicatorId.set(relatedNodeId);
    this.contributionValue.set(null);
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
    return this.indicatorsList().find((i: any) => i.related_node_id == id) ?? null;
  }

  setContributionValue(val: number | string | null): void {
    if (val === null || val === '' || val === undefined) { this.contributionValue.set(null); return; }
    const n = Number(val);
    this.contributionValue.set(isNaN(n) ? null : n);
  }

  getDisplayLabel(item: any): string {
    if (item.extraInformation) return item.extraInformation;
    if (item.wp_short_name && item.title) return `${item.wp_short_name} - ${item.title}`;
    return item.title || 'Unnamed';
  }
}
