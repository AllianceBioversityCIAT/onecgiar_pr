import { Component, OnInit, inject, effect, ViewChild, computed } from '@angular/core';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { GeneralInfoBody } from './models/generalInfoBody';
import { ScoreService } from '../../../../../../shared/services/global/score.service';
import { InstitutionsService } from '../../../../../../shared/services/global/institutions.service';
import { environment } from '../../../../../../../environments/environment';
import { RolesService } from '../../../../../../shared/services/global/roles.service';
import { DataControlService } from '../../../../../../shared/services/data-control.service';
import { CustomizedAlertsFeService } from '../../../../../../shared/services/customized-alerts-fe.service';
import { PusherService } from '../../../../../../shared/services/pusher.service';
import { CurrentResultService } from '../../../../../../shared/services/current-result.service';
import { UserSearchService } from './services/user-search-service.service';
import { GetImpactAreasScoresService } from '../../../../../../shared/services/global/get-impact-areas-scores.service';
import { AiReviewService } from '../../../../../../shared/services/api/ai-review.service';
import { SaveConfirmationModalComponent } from './components/save-confirmation-modal/save-confirmation-modal.component';
import { FieldsManagerService } from '../../../../../../shared/services/fields-manager.service';

@Component({
  selector: 'app-rd-general-information',
  templateUrl: './rd-general-information.component.html',
  styleUrls: ['./rd-general-information.component.scss'],
  standalone: false
})
export class RdGeneralInformationComponent implements OnInit {
  @ViewChild('saveConfirmationModal') saveConfirmationModal!: SaveConfirmationModalComponent;

  generalInfoBody = new GeneralInfoBody();
  toggle = 0;
  isPhaseOpen = false;

  getImpactAreasScoresComponents = inject(GetImpactAreasScoresService);
  isP25 = computed(() => this.dataControlSE.currentResultSignal()?.portfolio === 'P25');
  fieldsManagerSE = inject(FieldsManagerService);

  constructor(
    public api: ApiService,
    private currentResultSE: CurrentResultService,
    public scoreSE: ScoreService,
    public institutionsSE: InstitutionsService,
    public rolesSE: RolesService,
    public dataControlSE: DataControlService,
    private customizedAlertsFeSE: CustomizedAlertsFeService,
    public pusherSE: PusherService,
    private userSearchService: UserSearchService,
    private aiReviewSE: AiReviewService
  ) {
    // Effect que escucha cambios en el signal y recarga los datos automáticamente
    effect(() => {
      // Leer el signal para activar el effect
      this.aiReviewSE.generalInformationSaved();
      // Solo recargar si el componente ya está inicializado
      if (this.generalInfoBody.result_code) {
        this.getSectionInformation();
      }
    });
  }

  ngOnInit(): void {
    this.showAlerts();
    this.getSectionInformation();
    this.dataControlSE.currentResultSectionName.set('General information');
  }

  get disableOptions() {
    return this.generalInfoBody.institutions;
  }

  // Helper methods for checkbox selection
  isImpactAreaSelected(fieldName: string, optionId: number | string): boolean {
    const fieldValue = this.generalInfoBody[fieldName];
    if (!fieldValue || !Array.isArray(fieldValue)) {
      return false;
    }
    return fieldValue.some((id: any) => Number(id) === Number(optionId));
  }

  toggleImpactAreaSelection(fieldName: string, optionId: number | string): void {
    const fieldValue = this.generalInfoBody[fieldName] || [];
    const currentArray = Array.isArray(fieldValue) ? [...fieldValue] : [];
    const idNum = Number(optionId);

    const index = currentArray.findIndex((id: any) => Number(id) === idNum);

    if (index >= 0) {
      // Remove if already selected
      currentArray.splice(index, 1);
    } else {
      // Add if not selected
      currentArray.push(idNum);
    }

    this.generalInfoBody[fieldName] = currentArray.length ? currentArray : [];
  }

  isImpactAreaComplete(fieldName: string): boolean {
    const value = this.generalInfoBody[fieldName];
    return Array.isArray(value) && value.length > 0;
  }

