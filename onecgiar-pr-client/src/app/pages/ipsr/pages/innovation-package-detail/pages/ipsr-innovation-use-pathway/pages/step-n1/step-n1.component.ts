import { Component, OnInit, inject, signal } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { ApiService } from '../../../../../../../../shared/services/api/api.service';
import { IpsrStep1Body, CoreResult, Measure, Actor, Organization } from './model/Ipsr-step-1-body.model';
import { IpsrDataControlService } from '../../../../../../services/ipsr-data-control.service';
import { Router } from '@angular/router';
import { GeoScopeEnum } from '../../../../../../../../shared/enum/geo-scope.enum';
import { ExpertWorkshopOrganized } from '../step-n3/model/Ipsr-step-3-body.model';
import { untypedInnovationUseRowsMessage } from '../../../../../../utils/untyped-innovation-use-rows.util';
import { IPSR_UNTYPED_ROWS_COPY } from '../../../../../../../../internationalization/ipsr-untyped-rows.copy';
import { RESULT_DETAIL_SECTION_LOAD_COPY } from '../../../../../../../../internationalization/result-detail-section-load.copy';
import { CanComponentDeactivate } from '../../../../../../../../shared/guards/unsaved-changes.types';
import { SectionDirtyTrackerService } from '../../../../../../../../shared/services/unsaved-changes/section-dirty-tracker.service';
import { UnsavedNavigationIntentService } from '../../../../../../../../shared/services/unsaved-changes/unsaved-navigation-intent.service';

@Component({
  selector: 'app-step-n1',
  templateUrl: './step-n1.component.html',
  styleUrls: ['./step-n1.component.scss'],
  standalone: false,
  providers: [SectionDirtyTrackerService]
})
export class StepN1Component implements OnInit, CanComponentDeactivate {
  ipsrStep1Body = new IpsrStep1Body();

  /**
   * P2-3427 (Ángel, 28-Sep-2026 review) — component-scoped dirty tracker for `UnsavedChangesGuard`
   * (registered on this step's inner route). Snapshotted at the end of `onSectionInformation()` and
   * again the instant a PATCH resolves. Same mechanism as the Results sections (`rd-general-information`).
   */
  private readonly dirtyTracker = inject(SectionDirtyTrackerService);
  /** P2-3427 — "Save & go to next step" must never open the unsaved-changes dialog: it marks its navigation silent. */
  private readonly intentSE = inject(UnsavedNavigationIntentService);

  coreResult = new CoreResult();

  /**
   * Night sweep 2026-09-23, IPSR-2 — three-state load flag (P2-3556 contract). The Step-1 GET had no
   * error branch: on a failure the blank `IpsrStep1Body` stayed on screen with Save enabled, and saving
   * it wiped the EOI outcomes, the scaling partners and the geographic scope (prtest 11172, 2/2).
   * Save refuses and "Save & go to next step" only navigates until the stored data is in hand.
   */
  readonly loaded = signal<boolean | null>(null);
  readonly loadErrorNote = RESULT_DETAIL_SECTION_LOAD_COPY.loadErrorNote;

  radioOptions = [
    { id: true, name: 'Yes, an expert workshop was organized' },
    { id: false, name: 'No expert workshop was organized' }
  ];

  consentRadioOptions = [
    { id: true, name: 'Yes' },
    { id: false, name: 'No' }
  ];

  constructor(
    public api: ApiService,
    public ipsrDataControlSE: IpsrDataControlService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.getSectionInformation();
    this.requestEvent();
    this.api.dataControlSE.detailSectionTitle('Step 1');
  }

  cleanEvidence() {
    if (this.ipsrStep1Body.result_ip.is_expert_workshop_organized === true) return;
    this.ipsrStep1Body.result_ip.readiness_level_evidence_based = null;
    this.ipsrStep1Body.result_ip.use_level_evidence_based = null;
  }

