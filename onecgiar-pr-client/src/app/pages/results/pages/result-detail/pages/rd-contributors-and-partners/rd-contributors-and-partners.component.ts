import { Component, OnInit, inject, ChangeDetectorRef, computed, effect, signal } from '@angular/core';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { RolesService } from '../../../../../../shared/services/global/roles.service';
import { InstitutionsService } from '../../../../../../shared/services/global/institutions.service';
import { CentersService } from '../../../../../../shared/services/global/centers.service';
import { CustomizedAlertsFeService } from '../../../../../../shared/services/customized-alerts-fe.service';
import { NonPooledProjectDto } from '../rd-partners/models/partnersBody';
import { RdContributorsAndPartnersService } from './rd-contributors-and-partners.service';
import { ResultLevelService } from '../../../result-creator/services/result-level.service';
import { InnovationUseResultsService } from '../../../../../../shared/services/global/innovation-use-results.service';
import { FieldsManagerService } from '../../../../../../shared/services/fields-manager.service';

@Component({
  selector: 'app-rd-contributors-and-partners',
  templateUrl: './rd-contributors-and-partners.component.html',
  styleUrl: './rd-contributors-and-partners.component.scss',
  standalone: false
})
export class RdContributorsAndPartnersComponent implements OnInit {
  resultLevelSE = inject(ResultLevelService);
  resultCode = this?.api?.dataControlSE?.currentResult?.result_code;
  versionId = this?.api?.dataControlSE?.currentResult?.version_id;
  contributingInitiativesList = [];
  allScienceProgramsList = signal<any[]>([]);
  alertStatusMessage: string = `Partner organization or CG Center that you collaborated with or are currently collaborating with to generate this result.`;
  cgCentersMessage: string = `This section displays CGIAR Center partners as they appear in <a class="open_route" href="/result/result-detail/${this.resultCode}/theory-of-change?phase=${this.versionId}" target="_blank">Section 2, Theory of Change</a>.</li> Should you identify any inconsistencies, please update Section 2`;
  tocConsumed = true;
  disabledText = 'To remove this center, please contact your librarian';
  innovationUseResultsSE = inject(InnovationUseResultsService);
  fieldsManagerSE = inject(FieldsManagerService);
  constructor(
    public api: ApiService,
    public institutionsSE: InstitutionsService,
    public rolesSE: RolesService,
    public rdPartnersSE: RdContributorsAndPartnersService,
    private readonly customizedAlertsFeSE: CustomizedAlertsFeService,
    public centersSE: CentersService,
    private readonly cdr: ChangeDetectorRef
  ) {
    this.api.dataControlSE.currentResultSectionName.set('Partners & Contributors');
  }

  ngOnInit() {
    this.rdPartnersSE.resetState();
    this.rdPartnersSE.getSectionInformation();
    this.GET_AllWithoutResults();
    this.api.dataControlSE.findClassTenSeconds('alert-event').then(_resp => {
      try {
        document.querySelectorAll('.alert-event').forEach(element => {
          element.addEventListener('click', _e => {
            this.api.dataControlSE.showPartnersRequest = true;
          });
        });
      } catch (error) {
        console.error(error);
      }
    });

    const checkResultsList = setInterval(() => {
      if (this.innovationUseResultsSE.resultsList?.length > 0 && this.rdPartnersSE.partnersBody?.linked_results?.length > 0) {
        const linkedResults = this.rdPartnersSE.partnersBody.linked_results;
        const hasIds = linkedResults.some((item: any) => typeof item === 'number');
        if (hasIds) {
          this.rdPartnersSE.partnersBody.linked_results = [...linkedResults];
          this.cdr.detectChanges();
        }
        clearInterval(checkResultsList);
      }
    }, 100);
    setTimeout(() => clearInterval(checkResultsList), 5000);
  }

  isAvisaInitiative = computed(() => {
    const code = this.api.dataControlSE.currentResultSignal?.()?.initiative_official_code ?? this.api.dataControlSE.currentResult?.initiative_official_code;
    return code === 'SGP-02' || code === 'SGP02';
  });

  hideWhyReportedField = computed(() => {
    const initiativeId = this.api.dataControlSE.currentResultSignal?.()?.initiative_id ?? this.api.dataControlSE.currentResult?.initiative_id;
    return initiativeId === 41 && this.fieldsManagerSE.isP25();
  });

  // P2-3036: the 2026 redesign of this section applies only to phase 2026+. 2025 keeps the legacy copy/fields.
  isCP2026 = computed(() => this.fieldsManagerSE.isContributorsPartners2026());

