import { Injectable } from '@angular/core';
import { ApiService } from '../../../shared/services/api/api.service';

interface Innovation {
  result_id: string;
  result_code: string;
  title: string;
  description: string;
  initiative_id: number;
  official_code: string;
  creation_date: string;
  innovation_type: string;
}

@Injectable({
  providedIn: 'root'
})
export class ManageInnovationsListService {
  allInnovationsList: Innovation[] = [];
  constructor(private api: ApiService) {
    this.GETallInnovations();
  }
  GETallInnovations() {
    this.api.resultsSE.GETallInnovations().subscribe(({ response }) => {
      this.allInnovationsList = response;
      this.allInnovationsList.map((inno: any) => (inno.full_name = inno.title));
    });
  }
}
