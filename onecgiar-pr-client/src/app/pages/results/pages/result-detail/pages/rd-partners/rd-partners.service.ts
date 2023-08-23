import { Injectable } from '@angular/core';
import { PartnersBody } from './models/partnersBody';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { centerInterfacesToc } from '../rd-theory-of-change/model/theoryOfChangeBody';
import { concatMap, filter } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class RdPartnersService {
  partnersBody = new PartnersBody();
  toggle = 0;
  centers: centerInterfacesToc[] = [];
  constructor(private api: ApiService) {}

  validateDeliverySelection(deliveries, deliveryId) {
    if (!(typeof deliveries == 'object')) return false;
    const index = deliveries.indexOf(deliveryId);
    return index < 0 ? false : true;
  }
  onSelectDelivery(option, deliveryId) {
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
  removePartner(index) {
    this.partnersBody.institutions.splice(index, 1);
    this.toggle++;
  }
  /*cleanBody() {
    if (this.partnersBody.no_applicable_partner === true) this.partnersBody = new PartnersBody(true);
    if (this.partnersBody.no_applicable_partner === false) this.getSectionInformation(false);
  }*/

  getSectionInformation(no_applicable_partner?) {
    this.api.resultsSE
      .GET_partnersSection()
      /*
        after the first request, we need to get the centers, so we pipe
        the response of the first observable to perform two operations
      */
      .pipe(
        /*
          we condition the execution of the second observable (get centers) 
          depending if the current result is a knowledge product
        */
        filter(() => {
          return this.api.dataControlSE.isKnowledgeProduct;
        }),
        /*
          we perform the operations of the first observable and return the
          second observable, depending on the previous filter
        */
        concatMap(({ response }) => {
          this.partnersBody = response;
          if (no_applicable_partner === true || no_applicable_partner === false) this.partnersBody.no_applicable_partner = no_applicable_partner;

          return this.api.resultsSE.GET_centers();
        })
      )
      .subscribe({
        //we perform the operations of the second observable
        next: ({ response }) => {
          this.centers = response;
        },
        // we handle the errors of both observables
        error: err => {
          if (no_applicable_partner === true || no_applicable_partner === false) this.partnersBody.no_applicable_partner = no_applicable_partner;
        }
      });
  }
}
/*
this.api.resultsSE.GET_centers().subscribe(({ response }) => {
      this.rdPartnersSE.centers = response;
    });


    next: ({ response }) => {
        //(response);
        this.partnersBody = response;
        if (no_applicable_partner === true || no_applicable_partner === false) this.partnersBody.no_applicable_partner = no_applicable_partner;
      },
      error: err => {
        if (no_applicable_partner === true || no_applicable_partner === false) this.partnersBody.no_applicable_partner = no_applicable_partner;
      }
*/
