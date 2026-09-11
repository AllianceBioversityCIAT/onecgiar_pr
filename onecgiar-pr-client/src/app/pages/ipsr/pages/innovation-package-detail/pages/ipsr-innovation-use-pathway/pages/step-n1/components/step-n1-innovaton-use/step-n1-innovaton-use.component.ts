import { ChangeDetectorRef, Component, Input, OnInit } from '@angular/core';
import { Actor, IpsrStep1Body, Measure, Organization } from '../../model/Ipsr-step-1-body.model';
import { ApiService } from '../../../../../../../../../../shared/services/api/api.service';

@Component({
  selector: 'app-step-n1-innovaton-use',
  templateUrl: './step-n1-innovaton-use.component.html',
  styleUrls: ['./step-n1-innovaton-use.component.scss'],
  standalone: false
})
export class StepN1InnovatonUseComponent implements OnInit {
  actorsTypeList = [];
  institutionsTypeTreeList = [];
  executeTimer = null;
  @Input() body = new IpsrStep1Body();

  constructor(
    public api: ApiService,
    private readonly cdr: ChangeDetectorRef
  ) {
    this.GETAllActorsTypes();
    this.GETInstitutionsTypeTree();
  }

  ngOnInit() {
    this.GETAllActorsTypes();
    this.GETInstitutionsTypeTree();
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

  getInstitutionsTypeTreeChildrens(institution_types_id) {
    const fundedList = this.institutionsTypeTreeList.find(inst => inst.code == institution_types_id);
    return fundedList?.childrens ?? [];
  }

  actorTypeDescription() {
    return `<li>CGIAR follows the United Nations definition of 'youth' as those persons between the ages of 15 and 24 years</li><li>If age disaggregation does not apply, then please apply a 50/50% rule in dividing women or men across the youth/non-youth category</li>`;
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
    const finalList = this.api.rolesSE.readOnly ? list.filter(item => item[attr]) : list.filter(item => item.is_active != false);
    return finalList.length;
  }

  removeOrganization(organizationItem) {
    //(organizationItem);
    organizationItem.institution_sub_type_id = null;
    organizationItem.institution_types_id = null;
    organizationItem.is_active = false;
  }

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

  narrativeActors() {
    return `
    <ul>
    <li>
    If the innovation does not target specific groups of actors or people, then please specify the expected innovation use at organizational level or other use below. The numbers should reflect the expected innovation use by end of 2024.
    </li>
    <li>
    The numbers for ‘youth' and 'non-youth' equal the total number for 'Women' or 'Men’.
    </li>
    </ul>
    `;
  }
}
