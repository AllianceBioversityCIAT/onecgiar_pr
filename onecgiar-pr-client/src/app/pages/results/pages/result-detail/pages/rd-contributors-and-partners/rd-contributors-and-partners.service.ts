import { Injectable, OnDestroy, inject, signal } from '@angular/core';
import { InstitutionsInterface, UnmappedMQAPInstitutionDto } from '../rd-partners/models/partnersBody';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { InstitutionMapped } from '../../../../../../shared/interfaces/institutions.interface';
import { CenterDto } from '../../../../../../shared/interfaces/center.dto';
import { InstitutionsService } from '../../../../../../shared/services/global/institutions.service';
import { CentersService } from '../../../../../../shared/services/global/centers.service';
import { ContributorsAndPartnersBody } from './models/contributorsAndPartnersBody';
import { RdCpTheoryOfChangesServicesService } from './rd-cp-theory-of-changes-services.service';
import { ResultTocResultsInterface } from '../rd-theory-of-change/model/theoryOfChangeBody';

@Injectable({
  providedIn: 'root'
})
export class RdContributorsAndPartnersService implements OnDestroy {
  partnersBody = new ContributorsAndPartnersBody();
  toggle = 0;
  getConsumed = signal<boolean>(false);
  cgspaceDisabledList: any = [];

  possibleLeadPartners: InstitutionMapped[] = [];
  possibleLeadCenters: CenterDto[] = [];
  submitter: string = '';
  disabledOptions = [];
  nppCenters: CenterDto[] = [];
  clarisaProjectsList: any[] = [];

  leadPartnerId: number = null;
  leadCenterCode: string = null;
  result_toc_result_signal = signal<any>(null);
  updatingLeadData: boolean = false;
  disableLeadPartner: boolean = false;
  rdCpTheoryOfChangesServicesSE = inject(RdCpTheoryOfChangesServicesService);
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

  loadClarisaProjects() {
    this.api.resultsSE.GET_ClarisaProjects().subscribe({
      next: ({ response }) => {
        console.log('Clarisa projects response:', response);
        this.clarisaProjectsList = response;
        console.log('Processed projects list:', this.clarisaProjectsList);
      },
      error: err => {
        console.error('Error loading Clarisa projects:', err);
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
    this.api.resultsSE.GET_ContributorsPartners().subscribe({
      next: ({ response }) => {
        this.partnersBody = response;
        this.getDisabledCentersForKP();
        this.setPossibleLeadPartners(onSave);
        this.setLeadPartnerOnLoad(onSave);
        this.setPossibleLeadCenters(onSave);
        this.setLeadCenterOnLoad(onSave);

        //! TOC
        // this.theoryOfChangeBody = response;

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

        // this.theoryOfChangesServices.partnersBody = this.partnersBody;
        if (this.partnersBody?.result_toc_result?.result_toc_results !== null) {
          this.rdCpTheoryOfChangesServicesSE.result_toc_result = this.partnersBody?.result_toc_result;
          this.rdCpTheoryOfChangesServicesSE.result_toc_result.planned_result =
            this.partnersBody?.result_toc_result?.result_toc_results[0].planned_result ?? null;
          this.rdCpTheoryOfChangesServicesSE.result_toc_result.showMultipleWPsContent = true;
        }

        if (this.partnersBody?.contributors_result_toc_result !== null) {
          this.rdCpTheoryOfChangesServicesSE.contributors_result_toc_result = this.partnersBody?.contributors_result_toc_result;
          this.rdCpTheoryOfChangesServicesSE.contributors_result_toc_result.forEach((tab: any, index) => {
            tab.planned_result = tab.result_toc_results[0]?.planned_result ?? null;
            tab.index = index;
            tab.showMultipleWPsContent = true;
          });
        }

        this.partnersBody.changePrimaryInit = this.partnersBody?.result_toc_result.initiative_id;

        this.disabledOptions = [
          ...(this.partnersBody?.contributing_initiatives.accepted_contributing_initiatives || []),
          ...(this.partnersBody?.contributing_initiatives.pending_contributing_initiatives || [])
        ];

        // this.changeDetectorRef.detectChanges();
        this.result_toc_result_signal.set(this.partnersBody?.result_toc_result);
        this.getConsumed.set(true);
        console.log('partnersBody', this.partnersBody);
        //! TOC END
      },
      error: _err => {
        this.getConsumed.set(true);
        if (no_applicable_partner === true || no_applicable_partner === false) this.partnersBody.no_applicable_partner = no_applicable_partner;
      }
    });
  }

  getDisabledCentersForKP() {
    this.cgspaceDisabledList = this.partnersBody.contributing_center?.filter(center => center.from_cgspace);
  }

  setPossibleLeadPartners(updateComponent: boolean = false) {
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
          })
        );
      });

      //('possibleLeadPartners', this.possibleLeadPartners);
    }

    if (updateComponent) {
      setTimeout(() => {
        this.updatingLeadData = false;
      }, 25);
    }
  }

  setPossibleLeadCenters(updateComponent: boolean = false) {
    if (updateComponent) {
      this.updatingLeadData = true;
    }

    if (this.partnersBody.contributing_center?.length > -1) {
      //('center has changes');
      this.possibleLeadCenters = this.centersSE.centersList.filter(center => {
        return this.partnersBody.contributing_center.some(c => c?.code === center.code);
      });

      this.possibleLeadCenters = this.possibleLeadCenters.map(center => {
        return { ...center, selected: false, disabled: false };
      });

      //('possibleLeadCenters', this.possibleLeadCenters);
    }

    if (updateComponent) {
      setTimeout(() => {
        this.updatingLeadData = false;
      }, 25);
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
      return this.partnersBody.contributing_center?.some(c => c.code === center.code && c.is_leading_result);
    })?.code;

    if (updateComponent) {
      setTimeout(() => {
        this.updatingLeadData = false;
      }, 25);
    }
  }
}