  hasElementsWithId(list, attr, significantFields?: string[]) {
    const finalList = this.api.rolesSE.readOnly
      ? list.filter(item => item[attr])
      : list.filter(item => item.is_active != false && (!significantFields || significantFields.some(f => !!item[f])));
    return finalList.length;
  }

  addExpert() {
    this.ipsrStep1Body.result_ip_expert_workshop_organized.push(new ExpertWorkshopOrganized());
  }

  workshopDescription() {
    return `A template participant list can be downloaded <a href="https://cgiar.sharepoint.com/:x:/s/PPUInterim/EYOL3e1B-YlGnU8lZmlFkc4BKVDNgLH3G__z6SSjNkBTfA?e=pkpT0d"  class="open_route" target="_blank">here</a>`;
  }

  deleteExpert(index: number): void {
    this.ipsrStep1Body.result_ip_expert_workshop_organized.splice(index, 1);
  }

  validateParticipantsConsent() {
    if (this.ipsrStep1Body.result_ip.is_expert_workshop_organized === false) {
      return false;
    }

    const regex = new RegExp(
      /^(http:\/\/www\.|https:\/\/www\.|http:\/\/|https:\/\/)?[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,5}(:[0-9]{1,5})?(\/\S*)?$/i
    );

    const value = this.ipsrStep1Body.link_workshop_list ? this.ipsrStep1Body.link_workshop_list.trim() : '';

    return regex.test(value);
  }

  getSectionInformation() {
    this.api.resultsSE.GETInnovationPathwayByStepOneResultId().subscribe({
      next: ({ response }) => this.onSectionInformation(response),
      // IPSR-2 — see `loaded`.
      error: () => {
        if (this.loaded() !== true) this.loaded.set(false);
      }
    });
  }

  private onSectionInformation(response: any) {
    {
      this.convertOrganizations(response?.innovatonUse?.organization);
      this.ipsrStep1Body = response;
      this.ipsrStep1Body.innov_use_to_be_determined = false;
      const legacyCountries = 4;
      this.ipsrStep1Body.geo_scope_id = response.geo_scope_id == legacyCountries ? GeoScopeEnum.COUNTRY : response.geo_scope_id;
      this.coreResult = response?.coreResult;

      if (this.ipsrStep1Body.innovatonUse.measures.length == 0) {
        const oneMessure = new Measure();
        oneMessure.unit_of_measure = '# of hectares';
        this.ipsrStep1Body.innovatonUse.measures.push(oneMessure);
      }

      if (this.ipsrStep1Body?.result_ip_expert_workshop_organized?.length === 0) {
        this.ipsrStep1Body.result_ip_expert_workshop_organized.push(new ExpertWorkshopOrganized());
      }

      this.ipsrStep1Body.institutions.forEach(item => (item.institutions_type_name = item.institutions_name));

      if (this.ipsrStep1Body.innovatonUse.actors.length == 0) {
        this.ipsrStep1Body.innovatonUse.actors.push(new Actor());
      }
      if (this.ipsrStep1Body.innovatonUse.organization.length == 0) {
        this.ipsrStep1Body.innovatonUse.organization.push(new Organization());
      }
      this.loaded.set(true);
      // P2-3427 — true end of the load flow: the default rows above are the last mutation the body
      // receives, so a freshly loaded, untouched step reports `hasUnsavedChanges() === false`.
      this.dirtyTracker.snapshot(this.dirtySnapshotValue());
    }
  }

  /** P2-3427 — `CanComponentDeactivate.hasUnsavedChanges()`. */
  hasUnsavedChanges(): boolean {
    return this.dirtyTracker.isDirty(this.dirtySnapshotValue());
  }

