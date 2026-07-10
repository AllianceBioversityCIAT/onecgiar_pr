import { Component, computed, effect, inject } from '@angular/core';
import { RolesService } from '../../../../../../../../../../shared/services/global/roles.service';
import { RdContributorsAndPartnersService } from '../../../../rd-contributors-and-partners.service';
import { InstitutionsService } from '../../../../../../../../../../shared/services/global/institutions.service';
import { GreenChecksService } from '../../../../../../../../../../shared/services/global/green-checks.service';
import { DataControlService } from '../../../../../../../../../../shared/services/data-control.service';
import { ApiService } from '../../../../../../../../../../shared/services/api/api.service';
import { FieldsManagerService } from '../../../../../../../../../../shared/services/fields-manager.service';

@Component({
  selector: 'app-normal-selector',
  templateUrl: './normal-selector.component.html',
  styleUrls: ['./normal-selector.component.scss'],
  standalone: false
})
export class CPNormalSelectorComponent {
  resultCode = this?.api?.dataControlSE?.currentResult?.result_code;
  versionId = this?.api?.dataControlSE?.currentResult?.version_id;

  disableOptions: any[] = null;

  partnerUniqueTypes = [];

  private readonly fieldsManagerSE = inject(FieldsManagerService);

  constructor(
    public api: ApiService,
    public rolesSE: RolesService,
    public rdPartnersSE: RdContributorsAndPartnersService,
    public institutionsSE: InstitutionsService,
    public greenChecksSE: GreenChecksService,
    public dataControlSE: DataControlService
  ) {}

  // P2-3066 (2026): External Partners split into "from ToC" + "Other(s)". Gated by phase; 2025 keeps the single
  // legacy dropdown. The sentinel below toggles the second dropdown; it is never persisted/rendered as a chip.
  isCP2026 = computed(() => this.fieldsManagerSE.isContributorsPartners2026());
  isTocDecoupled = computed(
    () => this.isCP2026() && this.rdPartnersSE.partnersBody?.result_toc_result?.planned_result === false
  );
  readonly OTHER_PARTNERS_CODE = this.rdPartnersSE.OTHER_PARTNERS_CODE;
  noPartnersNote = 'No External Partners related to the established HLO/Outcomes were found';

  // ToC reference partners = institutions (excluding centers) whose id was referenced by the selected ToC node(s).
  referenceExternalPartners = computed(() => {
    const ids = this.rdPartnersSE.tocReferencePartnerInstitutionIds();
    return (this.institutionsSE.institutionsWithoutCentersListPartners ?? []).filter((i: any) => ids.includes(i.institutions_id));
  });

  // "Other(s)" options = the remaining institutions (not referenced by the ToC).
  otherPartnersList = computed(() => {
    const ids = this.rdPartnersSE.tocReferencePartnerInstitutionIds();
    return (this.institutionsSE.institutionsWithoutCentersListPartners ?? []).filter((i: any) => !ids.includes(i.institutions_id));
  });

  // True when the ToC brought at least one EXTERNAL (non-center) partner. toc_partners also carries CENTERS, so we must
  // check the resolved external list — not the raw id set — otherwise a center-only ToC node wrongly hides the AC4 empty state.
  hasReferencePartners = computed(() => this.referenceExternalPartners().length > 0);

  // The "Other" item sits at the END of the first dropdown's list (per AC3). Selecting it reveals the second dropdown.
  dropdown1OptionsPartners = computed(() => [...this.referenceExternalPartners(), this.rdPartnersSE.buildOtherPartnersSentinel()]);

  // Institutions minus the non-renderable sentinel — used for chips, counts, validation and lead logic.
  get institutionsNoSentinel(): any[] {
    return (this.rdPartnersSE.partnersBody?.institutions || []).filter((i: any) => i?.institutions_id !== this.OTHER_PARTNERS_CODE);
  }