  // Helper methods to get field labels and descriptions from FieldsManagerService
  getImpactAreaFieldLabel(fieldRef: string): string {
    const field = this.fieldsManagerSE.fields()[fieldRef];
    return field?.label || '';
  }

  getImpactAreaFieldDescription(fieldRef: string): string {
    const field = this.fieldsManagerSE.fields()[fieldRef];
    return field?.description || '';
  }

  getImpactAreaFieldRequired(fieldRef: string): boolean {
    const field = this.fieldsManagerSE.fields()[fieldRef];
    return field?.required ?? true;
  }

  getSectionInformation() {
    this.api.resultsSE.GET_generalInformationByResultId(this.dataControlSE.currentResultSignal()?.portfolio === 'P25').subscribe(({ response }) => {
      this.generalInfoBody = response;
      this.generalInfoBody.reporting_year = response['phase_year'];
      this.generalInfoBody.institutions_type = [...this.generalInfoBody.institutions_type, ...this.generalInfoBody.institutions] as any;

      // Normalize impact area fields to arrays (backend returns arrays, but handle single numbers for backward compatibility)
      this.normalizeImpactAreaFields();

      this.GET_investmentDiscontinuedOptions(response.result_type_id);
      this.isPhaseOpen = !!this.api?.dataControlSE?.currentResult?.is_phase_open;
    });
  }

  private normalizeImpactAreaFields() {
    // Normalize to arrays: handle both single number and array responses
    const isP25 = this.dataControlSE.currentResultSignal()?.portfolio === 'P25';

    if (isP25) {
      // For P25, always use arrays
      this.generalInfoBody.gender_impact_area_id = this.toArray(this.generalInfoBody.gender_impact_area_id);
      this.generalInfoBody.climate_impact_area_id = this.toArray(this.generalInfoBody.climate_impact_area_id);
      this.generalInfoBody.nutrition_impact_area_id = this.toArray(this.generalInfoBody.nutrition_impact_area_id);
      this.generalInfoBody.environmental_biodiversity_impact_area_id = this.toArray(this.generalInfoBody.environmental_biodiversity_impact_area_id);
      this.generalInfoBody.poverty_impact_area_id = this.toArray(this.generalInfoBody.poverty_impact_area_id);
    } else {
      // For non-P25, keep as single number (null or number)
      // Backend may return arrays, so convert single-element arrays to numbers
      this.generalInfoBody.gender_impact_area_id = this.toSingleNumber(this.generalInfoBody.gender_impact_area_id);
      this.generalInfoBody.climate_impact_area_id = this.toSingleNumber(this.generalInfoBody.climate_impact_area_id);
      this.generalInfoBody.nutrition_impact_area_id = this.toSingleNumber(this.generalInfoBody.nutrition_impact_area_id);
      this.generalInfoBody.environmental_biodiversity_impact_area_id = this.toSingleNumber(this.generalInfoBody.environmental_biodiversity_impact_area_id);
      this.generalInfoBody.poverty_impact_area_id = this.toSingleNumber(this.generalInfoBody.poverty_impact_area_id);
    }
  }

  private toArray(value: any): number[] {
    if (value === null || value === undefined) {
      return [];
    }
    if (Array.isArray(value)) {
      // Extract IDs from objects if they are objects, otherwise use the values directly
      return value.map((item: any) => {
        if (typeof item === 'object' && item !== null) {
          // Extract the ID property (can be string or number, convert to number)
          const id = item.id ?? null;
          return id !== null && id !== undefined ? Number(id) : null;
        }
        // If it's already a number or string, convert to number
        return item !== null && item !== undefined ? Number(item) : null;
      }).filter((id: any) => id !== null && id !== undefined && !Number.isNaN(id));
    }
    // Single value: convert to number and return as array
    return value !== null && value !== undefined ? [Number(value)] : [];
  }

  private toSingleNumber(value: any): number | null {
    if (value === null || value === undefined) {
      return null;
    }
    if (Array.isArray(value)) {
      return value.length > 0 ? value[0] : null;
    }
    return value;
  }

  GET_investmentDiscontinuedOptions(result_type_id) {
    this.api.resultsSE.GET_investmentDiscontinuedOptions(result_type_id).subscribe(({ response }) => {
      this.convertChecklistToDiscontinuedOptions(response);
    });
  }

