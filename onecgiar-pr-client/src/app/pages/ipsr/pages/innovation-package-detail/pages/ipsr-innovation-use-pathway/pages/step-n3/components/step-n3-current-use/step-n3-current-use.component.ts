import { ChangeDetectorRef, Component, Input, OnInit } from '@angular/core';
import { ActorN3, IpsrStep3Body, MeasureN3, OrganizationN3 } from '../../model/Ipsr-step-3-body.model';
import { ApiService } from '../../../../../../../../../../shared/services/api/api.service';
import { CURRENT_USE_UPDATE_COPY } from '../../../../../../../../../../internationalization/current-use-update.copy';
import {
  PreviousUseByCategory,
  TotalsByCategory,
  actorRowTotal,
  newUsersByCategory,
  NewUsersByCategory,
  newUsersExceedsMessage,
  newUsersExceedsTotal,
  newUsersValue,
  hasAnyPreviousFigure,
  previousUseByCategory,
  previousUsePhaseYear,
  totalsByCategory
} from '../../../../../../../../../../shared/utils/current-use-update.util';

/** IU26-R-13 — first phase year of the IPSR current-use update (same year the server gates `new_users` on). */
export const IPSR_IU26_FROM_YEAR = 2026;

@Component({
  selector: 'app-step-n3-current-use',
  templateUrl: './step-n3-current-use.component.html',
  styleUrls: ['./step-n3-current-use.component.scss'],
  standalone: false
})
export class StepN3CurrentUseComponent implements OnInit {
  @Input() body = new IpsrStep3Body();
  actorsTypeList = [];
  executeTimer = null;
  institutionsTypeTreeList = [];

  readonly copy = CURRENT_USE_UPDATE_COPY;
  readonly categoryLabels = CURRENT_USE_UPDATE_COPY.categoryLabels;

  constructor(
    public api: ApiService,
    private readonly cdr: ChangeDetectorRef
  ) {}

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

  hasElementsWithId(list, attr, significantFields?: string[]) {
    // A row the user just added (`new ActorN3()` / `OrganizationN3` / `MeasureN3`) has no `is_active` yet but is
    // already on screen; only an explicitly removed row (`is_active === false`) is hidden (P2-3842). When
    // `significantFields` is given, a blank placeholder row does not count until one of those fields has data
    // (bugfix/ipsr-empty-state-active-check).
    const finalList = this.api.rolesSE.readOnly
      ? list.filter(item => item[attr])
      : list.filter(item => item.is_active != false && (!significantFields || significantFields.some(f => !!item[f])));
    return finalList.length;
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
    this.body.innovatonUse.actors.push(new ActorN3());
  }

  addOrganization() {
    this.body.innovatonUse.organization.push(new OrganizationN3());
  }

  addOther() {
    this.body.innovatonUse.measures.push(new MeasureN3());
  }

  get getAllSubTypes() {
    const list = [];
    this.body.innovatonUse.organization.forEach(resp => {
      list.push({ code: resp.institution_sub_type_id });
    });
    return list;
  }

  get disableOrganizations() {
    const list = [];
    this.body.innovatonUse.organization.forEach(resp => {
      if (!resp.institution_sub_type_id) list.push({ code: resp.institution_types_id });
    });
    return list;
  }