  tocQuestionLabel = computed(() =>
    this.isCP2026()
      ? 'Can this result be mapped to a planned TOC KPI or indicator?'
      : "Does this result align with the Program's planned TOC indicators?"
  );

  tocQuestionInfoNote = computed(() =>
    this.isCP2026()
      ? 'If <strong>Yes</strong>, please select the relevant level, KPI and indicator, and indicate the result contribution to the indicator target. If <strong>No</strong>, please provide a short justification explaining why this result is being reported outside the 2026 TOC KPI/indicators. No-mapped results will be shared with the Program team for consideration as part of the adaptive management process, and may feed into updates to the Program’s 2027 TOC.'
      : 'If your answer is <strong>Yes</strong>, please select the relevant <strong>HLO, indicator</strong>, and <strong>contribution to target</strong> below. If the result is not planned for in the 2025 ToC (planned indicators), please select <strong>No</strong> and, where applicable, choose the <strong>HLO</strong> under which it is most appropriate to report the result. Please also provide a short justification explaining why you are reporting it even though it is not reflected in a 2025 ToC indicator. These “No”-flagged results could be reviewed by the Program team as part of the adaptive management process and may inform updates or adjustments to the Program’s 2026 ToC and planned indicators.'
  );

  // P2-2998 / P2-3036 (2026): split the Contributing CGIAR Centers dropdown into "from ToC" + "Other(s)".
  // The first shows only CLARISA centers whose institutionId matches the selected TOC node (toc_partners ∪
  // toc_target_center_ids, fed via the shared service). "Other(s)" shows the rest. SAVE NOT ADDRESSED YET.
  contributingCentersInfoNote =
    "The CGIAR Centers listed below were identified in your 2026 ToC. To select a different Center, choose 'Other' from the drop-down menu and then make your selection from the options that appear.";

  referenceCenters = computed(() => {
    const ids = this.rdPartnersSE.tocReferenceCenterInstitutionIds();
    return (this.centersSE.centersList ?? []).filter(c => ids.includes(c.institutionId));
  });

  otherCentersList = computed(() => {
    const ids = this.rdPartnersSE.tocReferenceCenterInstitutionIds();
    return (this.centersSE.centersList ?? []).filter(c => !ids.includes(c.institutionId));
  });

  // "Other(s) CGIAR Centers" is a special item at the END of the first dropdown's list (per Excel), not an outside
  // checkbox. Selecting it toggles the second dropdown; it is never persisted as a real center.
  readonly OTHER_CENTERS_CODE = '__OTHER_CENTERS__';
  dropdown1Options = computed(() => [
    ...this.referenceCenters(),
    { code: this.OTHER_CENTERS_CODE, name: 'Other(s) CGIAR Centers', acronym: 'Other(s)', full_name: '<strong>Other(s) CGIAR Centers</strong>', institutionId: -1 }
  ]);

  // Preselect all TOC reference centers on load, only when the result has no centers selected yet.
  private userTouchedCenters = false;
  preselectCentersEffect = effect(() => {
    if (!this.isCP2026() || this.userTouchedCenters) return;
    const refs = this.referenceCenters();
    const cc = this.rdPartnersSE.partnersBody?.contributing_center;
    if (refs.length && (!cc || cc.length === 0)) {
      this.rdPartnersSE.partnersBody.contributing_center = refs.map(c => ({ ...c, new: true, is_active: true })) as any[];
      this.rdPartnersSE.setPossibleLeadCenters(true);
    }
  });

  // "Other(s)" stays selected like any other center (shows as a chip); its presence reveals the second dropdown.
  get showOtherCenters(): boolean {
    return (this.rdPartnersSE.partnersBody?.contributing_center || []).some(c => c.code === this.OTHER_CENTERS_CODE);
  }

  onContributingCenterSelect(_event: any) {
    this.userTouchedCenters = true;
    // when "Other(s)" is deselected, clear whatever was picked in the Other(s) dropdown
    if (!this.showOtherCenters) this.rdPartnersSE.otherCentersSelected = [];
    // OTHER_CENTERS_CODE isn't in the CLARISA list, so it doesn't affect lead-center options.
    this.rdPartnersSE.setPossibleLeadCenters(true);
  }

