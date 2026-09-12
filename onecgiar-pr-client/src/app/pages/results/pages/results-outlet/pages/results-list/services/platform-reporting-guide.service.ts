// @akili-spec changes/results-center-reporting-guide (RCG-T-1)
import { Injectable, computed, inject, signal } from '@angular/core';
import { map, take } from 'rxjs/operators';
import { ApiService } from '../../../../../../../shared/services/api/api.service';
import { ScienceProgramIdService } from '../../../../../../result-framework-reporting/services/science-program-id.service';
import { SPProgress } from '../../../../../../../shared/interfaces/SP-progress.interface';

export type GuideModalMode = 'guide-only' | 'pick-program' | 'hub';

export interface SpChoice {
  code: string;
  name: string;
  initiativeId: number;
}

export interface ReportingInitiative {
  official_code?: string;
  short_name?: string;
  initiative_id?: number;
  id?: number;
}

export function computeHasSpAccess(initiatives: ReportingInitiative[] | null | undefined, isAdmin: boolean): boolean {
  return isAdmin || (initiatives?.length ?? 0) > 0;
}

export function computeHasCenterAccess(centersCount: number): boolean {
  return centersCount > 0;
}

export function buildSpChoicesFromInitiatives(initiatives: ReportingInitiative[] | null | undefined): SpChoice[] {
  const map = new Map<string, SpChoice>();
  for (const item of initiatives ?? []) {
    const code = String(item?.official_code ?? '').trim();
    if (!code) continue;
    const initiativeId = Number(item?.initiative_id ?? item?.id);
    if (!Number.isFinite(initiativeId)) continue;
    map.set(code.toUpperCase(), {
      code,
      name: String(item.short_name ?? code).trim() || code,
      initiativeId
    });
  }
  return [...map.values()].sort((a, b) => a.code.localeCompare(b.code));
}

export function mergeSpChoicesFromCatalog(
  myInitiatives: ReportingInitiative[] | null | undefined,
  myPrograms: SPProgress[] | undefined,
  otherPrograms: SPProgress[] | undefined
): SpChoice[] {
  const map = new Map<string, SpChoice>();
  for (const choice of buildSpChoicesFromInitiatives(myInitiatives)) {
    map.set(choice.code.toUpperCase(), choice);
  }
  for (const program of [...(myPrograms ?? []), ...(otherPrograms ?? [])]) {
    const code = String(program?.initiativeCode ?? '').trim();
    if (!code) continue;
    const initiativeId = Number(program.initiativeId);
    if (!Number.isFinite(initiativeId)) continue;
    map.set(code.toUpperCase(), {
      code,
      name: String(program.initiativeShortName ?? program.initiativeName ?? code).trim() || code,
      initiativeId
    });
  }
  return [...map.values()].sort((a, b) => a.code.localeCompare(b.code));
}

export function resolveGuideMode(hasSpAccess: boolean, spChoicesLength: number): GuideModalMode {
  if (!hasSpAccess) return 'guide-only';
  if (spChoicesLength === 0 || spChoicesLength > 1) return 'pick-program';
  return 'hub';
}

@Injectable({ providedIn: 'root' })
export class PlatformReportingGuideService {
  private readonly api = inject(ApiService);
  private readonly scienceProgramIdService = inject(ScienceProgramIdService);

  readonly spChoices = signal<SpChoice[]>([]);
  readonly catalogLoading = signal(false);
  readonly selectedProgramCode = signal<string | null>(null);

  readonly hasSpAccess = computed(() =>
    computeHasSpAccess(this.api.dataControlSE.myInitiativesListReportingByPortfolio, this.api.rolesSE.isAdmin)
  );

  readonly hasCenterAccess = computed(() => computeHasCenterAccess((this.api.rolesSE.getMyCenters() ?? []).length));

  readonly modalMode = computed(() => resolveGuideMode(this.hasSpAccess(), this.spChoices().length));

  /** Refreshes SP choices when the guide opens. Admin path merges the full catalog. */
  refreshChoices(): void {
    const myInitiatives = this.api.dataControlSE.myInitiativesListReportingByPortfolio ?? [];
    if (!this.api.rolesSE.isAdmin) {
      this.spChoices.set(buildSpChoicesFromInitiatives(myInitiatives));
      this.autoSelectSingleProgram();
      return;
    }

    this.catalogLoading.set(true);
    this.scienceProgramIdService.progress$
      .pipe(
        take(1),
        map(envelope => {
          const response = envelope?.response;
          return mergeSpChoicesFromCatalog(myInitiatives, response?.mySciencePrograms, response?.otherSciencePrograms);
        })
      )
      .subscribe({
        next: choices => {
          this.spChoices.set(choices);
          this.catalogLoading.set(false);
          this.autoSelectSingleProgram();
        },
        error: () => {
          this.spChoices.set(buildSpChoicesFromInitiatives(myInitiatives));
          this.catalogLoading.set(false);
          this.autoSelectSingleProgram();
        }
      });
  }

  reset(): void {
    this.selectedProgramCode.set(null);
  }

  selectProgram(code: string): void {
    this.selectedProgramCode.set(code);
  }

  private autoSelectSingleProgram(): void {
    const choices = this.spChoices();
    if (resolveGuideMode(this.hasSpAccess(), choices.length) === 'hub' && choices.length === 1) {
      this.selectedProgramCode.set(choices[0].code);
    }
  }
}