  convertChecklistToDiscontinuedOptions(response) {
    const options = [...response];
    options.forEach(option => {
      const found = this.generalInfoBody.discontinued_options.find(
        discontinuedOption => discontinuedOption.investment_discontinued_option_id == option.investment_discontinued_option_id
      );
      if (found) {
        option.value = true;
        option.description = found?.description;
      }
    });
    this.generalInfoBody.discontinued_options = options;
  }

  discontinuedOptionsToIds() {
    this.generalInfoBody.discontinued_options = this.generalInfoBody.discontinued_options.filter(option => option.value === true);
    this.generalInfoBody.discontinued_options.forEach(option => (option.is_active = true));
  }

  onSaveSection() {
    const isP25 = this.dataControlSE.currentResultSignal()?.portfolio === 'P25';

    if (this.userSearchService.searchQuery.trim() && !this.userSearchService.selectedUser && !isP25) {
      this.userSearchService.hasValidContact = false;
      this.userSearchService.showContactError = true;
      return;
    }

    const hasDiscontinuedOptions = this.generalInfoBody.discontinued_options?.some(option => option.value === true);

    if (isP25 && hasDiscontinuedOptions) {
      this.saveConfirmationModal.show(() => {
        this.performSave();
      });
    } else {
      this.performSave();
    }
  }

  private performSave() {
    this.discontinuedOptionsToIds();
    this.generalInfoBody.institutions_type = this.generalInfoBody.institutions_type.filter(inst => !inst.hasOwnProperty('institutions_id'));

    if (!this.generalInfoBody.is_discontinued) this.generalInfoBody.discontinued_options = [];

    // Ensure impact area fields are arrays for P25, or single numbers for non-P25
    const isP25 = this.dataControlSE.currentResultSignal()?.portfolio === 'P25';
    if (isP25) {
      // For P25, ensure all impact area fields are arrays
      this.generalInfoBody.gender_impact_area_id = this.toArray(this.generalInfoBody.gender_impact_area_id);
      this.generalInfoBody.climate_impact_area_id = this.toArray(this.generalInfoBody.climate_impact_area_id);
      this.generalInfoBody.nutrition_impact_area_id = this.toArray(this.generalInfoBody.nutrition_impact_area_id);
      this.generalInfoBody.environmental_biodiversity_impact_area_id = this.toArray(this.generalInfoBody.environmental_biodiversity_impact_area_id);
      this.generalInfoBody.poverty_impact_area_id = this.toArray(this.generalInfoBody.poverty_impact_area_id);
    } else {
      // For non-P25, convert arrays to single numbers (backward compatibility)
      this.generalInfoBody.gender_impact_area_id = this.toSingleNumber(this.generalInfoBody.gender_impact_area_id);
      this.generalInfoBody.climate_impact_area_id = this.toSingleNumber(this.generalInfoBody.climate_impact_area_id);
      this.generalInfoBody.nutrition_impact_area_id = this.toSingleNumber(this.generalInfoBody.nutrition_impact_area_id);
      this.generalInfoBody.environmental_biodiversity_impact_area_id = this.toSingleNumber(this.generalInfoBody.environmental_biodiversity_impact_area_id);
      this.generalInfoBody.poverty_impact_area_id = this.toSingleNumber(this.generalInfoBody.poverty_impact_area_id);
    }

    this.api.resultsSE.PATCH_generalInformation(this.generalInfoBody, isP25).subscribe({
      next: resp => {
        this.currentResultSE.GET_resultById();
        this.getSectionInformation();
      },
      error: err => {
        console.error(err);
        this.getSectionInformation();
      }
    });
  }

  descriptionTextInfo() {
    return `<ul>
    <li>Ensure the description is understandable for a non-specialist reader.</li>
    <li>Avoid acronyms and technical jargon.</li>
    <li>Avoid repetition of the title.</li>
    </ul>`;
  }

  leadContactPersonTextInfo() {
    return `For more precise results, we recommend searching by email or username.
    <br><strong>Examples:</strong> j.smith@cgiar.org; jsmith; JSmith`;
  }

