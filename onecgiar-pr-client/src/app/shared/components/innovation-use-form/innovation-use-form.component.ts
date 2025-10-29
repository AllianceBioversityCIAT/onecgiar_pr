import { Component, Input, OnInit, OnChanges } from '@angular/core';
import { ApiService } from '../../services/api/api.service';
import { TerminologyService } from '../../../internationalization/terminology.service';
import { FieldsManagerService } from '../../services/fields-manager.service';
import { InnovationControlListService } from '../../services/global/innovation-control-list.service';
import { InnovationUseResultsService } from '../../services/global/innovation-use-results.service';
import { InnovationDevelopmentLinks } from '../../../pages/results/pages/result-detail/pages/rd-result-types-pages/innovation-dev-info/model/InnovationDevelopmentLinks.model';
import { Actor, Organization, Measure } from '../../../pages/results/pages/result-detail/pages/rd-result-types-pages/innovation-dev-info/model/innovationDevInfoBody';
import { IpsrStep1Body } from '../../../pages/ipsr/pages/innovation-package-detail/pages/ipsr-innovation-use-pathway/pages/step-n1/model/Ipsr-step-1-body.model';


@Component({
  selector: 'app-innovation-use-form',
  templateUrl: './innovation-use-form.component.html',
  styleUrls: ['./innovation-use-form.component.scss'],
  standalone: false
})
export class InnovationUseFormComponent implements OnInit, OnChanges {
  actorsTypeList = [];
  institutionsTypeTreeList = [];
  @Input() body = new IpsrStep1Body();
  @Input() saving: boolean = false;
  innovationDevelopmentLinks: InnovationDevelopmentLinks = new InnovationDevelopmentLinks();

  constructor(
    public api: ApiService,
    private readonly terminologyService: TerminologyService,
    public fieldsManagerSE: FieldsManagerService,
    public innovationControlListSE: InnovationControlListService,
    public innovationUseResultsSE: InnovationUseResultsService
  ) {
    this.GETAllActorsTypes();
    this.GETInstitutionsTypeTree();
  }

  ngOnInit() {
    this.initializeComponentProperties();
  }

  ngOnChanges() {
    this.initializeComponentProperties();
  }

  initializeComponentProperties() {
    const body = this.body as any;

    if (!body.initiative_expected_investment) {
      body.initiative_expected_investment = [];
    }
    if (!body.bilateral_expected_investment) {
      body.bilateral_expected_investment = [];
    }
    if (!body.institutions_expected_investment) {
      body.institutions_expected_investment = [];
    }
    if (!body.reference_materials) {
      body.reference_materials = [{ link: '' }];
    }
    if (!body.pictures) {
      body.pictures = [{ link: '' }];
    }
    if (!body.studies_links) {
      body.studies_links = [{ link: '' }];
    }
    if (!body.scaling_studies_urls) {
      body.scaling_studies_urls = [{ link: '' }];
    }
    if (!body.innovation_use_2030) {
      body.innovation_use_2030 = {
        actors: [],
        measures: [],
        organization: []
      };
    }
    if (body.innov_use_to_be_determined === undefined) {
      body.innov_use_to_be_determined = false;
    }
    if (body.innov_use_2030_to_be_determined === undefined) {
      body.innov_use_2030_to_be_determined = false;
    }
    if (!body.result) {
      body.result = { title: '' };
    }
  }

  get bodyAsAny(): any {
    return this.body as any;
  }

  readiness_of_this_innovation_description() {
    return `<ul>
    <li>In case the innovation use level differs across countries or regions, we advise to assign the highest current innovation readiness level that can be supported by the evidence provided.</li>
    <li>Be realistic in assessing the use level of the innovation and keep in mind that the claimed use level needs to be supported by evidence documentation.</li>
    <li>The innovation use level will be quality assessed.</li>
    <li><strong>YOUR READINESS LEVEL IN JUST 3 CLICKS: TRY THE NEW <a href="https://www.scalingreadiness.org/calculator-readiness-headless/" class="open_route" target="_blank">INNOVATION USE CALCULATOR</a></strong></li>
    </ul>`;
  }
  hasReadinessLevelDiminished() {
    const currentLevel = this.innovationControlListSE?.readinessLevelsList.find(
      irl => irl.id === this.body?.innovation_readiness_level_id
    );
    const oldLevel = this.innovationControlListSE?.readinessLevelsList.find(irl => irl.id === this.body?.previous_irl);

    return Number(currentLevel?.level) < Number(oldLevel?.level);
  }