  // Whether the explicit "Other" sentinel is currently selected (distinct from the AC4 auto-open empty state).
  get otherSentinelSelected(): boolean {
    return (this.rdPartnersSE.partnersBody?.institutions || []).some((i: any) => i?.institutions_id === this.OTHER_PARTNERS_CODE);
  }

  // "Other(s)" dropdown shows when the user picked "Other" OR (AC4 empty state) when the ToC returned no partners.
  get showOtherPartners(): boolean {
    return this.otherSentinelSelected || !this.hasReferencePartners();
  }

  // Preselect the ToC reference partners on load, only when the result has no partners selected yet and the
  // section is applicable. Mirrors the Centers preselect.
  private userTouchedPartners = false;
  preselectPartnersEffect = effect(() => {
    if (!this.isCP2026() || this.isTocDecoupled() || this.userTouchedPartners) return;
    const refs = this.referenceExternalPartners();
    const body = this.rdPartnersSE.partnersBody;
    if (!body || body.no_applicable_partner) return;
    const current = this.institutionsNoSentinel;
    // Only preselect on a truly empty selection — guard against overwriting a loaded result that kept ONLY "Other" partners
    // (its ToC array is empty but otherPartnersSelected isn't).
    if (refs.length && current.length === 0 && (this.rdPartnersSE.otherPartnersSelected?.length || 0) === 0) {
      body.institutions = refs.map((i: any) => ({ ...i, from_toc: true }));
      this.rdPartnersSE.setPossibleLeadPartners(true);
    }
  });

  onPartnerSelect(event: any) {
    this.userTouchedPartners = true;
    // When "Other" is deselected, clear whatever was picked in the second dropdown.
    if (!this.otherSentinelSelected) this.rdPartnersSE.otherPartnersSelected = [];
    this.getOnlyPartnerTypes();
    this.emitPartnerEvent(event);
  }

  deleteOtherPartner(index: number) {
    // Reassign a new array so the multi-select ngModel refreshes (parity with the Science Programs delete).
    this.rdPartnersSE.otherPartnersSelected = (this.rdPartnersSE.otherPartnersSelected || []).filter((_: any, i: number) => i !== index);
    this.getOnlyPartnerTypes();
    this.rdPartnersSE.setPossibleLeadPartners(true);
  }

  // "Other(s)" dropdown changed: refresh the partner-type summary and lead-partner eligibility (an "Other" partner can be lead).
  onOtherPartnerSelect(event: any) {
    this.getOnlyPartnerTypes();
    this.emitPartnerEvent(event);
  }

  // All selected external partners (ToC + Other) — used for the "Partner(s) selected" count and the partner-types summary.
  get allSelectedPartners(): any[] {
    return [...this.institutionsNoSentinel, ...(this.rdPartnersSE.otherPartnersSelected || [])];
  }

  getDisableOptions() {
    this.disableOptions = [];

    if (this.rdPartnersSE?.partnersBody?.mqap_institutions) {
      this.disableOptions = this.rdPartnersSE.partnersBody.mqap_institutions.map(element => element);
    }
  }

  getOnlyPartnerTypes() {
    const partnerTypes = this.allSelectedPartners?.map(element => element?.obj_institutions?.obj_institution_type_code?.name);
    this.partnerUniqueTypes = Array.from(new Set(partnerTypes));
  }

  emitPartnerEvent(partner) {
    if (this.rdPartnersSE.leadPartnerId === partner) {
      this.rdPartnersSE.leadPartnerId = null;
    }
    this.rdPartnersSE.setPossibleLeadPartners(true);
  }

  updateLeadData() {
    if (this.rdPartnersSE.partnersBody.no_applicable_partner) {
      this.rdPartnersSE.partnersBody.is_lead_by_partner = false;
      this.rdPartnersSE.disableLeadPartner = true;
    } else {
      this.rdPartnersSE.disableLeadPartner = false;
    }
  }
}