  impactAreaScoresInfo() {
    return `Provide a score (0, 1 or 2) indicating the relevance of the result for each of the 5 Impact Areas (IAs). IA scores are defined as follows:
    <br/>
    <br/>

    <strong>0 = Not targeted:</strong> The result has been screened against the IA but it has not been found to directly contribute to any aspect of the IA as it is outlined in the CGIAR 2030 Research and Innovation Strategy. <br/>
    <strong>1 = Significant:</strong> The result directly contributes to one or more aspects of the IA. However, contributing to the IA is not the principal objective of the result. <br/>
    <strong>2 = Principal:</strong> Contributing to one or more aspects of the IA is the principal objective of the result. The IA is fundamental to the design of the activity leading to the result; the activity would not have been undertaken without this objective.

    <br/>
    <br/>

    <strong>Notes:</strong>
    <ul>
    <li>Every result should have at least one score of 1 or 2. Results with scores of 0 for all IAs should be rare cases.</li>
    <li>No more than two IAs should receive scores of 2 for a given result. Results with three IAs with scores of 2 should be rare cases.</li>
    ${
      this.isP25()
        ? '<li>Scores should not be assigned solely based on relevance to the collective global targets, but rather to the IA as more broadly defined in the <a href="https://hdl.handle.net/10568/110918" target="_blank" rel="noopener noreferrer" class="open_route">CGIAR 2030 Research and Innovation Strategy</a>.</li>'
        : '<li>Scores should not be assigned solely based on relevance to the collective global targets, but rather to the IA as more broadly defined in the 2030 Strategy and by the IA Platforms, indicated below.</li>'
    }
    <li>Scoring should be based on the relevance of the IAs to a given result and not on other criteria such as a specific donor’s level of interest in an IA.</li>
    </ul>`;
  }

  genderInformation() {
    if (this.isP25()) {
      return `<strong>Gender equality, youth and social inclusion</strong>
    <br/>

    <ul>
      <li><strong>Example topics:</strong> Empowering women and youth, encouraging women and youth entrepreneurship, and addressing socio-political barriers to social inclusion in food systems; ensuring equal access to resources; and meeting the specific crop and breed requirements and preferences of women, youth, and disadvantaged groups.</li>
      <br/>
      <li><strong>Collective global targets:</strong>
        <ul>
          <li>To close the gender gap in rights to economic resources, access to ownership and control over land and natural resources for over 500 million women who work in food, land and water systems.</li>
          <li>To offer rewardable opportunities to 267 million young people who are not in employment, education or training.</li>
        </ul>
      </li>
      <li><strong>Note:</strong> Additional guidance on scoring for gender equality can be found in <a href="https://docs.google.com/document/d/1krxwqVsmCfiQREh-DwGNcS72EPYRA7cn/edit?usp=sharing&ouid=100701138371542982320&rtpof=true&sd=true" target="_blank" rel="noopener noreferrer" class="open_route">this document</a> on result-level Impact Area scoring.</li>
    </ul>`;
    }

    return `<strong>Gender equality tag guidance</strong>
    <br/>

    There are two gender-related targets at systems level.

    <ul>
    <li>To close the gender gap in rights to economic resources, access to ownership and control over land and natural resources for over 500 million women who work in food, land and water systems.</li>
    <li>To offer rewardable opportunities to 267 million young people who are not in employment, education or training.</li>
    </ul>

    Three scores are possible:
    <ul>
    <li><strong>0 = Not targeted:</strong>  The output/outcome/activity has been screened against the marker but has not been found to target gender equality.</li>
    <li><strong>1 = Significant:</strong> Gender equality is an important and deliberate objective, but not the principal reason for undertaking the output/outcome/activity.</li>
    <li><strong>2 = Principal:</strong> Gender equality is the main objective of the output/outcome/activity and is fundamental in its design and expected results. The output/outcome/activity would not have been undertaken without this gender equality objective.</li>
    </ul>`;
  }

