import { Injectable } from '@angular/core';
import { ApiService } from '../api/api.service';

@Injectable({
  providedIn: 'root'
})
export class InstitutionsService {
  institutionsList = [];
  institutionsTypesList = [];
  constructor(private api: ApiService) {
    this.api.resultsSE.GET_allInstitutions().subscribe(({ response }) => {
      this.institutionsList = response;
      // console.log(this.institutionsList);
    });
    this.api.resultsSE.GET_institutionTypes().subscribe(({ response }) => {
      this.institutionsTypesList = response;
      console.log(this.institutionsTypesList);
    });
  }
}
