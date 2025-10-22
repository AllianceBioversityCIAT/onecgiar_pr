import { Injectable, computed, inject } from '@angular/core';
import { CustomField } from '../interfaces/customField.interface';
import { DataControlService } from './data-control.service';
enum Portfolios {
  'P22' = 0,
  'P25' = 1
}
@Injectable({
  providedIn: 'root'
})
export class FieldsManagerService {
  dataControlSE = inject(DataControlService);

  portfolioAcronym = computed(() => 'P25');
  isP25 = computed(() => Portfolios[this.portfolioAcronym()] == Portfolios.P25);
  isP22 = computed(() => Portfolios[this.portfolioAcronym()] == Portfolios.P22);

  scoresImpactAreaLabel = 'Which component of the Impact Area is this result intended to impact?';

  fields = computed<Record<string, CustomField>>(() => {
    const fields: Record<string, CustomField> = {
      '[general-info]-title': {
        label: 'Title',
        placeholder: 'Enter text',
        description: `<ul>
            <li>Provide a clear, informative name of the output, for a non-specialist reader and without acronyms.</li>
            <li>Avoid abbreviations or (technical) jargon.</li>
            ${this.isP25() ? '<li>For innovations, varieties or breeds should be described by their generic traits or characteristics (e.g. Drought tolerant and aphid resistant groundnut cultivars).</li>' : ''}
          </ul>`
      },
      '[general-info]-description': {
        label: 'Description',
        placeholder: 'Enter text',
        required: !this.dataControlSE.isKnowledgeProductSignal(),
        description: `<ul>
    <li>Ensure the description is understandable for a non-specialist reader.</li>
     <li>Avoid acronyms and technical jargon.</li>
    <li>Avoid repetition of the title.</li>
      ${this.isP25() ? '<li>Varieties or breeds should be described by their generic traits or characteristics (e.g. Drought tolerant and aphid resistant groundnut cultivars).</li>' : ''}
    </ul>`
      },
      '[general-info]-lead_contact_person': {
        label: 'Lead contact person',
        placeholder: 'Search for a person (min 4 characters)',
        description: `For more precise results, we recommend searching by email or username.
    <br><strong>Examples:</strong> j.smith@cgiar.org; jsmith; JSmith`,
        required: this.isP25()
      },
      '[general-info]-is_krs': {
        label: 'Is this result featured in a Key Result Story for the reporting year?',
        hide: this.isP25()
      },
      //? score 1
      '[general-info]-gender_tag_id': {
        label: this.isP25() ? 'Gender equality, youth and social inclusion tag' : 'Gender equality score'
      },
      '[general-info]-gender_impact_area_id': {
        label: this.scoresImpactAreaLabel,
        hide: this.isP22()
      },
      //? score 2
      '[general-info]-climate_change_tag_id': {
        label: this.isP25() ? 'Climate adaptation and mitigation tag' : 'Climate change score'
      },
      '[general-info]-climate_impact_area_id': {
        label: this.scoresImpactAreaLabel,
        hide: this.isP22()
      },
      //? score 3
      '[general-info]-nutrition_tag_level_id': {
        label: `Nutrition, health and food security ${this.isP25() ? 'tag' : 'score'}`
      },
      '[general-info]-nutrition_impact_area_id': {
        label: this.scoresImpactAreaLabel,
        hide: this.isP22()
      },
      //? score 4
      '[general-info]-environmental_biodiversity_tag_level_id': {
        label: `Environmental health and biodiversity ${this.isP25() ? 'tag' : 'score'}`
      },
      '[general-info]-environmental_biodiversity_impact_area_id': {
        label: this.scoresImpactAreaLabel,
        hide: this.isP22()
      },
      //? score 5
      '[general-info]-poverty_tag_level_id': {
        label: `Poverty reduction, livelihoods and jobs ${this.isP25() ? 'tag' : 'score'}`
      },
      '[general-info]-poverty_impact_area_id': {
        label: this.scoresImpactAreaLabel,
        hide: this.isP22()
      },
      '[geoscope-management]-any-other-countries': {
        label: 'Are there any other geopgraphic areas where  the innovation could be impactful (beyond current development and use)?',
        description:
          'This should reflect other geographies where the innovation development, testing and/or use could also contribute to outcomes and impact"',
        required: true,
        hide:
          this.isP22() ||
          (this.dataControlSE.currentResultSignal().result_type_id != 2 && this.dataControlSE.currentResultSignal().result_type_id != 7)
      },
      '[geoscope-management]-any-other': {
        label: 'What is the geographic scope where there may be potential impact in other geographic areas?',
        hide:
          this.isP22() ||
          (this.dataControlSE.currentResultSignal().result_type_id != 2 && this.dataControlSE.currentResultSignal().result_type_id != 7)
      }
    };
    return fields;
  });
}
