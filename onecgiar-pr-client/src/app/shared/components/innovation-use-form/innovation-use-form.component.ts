import { Component, Input, OnInit, OnChanges, computed, ChangeDetectorRef } from '@angular/core';
import { provideIcons } from '@ng-icons/core';
import { lucideInfo } from '@ng-icons/lucide';
import { INNOVATION_USE_2030_PROJECTION_COPY } from '../../../internationalization/innovation-use-2030-projection.copy';
import { CURRENT_USE_UPDATE_COPY } from '../../../internationalization/current-use-update.copy';
import { INNOVATION_USE_YOUTH_REQUIRED_COPY } from '../../../internationalization/innovation-use-youth-required.copy';
import {
  actorRowTotal,
  isCurrentUseNarrativeComplete,
  newUsersByCategory,
  newUsersExceedsMessage,
  newUsersExceedsTotal,
  previousUseByCategory,
  totalsByCategory,
  type NewUsersByCategory,
  type PreviousUseByCategory,
  type TotalsByCategory
} from '../../utils/current-use-update.util';
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
import {
  FARMERS_ACTOR_TYPE_ID,
  FARMER_COUNT_UNIT,
  FARMER_FOLLOW_UP_COPY,
  FARMER_FOLLOW_UP_MIN_PHASE_YEAR,
  W3_BILATERALS_SOURCE_NAME
} from './farmer-follow-up';
import { IpsrStep1Body } from '../../../pages/ipsr/pages/innovation-package-detail/pages/ipsr-innovation-use-pathway/pages/step-n1/model/Ipsr-step-1-body.model';

