import { Component, Input, OnInit, OnChanges, computed, ChangeDetectorRef } from '@angular/core';
import { ApiService } from '../../services/api/api.service';
import { TerminologyService } from '../../../internationalization/terminology.service';
import { FieldsManagerService } from '../../services/fields-manager.service';
import { InnovationControlListService } from '../../services/global/innovation-control-list.service';
import { InnovationDevelopmentLinks } from '../../../pages/results/pages/result-detail/pages/rd-result-types-pages/innovation-dev-info/model/InnovationDevelopmentLinks.model';
import {
  Actor,
  Organization,
  Measure
} from '../../../pages/results/pages/result-detail/pages/rd-result-types-pages/innovation-dev-info/model/innovationDevInfoBody';
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
  @Input() saving: boolean = true;
  @Input() isIpsr: boolean = false;
  innovationDevelopmentLinks: InnovationDevelopmentLinks = new InnovationDevelopmentLinks();

  constructor(
    public api: ApiService,
    private readonly terminologyService: TerminologyService,
    public fieldsManagerSE: FieldsManagerService,
    public innovationControlListSE: InnovationControlListService,
    private readonly cdr: ChangeDetectorRef
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
    <li>In case the innovation use level differs across countries or regions, we advise to assign the highest current innovation use level that can be supported by the evidence provided.</li>
    <li>Be realistic in assessing the use level of the innovation and keep in mind that the claimed use level needs to be supported by evidence documentation.</li>
    <li>The innovation use level will be quality assessed.</li>
    <li><strong>YOUR USE LEVEL IN JUST 3 CLICKS: <a href="https://www.scalingreadiness.org/calculator-use-headless/" class="open_route" target="_blank" style="text-decoration: none !important;"><span style="border-bottom: 1px solid currentColor;">TRY THE NEW INNOVATION USE CALCULATOR</span></a></strong></li>
    </ul>`;
  }
  hasReadinessLevelDiminished() {
    const currentLevel = this.innovationControlListSE?.readinessLevelsList.find(irl => irl.id === this.body?.innovation_readiness_level_id);
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
    organizationItem.institution_sub_type_id = null;
    organizationItem.hide = true;
    this.cdr.detectChanges();
    organizationItem.hide = false;
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

  get getAllSubTypes2030() {
    const list = [];
    const body = this.body as any;
    if (body.innovation_use_2030?.organization) {
      body.innovation_use_2030.organization.forEach(resp => {
        list.push({ code: resp.institution_sub_type_id });
      });
    }
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

  get disableOrganizations2030() {
    const list = [];
    const body = this.body as any;
    if (body.innovation_use_2030?.organization) {
      body.innovation_use_2030.organization.forEach(resp => {
        if (!resp.institution_sub_type_id) list.push({ code: resp.institution_types_id });
      });
    }
    return list;
  }

  hasElementsWithId(list, attr) {
    if (!Array.isArray(list)) return 0;
    const finalList = this.api.rolesSE.readOnly ? list.filter(item => item && item[attr]) : list.filter(item => item && item.is_active != false);
    return finalList.length;
  }

  removeOrganization(organizationItem) {
    organizationItem.institution_sub_type_id = null;
    organizationItem.institution_types_id = null;
    organizationItem.is_active = false;
  }
  executeTimer = null;
  // P2-3322: every write below lands on `this.body.innovatonUse.actors[i]`, an external object reached
  // through an @Input, and every one of them happens inside a timer. Unlike P2-3245 / P2-3275, where the
  // flag was a component field that could be turned into a signal, nothing here can be made reactive: the
  // "showWomenExplanation<gender>" key is even built at runtime. Under zoneless change detection a write
  // inside a timer notifies no scheduler, so no second render pass ran: the "value of Youth cannot be
  // greater than total of Women/Men" warning never appeared or never went away, the clamped Women/Men/Youth
  // values stayed stale on screen, and the auto-calculated Non-youth field never refreshed.
  // `markForCheck()` marks this view and its ancestors dirty and notifies the scheduler, so it keeps working
  // regardless of the change detection strategy used above (unlike a refresh driven from the root).
  validateYouth(i, isWomen: boolean, actorItem) {
    const gender = isWomen ? 'women' : 'men';
    const genderYouth = isWomen ? 'women_youth' : 'men_youth';
    const genderNonYouth = isWomen ? 'women_non_youth' : 'men_non_youth';
    clearTimeout(this.executeTimer);
    if (this.body.innovatonUse.actors[i][genderYouth] < 0 || this.body.innovatonUse.actors[i][gender] < 0) {
      if (this.body.innovatonUse.actors[i][genderYouth] < 0)
        setTimeout(() => {
          this.body.innovatonUse.actors[i][genderYouth] = null;
          this.cdr.markForCheck();
        }, 90);
      if (this.body.innovatonUse.actors[i][gender] < 0)
        setTimeout(() => {
          this.body.innovatonUse.actors[i][gender] = 0;
          this.cdr.markForCheck();
        }, 90);
    }
    if (this.body.innovatonUse.actors[i][gender] - this.body.innovatonUse.actors[i][genderYouth] < 0) {
      this.executeTimer = setTimeout(() => {
        this.body.innovatonUse.actors[i][genderYouth] = this.body.innovatonUse.actors[i].previousWomen_youth;
        this.body.innovatonUse.actors[i][gender] = this.body.innovatonUse.actors[i].previousWomen;
        this.body.innovatonUse.actors[i]['showWomenExplanation' + gender] = true;
        this.calculateTotalField(actorItem);
        this.cdr.markForCheck();
        setTimeout(() => {
          this.body.innovatonUse.actors[i]['showWomenExplanation' + gender] = false;
          this.calculateTotalField(actorItem);
          this.cdr.markForCheck();
        }, 3000);
      }, 500);
    } else {
      this.body.innovatonUse.actors[i].previousWomen = this.body.innovatonUse.actors[i][gender];
      this.body.innovatonUse.actors[i].previousWomen_youth = this.body.innovatonUse.actors[i][genderYouth];
    }
    setTimeout(() => {
      this.body.innovatonUse.actors[i][genderNonYouth] = this.body.innovatonUse.actors[i][gender] - this.body.innovatonUse.actors[i][genderYouth];
      this.calculateTotalField(actorItem);
      this.cdr.markForCheck();
    }, 1100);
    this.calculateTotalField(actorItem);
  }

  currentUseHeaderLabel() {
    return this.fieldsManagerSE.isP25()
      ? 'Current core innovation use in number of users that can be supported by evidence (within the reporting year).'
      : 'Specify the current use of the innovation in number of users (actors/ organizations/ other) that can be supported by evidence';
  }

  narrativeActors = computed(() => {
    if (this.fieldsManagerSE.isP25()) {
      return `<ul>
      <li>
      If the innovation does not target specific groups of actors or people, then please specify the expected innovation use at organizational level or other use. The numbers should reflect the expected innovation use by end of 2030.
      </li>
      <li>
      Add information for as many as applicable.
      </li>
      <li>
      CGIAR follows the United Nations definition of 'youth' as those persons between the ages of 15 and 24 years.
      </li>
      <li>
      If age disaggregation does not apply then please apply a 50/50% rule in dividing women or men across the youth/non-youth category.
      </li>
      </ul>`;
    }
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
  });

  getUseLevelIndex(): number {
    const selectedId = this.body?.innovation_use_level_id;
    const list = this.innovationControlListSE?.useLevelsList || [];
    if (!selectedId || !list.length) return -1;

    const selected = list.find((lvl: any) => String(lvl?.id) === String(selectedId));
    const levelNumber = Number(selected?.level);
    return Number.isFinite(levelNumber) ? levelNumber : -1;
  }

  /**
   * P2-3294: the 2026 phase drops the "Have any studies been conducted to inform the innovation
   * scaling strategy design (...)" question (and its follow-up link list) once the Innovation Use
   * Level reaches 6+. Confirmed by Angel Jarrín (PO), 26-Aug-2026. Phases <= 2025 keep the
   * question exactly as it behaved before this ticket, regardless of level.
   *
   * Gated on `phase_year`, never on `isP25()`/portfolio — per the epic P2-3243 rule (reporting/
   * CLAUDE.md rule 9): prtest holds 2025-phase results inside the P25 portfolio, and a portfolio
   * gate would strip the question from those too. Mirrors the `phase_year >= <2026 threshold>`
   * pattern used by `FieldsManagerService`'s other 2026 gates (e.g. `isContributorsPartners2026`),
   * kept local here rather than added to the shared `ReportingDesignYear` enum/service because
   * this ticket's file scope is `innovation-use-form/**` only.
   *
   * Fails OPEN (returns false, i.e. "don't hide") when `phase_year` or the resolved use level
   * aren't available yet — an in-flight load, or a host (like IPSR step-n1) that never wires up
   * `innovation_use_level_id`/`phase_year` — must never hide a question by mistake; it just keeps
   * whatever the pre-existing `getUseLevelIndex() >= 5` gate already decided.
   */
  private static readonly SCALING_STUDIES_QUESTION_HIDE_YEAR = 2026;

  isScalingStudiesQuestionHiddenByLevel(): boolean {
    const phaseYear = this.api?.dataControlSE?.currentResultSignal?.()?.phase_year ?? this.api?.dataControlSE?.reportingCurrentPhase?.phaseYear;
    if (typeof phaseYear !== 'number' || phaseYear < InnovationUseFormComponent.SCALING_STUDIES_QUESTION_HIDE_YEAR) {
      return false;
    }
    const level = this.getUseLevelIndex();
    if (level < 0) return false;
    return level >= 6;
  }

}
