import { EventEmitter, Injectable, OnDestroy } from '@angular/core';
import { InstitutionsInterface, PartnersBody, UnmappedMQAPInstitutionDto } from './models/partnersBody';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { centerInterfacesToc } from '../rd-theory-of-change/model/theoryOfChangeBody';
import { EventType } from '../../../../../../shared/interfaces/event-type.dto';
import { InstitutionMapped } from '../../../../../../shared/interfaces/institutions.interface';
import { CenterDto } from '../../../../../../shared/interfaces/center.dto';
import { InstitutionsService } from '../../../../../../shared/services/global/institutions.service';
import { CentersService } from '../../../../../../shared/services/global/centers.service';

@Injectable({
  providedIn: 'root'
})
export class RdPartnersService implements OnDestroy {
  partnersBody = new PartnersBody();
  toggle = 0;

  cgspaceDisabledList: any = [];

  possibleLeadPartners: InstitutionMapped[] = [];
  possibleLeadCenters: CenterDto[] = [];

  leadPartnerId: number = null;
  leadCenterCode: string = null;

  updatingLeadData: boolean = false;

  constructor(public api: ApiService, public institutionsSE: InstitutionsService, public centersSE: CentersService) {
    this.institutionsSE.loadedInstitutions.subscribe(loaded => {
      if (loaded) {
        this.setPossibleLeadPartners(true);
        this.setLeadPartnerOnLoad(true);
      }
    });
    this.centersSE.loadedCenters.subscribe(loaded => {
      if (loaded) {
        this.setPossibleLeadCenters(true);
        this.setLeadCenterOnLoad(true);
      }
    });
  }

  ngOnDestroy(): void {
    this.institutionsSE.loadedInstitutions.unsubscribe();
    this.centersSE.loadedCenters.unsubscribe();
  }

  validateDeliverySelection(deliveries, deliveryId: number) {
    if (!(typeof deliveries == 'object')) return false;
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
    if (typeof deliveries !== 'object') return false;

    return deliveries.find(delivery => delivery.partner_delivery_type_id == deliveryId);
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
    this.api.resultsSE.GET_partnersSection().subscribe({
      next: ({ response }) => {
        this.partnersBody = response;
        this.getDisabledCentersForKP();
        this.setPossibleLeadPartners(onSave);
        this.setLeadPartnerOnLoad(onSave);
        this.setPossibleLeadCenters(onSave);
        this.setLeadCenterOnLoad(onSave);
      },
      error: _err => {
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