  /**
   * P2-3427 (Ángel, 28-Sep-2026 review) — the value the dirty tracker snapshots and diffs.
   *
   * `onSectionInformation()` REPLACES `ipsrStep1Body` with the raw GET response, so on the next
   * change-detection pass `app-innovation-use-form` gets a new `[body]` reference and its
   * `ngOnChanges()` → `initializeComponentProperties()` (`innovation-use-form.component.ts:47-87`)
   * seeds defaults for keys the Step-1 GET does not send (`initiative_expected_investment`,
   * `pictures`, `innovation_use_2030`, `innov_use_2030_to_be_determined`…). That write lands strictly
   * AFTER the load-flow snapshot, so an untouched Step 1 reported dirty and the tab switch opened the
   * Save/Discard dialog (measured on package 9635). Same bug class as W1/W2 `innovation-use-info`
   * (`dirtySnapshotValue()`), but here two of those keys are real editable fields (the 2030
   * projection), so they are default-matched instead of dropped: "missing" and "the child's empty
   * default" compare equal, any real edit still differs. The normalized keys are re-appended in a
   * fixed order so JSON key-insertion order (snapshot vs. child-seeded body) never matters. Also
   * projects out `app-studies-link`'s blank placeholder row (`studies-link.component.ts:21-28`).
   * Only the diff sees this value: the body and the PATCH payload are untouched.
   */
  private dirtySnapshotValue(): unknown {
    const body = (this.ipsrStep1Body ?? {}) as any;
    const rest: any = { ...body };
    for (const key of Object.keys(StepN1Component.INNOVATION_USE_FORM_LOAD_DEFAULTS)) delete rest[key];
    for (const [key, makeDefault] of Object.entries(StepN1Component.INNOVATION_USE_FORM_LOAD_DEFAULTS)) {
      const value = body[key];
      if (key === 'innov_use_2030_to_be_determined') rest[key] = value === undefined ? makeDefault() : value;
      else if (key === 'scaling_studies_urls') rest[key] = StepN1Component.nonBlankStudyLinks(value);
      else rest[key] = value ? value : makeDefault();
    }
    return rest;
  }

  /** Same defaults, same falsy test, as `InnovationUseFormComponent.initializeComponentProperties()`. */
  private static readonly INNOVATION_USE_FORM_LOAD_DEFAULTS: Record<string, () => unknown> = {
    initiative_expected_investment: () => [],
    bilateral_expected_investment: () => [],
    institutions_expected_investment: () => [],
    reference_materials: () => [{ link: '' }],
    pictures: () => [{ link: '' }],
    studies_links: () => [{ link: '' }],
    scaling_studies_urls: () => [],
    innovation_use_2030: () => ({ actors: [], measures: [], organization: [] }),
    innov_use_2030_to_be_determined: () => false,
    result: () => ({ title: '' })
  };

  /** Blank placeholder rows (`''` or `{ link: '' }`) are never a user edit. */
  private static nonBlankStudyLinks(urls: unknown): unknown[] {
    return (Array.isArray(urls) ? urls : []).filter(u => {
      const link = typeof u === 'string' ? u : (u as any)?.link;
      return !(typeof link === 'string' && link.trim() === '') && u != null;
    });
  }

  /**
   * P2-3427 — `CanComponentDeactivate.saveSection()` for `UnsavedChangesGuard`. Same preconditions
   * as `onSaveSection()`: a refused save resolves `false` (the step stays, the alert says why).
   */
  saveSection(): Observable<boolean> {
    if (this.loaded() !== true) return of(false);
    if (this.refuseUntypedRows()) return of(false);
    return this.performSave().pipe(
      map(() => true),
      catchError(() => of(false))
    );
  }

  onSaveSection() {
    // IPSR-2 — never send a body that was not read from the server.
    if (this.loaded() !== true) return;
    if (this.refuseUntypedRows()) return;
    this.performSave().subscribe();
  }

