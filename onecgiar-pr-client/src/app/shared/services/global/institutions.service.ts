import { Injectable } from '@angular/core';
import { ApiService } from '../api/api.service';

@Injectable({
  providedIn: 'root'
})
export class InstitutionsService {
  institutionsList = [];
  institutionsWithoutCentersList = [];
  institutionsWithoutCentersListPartners = [];
  institutionsTypesList = [];
  institutionsTypesPartnerRequestList = [];
  institutionsChildlessTypes = [];
  constructor(private api: ApiService) {
    this.api.resultsSE.GET_allInstitutions().subscribe(({ response }) => {
      this.institutionsList = response;
      this.institutionsWithoutCentersList = response.filter(it => it.is_center != '1');
      this.institutionsWithoutCentersListPartners = this.institutionsWithoutCentersList.map(inst => {
        return {
          ...inst,
          obj_institutions: {
            name: inst.institutions_name,
            obj_institution_type_code: {
              name: inst.institutions_type_name,
              id: inst.institutions_type_id
            }
          },
          delivery: []
        };
      });
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