  alertInfoText2() {
    return `Please make sure you provide evidence/documentation that support the current innovation use level.<br>
    * Evidence are inputted in the ‘Evidence’ section <a class="open_route" target="_blank" href="/result/result-detail/${this.api.resultsSE?.currentResultCode}/evidences?phase=${this.api.resultsSE?.currentResultPhase}">(click here to go there)</a><br>
    <br>
    Documentation may include idea-notes, concept-notes, technical report, pilot testing report, experimental data paper, newsletter, etc. It may be project reports, scientific publications, book chapters, communication materials that provide evidence of the current development/ maturity stage of the innovation.
    `;
  }

  alertDiminishedReadinessLevel() {
    return `It appears that the readiness level has decreased since the previous report. Please provide a justification in the text box below.`;
  }

  GETAllActorsTypes() {
    this.api.resultsSE.GETAllActorsTypes().subscribe(({ response }) => {
      this.actorsTypeList = response;
    });
  }
  GETInstitutionsTypeTree() {
    this.api.resultsSE.GETInstitutionsTypeTree().subscribe(({ response }) => {
      this.institutionsTypeTreeList = response;
    });
  }
  private institutionsTypeTreeChildrensCache = {};

  getInstitutionsTypeTreeChildrens(institution_types_id) {
    if (this.institutionsTypeTreeChildrensCache[institution_types_id]) {
      return this.institutionsTypeTreeChildrensCache[institution_types_id];
    }

    const fundedList = this.institutionsTypeTreeList.find(inst => inst.code == institution_types_id);
    const childrens = fundedList?.childrens ?? [];

    this.institutionsTypeTreeChildrensCache[institution_types_id] = childrens;

    return childrens;
  }

  actorTypeDescription() {
    return `<li>CGIAR follows the United Nations definition of 'youth' as those persons between the ages of 15 and 24 years</li>
    <li>If age disaggregation does not apply, then please apply a 50/50% rule in dividing women or men across the youth/non-youth category</li>
    <li>We are currently working to include broader diversity dimensions beyond male, female and youth, which will be implemented in future reporting periods.</li>`;
  }

  cleanActor(actorItem) {
    actorItem.women = null;
    actorItem.women_youth = null;
    actorItem.women_non_youth = null;
    actorItem.men = null;
    actorItem.men_youth = null;
    actorItem.men_non_youth = null;
    actorItem.how_many = null;
  }

  reloadSelect(organizationItem) {
    organizationItem.hide = true;
    organizationItem.institution_sub_type_id = null;
    setTimeout(() => {
      organizationItem.hide = false;
    }, 300);
  }
  addActor() {
    this.body.innovatonUse.actors.push(new Actor());
  }
  addOrganization() {
    this.body.innovatonUse.organization.push(new Organization());
  }
  addOther() {
    this.body.innovatonUse.measures.push(new Measure());
  }

  addActor2030() {
    const body = this.body as any;
    if (!body.innovation_use_2030.actors) {
      body.innovation_use_2030.actors = [];
    }
    body.innovation_use_2030.actors.push(new Actor());
  }
  addOrganization2030() {
    const body = this.body as any;
    if (!body.innovation_use_2030.organization) {
      body.innovation_use_2030.organization = [];
    }
    body.innovation_use_2030.organization.push(new Organization());
  }
  addOther2030() {
    const body = this.body as any;
    if (!body.innovation_use_2030.measures) {
      body.innovation_use_2030.measures = [];
    }
    body.innovation_use_2030.measures.push(new Measure());
  }
  get getAllSubTypes() {
    const list = [];
    this.body.innovatonUse.organization.forEach(resp => {
      list.push({ code: resp.institution_sub_type_id });
    });
    return list;
  }

  removeOther(actors) {
    return actors.filter(item => item.actor_type_id != 5);
  }

  removeOtherInOrg(disableOrganizations) {
    return disableOrganizations.filter(item => item.code != 78);
  }

  calculateTotalField(actorItem) {
    if (!actorItem.sex_and_age_disaggregation) actorItem.how_many = Number(actorItem.women || 0) + Number(actorItem.men || 0);
  }

