import { Component, input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BilateralAiService } from '../../../../services/bilateral-ai.service';
import { BilateralAiDraft } from '../../../../services/bilateral-ai.interfaces';

@Component({
  selector: 'app-draft-result-card',
  imports: [CommonModule],
  templateUrl: './draft-result-card.component.html',
  styleUrl: './draft-result-card.component.scss',
})
export class DraftResultCardComponent {
  private readonly aiService = inject(BilateralAiService);
  draft = input.required<BilateralAiDraft>();

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
