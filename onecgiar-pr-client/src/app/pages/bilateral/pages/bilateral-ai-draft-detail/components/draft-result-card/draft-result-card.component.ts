import { Component, input, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { BilateralAiService } from '../../../../services/bilateral-ai.service';
import { BilateralAiDraft } from '../../../../services/bilateral-ai.interfaces';
import { ResultsApiService } from '../../../../../../shared/services/api/results-api.service';

@Component({
  selector: 'app-draft-result-card',
  imports: [CommonModule],
  templateUrl: './draft-result-card.component.html',
  styleUrl: './draft-result-card.component.scss',
})
export class DraftResultCardComponent {
  private readonly aiService = inject(BilateralAiService);
  private readonly resultsApi = inject(ResultsApiService);
  draft = input.required<BilateralAiDraft>();

  subnationalCodeMap = signal<Record<string, string>>({});
  countryNameMap = signal<Record<string, string>>({});

  constructor() {
    this.resultsApi.GET_AllCLARISACountries().subscribe({
      next: (res: any) => {
        const map: Record<string, string> = {};
        const countries: any[] = res?.response ?? res ?? [];
        for (const c of countries) {
          if (c.iso_alpha_2) map[c.iso_alpha_2] = c.name ?? c.iso_alpha_2;
        }
        this.countryNameMap.set(map);
      },
    });

    effect(() => {
      const countries = this.draft().extracted_mds?.['geo_focus']?.countries ?? [];
      const withSub: string[] = countries
        .filter((c: any) => c.subnational_areas?.length)
        .map((c: any) => c.iso_alpha_2 as string);

      if (!withSub.length) return;

      const requests = withSub.map(iso =>
        this.resultsApi.GET_subNationalByIsoAlpha2(iso).pipe(catchError(() => of({ response: [] })))
      );

      forkJoin(requests).subscribe((results: any[]) => {
        const map: Record<string, string> = {};
        for (const res of results) {
          const scopes: any[] = res?.response ?? res ?? [];
          for (const s of scopes) {
            if (s.code) map[s.code] = s.name ?? s.code;
          }
        }
        this.subnationalCodeMap.set(map);
      });
    });
  }

  getCountryName(iso: string): string {
    return this.countryNameMap()[iso] ?? iso;
  }

  getSubnationalName(code: string): string {
    return this.subnationalCodeMap()[code] ?? code;
  }

  get projectName(): string {
    const pid = this.draft().job?.project_id;
    if (pid == null) return '';
    return this.aiService.projectNameMap()[pid] ?? String(pid);
  }

  getDraftTitle(): string {
    return this.draft().extracted_mds?.['title'] ?? 'Untitled Draft';
  }

  getDraftDescription(): string {
    return this.draft().extracted_mds?.['description'] ?? '';
  }

  hasGeoFocus(): boolean {
    return !!this.draft().extracted_mds?.['geo_focus'];
  }

  getGeoScope(): string {
    return this.draft().extracted_mds?.['geo_focus']?.scope_label ?? '';
  }

  getGeoScopeCode(): number {
    return this.draft().extracted_mds?.['geo_focus']?.scope_code ?? 0;
  }

  getGeoScopeIcon(): string {
    const code = this.getGeoScopeCode();
    switch (code) {
      case 1: return 'public';       // Global
      case 2: return 'map';          // Regional
      case 3: return 'language';     // Multi-national
      case 4: return 'flag';         // National
      case 5: return 'place';        // Sub-national
      default: return 'location_on';
    }
  }

  getGeoCountries(): { iso: string; subnational: string[] }[] {
    const gf = this.draft().extracted_mds?.['geo_focus'];
    if (!gf?.countries?.length) return [];
    return gf.countries.map((c: any) => ({
      iso: c.iso_alpha_2 ?? '',
      subnational: c.subnational_areas ?? [],
    }));
  }

  getGeoRegions(): string[] {
    const gf = this.draft().extracted_mds?.['geo_focus'];
    return gf?.regions ?? [];
  }

  hasLeadCenter(): boolean {
    return !!this.draft().extracted_mds?.['lead_center'];
  }

  getLeadCenterName(): string {
    return this.draft().extracted_mds?.['lead_center']?.name ?? '';
  }

  getLeadCenterAcronym(): string {
    return this.draft().extracted_mds?.['lead_center']?.acronym ?? '';
  }

  hasInnovationType(): boolean {
    return !!this.draft().extracted_mds?.['innovation_development']?.['innovation_typology'];
  }

  getInnovationType(): string {
    return this.draft().extracted_mds?.['innovation_development']?.['innovation_typology']?.['name'] ?? '';
  }

  getReadinessLevel(): string {
    return this.draft().extracted_mds?.['innovation_development']?.['innovation_readiness_level']?.['name'] ?? '';
  }
}