  nutritionInformation() {
    if (this.isP25()) {
      return `<strong>Nutrition, health and food security</strong>

    <ul>
      <li><strong>Example topics:</strong> Improving diets, nutrition, and food security (affordability, accessibility, desirability, stability); human health; and managing zoonotic diseases, food safety, and anti-microbial resistance.</li>
      <br/>
      <li>
        <strong>Collective global targets:</strong>
        <ul>
          <li>To end hunger for all and enable affordable, healthy diets for the 3 billion people who do not currently have access to safe and nutritious food.</li>
          <li>To reduce cases of foodborne illness (600 million annually) and zoonotic disease (1 billion annually) by one third.</li>
        </ul>
      </li>
    </ul>`;
    }

    return `<strong>Nutrition, health and food security tag guidance</strong>
    <br>

    There are two food security and nutrition targets for at systems level:

    <ul>
      <li>To end hunger for all and enable affordable, healthy diets for the 3 billion people who do not currently have access to safe and nutritious food. </li>
      <li>To reduce cases of foodborne illness (600 million annually) and zoonotic disease (1 billion annually) by one third.</li>
    </ul>

    Three scores are possible:

    <ul>
    <li><strong>0 = Not targeted:</strong> The output/outcome/activity has been screened against the marker but has not been found to target any aspects of nutrition, health and food security.</li>
    <li><strong>1 = Significant:</strong> The output/outcome/activity has made a significant contribution to any of the above-described aspects of nutrition, health and food security, but nutrition, health and food security is not the principal reason for undertaking the output/outcome/activity.</li>
    <li><strong>2 = Principal:</strong> The output/outcome/activity is principally meeting any aspect of nutrition, health and food security, and this is fundamental in its design and expected results. The output/outcome/activity would not have been undertaken without this objective.</li>
    </ul>`;
  }

  environmentInformation() {
    if (this.isP25()) {
      return `<strong>Environmental health and biodiversity</strong>

    <ul>
      <li><strong>Example topics:</strong> Supporting actions to stay within planetary boundaries for natural resource use and biodiversity through digital tools; improving management of water, land, soil, nutrients, waste, and pollution, including through nature-based, ecosystem-based, and agroecological approaches; conserving biodiversity through ex situ facilities (e.g. genebanks, community seed-banks) or in situ conservation areas; and breeding to reduce environmental footprint.</li>
      <br/>
      <li><strong>Collective global targets:</strong>
        <ul>
          <li>Stay within planetary and regional environmental boundaries: consumptive water use in food production of less than 2,500 km3 per year (with a focus on the most stressed basins), zero net deforestation, nitrogen application of 90 Tg per year (with a redistribution towards low-input farming systems) and increased use efficiency; and phosphorus application of 10 Tg per year.</li>
          <li>Maintain the genetic diversity of seed varieties, cultivated plants and farmed and domesticated animals and their related wild species, including through soundly managed genebanks at the national, regional, and international levels.</li>
        </ul>
      </li>
    </ul>`;
    }

    return `<strong>Environmental health and biodiversity tag guidance</strong>
    <br>

    There are three environmental targets and one biodiversity target at systems level:

    <ul>
      <li>Stay within planetary and regional environmental boundaries: consumptive water use in food production of less than 2,500 km³ per year (with a focus on the most stressed basins), zero net deforestation, nitrogen application of 90 Tg per year (with a redistribution towards low-input farming systems) and increased use efficiency; and phosphorus application of 10 Tg per year.</li>
      <li>Maintain the genetic diversity of seed varieties, cultivated plants and farmed and domesticated animals and their related wild species, including through soundly managed genebanks at the national, regional, and international levels.</li>
      <li>In addition, water conservation and management, restoration of degraded lands/soils, restoration of biodiversity in situ, and management of pollution related to food systems are key areas of environmental impacts to which the CGIAR should contribute. </li>
    </ul>

    Three scores are possible:

    <ul>
    <li><strong>0 = Not targeted:</strong> The output/outcome/activity has been screened against the marker (see reference list above), but it has not been found to target any aspect of environmental health and biodiversity.</li>
    <li><strong>1 = Significant:</strong> The output/outcome/activity has made a significant contribution to any of the above-described aspects of environmental health and biodiversity, but environmental health and biodiversity is not the principal reason for undertaking the output/outcome/activity.</li>
    <li><strong>2 = Principal:</strong> The output/outcome/activity is principally meeting any aspect of environmental health and biodiversity, and this is fundamental in its design and expected results. The output/outcome/activity would not have been undertaken without this objective.</li>
    </ul>`;
  }