  get disableOrganizations() {
    const list = [];
    this.body.innovatonUse.organization.forEach(resp => {
      if (!resp.institution_sub_type_id) list.push({ code: resp.institution_types_id });
    });
    return list;
  }

  hasElementsWithId(list, attr) {
    if (!Array.isArray(list)) return 0;
    const finalList = this.api.rolesSE.readOnly
      ? list.filter(item => item && item[attr])
      : list.filter(item => item && item.is_active != false);
    return finalList.length;
  }

  removeOrganization(organizationItem) {
    organizationItem.institution_sub_type_id = null;
    organizationItem.institution_types_id = null;
    organizationItem.is_active = false;
  }
  executeTimer = null;
  validateYouth(i, isWomen: boolean, actorItem) {
    const gender = isWomen ? 'women' : 'men';
    const genderYouth = isWomen ? 'women_youth' : 'men_youth';
    const genderNonYouth = isWomen ? 'women_non_youth' : 'men_non_youth';
    clearTimeout(this.executeTimer);
    if (this.body.innovatonUse.actors[i][genderYouth] < 0 || this.body.innovatonUse.actors[i][gender] < 0) {
      if (this.body.innovatonUse.actors[i][genderYouth] < 0)
        setTimeout(() => {
          this.body.innovatonUse.actors[i][genderYouth] = null;
        }, 90);
      if (this.body.innovatonUse.actors[i][gender] < 0)
        setTimeout(() => {
          this.body.innovatonUse.actors[i][gender] = 0;
        }, 90);
    }
    if (this.body.innovatonUse.actors[i][gender] - this.body.innovatonUse.actors[i][genderYouth] < 0) {
      this.executeTimer = setTimeout(() => {
        this.body.innovatonUse.actors[i][genderYouth] = this.body.innovatonUse.actors[i].previousWomen_youth;
        this.body.innovatonUse.actors[i][gender] = this.body.innovatonUse.actors[i].previousWomen;
        this.body.innovatonUse.actors[i]['showWomenExplanation' + gender] = true;
        this.calculateTotalField(actorItem);
        setTimeout(() => {
          this.body.innovatonUse.actors[i]['showWomenExplanation' + gender] = false;
          this.calculateTotalField(actorItem);
        }, 3000);
      }, 500);
    } else {
      this.body.innovatonUse.actors[i].previousWomen = this.body.innovatonUse.actors[i][gender];
      this.body.innovatonUse.actors[i].previousWomen_youth = this.body.innovatonUse.actors[i][genderYouth];
    }
    setTimeout(() => {
      this.body.innovatonUse.actors[i][genderNonYouth] = this.body.innovatonUse.actors[i][gender] - this.body.innovatonUse.actors[i][genderYouth];
      this.calculateTotalField(actorItem);
    }, 1100);
    this.calculateTotalField(actorItem);
  }

  currentUseHeaderLabel() {
    return this.fieldsManagerSE.isP25()
      ? 'Current core innovation use in number of users that can be supported by evidence (within the reporting year).'
      : 'Specify the current use of the innovation in number of users (actors/ organizations/ other) that can be supported by evidence';
  }

  narrativeActors() {
    return `<ul>
    <li>
    If the innovation does not target specific groups of actors or people, then please specify the expected innovation use at organizational level or other use below.
    </li>
    <li>
    Individuals, organizations or networks operating within or beyond the system the ${this.terminologyService.t('term.entity.singular', this.api.dataControlSE?.currentResult?.portfolio)} or intervention aims to influence and whose actions can advance or impede the ${this.terminologyService.t('term.entity.singular', this.api.dataControlSE?.currentResult?.portfolio)}'s aims.
    </li>
    <li>
    The numbers for 'youth' and 'non-youth' equal the total number for 'Women' or 'Men'.
    </li>
    </ul>`;
  }

  getReadinessLevelIndex(): number {
    if (!this.body.innovation_readiness_level_id || !this.innovationControlListSE.readinessLevelsList) {
      return -1;
    }

    const selectedId = this.body.innovation_readiness_level_id;
    const index = this.innovationControlListSE.readinessLevelsList.findIndex(level => level.id === selectedId);
    return index >= 0 ? index : -1;
  }

}