@Component({
  selector: 'app-innovation-use-form',
  templateUrl: './innovation-use-form.component.html',
  styleUrls: ['./innovation-use-form.component.scss'],
  providers: [provideIcons({ lucideInfo })],
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
    // P2-3537: "sex and age" switches BOTH off, so the age-only fallback has no meaning
    // while it is ticked. Leaving it set would send a contradiction to the server.
    actorItem.age_disaggregation_not_available = null;
    actorItem.youth_split_applied_by_system = null;
  }

  /**
   * P2-3537 section 7 — the age-only fallback.
   *
   * Shown from the 2026 phase, per actor row, and only while "Sex and age disaggregation
   * does not apply" is NOT ticked: that one already switches both off, so offering an
   * age-only option next to it would be two answers to the same question.
   *
   * 🛑 Not offered inside IPSR. This template is shared with Innovation Package step 1,
   * and the story scopes itself to Innovation Use results. Gating IPSR out explicitly
   * rather than by omission is the lesson P2-3295 left on this same component.
   */
  showAgeFallback(actorItem): boolean {
    return this.fieldsManagerSE.isInnovationUseAgeFallback2026() && !this.isIpsr && !actorItem?.sex_and_age_disaggregation;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // P2-3537 §4 — the Current Use Update block
  // P2-3985 — the rules live in `shared/utils/current-use-update.util.ts`, shared with the
  // W3/bilateral form; this component keeps only its own gate and its own actor sum.
  // ─────────────────────────────────────────────────────────────────────────────

  /** Hard limit on the expansion narrative, per the story. */
  readonly maxNarrativeWords = CURRENT_USE_UPDATE_COPY.maxNarrativeWords;
  /** IU26-R-4 — category labels of the previous-use block. */
  readonly categoryLabels = CURRENT_USE_UPDATE_COPY.categoryLabels;
  /** IU26-DD-10 — the CUU block's own strings (header, validation label, narrative placeholder). */
  readonly cuuCopy = CURRENT_USE_UPDATE_COPY;

  /**
   * True when the Current Use Update block is rendered at all.
   *
   * Three conditions, and every one of them is a way this would have gone wrong:
   *
   * - From the 2026 phase only. Earlier rounds keep the section exactly as it is today.
   * - Not inside IPSR: this template is shared with Innovation Package step 1, which the story
   *   does not cover.
   * - 🥇 Only when the previous phase reported something (`current_use_previous` not null). The server
   *   returns `null` for a first report; a
   *   previous phase with organizations only now yields a non-null value (IU26-R-3), so the block is
   *   shown there. ABSENT, not merely empty, when null.
   */
  showCurrentUseUpdate(): boolean {
    return (
      this.fieldsManagerSE.isInnovationUseAgeFallback2026() &&
      !this.isIpsr &&
      !!this.body?.current_use_previous
    );
  }

  /**
   * IU26 (R-1) — the 2026 current-use surface of W1/W2: phase 2026+ and not IPSR. Pre-2026 and IPSR step 1
   * keep today's labels, order and copy byte for byte. Keyed on the phase year through the fields-manager
   * gate (P-14), never on the portfolio.
   */
  isCurrentUse2026(): boolean {
    return !this.isIpsr && !!this.fieldsManagerSE.isInnovationUseAgeFallback2026();
  }

  /**
   * IU26-R-6 — the `2026` in the labels is the result's phase year. The gate already guarantees >= 2026, so an
   * unresolved year (which the gate would not have let through) falls back to 2026, the only year in this release.
   */
  currentUseYear(): number {
    return this.currentResultPhaseYear() ?? 2026;
  }

  /**
   * IU26-R-7 — read-only totals per category, computed from the current-use rows only (never the 2030 projection)
   * and never stored. Rows removed in the form (`is_active == false`, which also covers `0`) are dropped before the
   * util sees them. Actor rows flagged "sex and age disaggregation does not apply" keep their typed `how_many`; the
   * others use the Women + Men sum, so the figure does not depend on `how_many` having been synced. Gate: 2026
   * current-use only (`isCurrentUse2026()`), exactly like the "– total" labels; null means no grid.
   */
  currentUseTotals(): TotalsByCategory | null {
    if (!this.isCurrentUse2026()) return null;
    const live = (rows: any[] | null | undefined) => (rows ?? []).filter(row => row && row.is_active != false);
    const actors = live(this.body?.innovatonUse?.actors).map((actor: any) =>
      actor.sex_and_age_disaggregation ? actor : { ...actor, how_many: Number(actor.women || 0) + Number(actor.men || 0) }
    );
    const totals = totalsByCategory(actors, live(this.body?.innovatonUse?.organization), live(this.body?.innovatonUse?.measures));
    const hasAny = totals.actorsIndividuals !== null || totals.households !== null || totals.organizations !== null || totals.measures.length > 0;
    return hasAny ? totals : null;
  }

  /** IU26-R-4 — the previous phase's figures per category, for reference only. */
  previousUseByCategory(): PreviousUseByCategory {
    return previousUseByCategory(this.body?.current_use_previous);
  }

  /** IU26-R-4 — "Previous reported use (FY<year> · for reference only)". */
  previousUseHeading(): string {
    const year = Number(this.body?.current_use_previous?.phase_year);
    return CURRENT_USE_UPDATE_COPY.previousUseHeading(Number.isFinite(year) && year > 0 ? year : null);
  }

  /** IU26-R-5 — "Brief narrative on how use changed in 2026". */
  currentUseNarrativeLabel(): string {
    return CURRENT_USE_UPDATE_COPY.narrativeLabel2026(this.currentUseYear());
  }

  /** IU26-R-8 — "How many – total" on 2026 current-use rows, "How many" everywhere else. */
  howManyLabel(): string {
    return this.isCurrentUse2026() ? CURRENT_USE_UPDATE_COPY.howManyTotalLabel : 'How many';
  }

  /** IU26-R-8 — "Quantity – total" on 2026 current-use rows, "Quantity" everywhere else. */
  quantityLabel(): string {
    return this.isCurrentUse2026() ? CURRENT_USE_UPDATE_COPY.quantityTotalLabel : 'Quantity';
  }

  /** IU26-R-8 — the guidance above the rows; the NEW sentence only where the NEW input exists (W1/W2, never W3). */
  currentUseGuidance(): { title: string; lines: string[] } {
    return CURRENT_USE_UPDATE_COPY.guidance(this.currentUseYear(), this.isNewUsersEnabled());
  }

  /**
   * IU26-R-11 / R-12 — the optional "Of which NEW" input exists on 2026 W1/W2 current-use rows only: never IPSR,
   * never a W3/Bilaterals result (which reads the same form through `innovation-use-info`), never the 2030 rows.
   */
  isNewUsersEnabled(): boolean {
    return this.isCurrentUse2026() && this.api?.dataControlSE?.currentResultSignal?.()?.source_name !== W3_BILATERALS_SOURCE_NAME;
  }

  /** IU26-R-11 — the row total NEW is compared with: actors per `actorRowTotal`, organizations `how_many`, measures `quantity`. */
  newUsersTotal(kind: 'actor' | 'organization' | 'measure', row: any): number {
    if (kind === 'actor') return actorRowTotal(row);
    return Number(kind === 'organization' ? row?.how_many : row?.quantity) || 0;
  }

  /** IU26-R-11 — NEW higher than the row total (blank NEW is valid). Only evaluated where the input exists. */
  newUsersInvalid(kind: 'actor' | 'organization' | 'measure', row: any): boolean {
    return this.isNewUsersEnabled() && row?.is_active !== false && newUsersExceedsTotal(row?.new_users, this.newUsersTotal(kind, row));
  }

  /** IU26-R-11 — "New users (N) cannot be higher than the total (M)." */
  newUsersError(kind: 'actor' | 'organization' | 'measure', row: any): string {
    return newUsersExceedsMessage(row?.new_users, this.newUsersTotal(kind, row));
  }

  /** IU26-R-11 — false while any active current-use row has NEW above its total; feeds the mandatory-field scan (blocks submit). */
  isNewUsersComplete(): boolean {
    if (!this.isNewUsersEnabled()) return true;
    const use = this.body?.innovatonUse;
    const anyInvalid = (kind: 'actor' | 'organization' | 'measure', rows: any[] | undefined) => (rows ?? []).some(row => this.newUsersInvalid(kind, row));
    return !(anyInvalid('actor', use?.actors) || anyInvalid('organization', use?.organization) || anyInvalid('measure', use?.measures));
  }

  /** IU26-R-7 — "of which new" per total tile; null when the gate is off. */
  currentUseNewUsers(): NewUsersByCategory | null {
    if (!this.isNewUsersEnabled()) return null;
    const live = (rows: any[] | null | undefined) => (rows ?? []).filter(row => row && row.is_active != false);
    const use = this.body?.innovatonUse;
    return newUsersByCategory(live(use?.actors), live(use?.organization), live(use?.measures));
  }

  /** IU26-R-7 — the "Of which new: N / not available" line of a tile. */
  ofWhichNew(value: number | null | undefined): string {
    return CURRENT_USE_UPDATE_COPY.ofWhichNew(value ?? null);
  }

  /** Unit lookup for the measures tile (same trimmed, case-insensitive key as the totals). */
  newUsersForUnit(unit: string): number | null {
    const key = String(unit ?? '').trim().toLowerCase();
    return this.currentUseNewUsers()?.measures.find(m => m.unit.toLowerCase() === key)?.newUsers ?? null;
  }

  /**
   * Completion rule for the block, fed to the mandatory-field scan. IU26-R-5: the narrative alone answers it
   * (no "New users added", no reconciliation), within the 100-word limit.
   */
  isCurrentUseNarrativeComplete(): boolean {
    if (!this.showCurrentUseUpdate()) return true;
    return isCurrentUseNarrativeComplete(this.body?.use_expansion_narrative);
  }

  /** True when the youth figures on this row were computed rather than typed. */
  isYouthSplitBySystem(actorItem): boolean {
    return !!actorItem?.youth_split_applied_by_system;
  }

  /**
   * Applies — or undoes — the 50/50 split when the reporter ticks the age-only fallback.
   *
   * Half of Women goes to youth and the remainder to non-youth; same for Men. Rounding
   * cannot break the arithmetic because Non-youth is always derived as the difference, so
   * the two halves add up to the total whatever the parity.
   *
   * 🥇 It stamps `youth_split_applied_by_system`, which is what lets any later report tell
   * an estimate from a reported figure — the story asks for that explicitly. Unticking
   * clears the youth values as well as the stamp: leaving the computed halves behind
   * would turn a system estimate into what looks like the reporter's own answer, which is
   * the exact confusion the stamp exists to prevent.
   */
  applyAgeDisaggregationFallback(actorItem): void {
    if (!actorItem?.age_disaggregation_not_available) {
      actorItem.women_youth = null;
      actorItem.men_youth = null;
      actorItem.women_non_youth = null;
      actorItem.men_non_youth = null;
      actorItem.youth_split_applied_by_system = null;
      this.calculateTotalField(actorItem);
      this.cdr.markForCheck();
      return;
    }

    const half = (total: any) => {
      const n = Number(total);
      return Number.isFinite(n) && n > 0 ? Math.round(n / 2) : 0;
    };

    actorItem.women_youth = half(actorItem.women);
    actorItem.men_youth = half(actorItem.men);
    actorItem.women_non_youth = (Number(actorItem.women) || 0) - actorItem.women_youth;
    actorItem.men_non_youth = (Number(actorItem.men) || 0) - actorItem.men_youth;
    actorItem.youth_split_applied_by_system = true;

    this.calculateTotalField(actorItem);
    this.cdr.markForCheck();
  }

  /**
   * Re-runs the split when Women or Men change while the fallback is on — otherwise the
   * halves would go stale and stop matching the total the reporter just typed.
   */
  recalculateAgeFallback(actorItem): void {
    if (actorItem?.age_disaggregation_not_available) {
      this.applyAgeDisaggregationFallback(actorItem);
    }
  }

  reloadSelect(organizationItem) {
    organizationItem.institution_sub_type_id = null;
    organizationItem.hide = true;
    this.cdr.detectChanges();
    organizationItem.hide = false;
  }
  addActor() {
    this.body.innovatonUse.actors.push(this.newActor());
  }

  /** IFC: a new row of the Innovation Use host starts with both follow-up answers at `null` (never `undefined`). */
  private newActor(): Actor {
    const actor = new Actor();
    if (!this.isIpsr) {
      actor.count_unit = null;
      actor.use_nature = null;
    }
    return actor;
  }
  addOrganization() {
    this.body.innovatonUse.organization.push(new Organization());
  }
  addOther() {
    this.body.innovatonUse.measures.push(new Measure());
  }

  /**
   * ── P2-3295 §3 — reviewing a 2030 projection inherited from the previous reporting phase ──────
   *
   * Scenario A (no previous phase): `innovation_use_2030_previous` arrives as null, nothing below
   * fires, and the four sub-fields stay blank and editable — the behaviour that existed before.
   *
   * Scenario B: the inherited projection is shown LOCKED. Answering "Yes" unlocks it, and a
   * justification is asked for only once a value has actually changed.
   *
   * ⚠️ The wording of the Yes/No question is NOT in the story — the story only gives the table of
   * behaviours for "Yes" and "No". Written here so the flow can exist, and flagged in the ticket as
   * copy to confirm with business; the two behaviours it drives are the specified part.
   */
  reviewing2030Projection = false;

  readonly projection2030ReviseQuestion = 'Do you need to revise the 2030 projection reported in the previous phase?';

  readonly projection2030JustificationLabel = 'Please justify the change to the 2030 projection';

  readonly projection2030PreviousNote =
    'These values are the 2030 projection reported for this result in the previous reporting phase. They stay as they were reported unless you choose to revise them.';

  /** Scenario B is on only when the server actually sent a previous-phase projection. */
  get has2030PreviousProjection(): boolean {
    return !!(this.body as any)?.innovation_use_2030_previous;
  }

  /** Locked = inherited and not being revised. Never locked in Scenario A. */
  get projection2030Locked(): boolean {
    return this.has2030PreviousProjection && !this.reviewing2030Projection;
  }

  /**
   * A change against what the previous phase reported — not "the user typed something", which would
   * ask for a justification after a change that was undone.
   */
  get projection2030Changed(): boolean {
    if (!this.has2030PreviousProjection) return false;
    const previous = (this.body as any).innovation_use_2030_previous;
    return this.projection2030Signature(this.body?.innovation_use_2030) !== this.projection2030Signature(previous);
  }

  get projection2030JustificationRequired(): boolean {
    return this.reviewing2030Projection && this.projection2030Changed;
  }

  /**
   * Only the values a reporter can edit, in a stable order: ids, timestamps and `is_active` differ
   * between two phases by construction and would report a change nobody made.
   */
  private projection2030Signature(projection: any): string {
    const actors = (projection?.actors ?? [])
      .filter((a: any) => a?.is_active !== false)
      .map((a: any) =>
        [a?.actor_type_id, a?.other_actor_type, a?.women, a?.women_youth, a?.men, a?.men_youth, a?.how_many, a?.sex_and_age_disaggregation].join('~')
      )
      .sort();
    const organizations = (projection?.organization ?? [])
      .filter((o: any) => o?.is_active !== false)
      .map((o: any) => [o?.institution_types_id, o?.other_institution, o?.how_many, o?.graduate_students].join('~'))
      .sort();
    const measures = (projection?.measures ?? [])
      .filter((m: any) => m?.is_active !== false)
      .map((m: any) => [m?.unit_of_measure, m?.quantity].join('~'))
      .sort();
    return JSON.stringify({ actors, organizations, measures });
  }

  /** Verbatim from P2-3295 §2 — QA reads the question back word for word, do not paraphrase. */

  readonly innovationUse2030ProjectionQuestion = INNOVATION_USE_2030_PROJECTION_COPY.question;

  addActor2030() {
    const body = this.body as any;
    if (!body.innovation_use_2030.actors) {
      body.innovation_use_2030.actors = [];
    }
    body.innovation_use_2030.actors.push(this.newActor());
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

  /**
   * IFC-R-4 / INA-R-9 / INA-DD-5 — the actors whose type is disabled in the "Actor type" select of the other rows.
   *
   * Inside the follow-up scope (`isFollowUpScope()`) no type is disabled: every type can repeat, because rows of the
   * same type are told apart by their nature answer (a second Farmers or Researchers row splits "received" from
   * "applied"). Outside the scope (2025, IPSR, unknown phase) today's rule stays: only "Other" (5) is allowed twice.
   * Other components (IPSR step n1/n3, anticipated-innovation-user, review drawer) have their own `removeOther`.
   */
  removeOther(actors) {
    if (this.isFollowUpScope()) return [];
    return actors.filter(item => item.actor_type_id != 5);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // IFC (changes/innovation-use-farmer-count-nature) — Farmers follow-up questions
  // ─────────────────────────────────────────────────────────────────────────────

  /** Copy + codes of the block, exposed to the template. Verbatim from the mock-up (see `farmer-follow-up.ts`). */
  readonly farmerFollowUpCopy = FARMER_FOLLOW_UP_COPY;
  readonly youthRequiredCopy = INNOVATION_USE_YOUTH_REQUIRED_COPY;
  readonly farmerCountUnit = FARMER_COUNT_UNIT;

  /**
   * IWH (INC-168060): the "2030 Use Projection" block is not part of the MDS for W3/Bilateral results, so it is not
   * rendered for them. Display only — the loaded 2030 values stay in `body` and travel back unchanged on save.
   * Fails toward showing the block while `source_name` is unknown (in-flight load), and never applies to IPSR step 1.
   */
  get hides2030Projection(): boolean {
    return !this.isIpsr && this.api?.dataControlSE?.currentResultSignal?.()?.source_name === W3_BILATERALS_SOURCE_NAME;
  }

  /**
   * INA-DD-5: where the follow-up questions are SHOWN — not IPSR and phase year >= 2026, whatever the source (W1/W2 and
   * W3/Bilaterals alike).
   *
   * 🛑 Phase year, never portfolio (IFC-DD-5; prtest holds 2025 results inside P25). `isPhaseYearAtLeast` fails
   * toward the legacy form while the result's own year is unknown, so an in-flight load shows nothing.
   */
  isFollowUpScope(): boolean {
    if (this.isIpsr) return false;
    return this.isPhaseYearAtLeast(FARMER_FOLLOW_UP_MIN_PHASE_YEAR);
  }

  /** INA-DD-6: where the follow-up questions are REQUIRED — the scope, except W3/Bilaterals (shown and editable, never blocking). */
  isFollowUpMandatory(): boolean {
    return this.isFollowUpScope() && !this.isW3BilateralsResult();
  }

  /**
   * W1/W2-only gate (not IPSR, phase >= 2026, not W3/Bilaterals). INA-DD-5: kept with this exact meaning for the youth
   * rules only (`validateYouth`, `showYouthRequiredHint`); the follow-up questions read `isFollowUpScope()` instead.
   * `source_name` comes from the same `GET /api/results/get/:id` row as `phase_year` (`'W1/W2'` or `'W3/Bilaterals'`).
   */
  isFarmerFollowUpResult(): boolean {
    return this.isFollowUpScope() && !this.isW3BilateralsResult();
  }

  private isW3BilateralsResult(): boolean {
    return this.api?.dataControlSE?.currentResultSignal?.()?.source_name === W3_BILATERALS_SOURCE_NAME;
  }

  /** The gate of the Farmers part (title + unit question): the result is in scope AND this row is an active Farmers row. */
  isFarmerFollowUpRow(actorItem): boolean {
    return this.isFollowUpScope() && actorItem?.is_active !== false && actorItem?.actor_type_id == FARMERS_ACTOR_TYPE_ID;
  }

  /** The gate of the nature question (INA-R-7): the result is in scope AND this row is active with a type selected. */
  isNatureFollowUpRow(actorItem): boolean {
    return this.isFollowUpScope() && actorItem?.is_active !== false && !!actorItem?.actor_type_id;
  }

  /** Households row: the grid and the "does not apply" tick are hidden, the single total is implied (IFC-DD-2). */
  isHouseholdsRow(actorItem): boolean {
    return this.isFarmerFollowUpRow(actorItem) && actorItem?.count_unit === FARMER_COUNT_UNIT.HOUSEHOLDS;
  }

  private farmerRowKeys = new WeakMap<object, number>();
  private farmerRowSeq = 0;

  /** A stable, unique radio-group name per actor row object (several rows of one type may coexist, INA-R-9). */
  farmerRowKey(actorItem): string {
    if (!this.farmerRowKeys.has(actorItem)) this.farmerRowKeys.set(actorItem, this.farmerRowSeq++);
    return `iu-farmer-${this.farmerRowKeys.get(actorItem)}`;
  }

  /** Q-b: the answer is written straight on the row (the group is native radios, see the template). */
  selectUseNature(actorItem, value: string) {
    actorItem.use_nature = value;
  }

  /**
   * Actor type changed. Away from Farmers only the unit answer goes (IFC-R-1, INA-R-8): `use_nature` applies to every
   * type now and is kept. A row that was forced onto a single total by "Households" gets its grid back — that tick was
   * implied by the answer, not chosen by the reporter. Rows that never carried a unit are left alone, so no key appears
   * on them (IPSR payloads stay as today).
   */
  onActorTypeChange(actorItem, newTypeId) {
    actorItem.other_actor_type = null;
    if (newTypeId == FARMERS_ACTOR_TYPE_ID) return;
    if (actorItem.count_unit === FARMER_COUNT_UNIT.HOUSEHOLDS) {
      this.cleanActor(actorItem);
      actorItem.sex_and_age_disaggregation = false;
    }
    if (actorItem.count_unit) actorItem.count_unit = null;
  }

  /**
   * Q-a answered (IFC-R-5). Households reuses the existing single-total path end to end: it ticks "Sex and age
   * disaggregation does not apply" for the row and wipes the grid. Individuals gives the grid back.
   *
   * The grid is wiped only when the row actually changes shape: a row already on a single total keeps its typed
   * total on "Households", and a row that still has its grid keeps its numbers on "Individuals".
   *
   * "Individuals" gives the grid back ONLY when the previous answer was Households (IFC-R-5 "choosing Individuals
   * again"). A row the reporter put on a single total by ticking "does not apply" keeps that total and the tick:
   * IFC-T-7 found the unconditional version wiping a stored `how_many` on the first answer.
   */
  onCountUnitChange(actorItem, value) {
    const previous = actorItem.count_unit;
    actorItem.count_unit = value ?? null;
    if (value === FARMER_COUNT_UNIT.HOUSEHOLDS) {
      if (!actorItem.sex_and_age_disaggregation) this.cleanActor(actorItem);
      actorItem.sex_and_age_disaggregation = true;
    } else if (
      (value === FARMER_COUNT_UNIT.INDIVIDUALS || !value) &&
      previous === FARMER_COUNT_UNIT.HOUSEHOLDS &&
      actorItem.sex_and_age_disaggregation
    ) {
      this.cleanActor(actorItem);
      actorItem.sex_and_age_disaggregation = false;
    }
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

  /**
   * P2-4125 — the "Current core innovation use" group is answered when "This is yet to be
   * determined" is ticked, or when at least one active actor, organization or other measure
   * carries a value. Mirrors the any-of rule of the live green check `validation_innovation_use_P25`
   * (current-use block; see REVIEW D13 in the server's `qa-catalog/definitions/sections/innovation-use.ts`).
   * Without a marker for it the bottom bar said "Section complete" while the rail stayed grey.
   * A row only counts once it has its type (actor / organization) or a unit or quantity (measure):
   * an empty row added with "Add actor" is not an answer, and from there the row's own required
   * fields take over the alert.
   */
  isCurrentUseGroupComplete(): boolean {
    if (this.body?.innov_use_to_be_determined === true) return true;
    const use = this.body?.innovatonUse;
    const active = (list: unknown) => (Array.isArray(list) ? list.filter(item => item && item.is_active !== false) : []);
    const hasValue = (value: unknown) => value !== null && value !== undefined && String(value).trim() !== '';
    return (
      active(use?.actors).some(item => hasValue(item.actor_type_id)) ||
      active(use?.organization).some(item => hasValue(item.institution_types_id)) ||
      active(use?.measures).some(item => hasValue(item.unit_of_measure) || hasValue(item.quantity))
    );
  }

  hasElementsWithId(list, attr, significantFields?: string[]) {
    if (!Array.isArray(list)) return 0;
    const finalList = this.api.rolesSE.readOnly
      ? list.filter(item => item && item[attr])
      : list.filter(item => item && item.is_active != false && (!significantFields || significantFields.some(f => !!item[f])));
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
      // IUY-R-1: derive on the row actually edited (`actorItem`). The 2030 grid passes its own row,
      // and the old `body.innovatonUse.actors[i]` wrote the current-use row of the same index instead.
      // For in-scope results an empty Youth leaves Non-youth empty instead of copying the total.
      actorItem[genderNonYouth] =
        this.isFarmerFollowUpResult() && this.isYouthEmpty(actorItem[genderYouth])
          ? null
          : actorItem[gender] - actorItem[genderYouth];
      this.calculateTotalField(actorItem);
      this.cdr.markForCheck();
    }, 1100);
    this.calculateTotalField(actorItem);
  }

  /**
   * IUY-R-1 (bugfix/innovation-use-youth-required): hint under Non-youth asking for Youth (0 if none).
   * Same result gate as the Farmers questions (not IPSR, phase year >= 2026, not W3/Bilaterals), only on
   * a grid row (not "does not apply", not the age fallback, which fills Youth itself) whose total is > 0.
   * Mirrors the server rule in `validation_innovation_use_P25`, which keeps the section red meanwhile.
   */
  showYouthRequiredHint(actorItem, gender: 'women' | 'men'): boolean {
    if (!this.isFarmerFollowUpResult()) return false;
    if (!actorItem || actorItem.sex_and_age_disaggregation || actorItem.age_disaggregation_not_available) return false;
    return Number(actorItem[gender]) > 0 && this.isYouthEmpty(actorItem[`${gender}_youth`]);
  }

  private isYouthEmpty(value: unknown): boolean {
    return value === null || value === undefined || value === '';
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
      If the innovation does not target specific groups of actors or people, then please specify the ${
        // IU26-R-8 — "expected" is dropped only on the 2026 current-use description (not IPSR, not 2030, not 2025).
        !this.isIpsr && this.fieldsManagerSE.isInnovationUseAgeFallback2026() ? '' : 'expected '
      }innovation use at organizational level or other use. ${
        // INC-168060 (Nicoleta): IPSR step 1 is about scaling ambition, so it keeps the 2030 wording.
        this.isIpsr
          ? 'The numbers should reflect the expected innovation use by end of 2030.'
          : 'Report the number of people (or households) actually using the innovation in the reporting year, supported by evidence.'
      }
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
   * P2-3535: from the 2026 phase on, the Innovation Use form retires the "Have any studies been
   * conducted to inform the innovation scaling strategy design (...)" question (and its follow-up
   * link list) at EVERY use level. Requested by Angel Jarrín (PO), 28-Aug-2026; it supersedes the
   * partial P2-3294 rule, which only dropped the question from use level 6 upwards.
   *
   * Scope (Yeck, 31-Aug-2026): the retirement covers the Innovation Use section only. This template
   * is shared with IPSR Innovation Package step 1 (`[isIpsr]="true"`), which stays on the previous
   * P2-3294 behaviour (hidden from level 6 on) until Ángel republishes P2-3426 stating where else
   * the question has to go. Bilateral's own `type-innovation-use` component is untouched too.
   *
   * Gated on `phase_year`, never on `isP25()`/portfolio — per the epic P2-3243 rule (reporting/
   * CLAUDE.md rule 9): prtest holds 2025-phase results inside the P25 portfolio, and a portfolio
   * gate would strip the question from those too. Mirrors the `phase_year >= <2026 threshold>`
   * pattern used by `FieldsManagerService`'s other 2026 gates (e.g. `isContributorsPartners2026`),
   * kept local here rather than added to the shared `ReportingDesignYear` enum/service because
   * this ticket's file scope is `innovation-use-form/**` only.
   *
   * Fails towards the LEGACY form (returns `false`, i.e. "don't hide") whenever the open result's
   * own `phase_year` is not reliably known — an in-flight load must never hide a question by
   * mistake; it just keeps whatever the pre-existing `getUseLevelIndex() >= 5` gate already decided.
   * That guarantee is enforced by {@link currentResultPhaseYear}, NOT by this method. Same fail-open
   * on the IPSR branch while the use level is still unresolved.
   */
  private static readonly SCALING_STUDIES_QUESTION_HIDE_YEAR = 2026;

  /**
   * The reporting phase year of the OPEN RESULT, or `null` when it is not reliably known.
   *
   * 🛑 There is deliberately NO fallback to `dataControlSE.reportingCurrentPhase.phaseYear`
   * (P2-3558). That is the OPEN phase of the reporting module (`data-control.service.ts:125`, today
   * 2026) — a different thing from the phase of the result being viewed. The gate above asks "is
   * THIS result a 2026+ result?", so falling back to the open phase answered a different question,
   * and answered it wrongly in the one direction that hurts: it HID the scaling-studies question on
   * a legacy result. The docblock above used to claim this "fails OPEN (returns false)" while the
   * code did the opposite for the only value the open phase actually carries in production.
   * Measured on 2 Sep 2026: prtest holds 1516 results in the 2025 phase against 353 in 2026, so
   * failing towards the new form failed towards the wrong side in most cases.
   *
   * The window is real, not theoretical: `result-detail.component.ts:69` and
   * `current-result.service.ts:26` reset `currentResultSignal` to `{}` at the start of every load,
   * and any non-404 failure of `GET_resultById` (`current-result.service.ts:65-69`) leaves it at
   * `{}` PERMANENTLY, with the form on screen.
   *
   * Same shape and same decision as the reference resolver
   * `FieldsManagerService.currentResultPhaseYear` / `isPhaseYearAtLeast` (commit `8afb574f3`, which
   * fixed the eight sibling gates). Kept local here rather than delegated to the service because
   * this threshold is a question-retirement year, not one of the shared `ReportingDesignYear`
   * UI-redesign thresholds.
   *
   * The `typeof === 'number'` guard is part of the same decision: a year arriving as a string is a
   * bad payload, and a bad payload gets the legacy form.
   */
  private currentResultPhaseYear(): number | null {
    const year = this.api?.dataControlSE?.currentResultSignal?.()?.phase_year;
    return typeof year === 'number' ? year : null;
  }

  /** A phase gate is only ever `true` on a reliably known year — unknown means the legacy form. */
  private isPhaseYearAtLeast(threshold: number): boolean {
    const year = this.currentResultPhaseYear();
    return year !== null && year >= threshold;
  }

  isScalingStudiesQuestionHidden(): boolean {
    if (!this.isPhaseYearAtLeast(InnovationUseFormComponent.SCALING_STUDIES_QUESTION_HIDE_YEAR)) {
      return false;
    }
    if (!this.isIpsr) return true;
    const level = this.getUseLevelIndex();
    if (level < 0) return false;
    return level >= 6;
  }
}