  deleteOtherCenter(index: number) {
    // Parity with deleteScience: reassign a NEW array (not splice) so the multi-select ngModel refreshes and the chip stays removed.
    const removed = (this.rdPartnersSE.otherCentersSelected || [])[index];
    this.rdPartnersSE.otherCentersSelected = (this.rdPartnersSE.otherCentersSelected || []).filter((_: any, i: number) => i !== index);
    // Parity with deleteContributingCenter: if the removed "Other" center was the lead, clear the lead so we don't save an orphaned lead.
    if (removed && this.rdPartnersSE.leadCenterCode === removed.code) {
      this.rdPartnersSE.leadCenterCode = null;
    }
    // Recompute lead-center eligibility now that an "Other" center is gone.
    this.rdPartnersSE.setPossibleLeadCenters(true);
  }

  // ----- P2-2929 (2026): Contributing Science Program/Accelerator split (VISUAL ONLY; pending/save deferred per Juan David) -----
  readonly OTHER_SP_CODE = '__OTHER_SCIENCE__';
  contributingScienceInfoNote =
    "The Programs/Accelerators listed below were identified in your 2026 ToC. To select a different contributing Program/Accelerator, choose 'Other' from the drop-down menu and then make your selection from the options that appear.";
  noScienceProgramsNote = 'No Science Programs related to the established HLO/Outcomes were found';

  referenceScience = computed(() => {
    const ids = this.rdPartnersSE.tocReferenceSynergyInitiativeIds();
    return (this.allScienceProgramsList() ?? []).filter(sp => ids.includes(sp.id));
  });

  otherScienceList = computed(() => {
    const ids = this.rdPartnersSE.tocReferenceSynergyInitiativeIds();
    return (this.allScienceProgramsList() ?? []).filter(sp => !ids.includes(sp.id));
  });

  // true when the ToC brought no synergy programs → show the note and NO "Other(s)" option.
  hasReferenceScience = computed(() => this.rdPartnersSE.tocReferenceSynergyInitiativeIds().length > 0);

  dropdown1OptionsSP = computed(() => [
    ...this.referenceScience(),
    { id: this.OTHER_SP_CODE, official_code: 'Other(s)', short_name: 'Science Program(s)', full_name: '<strong>Other(s) Science Program(s)</strong>' }
  ]);

  get showOtherScience(): boolean {
    return (this.rdPartnersSE.scienceSelected || []).some(sp => sp.id === this.OTHER_SP_CODE);
  }

  private userTouchedScience = false;
  preselectScienceEffect = effect(() => {
    if (!this.isCP2026() || this.userTouchedScience) return;
    const refs = this.referenceScience();
    const sel = this.rdPartnersSE.scienceSelected;
    if (refs.length && (!sel || sel.length === 0)) {
      this.rdPartnersSE.scienceSelected = refs.map(sp => ({ ...sp, new: true, is_active: true }));
    }
  });

  onScienceSelect(_event: any) {
    this.userTouchedScience = true;
    if (!this.showOtherScience) this.rdPartnersSE.otherScienceSelected = [];
  }

  deleteScience(index: number) {
    // Reassign a NEW array reference (not splice in place) so the multi-select ngModel refreshes and the chip stays removed.
    this.rdPartnersSE.scienceSelected = (this.rdPartnersSE.scienceSelected || []).filter((_: any, i: number) => i !== index);
    if (!this.showOtherScience) this.rdPartnersSE.otherScienceSelected = [];
  }

  deleteOtherScience(index: number) {
    this.rdPartnersSE.otherScienceSelected = (this.rdPartnersSE.otherScienceSelected || []).filter((_: any, i: number) => i !== index);
  }

