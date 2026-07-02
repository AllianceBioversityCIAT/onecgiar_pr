import { Injectable, OnDestroy, inject, signal } from '@angular/core';
import { InstitutionsInterface, UnmappedMQAPInstitutionDto } from '../rd-partners/models/partnersBody';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { InstitutionMapped } from '../../../../../../shared/interfaces/institutions.interface';
import { CenterDto } from '../../../../../../shared/interfaces/center.dto';
import { InstitutionsService } from '../../../../../../shared/services/global/institutions.service';
import { CentersService } from '../../../../../../shared/services/global/centers.service';
import { ContributorsAndPartnersBody } from './models/contributorsAndPartnersBody';
import { ResultTocResultsInterface } from '../rd-theory-of-change/model/theoryOfChangeBody';
import { FieldsManagerService } from '../../../../../../shared/services/fields-manager.service';
import { forkJoin } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class RdContributorsAndPartnersService implements OnDestroy {
  partnersBody = new ContributorsAndPartnersBody();
  toggle = 0;
  getConsumed = signal<boolean>(false);
  cgspaceDisabledList: any = [];
  savedActiveTabIndex: number | null = null;

  possibleLeadPartners: InstitutionMapped[] = [];
  possibleLeadCenters: CenterDto[] = [];
  submitter: string = '';
  disabledOptions = [];
  nppCenters: CenterDto[] = [];
  clarisaProjectsList: any[] = [];
  hasTocResultMapped = signal<boolean>(false);
  loadingBilateralProjects = signal<boolean>(false);
  contributingInitiativeNew = [];
  result_toc_result = null;
  contributors_result_toc_result = null;
  leadPartnerId: number = null;
  leadCenterCode: string = null;
  initiativeIdSignal = signal<any>(null);
  updatingLeadData: boolean = false;
  disableLeadPartner: boolean = false;

  // P2-2998 / P2-3036 (2026): Contributing CGIAR Centers split in two dropdowns.
  // `tocReferenceCenterInstitutionIds` = institutionIds derived from the selected TOC node
  // (toc_partners ∪ toc_target_center_ids), fed by multiple-wps-content. The first dropdown shows
  // only the matching CLARISA centers; "Other(s)" shows the rest. Visual layer only — SAVE NOT ADDRESSED YET.
  tocReferenceCenterInstitutionIds = signal<number[]>([]);
  otherCentersSelected: CenterDto[] = [];
  showOtherCenters = false;
  // P2-2929: Science Programs from ToC — union of contributing_synergy_program_initiative_ids across selected nodes.
  // Visual layer only (the real pending/contribution-request happens on Save — deferred per Juan David).
  tocReferenceSynergyInitiativeIds = signal<number[]>([]);
  scienceSelected: any[] = [];
  otherScienceSelected: any[] = [];
  // P2-2929 (2026): snapshot of the pending SP requests loaded from the back (each with share_result_request_id).
  // On Save we diff this against the current selection to cancel the requests the user deselected.
  loadedPendingScience: any[] = [];
  // Ids of the SP that were already accepted on load → on Save they go to accepted (not re-requested as pending),
  // even if a deselect+reselect dropped the per-object _was_accepted tag.
  loadedAcceptedScienceIds = new Set<number>();
  // P2-3066 (2026): External Partners from ToC — institutionIds derived from toc_partners (the non-center partners),
  // fed by multiple-wps-content. First dropdown shows the matching ToC partners; "Other(s)" shows the rest.
  tocReferencePartnerInstitutionIds = signal<number[]>([]);
  otherPartnersSelected: any[] = [];

  // P2-3115 (2026): guards so the ToC prefill never resurrects a deliberately-emptied, saved selection.
  // `sectionHydratedFromToc` = the section has been hydrated from a persisted GET (that persisted state — even
  // empty — is authoritative). `tocSelectionTouched` = the user changed an HLO/KPI selection in-session, so the
  // reactive preload is a deliberate action and IS allowed to prefill. Set by multiple-wps-content.
  sectionHydratedFromToc = signal<boolean>(false);
  tocSelectionTouched = signal<boolean>(false);

  // P2-2998 / P2-2929 / P2-3066 (2026): sentinels for the "Other(s)" item that toggles the second dropdown.
  // Mirror the component definitions — kept here so the load re-bucketing can detect/strip them.
  readonly OTHER_CENTERS_CODE = '__OTHER_CENTERS__';
  readonly OTHER_SP_CODE = '__OTHER_SCIENCE__';
  readonly OTHER_PARTNERS_CODE = -999999;
  private readonly fieldsManagerSE = inject(FieldsManagerService);

  constructor(
    public api: ApiService,
    public institutionsSE: InstitutionsService,
    public centersSE: CentersService
  ) {
    this.institutionsSE?.loadedInstitutions?.subscribe(loaded => {
      if (loaded) {
        this.setPossibleLeadPartners(true);
        this.setLeadPartnerOnLoad(true);
      }
    });
    this.centersSE.loadedCenters.subscribe(loaded => {
      if (loaded) {
        this.nppCenters = this.centersSE.centersList?.map(center => {
          return { ...center, selected: false, disabled: false };
        });
        this.setPossibleLeadCenters(true);
        this.setLeadCenterOnLoad(true);
      }
    });
  }

  ngOnDestroy(): void {
    this.institutionsSE?.loadedInstitutions?.unsubscribe();
    this.centersSE.loadedCenters.unsubscribe();
  }

  resetState() {
    this.partnersBody = new ContributorsAndPartnersBody();
    this.getConsumed.set(false);
    this.cgspaceDisabledList = [];
    this.possibleLeadPartners = [];
    this.possibleLeadCenters = [];
    this.submitter = '';
    this.disabledOptions = [];
    this.clarisaProjectsList = [];
    this.hasTocResultMapped.set(false);
    this.loadingBilateralProjects.set(false);
    this.contributingInitiativeNew = [];
    this.result_toc_result = null;
    this.contributors_result_toc_result = null;
    this.leadPartnerId = null;
    this.leadCenterCode = null;
    this.initiativeIdSignal.set(null);
    // P2-2998 / P2-2929 (2026): clear the split selections (root singleton would otherwise leak across results).
    this.otherCentersSelected = [];
    this.scienceSelected = [];
    this.otherScienceSelected = [];
    this.loadedPendingScience = [];
    this.loadedAcceptedScienceIds = new Set<number>();
    this.showOtherCenters = false;
    this.tocReferenceCenterInstitutionIds.set([]);
    this.tocReferenceSynergyInitiativeIds.set([]);
    // P2-3066 (2026): clear External Partners split selections.
    this.otherPartnersSelected = [];
    this.tocReferencePartnerInstitutionIds.set([]);
    // P2-3115 (2026): reset the prefill guards so state doesn't leak across results (root singleton).
    this.sectionHydratedFromToc.set(false);
    this.tocSelectionTouched.set(false);
  }

  loadClarisaProjects() {
    this.api.resultsSE.GET_ClarisaProjects().subscribe({
      next: ({ response }) => {
        this.clarisaProjectsList = response;
        response.forEach(project => {
          project.project_id = project.id;
        });
      },
      error: err => {
        console.error('Error loading Clarisa projects:', err);
      }
    });
  }

  loadFilteredBilateralProjects(clearSelection: boolean = false) {
    const tocResults = this.partnersBody?.result_toc_result?.result_toc_results || [];
    const tocResultIds = tocResults.map(r => r.toc_result_id).filter(id => id != null);

    this.hasTocResultMapped.set(tocResultIds.length > 0);
    this.clarisaProjectsList = [];

    if (clearSelection) {
      this.partnersBody.bilateral_projects = [];
    }

    if (tocResultIds.length === 0) {
      this.loadingBilateralProjects.set(false);
      return;
    }

    this.loadingBilateralProjects.set(true);
    const requests = tocResultIds.map(id => this.api.resultsSE.GET_W3BilateralProjects(String(id)));

    forkJoin(requests).subscribe({
      next: responses => {
        const allProjects = responses.flatMap(res => res?.response ?? []);
        const uniqueMap = new Map();

        allProjects.forEach(project => {
          if (!uniqueMap.has(project.project_id)) {
            project.fullName = project.project_name;
            uniqueMap.set(project.project_id, project);
          }
        });

        this.clarisaProjectsList = Array.from(uniqueMap.values());
        this.loadingBilateralProjects.set(false);
      },
      error: err => {
        console.error('Error loading filtered bilateral projects:', err);
        this.clarisaProjectsList = [];
        this.loadingBilateralProjects.set(false);
      }
    });
  }

  validateDeliverySelection(deliveries, deliveryId: number) {
    if (!Array.isArray(deliveries)) return false;
    const index = deliveries.indexOf(deliveryId);
    return index < 0 ? false : true;
  }

  onSelectDelivery(option, deliveryId: number) {
    if (this.api.rolesSE.readOnly) return;
    if (option?.deliveries?.find((deliveryId: any) => deliveryId == 4) && deliveryId != 4) {
      const index = option?.deliveries?.indexOf(4) == undefined ? -1 : option?.deliveries?.indexOf(4);
      option?.deliveries.splice(index, 1);
    }
    const index = option?.deliveries?.indexOf(deliveryId) == undefined ? -1 : option?.deliveries?.indexOf(deliveryId);
    if (deliveryId == 4 && index < 0) option.deliveries = [];
    if (!(typeof option?.deliveries == 'object')) option.deliveries = [];
    index < 0 ? option?.deliveries.push(deliveryId) : option?.deliveries.splice(index, 1);
  }

  validateDeliverySelectionPartners(deliveries, deliveryId: number) {
    if (!Array.isArray(deliveries)) return false;

    return deliveries.find(delivery => delivery.partner_delivery_type_id == deliveryId);
  }

  onSelectContributingInitiative() {
    this.partnersBody?.contributing_initiatives.accepted_contributing_initiatives.forEach((resp: any) => {
      const contributorFinded = this.partnersBody.contributors_result_toc_result?.find((result: any) => result?.initiative_id === resp.id);
      const contributorToPush = new ResultTocResultsInterface();
      contributorToPush.initiative_id = resp.id;
      contributorToPush.short_name = resp.short_name;
      contributorToPush.official_code = resp.official_code;
      if (!contributorFinded) this.partnersBody.contributors_result_toc_result?.push(contributorToPush);
    });
  }

  onSelectDeliveryPartners(option, deliveryId: number) {
    if (this.api.rolesSE.readOnly) return;

    const index = option.delivery.findIndex(delivery => delivery.partner_delivery_type_id === deliveryId);

    if (deliveryId == 4) {
      if (index < 0) {
        option.delivery = [{ partner_delivery_type_id: deliveryId }];
      } else {
        option.delivery.splice(index, 1);
      }
    } else {
      const indexOption4 = option.delivery.findIndex(delivery => delivery.partner_delivery_type_id === 4);
      if (indexOption4 >= 0) {
        option.delivery.splice(indexOption4, 1);
      }

      if (index < 0) {
        option.delivery.push({ partner_delivery_type_id: deliveryId });
      } else {
        option.delivery.splice(index, 1);
      }
    }
  }

  removePartner(index: number) {
    const deletedPartner = this.partnersBody.institutions.splice(index, 1);
    this.toggle++;
    if (deletedPartner.length === 1) {
      //always should happen
      if (this.leadPartnerId === deletedPartner[0].institutions_id) {
        this.leadPartnerId = null;
      }
      this.setPossibleLeadPartners(true);
    }
  }

  getSectionInformation(no_applicable_partner?: boolean, onSave: boolean = false) {
    this.contributingInitiativeNew = [];
    this.api.resultsSE.GET_ContributorsPartners().subscribe({
      next: ({ response }) => {
        this.partnersBody = response;
        this.getDisabledCentersForKP();
        this.setPossibleLeadPartners(onSave, false);
        this.setLeadPartnerOnLoad(onSave);
        this.setPossibleLeadCenters(onSave, false);
        this.setLeadCenterOnLoad(onSave);
        this.runAutoAssignLeads();

        this.partnersBody.linked_results = response.linked_results || [];

        this.partnersBody?.contributing_and_primary_initiative.forEach(
          init => (init.full_name = `${init?.official_code} - <strong>${init?.short_name}</strong> - ${init?.initiative_name}`)
        );
        this.submitter = this.partnersBody.contributing_and_primary_initiative.find(
          init => init.id === this.partnersBody?.result_toc_result?.initiative_id
        )?.full_name;

        if (this.partnersBody?.impactsTarge)
          this.partnersBody?.impactsTarge.forEach(item => (item.full_name = `<strong>${item.name}</strong> - ${item.target}`));
        if (this.partnersBody?.sdgTargets)
          this.partnersBody?.sdgTargets.forEach(item => (item.full_name = `<strong>${item.sdg_target_code}</strong> - ${item.sdg_target}`));

        if (this.partnersBody?.result_toc_result?.result_toc_results !== null) {
          this.result_toc_result = this.partnersBody?.result_toc_result;
          this.result_toc_result.planned_result = this.partnersBody?.result_toc_result?.result_toc_results?.[0]?.planned_result ?? null;
          this.result_toc_result.showMultipleWPsContent = true;
        }
        const primaryInit = this.partnersBody?.contributing_and_primary_initiative?.find(
          (i: { id?: number }) => i?.id === this.partnersBody?.result_toc_result?.initiative_id
        );
        const initiativeCode = primaryInit?.official_code ?? this.api.dataControlSE.currentResult?.initiative_official_code ?? this.api.dataControlSE.currentResultSignal?.()?.initiative_official_code;
        if ((initiativeCode === 'SGP-02' || initiativeCode === 'SGP02') && this.partnersBody?.result_toc_result) {
          this.partnersBody.result_toc_result.planned_result = false;
        }

        if (this.partnersBody?.contributors_result_toc_result !== null) {
          this.contributors_result_toc_result = this.partnersBody?.contributors_result_toc_result;
          this.contributors_result_toc_result.forEach((tab: any, index) => {
            tab.planned_result = tab.result_toc_results?.[0]?.planned_result ?? null;
            tab.index = index;
            tab.showMultipleWPsContent = true;
          });
        }

        this.partnersBody.changePrimaryInit = this.partnersBody?.result_toc_result.initiative_id;

        this.disabledOptions = [
          ...(this.partnersBody?.contributing_initiatives.accepted_contributing_initiatives || []),
          ...(this.partnersBody?.contributing_initiatives.pending_contributing_initiatives || [])
        ];

        this.initiativeIdSignal.set(this.partnersBody?.result_toc_result?.initiative_id);
        this.applyTocMappingOnLoad();
        this.getConsumed.set(true);
        this.partnersBody.bilateral_projects.forEach(project => {
          project.fullName = project.obj_clarisa_project.fullName;
        });

        this.loadFilteredBilateralProjects();
      },
      error: _err => {
        this.getConsumed.set(true);
        if (no_applicable_partner === true || no_applicable_partner === false) this.partnersBody.no_applicable_partner = no_applicable_partner;
      }
    });
  }

  // P2-2998 / P2-2929 (2026): on load, re-bucket persisted data into dropdown 1 (ToC) vs dropdown 2 (Other)
  // by the persisted `from_toc` flag (NOT by the live ToC), so a saved ToC mapping keeps showing as ToC.
  // Centers come flat in contributing_center; Science Programs come as accepted + pending initiatives.
  applyTocMappingOnLoad() {
    if (!this.fieldsManagerSE.isContributorsPartners2026()) return;

    // Centers: split contributing_center by from_toc. Other(s) move to the second dropdown + re-add the sentinel.
    // A CGSpace-locked center always stays in dropdown 1 (it carries a delete-lock the Other dropdown lacks).
    // When from_toc is null/undefined (legacy/migrated rows), fall back to live ToC membership so genuine ToC centers aren't misfiled.
    const centers: any[] = (this.partnersBody?.contributing_center || []).filter((c: any) => c?.code !== this.OTHER_CENTERS_CODE);
    const isCenterFromToc = (c: any): boolean =>
      !!c?.from_cgspace || (c?.from_toc == null ? this.tocReferenceCenterInstitutionIds().includes(c?.institutionId) : !!c?.from_toc);
    const tocCenters = centers.filter((c: any) => isCenterFromToc(c));
    const otherCenters = centers.filter((c: any) => !isCenterFromToc(c));
    if (otherCenters.length) {
      this.otherCentersSelected = otherCenters;
      this.partnersBody.contributing_center = [...tocCenters, this.buildOtherCentersSentinel()];
    } else {
      this.otherCentersSelected = [];
      this.partnersBody.contributing_center = tocCenters;
    }

    // Science Programs: combine accepted + pending, tag origin (_was_accepted), split by from_toc.
    const ci: any = this.partnersBody?.contributing_initiatives || {};
    const accepted = (ci.accepted_contributing_initiatives || []).map((x: any) => ({ ...x, _was_accepted: true }));
    const pending = (ci.pending_contributing_initiatives || []).map((x: any) => ({ ...x, _was_accepted: false }));
    // Snapshot the ACTIVE pending requests (with share_result_request_id) to cancel the ones deselected on Save.
    this.loadedPendingScience = pending.filter((p: any) => p?.share_result_request_id != null && p?.is_active !== false);
    // Snapshot the accepted ids so the Save classifies accepted vs pending by identity (a deselect+reselect loses _was_accepted).
    this.loadedAcceptedScienceIds = new Set<number>(accepted.map((x: any) => x?.id));
    const allSP = [...accepted, ...pending].filter((sp: any) => sp?.id !== this.OTHER_SP_CODE);
    // from_toc null/undefined (legacy rows) → fall back to live ToC synergy membership instead of defaulting to Other.
    const isSpFromToc = (sp: any): boolean =>
      sp?.from_toc == null ? this.tocReferenceSynergyInitiativeIds().includes(sp?.id) : !!sp?.from_toc;
    const tocSP = allSP.filter((sp: any) => isSpFromToc(sp));
    const otherSP = allSP.filter((sp: any) => !isSpFromToc(sp));
    if (otherSP.length) {
      this.otherScienceSelected = otherSP;
      this.scienceSelected = [...tocSP, this.buildOtherScienceSentinel()];
    } else {
      this.otherScienceSelected = [];
      this.scienceSelected = tocSP;
    }

    // P2-3066 (2026): External Partners — split partnersBody.institutions by from_toc. ToC partners stay in
    // institutions (+ sentinel option when there are Other partners); Other move to otherPartnersSelected.
    // from_toc null/undefined (legacy rows) → fall back to live ToC partner membership.
    const allPartners: any[] = (this.partnersBody?.institutions || []).filter((p: any) => p?.institutions_id !== this.OTHER_PARTNERS_CODE);
    const isPartnerFromToc = (p: any): boolean =>
      p?.from_toc == null ? this.tocReferencePartnerInstitutionIds().includes(p?.institutions_id) : !!p?.from_toc;
    const tocPartners = allPartners.filter((p: any) => isPartnerFromToc(p));
    const otherPartners = allPartners.filter((p: any) => !isPartnerFromToc(p));
    if (otherPartners.length) {
      this.otherPartnersSelected = otherPartners;
      this.partnersBody.institutions = [...tocPartners, this.buildOtherPartnersSentinel()];
    } else {
      this.otherPartnersSelected = [];
      this.partnersBody.institutions = tocPartners;
    }

    // P2-3115 (2026): the section is now hydrated from the persisted GET. After this point the persisted selection
    // (even empty) is authoritative — the on-empty ToC prefill must NOT resurrect it unless the user drives a new
    // HLO/KPI selection (tocSelectionTouched). Set last so it reflects a completed hydration.
    this.sectionHydratedFromToc.set(true);
  }

  // P2-3066 (2026): non-renderable sentinel for the "Other(s)" option inside the External Partners dropdown.
  // Lives in partnersBody.institutions only to keep the dropdown's "Other" option selected; it is guarded out of
  // every chip/count/validation/lead path and stripped on save.
  buildOtherPartnersSentinel() {
    return {
      institutions_id: this.OTHER_PARTNERS_CODE,
      full_name: '<strong>Other(s) External Partners</strong>',
      obj_institutions: { name: 'Other(s) External Partners', obj_institution_type_code: { name: '' } }
    };
  }

  private buildOtherCentersSentinel() {
    return { code: this.OTHER_CENTERS_CODE, name: 'Other(s) CGIAR Centers', acronym: 'Other(s)', full_name: '<strong>Other(s) CGIAR Centers</strong>', institutionId: -1 };
  }

  private buildOtherScienceSentinel() {
    return { id: this.OTHER_SP_CODE, official_code: 'Other(s)', short_name: 'Science Program(s)', full_name: '<strong>Other(s) Science Program(s)</strong>' };
  }

  getDisabledCentersForKP() {
    this.cgspaceDisabledList = this.partnersBody.contributing_center?.filter(center => center.from_cgspace);
  }

  setPossibleLeadPartners(updateComponent: boolean = false, autoAssign: boolean = true) {
    if (updateComponent) {
      this.updatingLeadData = true;
    }

    if (this.partnersBody.mqap_institutions?.length > -1 || this.partnersBody.institutions?.length > -1) {
      //('partner has changes');
      this.possibleLeadPartners = this.institutionsSE.institutionsList.filter(i => {
        return (
          this.partnersBody.mqap_institutions.some(mqap => {
            return mqap?.institutions_id === i.institutions_id;
          }) ||
          this.partnersBody.institutions.some(inst => {
            return inst?.institutions_id === i.institutions_id;
          }) ||
          // P2-3066 (2026): an "Other(s)" external partner is also lead-eligible.
          this.otherPartnersSelected?.some((p: any) => p?.institutions_id === i.institutions_id)
        );
      });

      //('possibleLeadPartners', this.possibleLeadPartners);
    }

    if (autoAssign) {
      this.tryAutoAssignLeadPartner();
    }

    if (updateComponent) {
      setTimeout(() => {
        this.updatingLeadData = false;
      }, 25);
    }
  }

  setPossibleLeadCenters(updateComponent: boolean = false, autoAssign: boolean = true) {
    if (updateComponent) {
      this.updatingLeadData = true;
    }

    if (this.partnersBody.contributing_center?.length > -1) {
      //('center has changes');
      this.possibleLeadCenters = this.centersSE.centersList.filter(center => {
        // P2-2998 (2026): an "Other(s)" center (in otherCentersSelected) is also lead-eligible.
        return this.partnersBody.contributing_center.some(c => c?.code === center.code) || this.otherCentersSelected?.some(c => c?.code === center.code);
      });

      this.possibleLeadCenters = this.possibleLeadCenters.map(center => {
        return { ...center, selected: false, disabled: false };
      });

      //('possibleLeadCenters', this.possibleLeadCenters);
    }

    if (autoAssign) {
      this.tryAutoAssignLeadCenter();
    }

    if (updateComponent) {
      setTimeout(() => {
        this.updatingLeadData = false;
      }, 25);
    }
  }

  onLeadByPartnerChange(isPartnerLed: boolean) {
    this.partnersBody.is_lead_by_partner = isPartnerLed;
    if (isPartnerLed) {
      this.leadCenterCode = null;
    } else {
      this.leadPartnerId = null;
    }
    this.setPossibleLeadCenters(true, false);
    this.setPossibleLeadPartners(true, false);
    this.runAutoAssignLeads();
  }

  runAutoAssignLeads() {
    this.tryAutoAssignLeadCenter();
    this.tryAutoAssignLeadPartner();
  }

  tryAutoAssignLeadCenter() {
    if (this.partnersBody.is_lead_by_partner) {
      return;
    }
    if (this.possibleLeadCenters.length !== 1) {
      return;
    }
    const onlyCenter = this.possibleLeadCenters[0];
    const leadIsValid = this.leadCenterCode && this.possibleLeadCenters.some(c => c.code === this.leadCenterCode);
    if (!leadIsValid) {
      this.leadCenterCode = onlyCenter.code;
    }
  }

  tryAutoAssignLeadPartner() {
    if (!this.partnersBody.is_lead_by_partner) {
      return;
    }
    if (this.possibleLeadPartners.length !== 1) {
      return;
    }
    const onlyPartner = this.possibleLeadPartners[0];
    const leadIsValid = this.leadPartnerId && this.possibleLeadPartners.some(p => p.institutions_id === this.leadPartnerId);
    if (!leadIsValid) {
      this.leadPartnerId = onlyPartner.institutions_id;
    }
  }

  setLeadPartnerOnLoad(updateComponent: boolean = false) {
    if (updateComponent) {
      this.updatingLeadData = true;
    }

    let foundPartner: UnmappedMQAPInstitutionDto | InstitutionsInterface = this.partnersBody.mqap_institutions?.find(mqap => mqap.is_leading_result);
    if (!foundPartner) {
      foundPartner = this.partnersBody.institutions?.find(inst => inst.is_leading_result);
    }
    // P2-3066 (2026): the persisted lead may be an "Other(s)" partner (after re-bucketing it lives in otherPartnersSelected).
    if (!foundPartner) {
      foundPartner = this.otherPartnersSelected?.find((p: any) => p.is_leading_result);
    }

    this.leadPartnerId = this.institutionsSE.institutionsWithoutCentersList.find(
      i => i.institutions_id === foundPartner?.institutions_id
    )?.institutions_id;

    if (updateComponent) {
      setTimeout(() => {
        this.updatingLeadData = false;
      }, 25);
    }
  }

  setLeadCenterOnLoad(updateComponent: boolean = false) {
    if (updateComponent) {
      this.updatingLeadData = true;
    }

    this.leadCenterCode = this.centersSE.centersList.find(center => {
      // P2-2998 (2026): the persisted lead may be an "Other(s)" center (after re-bucketing it lives in otherCentersSelected).
      return (
        this.partnersBody.contributing_center?.some(c => c.code === center.code && c.is_leading_result) ||
        this.otherCentersSelected?.some((c: any) => c.code === center.code && c.is_leading_result)
      );
    })?.code;

    if (updateComponent) {
      setTimeout(() => {
        this.updatingLeadData = false;
      }, 25);
    }
  }
}
