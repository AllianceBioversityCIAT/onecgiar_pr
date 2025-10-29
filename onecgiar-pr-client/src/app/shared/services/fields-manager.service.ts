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

  portfolioAcronym = computed(() => this.dataControlSE.currentResultSignal()?.portfolio);
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
        },
        '[innovation-dev-info]-long_title': {
          label: 'Long title',
          hide: this.isP25()
        },
        '[innovation-dev-info]-short_title': {
          label: this.isP25() ? 'Provide a short name for the innovation' : 'Provide a short title for the innovation',
          placeholder: 'Innovation short name goes here...',
          description: this.isP22() ? 
            `<ul>
            <li>Innovations are new, improved, or adapted technologies or products, capacity development tools and services, and policies or institutional arrangements with high potential to contribute to positive impacts when used at scale.</li>
            <li>Innovations may be at early stages of readiness (ideation or basic research) or at more mature stages of readiness (delivery and scaling).</li>
            <li>Enter a short name that facilitates clear communication about the innovation.</li>
            <li>Avoid abbreviations or (technical) jargon.</li>
            <li>Varieties or breeds should be described by their generic traits or characteristics (e.g. Drought tolerant and aphid resistant groundnut cultivars).</li>
            <li>You do not need to specify the number of new or improved lines/varieties – this can be specified under Innovation Typology.</li>
            <li>If not essential, avoid making reference to specific countries or regions (this is captured through geotagging)</li>
            <li>Avoid the use of CGIAR Center, Program or organization names in the short title</li>
            </ul>` :
            `<ul>
            <li>Innovations are new, improved, or adapted technologies or products, capacity development tools and services, and policies or institutional arrangements with high potential to contribute to positive impacts when used at scale.</li>
            <li>Innovations may be at early stages of readiness (ideation and upstream research) or at more mature stages of readiness (delivery and scaling).</li>
            <li>Try to develop a short name that facilitates clear communication about the innovation.</li>
            <li>Avoid abbreviations or (technical) jargon.</li>
            <li>If not essential, avoid making reference to specific countries or regions (this is captured through geotagging).</li>
            <li>Avoid the use of CGIAR centre,Program or organization names in the short title.</li>
            <li>Varieties or breeds should be described by their generic traits or characteristics (e.g. Drought tolerant and aphid resistant groundnut cultivars).</li>
            <li>The specific number of new or improved lines/ varieties can be specified elsewhere.</li>
            </ul>`
        },
        '[innovation-use-form]-has-innovation-link': {
          label: 'Is this innovation linked or bundled with another CGIAR-reported result (such as another innovation or a different type of result)?',
          hide: this.isP22(),
          required: true,
        },
        '[innovation-use-form]-core-innovation': {
          label: 'Current core innovation use in number of users that can be supported by evidence (within the reporting year)?',
          hide: this.isP22(),
          required: true,
          description: 'Depending on the innovation, users may be groups of actors or be organizations. Multiple actors or organizations can be selected.',
        },
        '[innovation-use-form]-has-studies-links': {
          label: 'Have any studies been conducted to inform the innovation scaling strategy design (e.g. willingness to pay, ex-ante impact study, policy integration, cost-benefit analysis, market sizing, scaling partner network, etc.).?',
          hide: this.isP22(),
          required: true,
        },
        '[innovation-use-form]-2030-to-be-determined': {
          label: 'Specify the targeted innovation use of the core innovation by end of 2030, supported by projections or evidence where available',
          hide: this.isP22(),
          required: true,
          description: 
          `<ul>
          <li>Depending on the innovation, users may be groups of actors or be organizations. Multiple actors or organizations can be selected.</li>
          <li>If the innovation does not target specific groups of actors or people, then please specify the expected innovation use at organizational level or other use.</li>
          <li>The numbers should reflect the expected innovation use by end of 2030. This <a href="https://docs.google.com/document/d/1mkt4bS51CyGmHKfkvuonAiJhkl4n-mLE/" class="open_route" target="_blank">guidance note</a> outlines a practical process for estimating or projecting innovation use figures by 2030.</li>
          <li>Add information for as many as applicable.</li>
          <li>CGIAR follows the United Nations definition of 'youth' as those persons between the ages of 15 and 24 years. If age disaggregation does not apply then please apply a 50/50% rule in dividing women or men across the youth/non-youth category.</li>
          </ul>`
        },
    };
    return fields;
  });
}