  povertyInformation() {
    if (this.isP25()) {
      return `<strong>Poverty reduction, livelihoods and jobs</strong>

    <ul>
      <li><strong>Example topics:</strong> Improving social protection and employment opportunities by supporting access to resources and markets; developing solutions for resilient, income-generating agriculture for small farmers; and reducing poverty through adoption of new varieties and breeds with better yields.</li>
      <br/>
      <li><strong>Collective global targets:</strong>
        <ul>
          <li>Lift at least 500 million people living in rural areas above the extreme poverty line of US $1.90 per day (2011 PPP).</li>
          <li>Reduce by at least half the proportion of men, women and children of all ages living in poverty in all its dimensions, according to national definitions.</li>
        </ul>
      </li>
    </ul>`;
    }

    return `<strong>Poverty reduction, livelihoods and jobs tag guidance</strong>
    <br>

    There are two poverty reduction, livelihoods and jobs targets at systems level:

    <ul>
      <li>Lift at least 500 million people living in rural areas above the extreme poverty line of US $1.90 per day (2011 PPP).</li>
      <li>Reduce by at least half the proportion of men, women and children of all ages living in poverty in all its dimensions, according to national definitions.</li>
    </ul>

    Three scores are possible:

    <ul>
    <li><strong>0 = Not targeted:</strong> The output/outcome/activity has been screened against the marker but has not been found to target any aspects of poverty reduction, livelihoods and jobs.</li>
    <li><strong>1 = Significant:</strong> The output/outcome/activity has made a significant contribution to any aspect of poverty reduction, livelihoods and jobs, but poverty reduction, livelihoods and jobs is not the principal reason for undertaking the output/outcome/activity.</li>
    <li><strong>2 = Principal:</strong> The output/outcome/activity is principally meeting any aspect of poverty reduction, livelihoods and jobs, and this is fundamental in its design and expected results. The output/outcome/activity would not have been undertaken without this objective.</li>
    </ul>`;
  }

  climateInformation() {
    if (this.isP25()) {
      return `<strong>Climate adaptation and mitigation</strong>

    <ul>
      <li><strong>Example topics:</strong> Generating scientific evidence on the impact of climate change on food, land and water systems, and vice-versa; developing evidence-based solutions that support climate action, including via policies, institutions and finance; enhancing adaptive capacity of small-scale producers while reducing GHG emissions/carbon footprints; providing affordable, accessible climate-informed services; developing climate-resilient crop varieties and breeds; securing genetic resources for future climate needs; and improving methods (e.g. for modeling, forecasts).</li>
      <br/>
      <li><strong>Collective global targets:</strong>
        <ul>
          <li>Turn agriculture and forest systems into a net sink for carbon by 2050.</li>
          <li>Equip 500 million small-scale producers to be more resilient by 2030.</li>
          <li>Support countries in implementing National Adaptation Plans and Nationally Determined Contributions, and increased ambition in climate actions by 2030. education or training.</li>
        </ul>
      </li>
    </ul>`;
    }

    return `<strong>Nutrition, health and food security tag guidance</strong>
    <br>

    There are two food security and nutrition targets for at systems level:

    <ul>
      <li>To end hunger for all and enable affordable, healthy diets for the 3 billion people who do not currently have access to safe and nutritious food. </li>
      <li>To reduce cases of foodborne illness (600 million annually) and zoonotic disease (1 billion annually) by one third.</li>
    </ul>

    Three scores are possible:

    <ul>
    <li><strong>0 = Not targeted:</strong> The output/outcome/activity has been screened against the marker but has not been found to target any aspects of nutrition, health and food security.</li>
    <li><strong>1 = Significant:</strong> The output/outcome/activity has made a significant contribution to any of the above-described aspects of nutrition, health and food security, but nutrition, health and food security is not the principal reason for undertaking the output/outcome/activity.</li>
    <li><strong>2 = Principal:</strong> The output/outcome/activity is principally meeting any aspect of nutrition, health and food security, and this is fundamental in its design and expected results. The output/outcome/activity would not have been undertaken without this objective.</li>
    </ul>`;
  }

