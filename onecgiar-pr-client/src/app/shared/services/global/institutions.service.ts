import { Injectable } from '@angular/core';
import { ApiService } from '../api/api.service';

@Injectable({
  providedIn: 'root'
})
export class InstitutionsService {
  institutionsList = [];
  institutionsWithoutCentersList = [];
  institutionsTypesList = [];
  institutionsTypesPartnerRequestList = [];
  institutionsChildlessTypes = [];
  constructor(private api: ApiService) {
    this.api.resultsSE.GET_allInstitutions().subscribe(({ response }) => {
      this.institutionsList = response;
      this.institutionsWithoutCentersList = response.filter(it => it.is_center != '1');
      //(this.institutionsList);
    });
    this.api.resultsSE.GET_allInstitutionTypes().subscribe(({ response }) => {
      this.institutionsTypesList = response;
      this.institutionsTypesPartnerRequestList = this.institutionsTypesList.filter(it => !it.is_legacy);
      //(this.institutionsTypesList);
    });

    this.api.resultsSE.GET_allChildlessInstitutionTypes().subscribe(({ response }) => {
      this.institutionsChildlessTypes = response;
    });
  }
}