  GET_AllWithoutResults() {
    this.api.resultsSE.GET_resultById().subscribe({
      next: ({ response }) => {
        this.api.dataControlSE.currentResult = response;
        const activePortfolio = this.api.dataControlSE.currentResult?.portfolio;
        this.api.resultsSE.GET_AllWithoutResults(activePortfolio).subscribe(({ response }) => {
          this.contributingInitiativesList = response;
        });
        // P2-2929 (2026): full Science Programs/initiatives list to split "from ToC" vs "Other(s)".
        this.api.resultsSE.GET_AllInitiatives(activePortfolio).subscribe(({ response }) => {
          this.allScienceProgramsList.set(response || []);
        });
      },
      error: err => {
        console.error(err);
      }
    });
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
          this.rdPartnersSE.getSectionInformation();
        });
      }
    );
  }

  deleteEvidence(index: number) {
    this.rdPartnersSE.partnersBody.contributing_np_projects.splice(index, 1);
  }

  addBilateralContribution() {
    this.rdPartnersSE.partnersBody.contributing_np_projects.push(new NonPooledProjectDto());
  }

  deleteContributingCenter(index: number, updateComponent: boolean = false) {
    if (updateComponent) {
      this.rdPartnersSE.updatingLeadData = true;
    }

    const deletedCenter = this.rdPartnersSE.partnersBody?.contributing_center.splice(index, 1);
    if (deletedCenter.length === 1 && this.rdPartnersSE.leadCenterCode === deletedCenter[0].code) {
      //always should happen
      this.rdPartnersSE.leadCenterCode = null;
    }
    // P2-2998: removing the "Other(s)" chip hides the second dropdown and clears its selection.
    if (!this.showOtherCenters) this.rdPartnersSE.otherCentersSelected = [];
    if (updateComponent) {
      setTimeout(() => {
        this.rdPartnersSE.updatingLeadData = false;
      }, 50);
    }
  }

  get validateGranTitle() {
    for (const iterator of this.rdPartnersSE.partnersBody.contributing_np_projects) {
      const evidencesFinded = this.rdPartnersSE.partnersBody.contributing_np_projects.filter(
        evidence => evidence.grant_title == iterator.grant_title
      );
      if (evidencesFinded.length >= 2) {
        return evidencesFinded.length >= 2;
      }
    }

    return !!this.rdPartnersSE.partnersBody.contributing_np_projects.find(evidence => !evidence.grant_title);
  }

  onSaveSection() {
    if (this.rdPartnersSE.partnersBody.no_applicable_partner) {
      this.rdPartnersSE.partnersBody.institutions = [];
    }

    if (this.rdPartnersSE.partnersBody.is_lead_by_partner) {
      this.rdPartnersSE.partnersBody.mqap_institutions?.forEach(mqap => {
        mqap.is_leading_result = this.rdPartnersSE.leadPartnerId === mqap.institutions_id;
      });
      this.rdPartnersSE.partnersBody.institutions?.forEach(i => {
        i.is_leading_result = this.rdPartnersSE.leadPartnerId === i.institutions_id;
      });
      this.rdPartnersSE.partnersBody.contributing_center?.forEach(center => (center.is_leading_result = false));
    } else {
      this.rdPartnersSE.partnersBody.contributing_center?.forEach(center => {
        center.is_leading_result = this.rdPartnersSE.leadCenterCode === center.code;
      });
      this.rdPartnersSE.partnersBody.mqap_institutions?.forEach(mqap => {
        mqap.is_leading_result = false;
      });
      this.rdPartnersSE.partnersBody.institutions?.forEach(i => {
        i.is_leading_result = false;
      });
    }

    const linkedResultsIds = (this.rdPartnersSE.partnersBody.linked_results || []).map((r: any) => Number(r?.id ?? r));

    // P2-2998 / P2-2929 (2026): tag each center/SP with from_toc and strip the UI-only sentinels.
    // Centers = ToC-selected (contributing_center, minus sentinel) ∪ Other(s). SP = scienceSelected ∪ otherScienceSelected,
    // split into accepted (kept) vs pending (new contribution request) by the _was_accepted tag set on load.
    const isCP2026 = this.isCP2026();
    let contributingCenterPayload: any[] = this.rdPartnersSE.partnersBody.contributing_center;
    let contributingInitiativesPayload: any = {
      ...this.rdPartnersSE.partnersBody.contributing_initiatives,
      pending_contributing_initiatives: [
        ...this.rdPartnersSE.partnersBody.contributing_initiatives.pending_contributing_initiatives,
        ...this.rdPartnersSE.contributingInitiativeNew
      ]
    };
    let cancelPendingRequests: number[] = [];

    if (isCP2026) {
      const tocCenters = (this.rdPartnersSE.partnersBody.contributing_center || [])
        .filter((c: any) => c?.code !== this.OTHER_CENTERS_CODE)
        .map((c: any) => ({ ...c, from_toc: true }));
      const otherCenters = (this.rdPartnersSE.otherCentersSelected || []).map((c: any) => ({
        ...c,
        from_toc: false,
        is_leading_result: this.rdPartnersSE.leadCenterCode === c.code
      }));
      contributingCenterPayload = [...tocCenters, ...otherCenters];

      const allSP = [
        ...(this.rdPartnersSE.scienceSelected || []).filter((sp: any) => sp?.id !== this.OTHER_SP_CODE).map((sp: any) => ({ ...sp, from_toc: true })),
        ...(this.rdPartnersSE.otherScienceSelected || []).map((sp: any) => ({ ...sp, from_toc: false }))
      ];
      // Classify by the loaded accepted-ids set (identity), not the per-object _was_accepted (lost on deselect+reselect).
      const wasAccepted = (sp: any) => this.rdPartnersSE.loadedAcceptedScienceIds.has(sp.id);
      contributingInitiativesPayload = {
        ...this.rdPartnersSE.partnersBody.contributing_initiatives,
        accepted_contributing_initiatives: allSP.filter((sp: any) => wasAccepted(sp)).map((sp: any) => ({ id: sp.id, from_toc: !!sp.from_toc })),
        pending_contributing_initiatives: allSP.filter((sp: any) => !wasAccepted(sp)).map((sp: any) => ({ id: sp.id, from_toc: !!sp.from_toc }))
      };

      // Cancel the pending contribution requests the user deselected: pending SP loaded on entry that are
      // no longer in the current selection → send their share_result_request_id in cancel_pending_requests.
      const selectedSpIds = new Set(allSP.map((sp: any) => sp.id));
      cancelPendingRequests = (this.rdPartnersSE.loadedPendingScience || [])
        .filter((p: any) => !selectedSpIds.has(p.id))
        .map((p: any) => p.share_result_request_id)
        .filter((id: any) => id != null);
    }

    const sendedData = {
      ...this.rdPartnersSE.partnersBody,
      contributing_center: contributingCenterPayload,
      linked_results: linkedResultsIds,
      contributing_initiatives: contributingInitiativesPayload,
      ...(isCP2026 ? { cancel_pending_requests: cancelPendingRequests } : {}),
      email_template: 'email_template_contribution'
    };

    this.api.resultsSE.PATCH_ContributorsPartners(sendedData).subscribe(_resp => {
      this.rdPartnersSE.getSectionInformation(null, true);
    });
  }

  onRemoveAcceptedContributing(index: number) {
    this.rdPartnersSE.partnersBody.contributing_initiatives?.accepted_contributing_initiatives?.splice(index, 1);
  }

  onRemoveNewContributing(index: number) {
    this.rdPartnersSE.contributingInitiativeNew.splice(index, 1);
  }

  toggleActiveContributor(item) {
    item.is_active = !item.is_active;
  }

  getMessageLead() {
    const entity = this.rdPartnersSE.partnersBody.is_lead_by_partner ? 'partner' : 'CG Center';
    return `Please select the ${entity} leading this result. <b>Only ${entity}s already added in this section can be selected as the result lead.</b>`;
  }

  onPlannedResultChange(item: any) {
    item?.result_toc_results?.forEach((tab: any) => {
      if (tab.indicators?.[0]) {
        tab.indicators[0].related_node_id = null;
        tab.indicators[0].toc_results_indicator_id = null;
        if (tab.indicators[0].targets?.[0]) {
          tab.indicators[0].targets[0].contributing_indicator = null;
        }
      }
      tab.toc_progressive_narrative = null;
      tab.toc_result_id = null;
      tab.toc_level_id = null;
    });

    this.tocConsumed = false;

    setTimeout(() => {
      this.tocConsumed = true;
      this.cdr.detectChanges();
    }, 200);
  }

  getContributorDescription(contributor: any) {
    const contributorsText = `<strong>${contributor?.official_code} ${contributor?.short_name}</strong> - ${this.tocQuestionLabel()}`;

    if (!contributor?.result_toc_results?.length) {
      return `<strong>${contributor?.official_code} ${contributor?.short_name}</strong> - Pending confirmation`;
    }

    return contributorsText;
  }

  formatResultLabel(option: any): string {
    if (option?.result_code && option?.name) {
      let phaseInfo = '';
      if (option?.acronym && option?.phase_year) {
        phaseInfo = `(${option.acronym} - ${option.phase_year}) `;
      } else if (option?.acronym) {
        phaseInfo = `(${option.acronym}) `;
      } else if (option?.phase_year) {
        phaseInfo = `(${option.phase_year}) `;
      }

      const resultType = option?.result_type_name || option?.resultTypeName || option?.type_name || '';
      const resultTypeInfo = resultType ? ` (${resultType})` : '';

      const title = option?.title ? ` - ${option.title}` : '';

      return `${phaseInfo}${option.result_code} - ${option.name}${resultTypeInfo}${title}`;
    }
    return option?.title || option?.name || '';
  }

  formatBilateralProjectLabel(project: any): string {
    const fullName = project?.fullName || project?.obj_clarisa_project?.fullName || '';
    const organizationName = project?.organization_name || project?.obj_organization?.name || project?.obj_clarisa_project?.obj_organization?.name;

    if (organizationName) {
      return `${fullName} (Center: ${organizationName})`;
    }
    return fullName;
  }
}