  sendIntitutionsTypes() {
    this.generalInfoBody.institutions_type = [
      ...(this.generalInfoBody?.institutions_type ?? []),
      ...(this.generalInfoBody?.institutions ?? [])
    ] as any;
  }

  onChangeKrs() {
    if (this.generalInfoBody.is_krs === false) this.generalInfoBody.krs_url = null;
  }

  onSyncSection() {
    const confirmationMessage = `Sync result with CGSpace? <br/> Unsaved changes in the section will be lost. `;

    this.customizedAlertsFeSE.show(
      {
        id: 'delete-tab',
        title: 'Sync confirmation',
        description: confirmationMessage,
        status: 'warning',
        confirmText: 'Yes, sync information'
      },
      () => {
        this.api.resultsSE.PATCH_resyncKnowledgeProducts().subscribe(resp => {
          this.getSectionInformation();
        });
      }
    );
  }

  showAlerts() {
    this.api.alertsFs.show({
      status: 'success',
      title: 'sd',
      description: `As a score of 2 has been selected, you are required to provide evidence of the Gender equality tag in the <a href="${environment.frontBaseUrl}result/result-detail/${this.api.resultsSE.currentResultCode}/evidences" target='_blank' class="open_route">Evidence</a> section `,
      querySelector: '#gender_tag_alert',
      position: 'beforeend'
    });
    this.api.alertsFs.show({
      status: 'success',
      title: 'sd',
      description: `As a score of 2 has been selected, you are required to provide evidence of the climate change tag in the <a class="open_route" href="${environment.frontBaseUrl}result/result-detail/${this.api.resultsSE.currentResultCode}/evidences" target='_blank'>Evidence</a> section`,
      querySelector: '#climate_change_tag_alert',
      position: 'beforeend'
    });
    this.api.alertsFs.show({
      status: 'success',
      title: 'sd',
      description: `As a score of 2 has been selected, you are required to provide evidence of the Nutrition, health and food security tag in the <a class="open_route" href="${environment.frontBaseUrl}result/result-detail/${this.api.resultsSE.currentResultCode}/evidences" target='_blank'>Evidence</a> section`,
      querySelector: '#nutrition_tag_alert',
      position: 'beforeend'
    });
    this.api.alertsFs.show({
      status: 'success',
      title: 'sd',
      description: `As a score of 2 has been selected, you are required to provide evidence of the Environmental health and biodiversity tag in the <a class="open_route" href="${environment.frontBaseUrl}result/result-detail/${this.api.resultsSE.currentResultCode}/evidences" target='_blank'>Evidence</a> section`,
      querySelector: '#environment_tag_alert',
      position: 'beforeend'
    });
    this.api.alertsFs.show({
      status: 'success',
      title: 'sd',
      description: `As a score of 2 has been selected, you are required to provide evidence of the Poverty reduction, livelihoods and jobs tag in the <a class="open_route" href="${environment.frontBaseUrl}result/result-detail/${this.api.resultsSE.currentResultCode}/evidences" target='_blank'>Evidence</a> section`,
      querySelector: '#poverty_tag_alert',
      position: 'beforeend'
    });
    this.requestEvent();
    const partnerRequestElement = document.getElementById('partnerRequest');
    if (partnerRequestElement) {
      try {
        partnerRequestElement.addEventListener('click', e => {
          this.api.dataControlSE.showPartnersRequest = true;
        });
      } catch (error) {
        console.error(error);
      }
    }
  }

  requestEvent() {
    this.api.dataControlSE.findClassTenSeconds('alert-event').then(resp => {
      const alertEventElement = document.querySelector('.alert-event');
      if (alertEventElement) {
        try {
          alertEventElement.addEventListener('click', e => {
            this.api.dataControlSE.showPartnersRequest = true;
          });
        } catch (error) {
          console.error(error);
        }
      }
    });
  }
}