  removeOrganization(organizationItem) {
    organizationItem.institution_sub_type_id = null;
    organizationItem.institution_types_id = null;
    organizationItem.is_active = false;
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
        const element: any = document.getElementById('removeFocus');
        element.focus();
        this.calculateTotalField(actorItem);
        this.cdr.markForCheck();
        setTimeout(() => {
          this.body.innovatonUse.actors[i]['showWomenExplanation' + gender] = false;
          this.cdr.markForCheck();
        }, 3000);
        this.calculateTotalField(actorItem);
      }, 1000);
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

  /**
   * IU26-R-13 — true from the 2026 phase onwards. The ONLY source is `currentResultSignal().phase_year` (P-24: the
   * phase of the Innovation Package open on screen, set by `GETInnovationPackageDetail`). No fallback: with no
   * phase year the step keeps today's behaviour (fail open to the 2025 copy and fields).
   */
  isIu2026(): boolean {
    const year = this.api?.dataControlSE?.currentResultSignal?.()?.phase_year;
    return typeof year === 'number' && year >= IPSR_IU26_FROM_YEAR;
  }

  currentUseQuestion(): string {
    return CURRENT_USE_UPDATE_COPY.question2026(this.api?.dataControlSE?.currentResultSignal?.()?.phase_year);
  }

  get howManyLabel(): string {
    return this.isIu2026() ? CURRENT_USE_UPDATE_COPY.howManyTotalLabel : 'How many';
  }

  get quantityLabel(): string {
    return this.isIu2026() ? CURRENT_USE_UPDATE_COPY.quantityTotalLabel : 'Quantity';
  }

  /** IU26-R-4 — the previous phase's figures per category, for reference only (null when the server sent none). */
  hasPreviousUse(): boolean {
    return hasAnyPreviousFigure(this.body?.current_use_previous);
  }

  previousUseByCategory(): PreviousUseByCategory | null {
    const previous = this.body?.current_use_previous;
    return previous ? previousUseByCategory(previous) : null;
  }

  previousUseHeading(): string {
    return CURRENT_USE_UPDATE_COPY.previousUseHeading(previousUsePhaseYear(this.body?.current_use_previous));
  }

  private liveRows(rows: any[] | null | undefined): any[] {
    return (rows ?? []).filter(row => row && row.is_active != false);
  }

  /**
   * IU26-R-7 — read-only totals per category from the current rows (never stored). IPSR has no households unit,
   * so every actor row counts as individuals and the Households tile never exists. Actor rows without the
   * "does not apply" flag read Women + Men; the others their typed `how_many`.
   */
  currentUseTotals(): TotalsByCategory | null {
    if (!this.isIu2026()) return null;
    const use = this.body?.innovatonUse;
    const actors = this.liveRows(use?.actors).map(actor => ({ ...actor, count_unit: null, how_many: actorRowTotal(actor) }));
    const totals = totalsByCategory(actors, this.liveRows(use?.organization), this.liveRows(use?.measures));
    const hasAny = totals.actorsIndividuals !== null || totals.organizations !== null || totals.measures.length > 0;
    return hasAny ? { ...totals, households: null } : null;
  }

  currentUseNewUsers(): NewUsersByCategory {
    const use = this.body?.innovatonUse;
    return newUsersByCategory(
      this.liveRows(use?.actors).map(actor => ({ ...actor, count_unit: null })),
      this.liveRows(use?.organization),
      this.liveRows(use?.measures)
    );
  }

  newUsersForUnit(unit: string): number | null {
    const key = String(unit ?? '').trim().toLowerCase();
    return this.currentUseNewUsers().measures.find(m => m.unit.toLowerCase() === key)?.newUsers ?? null;
  }

  ofWhichNew(value: number | null | undefined): string {
    return CURRENT_USE_UPDATE_COPY.ofWhichNew(value ?? null);
  }

  /** IU26-R-13 — the total a row's NEW is compared with: actors Women + Men (or `how_many`), organizations `how_many`, measures `quantity`. */
  rowTotal(row: any, kind: 'actor' | 'organization' | 'measure'): number {
    if (kind === 'actor') return actorRowTotal(row);
    return Number(kind === 'organization' ? row?.how_many : row?.quantity) || 0;
  }

  newUsersExceeds(row: any, kind: 'actor' | 'organization' | 'measure'): boolean {
    return newUsersExceedsTotal(row?.new_users, this.rowTotal(row, kind));
  }

  newUsersMessage(row: any, kind: 'actor' | 'organization' | 'measure'): string {
    return newUsersExceedsMessage(row?.new_users, this.rowTotal(row, kind));
  }

  /** IU26-R-11 — true when any active row has NEW above its total (feeds the completeness marker). */
  anyNewUsersExceeds(): boolean {
    const use = this.body?.innovatonUse;
    return (
      this.liveRows(use?.actors).some(r => this.newUsersExceeds(r, 'actor')) ||
      this.liveRows(use?.organization).some(r => this.newUsersExceeds(r, 'organization')) ||
      this.liveRows(use?.measures).some(r => this.newUsersExceeds(r, 'measure'))
    );
  }

  /** A cleared input is `null` (never `''` / `undefined`), so the payload always carries the key. */
  setNewUsers(row: any, value: unknown) {
    row.new_users = newUsersValue(value);
    this.cdr.markForCheck();
  }

  narrativeActors() {
    const unspecified = this.isIu2026() ? '' : 'expected ';
    return `
    <ul>
    <li>
    If the innovation does not target specific groups of actors or people, then please specify the ${unspecified}innovation use at organizational level or other use below.
    </li>
    <li>
    The numbers for ‘youth' and 'non-youth' equal the total number for 'Women' or 'Men’.
    </li>
    </ul>
    `;
  }
}
