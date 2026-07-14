import { Component, inject, signal, computed, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BilateralCreationService } from '../../services/bilateral-creation.service';
import { BilateralMdsTrackerService } from '../../services/bilateral-mds-tracker.service';
import { TocApiService } from '../../../../shared/services/api/toc-api.service';
import { FormSkeletonComponent } from '../form-skeleton/form-skeleton.component';

const RESULT_TYPE_TO_LABEL: Record<number, string> = {
  1: 'Policy Change',
  2: 'Innovation Use',
  4: 'Other Outcome',
  5: 'Capacity Sharing for Development',
  6: 'Knowledge Product',
  7: 'Innovation Development',
  8: 'Other Output',
  9: 'Impact Contribution',
  10: 'Innovation Use (IPSR)',
  11: 'Complementary Innovation',
};

const INDICATOR_TYPE_TO_RESULT_NAME: Record<string, string> = {
  '%Number of innovations%': 'Innovation Development',
  '%Number of people trained%': 'Capacity Sharing for Development',
  '%Number of knowledge products%': 'Knowledge Product',
  '%Number of Policy%': 'Policy Change',
  '%Innovation Use%': 'Innovation Use / Innovation Use (IPSR)',
};

const TOC_LEVELS = [
  { value: 1, label: 'High Level Output' },
  { value: 2, label: 'Intermediate Outcome' },
  { value: 3, label: '2030 Outcome' },
];

@Component({
  selector: 'app-section-toc',
  imports: [CommonModule, FormsModule, FormSkeletonComponent],
  templateUrl: './section-toc.component.html',
  styleUrl: './section-toc.component.scss',
})
export class SectionTocComponent implements OnInit {
  @Input() resultTypeId: number | null = null;

  readonly creationService = inject(BilateralCreationService);
  readonly mdsTracker = inject(BilateralMdsTrackerService);
  readonly tocApi = inject(TocApiService);

  isPlanned = signal<boolean>(true);
  selectedLevel = signal<number>(2);
  tocResults = signal<any[]>([]);
  selectedTocId = signal<number | null>(null);
  isLoading = signal(false);
  savedPlanned = signal<boolean | null>(null);
  savedNarrative = signal<string>('');

  readonly TOC_LEVELS = TOC_LEVELS;
  readonly resultId = this.creationService.currentResultId;
  readonly initiativeId = computed(() => {
    const sp = this.creationService.selectedPrimarySp();
    return sp?.programId ?? null;
  });

  readonly resultTypeLabel = computed(() => {
    const id = this.resultTypeId;
    return id ? RESULT_TYPE_TO_LABEL[id] ?? `Type ${id}` : '';
  });

  constructor() {
    this.mdsTracker.updateSection('contributors', 1);
  }

  ngOnInit(): void {
    const id = this.resultId();
    if (id) {
      this.loadTocResults();
    }
  }

  onPlannedChange(planned: boolean): void {
    this.isPlanned.set(planned);
    this.loadTocResults();
  }

  onLevelChange(level: number): void {
    this.selectedLevel.set(level);
    this.selectedTocId.set(null);
    this.loadTocResults();
  }

  onTocResultSelect(tocResultId: number): void {
    this.selectedTocId.set(this.selectedTocId() === tocResultId ? null : tocResultId);
  }

  loadTocResults(): void {
    const resultId = this.resultId();
    const initId = this.initiativeId();
    const level = this.selectedLevel();

    if (!resultId || !initId) return;

    this.isLoading.set(true);

    this.tocApi
      .GET_tocLevelsByconfig(resultId, initId, level, true, this.isPlanned())
      .subscribe({
        next: (res) => {
          const results = (res?.response ?? []).map((r: any) => ({
            ...r,
            indicators: (r.indicators ?? []).map((ind: any) => ({
              ...ind,
              matchInfo: this.getIndicatorMatchInfo(ind),
            })),
          }));
          this.tocResults.set(results);

          const id = this.selectedTocId();
          if (id && results.some((r: any) => Number(r.toc_result_id) === id)) {
            this.selectedTocId.set(id);
          } else {
            this.selectedTocId.set(null);
          }
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
        },
      });
  }

  getIndicatorMatchInfo(indicator: any): { label: string; cssClass: string } {
    const typeName = indicator.type_value;

    if (!typeName) {
      return { label: 'Standard indicator', cssClass: 'bp-toc-match--neutral' };
    }

    const rtId = this.resultTypeId;
    if (rtId === 1 && typeName.includes('Policy')) {
      return { label: 'Matches: Policy Change', cssClass: 'bp-toc-match--match' };
    }
    if ((rtId === 2 || rtId === 10) && typeName.includes('Innovation Use')) {
      return { label: 'Matches: Innovation Use', cssClass: 'bp-toc-match--match' };
    }
    if (rtId === 5 && typeName.includes('people trained')) {
      return { label: 'Matches: Capacity Sharing for Development', cssClass: 'bp-toc-match--match' };
    }
    if (rtId === 6 && typeName.includes('knowledge products')) {
      return { label: 'Matches: Knowledge Product', cssClass: 'bp-toc-match--match' };
    }
    if (rtId === 7 && typeName.includes('Number of innovations')) {
      return { label: 'Matches: Innovation Development', cssClass: 'bp-toc-match--match' };
    }

    const forType = INDICATOR_TYPE_TO_RESULT_NAME[typeName];
    if (forType) {
      return { label: `${forType} indicator`, cssClass: 'bp-toc-match--other' };
    }

    return { label: indicator.type_name ?? 'Standard indicator', cssClass: 'bp-toc-match--neutral' };
  }

  getMatchesForResult(tocResult: any): { count: number; label: string } {
    const indicators = tocResult?.indicators ?? [];
    if (!indicators.length) return { count: 0, label: 'No indicators' };

    const matchCount = indicators.filter(
      (ind: any) => this.getIndicatorMatchInfo(ind).cssClass === 'bp-toc-match--match',
    ).length;

    const rtLabel = this.resultTypeLabel();
    if (matchCount > 0) {
      return { count: matchCount, label: `${matchCount} indicator${matchCount !== 1 ? 's' : ''} match ${rtLabel}` };
    }
    return { count: 0, label: `No ${rtLabel} indicators` };
  }
}