  /**
   * P2-3427 — the exact PATCH `onSaveSection()` always sent, shared with `saveSection()`.
   * `convertOrganizationsTosave()` mutates the body before the PATCH, so the snapshot is taken inside
   * the success `tap`: at that instant the local body is precisely what the server just persisted,
   * and the step is clean even if the follow-up reload fails. No reload on error (as before).
   */
  private performSave(): Observable<void> {
    this.convertOrganizationsTosave();
    return this.api.resultsSE
      .PATCHInnovationPathwayByStepOneResultId({
        ...this.ipsrStep1Body,
        result_ip: {
          ...this.ipsrStep1Body.result_ip,
          participants_consent: this.validateParticipantsConsent() ? this.ipsrStep1Body.result_ip.participants_consent : null
        }
      })
      .pipe(
        tap(() => {
          this.dirtyTracker.snapshot(this.dirtySnapshotValue());
          this.api.GETInnovationPackageDetail();
          this.getSectionInformation();
        }),
        map(() => undefined)
      );
  }

  saveAndNextStep(descrip: string) {
    // IPSR-2 — without the stored data in hand the button only navigates, it never saves.
    if (this.api.rolesSE.readOnly || this.loaded() !== true) {
      // P2-3427 — a navigation this button performs never opens the dialog (the guard saves silently if dirty).
      this.intentSE.markSilent();
      return this.router.navigate(['/ipsr/detail/' + this.ipsrDataControlSE.resultInnovationCode + '/ipsr-innovation-use-pathway/step-2'], {
        queryParams: { phase: this.ipsrDataControlSE.resultInnovationPhase }
      });
    }
    if (this.refuseUntypedRows()) return null;
    this.convertOrganizationsTosave();
    this.api.resultsSE.PATCHInnovationPathwayByStepOneResultIdNextStep(this.ipsrStep1Body, descrip).subscribe((resp: any) => {
      // P2-3427 — the body just persisted is the new baseline; the reload below only refines it.
      this.dirtyTracker.snapshot(this.dirtySnapshotValue());
      this.getSectionInformation();
      this.intentSE.markSilent();
      this.router.navigate(['/ipsr/detail/' + this.ipsrDataControlSE.resultInnovationCode + '/ipsr-innovation-use-pathway/step-2'], {
        queryParams: { phase: this.ipsrDataControlSE.resultInnovationPhase }
      });
    });
    return null;
  }

  /**
   * Night sweep 2026-09-23, IPSR-3 — a row with figures but no type is skipped by the server with a
   * 200 (see `untyped-innovation-use-rows.util.ts`). Refuse the save and say which rows, so nothing is
   * lost in silence. Returns true when the save must not go out.
   */
  private refuseUntypedRows(): boolean {
    const message = untypedInnovationUseRowsMessage(this.ipsrStep1Body?.innovatonUse);
    if (!message) return false;
    this.api.alertsFe.show({ id: 'ipsrUntypedRows', title: IPSR_UNTYPED_ROWS_COPY.title, description: message, status: 'error' });
    return true;
  }

  convertOrganizations(organizations) {
    organizations.map((item: any) => {
      if (item.parent_institution_type_id) {
        item.institution_sub_type_id = item?.institution_types_id;
        item.institution_types_id = item?.parent_institution_type_id;
      }
    });
  }

  convertOrganizationsTosave() {
    this.ipsrStep1Body.innovatonUse.organization.forEach((item: any) => {
      if (item.institution_sub_type_id) {
        item.institution_types_id = item.institution_sub_type_id;
      }
    });
  }

  requestEvent() {
    this.api.dataControlSE.findClassTenSeconds('alert-event').then(resp => {
      try {
        document.querySelector('.alert-event').addEventListener('click', e => {
          this.api.dataControlSE.showPartnersRequest = true;
        });
      } catch (error) {
        console.error(error);
      }
    });
    this.api.dataControlSE.findClassTenSeconds('alert-event-2').then(resp => {
      try {
        document.querySelector('.alert-event-2').addEventListener('click', e => {
          this.api.dataControlSE.showPartnersRequest = true;
        });
      } catch (error) {
        console.error(error);
      }
    });
  }
}
